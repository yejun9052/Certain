'use strict';

/**
 * 학습 상태 저장소.
 *
 * 프론트엔드가 쓰는 모양은 그대로 유지한다:
 *   { bookmarked: string[], history: {[qid]: boolean}, wrongIds: string[], resumeQuestionId: string|null }
 *
 * 이 형태를 고정한 덕분에 app.js 의 applyStudyState/renderPractice/renderNotes 등
 * 렌더링 코드는 수정 없이 그대로 동작한다.
 *
 * wrongIds 의 순서는 기존 앱의 unshift 동작(최초로 틀린 시점의 역순)을 재현한다.
 */

const { getDb, nowIso, withImmediateTransaction } = require('../db');
const content = require('./content');

/** 사용자 생성 직후 호출. 이어풀기 위치가 없는 진행 행을 만든다. */
function ensureProgress(conn, userId, at = nowIso()) {
  conn
    .prepare(
      `INSERT INTO study_progress (user_id, resume_question_id, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO NOTHING`
    )
    .run(userId, null, at);
}

/** @returns {{bookmarked:string[], history:Record<string,boolean>, wrongIds:string[], resumeQuestionId:string|null}} */
function getState(userId) {
  const db = getDb();

  const bookmarked = db
    .prepare('SELECT question_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC, question_id')
    .all(userId)
    .map((row) => row.question_id);

  const history = {};
  for (const row of db
    .prepare('SELECT question_id, last_correct FROM question_attempts WHERE user_id = ?')
    .all(userId)) {
    history[row.question_id] = row.last_correct === 1;
  }

  const wrongIds = db
    .prepare(
      `SELECT question_id FROM wrong_questions
        WHERE user_id = ?
        ORDER BY first_wrong_at DESC, question_id`
    )
    .all(userId)
    .map((row) => row.question_id);

  const progress = db
    .prepare('SELECT resume_question_id FROM study_progress WHERE user_id = ?')
    .get(userId);

  return {
    bookmarked,
    history,
    wrongIds,
    resumeQuestionId: progress ? progress.resume_question_id : null
  };
}

function setResume(userId, questionId) {
  if (!content.hasQuestion(questionId)) return false;
  const at = nowIso();
  getDb()
    .prepare(
      `INSERT INTO study_progress (user_id, resume_question_id, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         resume_question_id = excluded.resume_question_id,
         updated_at = excluded.updated_at`
    )
    .run(userId, questionId, at);
  return true;
}

function addBookmark(userId, questionId) {
  if (!content.hasQuestion(questionId)) return false;
  getDb()
    .prepare(
      `INSERT INTO bookmarks (user_id, question_id, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id, question_id) DO NOTHING`
    )
    .run(userId, questionId, nowIso());
  return true;
}

function removeBookmark(userId, questionId) {
  getDb().prepare('DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?').run(userId, questionId);
  return true;
}

/**
 * 채점 결과를 기록한다. correct 는 서버가 판정한 값이어야 한다.
 * 클라이언트가 보낸 정답 여부는 신뢰하지 않는다.
 */
function recordAnswer(userId, questionId, correct, choice = null) {
  const at = nowIso();
  const isCorrect = correct ? 1 : 0;

  return withImmediateTransaction((conn) => {
    conn
      .prepare(
        `INSERT INTO question_attempts (
           user_id, question_id, last_correct, last_choice,
           attempt_count, correct_count, wrong_count, first_answered_at, last_answered_at
         ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
         ON CONFLICT (user_id, question_id) DO UPDATE SET
           last_correct     = excluded.last_correct,
           last_choice      = excluded.last_choice,
           attempt_count    = question_attempts.attempt_count + 1,
           correct_count    = question_attempts.correct_count + excluded.correct_count,
           wrong_count      = question_attempts.wrong_count + excluded.wrong_count,
           last_answered_at = excluded.last_answered_at`
      )
      .run(
        userId,
        questionId,
        isCorrect,
        choice === null || choice === undefined ? null : Number(choice),
        isCorrect,
        isCorrect ? 0 : 1,
        at,
        at
      );

    if (!correct) {
      // 기존 앱과 동일하게, 한 번 틀린 문제는 이후 정답을 맞혀도 목록에서 빠지지 않는다.
      conn
        .prepare(
          `INSERT INTO wrong_questions (user_id, question_id, first_wrong_at, last_wrong_at, wrong_count)
           VALUES (?, ?, ?, ?, 1)
           ON CONFLICT (user_id, question_id) DO UPDATE SET
             last_wrong_at = excluded.last_wrong_at,
             wrong_count   = wrong_questions.wrong_count + 1`
        )
        .run(userId, questionId, at, at);
    }

    return true;
  });
}

/**
 * 학습 상태 전체 교체 (PUT /api/study/state).
 * 알 수 없는 문제 ID 는 조용히 버린다.
 */
function replaceState(userId, state) {
  const bookmarked = content.filterKnownIds(state.bookmarked || []);
  const wrongIds = content.filterKnownIds(state.wrongIds || []);
  const historyEntries = Object.entries(state.history || {}).filter(([id]) => content.hasQuestion(id));
  const resumeQuestionId =
    state.resumeQuestionId && content.hasQuestion(state.resumeQuestionId)
      ? state.resumeQuestionId
      : null;

  const now = Date.now();
  const at = new Date(now).toISOString();

  return withImmediateTransaction((conn) => {
    conn.prepare('DELETE FROM bookmarks WHERE user_id = ?').run(userId);
    conn.prepare('DELETE FROM question_attempts WHERE user_id = ?').run(userId);
    conn.prepare('DELETE FROM wrong_questions WHERE user_id = ?').run(userId);

    const insertBookmark = conn.prepare(
      'INSERT INTO bookmarks (user_id, question_id, created_at) VALUES (?, ?, ?)'
    );
    bookmarked.forEach((questionId, index) => {
      // 배열 앞쪽이 최신이 되도록 created_at 을 역순으로 합성한다.
      insertBookmark.run(userId, questionId, new Date(now - index * 1000).toISOString());
    });

    const insertAttempt = conn.prepare(
      `INSERT INTO question_attempts (
         user_id, question_id, last_correct, last_choice,
         attempt_count, correct_count, wrong_count, first_answered_at, last_answered_at
       ) VALUES (?, ?, ?, NULL, 1, ?, ?, ?, ?)`
    );
    for (const [questionId, value] of historyEntries) {
      const isCorrect = value === true ? 1 : 0;
      insertAttempt.run(userId, questionId, isCorrect, isCorrect, isCorrect ? 0 : 1, at, at);
    }

    const insertWrong = conn.prepare(
      `INSERT INTO wrong_questions (user_id, question_id, first_wrong_at, last_wrong_at, wrong_count)
       VALUES (?, ?, ?, ?, 1)`
    );
    wrongIds.forEach((questionId, index) => {
      // first_wrong_at DESC 로 읽으므로, 배열 앞쪽이 더 최근이 되도록 합성한다.
      const stamp = new Date(now - index * 1000).toISOString();
      insertWrong.run(userId, questionId, stamp, stamp);
    });

    conn
      .prepare(
        `INSERT INTO study_progress (user_id, resume_question_id, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET
           resume_question_id = excluded.resume_question_id,
           updated_at = excluded.updated_at`
      )
      .run(userId, resumeQuestionId, at);

    return {
      bookmarked: bookmarked.length,
      history: historyEntries.length,
      wrongIds: wrongIds.length
    };
  });
}

/** "초기화" 버튼. 계정은 유지하고 학습 데이터만 비운다. */
function resetState(userId) {
  const at = nowIso();
  return withImmediateTransaction((conn) => {
    conn.prepare('DELETE FROM bookmarks WHERE user_id = ?').run(userId);
    conn.prepare('DELETE FROM question_attempts WHERE user_id = ?').run(userId);
    conn.prepare('DELETE FROM wrong_questions WHERE user_id = ?').run(userId);
    conn
      .prepare('UPDATE study_progress SET resume_question_id = ?, updated_at = ? WHERE user_id = ?')
      .run(null, at, userId);
    return true;
  });
}

/**
 * localStorage 기록 1회 병합.
 *
 * 계정/비밀번호는 절대 이관하지 않는다(설계 문서 5.2). 학습 기록만 합친다.
 * 규칙: 북마크·오답은 합집합, history 는 서버 우선, 가져온 오답은 서버 기록보다 과거로 배치.
 */
function importLocalState(userId, state) {
  const bookmarked = content.filterKnownIds(state.bookmarked || []);
  const wrongIds = content.filterKnownIds(state.wrongIds || []);
  const historyEntries = Object.entries(state.history || {}).filter(([id]) => content.hasQuestion(id));

  const submitted =
    bookmarked.length + wrongIds.length + historyEntries.length + (state.resumeQuestionId ? 1 : 0);

  return withImmediateTransaction((conn) => {
    const user = conn.prepare('SELECT local_import_at FROM users WHERE id = ?').get(userId);
    if (!user) return { alreadyImported: false, imported: 0, skipped: 0, applied: false };
    if (user.local_import_at) {
      return { alreadyImported: true, imported: 0, skipped: 0, applied: false };
    }

    const now = Date.now();
    const at = new Date(now).toISOString();
    // 가져온 오답은 서버에 이미 있는 기록보다 과거여야 한다(더 오래된 데이터이므로).
    const importBase = now - 365 * 24 * 60 * 60 * 1000;
    let imported = 0;

    const insertBookmark = conn.prepare(
      `INSERT INTO bookmarks (user_id, question_id, created_at) VALUES (?, ?, ?)
       ON CONFLICT (user_id, question_id) DO NOTHING`
    );
    bookmarked.forEach((questionId, index) => {
      imported += insertBookmark.run(
        userId,
        questionId,
        new Date(importBase - index * 1000).toISOString()
      ).changes;
    });

    // history: 서버에 행이 없을 때만 채운다(서버 기록이 더 최신이므로).
    const insertAttempt = conn.prepare(
      `INSERT INTO question_attempts (
         user_id, question_id, last_correct, last_choice,
         attempt_count, correct_count, wrong_count, first_answered_at, last_answered_at
       ) VALUES (?, ?, ?, NULL, 1, ?, ?, ?, ?)
       ON CONFLICT (user_id, question_id) DO NOTHING`
    );
    for (const [questionId, value] of historyEntries) {
      const isCorrect = value === true ? 1 : 0;
      imported += insertAttempt.run(
        userId,
        questionId,
        isCorrect,
        isCorrect,
        isCorrect ? 0 : 1,
        new Date(importBase).toISOString(),
        new Date(importBase).toISOString()
      ).changes;
    }

    const insertWrong = conn.prepare(
      `INSERT INTO wrong_questions (user_id, question_id, first_wrong_at, last_wrong_at, wrong_count)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT (user_id, question_id) DO NOTHING`
    );
    wrongIds.forEach((questionId, index) => {
      const stamp = new Date(importBase - index * 1000).toISOString();
      imported += insertWrong.run(userId, questionId, stamp, stamp).changes;
    });

    // 서버에 학습 활동이 전혀 없을 때만 로컬의 이어풀기 위치를 채택한다.
    if (state.resumeQuestionId && content.hasQuestion(state.resumeQuestionId)) {
      const activity = conn
        .prepare('SELECT COUNT(*) AS count FROM question_attempts WHERE user_id = ?')
        .get(userId);
      const current = conn
        .prepare('SELECT resume_question_id FROM study_progress WHERE user_id = ?')
        .get(userId);
      const isDefault =
        !current ||
        current.resume_question_id === null ||
        current.resume_question_id === content.defaultResumeQuestionId();
      if (activity.count === historyEntries.length && isDefault) {
        conn
          .prepare('UPDATE study_progress SET resume_question_id = ?, updated_at = ? WHERE user_id = ?')
          .run(state.resumeQuestionId, at, userId);
        imported += 1;
      }
    }

    conn.prepare('UPDATE users SET local_import_at = ?, updated_at = ? WHERE id = ?').run(at, at, userId);

    return { alreadyImported: false, imported, skipped: Math.max(0, submitted - imported), applied: true };
  });
}

/** 관리자 통계용 요약. */
function summarize(userId) {
  const db = getDb();
  const counts = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM bookmarks         WHERE user_id = ?) AS bookmarks,
         (SELECT COUNT(*) FROM question_attempts WHERE user_id = ?) AS attempts,
         (SELECT COUNT(*) FROM wrong_questions   WHERE user_id = ?) AS wrongs`
    )
    .get(userId, userId, userId);
  return counts;
}

module.exports = {
  ensureProgress,
  getState,
  setResume,
  addBookmark,
  removeBookmark,
  recordAnswer,
  replaceState,
  resetState,
  importLocalState,
  summarize
};
