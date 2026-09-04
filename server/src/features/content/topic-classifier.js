/**
 * Topic Classifier for JEE Main Questions
 * Maps question numbers (1-30: Physics, 31-60: Chemistry, 61-90: Math) and textual concept
 * markers to the nearest matching topic in the Supabase curriculum.
 */

const KEYWORD_RULES = [
  // --- PHYSICS ---
  { subject: 'Physics', chapter: 'Semiconductor Electronics', topic: 'Semiconductor Diodes and Zener Diode', keywords: ['zener', 'diode', 'breakdown voltage', 'p-n junction', 'depletion layer'] },
  { subject: 'Physics', chapter: 'Semiconductor Electronics', topic: 'Bipolar Junction Transistors', keywords: ['transistor', 'common emitter', 'base current', 'collector current', 'emitter current', 'voltage gain', 'current gain', 'beta'] },
  { subject: 'Physics', chapter: 'Semiconductor Electronics', topic: 'Logic Gates', keywords: ['logic gate', 'nand', 'nor', 'and gate', 'or gate', 'boolean'] },
  { subject: 'Physics', chapter: 'Current Electricity', topic: 'Electrical Instruments (Meter Bridge & Potentiometer)', keywords: ['meter bridge', 'potentiometer', 'galvanometer', 'jockey', 'balance point'] },
  { subject: 'Physics', chapter: 'Current Electricity', topic: "Kirchhoff's Laws and Circuits", keywords: ['kirchhoff', 'equivalent resistance', 'loop rule', 'junction rule', 'resistor network'] },
  { subject: 'Physics', chapter: 'Current Electricity', topic: "Ohm's Law and Resistance", keywords: ['temperature coefficient of resistance', 'heating element', 'resistivity', 'drift velocity', 'ohm'] },
  { subject: 'Physics', chapter: 'Electrostatics', topic: 'Electric Potential and Capacitance', keywords: ['capacitor', 'capacitance', 'dielectric', 'charged to a potential', 'inductor of self inductance'] },
  { subject: 'Physics', chapter: 'Electrostatics', topic: 'Gauss’s Law and Flux', keywords: ['electric flux', 'gauss', 'charge q is placed', 'flux through'] },
  { subject: 'Physics', chapter: 'Electrostatics', topic: 'Coulomb’s Law and Electric Field', keywords: ['coulomb', 'electric field', 'charge distribution'] },
  { subject: 'Physics', chapter: 'Magnetic Effects of Current and Magnetism', topic: 'Biot-Savart Law and Ampere’s Law', keywords: ['magnetic field', 'solenoid', 'magnetic moment', 'loop of radius', 'circular wires', 'biot-savart'] },
  { subject: 'Physics', chapter: 'Magnetic Effects of Current and Magnetism', topic: 'Magnetic Materials', keywords: ['ferromagnet', 'demagnetise', 'b-h curve', 'hysteresis', 'paramagnetic', 'diamagnetic'] },
  { subject: 'Physics', chapter: 'Electromagnetic Waves', topic: 'EM Wave Properties and Spectrum', keywords: ['electromagnetic wave', 'intensity i', 'electric and magnetic fields', 'em wave', 'pointing vector'] },
  { subject: 'Physics', chapter: 'Optics', topic: 'Lenses and Optical Instruments', keywords: ['planoconvex lens', 'silvered', 'optical system', 'focal length', 'refractive index', 'magnifying', 'telescope', 'microscope'] },
  { subject: 'Physics', chapter: 'Optics', topic: 'Diffraction and Polarization', keywords: ['slit of width', 'second minima', 'central maximum', 'angular position', 'diffraction', 'polarization'] },
  { subject: 'Physics', chapter: 'Gravitation', topic: 'Orbital Mechanics', keywords: ['orbit of radius', 'splits into two', 'circular orbit', 'planet of mass', 'satellite', 'escape velocity'] },
  { subject: 'Physics', chapter: 'Gravitation', topic: 'Gravitational Force', keywords: ['forces exerted by the moon', 'gravitational force', 'acceleration due to gravity', 'masses are'] },
  { subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque and Equilibrium', keywords: ['uniform rod', 'suspended from', 'moment of the force', 'torque', 'horizontal', 'angular acceleration'] },
  { subject: 'Physics', chapter: 'Rotational Motion', topic: 'Moment of Inertia', keywords: ['moment of inertia', 'radius of gyration', 'rotational kinetic energy'] },
  { subject: 'Physics', chapter: 'Thermal Physics and Thermodynamics', topic: 'First Law of Thermodynamics', keywords: ['pv diagram', 'monoatomic gas', 'path abca', 'maximum temperature', 'heat absorbed', 'cyclic process', 'work done by gas'] },
  { subject: 'Physics', chapter: 'Mechanical Properties of Solids and Fluids', topic: 'Fluid Statics and Pressure', keywords: ['tube is bent', 'immiscible liquids', 'common interface', 'density', 'bernoulli', 'viscosity', 'surface tension'] },
  { subject: 'Physics', chapter: 'Laws of Motion', topic: 'Friction', keywords: ['rough inclined plane', 'coefficient of kinetic friction', 'smooth 45', 'slide down', 'limiting friction'] },
  { subject: 'Physics', chapter: 'Modern Physics', topic: 'Photoelectric Effect and Dual Nature', keywords: ['stopping potential', 'work function', 'de broglie', 'wavelength', 'photoelectric', 'non-relativistic speeds'] },
  { subject: 'Physics', chapter: 'Modern Physics', topic: 'Radioactivity and Nuclear Reactions', keywords: ['radioactive', 'half life', 'activity', 'decay', 'alpha decay', 'beta decay', 'nuclear'] },
  { subject: 'Physics', chapter: 'Units, Dimensions and Measurements', topic: 'Errors in Measurement', keywords: ['relative error', 'percentage error', 'determination of the surface area', 'volume is'] },

  // --- CHEMISTRY ---
  { subject: 'Chemistry', chapter: 'Some Basic Concepts of Chemistry', topic: 'Mole Concept and Stoichiometry', keywords: ['moles of', 'molar mass', 'stoichiometry', 'sample of naclo', 'precipitated as agcl', 'atoms present'] },
  { subject: 'Chemistry', chapter: 'Some Basic Concepts of Chemistry', topic: 'Concentration Terms (Molarity, Molality)', keywords: ['primary standard', 'standardizing naoh', 'molarity', 'normality', 'titration', 'oxalic acid'] },
  { subject: 'Chemistry', chapter: 'Chemical Thermodynamics', topic: 'Enthalpy and First Law', keywords: ['delta h', 'delta u', 'delta n_g', 'heat of reaction', 'combustion', 'formation'] },
  { subject: 'Chemistry', chapter: 'Chemical Thermodynamics', topic: 'Entropy and Gibbs Free Energy', keywords: ['delta s', 'entropy is negative', 'spontaneous', 'gibbs free energy', 'delta g'] },
  { subject: 'Chemistry', chapter: 'Chemical Kinetics and Surface Chemistry', topic: 'Rate Laws and Order of Reaction', keywords: ['first order', 'order of this reaction', 'half life period', 'decomposition', 'rate constant', '75 % of the reaction occurs'] },
  { subject: 'Chemistry', chapter: 'Chemical Kinetics and Surface Chemistry', topic: 'Adsorption and Catalysis', keywords: ['physical adsorption', 'chemisorption', 'freundlich', 'catalyst', 'colloid', 'micelle'] },
  { subject: 'Chemistry', chapter: 'Solutions', topic: 'Raoult’s Law and Colligative Properties', keywords: ['non-volatile', 'non-electrolyte', 'vapour pressure', 'octane', 'elevation in boiling', 'depression in freezing'] },
  { subject: 'Chemistry', chapter: 'Periodic Properties and Chemical Bonding', topic: 'Molecular Orbital Theory', keywords: ['molecular orbital', 'bond order', 'total electrons', 'sigma', 'pi', 'diamagnetic', 'paramagnetic'] },
  { subject: 'Chemistry', chapter: 'Periodic Properties and Chemical Bonding', topic: 'Hybridization', keywords: ['hybridization', 'shape and hybridization', 'geometry is represented', 'sp3', 'sp2', 'linear', 'tetrahedral'] },
  { subject: 'Chemistry', chapter: 'Inorganic Chemistry and Coordination Compounds', topic: 'p-Block Elements', keywords: ['group 13', 'xcl3', 'boron', 'dimerize', 'oxides of nitrogen', 'n2o3', 'n2o4', 'nitrogen-nitrogen bond'] },
  { subject: 'Chemistry', chapter: 'Inorganic Chemistry and Coordination Compounds', topic: 'd- and f-Block Elements', keywords: ['extraction of copper', 'sulphide ore', 'oxidation of cuprous', 'metallurgy', 'dark green product', 'dark purple solution', 'kno3'] },
  { subject: 'Chemistry', chapter: 'Inorganic Chemistry and Coordination Compounds', topic: 'Coordination Compounds and Isomerism', keywords: ['coordination', 'ligand', 'chelate', 'ferrocyanide', 'chocolate coloured precipitate'] },
  { subject: 'Chemistry', chapter: 'Redox Reactions and Electrochemistry', topic: 'Conductance and Electrolysis', keywords: ['ampere current', 'faraday', 'nitrobenzene', 'electrolysis', 'cathode', 'anode', 'reduction at cathode'] },
  { subject: 'Chemistry', chapter: 'Chemical and Ionic Equilibrium', topic: 'Solubility Product (Ksp) and Buffers', keywords: ['solubility product', 'ksp', 'buffer', 'common ion', 'precipitation'] },
  { subject: 'Chemistry', chapter: 'Organic Compounds with Functional Groups', topic: 'Amines and Diazonium Salts', keywords: ['zwitter ion', 'p-amino-phenol', 'amide', 'aniline', 'diazonium', 'amine'] },
  { subject: 'Chemistry', chapter: 'Organic Compounds with Functional Groups', topic: 'Alcohols, Phenols and Ethers', keywords: ['dehydrated to give alkene', 'phenol', 'acidic condition', 'alcohol', 'ether'] },
  { subject: 'Chemistry', chapter: 'General Organic Chemistry', topic: 'IUPAC Nomenclature and Isomerism', keywords: ['major product', 'reaction sequence', 'most polar compound', 'dipole moment', 'electrophilic'] },

  // --- MATHEMATICS ---
  { subject: 'Mathematics', chapter: 'Probability and Statistics', topic: 'Conditional Probability and Bayes Theorem', keywords: ['events', 'pair-wise independence', 'p (a', 'complement of an event', 'tickets to be distributed', 'probability'] },
  { subject: 'Mathematics', chapter: 'Probability and Statistics', topic: 'Measures of Dispersion (Mean, Variance, Std Dev)', keywords: ['mean and the standard deviation', 's.d.', 'five observations', 'variance', 'dispersion'] },
  { subject: 'Mathematics', chapter: 'Algebra', topic: 'Sequences and Series (AP, GP, HP)', keywords: ['in a.p.', 'be in a.p.', 'sum of the first 20 terms of the series', 'gp', 'harmonic progression', 'sum of squares'] },
  { subject: 'Mathematics', chapter: 'Algebra', topic: 'Permutations and Combinations', keywords: ['numbers between 2,000 and 5,000', 'multiple of 3', 'digits 0, 1, 2, 3, 4', 'repetition of digits', 'permutations', 'combinations'] },
  { subject: 'Mathematics', chapter: 'Algebra', topic: 'Quadratic Equations', keywords: ['roots of the quadratic equation', 'roots of the equation', 'equal in magnitude but opposite in sign', 'discriminant'] },
  { subject: 'Mathematics', chapter: 'Algebra', topic: 'Complex Numbers', keywords: ['1+i\\sqrt{3}', 'least positive integer n', 'complex number', 'modulus', 'argument'] },
  { subject: 'Mathematics', chapter: 'Matrices and Determinants', topic: 'Determinants and System of Linear Equations', keywords: ['system of linear equations', 'has no solution', 'determinant', 'cramer', 'infinitely many solutions'] },
  { subject: 'Mathematics', chapter: 'Vector Algebra and 3D Geometry', topic: 'Vectors and Dot-Cross Products', keywords: ['vector \\vec{b}', 'dot product', 'cross product', '|\\vec{b}|', 'coplanar', 'scalar triple'] },
  { subject: 'Mathematics', chapter: 'Differential Calculus', topic: 'Limits and Continuity', keywords: ['lim_{x', 'lim_', 'limit', 'continuous', 'indeterminate form'] },
  { subject: 'Mathematics', chapter: 'Differential Calculus', topic: 'Differentiation and Chain Rule', keywords: ['derivative', 'dy/dx', 'slope of tangent'] },
  { subject: 'Mathematics', chapter: 'Integral Calculus', topic: 'Indefinite Integration', keywords: ['\\int', 'tan x', 'integral', 'dx = x -', 'integration'] },
  { subject: 'Mathematics', chapter: 'Coordinate Geometry', topic: 'Straight Lines', keywords: ['point of intersection of the lines', 'locus of the point', 'straight line', 'slope', 'perpendicular lines', 'angle between the lines'] },
  { subject: 'Mathematics', chapter: 'Coordinate Geometry', topic: 'Ellipse', keywords: ['latus rectum of an ellipse', 'ellipse is 4 units', 'eccentricity', 'focus and its nearest vertex'] },
  { subject: 'Mathematics', chapter: 'Sets, Relations and Functions', topic: 'Sets and Relations', keywords: ['binary relations', 'r_1 =', 'natural numbers', 'relation on n'] },
  { subject: 'Mathematics', chapter: 'Trigonometry and Mathematical Reasoning', topic: 'Mathematical Logic and Truth Tables', keywords: ['truth values', 'tautology', 'contradiction', 'implies', '\\lor', '\\land', '\\sim'] },
  { subject: 'Mathematics', chapter: 'Trigonometry and Mathematical Reasoning', topic: 'Trigonometric Ratios and Equations', keywords: ['cos a', 'sin a', 'trigonometric', 'tan a', 'delta abc satisfies'] }
];

export function classifyQuestion(questionNumber, questionText, allTopics = []) {
  // 1. Determine Subject from JEE Question Numbering
  let targetSubject = 'Physics';
  if (questionNumber >= 31 && questionNumber <= 60) targetSubject = 'Chemistry';
  else if (questionNumber >= 61 && questionNumber <= 90) targetSubject = 'Mathematics';

  const textLower = (questionText || '').toLowerCase();

  // 2. Score against rules for the target subject
  let bestMatch = null;
  let highestScore = 0;

  for (const rule of KEYWORD_RULES) {
    if (rule.subject !== targetSubject) continue;

    let score = 0;
    for (const kw of rule.keywords) {
      if (textLower.includes(kw.toLowerCase())) {
        score += kw.length; // weight longer keyword matches higher
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = rule;
    }
  }

  // 3. Find topic ID in allTopics
  if (bestMatch && allTopics.length > 0) {
    const matchedTopic = allTopics.find(t =>
      t.subject?.toLowerCase() === bestMatch.subject.toLowerCase() &&
      (t.name?.toLowerCase() === bestMatch.topic.toLowerCase() ||
       t.chapter?.toLowerCase() === bestMatch.chapter.toLowerCase())
    );
    if (matchedTopic) {
      return {
        subject: bestMatch.subject,
        chapter: bestMatch.chapter,
        topicName: bestMatch.topic,
        topicId: matchedTopic.id,
        confidence: highestScore > 10 ? 'HIGH' : 'MEDIUM'
      };
    }
  }

  // Fallback: pick the first topic of the target subject
  const fallbackTopic = allTopics.find(t => t.subject?.toLowerCase() === targetSubject.toLowerCase());
  return {
    subject: targetSubject,
    chapter: fallbackTopic?.chapter || null,
    topicName: fallbackTopic?.name || null,
    topicId: fallbackTopic?.id || null,
    confidence: 'LOW'
  };
}
