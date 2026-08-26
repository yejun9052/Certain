# CERTAIN 인증·DB 전환 설계

이 문서는 하위 워크스페이스의 Claude Opus 5가 현재 앱 구조와 Node 런타임을 점검한 뒤 제안한 설계를 기준으로 정리한 문서다.

## 결정

- 단일 서버·수십 명 이하 규모를 기준으로 Express 5와 Node 22.5+ 내장 `node:sqlite`를 사용한다.
- 비밀번호는 Node `crypto.scrypt` 해시만 저장한다.
- 인증 상태는 브라우저 `localStorage`가 아니라 DB 세션과 HttpOnly `certain_sid` 쿠키로 관리한다.
- 정적 화면은 `public/`에서 제공하고 문제 콘텐츠는 인증된 `/api/content`, PDF는 인증된 `/api/pdf`에서만 제공한다.
- 학습 콘텐츠의 원문은 파일(`content/content.json`)로 관리하고, DB에는 단원·문제 카탈로그와 사용자별 상태만 저장한다.

## DB 구조

실제 DDL은 `server/db/migrations/001_init.sql`에 있다.

| 테이블 | 목적 |
| --- | --- |
| `schema_migrations` | 마이그레이션 적용 버전 |
| `users` | 아이디, scrypt 해시, `user/admin` 역할, 활성 상태 |
| `app_state` | `admin_bootstrapped` 단일 상태 행 |
| `sessions` | SHA-256 세션 토큰, 사용자, 만료 시각 |
| `units` | 콘텐츠 단원 카탈로그 |
| `question_catalog` | 문제 ID·단원·문제 종류(practice/mock/ai) |
| `study_progress` | 사용자가 실제로 저장한 이어서 풀기 위치(없으면 `NULL`) |
| `bookmarks` | 사용자별 북마크 |
| `question_attempts` | 문제별 최신 정답 여부와 누적 풀이 통계 |
| `wrong_questions` | 사용자별 오답 문제와 오답 횟수 |

모든 사용자 상태 테이블은 `users.id`를 외래키로 참조하고 삭제 시 cascade한다. 문제 ID는 `question_catalog`를 참조하며, 문제 콘텐츠가 파일에서 사라져도 과거 기록을 잃지 않도록 카탈로그 행은 비활성화한다.

## 첫 가입자 관리자 보장

회원가입은 다음을 하나의 `BEGIN IMMEDIATE` 트랜잭션으로 처리한다.

1. 입력 아이디·비밀번호를 검증하고 비밀번호를 먼저 scrypt로 해시한다.
2. `app_state(key='admin_bootstrapped')`를 `INSERT OR IGNORE`한다.
3. 이 INSERT의 `changes === 1`이면 역할을 `admin`, 아니면 `user`로 결정한다.
4. `users`에 계정을 INSERT하고 학습 진행 기본 행을 만든다.
5. 어느 단계라도 실패하면 전체 롤백한다.

SQLite의 `BEGIN IMMEDIATE`가 쓰기 락을 먼저 확보하고 `app_state.key`가 PRIMARY KEY이므로 동시 가입에서도 admin은 정확히 한 명이다. 중복 아이디나 검증 실패는 트랜잭션이 롤백되어 관리자 슬롯을 소모하지 않는다. 관리자 계정을 삭제하거나 강등해도 `admin_bootstrapped`는 삭제하지 않는다.

## 인증·권한 API

| API | 공개 여부 | 설명 |
| --- | --- | --- |
| `GET /api/auth/me` | 공개 | 현재 세션과 첫 가입자 관리자 예정 여부 |
| `GET /api/auth/bootstrap-status` | 공개 | 회원가입 화면의 관리자 안내 |
| `POST /api/auth/register` | 공개 | 가입·첫 관리자 자동 지정·세션 발급 |
| `POST /api/auth/login` | 공개 | 세션 발급 |
| `POST /api/auth/logout` | 공개 | 세션 폐기 |
| `GET /api/content` | 로그인 필요 | 단원과 문제 콘텐츠 |
| `GET /api/pdf` | 로그인 필요 | 원본 PDF inline/download |
| `/api/study/*` | 로그인 필요 | 학습 상태, 채점, 북마크, 오답, 이관 |
| `/api/admin/*` | admin 필요 | 사용자·역할·상태 관리 |

학습 API는 클라이언트가 보낸 사용자 ID를 받지 않고 세션에서 사용자 ID를 가져온다. 역할도 매 요청 DB에서 확인한다. 세션 쿠키는 `HttpOnly`, `SameSite=Lax`, `Path=/`이며 운영 HTTPS에서는 `COOKIE_SECURE=true`를 사용한다. SameSite와 Origin/Referer 검사, JSON body 제한, 보안 헤더, 로그인·가입 레이트리밋을 함께 적용한다.

## localStorage 이관

기존 `certain-users-v1`에 있던 평문 비밀번호는 서버로 전송하지 않는다. 로그인 성공 뒤 같은 아이디의 기존 학습 상태가 있고 서버 계정에 아직 `local_import_at`이 없으면, 사용자가 동의한 경우 `/api/study/import-local`로 북마크·풀이 이력·오답·이어풀기 위치만 1회 이관한다. 이관이 끝나면 해당 localStorage 계정을 삭제한다.

새 계정은 항상 빈 학습 상태로 시작한다. 서버 상태가 기준이며, 게스트 학습 상태를 저장하거나 브라우저 세션 ID를 인증 근거로 사용하지 않는다.

## 프론트 동작 순서

1. `body.is-locked` 상태로 시작한다.
2. `/api/auth/me`를 호출한다.
3. 미인증이면 학습 화면을 렌더하지 않고 로그인 모달을 닫을 수 없게 한다.
4. 인증되면 `/api/content`와 `/api/study/state`를 받아 기존 렌더러를 활성화한다.
5. 풀이 채점은 `/api/study/answers`에서 서버가 정답을 판정하고, 상태 변경은 사용자별 DB에 저장한다.
6. admin 세션이면 계정 관리 메뉴를 표시하며, 서버의 `requireRole('admin')`가 최종 차단을 담당한다.

## 검증과 운영

- `npm run check`: server/public/test 전체 JavaScript 문법 검사
- `npm test`: 인증 게이트, 첫 admin, 동시 가입, 세션, 비밀번호 해시, 학습 상태, 관리자 권한, 레이트리밋 테스트
- `npm run verify-first-admin`: 독립 프로세스 동시 가입 경쟁 검증
- `npm start`: 기본 `127.0.0.1:3000`에서 실행

DB 파일(`data/`)과 세션·비밀번호가 들어간 환경 파일은 Git에 커밋하지 않는다. PDF는 인증 API 뒤의 `private/`에 둔다. HTTPS 리버스 프록시 운영 시 `TRUST_PROXY=true`, `COOKIE_SECURE=true`를 설정한다. 단일 서버를 넘어 수백 명 또는 다중 인스턴스 규모가 되면 DB 계층을 PostgreSQL로 교체한다.
