'use strict';

/**
 * 만료 세션 정리.
 *
 *   npm run prune-sessions
 *
 * 서버는 부팅할 때도 한 번 정리하지만, 오래 켜두는 배포에서는
 * 이 스크립트를 하루 한 번 실행하도록 예약해두는 것이 좋다.
 */

const db = require('../db');
const { migrate } = require('../db/migrate');
const session = require('../lib/session');

db.open();
migrate();
const removed = session.pruneExpired();
console.log(`만료된 세션 ${removed}건을 삭제했습니다.`);
db.close();
