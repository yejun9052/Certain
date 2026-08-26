'use strict';

/**
 * 학습 상태 라우트. /api/study 에 마운트되며 전부 로그인이 필요하다.
 *
 *   GET    /api/study/state              현재 학습 상태
 *   PUT    /api/study/state              학습 상태 전체 교체
 *   DELETE /api/study/state              초기화
 *   POST   /api/study/answers            채점(서버 판정) + 기록
 *   PUT    /api/study/resume             이어풀기 위치
 *   POST   /api/study/bookmarks          북마크 추가
 *   DELETE /api/study/bookmarks/:id      북마크 제거
 *   POST   /api/study/import-local       localStorage 기록 1회 가져오기
 *
 * 어떤 엔드포인트도 클라이언트에서 user_id 를 받지 않는다. 항상 세션의 사용자다.
 */

const express = require('express');
const studyState = require('../lib/studyState');
const content = require('../lib/content');
const { sendOk, asyncHandler, unprocessable, conflict } = require('../lib/errors');
const { assertString, sanitizeStudyState } = require('../lib/validate');
const { writeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get(
  '/state',
  asyncHandler(async (req, res) => {
    sendOk(res, studyState.getState(req.auth.user.id));
  })
);

router.put(
  '/state',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const sanitized = sanitizeStudyState((req.body && req.body.state) || req.body);
    studyState.replaceState(req.auth.user.id, sanitized);
    sendOk(res, studyState.getState(req.auth.user.id));
  })
);

router.delete(
  '/state',
  asyncHandler(async (req, res) => {
    studyState.resetState(req.auth.user.id);
    sendOk(res, studyState.getState(req.auth.user.id));
  })
);

/**
 * 채점은 서버가 한다. 클라이언트가 보낸 정답 여부는 받지 않는다.
 * 조작된 요청으로 오답/정답 기록을 위조할 수 없다.
 */
router.post(
  '/answers',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const questionId = assertString((req.body || {}).questionId, 'questionId');
    const selectedIndex = (req.body || {}).selectedIndex;

    const question = content.getQuestion(questionId);
    if (!question) {
      throw unprocessable('UNKNOWN_QUESTION', '존재하지 않는 문제입니다.');
    }

    const graded = content.grade(questionId, selectedIndex);
    if (!graded) {
      throw unprocessable('INVALID_ANSWER', '선택한 답이 올바르지 않습니다.');
    }

    studyState.recordAnswer(req.auth.user.id, questionId, graded.correct, selectedIndex);
    studyState.setResume(req.auth.user.id, questionId);

    sendOk(res, {
      questionId,
      correct: graded.correct,
      correctIndex: graded.correctIndex,
      explanation: graded.explanation,
      state: studyState.getState(req.auth.user.id)
    });
  })
);

router.put(
  '/resume',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const questionId = assertString((req.body || {}).questionId, 'questionId');
    if (!studyState.setResume(req.auth.user.id, questionId)) {
      throw unprocessable('UNKNOWN_QUESTION', '존재하지 않는 문제입니다.');
    }
    sendOk(res, { resumeQuestionId: questionId });
  })
);

router.post(
  '/bookmarks',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const questionId = assertString((req.body || {}).questionId, 'questionId');
    if (!studyState.addBookmark(req.auth.user.id, questionId)) {
      throw unprocessable('UNKNOWN_QUESTION', '존재하지 않는 문제입니다.');
    }
    sendOk(res, { questionId, bookmarked: true });
  })
);

router.delete(
  '/bookmarks/:questionId',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const questionId = assertString(req.params.questionId, 'questionId');
    studyState.removeBookmark(req.auth.user.id, questionId);
    sendOk(res, { questionId, bookmarked: false });
  })
);

/**
 * 브라우저에 남아있던 학습 기록을 1회만 가져온다.
 * 계정과 비밀번호는 이관 대상이 아니다(클라이언트도 전송하지 않는다).
 */
router.post(
  '/import-local',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const sanitized = sanitizeStudyState((req.body && req.body.state) || req.body);
    const result = studyState.importLocalState(req.auth.user.id, sanitized);

    if (result.alreadyImported) {
      throw conflict('ALREADY_IMPORTED', '이 계정은 이미 기존 기록을 가져왔습니다.');
    }

    sendOk(res, {
      imported: result.imported,
      skipped: result.skipped,
      state: studyState.getState(req.auth.user.id)
    });
  })
);

module.exports = router;
