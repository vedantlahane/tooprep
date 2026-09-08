import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon, {
  X,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  Sparkles,
  ArrowRight
} from '@/shared/components/Icon';
import { questionsService } from '../services/questionsService';

const SAMPLE_TEMPLATE = [
  {
    question_text: "A particle moves in a circle of radius $R = 2\\text{ m}$ with constant angular speed $\\omega = 4\\text{ rad/s}$. What is its centripetal acceleration?",
    options: [
      { id: "A", text: "$16\\text{ m/s}^2$" },
      { id: "B", text: "$32\\text{ m/s}^2$" },
      { id: "C", text: "$8\\text{ m/s}^2$" },
      { id: "D", text: "$64\\text{ m/s}^2$" }
    ],
    correct_answer: "B",
    solution_text: "Centripetal acceleration is given by $a_c = \\omega^2 R = (4)^2 \\times 2 = 16 \\times 2 = 32\\text{ m/s}^2$.",
    difficulty: "easy",
    source_type: "PYQ",
    exam_year: 2024,
    verified: true
  },
  {
    question_text: "Which of the following compounds exhibits optical isomerism?",
    options: {
      A: "Lactic acid",
      B: "Acetic acid",
      C: "Formic acid",
      D: "Propanoic acid"
    },
    correct_answer: "A",
    solution_text: "Lactic acid has a chiral carbon $\\text{CH}_3-\\text{CH(OH)}-\\text{COOH}$ with 4 different groups attached.",
    difficulty: "medium",
    source_type: "ORIGINAL",
    verified: true
  }
];

export default function QuestionImportModal({
  isOpen,
  hierarchy = [],
  initialTopicId = '',
  onClose,
  onImported
}) {
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [defaultTopicId, setDefaultTopicId] = useState(initialTopicId || '');

  const [validationResult, setValidationResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  // Initialize hierarchy selection if initialTopicId is supplied
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setImporting(false);
    if (initialTopicId && hierarchy.length > 0) {
      for (const s of hierarchy) {
        for (const c of (s.chapters || [])) {
          for (const t of (c.topics || [])) {
            if (t.id === initialTopicId) {
              setSelectedSubject(s.id || s.name);
              setSelectedChapter(c.id || c.name);
              setDefaultTopicId(t.id);
              return;
            }
          }
        }
      }
    }
  }, [isOpen, initialTopicId, hierarchy]);

  const subjects = hierarchy;
  const chapters = selectedSubject
    ? (hierarchy.find(s => s.id === selectedSubject || s.name === selectedSubject)?.chapters || [])
    : [];
  const topics = selectedChapter
    ? (chapters.find(c => c.id === selectedChapter || c.name === selectedChapter)?.topics || [])
    : [];

  const handleSubjectChange = (val) => {
    setSelectedSubject(val);
    setSelectedChapter('');
    setDefaultTopicId('');
  };

  const handleChapterChange = (val) => {
    setSelectedChapter(val);
    setDefaultTopicId('');
  };

  // Validate the JSON text
  useEffect(() => {
    const trimmed = jsonText.trim();
    if (!trimmed) {
      setValidationResult(null);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      const validItems = [];
      const errors = [];

      items.forEach((item, idx) => {
        const itemNum = idx + 1;
        const errs = [];

        if (!item.question_text && !item.text) {
          errs.push('Missing question text (question_text)');
        }

        if (!item.options) {
          errs.push('Missing options (options)');
        } else if (Array.isArray(item.options)) {
          if (item.options.length < 2) {
            errs.push('Options array must have at least 2 choices');
          }
        } else if (typeof item.options !== 'object') {
          errs.push('Options must be an array or object');
        }

        const validAnswerKeys = ['A', 'B', 'C', 'D'];
        const ca = (item.correct_answer || item.answer || '').toUpperCase();
        if (!ca || !validAnswerKeys.includes(ca)) {
          errs.push('Invalid or missing correct_answer (must be A, B, C, or D)');
        }

        if (errs.length > 0) {
          errors.push({ index: itemNum, errors: errs });
        } else {
          validItems.push(item);
        }
      });

      setValidationResult({
        total: items.length,
        valid: validItems.length,
        invalid: errors.length,
        errors,
        parsedItems: items
      });
    } catch (e) {
      setValidationResult({
        total: 0,
        valid: 0,
        invalid: 1,
        errors: [{ index: 0, errors: [`JSON Syntax Error: ${e.message}`] }],
        parsedItems: []
      });
    }
  }, [jsonText]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setJsonText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_TEMPLATE, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tooprep-questions-sample-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async () => {
    if (!validationResult || validationResult.valid === 0) {
      setError('Please provide at least one valid question in the JSON payload.');
      return;
    }

    // Check if any valid questions need topic_id
    const hasAnyMissingTopic = validationResult.parsedItems.some(item => !item.topic_id);
    if (hasAnyMissingTopic && !defaultTopicId) {
      setError('Some questions do not specify a "topic_id". Please select a default target topic.');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const res = await questionsService.bulkImport(
        validationResult.parsedItems,
        defaultTopicId || undefined
      );

      if (onImported) {
        onImported(res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Bulk import failed. Please review schema.');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const canSubmit = validationResult && validationResult.valid > 0 && !importing;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-3xl bg-surface-dim border-2 border-primary shadow-2xl p-6 space-y-5 text-left my-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-widest font-bold">
                <UploadCloud className="w-4 h-4 text-primary" />
                <span>Batch Ingestion</span>
              </div>
              <h2 className="text-xl font-light text-white mt-1">
                Import Questions (JSON)
              </h2>
              <p className="text-xs text-white/50 font-mono mt-0.5">
                Bulk upload questions with choices, step-by-step LaTeX solutions, and topic assignments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 border border-white/20 hover:border-primary text-white/80 hover:text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download JSON sample schema template"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Sample Template</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-error/15 border border-error/30 text-error text-xs font-mono animate-fade-in">
              {error}
            </div>
          )}

          {/* Default Topic Selector Fallback */}
          <div className="p-4 border border-outline-variant bg-surface-container space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-white/70 uppercase tracking-widest font-semibold">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Default Syllabus Topic (Fallback if item lacks topic_id)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <select
                value={selectedSubject}
                onChange={e => handleSubjectChange(e.target.value)}
                className="bg-black border border-white/15 p-2 text-white outline-none focus:border-primary"
              >
                <option value="">Select Subject...</option>
                {subjects.map(s => (
                  <option key={s.id || s.name} value={s.id || s.name}>{s.name}</option>
                ))}
              </select>

              <select
                value={selectedChapter}
                onChange={e => handleChapterChange(e.target.value)}
                disabled={!selectedSubject}
                className="bg-black border border-white/15 p-2 text-white outline-none focus:border-primary disabled:opacity-30"
              >
                <option value="">Select Chapter...</option>
                {chapters.map(c => (
                  <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
                ))}
              </select>

              <select
                value={defaultTopicId}
                onChange={e => setDefaultTopicId(e.target.value)}
                disabled={!selectedChapter}
                className="bg-black border border-white/15 p-2 text-white outline-none focus:border-primary disabled:opacity-30"
              >
                <option value="">Select Topic...</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload / Paste Toggle Area */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <label className="text-white/70 uppercase tracking-widest font-semibold">
                Question Data Payload (JSON Array)
              </label>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors text-[11px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3 h-3" />
                  <span>{fileName ? `File: ${fileName}` : 'Upload .json File'}</span>
                </button>
              </div>
            </div>

            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder='Paste JSON array here, e.g. [{"question_text": "...", "options": [...], "correct_answer": "A"}]'
              rows={9}
              className="w-full bg-black border border-white/15 p-3 text-white placeholder-white/30 outline-none focus:border-primary text-xs font-mono leading-relaxed"
            />
          </div>

          {/* Validation Status Bar */}
          {validationResult && (
            <div className={`p-3 border text-xs font-mono ${
              validationResult.invalid === 0
                ? 'bg-status-aligned/10 border-status-aligned/40 text-status-aligned'
                : 'bg-status-weak/10 border-status-weak/40 text-on-surface'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {validationResult.invalid === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-status-aligned shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-status-weak shrink-0" />
                  )}
                  <span>
                    Validation: <strong>{validationResult.valid}</strong> of {validationResult.total} questions valid.
                  </span>
                </div>

                {validationResult.invalid > 0 && (
                  <span className="text-status-weak font-bold">
                    {validationResult.invalid} issue(s) detected
                  </span>
                )}
              </div>

              {/* Error details */}
              {validationResult.errors.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-white/10 max-h-24 overflow-y-auto space-y-1 text-[11px] text-error">
                  {validationResult.errors.map((err, i) => (
                    <div key={i}>
                      • {err.index > 0 ? `Item #${err.index}: ` : ''}{err.errors.join('; ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setJsonText(JSON.stringify(SAMPLE_TEMPLATE, null, 2));
              }}
              className="text-white/40 hover:text-primary transition-colors uppercase tracking-wider cursor-pointer"
            >
              Load Sample Template into Box
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-white/20 text-white/70 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleImportSubmit}
                className="px-6 py-2 bg-primary text-white font-bold uppercase tracking-widest hover:brightness-110 shadow-lg disabled:opacity-40 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>{importing ? 'Importing Questions...' : `Import ${validationResult?.valid ? `(${validationResult.valid})` : ''}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
