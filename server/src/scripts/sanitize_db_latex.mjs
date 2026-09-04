import { supabaseAdmin } from '../lib/supabase.js';
import { getMongoDb } from '../lib/mongodb.js';

export function sanitizeLatexInText(raw) {
  if (!raw) return raw;
  let s = String(raw);

  // 1. Fix glued degree Celsius / Fahrenheit / units
  // ^\circC or \circC -> ^\circ \text{C} or ^\circ \mathrm{C}
  s = s.replace(/\\circ([A-Za-z])/g, '\\circ \\text{$1}');
  s = s.replace(/°([A-Za-z])/g, '^\\circ \\text{$1}');
  s = s.replace(/\^o([A-Za-z])/g, '^\\circ \\text{$1}');

  // 2. Fix HTML tags inside or preceding LaTeX commands
  s = s.replace(/\\?<u>(.*?)<\/u>/gi, '\\underline{$1}');
  s = s.replace(/\\?<b>(.*?)<\/b>/gi, '\\mathbf{$1}');
  s = s.replace(/\\?<strong>(.*?)<\/strong>/gi, '\\mathbf{$1}');
  s = s.replace(/\\?<i>(.*?)<\/i>/gi, '\\mathit{$1}');
  s = s.replace(/\\?<em>(.*?)<\/em>/gi, '\\mathit{$1}');

  // 3. Fix glued micro units
  s = s.replace(/\\mu([A-Z]|m|s|g|mol)\b/g, '\\mu\\text{$1}');

  return s;
}

async function run() {
  const { data: questions } = await supabaseAdmin.from('questions').select('id, question_text, options, solution_text');
  
  let changedCount = 0;
  for (const q of (questions || [])) {
    let changed = false;
    const newStem = sanitizeLatexInText(q.question_text);
    if (newStem !== q.question_text) changed = true;

    const newOptions = (q.options || []).map(o => {
      const newText = sanitizeLatexInText(o.text);
      if (newText !== o.text) changed = true;
      return { ...o, text: newText };
    });

    const newSolution = sanitizeLatexInText(q.solution_text);
    if (newSolution !== q.solution_text) changed = true;

    if (changed) {
      changedCount++;
      console.log(`Updating Supabase QID: ${q.id}...`);
      const { error: updateErr } = await supabaseAdmin
        .from('questions')
        .update({
          question_text: newStem,
          options: newOptions,
          solution_text: newSolution
        })
        .eq('id', q.id);

      if (updateErr) {
        console.error(`Error updating QID ${q.id}:`, updateErr.message);
      } else {
        console.log(`✓ Updated QID ${q.id}`);
      }
    }
  }

  console.log(`\nTotal questions updated in Supabase: ${changedCount}`);

  const db = await getMongoDb();
  const candidates = await db.collection('extracted_candidates').find({}).toArray();
  let candChanged = 0;
  for (const c of candidates) {
    let changed = false;
    const newStem = sanitizeLatexInText(c.content?.question_text);
    if (newStem !== c.content?.question_text) changed = true;

    const newOptions = (c.content?.options || []).map(o => {
      const newText = sanitizeLatexInText(o.text);
      if (newText !== o.text) changed = true;
      return { ...o, text: newText };
    });

    const newSolution = sanitizeLatexInText(c.content?.solution_text);
    if (newSolution !== c.content?.solution_text) changed = true;

    if (changed) {
      candChanged++;
      await db.collection('extracted_candidates').updateOne(
        { _id: c._id },
        {
          $set: {
            'content.question_text': newStem,
            'content.options': newOptions,
            'content.solution_text': newSolution
          }
        }
      );
    }
  }
  console.log(`Total candidates updated in MongoDB: ${candChanged}`);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
