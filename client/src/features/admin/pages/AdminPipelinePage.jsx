import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { contentService } from '@/features/content/services/contentService';
import { adminService } from '../services/adminService';
import MathText from '@/features/questions/components/MathText';
import Icon, {
  GitMerge,
  UploadCloud,
  Sparkles,
  FileText,
  Layers,
  Copy,
  CheckCircle2,
  Activity,
  BookOpen,
  Users,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Play,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  Server,
  Brain,
  Timer,
  Target,
  ExternalLink,
  ChevronRight,
  Eye
} from '@/shared/components/Icon';

// 8 Core Pipeline Stations Definition
const PIPELINE_STATIONS = [
  {
    id: 'storage',
    number: 1,
    title: 'PDF Ingestion & Storage',
    subtitle: 'Upload, Checksum & S3 Staging',
    icon: UploadCloud,
    accentColor: '#00BFFF',
    stageName: 'CREATED',
    services: ['content.storage.js', 'content.service.js', 'Supabase Storage Bucket (sources)'],
    description: 'Raw PDF question paper files are ingested via drag-and-drop or batch upload. The system generates a cryptographic SHA-256 checksum to prevent duplicate source papers, stores the file in secure cloud storage, and provisions an immutable Ingestion Job entity.',
    inputs: ['Raw PDF File (Buffer)', 'Exam Metadata (Year, Shift, Session)', 'Source Checksum (SHA-256)'],
    outputs: ['job_id (canonical identity)', 'Permanent Storage Path (sources/<job_id>.pdf)', 'Ingestion Job record (MongoDB)'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Open Content Ops'
  },
  {
    id: 'ocr',
    number: 2,
    title: 'LlamaParse OCR Engine',
    subtitle: 'Deep Layout & Math Extraction',
    icon: Brain,
    accentColor: '#8A2BE2',
    stageName: 'PARSING',
    services: ['llamaparse.provider.js', 'content.worker.js', 'LlamaIndex Cloud API'],
    description: 'The background worker dispatches the PDF to the LlamaParse multimodal OCR model. It parses multi-column exam pages, converts mathematical notations into standard KaTeX LaTeX strings, extracts superscripts, subscripts, fractions, and generates clean markdown page buffers.',
    inputs: ['Remote PDF Stream', 'Provider API Credentials'],
    outputs: ['Structured Markdown Pages', 'Page-by-page token boundaries', 'KaTeX LaTeX equations ($...$ and $$...$$)'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'View Ingestion Queue'
  },
  {
    id: 'diagrams',
    number: 3,
    title: 'Diagram & Bond Cropper',
    subtitle: 'PyMuPDF Vector & Raster Clustering',
    icon: Sparkles,
    accentColor: '#FF8C00',
    stageName: 'STRUCTURING',
    services: ['pdf-diagram-extractor.py', 'diagram.service.js', 'PyMuPDF / FitZ Engine'],
    description: 'A Python worker analyzes vector graphics and drawings across the PDF. It clusters disconnected chemical bonds, benzene rings, and reagent text with 24pt expansion radius, renders composite chemical structures at 300 DPI, uploads diagram PNGs, and matches them to candidate questions.',
    inputs: ['Source PDF File', 'Vector Drawing Primitives & Path Coordinates'],
    outputs: ['Cropped Diagram PNGs (diag_*.png)', 'Bounding Box Rectangles ([x0, y0, x1, y1])', 'Question Stem & Option Diagram Map'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Open PDF Cropper Studio'
  },
  {
    id: 'segmentation',
    number: 4,
    title: 'Candidate Segmentation',
    subtitle: 'Question Delimiters & Choices',
    icon: FileText,
    accentColor: '#00BFFF',
    stageName: 'VALIDATING',
    services: ['question-extraction.js', 'candidateParser.js', 'Curriculum Mapping Heuristics'],
    description: 'Rule-based parsers and layout heuristics slice the continuous markdown into individual question candidate records. It extracts choices (A, B, C, D), infers answer keys from appended answer blocks, maps initial syllabus topic recommendations, and stages drafts.',
    inputs: ['Markdown Page Array', 'Curriculum Topic Taxonomy (Physics/Chem/Math)'],
    outputs: ['Candidate Questions Array (MongoDB)', 'Parsed Choices (A, B, C, D)', 'Auto-Detected Answer Key', 'Suggested Topic ID'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Review Candidates'
  },
  {
    id: 'deduplication',
    number: 5,
    title: 'Deduplication Gate',
    subtitle: 'Trigram Dice Similarity Engine',
    icon: Copy,
    accentColor: '#FF2E55',
    stageName: 'VALIDATING',
    services: ['deduplication.service.js', 'question_duplicates table', 'Dice Coefficient Algorithm'],
    description: 'Every extracted question is evaluated against the existing repository. Mathematical formulas and whitespace are normalized, and Dice coefficient bigram matching checks for exact 100% duplicate questions or OCR phrasing variations, preventing repetitive syllabus bloat.',
    inputs: ['Candidate Question Text', 'Live Question Bank Corpus (Supabase)'],
    outputs: ['Similarity Score (0.00 to 1.00)', 'Match Classification (EXACT / HIGH_CONFIDENCE / POTENTIAL)', 'Duplicate Resolution Flag'],
    targetRoute: '/admin/duplicates',
    targetRouteLabel: 'Audit Duplicates'
  },
  {
    id: 'review',
    number: 6,
    title: 'Faculty Review & Quality Gate',
    subtitle: 'Human Verification & Curation',
    icon: CheckCircle2,
    accentColor: '#107C10',
    stageName: 'AWAITING_REVIEW',
    services: ['ContentAdminPage.jsx', 'AdminQuestionsPage.jsx', 'Human-in-the-Loop Workflow'],
    description: 'Faculty and platform administrators inspect each question candidate in side-by-side split view. They verify the answer key, confirm mathematical correctness, assign difficulty (Easy/Medium/Hard), verify diagram attachments, and confirm the syllabus chapter and topic.',
    inputs: ['Candidate Draft Card', 'Rendered High-Res PDF Page Preview', 'Faculty Feedback / Topic Placement'],
    outputs: ['Approved Question Payload', 'Rejection Reason (if discarded)', 'Verified Status Flag (verified = true / false)'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Verify Candidates in Ops'
  },
  {
    id: 'sync',
    number: 7,
    title: 'Dual-Store Persistence',
    subtitle: 'PostgreSQL Row + Qdrant Vector',
    icon: Server,
    accentColor: '#00BFFF',
    stageName: 'COMPLETED',
    services: ['content.service.js', 'embedding.provider.js', 'qdrant.repository.js', 'Supabase Admin'],
    description: 'Approved questions are persisted atomically into PostgreSQL (Supabase `questions` table). Concurrently, the text and choices are converted into high-dimensional embeddings and written into Qdrant Vector Search for semantic similarity searches and recommendation retrieval.',
    inputs: ['Accepted Question DTO', 'Canonical UUID'],
    outputs: ['Supabase questions record', 'Qdrant 768-dim Dense Vector Point', 'Projection Sync Confirmation (projection_syncs)'],
    targetRoute: '/admin/syncs',
    targetRouteLabel: 'View Projection Syncs'
  },
  {
    id: 'telemetry',
    number: 8,
    title: 'Live Practice & Telemetry Loop',
    subtitle: 'Exam Engine & Gap Calibration',
    icon: Activity,
    accentColor: '#107C10',
    stageName: 'LIVE',
    services: ['evaluations.service.js', 'practice.service.js', 'dashboard.utils.js', 'Student Observability'],
    description: 'The verified question enters the live question bank, ready for student timed evaluations and untimed practice drills. Real-time attempt telemetry computes student confidence-performance gaps, classifies cognitive mistake patterns, and updates curriculum mastery metrics.',
    inputs: ['Student Attempts & Timers', 'Pre-test Confidence Ratings (1-10)'],
    outputs: ['Confidence Gap Score (Overconfident / Underconfident / Aligned)', 'Cognitive Mistake Diagnostics', 'Cohort Performance Analytics'],
    targetRoute: '/admin/students',
    targetRouteLabel: 'Inspect Student Cohorts'
  }
];

// Interactive Simulation Step Previews
const SIMULATION_STEPS = [
  {
    stageId: 'storage',
    title: 'Stage 1: PDF Drop & Storage Staging',
    caption: 'Admin drops "JEE_Main_2024_Shift1.pdf" (14.2 MB) into Content Ops.',
    previewType: 'json',
    code: `{
  "job_id": "job_e98f01b34c2a",
  "stage": "UPLOADING",
  "source": {
    "filename": "JEE_Main_2024_Shift1.pdf",
    "storage_path": "sources/job_e98f01b34c2a.pdf",
    "source_sha256": "8a7f1e9d3c2b1a0987f65e4d3c2b1a0987f65e4d3c2b1a0987f65e4d3c2b1a09",
    "exam": "JEE Main",
    "year": 2024
  },
  "progress": { "total_pages": 32, "processed_pages": 0 },
  "created_at": "2026-09-08T18:30:00.000Z"
}`
  },
  {
    stageId: 'ocr',
    title: 'Stage 2: LlamaParse Deep Layout & Math OCR',
    caption: 'LlamaParse extracts KaTeX LaTeX math formulas from raw document pages.',
    previewType: 'math_markdown',
    text: `A block of mass $m = 2\\text{ kg}$ is attached to a spring of spring constant $k = 200\\text{ N/m}$. The system is suspended vertically. If the block is pulled down by a distance $x_0 = 5\\text{ cm}$ from its equilibrium position and released, the angular frequency of oscillation $\\omega$ is:

(A) $10\\text{ rad/s}$
(B) $20\\text{ rad/s}$
(C) $5\\text{ rad/s}$
(D) $100\\text{ rad/s}$`
  },
  {
    stageId: 'diagrams',
    title: 'Stage 3: Vector Drawing Clustered Crop',
    caption: 'PyMuPDF clusters chemical bonds, reaction arrows, and reagent annotations into a clean composite PNG.',
    previewType: 'diagram',
    figureUrl: 'https://uzdyhdbjncwuatgqjpsi.supabase.co/storage/v1/object/public/question-images/diagrams/diag_1788721811620_2_c25407c.png',
    meta: 'Extracted: 24pt expansion radius • 300 DPI high resolution • Bounds: [142.5, 310.2, 458.0, 520.6]'
  },
  {
    stageId: 'segmentation',
    title: 'Stage 4: Candidate Segmentation & Choices Parser',
    caption: 'Delimiters slice page into structured question candidate with choices A, B, C, D.',
    previewType: 'json',
    code: `{
  "candidate_key": "cand_04",
  "question_text": "A block of mass $m = 2\\\\text{ kg}$ is attached to a spring...",
  "options": [
    { "id": "A", "text": "$10\\\\text{ rad/s}$" },
    { "id": "B", "text": "$20\\\\text{ rad/s}$" },
    { "id": "C", "text": "$5\\\\text{ rad/s}$" },
    { "id": "D", "text": "$100\\\\text{ rad/s}$" }
  ],
  "correct_answer": "A",
  "suggested_topic_id": "topic_shm_oscillations",
  "source_pages": [14]
}`
  },
  {
    stageId: 'deduplication',
    title: 'Stage 5: Trigram Dice Deduplication Check',
    caption: 'Deduplication engine verifies similarity against all existing physics questions.',
    previewType: 'dedup_badge',
    score: '0.12',
    status: 'CLEAN_UNIQUE',
    explanation: 'Max similarity against question q_98124 is 12.4% (well below the 80% threshold). Certified unique question.'
  },
  {
    stageId: 'review',
    title: 'Stage 6: Faculty Human Review & Quality Gate',
    caption: 'Faculty reviews derivation, tags syllabus chapter, and verifies KaTeX equation formatting.',
    previewType: 'review_decision',
    reviewer: 'Prof. Sharma (Physics Dept)',
    topic: 'Physics > Simple Harmonic Motion > Spring-Mass Systems',
    difficulty: 'Easy',
    status: 'ACCEPTED_FOR_PUBLICATION'
  },
  {
    stageId: 'sync',
    title: 'Stage 7: Dual-Store Supabase + Qdrant Vectorization',
    caption: 'Atomically inserted into PostgreSQL and indexed into Qdrant 768-dim vector point space.',
    previewType: 'json',
    code: `{
  "postgres": {
    "table": "questions",
    "id": "q_7f8a9b1c2d3e",
    "verified": true,
    "publication_status": "PUBLISHED"
  },
  "qdrant": {
    "collection": "questions_v1",
    "point_id": "7f8a9b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c",
    "vector_dim": 768,
    "status": "INDEXED"
  }
}`
  },
  {
    stageId: 'telemetry',
    title: 'Stage 8: Student Exam & Confidence Gap Calibration',
    caption: 'Question is delivered in JEE mock test; student attempt feeds cognitive gap telemetry.',
    previewType: 'student_telemetry',
    studentName: 'Aarav Patel',
    confidenceRating: '8/10 (High Confidence)',
    studentAnswer: 'A (Correct)',
    duration: '42 seconds',
    gapClassification: 'ALIGNED (Accurate Self-Calibrated Confidence)'
  }
];

export default function AdminPipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedJobIdFromUrl = searchParams.get('jobId') || '';

  // Mode: 'live' (real jobs in system) vs 'simulation' (step-by-step walkthrough)
  const [activeMode, setActiveMode] = useState('live');

  // Selected station node for deep inspection
  const [selectedStationId, setSelectedStationId] = useState('storage');

  // Live ingestion jobs from backend
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(selectedJobIdFromUrl);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [observability, setObservability] = useState(null);

  // Simulation state
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [simIsPlaying, setSimIsPlaying] = useState(false);

  // Fetch ingestion jobs and observability telemetry
  const loadData = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const [jobsData, obsData] = await Promise.all([
        contentService.listJobs().catch(() => []),
        adminService.getObservability().catch(() => null)
      ]);

      const safeJobs = Array.isArray(jobsData) ? jobsData : (jobsData?.jobs || []);
      setJobs(safeJobs);
      setObservability(obsData);

      if (!selectedJobId && safeJobs.length > 0) {
        setSelectedJobId(safeJobs[0].job_id);
      }
    } catch (e) {
      console.error('Failed to load pipeline data:', e);
    } finally {
      setLoadingJobs(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // If URL has jobId, select it
  useEffect(() => {
    if (selectedJobIdFromUrl) {
      setSelectedJobId(selectedJobIdFromUrl);
    }
  }, [selectedJobIdFromUrl]);

  // Selected job details
  const currentJob = useMemo(() => {
    return jobs.find(j => j.job_id === selectedJobId) || jobs[0] || null;
  }, [jobs, selectedJobId]);

  // Calculate current stage index for selected job
  const currentJobStageIndex = useMemo(() => {
    if (!currentJob) return 0;
    const st = (currentJob.stage || '').toUpperCase();
    if (st === 'CREATED' || st === 'UPLOADING') return 0;
    if (st === 'PARSING') return 1;
    if (st === 'STRUCTURING') return 2;
    if (st === 'VALIDATING') return 3;
    if (st === 'AWAITING_REVIEW') return 5;
    if (st === 'COMPLETED') return 7;
    if (st === 'FAILED' || st === 'PAUSED') return 1;
    return 0;
  }, [currentJob]);

  // Active station data
  const selectedStation = useMemo(() => {
    return PIPELINE_STATIONS.find(s => s.id === selectedStationId) || PIPELINE_STATIONS[0];
  }, [selectedStationId]);

  // Simulation timer
  useEffect(() => {
    if (!simIsPlaying) return;
    const timer = setInterval(() => {
      setSimStepIndex(prev => {
        if (prev >= SIMULATION_STEPS.length - 1) {
          setSimIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [simIsPlaying]);

  // Sync simulation step to selected station
  useEffect(() => {
    if (activeMode === 'simulation') {
      const step = SIMULATION_STEPS[simStepIndex];
      if (step) {
        setSelectedStationId(step.stageId);
      }
    }
  }, [simStepIndex, activeMode]);

  const handleNextSimStep = () => {
    setSimStepIndex(i => Math.min(SIMULATION_STEPS.length - 1, i + 1));
  };

  const handlePrevSimStep = () => {
    setSimStepIndex(i => Math.max(0, i - 1));
  };

  const handleResetSim = () => {
    setSimIsPlaying(false);
    setSimStepIndex(0);
  };

  const handleJobSelect = (jobId) => {
    setSelectedJobId(jobId);
    setSearchParams({ jobId });
  };

  return (
    <div className="w-full max-w-7xl min-w-0 mr-auto animate-fade-in space-y-6 pb-20 text-left">
      {/* ─── Mission Header & Mode Selector ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-label-sm-mono uppercase tracking-[0.2em] text-primary text-xs">
              System Architecture & Flow Observability
            </p>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              <span>Live Visual Pipeline</span>
            </span>
          </div>
          <h1 className="text-display text-on-surface mt-1 font-light">
            Content & Exam Pipeline Observability
          </h1>
          <p className="text-body-md text-on-surface-variant font-light mt-1">
            Visual tracking of every PDF question paper from raw ingestion, multimodal OCR, vector diagram cropping, deduplication, and faculty review to student exam analytics.
          </p>
        </div>

        {/* Mode Toggle Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border border-white/20 bg-surface-container font-mono text-xs p-0.5">
            <button
              onClick={() => setActiveMode('live')}
              className={`px-3 py-1.5 uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeMode === 'live' ? 'bg-primary text-white font-bold' : 'text-white/60 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Job Flight Tracker</span>
            </button>
            <button
              onClick={() => {
                setActiveMode('simulation');
                setSimStepIndex(0);
              }}
              className={`px-3 py-1.5 uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeMode === 'simulation' ? 'bg-primary text-white font-bold' : 'text-white/60 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Interactive PDF Simulation</span>
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loadingJobs}
            className="p-2 border border-white/20 bg-surface-container hover:border-primary text-white/70 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            title="Refresh pipeline status"
          >
            <RefreshCw className={`w-4 h-4 ${loadingJobs ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Mode 1: Live Job Selection Bar ─── */}
      {activeMode === 'live' && (
        <div className="p-4 bg-surface-container border border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-white/50 uppercase tracking-widest text-[11px] font-semibold flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-primary" />
              <span>Inspect Source PDF / Job:</span>
            </span>

            {jobs.length > 0 ? (
              <select
                value={selectedJobId}
                onChange={e => handleJobSelect(e.target.value)}
                className="bg-black border border-white/20 text-white p-2 outline-none focus:border-primary uppercase text-xs min-w-[280px]"
              >
                {jobs.map(j => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.source?.filename || j.job_id} — [{j.stage || 'UNKNOWN'}]
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-white/50 italic">No ingestion jobs currently stored in MongoDB.</span>
            )}
          </div>

          {currentJob && (
            <div className="flex items-center gap-3 text-[11px] text-white/70">
              <span>Pages: <strong className="text-white">{currentJob.progress?.total_pages || currentJob.progress?.processed_pages || '-'}</strong></span>
              <span>•</span>
              <span>Questions: <strong className="text-primary">{currentJob.progress?.questions_extracted ?? 0}</strong></span>
              <span>•</span>
              <span className={`px-2 py-0.5 border font-bold uppercase ${
                currentJob.stage === 'AWAITING_REVIEW'
                  ? 'bg-status-weak/20 border-status-weak text-status-weak'
                  : currentJob.stage === 'COMPLETED'
                  ? 'bg-status-aligned/20 border-status-aligned text-status-aligned'
                  : currentJob.stage === 'FAILED'
                  ? 'bg-error/20 border-error text-error'
                  : 'bg-primary/20 border-primary text-primary'
              }`}>
                {currentJob.stage}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── Mode 2: Interactive Simulation Control Toolbar ─── */}
      {activeMode === 'simulation' && (
        <div className="p-4 bg-gradient-to-r from-primary/10 via-surface-container to-surface-dim border-2 border-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
            <div>
              <span className="text-primary uppercase tracking-widest font-bold block text-[11px]">
                Simulation Step {simStepIndex + 1} of {SIMULATION_STEPS.length}
              </span>
              <span className="text-white text-xs font-light">
                {SIMULATION_STEPS[simStepIndex]?.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevSimStep}
              disabled={simStepIndex === 0}
              className="px-3 py-1.5 border border-white/20 hover:border-primary text-white disabled:opacity-30 transition-colors uppercase cursor-pointer"
            >
              &larr; Prev
            </button>
            <button
              onClick={() => setSimIsPlaying(!simIsPlaying)}
              className="px-3.5 py-1.5 bg-primary text-white font-bold hover:brightness-110 transition-all uppercase flex items-center gap-1.5 cursor-pointer"
            >
              {simIsPlaying ? <span className="font-bold">⏸ Pause</span> : <span>▶ Auto-Play</span>}
            </button>
            <button
              onClick={handleNextSimStep}
              disabled={simStepIndex === SIMULATION_STEPS.length - 1}
              className="px-3 py-1.5 border border-white/20 hover:border-primary text-white disabled:opacity-30 transition-colors uppercase cursor-pointer"
            >
              Next &rarr;
            </button>
            <button
              onClick={handleResetSim}
              className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer ml-1"
              title="Reset simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── The Visual Pipeline Schematic Grid (SVG + Interactive Metro Nodes) ─── */}
      <div className="p-6 bg-surface-dim border border-outline-variant space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-white/50 uppercase tracking-widest">
          <span>End-to-End Dataflow Stations</span>
          <span className="text-[11px] text-primary">Click any station to inspect internal architecture & data payloads</span>
        </div>

        {/* 8-Node Metro Horizontal Layout Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PIPELINE_STATIONS.map((station, idx) => {
            const IconComp = station.icon;
            const isSelected = selectedStationId === station.id;

            // Live flight highlight logic
            const isJobCurrent = activeMode === 'live' && currentJobStageIndex === idx;
            const isJobPassed = activeMode === 'live' && currentJobStageIndex > idx;
            const isJobFailed = activeMode === 'live' && (currentJob?.stage === 'FAILED' || currentJob?.stage === 'PAUSED') && currentJobStageIndex === idx;

            // Simulation step highlight
            const isSimCurrent = activeMode === 'simulation' && simStepIndex === idx;
            const isSimPassed = activeMode === 'simulation' && simStepIndex > idx;

            const isHighlighted = isJobCurrent || isSimCurrent;
            const isPassed = isJobPassed || isSimPassed;

            return (
              <div
                key={station.id}
                onClick={() => setSelectedStationId(station.id)}
                className={`p-4 border-2 transition-all cursor-pointer relative flex flex-col justify-between min-h-[140px] group ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10 ring-1 ring-primary'
                    : isHighlighted
                    ? 'border-primary bg-primary/5 ring-2 ring-primary animate-pulse'
                    : isPassed
                    ? 'border-status-aligned/40 bg-status-aligned/5 hover:border-status-aligned'
                    : 'border-white/10 bg-surface-container hover:border-white/30'
                }`}
              >
                {/* Station Top Rail */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 flex items-center justify-center rounded-sm font-mono text-xs font-bold ${
                      isHighlighted
                        ? 'bg-primary text-black'
                        : isPassed
                        ? 'bg-status-aligned text-black'
                        : 'bg-white/10 text-white'
                    }`}>
                      {station.number}
                    </div>
                    <IconComp className={`w-4 h-4 ${isHighlighted ? 'text-primary' : isPassed ? 'text-status-aligned' : 'text-white/60'}`} />
                  </div>

                  {/* Status Indicator Chip */}
                  <span className="text-[10px] font-mono uppercase tracking-wider">
                    {isHighlighted ? (
                      <span className="text-primary font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        Active
                      </span>
                    ) : isJobFailed ? (
                      <span className="text-error font-bold">Failed</span>
                    ) : isPassed ? (
                      <span className="text-status-aligned font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        Done
                      </span>
                    ) : (
                      <span className="text-white/30">Ready</span>
                    )}
                  </span>
                </div>

                {/* Station Title & Subtitle */}
                <div>
                  <h4 className={`text-sm font-light ${isSelected ? 'text-white font-normal' : 'text-white/90'}`}>
                    {station.title}
                  </h4>
                  <p className="text-[11px] font-mono text-white/50 truncate mt-0.5">
                    {station.subtitle}
                  </p>
                </div>

                {/* Forward Flow Arrow Connector */}
                {idx < PIPELINE_STATIONS.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <div className="w-5 h-5 rounded-full bg-surface-dim border border-white/20 flex items-center justify-center text-white/40">
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Simulation Step Visual Payload Preview Card ─── */}
      {activeMode === 'simulation' && SIMULATION_STEPS[simStepIndex] && (
        <motion.div
          key={simStepIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-primary bg-black p-6 space-y-4 font-mono text-xs shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Live In-Flight Data Transformation Preview</span>
            </div>
            <span className="text-white/50 text-[11px]">
              {SIMULATION_STEPS[simStepIndex].caption}
            </span>
          </div>

          {/* JSON Payload Preview */}
          {SIMULATION_STEPS[simStepIndex].previewType === 'json' && (
            <pre className="p-4 bg-surface-dim border border-white/10 text-primary overflow-x-auto text-[11px] leading-relaxed font-mono">
              {SIMULATION_STEPS[simStepIndex].code}
            </pre>
          )}

          {/* Math Text OCR Preview */}
          {SIMULATION_STEPS[simStepIndex].previewType === 'math_markdown' && (
            <div className="p-5 bg-surface-container border border-white/15 space-y-3">
              <span className="text-white/50 text-[10px] uppercase tracking-widest block">Rendered KaTeX Math Formula</span>
              <div className="text-body-lg text-on-surface font-light leading-relaxed">
                <MathText text={SIMULATION_STEPS[simStepIndex].text} />
              </div>
            </div>
          )}

          {/* Extracted Diagram Preview */}
          {SIMULATION_STEPS[simStepIndex].previewType === 'diagram' && (
            <div className="p-4 bg-surface-container border border-white/15 flex flex-col sm:flex-row items-center gap-5">
              <div className="p-3 bg-white rounded border border-white/20 max-w-xs shadow-md">
                <img
                  src={SIMULATION_STEPS[simStepIndex].figureUrl}
                  alt="Extracted Chemical Reaction Structure"
                  className="max-h-40 object-contain mx-auto"
                />
              </div>
              <div className="space-y-2">
                <span className="text-status-aligned font-bold text-xs uppercase tracking-wider block">
                  ✓ Vector Chemical Diagram Merged & Extracted
                </span>
                <p className="text-white/70 text-xs font-light">
                  {SIMULATION_STEPS[simStepIndex].meta}
                </p>
                <div className="text-[11px] text-white/40">
                  Target Injection: Automatic Markdown embedding into candidate question stem.
                </div>
              </div>
            </div>
          )}

          {/* Deduplication Score Preview */}
          {SIMULATION_STEPS[simStepIndex].previewType === 'dedup_badge' && (
            <div className="p-5 bg-surface-container border border-white/15 flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-white/50 text-[10px] uppercase tracking-widest block mb-1">
                  Trigram Similarity Score
                </span>
                <span className="text-4xl font-light text-status-aligned">
                  {SIMULATION_STEPS[simStepIndex].score}
                </span>
                <p className="text-white/70 mt-1 text-xs font-light">
                  {SIMULATION_STEPS[simStepIndex].explanation}
                </p>
              </div>

              <div className="px-4 py-2 bg-status-aligned/20 border border-status-aligned text-status-aligned font-bold uppercase tracking-widest text-xs">
                {SIMULATION_STEPS[simStepIndex].status}
              </div>
            </div>
          )}

          {/* Review Decision Preview */}
          {SIMULATION_STEPS[simStepIndex].previewType === 'review_decision' && (
            <div className="p-5 bg-surface-container border border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-white/50 uppercase text-[10px] block mb-1">Reviewed By</span>
                <span className="text-white font-semibold">{SIMULATION_STEPS[simStepIndex].reviewer}</span>
              </div>
              <div>
                <span className="text-white/50 uppercase text-[10px] block mb-1">Curriculum Placement</span>
                <span className="text-primary font-semibold">{SIMULATION_STEPS[simStepIndex].topic}</span>
              </div>
              <div>
                <span className="text-white/50 uppercase text-[10px] block mb-1">Verification Status</span>
                <span className="text-status-aligned font-bold">{SIMULATION_STEPS[simStepIndex].status}</span>
              </div>
            </div>
          )}

          {/* Student Telemetry Preview */}
          {SIMULATION_STEPS[simStepIndex].previewType === 'student_telemetry' && (
            <div className="p-5 bg-surface-container border border-white/15 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-white/50 uppercase text-[10px] block mb-1">Candidate</span>
                <span className="text-white font-semibold">{SIMULATION_STEPS[simStepIndex].studentName}</span>
              </div>
              <div>
                <span className="text-white/50 uppercase text-[10px] block mb-1">Pre-Test Confidence</span>
                <span className="text-status-weak font-semibold">{SIMULATION_STEPS[simStepIndex].confidenceRating}</span>
              </div>
              <div>
                <span className="text-white/50 uppercase text-[10px] block mb-1">Attempt Time</span>
                <span className="text-white font-semibold">{SIMULATION_STEPS[simStepIndex].duration}</span>
              </div>
              <div>
                <span className="text-white/50 uppercase text-[10px] block mb-1">Gap Engine Result</span>
                <span className="text-status-aligned font-bold">{SIMULATION_STEPS[simStepIndex].gapClassification}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Deep Station Diagnostic Inspector Panel ─── */}
      <div className="border border-primary/40 bg-surface-container p-6 space-y-6">
        {/* Diagnostic Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/15 border border-primary/40 flex items-center justify-center text-primary font-mono font-bold text-lg">
              {selectedStation.number}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
                Station Diagnostics & Architecture
              </span>
              <h3 className="text-xl text-white font-light mt-0.5">
                {selectedStation.title} &mdash; <span className="text-white/60 font-mono text-sm">{selectedStation.subtitle}</span>
              </h3>
            </div>
          </div>

          <Link
            to={selectedStation.targetRoute}
            className="px-4 py-2 bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>{selectedStation.targetRouteLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Station Narrative Explanation */}
        <p className="text-body-md text-on-surface font-light leading-relaxed">
          {selectedStation.description}
        </p>

        {/* Technical Architecture Specs: Inputs, Outputs & Workers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 font-mono text-xs">
          {/* Inputs */}
          <div className="p-4 bg-surface-dim border border-outline-variant space-y-2">
            <span className="text-white/50 uppercase tracking-wider text-[11px] block font-semibold">
              📥 Stage Inputs & Pre-Conditions
            </span>
            <ul className="space-y-1.5 text-white/80 text-[11px]">
              {selectedStation.inputs.map((inp, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">&bull;</span>
                  <span>{inp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Outputs */}
          <div className="p-4 bg-surface-dim border border-outline-variant space-y-2">
            <span className="text-white/50 uppercase tracking-wider text-[11px] block font-semibold">
              📤 Stage Outputs & Artifacts
            </span>
            <ul className="space-y-1.5 text-white/80 text-[11px]">
              {selectedStation.outputs.map((out, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-status-aligned mt-0.5">&bull;</span>
                  <span>{out}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Underlying Services & Workers */}
          <div className="p-4 bg-surface-dim border border-outline-variant space-y-2">
            <span className="text-white/50 uppercase tracking-wider text-[11px] block font-semibold">
              ⚙️ Codebase Engine & Modules
            </span>
            <ul className="space-y-1.5 text-white/80 text-[11px]">
              {selectedStation.services.map((svc, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">&rsaquo;</span>
                  <code className="text-primary/90 bg-primary/5 px-1 py-0.5 rounded">{svc}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
