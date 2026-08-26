'use strict';

/**
 * 비밀번호 해시 (node:crypto scrypt).
 *
 * 저장 형식: scrypt$N$r$p$<saltB64>$<hashB64>
 * 파라미터를 해시 문자열에 함께 담으므로, 나중에 N 을 올려도
 * 로그인 성공 시점에 재해시하는 점진적 업그레이드가 가능하다.
 *
 * 평문 비밀번호는 DB·로그·에러 메시지 어디에도 남기지 않는다.
 */

const crypto = require('node:crypto');

const ALGORITHM = 'scrypt';
const N = 16384; // CPU/메모리 비용. 이 환경 측정치 약 35ms
const R = 8;
const P = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
// scrypt 는 128 * N * r 바이트를 쓴다 (여기서는 16MB). 기본 maxmem(32MB)로는 부족할 수 있어 명시한다.
const MAXMEM = 64 * 1024 * 1024;

function derive(password, salt, { n = N, r = R, p = P } = {}) {
  return crypto.scryptSync(Buffer.from(String(password), 'utf8'), salt, KEY_BYTES, {
    N: n,
    r,
    p,
    maxmem: MAXMEM
  });
}

/** @returns {string} 'scrypt$N$r$p$salt$hash' */
function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = derive(password, salt);
  return [ALGORITHM, N, R, P, salt.toString('base64'), hash.toString('base64')].join('$');
}

/**
 * 저장된 해시와 비교한다. 타이밍 공격을 피하기 위해 timingSafeEqual 을 쓴다.
 * 형식이 깨진 해시는 예외 대신 false 를 반환한다(로그인 경로가 죽지 않도록).
 */
function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== ALGORITHM) return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let salt;
  let expected;
  try {
    salt = Buffer.from(parts[4], 'base64');
    expected = Buffer.from(parts[5], 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let actual;
  try {
    actual = crypto.scryptSync(Buffer.from(String(password), 'utf8'), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAXMEM
    });
  } catch {
    return false;
  }

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/**
 * 존재하지 않는 아이디로 로그인을 시도해도 같은 시간이 걸리게 만든다.
 * (사용자 열거 방지) 서버 기동 시 1회 생성한다.
 */
const DUMMY_HASH = hashPassword(crypto.randomBytes(24).toString('base64'));

function wasteTime() {
  verifyPassword('certain-dummy-password', DUMMY_HASH);
}

/** 저장된 해시가 현재 권장 파라미터보다 약하면 true. */
function needsRehash(stored) {
  if (typeof stored !== 'string') return true;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== ALGORITHM) return true;
  return Number(parts[1]) < N || Number(parts[2]) < R || Number(parts[3]) < P;
}

module.exports = { hashPassword, verifyPassword, wasteTime, needsRehash, PARAMS: { N, R, P } };
