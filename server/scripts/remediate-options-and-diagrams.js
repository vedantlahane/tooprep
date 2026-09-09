import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '..', '..', '.env') });

import { getMongoDb } from '../src/lib/mongodb.js';
import { supabaseAdmin } from '../src/lib/supabase.js';
import { storeQuestionImage } from '../src/features/content/content.storage.js';
import { cleanOcrMathArtifacts } from '../src/features/content/question-extraction.js';

const LOCAL_DIAGRAMS_DIR = path.resolve(__dirname, '../public/uploads/questions');

const cutoffRegexes = [
  /\n\s*(?:(?:\(|\[)[A-Da-d1-4](?:\)|\])|##\s*\*\*[A-Z\s]+\*\*|\*\*(?:PHYSICS|CHEMISTRY|MATHEMATICS)\*\*)\s*\n/i,
  /\n\s*(?:[>\*#\s]*)(?:Students may find similar|\[?JEE\s*(?:Main|Advance)|Chapter\s*:|Exercise\s*#)/i,
  /\n\s*(?:[>\*#\s]*)(?:Ans(?:\.|wer)?[:\s]*[\(\[]?[1-4A-Da-d]|\*\*Ans\b)/i,
  /\n\s*(?:[>\*#\s]*)(?:Sol(?:\.|ution)?[:\s]|\*\*Sol\b)/i
];

function findEarliestCutoff(text) {
  let cutoff = -1;
  for (const re of cutoffRegexes) {
    const pos = text.search(re);
    if (pos !== -1 && (cutoff === -1 || pos < cutoff)) {
      cutoff = pos;
    }
  }
  return cutoff;
}

function parseTailMetadata(tail) {
  let answerKey = null;
  let solutionText = null;
  let chapter = null;

  const ansMatch = tail.match(/(?:Ans(?:\.|wer)?[:\s]*|^\s*\d+\s*\[|\(\s*)[\(\[]?\s*([1-4A-Da-d])\s*[\)\]]?(?:\*\*)?/i);
  if (ansMatch) {
    const rawKey = ansMatch[1].toUpperCase();
    const letterMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
    answerKey = letterMap[rawKey] || rawKey;
  }

  const solMatch = tail.match(/(?:(?:\*\*)?Sol(?:\.|ution)?[:\.\s]+(?:\*\*)?)([\s\S]*)/i);
  if (solMatch && solMatch[1]?.trim()) {
    solutionText = cleanOcrMathArtifacts(solMatch[1].trim());
  }

  const chMatch = tail.match(/Chapter\s*:\s*([^,\n\]]+)/i);
  if (chMatch) {
    chapter = chMatch[1].trim();
  }

  return { answerKey, solutionText, chapter };
}

async function main() {
  console.log('====================================================');
  console.log('  TooPrep Remediation: Option D, Answers & Diagrams');
  console.log('====================================================\n');

  // 1. Upload local diagrams to Supabase Storage and build a map by Q number
  console.log('── Step 1: Mapping Local Question Diagrams ──');
  const diagramMap = {}; // { 10: { stem: [url], options: { A: url } } }
  
  if (fs.existsSync(LOCAL_DIAGRAMS_DIR)) {
    const files = fs.readdirSync(LOCAL_DIAGRAMS_DIR).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    console.log(`Found ${files.length} diagram files in ${LOCAL_DIAGRAMS_DIR}`);

    for (const file of files) {
      const match = file.match(/^q(\d+)(?:_(stem|rxn|circuit|rod|highway|polarizer|compounds|mo|compound|acids|cube|rails|opt_([a-d])|opts))?\.png$/i);
      if (match) {
        const qNum = parseInt(match[1], 10);
        const type = match[2]?.toLowerCase() || 'stem';
        const optLetter = match[3]?.toUpperCase();

        const filePath = path.join(LOCAL_DIAGRAMS_DIR, file);
        const buffer = fs.readFileSync(filePath);
        
        try {
          const uploaded = await storeQuestionImage({
            buffer,
            mimetype: 'image/png',
            originalname: file
          });
          const url = uploaded.url;

          if (!diagramMap[qNum]) diagramMap[qNum] = { stem: [], options: {} };
          if (optLetter) {
            diagramMap[qNum].options[optLetter] = url;
          } else if (type.startsWith('opt')) {
            diagramMap[qNum].stem.push(url);
          } else {
            diagramMap[qNum].stem.push(url);
          }
        } catch (uploadErr) {
          console.warn(`  Failed storing ${file}: ${uploadErr.message}`);
        }
      }
    }
  }

  console.log(`Diagram map ready for ${Object.keys(diagramMap).length} question numbers:`, Object.keys(diagramMap).join(', '), '\n');

  // 2. Remediate MongoDB extracted_candidates
  console.log('── Step 2: Remediating MongoDB Extracted Candidates ──');
  const mongoDb = await getMongoDb();
  const candidatesColl = mongoDb.collection('extracted_candidates');
  const candidates = await candidatesColl.find({}).toArray();
  console.log(`Scanning ${candidates.length} candidates in MongoDB...`);

  let mongoRemediated = 0;
  const canonicalToMeta = {}; // canonical_question_id -> { qNum, answerKey, solutionText, qText, options }

  for (const cand of candidates) {
    let modified = false;
    let qText = cand.question_text || '';
    let options = cand.options ? { ...cand.options } : {};
    let answerKey = cand.correct_answer;
    let solutionText = cand.solution_text || '';
    let suggestedChapter = cand.suggested_chapter;
    const qNum = cand.source_question_number;

    // Check Option D for pollution
    const optDText = options.D || options.d;
    if (optDText && typeof optDText === 'string') {
      const cutoff = findEarliestCutoff(optDText);
      if (cutoff !== -1) {
        const tail = optDText.slice(cutoff);
        let cleanD = cleanOcrMathArtifacts(optDText.slice(0, cutoff).trim());
        const tailImages = tail.match(/!\[.*?\]\(.*?\)/g);
        if (tailImages) {
          for (const imgTag of tailImages) {
            if (!cleanD.includes(imgTag)) cleanD += '\n\n' + imgTag;
          }
        }
        options.D = cleanD;
        const meta = parseTailMetadata(tail);

        if (meta.answerKey) answerKey = meta.answerKey;
        if (meta.solutionText) solutionText = meta.solutionText;
        if (meta.chapter && !suggestedChapter) suggestedChapter = meta.chapter;

        modified = true;
        console.log(`  [Mongo] Candidate Q${qNum}: Cleaned Option D. Answer: ${answerKey}, Solution length: ${solutionText?.length || 0}`);
      }
    }

    // Clean OCR math artifacts
    const cleanedStem = cleanOcrMathArtifacts(qText);
    if (cleanedStem !== qText) {
      qText = cleanedStem;
      modified = true;
    }
    for (const [k, v] of Object.entries(options)) {
      if (typeof v === 'string') {
        const cleanedV = cleanOcrMathArtifacts(v);
        if (cleanedV !== v) {
          options[k] = cleanedV;
          modified = true;
        }
      }
    }

    // Link diagrams
    let hasDiagram = cand.has_diagram || false;
    if (qNum && diagramMap[qNum]) {
      const diags = diagramMap[qNum];
      if (diags.stem && diags.stem.length > 0) {
        for (const sUrl of diags.stem) {
          if (!qText.includes(sUrl)) {
            qText += `\n\n![Figure](${sUrl})\n`;
            modified = true;
            hasDiagram = true;
            console.log(`  [Mongo] Candidate Q${qNum}: Linked stem diagram -> ${sUrl}`);
          }
        }
      }
      if (diags.options) {
        for (const [optK, optUrl] of Object.entries(diags.options)) {
          if (options[optK] && !options[optK].includes(optUrl)) {
            options[optK] = options[optK].trim() + `\n\n![Option ${optK}](${optUrl})`;
            modified = true;
            hasDiagram = true;
            console.log(`  [Mongo] Candidate Q${qNum}: Linked Option ${optK} diagram -> ${optUrl}`);
          }
        }
      }
    }

    if (cand.canonical_question_id) {
      canonicalToMeta[cand.canonical_question_id] = {
        qNum,
        answerKey,
        solutionText,
        suggestedChapter
      };
    }

    if (modified) {
      const updateDoc = {
        question_text: qText,
        options,
        correct_answer: answerKey,
        solution_text: solutionText,
        has_solution: Boolean(solutionText),
        has_diagram: hasDiagram,
        suggested_chapter: suggestedChapter
      };

      // Also update draft objects if present
      if (cand.review_draft) {
        updateDoc.review_draft = {
          ...cand.review_draft,
          question_text: qText,
          options: Object.entries(options).map(([k, text]) => ({ key: k, text })),
          correct_answer: answerKey,
          solution_text: solutionText,
          suggested_chapter: suggestedChapter
        };
      }
      if (cand.suggested_draft) {
        updateDoc.suggested_draft = {
          ...cand.suggested_draft,
          question_text: qText,
          options: Object.entries(options).map(([k, text]) => ({ key: k, text })),
          correct_answer: answerKey,
          solution_text: solutionText,
          suggested_chapter: suggestedChapter
        };
      }

      await candidatesColl.updateOne({ _id: cand._id }, { $set: updateDoc });
      mongoRemediated++;
    }
  }
  console.log(`MongoDB candidates remediated: ${mongoRemediated}\n`);

  // 3. Remediate Supabase questions table
  console.log('── Step 3: Remediating Supabase Questions Table ──');
  const { data: supaQuestions, error: fetchErr } = await supabaseAdmin
    .from('questions')
    .select('id, canonical_question_id, question_text, options, correct_answer, solution_text');

  if (fetchErr) {
    console.error('Error fetching Supabase questions:', fetchErr.message);
  } else {
    console.log(`Scanning ${supaQuestions.length} questions in Supabase...`);
    let supabaseRemediated = 0;

    for (const q of supaQuestions) {
      let modified = false;
      let qText = q.question_text || '';
      let options = q.options;
      let answerKey = q.correct_answer;
      let solutionText = q.solution_text || '';

      const candMeta = q.canonical_question_id ? canonicalToMeta[q.canonical_question_id] : null;
      const qNum = candMeta?.qNum;

      // Handle options whether array [{id: 'A', text: '...'}] or object {A: '...'}
      const isArray = Array.isArray(options);
      let optDText = '';
      if (isArray) {
        optDText = options.find(o => (o.id || o.key) === 'D')?.text || '';
      } else if (options && typeof options === 'object') {
        optDText = options.D || options.d || '';
      }

      // Check Option D pollution
      if (optDText) {
        const cutoff = findEarliestCutoff(optDText);
        if (cutoff !== -1) {
          const tail = optDText.slice(cutoff);
          let cleanD = cleanOcrMathArtifacts(optDText.slice(0, cutoff).trim());
          const tailImages = tail.match(/!\[.*?\]\(.*?\)/g);
          if (tailImages) {
            for (const imgTag of tailImages) {
              if (!cleanD.includes(imgTag)) cleanD += '\n\n' + imgTag;
            }
          }
          const meta = parseTailMetadata(tail);

          if (isArray) {
            options = options.map(o => {
              if ((o.id || o.key) === 'D') return { ...o, text: cleanD };
              return o;
            });
          } else {
            options = { ...options, D: cleanD };
          }

          if (meta.answerKey) answerKey = meta.answerKey;
          else if (candMeta?.answerKey) answerKey = candMeta.answerKey;

          if (meta.solutionText) solutionText = meta.solutionText;
          else if (candMeta?.solutionText) solutionText = candMeta.solutionText;

          modified = true;
          console.log(`  [Supabase] Question ${q.id} (Q${qNum || '?'}): Cleaned Option D. Answer: ${answerKey}, Solution len: ${solutionText?.length || 0}`);
        }
      }

      // Fall back to candidate metadata if Supabase was missing answer or solution
      if (candMeta) {
        if (!solutionText && candMeta.solutionText) {
          solutionText = candMeta.solutionText;
          modified = true;
        }
        if (candMeta.answerKey && answerKey !== candMeta.answerKey) {
          answerKey = candMeta.answerKey;
          modified = true;
        }
      }

      // Clean math OCR in stem
      const cleanStem = cleanOcrMathArtifacts(qText);
      if (cleanStem !== qText) {
        qText = cleanStem;
        modified = true;
      }

      // Clean math OCR in options
      if (isArray) {
        options = options.map(o => ({
          ...o,
          text: cleanOcrMathArtifacts(o.text)
        }));
      } else if (options && typeof options === 'object') {
        const newOpts = {};
        for (const [k, v] of Object.entries(options)) {
          newOpts[k] = cleanOcrMathArtifacts(v);
        }
        options = newOpts;
      }

      // Link diagrams
      if (qNum && diagramMap[qNum]) {
        const diags = diagramMap[qNum];
        if (diags.stem && diags.stem.length > 0) {
          for (const sUrl of diags.stem) {
            if (!qText.includes(sUrl)) {
              qText += `\n\n![Figure](${sUrl})\n`;
              modified = true;
              console.log(`  [Supabase] Question ${q.id} (Q${qNum}): Linked stem diagram -> ${sUrl}`);
            }
          }
        }
        if (diags.options) {
          for (const [optK, optUrl] of Object.entries(diags.options)) {
            if (isArray) {
              options = options.map(o => {
                if ((o.id || o.key) === optK && !o.text.includes(optUrl)) {
                  modified = true;
                  return { ...o, text: o.text.trim() + `\n\n![Option ${optK}](${optUrl})` };
                }
                return o;
              });
            } else if (options && options[optK] && !options[optK].includes(optUrl)) {
              options[optK] = options[optK].trim() + `\n\n![Option ${optK}](${optUrl})`;
              modified = true;
            }
          }
        }
      }

      if (modified) {
        const { error: updateErr } = await supabaseAdmin
          .from('questions')
          .update({
            question_text: qText,
            options,
            correct_answer: answerKey,
            solution_text: solutionText
          })
          .eq('id', q.id);

        if (updateErr) {
          console.error(`  [Supabase] Error updating ${q.id}: ${updateErr.message}`);
        } else {
          supabaseRemediated++;
        }
      }
    }
    console.log(`Supabase questions remediated: ${supabaseRemediated}\n`);
  }

  console.log('====================================================');
  console.log('Remediation Complete!');
  console.log(`  - Diagram files uploaded: ${Object.keys(diagramMap).length}`);
  console.log(`  - MongoDB candidates remediated: ${mongoRemediated}`);
  console.log('====================================================');
  setTimeout(() => process.exit(0), 1000);
}

main().catch(err => {
  console.error('Remediation failed:', err);
  process.exit(1);
});
