'use strict';

/**
 * SQLite 접근 계층.
 *
 * 애플리케이션의 다른 모듈은 node:sqlite 를 직접 require 하지 않는다.
 * 향후 better-sqlite3 나 PostgreSQL 로 교체할 때 이 파일만 바꾸면 되도록 격리한다.
 */

const fs = require('node:fs');
const path = require('node:path');

// node:sqlite 는 ExperimentalWarning 을 출력한다. 동작에는 문제가 없으므로
// 이 경고만 선별적으로 숨긴다. (require 전에 설치해야 한다.)
const originalEmitWarning = process.emitWarning;
process.emitWarning = function suppressSqliteExperimental(warning, ...rest) {
  const type = typeof rest[0] === 'string' ? rest[0] : rest[0] && rest[0].type;
  if (type === 'ExperimentalWarning' && /SQLite/i.test(String(warning))) return undefined;
  return originalEmitWarning.call(process, warning, ...rest);
};

const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_DB_PATH = path.join(ROOT, 'data', 'certain.sqlite');

let db = null;
let dbPath = null;

function nowIso() {
  return new Date().toISOString();
}

/** 연결을 열고 필수 PRAGMA 를 적용한다. */
function open(file = process.env.DB_PATH || DEFAULT_DB_PATH) {
  if (db) return db;

  dbPath = path.resolve(file);
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  db = new DatabaseSync(dbPath);
  // journal_mode 는 영속 설정, 나머지는 연결마다 적용해야 한다.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON'); // 끄면 ON DELETE CASCADE 가 무효가 된다
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA synchronous = NORMAL');
  return db;
}

function getDb() {
  if (!db) open();
  return db;
}

function getDbPath() {
  return dbPath;
}

function close() {
  if (!db) return;
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {
    /* 체크포인트 실패는 종료를 막을 이유가 되지 않는다 */
  }
  db.close();
  db = null;
  dbPath = null;
}

// --- 오류 판별 -------------------------------------------------------------

function isBusyError(error) {
  const message = String((error && error.message) || '');
  return /database is locked|database table is locked|SQLITE_BUSY|busy/i.test(message);
}

/**
 * UNIQUE / PRIMARY KEY 제약 위반인지 확인한다.
 * @param {unknown} error
 * @param {string} [column] 'users.login_id_norm' 처럼 특정 컬럼으로 좁히고 싶을 때
 */
function isUniqueViolation(error, column) {
  const message = String((error && error.message) || '');
  if (!/UNIQUE constraint failed/i.test(message)) return false;
  return column ? message.includes(column) : true;
}

function sleepSync(ms) {
  // node:sqlite 는 동기 API 이므로 재시도 대기도 동기여야 한다.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// --- 트랜잭션 --------------------------------------------------------------

/**
 * BEGIN IMMEDIATE 트랜잭션.
 *
 * 시작 시점에 쓰기 락을 잡으므로 "읽을 때는 없었는데 쓸 때 생겼다"는
 * 지연 락(BEGIN DEFERRED)의 경쟁 조건이 발생하지 않는다.
 * 최초 admin 선점(app_state)의 정확성이 여기에 의존한다.
 */
function withImmediateTransaction(fn, { retries = 5 } = {}) {
  const conn = getDb();
  for (let attempt = 0; ; attempt += 1) {
    try {
      conn.exec('BEGIN IMMEDIATE');
    } catch (error) {
      if (isBusyError(error) && attempt < retries) {
        sleepSync(20 * 2 ** attempt + Math.floor(Math.random() * 20));
        continue;
      }
      throw error;
    }

    try {
      const result = fn(conn);
      conn.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        conn.exec('ROLLBACK');
      } catch {
        /* 이미 롤백된 트랜잭션 */
      }
      if (isBusyError(error) && attempt < retries) {
        sleepSync(20 * 2 ** attempt + Math.floor(Math.random() * 20));
        continue;
      }
      throw error;
    }
  }
}

/** 읽기 전용/단순 쓰기용 일반 트랜잭션. */
function withTransaction(fn) {
  const conn = getDb();
  conn.exec('BEGIN');
  try {
    const result = fn(conn);
    conn.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      conn.exec('ROLLBACK');
    } catch {
      /* noop */
    }
    throw error;
  }
}

module.exports = {
  open,
  getDb,
  getDbPath,
  close,
  nowIso,
  isBusyError,
  isUniqueViolation,
  withImmediateTransaction,
  withTransaction,
  DEFAULT_DB_PATH
};
