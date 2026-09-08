import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { contentService } from '@/features/content/services/contentService';
import { adminService } from '../services/adminService';
import MathText from '@/features/questions/components/MathText';
import Icon, {
  GitMerge,
  UploadCloud,
  Layers,
  Copy,
  Activity,
  ArrowRight,
  RefreshCw,
  Play,
  RotateCcw,
  Check,
  X,
  Brain,
  Terminal,
  ZoomIn,
  ZoomOut,
  Network
} from '@/shared/components/Icon';

// 9 Core Pipeline Stations (Windows Phone Metro Live Tiles)
const PIPELINE_STATIONS = [
  {
    id: 'storage',
    number: '01',
    title: 'PDF Ingestion & Storage',
    subtitle: 'Upload, Checksum & S3 Staging',
    icon: UploadCloud,
    accentColor: '#00BFFF', // Lumia Cyan
    stageName: 'CREATED',
    nodeType: 'TRIGGER_SOURCE',
    engineTag: 'Supabase Storage + S3 Digest',
    latency: '180ms',
    inputPort: 'raw_pdf_binary',
    outputPort: 'storage_path & job_id',
    services: ['content.storage.js', 'content.service.js', 'Supabase Storage (sources)'],
    description: 'Raw PDF question paper files are ingested via drag-and-drop or batch upload. The system generates a cryptographic SHA-256 checksum to prevent duplicate source papers, stores the file in secure cloud storage, and provisions an immutable Ingestion Job entity.',
    inputs: ['Raw PDF File (Buffer)', 'Exam Metadata (Year, Shift, Session)', 'Source Checksum (SHA-256)'],
    outputs: ['job_id (canonical identity)', 'Permanent Storage Path (sources/<job_id>.pdf)', 'Ingestion Job record (MongoDB)'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Open Content Ops',
    thoughtLogs: [
      { time: '+12ms', agent: 'Storage Controller', badge: 'CHECKSUM_HASH', thought: 'Reading binary stream of "JEE_Main_2024_Shift1.pdf" (14,892,118 bytes). Computing SHA-256 cryptographic digest.' },
      { time: '+45ms', agent: 'Checksum Guard', badge: 'INTEGRITY_CHECK', thought: 'Generated SHA-256: 8a7f1e9d3c2b1a0987f65e4d3c2b1a09... Verified uniqueness against MongoDB ingestion_jobs checksum index: 0 conflicts detected.' },
      { time: '+112ms', agent: 'Cloud Storage Provider', badge: 'S3_PERSISTENCE', thought: 'Streaming multipart payload to Supabase Storage bucket `sources/job_e98f01b34c2a.pdf`. Content-Type: application/pdf. ETag verified.' },
      { time: '+180ms', agent: 'Job Dispatcher', badge: 'JOB_PROVISIONED', thought: 'Created ingestion job entity `job_e98f01b34c2a`. Stage initialized to `CREATED`. Emitted event `JOB_CREATED` to background worker queue.' }
    ]
  },
  {
    id: 'ocr',
    number: '02',
    title: 'LlamaParse OCR Engine',
    subtitle: 'Deep Multimodal Vision & Math AST',
    icon: Brain,
    accentColor: '#8A2BE2', // Plum / Purple
    stageName: 'PARSING',
    nodeType: 'MULTIMODAL_OCR',
    engineTag: 'LlamaParse v2.4 Vision Engine',
    latency: '1,420ms',
    inputPort: 'storage_path (PDF)',
    outputPort: 'markdown_pages & katex_ast',
    services: ['llamaparse.provider.js', 'content.worker.js', 'LlamaIndex Cloud API'],
    description: 'The background worker dispatches the PDF to the LlamaParse multimodal OCR model. It parses multi-column exam pages, converts mathematical notations into standard KaTeX LaTeX strings, extracts superscripts, subscripts, fractions, and generates clean markdown page buffers.',
    inputs: ['Remote PDF Stream', 'Provider API Credentials'],
    outputs: ['Structured Markdown Pages', 'Page-by-page token boundaries', 'KaTeX LaTeX equations ($...$ and $$...$$)'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'View Ingestion Queue',
    thoughtLogs: [
      { time: '+210ms', agent: 'LlamaParse Vision v2.4', badge: 'LAYOUT_SEGMENTATION', thought: 'Analyzing Page 4 raster (1754 x 2480 px @ 300 DPI). Found 2 primary vertical content columns separated by 18pt gutter margin. Delimiting column bounding boxes.' },
      { time: '+540ms', agent: 'LlamaParse Vision v2.4', badge: 'HEADER_FILTER', thought: 'Detected top header running band "JEE (Main) 2024 - Examination Paper". Bypassing page header and footer page number "Page 4 of 32" to eliminate OCR boilerplate.' },
      { time: '+890ms', agent: 'LlamaParse TeX Synthesizer', badge: 'MATH_AST_COMPILER', thought: 'Identified mathematical equation block in Question 14: detected radical symbol and fraction structure. Compiling into KaTeX LaTeX AST: `\\omega = \\sqrt{\\frac{k}{m}}`. Verified AST grammar: 0 unbalanced brackets.' },
      { time: '+1,180ms', agent: 'LlamaParse Chemical Lexer', badge: 'REACTION_NOTATION', thought: 'Encountered organic chemical transformation: `CH_3-CH_2-OH + PCC \\rightarrow CH_3-CHO`. Preserving explicit subscripts, reagent annotations, and directional reaction arrows.' },
      { time: '+1,420ms', agent: 'LlamaParse Layout Engine', badge: 'DIAGRAM_BOUNDARY', thought: 'Flagged non-character vector drawing in lower-right region `[142.5, 310.2, 458.0, 520.6]`. Marked as visual diagram asset; suppressed raw OCR character hallucination.' }
    ]
  },
  {
    id: 'diagrams',
    number: '03',
    title: 'Vector Diagram Crop',
    subtitle: 'PyMuPDF Geometric Clustering',
    icon: Layers,
    accentColor: '#FF8C00', // Mango
    stageName: 'STRUCTURING',
    nodeType: 'VISION_EXTRACTOR',
    engineTag: 'PyMuPDF Clustered Bounding Box',
    latency: '340ms',
    inputPort: 'raw_pdf_binary & page_index',
    outputPort: 'composite_crop.png',
    services: ['pdf-diagram-extractor.py', 'pdf-renderer.py', 'clientPdfRenderer.js'],
    description: 'PyMuPDF parses vector drawing objects (lines, cubic beziers, chemical benzene rings, electrical circuit paths) and text annotations. Using a 24pt expansion radius, it merges disconnected bonds and reagents into a single composite high-resolution diagram snapshot.',
    inputs: ['PDF Page Coordinate Map', 'Drawing Vector Primitives', 'Chemical/Physical Annotation Labels'],
    outputs: ['Cropped 300 DPI High-Res PNG', 'Cleaned Question Diagram Asset URL', 'Zero bond overwrite composite buffer'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Open Studio Cropper',
    thoughtLogs: [
      { time: '+18ms', agent: 'PyMuPDF Vector Scanner', badge: 'PATH_INTERSECTION', thought: 'Discovered 42 distinct drawing path primitives on Page 4: 18 line strokes, 12 cubic beziers, 6 arc segments. Grouping by spatial proximity.' },
      { time: '+84ms', agent: 'Spatial Cluster Engine', badge: 'CLUSTER_24PT', thought: 'Applied 24pt expansion radius across adjacent segments. Clustered 6 hexagonal carbon-ring bonds with reagent label `PCC / CHCl3` into unified bounding box `[142.5, 310.2, 458.0, 520.6]`.' },
      { time: '+220ms', agent: 'Image Rasterizer', badge: '300DPI_RENDER', thought: 'Rendered bounded vector cluster at 300 DPI resolution using anti-aliased RGBA buffer. Size: 946 x 630 px.' },
      { time: '+340ms', agent: 'Asset Uploader', badge: 'SUPABASE_STORAGE', thought: 'Stored crop to `question-images/diagrams/diag_1788721811620_2_c25407c.png`. Injected asset token `@@@IMG_PH_0@@@` into candidate question text.' }
    ]
  },
  {
    id: 'segmentation',
    number: '04',
    title: 'Question Segmentation',
    subtitle: 'Question Delimiters & Choices Parser',
    icon: GitMerge,
    accentColor: '#0078D7', // Cobalt
    stageName: 'STRUCTURING',
    nodeType: 'PARSER_RULE',
    engineTag: 'Regex Boundary + AST Tokenizer',
    latency: '90ms',
    inputPort: 'markdown_pages[]',
    outputPort: 'extractedCandidates[]',
    services: ['question-extraction.js', 'content.service.js'],
    description: 'The extraction engine identifies numbered question anchors, isolates the problem statement, extracts choices (A, B, C, D) or (1, 2, 3, 4), and parses the answer key and solution text into structured candidate question entities.',
    inputs: ['Page Markdown Buffers', 'Delimiter Patterns (Q.1, Q.2, Section B)', 'Answer Key Appendix'],
    outputs: ['Candidate Question DTOs', 'Isolated Options (A, B, C, D)', 'Initial Difficulty & Subject Guess'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Inspect Extracted Items',
    thoughtLogs: [
      { time: '+8ms', agent: 'Regex Delimiter Matcher', badge: 'ANCHOR_MATCH', thought: 'Matched question boundary: `^Q\\.?\\s*(\\d+)[\\.:\\s]` on page 4. Discovered Question 14.' },
      { time: '+32ms', agent: 'Option Segmenter', badge: 'CHOICES_PARSED', thought: 'Parsed 4 multiple-choice options: (A) 10 rad/s, (B) 20 rad/s, (C) 5 rad/s, (D) 100 rad/s. Normalized numeric options (1-4) to canonical letters (A-D).' },
      { time: '+68ms', agent: 'Subject Classifier', badge: 'HEURISTIC_TAG', thought: 'Identified physics keywords "mass m", "spring constant k", "angular frequency". Assigned initial subject: `Physics`, chapter guess: `Oscillations`.' },
      { time: '+90ms', agent: 'Candidate Repository', badge: 'SAVED_CANDIDATE', thought: 'Saved candidate draft entity `cand_04` into MongoDB `extracted_candidates` collection with status `AWAITING_REVIEW`.' }
    ]
  },
  {
    id: 'deduplication',
    number: '05',
    title: 'Deduplication Guard',
    subtitle: 'Dice Trigram & Semantic Similarity',
    icon: Copy,
    accentColor: '#FF2E55', // Crimson
    stageName: 'VALIDATING',
    nodeType: 'IF_ELSE_GATE',
    engineTag: 'Dice Trigram + Jaccard Normalizer',
    latency: '140ms',
    inputPort: 'extractedCandidate',
    outputPort: 'unique | duplicate',
    services: ['deduplication.service.js', 'content.service.js'],
    description: 'Calculates the Dice coefficient of word and formula trigrams against all existing questions in the target topic. If similarity >= 0.80, the candidate is routed to Quarantine; otherwise, it passes cleanly to Faculty Review.',
    inputs: ['Candidate Text & Options AST', 'Existing Topic Question Corpus', 'Formula Stripped Plaintext'],
    outputs: ['Similarity Score (0.00 to 1.00)', 'Match Classification (EXACT / HIGH / CLEAN)', 'Branch Decision (Review vs Quarantine)'],
    targetRoute: '/admin/duplicates',
    targetRouteLabel: 'Open Deduplication Hub',
    thoughtLogs: [
      { time: '+14ms', agent: 'Formula Normalizer', badge: 'STRIP_LATEX', thought: 'Stripped LaTeX tags, whitespaces, and punctuation from stem. Normalized text: "a block of mass m is attached to a spring of spring constant k...".' },
      { time: '+48ms', agent: 'Trigram Generator', badge: 'DICE_TRIGRAMS', thought: 'Generated 48 character trigrams. Querying topic `shm_oscillations` corpus (42 verified questions in database).' },
      { time: '+110ms', agent: 'Similarity Evaluator', badge: 'SCORE_COMPUTED', thought: 'Computed similarity: maximum Dice coefficient is 0.12 against question `q_98124`. Score < 0.80 threshold. Certified unique.' },
      { time: '+140ms', agent: 'Branch Dispatcher', badge: 'ROUTED_UNIQUE', thought: 'Routed candidate to Station 06: Faculty Human Review. Status: `READY_FOR_VERIFICATION`.' }
    ]
  },
  {
    id: 'review',
    number: '06',
    title: 'Faculty Human Review',
    subtitle: 'Quality Gate & Syllabus Mapping',
    icon: Check,
    accentColor: '#E3A21A', // Amber
    stageName: 'AWAITING_REVIEW',
    nodeType: 'HUMAN_IN_THE_LOOP',
    engineTag: 'Split-Screen Studio + Math Live Preview',
    latency: 'Manual',
    inputPort: 'unique_candidate_dto',
    outputPort: 'verified_question_draft',
    services: ['ContentAdminPage.jsx', 'StudioPdfViewer', 'content.service.js'],
    description: 'A faculty member or subject matter expert inspects the candidate against the source PDF, corrects any LaTeX typos via the math formula toolbar, verifies the correct answer key, and attaches precise chapter/topic tags.',
    inputs: ['Candidate Draft', 'Original PDF Page High-Res View', 'Curriculum Topic Tree'],
    outputs: ['Faculty Approval (Verified = true)', 'Confirmed Topic ID & Difficulty (Easy/Medium/Hard)', 'Correct Option Key & Explanation'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Review in Studio',
    thoughtLogs: [
      { time: 'Pending', agent: 'Faculty Reviewer', badge: 'INSPECTION', thought: 'Candidate rendered in Split-Screen Studio. Correct answer marked as Option A ($10\\text{ rad/s}$). Formula verified: $\\omega = \\sqrt{200 / 2} = 10$.' },
      { time: 'Action', agent: 'Verification Guard', badge: 'APPROVED', thought: 'Faculty approved candidate with status `PUBLISHED`. Assigned Topic: `Physics > Simple Harmonic Motion > Spring-Mass Systems`.' }
    ]
  },
  {
    id: 'quarantine',
    number: '07',
    title: 'Duplicate Quarantine',
    subtitle: 'Similarity Discard & Merge',
    icon: X,
    accentColor: '#A20025', // Carmine / Deep Red
    stageName: 'FAILED',
    nodeType: 'SINK_STORAGE',
    engineTag: 'Flagged Duplicate Repository',
    latency: 'Passive',
    inputPort: 'duplicate_candidate (≥ 0.80)',
    outputPort: 'purged | merged',
    services: ['deduplication.service.js', 'AdminDuplicatesPage.jsx'],
    description: 'Any candidate question with >= 80% similarity against an existing verified question is intercepted and stored in Quarantine to prevent pollution of the student question bank. Admins can merge metadata or purge.',
    inputs: ['Flagged Duplicate Candidate', 'Conflicting Master Question ID', 'Dice Match Metadata'],
    outputs: ['Quarantined Candidate Record', 'Admin Merge/Purge Decision Audit Trail'],
    targetRoute: '/admin/duplicates',
    targetRouteLabel: 'Inspect Quarantine',
    thoughtLogs: [
      { time: 'Active', agent: 'Quarantine Controller', badge: 'ISOLATION', thought: 'Monitoring quarantined questions. 0 critical collisions pending resolution for active exam paper.' }
    ]
  },
  {
    id: 'sync',
    number: '08',
    title: 'Dual-Store Projection',
    subtitle: 'PostgreSQL + Qdrant Vectorization',
    icon: Activity,
    accentColor: '#00ABA9', // Teal
    stageName: 'SYNCING',
    nodeType: 'VECTOR_PROJECTION',
    engineTag: 'Supabase PostgreSQL + Qdrant 768-dim Vector',
    latency: '260ms',
    inputPort: 'verified_question_draft',
    outputPort: 'published_question_id',
    services: ['publication.repository.js', 'qdrant.repository.js', 'embedding.provider.js'],
    description: 'The verified question is committed into Supabase PostgreSQL (relational core with RLS protection) and vectorized using text-embedding-004 into Qdrant for hybrid semantic search and retrieval.',
    inputs: ['Verified Question Entity', 'Correct Answer & Solution Text', 'Topic Hierarchy Coordinates'],
    outputs: ['Permanent Question ID (`q_...`), PostgreSQL Record (`questions` table), Qdrant Vector Point (768-dim embedding)'],
    targetRoute: '/admin/questions',
    targetRouteLabel: 'View Question Bank',
    thoughtLogs: [
      { time: '+35ms', agent: 'Embedding Provider', badge: 'GEMINI_EMBED', thought: 'Generated 768-dimensional dense vector embedding for stem and choices using text-embedding-004 model.' },
      { time: '+110ms', agent: 'Postgres Writer', badge: 'SQL_INSERT', thought: 'Executed `INSERT INTO questions (...) VALUES (...)` with row-level security enabled. Question identity assigned: `q_7f8a9b1c2d3e`.' },
      { time: '+185ms', agent: 'Qdrant Sync Worker', badge: 'POINT_UPSERT', thought: 'Upserted vector point `q_7f8a9b1c2d3e` to Qdrant collection `questions_v1` with payload metadata (topic, difficulty, exam_year).' },
      { time: '+260ms', agent: 'Sync Manager', badge: 'SYNC_CONFIRMED', thought: 'Dual storage synchronization confirmed. Idempotency key verified. Question is officially LIVE.' }
    ]
  },
  {
    id: 'telemetry',
    number: '09',
    title: 'Practice & Telemetry Loop',
    subtitle: 'Cognitive Confidence Gap Calibration',
    icon: Network,
    accentColor: '#107C10', // Xbox Emerald
    stageName: 'LIVE',
    nodeType: 'FEEDBACK_LOOP',
    engineTag: 'Confidence Gap Algorithm + Telemetry',
    latency: 'Continuous',
    inputPort: 'student_attempts[]',
    outputPort: 'gap_score & mastery_index',
    services: ['evaluations.service.js', 'practice.service.js', 'dashboard.utils.js'],
    description: 'The verified question enters the live question bank for timed evaluations and untimed practice drills. Real-time attempt telemetry computes student confidence-performance gaps, classifies mistake patterns, and calibrates curriculum mastery.',
    inputs: ['Student Attempts & Timers', 'Pre-test Confidence Ratings (1-10)'],
    outputs: ['Confidence Gap Score (Overconfident / Underconfident / Aligned)', 'Cognitive Mistake Diagnostics', 'Cohort Performance Analytics'],
    targetRoute: '/admin/students',
    targetRouteLabel: 'Inspect Student Cohorts',
    thoughtLogs: [
      { time: '+0.4s', agent: 'Exam Delivery Worker', badge: 'MOCK_TEST_SERVED', thought: 'Served Question `q_7f8a9b1c2d3e` in JEE 2026 Timed Evaluation #481. Student: Aarav Patel. Topic: Simple Harmonic Motion.' },
      { time: '+42.8s', agent: 'Attempt Grader', badge: 'ATTEMPT_GRADED', thought: 'Student submitted answer "A" in 42.4 seconds. Verified answer key: "A". Grade: CORRECT (+4 marks).' },
      { time: '+43.1s', agent: 'Confidence Gap Engine', badge: 'META_COGNITIVE', thought: 'Pre-assessment confidence: 8/10 (80%). Topic performance: 100%. Gap: 80 - 100 = -20. Classified as `ALIGNED`.' }
    ]
  }
];

// Node Positions on the 2D DAG Canvas
const DEFAULT_NODE_POSITIONS = {
  storage: { x: 40, y: 220 },
  ocr: { x: 380, y: 60 },
  diagrams: { x: 380, y: 380 },
  segmentation: { x: 760, y: 220 },
  deduplication: { x: 1140, y: 220 },
  review: { x: 1540, y: 80 },
  quarantine: { x: 1540, y: 380 },
  sync: { x: 1940, y: 80 },
  telemetry: { x: 2320, y: 80 }
};

// Graph Edges Definition (Wires connecting nodes)
const GRAPH_EDGES = [
  { id: 'e1', from: 'storage', to: 'ocr', label: 'PDF Stream', color: '#8A2BE2' },
  { id: 'e2', from: 'storage', to: 'diagrams', label: 'Vector Primitives', color: '#FF8C00' },
  { id: 'e3', from: 'ocr', to: 'segmentation', label: 'KaTeX & AST', color: '#8A2BE2' },
  { id: 'e4', from: 'diagrams', to: 'segmentation', label: 'Cropped 300DPI PNGs', color: '#FF8C00' },
  { id: 'e5', from: 'segmentation', to: 'deduplication', label: 'Candidate DTOs', color: '#00BFFF' },
  { id: 'e6', from: 'deduplication', to: 'review', label: 'Unique (d < 0.80)', color: '#107C10' },
  { id: 'e7', from: 'deduplication', to: 'quarantine', label: 'Duplicate (d ≥ 0.80)', color: '#FF2E55' },
  { id: 'e8', from: 'review', to: 'sync', label: 'Approved DTO', color: '#00BFFF' },
  { id: 'e9', from: 'sync', to: 'telemetry', label: 'Live Question Bank', color: '#107C10' }
];

// Interactive Simulation Step Previews
const SIMULATION_STEPS = [
  {
    stageId: 'storage',
    title: 'Stage 01: PDF Drop & Storage Staging',
    caption: 'Admin drops "JEE_Main_2024_Shift1.pdf" (14.2 MB) into Content Ops.',
    previewType: 'json',
    code: `{\n  "job_id": "job_e98f01b34c2a",\n  "stage": "UPLOADING",\n  "source": {\n    "filename": "JEE_Main_2024_Shift1.pdf",\n    "storage_path": "sources/job_e98f01b34c2a.pdf",\n    "source_sha256": "8a7f1e9d3c2b1a0987f65e4d3c2b1a09...",\n    "exam": "JEE Main",\n    "year": 2024\n  },\n  "progress": { "total_pages": 32, "processed_pages": 0 },\n  "created_at": "2026-09-08T18:30:00.000Z"\n}`
  },
  {
    stageId: 'ocr',
    title: 'Stage 02: LlamaParse Deep Layout & Math OCR',
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
    title: 'Stage 03: Vector Drawing Clustered Crop',
    caption: 'PyMuPDF clusters chemical bonds, reaction arrows, and reagent annotations into a clean composite PNG.',
    previewType: 'diagram',
    figureUrl: 'https://uzdyhdbjncwuatgqjpsi.supabase.co/storage/v1/object/public/question-images/diagrams/diag_1788721811620_2_c25407c.png',
    meta: 'Extracted: 24pt expansion radius • 300 DPI high resolution • Bounds: [142.5, 310.2, 458.0, 520.6]'
  },
  {
    stageId: 'segmentation',
    title: 'Stage 04: Candidate Segmentation & Choices Parser',
    caption: 'Delimiters slice page into structured question candidate with choices A, B, C, D.',
    previewType: 'json',
    code: `{\n  "candidate_key": "cand_04",\n  "question_text": "A block of mass $m = 2\\\\text{ kg}$ is attached to a spring...",\n  "options": [\n    { "id": "A", "text": "$10\\\\text{ rad/s}$" },\n    { "id": "B", "text": "$20\\\\text{ rad/s}$" },\n    { "id": "C", "text": "$5\\\\text{ rad/s}$" },\n    { "id": "D", "text": "$100\\\\text{ rad/s}$" }\n  ],\n  "correct_answer": "A",\n  "suggested_topic_id": "topic_shm_oscillations",\n  "source_pages": [14]\n}`
  },
  {
    stageId: 'deduplication',
    title: 'Stage 05: Trigram Dice Deduplication Check',
    caption: 'Deduplication engine verifies similarity against all existing physics questions.',
    previewType: 'dedup_badge',
    score: '0.12',
    status: 'CLEAN_UNIQUE',
    explanation: 'Max similarity against question q_98124 is 12.4% (well below the 80% threshold). Certified unique question.'
  },
  {
    stageId: 'review',
    title: 'Stage 06: Faculty Human Review & Quality Gate',
    caption: 'Faculty reviews derivation, tags syllabus chapter, and verifies KaTeX equation formatting.',
    previewType: 'review_decision',
    reviewer: 'Prof. Sharma (Physics Dept)',
    topic: 'Physics > Simple Harmonic Motion > Spring-Mass Systems',
    difficulty: 'Easy',
    status: 'ACCEPTED_FOR_PUBLICATION'
  },
  {
    stageId: 'quarantine',
    title: 'Stage 07: Duplicate Quarantine',
    caption: 'Quarantine intercepts ambiguous and duplicate candidates.',
    previewType: 'json',
    code: `{\n  "status": "QUARANTINED",\n  "reason": "SIMILARITY_SCORE_THRESHOLD",\n  "quarantine_date": "2026-09-08T18:35:00.000Z",\n  "action_required": "MANUAL_MERGE_OR_PURGE"\n}`
  },
  {
    stageId: 'sync',
    title: 'Stage 08: Dual-Store Supabase + Qdrant Vectorization',
    caption: 'Atomically inserted into PostgreSQL and indexed into Qdrant 768-dim vector point space.',
    previewType: 'json',
    code: `{\n  "postgres": {\n    "table": "questions",\n    "question_id": "q_7f8a9b1c2d3e",\n    "verified": true,\n    "rls_enforced": true\n  },\n  "qdrant": {\n    "collection": "questions_v1",\n    "vector_dims": 768,\n    "distance": "Cosine",\n    "indexed": true\n  }\n}`
  },
  {
    stageId: 'telemetry',
    title: 'Stage 09: Live Practice & Telemetry Loop',
    caption: 'Real-time attempt telemetry computes student confidence-performance gaps.',
    previewType: 'student_telemetry',
    studentName: 'Aarav Patel',
    confidenceRating: '8 / 10 (80%)',
    studentAnswer: 'Option A (Correct • 42.4s)',
    gapClassification: 'ALIGNED (-20 Gap • High Mastery)'
  }
];

export default function AdminPipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedJobIdFromUrl = searchParams.get('jobId') || '';

  // Mode: 'live' vs 'simulation'
  const [activeMode, setActiveMode] = useState('live');

  // Layout: 'graph' (DAG Canvas) vs 'sheet' (Windows Phone Live Tile Grid)
  const [sheetLayout, setSheetLayout] = useState('graph');

  // In-place expanded node on the canvas (No popup window!)
  const [expandedStationId, setExpandedStationId] = useState('ocr');
  const [nodeTab, setNodeTab] = useState('overview'); // 'overview' | 'thoughts' | 'payload'

  // Live ingestion jobs from backend
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(selectedJobIdFromUrl);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Simulation state
  const [simStepIndex, setSimStepIndex] = useState(1);
  const [simIsPlaying, setSimIsPlaying] = useState(false);

  // Canvas Pan & Zoom
  const [pan, setPan] = useState({ x: 30, y: 30 });
  const [zoom, setZoom] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Draggable Node Positions
  const [nodePositions, setNodePositions] = useState(DEFAULT_NODE_POSITIONS);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });

  const canvasContainerRef = useRef(null);

  // Fetch ingestion jobs
  const loadData = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const jobsData = await contentService.listJobs().catch(() => []);
      const safeJobs = Array.isArray(jobsData) ? jobsData : (jobsData?.jobs || []);
      setJobs(safeJobs);
      if (!selectedJobId && safeJobs.length > 0) {
        setSelectedJobId(safeJobs[0].job_id);
      }
    } catch (e) {
      console.error('Failed to load pipeline jobs:', e);
    } finally {
      setLoadingJobs(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    }, 3200);
    return () => clearInterval(timer);
  }, [simIsPlaying]);

  // Sync simulation step to in-place expanded station
  useEffect(() => {
    if (activeMode === 'simulation') {
      const step = SIMULATION_STEPS[simStepIndex];
      if (step) {
        setExpandedStationId(step.stageId);
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

  const handleResetNodePositions = () => {
    setNodePositions(DEFAULT_NODE_POSITIONS);
    setPan({ x: 30, y: 30 });
    setZoom(0.85);
  };

  // Canvas Pan & Zoom Handlers
  const handleCanvasPointerDown = (e) => {
    if (e.target.closest('[data-node-id]')) return;
    setIsPanning(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  const handleCanvasPointerMove = (e) => {
    if (draggingNodeId) {
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const newX = (e.clientX - containerRect.left - pan.x) / zoom - nodeDragOffset.x;
      const newY = (e.clientY - containerRect.top - pan.y) / zoom - nodeDragOffset.y;

      setNodePositions(prev => ({
        ...prev,
        [draggingNodeId]: { x: Math.round(newX), y: Math.round(newY) }
      }));
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleCanvasPointerUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleCanvasWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(z => Math.min(Math.max(z * zoomFactor, 0.4), 1.6));
  };

  const handleNodePointerDown = (e, nodeId) => {
    e.stopPropagation();

    const containerRect = canvasContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const currentPos = nodePositions[nodeId] || DEFAULT_NODE_POSITIONS[nodeId];
    const mouseCanvasX = (e.clientX - containerRect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - containerRect.top - pan.y) / zoom;

    setDraggingNodeId(nodeId);
    setNodeDragOffset({
      x: mouseCanvasX - currentPos.x,
      y: mouseCanvasY - currentPos.y
    });
  };

  // Compute Bezier wires dynamically adjusting for in-place expanded nodes
  const computedEdges = useMemo(() => {
    return GRAPH_EDGES.map(edge => {
      const sourcePos = nodePositions[edge.from] || DEFAULT_NODE_POSITIONS[edge.from];
      const targetPos = nodePositions[edge.to] || DEFAULT_NODE_POSITIONS[edge.to];

      if (!sourcePos || !targetPos) return null;

      const isSourceExpanded = expandedStationId === edge.from;
      const sourceWidth = isSourceExpanded ? 480 : 250;

      let x1 = sourcePos.x + sourceWidth;
      let y1 = sourcePos.y + 60; // middle socket

      const x2 = targetPos.x;
      const y2 = targetPos.y + 60;

      const dx = Math.max(Math.abs(x2 - x1) * 0.55, 60);
      const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      let isActive = false;
      if (activeMode === 'live') {
        const toIdx = PIPELINE_STATIONS.findIndex(s => s.id === edge.to);
        if (currentJobStageIndex >= toIdx) isActive = true;
      } else if (activeMode === 'simulation') {
        const currentSimStep = SIMULATION_STEPS[simStepIndex];
        if (currentSimStep && (edge.to === currentSimStep.stageId || edge.from === currentSimStep.stageId)) {
          isActive = true;
        }
      }

      return {
        ...edge,
        x1, y1, x2, y2,
        path,
        midX, midY,
        isActive
      };
    }).filter(Boolean);
  }, [nodePositions, activeMode, currentJobStageIndex, simStepIndex, expandedStationId]);

  return (
    <div className="w-full min-w-0 animate-fade-in space-y-6 pb-16 text-left select-none">
      {/* ─── Windows Phone Metro Panorama Header ─── */}
      <div className="space-y-2 border-b border-white/15 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-primary">
            tooPrep // content ops
          </span>
          <span className="text-white/30">•</span>
          <span className="text-[10px] font-mono text-white/50 uppercase">
            visual dag engine
          </span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-display text-white font-light lowercase tracking-tight leading-none">
              pipeline flow
            </h1>
            <p className="text-sm font-light text-white/60 mt-1">
              Visual node-and-edge workflow graph &bull; Click any station to expand its live telemetry in place
            </p>
          </div>

          {/* Refresh button */}
          <button
            onClick={loadData}
            disabled={loadingJobs}
            className="px-3 py-1.5 border border-white/20 hover:border-primary text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 rounded-none transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingJobs ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* ─── Windows Phone Metro Pivot Navigation ─── */}
        <div className="flex items-baseline gap-8 pt-4 font-light text-2xl">
          <button
            onClick={() => setActiveMode('live')}
            className={`cursor-pointer transition-colors pb-1 ${
              activeMode === 'live'
                ? 'text-primary font-normal border-b-2 border-primary -mb-[1px]'
                : 'text-white/35 hover:text-white'
            }`}
          >
            live flight
          </button>
          <button
            onClick={() => {
              setActiveMode('simulation');
              setSimStepIndex(1);
            }}
            className={`cursor-pointer transition-colors pb-1 ${
              activeMode === 'simulation'
                ? 'text-primary font-normal border-b-2 border-primary -mb-[1px]'
                : 'text-white/35 hover:text-white'
            }`}
          >
            simulation
          </button>
          <button
            onClick={() => setSheetLayout(l => l === 'graph' ? 'sheet' : 'graph')}
            className={`cursor-pointer transition-colors pb-1 ${
              sheetLayout === 'sheet'
                ? 'text-primary font-normal border-b-2 border-primary -mb-[1px]'
                : 'text-white/35 hover:text-white'
            }`}
          >
            {sheetLayout === 'graph' ? 'live tiles' : 'graph canvas'}
          </button>
        </div>
      </div>

      {/* ─── Mode 1: Live Flight Control Strip (Metro Flat) ─── */}
      {activeMode === 'live' && (
        <div className="p-4 bg-black border border-white/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs rounded-none">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-white/50 uppercase tracking-widest text-[11px] font-semibold flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-primary" />
              <span>Active Ingestion Job:</span>
            </span>

            {jobs.length > 0 ? (
              <select
                value={selectedJobId}
                onChange={e => handleJobSelect(e.target.value)}
                className="bg-[#111] border border-white/30 text-white p-2 outline-none focus:border-primary uppercase text-xs min-w-[280px] rounded-none"
              >
                {jobs.map(j => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.source?.filename || j.job_id} — [{j.stage || 'UNKNOWN'}]
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-white/40 italic">No ingestion jobs currently registered.</span>
            )}
          </div>

          {currentJob && (
            <div className="flex items-center gap-3 text-[11px] text-white/70">
              <span>PAGES: <strong className="text-white">{currentJob.progress?.total_pages || '?'}</strong></span>
              <span>QUESTIONS: <strong className="text-white">{currentJob.question_count || currentJob.extracted_count || 0}</strong></span>
              <span className={`px-2.5 py-0.5 border text-[10px] font-bold uppercase rounded-none ${
                currentJob.stage === 'COMPLETED'
                  ? 'border-status-aligned text-status-aligned bg-status-aligned/10'
                  : currentJob.stage === 'FAILED'
                  ? 'border-error text-error bg-error/10'
                  : 'border-primary text-primary bg-primary/10'
              }`}>
                [{currentJob.stage}]
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── Mode 2: Interactive Simulation Tape Controls (Metro Style) ─── */}
      {activeMode === 'simulation' && (
        <div className="p-4 bg-black border-2 border-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs rounded-none">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-primary animate-ping" />
            <div>
              <span className="text-primary uppercase tracking-widest font-bold block text-[11px]">
                Simulation Step {simStepIndex + 1} of {SIMULATION_STEPS.length}
              </span>
              <span className="text-white text-sm font-light">
                {SIMULATION_STEPS[simStepIndex]?.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevSimStep}
              disabled={simStepIndex === 0}
              className="px-3 py-1.5 border border-white/30 hover:border-primary text-white disabled:opacity-30 transition-colors uppercase cursor-pointer rounded-none"
            >
              ◀ Prev
            </button>
            <button
              onClick={() => setSimIsPlaying(p => !p)}
              className={`px-4 py-1.5 uppercase font-bold tracking-wider transition-colors cursor-pointer rounded-none ${
                simIsPlaying ? 'bg-primary text-black' : 'border border-primary text-primary hover:bg-primary hover:text-black'
              }`}
            >
              {simIsPlaying ? 'Pause' : 'Auto Play ▶'}
            </button>
            <button
              onClick={handleNextSimStep}
              disabled={simStepIndex >= SIMULATION_STEPS.length - 1}
              className="px-3 py-1.5 border border-white/30 hover:border-primary text-white disabled:opacity-30 transition-colors uppercase cursor-pointer rounded-none"
            >
              Next ▶
            </button>
            <button
              onClick={handleResetSim}
              className="p-2 border border-white/20 hover:border-primary text-white/60 hover:text-white transition-colors cursor-pointer rounded-none"
              title="Reset Simulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── View 1: 2D DAG Graph Canvas with In-Place Expanding Live Tiles ─── */}
      {sheetLayout === 'graph' ? (
        <div
          ref={canvasContainerRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onWheel={handleCanvasWheel}
          className="relative w-full h-[680px] bg-black border-2 border-white/20 overflow-hidden select-none cursor-grab active:cursor-grabbing rounded-none shadow-2xl"
        >
          {/* Subtle Metro Geometric Grid Pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
          />

          {/* Canvas Floating Metro HUD (Top-Left) */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2.5 bg-black/90 border border-white/20 px-3 py-1.5 text-[11px] font-mono text-white/70 rounded-none">
            <span className="w-2 h-2 bg-primary" />
            <span className="text-white font-semibold uppercase tracking-wider">DAG WORKFLOW</span>
            <span className="text-white/30">|</span>
            <span className="text-white/60">Pan: drag canvas &bull; Expand: tap node</span>
          </div>

          {/* Canvas Zoom Toolbar (Top-Right) */}
          <div className="absolute top-3 right-3 z-30 flex items-center border border-white/20 bg-black text-xs font-mono rounded-none">
            <button
              onClick={() => setZoom(z => Math.max(z - 0.15, 0.4))}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[10px] text-primary font-bold min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.15, 1.6))}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetNodePositions}
              className="px-2.5 py-1 text-[10px] text-white hover:text-primary border-l border-white/20 uppercase font-bold cursor-pointer"
              title="Align Nodes to Default Grid"
            >
              Align
            </button>
          </div>

          {/* Transformable Canvas Surface */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '2900px',
              height: '700px',
              position: 'relative'
            }}
          >
            {/* SVG Bezier Connector Edges */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              style={{ overflow: 'visible' }}
            >
              {computedEdges.map(edge => {
                const isSelected = expandedStationId === edge.to || expandedStationId === edge.from;

                return (
                  <g key={edge.id}>
                    {/* Background stroke */}
                    <path
                      d={edge.path}
                      fill="none"
                      stroke={edge.isActive ? edge.color : 'rgba(255,255,255,0.15)'}
                      strokeWidth={edge.isActive ? 2.5 : 1.5}
                      strokeDasharray={edge.isActive ? 'none' : '4 3'}
                      opacity={isSelected ? 1 : 0.75}
                    />

                    {/* Edge Midpoint Tag */}
                    <g transform={`translate(${edge.midX}, ${edge.midY})`}>
                      <rect
                        x="-50"
                        y="-10"
                        width="100"
                        height="20"
                        fill="#000000"
                        stroke={edge.isActive ? edge.color : 'rgba(255,255,255,0.3)'}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill={edge.isActive ? edge.color : 'rgba(255,255,255,0.7)'}
                        fontSize="9"
                        fontFamily="Segoe UI, monospace"
                        fontWeight="600"
                      >
                        {edge.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* ─── Render Pipeline Stations as In-Place Expanding Metro Live Tiles ─── */}
            {PIPELINE_STATIONS.map((station, idx) => {
              const IconComp = station.icon;
              const pos = nodePositions[station.id] || DEFAULT_NODE_POSITIONS[station.id] || { x: 40, y: 220 };
              const isExpanded = expandedStationId === station.id;

              const isJobCurrent = activeMode === 'live' && currentJobStageIndex === idx;
              const isJobPassed = activeMode === 'live' && currentJobStageIndex > idx;
              const isJobFailed = activeMode === 'live' && (currentJob?.stage === 'FAILED' || currentJob?.stage === 'PAUSED') && currentJobStageIndex === idx;

              const isSimCurrent = activeMode === 'simulation' && SIMULATION_STEPS[simStepIndex]?.stageId === station.id;
              const isSimPassed = activeMode === 'simulation' && simStepIndex > idx;

              const isHighlighted = isJobCurrent || isSimCurrent;
              const isPassed = isJobPassed || isSimPassed;

              return (
                <div
                  key={station.id}
                  data-node-id={station.id}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: isExpanded ? '480px' : '250px'
                  }}
                  className={`transition-all duration-200 select-none ${
                    isExpanded ? 'z-40' : 'z-20'
                  }`}
                >
                  {/* Left Wire Handle Socket */}
                  {station.id !== 'storage' && (
                    <div
                      className="absolute -left-2 top-[52px] w-3.5 h-3.5 bg-black border-2 border-primary z-30"
                      title={`Input: ${station.inputPort}`}
                    />
                  )}

                  {/* Right Wire Handle Socket */}
                  {station.id !== 'telemetry' && (
                    <div
                      className="absolute -right-2 top-[52px] w-3.5 h-3.5 bg-black border-2 border-primary z-30"
                      title={`Output: ${station.outputPort}`}
                    />
                  )}

                  {/* ─── METRO LIVE TILE CARD ─── */}
                  <div
                    className={`bg-black text-left border-2 rounded-none transition-all shadow-xl relative overflow-hidden ${
                      isExpanded
                        ? 'border-primary ring-2 ring-primary/40 bg-[#080a10]'
                        : isHighlighted
                        ? 'border-primary ring-1 ring-primary bg-primary/10 animate-pulse'
                        : isPassed
                        ? 'border-status-aligned/60 hover:border-status-aligned'
                        : 'border-white/20 hover:border-white/50'
                    }`}
                  >
                    {/* Left Metro Colored Accent Stripe */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5 z-20"
                      style={{ backgroundColor: station.accentColor }}
                    />

                    {/* ─── Tile Header Strip (Drag Handle + Title) ─── */}
                    <div
                      onPointerDown={(e) => handleNodePointerDown(e, station.id)}
                      onClick={() => setExpandedStationId(isExpanded ? null : station.id)}
                      className="p-3 pl-4 bg-white/5 border-b border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className="w-6 h-6 flex items-center justify-center font-mono font-bold text-xs shrink-0 text-black"
                          style={{ backgroundColor: station.accentColor }}
                        >
                          {station.number}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-semibold text-white uppercase tracking-wider truncate">
                            {station.title}
                          </h4>
                          <span className="text-[9px] font-mono text-white/50 block truncate">
                            [{station.nodeType}]
                          </span>
                        </div>
                      </div>

                      {/* Expand / Collapse Control Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedStationId(isExpanded ? null : station.id);
                        }}
                        className="px-2 py-0.5 border border-white/30 text-[10px] font-mono uppercase text-white hover:border-primary hover:text-primary transition-colors cursor-pointer shrink-0 ml-1"
                      >
                        {isExpanded ? '— Minimize' : '+ Expand'}
                      </button>
                    </div>

                    {/* ─── COLLAPSED TILE BODY ─── */}
                    {!isExpanded && (
                      <div
                        onClick={() => setExpandedStationId(station.id)}
                        className="p-3 pl-4 space-y-2 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <p className="text-[11px] text-white/70 font-light truncate">
                          {station.subtitle}
                        </p>

                        <div className="flex items-center justify-between text-[9px] font-mono pt-1 text-white/40 border-t border-white/10">
                          <span className="truncate max-w-[130px]">{station.engineTag}</span>
                          <span className="text-white/60 font-semibold">{station.latency}</span>
                        </div>

                        {/* Status Bar */}
                        <div className="flex items-center justify-between text-[9px] font-mono pt-0.5">
                          <span className="text-white/40 uppercase">State:</span>
                          <span className={`px-1.5 py-0.2 uppercase font-bold text-[8px] ${
                            isHighlighted
                              ? 'bg-primary text-black'
                              : isJobFailed
                              ? 'border border-error text-error'
                              : isPassed
                              ? 'border border-status-aligned text-status-aligned'
                              : 'text-white/40'
                          }`}>
                            {isHighlighted ? 'RUNNING' : isJobFailed ? 'FAILED' : isPassed ? 'READY' : 'STANDBY'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ─── IN-PLACE EXPANDED COCKPIT (NO POPUP WINDOW!) ─── */}
                    {isExpanded && (
                      <div className="p-4 pl-5 space-y-3 font-sans text-xs animate-fade-in">
                        {/* In-Node Metro Tab Navigation */}
                        <div className="flex border-b border-white/15 text-[10px] font-mono uppercase">
                          <button
                            onClick={() => setNodeTab('overview')}
                            className={`flex-1 py-1.5 text-center font-bold tracking-wider cursor-pointer transition-colors border-b-2 ${
                              nodeTab === 'overview'
                                ? 'border-primary text-primary bg-primary/10'
                                : 'border-transparent text-white/40 hover:text-white'
                            }`}
                          >
                            Specs & Ports
                          </button>
                          <button
                            onClick={() => setNodeTab('thoughts')}
                            className={`flex-1 py-1.5 text-center font-bold tracking-wider cursor-pointer transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                              nodeTab === 'thoughts'
                                ? 'border-primary text-primary bg-primary/10'
                                : 'border-transparent text-white/40 hover:text-white'
                            }`}
                          >
                            <span>AI Monologue</span>
                            <span className="w-1.5 h-1.5 bg-status-aligned animate-pulse" />
                          </button>
                          <button
                            onClick={() => setNodeTab('payload')}
                            className={`flex-1 py-1.5 text-center font-bold tracking-wider cursor-pointer transition-colors border-b-2 ${
                              nodeTab === 'payload'
                                ? 'border-primary text-primary bg-primary/10'
                                : 'border-transparent text-white/40 hover:text-white'
                            }`}
                          >
                            Live Payload
                          </button>
                        </div>

                        {/* TAB 1: SPECS & CONTRACTS */}
                        {nodeTab === 'overview' && (
                          <div className="space-y-3 animate-fade-in">
                            <p className="text-white/85 leading-relaxed text-xs font-light bg-black p-2.5 border border-white/10">
                              {station.description}
                            </p>

                            {/* 2-Column Data Contracts */}
                            <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                              <div className="p-2 bg-white/5 border border-white/10 space-y-1">
                                <span className="text-white/50 uppercase font-bold block">Input Contract</span>
                                <ul className="space-y-0.5 text-white/80">
                                  {station.inputs.map((inp, i) => (
                                    <li key={i} className="truncate">• {inp}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-2 bg-white/5 border border-white/10 space-y-1">
                                <span className="text-white/50 uppercase font-bold block">Output Contract</span>
                                <ul className="space-y-0.5 text-status-aligned">
                                  {station.outputs.map((out, i) => (
                                    <li key={i} className="truncate">✓ {out}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Engine Metadata */}
                            <div className="p-2 bg-black border border-white/15 font-mono text-[10px] space-y-1 text-white/60">
                              <div className="flex justify-between">
                                <span>Engine:</span>
                                <span className="text-white font-semibold">{station.engineTag}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Latency:</span>
                                <span className="text-status-aligned font-bold">{station.latency}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Module:</span>
                                <code className="text-primary">{station.services[0]}</code>
                              </div>
                            </div>

                            {/* Flat Metro Action Button */}
                            <Link
                              to={station.targetRoute}
                              className="w-full py-2 bg-primary hover:bg-white text-black font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>{station.targetRouteLabel}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}

                        {/* TAB 2: AI MONOLOGUE (UNDER-THE-HOOD THOUGHTS) */}
                        {nodeTab === 'thoughts' && (
                          <div className="space-y-2 font-mono text-[11px] animate-fade-in max-h-72 overflow-y-auto pr-1">
                            <div className="flex items-center justify-between text-[10px] text-primary border-b border-white/10 pb-1.5">
                              <span className="uppercase font-bold tracking-wider flex items-center gap-1">
                                <Terminal className="w-3 h-3 text-primary" />
                                <span>Internal Engine Thoughts</span>
                              </span>
                              <span className="text-white/40">{station.thoughtLogs.length} logs</span>
                            </div>

                            {station.thoughtLogs.map((log, i) => (
                              <div key={i} className="p-2 bg-black border border-white/10 space-y-1">
                                <div className="flex items-center justify-between text-[9px]">
                                  <span className="text-primary font-bold">{log.agent}</span>
                                  <span className="text-white/40">{log.time}</span>
                                </div>
                                <span className="inline-block px-1 py-0.2 border border-white/20 text-white/70 text-[8px] uppercase font-bold">
                                  [{log.badge}]
                                </span>
                                <p className="text-white/90 leading-relaxed font-sans text-xs">{log.thought}</p>
                              </div>
                            ))}

                            <div className="flex items-center gap-1.5 text-[10px] text-primary pt-1">
                              <span className="w-1.5 h-1.5 bg-primary animate-ping" />
                              <span className="animate-pulse text-[10px]">Reasoning stream active...</span>
                            </div>
                          </div>
                        )}

                        {/* TAB 3: LIVE PAYLOAD PREVIEW */}
                        {nodeTab === 'payload' && (
                          <div className="space-y-2.5 animate-fade-in">
                            {(() => {
                              const step = SIMULATION_STEPS.find(s => s.stageId === station.id) || SIMULATION_STEPS[0];
                              return (
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider block">
                                      {step.title}
                                    </span>
                                    <p className="text-white/60 text-[10px]">{step.caption}</p>
                                  </div>

                                  {step.previewType === 'json' && (
                                    <div className="bg-black p-2.5 border border-white/20 font-mono text-[10px] text-primary overflow-x-auto max-h-56">
                                      <pre>{step.code}</pre>
                                    </div>
                                  )}

                                  {step.previewType === 'math_markdown' && (
                                    <div className="p-2.5 bg-black border border-white/20 text-on-surface text-xs leading-relaxed max-h-56 overflow-y-auto">
                                      <MathText text={step.text} />
                                    </div>
                                  )}

                                  {step.previewType === 'diagram' && (
                                    <div className="p-2 bg-white flex items-center justify-center max-h-44 overflow-hidden border border-white/20">
                                      <img src={step.figureUrl} alt="diagram" className="max-h-40 object-contain" />
                                    </div>
                                  )}

                                  {step.previewType === 'dedup_badge' && (
                                    <div className="p-3 bg-black border border-white/20 font-mono text-xs space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-status-aligned">{step.score}</span>
                                        <span className="px-1.5 py-0.2 border border-status-aligned text-status-aligned text-[10px]">
                                          {step.status}
                                        </span>
                                      </div>
                                      <p className="text-white/70 text-[10px]">{step.explanation}</p>
                                    </div>
                                  )}

                                  {step.previewType === 'review_decision' && (
                                    <div className="p-2.5 bg-black border border-white/20 font-mono text-[10px] space-y-1">
                                      <div className="text-white/50">Reviewer: <strong className="text-white">{step.reviewer}</strong></div>
                                      <div className="text-white/50">Topic: <strong className="text-primary">{step.topic}</strong></div>
                                      <div className="text-white/50">Decision: <strong className="text-status-aligned">{step.status}</strong></div>
                                    </div>
                                  )}

                                  {step.previewType === 'student_telemetry' && (
                                    <div className="p-2.5 bg-black border border-white/20 font-mono text-[10px] space-y-1">
                                      <div className="text-white/50">Student: <strong className="text-white">{step.studentName}</strong></div>
                                      <div className="text-white/50">Confidence: <strong className="text-amber-400">{step.confidenceRating}</strong></div>
                                      <div className="text-white/50">Answer: <strong className="text-status-aligned">{step.studentAnswer}</strong></div>
                                      <div className="text-white/50">Gap Status: <strong className="text-primary">{step.gapClassification}</strong></div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── View 2: Windows Phone Start Screen Live Tiles Grid ─── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PIPELINE_STATIONS.map((station, idx) => {
              const IconComp = station.icon;
              const isExpanded = expandedStationId === station.id;

              const isJobCurrent = activeMode === 'live' && currentJobStageIndex === idx;
              const isJobPassed = activeMode === 'live' && currentJobStageIndex > idx;
              const isHighlighted = isJobCurrent || (activeMode === 'simulation' && simStepIndex === idx);

              return (
                <div
                  key={station.id}
                  onClick={() => setExpandedStationId(isExpanded ? null : station.id)}
                  className={`border-2 transition-all cursor-pointer rounded-none relative flex flex-col justify-between p-5 text-left ${
                    isExpanded
                      ? 'border-primary bg-[#080a10] sm:col-span-2 lg:col-span-3'
                      : isHighlighted
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : isJobPassed
                      ? 'border-status-aligned/50 bg-black hover:border-status-aligned'
                      : 'border-white/20 bg-black hover:border-white/50'
                  }`}
                >
                  {/* Top colored accent line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: station.accentColor }}
                  />

                  {/* Tile Top Strip */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 flex items-center justify-center font-mono font-bold text-sm text-black"
                        style={{ backgroundColor: station.accentColor }}
                      >
                        {station.number}
                      </div>
                      <span className="text-[10px] font-mono uppercase text-white/50">
                        [{station.nodeType}]
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedStationId(isExpanded ? null : station.id);
                      }}
                      className="text-[10px] font-mono uppercase text-primary font-bold hover:underline cursor-pointer"
                    >
                      {isExpanded ? '— Minimize' : '+ Details'}
                    </button>
                  </div>

                  {/* Tile Body */}
                  <div className="py-3 space-y-1.5">
                    <h3 className="text-base font-semibold text-white uppercase tracking-wider">
                      {station.title}
                    </h3>
                    <p className="text-xs text-white/70 font-light">
                      {station.subtitle}
                    </p>
                  </div>

                  {/* In-Place Expanded Details in Tile Grid */}
                  {isExpanded && (
                    <div className="pt-3 mt-2 border-t border-white/15 space-y-3 font-mono text-xs">
                      <p className="text-white/85 font-sans font-light leading-relaxed">
                        {station.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        <div className="p-3 bg-white/5 border border-white/10 space-y-1">
                          <span className="text-white/50 uppercase font-bold block">Inputs</span>
                          <ul className="space-y-0.5 text-white/80">
                            {station.inputs.map((inp, i) => (
                              <li key={i}>• {inp}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/10 space-y-1">
                          <span className="text-white/50 uppercase font-bold block">Outputs</span>
                          <ul className="space-y-0.5 text-status-aligned">
                            {station.outputs.map((out, i) => (
                              <li key={i}>✓ {out}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
                        <span className="text-white/50 text-[11px]">
                          Module: <code className="text-primary">{station.services[0]}</code>
                        </span>
                        <Link
                          to={station.targetRoute}
                          className="px-4 py-2 bg-primary hover:bg-white text-black font-bold uppercase tracking-widest text-xs transition-colors"
                        >
                          {station.targetRouteLabel} →
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Tile Footer */}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10 text-[10px] font-mono text-white/50">
                    <span>{station.engineTag}</span>
                    <span className="text-white/80 font-bold">{station.latency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
