import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { topicsService } from '@/features/topics/services/topicsService';
import { questionsService } from '../services/questionsService';
import { contentService } from '@/features/content/services/contentService';
import MathText from './MathText';
import Icon, {
  X,
  Check,
  CheckCircle2,
  Sparkles,
  Image as ImageIcon,
  Save,
  Trash2,
  BookOpen,
  Eye,
  Edit3
} from '@/shared/components/Icon';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const SOURCE_TYPES = ['PYQ', 'ORIGINAL', 'LICENSED'];

export default function QuestionEditModal({
  question = null, // null for Create mode, object for Edit mode
  initialTopicId = '',
  isOpen = false,
  onClose,
  onSaved,
  onDeleted
}) {
  const isEditMode = Boolean(question?.id);

  // Hierarchy state for topic picker
  const [hierarchy, setHierarchy] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [topicId, setTopicId] = useState(initialTopicId || '');

  // Question data state
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [solutionText, setSolutionText] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [sourceType, setSourceType] = useState('PYQ');
  const [examYear, setExamYear] = useState(new Date().getFullYear());
  const [verified, setVerified] = useState(true);

  // UI state
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'edit' | 'preview'
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef(null);
  const [targetField, setTargetField] = useState('stem'); // 'stem' | 'optA' | etc.

  // Load curriculum hierarchy
  useEffect(() => {
    topicsService.getTopics().then(setHierarchy).catch(() => {});
  }, []);

  // Initialize or reset form when question or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    if (question) {
      setQuestionText(question.question_text || question.text || '');
      setCorrectAnswer(question.correct_answer || 'A');
      setSolutionText(question.solution_text || '');
      setDifficulty((question.difficulty || 'medium').toLowerCase());
      setSourceType(question.source_type || 'PYQ');
      setExamYear(question.exam_year || 2024);
      setVerified(Boolean(question.verified || question.is_verified));
      setTopicId(question.topic_id || '');

      // Parse options safely
      if (Array.isArray(question.options)) {
        const letters = ['A', 'B', 'C', 'D'];
        const parsed = letters.map(id => {
          const found = question.options.find(o => o.id === id);
          return { id, text: found ? String(found.text || '') : '' };
        });
        setOptions(parsed);
      } else if (question.options && typeof question.options === 'object') {
        setOptions([
          { id: 'A', text: String(question.options.A || question.options.a || '') },
          { id: 'B', text: String(question.options.B || question.options.b || '') },
          { id: 'C', text: String(question.options.C || question.options.c || '') },
          { id: 'D', text: String(question.options.D || question.options.d || '') },
        ]);
      }
    } else {
      // Create mode defaults
      setQuestionText('');
      setOptions([
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ]);
      setCorrectAnswer('A');
      setSolutionText('');
      setDifficulty('medium');
      setSourceType('PYQ');
      setExamYear(new Date().getFullYear());
      setVerified(true);
      setTopicId(initialTopicId || '');
    }
    setError('');
    setShowDeleteConfirm(false);
  }, [question, isOpen, initialTopicId]);

  // Sync subject and chapter dropdowns from topicId
  useEffect(() => {
    if (!topicId || hierarchy.length === 0) return;
    for (const s of hierarchy) {
      for (const c of (s.chapters || [])) {
        for (const t of (c.topics || [])) {
          if (t.id === topicId) {
            setSelectedSubject(s.id || s.name);
            setSelectedChapter(c.id || c.name);
            return;
          }
        }
      }
    }
  }, [topicId, hierarchy]);

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
    setTopicId('');
  };

  const handleChapterChange = (val) => {
    setSelectedChapter(val);
    setTopicId('');
  };

  const updateOptionText = (index, text) => {
    setOptions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
  };

  const handleAttachImage = (field) => {
    setTargetField(field);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError('');
    try {
      const res = await contentService.uploadImage(file);
      const imgMarkdown = `\n\n![Diagram](${res.url})\n`;
      if (targetField === 'stem') {
        setQuestionText(prev => prev + imgMarkdown);
      } else if (targetField.startsWith('opt')) {
        const optId = targetField.slice(3).toUpperCase();
        setOptions(prev =>
          prev.map(o => o.id === optId ? { ...o, text: (o.text ? o.text + ' ' : '') + `![Option ${optId}](${res.url})` } : o)
        );
      }
    } catch (err) {
      setError('Image upload failed: ' + err.message);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!topicId) {
      setError('Please select a curriculum topic for this question.');
      return;
    }
    if (!questionText.trim()) {
      setError('Question text cannot be empty.');
      return;
    }

    // Ensure options have text
    const activeOptions = options.map(o => ({ id: o.id, text: o.text.trim() }));
    if (activeOptions.some(o => !o.text)) {
      setError('All 4 options (A, B, C, D) must contain text.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      topic_id: topicId,
      question_text: questionText,
      options: activeOptions,
      correct_answer: correctAnswer,
      solution_text: solutionText.trim() || null,
      difficulty: difficulty.toLowerCase(),
      source_type: sourceType,
      exam_year: examYear ? parseInt(examYear, 10) : undefined,
      verified: Boolean(verified),
      publication_status: verified ? 'PUBLISHED' : 'DRAFT'
    };

    try {
      let saved;
      if (isEditMode) {
        saved = await questionsService.updateQuestion(question.id, payload);
      } else {
        saved = await questionsService.createQuestion(payload);
      }
      if (onSaved) onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode) return;
    setDeleting(true);
    setError('');
    try {
      await questionsService.deleteQuestion(question.id);
      if (onDeleted) onDeleted(question.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete question.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelected}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl bg-surface-dim border-2 border-primary shadow-2xl flex flex-col max-h-[92vh] overflow-hidden rounded-none"
        >
          {/* Header Bar */}
          <div className="bg-black px-6 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-label-sm-mono uppercase tracking-[0.2em] text-primary text-xs flex items-center gap-2">
                <span>{isEditMode ? 'Edit Question' : 'New Question Composer'}</span>
                {question?.canonical_question_id && (
                  <span className="text-white/40">[{question.canonical_question_id}]</span>
                )}
              </div>
              <h2 className="text-xl font-light text-white lowercase">
                {isEditMode ? 'modify question & solution' : 'publish question to bank'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center border border-white/15 bg-black">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1 text-xs font-mono uppercase tracking-widest ${viewMode === 'split' ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                >
                  Split
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1 text-xs font-mono uppercase tracking-widest ${viewMode === 'edit' ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                >
                  Raw
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1 text-xs font-mono uppercase tracking-widest ${viewMode === 'preview' ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}
                >
                  Preview
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 border border-white/10 text-white/50 hover:text-white hover:border-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {error && (
              <div className="p-3 bg-error/15 border-l-4 border-error text-error text-xs font-mono">
                {error}
              </div>
            )}

            {/* Curriculum Assignment (Subject -> Chapter -> Topic) */}
            <div className="border border-white/10 bg-surface-container p-4 space-y-3">
              <span className="text-label-sm-mono text-primary uppercase tracking-widest text-xs font-bold block">
                Curriculum Assignment
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <label className="text-white/60 uppercase tracking-widest block mb-1">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={e => handleSubjectChange(e.target.value)}
                    className="w-full bg-black border border-white/15 p-2.5 text-white outline-none focus:border-primary"
                  >
                    <option value="">Select Subject...</option>
                    {subjects.map(s => (
                      <option key={s.id || s.name} value={s.id || s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-white/60 uppercase tracking-widest block mb-1">Chapter</label>
                  <select
                    value={selectedChapter}
                    onChange={e => handleChapterChange(e.target.value)}
                    disabled={!selectedSubject}
                    className="w-full bg-black border border-white/15 p-2.5 text-white outline-none focus:border-primary disabled:opacity-40"
                  >
                    <option value="">Select Chapter...</option>
                    {chapters.map(c => (
                      <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-white/60 uppercase tracking-widest block mb-1">Topic</label>
                  <select
                    value={topicId}
                    onChange={e => setTopicId(e.target.value)}
                    disabled={!selectedChapter}
                    className="w-full bg-black border border-white/15 p-2.5 text-white outline-none focus:border-primary disabled:opacity-40"
                  >
                    <option value="">Select Topic...</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Metadata row: Difficulty, Source Type, Year, Verification */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10 text-xs font-mono">
                <div>
                  <label className="text-white/60 uppercase tracking-widest block mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full bg-black border border-white/15 p-2 text-white outline-none focus:border-primary uppercase"
                  >
                    {DIFFICULTIES.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-white/60 uppercase tracking-widest block mb-1">Source</label>
                  <select
                    value={sourceType}
                    onChange={e => setSourceType(e.target.value)}
                    className="w-full bg-black border border-white/15 p-2 text-white outline-none focus:border-primary uppercase"
                  >
                    {SOURCE_TYPES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-white/60 uppercase tracking-widest block mb-1">Exam Year</label>
                  <input
                    type="number"
                    value={examYear}
                    onChange={e => setExamYear(e.target.value)}
                    className="w-full bg-black border border-white/15 p-2 text-white outline-none focus:border-primary"
                    placeholder="2024"
                  />
                </div>

                <div>
                  <label className="text-white/60 uppercase tracking-widest block mb-1">Verification</label>
                  <button
                    type="button"
                    onClick={() => setVerified(!verified)}
                    className={`w-full p-2 border text-center font-bold uppercase tracking-wider transition-colors ${
                      verified ? 'bg-status-aligned/20 border-status-aligned text-status-aligned' : 'bg-error/20 border-error text-error'
                    }`}
                  >
                    {verified ? 'Verified (Live)' : 'Draft (Hidden)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Question Stem */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-label-sm-mono text-white/70 uppercase tracking-widest text-xs font-bold">
                  Question Stem (LaTeX / Markdown)
                </label>
                <button
                  type="button"
                  onClick={() => handleAttachImage('stem')}
                  disabled={uploadingImage}
                  className="text-xs font-mono text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{uploadingImage && targetField === 'stem' ? 'Uploading...' : 'Attach Image'}</span>
                </button>
              </div>

              {viewMode !== 'preview' && (
                <textarea
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  rows="4"
                  className="w-full bg-black border border-white/15 p-3 text-white font-mono text-sm outline-none focus:border-primary"
                  placeholder="Enter question text with LaTeX math (e.g. $E = mc^2$ or $$\int_0^1 x dx$$)..."
                />
              )}

              {viewMode !== 'edit' && (
                <div className="p-4 bg-black border border-white/10 rounded-none overflow-x-auto">
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1.5 flex items-center gap-1 font-bold">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span>Live Rendered Question Preview</span>
                  </div>
                  <div className="text-body-md text-white font-light leading-relaxed">
                    <MathText text={questionText || '*(Enter question stem above)*'} />
                  </div>
                </div>
              )}
            </div>

            {/* Options Matrix (A, B, C, D) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-label-sm-mono text-white/70 uppercase tracking-widest text-xs font-bold">
                  Options & Correct Answer
                </label>
                <span className="text-xs font-mono text-white/50">
                  Select radio button to designate the correct answer key
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {options.map((opt, i) => {
                  const isCorrect = correctAnswer === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className={`p-3 border transition-colors ${
                        isCorrect ? 'border-status-aligned bg-status-aligned/5' : 'border-white/10 bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="correctAnswerKey"
                            checked={isCorrect}
                            onChange={() => setCorrectAnswer(opt.id)}
                            className="accent-status-aligned w-4 h-4 cursor-pointer"
                          />
                          <span className={`font-mono text-xs font-bold ${isCorrect ? 'text-status-aligned' : 'text-white'}`}>
                            Option {opt.id}
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAttachImage(`opt${opt.id}`)}
                            className="text-[10px] font-mono text-white/50 hover:text-primary uppercase flex items-center gap-0.5"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Image</span>
                          </button>
                          {isCorrect && (
                            <span className="text-[10px] font-mono text-status-aligned uppercase font-bold tracking-wider">
                              CORRECT
                            </span>
                          )}
                        </div>
                      </div>

                      {viewMode !== 'preview' && (
                        <textarea
                          value={opt.text}
                          onChange={e => updateOptionText(i, e.target.value)}
                          rows="2"
                          className="w-full bg-black border border-white/15 p-2 text-white font-mono text-xs outline-none focus:border-primary"
                          placeholder={`Option ${opt.id} LaTeX text...`}
                        />
                      )}

                      {viewMode !== 'edit' && opt.text && (
                        <div className="mt-1.5 p-2 bg-black border border-white/10 text-xs text-white overflow-x-auto">
                          <MathText text={opt.text} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step Solution */}
            <div className="space-y-2">
              <label className="text-label-sm-mono text-white/70 uppercase tracking-widest text-xs font-bold block">
                Step-by-Step Solution (LaTeX / Markdown)
              </label>

              {viewMode !== 'preview' && (
                <textarea
                  value={solutionText}
                  onChange={e => setSolutionText(e.target.value)}
                  rows="3"
                  className="w-full bg-black border border-white/15 p-3 text-white font-mono text-xs outline-none focus:border-primary"
                  placeholder="Detailed mathematical derivation and reasoning..."
                />
              )}

              {viewMode !== 'edit' && solutionText && (
                <div className="p-3.5 bg-primary/5 border-l-4 border-primary">
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Rendered Solution</span>
                  </div>
                  <div className="text-xs font-light text-white leading-relaxed overflow-x-auto">
                    <MathText text={solutionText} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-black px-6 py-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
            <div>
              {isEditMode && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 border border-error/50 text-error hover:bg-error/10 text-xs font-mono uppercase tracking-widest transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              {showDeleteConfirm && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-error uppercase">Confirm permanent delete?</span>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="px-3 py-1.5 bg-error text-white text-xs font-mono uppercase tracking-widest font-bold hover:brightness-110"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 border border-white/20 text-white text-xs font-mono uppercase"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-white/20 text-white/70 hover:text-white hover:border-white text-xs font-mono uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-6 py-2.5 bg-primary text-white font-bold text-xs font-mono uppercase tracking-widest hover:brightness-110 shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : isEditMode ? 'Update Question' : 'Publish Question'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
