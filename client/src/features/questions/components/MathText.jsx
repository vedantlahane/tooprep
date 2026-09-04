import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Parses LaTeX equations ($...$, $$...$$, \(...\), \[...\]) and light markdown (bold, italic, linebreaks)
 * into safe HTML rendered with KaTeX.
 */
export function renderLatex(text) {
  if (!text) return '';

  const mathPlaceholders = [];
  const placeholderPrefix = '@@@KATEX_PH_';

  // 1. Display math $$...$$
  let processed = String(text).replace(/\$\$(.*?)\$\$/gs, (_, math) => {
    const id = `${placeholderPrefix}${mathPlaceholders.length}@@@`;
    try {
      const html = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      mathPlaceholders.push({ id, html: `<div class="katex-display-wrapper my-2 overflow-x-auto">${html}</div>` });
    } catch {
      mathPlaceholders.push({ id, html: `<div class="katex-error font-mono text-error text-sm">${math}</div>` });
    }
    return id;
  });

  // 2. Display math \[...\]
  processed = processed.replace(/\\\[(.*?)\\\]/gs, (_, math) => {
    const id = `${placeholderPrefix}${mathPlaceholders.length}@@@`;
    try {
      const html = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      mathPlaceholders.push({ id, html: `<div class="katex-display-wrapper my-2 overflow-x-auto">${html}</div>` });
    } catch {
      mathPlaceholders.push({ id, html: `<div class="katex-error font-mono text-error text-sm">${math}</div>` });
    }
    return id;
  });

  // 3. Inline math $...$
  processed = processed.replace(/\$(.*?)\$/g, (_, math) => {
    const id = `${placeholderPrefix}${mathPlaceholders.length}@@@`;
    try {
      const html = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      mathPlaceholders.push({ id, html });
    } catch {
      mathPlaceholders.push({ id, html: `<span class="katex-error font-mono text-error text-sm">${math}</span>` });
    }
    return id;
  });

  // 4. Inline math \(...\)
  processed = processed.replace(/\\\((.*?)\\\)/g, (_, math) => {
    const id = `${placeholderPrefix}${mathPlaceholders.length}@@@`;
    try {
      const html = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      mathPlaceholders.push({ id, html });
    } catch {
      mathPlaceholders.push({ id, html: `<span class="katex-error font-mono text-error text-sm">${math}</span>` });
    }
    return id;
  });

  // 5. Fallback for raw LaTeX command snippet without delimiters (e.g. "\frac{1}{2} q\omega r^2")
  if (mathPlaceholders.length === 0 && /\\[a-zA-Z]+/.test(processed)) {
    try {
      const html = katex.renderToString(processed.trim(), { displayMode: false, throwOnError: false });
      if (html && !html.includes('katex-error')) {
        return html;
      }
    } catch {}
  }

  // 6. Markdown formatting on prose outside math
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  processed = processed.replace(/\n\n+/g, '<br /><br />').replace(/\n/g, '<br />');

  // 7. Restore KaTeX placeholders
  for (const item of mathPlaceholders) {
    processed = processed.replace(item.id, item.html);
  }

  return processed;
}

export default function MathText({ text, className = '' }) {
  const html = useMemo(() => renderLatex(text), [text]);

  return (
    <span
      className={`math-rendered-content leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
