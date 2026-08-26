'use strict';

/**
 * 계정 도메인 로직.
 *
 * 최초 가입자 admin 보장이 여기 있다. 자세한 근거는 docs/auth-db-design.md 3장 참고.
 */

const { getDb, nowIso, withImmediateTransaction, isUniqueViolation } = require('../db');
const { hashPassword, verifyPassword, wasteTime, needsRehash } = require('./password');
const { normalizeLoginId, assertValidLoginId, assertValidPassword } = require('./validate');
const { conflict, unauthorized } = require('./errors');
const studyState = require('./studyState');

/** admin 슬롯을 나타내는 app_state 키. 한 번 설정되면 지우지 않는다. */
const ADMIN_CLAIM_KEY = 'admin_bootstrapped';

/** 클라이언트로 내보낼 수 있는 필드만 남긴다. password_hash 는 절대 포함하지 않는다. */
function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    loginId: row.login_id !== undefined ? row.login_id : row.loginId,
    role: row.role,
    status: row.status,
    createdAt: row.created_at !== undefined ? row.created_at : row.createdAt,
    lastLoginAt: row.last_login_at !== undefined ? row.last_login_at : row.lastLoginAt,
    localImportAt: row.local_import_at !== undefined ? row.local_import_at : row.localImportAt
  };
}

function countUsers() {
  return getDb().prepare('SELECT COUNT(*) AS count FROM users').get().count;
}

function isAdminClaimed() {
  return Boolean(getDb().prepare('SELECT 1 FROM app_state WHERE key = ?').get(ADMIN_CLAIM_KEY));
}

/** 회원가입 화면 안내용. "다음 가입자가 관리자가 되는가?" */
function firstUserWillBeAdmin() {
  return !isAdminClaimed();
}

function countAdmins() {
  return getDb().prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get().count;
}

function findByNormalizedId(normalized) {
  return getDb().prepare('SELECT * FROM users WHERE login_id_norm = ?').get(normalized);
}

function findById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/**
 * 회원가입.
 *
 * 동시성 보장:
 *  1) 비밀번호 해시(약 35ms)는 트랜잭션 밖에서 계산한다. 쓰기 락을 오래 잡지 않기 위해서다.
 *  2) BEGIN IMMEDIATE 로 시작해 트랜잭션 시작 시점에 쓰기 락을 획득한다.
 *  3) app_state PRIMARY KEY 충돌이 admin 슬롯의 승자를 중재한다. 애플리케이션 조건문이
 *     아니라 DB 제약이 판정하므로 코드에 버그가 있어도 두 명이 admin 이 될 수 없다.
 *  4) 사용자 INSERT 가 실패하면 ROLLBACK 이 admin 선점까지 되돌린다.
 *     즉 "정상 가입"만 슬롯을 소비한다.
 */
function register({ loginId, password }) {
  const normalized = assertValidLoginId(normalizeLoginId(loginId));
  assertValidPassword(password);

  const passwordHash = hashPassword(password); // 트랜잭션 밖
  const at = nowIso();
  const displayId = String(loginId).trim();

  return withImmediateTransaction((conn) => {
    const claim = conn
      .prepare(
        `INSERT OR IGNORE INTO app_state (key, value, updated_at)
         VALUES (?, ?, ?)`
      )
      .run(ADMIN_CLAIM_KEY, normalized, at);

    const role = claim.changes === 1 ? 'admin' : 'user';

    let created;
    try {
      created = conn
        .prepare(
          `INSERT INTO users (login_id, login_id_norm, password_hash, role, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           RETURNING id, login_id, role, status, created_at, last_login_at, local_import_at`
        )
        .get(displayId, normalized, passwordHash, role, at, at);
    } catch (error) {
      if (isUniqueViolation(error, 'users.login_id_norm')) {
        // ROLLBACK 이 admin 선점도 취소한다 → 슬롯 미소모
        throw conflict('DUPLICATE_LOGIN_ID', '이미 사용 중인 아이디예요.');
      }
      throw error;
    }

    studyState.ensureProgress(conn, created.id, at);

    return publicUser(created);
  });
}

/**
 * 로그인.
 * 아이디가 없을 때도 더미 해시로 같은 시간을 소모해 사용자 열거를 막는다.
 * 실패 메시지는 원인과 무관하게 항상 동일하다.
 */
function authenticate({ loginId, password }) {
  const normalized = normalizeLoginId(loginId);
  const invalid = () => unauthorized('INVALID_CREDENTIALS', '아이디 또는 비밀번호를 확인해주세요.');

  if (!normalized || typeof password !== 'string' || password.length === 0) {
    wasteTime();
    throw invalid();
  }

  const row = findByNormalizedId(normalized);
  if (!row) {
    wasteTime();
    throw invalid();
  }

  if (!verifyPassword(password, row.password_hash)) {
    throw invalid();
  }

  if (row.status !== 'active') {
    throw unauthorized('ACCOUNT_DISABLED', '사용이 중지된 계정입니다. 관리자에게 문의해주세요.');
  }

  const at = nowIso();
  const db = getDb();

  // scrypt 파라미터가 올라갔다면 로그인 성공 시점에 조용히 재해시한다.
  if (needsRehash(row.password_hash)) {
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      hashPassword(password),
      at,
      row.id
    );
  }

  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(at, at, row.id);
  studyState.ensureProgress(db, row.id, at);

  return publicUser({ ...row, last_login_at: at });
}

function changePassword(userId, { currentPassword, newPassword }) {
  const row = findById(userId);
  if (!row) throw unauthorized();
  if (!verifyPassword(currentPassword, row.password_hash)) {
    throw unauthorized('INVALID_CREDENTIALS', '현재 비밀번호가 올바르지 않습니다.');
  }
  assertValidPassword(newPassword);

  const at = nowIso();
  getDb()
    .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(hashPassword(newPassword), at, userId);
  return true;
}

// --- 관리자 기능 -----------------------------------------------------------

function listUsers({ limit = 200 } = {}) {
  return getDb()
    .prepare(
      `SELECT u.id, u.login_id, u.role, u.status, u.created_at, u.last_login_at, u.local_import_at,
              (SELECT COUNT(*) FROM bookmarks         b WHERE b.user_id = u.id) AS bookmark_count,
              (SELECT COUNT(*) FROM question_attempts a WHERE a.user_id = u.id) AS attempt_count,
              (SELECT COUNT(*) FROM wrong_questions   w WHERE w.user_id = u.id) AS wrong_count
         FROM users u
        ORDER BY u.created_at ASC
        LIMIT ?`
    )
    .all(limit)
    .map((row) => ({
      ...publicUser(row),
      bookmarkCount: row.bookmark_count,
      attemptCount: row.attempt_count,
      wrongCount: row.wrong_count
    }));
}

/**
 * 역할/상태 변경.
 * 마지막 남은 admin 을 강등하거나 비활성화하는 것은 거부한다.
 */
function updateUser(targetId, { role, status }, { actingUserId }) {
  return withImmediateTransaction((conn) => {
    const target = conn.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!target) throw conflict('USER_NOT_FOUND', '대상 계정을 찾을 수 없습니다.');

    const nextRole = role === undefined ? target.role : role;
    const nextStatus = status === undefined ? target.status : status;

    if (!['user', 'admin'].includes(nextRole)) {
      throw conflict('INVALID_ROLE', '역할 값이 올바르지 않습니다.');
    }
    if (!['active', 'disabled'].includes(nextStatus)) {
      throw conflict('INVALID_STATUS', '상태 값이 올바르지 않습니다.');
    }

    if (Number(targetId) === Number(actingUserId) && (nextRole !== 'admin' || nextStatus !== 'active')) {
      throw conflict('SELF_DEMOTION', '자기 자신의 권한은 변경할 수 없습니다.');
    }

    const losesAdmin = target.role === 'admin' && (nextRole !== 'admin' || nextStatus !== 'active');
    if (losesAdmin) {
      const remaining = conn
        .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active' AND id != ?")
        .get(targetId).count;
      if (remaining === 0) {
        throw conflict('LAST_ADMIN', '마지막 관리자는 강등하거나 비활성화할 수 없습니다.');
      }
    }

    const at = nowIso();
    conn
      .prepare('UPDATE users SET role = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(nextRole, nextStatus, at, targetId);

    // 권한이 줄었거나 계정이 잠겼다면 해당 사용자의 세션을 전부 폐기한다.
    if (losesAdmin || nextStatus !== 'active') {
      conn.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
    }

    return publicUser(conn.prepare('SELECT * FROM users WHERE id = ?').get(targetId));
  });
}

function deleteUser(targetId, { actingUserId }) {
  return withImmediateTransaction((conn) => {
    const target = conn.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!target) throw conflict('USER_NOT_FOUND', '대상 계정을 찾을 수 없습니다.');
    if (Number(targetId) === Number(actingUserId)) {
      throw conflict('SELF_DELETE', '자기 자신의 계정은 삭제할 수 없습니다.');
    }
    if (target.role === 'admin') {
      const remaining = conn
        .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active' AND id != ?")
        .get(targetId).count;
      if (remaining === 0) {
        throw conflict('LAST_ADMIN', '마지막 관리자는 삭제할 수 없습니다.');
      }
    }
    // 학습 데이터와 세션은 ON DELETE CASCADE 로 함께 정리된다.
    conn.prepare('DELETE FROM users WHERE id = ?').run(targetId);
    return true;
  });
}

/** CLI 복구 경로 (npm run grant-admin). 마지막 admin 이 사라졌을 때 사용한다. */
function grantAdmin(loginId) {
  const normalized = normalizeLoginId(loginId);
  return withImmediateTransaction((conn) => {
    const target = conn.prepare('SELECT * FROM users WHERE login_id_norm = ?').get(normalized);
    if (!target) return null;
    const at = nowIso();
    conn
      .prepare("UPDATE users SET role = 'admin', status = 'active', updated_at = ? WHERE id = ?")
      .run(at, target.id);
    conn
      .prepare(
        `INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO NOTHING`
      )
      .run(ADMIN_CLAIM_KEY, normalized, at);
    return publicUser(conn.prepare('SELECT * FROM users WHERE id = ?').get(target.id));
  });
}

module.exports = {
  ADMIN_CLAIM_KEY,
  publicUser,
  countUsers,
  countAdmins,
  isAdminClaimed,
  firstUserWillBeAdmin,
  findById,
  findByNormalizedId,
  register,
  authenticate,
  changePassword,
  listUsers,
  updateUser,
  deleteUser,
  grantAdmin
};
