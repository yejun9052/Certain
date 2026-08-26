'use strict';

/**
 * 최초 가입자 admin 보장 검증 헬퍼.
 *
 * Node 는 싱글스레드이고 node:sqlite 는 동기 API 이므로, 한 프로세스 안에서는
 * 실제 경쟁이 발생하지 않는다. 진짜 경쟁을 만들기 위해 독립된 자식 프로세스를 띄운다.
 *
 * 검증 항목
 *   1) 동시 가입 N건 → admin 은 정확히 1명
 *   2) 실패한 가입(중복 아이디)은 admin 슬롯을 소비하지 않는다
 *
 * 부모 모드로 실행하면 마지막 줄에 결과 JSON 을 출력한다.
 */

const { execFile, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CONCURRENCY = 10;

// --- 자식 모드 -------------------------------------------------------------
if (process.argv[2] === 'child') {
  const loginId = process.argv[3];
  const db = require('../db');
  const users = require('../lib/users');

  db.open();
  let output;
  try {
    const user = users.register({ loginId, password: 'pass1234' });
    output = { ok: true, loginId: user.loginId, role: user.role };
  } catch (error) {
    output = { ok: false, code: error.code || 'UNKNOWN' };
  }
  db.close();
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

// --- 부모 모드 -------------------------------------------------------------
const TMP_DB = path.join(os.tmpdir(), `certain-race-${process.pid}-${Date.now()}.sqlite`);
process.env.DB_PATH = TMP_DB;

const db = require('../db');
const { migrate } = require('../db/migrate');
const content = require('../lib/content');

function cleanup() {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TMP_DB + suffix);
    } catch {
      /* 없으면 그만 */
    }
  }
}

function spawnChild(loginId) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [__filename, 'child', loginId],
      { env: { ...process.env, DB_PATH: TMP_DB } },
      (error, stdout) => {
        if (error && !stdout) {
          resolve({ ok: false, code: 'SPAWN_FAILED' });
          return;
        }
        try {
          resolve(JSON.parse(String(stdout).trim()));
        } catch {
          resolve({ ok: false, code: 'BAD_OUTPUT' });
        }
      }
    );
  });
}

async function main() {
  // 스키마 준비 (자식들은 이미 준비된 DB 를 열기만 한다)
  db.open();
  migrate();
  content.syncCatalog();

  // --- 1) 실패한 가입이 admin 슬롯을 소비하지 않는지 --------------------------
  // admin 을 선점하지 않은 상태로 사용자 1명을 직접 넣는다.
  const now = new Date().toISOString();
  db.getDb()
    .prepare(
      `INSERT INTO users (login_id, login_id_norm, password_hash, role, created_at, updated_at)
       VALUES ('taken', 'taken', 'scrypt$16384$8$1$AAAA$AAAA', 'user', ?, ?)`
    )
    .run(now, now);

  const duplicate = execFileSync(process.execPath, [__filename, 'child', 'taken'], {
    encoding: 'utf8',
    env: { ...process.env, DB_PATH: TMP_DB }
  });
  const duplicateResult = JSON.parse(duplicate.trim());

  const claimAfterFailure = db
    .getDb()
    .prepare("SELECT value FROM app_state WHERE key = 'admin_bootstrapped'")
    .get();
  const failedSignupConsumedSlot = Boolean(claimAfterFailure);

  db.close();

  // --- 2) 동시 가입 경쟁 -----------------------------------------------------
  const ids = Array.from({ length: CONCURRENCY }, (unused, index) => `racer${index + 1}`);
  const results = await Promise.all(ids.map((id) => spawnChild(id)));

  db.open();
  const adminRows = db.getDb().prepare("SELECT login_id_norm FROM users WHERE role = 'admin'").all();
  const claim = db.getDb().prepare("SELECT value FROM app_state WHERE key = 'admin_bootstrapped'").get();
  const totalUsers = db.getDb().prepare('SELECT COUNT(*) AS count FROM users').get().count;
  db.close();

  cleanup();

  const summary = {
    concurrency: CONCURRENCY,
    duplicateSignup: duplicateResult,
    failedSignupConsumedSlot,
    successfulSignups: results.filter((r) => r.ok).length,
    adminCount: adminRows.length,
    adminLoginId: adminRows.length ? adminRows[0].login_id_norm : null,
    expectedAdmin: claim ? claim.value : null,
    totalUsers,
    adminsReportedByChildren: results.filter((r) => r.ok && r.role === 'admin').length
  };

  console.log(JSON.stringify(summary));
}

main().catch((error) => {
  cleanup();
  console.error(error);
  process.exit(1);
});
