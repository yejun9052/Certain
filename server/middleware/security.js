'use strict';

/**
 * 보안 헤더와 CSRF 완화.
 *
 * 세션이 쿠키 기반이므로 CSRF 방어가 필요하다. 토큰을 따로 배포하는 대신 두 겹으로 막는다.
 *   1) 쿠키의 SameSite=Lax  — 외부 사이트에서 시작된 상태 변경 요청을 브라우저가 차단
 *   2) originGuard          — Origin/Referer 가 자기 자신인지 서버가 직접 확인
 *
 * CORS 헤더는 의도적으로 내보내지 않는다. 프론트엔드가 같은 출처에서 서빙되므로
 * 교차 출처 접근을 허용할 이유가 없다.
 */

const { forbidden, badRequest } = require('../lib/errors');

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // Express 기본값은 스택 정보를 흘릴 수 있는 힌트를 준다.
  res.removeHeader('X-Powered-By');
  next();
}

function selfOrigins(req) {
  const host = req.headers.host;
  if (!host) return [];
  const proto = req.protocol || 'http';
  const set = new Set([`${proto}://${host}`, `http://${host}`, `https://${host}`]);
  return [...set];
}

/**
 * 상태 변경 요청에서 Origin(없으면 Referer)이 자기 자신인지 확인한다.
 * 두 헤더가 모두 없는 요청(curl 등 비브라우저)은 CSRF 가 성립하지 않으므로 통과시킨다.
 */
function originGuard(req, res, next) {
  if (!STATE_CHANGING.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowed = selfOrigins(req);

  if (origin) {
    if (!allowed.includes(origin)) {
      next(forbidden('CROSS_ORIGIN_BLOCKED', '허용되지 않은 요청 출처입니다.'));
      return;
    }
    next();
    return;
  }

  if (referer) {
    let refererOrigin = null;
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      refererOrigin = null;
    }
    if (!refererOrigin || !allowed.includes(refererOrigin)) {
      next(forbidden('CROSS_ORIGIN_BLOCKED', '허용되지 않은 요청 출처입니다.'));
      return;
    }
  }

  next();
}

/**
 * 본문이 있는 요청은 JSON 만 허용한다.
 * 단순 폼 전송(text/plain, application/x-www-form-urlencoded, multipart)으로 만드는
 * CSRF 시도를 차단한다.
 */
function requireJsonBody(req, res, next) {
  if (!STATE_CHANGING.has(req.method)) {
    next();
    return;
  }

  const hasBody =
    req.headers['content-length'] !== undefined && Number(req.headers['content-length']) > 0;
  if (!hasBody && !req.headers['transfer-encoding']) {
    next();
    return;
  }

  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.toLowerCase().startsWith('application/json')) {
    next(badRequest('UNSUPPORTED_MEDIA_TYPE', 'application/json 요청만 허용됩니다.'));
    return;
  }
  next();
}

module.exports = { securityHeaders, originGuard, requireJsonBody };
