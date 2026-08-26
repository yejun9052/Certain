'use strict';

/**
 * 메모리 기반 슬라이딩 윈도 레이트리밋.
 *
 * 단일 프로세스 배포를 전제로 한다(설계 문서 8장 참고).
 * 프로세스를 재시작하면 카운터가 초기화된다는 점을 알고 쓸 것.
 */

const { tooMany } = require('../lib/errors');

const buckets = new Map();
let lastSweep = Date.now();

function sweep(now) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hits] of buckets) {
    if (!hits.length || hits[hits.length - 1] < now - 3_600_000) buckets.delete(key);
  }
}

/**
 * @param {object} options
 * @param {number} options.windowMs 윈도 길이
 * @param {number} options.max      윈도 내 최대 요청 수
 * @param {(req:object)=>string} options.key 버킷 키 계산기
 */
function rateLimit({ windowMs, max, key, message }) {
  return (req, res, next) => {
    const now = Date.now();
    sweep(now);

    const bucketKey = `${req.method}:${key(req)}`;
    const hits = (buckets.get(bucketKey) || []).filter((time) => time > now - windowMs);

    if (hits.length >= max) {
      const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      next(tooMany('RATE_LIMITED', message));
      return;
    }

    hits.push(now);
    buckets.set(bucketKey, hits);
    next();
  };
}

const clientIp = (req) => req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';

/** 한도는 환경변수로 조정할 수 있다(자동 테스트나 사내망 배포에서 필요할 수 있다). */
function limitFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/** 로그인: IP + 아이디 조합으로 제한한다. */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: limitFromEnv('RATE_LIMIT_LOGIN_MAX', 10),
  message: '로그인 시도가 너무 잦습니다. 잠시 후 다시 시도해주세요.',
  key: (req) => `${clientIp(req)}|${String((req.body && req.body.loginId) || '').slice(0, 40)}`
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: limitFromEnv('RATE_LIMIT_REGISTER_MAX', 10),
  message: '가입 시도가 너무 잦습니다. 잠시 후 다시 시도해주세요.',
  key: (req) => clientIp(req)
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: limitFromEnv('RATE_LIMIT_WRITE_MAX', 300),
  message: '요청이 너무 잦습니다.',
  key: (req) => (req.auth ? `u${req.auth.user.id}` : clientIp(req))
});

function resetAll() {
  buckets.clear();
}

module.exports = { rateLimit, loginLimiter, registerLimiter, writeLimiter, resetAll };
