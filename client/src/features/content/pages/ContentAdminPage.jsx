import { useEffect, useState, useMemo, useRef } from 'react';
import { contentService } from '../services/contentService';
import { topicsService } from '@/features/topics/services/topicsService';
import MathText from '@/features/questions/components/MathText';
import { extractOptionsFromText, detectAnswerKey, isInstructionSnippet } from '../lib/candidateParser';
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
  Layers,
  Search,
  X,
  ExternalLink,
  Clock,
  ArrowRight,
  Filter,
  Plus
} from 'lucide-react';

const REJECTION_PRESETS = [
  'Cover Page / Instructions',
  'Solutions / Answer Key Only',
  'Incomplete / Malformed Snippet',
  'Missing Visual Diagram',
  'Duplicate Question'
];

/**
 * Interactive Candidate Verification Component
 */
function CandidateCard({ candidate, jobId, topics, onReviewed, onViewPdfPage }) {
  // Parse initial values intelligently
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

  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [searchingSimilar, setSearchingSimilar] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'preview' | 'editor'

  const fileInputRef = useRef(null);
  const [targetImageField, setTargetImageField] = useState('stem'); // 'stem' | 'optA' | 'optB' | 'optC' | 'optD'

  const isInstruction = useMemo(() => isInstructionSnippet(candidate.raw_text), [candidate.raw_text]);
  const primaryPage = candidate.source_pages?.[0] || 1;

  useEffect(() => {
    if (candidate.suggested_topic_id) {
      setTopicId(candidate.suggested_topic_id);
    }
  }, [candidate.suggested_topic_id]);

  const handleAutoExtract = () => {
    const extracted = extractOptionsFromText(questionText || candidate.raw_text);
    if (extracted.hasOptions) {
      setQuestionText(extracted.questionText);
      setOptions(extracted.options);
      const detected = detectAnswerKey(candidate.raw_text);
      if (detected) setCorrectAnswer(detected);
    } else {
      setError('Could not find (A) (B) (C) (D) option pattern in the snippet.');
      setTimeout(() => setError(''), 3500);
    }
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

  // Group topics by subject for the dropdown
  const groupedTopics = useMemo(() => {
    const groups = {};
    for (const t of topics) {
      const subj = t.subject || 'Other';
      if (!groups[subj]) groups[subj] = [];
      groups[subj].push(t);
    }
    return groups;
  }, [topics]);

  return (
    <article
      className={`border rounded-md overflow-hidden flex flex-col group transition-all ${
        candidate.status === 'PUBLISHED'
          ? 'border-status-aligned/50 bg-status-aligned/5'
          : candidate.status === 'REJECTED'
          ? 'border-error/40 bg-error/5 opacity-75'
          : isInstruction
          ? 'border-status-weak/40 bg-status-weak/5'
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
      <div className="bg-surface-container px-4 py-3 flex justify-between items-center border-b border-outline-variant flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-label-sm-mono uppercase tracking-widest text-primary font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Q.{candidate.source_question_number}</span>
            <span className="text-on-surface-variant font-normal">&middot; Page {candidate.source_pages?.join(', ')}</span>
          </div>

          {candidate.subject && (
            <span
              className={`px-2.5 py-0.5 rounded-sm text-xs font-mono uppercase tracking-wider font-semibold ${
                candidate.subject === 'Physics'
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/40'
                  : candidate.subject === 'Chemistry'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {candidate.subject}
            </span>
          )}

          {candidate.suggested_chapter && (
            <span className="text-label-sm-mono text-on-surface-variant text-xs">
              {candidate.suggested_chapter} &rsaquo; <strong className="text-on-surface">{candidate.suggested_topic}</strong>
            </span>
          )}

          {candidate.has_diagram && (
            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-sm flex items-center gap-1 font-mono">
              <ImageIcon className="w-3 h-3" />
              Diagram
            </span>
          )}

          {candidate.status === 'PUBLISHED' && (
            <span className="px-2 py-0.5 bg-status-aligned/20 border border-status-aligned/40 text-status-aligned text-xs rounded-sm flex items-center gap-1 font-mono font-bold">
              <Check className="w-3 h-3" />
              PUBLISHED
            </span>
          )}

          {candidate.status === 'REJECTED' && (
            <span className="px-2 py-0.5 bg-error/20 border border-error/40 text-error text-xs rounded-sm font-mono font-bold">
              REJECTED ({candidate.review_reason || 'Archived'})
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onViewPdfPage && (
            <button
              onClick={() => onViewPdfPage(primaryPage, candidate.source_question_number)}
              className="px-2.5 py-1 text-label-sm-mono uppercase tracking-widest border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary transition-colors rounded-sm flex items-center gap-1.5 text-xs"
              title="Inspect source PDF page"
            >
              <FileSearch className="w-3.5 h-3.5 text-primary" />
              <span>PDF Page {primaryPage}</span>
            </button>
          )}

          <button
            onClick={handleAutoExtract}
            className="px-2.5 py-1 text-label-sm-mono uppercase tracking-widest border border-primary/60 text-primary hover:bg-primary hover:text-white transition-colors rounded-sm flex items-center gap-1 text-xs"
            title="Auto-extract Options (A), (B), (C), (D) from question stem"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto (A-D)</span>
          </button>

          <div className="h-4 w-px bg-outline-variant mx-1" />

          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 text-label-sm-mono uppercase tracking-widest transition-colors rounded-sm text-xs flex items-center gap-1 ${
              viewMode === 'split' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Split</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-2.5 py-1 text-label-sm-mono uppercase tracking-widest transition-colors rounded-sm text-xs flex items-center gap-1 ${
              viewMode === 'preview' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => setViewMode('editor')}
            className={`px-2.5 py-1 text-label-sm-mono uppercase tracking-widest transition-colors rounded-sm text-xs flex items-center gap-1 ${
              viewMode === 'editor' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Code className="w-3 h-3" />
            <span>Raw</span>
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Similar Questions Alert */}
        {similarQuestions.length > 0 && (
          <div className="bg-surface-container border border-outline-variant rounded p-4 space-y-3">
            <div className="text-label-sm-mono text-status-weak uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Potential Duplicates in Bank
            </div>
            {similarQuestions.map((sim, i) => (
              <div key={i} className="text-body-sm text-on-surface-variant border-l-2 border-status-weak pl-3">
                <span className="font-mono text-status-weak mr-2 font-bold">{(sim.score * 100).toFixed(0)}% Match:</span>
                <MathText text={sim.question.question_text || sim.question.content?.question_text} />
              </div>
            ))}
          </div>
        )}

        {viewMode !== 'preview' ? (
          <>
            {/* Question Stem Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
                  Question Stem (TeX / Markdown)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAttachImage('stem')}
                    disabled={uploadingImage}
                    className="text-label-sm-mono text-primary hover:underline uppercase tracking-widest text-xs flex items-center gap-1"
                    title="Upload or attach diagram image"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{uploadingImage && targetImageField === 'stem' ? 'Uploading...' : 'Attach Diagram'}</span>
                  </button>

                  <button
                    onClick={findSimilar}
                    disabled={searchingSimilar}
                    className="text-label-sm-mono text-on-surface-variant hover:text-primary hover:underline uppercase tracking-widest text-xs flex items-center gap-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{searchingSimilar ? 'Checking...' : 'Find Duplicates'}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                rows="4"
                className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary font-mono text-sm rounded-sm"
                placeholder="Type or paste question LaTeX..."
              />

              {viewMode === 'split' && (
                <div className="p-4 bg-surface-container/70 border border-outline-variant/60 rounded-sm">
                  <div className="text-xs text-primary font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Rendered Question Preview</span>
                  </div>
                  <div className="text-body-md text-on-surface leading-relaxed overflow-x-auto">
                    <MathText text={questionText || '—'} />
                  </div>
                </div>
              )}
            </div>

            {/* Options Matrix */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold block">
                  Options & Correct Answer
                </label>
                <span className="text-label-sm-mono text-on-surface-variant text-xs">
                  Click radio button to mark correct option
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((opt, i) => (
                  <div
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 border rounded-sm transition-colors ${
                      correctAnswer === opt.id
                        ? 'border-status-aligned bg-status-aligned/5 shadow-sm'
                        : 'border-outline-variant bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`correct-${candidate.candidate_key}`}
                      checked={correctAnswer === opt.id}
                      onChange={() => setCorrectAnswer(opt.id)}
                      className="mt-1.5 accent-status-aligned cursor-pointer w-4 h-4"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-label-sm-mono text-on-surface font-bold text-xs">Option {opt.id}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAttachImage(`opt${opt.id}`)}
                            className="text-label-sm-mono text-on-surface-variant hover:text-primary text-[11px] uppercase tracking-wider flex items-center gap-1"
                            title={`Attach diagram to Option ${opt.id}`}
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Image</span>
                          </button>
                          {correctAnswer === opt.id && (
                            <span className="text-xs text-status-aligned font-mono font-bold uppercase tracking-wider">
                              &bull; Correct
                            </span>
                          )}
                        </div>
                      </div>

                      <textarea
                        value={opt.text}
                        onChange={e => updateOption(i, e.target.value)}
                        rows="2"
                        className="w-full bg-surface-dim border border-outline-variant/60 p-2 text-on-surface outline-none font-mono text-xs rounded-sm focus:border-primary"
                        placeholder={`Option ${opt.id} LaTeX (e.g. $\\frac{1}{2} q\\omega r^2$)`}
                      />

                      {viewMode === 'split' && opt.text && (
                        <div className="p-2 bg-surface-dim/90 border border-outline-variant/30 rounded-sm text-sm text-on-surface flex items-start gap-2">
                          <span className="text-[11px] font-mono text-primary uppercase tracking-wider shrink-0 font-bold mt-0.5">
                            Rendered:
                          </span>
                          <div className="flex-1 font-medium overflow-x-auto">
                            <MathText text={opt.text} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Solution Derivation */}
            <div className="space-y-2">
              <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
                Step-by-Step Solution (LaTeX)
              </label>
              <textarea
                value={solutionText}
                onChange={e => setSolutionText(e.target.value)}
                rows="3"
                className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary font-mono text-sm rounded-sm"
                placeholder="Step-by-step mathematical derivation and final result..."
              />
              {viewMode === 'split' && solutionText && (
                <div className="p-4 bg-primary/5 border-l-2 border-primary rounded-r space-y-2">
                  <div className="text-xs text-primary font-mono uppercase tracking-widest flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Rendered Solution</span>
                  </div>
                  <div className="text-body-md text-on-surface leading-relaxed overflow-x-auto">
                    <MathText text={solutionText} />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Student Preview Mode */
          <div className="bg-surface-container p-6 border border-outline-variant rounded-sm space-y-6">
            <div className="text-body-lg text-on-surface leading-relaxed font-light">
              <MathText text={questionText} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-4 border rounded-sm flex gap-3 ${
                    correctAnswer === opt.id
                      ? 'border-status-aligned bg-status-aligned/10 text-status-aligned font-semibold'
                      : 'border-outline-variant text-on-surface-variant'
                  }`}
                >
                  <div className="font-bold">{opt.id}.</div>
                  <div className="overflow-x-auto flex-1">
                    <MathText text={opt.text || '—'} />
                  </div>
                </div>
              ))}
            </div>
            {solutionText && (
              <div className="mt-6 p-4 border-l-2 border-primary bg-primary/5">
                <div className="text-label-sm-mono text-primary uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Step-by-Step Solution</span>
                </div>
                <div className="text-body-md text-on-surface overflow-x-auto">
                  <MathText text={solutionText} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Rejection Presets */}
        <div className="flex items-center gap-2 flex-wrap pt-2">
          <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
            Quick Reject:
          </span>
          {REJECTION_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => reject(preset)}
              disabled={saving}
              className="px-2.5 py-1 border border-outline-variant hover:border-error text-on-surface-variant hover:text-error text-label-sm-mono uppercase tracking-widest text-xs rounded-sm transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Curriculum Classification & Publish Actions */}
        <div className="pt-4 border-t border-outline-variant space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
                Curriculum Topic Classification
              </label>
              <select
                value={topicId}
                onChange={e => setTopicId(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm text-sm"
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
            </div>
            <div className="space-y-1.5">
              <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
                Estimated Difficulty
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm text-sm"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Custom rejection rationale..."
              className="flex-1 bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm text-sm"
            />
            <button
              disabled={saving}
              onClick={() => reject()}
              className="px-6 py-3 border border-error text-error uppercase tracking-widest font-semibold hover:bg-error/10 transition-colors disabled:opacity-50 rounded-sm text-xs"
            >
              Reject Candidate
            </button>
            <button
              disabled={saving || !topicId}
              onClick={accept}
              className={`px-8 py-3 uppercase tracking-widest font-bold transition-all disabled:opacity-40 rounded-sm text-xs flex items-center justify-center gap-2 ${
                topicId
                  ? 'bg-primary text-white hover:brightness-110 shadow-md cursor-pointer'
                  : 'bg-surface-container border border-outline-variant text-on-surface-variant cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Publishing...' : 'Verify & Publish to Question Bank'}</span>
            </button>
          </div>

          {error && <div className="p-3 border border-error/40 bg-error/10 text-error text-xs font-mono font-semibold rounded-sm">{error}</div>}
        </div>
      </div>
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

  // Filter States
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ALL'
  const [subjectFilter, setSubjectFilter] = useState('ALL'); // 'ALL' | 'Physics' | 'Chemistry' | 'Mathematics'
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDiagrams, setOnlyDiagrams] = useState(false);

  // Ingestion Form State
  const [file, setFile] = useState(null);
  const [exam, setExam] = useState('JEE Main');
  const [year, setYear] = useState('2018');
  const [session, setSession] = useState('Shift 1');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [bulkPublishing, setBulkPublishing] = useState(false);

  // PDF Viewer Modal
  const [pdfModal, setPdfModal] = useState(null); // { pageNum, qNum, dataUrl: null, loading: true }

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
    setError('');
    try {
      const cands = await contentService.getCandidates(job.job_id);
      setCandidates(cands);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePublishAllReady = async () => {
    if (!selectedJob || candidates.length === 0) return;
    const readyCandidates = candidates.filter(c => c.status === 'REVIEW_REQUIRED' && c.suggested_topic_id);
    if (readyCandidates.length === 0) {
      alert('No pending candidates with classified curriculum topics are ready to publish.');
      return;
    }
    if (!window.confirm(`Publish all ${readyCandidates.length} ready questions with curriculum topics to Supabase Question Bank?`)) {
      return;
    }

    setBulkPublishing(true);
    let count = 0;
    try {
      for (const c of readyCandidates) {
        await contentService.acceptCandidate(selectedJob.job_id, c.candidate_key, {
          question_text: c.question_text,
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
        });
        count++;
      }
      await chooseJob(selectedJob);
      alert(`Successfully published ${count} verified questions to the Question Bank!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkPublishing(false);
    }
  };

  // Open PDF page viewer
  const handleOpenPdfPage = async (pageNum, qNum) => {
    if (!selectedJob) return;
    setPdfModal({ pageNum, qNum, loading: true, dataUrl: null, error: null });
    try {
      const res = await contentService.renderPdfPage(selectedJob.job_id, pageNum, 150);
      setPdfModal(prev => ({ ...prev, loading: false, dataUrl: res.data_url }));
    } catch (err) {
      setPdfModal(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

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

  // Compute live KPI metrics
  const kpis = useMemo(() => {
    const totalJobs = jobs.length;
    const totalCandidates = candidates.length;
    const pending = candidates.filter(c => c.status === 'REVIEW_REQUIRED').length;
    const published = candidates.filter(c => c.status === 'PUBLISHED').length;
    const rejected = candidates.filter(c => c.status === 'REJECTED').length;
    return { totalJobs, totalCandidates, pending, published, rejected };
  }, [jobs, candidates]);

  // Filter candidates according to status, subject, search, diagrams
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      // 1. Status Filter
      if (statusFilter === 'PENDING' && c.status !== 'REVIEW_REQUIRED') return false;
      if (statusFilter === 'PUBLISHED' && c.status !== 'PUBLISHED') return false;
      if (statusFilter === 'REJECTED' && c.status !== 'REJECTED') return false;

      // 2. Subject Filter
      if (subjectFilter !== 'ALL' && c.subject !== subjectFilter) return false;

      // 3. Diagrams only
      if (onlyDiagrams && !c.has_diagram) return false;

      // 4. Search Query
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

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-8 pb-24 text-on-surface">
      {/* Title & Hub Banner */}
      <div>
        <h2 className="text-display text-on-surface font-light lowercase tracking-tight">content ops</h2>
        <p className="text-on-surface-variant text-body-lg font-light mt-1">
          High-fidelity exam paper ingestion, TeX verification, diagram extraction, and curriculum positioning.
        </p>
      </div>

      {/* AMOLED Metric Live Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-surface-container border border-outline-variant p-4 rounded-sm">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-[11px]">Ingestion Jobs</div>
          <div className="text-headline-md font-light text-primary mt-1">{kpis.totalJobs}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant p-4 rounded-sm">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-[11px]">Extracted In Job</div>
          <div className="text-headline-md font-light text-on-surface mt-1">{kpis.totalCandidates}</div>
        </div>
        <div className="bg-surface-container border border-amber-500/30 p-4 rounded-sm bg-amber-500/5">
          <div className="text-label-sm-mono text-amber-400 uppercase tracking-widest text-[11px] font-bold">Awaiting Review</div>
          <div className="text-headline-md font-light text-amber-300 mt-1">{kpis.pending}</div>
        </div>
        <div className="bg-surface-container border border-status-aligned/30 p-4 rounded-sm bg-status-aligned/5">
          <div className="text-label-sm-mono text-status-aligned uppercase tracking-widest text-[11px] font-bold">Published To Bank</div>
          <div className="text-headline-md font-light text-status-aligned mt-1">{kpis.published}</div>
        </div>
        <div className="bg-surface-container border border-outline-variant p-4 rounded-sm col-span-2 md:col-span-1">
          <div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-[11px]">Archived / Rejected</div>
          <div className="text-headline-md font-light text-on-surface-variant mt-1">{kpis.rejected}</div>
        </div>
      </div>

      {/* Exam Ingestion Dropzone */}
      <form onSubmit={upload} className="acrylic border border-outline-variant rounded-md p-6 grid md:grid-cols-5 gap-4 items-end">
        <div className="md:col-span-2 space-y-2">
          <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
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
            <div className={`w-full bg-surface-container border ${file ? 'border-primary' : 'border-outline-variant'} border-dashed p-3.5 flex items-center justify-center gap-3 rounded-sm transition-colors`}>
              <UploadCloud className="w-5 h-5 text-primary" />
              <span className={`text-body-sm truncate ${file ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                {file ? file.name : 'Click to select or drag exam PDF here'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
            Examination
          </label>
          <select
            value={exam}
            onChange={e => setExam(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm text-sm"
          >
            <option value="JEE Main">JEE Main</option>
            <option value="JEE Advanced">JEE Advanced</option>
            <option value="NEET">NEET</option>
            <option value="BITSAT">BITSAT</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs font-bold">
            Exam Year
          </label>
          <input
            value={year}
            onChange={e => setYear(e.target.value)}
            placeholder="YYYY (e.g. 2018)"
            className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm text-sm font-mono"
          />
        </div>

        <div className="space-y-2 flex gap-2 items-end">
          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-primary text-white p-3 uppercase tracking-widest font-bold hover:brightness-110 transition-all disabled:opacity-50 rounded-sm text-xs flex items-center justify-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? 'Ingesting...' : 'Ingest Paper'}</span>
          </button>
        </div>
      </form>

      {error && <div className="border-l-4 border-error bg-error/10 p-4 text-error rounded-sm text-sm font-semibold">{error}</div>}

      {/* Main Workspace Layout */}
      <section className="grid lg:grid-cols-[320px_1fr] gap-8 items-start">
        {/* Ingestion Jobs Queue */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest font-bold text-xs">
              Ingestion Queue
            </h3>
            <span className="text-label-sm-mono text-on-surface-variant text-xs">{jobs.length} papers</span>
          </div>

          <div className="space-y-2 max-h-[85vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-4 border border-outline-variant rounded-sm animate-pulse-soft text-primary text-sm font-mono">
                Loading jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-6 border border-outline-variant/60 rounded-sm text-on-surface-variant text-body-sm italic">
                No ingestion jobs yet. Upload a PDF paper to begin.
              </div>
            ) : (
              jobs.map(job => (
                <button
                  key={job.job_id}
                  onClick={() => chooseJob(job)}
                  className={`w-full text-left p-3.5 border rounded-sm transition-all ${
                    selectedJob?.job_id === job.job_id
                      ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary'
                      : 'border-outline-variant bg-surface-dim hover:border-on-surface-variant'
                  }`}
                >
                  <div className="font-semibold text-on-surface text-sm truncate" title={job.source?.filename || job.job_id}>
                    {job.source?.filename || 'Unnamed Paper'}
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 text-xs text-on-surface-variant font-mono">
                    <span>{job.source?.exam || 'Exam'}</span>
                    <span>&bull;</span>
                    <span>{job.source?.year || 'Year'}</span>
                  </div>

                  <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-outline-variant/40">
                    <span
                      className={`text-[10px] uppercase tracking-widest font-mono font-bold px-1.5 py-0.5 rounded ${
                        job.stage === 'COMPLETED'
                          ? 'bg-status-aligned/20 text-status-aligned'
                          : job.stage === 'FAILED'
                          ? 'bg-error/20 text-error'
                          : 'bg-primary/20 text-primary'
                      }`}
                    >
                      {job.stage}
                    </span>
                    <span className="text-label-sm-mono text-on-surface-variant text-xs">
                      {job.progress?.questions_extracted || 0} candidates
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Verification Studio Feed */}
        <div className="space-y-6">
          {/* Header and Batch Action Bar */}
          <div className="flex justify-between items-center pb-4 border-b border-outline-variant flex-wrap gap-4">
            <div>
              <h3 className="text-headline-md text-on-surface font-light">
                {selectedJob ? selectedJob.source?.filename || 'Document Candidates' : 'Select a job to verify'}
              </h3>
              <p className="text-on-surface-variant text-xs font-mono mt-0.5">
                Showing {filteredCandidates.length} of {candidates.length} candidate questions
              </p>
            </div>

            {selectedJob && candidates.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePublishAllReady}
                  disabled={bulkPublishing}
                  className="px-4 py-2 bg-primary text-white text-label-sm-mono uppercase tracking-widest text-xs rounded-sm hover:brightness-110 transition-all flex items-center gap-2 font-bold shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{bulkPublishing ? 'Publishing...' : 'Publish All Ready'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Filtering & Search Controls */}
          {selectedJob && candidates.length > 0 && (
            <div className="space-y-4">
              {/* Status Tabs */}
              <div className="flex gap-2 flex-wrap border-b border-outline-variant/60 pb-3">
                {[
                  { id: 'PENDING', label: 'Pending Verification', count: kpis.pending },
                  { id: 'PUBLISHED', label: 'Published to Bank', count: kpis.published },
                  { id: 'REJECTED', label: 'Rejected / Archived', count: kpis.rejected },
                  { id: 'ALL', label: 'All Candidates', count: candidates.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-sm text-label-sm-mono uppercase tracking-widest text-xs transition-colors border flex items-center gap-2 ${
                      statusFilter === tab.id
                        ? 'bg-primary text-white border-primary font-bold'
                        : 'border-outline-variant text-on-surface-variant hover:text-on-surface bg-surface-dim'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="px-1.5 py-0.2 bg-black/30 rounded text-[10px] font-mono">{tab.count}</span>
                  </button>
                ))}
              </div>

              {/* Subject & Query Filters */}
              <div className="flex justify-between items-center flex-wrap gap-3">
                {/* Subject Pills */}
                <div className="flex gap-2">
                  {['ALL', 'Physics', 'Chemistry', 'Mathematics'].map(subj => (
                    <button
                      key={subj}
                      onClick={() => setSubjectFilter(subj)}
                      className={`px-3 py-1 rounded-sm text-label-sm-mono uppercase tracking-widest text-xs border transition-colors ${
                        subjectFilter === subj
                          ? 'bg-primary/20 border-primary text-primary font-bold'
                          : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>

                {/* Search & Diagram Toggle */}
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={onlyDiagrams}
                      onChange={e => setOnlyDiagrams(e.target.checked)}
                      className="accent-primary w-4 h-4 cursor-pointer"
                    />
                    <span>Has Diagram 📷</span>
                  </label>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search Q# or text..."
                      className="pl-8 pr-3 py-1.5 bg-surface-container border border-outline-variant rounded-sm text-xs font-mono text-on-surface outline-none focus:border-primary w-48"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Candidates List */}
          <div className="space-y-6">
            {!selectedJob && (
              <div className="border border-outline-variant border-dashed p-16 flex flex-col items-center justify-center text-on-surface-variant rounded-md">
                <ListFilter className="w-12 h-12 mb-4 opacity-40 text-primary" />
                <p className="text-body-md font-light">Select an exam paper from the queue to review and publish questions.</p>
              </div>
            )}

            {selectedJob && filteredCandidates.length === 0 && (
              <div className="border border-outline-variant/60 bg-surface-dim p-12 flex flex-col items-center justify-center text-on-surface-variant rounded-md">
                <CheckCircle2 className="w-10 h-10 mb-3 text-status-aligned opacity-80" />
                <p className="font-semibold text-on-surface">No candidate questions matching the current filter.</p>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Try switching the status tab (Pending, Published, Rejected) or clearing the search query.
                </p>
              </div>
            )}

            {filteredCandidates.map(candidate => (
              <CandidateCard
                key={candidate.candidate_key}
                candidate={candidate}
                jobId={selectedJob.job_id}
                topics={topics}
                onReviewed={() => chooseJob(selectedJob)}
                onViewPdfPage={handleOpenPdfPage}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Source PDF Page Inspector Modal */}
      {pdfModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPdfModal(null)}
        >
          <div
            className="bg-surface-dim border border-outline-variant rounded-md max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant bg-surface-container">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-label-sm-mono uppercase tracking-widest text-primary font-bold">
                  Source Exam Paper &middot; Page {pdfModal.pageNum}
                </span>
                {pdfModal.qNum && (
                  <span className="text-xs text-on-surface-variant font-mono">
                    (Inspecting Q.{pdfModal.qNum})
                  </span>
                )}
              </div>
              <button
                onClick={() => setPdfModal(null)}
                className="text-on-surface-variant hover:text-on-surface font-mono text-sm px-2 py-1 rounded hover:bg-surface-container"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1 flex flex-col items-center justify-center bg-black/40 min-h-[500px]">
              {pdfModal.loading ? (
                <div className="text-center space-y-3 font-mono text-primary animate-pulse-soft">
                  <Sparkles className="w-8 h-8 mx-auto animate-spin" />
                  <p>Rendering high-res page {pdfModal.pageNum} directly from vector PDF...</p>
                </div>
              ) : pdfModal.error ? (
                <div className="text-error font-mono text-sm border border-error/30 bg-error/10 p-4 rounded">
                  Error rendering page: {pdfModal.error}
                </div>
              ) : (
                <div className="bg-white p-4 rounded shadow-lg max-w-full overflow-auto">
                  <img
                    src={pdfModal.dataUrl}
                    alt={`Page ${pdfModal.pageNum}`}
                    className="max-h-[75vh] w-auto object-contain"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-outline-variant bg-surface-container flex justify-between items-center text-xs font-mono text-on-surface-variant">
              <span>Original high-resolution PDF scan. Use Windows Snipping Tool (Win+Shift+S) or clipboard to capture diagrams.</span>
              <button
                onClick={() => setPdfModal(null)}
                className="px-4 py-1.5 bg-primary text-white rounded-sm font-bold uppercase tracking-widest text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
