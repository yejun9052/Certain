'use strict';

/**
 * 학습 콘텐츠(단원/문제) 로더.
 *
 * 본문·선택지·해설은 content/content.json 이 관리한다. DB에는 ID만 넣어
 * 학습 데이터의 참조 무결성을 확보한다(units, question_catalog).
 *
 * 이 모듈이 서버 채점의 근거가 된다. 클라이언트가 보낸 정답 여부는 신뢰하지 않는다.
 */

const fs = require('node:fs');
const path = require('node:path');
const { getDb, nowIso, withTransaction } = require('../db');

const CONTENT_PATH =
  process.env.CONTENT_PATH || path.resolve(__dirname, '..', '..', 'content', 'content.json');

/** 배열 이름 → question_catalog.kind */
const KIND_BY_COLLECTION = {
  questionBank: 'practice',
  mockQuestions: 'mock',
  aiMockQuestions: 'ai'
};

let content = null;
/** @type {Map<string, object>} questionId → 문제(+ kind) */
let questionIndex = new Map();

function load() {
  if (content) return content;

  const raw = fs.readFileSync(CONTENT_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  for (const key of ['units', 'questionBank', 'mockQuestions', 'aiMockQuestions', 'mockSets']) {
    if (!Array.isArray(parsed[key])) {
      throw new Error(`content.json 형식 오류: ${key} 배열이 없습니다.`);
    }
  }

  const index = new Map();
  const unitIds = new Set(parsed.units.map((unit) => unit.id));

  for (const [collection, kind] of Object.entries(KIND_BY_COLLECTION)) {
    for (const question of parsed[collection]) {
      if (!question.id) throw new Error(`content.json: ${collection} 항목에 id 가 없습니다.`);
      if (index.has(question.id)) throw new Error(`content.json: 중복 문제 id ${question.id}`);
      if (!unitIds.has(question.unit)) {
        throw new Error(`content.json: 알 수 없는 unit "${question.unit}" (${question.id})`);
      }
      index.set(question.id, { ...question, kind });
    }
  }

  content = parsed;
  questionIndex = index;
  return content;
}

/** 부팅 시 content.json 의 ID를 DB 카탈로그에 반영한다. */
function syncCatalog() {
  load();
  const db = getDb();

  return withTransaction((conn) => {
    const upsertUnit = conn.prepare(`
      INSERT INTO units (id, number, title, code, sort_no)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        number = excluded.number,
        title  = excluded.title,
        code   = excluded.code,
        sort_no = excluded.sort_no
    `);

    content.units.forEach((unit, position) => {
      upsertUnit.run(unit.id, String(unit.number), unit.title, unit.code, position);
    });

    const upsertQuestion = conn.prepare(`
      INSERT INTO question_catalog (question_id, unit_id, kind, active)
      VALUES (?, ?, ?, 1)
      ON CONFLICT (question_id) DO UPDATE SET
        unit_id = excluded.unit_id,
        kind    = excluded.kind,
        active  = 1
    `);

    for (const question of questionIndex.values()) {
      upsertQuestion.run(question.id, question.unit, question.kind);
    }

    // content.json 에서 사라진 문제는 삭제하지 않고 비활성화한다.
    // (학습 이력이 FK 로 참조하고 있으므로 삭제하면 이력이 유실된다.)
    const known = [...questionIndex.keys()];
    const placeholders = known.map(() => '?').join(',');
    const deactivated = conn
      .prepare(
        `UPDATE question_catalog SET active = 0
         WHERE active = 1 AND question_id NOT IN (${placeholders})`
      )
      .run(...known);

    return {
      units: content.units.length,
      questions: questionIndex.size,
      deactivated: deactivated.changes
    };
  });
}

/** /api/content 응답 본문. 인증된 사용자에게만 제공한다. */
function getPublicContent() {
  load();
  return {
    units: content.units,
    questionBank: content.questionBank,
    mockQuestions: content.mockQuestions,
    aiMockQuestions: content.aiMockQuestions,
    mockSets: content.mockSets
  };
}

function getQuestion(questionId) {
  load();
  return questionIndex.get(questionId) || null;
}

function hasQuestion(questionId) {
  load();
  return questionIndex.has(questionId);
}

/** 존재하는 문제 ID만 남긴다. 이관/입력 검증에 사용한다. */
function filterKnownIds(ids) {
  load();
  const seen = new Set();
  const kept = [];
  for (const id of ids) {
    if (typeof id !== 'string' || seen.has(id) || !questionIndex.has(id)) continue;
    seen.add(id);
    kept.push(id);
  }
  return kept;
}

/**
 * 서버 채점. 객관식만 자동 채점한다.
 * @returns {{correct:boolean, correctIndex:number|null, explanation:string}|null}
 */
function grade(questionId, selectedIndex) {
  const question = getQuestion(questionId);
  if (!question) return null;
  if (!Array.isArray(question.choices)) return null;

  const index = Number(selectedIndex);
  if (!Number.isInteger(index) || index < 0 || index >= question.choices.length) return null;

  return {
    correct: index === question.answer,
    correctIndex: question.answer,
    explanation: question.explanation || ''
  };
}

/** 기본 이어풀기 위치. content 의 첫 연습 문제를 쓴다. */
function defaultResumeQuestionId() {
  load();
  return (content.questionBank[0] && content.questionBank[0].id) || 'q-01';
}

function stats() {
  load();
  return {
    units: content.units.length,
    questions: questionIndex.size,
    loadedAt: nowIso()
  };
}

module.exports = {
  load,
  syncCatalog,
  getPublicContent,
  getQuestion,
  hasQuestion,
  filterKnownIds,
  grade,
  defaultResumeQuestionId,
  stats,
  CONTENT_PATH
};
