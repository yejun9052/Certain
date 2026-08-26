'use strict';

/**
 * 에러 표현과 응답 규약.
 *
 * 응답 형태:
 *   성공  { ok: true,  data: ... }
 *   실패  { ok: false, error: { code, message } }
 *
 * 내부 오류의 스택이나 SQL 문 같은 세부 정보는 클라이언트로 내보내지 않는다.
 */

class HttpError extends Error {
  /**
   * @param {number} status HTTP 상태 코드
   * @param {string} code   기계가 읽는 코드 (예: 'DUPLICATE_LOGIN_ID')
   * @param {string} message 사용자에게 보여줄 한국어 메시지
   */
  constructor(status, code, message) {
    super(message || code);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.expose = true;
  }
}

const badRequest = (code, message) => new HttpError(400, code, message);
const unauthorized = (code = 'UNAUTHENTICATED', message = '로그인이 필요합니다.') =>
  new HttpError(401, code, message);
const forbidden = (code = 'FORBIDDEN', message = '권한이 없습니다.') => new HttpError(403, code, message);
const notFound = (code = 'NOT_FOUND', message = '대상을 찾을 수 없습니다.') =>
  new HttpError(404, code, message);
const conflict = (code, message) => new HttpError(409, code, message);
const unprocessable = (code, message) => new HttpError(422, code, message);
const tooMany = (code = 'RATE_LIMITED', message = '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.') =>
  new HttpError(429, code, message);

function sendOk(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

/** async 라우트 핸들러의 예외를 Express 에러 처리로 전달한다. */
function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: { code: 'NOT_FOUND', message: '요청한 경로를 찾을 수 없습니다.' }
  });
}

/** Express 최종 에러 핸들러. 반드시 4개 인자를 유지해야 한다. */
function errorHandler(logger = console) {
  // eslint-disable-next-line no-unused-vars
  return (error, req, res, next) => {
    if (res.headersSent) return;

    if (error instanceof HttpError) {
      res.status(error.status).json({ ok: false, error: { code: error.code, message: error.message } });
      return;
    }

    // JSON 파싱 실패 등 Express/body-parser 가 던지는 오류
    if (error && error.type === 'entity.parse.failed') {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_JSON', message: '요청 본문을 해석할 수 없습니다.' }
      });
      return;
    }
    if (error && error.type === 'entity.too.large') {
      res.status(413).json({
        ok: false,
        error: { code: 'PAYLOAD_TOO_LARGE', message: '요청 본문이 너무 큽니다.' }
      });
      return;
    }

    // 예상하지 못한 오류: 서버 로그에만 남기고 클라이언트에는 일반 메시지만 준다.
    logger.error('[error]', req.method, req.originalUrl, error);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: '서버에서 문제가 발생했습니다.' }
    });
  };
}

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  tooMany,
  sendOk,
  asyncHandler,
  notFoundHandler,
  errorHandler
};
