/**
 * Groq LLM Provider — Topic Classification Fallback
 * Uses qwen/qwen3.8-27b (best text model available on this Groq key).
 * Called only when rule-based topic-classifier confidence is below threshold (< 0.40).
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'qwen/qwen3.8-27b';

function getApiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw Object.assign(new Error('GROQ_API_KEY is not configured'), { statusCode: 503 });
  return key;
}

/**
 * Ask Groq to classify a JEE question into a topic from the provided topic list.
 *
 * @param {string} questionText - Full question text including options
 * @param {Array<{id: string, name: string, chapter: string, subject: string}>} topicList
 * @returns {Promise<{topic_id: string|null, topic_name: string|null, subject: string|null, chapter: string|null, confidence: number, reasoning: string}>}
 */
export async function classifyQuestionTopic(questionText, topicList) {
  if (!topicList || topicList.length === 0) {
    return { topic_id: null, topic_name: null, confidence: 0, reasoning: 'No topics provided' };
  }

  // Cap topic list to avoid excessive prompt length
  const topicIndex = topicList.slice(0, 120).map((t, i) =>
    `${i + 1}. [${t.subject || '?'}] ${t.chapter || '?'} > ${t.name} (id: ${t.id})`
  ).join('\n');

  const systemPrompt =
    'You are an expert JEE (Joint Entrance Exam) tutor specializing in Physics, Chemistry, and Mathematics.\n' +
    'Your task: given a JEE question, identify which curriculum topic it belongs to from the provided list.\n' +
    'Always respond with ONLY valid JSON — no explanation, no markdown, no thinking tags.';

  const userPrompt =
    `QUESTION:\n${questionText.slice(0, 800)}\n\n` +
    `AVAILABLE TOPICS:\n${topicIndex}\n\n` +
    `Respond with JSON only:\n` +
    `{"topic_number": <1-based index>, "topic_id": "<exact id>", "confidence": <0.0-1.0>, "reasoning": "<one sentence>"}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Groq API error ${response.status}: ${body.slice(0, 200)}`);
    }

    const body = await response.json();
    const raw = body?.choices?.[0]?.message?.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Groq returned non-JSON: ${raw.slice(0, 100)}`);
    }

    // Match by explicit topic_id first, then by 1-based index
    const matchedTopic =
      topicList.find(t => t.id === parsed.topic_id) ||
      (parsed.topic_number && topicList[parsed.topic_number - 1]) ||
      null;

    if (!matchedTopic) {
      return { topic_id: null, topic_name: null, confidence: 0, reasoning: 'LLM returned unrecognized topic id' };
    }

    return {
      topic_id: matchedTopic.id,
      topic_name: matchedTopic.name,
      subject: matchedTopic.subject,
      chapter: matchedTopic.chapter,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      reasoning: parsed.reasoning || ''
    };
  } catch (err) {
    // Non-fatal: caller uses rule-based result as fallback
    console.warn('[groq.provider] classifyQuestionTopic failed:', err.message);
    return { topic_id: null, topic_name: null, confidence: 0, reasoning: `LLM error: ${err.message}` };
  }
}
