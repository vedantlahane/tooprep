function inputError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export function validateContentDraft(input) {
  if (!input || typeof input !== 'object') throw inputError('A question draft is required');
  if (typeof input.question_text !== 'string' || input.question_text.trim() === '') {
    throw inputError('question_text is required');
  }
  if (!Array.isArray(input.options)) throw inputError('options must be an array');
  if (typeof input.correct_answer !== 'string' || input.correct_answer.trim() === '') {
    throw inputError('correct_answer is required');
  }
  if (input.source_pages !== undefined && (!Array.isArray(input.source_pages) || input.source_pages.some(page => !Number.isInteger(page) || page < 1))) {
    throw inputError('source_pages must be an array of positive page numbers');
  }
}

export function validateIngestionSource(input) {
  if (!input || typeof input.source_storage_path !== 'string' || input.source_storage_path.trim() === '') {
    throw inputError('source_storage_path is required');
  }
  if (input.source_sha256 !== undefined && !/^[a-f0-9]{64}$/i.test(input.source_sha256)) {
    throw inputError('source_sha256 must be a SHA-256 hex digest');
  }
}
