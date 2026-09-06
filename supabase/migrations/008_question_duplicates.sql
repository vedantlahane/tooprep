-- Migration 008: Question Duplicates Tracking & Review
-- Tracks detected exact and near-match duplicate questions for administrative review.

create table if not exists question_duplicates (
  id uuid primary key default gen_random_uuid(),
  primary_question_id uuid not null references questions(id) on delete cascade,
  duplicate_question_id uuid not null references questions(id) on delete cascade,
  similarity_score numeric(5, 2) not null,
  match_type text not null check (match_type in ('EXACT', 'HIGH_CONFIDENCE', 'POTENTIAL')),
  status text not null default 'PENDING' check (status in ('PENDING', 'DISMISSED', 'RESOLVED')),
  resolution_action text check (resolution_action in ('DELETED_PRIMARY', 'DELETED_DUPLICATE', 'MERGED', 'DISMISSED') or resolution_action is null),
  details jsonb not null default '{}'::jsonb,
  flagged_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint question_duplicates_distinct_pair check (primary_question_id <> duplicate_question_id),
  constraint question_duplicates_unique_pair unique (primary_question_id, duplicate_question_id)
);

create index if not exists question_duplicates_status_idx on question_duplicates(status);
create index if not exists question_duplicates_match_type_idx on question_duplicates(match_type);
create index if not exists question_duplicates_primary_idx on question_duplicates(primary_question_id);
create index if not exists question_duplicates_duplicate_idx on question_duplicates(duplicate_question_id);

alter table question_duplicates enable row level security;

-- Admin-only policy for question_duplicates
create policy "Admins can manage question duplicates"
  on question_duplicates
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
