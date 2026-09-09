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
import { supabaseAdmin } from '../../lib/supabase.js';
import { classifyQuestion, inferDifficulty } from './topic-classifier.js';
import { solveAndDeriveQuestion } from './ai-service.js';

const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Remove residual OCR annotations and diagram placeholders from question/solution text.
 */
export function cleanOcrArtifacts(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    // Strip synthetic pseudo-circuit Mermaid blocks (flowcharts of resistors/lenses/nodes)
    .replace(/```mermaid\s*\n\s*graph\s+(?:LR|TD|TB|RL)[\s\S]*?```/gi, '')
    .replace(/```mermaid[\s\S]*?(?:---|\bR\d+\b|Slab|Lens|Battery|Resistor)[\s\S]*?```/gi, '')
    // Strip engineering_drawing annotations
    .replace(/engineering_drawing:[^\n\r]*/gi, '')
    // Strip *[Diagram: ...]* tags
    .replace(/\*\[Diagram:[^\]]*\]\*/gi, '')
    // Strip pseudo image tags
    .replace(/<img[^>]*>/gi, '')
    // Strip empty KaTeX blocks
    .replace(/\$\$\s*\$\$/g, '')
    .replace(/\$\s*\$/g, '')
    // Strip broken OCR tables (empty headers or diagram text layout fragments)
    .replace(/<table>[\s\S]*?<\/table>/gi, (tableHtml) => {
      const emptyHeaders = (tableHtml.match(/<th>\s*<\/th>/gi) || []).length;
      const totalHeaders = (tableHtml.match(/<th[^>]*>/gi) || []).length;
      const hasOcrMarkers = /\\underline|<s>|<strike>|<del>|colspan="\d+"\s*>\s*<\/td>/i.test(tableHtml);
      if (hasOcrMarkers || (totalHeaders > 0 && emptyHeaders >= totalHeaders / 2)) {
        return '';
      }
      return tableHtml;
    })
    // Strip stray OCR strikethrough tags
    .replace(/<s\b[^>]*>[\s\S]*?<\/s>/gi, '')
    .replace(/<strike\b[^>]*>[\s\S]*?<\/strike>/gi, '')
    .replace(/<del\b[^>]*>[\s\S]*?<\/del>/gi, '')
    // Convert <sub>...</sub> and <sup>...</sup> into LaTeX subscript/superscript
    .replace(/([A-Za-z0-9_\(\)]+)<sub>([A-Za-z0-9_\s\+-]+)<\/sub>/g, (m, base, sub) => {
      const cleanSub = sub.trim();
      return /^[a-zA-Z0-9]$/.test(cleanSub) ? `${base}_{${cleanSub}}` : `${base}_{\\text{${cleanSub}}}`;
    })
    .replace(/<sub>([A-Za-z0-9_\s\+-]+)<\/sub>/g, (m, sub) => `_{${sub.trim()}}`)
    .replace(/([A-Za-z0-9_\(\)]+)<sup>([A-Za-z0-9_\s\+-]+)<\/sup>/g, (m, base, sup) => `${base}^{${sup.trim()}}`)
    .replace(/<sup>([A-Za-z0-9_\s\+-]+)<\/sup>/g, (m, sup) => `^{${sup.trim()}}`)
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
 * Query Tavily for authentic JEE Main / Advanced question reference context.
 */
export async function fetchTavilyContext(questionText) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  const cleanedText = cleanOcrArtifacts(questionText);
  const examInfo = extractExamProvenance(questionText) || extractExamProvenance(cleanedText);

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
      const errText = await res.text().catch(() => '');
      logger.warn({ status: res.status, body: errText.slice(0, 150) }, '[tavily.provider] Tavily API warning');
      return null;
    }

    const tavilyData = await res.json();
    const answer = tavilyData.answer || '';
    const results = tavilyData.results || [];
    const sources = results.map(r => ({ title: r.title, url: r.url }));
    const webContext = [
      answer ? `Tavily Direct Answer: ${answer}` : '',
      results.slice(0, 3).map((r, i) => `Source ${i + 1} (${r.title}):\n${r.content}`).join('\n\n')
    ].filter(Boolean).join('\n\n');

    return { answer, results, sources, webContext, query };
  } catch (err) {
    logger.warn({ err: err.message }, '[tavily.provider] Failed to fetch Tavily context');
    return null;
  }
}

/**
 * Search Tavily for a JEE question and return research findings.
 */
export async function researchQuestionWithTavily({
  questionText,
  options = {},
  currentAnswer = '',
  currentSolution = '',
  subject = ''
}) {
  const tavilyData = await fetchTavilyContext(questionText);
  const answer = tavilyData?.answer || '';
  const results = tavilyData?.results || [];
  const sources = tavilyData?.sources || [];
  const webContext = tavilyData?.webContext || '';

  let cleanedText = cleanOcrArtifacts(questionText);
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

  // 2. Scan results for option values if missing
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

  // 3. Synthesize publication-grade STEM solution and verification via Gemini 3.8 Flash
  let aiDerived = null;
  try {
    aiDerived = await solveAndDeriveQuestion({
      questionText: cleanedText,
      options: parsedOptions,
      currentAnswer: suggestedAnswerKey || currentAnswer,
      currentSolution: solutionDraft,
      webContext,
      subject
    });

    if (aiDerived) {
      if (aiDerived.cleaned_question_text) cleanedText = aiDerived.cleaned_question_text;
      if (aiDerived.options && (aiDerived.options.A || aiDerived.options.B)) {
        parsedOptions = {
          A: aiDerived.options.A || parsedOptions.A || '',
          B: aiDerived.options.B || parsedOptions.B || '',
          C: aiDerived.options.C || parsedOptions.C || '',
          D: aiDerived.options.D || parsedOptions.D || ''
        };
      }
      if (aiDerived.correct_answer) suggestedAnswerKey = aiDerived.correct_answer;
      if (aiDerived.solution_text) solutionDraft = cleanOcrArtifacts(aiDerived.solution_text);
    }
  } catch (aiErr) {
    logger.warn({ error: aiErr.message }, '[tavily.provider] AI derivation fallback to standard synthesis');
    if (answer && answer.length > 30) {
      solutionDraft = answer.replace(/###\s*/g, '').replace(/\*\*/g, '').trim();
    }
  }

  // 4. Auto-classify curriculum topic and difficulty
  let topicClassification = null;
  try {
    const { data: dbTopics } = await supabaseAdmin
      .from('topics')
      .select('id, name, chapter_id, chapters(name, subjects(name))');
    if (dbTopics && dbTopics.length > 0) {
      const allTopics = dbTopics.map(t => ({
        id: t.id,
        name: t.name,
        chapter: t.chapters?.name,
        subject: t.chapters?.subjects?.name
      }));

      // If Gemini identified a suggested topic, match it against database topics first
      if (aiDerived?.suggested_topic) {
        const directMatch = allTopics.find(t =>
          t.name.toLowerCase().includes(aiDerived.suggested_topic.toLowerCase()) ||
          aiDerived.suggested_topic.toLowerCase().includes(t.name.toLowerCase())
        );
        if (directMatch) {
          topicClassification = {
            subject: directMatch.subject,
            chapter: directMatch.chapter,
            topicName: directMatch.name,
            topicId: directMatch.id,
            confidence: 'HIGH'
          };
        }
      }

      if (!topicClassification) {
        topicClassification = classifyQuestion(0, `${cleanedText} ${answer || ''}`, allTopics);
      }
    }
  } catch (tErr) {
    logger.warn('tavily.classification.fallback', { error: tErr.message });
  }

  const inferredDiff = aiDerived?.difficulty || inferDifficulty(cleanedText, examInfo?.exam || '');

  return {
    cleaned_question_text: cleanedText,
    options: parsedOptions,
    correct_answer: suggestedAnswerKey || currentAnswer || 'A',
    solution_text: solutionDraft,
    exam_name: examInfo?.exam || null,
    exam_year: examInfo?.year || null,
    suggested_topic_id: topicClassification?.topicId || null,
    suggested_topic: topicClassification?.topicName || null,
    suggested_chapter: topicClassification?.chapter || null,
    subject: topicClassification?.subject || subject || null,
    difficulty: inferredDiff,
    tavily_answer: answer,
    sources: sources.slice(0, 3),
    confidence: aiDerived ? 'HIGH' : (answer ? 'HIGH' : results.length > 0 ? 'MEDIUM' : 'LOW'),
    ai_model: aiDerived?.model || 'rule-engine'
  };
}
