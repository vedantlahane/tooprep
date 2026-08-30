import { useEffect, useState, useMemo } from 'react';
import { contentService } from '../services/contentService';
import { topicsService } from '@/features/topics/services/topicsService';
import MathText from '@/features/questions/components/MathText';
import { extractOptionsFromText, detectAnswerKey, isInstructionSnippet } from '../lib/candidateParser';

const REJECTION_PRESETS = [
  'Cover Page / Instructions',
  'Solutions / Answer Key Only',
  'Incomplete / Malformed Snippet',
  'Duplicate Question'
];

function Candidate({ candidate, jobId, topics, onReviewed }) {
  // Parse initial values intelligently from candidate.options, candidate.question_text, or raw_text
  const initialParsed = useMemo(() => {
    let qText = candidate.question_text || candidate.raw_text || '';
    let opts = [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }];
    let ans = candidate.correct_answer || 'A';
    let sol = candidate.solution_text || '';

    // Check if candidate already has structured options
    if (candidate.options && typeof candidate.options === 'object') {
      opts = [
        { id: 'A', text: candidate.options.A || candidate.options.a || '' },
        { id: 'B', text: candidate.options.B || candidate.options.b || '' },
        { id: 'C', text: candidate.options.C || candidate.options.c || '' },
        { id: 'D', text: candidate.options.D || candidate.options.d || '' }
      ];
    } else {
      // Auto-extract from raw text
      const extracted = extractOptionsFromText(candidate.raw_text);
      if (extracted.hasOptions) {
        qText = extracted.questionText;
        opts = extracted.options;
      }
    }

    // Auto-detect answer key if not set
    const detectedAns = detectAnswerKey(candidate.raw_text);
    if (detectedAns) ans = detectedAns;

    return { questionText: qText, options: opts, correctAnswer: ans, solutionText: sol };
  }, [candidate]);

  const [questionText, setQuestionText] = useState(initialParsed.questionText);
  const [options, setOptions] = useState(initialParsed.options);
  const [solutionText, setSolutionText] = useState(initialParsed.solutionText);
  const [correctAnswer, setCorrectAnswer] = useState(initialParsed.correctAnswer);
  const [difficulty, setDifficulty] = useState('medium');
  const [topicId, setTopicId] = useState('');

  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [searchingSimilar, setSearchingSimilar] = useState(false);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'preview'

  const isInstruction = useMemo(() => isInstructionSnippet(candidate.raw_text), [candidate.raw_text]);

  const handleAutoExtract = () => {
    const extracted = extractOptionsFromText(questionText || candidate.raw_text);
    if (extracted.hasOptions) {
      setQuestionText(extracted.questionText);
      setOptions(extracted.options);
      const detected = detectAnswerKey(candidate.raw_text);
      if (detected) setCorrectAnswer(detected);
    } else {
      setError('Could not find (A) (B) (C) (D) option pattern in the text.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const accept = async () => {
    if (!topicId) { setError('You must select a topic.'); return; }
    setSaving(true); setError('');
    try {
      await contentService.acceptCandidate(jobId, candidate.candidate_key, {
        question_text: questionText,
        options: options,
        correct_answer: correctAnswer,
        solution_text: solutionText,
        difficulty,
        source_type: 'PYQ',
        question_type: 'single_correct',
        curriculum: { topic_id: topicId, difficulty }
      });
      onReviewed();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const reject = async (customReason) => {
    const r = customReason || reason;
    if (!r) { setError('Rejection reason is required.'); return; }
    setSaving(true); setError('');
    try {
      await contentService.rejectCandidate(jobId, candidate.candidate_key, r);
      onReviewed();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const findSimilar = async () => {
    setSearchingSimilar(true);
    try {
      const results = await contentService.searchQuestions(questionText, 3);
      setSimilarQuestions(results);
    } catch (err) { setError(err.message); } finally { setSearchingSimilar(false); }
  };

  const updateOption = (index, text) => {
    const newOps = [...options];
    newOps[index].text = text;
    setOptions(newOps);
  };

  return (
    <article className={`border rounded-md overflow-hidden flex flex-col group transition-all ${isInstruction ? 'border-status-weak/40 bg-status-weak/5' : 'border-outline-variant bg-surface-dim'}`}>
      {/* Header bar */}
      <div className="bg-surface-container px-4 py-3 flex justify-between items-center border-b border-outline-variant flex-wrap gap-2">
        <div className="text-label-sm-mono uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">description</span>
          Page {candidate.source_pages?.join(', ')} &middot; Q{candidate.source_question_number}
          {isInstruction && (
            <span className="px-2 py-0.5 bg-status-weak/20 border border-status-weak/40 text-status-weak text-xs rounded-sm">
              Detected Instruction
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoExtract}
            className="px-3 py-1 text-label-sm-mono uppercase tracking-widest border border-primary text-primary hover:bg-primary hover:text-white transition-colors rounded-sm flex items-center gap-1"
            title="Auto-extract Options (A), (B), (C), (D) from question text"
          >
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            Extract Options
          </button>
          <button
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1 text-label-sm-mono uppercase tracking-widest transition-colors rounded-sm ${viewMode === 'editor' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Editor
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 text-label-sm-mono uppercase tracking-widest transition-colors rounded-sm ${viewMode === 'preview' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Similar Questions Alert */}
        {similarQuestions.length > 0 && (
          <div className="bg-surface-container border border-outline-variant rounded p-4 space-y-3">
            <div className="text-label-sm-mono text-status-weak uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              Potential Duplicates Found
            </div>
            {similarQuestions.map((sim, i) => (
              <div key={i} className="text-body-sm text-on-surface-variant border-l-2 border-status-weak pl-3">
                <span className="font-mono text-status-weak mr-2">{(sim.score * 100).toFixed(0)}%</span>
                <MathText text={sim.question.question_text || sim.question.content?.question_text} />
              </div>
            ))}
          </div>
        )}

        {viewMode === 'editor' ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Question Text (LaTeX)</label>
                <button onClick={findSimilar} disabled={searchingSimilar} className="text-label-sm-mono text-primary hover:underline uppercase tracking-widest">
                  {searchingSimilar ? 'Searching...' : 'Find Duplicates'}
                </button>
              </div>
              <textarea
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                rows="4"
                className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary font-mono text-sm rounded-sm"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest block">Options & Correct Answer</label>
                <span className="text-label-sm-mono text-on-surface-variant text-xs">Select radio button for correct option</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((opt, i) => (
                  <div key={opt.id} className={`flex items-start gap-3 p-3 border rounded-sm transition-colors ${correctAnswer === opt.id ? 'border-status-aligned bg-status-aligned/5' : 'border-outline-variant bg-surface-container'}`}>
                    <input
                      type="radio"
                      name={`correct-${candidate.candidate_key}`}
                      checked={correctAnswer === opt.id}
                      onChange={() => setCorrectAnswer(opt.id)}
                      className="mt-1 accent-status-aligned"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="text-label-sm-mono text-on-surface-variant font-bold">Option {opt.id}</div>
                      <textarea
                        value={opt.text}
                        onChange={e => updateOption(i, e.target.value)}
                        rows="2"
                        className="w-full bg-transparent text-on-surface outline-none font-mono text-sm"
                        placeholder={`Option ${opt.id} text (LaTeX)`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Solution (Optional LaTeX)</label>
              <textarea
                value={solutionText}
                onChange={e => setSolutionText(e.target.value)}
                rows="3"
                className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary font-mono text-sm rounded-sm"
                placeholder="Step-by-step solution..."
              />
            </div>
          </>
        ) : (
          /* Preview Mode */
          <div className="bg-surface-container p-6 border border-outline-variant rounded-sm space-y-6">
            <div className="text-body-lg text-on-surface leading-relaxed">
              <MathText text={questionText} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((opt) => (
                <div key={opt.id} className={`p-4 border rounded-sm flex gap-3 ${correctAnswer === opt.id ? 'border-status-aligned bg-status-aligned/10 text-status-aligned font-semibold' : 'border-outline-variant text-on-surface-variant'}`}>
                  <div className="font-bold">{opt.id}.</div>
                  <div><MathText text={opt.text || '—'} /></div>
                </div>
              ))}
            </div>
            {solutionText && (
              <div className="mt-6 p-4 border-l-2 border-primary bg-primary/5">
                <div className="text-label-sm-mono text-primary uppercase tracking-widest mb-2">Solution</div>
                <div className="text-body-md text-on-surface"><MathText text={solutionText} /></div>
              </div>
            )}
          </div>
        )}

        {/* Quick Rejection Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest text-xs">Quick Reject:</span>
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

        {/* Metadata & Actions */}
        <div className="pt-4 border-t border-outline-variant space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Classification</label>
              <select value={topicId} onChange={e => setTopicId(e.target.value)} className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm">
                <option value="">Select Topic...</option>
                {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.subject} &rsaquo; {topic.chapter} &rsaquo; {topic.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm">
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Custom rejection reason"
              className="flex-1 bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm text-sm"
            />
            <button disabled={saving} onClick={() => reject()} className="px-6 py-3 border border-error text-error uppercase tracking-widest font-semibold hover:bg-error/10 transition-colors disabled:opacity-50 rounded-sm">
              Reject
            </button>
            <button disabled={saving} onClick={accept} className="px-6 py-3 bg-primary text-white uppercase tracking-widest font-semibold hover:brightness-110 transition-colors disabled:opacity-50 rounded-sm">
              Verify & Publish
            </button>
          </div>
          {error && <div className="text-error text-body-sm font-semibold">{error}</div>}
        </div>
      </div>
    </article>
  );
}

export default function ContentAdminPage() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [topics, setTopics] = useState([]);
  const [file, setFile] = useState(null);
  const [exam, setExam] = useState('JEE Main');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [bulkRejecting, setBulkRejecting] = useState(false);

  const loadJobs = async () => {
    try { setJobs(await contentService.listJobs()); } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const chooseJob = async (job) => {
    setSelectedJob(job); setCandidates([]); setError('');
    try { setCandidates(await contentService.getCandidates(job.job_id)); } catch (err) { setError(err.message); }
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file) return;
    setUploading(true); setError('');
    try {
      const job = await contentService.uploadPdf(file, { exam, year });
      await loadJobs();
      await chooseJob(job);
      setFile(null);
      event.target.reset();
    }
    catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  const handleBulkRejectInstructions = async () => {
    if (!selectedJob || candidates.length === 0) return;
    const instructionCandidates = candidates.filter(c => isInstructionSnippet(c.raw_text));
    if (instructionCandidates.length === 0) {
      alert('No instruction candidates detected in current list.');
      return;
    }
    if (!window.confirm(`Reject ${instructionCandidates.length} detected non-question/instruction candidates?`)) return;

    setBulkRejecting(true);
    try {
      for (const c of instructionCandidates) {
        await contentService.rejectCandidate(selectedJob.job_id, c.candidate_key, 'Cover Page / Instructions');
      }
      await chooseJob(selectedJob);
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkRejecting(false);
    }
  };

  useEffect(() => {
    loadJobs();
    topicsService.getTopics().then(hierarchy => setTopics(hierarchy.flatMap(subject =>
      (subject.chapters || []).flatMap(chapter => (chapter.topics || []).map(topic => ({
        id: topic.id, name: topic.name, chapter: chapter.name, subject: subject.name
      })))
    ))).catch(err => setError(err.message));
  }, []);

  const instructionCount = useMemo(() => candidates.filter(c => isInstructionSnippet(c.raw_text)).length, [candidates]);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-8 pb-20">
      <div>
        <h2 className="text-display text-on-surface font-light">Content Ops</h2>
        <p className="text-on-surface-variant text-body-lg font-light mt-2">Upload PDFs, track ingestion, then verify every extracted candidate.</p>
      </div>

      {/* Upload Section */}
      <form onSubmit={upload} className="acrylic border border-outline-variant rounded-md p-6 grid md:grid-cols-4 gap-6 items-end">
        <div className="md:col-span-2 space-y-2">
          <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Source PDF</label>
          <div className="relative">
            <input required type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <div className={`w-full bg-surface-container border ${file ? 'border-primary' : 'border-outline-variant'} border-dashed p-4 flex items-center justify-center gap-3 rounded-sm transition-colors`}>
              <span className="material-symbols-outlined text-primary">upload_file</span>
              <span className={`text-body-md ${file ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>{file ? file.name : 'Click to select or drag PDF here'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Exam</label>
          <input value={exam} onChange={e => setExam(e.target.value)} className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm" />
        </div>

        <div className="space-y-2 flex gap-3">
          <div className="flex-1">
            <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest block mb-2">Year</label>
            <input value={year} onChange={e => setYear(e.target.value)} placeholder="YYYY" className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm" />
          </div>
          <div className="flex-1 flex items-end">
            <button disabled={uploading} className="w-full bg-primary text-white p-3 uppercase tracking-widest font-semibold hover:brightness-110 transition-all disabled:opacity-50 rounded-sm">
              {uploading ? '...' : 'Ingest'}
            </button>
          </div>
        </div>
      </form>

      {error && <div className="border-l-4 border-error bg-error/10 p-4 text-error rounded-sm">{error}</div>}

      <section className="grid lg:grid-cols-[300px_1fr] gap-8 items-start">
        {/* Jobs Sidebar */}
        <div className="space-y-4">
          <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Ingestion Jobs</h3>
          <div className="space-y-2">
            {loading ? <div className="animate-pulse-soft text-primary">Loading jobs...</div> :
              jobs.length === 0 ? <div className="text-on-surface-variant text-body-sm italic">No jobs found.</div> :
              jobs.map(job => (
              <button
                key={job.job_id}
                onClick={() => chooseJob(job)}
                className={`w-full text-left p-4 border rounded-sm transition-all ${selectedJob?.job_id === job.job_id ? 'border-primary bg-primary/10 scale-100' : 'border-outline-variant bg-surface-dim hover:border-on-surface-variant hover:scale-[1.02]'}`}
              >
                <div className="font-semibold text-on-surface truncate" title={job.source?.filename || job.job_id}>
                  {job.source?.filename || 'Unknown Document'}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className={`text-label-sm-mono uppercase tracking-widest ${job.stage === 'COMPLETED' ? 'text-status-aligned' : job.stage === 'FAILED' ? 'text-error' : 'text-primary'}`}>
                    {job.stage}
                  </div>
                  <div className="text-label-sm-mono text-on-surface-variant">
                    {job.progress?.questions_extracted || 0} items
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Candidates Feed */}
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">
              {selectedJob ? `Review Candidates \u00B7 ${candidates.length} remaining` : 'Select a job to review'}
            </h3>

            {selectedJob && instructionCount > 0 && (
              <button
                onClick={handleBulkRejectInstructions}
                disabled={bulkRejecting}
                className="px-3 py-1.5 border border-status-weak/60 bg-status-weak/10 text-status-weak text-label-sm-mono uppercase tracking-widest text-xs rounded-sm hover:bg-status-weak/20 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                {bulkRejecting ? 'Rejecting...' : `Dismiss ${instructionCount} Instructions`}
              </button>
            )}
          </div>

          <div className="space-y-6">
            {!selectedJob && (
              <div className="border border-outline-variant border-dashed p-12 flex flex-col items-center justify-center text-on-surface-variant rounded-md">
                <span className="material-symbols-outlined text-4xl mb-4 opacity-50">rule</span>
                <p>Select a job from the sidebar to start verifying candidates.</p>
              </div>
            )}

            {selectedJob && candidates.length === 0 && (selectedJob.stage === 'COMPLETED' || selectedJob.stage === 'AWAITING_REVIEW') && (
              <div className="border border-status-aligned bg-status-aligned/10 p-12 flex flex-col items-center justify-center text-status-aligned rounded-md">
                <span className="material-symbols-outlined text-4xl mb-4">task_alt</span>
                <p className="font-semibold">All candidates verified!</p>
              </div>
            )}

            {selectedJob && candidates.length === 0 && selectedJob.stage !== 'COMPLETED' && selectedJob.stage !== 'AWAITING_REVIEW' && (
              <div className="border border-primary bg-primary/5 p-12 flex flex-col items-center justify-center text-primary rounded-md">
                <span className="material-symbols-outlined text-4xl mb-4 animate-spin">sync</span>
                <p className="font-semibold">AI is parsing and extracting questions...</p>
                <p className="text-sm mt-2 opacity-80">Status: {selectedJob.stage}</p>
              </div>
            )}

            {candidates.map(candidate => (
              <Candidate
                key={candidate.candidate_key}
                candidate={candidate}
                jobId={selectedJob.job_id}
                topics={topics}
                onReviewed={() => chooseJob(selectedJob)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
