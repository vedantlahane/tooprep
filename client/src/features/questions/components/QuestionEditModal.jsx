import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Edit3,
  Calculator,
  Copy
} from '@/shared/components/Icon';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const SOURCE_TYPES = ['PYQ', 'ORIGINAL', 'LICENSED'];

const MATH_SNIPPETS = [
  { label: 'a/b', snippet: '\\frac{a}{b}', title: 'Fraction' },
  { label: '√x', snippet: '\\sqrt{x}', title: 'Square Root' },
  { label: 'x²', snippet: '^{2}', title: 'Superscript (Power)' },
  { label: 'x₁', snippet: '_{1}', title: 'Subscript' },
  { label: '∫', snippet: '\\int_{a}^{b} f(x) \\, dx', title: 'Definite Integral' },
  { label: '∑', snippet: '\\sum_{i=1}^{n}', title: 'Summation' },
  { label: 'Δ', snippet: '\\Delta', title: 'Delta' },
  { label: '→', snippet: '\\rightarrow', title: 'Reaction / Vector Arrow' },
  { label: 'α', snippet: '\\alpha', title: 'Alpha' },
  { label: 'β', snippet: '\\beta', title: 'Beta' },
  { label: 'θ', snippet: '\\theta', title: 'Theta' },
  { label: 'π', snippet: '\\pi', title: 'Pi' },
  { label: '±', snippet: '\\pm', title: 'Plus-Minus' },
  { label: '×', snippet: '\\times', title: 'Multiplication' },
  { label: '≈', snippet: '\\approx', title: 'Approximately Equal' },
  { label: '∞', snippet: '\\infty', title: 'Infinity' },
  { label: 'text', snippet: '\\text{word}', title: 'Plain text inside math' },
];

export default function QuestionEditModal({
  question = null, // null for Create mode, object for Edit mode
  isClone = false,
  isCandidate = false,
  rawText = '',
  subject = '',
  initialTopicId = '',
  isOpen = false,
  onClose,
  onSaved,
  onDeleted
}) {
  const isEditMode = Boolean(question?.id) && !isClone;

  // Hierarchy state for topic picker
  const [hierarchy, setHierarchy] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(subject || '');
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

  // AI Co-pilot & Thinking State
  const [aiWorking, setAiWorking] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [aiThinking, setAiThinking] = useState('');
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [aiSources, setAiSources] = useState([]);
  const [aiModel, setAiModel] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatWorking, setChatWorking] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'edit' | 'preview'
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef(null);
  const stemTextareaRef = useRef(null);
  const solutionTextareaRef = useRef(null);
  const [targetField, setTargetField] = useState('stem'); // 'stem' | 'optA' | etc.

  const insertSnippet = useCallback((textareaRef, setter, snippet) => {
    const el = textareaRef.current;
    if (!el) {
      setter(prev => prev + snippet);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const currentVal = el.value;
    const nextVal = currentVal.substring(0, start) + snippet + currentVal.substring(end);
    setter(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  }, []);

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
      setVerified(isClone ? false : Boolean(question.verified || question.is_verified));
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
  }, [question, isOpen, initialTopicId, isClone]);

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

  const handleCorrectWithAi = async () => {
    setAiWorking(true);
    setError('');
    setAiStatus('Searching authentic JEE sources with Tavily & solving with Gemini...');
    try {
      const optsObj = (options || []).reduce((acc, o) => {
        acc[o.id] = o.text;
        return acc;
      }, {});

      const res = await contentService.aiFormatQuestion({
        question_text: questionText,
        options: optsObj,
        current_answer: correctAnswer,
        solution_text: solutionText,
        raw_text: rawText || question?.raw_text,
        subject: selectedSubject || question?.subject || 'Physics',
        difficulty: difficulty
      });

      if (res) {
        if (res.cleaned_question_text) setQuestionText(res.cleaned_question_text);
        if (res.options && (res.options.A || res.options.B)) {
          setOptions([
            { id: 'A', text: res.options.A || '' },
            { id: 'B', text: res.options.B || '' },
            { id: 'C', text: res.options.C || '' },
            { id: 'D', text: res.options.D || '' }
          ]);
        }
        if (res.correct_answer) setCorrectAnswer(res.correct_answer);
        if (res.solution_text) setSolutionText(res.solution_text);
        if (res.suggested_topic_id) setTopicId(res.suggested_topic_id);
        if (res.difficulty) setDifficulty(res.difficulty.toLowerCase());
        if (res.thinking_process) {
          setAiThinking(res.thinking_process);
          setIsThinkingOpen(true);
        }
        if (res.sources) setAiSources(res.sources);
        if (res.model) setAiModel(res.model);

        const reply = res.reply_message || `Question verified & derived from first principles. Option ${res.correct_answer || 'A'} is confirmed correct.`;
        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', text: reply, timestamp: new Date() }
        ]);
        setAiStatus(`✓ Verified with ${res.model?.replace('gemini-', 'Gemini ') || 'Gemini 3.8 Flash'}`);
        setTimeout(() => setAiStatus(''), 5000);
      }
    } catch (err) {
      console.error('AI correction failed:', err);
      setError('AI verification error: ' + (err.message || 'Please try again'));
      setAiStatus('');
    } finally {
      setAiWorking(false);
    }
  };

  const handleSendChatInstruction = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatWorking || aiWorking) return;

    const userPrompt = chatInput.trim();
    setChatInput('');
    setChatWorking(true);
    setError('');

    const newMessages = [
      ...chatMessages,
      { role: 'user', text: userPrompt, timestamp: new Date() }
    ];
    setChatMessages(newMessages);

    try {
      const optsObj = (options || []).reduce((acc, o) => {
        acc[o.id] = o.text;
        return acc;
      }, {});

      const res = await contentService.aiFormatQuestion({
        question_text: questionText,
        options: optsObj,
        current_answer: correctAnswer,
        solution_text: solutionText,
        raw_text: rawText || question?.raw_text,
        subject: selectedSubject || question?.subject || 'Physics',
        difficulty: difficulty,
        user_instruction: userPrompt,
        conversation_history: newMessages.map(m => ({ role: m.role, text: m.text })),
        skip_tavily: true
      });

      if (res) {
        if (res.cleaned_question_text) setQuestionText(res.cleaned_question_text);
        if (res.options && (res.options.A || res.options.B)) {
          setOptions([
            { id: 'A', text: res.options.A || '' },
            { id: 'B', text: res.options.B || '' },
            { id: 'C', text: res.options.C || '' },
            { id: 'D', text: res.options.D || '' }
          ]);
        }
        if (res.correct_answer) setCorrectAnswer(res.correct_answer);
        if (res.solution_text) setSolutionText(res.solution_text);
        if (res.suggested_topic_id) setTopicId(res.suggested_topic_id);
        if (res.difficulty) setDifficulty(res.difficulty.toLowerCase());
        if (res.thinking_process) {
          setAiThinking(res.thinking_process);
          setIsThinkingOpen(true);
        }
        if (res.model) setAiModel(res.model);

        const reply = res.reply_message || 'I have re-evaluated the question and updated the fields based on your instruction.';
        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', text: reply, timestamp: new Date() }
        ]);
      }
    } catch (err) {
      console.error('Chat refinement error:', err);
      setError('AI refinement error: ' + (err.message || 'Please try again'));
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', text: `⚠️ Error during correction: ${err.message || 'Please try again'}`, timestamp: new Date() }
      ]);
    } finally {
      setChatWorking(false);
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
      if (isCandidate) {
        saved = { ...payload, id: question?.id };
      } else if (isEditMode) {
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

  // Keyboard shortcuts: Ctrl+S / Cmd+S to save, Esc to close
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveRef.current();
      } else if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  const renderMathToolbar = (textareaRef, setter) => (
    <div className="flex items-center gap-1 flex-wrap py-1.5 px-2 bg-black border border-white/10 text-xs font-mono mb-1">
      <span className="text-[10px] uppercase tracking-wider text-primary font-bold mr-1 flex items-center gap-1 shrink-0">
        <Calculator className="w-3 h-3 text-primary" />
        <span>LaTeX:</span>
      </span>
      {MATH_SNIPPETS.map(item => (
        <button
          key={item.label}
          type="button"
          onClick={() => insertSnippet(textareaRef, setter, item.snippet)}
          title={item.title}
          className="px-1.5 py-0.5 bg-surface-container border border-white/15 hover:border-primary text-white/80 hover:text-white text-[11px] transition-colors cursor-pointer"
        >
          {item.label}
        </button>
      ))}
    </div>
  );

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
                <span>{isClone ? 'Clone Question Variant' : isEditMode ? 'Edit Question' : 'New Question Composer'}</span>
                {isClone && (
                  <span className="px-1.5 py-0.5 bg-[#FF8C00]/20 border border-[#FF8C00]/40 text-[#FF8C00] text-[10px] font-bold">
                    CLONE MODE
                  </span>
                )}
                {question?.canonical_question_id && (
                  <span className="text-white/40">[{question.canonical_question_id}]</span>
                )}
              </div>
              <h2 className="text-xl font-light text-white">
                {isClone ? 'Create Variant from Existing Question' : isEditMode ? 'Modify Question & Solution' : 'Publish Question to Bank'}
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
              <div className="p-3 bg-error/15 border border-error/30 text-error text-xs font-mono">
                {error}
              </div>
            )}

            {/* AI Co-Pilot & Real-Time Refinement Station */}
            <div className="bg-black/60 border-2 border-primary/40 rounded-sm p-4 space-y-3.5 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-primary shrink-0">
                    <Sparkles className="w-4 h-4 animate-pulse-soft" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        AI Exam Co-Pilot
                      </span>
                      <span className="px-1.5 py-0.5 bg-primary/20 text-primary border border-primary/40 text-[9px] font-mono font-bold rounded-xs">
                        GEMINI 3.8 FLASH + TAVILY
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60 font-sans mt-0.5">
                      Solve from first principles, verify options, format KaTeX math, and converse with AI to fix any mistakes.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCorrectWithAi}
                  disabled={aiWorking || chatWorking}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-sky-500 hover:brightness-110 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer transition-all shrink-0"
                >
                  {aiWorking ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing &amp; Solving...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Correct with AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Status Toast */}
              {aiStatus && (
                <div className="p-2 bg-primary/10 border border-primary/30 text-primary font-mono text-xs flex items-center gap-2 animate-fade-in rounded-xs">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 animate-spin" />
                  <span>{aiStatus}</span>
                </div>
              )}

              {/* Expandable Thinking Process Panel */}
              {aiThinking && (
                <div className="border border-white/15 bg-black/80 rounded-xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsThinkingOpen(prev => !prev)}
                    className="w-full px-3.5 py-2 bg-white/5 hover:bg-white/10 flex items-center justify-between text-xs font-mono text-white/90 cursor-pointer border-b border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">🧠 AI Thinking &amp; Verification Process</span>
                      {aiModel && (
                        <span className="text-[10px] text-white/40">({aiModel})</span>
                      )}
                    </div>
                    <span className="text-primary text-[11px] uppercase font-bold">
                      {isThinkingOpen ? 'Collapse Thinking ▲' : 'View Full Thinking ▼'}
                    </span>
                  </button>

                  {isThinkingOpen && (
                    <div className="p-3.5 space-y-3 font-mono text-xs text-white/80 leading-relaxed bg-black/90 max-h-96 overflow-y-auto">
                      <div className="font-sans text-xs text-white/90 leading-relaxed space-y-2">
                        <MathText text={aiThinking} />
                      </div>

                      {/* Sources / Citations */}
                      {aiSources && aiSources.length > 0 && (
                        <div className="pt-2.5 border-t border-white/10 space-y-1">
                          <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                            Verified Web References &amp; Official Papers:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {aiSources.map((src, i) => (
                              <a
                                key={i}
                                href={src.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-sky-400 hover:underline bg-white/5 border border-white/10 px-2 py-0.5 rounded-xs truncate max-w-xs block"
                              >
                                {src.title || src.url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Chat with AI / Refine Interface */}
              <div className="border border-white/15 bg-black/60 rounded-xs p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/75 font-bold flex items-center gap-1.5">
                    <Edit3 className="w-3 h-3 text-primary" />
                    <span>Chat with AI to Reiterate &amp; Correct Mistakes</span>
                  </span>
                  {chatMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setChatMessages([])}
                      className="text-[10px] font-mono text-white/40 hover:text-white underline cursor-pointer"
                    >
                      Clear Chat
                    </button>
                  )}
                </div>

                {/* Message History */}
                {chatMessages.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-2.5 bg-black/80 border border-white/10 rounded-xs font-mono text-xs">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-xs ${
                          msg.role === 'user'
                            ? 'bg-primary/15 border border-primary/30 text-white ml-6 text-right'
                            : 'bg-white/5 border border-white/10 text-white/90 mr-6 text-left'
                        }`}
                      >
                        <div className="text-[9px] uppercase tracking-wider text-white/50 mb-0.5">
                          {msg.role === 'user' ? 'Admin Instruction' : 'AI Response'}
                        </div>
                        <div className="font-sans text-xs leading-relaxed">
                          <MathText text={msg.text} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chat Instruction Input */}
                <form onSubmit={handleSendChatInstruction} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="If AI made a mistake, tell it what to fix (e.g. 'Option B has wrong sign', 'Change answer to D', 'Recalculate with...')..."
                    disabled={chatWorking || aiWorking}
                    className="flex-1 bg-black border border-white/20 px-3 py-2 text-xs font-mono text-white placeholder:text-white/40 outline-none focus:border-primary rounded-xs"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatWorking || aiWorking}
                    className="px-4 py-2 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-40 rounded-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {chatWorking ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Refining...</span>
                      </>
                    ) : (
                      <span>Send</span>
                    )}
                  </button>
                </form>
              </div>
            </div>

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
                <>
                  {renderMathToolbar(stemTextareaRef, setQuestionText)}
                  <textarea
                    ref={stemTextareaRef}
                    value={questionText}
                    onChange={e => setQuestionText(e.target.value)}
                    rows="4"
                    className="w-full bg-black border border-white/15 p-3 text-white font-mono text-sm outline-none focus:border-primary"
                    placeholder="Enter question text with LaTeX math (e.g. $E = mc^2$ or $$\int_0^1 x dx$$)..."
                  />
                </>
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
                <>
                  {renderMathToolbar(solutionTextareaRef, setSolutionText)}
                  <textarea
                    ref={solutionTextareaRef}
                    value={solutionText}
                    onChange={e => setSolutionText(e.target.value)}
                    rows="3"
                    className="w-full bg-black border border-white/15 p-3 text-white font-mono text-xs outline-none focus:border-primary"
                    placeholder="Detailed mathematical derivation and reasoning..."
                  />
                </>
              )}

              {viewMode !== 'edit' && solutionText && (
                <div className="p-3.5 bg-primary/5 border border-primary/30">
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
                title="Save question (Shortcut: Ctrl+S / Cmd+S)"
                className="px-6 py-2.5 bg-primary text-white font-bold text-xs font-mono uppercase tracking-widest hover:brightness-110 shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : isClone ? 'Publish Cloned Variant' : isEditMode ? 'Update Question' : 'Publish Question'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
