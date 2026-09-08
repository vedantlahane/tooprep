import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Eye,
  Terminal,
  Cpu
} from '@/shared/components/Icon';

// 8 Core Pipeline Stations Definition with Under-The-Hood AI Thoughts & Engine Metadata
const PIPELINE_STATIONS = [
  {
    id: 'storage',
    number: 1,
    title: 'PDF Ingestion & Storage',
    subtitle: 'Upload, Checksum & S3 Staging',
    icon: UploadCloud,
    accentColor: '#00BFFF',
    stageName: 'CREATED',
    nodeType: 'INGESTION_STORAGE',
    engineTag: 'Supabase Storage + S3 Digest',
    latency: '180ms',
    inputPort: 'raw_pdf_binary',
    outputPort: 'storage_path & job_id',
    services: ['content.storage.js', 'content.service.js', 'Supabase Storage Bucket (sources)'],
    description: 'Raw PDF question paper files are ingested via drag-and-drop or batch upload. The system generates a cryptographic SHA-256 checksum to prevent duplicate source papers, stores the file in secure cloud storage, and provisions an immutable Ingestion Job entity.',
    inputs: ['Raw PDF File (Buffer)', 'Exam Metadata (Year, Shift, Session)', 'Source Checksum (SHA-256)'],
    outputs: ['job_id (canonical identity)', 'Permanent Storage Path (sources/<job_id>.pdf)', 'Ingestion Job record (MongoDB)'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Open Content Ops',
    thoughtLogs: [
      {
        time: '+12ms',
        agent: 'Storage Controller',
        badge: 'CHECKSUM_HASH',
        badgeColor: 'border-primary text-primary',
        thought: 'Reading binary stream of "JEE_Main_2024_Shift1.pdf" (14,892,118 bytes). Computing SHA-256 cryptographic digest.'
      },
      {
        time: '+45ms',
        agent: 'Checksum Guard',
        badge: 'INTEGRITY_CHECK',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Generated SHA-256: 8a7f1e9d3c2b1a0987f65e4d3c2b1a09... Verified uniqueness against MongoDB ingestion_jobs checksum index: 0 conflicts detected.'
      },
      {
        time: '+112ms',
        agent: 'Cloud Storage Provider',
        badge: 'S3_PERSISTENCE',
        badgeColor: 'border-primary text-primary',
        thought: 'Streaming multipart payload to Supabase Storage bucket `sources/job_e98f01b34c2a.pdf`. Content-Type: application/pdf. ETag verified.'
      },
      {
        time: '+180ms',
        agent: 'Job Dispatcher',
        badge: 'JOB_PROVISIONED',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Created ingestion job entity `job_e98f01b34c2a`. Stage initialized to `CREATED`. Emitted event `JOB_CREATED` to background worker queue.'
      }
    ]
  },
  {
    id: 'ocr',
    number: 2,
    title: 'LlamaParse OCR Engine',
    subtitle: 'Deep Multimodal Vision & Math AST',
    icon: Brain,
    accentColor: '#8A2BE2',
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
      {
        time: '+210ms',
        agent: 'LlamaParse Vision v2.4',
        badge: 'LAYOUT_SEGMENTATION',
        badgeColor: 'border-purple-400 text-purple-400',
        thought: 'Analyzing Page 4 raster (1754 x 2480 px @ 300 DPI). Found 2 primary vertical content columns separated by 18pt gutter margin. Delimiting column bounding boxes.'
      },
      {
        time: '+540ms',
        agent: 'LlamaParse Vision v2.4',
        badge: 'HEADER_FILTER',
        badgeColor: 'border-white/30 text-white/60',
        thought: 'Detected top header running band "JEE (Main) 2024 - Examination Paper". Bypassing page header and footer page number "Page 4 of 32" to eliminate OCR boilerplate.'
      },
      {
        time: '+890ms',
        agent: 'LlamaParse TeX Synthesizer',
        badge: 'MATH_AST_COMPILER',
        badgeColor: 'border-primary text-primary',
        thought: 'Identified mathematical equation block in Question 14: detected radical symbol and fraction structure. Compiling into KaTeX LaTeX AST: `\\omega = \\sqrt{\\frac{k}{m}}`. Verified AST grammar: 0 unbalanced brackets.'
      },
      {
        time: '+1,180ms',
        agent: 'LlamaParse Chemical Lexer',
        badge: 'REACTION_NOTATION',
        badgeColor: 'border-status-weak text-status-weak',
        thought: 'Encountered organic chemical transformation: `CH_3-CH_2-OH + PCC \\rightarrow CH_3-CHO`. Preserving explicit subscripts, reagent annotations, and directional reaction arrows.'
      },
      {
        time: '+1,420ms',
        agent: 'LlamaParse Layout Engine',
        badge: 'DIAGRAM_BOUNDARY',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Flagged non-character vector drawing in lower-right region `[142.5, 310.2, 458.0, 520.6]`. Marked as visual diagram asset; suppressed raw OCR character hallucination on drawing strokes.'
      }
    ]
  },
  {
    id: 'diagrams',
    number: 3,
    title: 'Diagram & Bond Cropper',
    subtitle: 'PyMuPDF Vector & Raster Clustering',
    icon: Sparkles,
    accentColor: '#FF8C00',
    stageName: 'STRUCTURING',
    nodeType: 'GEOMETRIC_VISION',
    engineTag: 'PyMuPDF / FitZ 1.23 Engine',
    latency: '340ms',
    inputPort: 'source_pdf & display_lists',
    outputPort: 'diag_*.png & bbox_coords',
    services: ['pdf-diagram-extractor.py', 'diagram.service.js', 'PyMuPDF / FitZ Engine'],
    description: 'A Python worker analyzes vector graphics and drawings across the PDF. It clusters disconnected chemical bonds, benzene rings, and reagent text with 24pt expansion radius, renders composite chemical structures at 300 DPI, uploads diagram PNGs, and matches them to candidate questions.',
    inputs: ['Source PDF File', 'Vector Drawing Primitives & Path Coordinates'],
    outputs: ['Cropped Diagram PNGs (diag_*.png)', 'Bounding Box Rectangles ([x0, y0, x1, y1])', 'Question Stem & Option Diagram Map'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Open PDF Cropper Studio',
    thoughtLogs: [
      {
        time: '+60ms',
        agent: 'PyMuPDF Vector Scanner',
        badge: 'PRIMITIVE_SCAN',
        badgeColor: 'border-amber-400 text-amber-400',
        thought: 'Scanning vector graphics display list on Page 14: identified 18 drawing objects (14 line strokes, 2 bezier curve segments, 2 circular arcs).'
      },
      {
        time: '+140ms',
        agent: 'Chemical Bond Clusterer',
        badge: 'SPATIAL_CLUSTERING',
        badgeColor: 'border-amber-400 text-amber-400',
        thought: 'Executing spatial clustering with 24pt expansion radius. Discovered disconnected aromatic ring bonds and "OH" substituent labels within 18.4pt proximity. Merged all 18 objects into a single composite bounding box `[142.5, 310.2, 458.0, 520.6]`.'
      },
      {
        time: '+260ms',
        agent: 'FitZ Rasterizer',
        badge: '300DPI_RENDER',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Rendering composite bounding box at 300 DPI with 14pt stem padding. Raster dimensions: 1314 x 876 px, 24-bit sRGB color space. File size: 84.2 KB.'
      },
      {
        time: '+340ms',
        agent: 'Diagram Service',
        badge: 'INJECTION_MAPPING',
        badgeColor: 'border-primary text-primary',
        thought: 'Uploaded image to `question-images/diagrams/diag_1788721811620_2_c25407c.png`. Injected diagram markdown token `![Figure](url)` into candidate question stem payload.'
      }
    ]
  },
  {
    id: 'segmentation',
    number: 4,
    title: 'Candidate Segmentation',
    subtitle: 'Question Delimiters & Choices Parser',
    icon: FileText,
    accentColor: '#00BFFF',
    stageName: 'VALIDATING',
    nodeType: 'HEURISTIC_PARSER',
    engineTag: 'Regex Lexer + Topic Heuristic',
    latency: '95ms',
    inputPort: 'markdown_pages & topics',
    outputPort: 'candidate_questions[]',
    services: ['question-extraction.js', 'candidateParser.js', 'Curriculum Mapping Heuristics'],
    description: 'Rule-based parsers and layout heuristics slice the continuous markdown into individual question candidate records. It extracts choices (A, B, C, D), infers answer keys from appended answer blocks, maps initial syllabus topic recommendations, and stages drafts.',
    inputs: ['Markdown Page Array', 'Curriculum Topic Taxonomy (Physics/Chem/Math)'],
    outputs: ['Candidate Questions Array (MongoDB)', 'Parsed Choices (A, B, C, D)', 'Auto-Detected Answer Key', 'Suggested Topic ID'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Review Candidates',
    thoughtLogs: [
      {
        time: '+20ms',
        agent: 'Segmentation Lexer',
        badge: 'ANCHOR_MATCHING',
        badgeColor: 'border-primary text-primary',
        thought: 'Scanning token stream for question anchor patterns. Matched regex `/^Q(?:uestion)?\\s*(\\d+)[\\.\\:]/i` on line 42 -> Identified Question #14.'
      },
      {
        time: '+45ms',
        agent: 'Choices Splitter',
        badge: 'CHOICES_PARSED',
        badgeColor: 'border-primary text-primary',
        thought: 'Detected 4 discrete choice labels: (A) $10\\text{ rad/s}$, (B) $20\\text{ rad/s}$, (C) $5\\text{ rad/s}$, (D) $100\\text{ rad/s}$. Structured into standard choices array.'
      },
      {
        time: '+70ms',
        agent: 'Answer Key Detector',
        badge: 'KEY_INFERENCE',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Cross-referencing official answer key matrix from page 32: matched table row `14 -> (A)`. Inferred `correct_answer: "A"` with 98.4% detection confidence.'
      },
      {
        time: '+95ms',
        agent: 'Curriculum Classifier',
        badge: 'TOPIC_MAPPING',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Keyword extraction: ["mass", "spring constant", "vertical oscillation", "angular frequency"]. Cosine similarity match against syllabus ontology -> Matched `Physics > Simple Harmonic Motion > Spring-Mass Oscillations` (confidence: 94.2%).'
      }
    ]
  },
  {
    id: 'deduplication',
    number: 5,
    title: 'Deduplication Gate',
    subtitle: 'Trigram Dice Similarity Engine',
    icon: Copy,
    accentColor: '#FF2E55',
    stageName: 'VALIDATING',
    nodeType: 'FUZZY_DEDUP',
    engineTag: 'Bigram/Trigram Dice Engine',
    latency: '85ms',
    inputPort: 'candidate_text',
    outputPort: 'similarity_score & match_type',
    services: ['deduplication.service.js', 'question_duplicates table', 'Dice Coefficient Algorithm'],
    description: 'Every extracted question is evaluated against the existing repository. Mathematical formulas and whitespace are normalized, and Dice coefficient bigram matching checks for exact 100% duplicate questions or OCR phrasing variations, preventing repetitive syllabus bloat.',
    inputs: ['Candidate Question Text', 'Live Question Bank Corpus (Supabase)'],
    outputs: ['Similarity Score (0.00 to 1.00)', 'Match Classification (EXACT / HIGH_CONFIDENCE / POTENTIAL)', 'Duplicate Resolution Flag'],
    targetRoute: '/admin/duplicates',
    targetRouteLabel: 'Audit Duplicates',
    thoughtLogs: [
      {
        time: '+15ms',
        agent: 'Formula Normalizer',
        badge: 'MATH_STRIP',
        badgeColor: 'border-rose-400 text-rose-400',
        thought: 'Normalizing LaTeX symbols: converting `\\text{rad/s}` to `rad/s`, removing whitespace, stripping punctuation. Standardized canonical token length: 142 characters.'
      },
      {
        time: '+40ms',
        agent: 'Trigram Generator',
        badge: 'N_GRAM_INDEX',
        badgeColor: 'border-rose-400 text-rose-400',
        thought: 'Generated 138 character trigram sets for candidate question stem.'
      },
      {
        time: '+65ms',
        agent: 'Dice Similarity Matcher',
        badge: 'CORPUS_COMPARISON',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Comparing against 273 existing physics questions. Closest match in question bank: `q_98124` with Dice coefficient = 0.124. Duplicate alert threshold: 0.80.'
      },
      {
        time: '+85ms',
        agent: 'Deduplication Certifier',
        badge: 'CERTIFIED_UNIQUE',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Similarity 0.124 is well below 0.80 threshold. Question certified unique. Duplicate flag set to CLEAN (No duplicate created).'
      }
    ]
  },
  {
    id: 'review',
    number: 6,
    title: 'Faculty Review & Quality Gate',
    subtitle: 'Human Verification & Explanation Audit',
    icon: CheckCircle2,
    accentColor: '#107C10',
    stageName: 'AWAITING_REVIEW',
    nodeType: 'HUMAN_QUALITY_GATE',
    engineTag: 'Split-Screen Verification Engine',
    latency: 'User Action',
    inputPort: 'candidate_draft & pdf_preview',
    outputPort: 'verified_question_dto',
    services: ['ContentAdminPage.jsx', 'AdminQuestionsPage.jsx', 'Human-in-the-Loop Workflow'],
    description: 'Faculty and platform administrators inspect each question candidate in side-by-side split view. They verify the answer key, confirm mathematical correctness, assign difficulty (Easy/Medium/Hard), verify diagram attachments, and confirm the syllabus chapter and topic.',
    inputs: ['Candidate Draft Card', 'Rendered High-Res PDF Page Preview', 'Faculty Feedback / Topic Placement'],
    outputs: ['Approved Question Payload', 'Rejection Reason (if discarded)', 'Verified Status Flag (verified = true / false)'],
    targetRoute: '/admin/content',
    targetRouteLabel: 'Verify Candidates in Ops',
    thoughtLogs: [
      {
        time: '+0.0s',
        agent: 'Quality Gate Pre-Flight',
        badge: 'SCHEMA_LINT',
        badgeColor: 'border-emerald-400 text-emerald-400',
        thought: 'Automated pre-flight linting: Question text present (194 chars). 4 distinct options populated. Answer key valid (A). Solution explanation text present.'
      },
      {
        time: '+1.2s',
        agent: 'KaTeX Renderer Auditor',
        badge: 'KATEX_VALIDATION',
        badgeColor: 'border-emerald-400 text-emerald-400',
        thought: 'MathText compiler validated all 4 equations in question stem and choices. Zero runtime KaTeX parsing errors.'
      },
      {
        time: '+2.8s',
        agent: 'Faculty Reviewer',
        badge: 'HUMAN_APPROVAL',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Faculty confirmed answer key "A", verified diagram alignment with Question 14, and approved curriculum assignment: `Physics > Simple Harmonic Motion`.'
      },
      {
        time: '+3.1s',
        agent: 'Publication Dispatcher',
        badge: 'STATE_TRANSITION',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Transitioning candidate lifecycle from `REVIEW_REQUIRED` to `VERIFIED`. Triggering dual-store persistence engine.'
      }
    ]
  },
  {
    id: 'sync',
    number: 7,
    title: 'Dual-Store Persistence',
    subtitle: 'PostgreSQL Row + Qdrant Vector Point',
    icon: Server,
    accentColor: '#00BFFF',
    stageName: 'COMPLETED',
    nodeType: 'VECTOR_DATABASE',
    engineTag: 'PostgreSQL 15 + Qdrant v1.7',
    latency: '110ms',
    inputPort: 'verified_question_dto',
    outputPort: 'postgres_id & qdrant_point',
    services: ['content.service.js', 'embedding.provider.js', 'qdrant.repository.js', 'Supabase Admin'],
    description: 'Approved questions are persisted atomically into PostgreSQL (Supabase `questions` table). Concurrently, the text and choices are converted into high-dimensional embeddings and written into Qdrant Vector Search for semantic similarity searches and recommendation retrieval.',
    inputs: ['Accepted Question DTO', 'Canonical UUID'],
    outputs: ['Supabase questions record', 'Qdrant 768-dim Dense Vector Point', 'Projection Sync Confirmation (projection_syncs)'],
    targetRoute: '/admin/syncs',
    targetRouteLabel: 'View Projection Syncs',
    thoughtLogs: [
      {
        time: '+18ms',
        agent: 'PostgreSQL Transaction',
        badge: 'RELATIONAL_INSERT',
        badgeColor: 'border-primary text-primary',
        thought: 'Inserting row into Supabase `questions` table. Primary Key UUID: `q_7f8a9b1c2d3e`. Set `publication_status: "PUBLISHED"`, `verified: true`.'
      },
      {
        time: '+52ms',
        agent: 'Embedding Vectorizer',
        badge: 'VECTOR_INFERENCE',
        badgeColor: 'border-purple-400 text-purple-400',
        thought: 'Tokenized question stem, choices, and curriculum hierarchy (68 tokens). Inferred 768-dimensional dense embedding vector `[-0.042, 0.081, 0.119, ...]`. L2 normalized.'
      },
      {
        time: '+88ms',
        agent: 'Qdrant Vector Engine',
        badge: 'COLLECTION_UPSERT',
        badgeColor: 'border-purple-400 text-purple-400',
        thought: 'Upserting point `7f8a9b1c-2d3e-4f5a...` into collection `questions_v1` with payload metadata `{ topic_id, difficulty: "medium", source_type: "PYQ", exam_year: 2024 }`.'
      },
      {
        time: '+110ms',
        agent: 'Projection Sync Manager',
        badge: 'SYNC_CONFIRMED',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Dual storage synchronization confirmed. Written idempotency sync key to `projection_syncs`. Stage marked `COMPLETED`.'
      }
    ]
  },
  {
    id: 'telemetry',
    number: 8,
    title: 'Live Practice & Telemetry Loop',
    subtitle: 'Exam Engine & Confidence Gap Calibration',
    icon: Activity,
    accentColor: '#107C10',
    stageName: 'LIVE',
    nodeType: 'COGNITIVE_ANALYTICS',
    engineTag: 'Confidence Gap Algorithm + Telemetry',
    latency: 'Continuous',
    inputPort: 'student_attempts[]',
    outputPort: 'gap_score & mastery_index',
    services: ['evaluations.service.js', 'practice.service.js', 'dashboard.utils.js', 'Student Observability'],
    description: 'The verified question enters the live question bank, ready for student timed evaluations and untimed practice drills. Real-time attempt telemetry computes student confidence-performance gaps, classifies cognitive mistake patterns, and updates curriculum mastery metrics.',
    inputs: ['Student Attempts & Timers', 'Pre-test Confidence Ratings (1-10)'],
    outputs: ['Confidence Gap Score (Overconfident / Underconfident / Aligned)', 'Cognitive Mistake Diagnostics', 'Cohort Performance Analytics'],
    targetRoute: '/admin/students',
    targetRouteLabel: 'Inspect Student Cohorts',
    thoughtLogs: [
      {
        time: '+0.4s',
        agent: 'Exam Delivery Worker',
        badge: 'MOCK_TEST_SERVED',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Served Question `q_7f8a9b1c2d3e` in JEE 2026 Timed Evaluation #481. Student: Aarav Patel. Topic: Simple Harmonic Motion.'
      },
      {
        time: '+42.8s',
        agent: 'Attempt Grader',
        badge: 'ATTEMPT_GRADED',
        badgeColor: 'border-status-aligned text-status-aligned',
        thought: 'Student submitted answer "A" in 42.4 seconds. Verified answer key: "A". Grade: CORRECT (+4 marks). Recorded in `evaluation_attempts`.'
      },
      {
        time: '+43.1s',
        agent: 'Confidence Gap Engine',
        badge: 'META_COGNITIVE_CALIB',
        badgeColor: 'border-amber-400 text-amber-400',
        thought: 'Pre-assessment confidence: 8/10 (80%). Topic performance: 1/1 (100%). Gap formula: `80 - 100 = -20`. Classified as `ALIGNED` (Accurate meta-cognitive self-calibration).'
      },
      {
        time: '+43.5s',
        agent: 'Cohort Aggregator',
        badge: 'OBSERVABILITY_SYNC',
        badgeColor: 'border-primary text-primary',
        thought: 'Platform telemetry refreshed: total questions attempted +1. Simple Harmonic Motion curriculum solve rate updated to 74.2% across cohort.'
      }
    ]
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

  // Sheet layout style: 'sheet' (nodes with cable connections) vs 'linear'
  const [sheetLayout, setSheetLayout] = useState('sheet');

  // Verbosity level for AI thoughts: 'detailed' (minute traces) vs 'summary'
  const [thoughtVerbosity, setThoughtVerbosity] = useState('detailed');

  // Engine filter for thoughts: 'all' or station ID
  const [engineFilter, setEngineFilter] = useState('all');

  // Selected station node for deep inspection
  const [selectedStationId, setSelectedStationId] = useState('ocr');

  // Live ingestion jobs from backend
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(selectedJobIdFromUrl);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [observability, setObservability] = useState(null);

  // Simulation state
  const [simStepIndex, setSimStepIndex] = useState(1); // Default to LlamaParse OCR for instant view
  const [simIsPlaying, setSimIsPlaying] = useState(false);

  // Thought stream auto-scroll ref
  const thoughtStreamRef = useRef(null);

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
    return PIPELINE_STATIONS.find(s => s.id === selectedStationId) || PIPELINE_STATIONS[1];
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

  // Filtered thoughts based on engineFilter
  const displayedThoughts = useMemo(() => {
    if (engineFilter === 'all') {
      return selectedStation.thoughtLogs;
    }
    const target = PIPELINE_STATIONS.find(s => s.id === engineFilter);
    return target ? target.thoughtLogs : selectedStation.thoughtLogs;
  }, [engineFilter, selectedStation]);

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
              <span>Live Node Sheet</span>
            </span>
          </div>
          <h1 className="text-display text-on-surface mt-1 font-light">
            Content & Exam Pipeline Observability
          </h1>
          <p className="text-body-md text-on-surface-variant font-light mt-1">
            Visual node-sheet and minute under-the-hood AI execution traces across LlamaParse OCR, vector bond extraction, candidate structuring, deduplication, and student exam loops.
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
              <span>Live Job Tracker</span>
            </button>
            <button
              onClick={() => {
                setActiveMode('simulation');
                setSimStepIndex(1);
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
              <span>Inspect Source PDF In Flight:</span>
            </span>

            {jobs.length > 0 ? (
              <select
                value={selectedJobId}
                onChange={e => handleJobSelect(e.target.value)}
                className="bg-black border border-white/20 text-white p-2 outline-none focus:border-primary uppercase text-xs min-w-[300px]"
              >
                {jobs.map(j => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.source?.filename || j.job_id} — [{j.stage || 'UNKNOWN'}]
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-white/50 italic">No ingestion jobs currently in MongoDB.</span>
            )}
          </div>

          {currentJob && (
            <div className="flex items-center gap-3 text-[11px] text-white/70">
              <span>Pages: <strong className="text-white">{currentJob.progress?.total_pages || currentJob.progress?.processed_pages || '-'}</strong></span>
              <span>•</span>
              <span>Extracted Qs: <strong className="text-primary">{currentJob.progress?.questions_extracted ?? 0}</strong></span>
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

      {/* ─── Interactive Pipeline Node Canvas / Sheet ─── */}
      <div className="p-6 bg-surface-dim border border-outline-variant space-y-4 relative overflow-hidden">
        {/* Subtle Node Grid Blueprint Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#00BFFF14_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-60" />

        <div className="flex items-center justify-between text-xs font-mono text-white/50 uppercase tracking-widest relative z-10">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <span>Interactive Pipeline Node Canvas</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-primary hidden sm:inline">Click any node to reveal its inner AI thought stream</span>
            <div className="flex items-center border border-white/20 bg-black">
              <button
                onClick={() => setSheetLayout('sheet')}
                className={`px-2 py-0.5 text-[10px] uppercase ${sheetLayout === 'sheet' ? 'bg-primary text-white font-bold' : 'text-white/50'}`}
              >
                Nodes
              </button>
              <button
                onClick={() => setSheetLayout('linear')}
                className={`px-2 py-0.5 text-[10px] uppercase ${sheetLayout === 'linear' ? 'bg-primary text-white font-bold' : 'text-white/50'}`}
              >
                Linear
              </button>
            </div>
          </div>
        </div>

        {/* Modular Nodes Layout Grid */}
        <div className={`relative z-10 grid gap-4 ${
          sheetLayout === 'sheet'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1'
        }`}>
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
                className={`p-4 border-2 transition-all cursor-pointer relative flex flex-col justify-between rounded-sm backdrop-blur-sm group ${
                  isSelected
                    ? 'border-primary bg-black/90 shadow-xl shadow-primary/20 ring-2 ring-primary/80'
                    : isHighlighted
                    ? 'border-primary bg-primary/10 ring-2 ring-primary animate-pulse'
                    : isPassed
                    ? 'border-status-aligned/40 bg-black/70 hover:border-status-aligned'
                    : 'border-white/10 bg-black/60 hover:border-white/30'
                }`}
              >
                {/* Node Top Terminal Pin / In Port */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 text-white/50 truncate max-w-[140px]" title={`IN: ${station.inputPort}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>IN: {station.inputPort}</span>
                  </div>
                  <span className="px-1.5 py-0.2 bg-white/5 border border-white/10 text-[9px] text-white/60 uppercase">
                    {station.nodeType}
                  </span>
                </div>

                {/* Node Body */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-sm font-mono text-xs font-bold ${
                        isHighlighted
                          ? 'bg-primary text-black'
                          : isPassed
                          ? 'bg-status-aligned text-black'
                          : 'bg-white/10 text-white'
                      }`}>
                        {station.number}
                      </div>
                      <IconComp className={`w-4 h-4 ${isHighlighted ? 'text-primary' : isPassed ? 'text-status-aligned' : 'text-white/70'}`} />
                    </div>

                    {/* Status Badge */}
                    <span className="text-[10px] font-mono uppercase tracking-wider">
                      {isHighlighted ? (
                        <span className="text-primary font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                          Processing
                        </span>
                      ) : isJobFailed ? (
                        <span className="text-error font-bold">Failed</span>
                      ) : isPassed ? (
                        <span className="text-status-aligned font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="text-white/30">Standby</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <h4 className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-white/90'}`}>
                      {station.title}
                    </h4>
                    <p className="text-[11px] font-mono text-white/50 truncate mt-0.5">
                      {station.subtitle}
                    </p>
                  </div>

                  {/* Engine Badge & Latency */}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-white/40 border-t border-white/5">
                    <span className="truncate max-w-[120px]" title={station.engineTag}>
                      ⚙️ {station.engineTag}
                    </span>
                    <span>{station.latency}</span>
                  </div>
                </div>

                {/* Node Bottom Terminal Pin / Out Port */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/10 text-[10px] font-mono text-white/50">
                  <div className="flex items-center gap-1.5 truncate max-w-[150px]" title={`OUT: ${station.outputPort}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-status-aligned" />
                    <span>OUT: {station.outputPort}</span>
                  </div>
                  {isSelected && (
                    <span className="text-primary font-bold text-[9px] uppercase tracking-wider">
                      [Active Node]
                    </span>
                  )}
                </div>

                {/* Circuit Connector Cable Arrow */}
                {idx < PIPELINE_STATIONS.length - 1 && sheetLayout === 'sheet' && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                    <div className="w-5 h-5 rounded-full bg-black border border-primary/40 flex items-center justify-center text-primary shadow-lg">
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Under-The-Hood AI Thinking & Execution Stream (Minute Details) ─── */}
      <div className="border-2 border-primary bg-black p-6 space-y-4 shadow-2xl relative">
        {/* Console Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/15 border border-primary/40 flex items-center justify-center text-primary">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-primary uppercase tracking-widest font-bold">
                  Under-The-Hood AI Thought Stream
                </span>
                <span className="w-2 h-2 rounded-full bg-status-aligned animate-pulse" />
              </div>
              <h3 className="text-lg text-white font-light mt-0.5">
                {selectedStation.title} &mdash; <span className="text-white/60 font-mono text-xs">Engine Internal Monologue</span>
              </h3>
            </div>
          </div>

          {/* Engine Thought Stream Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
            <span className="text-white/40 uppercase text-[10px] hidden sm:inline">Engine:</span>
            <select
              value={engineFilter}
              onChange={e => setEngineFilter(e.target.value)}
              className="bg-surface-container border border-white/20 text-white p-1.5 text-xs outline-none focus:border-primary uppercase font-mono"
            >
              <option value="all">Active Station ({selectedStation.title})</option>
              {PIPELINE_STATIONS.map(s => (
                <option key={s.id} value={s.id}>{s.number}. {s.title}</option>
              ))}
            </select>

            <div className="flex items-center border border-white/20 bg-surface-container p-0.5">
              <button
                onClick={() => setThoughtVerbosity('detailed')}
                className={`px-2.5 py-1 text-[10px] uppercase font-mono ${thoughtVerbosity === 'detailed' ? 'bg-primary text-white font-bold' : 'text-white/50'}`}
              >
                Minute Trace
              </button>
              <button
                onClick={() => setThoughtVerbosity('summary')}
                className={`px-2.5 py-1 text-[10px] uppercase font-mono ${thoughtVerbosity === 'summary' ? 'bg-primary text-white font-bold' : 'text-white/50'}`}
              >
                Summary
              </button>
            </div>
          </div>
        </div>

        {/* Thought Stream Terminal Log Output */}
        <div
          ref={thoughtStreamRef}
          className="p-4 bg-surface-dim/90 border border-white/10 rounded-sm font-mono text-xs space-y-3 max-h-80 overflow-y-auto"
        >
          <div className="flex items-center justify-between text-[10px] text-white/40 border-b border-white/5 pb-2">
            <span>TIMESTAMP • ENGINE AGENT • REASONING BADGE</span>
            <span>DIAGNOSTIC TRACE (ACTIVE LEASE)</span>
          </div>

          {displayedThoughts.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col sm:flex-row items-start gap-3 p-2.5 bg-black/40 border-l-2 border-primary/60 hover:bg-black/60 transition-colors"
            >
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-white/40 text-[10px] font-mono">{log.time}</span>
                <span className="px-1.5 py-0.5 bg-white/5 border border-white/15 text-[10px] text-primary font-bold">
                  {log.agent}
                </span>
                <span className={`px-1.5 py-0.5 border text-[9px] uppercase font-bold ${log.badgeColor}`}>
                  [{log.badge}]
                </span>
              </div>

              <div className="text-white/90 text-xs font-light leading-relaxed flex-1">
                {log.thought}
              </div>
            </motion.div>
          ))}

          {/* Typing/Thinking indicator */}
          <div className="flex items-center gap-2 pt-2 text-[11px] text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="animate-pulse">Engine reasoning stream active &bull; listening for worker events...</span>
          </div>
        </div>

        {/* Station Navigation Quick Button */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 font-mono text-xs">
          <span className="text-white/50 text-[11px]">
            Engine code location: <code className="text-primary">{selectedStation.services[0]}</code>
          </span>

          <Link
            to={selectedStation.targetRoute}
            className="px-4 py-2 bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors uppercase tracking-widest font-bold flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <span>{selectedStation.targetRouteLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
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
                Technical Data Contract & Architecture
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
