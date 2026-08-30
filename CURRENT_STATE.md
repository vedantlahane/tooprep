# TooPrep - Comprehensive Architecture & State Document

## 1. Product Vision & Core Philosophy
TooPrep is an advanced, full-stack learning companion built for students preparing for highly competitive exams like the JEE. It revolves around the **Confidence-Performance Gap**, identifying when students are overconfident or underconfident based on real evaluation data.

---

## 2. The Confidence-Performance Gap Algorithm
Executed server-side in `dashboard.utils.js`:
* **Gap Calculation:** `Gap = Evaluation Accuracy - Expected Accuracy (Confidence x 10)`.
* **Classifications:**
  * ?? **OVERCONFIDENT:** Gap <= `-20%` (Updated threshold) and Accuracy < `50%`. High risk.
  * ?? **WEAK_ALIGNED:** Accuracy < `50%`, Gap > `-20%`.
  * ?? **UNDERCONFIDENT:** Gap >= `+20%`.
  * ?? **ALIGNED:** Accuracy >= `50%`, Gap between `-20%` and `+20%`.
  * ? **PRELIMINARY** (5-9 attempts) and **INSUFFICIENT_DATA** (< 5 attempts).

---

## 3. Core Features & Engine Mechanics
* **Timed Evaluations:** Simulates harsh exam conditions. Mix of ~20% Easy, ~47% Medium, ~33% Hard. Answers/solutions are stripped from client payloads.
* **Practice Mode:** Untimed, immediate feedback, mistake tracking.
* **Insights:** Aggregates topic-level data up to Subject Level, pinning the Biggest Confidence Gap to the profile.

---

## 4. UI / UX Design System: "Metro UI"
* **Style:** Rigid, flat, typography-driven (inspired by Windows Phone Lumia).
* **Colors:** Pure black background, white text, Cyan accent.
* **Geometry:** Zero rounded corners (`border-radius: 0px`).
* **Typography:** `Segoe UI`, massive lightweight headers. Live Tile Grid for the dashboard.

---

## 5. Software Architecture
The app follows a **Vertical Slice (Feature-Based)** architecture, where both client and server are organized by domain feature rather than technical layers.

### Infrastructure & Operations
* **API Server (`index.js`):** Express app serving student and admin APIs.
* **Worker Process (`worker.js`):** A standalone background Node process handling asynchronous heavy lifting (PDF parsing and Vector embedding). Uses a custom polling loop with MongoDB lease-based concurrency (no Redis/BullMQ).
* **Logging & Tracing:** Structured JSON logging (`platform/logger.js`) and request ID middleware (`platform/request-context.js`) across the stack.

### Hybrid Data Storage Architecture
TooPrep utilizes a polyglot persistence strategy, routing data based on its lifecycle phase:
1. **Supabase Storage:** Private `source-pdfs` bucket for incoming exam papers.
2. **MongoDB Atlas:** The "Canonical Store" (using native driver, no Mongoose). Owns the rich, immutable question data, parser outputs, ingestion jobs, review candidates, and audit history.
3. **Qdrant Cloud:** Vector database for semantic search and duplicate detection. Uses Gemini (`gemini-embedding-001`) for 768-dimensional embeddings.
4. **PostgreSQL (Supabase):** The "Student Projection Store". Contains only published, verified questions stripped of rich metadata, alongside all student performance, auth, and analytics data.

---

## 6. Content Ingestion Pipeline & Lifecycle
The ingestion process automatically transforms raw PDFs into verified, searchable exam questions:

1. **UPLOAD (`RAW`):** Admin uploads a PDF via `/api/admin/content/ingestion-jobs/upload`. Saved to Supabase Storage.
2. **PARSE (`PARSING`):** Worker claims job via Mongo lease, sends PDF to LlamaParse API.
3. **EXTRACT (`STRUCTURING`):** Deterministic regex extracts distinctly numbered questions from Markdown (`question-extraction.js`).
4. **REVIEW (`AWAITING_REVIEW`):** Admin uses the `/admin/content` UI to review, edit, attach metadata (topic/difficulty), and VERIFY each candidate.
5. **PUBLISH (`PUBLISHED`):** Verified question is written to MongoDB, then idempotently projected to Supabase PostgreSQL.
6. **SYNC (`INDEXING`):** Worker asynchronously picks up the published question, generates a Gemini embedding, and upserts it to Qdrant. Failure to index retries exponentially and does not block publication.

---

## 7. Current Project Status
* **Architecture Hardened:** API securely separates student/admin routes. Answers/solutions never leak to students before submission.
* **Ingestion Pipeline Live:** Admin UI, MongoDB content modeling, LlamaParse integration, and lease-based worker are implemented and tested.
* **Semantic Search Added:** Qdrant integration expanded to support full semantic querying of the question bank.
* **Verification Passed:** Server tests are passing (21/21), and the client builds successfully.
* **Remaining Work:**
  - Run a real end-to-end PDF ingestion and assess LlamaParse extraction quality.
  - Review and publish actual questions through the admin UI.
  - Add duplicate detection using the vectors before publishing.
  - Add production operational pieces: deployment, rate limiting, metrics, backups.
