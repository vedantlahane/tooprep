import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { supabaseAdmin } from '../../lib/supabase.js';
import { logger } from '../../platform/logger.js';

function deterministicUuid(namespace, value) {
  const hash = createHash('md5').update(`${namespace}:${value}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export const JEE_CURRICULUM = {
  Physics: {
    'Units, Dimensions and Measurements': [
      'Units, Dimensions and Dimensional Analysis',
      'Errors in Measurement'
    ],
    'Kinematics': [
      'Motion in a Straight Line',
      'Motion in a Plane',
      'Relative Velocity',
      'Projectile Motion'
    ],
    'Laws of Motion': [
      "Newton's Laws of Motion",
      'Friction',
      'Circular Motion Dynamics'
    ],
    'Work, Energy and Power': [
      'Work-Energy Theorem',
      'Conservation of Energy',
      'Collisions and Power'
    ],
    'Rotational Motion': [
      'Moment of Inertia',
      'Torque and Equilibrium',
      'Angular Momentum',
      'Rolling Motion'
    ],
    'Gravitation': [
      'Gravitational Force and Potential',
      "Orbital Mechanics and Kepler's Laws",
      'Escape Velocity and Satellites'
    ],
    'Mechanical Properties of Solids': [
      "Elastic Moduli and Hooke's Law",
      'Stress-Strain Relationships'
    ],
    'Mechanical Properties of Fluids': [
      'Fluid Statics and Pressure',
      "Pascal's and Archimedes' Principle",
      "Fluid Dynamics and Bernoulli's Theorem",
      'Viscosity and Surface Tension'
    ],
    'Thermal Properties of Matter': [
      'Heat, Temperature and Thermal Expansion',
      'Calorimetry and Heat Transfer',
      "Newton's Law of Cooling"
    ],
    'Thermodynamics': [
      'First Law of Thermodynamics',
      'Thermodynamic Processes and Work Done',
      'Second Law, Heat Engines and Carnot Cycle'
    ],
    'Kinetic Theory of Gases': [
      'Ideal Gas Laws and Equation of State',
      'Kinetic Theory and RMS Speed',
      'Degrees of Freedom and Specific Heat'
    ],
    'Oscillations': [
      'Simple Harmonic Motion',
      'Energy in SHM',
      'Damped and Forced Oscillations'
    ],
    'Waves': [
      'Wave Motion and Wave Equation',
      'Standing Waves and Organ Pipes',
      'Beats and Doppler Effect'
    ],
    'Electrostatics': [
      "Coulomb's Law and Electric Field",
      "Gauss's Law and Flux",
      'Electric Potential and Potential Energy',
      'Capacitance and Dielectrics'
    ],
    'Current Electricity': [
      "Ohm's Law and Resistance",
      "Kirchhoff's Laws and Resistor Networks",
      'Electrical Measuring Instruments (Meter Bridge, Potentiometer)',
      'Electric Power and Heating Effects'
    ],
    'Magnetic Effects of Current': [
      'Biot-Savart Law and Applications',
      "Ampere's Circuital Law",
      'Motion of Charged Particles in Magnetic Field',
      'Force on Current-Carrying Conductor'
    ],
    'Magnetism and Matter': [
      "Magnetic Dipole and Earth's Magnetism",
      'Magnetic Properties of Materials (Dia, Para, Ferro)',
      'Hysteresis'
    ],
    'Electromagnetic Induction': [
      "Faraday's and Lenz's Laws",
      'Motional EMF and Eddy Currents',
      'Self and Mutual Inductance'
    ],
    'Alternating Current': [
      'AC Circuits (LCR Series & Parallel)',
      'Resonance and Quality Factor',
      'Power in AC Circuits and Power Factor',
      'Transformers and AC Generators'
    ],
    'Electromagnetic Waves': [
      "Displacement Current and Maxwell's Equations",
      'EM Wave Properties and Spectrum'
    ],
    'Ray Optics and Optical Instruments': [
      'Reflection and Mirrors',
      "Refraction, Snell's Law and TIR",
      'Prisms and Dispersion',
      "Lenses and Lens Maker's Formula",
      'Optical Instruments (Microscope, Telescope)'
    ],
    'Wave Optics': [
      "Huygens' Principle and Wavefronts",
      "Interference and Young's Double Slit Experiment",
      'Diffraction and Resolving Power',
      'Polarization of Light'
    ],
    'Dual Nature of Radiation and Matter': [
      "Photoelectric Effect and Einstein's Equation",
      'De Broglie Wavelength and Matter Waves'
    ],
    'Atoms and Nuclei': [
      'Bohr Model of Hydrogen Atom',
      'Atomic Spectra and Rydberg Formula',
      'Nuclear Composition, Binding Energy and Mass Defect',
      'Radioactivity and Nuclear Reactions'
    ],
    'Semiconductor Electronics': [
      'Energy Bands and Intrinsic/Extrinsic Semiconductors',
      'P-N Junction Diode (Forward & Reverse Bias)',
      'Semiconductor Diodes and Zener Diode',
      'Bipolar Junction Transistors',
      'Logic Gates and Boolean Algebra'
    ],
    'Experimental Skills in Physics': [
      'Vernier Calipers and Screw Gauge',
      'Simple Pendulum and Meter Scale',
      "Young's Modulus and Surface Tension Experiments",
      'Resistance and Meter Bridge Experiments'
    ]
  },

  Chemistry: {
    'Some Basic Concepts of Chemistry': [
      'Mole Concept and Stoichiometry',
      'Empirical and Molecular Formulae',
      'Concentration Terms (Molarity, Molality, Mole Fraction)'
    ],
    'Structure of Atom': [
      'Bohr Model and Limitations',
      'Quantum Mechanical Model and Quantum Numbers',
      'Electronic Configuration and Aufbau Principle'
    ],
    'Classification of Elements & Periodicity': [
      'Periodic Trends in Properties (Radii, IE, EA, EN)'
    ],
    'Chemical Bonding & Molecular Structure': [
      'Ionic and Covalent Bonding',
      'VSEPR Theory and Molecular Geometry',
      'Hybridization and Molecular Orbital Theory (MOT)',
      'Hydrogen Bonding and Intermolecular Forces'
    ],
    'Chemical Thermodynamics': [
      'First Law of Thermodynamics and Enthalpy',
      "Hess's Law and Thermochemistry",
      'Second Law, Entropy and Gibbs Free Energy'
    ],
    'Equilibrium': [
      "Chemical Equilibrium and Le Chatelier's Principle",
      'Ionic Equilibrium, pH and Buffer Solutions',
      'Solubility Product (Ksp) and Common Ion Effect'
    ],
    'Redox Reactions and Electrochemistry': [
      'Oxidation Numbers and Balancing Redox Reactions',
      'Galvanic Cells and Nernst Equation',
      "Conductance and Kohlrausch's Law",
      "Electrolysis and Faraday's Laws"
    ],
    'Chemical Kinetics': [
      'Rate of Reaction and Order/Molecularity',
      'Integrated Rate Laws (Zero and First Order)',
      'Arrhenius Equation and Activation Energy',
      'Catalysis and Collision Theory'
    ],
    'Solutions': [
      "Types of Solutions and Raoult's Law",
      'Ideal and Non-Ideal Solutions',
      "Colligative Properties and Van't Hoff Factor"
    ],
    'Surface Chemistry': [
      'Adsorption (Physisorption & Chemisorption)',
      'Colloids and Emulsions'
    ],
    'General Principles of Metallurgy': [
      'Concentration, Extraction and Refining of Metals',
      'Ellingham Diagrams and Thermodynamics of Extraction'
    ],
    'p-Block Elements': [
      'Group 13 and 14 Elements (Boron and Carbon Families)',
      'Group 15 Elements (Nitrogen Family)',
      'Group 16 Elements (Oxygen Family)',
      'Group 17 Elements (Halogens)',
      'Group 18 Elements (Noble Gases)'
    ],
    'd- and f-Block Elements': [
      'Transition Elements Properties and Oxidation States',
      'Potassium Permanganate (KMnO4) and Dichromate (K2Cr2O7)',
      'Lanthanoids and Actinoids'
    ],
    'Coordination Compounds': [
      "Werner's Theory and IUPAC Nomenclature",
      'Isomerism in Coordination Compounds',
      'Valence Bond Theory (VBT) and Crystal Field Theory (CFT)',
      'Stability and Applications of Complexes'
    ],
    'General Organic Chemistry': [
      'Electronic Effects (Inductive, Resonance, Hyperconjugation)',
      'Reaction Intermediates (Carbocations, Carbanions, Free Radicals)',
      'Acidic and Basic Strengths of Organic Molecules',
      'IUPAC Nomenclature and Isomerism'
    ],
    'Hydrocarbons': [
      'Alkanes (Conformations and Reactions)',
      "Alkenes (Preparation, Addition Reactions, Markovnikov's Rule)",
      'Alkynes (Preparation, Acidity, Addition Reactions)',
      'Aromatic Hydrocarbons (Benzene and Electrophilic Substitution)'
    ],
    'Haloalkanes and Haloarenes': [
      'Nucleophilic Substitution (SN1 and SN2 Mechanisms)',
      'Elimination Reactions (E1 and E2)',
      'Reactions of Haloarenes'
    ],
    'Alcohols, Phenols and Ethers': [
      'Preparation and Reactions of Alcohols',
      'Phenols (Acidity, Electrophilic Substitution, Kolbe & Reimer-Tiemann)',
      'Ethers (Preparation, Williamson Synthesis, Cleavage by HX)'
    ],
    'Aldehydes and Ketones': [
      'Nucleophilic Addition Reactions',
      'Aldol Condensation and Cannizzaro Reaction',
      'Oxidation and Reduction Reactions'
    ],
    'Carboxylic Acids and Derivatives': [
      'Acidity and Preparation of Carboxylic Acids',
      'Carboxylic Acid Derivatives (Esters, Acid Halides, Amides)'
    ],
    'Amines and Diazonium Salts': [
      'Basicity and Preparation of Amines',
      'Chemical Reactions of Amines',
      'Diazonium Salts and Synthetic Reactions'
    ],
    'Biomolecules': [
      'Carbohydrates (Classification and Structures)',
      'Proteins and Amino Acids',
      'Nucleic Acids (DNA and RNA)',
      'Vitamins and Enzymes'
    ],
    'Polymers': [
      'Classification and Types of Polymerization',
      'Important Synthetic and Natural Polymers'
    ],
    'Chemistry in Everyday Life': [
      'Drugs and Medicines',
      'Cleansing Agents (Soaps and Detergents)'
    ],
    'Principles Related to Practical Chemistry': [
      'Qualitative Inorganic Salt Analysis',
      'Detection of Functional Groups in Organic Compounds'
    ]
  },

  Mathematics: {
    'Sets, Relations and Functions': [
      'Sets and Operations',
      'Types of Relations and Equivalence Relations',
      'Functions (Domain, Range, Types, Composite, Inverse)'
    ],
    'Complex Numbers and Quadratic Equations': [
      'Complex Numbers and Argand Plane',
      'Modulus, Argument and Polar Representation',
      'Quadratic Equations and Nature of Roots',
      'Relations between Roots and Coefficients'
    ],
    'Matrices and Determinants': [
      'Types of Matrices and Matrix Operations',
      'Properties of Determinants',
      'Inverse of a Matrix',
      "System of Linear Equations (Cramer's Rule & Matrix Inversion)"
    ],
    'Permutations and Combinations': [
      'Fundamental Principle of Counting',
      'Permutations with and without Repetition',
      'Combinations and Division into Groups'
    ],
    'Mathematical Induction and Reasoning': [
      'Mathematical Logic, Truth Tables, Tautology'
    ],
    'Binomial Theorem': [
      'Binomial Expansion for Positive Integral Index',
      'General and Middle Terms',
      'Properties of Binomial Coefficients'
    ],
    'Sequences and Series': [
      'Arithmetic Progression (AP)',
      'Geometric Progression (GP)',
      'Arithmetico-Geometric Progression and Special Series'
    ],
    'Limits, Continuity and Differentiability': [
      "Limits and Indeterminate Forms (L'Hopital's Rule)",
      'Continuity of Functions',
      'Differentiability of Functions'
    ],
    'Differentiation': [
      'Chain Rule and Derivatives of Elementary Functions',
      'Implicit, Parametric and Logarithmic Differentiation',
      'Second and Higher Order Derivatives'
    ],
    'Applications of Derivatives': [
      'Rate of Change and Tangents/Normals',
      'Monotonicity (Increasing and Decreasing Functions)',
      'Maxima and Minima',
      "Rolle's and Mean Value Theorems"
    ],
    'Indefinite Integration': [
      'Integration by Substitution',
      'Integration by Parts',
      'Integration by Partial Fractions and Special Forms'
    ],
    'Definite Integration': [
      'Fundamental Theorem of Calculus',
      'Properties of Definite Integrals',
      'Definite Integral as Limit of a Sum'
    ],
    'Differential Equations': [
      'Order, Degree and Formation of Differential Equations',
      'Variable Separable and Homogeneous Differential Equations',
      'First Order Linear Differential Equations'
    ],
    'Straight Lines': [
      'Distance, Section Formula and Slope of a Line',
      'Equations of Lines in Various Forms',
      'Angle between Two Lines and Distance from a Point',
      'Family of Lines'
    ],
    'Circles': [
      'Standard and General Equations of a Circle',
      'Tangent, Normal and Chord of Contact',
      'Family of Circles and Orthogonality'
    ],
    'Conic Sections (Parabola, Ellipse, Hyperbola)': [
      'Parabola (Standard Equation, Focus, Directrix, Tangents)',
      'Ellipse (Standard Equation, Eccentricity, Foci, Tangents)',
      'Hyperbola (Standard Equation, Asymptotes, Rectangular Hyperbola)'
    ],
    'Vector Algebra': [
      'Vectors, Addition and Direction Cosines',
      'Dot (Scalar) Product and Projections',
      'Cross (Vector) Product and Applications',
      'Scalar and Vector Triple Products'
    ],
    'Three Dimensional Geometry': [
      'Direction Cosines and Direction Ratios',
      'Equation of a Line in Space and Shortest Distance',
      'Equation of a Plane and Intersections',
      'Coplanarity of Lines and Distance from a Point'
    ],
    'Statistics': [
      'Measures of Central Tendency (Mean, Median, Mode)',
      'Measures of Dispersion (Variance and Standard Deviation)'
    ],
    'Probability': [
      'Classical and Axiomatic Probability',
      'Conditional Probability and Multiplication Theorem',
      "Independent Events and Bayes' Theorem",
      'Random Variables and Probability Distributions'
    ],
    'Trigonometry': [
      'Trigonometric Functions and Identities',
      'Trigonometric Equations',
      'Inverse Trigonometric Functions',
      'Heights and Distances'
    ]
  }
};

export async function seedCurriculum() {
  console.log('--- Starting Complete JEE Main & Advanced Curriculum Seed ---');

  // 1. Fetch existing subjects
  const { data: existingSubjects, error: subErr } = await supabaseAdmin.from('subjects').select('id, name');
  if (subErr) throw subErr;

  const subjectMap = {};
  for (const s of existingSubjects || []) {
    subjectMap[s.name] = s.id;
  }

  // Ensure 3 standard subjects exist
  for (const name of ['Physics', 'Chemistry', 'Mathematics']) {
    if (!subjectMap[name]) {
      const id = deterministicUuid('subject', name);
      const { data, error } = await supabaseAdmin.from('subjects').upsert({ id, name }).select().single();
      if (error) throw error;
      subjectMap[name] = data.id;
    }
  }

  // 2. Fetch existing chapters
  const { data: existingChapters, error: chErr } = await supabaseAdmin.from('chapters').select('id, name, subject_id');
  if (chErr) throw chErr;

  const chapterMap = {}; // key: `${subject_id}:${chapter_name.toLowerCase()}` -> id
  for (const c of existingChapters || []) {
    chapterMap[`${c.subject_id}:${c.name.toLowerCase()}`] = c.id;
  }

  // 3. Fetch existing topics
  const { data: existingTopics, error: topErr } = await supabaseAdmin.from('topics').select('id, name, chapter_id');
  if (topErr) throw topErr;

  const topicMap = {}; // key: `${chapter_id}:${topic_name.toLowerCase()}` -> id
  for (const t of existingTopics || []) {
    topicMap[`${t.chapter_id}:${t.name.toLowerCase()}`] = t.id;
  }

  let chaptersCreated = 0;
  let topicsCreated = 0;

  for (const [subjectName, chaptersObj] of Object.entries(JEE_CURRICULUM)) {
    const subjectId = subjectMap[subjectName];

    for (const [chapterName, topicNames] of Object.entries(chaptersObj)) {
      const chKey = `${subjectId}:${chapterName.toLowerCase()}`;
      let chapterId = chapterMap[chKey];

      if (!chapterId) {
        chapterId = deterministicUuid('chapter', `${subjectName}:${chapterName}`);
        const { error } = await supabaseAdmin.from('chapters').upsert({
          id: chapterId,
          subject_id: subjectId,
          name: chapterName
        });
        if (error) {
          console.error(`Error creating chapter ${chapterName}:`, error.message);
          continue;
        }
        chapterMap[chKey] = chapterId;
        chaptersCreated++;
      }

      for (const topicName of topicNames) {
        const topKey = `${chapterId}:${topicName.toLowerCase()}`;
        let topicId = topicMap[topKey];

        if (!topicId) {
          topicId = deterministicUuid('topic', `${chapterId}:${topicName}`);
          const { error } = await supabaseAdmin.from('topics').upsert({
            id: topicId,
            chapter_id: chapterId,
            name: topicName
          });
          if (error) {
            console.error(`Error creating topic ${topicName}:`, error.message);
            continue;
          }
          topicMap[topKey] = topicId;
          topicsCreated++;
        }
      }
    }
  }

  console.log(`--- Curriculum Seed Completed ---`);
  console.log(`New chapters created: ${chaptersCreated}`);
  console.log(`New topics created: ${topicsCreated}`);

  // Fetch and print final totals
  const { count: finalChapters } = await supabaseAdmin.from('chapters').select('*', { count: 'exact', head: true });
  const { count: finalTopics } = await supabaseAdmin.from('topics').select('*', { count: 'exact', head: true });
  console.log(`Total chapters in Supabase: ${finalChapters}`);
  console.log(`Total topics in Supabase: ${finalTopics}`);

  return { chaptersCreated, topicsCreated, finalChapters, finalTopics };
}

// Execute if run directly
if (process.argv[1]?.endsWith('curriculum.seed.js')) {
  seedCurriculum()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
