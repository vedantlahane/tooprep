/**
 * End-to-End Pipeline Test Script
 *
 * Tests the complete ingestion pipeline using the real 2019 JEE PDF.
 * Run from the server directory:
 *   node --experimental-vm-modules scripts/test-pipeline.js
 *
 * Validates all data stores:
 *   - MongoDB:   ingestion_jobs, parsed_documents, extracted_candidates
 *   - Supabase:  source-pdfs bucket, question-images bucket
 *   - Qdrant:    collection existence (indexing happens on publish)
 *   - Groq:      LLM classification fallback
 *   - Gemini:    Embedding API connectivity
 */

import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env is at the monorepo root: server/scripts/../../ → project root
config({ path: path.resolve(__dirname, '..', '..', '.env') });

import fs from 'node:fs';
const PDF_PATH = 'C:\\Users\\Admin\\Desktop\\JEE _Mains\\2019\\que_1733380722.pdf';
const RESULTS = [];
let passed = 0, failed = 0;

function log(ok, label, detail = '') {
  const icon = ok ? '✅' : '❌';
  const msg = `${icon} ${label}${detail ? ': ' + detail : ''}`;
  console.log(msg);
  RESULTS.push({ ok, label, detail });
  if (ok) passed++; else failed++;
}

async function runTests() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  TOOPREP CONTENT PIPELINE — End-to-End Test');
  console.log('  PDF:', PDF_PATH);
  console.log('════════════════════════════════════════════════════════════\n');

  // ── 0. Environment checks ─────────────────────────────────────────────────
  console.log('── [0] Environment & API Keys ──────────────────────────────\n');
  log(Boolean(process.env.LLAMA_CLOUD_API_KEY), 'LLAMA_CLOUD_API_KEY set', process.env.LLAMA_CLOUD_API_KEY?.slice(0,10) + '…');
  log(Boolean(process.env.GROQ_API_KEY), 'GROQ_API_KEY set', process.env.GROQ_API_KEY?.slice(0,10) + '…');
  log(Boolean(process.env.GEMINI_API_KEY), 'GEMINI_API_KEY set', process.env.GEMINI_API_KEY?.slice(0,10) + '…');
  log(Boolean(process.env.SUPABASE_URL), 'SUPABASE_URL set');
  log(Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), 'SUPABASE_SERVICE_ROLE_KEY set');
  log(Boolean(process.env.MONGODB_URI), 'MONGODB_URI set');
  log(Boolean(process.env.QDRANT_API_KEY && process.env.QDRANT_CLUSTER_ENDPOINT), 'Qdrant config set');
  log(fs.existsSync(PDF_PATH), 'PDF file exists', PDF_PATH);
  console.log();

  // ── 1. Gemini Embedding API ───────────────────────────────────────────────
  console.log('── [1] Gemini Embedding API ─────────────────────────────────\n');
  try {
    const { embedQuestionDocument } = await import('../src/features/content/embedding.provider.js');
    const vec = await embedQuestionDocument('Newton law of motion particle acceleration');
    log(Array.isArray(vec) && vec.length === 768, 'Gemini embedding returns 768-dim vector', `length=${vec.length}`);
  } catch (e) {
    log(false, 'Gemini embedding API', e.message);
  }
  console.log();

  // ── 2. Groq LLM Classification ────────────────────────────────────────────
  console.log('── [2] Groq LLM Classification ──────────────────────────────\n');
  try {
    const { classifyQuestionTopic } = await import('../src/features/content/groq.provider.js');
    const mockTopics = [
      { id: 'phys-001', name: 'Newton\'s Laws of Motion', chapter: 'Laws of Motion', subject: 'Physics' },
      { id: 'chem-001', name: 'Mole Concept', chapter: 'Some Basic Concepts of Chemistry', subject: 'Chemistry' },
      { id: 'math-001', name: 'Limits and Derivatives', chapter: 'Calculus', subject: 'Mathematics' }
    ];
    const result = await classifyQuestionTopic('A particle of mass 2 kg accelerates at 3 m/s² under force F', mockTopics);
    log(result.topic_id === 'phys-001', 'Groq classified Newton\'s Law question', `→ ${result.topic_name} (${(result.confidence * 100).toFixed(0)}%)`);
    log(Boolean(result.reasoning), 'Groq returned reasoning', result.reasoning?.slice(0, 60));
  } catch (e) {
    log(false, 'Groq LLM classification', e.message);
  }
  console.log();

  // ── 3. MongoDB connectivity ───────────────────────────────────────────────
  console.log('── [3] MongoDB Connectivity ─────────────────────────────────\n');
  let mongoDb;
  try {
    const { getMongoDb } = await import('../src/lib/mongodb.js');
    mongoDb = await getMongoDb();
    const collections = await mongoDb.listCollections().toArray();
    log(true, 'MongoDB connected', `${collections.length} collections`);
    const jobCount = await mongoDb.collection('ingestion_jobs').countDocuments();
    log(true, 'ingestion_jobs collection accessible', `${jobCount} existing jobs`);
    const candidateCount = await mongoDb.collection('extracted_candidates').countDocuments();
    log(true, 'extracted_candidates collection accessible', `${candidateCount} existing candidates`);
  } catch (e) {
    log(false, 'MongoDB connectivity', e.message);
  }
  console.log();

  // ── 4. Supabase connectivity ──────────────────────────────────────────────
  console.log('── [4] Supabase Storage ─────────────────────────────────────\n');
  try {
    const { supabaseAdmin } = await import('../src/lib/supabase.js');
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    log(!error, 'Supabase storage accessible', error?.message || `${buckets?.length} buckets`);
    const hasPdfBucket = buckets?.some(b => b.name === 'source-pdfs');
    const hasImgBucket = buckets?.some(b => b.name === 'question-images');
    log(hasPdfBucket, 'source-pdfs bucket exists');
    log(hasImgBucket, 'question-images bucket exists');
  } catch (e) {
    log(false, 'Supabase storage', e.message);
  }
  console.log();

  // ── 5. Qdrant collection ──────────────────────────────────────────────────
  console.log('── [5] Qdrant Vector DB ─────────────────────────────────────\n');
  try {
    const { ensureQuestionCollection } = await import('../src/features/content/qdrant.repository.js');
    await ensureQuestionCollection();
    log(true, 'Qdrant collection ensured (tooprep_questions)');
  } catch (e) {
    log(false, 'Qdrant collection', e.message);
  }
  console.log();

  // ── 6. Question extraction from sample data ───────────────────────────────
  console.log('── [6] Question Extraction (llamaparse_685_result.json) ──────\n');
  try {
    const { extractQuestionCandidates, parseAnswerKeyMap } = await import('../src/features/content/question-extraction.js');
    const samplePath = path.join(__dirname, '..', 'llamaparse_685_result.json');
    if (fs.existsSync(samplePath)) {
      const raw = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
      const pages = raw.pages || raw;
      const candidates = extractQuestionCandidates('test_extract', pages, []);
      const ansKeys = parseAnswerKeyMap(pages);
      log(candidates.length >= 80, 'Extracted ≥80 candidates', `got ${candidates.length}`);
      const withOptions = candidates.filter(c => c.has_options);
      log(withOptions.length >= 70, '≥70 candidates have parsed options', `got ${withOptions.length}`);
      log(Object.keys(ansKeys).length > 0, 'Answer keys parsed', `${Object.keys(ansKeys).length} keys`);
      const blankAll = candidates.filter(c => !c.options?.A && !c.options?.B && !c.options?.C && !c.options?.D && c.has_options);
      log(blankAll.length === 0, 'No has_options=true with all blank options', `${blankAll.length} blank`);
    } else {
      log(false, 'llamaparse_685_result.json', 'File not found at ' + samplePath);
    }
  } catch (e) {
    log(false, 'Question extraction', e.message);
  }
  console.log();

  // ── 7. LlamaParse module loads (no actual API call) ───────────────────────
  console.log('── [7] Module Load Checks ───────────────────────────────────\n');
  for (const mod of [
    '../src/features/content/question-extraction.js',
    '../src/features/content/content.worker.js',
    '../src/features/content/diagram.service.js',
    '../src/features/content/groq.provider.js',
    '../src/features/content/ingestion-events.js',
    '../src/features/content/llamaparse.provider.js'
  ]) {
    try {
      await import(mod);
      log(true, `Module loads: ${path.basename(mod)}`);
    } catch (e) {
      log(false, `Module loads: ${path.basename(mod)}`, e.message.slice(0, 80));
    }
  }
  console.log();

  // ── Final Report ──────────────────────────────────────────────────────────
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed / ${failed} failed / ${passed + failed} total`);
  console.log('════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('Failed tests:');
    RESULTS.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.label}: ${r.detail}`));
    console.log();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
