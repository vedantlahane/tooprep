import { classifyQuestionCurriculum } from './ai-service.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

function getApiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw Object.assign(new Error('GROQ_API_KEY is not configured'), { statusCode: 503 });
  return key;
}

/**
 * Classify a JEE question into a topic using Gemini 3.8 Flash (primary) and Groq (fallback).
 *
 * @param {string} questionText - Full question text including options
 * @param {Array<{id: string, name: string, chapter: string, subject: string}>} topicList
 * @returns {Promise<{topic_id: string|null, topic_name: string|null, subject: string|null, chapter: string|null, confidence: number, reasoning: string}>}
 */
export async function classifyQuestionTopic(questionText, topicList) {
  // Delegate to unified AI service (Gemini 3.8 Flash primary -> Groq GPT-OSS 120B fallback)
  try {
    return await classifyQuestionCurriculum({ questionText, topicList });
  } catch (err) {
    console.warn('[groq.provider] classifyQuestionTopic failed:', err.message);
    return { topic_id: null, topic_name: null, confidence: 0, reasoning: `LLM error: ${err.message}` };
  }
}
