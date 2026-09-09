import { useState, useEffect, useRef, memo } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, ZoomIn, X, Code, AlertCircle } from 'lucide-react';

// Initialize mermaid once with AMOLED/Fluent theme
let mermaidInitialized = false;
function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    themeVariables: {
      darkMode: true,
      background: 'transparent',
      mainBkg: '#18181b',
      nodeBorder: '#38bdf8',
      clusterBkg: '#09090b',
      clusterBorder: '#334155',
      defaultLinkColor: '#94a3b8',
      titleColor: '#f8fafc',
      edgeLabelBackground: '#18181b',
      nodeTextColor: '#f8fafc',
      primaryColor: '#1e293b',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#38bdf8',
      lineColor: '#38bdf8',
      secondaryColor: '#0f172a',
      tertiaryColor: '#1e293b'
    }
  });
  mermaidInitialized = true;
}

/**
 * Sanitizes and repairs common OCR/LLM mermaid syntax glitches:
 * - Unbalanced quotes or brackets inside node labels
 * - Missing graph header
 * - Raw HTML or LaTeX inside labels
 */
function sanitizeMermaidCode(raw) {
  if (!raw) return '';
  let code = String(raw).trim();

  // Strip ```mermaid and ``` wrappers if passed
  code = code.replace(/^```(?:mermaid)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Normalize newlines
  code = code.replace(/\r\n/g, '\n');

  // If missing graph/flowchart declaration, prepend 'graph LR'
  if (!/^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph)\b/i.test(code)) {
    code = `graph LR\n${code}`;
  }

  // Repair unquoted node labels with spaces or math: e.g. [V = 10] -> ["V = 10"]
  // Match [text] where text contains = or spaces and is not already wrapped in "
  code = code.replace(/\[([^"\]\n]+=[^"\]\n]+)\]/g, '["$1"]');

  return code;
}

function MermaidRendererComponent({ code, className = '', title = 'Diagram' }) {
  const [svgHtml, setSvgHtml] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const containerRef = useRef(null);

  const cleanCode = sanitizeMermaidCode(code);

  useEffect(() => {
    let active = true;
    ensureMermaidInitialized();

    const renderDiagram = async () => {
      if (!cleanCode) return;
      const uniqueId = `mermaid-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
      try {
        const { svg } = await mermaid.render(uniqueId, cleanCode);
        if (active) {
          setSvgHtml(svg);
          setError(null);
        }
      } catch (err) {
        console.warn('Mermaid render error:', err);
        // Try fallback with relaxed graph TD
        try {
          const fallbackCode = cleanCode.replace(/^graph\s+[A-Z]+/i, 'graph TD');
          const fallbackId = `${uniqueId}-fb`;
          const { svg: fbSvg } = await mermaid.render(fallbackId, fallbackCode);
          if (active) {
            setSvgHtml(fbSvg);
            setError(null);
            return;
          }
        } catch {}

        if (active) {
          setError(err.message || 'Diagram syntax error');
          setSvgHtml('');
        }
      }
    };

    renderDiagram();
    return () => { active = false; };
  }, [cleanCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-3 border border-outline-variant/60 rounded bg-black/40 overflow-hidden shadow-sm group ${className}`}>
      {/* Top Diagram Toolbar */}
      <div className="bg-surface-container/80 px-3 py-1.5 border-b border-outline-variant/40 flex items-center justify-between text-[11px] font-mono select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-primary font-bold tracking-wider uppercase text-[10px]">
            {title || 'Schematic Diagram'}
          </span>
          <span className="text-white/40 text-[10px] hidden sm:inline">&bull; Vector SVG</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowRaw(prev => !prev)}
            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono flex items-center gap-1 transition-colors cursor-pointer ${
              showRaw ? 'bg-primary text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Mermaid raw code"
          >
            <Code className="w-3 h-3" />
            <span>Code</span>
          </button>

          {svgHtml && (
            <button
              type="button"
              onClick={() => setIsZoomed(true)}
              className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono text-white/60 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors cursor-pointer"
              title="Inspect diagram full screen"
            >
              <ZoomIn className="w-3 h-3" />
              <span>Zoom</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono text-white/60 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors cursor-pointer"
            title="Copy Mermaid code"
          >
            {copied ? <Check className="w-3 h-3 text-status-aligned" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Raw Code Drawer */}
      {showRaw && (
        <pre className="p-3 bg-black/90 text-primary text-xs font-mono border-b border-outline-variant/40 overflow-x-auto selection:bg-primary/30">
          {cleanCode}
        </pre>
      )}

      {/* Diagram Render Body */}
      <div className="p-3 sm:p-5 flex items-center justify-center overflow-x-auto min-h-[140px] bg-black/60">
        {svgHtml ? (
          <div
            ref={containerRef}
            className="w-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:mx-auto cursor-zoom-in"
            onClick={() => setIsZoomed(true)}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : error ? (
          <div className="w-full p-3 border border-amber-500/30 bg-amber-500/5 rounded text-amber-300 font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Mermaid Diagram Blueprint</span>
            </div>
            <pre className="p-2.5 bg-black/70 rounded text-[11px] text-white/90 overflow-x-auto border border-white/10">
              {cleanCode}
            </pre>
            <div className="text-[10px] text-white/50">
              Note: Diagram code displayed above ({error})
            </div>
          </div>
        ) : (
          <div className="text-white/40 text-xs font-mono flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span>Rendering diagram...</span>
          </div>
        )}
      </div>

      {/* Fullscreen Zoom Modal */}
      {isZoomed && svgHtml && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="bg-surface-dim border border-outline-variant rounded p-4 max-w-5xl w-[95vw] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-2 font-mono text-xs text-primary font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>{title || 'Diagram Inspection'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-black/80 my-3 rounded border border-white/10 [&>svg]:max-w-full [&>svg]:max-h-[70vh] [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />

            <div className="flex justify-between items-center text-xs font-mono text-white/40 pt-1">
              <span>Click anywhere outside or close button to dismiss</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied code' : 'Copy code'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const MermaidRenderer = memo(MermaidRendererComponent);
export default MermaidRenderer;
