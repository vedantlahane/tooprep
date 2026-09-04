import { useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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
          class="max-h-72 max-w-full object-contain rounded cursor-pointer hover:opacity-95 transition-opacity"
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
 * Parses LaTeX equations ($...$, $$...$$, \(...\), \[...\]), light markdown (bold, italic, linebreaks),
 * and question images into safe HTML rendered with KaTeX.
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

  // 6. Transform images & diagram tags
  processed = transformImages(processed);

  // 7. Markdown formatting on prose outside math
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  processed = processed.replace(/\n\n+/g, '<br /><br />').replace(/\n/g, '<br />');

  // 8. Restore KaTeX placeholders
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
        className={`math-rendered-content leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Diagram Zoom Modal */}
      {zoomImg && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomImg(null)}
        >
          <div
            className="bg-surface-dim border border-outline-variant p-4 rounded-md max-w-4xl max-h-[90vh] flex flex-col items-center"
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
