'use strict';

/**
 * 인증 라우트. /api/auth 에 마운트된다.
 *
 *   GET  /api/auth/me        세션 확인 (미인증이어도 200)
 *   POST /api/auth/register  회원가입 (첫 정상 가입자만 admin)
 *   POST /api/auth/login     로그인
 *   POST /api/auth/logout    로그아웃
 *   POST /api/auth/password  비밀번호 변경
 */

const express = require('express');
const users = require('../lib/users');
const session = require('../lib/session');
const content = require('../lib/content');
const { sendOk, asyncHandler, unprocessable } = require('../lib/errors');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit');

const router = express.Router();

function requestMeta(req) {
  return {
    userAgent: req.headers['user-agent'] || null,
    ip: req.ip || (req.socket && req.socket.remoteAddress) || null
  };
}

/** 로그인 성공 후 공통 처리: 세션 발급 + 쿠키 설정. */
function establishSession(req, res, user) {
  const { rawToken, expiresAt } = session.createSession(user.id, requestMeta(req));
  session.setSessionCookie(res, rawToken, expiresAt);
}

/**
 * 부트스트랩 엔드포인트.
 * 프론트엔드는 이 응답만으로 로그인 여부와 역할을 판단한다.
 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      sendOk(res, {
        authenticated: false,
        user: null,
        firstUserWillBeAdmin: users.firstUserWillBeAdmin()
      });
      return;
    }
    sendOk(res, {
      authenticated: true,
      user: req.auth.user,
      firstUserWillBeAdmin: false
    });
  })
);

router.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const { loginId, password, passwordConfirm } = req.body || {};

    if (passwordConfirm !== undefined && password !== passwordConfirm) {
      throw unprocessable('PASSWORD_MISMATCH', '비밀번호가 서로 달라요.');
    }

    const user = users.register({ loginId, password });
    establishSession(req, res, user);

    sendOk(
      res,
      {
        authenticated: true,
        user,
        // 첫 가입자에게만 true. 프론트엔드에서 안내 문구를 띄우는 데 쓴다.
        grantedAdmin: user.role === 'admin'
      },
      201
    );
  })
);

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { loginId, password } = req.body || {};
    const user = users.authenticate({ loginId, password });
    establishSession(req, res, user);
    sendOk(res, { authenticated: true, user });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    // 미인증 상태에서도 성공으로 처리한다(멱등).
    if (req.auth) session.destroySession(req.auth.rawToken);
    session.clearSessionCookie(res);
    sendOk(res, { authenticated: false });
  })
);

router.post(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    users.changePassword(req.auth.user.id, { currentPassword, newPassword });
    // 현재 세션만 남기고 나머지는 폐기한다.
    session.destroyAllForUser(req.auth.user.id, { exceptRawToken: req.auth.rawToken });
    sendOk(res, { changed: true });
  })
);

/** 회원가입 화면 안내용. 가입자가 아직 없으면 다음 가입자가 관리자가 된다. */
router.get(
  '/bootstrap-status',
  asyncHandler(async (req, res) => {
    sendOk(res, {
      firstUserWillBeAdmin: users.firstUserWillBeAdmin(),
      content: content.stats()
    });
  })
);

module.exports = router;
