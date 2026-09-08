/**
 * Helper utilities for auto-parsing questions and options in Content Ops.
 */

export function extractOptionsFromText(rawText) {
  let text = (rawText || '').trim();

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
        let optD = text.slice(window[3].index + window[3][0].length).trim();
        const cutoffMatch = optD.match(/\n\s*(?:(?:\(|\[)[A-Da-d1-4](?:\)|\])|##\s*\*\*[A-Z\s]+\*\*|\*\*[A-Z\s]{4,}\*\*)\s+/);
        if (cutoffMatch) {
          optD = optD.slice(0, cutoffMatch.index).trim();
        }

        return {
          questionText: qText,
          options: [
            { id: 'A', text: optA },
            { id: 'B', text: optB },
            { id: 'C', text: optC },
            { id: 'D', text: optD }
          ],
          hasOptions: true
        };
      }
    }
  }

  return {
    questionText: text,
    options: [
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' }
    ],
    hasOptions: false
  };
}

export function detectAnswerKey(text) {
  if (!text) return null;
  // Match patterns like [2], (2), [B], (B), Ans. 2, Ans. B, Answer: (2), 29.[2]
  const match = text.match(/(?:Ans(?:\.|wer)?[:\s]*|^\s*\d+\s*\[|\(\s*)([1-4A-Da-d])(?:\]|\)|\b)/i);
  if (!match) return null;

  const key = match[1].toUpperCase();
  if (key === '1') return 'A';
  if (key === '2') return 'B';
  if (key === '3') return 'C';
  if (key === '4') return 'D';
  if (['A', 'B', 'C', 'D'].includes(key)) return key;
  return null;
}

export function isInstructionSnippet(text) {
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
 * Automatically clean, format math, and polish question stem or options text.
 */
export function autoFormatAndCleanMath(rawText) {
  if (!rawText) return '';
  let text = rawText.trim();

  // 1. Normalize arrows in chemical & physics equations
  text = text.replace(/-->|->/g, ' \\rightarrow ');
  text = text.replace(/<=>|<==>/g, ' \\rightleftharpoons ');

  // 2. Wrap standalone Greek letters or LaTeX symbols in $...$ if not already wrapped.
  // BUG 16 FIX: The old code used template literal `$$$1$$` which causes triple-dollar `$$$`
  // in some cases when $1 starts with $. Use a function replacement that builds the string safely.
  // Also fix the lookbehind — each | branch in (?<!$|\\) must be a separate assertion:
  //   (?<!\$)(?<!\\)(token)(?!\$)
  const isolatedLatexTokens = [
    '\\\\omega', '\\\\theta', '\\\\alpha', '\\\\beta', '\\\\gamma', '\\\\lambda',
    '\\\\mu', '\\\\pi', '\\\\rho', '\\\\sigma', '\\\\Delta', '\\\\Omega', '\\\\phi',
    '\\\\epsilon', '\\\\nu', '\\\\tau'
  ];

  for (const escapedToken of isolatedLatexTokens) {
    const re = new RegExp('(?<!\\$)(?<!\\\\)(' + escapedToken + ')(?!\\$)', 'g');
    text = text.replace(re, (match) => '$' + match + '$');
  }

  // 3. Fix any remaining double or triple dollars inside words or empty $$
  text = text.replace(/\$\$\$/g, '$$');
  text = text.replace(/\$\s*\$/g, '');

  // 4. Normalize scientific notation: e.g. 3 x 10^8 -> $3 \times 10^{8}$
  text = text.replace(/(\d+)\s*[xX]\s*10\^([-\d]+)/g, (_, coeff, exp) => '$' + coeff + ' \\times 10^{' + exp + '}$');

  // 5. Clean up redundant spaces around math delimiters
  text = text.replace(/\$\s+/g, ' $');
  text = text.replace(/\s+\$/g, '$ ');

  return text.trim();
}

/**
 * Polish an entire candidate question: splits options, cleans LaTeX, infers answer key.
 */
export function polishCandidateText(rawText) {
  const extracted = extractOptionsFromText(rawText);
  const cleanedStem = autoFormatAndCleanMath(extracted.questionText);
  const cleanedOptions = extracted.options.map(opt => ({
    ...opt,
    text: autoFormatAndCleanMath(opt.text)
  }));
  const detectedKey = detectAnswerKey(rawText);

  return {
    questionText: cleanedStem,
    options: cleanedOptions,
    correctAnswer: detectedKey,
    hasOptions: extracted.hasOptions
  };
}

