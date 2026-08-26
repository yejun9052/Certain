'use strict';

/**
 * 관리자 라우트. /api/admin 에 마운트되며 requireRole('admin') 뒤에 있다.
 *
 * 프론트엔드에서 메뉴를 숨기는 것은 편의일 뿐이고, 실제 차단은 여기서 이루어진다.
 */

const express = require('express');
const users = require('../lib/users');
const { getDb } = require('../db');
const { sendOk, asyncHandler, unprocessable } = require('../lib/errors');

const router = express.Router();

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    sendOk(res, { users: users.listUsers(), adminCount: users.countAdmins() });
  })
);

router.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId)) {
      throw unprocessable('INVALID_USER_ID', '올바르지 않은 사용자 ID 입니다.');
    }

    const { role, status } = req.body || {};
    if (role === undefined && status === undefined) {
      throw unprocessable('NOTHING_TO_UPDATE', '변경할 값이 없습니다.');
    }

    const updated = users.updateUser(targetId, { role, status }, { actingUserId: req.auth.user.id });
    sendOk(res, { user: updated });
  })
);

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId)) {
      throw unprocessable('INVALID_USER_ID', '올바르지 않은 사용자 ID 입니다.');
    }
    users.deleteUser(targetId, { actingUserId: req.auth.user.id });
    sendOk(res, { deleted: true });
  })
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const totals = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM users)             AS users,
           (SELECT COUNT(*) FROM sessions)          AS sessions,
           (SELECT COUNT(*) FROM question_attempts) AS attempts,
           (SELECT COUNT(*) FROM wrong_questions)   AS wrongs,
           (SELECT COUNT(*) FROM bookmarks)         AS bookmarks`
      )
      .get();

    const byUnit = db
      .prepare(
        `SELECT u.id AS unit_id, u.title AS unit_title, COUNT(w.question_id) AS wrong_count
           FROM units u
           LEFT JOIN question_catalog q ON q.unit_id = u.id
           LEFT JOIN wrong_questions  w ON w.question_id = q.question_id
          GROUP BY u.id, u.title
          ORDER BY u.sort_no`
      )
      .all();

    sendOk(res, { totals, byUnit });
  })
);

module.exports = router;
