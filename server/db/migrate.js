'use strict';

/**
 * 마이그레이션 러너.
 *
 * server/db/migrations/NNN_name.sql 을 버전 순으로 한 번씩만 적용하고
 * schema_migrations 에 기록한다. 각 마이그레이션은 하나의 트랜잭션으로 처리된다.
 *
 * 단독 실행: npm run migrate
 */

const fs = require('node:fs');
const path = require('node:path');
const { getDb, nowIso, withTransaction } = require('./index');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

function listMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .map((file) => {
      const match = /^(\d+)_(.+)\.sql$/.exec(file);
      if (!match) throw new Error(`마이그레이션 파일 이름 규칙 위반: ${file} (예: 001_init.sql)`);
      return { version: Number(match[1]), name: match[2], file };
    })
    .sort((a, b) => a.version - b.version);
}

function appliedVersions(db) {
  return new Set(db.prepare('SELECT version FROM schema_migrations').all().map((row) => row.version));
}

/**
 * 미적용 마이그레이션을 전부 적용한다.
 * @returns {{version:number,name:string}[]} 이번에 적용된 목록
 */
function migrate({ log = () => {} } = {}) {
  const db = getDb();
  ensureMigrationsTable(db);

  const done = appliedVersions(db);
  const pending = listMigrations().filter((m) => !done.has(m.version));

  for (const migration of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, migration.file), 'utf8');
    withTransaction((conn) => {
      conn.exec(sql);
      conn
        .prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.name, nowIso());
    });
    log(`마이그레이션 적용: ${migration.file}`);
  }

  return pending;
}

module.exports = { migrate, listMigrations };

if (require.main === module) {
  const applied = migrate({ log: (line) => console.log(line) });
  console.log(applied.length ? `완료: ${applied.length}개 적용` : '적용할 마이그레이션이 없습니다.');
}
