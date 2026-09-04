import { createHash } from 'node:crypto';
import { classifyQuestion } from './topic-classifier.js';

/**
 * Filter out exam cover-page instruction paragraphs and non-question boilerplate.
 */
export function isInstructionBlock(text) {
  const lower = (text || '').toLowerCase().trim();
  const instructionPhrases = [
    'this test will be',
    'this test consists of',
    'each question is of',
    'there are three parts',
    'there will be only one correct choice',
    'mobile phones, calculator',
    'all calculations / written work should be done',
    'rough sheet provided',
    'marking scheme:',
    'instructions for the candidate',
    'general instructions'
  ];
  return instructionPhrases.some(phrase => lower.includes(phrase));
}

function cleanRunningHeaders(text) {
  return (text || '')
    .replace(/(?:^|\n)\s*(?:\*\*|#)?\s*\d+\s*\|\s*2018[^\n]*/gi, '')
    .replace(/(?:^|\n)\s*JEE-Main Online Paper[^\n]*/gi, '')
    .replace(/(?:^|\n)\s*# JEE MAIN ONLINE PAPER[^\n]*/gi, '')
    .replace(/(?:^|\n)\s*## Held on [^\n]*/gi, '')
    .replace(/(?:^|\n)\s*## \*\*Instructions\*\*[\s\S]*?(?=(?:## \*\*PHYSICS\*\*|## PHYSICS|\*\*Q\.1\*\*))/i, '');
}

export function parseTableOptions(text) {
  const tableRegex = /<table>[\s\S]*?<\/table>/i;
  const match = (text || '').match(tableRegex);
  if (!match) return null;

  const tableHtml = match[0];
  const optMap = {};

  // Pattern A: <tr><th>(A)</th><td>...</td></tr>
  const rowRegex1 = /<tr>\s*(?:<th>|<td>)\s*(?:\(?([A-Da-d1-4])\)?)\s*(?:<\/th>|<\/td>)\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  for (const r of tableHtml.matchAll(rowRegex1)) {
    let key = r[1].toUpperCase();
    if (key === '1') key = 'A';
    else if (key === '2') key = 'B';
    else if (key === '3') key = 'C';
    else if (key === '4') key = 'D';
    optMap[key] = r[2].trim();
  }

  // Pattern B: <td>(A) 2.5 mA</td><td>(B) 3.3 mA</td> (2 options per row)
  if (!optMap.A || !optMap.B || !optMap.C || !optMap.D) {
    const cellRegex = /<td>\s*(?:\(?([A-Da-d1-4])\)?|\b([A-Da-d1-4])\.)\s+([\s\S]*?)<\/td>/gi;
    for (const c of tableHtml.matchAll(cellRegex)) {
      let key = (c[1] || c[2]).toUpperCase();
      if (key === '1') key = 'A';
      else if (key === '2') key = 'B';
      else if (key === '3') key = 'C';
      else if (key === '4') key = 'D';
      optMap[key] = c[3].trim();
    }
  }

  if (optMap.A && optMap.B && optMap.C && optMap.D) {
    const qStem = text.replace(tableRegex, '').trim();
    return { questionText: qStem, options: optMap, hasOptions: true };
  }

  return null;
}

export function extractOptions(raw) {
  let text = (raw || '').trim();

  // Strip section headers like ## **PHYSICS** or ## **CHEMISTRY**
  text = text.replace(/^##\s*\*\*[A-Z\s]+\*\*\s*/im, '').trim();

  // Try HTML table options first
  const tableOpts = parseTableOptions(text);
  if (tableOpts) return tableOpts;

  // Bracketed options: (A) ... (B) ... (C) ... (D) or (1) ... (2) ... (3) ... (4)
  const bracketRegex = /(?:^|\s|\n)(?:\(|\[)([A-Da-d1-4])(?:\)|\])\s+/g;
  let matches = [...text.matchAll(bracketRegex)];

  if (matches.length >= 4) {
    for (let i = 0; i <= matches.length - 4; i++) {
      const window = matches.slice(i, i + 4);
      const keys = window.map(m => m[1].toUpperCase());
      const isABCD = keys.join('') === 'ABCD';
      const is1234 = keys.join('') === '1234';

      if (isABCD || is1234) {
        const qText = text.slice(0, window[0].index).trim();
        const optA = text.slice(window[0].index + window[0][0].length, window[1].index).trim();
        const optB = text.slice(window[1].index + window[1][0].length, window[2].index).trim();
        const optC = text.slice(window[2].index + window[2][0].length, window[3].index).trim();
        const optD = text.slice(window[3].index + window[3][0].length).trim();

        return {
          questionText: qText,
          options: { A: optA, B: optB, C: optC, D: optD },
          hasOptions: true
        };
      }
    }
  }

  // Fallback: A. B. C. D. on newlines
  const newlineOptRegex = /(?:^|\n)\s*([A-Da-d1-4])(?:\.|\:)\s+/g;
  matches = [...text.matchAll(newlineOptRegex)];
  if (matches.length >= 4) {
    for (let i = 0; i <= matches.length - 4; i++) {
      const window = matches.slice(i, i + 4);
      const keys = window.map(m => m[1].toUpperCase());
      if (keys.join('') === 'ABCD' || keys.join('') === '1234') {
        const qText = text.slice(0, window[0].index).trim();
        const optA = text.slice(window[0].index + window[0][0].length, window[1].index).trim();
        const optB = text.slice(window[1].index + window[1][0].length, window[2].index).trim();
        const optC = text.slice(window[2].index + window[2][0].length, window[3].index).trim();
        const optD = text.slice(window[3].index + window[3][0].length).trim();
        return {
          questionText: qText,
          options: { A: optA, B: optB, C: optC, D: optD },
          hasOptions: true
        };
      }
    }
  }

  return { questionText: text, options: { A: '', B: '', C: '', D: '' }, hasOptions: false };
}

export function parseAnswerKeyMap(pages) {
  const answerKeyMap = {};
  for (const page of pages) {
    const md = page.markdown || '';
    if (md.includes('**ANSWERS**') || md.includes('# ANSWERS') || md.includes('## ANSWERS')) {
      const ansPattern = /(?:\*\*|\b)(\d{1,3})\s*(?:\.\*\*|\.|\))\s*\(([1-4A-Da-d,\s]+)\)/g;
      for (const m of md.matchAll(ansPattern)) {
        const qNum = parseInt(m[1], 10);
        let rawAns = m[2].trim();
        if (rawAns === '1') rawAns = 'A';
        else if (rawAns === '2') rawAns = 'B';
        else if (rawAns === '3') rawAns = 'C';
        else if (rawAns === '4') rawAns = 'D';
        answerKeyMap[qNum] = rawAns;
      }
    }
  }
  return answerKeyMap;
}

export function parseSolutionsMap(pages) {
  let solutionsStartPageIdx = -1;
  for (let i = 0; i < pages.length; i++) {
    const md = pages[i].markdown || '';
    if (md.includes('## Hints & Solutions') || md.includes('## Solutions') || md.includes('# Hints & Solutions')) {
      solutionsStartPageIdx = i;
      break;
    }
  }

  if (solutionsStartPageIdx === -1) return {};

  let allSolutionsMd = '';
  for (let i = solutionsStartPageIdx; i < pages.length; i++) {
    const md = pages[i].markdown || '';
    if (i === solutionsStartPageIdx) {
      const idx = md.search(/##\s*Hints\s*&\s*Solutions|##\s*Solutions|#\s*Hints\s*&\s*Solutions/i);
      allSolutionsMd += '\n' + (idx !== -1 ? md.slice(idx) : md);
    } else {
      allSolutionsMd += '\n' + md;
    }
  }

  // Strip section headers
  allSolutionsMd = allSolutionsMd.replace(/##\s*\*\*[A-Z\s]+\*\*/gi, '');

  const solPattern = /(?:^|\n)\s*(?:##\s*)?(?:\*\*)?(\d{1,3})\s*(?:\.\s*\[|\s*\[)\s*([1-4A-Da-d])\s*\](?:\*\*)?\s*/g;
  const solMatches = [...allSolutionsMd.matchAll(solPattern)];
  const solutionsMap = {};

  for (let i = 0; i < solMatches.length; i++) {
    const qNum = parseInt(solMatches[i][1], 10);
    const ansKey = solMatches[i][2];
    const start = solMatches[i].index + solMatches[i][0].length;
    const end = i + 1 < solMatches.length ? solMatches[i + 1].index : allSolutionsMd.length;
    const solText = allSolutionsMd.slice(start, end).trim();

    let mappedAns = ansKey;
    if (ansKey === '1') mappedAns = 'A';
    else if (ansKey === '2') mappedAns = 'B';
    else if (ansKey === '3') mappedAns = 'C';
    else if (ansKey === '4') mappedAns = 'D';
    else mappedAns = ansKey ? ansKey.toUpperCase() : null;

    solutionsMap[qNum] = {
      text: solText,
      ansKey: mappedAns
    };
  }

  return solutionsMap;
}

export function extractQuestionCandidates(jobId, pages, allTopics = []) {
  const candidates = [];
  if (!pages || pages.length === 0) return candidates;

  // Step 1: Parse Answer Keys & Step-by-Step Solutions
  const answerKeyMap = parseAnswerKeyMap(pages);
  const solutionsMap = parseSolutionsMap(pages);

  // Step 2: Determine where question pages end (before Answer Key / Solutions)
  let questionPagesEnd = pages.findIndex(p => {
    const md = p.markdown || '';
    return md.includes('**ANSWERS**') || md.includes('# ANSWERS') || md.includes('## Hints & Solutions');
  });
  if (questionPagesEnd === -1) questionPagesEnd = pages.length;

  // Step 3: Join question pages into continuous stream
  let fullQuestionsText = '';
  const pageOffsets = []; // { startOffset, pageNumber }
  for (let i = 0; i < questionPagesEnd; i++) {
    if (!pages[i].success || !pages[i].markdown) continue;
    const cleaned = cleanRunningHeaders(pages[i].markdown);
    pageOffsets.push({ offset: fullQuestionsText.length, pageNumber: pages[i].page_number });
    fullQuestionsText += '\n\n' + cleaned;
  }

  // Step 4: Extract Questions using **Q.X** or Q.X
  const qPattern = /(?:^|\n)\s*(?:\*\*)?Q\.?\s*(\d{1,3})(?:\*\*)?\s+/gi;
  const qMatches = [...fullQuestionsText.matchAll(qPattern)];

  // Helper to find page number from string offset
  const getPageNum = (offset) => {
    for (let i = pageOffsets.length - 1; i >= 0; i--) {
      if (offset >= pageOffsets[i].offset) return pageOffsets[i].pageNumber;
    }
    return 1;
  };

  for (let i = 0; i < qMatches.length; i++) {
    const qNum = parseInt(qMatches[i][1], 10);
    const start = qMatches[i].index + qMatches[i][0].length;
    const end = i + 1 < qMatches.length ? qMatches[i + 1].index : fullQuestionsText.length;
    const rawText = fullQuestionsText.slice(start, end).trim();

    if (rawText.length < 15 || isInstructionBlock(rawText)) continue;

    const parsed = extractOptions(rawText);
    const answerKey = answerKeyMap[qNum] || solutionsMap[qNum]?.ansKey || 'A';
    const solutionText = solutionsMap[qNum]?.text || null;
    const classification = classifyQuestion(qNum, parsed.questionText || rawText, allTopics);
    const sourcePage = getPageNum(qMatches[i].index);

    const fingerprint = createHash('sha256')
      .update(`${jobId}:${sourcePage}:${qNum}:${rawText.slice(0, 100)}`)
      .digest('hex');

    candidates.push({
      candidate_key: fingerprint,
      job_id: jobId,
      source_pages: [sourcePage],
      source_question_number: qNum,
      subject: classification.subject,
      suggested_chapter: classification.chapter,
      suggested_topic: classification.topicName,
      suggested_topic_id: classification.topicId,
      raw_text: rawText,
      question_text: parsed.questionText || rawText,
      options: parsed.options,
      correct_answer: answerKey,
      solution_text: solutionText,
      has_options: parsed.hasOptions,
      has_solution: Boolean(solutionText),
      classification_confidence: classification.confidence,
      extraction_method: 'STREAM_MATCH_WITH_SOLUTIONS_V3',
      status: 'REVIEW_REQUIRED'
    });
  }

  // Fallback: If no **Q.X** headers matched, run individual page block parser
  if (candidates.length === 0) {
    const fallbackPattern = /(?:^|\n)\s*(?:##\s*)?(?:\*\*)?(?:Q(?:uestion)?\.?\s*(\d{1,3})|(\d{1,3}))\s*(?:\[\s*([1-4A-Da-d])\s*\]|\(\s*([1-4A-Da-d])\s*\))?\s*(?:\*\*)?\s*(?:\.|\)|:|\s*\*\*|\s*\])?\s*/gim;
    for (const page of pages) {
      if (!page.success || !page.markdown) continue;
      const matches = [...page.markdown.matchAll(fallbackPattern)];
      for (let index = 0; index < matches.length; index += 1) {
        const qNum = matches[index][1] || matches[index][2] ? Number(matches[index][1] || matches[index][2]) : index + 1;
        const ansKeyRaw = matches[index][3] || matches[index][4];
        const start = matches[index].index + matches[index][0].length;
        const end = index + 1 < matches.length ? matches[index + 1].index : page.markdown.length;
        const rawText = page.markdown.slice(start, end).trim();
        if (rawText.length < 15 || isInstructionBlock(rawText)) continue;

        const parsed = extractOptions(rawText);
        let correctAnswer = answerKeyMap[qNum] || solutionsMap[qNum]?.ansKey || 'A';
        if (ansKeyRaw) {
          if (ansKeyRaw === '1') correctAnswer = 'A';
          else if (ansKeyRaw === '2') correctAnswer = 'B';
          else if (ansKeyRaw === '3') correctAnswer = 'C';
          else if (ansKeyRaw === '4') correctAnswer = 'D';
          else correctAnswer = ansKeyRaw.toUpperCase();
        }

        const solutionText = solutionsMap[qNum]?.text || null;
        const classification = classifyQuestion(qNum, parsed.questionText || rawText, allTopics);
        const fingerprint = createHash('sha256').update(`${jobId}:${page.page_number}:${qNum}:${rawText.slice(0, 100)}`).digest('hex');

        candidates.push({
          candidate_key: fingerprint,
          job_id: jobId,
          source_pages: [page.page_number],
          source_question_number: qNum,
          subject: classification.subject,
          suggested_chapter: classification.chapter,
          suggested_topic: classification.topicName,
          suggested_topic_id: classification.topicId,
          raw_text: rawText,
          question_text: parsed.questionText || rawText,
          options: parsed.options,
          correct_answer: correctAnswer,
          solution_text: solutionText,
          has_options: parsed.hasOptions,
          has_solution: Boolean(solutionText),
          classification_confidence: classification.confidence,
          extraction_method: 'STRUCTURED_PAGE_FALLBACK_V3',
          status: 'REVIEW_REQUIRED'
        });
      }
    }
  }

  return candidates;
}
