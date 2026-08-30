import { useEffect, useState } from 'react';
import { contentService } from '../services/contentService';
import { topicsService } from '@/features/topics/services/topicsService';
import MathText from '@/features/questions/components/MathText';

function Candidate({ candidate, jobId, topics, onReviewed }) {
  const [questionText, setQuestionText] = useState(candidate.raw_text || '');
  
  // Try to parse options if they exist in candidate (e.g. from LlamaParse JSON)
  let initialOptions = [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }];
  let initialSolution = '';
  
  try {
    if (candidate.parsed_json) {
      const parsed = JSON.parse(candidate.parsed_json);
      if (parsed.options) initialOptions = parsed.options;
      if (parsed.solution) initialSolution = parsed.solution;
      if (parsed.question_text) setQuestionText(parsed.question_text);
    }
  } catch (e) {}

  const [options, setOptions] = useState(initialOptions);
  const [solutionText, setSolutionText] = useState(initialSolution);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [difficulty, setDifficulty] = useState('medium');
  const [topicId, setTopicId] = useState('');
  
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [searchingSimilar, setSearchingSimilar] = useState(false);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'preview'

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

  const reject = async () => {
    if (!reason) { setError('Rejection reason is required.'); return; }
    setSaving(true); setError('');
    try { await contentService.rejectCandidate(jobId, candidate.candidate_key, reason); onReviewed(); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
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
    <article className="border border-outline-variant bg-surface-dim rounded-md overflow-hidden flex flex-col group">
      {/* Header bar */}
      <div className="bg-surface-container px-4 py-3 flex justify-between items-center border-b border-outline-variant">
        <div className="text-label-sm-mono uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">description</span>
          Page {candidate.source_pages?.join(', ')} &middot; Q{candidate.source_question_number}
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('editor')} 
            className={`px-3 py-1 text-label-sm-mono uppercase tracking-widest transition-colors ${viewMode === 'editor' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Editor
          </button>
          <button 
            onClick={() => setViewMode('preview')} 
            className={`px-3 py-1 text-label-sm-mono uppercase tracking-widest transition-colors ${viewMode === 'preview' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
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
                <button onClick={findSimilar} disabled={searchingSimilar} className="text-label-sm-mono text-primary hover:text-primary-fixed uppercase tracking-widest">
                  {searchingSimilar ? 'Searching...' : 'Find Duplicates'}
                </button>
              </div>
              <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows="5" className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary font-mono text-sm rounded-sm" />
            </div>

            <div className="space-y-3">
              <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest block">Options & Correct Answer</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((opt, i) => (
                  <div key={opt.id} className={`flex items-start gap-3 p-3 border rounded-sm transition-colors ${correctAnswer === opt.id ? 'border-status-aligned bg-status-aligned/5' : 'border-outline-variant bg-surface-container'}`}>
                    <input 
                      type="radio" 
                      name={`correct-${candidate.candidate_key}`} 
                      checked={correctAnswer === opt.id}
                      onChange={() => setCorrectAnswer(opt.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="text-label-sm-mono text-on-surface-variant">Option {opt.id}</div>
                      <textarea 
                        value={opt.text} 
                        onChange={e => updateOption(i, e.target.value)} 
                        rows="2" 
                        className="w-full bg-transparent text-on-surface outline-none font-mono text-sm" 
                        placeholder="Option text (LaTeX)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">Solution (Optional LaTeX)</label>
              <textarea value={solutionText} onChange={e => setSolutionText(e.target.value)} rows="3" className="w-full bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary font-mono text-sm rounded-sm" />
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
                <div key={opt.id} className={`p-4 border rounded-sm flex gap-3 ${correctAnswer === opt.id ? 'border-status-aligned bg-status-aligned/10 text-status-aligned' : 'border-outline-variant text-on-surface-variant'}`}>
                  <div className="font-bold">{opt.id}.</div>
                  <div><MathText text={opt.text} /></div>
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
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Rejection reason (required if rejecting)" className="flex-1 bg-surface-container border border-outline-variant p-3 text-on-surface outline-none focus:border-primary rounded-sm" />
            <button disabled={saving} onClick={reject} className="px-6 py-3 border border-error text-error uppercase tracking-widest font-semibold hover:bg-error/10 transition-colors disabled:opacity-50 rounded-sm">Reject</button>
            <button disabled={saving} onClick={accept} className="px-6 py-3 bg-primary text-white uppercase tracking-widest font-semibold hover:brightness-110 transition-colors disabled:opacity-50 rounded-sm">Verify & Publish</button>
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

  useEffect(() => {
    loadJobs();
    topicsService.getTopics().then(hierarchy => setTopics(hierarchy.flatMap(subject =>
      (subject.chapters || []).flatMap(chapter => (chapter.topics || []).map(topic => ({
        id: topic.id, name: topic.name, chapter: chapter.name, subject: subject.name
      })))
    ))).catch(err => setError(err.message));
  }, []);

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
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest">
              {selectedJob ? `Review Candidates \u00B7 ${candidates.length} remaining` : 'Select a job to review'}
            </h3>
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

