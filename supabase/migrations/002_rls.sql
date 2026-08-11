-- RLS Policies for JEE Tracker
-- Run AFTER 001_schema.sql

-- ============================================================
-- Shared reference data: world-readable to authenticated users
-- ============================================================

alter table subjects enable row level security;
create policy "authenticated read subjects"
  on subjects for select
  using (auth.role() = 'authenticated');

alter table chapters enable row level security;
create policy "authenticated read chapters"
  on chapters for select
  using (auth.role() = 'authenticated');

alter table topics enable row level security;
create policy "authenticated read topics"
  on topics for select
  using (auth.role() = 'authenticated');

alter table questions enable row level security;
create policy "authenticated read questions"
  on questions for select
  using (auth.role() = 'authenticated');

-- Allow service_role (backend) to insert/update questions
create policy "service role manage questions"
  on questions for all
  using (auth.role() = 'service_role');

alter table papers enable row level security;
create policy "authenticated read papers"
  on papers for select
  using (auth.role() = 'authenticated');

alter table paper_questions enable row level security;
create policy "authenticated read paper_questions"
  on paper_questions for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- Profiles: users can read/update their own profile
-- ============================================================

alter table profiles enable row level security;
create policy "users read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "users update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow the trigger function to insert profiles
create policy "service role manage profiles"
  on profiles for all
  using (auth.role() = 'service_role');

-- ============================================================
-- User-scoped tables: strict isolation per student
-- ============================================================

-- Confidence Assessments
alter table confidence_assessments enable row level security;

create policy "own confidence data select"
  on confidence_assessments for select
  using (auth.uid() = user_id);

create policy "own confidence data insert"
  on confidence_assessments for insert
  with check (auth.uid() = user_id);

create policy "own confidence data update"
  on confidence_assessments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own confidence data delete"
  on confidence_assessments for delete
  using (auth.uid() = user_id);

-- Practice Sessions
alter table practice_sessions enable row level security;

create policy "own practice sessions select"
  on practice_sessions for select
  using (auth.uid() = user_id);

create policy "own practice sessions insert"
  on practice_sessions for insert
  with check (auth.uid() = user_id);

create policy "own practice sessions update"
  on practice_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own practice sessions delete"
  on practice_sessions for delete
  using (auth.uid() = user_id);

-- Practice Attempts
alter table practice_attempts enable row level security;

create policy "own practice attempts select"
  on practice_attempts for select
  using (
    exists (select 1 from practice_sessions s
            where s.id = practice_session_id and s.user_id = auth.uid())
  );

create policy "own practice attempts insert"
  on practice_attempts for insert
  with check (
    exists (select 1 from practice_sessions s
            where s.id = practice_session_id and s.user_id = auth.uid())
  );

create policy "own practice attempts update"
  on practice_attempts for update
  using (
    exists (select 1 from practice_sessions s
            where s.id = practice_session_id and s.user_id = auth.uid())
  );

create policy "own practice attempts delete"
  on practice_attempts for delete
  using (
    exists (select 1 from practice_sessions s
            where s.id = practice_session_id and s.user_id = auth.uid())
  );

-- Evaluations
alter table evaluations enable row level security;

create policy "own evaluations select"
  on evaluations for select
  using (auth.uid() = user_id);

create policy "own evaluations insert"
  on evaluations for insert
  with check (auth.uid() = user_id);

create policy "own evaluations update"
  on evaluations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own evaluations delete"
  on evaluations for delete
  using (auth.uid() = user_id);

-- Evaluation Attempts
alter table evaluation_attempts enable row level security;

create policy "own evaluation attempts select"
  on evaluation_attempts for select
  using (
    exists (select 1 from evaluations e
            where e.id = evaluation_id and e.user_id = auth.uid())
  );

create policy "own evaluation attempts insert"
  on evaluation_attempts for insert
  with check (
    exists (select 1 from evaluations e
            where e.id = evaluation_id and e.user_id = auth.uid())
  );

create policy "own evaluation attempts update"
  on evaluation_attempts for update
  using (
    exists (select 1 from evaluations e
            where e.id = evaluation_id and e.user_id = auth.uid())
  );

create policy "own evaluation attempts delete"
  on evaluation_attempts for delete
  using (
    exists (select 1 from evaluations e
            where e.id = evaluation_id and e.user_id = auth.uid())
  );
