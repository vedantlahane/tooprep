const DEFAULT_MODEL = 'gemini-embedding-001';
export const DEFAULT_EMBEDDING_DIMENSION = 768;

function providerError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function buildVectorDocument(question) {
  const options = (question.content.options || []).map(option => `${option.id}: ${option.text}`).join('\n');
  const curriculum = [question.curriculum?.subject, question.curriculum?.chapter, question.curriculum?.topic].filter(Boolean).join(' / ');
  return [curriculum && `Curriculum: ${curriculum}`, question.provenance?.exam && `Exam: ${question.provenance.exam}`,
    `Question: ${question.content.question_text}`, options && `Options:\n${options}`].filter(Boolean).join('\n\n');
}

export async function embedQuestionDocument(text, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_MODEL;
  const dimension = Number(options.dimension || process.env.GEMINI_EMBEDDING_DIMENSION || DEFAULT_EMBEDDING_DIMENSION);
  const fetcher = options.fetcher || fetch;
  if (!apiKey) throw providerError('GEMINI_API_KEY is not configured', 503);
  if (!Number.isInteger(dimension) || dimension < 1 || dimension > 3072) throw providerError('GEMINI_EMBEDDING_DIMENSION must be an integer between 1 and 3072', 500);
  const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`, {
    method: 'POST', headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] }, taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: dimension })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw providerError(`Gemini embedding request failed: ${body?.error?.message || response.statusText}`, response.status);
  const vector = body?.embedding?.values;
  if (!Array.isArray(vector) || vector.length !== dimension || vector.some(value => !Number.isFinite(value))) throw providerError('Gemini returned an invalid embedding vector', 502);
  return vector;
}

export async function embedSearchQuery(text, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_MODEL;
  const dimension = Number(options.dimension || process.env.GEMINI_EMBEDDING_DIMENSION || DEFAULT_EMBEDDING_DIMENSION);
  const fetcher = options.fetcher || fetch;
  if (!apiKey) throw providerError('GEMINI_API_KEY is not configured', 503);
  if (!Number.isInteger(dimension) || dimension < 1 || dimension > 3072) throw providerError('GEMINI_EMBEDDING_DIMENSION must be an integer between 1 and 3072', 500);
  const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`, {
    method: 'POST', headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] }, taskType: 'RETRIEVAL_QUERY', outputDimensionality: dimension })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw providerError(`Gemini embedding request failed: ${body?.error?.message || response.statusText}`, response.status);
  const vector = body?.embedding?.values;
  if (!Array.isArray(vector) || vector.length !== dimension || vector.some(value => !Number.isFinite(value))) throw providerError('Gemini returned an invalid embedding vector', 502);
  return vector;
}
