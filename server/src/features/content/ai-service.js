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
 * Perform deep STEM reasoning to solve, verify, and generate an immaculate JEE solution in KaTeX,
 * with detailed thinking process and conversational refinement support.
 */
export async function solveAndDeriveQuestion({
  questionText,
  options = {},
  currentAnswer = '',
  currentSolution = '',
  webContext = '',
  subject = '',
  userInstruction = '',
  conversationHistory = []
}) {
  const isRefinement = Boolean(userInstruction && userInstruction.trim());

  const systemPrompt =
    'You are a senior JEE Physics, Chemistry, and Mathematics master educator, examiner, and curriculum specialist.\n' +
    'Your task is to VERIFY, SOLVE, AND REPAIR this JEE question and produce an immaculate, publication-grade entry:\n' +
    '1. THINKING PROCESS & REASONING:\n' +
    '   - Provide a comprehensive, transparent "thinking_process" explaining your conceptual breakdown, the fundamental physics/chemistry/math principles, detailed step-by-step calculation check, and verification of all 4 options (why one is uniquely correct and why others are false).\n' +
    (isRefinement
      ? '   - The administrator has provided specific feedback or requested a correction. Explicitly evaluate this feedback in your thinking_process, identify what needed fixing, and describe how your calculations and answer have been revised.\n'
      : '') +
    '2. CONVERSATIONAL REPLY:\n' +
    '   - In "reply_message", provide a concise, direct, and respectful summary to the administrator explaining your findings or the adjustments made.\n' +
    '3. QUESTION STEM: Standardize all math, variables, and units into valid KaTeX ($...$). Preserve any problem figure image markdown (e.g. ![Figure](...)).\n' +
    '4. OPTIONS: Ensure all options A, B, C, D have standard KaTeX formatting with units ($45^\\circ\\text{C}$, etc.).\n' +
    '5. VERIFICATION & SOLVING: Solve the problem independently from first principles. Verify which option key (A, B, C, or D) is mathematically correct. Ensure correct_answer matches the derived answer exactly.\n' +
    '6. SOLUTION DERIVATION:\n' +
    '   - Provide a complete, rigorous, step-by-step KaTeX derivation ($...$ inline, $$...$$ display block). Wrap all multi-line mathematical equations inside display blocks ($$ \\begin{aligned} ... \\end{aligned} $$ or $$ ... $$) and use clear numbered steps.\n' +
    '   - CRITICAL: DO NOT generate or preserve any Mermaid diagrams (```mermaid ... ```) for circuits, optics, or physics setups as they render poorly and distort the physics. Express equivalent circuits, ray optics, and physical mechanisms through clean mathematical reasoning and formulas.\n' +
    '   - If the existing draft solution has wrong steps or inaccurate equations, discard them and rewrite the derivation accurately.\n' +
    '7. CURRICULUM & DIFFICULTY: Accurately classify Subject, Chapter, and Topic.\n\n' +
    'Respond with JSON only matching this schema:\n' +
    '{\n' +
    '  "thinking_process": "<Detailed multi-step reasoning, derivation notes, option verification analysis, and feedback evaluation>",\n' +
    '  "reply_message": "<Direct summary message to the administrator regarding the solution or changes made>",\n' +
    '  "cleaned_question_text": "<clean markdown stem with KaTeX and preserved ![Figure](...)>",\n' +
    '  "options": { "A": "<opt A>", "B": "<opt B>", "C": "<opt C>", "D": "<opt D>" },\n' +
    '  "correct_answer": "A" | "B" | "C" | "D",\n' +
    '  "solution_text": "<step-by-step KaTeX derivation without any mermaid diagrams>",\n' +
    '  "subject": "Physics" | "Chemistry" | "Mathematics",\n' +
    '  "suggested_chapter": "<chapter name>",\n' +
    '  "suggested_topic": "<topic name>",\n' +
    '  "difficulty": "easy" | "medium" | "hard"\n' +
    '}';

  let userPrompt = `QUESTION STEM:\n${questionText}\n\n`;

  const optEntries = Object.entries(options || {}).filter(([_, v]) => Boolean(v));
  if (optEntries.length > 0) {
    userPrompt += `OPTIONS:\n${optEntries.map(([k, v]) => `(${k}) ${v}`).join('\n')}\n\n`;
  }
  if (currentAnswer) userPrompt += `PREVIOUS ANSWER KEY: (${currentAnswer})\n\n`;
  if (currentSolution) userPrompt += `CURRENT DRAFT SOLUTION:\n${currentSolution}\n\n`;
  if (webContext) userPrompt += `WEB RESEARCH REFERENCE CONTEXT:\n${webContext}\n\n`;

  if (conversationHistory && conversationHistory.length > 0) {
    userPrompt += 'PREVIOUS CONVERSATION HISTORY:\n';
    conversationHistory.forEach(item => {
      userPrompt += `[${item.role === 'user' ? 'Admin' : 'AI'}]: ${item.text || item.message}\n`;
    });
    userPrompt += '\n';
  }

  if (isRefinement) {
    userPrompt += `ADMIN FEEDBACK / CORRECTION REQUEST:\n"${userInstruction.trim()}"\n\nPlease re-evaluate the question, address the admin's feedback, update the fields accordingly, and explain your thinking.`;
  } else {
    userPrompt += 'Verify, solve, and repair the question, options, answer key, and solution. Detail your thinking process.';
  }

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
 * Deep AI Verification & Repair combining web context and Gemini 3.8 Flash solving.
 */
export async function verifyAndFormatQuestion({
  questionText = '',
  options = {},
  currentAnswer = '',
  solutionText = '',
  rawText = '',
  webContext = '',
  subject = '',
  userInstruction = '',
  conversationHistory = []
}) {
  return solveAndDeriveQuestion({
    questionText: questionText || rawText,
    options,
    currentAnswer,
    currentSolution: solutionText,
    webContext,
    subject,
    userInstruction,
    conversationHistory
  });
}

/**
 * 1-Click AI Format and Polish for Question Stem, Options, and Solution.
 */
export async function formatAndCleanQuestion({
  questionText = '',
  options = {},
  currentAnswer = '',
  solutionText = '',
  rawText = '',
  webContext = '',
  subject = '',
  userInstruction = '',
  conversationHistory = []
}) {
  return solveAndDeriveQuestion({
    questionText: questionText || rawText,
    options,
    currentAnswer,
    currentSolution: solutionText,
    webContext,
    subject,
    userInstruction,
    conversationHistory
  });
}
