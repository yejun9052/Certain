-- 이어풀기는 실제로 저장한 뒤에만 표시한다.
-- 001의 q-01 기본값은 새 계정이 아직 공부를 시작하지 않아도 첫 문제를
-- 이어풀기처럼 보이게 만들었으므로, 기존 행의 기본값은 NULL로 정리한다.

ALTER TABLE study_progress RENAME TO study_progress_legacy;

CREATE TABLE study_progress (
  user_id            INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  resume_question_id TEXT
                          REFERENCES question_catalog (question_id) ON DELETE RESTRICT,
  updated_at         TEXT NOT NULL
);

INSERT INTO study_progress (user_id, resume_question_id, updated_at)
SELECT user_id,
       CASE WHEN resume_question_id = 'q-01' THEN NULL ELSE resume_question_id END,
       updated_at
  FROM study_progress_legacy;

DROP TABLE study_progress_legacy;
