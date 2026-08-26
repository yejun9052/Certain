'use strict';

/**
 * API 스모크 테스트.
 *
 *   npm test
 *
 * 임시 SQLite 파일에 실제 서버를 띄우고 HTTP 로 호출한다.
 * 최초 가입자 admin, 게이팅, 권한, 학습 상태 왕복을 확인한다.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// 테스트 전용 DB 를 쓴다. server/db 가 require 되기 전에 설정해야 한다.
const TMP_DB = path.join(os.tmpdir(), `certain-test-${process.pid}-${Date.now()}.sqlite`);
process.env.DB_PATH = TMP_DB;
process.env.PASSWORD_MIN_LENGTH = '4';
// 테스트는 같은 계정으로 여러 번 로그인한다. 리밋 자체는 아래에서 따로 검증한다.
process.env.RATE_LIMIT_LOGIN_MAX = '1000';
process.env.RATE_LIMIT_REGISTER_MAX = '1000';

const db = require('../server/db');
const { createApp, bootstrapData } = require('../server/index');

let server;
let baseUrl;

/** 쿠키 저장소를 흉내낸다. 브라우저처럼 세션 쿠키를 유지한다. */
function makeClient() {
  const jar = new Map();

  function cookieHeader() {
    return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  function absorb(response) {
    const raw = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    for (const line of raw) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      if (index === -1) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value === '' || /expires=thu, 01 jan 1970/i.test(line)) jar.delete(name);
      else jar.set(name, value);
    }
  }

  async function request(method, url, body, extraHeaders = {}) {
    const headers = { Origin: baseUrl, ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const cookies = cookieHeader();
    if (cookies) headers.Cookie = cookies;

    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual'
    });
    absorb(response);

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    return { status: response.status, body: payload, headers: response.headers };
  }

  return {
    jar,
    get: (url, headers) => request('GET', url, undefined, headers),
    post: (url, body, headers) => request('POST', url, body === undefined ? {} : body, headers),
    put: (url, body, headers) => request('PUT', url, body === undefined ? {} : body, headers),
    patch: (url, body, headers) => request('PATCH', url, body === undefined ? {} : body, headers),
    del: (url, headers) => request('DELETE', url, undefined, headers)
  };
}

test.before(async () => {
  bootstrapData({ logger: { log() {}, error() {} } });
  const app = createApp({ logger: { log() {}, error() {} } });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TMP_DB + suffix);
    } catch {
      /* 없으면 그만 */
    }
  }
});

test('health 는 인증 없이 접근할 수 있다', async () => {
  const client = makeClient();
  const res = await client.get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.data.status, 'ok');
  assert.equal(res.body.data.content.questions, 90);
});

test('정적 셸은 공개, 문제 데이터는 포함되지 않는다', async () => {
  const client = makeClient();
  const index = await client.get('/');
  assert.equal(index.status, 200);
  assert.match(String(index.body), /CERTAIN/);

  const appJs = await client.get('/app.js');
  assert.equal(appJs.status, 200);
  const source = String(appJs.body);
  assert.ok(!source.includes('const questionBank = ['), 'app.js 에 문제 데이터가 남아있으면 안 된다');
  assert.ok(!source.includes('아이디 또는 비밀번호를 확인'), 'app.js 에 정답/계정 데이터가 없어야 한다');
});

test('비로그인 상태에서는 학습 API 와 PDF 가 401 을 준다', async () => {
  const client = makeClient();
  for (const url of ['/api/content', '/api/pdf', '/api/study/state', '/api/admin/users']) {
    const res = await client.get(url);
    assert.equal(res.status, 401, `${url} 은 401 이어야 한다`);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  }
});

test('정적 루트에서 PDF 직접 접근은 실패한다', async () => {
  const client = makeClient();
  const res = await client.get('/private/textbook.pdf');
  assert.equal(res.status, 404);
});

test('첫 가입자만 admin 이 된다', async () => {
  const first = makeClient();
  const status = await first.get('/api/auth/bootstrap-status');
  assert.equal(status.body.data.firstUserWillBeAdmin, true);

  const registered = await first.post('/api/auth/register', {
    loginId: 'Owner',
    password: 'pass1234',
    passwordConfirm: 'pass1234'
  });
  assert.equal(registered.status, 201);
  assert.equal(registered.body.data.user.role, 'admin');
  assert.equal(registered.body.data.grantedAdmin, true);
  assert.equal(registered.body.data.user.loginId, 'Owner');

  const second = makeClient();
  const secondRes = await second.post('/api/auth/register', {
    loginId: '학습자',
    password: 'pass1234',
    passwordConfirm: 'pass1234'
  });
  assert.equal(secondRes.status, 201);
  assert.equal(secondRes.body.data.user.role, 'user');

  const after = await makeClient().get('/api/auth/bootstrap-status');
  assert.equal(after.body.data.firstUserWillBeAdmin, false);
});

test('아이디는 정규화되어 중복을 막는다', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/register', {
    loginId: '  OWNER ',
    password: 'pass1234',
    passwordConfirm: 'pass1234'
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'DUPLICATE_LOGIN_ID');
});

test('잘못된 자격증명은 401 과 동일한 메시지를 준다', async () => {
  const client = makeClient();
  const wrongPassword = await client.post('/api/auth/login', { loginId: 'owner', password: 'nope1234' });
  const unknownUser = await client.post('/api/auth/login', { loginId: '없는사람', password: 'nope1234' });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.body.error.message, unknownUser.body.error.message);
});

test('로그인 쿠키는 HttpOnly + SameSite=Lax 이다', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/login', { loginId: 'owner', password: 'pass1234' });
  assert.equal(res.status, 200);

  const setCookie = res.headers.getSetCookie().join('; ');
  assert.match(setCookie, /certain_sid=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
});

test('로그인 후 콘텐츠·PDF·학습 상태에 접근할 수 있다', async () => {
  const client = makeClient();
  await client.post('/api/auth/login', { loginId: 'owner', password: 'pass1234' });

  const me = await client.get('/api/auth/me');
  assert.equal(me.body.data.authenticated, true);
  assert.equal(me.body.data.user.role, 'admin');

  const content = await client.get('/api/content');
  assert.equal(content.status, 200);
  assert.equal(content.body.data.units.length, 9);
  assert.equal(content.body.data.questionBank.length, 15);
  assert.equal(content.body.data.aiMockQuestions.length, 50);

  const pdf = await client.get('/api/pdf');
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');

  const state = await client.get('/api/study/state');
  assert.equal(state.status, 200);
  assert.deepEqual(state.body.data.bookmarked, []);
  assert.deepEqual(state.body.data.wrongIds, []);
  assert.equal(state.body.data.resumeQuestionId, null);
});

test('채점은 서버가 하고 오답이 기록된다', async () => {
  const client = makeClient();
  await client.post('/api/auth/login', { loginId: 'owner', password: 'pass1234' });

  const contentRes = await client.get('/api/content');
  const question = contentRes.body.data.questionBank[0];
  const wrongChoice = (question.answer + 1) % question.choices.length;

  const wrong = await client.post('/api/study/answers', {
    questionId: question.id,
    selectedIndex: wrongChoice
  });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.body.data.correct, false);
  assert.equal(wrong.body.data.correctIndex, question.answer);
  assert.deepEqual(wrong.body.data.state.wrongIds, [question.id]);
  assert.equal(wrong.body.data.state.history[question.id], false);
  assert.equal(wrong.body.data.state.resumeQuestionId, question.id);

  const right = await client.post('/api/study/answers', {
    questionId: question.id,
    selectedIndex: question.answer
  });
  assert.equal(right.body.data.correct, true);
  assert.equal(right.body.data.state.history[question.id], true);
  // 기존 앱과 동일하게 한 번 틀린 문제는 오답 목록에 남는다.
  assert.deepEqual(right.body.data.state.wrongIds, [question.id]);
});

test('클라이언트가 정답 여부를 위조해도 서버 판정이 우선한다', async () => {
  const client = makeClient();
  await client.post('/api/auth/login', { loginId: 'owner', password: 'pass1234' });
  const contentRes = await client.get('/api/content');
  const question = contentRes.body.data.questionBank[1];
  const wrongChoice = (question.answer + 1) % question.choices.length;

  const res = await client.post('/api/study/answers', {
    questionId: question.id,
    selectedIndex: wrongChoice,
    correct: true // 무시되어야 한다
  });
  assert.equal(res.body.data.correct, false);
});

test('존재하지 않는 문제 ID 는 거부된다', async () => {
  const client = makeClient();
  await client.post('/api/auth/login', { loginId: 'owner', password: 'pass1234' });
  const res = await client.post('/api/study/answers', { questionId: 'q-없음', selectedIndex: 0 });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'UNKNOWN_QUESTION');
});

test('북마크는 멱등하고 학습 상태 PUT 은 왕복한다', async () => {
  const client = makeClient();
  await client.post('/api/auth/login', { loginId: 'owner', password: 'pass1234' });

  await client.post('/api/study/bookmarks', { questionId: 'q-03' });
  await client.post('/api/study/bookmarks', { questionId: 'q-03' });
  let state = await client.get('/api/study/state');
  assert.deepEqual(state.body.data.bookmarked, ['q-03']);

  await client.del('/api/study/bookmarks/q-03');
  state = await client.get('/api/study/state');
  assert.deepEqual(state.body.data.bookmarked, []);

  const put = await client.put('/api/study/state', {
    state: {
      bookmarked: ['q-05', 'q-06', 'q-없는문제'],
      history: { 'q-05': true, 'q-06': false, 'q-없는문제': true },
      wrongIds: ['q-06', 'q-07'],
      resumeQuestionId: 'q-06'
    }
  });
  assert.equal(put.status, 200);
  assert.deepEqual(put.body.data.bookmarked, ['q-05', 'q-06']);
  assert.deepEqual(put.body.data.wrongIds, ['q-06', 'q-07']);
  assert.equal(put.body.data.history['q-05'], true);
  assert.equal(put.body.data.history['q-06'], false);
  assert.equal(put.body.data.resumeQuestionId, 'q-06');
  assert.ok(!('q-없는문제' in put.body.data.history), '알 수 없는 문제 ID 는 버려야 한다');
});

test('초기화는 학습 데이터만 비운다', async () => {
  const client = makeClient();
  await client.post('/api/auth/login', { loginId: 'owner', password: 'pass1234' });
  const res = await client.del('/api/study/state');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.bookmarked, []);
  assert.deepEqual(res.body.data.wrongIds, []);
  assert.deepEqual(res.body.data.history, {});
  assert.equal(res.body.data.resumeQuestionId, null);

  const me = await client.get('/api/auth/me');
  assert.equal(me.body.data.authenticated, true);
});

test('localStorage 가져오기는 1회만 허용된다', async () => {
  const client = makeClient();
  await client.post('/api/auth/register', {
    loginId: 'importer',
    password: 'pass1234',
    passwordConfirm: 'pass1234'
  });

  const first = await client.post('/api/study/import-local', {
    state: {
      bookmarked: ['q-01'],
      history: { 'q-02': false },
      wrongIds: ['q-02'],
      resumeQuestionId: 'q-02'
    }
  });
  assert.equal(first.status, 200);
  assert.ok(first.body.data.imported >= 3);
  assert.deepEqual(first.body.data.state.bookmarked, ['q-01']);
  assert.deepEqual(first.body.data.state.wrongIds, ['q-02']);

  const second = await client.post('/api/study/import-local', {
    state: { bookmarked: ['q-04'], history: {}, wrongIds: [], resumeQuestionId: 'q-04' }
  });
  assert.equal(second.status, 409);
  assert.equal(second.body.error.code, 'ALREADY_IMPORTED');
});

test('일반 사용자는 관리자 API 에 접근할 수 없다', async () => {
  const client = makeClient();
  await client.post('/api/auth/login', { loginId: '학습자', password: 'pass1234' });

  const list = await client.get('/api/admin/users');
  assert.equal(list.status, 403);
  assert.equal(list.body.error.code, 'FORBIDDEN');
});

test('관리자는 사용자 목록을 보고 역할을 바꿀 수 있다', async () => {
  const admin = makeClient();
  await admin.post('/api/auth/login', { loginId: 'owner', password: 'pass1234' });

  const list = await admin.get('/api/admin/users');
  assert.equal(list.status, 200);
  assert.ok(list.body.data.users.length >= 3);
  assert.ok(!('passwordHash' in list.body.data.users[0]), '해시가 노출되면 안 된다');
  assert.ok(!('password_hash' in list.body.data.users[0]));

  const learner = list.body.data.users.find((user) => user.loginId === '학습자');
  const promoted = await admin.patch(`/api/admin/users/${learner.id}`, { role: 'admin' });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.body.data.user.role, 'admin');

  // 다시 일반 사용자로 되돌린다(다른 테스트가 이 계정을 일반 사용자로 가정한다).
  const demoted = await admin.patch(`/api/admin/users/${learner.id}`, { role: 'user' });
  assert.equal(demoted.status, 200);
  assert.equal(demoted.body.data.user.role, 'user');
});

test('마지막 관리자는 강등할 수 없고 자기 자신도 변경할 수 없다', async () => {
  const admin = makeClient();
  await admin.post('/api/auth/login', { loginId: 'owner', password: 'pass1234' });
  const me = await admin.get('/api/auth/me');

  const selfPatch = await admin.patch(`/api/admin/users/${me.body.data.user.id}`, { role: 'user' });
  assert.equal(selfPatch.status, 409);
  assert.equal(selfPatch.body.error.code, 'SELF_DEMOTION');
});

test('로그아웃하면 세션이 폐기된다', async () => {
  const client = makeClient();
  await client.post('/api/auth/login', { loginId: 'owner', password: 'pass1234' });
  assert.equal((await client.get('/api/study/state')).status, 200);

  const out = await client.post('/api/auth/logout');
  assert.equal(out.status, 200);

  const after = await client.get('/api/study/state');
  assert.equal(after.status, 401);

  const me = await client.get('/api/auth/me');
  assert.equal(me.body.data.authenticated, false);
});

test('교차 출처 상태 변경 요청은 차단된다', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ loginId: 'owner', password: 'pass1234' })
  });
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.error.code, 'CROSS_ORIGIN_BLOCKED');
});

test('JSON 이 아닌 본문은 거부된다', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', Origin: baseUrl },
    body: 'loginId=owner&password=pass1234'
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
});

test('짧은 비밀번호와 잘못된 아이디는 422 로 거부된다', async () => {
  const client = makeClient();
  const shortPassword = await client.post('/api/auth/register', {
    loginId: 'tester1',
    password: '1',
    passwordConfirm: '1'
  });
  assert.equal(shortPassword.status, 422);
  assert.equal(shortPassword.body.error.code, 'INVALID_PASSWORD');

  const badId = await client.post('/api/auth/register', {
    loginId: 'bad id@here',
    password: 'pass1234',
    passwordConfirm: 'pass1234'
  });
  assert.equal(badId.status, 422);
  assert.equal(badId.body.error.code, 'INVALID_LOGIN_ID');

  const mismatch = await client.post('/api/auth/register', {
    loginId: 'tester2',
    password: 'pass1234',
    passwordConfirm: 'pass9999'
  });
  assert.equal(mismatch.status, 422);
  assert.equal(mismatch.body.error.code, 'PASSWORD_MISMATCH');
});

test('레이트리밋은 한도를 넘으면 429 를 준다', async () => {
  const { rateLimit } = require('../server/middleware/rateLimit');
  const limiter = rateLimit({ windowMs: 60_000, max: 2, key: () => 'fixed-key', message: 'too many' });

  const req = { method: 'POST', ip: '10.0.0.1' };
  const res = { setHeader() {} };
  const errors = [];
  const next = (error) => errors.push(error || null);

  limiter(req, res, next);
  limiter(req, res, next);
  limiter(req, res, next);

  assert.equal(errors.length, 3);
  assert.equal(errors[0], null);
  assert.equal(errors[1], null);
  assert.ok(errors[2], '세 번째 요청은 차단되어야 한다');
  assert.equal(errors[2].status, 429);
  assert.equal(errors[2].code, 'RATE_LIMITED');
});

test('비밀번호는 평문으로 저장되지 않는다', async () => {
  const row = db.getDb().prepare("SELECT password_hash FROM users WHERE login_id_norm = 'owner'").get();
  assert.ok(row, 'owner 계정이 있어야 한다');
  assert.match(row.password_hash, /^scrypt\$16384\$8\$1\$/);
  assert.ok(!row.password_hash.includes('pass1234'), '평문이 들어있으면 안 된다');

  const { verifyPassword } = require('../server/lib/password');
  assert.equal(verifyPassword('pass1234', row.password_hash), true);
  assert.equal(verifyPassword('wrong-password', row.password_hash), false);
});

test('실패한 가입은 admin 슬롯을 소비하지 않는다 (별도 DB)', async () => {
  // 이 검증은 "아직 아무도 가입하지 않은" DB 가 필요하므로 하위 프로세스에서 수행한다.
  const { execFileSync } = require('node:child_process');
  const script = path.join(__dirname, '..', 'server', 'scripts', 'verify-first-admin.js');
  const output = execFileSync(process.execPath, [script], { encoding: 'utf8' });
  const result = JSON.parse(output.trim().split('\n').pop());

  assert.equal(result.adminCount, 1, '동시 가입에서도 admin 은 정확히 1명이어야 한다');
  assert.equal(result.failedSignupConsumedSlot, false, '실패한 가입은 슬롯을 소비하면 안 된다');
  assert.equal(result.adminLoginId, result.expectedAdmin);
});
