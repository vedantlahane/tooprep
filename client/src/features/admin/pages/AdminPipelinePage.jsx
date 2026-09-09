import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { contentService } from '@/features/content/services/contentService';
import { loadPdfDocument, renderPdfPageToDataUrl } from '@/features/content/lib/clientPdfRenderer';
import { topicsService } from '@/features/topics/services/topicsService';
import MathText from '@/features/questions/components/MathText';
import {
  UploadCloud,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  RotateCcw,
  Check,
  X,
  Brain,
  FileText,
  Search,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  Eye,
  Activity,
  GitMerge,
  Filter,
  Plus,
  Terminal,
  Shield,
  FileCode,
  Image as ImageIcon
} from 'lucide-react';

// 7 Real Ingestion Pipeline Stages
const PIPELINE_STATIONS = [
  {
    id: 'staging',
    number: '01',
    title: 'PDF Ingestion & Checksum',
    subtitle: 'SHA-256 Deduplication & S3 Staging',
    stages: ['CREATED', 'UPLOADING'],
    icon: UploadCloud,
    accentColor: '#00BFFF', // Lumia Cyan
    engineTag: 'Supabase Storage + S3 Digest',
    services: ['content.storage.js', 'content.service.js'],
    description: 'Raw PDF question paper files are ingested via drag-and-drop. Generates a SHA-256 cryptographic checksum to prevent duplicate source papers, stores the file in cloud storage, and provisions an Ingestion Job entity.',
    inputs: ['Raw PDF File (Buffer)', 'Exam Metadata (Year, Shift, Session)', 'Source Checksum (SHA-256)'],
    outputs: ['job_id (canonical identity)', 'Permanent Storage Path (sources/<job_id>.pdf)', 'Ingestion Job record (MongoDB)']
  },
  {
    id: 'ocr',
    number: '02',
    title: 'LlamaParse OCR Engine',
    subtitle: 'Multimodal Vision & KaTeX AST',
    stages: ['PARSING'],
    icon: Brain,
    accentColor: '#8A2BE2', // Purple
    engineTag: 'LlamaParse v2.4 Vision Engine',
    services: ['llamaparse.provider.js', 'content.worker.js'],
    description: 'Dispatches the PDF to the LlamaParse multimodal OCR model. Parses multi-column exam pages, converts mathematical notations into standard KaTeX LaTeX strings, and generates clean markdown page buffers.',
    inputs: ['Remote PDF Stream', 'Provider API Credentials'],
    outputs: ['Structured Markdown Pages', 'Page-by-page token boundaries', 'KaTeX LaTeX equations ($...$ and $$...$$)']
  },
  {
    id: 'diagrams',
    number: '03',
    title: 'Geometry & Crop Engine',
    subtitle: 'PyMuPDF Clustering & Splitting',
    stages: ['STRUCTURING'],
    icon: Layers,
    accentColor: '#FF8C00', // Mango
    engineTag: 'PyMuPDF Vector Cluster + Question Slicer',
    services: ['pdf-diagram-extractor.py', 'question-extraction.js'],
    description: 'Parses vector drawing objects (chemical benzene rings, electrical circuit paths) using a 24pt expansion radius to merge disconnected bonds and reagents into a single composite 300 DPI diagram snapshot, and slices text into numbered question candidates.',
    inputs: ['PDF Coordinate Map', 'Drawing Vector Primitives', 'Question Delimiters (Q.1, Q.2)'],
    outputs: ['Cropped 300 DPI Diagram PNGs', 'Candidate Question DTOs', 'Isolated Options (A, B, C, D)']
  },
  {
    id: 'dedup',
    number: '04',
    title: 'Deduplication Guard',
    subtitle: 'Trigram Dice Similarity Check',
    stages: ['VALIDATING'],
    icon: GitMerge,
    accentColor: '#0078D7', // Cobalt
    engineTag: 'Dice Trigram + Jaccard Normalizer',
    services: ['deduplication.service.js', 'content.service.js'],
    description: 'Calculates the Dice coefficient of word and formula trigrams against all existing questions in the target topic. If similarity >= 0.80, the candidate is flagged for quarantine; otherwise, it passes cleanly to Faculty Review.',
    inputs: ['Candidate Text & Options AST', 'Existing Topic Question Corpus', 'Formula Stripped Plaintext'],
    outputs: ['Similarity Score (0.00 to 1.00)', 'Match Classification (EXACT / HIGH / CLEAN)', 'Quarantine vs Review Routing']
  },
  {
    id: 'review',
    number: '05',
    title: 'Faculty Quality Gate',
    subtitle: 'Human Verification & Syllabus Tagging',
    stages: ['AWAITING_REVIEW'],
    icon: Check,
    accentColor: '#E3A21A', // Amber
    engineTag: 'Split-Screen Studio + Formula Editor',
    services: ['ContentAdminPage.jsx', 'StudioPdfViewer'],
    description: 'Faculty or subject matter experts inspect candidate questions against the source PDF, correct LaTeX equations via the math toolbar, verify the correct answer key, and attach precise curriculum topic tags.',
    inputs: ['Candidate Draft', 'Original PDF Page High-Res View', 'Curriculum Topic Tree'],
    outputs: ['Faculty Approval (Verified = true)', 'Confirmed Topic ID & Difficulty', 'Correct Option Key & Explanation']
  },
  {
    id: 'sync',
    number: '06',
    title: 'Dual Projection Sync',
    subtitle: 'PostgreSQL + Qdrant Vectorization',
    stages: ['STORING', 'INDEXING', 'SYNCING'],
    icon: Activity,
    accentColor: '#00ABA9', // Teal
    engineTag: 'Supabase PostgreSQL + Qdrant 768-dim Vector',
    services: ['publication.repository.js', 'qdrant.repository.js', 'embedding.provider.js'],
    description: 'The verified question is committed into Supabase PostgreSQL (relational core with RLS protection) and vectorized using text-embedding-004 into Qdrant for semantic search and retrieval.',
    inputs: ['Verified Question Entity', 'Correct Answer & Solution Text', 'Topic Hierarchy Coordinates'],
    outputs: ['Permanent Question ID (`q_...`)', 'PostgreSQL Record (`questions` table)', 'Qdrant Vector Point (768-dim embedding)']
  },
  {
    id: 'completed',
    number: '07',
    title: 'Live Question Bank',
    subtitle: 'Active Curriculum Deployment',
    stages: ['COMPLETED'],
    icon: CheckCircle2,
    accentColor: '#107C10', // Emerald
    engineTag: 'Live Test Delivery & Telemetry',
    services: ['evaluations.service.js', 'practice.service.js'],
    description: 'The question is live in the student question bank, ready for timed diagnostic evaluations and untimed practice drills with confidence gap calibration.',
    inputs: ['Student Attempts', 'Pre-test Confidence Ratings (1-10)'],
    outputs: ['Confidence Gap Score', 'Cognitive Mistake Diagnostics', 'Cohort Performance Analytics']
  }
];

export default function AdminPipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedJobIdFromUrl = searchParams.get('jobId') || '';

  // Core Data State
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(selectedJobIdFromUrl);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Selected Job Cockpit Data
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateFilter, setCandidateFilter] = useState('ALL'); // ALL, REVIEW_REQUIRED, PUBLISHED, REJECTED
  const [activeCockpitTab, setActiveCockpitTab] = useState('candidates'); // 'candidates', 'logs', 'pdf', 'specs'

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL'); // ALL, or station id

  // Polling Engine
  const [pollInterval, setPollInterval] = useState(30); // 0 = off, 10, 30, 60s
  const [countdown, setCountdown] = useState(30);

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadExam, setUploadExam] = useState('JEE Main');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [uploadSession, setUploadSession] = useState('Session 1 - Shift 1');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Action in Progress Tracking
  const [actionInProgress, setActionInProgress] = useState({});

  // Topic Hierarchy for Quick Assignment
  const [topics, setTopics] = useState([]);
  const [selectedTopicByCandidate, setSelectedTopicByCandidate] = useState({});

  // PDF Page Viewer state
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfPageDataUrl, setPdfPageDataUrl] = useState('');
  const [renderingPdf, setRenderingPdf] = useState(false);

  // ── Live SSE Activity Log ──────────────────────────────────────────────────
  const [liveEvents, setLiveEvents] = useState([]); // array of SSE event objects
  const [sseConnected, setSseConnected] = useState(false);
  const liveLogRef = useRef(null);

  // 1. Fetch Ingestion Jobs
  const loadJobs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingJobs(true);
    else setRefreshing(true);
    setError('');
    try {
      const jobsData = await contentService.listJobs().catch(() => []);
      const safeJobs = Array.isArray(jobsData) ? jobsData : (jobsData?.jobs || []);
      setJobs(safeJobs);

      // Auto-select job if none selected
      if (!selectedJobId && safeJobs.length > 0) {
        const initialId = selectedJobIdFromUrl || safeJobs[0].job_id;
        setSelectedJobId(initialId);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch ingestion jobs.');
    } finally {
      setLoadingJobs(false);
      setRefreshing(false);
    }
  }, [selectedJobId, selectedJobIdFromUrl]);

  useEffect(() => {
    loadJobs(false);
  }, [loadJobs]);

  // 2. Fetch Topics for Quick Assignment
  useEffect(() => {
    topicsService.getTopics().then(data => {
      const allTopics = Array.isArray(data) ? data : (data?.topics || []);
      setTopics(allTopics);
    }).catch(() => {});
  }, []);

  // 3. Polling Engine
  useEffect(() => {
    if (pollInterval <= 0) {
      setCountdown(0);
      return;
    }
    setCountdown(pollInterval);
    const ticker = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          loadJobs(true);
          return pollInterval;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [pollInterval, loadJobs]);

  // 4. Load Candidates when selectedJobId changes
  const loadCandidates = useCallback(async (jobId) => {
    if (!jobId) {
      setCandidates([]);
      return;
    }
    setLoadingCandidates(true);
    try {
      const data = await contentService.getCandidates(jobId).catch(() => []);
      const safeCandidates = Array.isArray(data) ? data : (data?.candidates || []);
      setCandidates(safeCandidates);
    } catch (err) {
      console.warn('Failed to load candidates for job:', err.message);
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      loadCandidates(selectedJobId);
      setSearchParams({ jobId: selectedJobId });
    }
  }, [selectedJobId, loadCandidates, setSearchParams]);

  // ── SSE: Auto-subscribe to live pipeline events when job is active ──────────
  useEffect(() => {
    if (!selectedJobId) return;

    // Clear old events when switching jobs
    setLiveEvents([]);
    setSseConnected(false);

    let unsubscribe = null;
    let cancelled = false;

    contentService.subscribeToJobEvents(
      selectedJobId,
      (event) => {
        if (cancelled) return;
        setLiveEvents(prev => [...prev, event].slice(-200));
        if (event.step === 'sse_connected') setSseConnected(true);
      },
      () => { if (!cancelled) setSseConnected(false); }
    ).then(unsub => {
      if (cancelled) {
        // Component already unmounted or job changed — close immediately
        unsub();
      } else {
        unsubscribe = unsub;
      }
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      setSseConnected(false);
    };
  }, [selectedJobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll live log to bottom on new events
  useEffect(() => {
    if (liveLogRef.current && liveEvents.length > 0) {
      liveLogRef.current.scrollTop = liveLogRef.current.scrollHeight;
    }
  }, [liveEvents]);

  // Job Actions
  const handleJobSelect = (jobId) => {
    setSelectedJobId(jobId);
    setPdfPageNum(1);
    setPdfPageDataUrl('');
  };

  // Selected Job Object
  const currentJob = useMemo(() => {
    return jobs.find(j => j.job_id === selectedJobId) || jobs[0] || null;
  }, [jobs, selectedJobId]);

  // Station counts computed from real jobs
  const stationCounts = useMemo(() => {
    const counts = {};
    PIPELINE_STATIONS.forEach(st => { counts[st.id] = 0; });
    let failedCount = 0;

    jobs.forEach(job => {
      const stage = (job.stage || '').toUpperCase();
      if (stage === 'FAILED' || stage === 'PAUSED') {
        failedCount += 1;
      }
      PIPELINE_STATIONS.forEach(st => {
        if (st.stages.includes(stage)) {
          counts[st.id] += 1;
        }
      });
    });
    return { counts, failedCount };
  }, [jobs]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Stage filter
      if (stageFilter === 'FAILED') {
        const st = (job.stage || '').toUpperCase();
        if (st !== 'FAILED' && st !== 'PAUSED') return false;
      } else if (stageFilter !== 'ALL') {
        const targetStation = PIPELINE_STATIONS.find(s => s.id === stageFilter);
        if (targetStation && !targetStation.stages.includes((job.stage || '').toUpperCase())) {
          return false;
        }
      }

      // Search query
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const filename = (job.source?.filename || '').toLowerCase();
      const exam = (job.source?.exam || '').toLowerCase();
      const year = String(job.source?.year || '');
      const id = (job.job_id || '').toLowerCase();
      return filename.includes(q) || exam.includes(q) || year.includes(q) || id.includes(q);
    });
  }, [jobs, stageFilter, searchQuery]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    if (candidateFilter === 'ALL') return candidates;
    return candidates.filter(c => c.status === candidateFilter);
  }, [candidates, candidateFilter]);



  const handleJobRetry = async (jobId) => {
    setActionInProgress(prev => ({ ...prev, [jobId]: 'retrying' }));
    try {
      await contentService.transitionJob(jobId, 'PARSING', 'Admin manual retry from Pipeline Console');
      await loadJobs(true);
    } catch (err) {
      alert('Retry error: ' + (err.message || 'Failed to retry job'));
    } finally {
      setActionInProgress(prev => ({ ...prev, [jobId]: null }));
    }
  };

  const handleJobPauseToggle = async (jobId, currentStage) => {
    const isPaused = currentStage === 'PAUSED';
    const targetStage = isPaused ? 'PARSING' : 'PAUSED';
    const reason = isPaused ? 'Admin resumed pipeline processing' : 'Admin paused pipeline processing';

    setActionInProgress(prev => ({ ...prev, [jobId]: 'pausing' }));
    try {
      await contentService.transitionJob(jobId, targetStage, reason);
      await loadJobs(true);
    } catch (err) {
      alert('Pause toggle error: ' + (err.message || 'Failed to update job stage'));
    } finally {
      setActionInProgress(prev => ({ ...prev, [jobId]: null }));
    }
  };

  const handleJobDelete = async (jobId) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ingestion job "${jobId}"? This will delete all associated extracted candidates.`
    );
    if (!confirmDelete) return;

    const deleteQuestions = window.confirm(
      `Do you also want to DELETE all questions published from this job from the Question Bank?\n\n• OK = Delete Job + Remove Questions from Question Bank\n• Cancel = Delete Job only (keep published questions)`
    );

    setActionInProgress(prev => ({ ...prev, [jobId]: 'deleting' }));
    try {
      await contentService.deleteJob(jobId, deleteQuestions);
      setJobs(prev => prev.filter(j => j.job_id !== jobId));
      if (selectedJobId === jobId) {
        setSelectedJobId('');
      }
    } catch (err) {
      alert('Delete error: ' + (err.message || 'Failed to delete job'));
    } finally {
      setActionInProgress(prev => ({ ...prev, [jobId]: null }));
    }
  };

  // Upload New Job
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a PDF file to upload');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const res = await contentService.uploadPdf(uploadFile, {
        exam: uploadExam,
        year: Number(uploadYear),
        metadata: { session: uploadSession }
      });
      setUploadModalOpen(false);
      setUploadFile(null);
      await loadJobs(false);
      if (res?.job_id) {
        setSelectedJobId(res.job_id);
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to upload question paper');
    } finally {
      setUploading(false);
    }
  };

  // Candidate Actions
  const handleAcceptCandidate = async (candidate) => {
    const topicId = selectedTopicByCandidate[candidate.candidate_key] || candidate.curriculum?.topic_id;
    if (!topicId) {
      alert('Please select a syllabus topic for this question before publishing.');
      return;
    }
    setActionInProgress(prev => ({ ...prev, [candidate.candidate_key]: 'accepting' }));
    try {
      const draft = {
        question_text: candidate.question_text,
        options: candidate.options,
        correct_answer: candidate.correct_answer || 'A',
        solution_text: candidate.solution_text || '',
        curriculum: { topic_id: topicId },
        difficulty: candidate.difficulty || 'medium',
        source_type: 'PYQ',
        exam: currentJob?.source?.exam || 'JEE Main',
        year: currentJob?.source?.year || 2024
      };
      await contentService.acceptCandidate(currentJob.job_id, candidate.candidate_key, draft);
      setCandidates(prev => prev.map(c => c.candidate_key === candidate.candidate_key ? { ...c, status: 'PUBLISHED' } : c));
    } catch (err) {
      alert('Accept error: ' + (err.message || 'Failed to accept candidate'));
    } finally {
      setActionInProgress(prev => ({ ...prev, [candidate.candidate_key]: null }));
    }
  };

  const handleRejectCandidate = async (candidateKey, reason = 'Malformed question') => {
    setActionInProgress(prev => ({ ...prev, [candidateKey]: 'rejecting' }));
    try {
      await contentService.rejectCandidate(currentJob.job_id, candidateKey, reason);
      setCandidates(prev => prev.map(c => c.candidate_key === candidateKey ? { ...c, status: 'REJECTED' } : c));
    } catch (err) {
      alert('Reject error: ' + (err.message || 'Failed to reject candidate'));
    } finally {
      setActionInProgress(prev => ({ ...prev, [candidateKey]: null }));
    }
  };

  // Render PDF Page on demand with server + client streaming fallback
  const handleRenderPdfPage = async (pageNum) => {
    if (!currentJob) return;
    setRenderingPdf(true);
    try {
      const res = await contentService.renderPdfPage(currentJob.job_id, pageNum, 150);
      if (res && res.success !== false && (res.data_url || res.dataUrl)) {
        setPdfPageDataUrl(res.data_url || res.dataUrl);
        return;
      }
      throw new Error(res?.error || 'Server render failed');
    } catch (err) {
      try {
        const buffer = await contentService.downloadSourcePdfBuffer(currentJob.job_id);
        const doc = await loadPdfDocument(buffer, `${currentJob.job_id}_streamed`);
        const pageRes = await renderPdfPageToDataUrl(doc, pageNum, 1.5);
        if (pageRes?.dataUrl) {
          setPdfPageDataUrl(pageRes.dataUrl);
        }
      } catch (clientErr) {
        console.warn('PDF render error (server & client):', clientErr);
      }
    } finally {
      setRenderingPdf(false);
    }
  };

  return (
    <div className="w-full min-w-0 animate-fade-in space-y-6 pb-20 text-left select-none">
      {/* ─── Top Mission Header & Polling Bar ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <GitMerge className="w-3.5 h-3.5 text-primary" />
              <span>CONTENT INGESTION ENGINE</span>
            </span>
            {pollInterval > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-status-aligned/10 border border-status-aligned/40 text-status-aligned text-[10px] font-mono uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-status-aligned animate-ping" />
                <span>Live ({countdown}s)</span>
              </span>
            )}
          </div>
          <h1 className="text-display text-white mt-1 font-light">
            Pipeline Console
          </h1>
          <p className="text-body-md text-white/60 font-light mt-1">
            Real-time ingestion lifecycle, multimodal OCR, vector diagram extraction, deduplication, and production sync.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Polling Interval Selector */}
          <div className="flex items-center border border-white/15 bg-white/[0.02] text-xs font-mono">
            <span className="px-2.5 py-1.5 text-white/50 text-[10px] uppercase tracking-wider border-r border-white/10">
              Poll:
            </span>
            {[
              { label: 'Off', val: 0 },
              { label: '10s', val: 10 },
              { label: '30s', val: 30 },
              { label: '60s', val: 60 }
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setPollInterval(opt.val)}
                className={`px-2.5 py-1.5 text-[11px] font-mono transition-colors cursor-pointer ${
                  pollInterval === opt.val
                    ? 'bg-primary text-black font-bold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadJobs(false)}
            disabled={loadingJobs}
            className="px-3.5 py-2 border border-white/15 hover:border-primary text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingJobs || refreshing ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Upload New Paper Button */}
          <button
            type="button"
            onClick={() => { setUploadModalOpen(true); setUploadError(''); }}
            className="px-4 py-2 bg-primary text-black text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 flex items-center gap-2 transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Ingest Question Paper</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 border border-error/40 bg-error/10 text-error text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadJobs(false)} className="underline hover:text-white uppercase">Retry</button>
        </div>
      )}

      {/* ─── 1. Interactive Pipeline Stepper & Real Stage Telemetry ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-white/60 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>PIPELINE STAGE STEPPER ({jobs.length} TOTAL INGESTION JOBS)</span>
          </span>
          {stationCounts.failedCount > 0 && (
            <button
              onClick={() => setStageFilter(stageFilter === 'FAILED' ? 'ALL' : 'FAILED')}
              className={`flex items-center gap-1.5 px-2.5 py-1 border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                stageFilter === 'FAILED'
                  ? 'border-error bg-error text-white'
                  : 'border-error/40 bg-error/10 text-error hover:border-error'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{stationCounts.failedCount} Failed / Paused</span>
            </button>
          )}
        </div>

        {/* Responsive Horizontal Stepper Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono text-xs">
          {PIPELINE_STATIONS.map((station) => {
            const count = stationCounts.counts[station.id] || 0;
            const isFilterActive = stageFilter === station.id;
            const IconComp = station.icon;

            return (
              <div
                key={station.id}
                onClick={() => setStageFilter(isFilterActive ? 'ALL' : station.id)}
                className={`p-3.5 border transition-all cursor-pointer relative flex flex-col justify-between min-h-[110px] text-left group ${
                  isFilterActive
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
                }`}
              >
                <span
                  className="absolute top-2.5 right-2.5 w-1.5 h-1.5"
                  style={{ backgroundColor: station.accentColor }}
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/40 group-hover:text-white transition-colors">
                    {station.number}
                  </span>
                  <IconComp className="w-4 h-4 text-white/50 group-hover:text-primary transition-colors" />
                </div>

                <div className="space-y-0.5 my-1">
                  <div className="text-xs font-semibold text-white uppercase tracking-wider truncate">
                    {station.title}
                  </div>
                  <div className="text-[10px] text-white/40 truncate">
                    {station.stages.join(' / ')}
                  </div>
                </div>

                <div className="flex items-baseline justify-between border-t border-white/10 pt-1.5 text-[11px]">
                  <span className="text-white/50 text-[10px]">Active:</span>
                  <span className={`font-bold ${count > 0 ? 'text-primary' : 'text-white/30'}`}>
                    {count} {count === 1 ? 'job' : 'jobs'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 2. Ingestion Jobs Matrix & Browser ─── */}
      <section className="space-y-4">
        {/* Search & Quick Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 border border-white/10 bg-white/[0.01]">
          <div className="flex items-center gap-2 flex-1 relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search paper by filename, year, exam, or job ID..."
              className="w-full pl-9 pr-4 py-2 border border-white/15 bg-white/[0.02] text-xs font-mono text-white placeholder:text-white/30 outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-white/40 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
            <span className="text-white/40 text-[10px] uppercase mr-1">Filter:</span>
            {[
              { id: 'ALL', label: 'All Jobs' },
              { id: 'review', label: 'Review' },
              { id: 'completed', label: 'Completed' },
              { id: 'FAILED', label: 'Failed' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStageFilter(tab.id)}
                className={`px-2.5 py-1 text-[11px] uppercase transition-colors cursor-pointer border ${
                  stageFilter === tab.id
                    ? 'border-primary bg-primary/20 text-primary font-bold'
                    : 'border-white/10 text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs List / Table */}
        {filteredJobs.length === 0 ? (
          <div className="p-8 border border-white/10 bg-white/[0.01] text-center space-y-3 font-mono text-xs text-white/60">
            <FileText className="w-8 h-8 text-white/30 mx-auto" />
            <p>No ingestion jobs match the selected filter criteria.</p>
            <button
              onClick={() => { setStageFilter('ALL'); setSearchQuery(''); }}
              className="text-primary hover:underline uppercase text-xs font-bold"
            >
              Reset Filters &rarr;
            </button>
          </div>
        ) : (
          <div className="border border-white/10 bg-white/[0.01] divide-y divide-white/10">
            {filteredJobs.map(job => {
              const isSelected = selectedJobId === job.job_id;
              const isActioning = Boolean(actionInProgress[job.job_id]);
              const stage = (job.stage || 'CREATED').toUpperCase();
              const isFailed = stage === 'FAILED' || stage === 'PAUSED';
              const isCompleted = stage === 'COMPLETED';

              return (
                <div
                  key={job.job_id}
                  onClick={() => handleJobSelect(job.job_id)}
                  className={`p-4 transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left ${
                    isSelected
                      ? 'bg-primary/[0.06] border-l-2 border-l-primary'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Left Metadata */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
                        isCompleted
                          ? 'border-status-aligned/50 bg-status-aligned/10 text-status-aligned'
                          : isFailed
                          ? 'border-error/50 bg-error/10 text-error'
                          : 'border-primary/50 bg-primary/10 text-primary'
                      }`}>
                        [{stage}]
                      </span>
                      <span className="text-sm font-light text-white truncate max-w-md">
                        {job.source?.filename || job.job_id}
                      </span>
                      {job.source?.exam && (
                        <span className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 border border-white/10">
                          {job.source.exam} {job.source.year || ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-white/50">
                      <span>ID: <code className="text-white/70">{job.job_id}</code></span>
                      <span>Pages: <strong className="text-white">{job.progress?.total_pages || job.progress?.processed_pages || '?'}</strong></span>
                      <span>Questions: <strong className="text-primary">{job.question_count || job.progress?.questions_extracted || 0}</strong></span>
                      <span className="hidden sm:inline text-white/40">
                        {new Date(job.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs" onClick={e => e.stopPropagation()}>
                    {/* View Source PDF */}
                    <button
                      type="button"
                      onClick={() => contentService.openSourcePdf(job.job_id)}
                      className="px-2.5 py-1 border border-white/15 hover:border-white/40 text-white/70 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="View original uploaded PDF"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Source PDF</span>
                    </button>

                    {/* Retry Action (if failed/paused) */}
                    {isFailed && (
                      <button
                        type="button"
                        onClick={() => handleJobRetry(job.job_id)}
                        disabled={isActioning}
                        className="px-3 py-1 bg-status-weak/20 border border-status-weak text-status-weak hover:bg-status-weak hover:text-black font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${actionInProgress[job.job_id] === 'retrying' ? 'animate-spin' : ''}`} />
                        <span>Retry</span>
                      </button>
                    )}

                    {/* Pause / Resume */}
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleJobPauseToggle(job.job_id, stage)}
                        disabled={isActioning}
                        className="px-2.5 py-1 border border-white/15 hover:border-white/40 text-white/70 hover:text-white transition-colors cursor-pointer"
                      >
                        {stage === 'PAUSED' ? 'Resume' : 'Pause'}
                      </button>
                    )}

                    {/* Delete Job */}
                    <button
                      type="button"
                      onClick={() => handleJobDelete(job.job_id)}
                      disabled={isActioning}
                      className="p-1.5 border border-white/10 hover:border-error text-white/40 hover:text-error transition-colors cursor-pointer"
                      title="Delete ingestion job"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Select Job Indicator */}
                    <button
                      type="button"
                      onClick={() => handleJobSelect(job.job_id)}
                      className={`px-3 py-1 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary text-black'
                          : 'border border-primary/40 text-primary hover:bg-primary/10'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Inspect'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── 3. Selected Job Operations Cockpit (Deep Dive) ─── */}
      {currentJob && (
        <section className="border border-white/15 bg-white/[0.01] p-6 space-y-6 text-left relative">
          <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary" />

          {/* Cockpit Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                <span>ACTIVE JOB TELEMETRY COCKPIT</span>
                <span className="text-white/30">&middot;</span>
                <span className="text-white/60 font-normal">{currentJob.job_id}</span>
              </div>
              <h2 className="text-2xl font-light text-white">
                {currentJob.source?.filename || 'Ingestion Job Details'}
              </h2>
            </div>

            {/* Pivot Tabs: Candidates vs Logs vs PDF vs Specs */}
            <div className="flex items-baseline gap-4 sm:gap-6 font-mono text-xs border-b border-white/10 md:border-b-0 pb-2 md:pb-0">
              <button
                type="button"
                onClick={() => setActiveCockpitTab('candidates')}
                className={`cursor-pointer transition-colors pb-1 uppercase tracking-wider ${
                  activeCockpitTab === 'candidates'
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Candidates ({candidates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCockpitTab('logs')}
                className={`cursor-pointer transition-colors pb-1 uppercase tracking-wider ${
                  activeCockpitTab === 'logs'
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Events &amp; Telemetry
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveCockpitTab('pdf');
                  if (!pdfPageDataUrl) handleRenderPdfPage(1);
                }}
                className={`cursor-pointer transition-colors pb-1 uppercase tracking-wider ${
                  activeCockpitTab === 'pdf'
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Source PDF Viewer
              </button>
              <button
                type="button"
                onClick={() => setActiveCockpitTab('specs')}
                className={`cursor-pointer transition-colors pb-1 uppercase tracking-wider ${
                  activeCockpitTab === 'specs'
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Pipeline Architecture
              </button>
            </div>
          </div>

          {/* ─── TAB 1: EXTRACTED CANDIDATES STREAM ─── */}
          {activeCockpitTab === 'candidates' && (
            <div className="space-y-4 animate-fade-in">
              {/* Candidate Filter Strip */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-[10px] uppercase">Status:</span>
                  {[
                    { id: 'ALL', label: 'All', count: candidates.length },
                    { id: 'REVIEW_REQUIRED', label: 'Review Required', count: candidates.filter(c => c.status === 'REVIEW_REQUIRED').length },
                    { id: 'PUBLISHED', label: 'Published', count: candidates.filter(c => c.status === 'PUBLISHED').length },
                    { id: 'REJECTED', label: 'Rejected', count: candidates.filter(c => c.status === 'REJECTED').length }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setCandidateFilter(filter.id)}
                      className={`px-2.5 py-1 border transition-colors cursor-pointer ${
                        candidateFilter === filter.id
                          ? 'border-primary bg-primary/20 text-primary font-bold'
                          : 'border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>

                <Link
                  to="/admin/content"
                  className="text-primary hover:underline uppercase text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Split-Screen Cropper Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Candidates Grid */}
              {loadingCandidates ? (
                <div className="p-8 text-center text-xs font-mono text-white/50 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading candidate question stream...</span>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="p-8 border border-white/10 text-center font-mono text-xs text-white/50 space-y-2">
                  <p>No questions found under the "{candidateFilter}" filter for this job.</p>
                  {candidates.length === 0 && (
                    <p className="text-white/30 text-[11px]">
                      If the job is still in OCR or Structuring, wait for the background worker to finish parsing.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCandidates.map((cand) => {
                    const isActioning = Boolean(actionInProgress[cand.candidate_key]);
                    const isPublished = cand.status === 'PUBLISHED';
                    const isRejected = cand.status === 'REJECTED';

                    return (
                      <div
                        key={cand.candidate_key}
                        className={`p-4 border transition-all text-left space-y-3 ${
                          isPublished
                            ? 'border-status-aligned/40 bg-status-aligned/[0.02]'
                            : isRejected
                            ? 'border-white/10 bg-white/[0.01] opacity-60'
                            : 'border-white/15 bg-white/[0.02]'
                        }`}
                      >
                        {/* Candidate Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white bg-white/10 px-2 py-0.5">
                              Q.{cand.source_question_number || cand.candidate_key}
                            </span>
                            {cand.source_pages?.length > 0 && (
                              <span className="text-white/40 text-[10px]">
                                Page {cand.source_pages.join(', ')}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                              isPublished
                                ? 'border-status-aligned text-status-aligned bg-status-aligned/10'
                                : isRejected
                                ? 'border-error text-error bg-error/10'
                                : 'border-amber-400 text-amber-400 bg-amber-400/10'
                            }`}>
                              [{cand.status}]
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-white/50">
                            {cand.has_diagram && (
                              <span className="text-primary flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Diagram</span>
                              </span>
                            )}
                            <span>Answer: <strong className="text-status-aligned">{cand.correct_answer || 'A'}</strong></span>
                            {cand.classification_confidence && (
                              <span>Confidence: {Math.round(cand.classification_confidence * 100)}%</span>
                            )}
                          </div>
                        </div>

                        {/* Question Stem with MathText */}
                        <div className="text-sm font-light text-white leading-relaxed">
                          <MathText text={cand.question_text || ''} />
                        </div>

                        {/* Options Grid */}
                        {cand.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {Object.entries(cand.options).map(([key, optText]) => {
                              const isCorrect = cand.correct_answer === key;
                              return (
                                <div
                                  key={key}
                                  className={`p-2 border text-xs flex items-start gap-2 ${
                                    isCorrect
                                      ? 'border-status-aligned/50 bg-status-aligned/10 text-white'
                                      : 'border-white/10 bg-white/[0.01] text-white/80'
                                  }`}
                                >
                                  <span className={`w-4 h-4 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                                    isCorrect ? 'bg-status-aligned text-black' : 'bg-white/10 text-primary'
                                  }`}>
                                    {key}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <MathText text={String(optText || '')} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Topic Selector & Fast Action Bar */}
                        {!isPublished && !isRejected && (
                          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="text-white/50 text-[10px] uppercase shrink-0">Topic:</span>
                              <select
                                value={selectedTopicByCandidate[cand.candidate_key] || cand.curriculum?.topic_id || ''}
                                onChange={e => setSelectedTopicByCandidate(prev => ({
                                  ...prev,
                                  [cand.candidate_key]: e.target.value
                                }))}
                                className="bg-black border border-white/20 text-white p-1.5 text-xs outline-none focus:border-primary w-full sm:w-64"
                              >
                                <option value="">Select Topic in Syllabus...</option>
                                {topics.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.subject} › {t.chapter} › {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRejectCandidate(cand.candidate_key, 'Incomplete / Malformed')}
                                disabled={isActioning}
                                className="px-3 py-1.5 border border-error/40 text-error hover:bg-error hover:text-white uppercase text-[11px] font-bold cursor-pointer transition-colors"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAcceptCandidate(cand)}
                                disabled={isActioning}
                                className="px-4 py-1.5 bg-status-aligned text-black hover:brightness-110 uppercase text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm shadow-status-aligned/20"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>{isActioning ? 'Verifying...' : 'Accept & Publish'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 2: LIVE PIPELINE ACTIVITY LOG (SSE) ─── */}
          {activeCockpitTab === 'logs' && (
            <div className="space-y-4 animate-fade-in font-mono text-xs">

              {/* Activity Log Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span className="text-white font-bold uppercase tracking-wider text-xs">Live Pipeline Activity Log</span>
                  {sseConnected ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-status-aligned/10 border border-status-aligned/30 text-status-aligned text-[10px] uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-aligned animate-ping" />
                      <span>Live</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/10 text-white/40 text-[10px] uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                      <span>Connecting…</span>
                    </span>
                  )}
                  <span className="text-white/30 text-[10px]">{liveEvents.length} events</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLiveEvents([])}
                  className="text-[10px] text-white/30 hover:text-white/60 uppercase cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {/* Terminal-style Scrolling Log */}
              <div
                ref={liveLogRef}
                className="bg-[#050810] border border-white/10 rounded-sm p-3 max-h-[420px] overflow-y-auto space-y-1 font-mono text-[11px] leading-relaxed"
              >
                {liveEvents.length === 0 ? (
                  <div className="text-white/30 text-center py-8 space-y-2">
                    <Activity className="w-6 h-6 mx-auto text-white/20" />
                    <p>Waiting for pipeline activity…</p>
                    <p className="text-[10px]">Events will stream here in real-time as the worker processes this job.</p>
                  </div>
                ) : (
                  liveEvents.map((ev, i) => {
                    const levelColors = {
                      success: 'text-status-aligned',
                      error:   'text-error',
                      warn:    'text-status-weak',
                      info:    'text-white/80'
                    };
                    const stageColors = {
                      PARSING:         'bg-purple-900/40 text-purple-300 border-purple-700/40',
                      STRUCTURING:     'bg-orange-900/40 text-orange-300 border-orange-700/40',
                      VALIDATING:      'bg-blue-900/40 text-blue-300 border-blue-700/40',
                      CLASSIFYING:     'bg-cyan-900/40 text-cyan-300 border-cyan-700/40',
                      STORING:         'bg-teal-900/40 text-teal-300 border-teal-700/40',
                      INDEXING:        'bg-indigo-900/40 text-indigo-300 border-indigo-700/40',
                      AWAITING_REVIEW: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
                      CONNECTED:       'bg-primary/10 text-primary border-primary/30',
                      WORKING:         'bg-white/5 text-white/60 border-white/10'
                    };
                    const stageBadgeCls = stageColors[ev.stage] || 'bg-white/5 text-white/50 border-white/10';
                    const msgCls = levelColors[ev.level] || 'text-white/80';
                    const time = new Date(ev.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    return (
                      <div key={i} className="flex items-start gap-2 py-0.5 border-b border-white/[0.04] last:border-0">
                        {/* Timestamp */}
                        <span className="text-white/30 text-[10px] shrink-0 pt-px w-16">{time}</span>

                        {/* Stage badge */}
                        <span className={`text-[9px] px-1.5 py-0.5 border uppercase font-bold shrink-0 ${stageBadgeCls}`}>
                          {ev.stage?.slice(0, 8)}
                        </span>

                        {/* Message */}
                        <span className={`flex-1 ${msgCls}`}>
                          {ev.level === 'success' && '✓ '}
                          {ev.level === 'error'   && '✗ '}
                          {ev.level === 'warn'    && '⚠ '}
                          {ev.message}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Detail Drawer: last event with detail payload */}
              {liveEvents.length > 0 && liveEvents[liveEvents.length - 1]?.detail && (
                <details className="border border-white/10 bg-black p-3">
                  <summary className="text-[10px] text-white/50 uppercase tracking-wider cursor-pointer hover:text-white/70">
                    Last Event Detail Payload
                  </summary>
                  <pre className="mt-2 text-[10px] text-primary overflow-x-auto">
                    {JSON.stringify(liveEvents[liveEvents.length - 1].detail, null, 2)}
                  </pre>
                </details>
              )}

              {/* Lifecycle Events (static from job record) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-white/10 bg-black p-4 space-y-3">
                  <div className="text-primary font-bold uppercase tracking-wider text-xs border-b border-white/10 pb-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Lifecycle State Transitions</span>
                  </div>
                  {currentJob.events && currentJob.events.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {currentJob.events.map((ev, i) => (
                        <div key={i} className="p-2 border border-white/10 bg-white/[0.01] space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-primary font-bold">[{ev.event || 'EVENT'}]</span>
                            <span className="text-white/40">
                              {new Date(ev.occurred_at || Date.now()).toLocaleTimeString('en-IN')}
                            </span>
                          </div>
                          {ev.actor_id && (
                            <div className="text-[10px] text-white/50">Actor: {ev.actor_id}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 italic">No state transitions recorded yet.</p>
                  )}
                </div>

                <div className="border border-white/10 bg-black p-4 space-y-3">
                  <div className="text-error font-bold uppercase tracking-wider text-xs border-b border-white/10 pb-2 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-error" />
                    <span>Error Log</span>
                  </div>
                  {currentJob.errors && currentJob.errors.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {currentJob.errors.map((errItem, i) => (
                        <div key={i} className="p-2.5 border border-error/30 bg-error/10 text-error space-y-1">
                          <div className="font-bold text-[11px]">{errItem.code || 'ERROR'}</div>
                          <p className="text-[11px] leading-relaxed text-white/90">{errItem.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 border border-status-aligned/30 bg-status-aligned/5 text-status-aligned text-xs">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Zero Runtime Exceptions</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Raw JSON */}
              <details className="border border-white/10 bg-black p-4">
                <summary className="text-xs font-mono uppercase tracking-wider text-white/70 hover:text-white cursor-pointer select-none">
                  Inspect Raw Ingestion Job Document (JSON)
                </summary>
                <div className="mt-3 p-3 bg-[#050505] border border-white/10 font-mono text-[10px] text-primary overflow-x-auto max-h-64">
                  <pre>{JSON.stringify(currentJob, null, 2)}</pre>
                </div>
              </details>
            </div>
          )}



          {/* ─── TAB 3: SOURCE PDF VIEWER ─── */}
          {activeCockpitTab === 'pdf' && (
            <div className="space-y-4 animate-fade-in font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-white/60 uppercase text-[10px]">Page Navigation:</span>
                  <div className="flex items-center border border-white/20">
                    <button
                      type="button"
                      disabled={pdfPageNum <= 1 || renderingPdf}
                      onClick={() => {
                        const p = Math.max(1, pdfPageNum - 1);
                        setPdfPageNum(p);
                        handleRenderPdfPage(p);
                      }}
                      className="px-3 py-1 text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      &larr; Prev
                    </button>
                    <span className="px-3 py-1 text-primary font-bold border-x border-white/20">
                      Page {pdfPageNum}
                    </span>
                    <button
                      type="button"
                      disabled={renderingPdf}
                      onClick={() => {
                        const p = pdfPageNum + 1;
                        setPdfPageNum(p);
                        handleRenderPdfPage(p);
                      }}
                      className="px-3 py-1 text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => contentService.openSourcePdf(currentJob.job_id)}
                  className="text-primary hover:underline uppercase text-xs font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                >
                  <span>Open Full PDF in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rendered PDF Canvas */}
              <div className="border border-white/10 bg-black min-h-[480px] flex items-center justify-center p-4 relative">
                {renderingPdf ? (
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span>Rendering page {pdfPageNum} at 150 DPI...</span>
                  </div>
                ) : pdfPageDataUrl ? (
                  <img
                    src={pdfPageDataUrl}
                    alt={`Page ${pdfPageNum}`}
                    className="max-h-[640px] max-w-full object-contain border border-white/20 shadow-2xl"
                  />
                ) : (
                  <div className="text-center space-y-2 text-white/50">
                    <p>Click below to render Page {pdfPageNum} of this document.</p>
                    <button
                      type="button"
                      onClick={() => handleRenderPdfPage(pdfPageNum)}
                      className="px-4 py-2 bg-primary text-black font-bold uppercase text-xs"
                    >
                      Render Page {pdfPageNum}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 4: ARCHITECTURE SPECIFICATIONS ─── */}
          {activeCockpitTab === 'specs' && (
            <div className="space-y-4 animate-fade-in font-sans text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {PIPELINE_STATIONS.map((st) => (
                  <div key={st.id} className="p-4 border border-white/10 bg-black space-y-2 relative">
                    <span
                      className="absolute top-2.5 right-2.5 w-1.5 h-1.5"
                      style={{ backgroundColor: st.accentColor }}
                    />
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase">
                      <span>{st.number}</span>
                      <span>&middot;</span>
                      <span>{st.title}</span>
                    </div>
                    <p className="text-white/70 font-light leading-relaxed text-xs">
                      {st.description}
                    </p>
                    <div className="text-[10px] font-mono text-primary pt-1 border-t border-white/10 flex justify-between">
                      <span>Engine: {st.engineTag}</span>
                      <span>{st.services[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── 4. Upload Question Paper Modal ─── */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-lg w-full border border-primary/40 bg-black p-6 space-y-6 text-left relative shadow-2xl"
            >
              <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-light text-white">Ingest Question Paper</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="text-white/40 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploadError && (
                <div className="p-3 border border-error/40 bg-error/10 text-error text-xs font-mono">
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-4 font-mono text-xs">
                {/* File Dropzone */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-white/60 font-semibold">
                    Source PDF Document (Max 50 MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    required
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full p-3 border border-white/15 bg-white/[0.02] text-xs text-white file:mr-4 file:py-1 file:px-3 file:border-0 file:bg-primary file:text-black file:text-xs file:font-bold file:uppercase cursor-pointer"
                  />
                  {uploadFile && (
                    <div className="text-[10px] text-status-aligned pt-0.5">
                      Selected: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  )}
                </div>

                {/* Exam Type */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-white/60 font-semibold">
                    Exam Category
                  </label>
                  <select
                    value={uploadExam}
                    onChange={e => setUploadExam(e.target.value)}
                    className="w-full p-2.5 border border-white/15 bg-black text-white text-xs outline-none focus:border-primary"
                  >
                    <option value="JEE Main">JEE Main</option>
                    <option value="JEE Advanced">JEE Advanced</option>
                    <option value="NEET">NEET</option>
                    <option value="Custom Drill">Custom Question Bank</option>
                  </select>
                </div>

                {/* Year & Session */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-white/60 font-semibold">
                      Exam Year
                    </label>
                    <input
                      type="number"
                      value={uploadYear}
                      onChange={e => setUploadYear(e.target.value)}
                      min="2000"
                      max="2030"
                      required
                      className="w-full p-2.5 border border-white/15 bg-black text-white text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-white/60 font-semibold">
                      Session / Shift
                    </label>
                    <input
                      type="text"
                      value={uploadSession}
                      onChange={e => setUploadSession(e.target.value)}
                      placeholder="Shift 1 - Morning"
                      className="w-full p-2.5 border border-white/15 bg-black text-white text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 border border-white/15 text-white/60 hover:text-white uppercase text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="px-6 py-2.5 bg-primary text-black font-bold uppercase text-xs tracking-wider hover:brightness-110 disabled:opacity-40 cursor-pointer flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Dispatch to Pipeline</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
