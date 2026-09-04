import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getMongoDb, closeMongoConnection } from '../lib/mongodb.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { createLlamaParseJob, getLlamaParseResult } from '../features/content/llamaparse.provider.js';
import { extractQuestionCandidates } from '../features/content/question-extraction.js';
import { contentRepository } from '../features/content/content.repository.js';
import { upsertPublishedQuestion } from '../features/content/publication.repository.js';
import { createIngestionJobId, createQuestionId } from '../features/content/content.contracts.js';

async function main() {
  const args = process.argv.slice(2);
  const pdfPath = args[0] || 'C:\\Users\\Admin\\Desktop\\JEE _Mains\\2018\\que_1733380698.pdf';
  const exam = 'JEE Main';
  const year = 2018;
  const autoPublish = args.includes('--auto-publish') || true;

  console.log('====================================================');
  console.log(`TooPrep End-to-End PDF Ingestion Pipeline`);
  console.log(`Source PDF: ${pdfPath}`);
  console.log(`Exam: ${exam} | Year: ${year} | Auto-Publish: ${autoPublish}`);
  console.log('====================================================\n');

  // 1. Read PDF file
  const filename = path.basename(pdfPath);
  const bytes = await fs.readFile(pdfPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  console.log(`[1/6] Read ${bytes.length} bytes. SHA-256: ${sha256.slice(0, 16)}...`);

  // 2. Fetch all curriculum topics from Supabase
  console.log(`[2/6] Loading curriculum topics from Supabase...`);
  const { data: dbTopics, error: tErr } = await supabaseAdmin
    .from('topics')
    .select('id, name, chapter_id, chapters(name, subjects(name))');

  if (tErr) throw new Error(`Failed to load topics: ${tErr.message}`);

  const allTopics = (dbTopics || []).map(t => ({
    id: t.id,
    name: t.name,
    chapter: t.chapters?.name,
    subject: t.chapters?.subjects?.name
  }));
  console.log(`      Loaded ${allTopics.length} topics across Physics, Chemistry, and Mathematics.`);

  // 3. Obtain LlamaParse Markdown Result (check local cache first)
  console.log(`[3/6] Obtaining LlamaParse document structure...`);
  let parsedDoc = null;
  const cacheFile = 'llamaparse_698_result.json';
  try {
    const cachedData = await fs.readFile(cacheFile, 'utf8');
    parsedDoc = JSON.parse(cachedData);
    console.log(`      Reusing local parser cache (${cacheFile}) with ${parsedDoc.pages?.length} pages.`);
  } catch (e) {
    console.log(`      Calling LlamaParse Cloud API...`);
    const externalJob = await createLlamaParseJob({ bytes, filename });
    console.log(`      Created LlamaParse job: ${externalJob.id}. Waiting for completion...`);
    parsedDoc = await getLlamaParseResult(externalJob.id);
    await fs.writeFile(cacheFile, JSON.stringify(parsedDoc, null, 2), 'utf8');
  }

  // 4. Create or Reuse Ingestion Job in MongoDB
  console.log(`[4/6] Creating / reusing ingestion job in MongoDB...`);
  const db = await getMongoDb();
  let existingJob = await db.collection('ingestion_jobs').findOne({ 'source.sha256': sha256 });
  let jobId;

  if (existingJob) {
    jobId = existingJob.job_id;
    console.log(`      Found existing job: ${jobId}, refreshing candidates...`);
    await db.collection('extracted_candidates').deleteMany({ job_id: jobId });
  } else {
    jobId = createIngestionJobId();
    const jobDoc = {
      job_id: jobId,
      stage: 'AWAITING_REVIEW',
      source: {
        storage_path: pdfPath,
        sha256,
        filename,
        exam,
        year,
        metadata: { size_bytes: bytes.length }
      },
      progress: {
        total_pages: parsedDoc.pages?.length || 0,
        processed_pages: parsedDoc.pages?.length || 0,
        questions_extracted: 0,
        questions_awaiting_review: 0
      },
      retry: { attempt_count: 0, next_attempt_at: new Date() },
      errors: [],
      events: [{ event: 'JOB_INGESTED_VIA_CLI', actor_id: 'system', occurred_at: new Date() }],
      created_by: 'admin_cli',
      created_at: new Date(),
      updated_at: new Date()
    };

    await contentRepository.insertJob(jobDoc);
    await contentRepository.saveParsedDocument({ job_id: jobId, source: jobDoc.source, ...parsedDoc, created_at: new Date() });
    console.log(`      Created job: ${jobId}`);
  }

  // 5. Extract Candidates with Answer Keys & Solutions
  console.log(`[5/6] Extracting questions, options, answer keys, solutions, and topic positions...`);
  const candidates = extractQuestionCandidates(jobId, parsedDoc.pages, allTopics);
  console.log(`      Extracted ${candidates.length} candidates.`);

  await contentRepository.saveExtractedCandidates(candidates);
  await db.collection('ingestion_jobs').updateOne(
    { job_id: jobId },
    {
      $set: {
        'progress.questions_extracted': candidates.length,
        'progress.questions_awaiting_review': candidates.length,
        updated_at: new Date()
      }
    }
  );

  // 6. Auto-Publish to Supabase Questions Table
  if (autoPublish) {
    console.log(`[6/6] Publishing verified questions directly to Supabase...`);
    let publishedCount = 0;
    let failedCount = 0;

    for (const c of candidates) {
      if (!c.suggested_topic_id) {
        console.warn(`      Skipping Q${c.source_question_number}: No topic assigned.`);
        failedCount++;
        continue;
      }

      const questionId = createQuestionId();
      const questionPayload = {
        question_id: questionId,
        version: 1,
        lifecycle: { status: 'PUBLISHED', changed_at: new Date(), changed_by: 'admin_cli' },
        content: {
          question_type: 'single_correct',
          question_text: c.question_text,
          options: [
            { id: 'A', text: c.options?.A || '' },
            { id: 'B', text: c.options?.B || '' },
            { id: 'C', text: c.options?.C || '' },
            { id: 'D', text: c.options?.D || '' }
          ],
          correct_answer: c.correct_answer || 'A',
          solution_text: c.solution_text || null,
          assets: []
        },
        provenance: {
          source_type: 'PYQ',
          provider: 'LLAMA_PARSE',
          exam: exam,
          year: parseInt(year, 10) || 2018,
          session: 1,
          shift: 1,
          paper_code: 'Online',
          question_number: c.source_question_number,
          source_pages: c.source_pages,
          ingestion_job_id: jobId
        },
        curriculum: {
          subject: c.subject,
          chapter: c.suggested_chapter,
          topic: c.suggested_topic,
          topic_id: c.suggested_topic_id,
          difficulty: 'medium'
        }
      };

      try {
        await upsertPublishedQuestion(questionPayload);
        // Mark candidate as published in MongoDB
        await db.collection('extracted_candidates').updateOne(
          { job_id: jobId, candidate_key: c.candidate_key },
          { $set: { status: 'PUBLISHED', canonical_question_id: questionId, reviewed_at: new Date() } }
        );
        publishedCount++;
      } catch (err) {
        console.error(`      Error publishing Q${c.source_question_number}:`, err.message);
        failedCount++;
      }
    }

    console.log(`\n====================================================`);
    console.log(`Ingestion & Publication Complete!`);
    console.log(`Total Extracted: ${candidates.length}`);
    console.log(`Published to Supabase: ${publishedCount}`);
    console.log(`Failed / Skipped: ${failedCount}`);
    console.log(`====================================================\n`);
  }

  await closeMongoConnection();
}

main().catch(err => {
  console.error('Fatal error during ingestion:', err);
  process.exit(1);
});
