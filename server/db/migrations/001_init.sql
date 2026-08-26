-- CERTAIN 초기 스키마
-- 설계 문서: docs/auth-db-design.md
--
-- 타임스탬프는 프론트엔드의 new Date().toISOString() 과 형식을 맞추기 위해
-- TEXT(ISO-8601 UTC)로 저장한다.

-- ---------------------------------------------------------------------------
-- 계정과 역할
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  login_id        TEXT    NOT NULL,              -- 표시용 원문
  login_id_norm   TEXT    NOT NULL UNIQUE,       -- NFKC + trim + toLowerCase (앱에서 계산)
  password_hash   TEXT    NOT NULL,              -- scrypt$N$r$p$saltB64$hashB64
  role            TEXT    NOT NULL DEFAULT 'user'
                          CHECK (role IN ('user', 'admin')),
  status          TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'disabled')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  last_login_at   TEXT,
  local_import_at TEXT                           -- localStorage 1회 가져오기 완료 시각
);

-- 관리자 조회 및 "마지막 admin" 가드용 부분 인덱스
CREATE INDEX ix_users_admin ON users (id) WHERE role = 'admin';
CREATE INDEX ix_users_created ON users (created_at DESC);

-- ---------------------------------------------------------------------------
-- 애플리케이션 싱글톤 상태
--   key='admin_bootstrapped' 행이 최초 admin 슬롯을 나타낸다.
--   PRIMARY KEY 충돌이 동시 가입의 승자를 중재한다.
-- ---------------------------------------------------------------------------
CREATE TABLE app_state (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
) WITHOUT ROWID;

-- ---------------------------------------------------------------------------
-- 세션 (불투명 토큰. 원본이 아니라 sha256 해시를 저장한다)
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,                 -- sha256(raw token) hex
  user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  user_agent   TEXT,
  ip           TEXT
);

CREATE INDEX ix_sessions_user    ON sessions (user_id);
CREATE INDEX ix_sessions_expires ON sessions (expires_at);

-- ---------------------------------------------------------------------------
-- 콘텐츠 카탈로그
--   본문/선택지/해설은 content/content.json 이 관리한다.
--   DB에는 ID만 두어 학습 데이터의 참조 무결성을 확보하고 단원별 집계를 가능하게 한다.
--   부팅 시 content.json 으로부터 upsert 된다.
-- ---------------------------------------------------------------------------
CREATE TABLE units (
  id      TEXT PRIMARY KEY,
  number  TEXT NOT NULL,
  title   TEXT NOT NULL,
  code    TEXT NOT NULL,
  sort_no INTEGER NOT NULL
) WITHOUT ROWID;

CREATE TABLE question_catalog (
  question_id TEXT PRIMARY KEY,
  unit_id     TEXT NOT NULL REFERENCES units (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  kind        TEXT NOT NULL CHECK (kind IN ('practice', 'mock', 'ai')),
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
) WITHOUT ROWID;

CREATE INDEX ix_catalog_unit ON question_catalog (unit_id, kind) WHERE active = 1;

-- ---------------------------------------------------------------------------
-- 학습 상태
--   프론트엔드의 { bookmarked, history, wrongIds, resumeQuestionId } 를 정규화한 것.
-- ---------------------------------------------------------------------------

-- resumeQuestionId (사용자당 1행)
CREATE TABLE study_progress (
  user_id            INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  resume_question_id TEXT NOT NULL DEFAULT 'q-01'
                          REFERENCES question_catalog (question_id) ON DELETE RESTRICT,
  updated_at         TEXT NOT NULL
);

-- bookmarked: string[]
CREATE TABLE bookmarks (
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  question_id TEXT    NOT NULL REFERENCES question_catalog (question_id) ON DELETE RESTRICT,
  created_at  TEXT    NOT NULL,
  PRIMARY KEY (user_id, question_id)
) WITHOUT ROWID;

CREATE INDEX ix_bookmarks_user ON bookmarks (user_id, created_at DESC);

-- history: { [questionId]: boolean }
--   문제별 최신 결과 + 누적 통계. (user_id, question_id) 당 1행.
CREATE TABLE question_attempts (
  user_id          INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  question_id      TEXT    NOT NULL REFERENCES question_catalog (question_id) ON DELETE RESTRICT,
  last_correct     INTEGER NOT NULL CHECK (last_correct IN (0, 1)),
  last_choice      INTEGER,
  attempt_count    INTEGER NOT NULL DEFAULT 1,
  correct_count    INTEGER NOT NULL DEFAULT 0,
  wrong_count      INTEGER NOT NULL DEFAULT 0,
  first_answered_at TEXT   NOT NULL,
  last_answered_at TEXT    NOT NULL,
  PRIMARY KEY (user_id, question_id)
) WITHOUT ROWID;

CREATE INDEX ix_attempts_user_recent ON question_attempts (user_id, last_answered_at DESC);

-- wrongIds: string[]
--   한 번이라도 틀린 문제. 정답을 맞혀도 제거되지 않는다(기존 앱 동작과 동일).
--   기존 unshift 순서를 재현하기 위해 first_wrong_at DESC 로 정렬한다.
CREATE TABLE wrong_questions (
  user_id        INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  question_id    TEXT    NOT NULL REFERENCES question_catalog (question_id) ON DELETE RESTRICT,
  first_wrong_at TEXT    NOT NULL,
  last_wrong_at  TEXT    NOT NULL,
  wrong_count    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, question_id)
) WITHOUT ROWID;

CREATE INDEX ix_wrong_user_order ON wrong_questions (user_id, first_wrong_at DESC);
