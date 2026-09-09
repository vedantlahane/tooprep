/**
 * Unified Multi-Provider AI Service
 *
 * Implements a resilient, multi-tier LLM pipeline:
 * - Tier 1 (Primary Flagship): Google Gemini 3.8 Flash (Sept 2026 flagship for STEM, multi-step reasoning, 1M context)
 * - Tier 2 (Gemini Fallback): Gemini 3.7 Flash / Gemini Flash Latest (handles demand spikes)
 * - Tier 3 (Ultra-Fast Groq Fallback): OpenAI GPT-OSS 120B / Qwen 3.8 27B on Groq LPU (500ms latency)
 */

import { logger } from '../../platform/logger.js';

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || null;
}

function getGroqKey() {
  return process.env.GROQ_API_KEY || null;
}

function extractJson(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {}
  const match = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {}
  }
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(str.slice(firstBrace, lastBrace + 1));
    } catch {}
  }
  return null;
}

/**
 * Execute an LLM call across the model tier hierarchy with automatic failover.
 */
export async function callLlmWithFallback({
  systemPrompt = '',
  userPrompt = '',
  temperature = 0.1,
  maxTokens = 4096,
  requireJson = true
}) {
  const geminiKey = getGeminiKey();
  const groqKey = getGroqKey();

  let lastError = null;

  // 1. Try Gemini tier models first (Gemini 3.8 Flash primary, 3.7 Flash fallback)
  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const promptText = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;

        const bodyPayload = {
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens
          }
        };

        if (requireJson) {
          bodyPayload.generationConfig.responseMimeType = 'application/json';
        }

        let res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        // Transient 503 demand spike or 429 rate limit: retry once after 1s
        if (res.status === 503 || res.status === 429) {
          await new Promise(r => setTimeout(r, 1000));
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
          });
        }

        if (res.ok) {
          const data = await res.json();
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (raw) {
            const parsedData = requireJson ? extractJson(raw) : null;
            if (!requireJson || parsedData) {
              logger.info({ model, provider: 'gemini' }, '[ai-service] Successful completion');
              return {
                text: raw,
                model,
                provider: 'gemini',
                data: parsedData
              };
            }
          }
        } else {
          const errBody = await res.text().catch(() => '');
          lastError = new Error(`Gemini ${model} error ${res.status}: ${errBody.slice(0, 150)}`);
          logger.warn({ model, status: res.status }, '[ai-service] Gemini model failed, trying next tier');
        }
      } catch (err) {
        lastError = err;
        logger.warn({ model, error: err.message }, '[ai-service] Gemini exception, trying next tier');
      }
    }
  }

  // 2. Try Groq tier models as fallback (OpenAI GPT-OSS 120B, Qwen 3.8 27B)
  if (groqKey) {
    for (const model of GROQ_MODELS) {
      try {
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: userPrompt });

        const bodyPayload = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        };

        if (requireJson) {
          bodyPayload.response_format = { type: 'json_object' };
        }

        let res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyPayload)
        });

        // If strict json_object failed due to validation or length, retry without response_format and extract
        if (!res.ok && requireJson) {
          const errBody = await res.text().catch(() => '');
          try {
            const errObj = JSON.parse(errBody);
            if (errObj?.error?.failed_generation) {
              const salvaged = extractJson(errObj.error.failed_generation);
              if (salvaged) {
                logger.info({ model, provider: 'groq' }, '[ai-service] Salvaged valid JSON from Groq generation');
                return {
                  text: errObj.error.failed_generation,
                  model,
                  provider: 'groq',
                  data: salvaged
                };
              }
            }
          } catch {}

          // Retry once without strict response_format
          delete bodyPayload.response_format;
          res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyPayload)
          });
        }

        if (res.ok) {
          const data = await res.json();
          const raw = data?.choices?.[0]?.message?.content || '';
          if (raw) {
            const parsedData = requireJson ? extractJson(raw) : null;
            if (!requireJson || parsedData) {
              logger.info({ model, provider: 'groq' }, '[ai-service] Successful completion via Groq fallback');
              return {
                text: raw,
                model,
                provider: 'groq',
                data: parsedData
              };
            }
          }
        } else {
          const errBody = await res.text().catch(() => '');
          lastError = new Error(`Groq ${model} error ${res.status}: ${errBody.slice(0, 150)}`);
          logger.warn({ model, status: res.status }, '[ai-service] Groq model failed, trying next tier');
        }
      } catch (err) {
        lastError = err;
        logger.warn({ model, error: err.message }, '[ai-service] Groq exception, trying next tier');
      }
    }
  }

  throw lastError || new Error('No AI provider configured or all models failed');
}

/**
 * Classify a question into the curriculum hierarchy using LLM reasoning.
 */
export async function classifyQuestionCurriculum({ questionText, topicList, subject = '' }) {
  if (!topicList || topicList.length === 0) {
    return { topic_id: null, topic_name: null, confidence: 0, reasoning: 'No topics provided' };
  }

  const filteredTopics = subject
    ? topicList.filter(t => (t.subject || '').toLowerCase() === subject.toLowerCase())
    : topicList;

  const activeTopics = filteredTopics.length > 0 ? filteredTopics : topicList;
  const topicIndex = activeTopics.slice(0, 120).map((t, i) =>
    `${i + 1}. [${t.subject || '?'}] ${t.chapter || '?'} > ${t.name} (id: ${t.id})`
  ).join('\n');

  const systemPrompt =
    'You are a senior JEE curriculum specialist in Physics, Chemistry, and Mathematics.\n' +
    'Task: Identify the exact curriculum topic for the given JEE question from the provided list.\n' +
    'Consider the core concept tested (e.g. heat conduction is Thermal Properties, not Rotational Motion even if a rod is mentioned).\n' +
    'Respond with JSON only: {"topic_number": <1-based index>, "topic_id": "<exact id>", "confidence": <0.0-1.0>, "reasoning": "<short rationale>"}';

  const userPrompt =
    `QUESTION:\n${questionText.slice(0, 1000)}\n\n` +
    `AVAILABLE CURRICULUM TOPICS:\n${topicIndex}\n\n` +
    'Select the best matching topic from the list above.';

  try {
    const result = await callLlmWithFallback({ systemPrompt, userPrompt, requireJson: true });
    const parsed = result.data || {};

    const matchedTopic =
      activeTopics.find(t => t.id === parsed.topic_id) ||
      (parsed.topic_number && activeTopics[parsed.topic_number - 1]) ||
      null;

    if (!matchedTopic) {
      return { topic_id: null, topic_name: null, confidence: 0, reasoning: 'LLM returned unrecognized topic ID' };
    }

    return {
      topic_id: matchedTopic.id,
      topic_name: matchedTopic.name,
      subject: matchedTopic.subject,
      chapter: matchedTopic.chapter,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.85)),
      reasoning: parsed.reasoning || '',
      model: result.model
    };
  } catch (err) {
    logger.warn({ error: err.message }, '[ai-service] classifyQuestionCurriculum fallback failed');
    return { topic_id: null, topic_name: null, confidence: 0, reasoning: err.message };
  }
}

/**
 * Perform deep STEM reasoning to generate or polish a complete JEE solution in LaTeX.
 */
export async function solveAndDeriveQuestion({
  questionText,
  options = {},
  currentAnswer = '',
  currentSolution = '',
  webContext = '',
  subject = ''
}) {
  const systemPrompt =
    'You are a master JEE educator producing authentic, publication-grade solution derivations for JEE Main & Advanced.\n' +
    'Your solutions must be rigorous, clean, and pedagogical:\n' +
    '1. Start with "### **Key Concept & Formula:**" stating physical/chemical/mathematical principles.\n' +
    '2. Provide step-by-step derivation with clean KaTeX math ($...$ inline, $$...$$ display block).\n' +
    '3. Verify which option (A, B, C, or D) is mathematically correct.\n' +
    '4. Preserve or integrate any Mermaid circuit/diagram blocks (```mermaid ... ```) if present.\n' +
    '5. Format all options with proper KaTeX math symbols.\n' +
    'Respond with JSON only matching this schema:\n' +
    '{\n' +
    '  "cleaned_question_text": "<clean markdown stem with KaTeX>",\n' +
    '  "options": { "A": "<opt A>", "B": "<opt B>", "C": "<opt C>", "D": "<opt D>" },\n' +
    '  "correct_answer": "A" | "B" | "C" | "D",\n' +
    '  "solution_text": "<step-by-step KaTeX derivation>",\n' +
    '  "subject": "Physics" | "Chemistry" | "Mathematics",\n' +
    '  "suggested_chapter": "<chapter name>",\n' +
    '  "suggested_topic": "<topic name>",\n' +
    '  "difficulty": "easy" | "medium" | "hard"\n' +
    '}';

  let userPrompt = `QUESTION:\n${questionText}\n\n`;

  const optEntries = Object.entries(options || {}).filter(([_, v]) => Boolean(v));
  if (optEntries.length > 0) {
    userPrompt += `OPTIONS:\n${optEntries.map(([k, v]) => `(${k}) ${v}`).join('\n')}\n\n`;
  }
  if (currentAnswer) userPrompt += `PREVIOUS ANSWER KEY: (${currentAnswer})\n\n`;
  if (currentSolution) userPrompt += `EXISTING DRAFT SOLUTION:\n${currentSolution}\n\n`;
  if (webContext) userPrompt += `WEB RESEARCH FINDINGS & REFERENCE CONTEXT:\n${webContext}\n\n`;

  userPrompt += 'Generate the complete, verified solution and polished question.';

  const result = await callLlmWithFallback({
    systemPrompt,
    userPrompt,
    requireJson: true,
    temperature: 0.1
  });

  return {
    ...(result.data || {}),
    model: result.model,
    provider: result.provider
  };
}

/**
 * 1-Click AI Format and Polish for Question Stem, Options, and Solution.
 */
export async function formatAndCleanQuestion({
  questionText = '',
  options = {},
  solutionText = '',
  rawText = '',
  subject = ''
}) {
  const systemPrompt =
    'You are a professional JEE textbook and test platform editor.\n' +
    'Your job is to polish raw, OCR-extracted JEE questions into immaculate LaTeX and markdown format:\n' +
    '1. Clean up glued math symbols (e.g. ^\\circC -> ^\\circ \\text{C}, \\lambda_n2 -> \\lambda_n^2).\n' +
    '2. Ensure all formulas, exponents, and variables are wrapped in valid KaTeX ($...$ or $$...$$).\n' +
    '3. Format options (A, B, C, D) cleanly.\n' +
    '4. Clean solution text: strip any OCR layout table artifacts (<table>...</table>), convert HTML <sub>/<sup> to LaTeX, and preserve any Mermaid diagrams (```mermaid ... ```).\n' +
    '5. Accurately identify curriculum Subject, Chapter, and Topic.\n' +
    'Respond with JSON only matching this schema:\n' +
    '{\n' +
    '  "cleaned_question_text": "<clean text>",\n' +
    '  "options": { "A": "<opt A>", "B": "<opt B>", "C": "<opt C>", "D": "<opt D>" },\n' +
    '  "correct_answer": "<A/B/C/D if detectable, else null>",\n' +
    '  "solution_text": "<clean solution with KaTeX and preserved Mermaid diagrams>",\n' +
    '  "subject": "<Physics/Chemistry/Mathematics>",\n' +
    '  "suggested_chapter": "<chapter name>",\n' +
    '  "suggested_topic": "<topic name>",\n' +
    '  "difficulty": "easy" | "medium" | "hard"\n' +
    '}';

  const userPrompt =
    `QUESTION TEXT:\n${questionText || rawText}\n\n` +
    `OPTIONS:\n${JSON.stringify(options, null, 2)}\n\n` +
    `SOLUTION TEXT:\n${solutionText || '(None)'}\n\n` +
    `SUBJECT: ${subject || 'Physics'}`;

  const result = await callLlmWithFallback({
    systemPrompt,
    userPrompt,
    requireJson: true,
    temperature: 0.1
  });

  return {
    ...(result.data || {}),
    model: result.model,
    provider: result.provider
  };
}
