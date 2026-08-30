-- Existing environments that already applied 004 receive the same question
-- projection fields as a clean 001 installation. Existing seed records are
-- treated as published because they are the current student-facing bank.

alter table questions
  add column if not exists publication_status text not null default 'PUBLISHED'
    check (publication_status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  add column if not exists content_version integer not null default 1
    check (content_version > 0),
  add column if not exists source_pages jsonb not null default '[]'::jsonb;

create index if not exists questions_published_topic_idx
  on questions (publication_status, topic_id, difficulty);
