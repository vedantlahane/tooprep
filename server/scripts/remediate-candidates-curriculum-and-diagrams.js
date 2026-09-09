import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/Admin/Desktop/tooprep/.env' });
dotenv.config({ path: 'c:/Users/Admin/Desktop/tooprep/server/.env' });
import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tooprep';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'tooprep';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

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
    if (chapLower && textLower.includes(chapLower)) score += 30;
    if (nameLower && textLower.includes(nameLower)) score += 40;

    // Physics
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
      if (/radioactive|half-life|half life|activity|decay|curie|mci|becquerel/i.test(textLower)) score += 70;
    }
    if (nameLower.includes('atom') || nameLower.includes('bohr') || nameLower.includes('photoelectric')) {
      if (/photoelectric|work function|hydrogen spectrum|de broglie|bohr radius/i.test(textLower)) score += 65;
    }
    if (nameLower.includes('semiconductor') || nameLower.includes('diode') || nameLower.includes('electronic devices')) {
      if (/zener|diode|p-n junction|breakdown|forward bias|reverse bias|logic gate|nand|nor/i.test(textLower)) score += 70;
    }
    if (nameLower.includes('current electricity') || nameLower.includes('electrical')) {
      if (/resistor|resistance|ohm|kirchhoff|wheatstone|potentiometer|meter bridge|emf/i.test(textLower)) score += 60;
    }
    if (nameLower.includes('electrostat') || nameLower.includes('capacit')) {
      if (/capacitor|capacitance|dielectric|electric field|potential|flux|gauss|coulomb/i.test(textLower)) score += 60;
    }
    if (nameLower.includes('magnetic') || nameLower.includes('magnetism')) {
      if (/magnetic field|biot-savart|solenoid|lorentz|cyclotron/i.test(textLower)) score += 60;
    }
    if (nameLower.includes('electromagnetic induction') || nameLower.includes('alternating current')) {
      if (/faraday|lenz|induced emf|self induction|ac circuit|impedance|lcr/i.test(textLower)) score += 65;
    }
    if (nameLower.includes('rotational') || nameLower.includes('rolling')) {
      if (/moment of inertia|torque|angular momentum|rolling|angular velocity|radius of gyration/i.test(textLower)) score += 60;
    }
    if (nameLower.includes('work') || nameLower.includes('energy') || nameLower.includes('power')) {
      if (/kinetic energy|potential energy|conservative force|work done|spring constant/i.test(textLower)) score += 55;
    }
    if (nameLower.includes('kinematics') || nameLower.includes('motion in a straight line')) {
      if (/velocity|acceleration|projectile|speed|distance|displacement/i.test(textLower)) score += 55;
    }
    if (nameLower.includes('gravitat')) {
      if (/gravitational|escape velocity|orbital velocity|satellite|kepler/i.test(textLower)) score += 65;
    }
    if (nameLower.includes('thermodynamic')) {
      if (/carnot|isothermal|adiabatic|isobaric|specific heat|entropy|ideal gas/i.test(textLower)) score += 60;
    }

    // Chemistry
    if (nameLower.includes('organic') || nameLower.includes('hydrocarbon') || nameLower.includes('acid') || chapLower.includes('organic')) {
      if (/acidic strength|ewg|inductive effect|resonance|carbocation|carbanion|hyperconjugation/i.test(textLower)) score += 65;
      if (/haloalkane|alcohol|phenol|ether|aldehyde|ketone|carboxylic|amine/i.test(textLower)) score += 60;
    }
    if (nameLower.includes('coordination') || nameLower.includes('d- and f-') || chapLower.includes('inorganic')) {
      if (/ligand|complex|crystal field|cft|isomers|oxidation state/i.test(textLower)) score += 65;
    }
    if (nameLower.includes('chemical bonding')) {
      if (/hybridization|vsepr|dipole moment|bond order|molecular orbital/i.test(textLower)) score += 65;
    }
    if (nameLower.includes('equilibrium')) {
      if (/equilibrium constant|le chatelier|ph|solubility product|ksp|buffer/i.test(textLower)) score += 65;
    }
    if (nameLower.includes('electrochemistry')) {
      if (/nernst|electrode potential|galvanic|faraday's laws/i.test(textLower)) score += 65;
    }

    // Mathematics
    if (nameLower.includes('derivative') || nameLower.includes('maxima') || nameLower.includes('application of derivatives')) {
      if (/maximum volume|minimum|dv\/dh|dy\/dx|slant height|tangent|normal/i.test(textLower)) score += 70;
    }
    if (nameLower.includes('integral') || nameLower.includes('area under')) {
      if (/integral|integrating|definite integral|area bounded/i.test(textLower)) score += 65;
    }
    if (nameLower.includes('differential equation')) {
      if (/differential equation|dy\/dx|integrating factor/i.test(textLower)) score += 70;
    }
    if (nameLower.includes('matrix') || nameLower.includes('determinant')) {
      if (/matrix|determinant|eigen|trace|adjoint|cramer/i.test(textLower)) score += 70;
    }
    if (nameLower.includes('vector') || nameLower.includes('three dimensional') || nameLower.includes('3d')) {
      if (/dot product|cross product|coplanar|direction cosines/i.test(textLower)) score += 70;
    }

    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  if (best && bestScore >= 30) {
    return best;
  }

  // Fallback by chapter
  if (suggestedChapter) {
    const fallback = topicsInSubject.find(t =>
      (t.chapter || '').toLowerCase().includes(suggestedChapter) ||
      suggestedChapter.includes((t.chapter || '').toLowerCase())
    );
    if (fallback) return fallback;
  }

  return null;
}

async function main() {
  console.log('Connecting to Supabase and MongoDB...');
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

  const topicsGrouped = {};
  for (const t of flatTopics) {
    const s = t.subject || 'Other';
    if (!topicsGrouped[s]) topicsGrouped[s] = [];
    topicsGrouped[s].push(t);
  }

  console.log(`Loaded ${flatTopics.length} syllabus topics across subjects.`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);

  const candidatesCol = db.collection('extracted_candidates');
  const allCandidates = await candidatesCol.find({}).toArray();
  console.log(`Total candidates in MongoDB: ${allCandidates.length}`);

  let updatedCount = 0;
  let fixedQ5Count = 0;

  for (const c of allCandidates) {
    const updates = {};

    // 1. Difficulty
    if (!c.difficulty) {
      updates.difficulty = inferDifficulty(c.question_text || c.raw_text);
    }

    // 2. Topic mapping (always re-classify if suggested_topic is generic or for Q.5)
    if (!c.suggested_topic_id || c.source_question_number === 5 || c.suggested_topic === 'Torque and Equilibrium') {
      const match = classifyCandidateTopic(c, topicsGrouped);
      if (match) {
        updates.suggested_topic_id = match.id;
        updates.suggested_topic = match.name;
        updates.suggested_chapter = match.chapter;
      }
    }

    // 3. Fix false Diagram Missing flag on questions without visual diagrams in stem
    const stemAndOpts = `${c.question_text || ''} ${Object.values(c.options || {}).join(' ')}`;
    const stemHasImage = stemAndOpts.includes('![') || stemAndOpts.includes('<img');
    const stemExplicitRef = /\b(?:shown in (?:the )?(?:figure|diagram|circuit)|given (?:in the )?(?:figure|circuit|diagram|graph)|as per (?:the )?(?:figure|diagram)|in the given circuit|circuit shown|graph below|plot below|reactions are respectively|titration plot)\b/i.test(stemAndOpts);
    const solHasMermaid = (c.solution_text || '').includes('```mermaid') || /\bgraph\s+(?:LR|TD|TB|RL)\b/i.test(c.solution_text || '');

    if (solHasMermaid) {
      updates.has_solution_diagram = true;
    }

    if (!stemHasImage && !stemExplicitRef && c.has_diagram) {
      // Question stem did not actually have a diagram
      updates.has_diagram = false;
      updates.diagram_referenced = false;
      fixedQ5Count++;
    }

    if (Object.keys(updates).length > 0) {
      await candidatesCol.updateOne({ _id: c._id }, { $set: updates });
      updatedCount++;
    }
  }

  console.log(`Successfully remediated ${updatedCount} candidates!`);
  console.log(`Fixed false diagram badges on ${fixedQ5Count} candidates.`);

  // Verify Q.3 and Q.5 in Job 1 and Job 2
  const q3Job1 = await candidatesCol.findOne({ job_id: 'ing_f18431f26c7e489d94ab9889182e739b', source_question_number: 3 });
  console.log('\n--- Q.3 (Job 1 - Friction) Status ---');
  console.log('Topic:', q3Job1?.suggested_topic, 'ID:', q3Job1?.suggested_topic_id);
  console.log('Difficulty:', q3Job1?.difficulty);
  console.log('Has Diagram:', q3Job1?.has_diagram);

  const q5Job2 = await candidatesCol.findOne({ job_id: 'ing_d96420d11d0a42148ef8040ab30eec7b', source_question_number: 5 });
  console.log('\n--- Q.5 (Job 2 - Convex Lens) Status ---');
  console.log('Topic:', q5Job2?.suggested_topic, 'ID:', q5Job2?.suggested_topic_id);
  console.log('Difficulty:', q5Job2?.difficulty);
  console.log('Has Diagram:', q5Job2?.has_diagram);
  console.log('Has Solution Diagram:', q5Job2?.has_solution_diagram);

  await client.close();
}

main().catch(err => {
  console.error('Remediation error:', err);
  process.exit(1);
});
