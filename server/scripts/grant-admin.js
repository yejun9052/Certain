'use strict';

/**
 * 관리자 복구 CLI.
 *
 *   npm run grant-admin -- <아이디>
 *
 * 마지막 관리자 계정을 잃었을 때 사용한다. 서버 셸 접근 권한이 있는 사람만
 * 실행할 수 있으므로 별도의 인증을 두지 않는다.
 */

const db = require('../db');
const { migrate } = require('../db/migrate');
const users = require('../lib/users');

function main() {
  const loginId = process.argv[2];
  if (!loginId) {
    console.error('사용법: npm run grant-admin -- <아이디>');
    process.exit(1);
  }

  db.open();
  migrate();

  const updated = users.grantAdmin(loginId);
  if (!updated) {
    console.error(`계정을 찾을 수 없습니다: ${loginId}`);
    db.close();
    process.exit(1);
  }

  console.log(`${updated.loginId} 계정에 관리자 권한을 부여했습니다. (role=${updated.role})`);
  db.close();
}

main();
