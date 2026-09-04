import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { supabaseAdmin } from '../lib/supabase.js';

const PHYSICS_ID = 'a1000000-0000-0000-0000-000000000001';
const CHEMISTRY_ID = 'a1000000-0000-0000-0000-000000000002';
const MATHS_ID = 'a1000000-0000-0000-0000-000000000003';

const CURRICULUM = [
  // ================= PHYSICS =================
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Units, Dimensions and Measurements',
    topics: ['Dimensional Analysis', 'Errors in Measurement', 'Significant Figures']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Kinematics',
    topics: ['Motion in a Straight Line', 'Motion in a Plane', 'Relative Velocity', 'Projectile Motion']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Laws of Motion',
    topics: ["Newton's Laws", 'Friction', 'Circular Motion']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Work, Energy and Power',
    topics: ['Work-Energy Theorem', 'Conservation of Energy', 'Collisions and Power']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Rotational Motion',
    topics: ['Moment of Inertia', 'Angular Momentum', 'Rolling Motion', 'Torque and Equilibrium']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Gravitation',
    topics: ['Gravitational Force', 'Orbital Mechanics', 'Gravitational Potential Energy']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Mechanical Properties of Solids and Fluids',
    topics: ['Elasticity and Hooke’s Law', 'Fluid Statics and Pressure', 'Viscosity and Surface Tension', 'Bernoulli’s Principle']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Thermal Physics and Thermodynamics',
    topics: ['Thermal Expansion and Calorimetry', 'First Law of Thermodynamics', 'Heat Engines and Carnot Cycle', 'Heat Transfer']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Oscillations and Waves',
    topics: ['Simple Harmonic Motion', 'Damped and Forced Oscillations', 'Wave Motion', 'Doppler Effect and Sound Waves']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Electrostatics',
    topics: ['Coulomb’s Law and Electric Field', 'Gauss’s Law and Flux', 'Electric Potential and Capacitance', 'Capacitors with Dielectrics']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Current Electricity',
    topics: ["Ohm's Law and Resistance", "Kirchhoff's Laws and Circuits", 'Electrical Instruments (Meter Bridge & Potentiometer)']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Magnetic Effects of Current and Magnetism',
    topics: ['Biot-Savart Law and Ampere’s Law', 'Magnetic Force on Moving Charges', 'Magnetic Dipole and Earth Magnetism', 'Magnetic Materials']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Electromagnetic Induction and Alternating Current',
    topics: ['Faraday’s and Lenz’s Law', 'Self and Mutual Inductance', 'AC Circuits and Resonance', 'Power in AC Circuits and Transformers']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Electromagnetic Waves',
    topics: ['Displacement Current', 'EM Wave Properties and Spectrum']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Optics',
    topics: ['Reflection and Refraction at Spherical Surfaces', 'Lenses and Optical Instruments', 'Interference and Young’s Double Slit', 'Diffraction and Polarization']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Modern Physics',
    topics: ['Photoelectric Effect and Dual Nature', 'Bohr Model and Atomic Spectra', 'Radioactivity and Nuclear Reactions']
  },
  {
    subjectId: PHYSICS_ID,
    chapterName: 'Semiconductor Electronics',
    topics: ['Semiconductor Diodes and Zener Diode', 'Bipolar Junction Transistors', 'Logic Gates']
  },

  // ================= CHEMISTRY =================
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Some Basic Concepts of Chemistry',
    topics: ['Mole Concept and Stoichiometry', 'Concentration Terms (Molarity, Molality)']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Atomic Structure',
    topics: ['Bohr Model', 'Quantum Numbers', 'Electronic Configuration']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Periodic Properties and Chemical Bonding',
    topics: ['Periodic Trends and Ionization Energy', 'VSEPR Theory', 'Hybridization', 'Molecular Orbital Theory']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Chemical Thermodynamics',
    topics: ['Enthalpy and First Law', 'Entropy and Gibbs Free Energy', 'Thermochemistry']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Chemical and Ionic Equilibrium',
    topics: ['Law of Mass Action and Le Chatelier', 'Acids, Bases and pH', 'Solubility Product (Ksp) and Buffers']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Redox Reactions and Electrochemistry',
    topics: ['Redox Reactions and Oxidation Number', 'Galvanic Cells and Nernst Equation', 'Conductance and Electrolysis']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Chemical Kinetics and Surface Chemistry',
    topics: ['Rate Laws and Order of Reaction', 'Arrhenius Equation and Activation Energy', 'Adsorption and Catalysis']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Solutions',
    topics: ['Raoult’s Law and Colligative Properties', 'Van’t Hoff Factor and Abnormal Molar Mass']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Inorganic Chemistry and Coordination Compounds',
    topics: ['p-Block Elements', 'd- and f-Block Elements', 'Coordination Compounds and Isomerism', 'Crystal Field Theory']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'General Organic Chemistry',
    topics: ['IUPAC Nomenclature and Isomerism', 'Inductive, Resonance and Hyperconjugation', 'Reaction Intermediates (Carbocations, Free Radicals)']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Hydrocarbons',
    topics: ['Alkanes, Alkenes and Alkynes', 'Aromatic Hydrocarbons and Electrophilic Substitution']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Organic Compounds with Functional Groups',
    topics: ['Haloalkanes and Haloarenes (SN1, SN2)', 'Alcohols, Phenols and Ethers', 'Aldehydes and Ketones (Nucleophilic Addition)', 'Carboxylic Acids and Derivatives', 'Amines and Diazonium Salts']
  },
  {
    subjectId: CHEMISTRY_ID,
    chapterName: 'Biomolecules and Polymers',
    topics: ['Carbohydrates and Amino Acids', 'Polymers and Chemistry in Everyday Life']
  },

  // ================= MATHEMATICS =================
  {
    subjectId: MATHS_ID,
    chapterName: 'Sets, Relations and Functions',
    topics: ['Sets and Relations', 'Functions and Graphs']
  },
  {
    subjectId: MATHS_ID,
    chapterName: 'Algebra',
    topics: ['Quadratic Equations', 'Complex Numbers', 'Permutations and Combinations', 'Binomial Theorem', 'Sequences and Series (AP, GP, HP)']
  },
  {
    subjectId: MATHS_ID,
    chapterName: 'Matrices and Determinants',
    topics: ['Matrices Operations and Inverses', 'Determinants and System of Linear Equations']
  },
  {
    subjectId: MATHS_ID,
    chapterName: 'Differential Calculus',
    topics: ['Limits and Continuity', 'Differentiation and Chain Rule', 'Tangents and Normals', 'Maxima and Minima', 'Mean Value Theorems']
  },
  {
    subjectId: MATHS_ID,
    chapterName: 'Integral Calculus',
    topics: ['Indefinite Integration', 'Definite Integration and Properties', 'Area Under Curves']
  },
  {
    subjectId: MATHS_ID,
    chapterName: 'Differential Equations',
    topics: ['Formation and Order-Degree', 'First Order Differential Equations']
  },
  {
    subjectId: MATHS_ID,
    chapterName: 'Coordinate Geometry',
    topics: ['Straight Lines', 'Circles', 'Parabola', 'Ellipse', 'Hyperbola']
  },
  {
    subjectId: MATHS_ID,
    chapterName: 'Vector Algebra and 3D Geometry',
    topics: ['Vectors and Dot-Cross Products', 'Lines and Planes in 3D Space']
  },
  {
    subjectId: MATHS_ID,
    chapterName: 'Probability and Statistics',
    topics: ['Conditional Probability and Bayes Theorem', 'Independent Events and Distributions', 'Measures of Dispersion (Mean, Variance, Std Dev)']
  },
  {
    subjectId: MATHS_ID,
    chapterName: 'Trigonometry and Mathematical Reasoning',
    topics: ['Trigonometric Ratios and Equations', 'Inverse Trigonometric Functions', 'Mathematical Logic and Truth Tables']
  }
];

async function seedCurriculum() {
  console.log('--- Seeding Comprehensive JEE Main Curriculum ---');

  for (const item of CURRICULUM) {
    // 1. Check or insert chapter
    let { data: existingChapter } = await supabaseAdmin
      .from('chapters')
      .select('id, name')
      .eq('subject_id', item.subjectId)
      .ilike('name', item.chapterName)
      .maybeSingle();

    let chapterId = existingChapter?.id;
    if (!chapterId) {
      const { data: newChapter, error: cErr } = await supabaseAdmin
        .from('chapters')
        .insert({ subject_id: item.subjectId, name: item.chapterName })
        .select('id')
        .single();
      if (cErr) {
        console.error(`Error inserting chapter "${item.chapterName}":`, cErr.message);
        continue;
      }
      chapterId = newChapter.id;
      console.log(`+ Created chapter: ${item.chapterName}`);
    }

    // 2. Check or insert topics
    for (const topicName of item.topics) {
      const { data: existingTopic } = await supabaseAdmin
        .from('topics')
        .select('id')
        .eq('chapter_id', chapterId)
        .ilike('name', topicName)
        .maybeSingle();

      if (!existingTopic) {
        const { error: tErr } = await supabaseAdmin
          .from('topics')
          .insert({ chapter_id: chapterId, name: topicName });
        if (tErr) {
          console.error(`  Error inserting topic "${topicName}":`, tErr.message);
        } else {
          console.log(`  + Created topic: ${topicName}`);
        }
      }
    }
  }

  const { data: totalTopics } = await supabaseAdmin.from('topics').select('id');
  console.log(`\nCurriculum seeding complete! Total topics now: ${totalTopics?.length}`);
}

seedCurriculum().catch(console.error);
