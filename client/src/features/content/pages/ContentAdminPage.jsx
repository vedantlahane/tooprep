import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { contentService } from '../services/contentService';
import { topicsService } from '@/features/topics/services/topicsService';
import MathText from '@/features/questions/components/MathText';
import {
  extractOptionsFromText,
  detectAnswerKey,
  isInstructionSnippet,
  autoFormatAndCleanMath,
  polishCandidateText
} from '../lib/candidateParser';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Check,
  ListFilter,
  Sparkles,
  Eye,
  Code,
  Image as ImageIcon,
  FileSearch,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Crop,
  GitMerge,
  Keyboard,
  CheckSquare,
  Square,
  Wand2,
  Layers,
  SlidersHorizontal,
  RotateCcw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Tag,
  Trash2
} from 'lucide-react';
import {
  loadPdfDocument,
  renderPdfPageToDataUrl,
  cropImageByRelativeCoords
} from '../lib/clientPdfRenderer';

const REJECTION_PRESETS = [
  'Cover Page / Instructions',
  'Solutions / Answer Key Only',
  'Incomplete / Malformed Snippet',
  'Missing Visual Diagram',
  'Duplicate Question',
  'Non-Curriculum Material'
];

// Quick LaTeX Symbol Insertion Palette
const LATEX_SYMBOLS = [
  { label: 'a/b', latex: '\\frac{a}{b}', title: 'Fraction' },
  { label: '√x', latex: '\\sqrt{x}', title: 'Square Root' },
  { label: 'x²', latex: '^{2}', title: 'Superscript / Power' },
  { label: 'x₀', latex: '_{0}', title: 'Subscript' },
  { label: 'ω', latex: '\\omega', title: 'Omega (Angular Freq)' },
  { label: 'θ', latex: '\\theta', title: 'Theta (Angle)' },
  { label: 'α', latex: '\\alpha', title: 'Alpha' },
  { label: 'β', latex: '\\beta', title: 'Beta' },
  { label: 'Δ', latex: '\\Delta', title: 'Delta' },
  { label: '→', latex: '\\rightarrow', title: 'Reaction Arrow' },
  { label: '⇌', latex: '\\rightleftharpoons', title: 'Equilibrium Arrow' },
  { label: '×10ⁿ', latex: '\\times 10^{n}', title: 'Scientific Notation' },
  { label: 'Ω', latex: '\\Omega', title: 'Ohm' },
  { label: 'µm', latex: '\\mu\\text{m}', title: 'Micrometer' },
  { label: 'cm', latex: '\\text{cm}', title: 'Centimeter' },
  { label: '∫', latex: '\\int', title: 'Integral' },
  { label: '∞', latex: '\\infty', title: 'Infinity' }
];

/**
 * Memoized Topic Select Component
 */
const TopicSelect = memo(function TopicSelect({ value, onChange, groupedTopics, className = '' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`bg-surface-container border border-outline-variant p-2 text-on-surface outline-none focus:border-primary rounded-sm text-xs font-mono ${className}`}
    >
      <option value="">Select Topic in Syllabus...</option>
      {Object.entries(groupedTopics).map(([subj, tList]) => (
        <optgroup key={subj} label={subj}>
          {tList.map(t => (
            <option key={t.id} value={t.id}>
              {t.chapter} &rsaquo; {t.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
});

/**
 * Quick LaTeX Symbol Insertion Toolbar
 */
function LatexSymbolBar({ onInsert }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1 px-1.5 bg-black/60 border border-white/10 rounded-xs text-xs font-mono select-none">
      <span className="text-[10px] text-primary uppercase font-bold px-1 shrink-0">TeX:</span>
      {LATEX_SYMBOLS.map((sym, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onInsert(sym.latex)}
          title={sym.title}
          className="px-1.5 py-0.5 bg-surface-dim hover:bg-primary hover:text-white border border-white/10 text-white/80 rounded-xs text-[11px] shrink-0 transition-colors cursor-pointer"
        >
          {sym.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Interactive Full-Screen / Modal PDF Cropping Studio
 */
function PdfCroppingStudioModal({ modal, onClose, onCrop, onNavigatePage }) {
  const [target, setTarget] = useState(modal?.defaultTarget || 'stem');
  const [selection, setSelection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [cropSuccess, setCropSuccess] = useState('');
  const [error, setError] = useState('');
  const imgRef = useRef(null);

  useEffect(() => {
    if (modal?.defaultTarget) setTarget(modal.defaultTarget);
    setCropSuccess('');
    setError('');
  }, [modal?.defaultTarget, modal?.pageNum]);

  const getRelativeCoords = (e) => {
    if (!imgRef.current) return null;
    const rect = imgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handlePointerDown = (e) => {
    const coords = getRelativeCoords(e);
    if (!coords) return;
    setIsDragging(true);
    setStartPoint(coords);
    setSelection({ x: coords.x, y: coords.y, w: 0, h: 0 });
    setCropSuccess('');
    setError('');
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !startPoint) return;
    const coords = getRelativeCoords(e);
    if (!coords) return;
    const x0 = Math.min(startPoint.x, coords.x);
    const y0 = Math.min(startPoint.y, coords.y);
    const w = Math.abs(coords.x - startPoint.x);
    const h = Math.abs(coords.y - startPoint.y);
    setSelection({ x: x0, y: y0, w, h });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (selection && (selection.w < 0.01 || selection.h < 0.01)) {
      setSelection(null);
    }
  };

  const pdfPoints = useMemo(() => {
    if (!selection) return null;
    const pw = modal?.width || 595.3;
    const ph = modal?.height || 841.9;
    const x0 = Math.round(selection.x * pw);
    const y0 = Math.round(selection.y * ph);
    const x1 = Math.round((selection.x + selection.w) * pw);
    const y1 = Math.round((selection.y + selection.h) * ph);
    const w = x1 - x0;
    const h = y1 - y0;
    return { x0, y0, x1, y1, w, h };
  }, [selection, modal?.width, modal?.height]);

  const handleApplyCrop = async () => {
    if (!pdfPoints) {
      setError('Please click & drag a selection box over the diagram first.');
      return;
    }
    setCropping(true);
    setError('');
    setCropSuccess('');
    try {
      await onCrop(pdfPoints, target);
      const targetName = target === 'stem' ? 'Question Stem' : `Option ${target.slice(3).toUpperCase()}`;
      setCropSuccess(`✓ Diagram cropped at 300 DPI and inserted into ${targetName}!`);
      if (target === 'stem') setTarget('optA');
      else if (target === 'optA') setTarget('optB');
      else if (target === 'optB') setTarget('optC');
      else if (target === 'optC') setTarget('optD');
      setSelection(null);
    } catch (err) {
      setError(err.message || 'Failed to crop diagram');
    } finally {
      setCropping(false);
    }
  };

  if (!modal) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-surface-dim border border-outline-variant rounded-sm w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 border-b border-outline-variant bg-surface-container">
          <div className="flex items-center gap-2.5 min-w-0 truncate">
            <Crop className="w-4 h-4 text-primary shrink-0" />
            <span className="text-label-sm-mono uppercase tracking-widest text-primary font-bold text-xs truncate">
              PDF Cropping Studio &middot; Page {modal.pageNum}
            </span>
            {modal.qNum && (
              <span className="text-xs text-on-surface-variant font-mono shrink-0">
                (Q.{modal.qNum})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigatePage(-1)}
              disabled={modal.pageNum <= 1 || modal.loading}
              className="px-2 py-1 text-xs font-mono border border-outline-variant rounded hover:border-primary disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>P.{modal.pageNum - 1}</span>
            </button>
            <span className="text-xs font-mono text-primary font-bold px-1.5">
              Page {modal.pageNum}
            </span>
            <button
              onClick={() => onNavigatePage(1)}
              disabled={modal.loading}
              className="px-2 py-1 text-xs font-mono border border-outline-variant rounded hover:border-primary disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <span>P.{modal.pageNum + 1}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-outline-variant mx-1" />

            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface font-mono text-xs px-2.5 py-1 rounded hover:bg-surface-container transition-colors cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-2.5 bg-surface-container/80 border-b border-outline-variant flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">Apply Crop To:</span>
            {[
              { id: 'stem', label: 'Stem' },
              { id: 'optA', label: 'Option A' },
              { id: 'optB', label: 'Option B' },
              { id: 'optC', label: 'Option C' },
              { id: 'optD', label: 'Option D' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTarget(t.id)}
                className={`px-2.5 py-1 rounded-sm uppercase tracking-wider text-[11px] font-bold border transition-colors cursor-pointer ${
                  target === t.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface-dim border-outline-variant text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {pdfPoints && (
              <span className="text-[11px] text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-xs">
                {pdfPoints.w} &times; {pdfPoints.h} pt
              </span>
            )}

            {selection && (
              <button
                onClick={() => setSelection(null)}
                className="text-on-surface-variant hover:text-error text-[11px] underline cursor-pointer"
              >
                Clear Box
              </button>
            )}

            <button
              onClick={handleApplyCrop}
              disabled={!selection || cropping || modal.loading}
              className="px-4 py-1.5 bg-primary text-white hover:bg-primary-hover disabled:opacity-40 rounded-sm font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              {cropping ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Cropping 300 DPI...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Crop & Apply</span>
                </>
              )}
            </button>
          </div>
        </div>

        {cropSuccess && (
          <div className="bg-status-aligned/10 border-b border-status-aligned/30 px-4 py-2 text-status-aligned font-mono text-xs flex items-center justify-between">
            <span>{cropSuccess}</span>
            <span className="text-[11px] opacity-75">Target advanced. Drag to crop another!</span>
          </div>
        )}

        {error && (
          <div className="bg-error/10 border-b border-error/30 px-4 py-2 text-error font-mono text-xs">
            {error}
          </div>
        )}

        <div
          className="p-3 sm:p-6 overflow-auto flex-1 flex flex-col items-center justify-center bg-black/75 min-h-[360px] max-w-full relative select-none cursor-crosshair"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          {modal.loading ? (
            <div className="text-center space-y-2.5 font-mono text-primary animate-pulse-soft">
              <Sparkles className="w-7 h-7 mx-auto animate-spin" />
              <p className="text-xs">Rendering vector page {modal.pageNum} at high resolution...</p>
            </div>
          ) : modal.error ? (
            <div className="text-error font-mono text-xs border border-error/30 bg-error/10 p-4 rounded text-center">
              Error rendering page: {modal.error}
            </div>
          ) : (
            <div className="relative inline-block shadow-2xl bg-white rounded border border-outline-variant/80">
              <img
                ref={imgRef}
                src={modal.dataUrl}
                alt={`Page ${modal.pageNum}`}
                draggable={false}
                className="max-h-[64vh] max-w-full w-auto object-contain select-none pointer-events-none"
              />

              {selection && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${selection.x * 100}%`,
                    top: `${selection.y * 100}%`,
                    width: `${selection.w * 100}%`,
                    height: `${selection.h * 100}%`,
                  }}
                  className="border-2 border-primary bg-primary/20 pointer-events-none shadow-[0_0_12px_rgba(0,191,255,0.4)]"
                >
                  <div className="absolute top-0 right-0 -translate-y-full bg-primary text-white text-[10px] font-mono px-1.5 py-0.5 rounded-xs tracking-wider uppercase font-bold">
                    Target: {target.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Studio Mode Split-Screen Left Pane: Integrated PDF Viewer & Drag-to-Crop Canvas
 */
function StudioPdfViewer({ jobId, pageNum, onNavigatePage, onDirectCrop, activeCandidateKey, activeQNum }) {
  const [loading, setLoading] = useState(false);
  const [dataUrl, setDataUrl] = useState(null);
  const [pdfMeta, setPdfMeta] = useState({ width: 595.3, height: 841.9 });
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [localPdfDoc, setLocalPdfDoc] = useState(null);
  const [localPdfName, setLocalPdfName] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadPdfSuccess, setUploadPdfSuccess] = useState(false);
  const imgRef = useRef(null);

  // Load PDF page image
  useEffect(() => {
    if (!jobId || !pageNum) return;
    let active = true;
    setLoading(true);
    setError('');
    setSelection(null);

    // If local PDF is already loaded in memory, render directly in browser
    if (localPdfDoc) {
      renderPdfPageToDataUrl(localPdfDoc, pageNum, 1.5)
        .then(res => {
          if (!active) return;
          setDataUrl(res.dataUrl);
          setPdfMeta({ width: res.width, height: res.height });
          setLoading(false);
        })
        .catch(err => {
          if (!active) return;
          setError('Failed to render PDF page: ' + err.message);
          setLoading(false);
        });
      return () => { active = false; };
    }

    // Attempt cloud server-side rendering
    contentService.renderPdfPage(jobId, pageNum, 150)
      .then(res => {
        if (!active) return;
        if (res.success === false) {
          setError(res.error || 'Server rendering unavailable on this host');
          setDataUrl(null);
        } else {
          setDataUrl(res.data_url);
          setPdfMeta({ width: res.width || 595.3, height: res.height || 841.9 });
        }
      })
      .catch(err => {
        if (!active) return;
        setError(err.message || 'Server rendering unavailable on this host');
        setDataUrl(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [jobId, pageNum, localPdfDoc]);

  const handleLocalPdfSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      setError('');
      setLocalPdfName(file.name);
      const doc = await loadPdfDocument(file, `${jobId}_${file.name}`);
      setLocalPdfDoc(doc);
      const pageRes = await renderPdfPageToDataUrl(doc, pageNum, 1.5);
      setDataUrl(pageRes.dataUrl);
      setPdfMeta({ width: pageRes.width, height: pageRes.height });

      // Automatically try syncing the PDF to the cloud job in background
      try {
        await contentService.uploadSourcePdf(jobId, file);
        setUploadPdfSuccess(true);
        setTimeout(() => setUploadPdfSuccess(false), 4000);
      } catch (syncErr) {
        console.warn('PDF cloud sync optional notification:', syncErr.message);
      }
    } catch (err) {
      setError('Failed to load PDF file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeCoords = (e) => {
    if (!imgRef.current) return null;
    const rect = imgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handlePointerDown = (e) => {
    const coords = getRelativeCoords(e);
    if (!coords) return;
    setIsDragging(true);
    setStartPoint(coords);
    setSelection({ x: coords.x, y: coords.y, w: 0, h: 0 });
    setSuccessToast('');
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !startPoint) return;
    const coords = getRelativeCoords(e);
    if (!coords) return;
    const x0 = Math.min(startPoint.x, coords.x);
    const y0 = Math.min(startPoint.y, coords.y);
    const w = Math.abs(coords.x - startPoint.x);
    const h = Math.abs(coords.y - startPoint.y);
    setSelection({ x: x0, y: y0, w, h });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (selection && (selection.w < 0.015 || selection.h < 0.015)) {
      setSelection(null);
    }
  };

  const pdfPoints = useMemo(() => {
    if (!selection) return null;
    const pw = pdfMeta.width || 595.3;
    const ph = pdfMeta.height || 841.9;
    const x0 = Math.round(selection.x * pw);
    const y0 = Math.round(selection.y * ph);
    const x1 = Math.round((selection.x + selection.w) * pw);
    const y1 = Math.round((selection.y + selection.h) * ph);
    const w = x1 - x0;
    const h = y1 - y0;
    return { x0, y0, x1, y1, w, h };
  }, [selection, pdfMeta]);

  const executeCropToTarget = async (target) => {
    if (!selection || !jobId) return;
    setCropping(true);
    try {
      let storedImage = null;

      // 1. First attempt high-fidelity client-side canvas crop (instant, zero-server-dependency)
      if (dataUrl) {
        try {
          const croppedDataUrl = await cropImageByRelativeCoords(dataUrl, selection);
          const uploaded = await contentService.uploadImage(croppedDataUrl, `crop_${jobId}_p${pageNum}_${target}.png`);
          storedImage = uploaded;
        } catch (clientErr) {
          console.warn('Client canvas crop fallback:', clientErr);
        }
      }

      // 2. Fallback to server crop if client crop did not complete
      if (!storedImage && pdfPoints) {
        storedImage = await onDirectCrop(pdfPoints, target);
      }

      if (storedImage) {
        if (typeof onDirectCrop === 'function') {
          await onDirectCrop(pdfPoints || { x0: 0, y0: 0, x1: 0, y1: 0 }, target, storedImage.url);
        }
        const targetLabel = target === 'stem' ? 'Question Stem' : `Option ${target.slice(3).toUpperCase()}`;
        setSuccessToast(`✓ Cropped into ${targetLabel}!`);
        setSelection(null);
        setTimeout(() => setSuccessToast(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Crop failed');
    } finally {
      setCropping(false);
    }
  };

  return (
    <div className="h-full flex flex-col border border-outline-variant bg-[#0b0d13] rounded-sm overflow-hidden select-none">
      {/* PDF Stage Toolbar */}
      <div className="px-3 py-2 bg-surface-container border-b border-outline-variant flex items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <Crop className="w-3.5 h-3.5 text-primary" />
          <span className="text-white font-bold uppercase tracking-wider text-[11px]">
            Source PDF Studio
          </span>
          {activeQNum && (
            <span className="text-primary font-bold bg-primary/10 border border-primary/30 px-1.5 py-0.2 rounded-xs text-[10px]">
              Q.{activeQNum}
            </span>
          )}
        </div>

        {/* Page Flipping Navigator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigatePage(-1)}
            disabled={pageNum <= 1 || loading}
            className="p-1 border border-outline-variant rounded hover:border-primary disabled:opacity-30 cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-bold text-white text-[11px]">
            P. {pageNum}
          </span>
          <button
            onClick={() => onNavigatePage(1)}
            disabled={loading}
            className="p-1 border border-outline-variant rounded hover:border-primary disabled:opacity-30 cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-white/20 mx-1" />

          {/* Zoom buttons */}
          <button
            onClick={() => setZoom(z => Math.max(z - 0.15, 0.6))}
            className="p-1 text-white/70 hover:text-white cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-white/50 min-w-[32px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(z + 0.15, 1.8))}
            className="p-1 text-white/70 hover:text-white cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-1.5 py-0.5 text-[9px] border border-white/20 text-white/60 hover:text-white uppercase font-bold cursor-pointer"
            title="Fit Width / 100%"
          >
            Fit
          </button>

          <div className="h-3.5 w-px bg-white/20 mx-1" />
          <label
            title={localPdfName ? `Loaded: ${localPdfName}. Click to change PDF` : 'Attach or select local PDF file'}
            className="px-2 py-0.5 text-[9px] border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-black font-bold uppercase rounded-xs cursor-pointer transition-colors flex items-center gap-1 shrink-0"
          >
            <UploadCloud className="w-3 h-3" />
            <span>{localPdfName ? 'PDF Loaded' : 'Attach PDF'}</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleLocalPdfSelect}
            />
          </label>
        </div>
      </div>

      {/* Success / Notice Toast */}
      {successToast && (
        <div className="bg-status-aligned/20 border-b border-status-aligned/40 px-3 py-1.5 text-status-aligned text-xs font-mono flex items-center justify-between">
          <span>{successToast}</span>
          <span className="text-[10px] opacity-75">Instant inject complete</span>
        </div>
      )}

      {error && (
        <div className="bg-error/15 border-b border-error/40 px-3 py-1.5 text-error text-xs font-mono">
          {error}
        </div>
      )}

      {/* Canvas Viewport */}
      <div
        className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-black/80 cursor-crosshair min-h-[420px]"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {loading ? (
          <div className="text-center space-y-2 text-primary font-mono text-xs animate-pulse-soft">
            <Sparkles className="w-6 h-6 mx-auto animate-spin" />
            <p>Rendering Page {pageNum} at high resolution...</p>
          </div>
        ) : dataUrl ? (
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            className="relative inline-block shadow-2xl bg-white border border-white/20 transition-transform duration-75"
          >
            <img
              ref={imgRef}
              src={dataUrl}
              alt={`Page ${pageNum}`}
              draggable={false}
              className="max-w-full h-auto object-contain select-none pointer-events-none"
            />

            {/* Selection Bounding Box */}
            {selection && (
              <div
                style={{
                  position: 'absolute',
                  left: `${selection.x * 100}%`,
                  top: `${selection.y * 100}%`,
                  width: `${selection.w * 100}%`,
                  height: `${selection.h * 100}%`,
                }}
                className="border-2 border-primary bg-primary/20 pointer-events-none shadow-[0_0_12px_rgba(0,191,255,0.5)] z-20"
              />
            )}
          </div>
        ) : (
          <div className="p-8 max-w-md text-center space-y-4 font-mono text-xs bg-surface-dim border border-white/15 rounded-sm shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Source PDF Not Rendered on Server</h4>
              <p className="text-white/60 text-[11px] mt-1 font-sans leading-relaxed">
                Cloud host does not have PyMuPDF rasterizer or PDF file is local. You can select your local PDF file to render pages and crop directly in the browser!
              </p>
            </div>

            {/* Local PDF File Picker */}
            <div className="space-y-2 pt-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black hover:brightness-110 font-bold uppercase rounded-sm cursor-pointer transition-all text-xs shadow-lg">
                <UploadCloud className="w-4 h-4" />
                <span>Select Local PDF File</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handleLocalPdfSelect}
                />
              </label>

              {localPdfName && (
                <div className="text-[11px] text-status-aligned flex items-center justify-center gap-1.5 pt-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Loaded: {localPdfName}</span>
                </div>
              )}

              {uploadPdfSuccess && (
                <div className="text-[10px] text-status-aligned font-mono">
                  ✓ Source PDF also uploaded to cloud storage!
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 text-[10px] text-white/40">
              ⚡ Browser PDF.js rendering &bull; Instant drag-to-crop enabled
            </div>
          </div>
        )}

        {/* Floating Quick Crop Action Pill Directly over Selection */}
        {selection && pdfPoints && !isDragging && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(Math.max(selection.x * 100, 5), 65)}%`,
              top: `${Math.max(selection.y * 100 - 8, 2)}%`,
            }}
            className="z-30 bg-black/95 border-2 border-primary p-1.5 shadow-2xl rounded-sm flex items-center gap-1 font-mono text-[10px] animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-primary font-bold px-1 uppercase">Insert To:</span>
            <button
              onClick={() => executeCropToTarget('stem')}
              disabled={cropping}
              className="px-2 py-1 bg-primary text-white hover:brightness-110 font-bold rounded-xs cursor-pointer uppercase"
            >
              Stem
            </button>
            <button
              onClick={() => executeCropToTarget('optA')}
              disabled={cropping}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xs cursor-pointer uppercase"
            >
              (A)
            </button>
            <button
              onClick={() => executeCropToTarget('optB')}
              disabled={cropping}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xs cursor-pointer uppercase"
            >
              (B)
            </button>
            <button
              onClick={() => executeCropToTarget('optC')}
              disabled={cropping}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xs cursor-pointer uppercase"
            >
              (C)
            </button>
            <button
              onClick={() => executeCropToTarget('optD')}
              disabled={cropping}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xs cursor-pointer uppercase"
            >
              (D)
            </button>
            <button
              onClick={() => setSelection(null)}
              className="p-1 text-white/50 hover:text-error cursor-pointer ml-1"
              title="Cancel Selection"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="px-3 py-1.5 bg-surface-container border-t border-outline-variant flex items-center justify-between text-[10px] font-mono text-white/50">
        <span>💡 Click &amp; drag over reaction arrows, benzene rings, or graphs to 300 DPI crop.</span>
        <span>{pdfPoints ? `${pdfPoints.w} × ${pdfPoints.h} pt` : 'Ready'}</span>
      </div>
    </div>
  );
}

/**
 * Main Question Candidate Verification Card Component
 */
function CandidateCard({
  candidate,
  jobId,
  groupedTopics,
  onReviewed,
  onViewPdfPage,
  onOpenCropper,
  isSelected,
  onToggleSelect,
  isCompact = false
}) {
  const initialParsed = useMemo(() => {
    let qText = candidate.question_text || candidate.raw_text || '';
    let opts = [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }];
    let ans = candidate.correct_answer || 'A';
    let sol = candidate.solution_text || '';

    if (candidate.options && typeof candidate.options === 'object') {
      opts = [
        { id: 'A', text: candidate.options.A || candidate.options.a || '' },
        { id: 'B', text: candidate.options.B || candidate.options.b || '' },
        { id: 'C', text: candidate.options.C || candidate.options.c || '' },
        { id: 'D', text: candidate.options.D || candidate.options.d || '' }
      ];
    } else {
      const extracted = extractOptionsFromText(candidate.raw_text);
      if (extracted.hasOptions) {
        qText = extracted.questionText;
        opts = extracted.options;
      }
    }

    const detectedAns = detectAnswerKey(candidate.raw_text);
    if (!candidate.correct_answer && detectedAns) ans = detectedAns;

    return { questionText: qText, options: opts, correctAnswer: ans, solutionText: sol };
  }, [candidate]);

  const [questionText, setQuestionText] = useState(initialParsed.questionText);
  const [options, setOptions] = useState(initialParsed.options);
  const [solutionText, setSolutionText] = useState(initialParsed.solutionText);
  const [correctAnswer, setCorrectAnswer] = useState(initialParsed.correctAnswer);
  const [difficulty, setDifficulty] = useState('medium');
  const [topicId, setTopicId] = useState(candidate.suggested_topic_id || '');

  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [searchingSimilar, setSearchingSimilar] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'preview' | 'editor'

  const fileInputRef = useRef(null);
  const [targetImageField, setTargetImageField] = useState('stem');

  const isInstruction = useMemo(() => isInstructionSnippet(candidate.raw_text), [candidate.raw_text]);
  const primaryPage = candidate.source_pages?.[0] || 1;

  useEffect(() => {
    if (candidate.suggested_topic_id) {
      setTopicId(candidate.suggested_topic_id);
    }
  }, [candidate.suggested_topic_id]);

  const handleApplyCroppedImage = (target, imageUrl) => {
    const cleanUrl = imageUrl.trim();
    if (target === 'stem') {
      setQuestionText(prev => prev ? `${prev.trim()}\n\n![Figure](${cleanUrl})\n` : `![Figure](${cleanUrl})\n`);
    } else if (target && target.startsWith('opt')) {
      const optId = target.slice(3).toUpperCase();
      setOptions(prev => prev.map(o => o.id === optId ? {
        ...o,
        text: (o.text ? o.text.trim() + ' ' : '') + `![Option ${optId}](${cleanUrl})`
      } : o));
    }
  };

  // 1-Click AI Format & Clean
  const handleAutoCleanAndPolish = () => {
    const polished = polishCandidateText(questionText || candidate.raw_text);
    setQuestionText(polished.questionText);
    if (polished.hasOptions) {
      setOptions(polished.options);
    }
    if (polished.correctAnswer) {
      setCorrectAnswer(polished.correctAnswer);
    }
  };

  const handleInsertLatex = (latex) => {
    setQuestionText(prev => `${prev ? prev + ' ' : ''}${latex}`);
  };

  const handleAttachImage = (target) => {
    setTargetImageField(target);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError('');
    try {
      const res = await contentService.uploadImage(file);
      const imgMarkdown = `\n\n![Diagram](${res.url})\n`;

      if (targetImageField === 'stem') {
        setQuestionText(prev => prev + imgMarkdown);
      } else if (targetImageField.startsWith('opt')) {
        const optId = targetImageField.slice(3).toUpperCase();
        setOptions(prev => prev.map(o => o.id === optId ? { ...o, text: (o.text ? o.text + ' ' : '') + `![Option ${optId}](${res.url})` } : o));
      }
    } catch (err) {
      setError('Image upload failed: ' + err.message);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const accept = async () => {
    if (!topicId) {
      setError('Curriculum topic is required before publishing to question bank.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await contentService.acceptCandidate(jobId, candidate.candidate_key, {
        question_text: questionText,
        options: options,
        correct_answer: correctAnswer,
        solution_text: solutionText,
        difficulty,
        source_type: 'PYQ',
        question_type: 'single_correct',
        curriculum: {
          topic_id: topicId,
          difficulty,
          subject: candidate.subject,
          chapter: candidate.suggested_chapter
        }
      });
      onReviewed();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const reject = async (customReason) => {
    const r = customReason || reason;
    if (!r) {
      setError('A rejection reason or preset is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await contentService.rejectCandidate(jobId, candidate.candidate_key, r);
      onReviewed();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const findSimilar = async () => {
    setSearchingSimilar(true);
    try {
      const results = await contentService.searchQuestions(questionText, 3);
      setSimilarQuestions(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearchingSimilar(false);
    }
  };

  const updateOption = (index, text) => {
    const newOps = [...options];
    newOps[index].text = text;
    setOptions(newOps);
  };

  return (
    <article
      className={`w-full max-w-full min-w-0 overflow-hidden border rounded-sm transition-all ${
        candidate.status === 'PUBLISHED'
          ? 'border-status-aligned/50 bg-status-aligned/5'
          : candidate.status === 'REJECTED'
          ? 'border-error/40 bg-error/5 opacity-75'
          : isInstruction
          ? 'border-status-weak/40 bg-status-weak/5'
          : isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-outline-variant bg-surface-dim shadow-sm'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelected}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Header bar */}
      <div className="bg-surface-container px-3 sm:px-4 py-2.5 flex justify-between items-center border-b border-outline-variant flex-wrap gap-2 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          {onToggleSelect && (
            <button
              onClick={onToggleSelect}
              className="text-white/60 hover:text-primary transition-colors cursor-pointer"
              title={isSelected ? 'Deselect candidate' : 'Select candidate'}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4 text-white/40" />
              )}
            </button>
          )}

          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="text-primary hover:text-white p-0.5 rounded transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse card' : 'Expand card'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <div className="text-label-sm-mono uppercase tracking-widest text-primary font-bold flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Q.{candidate.source_question_number}</span>
            <span className="text-on-surface-variant font-normal">&middot; P.{candidate.source_pages?.join(', ')}</span>
          </div>

          {candidate.subject && (
            <span
              className={`px-2 py-0.5 rounded-sm text-[11px] font-mono uppercase tracking-wider font-semibold ${
                candidate.subject === 'Physics'
                  ? 'bg-primary/15 text-primary border border-primary/40'
                  : candidate.subject === 'Chemistry'
                  ? 'bg-status-weak/15 text-status-weak border border-status-weak/40'
                  : 'bg-status-aligned/15 text-status-aligned border border-status-aligned/40'
              }`}
            >
              {candidate.subject}
            </span>
          )}

          {candidate.suggested_chapter && (
            <span className="text-label-sm-mono text-on-surface-variant text-xs truncate max-w-[180px] sm:max-w-xs">
              {candidate.suggested_chapter} &rsaquo; <strong className="text-on-surface">{candidate.suggested_topic}</strong>
            </span>
          )}

          {candidate.has_diagram && (
            <span className="px-1.5 py-0.5 bg-status-weak/10 border border-status-weak/30 text-status-weak text-[11px] rounded-sm flex items-center gap-1 font-mono">
              <ImageIcon className="w-3 h-3" />
              <span>Diagram</span>
            </span>
          )}

          {candidate.status === 'PUBLISHED' && (
            <span className="px-2 py-0.5 bg-status-aligned/20 border border-status-aligned/40 text-status-aligned text-[11px] rounded-sm flex items-center gap-1 font-mono font-bold">
              <Check className="w-3 h-3" />
              PUBLISHED
            </span>
          )}

          {candidate.status === 'REJECTED' && (
            <span className="px-2 py-0.5 bg-error/20 border border-error/40 text-error text-[11px] rounded-sm font-mono font-bold">
              REJECTED ({candidate.review_reason || 'Archived'})
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {onViewPdfPage && (
            <button
              onClick={() => onViewPdfPage(primaryPage, candidate.source_question_number)}
              className="px-2 py-1 text-label-sm-mono uppercase tracking-widest border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary transition-colors rounded-sm flex items-center gap-1 text-[11px] cursor-pointer"
              title="Inspect source PDF page"
            >
              <FileSearch className="w-3 h-3 text-primary" />
              <span>PDF P.{primaryPage}</span>
            </button>
          )}

          {onOpenCropper && (
            <button
              onClick={() => onOpenCropper(primaryPage, candidate.source_question_number, candidate.candidate_key, handleApplyCroppedImage, 'stem')}
              className="px-2 py-1 text-label-sm-mono uppercase tracking-widest border border-primary/60 bg-primary/10 hover:bg-primary hover:text-white text-primary transition-colors rounded-sm flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Open interactive cropping studio for this candidate"
            >
              <Crop className="w-3 h-3" />
              <span>Crop</span>
            </button>
          )}

          <button
            onClick={handleAutoCleanAndPolish}
            className="px-2 py-1 text-label-sm-mono uppercase tracking-widest border border-status-aligned/60 bg-status-aligned/10 hover:bg-status-aligned hover:text-black text-status-aligned transition-colors rounded-sm flex items-center gap-1 text-[11px] font-bold cursor-pointer"
            title="AI Auto-Format: standardize math, split choices, infer answer key"
          >
            <Wand2 className="w-3 h-3" />
            <span>AI Format</span>
          </button>

          {isExpanded && (
            <div className="flex items-center border border-white/20 bg-surface-dim p-0.5 rounded-xs">
              <button
                onClick={() => setViewMode('split')}
                className={`px-1.5 py-0.5 text-[10px] uppercase font-mono cursor-pointer ${
                  viewMode === 'split' ? 'bg-primary text-white font-bold' : 'text-white/50'
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-1.5 py-0.5 text-[10px] uppercase font-mono cursor-pointer ${
                  viewMode === 'preview' ? 'bg-primary text-white font-bold' : 'text-white/50'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('editor')}
                className={`px-1.5 py-0.5 text-[10px] uppercase font-mono cursor-pointer ${
                  viewMode === 'editor' ? 'bg-primary text-white font-bold' : 'text-white/50'
                }`}
              >
                Raw
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Editor Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 min-w-0 max-w-full">
          {/* Similar Questions Alert */}
          {similarQuestions.length > 0 && (
            <div className="bg-surface-container border border-outline-variant rounded p-3 space-y-2 min-w-0 overflow-hidden">
              <div className="text-label-sm-mono text-status-weak uppercase tracking-widest flex items-center gap-2 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                Potential Duplicates in Bank
              </div>
              {similarQuestions.map((sim, i) => (
                <div key={i} className="text-xs text-on-surface-variant border border-status-weak/30 p-2 overflow-x-auto">
                  <span className="font-mono text-status-weak mr-2 font-bold">{(sim.score * 100).toFixed(0)}% Match:</span>
                  <MathText text={sim.question.question_text || sim.question.content?.question_text} />
                </div>
              ))}
            </div>
          )}

          {viewMode !== 'preview' ? (
            <>
              {/* Question Stem Field */}
              <div className="space-y-1.5 min-w-0 max-w-full">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
                    Question Stem (LaTeX / Markdown)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAttachImage('stem')}
                      disabled={uploadingImage}
                      className="text-label-sm-mono text-on-surface-variant hover:text-primary uppercase tracking-widest text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>{uploadingImage && targetImageField === 'stem' ? 'Uploading...' : 'Upload Image'}</span>
                    </button>
                  </div>
                </div>

                {/* LaTeX Quick Insertion Toolbar */}
                <LatexSymbolBar onInsert={handleInsertLatex} />

                <textarea
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  rows={4}
                  className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface rounded-sm font-mono text-xs outline-none focus:border-primary transition-colors leading-relaxed"
                  placeholder="Enter question text with LaTeX formulas ($...$)..."
                />

                {/* Live MathText Preview when in split view */}
                {viewMode === 'split' && questionText && (
                  <div className="p-3 bg-surface-container/50 border border-outline-variant rounded-sm text-sm">
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest pb-1 border-b border-white/5 mb-2">
                      Live KaTeX Preview:
                    </div>
                    <MathText text={questionText} />
                  </div>
                )}
              </div>

              {/* Multiple Choice Options (A-D) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
                    Choices &amp; Answer Key
                  </label>
                  <span className="text-[11px] font-mono text-primary font-bold">
                    Correct: Option {correctAnswer}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {options.map((opt, i) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 border rounded-sm transition-colors ${
                        correctAnswer === opt.id
                          ? 'border-status-aligned bg-status-aligned/5 ring-1 ring-status-aligned'
                          : 'border-outline-variant bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setCorrectAnswer(opt.id)}
                          className={`px-2 py-0.5 text-xs font-mono font-bold rounded-xs cursor-pointer ${
                            correctAnswer === opt.id
                              ? 'bg-status-aligned text-black'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          Option {opt.id} {correctAnswer === opt.id && '✓'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachImage(`opt${opt.id}`)}
                          className="text-[10px] font-mono text-white/50 hover:text-primary flex items-center gap-1 cursor-pointer"
                          title={`Attach diagram to Option ${opt.id}`}
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Image</span>
                        </button>
                      </div>

                      <input
                        value={opt.text}
                        onChange={e => updateOption(i, e.target.value)}
                        placeholder={`Option ${opt.id} text or math...`}
                        className="w-full bg-black/40 border border-outline-variant p-2 text-on-surface rounded-xs font-mono text-xs outline-none focus:border-primary"
                      />

                      {opt.text && (
                        <div className="mt-1.5 text-xs text-white/80">
                          <MathText text={opt.text} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Solution / Explanation Text */}
              <div className="space-y-1">
                <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
                  Solution Derivation (Optional)
                </label>
                <textarea
                  value={solutionText}
                  onChange={e => setSolutionText(e.target.value)}
                  rows={2}
                  className="w-full bg-surface-container border border-outline-variant p-2.5 text-on-surface rounded-sm font-mono text-xs outline-none focus:border-primary"
                  placeholder="Derivation / explanation steps (LaTeX)..."
                />
              </div>
            </>
          ) : (
            /* Full Preview View */
            <div className="space-y-4 p-4 bg-surface-container rounded-sm border border-outline-variant">
              <div className="text-sm text-on-surface leading-relaxed">
                <MathText text={questionText} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant">
                {options.map(opt => (
                  <div
                    key={opt.id}
                    className={`p-3 border rounded-sm flex items-start gap-2 ${
                      correctAnswer === opt.id
                        ? 'border-status-aligned bg-status-aligned/10'
                        : 'border-outline-variant bg-surface-dim'
                    }`}
                  >
                    <span className="font-bold font-mono text-xs">{opt.id}.</span>
                    <div className="text-xs">
                      <MathText text={opt.text} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curriculum Mapping & Verification Action Bar */}
          <div className="pt-3 border-t border-outline-variant space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Syllabus Topic Selector */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-white/50 uppercase tracking-wider text-[10px] block font-semibold">
                  Curriculum Topic (Required to Publish)
                </label>
                <TopicSelect
                  value={topicId}
                  onChange={setTopicId}
                  groupedTopics={groupedTopics}
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-1">
                <label className="text-white/50 uppercase tracking-wider text-[10px] block font-semibold">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant p-2 text-on-surface outline-none focus:border-primary rounded-sm text-xs uppercase"
                >
                  <option value="easy">Easy (JEE Main)</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="hard">Hard (Advanced)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={findSimilar}
                  disabled={searchingSimilar}
                  className="px-3 py-1.5 border border-white/20 hover:border-primary text-white text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Search className="w-3 h-3" />
                  <span>{searchingSimilar ? 'Checking...' : 'Check Duplicates'}</span>
                </button>

                {/* Reject dropdown */}
                <select
                  onChange={e => {
                    if (e.target.value) {
                      reject(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="bg-error/10 border border-error/40 text-error p-1.5 text-xs outline-none uppercase font-bold cursor-pointer rounded-xs"
                >
                  <option value="">Archive / Reject...</option>
                  {REJECTION_PRESETS.map((p, i) => (
                    <option key={i} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={accept}
                disabled={saving || !topicId}
                className={`px-5 py-2 uppercase tracking-widest font-bold text-xs flex items-center gap-2 rounded-sm transition-all ${
                  topicId && !saving
                    ? 'bg-primary text-white hover:brightness-110 shadow-md cursor-pointer'
                    : 'bg-surface-container border border-outline-variant text-on-surface-variant cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Publishing...' : 'Verify & Publish (Ctrl+Enter)'}</span>
              </button>
            </div>

            {error && (
              <div className="p-2.5 border border-error/40 bg-error/10 text-error text-xs font-mono font-semibold rounded-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * Main Content Operations Hub Page
 */
export default function ContentAdminPage() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [topics, setTopics] = useState([]);

  // Active Layout Mode: 'studio' (Split-Screen) | 'feed' (Cards List) | 'queue' (Paper Queue)
  const [layoutMode, setLayoutMode] = useState('studio');

  // Studio Mode Active Candidate Index
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);

  // Multi-Selection State for Bulk Operations
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState(new Set());

  // Bulk Modal State
  const [bulkTopicModalOpen, setBulkTopicModalOpen] = useState(false);
  const [bulkTargetTopicId, setBulkTargetTopicId] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Responsive Sidebar Toggle
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ALL'
  const [subjectFilter, setSubjectFilter] = useState('ALL'); // 'ALL' | 'Physics' | 'Chemistry' | 'Mathematics'
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDiagrams, setOnlyDiagrams] = useState(false);

  // Pagination for Feed Mode
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Ingestion Form State
  const [file, setFile] = useState(null);
  const [exam, setExam] = useState('JEE Main');
  const [year, setYear] = useState('2018');
  const [session, setSession] = useState('Shift 1');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Full-screen Modal PDF Cropping
  const [cropperModal, setCropperModal] = useState(null);

  // Studio Mode PDF page state
  const [studioPageNum, setStudioPageNum] = useState(1);

  const loadJobs = async () => {
    try {
      const jList = await contentService.listJobs();
      setJobs(jList);
      if (!selectedJob && jList.length > 0) {
        chooseJob(jList[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const chooseJob = async (job) => {
    setSelectedJob(job);
    setCandidates([]);
    setSelectedCandidateKeys(new Set());
    setError('');
    setCurrentPage(1);
    setActiveCandidateIndex(0);
    try {
      const cands = await contentService.getCandidates(job.job_id);
      setCandidates(cands);
      if (cands.length > 0 && cands[0].source_pages?.[0]) {
        setStudioPageNum(cands[0].source_pages[0]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const job = await contentService.uploadPdf(file, { exam, year, metadata: { session } });
      await loadJobs();
      await chooseJob(job);
      setFile(null);
      event.target.reset();
      if (job?.already_existed) {
        alert(`This PDF was already uploaded previously (Job ID: ${job.job_id}).\nLoaded existing candidate questions and page extractions.`);
      }
    } catch (err) {
      if (err.message && (err.message.includes('already exists') || err.message.includes('409'))) {
        try {
          const jList = await contentService.listJobs();
          setJobs(jList);
          const matching = jList.find(j => j.filename === file.name || j.metadata?.filename === file.name);
          if (matching) {
            await chooseJob(matching);
            setFile(null);
            event.target.reset();
            alert(`This PDF was already uploaded previously (Job ID: ${matching.job_id}).\nLoaded existing candidate questions.`);
            return;
          }
        } catch (_) {}
      }
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (statusFilter === 'PENDING' && c.status !== 'REVIEW_REQUIRED') return false;
      if (statusFilter === 'PUBLISHED' && c.status !== 'PUBLISHED') return false;
      if (statusFilter === 'REJECTED' && c.status !== 'REJECTED') return false;

      if (subjectFilter !== 'ALL' && c.subject !== subjectFilter) return false;
      if (onlyDiagrams && !c.has_diagram) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQNum = String(c.source_question_number) === query;
        const matchesText = (c.question_text || c.raw_text || '').toLowerCase().includes(query);
        const matchesChapter = (c.suggested_chapter || '').toLowerCase().includes(query);
        if (!matchesQNum && !matchesText && !matchesChapter) return false;
      }
      return true;
    });
  }, [candidates, statusFilter, subjectFilter, onlyDiagrams, searchQuery]);

  // Active candidate in Studio Mode
  const activeCandidate = useMemo(() => {
    if (filteredCandidates.length === 0) return null;
    return filteredCandidates[activeCandidateIndex] || filteredCandidates[0] || null;
  }, [filteredCandidates, activeCandidateIndex]);

  // Sync studio PDF page when active candidate changes
  useEffect(() => {
    if (activeCandidate?.source_pages?.[0]) {
      setStudioPageNum(activeCandidate.source_pages[0]);
    }
  }, [activeCandidate]);

  // Multi-Selection helpers
  const handleToggleSelectCandidate = (candidateKey) => {
    setSelectedCandidateKeys(prev => {
      const next = new Set(prev);
      if (next.has(candidateKey)) next.delete(candidateKey);
      else next.add(candidateKey);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedCandidateKeys.size === filteredCandidates.length) {
      setSelectedCandidateKeys(new Set());
    } else {
      setSelectedCandidateKeys(new Set(filteredCandidates.map(c => c.candidate_key)));
    }
  };

  // Bulk Operations
  const handleExecuteBulkAssignTopic = async () => {
    if (!selectedJob || selectedCandidateKeys.size === 0 || !bulkTargetTopicId) return;
    setBulkProcessing(true);
    try {
      const targetTopicObj = topics.find(t => t.id === bulkTargetTopicId);
      const curriculumMeta = targetTopicObj ? {
        topic: targetTopicObj.name,
        chapter: targetTopicObj.chapter,
        subject: targetTopicObj.subject
      } : {};

      await contentService.bulkAssignTopic(
        selectedJob.job_id,
        Array.from(selectedCandidateKeys),
        bulkTargetTopicId,
        curriculumMeta
      );

      await chooseJob(selectedJob);
      setBulkTopicModalOpen(false);
      setBulkTargetTopicId('');
      setSelectedCandidateKeys(new Set());
      alert(`Successfully updated topic for ${selectedCandidateKeys.size} candidates!`);
    } catch (err) {
      alert('Bulk assign error: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleExecuteBulkPublishReady = async () => {
    if (!selectedJob || selectedCandidateKeys.size === 0) return;
    const candidatesToPublish = candidates
      .filter(c => selectedCandidateKeys.has(c.candidate_key) && c.suggested_topic_id && c.status !== 'PUBLISHED');

    if (candidatesToPublish.length === 0) {
      alert('None of the selected candidates have curriculum topics assigned, or they are already published.');
      return;
    }

    if (!window.confirm(`Publish all ${candidatesToPublish.length} ready questions to the Question Bank?`)) return;

    setBulkProcessing(true);
    try {
      const payloads = candidatesToPublish.map(c => ({
        candidate_key: c.candidate_key,
        draft: {
          question_text: c.question_text || c.raw_text,
          options: [
            { id: 'A', text: c.options?.A || '' },
            { id: 'B', text: c.options?.B || '' },
            { id: 'C', text: c.options?.C || '' },
            { id: 'D', text: c.options?.D || '' }
          ],
          correct_answer: c.correct_answer || 'A',
          solution_text: c.solution_text || null,
          difficulty: 'medium',
          source_type: 'PYQ',
          question_type: 'single_correct',
          curriculum: {
            topic_id: c.suggested_topic_id,
            difficulty: 'medium',
            subject: c.subject,
            chapter: c.suggested_chapter
          }
        }
      }));

      const res = await contentService.bulkAcceptCandidates(selectedJob.job_id, payloads);
      await chooseJob(selectedJob);
      setSelectedCandidateKeys(new Set());
      alert(`Bulk publication complete: ${res.accepted_count} published, ${res.failed_count} failed.`);
    } catch (err) {
      alert('Bulk publish error: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleExecuteBulkReject = async (presetReason) => {
    if (!selectedJob || selectedCandidateKeys.size === 0 || !presetReason) return;
    if (!window.confirm(`Archive / Reject ${selectedCandidateKeys.size} selected candidates as "${presetReason}"?`)) return;

    setBulkProcessing(true);
    try {
      await contentService.bulkRejectCandidates(
        selectedJob.job_id,
        Array.from(selectedCandidateKeys),
        presetReason
      );
      await chooseJob(selectedJob);
      setSelectedCandidateKeys(new Set());
    } catch (err) {
      alert('Bulk reject error: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };



  // Modal Cropper Handlers
  const handleOpenCropper = async (pageNum, qNum, candidateKey, onApply, defaultTarget = 'stem') => {
    if (!selectedJob) return;
    const page = Number(pageNum) || 1;
    setCropperModal({
      jobId: selectedJob.job_id,
      pageNum: page,
      qNum,
      candidateKey,
      onApply,
      defaultTarget,
      loading: true,
      dataUrl: null,
      width: 595.3,
      height: 841.9,
      error: null
    });
    try {
      const res = await contentService.renderPdfPage(selectedJob.job_id, page, 150);
      if (res && res.success === false) {
        setCropperModal(prev => ({
          ...prev,
          loading: false,
          error: res.error || 'Failed to render PDF page'
        }));
        return;
      }
      setCropperModal(prev => ({
        ...prev,
        loading: false,
        dataUrl: res.data_url,
        width: res.width || 595.3,
        height: res.height || 841.9
      }));
    } catch (err) {
      setCropperModal(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  const handleCropperNavigatePage = async (delta) => {
    if (!cropperModal || !selectedJob) return;
    const newPage = Math.max(1, cropperModal.pageNum + delta);
    setCropperModal(prev => ({
      ...prev,
      pageNum: newPage,
      loading: true,
      dataUrl: null,
      error: null
    }));
    try {
      const res = await contentService.renderPdfPage(selectedJob.job_id, newPage, 150);
      if (res && res.success === false) {
        setCropperModal(prev => ({
          ...prev,
          loading: false,
          error: res.error || 'Failed to render PDF page'
        }));
        return;
      }
      setCropperModal(prev => ({
        ...prev,
        loading: false,
        dataUrl: res.data_url,
        width: res.width || 595.3,
        height: res.height || 841.9
      }));
    } catch (err) {
      setCropperModal(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  const handleExecuteModalCrop = async (rect, target) => {
    if (!cropperModal || !selectedJob) return;
    const res = await contentService.cropPdfDiagram(selectedJob.job_id, cropperModal.pageNum, rect, 300);
    if (cropperModal.onApply && res.url) {
      cropperModal.onApply(target, res.url);
    }
    return res;
  };

  const handleStudioDirectCrop = async (rect, target, customUrl = null) => {
    if (!selectedJob || !activeCandidate) return;
    let imageUrl = customUrl;
    if (!imageUrl) {
      const res = await contentService.cropPdfDiagram(selectedJob.job_id, studioPageNum, rect, 300);
      imageUrl = res?.url;
    }
    if (!imageUrl) return;

    setCandidates(prev => prev.map(c => {
      if (c.candidate_key !== activeCandidate.candidate_key) return c;
      const draft = { ...(c.review_draft || c.suggested_draft || {}) };
      if (target === 'stem') {
        draft.question_text = (draft.question_text || '') + `\n\n![diagram](${imageUrl})\n`;
      } else {
        const optKey = target === 'optA' ? 'A' : target === 'optB' ? 'B' : target === 'optC' ? 'C' : 'D';
        draft.options = (draft.options || []).map(o => {
          if (o.key !== optKey) return o;
          return { ...o, text: (o.text || '') + ` ![diagram](${imageUrl})` };
        });
      }
      return { ...c, review_draft: draft };
    }));
    return { url: imageUrl };
  };

  const [deleteJobConfirm, setDeleteJobConfirm] = useState(null); // { jobId, jobName, loading: false }

  const handlePromptDeleteJob = (jobId, jobName) => {
    setDeleteJobConfirm({ jobId, jobName, loading: false });
  };

  const handleExecuteDeleteJob = async () => {
    if (!deleteJobConfirm?.jobId) return;
    try {
      setDeleteJobConfirm(prev => ({ ...prev, loading: true }));
      await contentService.deleteJob(deleteJobConfirm.jobId);
      const deletedId = deleteJobConfirm.jobId;
      setDeleteJobConfirm(null);
      // Reload jobs
      const res = await contentService.listJobs();
      const safe = Array.isArray(res) ? res : (res?.jobs || []);
      setJobs(safe);
      if (selectedJob?.job_id === deletedId) {
        if (safe.length > 0) {
          chooseJob(safe[0]);
        } else {
          setSelectedJob(null);
          setCandidates([]);
          setLayoutMode('queue');
        }
      }
    } catch (err) {
      alert('Failed to delete job: ' + (err.message || 'Unknown error'));
      setDeleteJobConfirm(prev => ({ ...prev, loading: false }));
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore when typing inside input / textarea
      const tag = e.target?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea';

      // Alt + ArrowRight: Next candidate
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveCandidateIndex(i => Math.min(filteredCandidates.length - 1, i + 1));
      }

      // Alt + ArrowLeft: Previous candidate
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveCandidateIndex(i => Math.max(0, i - 1));
      }

      // ? or Shift + /: Open shortcuts modal
      if (!isInput && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCandidates.length]);

  // Initial topics & jobs load
  useEffect(() => {
    loadJobs();
    topicsService.getTopics()
      .then(hierarchy => setTopics(hierarchy.flatMap(subject =>
        (subject.chapters || []).flatMap(chapter => (chapter.topics || []).map(topic => ({
          id: topic.id, name: topic.name, chapter: chapter.name, subject: subject.name
        })))
      )))
      .catch(err => setError(err.message));
  }, []);

  const groupedTopics = useMemo(() => {
    const groups = {};
    for (const t of topics) {
      const subj = t.subject || 'Other';
      if (!groups[subj]) groups[subj] = [];
      groups[subj].push(t);
    }
    return groups;
  }, [topics]);

  const kpis = useMemo(() => {
    const totalJobs = jobs.length;
    const totalCandidates = candidates.length;
    const pending = candidates.filter(c => c.status === 'REVIEW_REQUIRED').length;
    const published = candidates.filter(c => c.status === 'PUBLISHED').length;
    const rejected = candidates.filter(c => c.status === 'REJECTED').length;
    return { totalJobs, totalCandidates, pending, published, rejected };
  }, [jobs, candidates]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCandidates.slice(start, start + pageSize);
  }, [filteredCandidates, currentPage, pageSize]);

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 pb-28 text-on-surface">
      {/* Title & Top Studio Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl text-on-surface font-light lowercase tracking-tight">content ops</h2>
            <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono uppercase tracking-widest font-bold">
              Studio Pro
            </span>
          </div>
          <p className="text-on-surface-variant text-sm font-light mt-0.5">
            Side-by-side high-res PDF verification studio, instant 300 DPI vector cropping, and batch curriculum publishing.
          </p>
        </div>

        {/* Layout Mode Switcher & Tools */}
        <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
          {/* Studio / Feed / Queue Tabs */}
          <div className="flex items-center border border-white/20 bg-surface-container p-0.5">
            <button
              onClick={() => setLayoutMode('studio')}
              className={`px-3 py-1.5 uppercase font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                layoutMode === 'studio' ? 'bg-primary text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Studio (Split)</span>
            </button>
            <button
              onClick={() => setLayoutMode('feed')}
              className={`px-3 py-1.5 uppercase font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                layoutMode === 'feed' ? 'bg-primary text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Feed</span>
            </button>
            <button
              onClick={() => setLayoutMode('queue')}
              className={`px-3 py-1.5 uppercase font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                layoutMode === 'queue' ? 'bg-primary text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Queue</span>
            </button>
          </div>

          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="px-2.5 py-1.5 border border-white/20 bg-surface-container hover:border-primary text-white/70 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            title="Keyboard shortcuts (Press ?)"
          >
            <Keyboard className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>

          <Link
            to={selectedJob ? `/admin/pipeline?jobId=${selectedJob.job_id}` : '/admin/pipeline'}
            className="px-3 py-1.5 bg-primary/10 border border-primary/40 hover:bg-primary hover:text-white text-primary uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Inspect end-to-end visual pipeline & live job flight tracking"
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Visual Pipeline</span>
          </Link>
        </div>
      </div>

      {/* AMOLED Metric Live Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="bg-surface-container border border-outline-variant p-3 rounded-sm">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-[10px]">Ingestion Papers</div>
          <div className="text-xl sm:text-2xl font-light text-primary mt-0.5">{kpis.totalJobs}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant p-3 rounded-sm">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-[10px]">In Selected Paper</div>
          <div className="text-xl sm:text-2xl font-light text-on-surface mt-0.5">{kpis.totalCandidates}</div>
        </div>
        <div className="bg-surface-container border border-status-weak/30 p-3 rounded-sm bg-status-weak/5">
          <div className="text-label-sm-mono text-status-weak uppercase tracking-widest text-[10px] font-bold">Awaiting Review</div>
          <div className="text-xl sm:text-2xl font-light text-status-weak mt-0.5">{kpis.pending}</div>
        </div>
        <div className="bg-surface-container border border-status-aligned/30 p-3 rounded-sm bg-status-aligned/5">
          <div className="text-label-sm-mono text-status-aligned uppercase tracking-widest text-[10px] font-bold">Published To Bank</div>
          <div className="text-xl sm:text-2xl font-light text-status-aligned mt-0.5">{kpis.published}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant p-3 rounded-sm col-span-2 sm:col-span-1">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-[10px]">Archived / Rejected</div>
          <div className="text-xl sm:text-2xl font-light text-on-surface-variant mt-0.5">{kpis.rejected}</div>
        </div>
      </div>

      {/* Exam Ingestion Dropzone (Shown in Queue mode or as collapsible) */}
      {layoutMode === 'queue' && (
        <form onSubmit={upload} className="acrylic border border-outline-variant rounded-sm p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end max-w-full overflow-hidden">
          <div className="sm:col-span-2 space-y-1.5 min-w-0">
            <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-[11px] font-bold">
              Source Exam Paper (PDF)
            </label>
            <div className="relative">
              <input
                required
                type="file"
                accept="application/pdf,.pdf"
                onChange={e => setFile(e.target.files[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`w-full bg-surface-container border ${file ? 'border-primary' : 'border-outline-variant'} border-dashed p-2.5 flex items-center justify-center gap-2 rounded-sm transition-colors overflow-hidden`}>
                <UploadCloud className="w-4 h-4 text-primary shrink-0" />
                <span className={`text-xs truncate ${file ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                  {file ? file.name : 'Click or drag PDF here'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-[11px] font-bold">
              Examination
            </label>
            <select
              value={exam}
              onChange={e => setExam(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant p-2.5 text-on-surface outline-none focus:border-primary rounded-sm text-xs"
            >
              <option value="JEE Main">JEE Main</option>
              <option value="JEE Advanced">JEE Advanced</option>
              <option value="NEET">NEET</option>
              <option value="BITSAT">BITSAT</option>
            </select>
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-[11px] font-bold">
              Exam Year
            </label>
            <input
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="YYYY (e.g. 2018)"
              className="w-full bg-surface-container border border-outline-variant p-2.5 text-on-surface outline-none focus:border-primary rounded-sm text-xs font-mono"
            />
          </div>

          <div className="min-w-0">
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-primary text-white p-2.5 uppercase tracking-widest font-bold hover:brightness-110 transition-all disabled:opacity-50 rounded-sm text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{uploading ? 'Ingesting...' : 'Ingest Paper'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Selected Job Status Strip & Paper Selector */}
      <div className="p-3 bg-surface-container border border-outline-variant rounded-sm flex items-center justify-between gap-3 flex-wrap font-mono text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white/50 uppercase font-bold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Active Paper:</span>
          </span>

          {jobs.length > 0 ? (
            <select
              value={selectedJob?.job_id || ''}
              onChange={e => {
                const j = jobs.find(x => x.job_id === e.target.value);
                if (j) chooseJob(j);
              }}
              className="bg-black border border-white/20 text-white p-1.5 text-xs outline-none focus:border-primary uppercase font-bold"
            >
              {jobs.map(j => (
                <option key={j.job_id} value={j.job_id}>
                  {j.source?.filename || j.job_id} &mdash; [{j.stage}]
                </option>
              ))}
            </select>
          ) : (
            <span className="text-white/40 italic">No papers ingested yet.</span>
          )}
        </div>

        {selectedJob && (
          <div className="flex items-center gap-3 text-[11px] text-white/60">
            <span>Stage: <strong className="text-primary">{selectedJob.stage}</strong></span>
            <span>Total Qs: <strong className="text-white">{candidates.length}</strong></span>
            <span>Filtered: <strong className="text-white">{filteredCandidates.length}</strong></span>

            <button
              onClick={() => handlePromptDeleteJob(selectedJob.job_id, selectedJob.source?.filename || selectedJob.job_id)}
              className="px-2 py-1 text-error hover:bg-error/15 border border-error/40 hover:border-error text-[10px] font-mono uppercase font-bold rounded-xs flex items-center gap-1 transition-colors cursor-pointer ml-2"
              title="Permanently delete this ingestion job and candidates"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Job</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── STUDIO MODE: SPLIT-SCREEN WORKSPACE ─── */}
      {layoutMode === 'studio' && selectedJob && (
        <section className="space-y-4">
          {/* Quick Filter Strip for Studio Mode */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-mono border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-white/40 uppercase text-[10px]">Filter:</span>
              {['PENDING', 'PUBLISHED', 'REJECTED', 'ALL'].map(st => (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setActiveCandidateIndex(0); }}
                  className={`px-2 py-0.5 rounded-xs text-[10px] uppercase font-bold border cursor-pointer ${
                    statusFilter === st
                      ? 'bg-primary text-white border-primary'
                      : 'border-white/15 text-white/60 hover:text-white bg-black/40'
                  }`}
                >
                  {st}
                </button>
              ))}
              <div className="h-3 w-px bg-white/20 mx-1" />
              {['ALL', 'Physics', 'Chemistry', 'Mathematics'].map(subj => (
                <button
                  key={subj}
                  onClick={() => { setSubjectFilter(subj); setActiveCandidateIndex(0); }}
                  className={`px-2 py-0.5 rounded-xs text-[10px] uppercase font-bold border cursor-pointer ${
                    subjectFilter === subj
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'border-white/15 text-white/60 hover:text-white bg-black/40'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>

            {/* Candidate Stepper Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveCandidateIndex(i => Math.max(0, i - 1))}
                disabled={activeCandidateIndex <= 0}
                className="px-2 py-1 border border-white/20 rounded hover:border-primary disabled:opacity-30 cursor-pointer flex items-center gap-1"
                title="Previous question (Alt + Left)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="px-2 text-white font-bold text-xs">
                {filteredCandidates.length > 0 ? `${activeCandidateIndex + 1} / ${filteredCandidates.length}` : '0 / 0'}
              </span>
              <button
                onClick={() => setActiveCandidateIndex(i => Math.min(filteredCandidates.length - 1, i + 1))}
                disabled={activeCandidateIndex >= filteredCandidates.length - 1}
                className="px-2 py-1 border border-white/20 rounded hover:border-primary disabled:opacity-30 cursor-pointer flex items-center gap-1"
                title="Next question (Alt + Right)"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Split Screen Columns: Left (PDF) & Right (Active Question Editor) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start min-h-[620px]">
            {/* Left Pane: High-Res PDF Page Canvas with Integrated Drag-to-Crop */}
            <div className="h-[680px] w-full min-w-0">
              <StudioPdfViewer
                jobId={selectedJob.job_id}
                pageNum={studioPageNum}
                onNavigatePage={delta => setStudioPageNum(p => Math.max(1, p + delta))}
                onDirectCrop={handleStudioDirectCrop}
                activeCandidateKey={activeCandidate?.candidate_key}
                activeQNum={activeCandidate?.source_question_number}
              />
            </div>

            {/* Right Pane: Active Question Editor */}
            <div className="h-[680px] w-full min-w-0 overflow-y-auto pr-1">
              {activeCandidate ? (
                <CandidateCard
                  key={activeCandidate.candidate_key}
                  candidate={activeCandidate}
                  jobId={selectedJob.job_id}
                  groupedTopics={groupedTopics}
                  onReviewed={() => {
                    chooseJob(selectedJob);
                    setActiveCandidateIndex(i => Math.min(filteredCandidates.length - 1, i + 1));
                  }}
                  onViewPdfPage={(p) => setStudioPageNum(p)}
                  onOpenCropper={handleOpenCropper}
                  isSelected={selectedCandidateKeys.has(activeCandidate.candidate_key)}
                  onToggleSelect={() => handleToggleSelectCandidate(activeCandidate.candidate_key)}
                />
              ) : (
                <div className="p-12 border border-white/10 rounded bg-surface-dim text-center space-y-2 text-white/50 font-mono text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-status-aligned opacity-80" />
                  <p className="text-white font-semibold">No questions matching filter.</p>
                  <p>Try switching filter to ALL or clearing query.</p>
                </div>
              )}
            </div>
          </div>

          {/* Studio Mode Bottom Question Palette Strip */}
          {filteredCandidates.length > 0 && (
            <div className="p-3 bg-surface-container border border-outline-variant rounded-sm space-y-2 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/50 text-[11px] uppercase font-bold">
                  Questions Palette ({filteredCandidates.length} Items):
                </span>
                <button
                  onClick={handleSelectAllFiltered}
                  className="text-primary hover:underline text-[11px] uppercase cursor-pointer"
                >
                  {selectedCandidateKeys.size === filteredCandidates.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {filteredCandidates.map((c, idx) => {
                  const isCurrent = idx === activeCandidateIndex;
                  const isChecked = selectedCandidateKeys.has(c.candidate_key);
                  const isPub = c.status === 'PUBLISHED';
                  const isRej = c.status === 'REJECTED';

                  return (
                    <button
                      key={c.candidate_key}
                      onClick={() => setActiveCandidateIndex(idx)}
                      className={`px-2.5 py-1.5 rounded text-xs font-bold shrink-0 transition-all border cursor-pointer ${
                        isCurrent
                          ? 'border-primary bg-primary text-white shadow-md ring-2 ring-primary/80 scale-105'
                          : isPub
                          ? 'border-status-aligned/40 bg-status-aligned/10 text-status-aligned hover:border-status-aligned'
                          : isRej
                          ? 'border-error/40 bg-error/10 text-error hover:border-error'
                          : 'border-white/15 bg-black/50 text-white/70 hover:border-white/40'
                      }`}
                      title={`Q.${c.source_question_number} (P.${c.source_pages?.[0]}) - ${c.status}`}
                    >
                      <span>Q.{c.source_question_number}</span>
                      {c.has_diagram && <span className="ml-1 text-[9px]">🖼️</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── FEED MODE: PAGINATED FULL-WIDTH CARDS ─── */}
      {layoutMode === 'feed' && selectedJob && (
        <section className="space-y-4">
          {/* Header Controls & Multi-Select Bar */}
          <div className="flex justify-between items-center flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1 border border-white/20 bg-surface-container text-white hover:border-primary rounded-sm uppercase text-[11px] cursor-pointer"
              >
                {selectedCandidateKeys.size === filteredCandidates.length ? 'Deselect All' : 'Select All'}
              </button>

              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-surface-container border border-outline-variant px-2 py-1 rounded-sm text-xs text-on-surface outline-none"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 border border-outline-variant rounded-sm hover:border-primary disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="px-2 py-1 text-primary font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 border border-outline-variant rounded-sm hover:border-primary disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {paginatedCandidates.map(candidate => (
              <CandidateCard
                key={candidate.candidate_key}
                candidate={candidate}
                jobId={selectedJob.job_id}
                groupedTopics={groupedTopics}
                onReviewed={() => chooseJob(selectedJob)}
                onViewPdfPage={(p, q) => handleOpenCropper(p, q, null, null, 'stem')}
                onOpenCropper={handleOpenCropper}
                isSelected={selectedCandidateKeys.has(candidate.candidate_key)}
                onToggleSelect={() => handleToggleSelectCandidate(candidate.candidate_key)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── QUEUE MODE: PAPER INGESTION DETAILS ─── */}
      {layoutMode === 'queue' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobs.map(job => (
              <div
                key={job.job_id}
                onClick={() => { chooseJob(job); setLayoutMode('studio'); }}
                className={`p-4 border rounded transition-all cursor-pointer ${
                  selectedJob?.job_id === job.job_id
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-outline-variant bg-surface-dim hover:border-white/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-white text-sm truncate max-w-[220px]">
                    {job.source?.filename || job.job_id}
                  </h4>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                    job.stage === 'COMPLETED' ? 'bg-status-aligned/20 text-status-aligned' : 'bg-primary/20 text-primary'
                  }`}>
                    {job.stage}
                  </span>
                </div>
                <div className="text-xs font-mono text-white/50 mt-2 space-y-1">
                  <div>Exam: {job.source?.exam} {job.source?.year}</div>
                  <div>Pages: {job.progress?.total_pages || '?'} &bull; Extracted: {job.progress?.questions_extracted || 0}</div>
                </div>
                <div className="pt-3 mt-3 border-t border-white/10 flex justify-between items-center text-xs font-mono text-primary">
                  <div className="flex items-center gap-3">
                    <span>Open in Studio &rarr;</span>
                    <Link
                      to={`/admin/pipeline?jobId=${job.job_id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-white/40 hover:text-white"
                    >
                      Pipeline
                    </Link>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePromptDeleteJob(job.job_id, job.source?.filename || job.job_id);
                    }}
                    className="p-1 text-white/40 hover:text-error hover:bg-error/15 rounded transition-colors cursor-pointer"
                    title="Delete entire job and extracted candidates"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── FLOATING BULK ACTIONS BOTTOM DOCK ─── */}
      {selectedCandidateKeys.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-2xl bg-black/95 border-2 border-primary shadow-2xl p-3 z-40 rounded-md backdrop-blur-md flex items-center justify-between gap-3 text-xs font-mono animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-white font-bold">
              {selectedCandidateKeys.size} Selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Assign Topic */}
            <button
              onClick={() => setBulkTopicModalOpen(true)}
              className="px-3 py-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/40 font-bold uppercase rounded-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Assign Topic</span>
            </button>

            {/* Bulk Publish Ready */}
            <button
              onClick={handleExecuteBulkPublishReady}
              disabled={bulkProcessing}
              className="px-3 py-1.5 bg-status-aligned text-black hover:brightness-110 font-bold uppercase rounded-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Publish Ready</span>
            </button>

            {/* Bulk Reject */}
            <select
              onChange={e => {
                if (e.target.value) {
                  handleExecuteBulkReject(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-error/20 border border-error/40 text-error p-1.5 text-xs outline-none uppercase font-bold cursor-pointer rounded-xs"
            >
              <option value="">Bulk Reject...</option>
              {REJECTION_PRESETS.map((p, i) => (
                <option key={i} value={p}>{p}</option>
              ))}
            </select>

            <button
              onClick={() => setSelectedCandidateKeys(new Set())}
              className="p-1.5 text-white/50 hover:text-white cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Assign Topic Modal */}
      {bulkTopicModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setBulkTopicModalOpen(false)}
        >
          <div
            className="bg-surface-dim border-2 border-primary rounded-sm p-6 w-full max-w-lg space-y-4 shadow-2xl font-mono text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-white font-bold text-sm uppercase">
                  Bulk Assign Topic ({selectedCandidateKeys.size} Questions)
                </span>
              </div>
              <button
                onClick={() => setBulkTopicModalOpen(false)}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-white/70 text-xs font-light">
              Select a curriculum topic to assign across all {selectedCandidateKeys.size} selected questions.
            </p>

            <TopicSelect
              value={bulkTargetTopicId}
              onChange={setBulkTargetTopicId}
              groupedTopics={groupedTopics}
              className="w-full"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setBulkTopicModalOpen(false)}
                className="px-4 py-2 border border-white/20 text-white hover:border-white/40 uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkAssignTopic}
                disabled={!bulkTargetTopicId || bulkProcessing}
                className="px-5 py-2 bg-primary text-white font-bold uppercase hover:brightness-110 disabled:opacity-40"
              >
                {bulkProcessing ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Reference Dialog */}
      {shortcutsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShortcutsModalOpen(false)}
        >
          <div
            className="bg-surface-dim border border-outline-variant rounded-sm p-6 w-full max-w-md space-y-4 shadow-2xl font-mono text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-primary" />
                <span className="text-white font-bold text-sm uppercase">
                  Content Ops Hotkeys
                </span>
              </div>
              <button onClick={() => setShortcutsModalOpen(false)} className="text-white/50 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { key: 'Ctrl + Enter', desc: 'Verify & Publish active question to bank' },
                { key: 'Alt + Right', desc: 'Navigate to Next candidate' },
                { key: 'Alt + Left', desc: 'Navigate to Previous candidate' },
                { key: '?', desc: 'Open / close this shortcuts reference' }
              ].map((hk, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-black/40 border border-white/10 rounded-xs">
                  <span className="text-white/70 text-xs">{hk.desc}</span>
                  <kbd className="px-2 py-0.5 bg-primary/20 border border-primary/40 text-primary font-bold rounded-xs text-[11px]">
                    {hk.key}
                  </kbd>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShortcutsModalOpen(false)}
              className="w-full py-2 bg-primary text-white font-bold uppercase hover:brightness-110 text-center"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen PDF Modal Cropper fallback */}
      {cropperModal && (
        <PdfCroppingStudioModal
          modal={cropperModal}
          onClose={() => setCropperModal(null)}
          onCrop={handleExecuteModalCrop}
          onNavigatePage={handleCropperNavigatePage}
        />
      )}

      {/* ─── DELETE COMPLETE JOB CONFIRMATION MODAL ─── */}
      {deleteJobConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0d13] border-2 border-error/50 p-6 rounded max-w-md w-full shadow-2xl font-mono text-xs space-y-4 animate-scale-up text-left">
            <div className="flex items-center gap-2 text-error font-bold uppercase tracking-wider text-sm border-b border-error/30 pb-3">
              <AlertTriangle className="w-5 h-5 text-error" />
              <span>Delete Ingestion Job</span>
            </div>

            <p className="text-white/80 leading-relaxed font-sans text-xs">
              Are you sure you want to permanently delete job{' '}
              <strong className="text-white font-mono">{deleteJobConfirm.jobName}</strong>?
            </p>

            <div className="p-3 bg-error/10 border border-error/30 text-error text-[11px] rounded space-y-1">
              <p className="font-bold">⚠️ Warning: Irreversible Action</p>
              <p className="text-white/70">
                This will delete the job, all its extracted candidate questions, and parser artifacts from the database.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={deleteJobConfirm.loading}
                onClick={() => setDeleteJobConfirm(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded uppercase font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteJobConfirm.loading}
                onClick={handleExecuteDeleteJob}
                className="px-4 py-2 bg-error hover:bg-error/90 text-white font-bold rounded uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteJobConfirm.loading ? (
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deleteJobConfirm.loading ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
