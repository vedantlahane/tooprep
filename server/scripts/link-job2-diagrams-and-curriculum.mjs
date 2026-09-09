import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/Admin/Desktop/tooprep/.env' });
dotenv.config({ path: 'c:/Users/Admin/Desktop/tooprep/server/.env' });
import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';

const JOB_ID = 'ing_d96420d11d0a42148ef8040ab30eec7b';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function inferDifficulty(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('jee-advanced') || t.includes('jee advanced') || t.includes('multiple correct') || t.length > 550) {
    return 'hard';
  }
  if (t.includes('dimensions of') || t.includes('which of the following statement') || t.includes('unit of') || t.length < 140) {
    return 'easy';
  }
  return 'medium';
}

function classifyCandidateTopic(candidate, topicsGrouped) {
  const subject = candidate.subject || 'Physics';
  const topicsInSubject = topicsGrouped[subject] || Object.values(topicsGrouped).flat();
  const textLower = `${candidate.question_text || ''} ${candidate.raw_text || ''} ${candidate.solution_text || ''}`.toLowerCase();
  const suggestedChapter = (candidate.suggested_chapter || '').toLowerCase();

  let best = null;
  let bestScore = 0;

  for (const t of topicsInSubject) {
    let score = 0;
    const chapLower = (t.chapter || '').toLowerCase();
    const nameLower = (t.name || '').toLowerCase();

    if (suggestedChapter && (chapLower.includes(suggestedChapter) || suggestedChapter.includes(chapLower))) {
      score += 45;
    }
    if (chapLower && textLower.includes(chapLower)) {
      score += 30;
    }
    if (nameLower && textLower.includes(nameLower)) {
      score += 40;
    }

    // Physics concepts
    if (nameLower.includes('lens') || nameLower.includes('refract') || nameLower.includes('ray optics') || nameLower.includes('optical') || chapLower.includes('optics')) {
      if (/lens|convex|concave|refractive|prism|mirror|focal length|magnification|glass block|slab|optical setup/i.test(textLower)) {
        score += 80;
        if (nameLower.includes('lens') && /lens|convex|concave/i.test(textLower)) score += 60;
        if (nameLower.includes('prism') && /prism|dispersion/i.test(textLower)) score += 60;
        if (nameLower.includes('mirror') && /mirror/i.test(textLower)) score += 60;
        if (nameLower.includes('refraction') && /refraction|snell|tir|critical angle/i.test(textLower)) score += 60;
      }
    }
    if (nameLower.includes('friction')) {
      if (/friction|coefficient of friction|rough surface|stopping motion/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('laws of motion') || nameLower.includes('newton')) {
      if (/pulley|string|tension|masses|free body|equilibrium|block/i.test(textLower)) score += 70;
    }
    if (nameLower.includes('nuclear') || nameLower.includes('radioactivity') || chapLower.includes('nuclei')) {
      if (/radioactive|decay|half life|alpha decay|beta decay|nucleus|binding energy/i.test(textLower)) score += 80;
    }
    if (nameLower.includes('semiconductor') || nameLower.includes('diode') || chapLower.includes('semiconductor')) {
      if (/semiconductor|zener|diode|p-n junction|transistor|logic gate|drift speed|mobility/i.test(textLower)) score += 80;
      if (nameLower.includes('zener') && /zener/i.test(textLower)) score += 70;
    }
    if (nameLower.includes('rotational') || nameLower.includes('rigid') || chapLower.includes('rotational')) {
      if (/moment of inertia|angular momentum|torque|rolling|angular velocity|pivoted rod|hinged rod|l-shaped object/i.test(textLower)) {
        if (!/temperature difference|thermal|steady state|heat flow|conduction/i.test(textLower)) {
          score += 75;
        }
      }
    }
    if (nameLower.includes('thermodynamics') || nameLower.includes('thermal') || chapLower.includes('thermal') || nameLower.includes('calorimetry') || nameLower.includes('heat')) {
      if (/carnot|isothermal|adiabatic|moles of|heat engine|entropy|specific heat|temperature difference|steady state|thermal resistance|conduction|thermal conductivity/i.test(textLower)) score += 95;
    }
    if (nameLower.includes('gravitation')) {
      if (/orbit|escape velocity|gravitational|satellite|planet|kepler/i.test(textLower)) score += 75;
    }
    if (nameLower.includes('current electricity') || chapLower.includes('current')) {
      if (/resistor|resistance|current|circuit|kirchhoff|wheatstone|drift speed|switch s/i.test(textLower)) score += 75;
    }
    if (nameLower.includes('magnetic') || chapLower.includes('magnet')) {
      if (/magnetic field|solenoid|bar magnet|lorentz|biot-savart|current loop/i.test(textLower)) score += 75;
    }
    if (nameLower.includes('capacitance') || chapLower.includes('electrostatic')) {
      if (/capacitor|parallel plate|dielectric|electric field|potential|point charge|three charges/i.test(textLower)) score += 75;
    }

    // Chemistry concepts
    if (nameLower.includes('amine') || chapLower.includes('amine')) {
      if (/amine|aniline|basic strength|pka of amine/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('coordination') || chapLower.includes('coordination')) {
      if (/complex|ligand|cft|spin only magnetic|hybridisation|isomerism|coordination/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('thermodynamics') && subject === 'Chemistry') {
      if (/enthalpy|entropy|gibbs|reversible isothermal/i.test(textLower)) score += 75;
    }
    if (nameLower.includes('chemical bonding') || chapLower.includes('bonding')) {
      if (/molecular orbital|bond order|paramagnetic|diamagnetic|hybridization/i.test(textLower)) score += 80;
    }
    if (nameLower.includes('electrochemistry')) {
      if (/lead-acid|cell|anode|cathode|electrode|emf|nernst/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('kinetics')) {
      if (/rate constant|order of reaction|activation energy|half life|arrhenius/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('surface chemistry')) {
      if (/adsorption|freundlich|colloid|coagulation|micelle/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('solutions') || chapLower.includes('solution')) {
      if (/raoult|osmotic|boiling point|freezing point|molarity|van't hoff|h2so4/i.test(textLower)) score += 75;
    }
    if (nameLower.includes('periodic') || chapLower.includes('classification')) {
      if (/ionization energy|electron gain|atomic radii|electronegativity|properties that decrease/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('metallurgy') || chapLower.includes('isolation')) {
      if (/ore|iron and copper|calcination|roasting|froth/i.test(textLower)) score += 85;
    }

    // Mathematics concepts
    if (nameLower.includes('limit') || chapLower.includes('limit')) {
      if (/\\lim_|lim_y|l'hopital|limit/i.test(textLower)) score += 90;
    }
    if (nameLower.includes('parabola') || chapLower.includes('conic')) {
      if (/parabola|focus|directrix|latus rectum/i.test(textLower)) score += 90;
    }
    if (nameLower.includes('quadratic')) {
      if (/roots of the|alpha and beta be two roots|\alpha and \beta/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('mathematical reasoning')) {
      if (/boolean|tautology|fallacy|\oplus|\wedge|\vee/i.test(textLower)) score += 95;
    }
    if (nameLower.includes('vector') || chapLower.includes('vector')) {
      if (/\\vec\{a\}|dot product|cross product|coplanar/i.test(textLower)) score += 90;
    }
    if (nameLower.includes('straight line') || chapLower.includes('line')) {
      if (/passing through|px \+ qy \+ r|slope|intercept/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('circle') || chapLower.includes('circle')) {
      if (/common tangent|three circles of radii|circle x\^2/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('matrix') || nameLower.includes('determinant')) {
      if (/matrix|determinant|bmatrix|system of linear/i.test(textLower)) score += 90;
    }
    if (nameLower.includes('integral') || chapLower.includes('integral')) {
      if (/\\int|definite integral|area \(in sq\. units\)|bounded by/i.test(textLower)) score += 85;
    }
    if (nameLower.includes('differential equation')) {
      if (/differential equation|dy\/dx|solution of the differ/i.test(textLower)) score += 90;
    }

    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  return { topic: best, score: bestScore };
}

async function main() {
  console.log(`Starting comprehensive linking for Job 2 (${JOB_ID})...`);

  // 1. Fetch Supabase syllabus topics with relational join
  const { data: dbTopics, error: tErr } = await supabase
    .from('topics')
    .select('id, name, chapter:chapters(id, name, subject:subjects(name))');

  if (tErr) throw tErr;

  const flatTopics = dbTopics.map(t => ({
    id: t.id,
    name: t.name,
    chapter: t.chapter?.name,
    subject: t.chapter?.subject?.name
  }));

  const topicsGrouped = {
    Physics: flatTopics.filter(t => t.subject === 'Physics'),
    Chemistry: flatTopics.filter(t => t.subject === 'Chemistry'),
    Mathematics: flatTopics.filter(t => t.subject === 'Mathematics' || t.subject === 'Maths')
  };

  console.log(`Loaded ${flatTopics.length} syllabus topics from Supabase across Physics (${topicsGrouped.Physics.length}), Chemistry (${topicsGrouped.Chemistry.length}), Mathematics (${topicsGrouped.Mathematics.length}).`);

  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/tooprep');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'tooprep');

  // 2. Fetch parsed document to get diagram_map
  const parsedDoc = await db.collection('parsed_documents').findOne({ job_id: JOB_ID });
  const diagramMap = parsedDoc?.diagram_map || {};
  console.log(`Diagram map contains entries for ${Object.keys(diagramMap).length} questions.`);

  // 3. Fetch all candidates and sort by page and source question number
  const candidates = await db.collection('extracted_candidates').find({ job_id: JOB_ID }).toArray();
  candidates.sort((a, b) => {
    const pA = a.source_pages?.[0] || 0;
    const pB = b.source_pages?.[0] || 0;
    if (pA !== pB) return pA - pB;
    return (a.source_question_number || 0) - (b.source_question_number || 0);
  });

  console.log(`Found ${candidates.length} candidates in Job 2.`);

  let diagramsLinkedCount = 0;
  let curriculumMappedCount = 0;

  for (let idx = 0; idx < candidates.length; idx++) {
    const c = candidates[idx];
    const globalQNum = idx + 1; // 1 to 90

    // Assign Subject correctly by section: 1-30 Physics, 31-60 Chemistry, 61-90 Mathematics
    let subject = 'Physics';
    if (globalQNum >= 31 && globalQNum <= 60) subject = 'Chemistry';
    else if (globalQNum >= 61) subject = 'Mathematics';

    const updates = {
      subject,
      difficulty: inferDifficulty(c.question_text || c.raw_text),
      updated_at: new Date().toISOString()
    };

    // Auto-map curriculum topic
    const classification = classifyCandidateTopic({ ...c, subject }, topicsGrouped);
    if (classification.topic) {
      updates.suggested_topic_id = classification.topic.id;
      updates.suggested_topic = classification.topic.name;
      updates.suggested_chapter = classification.topic.chapter;
      curriculumMappedCount++;
    }

    // Link Diagrams from diagramMap
    const diag = diagramMap[String(globalQNum)];
    if (diag) {
      let qText = c.question_text || '';

      // Stem Diagram
      if (diag.stem) {
        updates.has_diagram = true;
        updates.diagram_url = diag.stem;
        qText = qText.replace(/\*\[Diagram:[^\]]*\]\*/gi, '').trim();
        if (!qText.includes(diag.stem)) {
          qText = `${qText}\n\n![Figure](${diag.stem})`;
        }
        updates.question_text = qText;
        diagramsLinkedCount++;
      }

      // Option Diagrams
      if (diag.options && typeof diag.options === 'object' && Object.keys(diag.options).length > 0) {
        updates.has_diagram = true;
        const opts = c.options || {};
        for (const [optKey, optUrl] of Object.entries(diag.options)) {
          if (!optUrl) continue;
          const currentText = (opts[optKey] || '').trim();
          if (currentText && !currentText.includes(optUrl)) {
            opts[optKey] = `${currentText}\n\n![Option ${optKey}](${optUrl})`;
          } else if (!currentText) {
            opts[optKey] = `![Option ${optKey}](${optUrl})`;
          }
        }
        updates.options = opts;
        if (Object.keys(opts).length >= 2) {
          updates.has_options = true;
        }
        diagramsLinkedCount++;
      }
    }

    // Keep solution diagram flag if present (like Q5)
    const solText = c.solution_text || '';
    if (solText.includes('```mermaid') || /\b(?:diagram|circuit|schematic):/i.test(solText)) {
      updates.has_solution_diagram = true;
      if (!diag?.stem) {
        updates.has_diagram = false; // Prevent false amber badge
      }
    }

    await db.collection('extracted_candidates').updateOne(
      { _id: c._id },
      { $set: updates }
    );
  }

  console.log(`\n=== REMEDIATION SUMMARY FOR JOB 2 ===`);
  console.log(`Total Candidates processed: ${candidates.length}`);
  console.log(`Curriculum topics mapped: ${curriculumMappedCount}/${candidates.length}`);
  console.log(`Diagrams attached & linked: ${diagramsLinkedCount}`);

  // Sample check
  const checkQ3 = await db.collection('extracted_candidates').findOne({ job_id: JOB_ID, source_pages: [2] });
  console.log('\nSample Physics Q (Page 2):', {
    qNum: checkQ3?.source_question_number,
    subject: checkQ3?.subject,
    chapter: checkQ3?.suggested_chapter,
    topic: checkQ3?.suggested_topic,
    difficulty: checkQ3?.difficulty,
    has_diagram: checkQ3?.has_diagram
  });

  const checkQ34 = await db.collection('extracted_candidates').findOne({ job_id: JOB_ID, source_pages: [19] });
  console.log('\nSample Chemistry Q (Page 19):', {
    qNum: checkQ34?.source_question_number,
    subject: checkQ34?.subject,
    chapter: checkQ34?.suggested_chapter,
    topic: checkQ34?.suggested_topic,
    difficulty: checkQ34?.difficulty,
    has_diagram: checkQ34?.has_diagram
  });

  await client.close();
  console.log('\nRemediation finished successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
