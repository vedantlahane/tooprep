import { useEffect, useState } from 'react';
import { api } from '@/shared/lib/api';

const defaultOptions = '[{"id":"A","text":""},{"id":"B","text":""}]';

function Candidate({ candidate, jobId, topics, onReviewed }) {
  const [questionText, setQuestionText] = useState(candidate.raw_text);
  const [options, setOptions] = useState(defaultOptions);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [difficulty, setDifficulty] = useState('medium');
  const [topicId, setTopicId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [searchingSimilar, setSearchingSimilar] = useState(false);

  const accept = async () => {
    setSaving(true); setError('');
    try {
      await api.acceptIngestionCandidate(jobId, candidate.candidate_key, {
        question_text: questionText,
        options: JSON.parse(options),
        correct_answer: correctAnswer,
        difficulty,
        source_type: 'PYQ',
        question_type: 'single_correct',
        curriculum: { topic_id: topicId, difficulty }
      });
      onReviewed();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const reject = async () => {
    setSaving(true); setError('');
    try { await api.rejectIngestionCandidate(jobId, candidate.candidate_key, reason); onReviewed(); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const findSimilar = async () => {
    setSearchingSimilar(true);
    try {
      const results = await api.searchQuestions(questionText, 3);
      setSimilarQuestions(results);
    } catch (err) { setError(err.message); } finally { setSearchingSimilar(false); }
  };

  return (
    <article className="border-2 border-outline-variant bg-surface-dim p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-label-sm-mono uppercase tracking-widest text-primary">page {candidate.source_pages.join(', ')} · q{candidate.source_question_number}</div>
        <button onClick={findSimilar} disabled={searchingSimilar} className="text-label-sm-mono text-on-surface-variant hover:text-primary uppercase tracking-widest disabled:opacity-50">
          {searchingSimilar ? 'searching...' : 'find similar'}
        </button>
      </div>
      
      {similarQuestions.length > 0 && (
        <div className="bg-surface-container border border-outline-variant p-3 space-y-2">
          <div className="text-label-sm-mono text-primary uppercase tracking-widest mb-2">potential duplicates</div>
          {similarQuestions.map((sim, i) => (
            <div key={i} className="text-body-sm text-on-surface-variant border-l-2 border-primary pl-2">
              <span className="font-mono mr-2">{(sim.score * 100).toFixed(0)}%</span>
              {sim.question.question_text || sim.question.content?.question_text}
            </div>
          ))}
        </div>
      )}

      <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows="7" className="w-full bg-surface-container border-2 border-outline-variant p-3 text-on-surface outline-none focus:border-primary" />
      <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest">options JSON</label>
      <textarea value={options} onChange={e => setOptions(e.target.value)} rows="3" className="w-full bg-surface-container border-2 border-outline-variant p-3 font-mono text-sm text-on-surface outline-none focus:border-primary" />
      <div className="grid grid-cols-2 gap-3">
        <input value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} placeholder="Correct option id" className="bg-surface-container border-2 border-outline-variant p-3 text-on-surface outline-none focus:border-primary" />
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="bg-surface-container border-2 border-outline-variant p-3 text-on-surface outline-none focus:border-primary">
          <option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option>
        </select>
      </div>
      <select required value={topicId} onChange={e => setTopicId(e.target.value)} className="w-full bg-surface-container border-2 border-outline-variant p-3 text-on-surface outline-none focus:border-primary">
        <option value="">select curriculum topic before publishing</option>
        {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.subject} / {topic.chapter} / {topic.name}</option>)}
      </select>
      <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Rejection reason (required to reject)" className="w-full bg-surface-container border-2 border-outline-variant p-3 text-on-surface outline-none focus:border-primary" />
      {error && <p className="text-error text-body-md">{error}</p>}
      <div className="flex gap-3">
        <button disabled={saving} onClick={accept} className="flex-1 bg-primary text-white py-3 uppercase tracking-widest font-semibold disabled:opacity-50">verify & publish</button>
        <button disabled={saving} onClick={reject} className="flex-1 border-2 border-error text-error py-3 uppercase tracking-widest font-semibold disabled:opacity-50">reject</button>
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
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadJobs = async () => {
    try { setJobs(await api.listIngestionJobs()); } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const chooseJob = async (job) => {
    setSelectedJob(job); setCandidates([]); setError('');
    try { setCandidates(await api.getIngestionCandidates(job.job_id)); } catch (err) { setError(err.message); }
  };
  const upload = async (event) => {
    event.preventDefault();
    if (!file) return;
    setUploading(true); setError('');
    try { const job = await api.uploadIngestionPdf(file, { exam, year }); await loadJobs(); await chooseJob(job); setFile(null); event.target.reset(); }
    catch (err) { setError(err.message); } finally { setUploading(false); }
  };
  useEffect(() => {
    loadJobs();
    api.getTopics().then(hierarchy => setTopics(hierarchy.flatMap(subject =>
      (subject.chapters || []).flatMap(chapter => (chapter.topics || []).map(topic => ({
        id: topic.id, name: topic.name, chapter: chapter.name, subject: subject.name
      })))
    ))).catch(err => setError(err.message));
  }, []);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8">
      <div><h2 className="text-display text-on-surface font-light">content ops</h2><p className="text-on-surface-variant text-body-lg font-light">upload PDFs, track ingestion, then verify every extracted candidate.</p></div>
      <form onSubmit={upload} className="border-2 border-primary bg-surface-dim p-6 grid md:grid-cols-3 gap-4 items-end">
        <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest">source PDF<input required type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files[0] || null)} className="block mt-2 text-body-md text-on-surface" /></label>
        <label className="block text-label-sm-mono text-on-surface-variant uppercase tracking-widest">exam<input value={exam} onChange={e => setExam(e.target.value)} className="block mt-2 w-full bg-surface-container border-2 border-outline-variant p-3 text-on-surface outline-none focus:border-primary" /></label>
        <div className="flex gap-3"><input value={year} onChange={e => setYear(e.target.value)} placeholder="Year" className="w-24 bg-surface-container border-2 border-outline-variant p-3 text-on-surface outline-none focus:border-primary" /><button disabled={uploading} className="flex-1 bg-primary text-white py-3 uppercase tracking-widest font-semibold disabled:opacity-50">{uploading ? 'uploading' : 'ingest'}</button></div>
      </form>
      {error && <p className="border-l-4 border-error bg-error/10 p-4 text-error">{error}</p>}
      <section className="grid lg:grid-cols-[1fr_2fr] gap-6">
        <div className="space-y-2"><h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-3">jobs</h3>{loading ? <p>loading...</p> : jobs.map(job => <button key={job.job_id} onClick={() => chooseJob(job)} className={`w-full text-left p-4 border-2 ${selectedJob?.job_id === job.job_id ? 'border-primary bg-primary/10' : 'border-outline-variant bg-surface-dim'}`}><div className="font-semibold text-on-surface">{job.source.filename || job.job_id}</div><div className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mt-1">{job.stage} · {job.progress.questions_extracted} candidates</div></button>)}</div>
        <div><h3 className="text-label-sm-mono text-on-surface-variant uppercase tracking-widest mb-3">{selectedJob ? `review · ${selectedJob.job_id}` : 'select a job'}</h3><div className="space-y-5">{candidates.map(candidate => <Candidate key={candidate.candidate_key} candidate={candidate} jobId={selectedJob.job_id} topics={topics} onReviewed={() => chooseJob(selectedJob)} />)}</div></div>
      </section>
    </div>
  );
}
