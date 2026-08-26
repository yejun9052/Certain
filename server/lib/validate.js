'use strict';

/**
 * 입력 검증.
 *
 * 프론트엔드에도 같은 규칙이 있지만 그것은 UX 용이다.
 * 실제 강제는 여기서만 이루어진다.
 */

const { unprocessable } = require('./errors');

/** 기존 앱의 규칙을 유지한다: 영문·숫자·한글·밑줄·하이픈 1~20자 */
const LOGIN_ID_PATTERN = /^[a-z0-9가-힣_-]{1,20}$/u;

const PASSWORD_MIN = Number(process.env.PASSWORD_MIN_LENGTH || 4);
const PASSWORD_MAX = 200;

/**
 * 아이디 정규화.
 *
 * SQLite 의 lower() 와 COLLATE NOCASE 는 ASCII 전용이라 한글 아이디를 다루지 못한다.
 * 따라서 정규화는 반드시 애플리케이션에서 수행하고 그 결과를 저장한다.
 */
function normalizeLoginId(value) {
  return String(value == null ? '' : value)
    .normalize('NFKC')
    .trim()
    .toLowerCase();
}

function assertValidLoginId(normalized) {
  if (!normalized) {
    throw unprocessable('INVALID_LOGIN_ID', '아이디를 입력해주세요.');
  }
  if (normalized.length > 20) {
    throw unprocessable('INVALID_LOGIN_ID', '아이디는 20자 이하로 입력해주세요.');
  }
  if (!LOGIN_ID_PATTERN.test(normalized)) {
    throw unprocessable('INVALID_LOGIN_ID', '아이디는 영문·숫자·한글·_·-만 사용할 수 있어요.');
  }
  return normalized;
}

function assertValidPassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    throw unprocessable('INVALID_PASSWORD', `비밀번호는 ${PASSWORD_MIN}자 이상 입력해주세요.`);
  }
  if (password.length > PASSWORD_MAX) {
    throw unprocessable('INVALID_PASSWORD', `비밀번호는 ${PASSWORD_MAX}자 이하로 입력해주세요.`);
  }
  return password;
}

function assertString(value, field, { max = 64 } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw unprocessable('INVALID_INPUT', `${field} 값이 필요합니다.`);
  }
  if (value.length > max) {
    throw unprocessable('INVALID_INPUT', `${field} 값이 너무 깁니다.`);
  }
  return value.trim();
}

function assertStringArray(value, field, { maxItems = 1000, maxLength = 64 } = {}) {
  if (!Array.isArray(value)) {
    throw unprocessable('INVALID_INPUT', `${field} 은(는) 배열이어야 합니다.`);
  }
  if (value.length > maxItems) {
    throw unprocessable('INVALID_INPUT', `${field} 항목이 너무 많습니다. (최대 ${maxItems})`);
  }
  return value.filter((item) => typeof item === 'string' && item.length > 0 && item.length <= maxLength);
}

/**
 * 프론트엔드의 study state 블롭을 안전한 형태로 정리한다.
 * 알 수 없는 키/타입은 조용히 버린다.
 */
function sanitizeStudyState(input, { maxItems = 1000 } = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  const bookmarked = assertStringArray(source.bookmarked || [], 'bookmarked', { maxItems });
  const wrongIds = assertStringArray(source.wrongIds || [], 'wrongIds', { maxItems });

  const rawHistory =
    source.history && typeof source.history === 'object' && !Array.isArray(source.history)
      ? source.history
      : {};
  const historyEntries = Object.entries(rawHistory).slice(0, maxItems);
  const history = {};
  for (const [key, value] of historyEntries) {
    if (typeof key !== 'string' || key.length === 0 || key.length > 64) continue;
    if (typeof value !== 'boolean') continue; // 기존 앱은 boolean 만 저장한다
    history[key] = value;
  }

  const resumeQuestionId =
    typeof source.resumeQuestionId === 'string' && source.resumeQuestionId.length <= 64
      ? source.resumeQuestionId
      : null;

  return { bookmarked, history, wrongIds, resumeQuestionId };
}

module.exports = {
  LOGIN_ID_PATTERN,
  PASSWORD_MIN,
  normalizeLoginId,
  assertValidLoginId,
  assertValidPassword,
  assertString,
  assertStringArray,
  sanitizeStudyState
};
