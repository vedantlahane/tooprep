/**
 * Normalizes fragmented OCR mathematical tokens across lines and stitches broken symbols.
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

  // 2. Un-break ordinals: "n\n th" -> "n^{\text{th}}"
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

export function detectSolutionText(text) {
  if (!text) return null;
  const match = text.match(/(?:(?:\*\*|#)?\s*Sol(?:\.|ution)?[:\.\s]+(?:\*\*)?)([\s\S]*)/i);
  return match ? match[1].trim() : null;
}

export function extractOptionsFromText(rawText) {
  let text = cleanOcrMathArtifacts((rawText || '').trim());

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

        // Cut option D before next question, next section, coaching notes, answer key, or solution
        const cutoffRegexes = [
          /\n\s*(?:(?:\(|\[)[A-Da-d1-4](?:\)|\])|##\s*\*\*[A-Z\s]+\*\*|\*\*[A-Z\s]{4,}\*\*)\s+/,
          /\n\s*(?:[>\*#\s]*)(?:Students may find similar|\[?JEE\s*(?:Main|Advance)|Chapter\s*:|Exercise\s*#)/i,
          /\n\s*(?:[>\*#\s]*)(?:Ans(?:\.|wer)?[:\s]*[\(\[]?[1-4A-Da-d]|\*\*Ans\b)/i,
          /\n\s*(?:[>\*#\s]*)(?:Sol(?:\.|ution)?[:\s]|\*\*Sol\b)/i
        ];

        let cutoff = -1;
        for (const re of cutoffRegexes) {
          const match = optD.match(re);
          if (match && (cutoff === -1 || match.index < cutoff)) {
            cutoff = match.index;
          }
        }

        let inlineAns = null;
        let inlineSol = null;
        let inlineChapter = null;

        if (cutoff !== -1) {
          const tail = optD.slice(cutoff);
          optD = optD.slice(0, cutoff).trim();
          inlineAns = detectAnswerKey(tail);
          inlineSol = detectSolutionText(tail);
          const chMatch = tail.match(/Chapter\s*:\s*([^,\n\]]+)/i);
          if (chMatch) inlineChapter = chMatch[1].trim();
        }

        return {
          questionText: qText,
          options: [
            { id: 'A', text: optA },
            { id: 'B', text: optB },
            { id: 'C', text: optC },
            { id: 'D', text: optD }
          ],
          inlineAnswerKey: inlineAns,
          inlineSolutionText: inlineSol,
          inlineChapter,
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
  // Match patterns like: Ans. [1], Ans. (2), Ans. 2, Answer: (A), [2], (2), **Ans. [1]**
  const match = text.match(/(?:(?:\*\*|#)?\s*Ans(?:\.|wer)?[:\s]*[\(\[]?|^\s*\d+\s*\[|\(\s*)([1-4A-Da-d])(?:[\)\]]|\b)/i);
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
  let text = cleanOcrMathArtifacts(rawText.trim());

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

