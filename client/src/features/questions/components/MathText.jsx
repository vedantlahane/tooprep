import { useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem';

/**
 * Standard KaTeX macro definitions for chemistry, physics, and engineering notation.
 */
const KATEX_MACROS = {
  '\\celsius': '{^\\circ\\text{C}}',
  '\\celcius': '{^\\circ\\text{C}}',
  '\\degree': '{^\\circ}',
  '\\ohm': '\\Omega',
  '\\micro': '\\mu',
  '\\AA': '\\text{Å}',
  '\\angstrom': '\\text{Å}',
  '\\per': '/',
  '\\unit': '\\text',
};

/**
 * Normalizes and sanitizes LaTeX math strings prior to parsing:
 * 1. Strips or converts leaked HTML tags (<u>, <sub>, <sup>, <br>, etc.)
 * 2. Repairs glued units (e.g. \circC -> ^\circ \text{C}, \muC -> \mu\text{C})
 * 3. Repairs glued subscripts on Greek letters (\lambda1 -> \lambda_1, \thetamax -> \theta_{\text{max}})
 * 4. Escapes unescaped % signs
 * 5. Balances unclosed \left delimiters and curly braces
 */
export function normalizeLatexMath(raw) {
  if (!raw) return '';
  let s = String(raw).trim();

  // 1. Convert HTML tags inside math to LaTeX equivalents
  s = s.replace(/\\?<u>(.*?)<\/u>/gi, '\\underline{$1}');
  s = s.replace(/\\?<b>(.*?)<\/b>/gi, '\\mathbf{$1}');
  s = s.replace(/\\?<strong>(.*?)<\/strong>/gi, '\\mathbf{$1}');
  s = s.replace(/\\?<i>(.*?)<\/i>/gi, '\\mathit{$1}');
  s = s.replace(/\\?<em>(.*?)<\/em>/gi, '\\mathit{$1}');
  s = s.replace(/<sub\s*>(.*?)<\/sub>/gi, '_{$1}');
  s = s.replace(/<sup\s*>(.*?)<\/sup>/gi, '^{$1}');
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  s = s.replace(/<[^>]+>/g, '');

  // 2. Glued degree symbols and temperature units
  // ^\circC, \circC, °C -> ^\circ \text{C}
  s = s.replace(/\\circ([A-Za-z])/g, '\\circ \\text{$1}');
  s = s.replace(/°([A-Za-z])/g, '^\\circ \\text{$1}');
  s = s.replace(/°/g, '^\\circ ');
  s = s.replace(/\^o([A-Za-z])/g, '^\\circ \\text{$1}');

  // 3. Glued micro units: e.g. 5\mu C -> 5\mu\text{C}, \muF -> \mu\text{F}
  s = s.replace(/\\mu([A-Z]|m|s|g|mol)\b/g, '\\mu\\text{$1}');

  // 4. Glued subscripts & descriptors on Greek letters: \lambda1 -> \lambda_1, \thetamax -> \theta_{\text{max}}
  s = s.replace(/\\(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega)([0-9]+)\b/g, '\\$1_{$2}');
  s = s.replace(/\\(alpha|beta|gamma|theta|lambda|omega|phi|psi)(max|min|avg|net|eff|in|out|ext|int)\b/g, '\\$1_{\\text{$2}}');

  // 5. Unescaped % inside math (would comment out the rest of the formula)
  s = s.replace(/(?<!\\)%/g, '\\%');

  // 6. Balance delimiters: \left without \right
  const leftCount = (s.match(/\\left\b/g) || []).length;
  const rightCount = (s.match(/\\right\b/g) || []).length;
  if (leftCount > rightCount) {
    s += ' \\right.'.repeat(leftCount - rightCount);
  }

  // 7. Balance braces { ... }
  let openBraces = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{' && (i === 0 || s[i - 1] !== '\\')) openBraces++;
    else if (s[i] === '}' && (i === 0 || s[i - 1] !== '\\')) openBraces--;
  }
  if (openBraces > 0) s += '}'.repeat(openBraces);

  return s;
}

/**
 * Typographic fallback for formulas that KaTeX cannot parse even after repair.
 * Converts LaTeX symbols and exponents into clean, human-readable Unicode math.
 */
function toUnicodeMath(latex) {
  if (!latex) return '';
  let s = String(latex)
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\mp/g, '∓')
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\le(?:q)?/g, '≤')
    .replace(/\\ge(?:q)?/g, '≥')
    .replace(/\\infty/g, '∞')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\pi/g, 'π')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\Omega/g, 'Ω')
    .replace(/\\circ/g, '°')
    .replace(/\\degree/g, '°')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\underline\{([^}]+)\}/g, '$1')
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\quad/g, '  ')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '');

  // Exponents conversion: ^2 -> ², ^-1 -> ⁻¹
  const supMap = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' };
  s = s.replace(/\^([0-9\-+]+)/g, (_, exp) => exp.split('').map(c => supMap[c] || c).join(''));
  s = s.replace(/\^\{([0-9\-+]+)\}/g, (_, exp) => exp.split('').map(c => supMap[c] || c).join(''));

  // Subscripts conversion: _1 -> ₁, _0 -> ₀
  const subMap = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  s = s.replace(/_([0-9])/g, (_, sub) => subMap[sub] || sub);
  s = s.replace(/_\{([0-9]+)\}/g, (_, sub) => sub.split('').map(c => subMap[c] || c).join(''));

  return s.trim();
}

/**
 * Robust KaTeX renderer with multi-pass error recovery.
 * Pass 1: Normal render with custom macros
 * Pass 2: Automatic error remediation (undefined sequences, double superscripts/subscripts)
 * Pass 3: Clean typographic Unicode fallback (never raw red error dump)
 */
export function renderMathRobust(raw, displayMode = false) {
  let math = normalizeLatexMath(raw);

  // Pass 1: Standard KaTeX render
  try {
    return katex.renderToString(math, { displayMode, throwOnError: true, macros: KATEX_MACROS });
  } catch (e1) {
    // Pass 2: Intelligent Error Auto-Repair
    let repaired = math;

    // A. Undefined control sequences: \cmd -> \text{cmd}
    const undefMatches = [...repaired.matchAll(/Undefined control sequence: \\([a-zA-Z]+)/g)];
    const undefSingle = e1.message.match(/Undefined control sequence: \\([a-zA-Z]+)/);
    if (undefSingle) {
      const cmd = undefSingle[1];
      repaired = repaired.replace(new RegExp('\\\\' + cmd + '\\b', 'g'), '\\text{' + cmd + '}');
    }

    // B. Double superscripts: collapse into single group
    if (/Double superscript/.test(e1.message)) {
      repaired = repaired.replace(/(\^\{?[^\\^\\{\\}\s]+\}?)\s*(\^\{?[^\\^\\{\\}\s]+\}?)/g, (m, a, b) => {
        const c1 = a.replace(/^\^\{?|\}?$/g, '');
        const c2 = b.replace(/^\^\{?|\}?$/g, '');
        return '^{' + c1 + ' ' + c2 + '}';
      });
    }

    // C. Double subscripts: collapse into single group
    if (/Double subscript/.test(e1.message)) {
      repaired = repaired.replace(/(_\{?[^_\\{\\}\s]+\}?)\s*(_\{?[^_\\{\\}\s]+\}?)/g, (m, a, b) => {
        const c1 = a.replace(/^-\{?|\}?$/g, '');
        const c2 = b.replace(/^-\{?|\}?$/g, '');
        return '_{' + c1 + ' ' + c2 + '}';
      });
    }

    try {
      return katex.renderToString(repaired, { displayMode, throwOnError: true, macros: KATEX_MACROS });
    } catch (e2) {
      // Pass 3: Soft render or clean Unicode typography fallback
      try {
        const softHtml = katex.renderToString(repaired, { displayMode, throwOnError: false, macros: KATEX_MACROS });
        if (!softHtml.includes('katex-error')) {
          return softHtml;
        }
      } catch {}

      // Typographic fallback: readable Unicode math
      const readable = toUnicodeMath(raw);
      if (displayMode) {
        return `<div class="katex-display-wrapper font-serif italic text-on-surface my-2 text-center text-base tracking-wide">${readable}</div>`;
      }
      return `<span class="katex-math-fallback font-serif italic text-on-surface px-1 py-0.5 rounded bg-surface-container/40 inline-block text-sm tracking-wide">${readable}</span>`;
    }
  }
}

/**
 * Handles image rendering safely:
 * - Purges hallucinated imgur.com links (which return 404 graphics)
 * - Intercepts pseudo-paths (<img src="benzene ring...">)
 * - Renders valid URLs inside crisp, responsive cards with zoom preview and error fallback
 */
function transformImages(text) {
  if (!text) return '';

  // 1. Markdown images: ![alt](url)
  let result = String(text).replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
    return renderImageTag(src.trim(), alt.trim());
  });

  // 2. HTML images: <img ... src="..." ... />
  result = result.replace(/<img\s+([^>]*?)src=["']([^"']*)["']([^>]*?)\/?>/gi, (match, before, src, after) => {
    const altMatch = (before + ' ' + after).match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : '';
    return renderImageTag(src.trim(), alt.trim());
  });

  return result;
}

function renderImageTag(src, alt) {
  // Guard 1: Hallucinated imgur links
  if (/https?:\/\/(?:i\.)?imgur\.com\//i.test(src)) {
    return `
      <div class="my-2.5 p-3 border border-amber-500/40 bg-amber-500/10 rounded text-amber-300 flex items-center gap-2 text-xs font-mono">
        <span class="px-1.5 py-0.5 bg-amber-500/20 rounded font-bold uppercase tracking-wider text-[10px]">Diagram Required</span>
        <span>${alt ? `[${alt}]` : 'Visual structure from original paper'}</span>
      </div>
    `;
  }

  // Guard 2: Pseudo-paths from LLM OCR (e.g. "benzene ring with CH2CH2CH2Br attached")
  if (!/^(https?:\/\/|\/|data:image\/)/i.test(src)) {
    const desc = alt || src;
    return `
      <div class="my-2.5 p-2.5 border border-primary/40 bg-primary/10 rounded flex items-center gap-2 text-xs font-mono text-on-surface">
        <span class="px-1.5 py-0.5 bg-primary/20 text-primary rounded font-bold uppercase tracking-wider text-[10px]">Structure</span>
        <span class="text-on-surface font-medium">${desc}</span>
      </div>
    `;
  }

  // Guard 3: Valid Image URL
  const escapedSrc = src.replace(/"/g, '&quot;');
  const escapedAlt = (alt || 'Question Diagram').replace(/"/g, '&quot;');

  return `
    <div class="my-3 inline-block max-w-full">
      <div class="bg-white p-2.5 rounded border border-outline-variant shadow-sm inline-block">
        <img
          src="${escapedSrc}"
          alt="${escapedAlt}"
          class="max-h-72 max-w-full object-contain rounded cursor-pointer hover:opacity-95 transition-opacity select-none"
          loading="lazy"
          onerror="this.onerror=null; this.closest('.inline-block').innerHTML='<div class=\\'p-3 border border-error/30 bg-error/10 text-error text-xs font-mono rounded\\'>Image unavailable: ${escapedAlt}</div>';"
          onclick="window.__tooprep_open_image_zoom && window.__tooprep_open_image_zoom('${escapedSrc}', '${escapedAlt}')"
        />
      </div>
      ${alt ? `<div class="text-[11px] text-on-surface-variant font-mono mt-1 tracking-wide">${escapedAlt}</div>` : ''}
    </div>
  `;
}

/**
 * Transforms Markdown tables into responsive AMOLED/Metro styled tables.
 */
function transformMarkdownTables(text) {
  const tableBlockRegex = /(?:(?:^|\n)\s*\|[^\n]+\|\s*)+(?:\n|$)/g;
  return text.replace(tableBlockRegex, (match) => {
    const lines = match.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return match;

    const isDelimiter = /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[1]);
    if (!isDelimiter) return match;

    const parseRow = (line) => line.slice(1, -1).split('|').map(c => c.trim());
    const headerCells = parseRow(lines[0]);
    const bodyRows = lines.slice(2).map(parseRow);

    const thead = `<thead><tr class="border-b border-outline-variant bg-surface-container/60">${headerCells.map(c => `<th class="px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-primary">${c}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${bodyRows.map((row) => `<tr class="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors">${row.map(c => `<td class="px-3.5 py-2 text-sm">${c}</td>`).join('')}</tr>`).join('')}</tbody>`;

    return `\n<div class="overflow-x-auto my-3 rounded border border-outline-variant shadow-sm max-w-full"><table class="w-full text-left border-collapse">${thead}${tbody}</table></div>\n`;
  });
}

/**
 * Transforms Markdown lists (- item or 1. item) into styled HTML lists.
 */
function transformMarkdownLists(text) {
  let s = text;
  // Unordered lists
  s = s.replace(/(?:(?:^|\n)\s*[-*]\s+[^\n]+)+/g, (match) => {
    const items = match.trim().split('\n').map(line => {
      const content = line.replace(/^\s*[-*]\s+/, '').trim();
      return `<li class="my-0.5 ml-4 list-disc">${content}</li>`;
    });
    return `\n<ul class="my-2 space-y-1">${items.join('')}</ul>\n`;
  });

  // Ordered lists
  s = s.replace(/(?:(?:^|\n)\s*\d+\.\s+[^\n]+)+/g, (match) => {
    const items = match.trim().split('\n').map(line => {
      const content = line.replace(/^\s*\d+\.\s+/, '').trim();
      return `<li class="my-0.5 ml-4 list-decimal">${content}</li>`;
    });
    return `\n<ol class="my-2 space-y-1">${items.join('')}</ol>\n`;
  });

  return s;
}

/**
 * Parses LaTeX equations ($...$, $$...$$, \(...\), \[...\]), light markdown (tables, lists, bold, italic),
 * and question images into safe, high-performance HTML rendered with KaTeX.
 */
export function renderLatex(text) {
  if (!text) return '';

  const mathPlaceholders = [];
  const placeholderPrefix = '@@@KATEX_PH_';

  let processed = String(text);

  // 1. Display math $$...$$
  processed = processed.replace(/\$\$(.*?)\$\$/gs, (_, math) => {
    const id = `${placeholderPrefix}${mathPlaceholders.length}@@@`;
    const html = `<div class="katex-display-wrapper my-2.5 overflow-x-auto">${renderMathRobust(math, true)}</div>`;
    mathPlaceholders.push({ id, html });
    return id;
  });

  // 2. Display math \[...\]
  processed = processed.replace(/\\\[(.*?)\\\]/gs, (_, math) => {
    const id = `${placeholderPrefix}${mathPlaceholders.length}@@@`;
    const html = `<div class="katex-display-wrapper my-2.5 overflow-x-auto">${renderMathRobust(math, true)}</div>`;
    mathPlaceholders.push({ id, html });
    return id;
  });

  // 3. Inline math $...$
  processed = processed.replace(/\$(.*?)\$/g, (_, math) => {
    const id = `${placeholderPrefix}${mathPlaceholders.length}@@@`;
    const html = renderMathRobust(math, false);
    mathPlaceholders.push({ id, html });
    return id;
  });

  // 4. Inline math \(...\)
  processed = processed.replace(/\\\((.*?)\\\)/g, (_, math) => {
    const id = `${placeholderPrefix}${mathPlaceholders.length}@@@`;
    const html = renderMathRobust(math, false);
    mathPlaceholders.push({ id, html });
    return id;
  });

  // 5. Prose Auto-Math Fallback:
  // If no math delimiters exist, but the snippet contains explicit LaTeX math commands
  // (e.g. "\frac{1}{2}", "1 \times 10^{-4} \, ^\circ C^{-1}", "\sqrt{2gh}", "\alpha = 2 \times 10^{-4}")
  if (mathPlaceholders.length === 0 && /\\[a-zA-Z]+|\^\{?[0-9\-+]|\_\{?[0-9]/.test(processed)) {
    // If the entire text is an equation snippet
    const testMath = renderMathRobust(processed, false);
    if (!testMath.includes('katex-error') && !testMath.includes('math-fallback')) {
      return testMath;
    }
  }

  // 6. Transform images & diagrams
  processed = transformImages(processed);

  // 7. Markdown Tables & Lists
  processed = transformMarkdownTables(processed);
  processed = transformMarkdownLists(processed);

  // 8. Markdown typography & formatting on prose outside math
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  processed = processed.replace(/~~(.*?)~~/g, '<del class="opacity-60">$1</del>');
  processed = processed.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface-container font-mono text-xs text-primary">$1</code>');
  processed = processed.replace(/\n\n+/g, '<br /><br />').replace(/\n/g, '<br />');

  // 9. Restore KaTeX math placeholders
  for (const item of mathPlaceholders) {
    processed = processed.replace(item.id, item.html);
  }

  return processed;
}

export default function MathText({ text, className = '' }) {
  const [zoomImg, setZoomImg] = useState(null);

  const html = useMemo(() => {
    if (typeof window !== 'undefined') {
      window.__tooprep_open_image_zoom = (src, alt) => {
        setZoomImg({ src, alt });
      };
    }
    return renderLatex(text);
  }, [text]);

  return (
    <>
      <span
        className={`math-rendered-content leading-relaxed inline-block max-w-full overflow-x-auto align-baseline break-words ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Diagram Zoom Modal */}
      {zoomImg && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomImg(null)}
        >
          <div
            className="bg-surface-dim border border-outline-variant p-4 rounded-md max-w-4xl w-[95vw] max-h-[90vh] flex flex-col items-center overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center w-full pb-3 border-b border-outline-variant">
              <span className="text-label-sm-mono uppercase tracking-widest text-primary font-bold">
                {zoomImg.alt || 'Question Diagram'}
              </span>
              <button
                onClick={() => setZoomImg(null)}
                className="text-on-surface-variant hover:text-on-surface font-mono text-sm px-2 py-1"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4 bg-white rounded my-3 overflow-auto max-h-[70vh] flex items-center justify-center">
              <img
                src={zoomImg.src}
                alt={zoomImg.alt}
                className="max-h-[65vh] max-w-full object-contain"
              />
            </div>
            <span className="text-xs text-on-surface-variant font-mono">
              Click anywhere outside or press Close to dismiss
            </span>
          </div>
        </div>
      )}
    </>
  );
}
