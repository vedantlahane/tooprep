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
    .replace(/(?:^|\n)\s*## \*\*Instructions\*\*[\s\S]*?(?=(?:## \*\*PHYSICS\*\*|## PHYSICS|#{1,4}\s*(?:\*\*)?Q\.1\b|\*\*Q\.1\*\*))/i, '');
}

/**
 * Normalizes fragmented OCR mathematical tokens across lines and stitches broken symbols.
 * e.g. "λ\n n" -> "\lambda_{n}", "n\n th" -> "n^{\text{th}}", "(\nA\n,\nB\n)" -> "(A, B)"
 */
export function cleanOcrMathArtifacts(text) {
  if (!text) return '';
  let s = String(text);

  // 1. Un-break Greek symbols or LaTeX tokens broken across newlines before subscripts
  s = s.replace(/(?:\\(lambda|Lambda|alpha|beta|gamma|delta|epsilon|theta|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega)|([λΛαβγδεθμτω]))\s*\n+\s*([a-zA-Z0-9]+)\b/g, (match, latexName, unicodeSym, sub) => {
    let base = latexName ? `\\${latexName}` : unicodeSym;
    if (base === 'λ') base = '\\lambda';
    else if (base === 'Λ') base = '\\Lambda';
    else if (base === 'α') base = '\\alpha';
    else if (base === 'β') base = '\\beta';
    else if (base === 'γ') base = '\\gamma';
    else if (base === 'θ') base = '\\theta';
    else if (base === 'μ') base = '\\mu';
    else if (base === 'ω') base = '\\omega';
    return `${base}_{${sub}}`;
  });

  // 2. Un-break ordinals: "n\n th" -> "n^{\text{th}}" or "n\nth"
  s = s.replace(/\b([a-zA-Z0-9]+)\s*\n+\s*(?:th|st|nd|rd)\b/gi, '$1^{\\text{th}}');

  // 3. Un-break powers after symbols: e.g. "\lambda_n\n 2" -> "\lambda_n^2"
  s = s.replace(/([a-zA-Z0-9_\{\}\\\^]+)\s*\n+\s*([2-9])\b/g, (match, base, pow) => {
    if (base.endsWith('^')) return `${base}{${pow}}`;
    return `${base}^${pow}`;
  });

  // 4. Remove duplicate symbol artifact echoes from OCR (e.g. "λ_n , λ_g λ_n , λ_g")
  s = s.replace(/([λΛa-zA-Z]_[a-zA-Z0-9]+(?:\s*,\s*[λΛa-zA-Z]_[a-zA-Z0-9]+)+)\s+\1/g, '$1');

  // 5. Clean multi-line constant lists: "(\nA\n,\nB\n)" -> "(A, B)"
  s = s.replace(/\(\s*\n+\s*([A-Za-z])\s*\n*,\s*\n*([A-Za-z])\s*\n*\)/g, '($1, $2)');

  return s;
}

/**
 * Sanitizes question text and options by:
 * - Normalizing OCR/LaTeX glued commands (^\circC -> ^\circ \text{C}, \muC -> \mu\text{C})
 * - Translating leaked HTML tags inside math (<u> -> \underline, <b> -> \mathbf)
 * - Stripping fake imgur links and pseudo-paths
 * - Stripping multi-column leakages and section headers
 * - Stitching broken OCR subscripts and math symbols
 */
export function sanitizeQuestionText(text) {
  if (!text) return '';
  let cleaned = cleanOcrMathArtifacts(String(text));

  // 1. Strip fake imgur links: <img src="https://i.imgur.com/..." ...> or ![...](https://i.imgur.com/...)
  cleaned = cleaned.replace(/<img\s+[^>]*src=["']https?:\/\/(?:i\.)?imgur\.com\/[^"']*["'][^>]*>/gi, '');
  cleaned = cleaned.replace(/!\[(.*?)\]\(https?:\/\/(?:i\.)?imgur\.com\/[^\)]*\)/gi, '');

  // 2. Strip pseudo img tags without valid URL: e.g. <img src="benzene ring..."> or <img src="reaction_structure"...>
  cleaned = cleaned.replace(/<img\s+[^>]*src=["'](?!(?:https?:\/\/|\/|data:image\/))([^"']+)["'][^>]*>/gi, (match, pseudoSrc) => {
    const altMatch = match.match(/alt=["']([^"']+)["']/i);
    const desc = altMatch ? altMatch[1] : pseudoSrc;
    return `*[Diagram: ${desc.trim()}]*`;
  });

  // 3. Normalize LaTeX glued units and symbols from OCR
  cleaned = cleaned.replace(/\\circ([A-Za-z])/g, '\\circ \\text{$1}');
  cleaned = cleaned.replace(/°([A-Za-z])/g, '^\\circ \\text{$1}');
  cleaned = cleaned.replace(/\^o([A-Za-z])/g, '^\\circ \\text{$1}');

  // 4. Translate HTML tags leaked into or around LaTeX
  cleaned = cleaned.replace(/\\?<u>(.*?)<\/u>/gi, '\\underline{$1}');
  cleaned = cleaned.replace(/\\?<b>(.*?)<\/b>/gi, '\\mathbf{$1}');
  cleaned = cleaned.replace(/\\?<strong>(.*?)<\/strong>/gi, '\\mathbf{$1}');
  cleaned = cleaned.replace(/\\?<i>(.*?)<\/i>/gi, '\\mathit{$1}');
  cleaned = cleaned.replace(/\\?<em>(.*?)<\/em>/gi, '\\mathit{$1}');

  // 5. Normalize micro units
  cleaned = cleaned.replace(/\\mu([A-Z]|m|s|g|mol)\b/g, '\\mu\\text{$1}');

  // 6. Normalize Greek subscripts
  cleaned = cleaned.replace(/\\(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega)([0-9]+)\b/g, '\\$1_{$2}');
  cleaned = cleaned.replace(/\\(alpha|beta|gamma|theta|lambda|omega|phi|psi)(max|min|avg|net|eff|in|out|ext|int)\b/g, '\\$1_{\\text{$2}}');

  // 7. Strip section headers at the end of option or question text
  cleaned = cleaned.replace(/\n\s*\*\*CHEMISTRY\*\*\s*$/i, '');
  cleaned = cleaned.replace(/\n\s*\*\*PHYSICS\*\*\s*$/i, '');
  cleaned = cleaned.replace(/\n\s*\*\*MATHEMATICS\*\*\s*$/i, '');

  return cleaned.trim();
}

// BUG 4 FIX: Use .exec() on a single match (no /g flag needed on outer) and matchAll on inner patterns
export function parseTableOptions(text) {
  // Use .exec() for the outer table match (non-global regex, one match only)
  const tableRegex = /<table>[\s\S]*?<\/table>/i;
  const outerMatch = tableRegex.exec(text || '');
  if (!outerMatch) return null;

  const tableHtml = outerMatch[0];
  const optMap = {};

  // Pattern A: <tr><th>(A)</th><td>...</td></tr>  — must use /g flag for matchAll
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

// BUG 3 FIX: Rewritten to correctly slice option text using match indices without losing first character
export function extractOptions(raw) {
  let text = (raw || '').trim();

  // Strip section headers like ## **PHYSICS** or ## **CHEMISTRY**
  text = text.replace(/^##\s*\*\*[A-Z\s]+\*\*\s*/im, '').trim();

  // Try HTML table options first
  const tableOpts = parseTableOptions(text);
  if (tableOpts) {
    return {
      questionText: sanitizeQuestionText(tableOpts.questionText),
      options: {
        A: sanitizeQuestionText(tableOpts.options.A),
        B: sanitizeQuestionText(tableOpts.options.B),
        C: sanitizeQuestionText(tableOpts.options.C),
        D: sanitizeQuestionText(tableOpts.options.D)
      },
      hasOptions: true
    };
  }

  // BUG 3 FIX: The key regex now captures the FULL token including leading whitespace correctly.
  // We search for the option label then record where the option CONTENT starts (after the label token).
  function findOptionPositions(src, labelRegex) {
    const positions = [];
    let m;
    while ((m = labelRegex.exec(src)) !== null) {
      const key = m[1].toUpperCase() === '1' ? 'A'
        : m[1].toUpperCase() === '2' ? 'B'
        : m[1].toUpperCase() === '3' ? 'C'
        : m[1].toUpperCase() === '4' ? 'D'
        : m[1].toUpperCase();
      // contentStart: index immediately after the full matched token
      positions.push({ key, matchStart: m.index, contentStart: m.index + m[0].length });
    }
    return positions;
  }

  function sliceOptions(src, positions) {
    if (positions.length < 4) return null;
    // Find the first consecutive ABCD or 1234 window
    for (let i = 0; i <= positions.length - 4; i++) {
      const w = positions.slice(i, i + 4);
      const keys = w.map(p => p.key);
      if (keys.join('') !== 'ABCD') continue;

      const qText = src.slice(0, w[0].matchStart).trim();
      const optA = src.slice(w[0].contentStart, w[1].matchStart).trim();
      const optB = src.slice(w[1].contentStart, w[2].matchStart).trim();
      const optC = src.slice(w[2].contentStart, w[3].matchStart).trim();
      let optD = src.slice(w[3].contentStart).trim();

      // Cut option D at:
      // 1. Start of next question (Q.N)
      // 2. Next section header
      // 3. Coaching footnotes (> Students may find similar question..., [JEE Main, Chapter...])
      // 4. Inline answer key (Ans. [1], Answer: A, **Ans.**)
      // 5. Inline solution (Sol., Solution:, **Sol.**)
      const cutoffRegexes = [
        /\n\s*(?:#{1,4}\s*)?(?:\*\*)?Q\.?\s*\d{1,3}(?:\*\*)?\s*(?:\n|$)/i,
        /\n\s*(?:(?:\(|\[)[A-Da-d1-4](?:\)|\])|##\s*\*\*[A-Z\s]+\*\*|\*\*(?:PHYSICS|CHEMISTRY|MATHEMATICS)\*\*)\s*\n/i,
        /\n\s*(?:[>\*#\s]*)(?:Students may find similar|\[?JEE\s*(?:Main|Advance)|Chapter\s*:|Exercise\s*#)/i,
        /\n\s*(?:[>\*#\s]*)(?:Ans(?:\.|wer)?[:\s]*[\(\[]?[1-4A-Da-d]|\*\*Ans\b)/i,
        /\n\s*(?:[>\*#\s]*)(?:Sol(?:\.|ution)?[:\s]|\*\*Sol\b)/i
      ];

      let cutoff = -1;
      for (const re of cutoffRegexes) {
        const pos = optD.search(re);
        if (pos !== -1 && (cutoff === -1 || pos < cutoff)) {
          cutoff = pos;
        }
      }

      let inlineAnswerKey = null;
      let inlineSolutionText = null;
      let inlineChapter = null;

      if (cutoff !== -1) {
        const tail = optD.slice(cutoff);
        optD = optD.slice(0, cutoff).trim();

        // Extract inline answer key from tail: e.g. Ans. [1] or **Ans. [2]** or Answer: (A)
        const ansMatch = tail.match(/(?:Ans(?:\.|wer)?[:\s]*|^\s*\d+\s*\[|\(\s*)[\(\[]?\s*([1-4A-Da-d])\s*[\)\]]?(?:\*\*)?/i);
        if (ansMatch) {
          let rawKey = ansMatch[1].toUpperCase();
          if (rawKey === '1') inlineAnswerKey = 'A';
          else if (rawKey === '2') inlineAnswerKey = 'B';
          else if (rawKey === '3') inlineAnswerKey = 'C';
          else if (rawKey === '4') inlineAnswerKey = 'D';
          else if (['A', 'B', 'C', 'D'].includes(rawKey)) inlineAnswerKey = rawKey;
        }

        // Extract inline solution from tail: e.g. **Sol.** $m_1g = ...$
        const solMatch = tail.match(/(?:(?:\*\*)?Sol(?:\.|ution)?[:\.\s]+(?:\*\*)?)([\s\S]*)/i);
        if (solMatch) {
          inlineSolutionText = solMatch[1].trim();
        }

        // Extract inline chapter from tail if coaching sheet mentioned it
        const chMatch = tail.match(/Chapter\s*:\s*([^,\n\]]+)/i);
        if (chMatch) {
          inlineChapter = chMatch[1].trim();
        }
      }

      return {
        questionText: sanitizeQuestionText(qText),
        options: {
          A: sanitizeQuestionText(optA),
          B: sanitizeQuestionText(optB),
          C: sanitizeQuestionText(optC),
          D: sanitizeQuestionText(optD)
        },
        inlineAnswerKey,
        inlineSolutionText,
        inlineChapter,
        hasOptions: true
      };
    }
    return null;
  }

  // Strategy 1: Bracketed options (A) or [A] or (1)
  const bracketRegex = /(?:^|(?<=\n)|(?<=\s))(?:\(|\[)([A-Da-d1-4])(?:\)|\])\s+/g;
  const bracketPositions = findOptionPositions(text, bracketRegex);
  const bracketResult = sliceOptions(text, bracketPositions);
  if (bracketResult) return bracketResult;

  // Strategy 2: Newline-prefixed A. B. C. D.
  const newlineOptRegex = /(?:^|\n)\s*([A-Da-d1-4])(?:\.|:)\s+/g;
  const newlinePositions = findOptionPositions(text, newlineOptRegex);
  const newlineResult = sliceOptions(text, newlinePositions);
  if (newlineResult) return newlineResult;

  return {
    questionText: sanitizeQuestionText(text),
    options: { A: '', B: '', C: '', D: '' },
    hasOptions: false
  };
}

// BUG 1 FIX: Corrected regex - was /(?:\*\*|\b)(\d{1,3})\s*(?:\.\*\*|\.|\\))\s*\(([1-4A-Da-d,\s]+)\)/g
// The old pattern had unbalanced parens and wrong escape. Now handles: "1. (A)", "1.[A]", "**1**.(A)", "1 (A)"
export function parseAnswerKeyMap(pages) {
  const answerKeyMap = {};
  for (const page of pages) {
    const md = page.markdown || '';
    if (md.includes('**ANSWERS**') || md.includes('# ANSWERS') || md.includes('## ANSWERS')) {
      // Match patterns like: 1. (A), 1. [A], 1.(A), **1**. (A), 1 (A), 1.[2]
      const ansPattern = /(?:\*\*)?(\d{1,3})(?:\*\*)?\s*\.?\s*[\(\[]([1-4A-Da-d])[\)\]]/g;
      for (const m of md.matchAll(ansPattern)) {
        const qNum = parseInt(m[1], 10);
        let rawAns = m[2].trim().toUpperCase();
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

export function extractQuestionCandidates(jobId, pages, allTopics = [], diagramMap = {}) {
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

  // Step 4: Extract Questions using **Q.X**, ### **Q.X**, or Q.X
  const qPattern = /(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*\*)?Q\.?\s*(\d{1,3})(?:\*\*)?\s*/gi;
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
    const answerKey = parsed.inlineAnswerKey || answerKeyMap[qNum] || solutionsMap[qNum]?.ansKey || 'A';
    const solutionText = parsed.inlineSolutionText || solutionsMap[qNum]?.text || null;
    const fullClassificationText = `${parsed.questionText || rawText} ${Object.values(parsed.options || {}).join(' ')} ${parsed.inlineChapter || ''}`;
    const classification = classifyQuestion(qNum, fullClassificationText, allTopics);
    const suggestedChapter = parsed.inlineChapter || classification.chapter;
    const sourcePage = getPageNum(qMatches[i].index);

    // BUG 5 FIX: Added `*[Diagram:` check (generated by sanitizeQuestionText from pseudo <img> tags)
    const hasDiagram = Boolean(
      rawText.includes('imgur') ||
      rawText.includes('<img') ||
      rawText.includes('![') ||
      rawText.includes('*[Diagram:') ||
      /\b(?:figure|circuit|diagram|titration plot|reactions are respectively)\b/i.test(rawText)
    );

    const fingerprint = createHash('sha256')
      .update(`${jobId}:${sourcePage}:${qNum}:${rawText.slice(0, 100)}`)
      .digest('hex');

    candidates.push({
      candidate_key: fingerprint,
      job_id: jobId,
      source_pages: [sourcePage],
      source_question_number: qNum,
      subject: classification.subject,
      suggested_chapter: suggestedChapter,
      suggested_topic: classification.topicName,
      suggested_topic_id: classification.topicId,
      raw_text: rawText,
      question_text: parsed.questionText || sanitizeQuestionText(rawText),
      options: parsed.options,
      correct_answer: answerKey,
      solution_text: solutionText ? sanitizeQuestionText(solutionText) : null,
      has_options: parsed.hasOptions,
      has_solution: Boolean(solutionText),
      has_diagram: hasDiagram,
      classification_confidence: classification.confidence,
      extraction_method: 'STREAM_MATCH_WITH_SOLUTIONS_V4',
      status: 'REVIEW_REQUIRED'
    });
  }

  // Fallback: If no **Q.X** headers matched, run individual page block parser
  if (candidates.length === 0) {
    // BUG FIX: The original regex had \\) inside (?:...) which closes the group prematurely.
    // Replaced with a simple character class [.):,\\*\]]? for trailing punctuation.
    const fallbackPattern = /(?:^|\n)\s*(?:##\s*)?(?:\*\*)?(?:Q(?:uestion)?\.?\s*(\d{1,3})|(\d{1,3}))\s*(?:\[\s*([1-4A-Da-d])\s*\]|\(\s*([1-4A-Da-d])\s*\))?\s*(?:\*\*)?\s*[.):,\]\\*]?\s*/gim;
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
        let correctAnswer = parsed.inlineAnswerKey || answerKeyMap[qNum] || solutionsMap[qNum]?.ansKey || 'A';
        if (ansKeyRaw) {
          if (ansKeyRaw === '1') correctAnswer = 'A';
          else if (ansKeyRaw === '2') correctAnswer = 'B';
          else if (ansKeyRaw === '3') correctAnswer = 'C';
          else if (ansKeyRaw === '4') correctAnswer = 'D';
          else correctAnswer = ansKeyRaw.toUpperCase();
        }

        const solutionText = parsed.inlineSolutionText || solutionsMap[qNum]?.text || null;
        const classification = classifyQuestion(qNum, `${parsed.questionText || rawText} ${parsed.inlineChapter || ''}`, allTopics);
        const suggestedChapter = parsed.inlineChapter || classification.chapter;

        const hasDiagram = Boolean(
          rawText.includes('imgur') ||
          rawText.includes('<img') ||
          rawText.includes('![') ||
          rawText.includes('*[Diagram:') ||
          /\b(?:figure|circuit|diagram|titration plot|reactions are respectively)\b/i.test(rawText)
        );
        const fingerprint = createHash('sha256').update(`${jobId}:${page.page_number}:${qNum}:${rawText.slice(0, 100)}`).digest('hex');

        candidates.push({
          candidate_key: fingerprint,
          job_id: jobId,
          source_pages: [page.page_number],
          source_question_number: qNum,
          subject: classification.subject,
          suggested_chapter: suggestedChapter,
          suggested_topic: classification.topicName,
          suggested_topic_id: classification.topicId,
          raw_text: rawText,
          question_text: parsed.questionText || sanitizeQuestionText(rawText),
          options: parsed.options,
          correct_answer: correctAnswer,
          solution_text: solutionText ? sanitizeQuestionText(solutionText) : null,
          has_options: parsed.hasOptions,
          has_solution: Boolean(solutionText),
          has_diagram: hasDiagram,
          classification_confidence: classification.confidence,
          extraction_method: 'STRUCTURED_PAGE_FALLBACK_V4',
          status: 'REVIEW_REQUIRED'
        });
      }
    }
  }

  // Step 5: Automatically link extracted diagrams and chemical structures
  if (diagramMap && typeof diagramMap === 'object' && Object.keys(diagramMap).length > 0) {
    for (const c of candidates) {
      const qNum = c.source_question_number;
      const diag = diagramMap[qNum];
      if (!diag) continue;

      // 1. Inject Stem Diagram
      if (diag.stem) {
        c.has_diagram = true;
        c.question_text = (c.question_text || '')
          .replace(/\*\[Diagram:[^\]]*\]\*/gi, '')
          .trim();
        if (!c.question_text.includes(diag.stem)) {
          c.question_text = `${c.question_text}\n\n![Figure](${diag.stem})`;
        }
      }

      // 2. Inject Option Diagrams
      if (diag.options && typeof diag.options === 'object') {
        c.options = c.options || {};
        for (const [optKey, optUrl] of Object.entries(diag.options)) {
          if (!optUrl) continue;
          c.has_diagram = true;
          const currentText = (c.options[optKey] || '').trim();
          if (currentText && !currentText.includes(optUrl)) {
            c.options[optKey] = `${currentText}\n\n![Option ${optKey}](${optUrl})`;
          } else if (!currentText) {
            c.options[optKey] = `![Option ${optKey}](${optUrl})`;
          }
        }
      }
    }
  }

  return candidates;
}
