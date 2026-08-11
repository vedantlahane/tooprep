-- JEE Confidence & Performance Tracker — Schema Migration
-- Run this in Supabase SQL Editor

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  target_exam_year int,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Subjects
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Chapters
create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null
);

-- Topics
create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  name text not null
);

-- Questions
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  source_type text not null check (source_type in ('PYQ','ORIGINAL','LICENSED')),
  provider text,
  exam_year int,
  exam_session int,
  exam_shift int,
  question_type text not null default 'single_correct',
  question_text text not null,
  options jsonb not null,
  correct_answer text not null,
  solution_text text,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Papers (schema-only for V1, no UI)
create table if not exists papers (
  id uuid primary key default gen_random_uuid(),
  exam text not null,
  year int not null,
  session int,
  shift int,
  duration_seconds int not null
);

-- Paper Questions (junction)
create table if not exists paper_questions (
  paper_id uuid not null references papers(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  primary key (paper_id, question_id)
);

-- Practice Sessions
create table if not exists practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Practice Attempts
create table if not exists practice_attempts (
  id uuid primary key default gen_random_uuid(),
  practice_session_id uuid not null references practice_sessions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  started_at timestamptz not null,
  answered_at timestamptz,
  time_spent_seconds int,
  selected_answer text,
  correct boolean,
  mistake_type text check (mistake_type in
    ('CONCEPTUAL','CALCULATION','MISREAD','SILLY_MISTAKE','GUESS','TIME_PRESSURE','UNKNOWN') or mistake_type is null)
);

-- Evaluations
create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  paper_id uuid references papers(id) on delete cascade,
  eval_type text not null check (eval_type in ('TOPIC_EVAL','FULL_MOCK')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int not null
);

-- Evaluation Attempts
create table if not exists evaluation_attempts (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluations(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  started_at timestamptz not null,
  answered_at timestamptz,
  time_spent_seconds int,
  selected_answer text,
  correct boolean,
  mistake_type text check (mistake_type in
    ('CONCEPTUAL','CALCULATION','MISREAD','SILLY_MISTAKE','GUESS','TIME_PRESSURE','UNKNOWN') or mistake_type is null)
);

-- Confidence Assessments
create table if not exists confidence_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  confidence int not null check (confidence between 1 and 10),
  recorded_at timestamptz not null default now(),
  trigger text not null check (trigger in ('INITIAL','POST_EVALUATION'))
);

-- Create a trigger to auto-create a profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Drop the trigger if it exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
