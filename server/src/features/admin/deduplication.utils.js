/***
 * Question Deduplication — Utility & Similarity Functions
 *
 * Feature domain : Automated Question Bank Quality & Deduplication
 * Architecture   : Pure utility module (stateless mathematical comparison)
 *
 * Implements high-precision math & text normalization, character 3-gram
 * Dice coefficient similarity, order-independent option set matching,
 * and boilerplate stem penalization to accurately detect duplicates
 * while eliminating false positives.
 ***/

/**
 * Normalizes LaTeX math, markdown, and text for invariant comparison.
 *
 * @param {string} text - Raw question text or option string.
 * @returns {string} Cleaned, standardized alphanumeric token string.
 */
export function cleanMathAndText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .toLowerCase()
    // Strip markdown images: ![alt](url)
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Strip markdown links: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Normalize LaTeX formatting commands: \text{foo} -> foo
    .replace(/\\(?:text|mathrm|mathbf|mathit|textbf|textit|mathbb)\{([^}]+)\}/g, '$1')
    .replace(/\\(?:displaystyle|quad|qquad|left|right|,|;|!)/g, ' ')
    // Normalize unicode math symbols to ASCII equivalents
    .replace(/[\u2212\u2013\u2014]/g, '-') // minus, en-dash, em-dash
    .replace(/[\u00D7\u22C5]/g, '*')      // times, dot
    .replace(/[\u00F7]/g, '/')            // divide
    .replace(/[\u2192\u27F6]/g, '->')     // right arrow
    .replace(/[\u2264\u2265]/g, ' ')      // <=, >=
    .replace(/[\u03C0]/g, 'pi')           // pi
    // Strip math delimiters and formatting symbols
    .replace(/[\$\{\}\\\_\^\(\)\[\]]/g, ' ')
    // Normalize punctuation: keep standard operators -, +, *, >
    .replace(/[^a-z0-9\-\+\*>]/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a frequency map of character 3-grams (tri-grams) for a string.
 *
 * @param {string} str - Cleaned input string.
 * @returns {Map<string, number>} Trigram frequency map.
 */
export function getCharacterTrigrams(str) {
  const trigrams = new Map();
  if (str.length < 3) {
    trigrams.set(str, 1);
    return trigrams;
  }
  for (let i = 0; i <= str.length - 3; i++) {
    const gram = str.slice(i, i + 3);
    trigrams.set(gram, (trigrams.get(gram) || 0) + 1);
  }
  return trigrams;
}

/**
 * Calculates Dice's coefficient over character 3-grams.
 * Formula: 2 * |A ∩ B| / (|A| + |B|)
 *
 * Resistant to word order changes, spacing variations, and minor OCR typos.
 *
 * @param {string} str1 - First normalized string.
 * @param {string} str2 - Second normalized string.
 * @returns {number} Similarity score between 0.0 and 1.0.
 */
export function diceCoefficient(str1, str2) {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;
  if (str1.length < 2 || str2.length < 2) return str1 === str2 ? 1.0 : 0.0;

  const tri1 = getCharacterTrigrams(str1);
  const tri2 = getCharacterTrigrams(str2);

  let intersection = 0;
  let total1 = 0;
  let total2 = 0;

  for (const count of tri1.values()) total1 += count;
  for (const count of tri2.values()) total2 += count;

  for (const [gram, count1] of tri1.entries()) {
    if (tri2.has(gram)) {
      intersection += Math.min(count1, tri2.get(gram));
    }
  }

  return (2.0 * intersection) / (total1 + total2);
}

/**
 * Evaluates match ratio between two sets of multiple-choice options.
 * Order-independent: matches choices regardless of option permutations (A, B, C, D).
 *
 * @param {Array} opts1 - Options array from Question 1.
 * @param {Array} opts2 - Options array from Question 2.
 * @returns {number} Option match score between 0.0 and 1.0.
 */
export function evaluateOptionsMatch(opts1, opts2) {
  if (!opts1 || !opts2 || !Array.isArray(opts1) || !Array.isArray(opts2)) return 0;
  if (opts1.length === 0 && opts2.length === 0) return 1.0;
  if (opts1.length === 0 || opts2.length === 0) return 0;

  const o1 = opts1.map(o => cleanMathAndText(typeof o === 'string' ? o : o.text)).filter(Boolean);
  const o2 = opts2.map(o => cleanMathAndText(typeof o === 'string' ? o : o.text)).filter(Boolean);
  if (o1.length === 0 || o2.length === 0) return 0;

  let matched = 0;
  const matchedO2Indices = new Set();

  for (const a of o1) {
    let foundIndex = -1;
    for (let idx = 0; idx < o2.length; idx++) {
      if (matchedO2Indices.has(idx)) continue;
      const b = o2[idx];
      if (a === b || diceCoefficient(a, b) >= 0.85) {
        foundIndex = idx;
        break;
      }
    }
    if (foundIndex !== -1) {
      matched++;
      matchedO2Indices.add(foundIndex);
    }
  }

  return matched / Math.max(o1.length, o2.length);
}

/**
 * Identifies whether a question stem consists primarily of common JEE boilerplate.
 *
 * @param {string} cleanedStem - Cleaned stem text.
 * @returns {boolean} True if stem is largely boilerplate.
 */
export function isBoilerplateStem(cleanedStem) {
  if (!cleanedStem || cleanedStem.length < 35) return true;

  const boilerplatePrefixes = [
    'the major product of the following reaction is',
    'the major product formed in the following reaction is',
    'which of the following statements is correct',
    'which of the following is correct',
    'which of the following is incorrect',
    'consider the following statements',
    'match list i with list ii',
    'identify the correct statement',
    'in the following reaction sequence'
  ];

  return boilerplatePrefixes.some(prefix => cleanedStem.startsWith(prefix) && cleanedStem.length - prefix.length < 40);
}

/**
 * Computes composite similarity score between two questions.
 *
 * Returns match classification:
 *   - 'EXACT': >= 0.98 composite or 100% normalized stem match with matching options
 *   - 'HIGH_CONFIDENCE': >= 0.88 composite (near-match with minor formatting/OCR variations)
 *   - 'POTENTIAL': >= 0.78 composite (high resemblance warranting admin review)
 *   - null: not a duplicate
 *
 * @param {Object} q1 - First question.
 * @param {Object} q2 - Second question.
 * @returns {Object} Evaluation summary.
 */
export function computeCompositeSimilarity(q1, q2) {
  if (!q1 || !q2 || q1.id === q2.id) {
    return { matchType: null, score: 0, stemSimilarity: 0, optionsSimilarity: 0 };
  }

  const c1 = cleanMathAndText(q1.question_text);
  const c2 = cleanMathAndText(q2.question_text);

  if (!c1 || !c2) {
    return { matchType: null, score: 0, stemSimilarity: 0, optionsSimilarity: 0 };
  }

  // Exact stem equality
  const isExactStem = c1 === c2;
  const stemDice = isExactStem ? 1.0 : diceCoefficient(c1, c2);

  // Quick exit if stem similarity is low
  if (stemDice < 0.75) {
    return {
      matchType: null,
      score: Math.round(stemDice * 100),
      stemSimilarity: Math.round(stemDice * 100),
      optionsSimilarity: 0
    };
  }

  const optMatch = evaluateOptionsMatch(q1.options, q2.options);

  // Guard against boilerplate false positives
  const hasBoilerplate = isBoilerplateStem(c1) || isBoilerplateStem(c2);
  if (hasBoilerplate && optMatch < 0.50) {
    return {
      matchType: null,
      score: Math.round(stemDice * 40),
      stemSimilarity: Math.round(stemDice * 100),
      optionsSimilarity: Math.round(optMatch * 100),
      reason: 'Rejected due to boilerplate stem with non-matching options'
    };
  }

  // Weighted composite score: 60% stem + 40% options
  let compositeScore = (stemDice * 0.6) + (optMatch * 0.4);

  // Boost if exact stem with options matching
  if (isExactStem && (optMatch >= 0.75 || (!q1.options?.length && !q2.options?.length))) {
    compositeScore = 1.0;
  }

  // Boost if both stem and options are very high
  if (stemDice >= 0.95 && optMatch >= 0.90) {
    compositeScore = Math.max(compositeScore, 0.98);
  }

  const finalScore = Math.round(compositeScore * 100) / 100;
  const scorePercent = Math.round(finalScore * 100);

  let matchType = null;
  if (finalScore >= 0.98) {
    matchType = 'EXACT';
  } else if (finalScore >= 0.88 || (stemDice >= 0.92 && optMatch >= 0.60)) {
    matchType = 'HIGH_CONFIDENCE';
  } else if (finalScore >= 0.78 || (stemDice >= 0.85 && optMatch >= 0.50)) {
    matchType = 'POTENTIAL';
  }

  return {
    matchType,
    score: scorePercent,
    stemSimilarity: Math.round(stemDice * 100),
    optionsSimilarity: Math.round(optMatch * 100),
    isExact: matchType === 'EXACT'
  };
}
