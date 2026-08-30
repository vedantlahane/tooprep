/**
 * The student question contract deliberately excludes answers and solutions.
 * Keep this mapper at the API boundary so a future storage change cannot
 * accidentally expose assessment answers through a `select('*')` query.
 */
export function toStudentQuestion(question) {
  const {
    id,
    canonical_question_id,
    topic_id,
    source_type,
    provider,
    exam_year,
    exam_session,
    exam_shift,
    question_type,
    question_text,
    options,
    difficulty,
    created_at
  } = question;

  return {
    id,
    canonical_question_id,
    topic_id,
    source_type,
    provider,
    exam_year,
    exam_session,
    exam_shift,
    question_type,
    question_text,
    options,
    difficulty,
    created_at
  };
}
