import { createHash } from 'node:crypto';

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

/**
 * Extract Question Text and Options A, B, C, D from raw markdown question blocks.
 */
export function extractOptions(raw) {
  let text = (raw || '').trim();
  // Strip section headers like ## **PHYSICS** or ## **CHEMISTRY**
  text = text.replace(/^##\s*\*\*[A-Z\s]+\*\*\s*/im, '').trim();

  // Pattern 1: Look for (A) ... (B) ... (C) ... (D) or (1) ... (2) ... (3) ... (4) or [A] ... [B] ...
  const bracketRegex = /(?:^|\s|\n)(?:\(|\[)([A-Da-d1-4])(?:\)|\])\s+/g;
  let matches = [...text.matchAll(bracketRegex)];

  // Pattern 2: Fallback to A. B. C. D. on newlines
  if (matches.length < 4) {
    const newlineOptRegex = /(?:^|\n)\s*([A-Da-d1-4])(?:\.|\:)\s+/g;
    matches = [...text.matchAll(newlineOptRegex)];
  }

  // Look for the last matching 4-tuple ABCD or 1234
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

  return { questionText: text, options: { A: '', B: '', C: '', D: '' }, hasOptions: false };
}

// Robust pattern matching: **Q.1**, **Q. 1**, Q.1, Q1., Question 1, 1., ## **29.[2]**, etc.
const QUESTION_PATTERN = /(?:^|\n)\s*(?:##\s*)?(?:\*\*)?(?:Q(?:uestion)?\.?\s*(\d{1,3})|(\d{1,3}))\s*(?:\[\s*([1-4A-Da-d])\s*\]|\(\s*([1-4A-Da-d])\s*\))?\s*(?:\*\*)?\s*(?:\.|\)|:|\s*\*\*|\s*\])?\s*/gim;

export function extractQuestionCandidates(jobId, pages) {
  const candidates = [];

  for (const page of pages) {
    if (!page.success || !page.markdown) continue;

    const matches = [...page.markdown.matchAll(QUESTION_PATTERN)];

    for (let index = 0; index < matches.length; index += 1) {
      const qNum = matches[index][1] || matches[index][2] ? Number(matches[index][1] || matches[index][2]) : index + 1;
      const ansKeyRaw = matches[index][3] || matches[index][4];
      const start = matches[index].index + matches[index][0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : page.markdown.length;
      const rawText = page.markdown.slice(start, end).trim();

      if (rawText.length < 15) continue;
      if (isInstructionBlock(rawText)) continue;

      const parsed = extractOptions(rawText);

      let correctAnswer = null;
      if (ansKeyRaw) {
        if (ansKeyRaw === '1') correctAnswer = 'A';
        else if (ansKeyRaw === '2') correctAnswer = 'B';
        else if (ansKeyRaw === '3') correctAnswer = 'C';
        else if (ansKeyRaw === '4') correctAnswer = 'D';
        else correctAnswer = ansKeyRaw.toUpperCase();
      }

      const fingerprint = createHash('sha256').update(`${jobId}:${page.page_number}:${qNum}:${rawText}`).digest('hex');

      candidates.push({
        candidate_key: fingerprint,
        job_id: jobId,
        source_pages: [page.page_number],
        source_question_number: qNum,
        raw_text: rawText,
        question_text: parsed.questionText || rawText,
        options: parsed.options,
        correct_answer: correctAnswer,
        has_options: parsed.hasOptions,
        extraction_method: 'STRUCTURED_MARKDOWN_V2',
        status: 'REVIEW_REQUIRED'
      });
    }
  }

  return candidates;
}
