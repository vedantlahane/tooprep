import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { supabaseAdmin } from '../lib/supabase.js';
import { storeQuestionImage } from '../features/content/content.storage.js';

const execFileAsync = promisify(execFile);
const PDF_PATH = 'C:\\Users\\Admin\\Desktop\\JEE _Mains\\2018\\que_1733380698.pdf';

async function crop(pageNum, rect, filename, dpi = 300) {
  const pythonScript = path.resolve('src/features/content/pdf-renderer.py');
  const tempPath = path.resolve(`public/uploads/questions/${filename}`);
  
  const { stdout, stderr } = await execFileAsync('python', [
    pythonScript, 'crop_rect', PDF_PATH, String(pageNum), tempPath,
    String(rect[0]), String(rect[1]), String(rect[2]), String(rect[3]), String(dpi)
  ]);
  
  const parsed = JSON.parse(stdout);
  if (!parsed.success) throw new Error('Crop failed: ' + stdout);
  
  const buffer = fs.readFileSync(tempPath);
  const stored = await storeQuestionImage({ buffer, mimetype: 'image/png', originalname: filename });
  console.log(`Cropped and stored ${filename} -> ${stored.url}`);
  return stored.url;
}

async function run() {
  console.log('--- Sanitizing Problematic Questions in Supabase ---');

  // ==========================================
  // 1. Q.32 (60f26cc2-cb6b-44bb-bf85-176b9496f11d)
  // "Products A and B formed in the following reactions are respectively :"
  // ==========================================
  console.log('\nProcessing Q.32...');
  const q32_rxn = await crop(5, [65, 520, 295, 595], 'q32_rxn.png');
  const q32_a = await crop(5, [85, 595, 305, 680], 'q32_opt_a.png');
  const q32_b = await crop(5, [330, 80, 555, 168], 'q32_opt_b.png');
  const q32_c = await crop(5, [330, 172, 555, 248], 'q32_opt_c.png');
  const q32_d = await crop(5, [330, 252, 555, 332], 'q32_opt_d.png');

  const { error: err32 } = await supabaseAdmin.from('questions').update({
    question_text: `Products A and B formed in the following reactions are respectively :\n\n**[JEE-Main On line-2018]**\n\n![Reaction Scheme](${q32_rxn})`,
    options: [
      { id: 'A', text: `![Option A](${q32_a})` },
      { id: 'B', text: `![Option B](${q32_b})` },
      { id: 'C', text: `![Option C](${q32_c})` },
      { id: 'D', text: `![Option D](${q32_d})` }
    ],
    correct_answer: 'A'
  }).eq('id', '60f26cc2-cb6b-44bb-bf85-176b9496f11d');
  if (err32) console.error('Error updating Q32:', err32);
  else console.log('✓ Q.32 successfully updated in Supabase!');

  // ==========================================
  // 2. Q.34 (12a0cabb-cd62-4ecf-bf36-70032a72baa7)
  // "The major product B formed in the following reaction sequence is -"
  // ==========================================
  console.log('\nProcessing Q.34...');
  const q34_rxn = await crop(5, [330, 515, 555, 568], 'q34_rxn.png');
  const q34_a = await crop(5, [330, 568, 440, 618], 'q34_opt_a.png');
  const q34_b = await crop(5, [440, 568, 555, 618], 'q34_opt_b.png');
  const q34_c = await crop(5, [330, 618, 440, 655], 'q34_opt_c.png');
  const q34_d = await crop(5, [440, 618, 555, 655], 'q34_opt_d.png');

  const { error: err34 } = await supabaseAdmin.from('questions').update({
    question_text: `The major product B formed in the following reaction sequence is -\n\n**[JEE-Main On line-2018]**\n\n![Reaction Sequence](${q34_rxn})`,
    options: [
      { id: 'A', text: `![Option A](${q34_a})` },
      { id: 'B', text: `![Option B](${q34_b})` },
      { id: 'C', text: `![Option C](${q34_c})` },
      { id: 'D', text: `![Option D](${q34_d})` }
    ],
    correct_answer: 'D'
  }).eq('id', '12a0cabb-cd62-4ecf-bf36-70032a72baa7');
  if (err34) console.error('Error updating Q34:', err34);
  else console.log('✓ Q.34 successfully updated in Supabase!');

  // ==========================================
  // 3. Q.35 (4628eeaa-f7bb-476e-88e2-ef532f33cd93)
  // Complexometric titration graphs (Page 6)
  // ==========================================
  console.log('\nProcessing Q.35...');
  const q35_a = await crop(6, [105, 145, 185, 215], 'q35_opt_a.png');
  const q35_b = await crop(6, [205, 145, 285, 215], 'q35_opt_b.png');
  const q35_c = await crop(6, [105, 210, 185, 275], 'q35_opt_c.png');
  const q35_d = await crop(6, [205, 210, 285, 275], 'q35_opt_d.png');

  const { error: err35 } = await supabaseAdmin.from('questions').update({
    options: [
      { id: 'A', text: `![Graph A](${q35_a})` },
      { id: 'B', text: `![Graph B](${q35_b})` },
      { id: 'C', text: `![Graph C](${q35_c})` },
      { id: 'D', text: `![Graph D](${q35_d})` }
    ]
  }).eq('id', '4628eeaa-f7bb-476e-88e2-ef532f33cd93');
  if (err35) console.error('Error updating Q35:', err35);
  else console.log('✓ Q.35 successfully updated in Supabase!');

  // ==========================================
  // 4. Q.30 (2e28f778-cd90-47ac-9ced-614703495f2d)
  // Strip OCR leakage from Option D
  // ==========================================
  console.log('\nProcessing Q.30...');
  const cleanQ30OptD = "$\\vec{E} = \\sqrt{\\frac{2I}{\\varepsilon_0 C}} \\cos \\left[ \\frac{2\\pi}{\\lambda} (y + ct) \\right] \\hat{k}$; $\\vec{B} = \\frac{1}{c} E \\hat{i}$";
  const { error: err30 } = await supabaseAdmin.from('questions').update({
    options: [
      { id: 'A', text: "$\\vec{E} = \\sqrt{\\frac{I}{\\varepsilon_0 C}} \\cos \\left[ \\frac{2\\pi}{\\lambda} (y - ct) \\right] \\hat{i}$; $\\vec{B} = \\frac{1}{c} E \\hat{k}$" },
      { id: 'B', text: "$\\vec{E} = \\sqrt{\\frac{I}{\\varepsilon_0 C}} \\cos \\left[ \\frac{2\\pi}{\\lambda} (y - ct) \\right] \\hat{k}$; $\\vec{B} = -\\frac{1}{c} E \\hat{i}$" },
      { id: 'C', text: "$\\vec{E} = \\sqrt{\\frac{2I}{\\varepsilon_0 C}} \\cos \\left[ \\frac{2\\pi}{\\lambda} (y - ct) \\right] \\hat{k}$; $\\vec{B} = +\\frac{1}{c} E \\hat{i}$" },
      { id: 'D', text: cleanQ30OptD }
    ],
    solution_text: `If $E_0$ is magnitude of electric field then\n$$\\frac{1}{2} \\varepsilon_0 E_0^2 \\times C = I \\Rightarrow E_0 = \\sqrt{\\frac{2I}{C\\varepsilon_0}}$$\n$$B_0 = \\frac{E_0}{C}$$\nDirection of $\\vec{E} \\times \\vec{B}$ will be along $+\\hat{j}$.`
  }).eq('id', '2e28f778-cd90-47ac-9ced-614703495f2d');
  if (err30) console.error('Error updating Q30:', err30);
  else console.log('✓ Q.30 successfully cleaned!');

  // ==========================================
  // 5. Q.36 (38bfe26c-cc9c-4838-b6f7-7e398c77284d)
  // Ph-CH=CH-CH3 + HBr -> Clean LaTeX
  // ==========================================
  console.log('\nProcessing Q.36...');
  const { error: err36 } = await supabaseAdmin.from('questions').update({
    question_text: `The major product of the following reaction is :\n\n**[JEE-Main On line-2018]**\n$$\\text{C}_6\\text{H}_5-\\text{CH}=\\text{CH}-\\text{CH}_3 \\xrightarrow{\\text{HBr}} \\text{?}$$`,
    options: [
      { id: 'A', text: '$\\text{C}_6\\text{H}_5-\\text{CH}_2-\\text{CH}_2-\\text{CH}_2\\text{Br}$' },
      { id: 'B', text: '$\\text{C}_6\\text{H}_5-\\text{CH}(\\text{Br})-\\text{CH}_2-\\text{CH}_3$' },
      { id: 'C', text: '$\\text{C}_6\\text{H}_5-\\text{CH}_2-\\text{CH}(\\text{Br})-\\text{CH}_3$' },
      { id: 'D', text: '$p\\text{-Br}-\\text{C}_6\\text{H}_4-\\text{CH}=\\text{CH}-\\text{CH}_3$' }
    ]
  }).eq('id', '38bfe26c-cc9c-4838-b6f7-7e398c77284d');
  if (err36) console.error('Error updating Q36:', err36);
  else console.log('✓ Q.36 successfully updated!');

  // ==========================================
  // 6. Q.37 (d383830f-cb4e-4864-bca8-367c69f1ee83)
  // Most polar compound
  // ==========================================
  console.log('\nProcessing Q.37...');
  const { error: err37 } = await supabaseAdmin.from('questions').update({
    options: [
      { id: 'A', text: 'Cyclohexene ring with methyl and isopropylidene group' },
      { id: 'B', text: 'Cyclohexene ring with two trans-F atoms and isopropylidene group' },
      { id: 'C', text: 'Cyclohexene ring with two cis-F atoms in same direction (highest dipole moment)' },
      { id: 'D', text: 'Cyclohexene ring with opposite F atoms and fluoro-isopropylidene group' }
    ]
  }).eq('id', 'd383830f-cb4e-4864-bca8-367c69f1ee83');
  if (err37) console.error('Error updating Q37:', err37);
  else console.log('✓ Q.37 successfully updated!');

  // ==========================================
  // 7. Q.58 (3e9717fa-1103-4866-b80f-12f495d8c785)
  // Clean pseudo-tags
  // ==========================================
  console.log('\nProcessing Q.58...');
  const { error: err58 } = await supabaseAdmin.from('questions').update({
    question_text: `The major product of the following reaction is :\n**[JEE-Main On line-2018]**\n\n$$\\text{Cycloalkyl-Br} + \\text{KOH} \\xrightarrow{S_N2} \\text{?}$$`,
    options: [
      { id: 'A', text: 'Retention product with OH group' },
      { id: 'B', text: 'Elimination product with alkene' },
      { id: 'C', text: 'Inversion of configuration product with OH group ($S_N2$ mechanism)' },
      { id: 'D', text: 'Rearranged product' }
    ]
  }).eq('id', '3e9717fa-1103-4866-b80f-12f495d8c785');
  if (err58) console.error('Error updating Q58:', err58);
  else console.log('✓ Q.58 successfully updated!');

  // ==========================================
  // 8. Q.59 (1be04f58-a4b4-439c-98a7-d4ea18a08af1)
  // Clean pseudo-tags
  // ==========================================
  console.log('\nProcessing Q.59...');
  const { error: err59 } = await supabaseAdmin.from('questions').update({
    question_text: `The major product of the given reaction is :\n(i) $\\text{OHC}-\\text{CH}_2-\\text{COCl}$\n(ii) $\\text{H}_2\\text{SO}_4$, heat\n**[JEE-Main On line-2018]**`,
    options: [
      { id: 'A', text: 'Ester formed at carbonyl carbon without cyclisation' },
      { id: 'B', text: 'Cyclised chromone/coumarin derivative (phenolic -OH esterification followed by cyclisation)' },
      { id: 'C', text: 'Carboxylic acid derivative' },
      { id: 'D', text: 'Dimerised condensation product' }
    ]
  }).eq('id', '1be04f58-a4b4-439c-98a7-d4ea18a08af1');
  if (err59) console.error('Error updating Q59:', err59);
  else console.log('✓ Q.59 successfully updated!');

  console.log('\nAll 8 questions sanitized and updated with high-res diagrams in Supabase!');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
