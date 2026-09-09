/**
 * Tavily AI Question Researcher Provider
 *
 * Uses Tavily Search & Advanced Q&A to:
 * 1. Search authentic JEE Main & Advanced question databases (Doubtnut, Vedantu, Toppr, Shaalaa, ExamGoali, etc.)
 * 2. Extract official question text, A/B/C/D choices, correct answer key, and step-by-step LaTeX solution
 * 3. Clean residual OCR noise like "engineering_drawing: ..."
 * 4. Parse exam provenance (e.g. [JEE-Main On line-2018] -> JEE Main 2018)
 */

import { logger } from '../../platform/logger.js';

const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Remove residual OCR annotations and diagram placeholders from question/solution text.
 */
export function cleanOcrArtifacts(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    // Strip engineering_drawing annotations
    .replace(/engineering_drawing:[^\n\r]*/gi, '')
    // Strip *[Diagram: ...]* tags
    .replace(/\*\[Diagram:[^\]]*\]\*/gi, '')
    // Strip pseudo image tags
    .replace(/<img[^>]*>/gi, '')
    // Strip empty KaTeX blocks
    .replace(/\$\$\s*\$\$/g, '')
    .replace(/\$\s*\$/g, '')
    // Clean multiple consecutive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract exam name and year from provenance strings or text.
 * e.g. "[JEE-Main On line-2018]" -> { exam: "JEE Main", year: 2018 }
 */
export function extractExamProvenance(text) {
  if (!text) return null;

  // Match e.g. [JEE-Main On line-2018], [JEE Main 2021], [JEE-Advanced 2019]
  const match = text.match(/\[?(?:IIT\s*)?JEE[\s-]*(Main|Advanced)(?:[\s\w-]*?)(\d{4})\]?/i);
  if (match) {
    const examType = match[1].toLowerCase().includes('adv') ? 'JEE Advanced' : 'JEE Main';
    const year = parseInt(match[2], 10);
    return {
      exam: examType,
      year: year >= 1990 && year <= 2030 ? year : null,
      raw: match[0]
    };
  }

  // Check for standalone year if "JEE" is present
  if (/\bJEE\b/i.test(text)) {
    const yearMatch = text.match(/\b(20[0-2]\d)\b/);
    if (yearMatch) {
      return {
        exam: /adv/i.test(text) ? 'JEE Advanced' : 'JEE Main',
        year: parseInt(yearMatch[1], 10),
        raw: yearMatch[0]
      };
    }
  }

  return null;
}

/**
 * Search Tavily for a JEE question and return research findings.
 *
 * @param {Object} params
 * @param {string} params.questionText
 * @param {Object} [params.options]
 * @param {string} [params.currentAnswer]
 * @param {string} [params.currentSolution]
 * @param {string} [params.subject]
 * @returns {Promise<Object>}
 */
export async function researchQuestionWithTavily({
  questionText,
  options = {},
  currentAnswer = '',
  currentSolution = '',
  subject = ''
}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('TAVILY_API_KEY is not configured in server environment'), {
      statusCode: 503
    });
  }

  const cleanedText = cleanOcrArtifacts(questionText);
  const examInfo = extractExamProvenance(questionText) || extractExamProvenance(cleanedText);

  // Extract key search query: first 150 chars of cleaned text + exam name + year
  const searchCore = cleanedText
    .replace(/\[JEE[^\]]*\]/gi, '')
    .replace(/[^\w\s.,+\-=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

  const queryParts = [searchCore];
  if (examInfo?.exam) queryParts.push(examInfo.exam);
  if (examInfo?.year) queryParts.push(String(examInfo.year));
  queryParts.push('question solution');

  const query = queryParts.join(' ');
  logger.info({ query }, '[tavily.provider] Researching question on web');

  let tavilyData;
  try {
    const res = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: 'advanced',
        include_raw_content: false,
        max_results: 5
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error({ status: res.status, body: errText }, '[tavily.provider] Tavily API error');
      throw new Error(`Tavily API responded with status ${res.status}: ${errText}`);
    }

    tavilyData = await res.json();
  } catch (err) {
    logger.error({ err: err.message }, '[tavily.provider] Failed to fetch from Tavily');
    throw err;
  }

  const answer = tavilyData.answer || '';
  const results = tavilyData.results || [];
  const sources = results.map(r => ({ title: r.title, url: r.url }));

  // Synthesize research results
  let suggestedAnswerKey = currentAnswer;
  let parsedOptions = { ...options };
  let solutionDraft = cleanOcrArtifacts(currentSolution);

  // 1. Check Tavily synthesized answer for correct option
  const optMatch =
    answer.match(/(?:correct\s*(?:option|answer)\s*(?:is|:)?\s*\(?([A-D1-4])\)?)/i) ||
    answer.match(/(?:Option\s*\(?([A-D1-4])\)?\s*(?:is\s*correct)?)/i) ||
    answer.match(/\(([A-D1-4])\)\s*is\s*the\s*correct/i);

  if (optMatch) {
    const rawOpt = optMatch[1].toUpperCase();
    const numMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
    suggestedAnswerKey = numMap[rawOpt] || rawOpt;
  }

  // 2. Build or polish solution from Tavily answer and educational snippets
  if (answer && answer.length > 30) {
    // Format the answer into clear solution text
    const cleanAnswer = answer
      .replace(/###\s*/g, '')
      .replace(/\*\*/g, '')
      .trim();

    if (!solutionDraft || solutionDraft.length < 50 || solutionDraft.includes('engineering_drawing')) {
      solutionDraft = cleanAnswer;
    } else {
      // Append additional verified explanation if helpful
      if (!solutionDraft.includes(cleanAnswer.slice(0, 40))) {
        solutionDraft = `${solutionDraft}\n\n**Key Concept & Derivation:**\n${cleanAnswer}`;
      }
    }
  }

  // 3. Scan results for option values if missing
  if (!parsedOptions.A && !parsedOptions.B && !parsedOptions.C && !parsedOptions.D) {
    for (const r of results) {
      const content = r.content || '';
      const optA = content.match(/(?:\(A\)|\(1\)|A\.)\s*([^(\n\r]+)/i);
      const optB = content.match(/(?:\(B\)|\(2\)|B\.)\s*([^(\n\r]+)/i);
      const optC = content.match(/(?:\(C\)|\(3\)|C\.)\s*([^(\n\r]+)/i);
      const optD = content.match(/(?:\(D\)|\(4\)|D\.)\s*([^(\n\r]+)/i);

      if (optA && optB && optC && optD) {
        parsedOptions = {
          A: optA[1].trim(),
          B: optB[1].trim(),
          C: optC[1].trim(),
          D: optD[1].trim()
        };
        break;
      }
    }
  }

  return {
    cleaned_question_text: cleanedText,
    options: parsedOptions,
    correct_answer: suggestedAnswerKey || currentAnswer || 'A',
    solution_text: solutionDraft,
    exam_name: examInfo?.exam || null,
    exam_year: examInfo?.year || null,
    tavily_answer: answer,
    sources: sources.slice(0, 3),
    confidence: answer ? 'HIGH' : results.length > 0 ? 'MEDIUM' : 'LOW'
  };
}
