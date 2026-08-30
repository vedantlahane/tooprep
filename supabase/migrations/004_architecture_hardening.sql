-- Architecture hardening: safe to run after the existing schema.
-- This migration does not replace the current `questions.id` foreign-key
-- contract. `canonical_question_id` is the future cross-store identity.

alter table questions
  add column if not exists canonical_question_id text,
  add column if not exists published_at timestamptz;

-- Backfill exactly once. This becomes a separate application identity: later
-- Mongo, Postgres projections, and vector points reference this value rather
-- than treating the Postgres primary key as the conceptual question identity.
update questions
  set canonical_question_id = 'q_' || replace(gen_random_uuid()::text, '-', '')
  where canonical_question_id is null;

alter table questions
  alter column canonical_question_id set not null;

create unique index if not exists questions_canonical_question_id_unique
  on questions (canonical_question_id)
  where canonical_question_id is not null;

-- Existing application query paths. These indexes intentionally avoid a
-- uniqueness assumption because historical data may already contain repeats.
create index if not exists chapters_subject_id_idx on chapters (subject_id);
create index if not exists topics_chapter_id_idx on topics (chapter_id);
create index if not exists questions_topic_verified_difficulty_idx
  on questions (topic_id, verified, difficulty);
create index if not exists evaluations_user_topic_ended_idx
  on evaluations (user_id, topic_id, ended_at desc);
create index if not exists evaluation_attempts_evaluation_id_idx
  on evaluation_attempts (evaluation_id);
create index if not exists practice_sessions_user_topic_ended_idx
  on practice_sessions (user_id, topic_id, ended_at desc);
create index if not exists practice_attempts_session_id_idx
  on practice_attempts (practice_session_id);
create index if not exists confidence_user_topic_recorded_idx
  on confidence_assessments (user_id, topic_id, recorded_at desc);

-- A durable record of cross-store projection attempts. It deliberately does
-- not store canonical question content; MongoDB will own that content later.
create table if not exists content_sync_events (
  id uuid primary key default gen_random_uuid(),
  sync_key text not null unique,
  canonical_question_id text not null,
  content_version integer not null check (content_version > 0),
  destination text not null check (destination in ('SUPABASE', 'VECTOR')),
  status text not null check (status in ('PENDING', 'PROCESSING', 'SYNCED', 'FAILED')) default 'PENDING',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table content_sync_events enable row level security;

create index if not exists content_sync_events_work_idx
  on content_sync_events (status, next_attempt_at);
