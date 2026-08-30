const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const SOURCE_TYPES = new Set(['PYQ', 'ORIGINAL', 'LICENSED']);

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export function validateQuestionInput(question) {
  const requiredStrings = ['topic_id', 'source_type', 'question_text', 'correct_answer', 'difficulty'];
  for (const field of requiredStrings) {
    if (typeof question[field] !== 'string' || question[field].trim() === '') {
      throw validationError(`${field} is required`);
    }
  }

  if (!SOURCE_TYPES.has(question.source_type)) {
    throw validationError('source_type must be PYQ, ORIGINAL, or LICENSED');
  }
  if (!DIFFICULTIES.has(question.difficulty)) {
    throw validationError('difficulty must be easy, medium, or hard');
  }
  if (!Array.isArray(question.options)) {
    throw validationError('options must be an array');
  }
  if (question.verified !== undefined && typeof question.verified !== 'boolean') {
    throw validationError('verified must be a boolean');
  }
  if (question.exam_year !== undefined && (!Number.isInteger(question.exam_year) || question.exam_year < 1950 || question.exam_year > 2100)) {
    throw validationError('exam_year must be a valid year');
  }

  const questionType = question.question_type || 'single_correct';
  if (questionType === 'single_correct') {
    if (question.options.length < 2) throw validationError('single_correct questions require at least two options');
    const optionIds = new Set();
    for (const option of question.options) {
      if (!option || typeof option.id !== 'string' || option.id.trim() === '' || typeof option.text !== 'string' || option.text.trim() === '') {
        throw validationError('each option requires a non-empty id and text');
      }
      if (optionIds.has(option.id)) throw validationError('option ids must be unique');
      optionIds.add(option.id);
    }
    if (!optionIds.has(question.correct_answer)) {
      throw validationError('correct_answer must match an option id');
    }
  }
}
