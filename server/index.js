'use strict';

/**
 * CERTAIN 서버.
 *
 *   node server/index.js       (또는 npm start)
 *
 * 부팅 순서
 *   1) SQLite 연결 + PRAGMA
 *   2) 마이그레이션 적용
 *   3) content.json → units / question_catalog 동기화
 *   4) 만료 세션 정리
 *   5) HTTP 서버 기동
 */

const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');

const db = require('./db');
const { migrate } = require('./db/migrate');
const content = require('./lib/content');
const session = require('./lib/session');
const { sendOk, asyncHandler, notFoundHandler, errorHandler } = require('./lib/errors');
const { attachSession, requireAuth, requireRole } = require('./middleware/auth');
const { securityHeaders, originGuard, requireJsonBody } = require('./middleware/security');

const authRoutes = require('./routes/auth');
const studyRoutes = require('./routes/study');
const contentRoutes = require('./routes/content');
const pdfRoutes = require('./routes/pdf');
const adminRoutes = require('./routes/admin');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

/** 미들웨어와 라우트를 조립한다. 테스트에서도 이 함수를 쓴다. */
function createApp({ logger = console } = {}) {
  const app = express();

  app.disable('x-powered-by');
  // 리버스 프록시 뒤에 둘 경우에만 켠다. req.ip 와 req.protocol 판정에 영향을 준다.
  if (String(process.env.TRUST_PROXY || '').toLowerCase() === 'true') {
    app.set('trust proxy', 1);
  }

  app.use(securityHeaders);
  app.use(cookieParser());

  // --- API -----------------------------------------------------------------
  const api = express.Router();

  api.use(express.json({ limit: '128kb' }));
  api.use(requireJsonBody); // 상태 변경 요청은 application/json 만 허용
  api.use(originGuard); // Origin/Referer 자기 출처 확인 (CSRF 완화)
  api.use(attachSession); // req.auth 채우기. 여기서 역할을 매번 DB 에서 다시 읽는다.

  api.get(
    '/health',
    asyncHandler(async (req, res) => {
      sendOk(res, { status: 'ok', content: content.stats() });
    })
  );

  api.use('/auth', authRoutes);

  // 아래는 전부 로그인 필수.
  api.use('/content', requireAuth, contentRoutes);
  api.use('/pdf', requireAuth, pdfRoutes);
  api.use('/study', requireAuth, studyRoutes);
  api.use('/admin', requireAuth, requireRole('admin'), adminRoutes);

  app.use('/api', api);

  // --- 정적 셸 -------------------------------------------------------------
  // index.html / styles.css / app.js 에는 사용자 데이터도 문제 데이터도 들어있지 않다.
  // 로그인 화면을 그리려면 필요하므로 공개로 둔다.
  app.use(
    express.static(PUBLIC_DIR, {
      index: 'index.html',
      dotfiles: 'deny',
      etag: true,
      maxAge: '5m',
      setHeaders(res) {
        res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
      }
    })
  );

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}

/** DB 준비: 연결 → 마이그레이션 → 콘텐츠 동기화 → 만료 세션 정리 */
function bootstrapData({ logger = console } = {}) {
  db.open();
  const applied = migrate({ log: (line) => logger.log(line) });
  const synced = content.syncCatalog();
  const pruned = session.pruneExpired();
  return { applied, synced, pruned };
}

function start() {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';

  const boot = bootstrapData();
  console.log(
    `[certain] DB ${db.getDbPath()} | 마이그레이션 ${boot.applied.length}건 적용 | ` +
      `단원 ${boot.synced.units} · 문제 ${boot.synced.questions}` +
      (boot.synced.deactivated ? ` (비활성 ${boot.synced.deactivated})` : '') +
      (boot.pruned ? ` | 만료 세션 ${boot.pruned}건 정리` : '')
  );

  const app = createApp();
  const server = app.listen(port, host, () => {
    console.log(`[certain] http://${host}:${port} 에서 실행 중입니다.`);
    if (String(process.env.COOKIE_SECURE || '').toLowerCase() !== 'true') {
      console.log('[certain] 알림: HTTPS 로 배포할 때는 COOKIE_SECURE=true 를 설정하세요.');
    }
  });

  const shutdown = (signal) => {
    console.log(`\n[certain] ${signal} 수신. 종료합니다.`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
    // 열린 연결이 남아 있어도 5초 뒤에는 강제 종료한다.
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

module.exports = { createApp, bootstrapData, start, PUBLIC_DIR };

if (require.main === module) {
  start();
}
