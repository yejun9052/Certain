'use strict';

/**
 * 인증/인가 미들웨어.
 *
 * 핵심 원칙
 *  1. 학습 API 는 클라이언트가 보낸 user_id 를 절대 받지 않는다. 세션의 것만 쓴다.
 *  2. 역할은 요청마다 DB 에서 다시 읽는다(세션 조회에 포함). 클라이언트가 보낸 role 은
 *     화면 표시용 힌트일 뿐 인가 근거가 아니다.
 */

const session = require('../lib/session');
const { unauthorized, forbidden } = require('../lib/errors');

/** 모든 요청에 req.auth 를 채운다. 미인증이면 null. */
function attachSession(req, res, next) {
  const rawToken = session.readTokenFromRequest(req);
  const resolved = rawToken ? session.resolveSession(rawToken) : null;

  if (rawToken && !resolved) {
    // 만료되었거나 폐기된 토큰이면 브라우저에서도 지운다.
    session.clearSessionCookie(res);
  }

  if (resolved && resolved.renewed) {
    session.setSessionCookie(res, rawToken, resolved.expiresAt);
  }

  req.auth = resolved ? { user: resolved.user, rawToken, sessionId: resolved.sessionId } : null;
  next();
}

/** 로그인 필수. */
function requireAuth(req, res, next) {
  if (!req.auth) {
    next(unauthorized());
    return;
  }
  next();
}

/** 특정 역할 필수. requireAuth 뒤에 사용한다. */
function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.auth) {
      next(unauthorized());
      return;
    }
    if (!allowed.has(req.auth.user.role)) {
      next(forbidden('FORBIDDEN', '이 기능은 관리자만 사용할 수 있습니다.'));
      return;
    }
    next();
  };
}

module.exports = { attachSession, requireAuth, requireRole };
