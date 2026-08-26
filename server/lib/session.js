'use strict';

/**
 * 서버 측 세션.
 *
 * - 쿠키에는 256비트 불투명 토큰만 담는다(HttpOnly 라 JS 로 읽을 수 없다).
 * - DB 에는 원본이 아니라 sha256 해시를 저장한다. DB 가 유출돼도 살아있는 세션을
 *   그대로 탈취당하지 않는다.
 * - 역할/상태는 요청마다 DB 에서 다시 읽는다. 강등·비활성이 즉시 반영된다.
 */

const crypto = require('node:crypto');
const { getDb, nowIso } = require('../db');

const COOKIE_NAME = 'certain_sid';
const TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
/** 만료가 이 시간 이내로 남으면 슬라이딩 연장한다. */
const RENEW_WITHIN_MS = 7 * 24 * 60 * 60 * 1000;

const COOKIE_SECURE = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

function cookieOptions(extra = {}) {
  return {
    httpOnly: true, // XSS 로 토큰을 읽어갈 수 없다
    sameSite: 'lax', // 외부 사이트에서 시작된 상태 변경 요청을 브라우저가 차단
    secure: COOKIE_SECURE, // HTTPS 배포 시 COOKIE_SECURE=true
    path: '/',
    ...extra
  };
}

/**
 * 새 세션을 만들고 원본 토큰을 돌려준다.
 * 로그인/가입마다 새 ID 를 발급하므로 세션 고정 공격이 성립하지 않는다.
 */
function createSession(userId, { userAgent = null, ip = null } = {}) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_MS);

  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, created_at, last_seen_at, expires_at, user_agent, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      hashToken(rawToken),
      userId,
      now.toISOString(),
      now.toISOString(),
      expiresAt.toISOString(),
      userAgent ? String(userAgent).slice(0, 255) : null,
      ip ? String(ip).slice(0, 64) : null
    );

  return { rawToken, expiresAt };
}

/**
 * 토큰으로 세션과 사용자를 조회한다.
 * 만료·비활성 계정이면 세션을 정리하고 null 을 반환한다.
 */
function resolveSession(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const db = getDb();
  const id = hashToken(rawToken);
  const row = db
    .prepare(
      `SELECT s.id          AS session_id,
              s.expires_at  AS expires_at,
              u.id          AS user_id,
              u.login_id    AS login_id,
              u.role        AS role,
              u.status      AS status,
              u.created_at  AS created_at,
              u.last_login_at AS last_login_at,
              u.local_import_at AS local_import_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = ?`
    )
    .get(id);

  if (!row) return null;

  const now = new Date();
  if (new Date(row.expires_at).getTime() <= now.getTime()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return null;
  }

  if (row.status !== 'active') {
    // 비활성 계정의 세션은 즉시 폐기한다.
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    return null;
  }

  // last_seen_at 갱신 + 만료 임박 시 슬라이딩 연장
  let expiresAt = new Date(row.expires_at);
  const shouldRenew = expiresAt.getTime() - now.getTime() < RENEW_WITHIN_MS;
  if (shouldRenew) {
    expiresAt = new Date(now.getTime() + TTL_MS);
    db.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?').run(
      now.toISOString(),
      expiresAt.toISOString(),
      id
    );
  } else {
    db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(now.toISOString(), id);
  }

  return {
    sessionId: id,
    renewed: shouldRenew,
    expiresAt,
    user: {
      id: row.user_id,
      loginId: row.login_id,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      localImportAt: row.local_import_at
    }
  };
}

function destroySession(rawToken) {
  if (!rawToken) return 0;
  return getDb().prepare('DELETE FROM sessions WHERE id = ?').run(hashToken(rawToken)).changes;
}

/** 특정 사용자의 모든 세션을 폐기한다(비밀번호 변경, 강등, 계정 비활성 등). */
function destroyAllForUser(userId, { exceptRawToken = null } = {}) {
  const db = getDb();
  if (exceptRawToken) {
    return db
      .prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?')
      .run(userId, hashToken(exceptRawToken)).changes;
  }
  return db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId).changes;
}

function pruneExpired() {
  return getDb().prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso()).changes;
}

function setSessionCookie(res, rawToken, expiresAt) {
  res.cookie(COOKIE_NAME, rawToken, cookieOptions({ expires: expiresAt }));
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

function readTokenFromRequest(req) {
  return (req.cookies && req.cookies[COOKIE_NAME]) || null;
}

module.exports = {
  COOKIE_NAME,
  TTL_DAYS,
  createSession,
  resolveSession,
  destroySession,
  destroyAllForUser,
  pruneExpired,
  setSessionCookie,
  clearSessionCookie,
  readTokenFromRequest
};
