/**
 * Topic Classifier for JEE Main Questions
 * Maps question numbers (1-30: Physics, 31-60: Chemistry, 61-90: Math) and textual concept
 * markers to the nearest matching topic in the Supabase curriculum.
 */

const KEYWORD_RULES = [
  // ==========================================
  // --- PHYSICS ---
  // ==========================================
  // Semiconductor Electronics
  { subject: 'Physics', chapter: 'Semiconductor Electronics', topic: 'Logic Gates', keywords: ['truth table for the given circuit', 'truth table', 'circuit will be', 'logic gate', 'nand', 'nor', 'and gate', 'or gate', 'boolean'] },
  { subject: 'Physics', chapter: 'Semiconductor Electronics', topic: 'Semiconductor Diodes and Zener Diode', keywords: ['zener', 'diode', 'breakdown voltage', 'p-n junction', 'depletion layer'] },
  { subject: 'Physics', chapter: 'Semiconductor Electronics', topic: 'Bipolar Junction Transistors', keywords: ['transistor', 'common emitter', 'base current', 'collector current', 'emitter current', 'voltage gain', 'current gain', 'beta'] },

  // Communication & EM Waves
  { subject: 'Physics', chapter: 'Electromagnetic Waves', topic: 'EM Wave Properties and Spectrum', keywords: ['carrier frequency of a transmitter', 'carrier frequency', 'tank circuit', 'side bands', 'frequency range occupied by the side bands', 'amplitude modulation', 'modulation index', 'plane polarized monochromatic em wave', 'electromagnetic wave', 'intensity i', 'electric and magnetic fields', 'em wave', 'pointing vector'] },

  // Current Electricity
  { subject: 'Physics', chapter: 'Current Electricity', topic: "Ohm's Law and Resistance", keywords: ['constant voltage is applied between two ends', 'metallic wire', 'rate of heat developed', 'length is halved', 'temperature coefficient of resistance', 'heating element', 'resistivity', 'drift velocity', 'current density'] },
  { subject: 'Physics', chapter: 'Current Electricity', topic: 'Electrical Instruments (Meter Bridge & Potentiometer)', keywords: ['meter bridge', 'potentiometer', 'galvanometer', 'jockey', 'balance point'] },
  { subject: 'Physics', chapter: 'Current Electricity', topic: "Kirchhoff's Laws and Circuits", keywords: ['kirchhoff', 'equivalent resistance', 'loop rule', 'junction rule', 'resistor network'] },

  // Electrostatics
  { subject: 'Physics', chapter: 'Electrostatics', topic: 'Electric Potential and Capacitance', keywords: ['c_1 = 3.0', 'c_2 = 6.0', 'switch (2) as shown', 'charged to a potential', 'inductor of self inductance', 'capacitor', 'capacitance', 'dielectric'] },
  { subject: 'Physics', chapter: 'Electrostatics', topic: 'Gauss’s Law and Flux', keywords: ['electric flux', 'gauss', 'charge q is placed', 'flux through'] },
  { subject: 'Physics', chapter: 'Electrostatics', topic: 'Coulomb’s Law and Electric Field', keywords: ['spatial point z_1', 'spatial point', 'coulomb', 'electric field', 'charge distribution', 'charge density'] },

  // Magnetic Effects & Magnetism
  { subject: 'Physics', chapter: 'Magnetic Effects of Current and Magnetism', topic: 'Biot-Savart Law and Ampere’s Law', keywords: ['centre of a fixed large circular coil', 'circular coil of radius r', 'sides of an equilateral triangle of side', 'magnetic field at the center of the triangle', 'magnetic field', 'solenoid', 'magnetic moment', 'loop of radius', 'circular wires', 'biot-savart'] },
  { subject: 'Physics', chapter: 'Magnetic Effects of Current and Magnetism', topic: 'Magnetic Materials', keywords: ['ferromagnet', 'demagnetise', 'b-h curve', 'hysteresis', 'paramagnetic', 'diamagnetic'] },
  { subject: 'Physics', chapter: 'Magnetic Effects of Current and Magnetism', topic: 'Motion of Charged Particles in Magnetic Field', keywords: ['lorentz force', 'helical path', 'cyclotron', 'pitch of helix'] },

  // EMI & AC
  { subject: 'Physics', chapter: 'Electromagnetic Induction and Alternating Current', topic: 'Faraday’s and Lenz’s Law', keywords: ['copper rod of mass m slides under gravity', 'parallel rails', 'terminal speed of the copper rod', 'uniform magnetic field b normal to the plane', 'faraday', 'lenz', 'motional emf', 'induced emf'] },
  { subject: 'Physics', chapter: 'Electromagnetic Induction and Alternating Current', topic: 'Self and Mutual Inductance', keywords: ['fixed large circular coil of radius r', 'smaller circular coil', 'mutual inductance', 'self inductance'] },
  { subject: 'Physics', chapter: 'Electromagnetic Induction and Alternating Current', topic: 'AC Circuits and Resonance', keywords: ['lcr circuit', 'power factor', 'resonance frequency', 'quality factor', 'alternating current', 'impedance'] },

  // Work, Energy and Power
  { subject: 'Physics', chapter: 'Work, Energy and Power', topic: 'Collisions and Power', keywords: ['proton of mass m collides elastically', 'collides elastically with a particle', 'collides elastically', 'elastic collision', 'head-on collision', 'work-energy'] },

  // Optics
  { subject: 'Physics', chapter: 'Optics', topic: 'Diffraction and Polarization', keywords: ['plane polarized light is incident on a polarizer', 'polarizer with its pass axis', 'slit of width', 'second minima', 'central maximum', 'angular position', 'diffraction', 'polarization', 'brewster'] },
  { subject: 'Physics', chapter: 'Optics', topic: 'Lenses and Optical Instruments', keywords: ['planoconvex lens', 'silvered', 'optical system', 'focal length', 'refractive index', 'magnifying', 'telescope', 'microscope', 'lens maker'] },
  { subject: 'Physics', chapter: 'Optics', topic: 'Interference and Young’s Double Slit', keywords: ['young', 'ydse', 'fringe width', 'interference'] },

  // Gravitation
  { subject: 'Physics', chapter: 'Gravitation', topic: 'Orbital Mechanics', keywords: ['orbit of radius', 'splits into two', 'circular orbit', 'planet of mass', 'satellite', 'escape velocity'] },
  { subject: 'Physics', chapter: 'Gravitation', topic: 'Gravitational Force', keywords: ['forces exerted by the moon', 'gravitational force', 'acceleration due to gravity', 'masses are'] },

  // Rotational Motion
  { subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque and Equilibrium', keywords: ['thin rod mn, free to rotate in the vertical plane', 'thin rod mn', 'held horizontal. when the end m is released', 'moment of the force', 'torque', 'uniform rod', 'suspended from', 'angular acceleration'] },
  { subject: 'Physics', chapter: 'Rotational Motion', topic: 'Moment of Inertia', keywords: ['disc rotates about its axis of symmetry', 'axis of symmetry in a horizontal plane', 'moment of inertia', 'radius of gyration', 'rotational kinetic energy'] },
  { subject: 'Physics', chapter: 'Rotational Motion', topic: 'Angular Momentum', keywords: ['thin uniform bar of length l and mass 8m', 'thin uniform bar of length l', 'strike the bar simultaneously', 'two point masses', 'angular momentum'] },

  // Thermal Physics & Thermodynamics
  { subject: 'Physics', chapter: 'Thermal Physics and Thermodynamics', topic: 'Second Law and Carnot Engine', keywords: ['carnot engines a and b', 'carnot engine', 'reservoir at 600 k', 'thermal efficiency', 'carnot cycle', 'coefficient of performance'] },
  { subject: 'Physics', chapter: 'Thermal Physics and Thermodynamics', topic: 'Heat Transfer (Conduction, Convection, Radiation)', keywords: ['body takes 10 minutes to cool from 60', 'temperature of surroundings is constant at 25', 'newton\'s law of cooling', 'thermal conductivity', 'black body', 'wien', 'stefan'] },
  { subject: 'Physics', chapter: 'Thermal Physics and Thermodynamics', topic: 'Kinetic Theory of Gases', keywords: ['thermal velocity of a helium atom', 'root mean square', 'v_rms', 'degrees of freedom', 'kinetic theory', 'boltzmann'] },
  { subject: 'Physics', chapter: 'Thermal Physics and Thermodynamics', topic: 'First Law of Thermodynamics', keywords: ['two moles of an ideal monoatomic gas', 'pv diagram', 'monoatomic gas', 'path abca', 'maximum temperature', 'heat absorbed', 'cyclic process', 'work done by gas'] },

  // Mechanical Properties of Solids and Fluids
  { subject: 'Physics', chapter: 'Mechanical Properties of Solids and Fluids', topic: 'Fluid Statics and Pressure', keywords: ['air bubble of radius r rises from the bottom to the surface', 'air bubble', 'tube is bent', 'immiscible liquids', 'common interface', 'density', 'bernoulli', 'viscosity', 'surface tension'] },
  { subject: 'Physics', chapter: 'Mechanical Properties of Solids and Fluids', topic: 'Elastic Moduli and Hooke\'s Law', keywords: ['cube of side 10 cm', 'shearing', 'shearing stress', 'faces of a cube', 'forces of 10^5', 'young\'s modulus', 'bulk modulus', 'modulus of rigidity'] },

  // Laws of Motion & Work Power Energy
  { subject: 'Physics', chapter: 'Laws of Motion', topic: 'Friction', keywords: ['rough inclined plane', 'body of mass 2kg slides down', 'coefficient of kinetic friction', 'smooth 45', 'slide down', 'limiting friction'] },
  { subject: 'Physics', chapter: 'Kinematics', topic: 'Motion in a Straight Line', keywords: ['location q on a straight highway', 'highway is moving with speed', 'reach a point p in a field', 'straight line'] },
  { subject: 'Physics', chapter: 'Kinematics', topic: 'Projectile and Relative Motion', keywords: ['projectile is thrown', 'horizontal range', 'angle of projection', 'relative velocity'] },

  // Oscillations and Waves
  { subject: 'Physics', chapter: 'Oscillations and Waves', topic: 'Doppler Effect and Sound Waves', keywords: ['beats/second are heard', 'turning fork is sounded', 'turning fork', 'tuning fork', 'sonometer wire', 'organ pipe', 'doppler', 'sound waves'] },
  { subject: 'Physics', chapter: 'Oscillations and Waves', topic: 'Simple Harmonic Motion', keywords: ['two simple harmonic motions, as shown, are at right angles', 'lissajous figures', 'lissajous', 'simple harmonic motion', 'shm', 'time period of oscillation'] },

  // Modern Physics
  { subject: 'Physics', chapter: 'Modern Physics', topic: 'Photoelectric Effect and Dual Nature', keywords: ['de broglie wavelengths associated with a proton and an \\alpha-particle', 'stopping potential', 'work function', 'de broglie', 'wavelength', 'photoelectric', 'non-relativistic speeds'] },
  { subject: 'Physics', chapter: 'Modern Physics', topic: 'Atomic Models and Bohr Radius', keywords: ['muon', 'radius of first bohr orbit', 'bohr orbit', 'rydberg constant', 'energy levels'] },
  { subject: 'Physics', chapter: 'Modern Physics', topic: 'Radioactivity and Nuclear Reactions', keywords: ['unstable heavy nucleus at rest breaks into two nuclei', 'velocities in the ratio of 8 : 27', 'ratio of the radii of the nuclei', 'radioactive', 'half life', 'activity', 'decay', 'alpha decay', 'beta decay', 'nuclear'] },

  // Units, Dimensions
  { subject: 'Physics', chapter: 'Units, Dimensions and Measurements', topic: 'Units, Dimensions and Dimensional Analysis', keywords: ['quantum gravitational effects', 'planck length', 'combination of the fundamental physical constants', 'dimensions of', 'dimensional analysis'] },
  { subject: 'Physics', chapter: 'Units, Dimensions and Measurements', topic: 'Errors in Measurement', keywords: ['relative error', 'percentage error', 'determination of the surface area', 'volume is'] },

  // ==========================================
  // --- CHEMISTRY ---
  // ==========================================
  // Organic Compounds with Functional Groups
  { subject: 'Chemistry', chapter: 'Organic Compounds with Functional Groups', topic: 'Amines and Diazonium Salts', keywords: ['increasing order of diazotization', 'diazotization', 'zwitter ion', 'p-amino-phenol', 'amide', 'aniline', 'diazonium', 'amine'] },
  { subject: 'Chemistry', chapter: 'Organic Compounds with Functional Groups', topic: 'Carboxylic Acids and Derivatives', keywords: ['increasing order of the acidity of the following carboxylic acids', 'acidity of carboxylic acids', 'carboxylic acid', 'benzoic acid', 'ester'] },
  { subject: 'Chemistry', chapter: 'Organic Compounds with Functional Groups', topic: 'Aldehydes and Ketones (Nucleophilic Addition)', keywords: ['pcc (pyridinium chlorochromate)', 'pcc', 'pyridinium chlorochromate', 'secondary alcohols to ketones', 'aldehyde', 'ketone', 'nucleophilic addition'] },
  { subject: 'Chemistry', chapter: 'Organic Compounds with Functional Groups', topic: 'Alcohols, Phenols and Ethers', keywords: ['susceptible site for bond cleavage', 'strong acid', 'dehydrated to give alkene', 'phenol', 'acidic condition', 'alcohol', 'ether'] },
  { subject: 'Chemistry', chapter: 'Organic Compounds with Functional Groups', topic: 'Haloalkanes and Haloarenes (SN1, SN2)', keywords: ['cyclopentane', 'naoch3(1 eq.)', 'naoch3', 'sn1', 'sn2', 'elimination', 'haloalkane'] },

  // General Organic Chemistry & Hydrocarbons
  { subject: 'Chemistry', chapter: 'General Organic Chemistry', topic: 'IUPAC Nomenclature and Isomerism', keywords: ['optically active compounds formed', 'chirality', 'major product', 'reaction sequence', 'most polar compound', 'dipole moment', 'electrophilic'] },
  { subject: 'Chemistry', chapter: 'Hydrocarbons', topic: 'Alkanes, Alkenes and Alkynes', keywords: ['2-butyne is treated with h_2/lindlar', 'lindlar', '2-butyne', 'alkyne', 'alkene', 'alkane'] },

  // Biomolecules and Polymers
  { subject: 'Chemistry', chapter: 'Biomolecules and Polymers', topic: 'Carbohydrates and Amino Acids', keywords: ['dipeptide, gln-gly', 'dipeptide', 'gln-gly', 'glutamine', 'peptide bond', 'amino acid', 'glucose', 'fructose'] },
  { subject: 'Chemistry', chapter: 'Biomolecules and Polymers', topic: 'Polymers and Chemistry in Everyday Life', keywords: ['biochemical oxygen demand (bod)', 'bod value', 'water pollution', 'chain growth polymerization', 'nylon 6', 'homopoly-merisation', 'step-growth polyerisation', 'polymer'] },

  // Inorganic Chemistry & Coordination Compounds
  { subject: 'Chemistry', chapter: 'Inorganic Chemistry and Coordination Compounds', topic: 'p-Block Elements', keywords: ['p–o bonds', 'p-o bonds', 'p4o6', 'p_{4}o_{6}', 'p_4o_6', 'number of p', 'silicon tetrachloride', 'lithium aluminium hydride reacts with', 'group 13', 'xcl3', 'boron', 'dimerize', 'oxides of nitrogen', 'n2o3', 'n2o4'] },
  { subject: 'Chemistry', chapter: 'Inorganic Chemistry and Coordination Compounds', topic: 'Coordination Compounds and Isomerism', keywords: ['spin-only magnetic moments', 'square-planar [pt(cl)', 'coordination', 'ligand', 'chelate', 'ferrocyanide', 'chocolate coloured precipitate'] },
  { subject: 'Chemistry', chapter: 'Inorganic Chemistry and Coordination Compounds', topic: 'd- and f-Block Elements', keywords: ['leaching method, bauxite ore', 'bauxite ore is digested', 'extraction of copper', 'sulphide ore', 'oxidation of cuprous', 'metallurgy', 'dark green product', 'dark purple solution', 'kno3'] },

  // Periodic Properties & Chemical Bonding
  { subject: 'Chemistry', chapter: 'Periodic Properties and Chemical Bonding', topic: 'Molecular Orbital Theory', keywords: ['diagram of molecular orbital', 'molecular orbital', 'bond order', 'total electrons', 'sigma', 'pi', 'diamagnetic', 'paramagnetic'] },
  { subject: 'Chemistry', chapter: 'Periodic Properties and Chemical Bonding', topic: 'Hybridization', keywords: ['xeo_3f_2', 'xeo3f2', 'number of bond pair (s), \\pi-bond (s) and lone pair', 'shape and hybridization', 'geometry is represented', 'sp3', 'sp2', 'linear', 'tetrahedral'] },
  { subject: 'Chemistry', chapter: 'Periodic Properties and Chemical Bonding', topic: 'Periodic Trends (IE, EA, EN, Radii)', keywords: ['correct order of electron affinity', 'electron affinity', 'electron gain enthalpy', 'electronegativity', 'ionization energy'] },

  // Chemical Thermodynamics
  { subject: 'Chemistry', chapter: 'Chemical Thermodynamics', topic: 'Entropy and Gibbs Free Energy', keywords: ['\\delta_f g^\\circ at 500 k', '2fe_2o_3(s)', '\\delta_r g^\\circ', 'delta h', 'delta u', 'delta s', 'entropy is negative', 'spontaneous', 'gibbs free energy', 'delta g'] },

  // Chemical & Ionic Equilibrium
  { subject: 'Chemistry', chapter: 'Chemical and Ionic Equilibrium', topic: 'Acids, Bases and pH', keywords: ['mixing different volumes of naoh and hcl', 'four solutions are prepared by mixing', 'ph of', 'acids, bases and ph', 'neutralization'] },
  { subject: 'Chemistry', chapter: 'Chemical and Ionic Equilibrium', topic: 'Law of Mass Action and Le Chatelier', keywords: ['2 moles of carbon monoxide and 3 moles of chlorine', 'equilibrium constant', 'le chatelier', 'kp', 'kc'] },

  // Redox & Electrochemistry
  { subject: 'Chemistry', chapter: 'Redox Reactions and Electrochemistry', topic: 'Redox Reactions and Oxidation Number', keywords: ['in ko_2, the nature of oxygen species and the oxidation state', 'ko_2', 'ko2', 'oxidation state of oxygen', 'redox', 'oxidation number'] },

  // Solutions
  { subject: 'Chemistry', chapter: 'Solutions', topic: 'Raoult’s Law and Colligative Properties', keywords: ['two 5 molal solutions are prepared', 'non-electrolyte, non-volatile solute separately in the solv', 'non-volatile', 'non-electrolyte', 'vapour pressure', 'elevation in boiling', 'depression in freezing'] },

  // Chemical Kinetics & Surface Chemistry
  { subject: 'Chemistry', chapter: 'Chemical Kinetics and Surface Chemistry', topic: 'Rate Laws and Order of Reaction', keywords: ['for a first order reaction, a → p', 'first order', 'order of this reaction', 'half life period', 'decomposition', 'rate constant', '75 % of the reaction occurs'] },
  { subject: 'Chemistry', chapter: 'Chemical Kinetics and Surface Chemistry', topic: 'Adsorption and Catalysis', keywords: ['column chromato-graphy', 'column chromatography', 'adsorbed by m gram of adsorbent', 'plot of log', 'freundlich', 'catalyst', 'colloid', 'micelle'] },

  // Basic Concepts & Atomic Structure
  { subject: 'Chemistry', chapter: 'Some Basic Concepts of Chemistry', topic: 'Mole Concept and Stoichiometry', keywords: ['share the same crystal structure except', 'crystal structure', 'maximum quantity of n_2 gas is produced', 'thermal decomposition reactions', 'moles of', 'molar mass', 'stoichiometry'] },
  { subject: 'Chemistry', chapter: 'Atomic Structure', topic: 'Bohr Model', keywords: ['de-broglie\'s wavelength of electron present in first bohr orbit', 'first bohr orbit of \'h\' atom', 'bohr orbit', 'bohr model'] },

  // ==========================================
  // --- MATHEMATICS ---
  // ==========================================
  // Sets, Relations & Functions
  { subject: 'Mathematics', chapter: 'Sets, Relations and Functions', topic: 'Functions and Graphs', keywords: ['f : a → b be a function defined as', 'f(x) = \\frac{x-1}{x-2}', 'invertible and f^{-1}', 'function is invertible', 'inverse function', 'bijective', 'domain and range'] },
  { subject: 'Mathematics', chapter: 'Sets, Relations and Functions', topic: 'Sets and Relations', keywords: ['binary relations', 'r_1 =', 'natural numbers', 'relation on n'] },

  // Algebra
  { subject: 'Mathematics', chapter: 'Algebra', topic: 'Binomial Theorem', keywords: ['coefficient of x^{10}', 'in the expansion of (1 + x)', 'expansion of', 'binomial theorem', 'middle term'] },
  { subject: 'Mathematics', chapter: 'Algebra', topic: 'Quadratic Equations', keywords: ['f(x) is a quadratic expression such that f(1) + f(2) = 0', 'roots of the quadratic equation', 'roots of the equation', 'quadratic expression', 'discriminant'] },
  { subject: 'Mathematics', chapter: 'Algebra', topic: 'Permutations and Combinations', keywords: ['letters of the word barrack', 'four letter words that can be formed', 'permutations', 'combinations', 'digits'] },
  { subject: 'Mathematics', chapter: 'Algebra', topic: 'Complex Numbers', keywords: ['|z - 3 + 2i|', 'difference between the greatest value and the least value of |z|', '1+i\\sqrt{3}', 'least positive integer n', 'complex number', 'modulus', 'argument'] },
  { subject: 'Mathematics', chapter: 'Algebra', topic: 'Sequences and Series (AP, GP, HP)', keywords: ['a_n = \\left(\\frac{3}{4}\\right)', 'a, b, c are in a.p. and a^2, b^2, c^2 are in g.p.', 'in a.p.', 'be in a.p.', 'sum of the first 20 terms of the series', 'gp', 'harmonic progression'] },

  // Matrices & Determinants
  { subject: 'Mathematics', chapter: 'Matrices and Determinants', topic: 'Determinants and System of Linear Equations', keywords: ['system of linear equations', 'has no solution', 'cramer', 'determinant', 'infinitely many solutions'] },
  { subject: 'Mathematics', chapter: 'Matrices and Determinants', topic: 'Matrices Operations and Inverses', keywords: ['(a - 3i)(a - 5i) = o', 'non-singular matrix and', 'matrix', 'inverse of matrix', 'adjoint'] },

  // Differential Equations
  { subject: 'Mathematics', chapter: 'Differential Equations', topic: 'First Order Differential Equations', keywords: ['(x^2 - y^2) dx + 2xydy = 0', 'curve satisfying the differential equation', 'differential equation', 'integrating factor', 'dy/dx + py = q'] },

  // Probability & Statistics
  { subject: 'Mathematics', chapter: 'Probability and Statistics', topic: 'Conditional Probability and Bayes Theorem', keywords: ['player x has a biased coin', 'biased coin whose probability of showing heads is p', 'events', 'pair-wise independence', 'p (a', 'complement of an event', 'probability'] },
  { subject: 'Mathematics', chapter: 'Probability and Statistics', topic: 'Measures of Dispersion (Mean, Variance, Std Dev)', keywords: ['mean of the data : 7, 8, 9', 'variance of this data is', 'mean and the standard deviation', 's.d.', 'variance', 'dispersion'] },

  // Trigonometry & Reasoning
  { subject: 'Mathematics', chapter: 'Trigonometry and Mathematical Reasoning', topic: 'Mathematical Logic and Truth Tables', keywords: ['statement p :', 'sin 120^\\circ', 'truth values', 'tautology', 'contradiction', 'implies', '\\lor', '\\land', '\\sim'] },
  { subject: 'Mathematics', chapter: 'Trigonometry and Mathematical Reasoning', topic: 'Trigonometric Ratios and Equations', keywords: ['tower t_1 of height 60 m', 'tower t_1', 'tower t1', 'opposite to a tower', 'heights and distances', 'height 60 m', 'sin 3x = cos 2x', 'cos a', 'sin a', 'trigonometric', 'tan a'] },

  // Vector & 3D Geometry
  { subject: 'Mathematics', chapter: 'Vector Algebra and 3D Geometry', topic: 'Lines and Planes in 3D Space', keywords: ['plane bisects the line segment joining the points (1, 2, 3)', 'direction cosines are given by the equations, \\ell + 3m + 5n = 0', 'direction cosines', 'plane bisects', 'shortest distance', 'coplanar lines'] },
  { subject: 'Mathematics', chapter: 'Vector Algebra and 3D Geometry', topic: 'Vectors and Dot-Cross Products', keywords: ['position vectors of the vertices a, b and c', 'position vectors of the vertices', 'position vectors of', 'delta abc', '\\delta abc', 'vector \\vec{b}', 'dot product', 'cross product', '|\\vec{b}|', 'scalar triple'] },

  // Coordinate Geometry
  { subject: 'Mathematics', chapter: 'Coordinate Geometry', topic: 'Straight Lines', keywords: ['foot of the perpendicular drawn from the origin', 'sides of a rhombus abcd are parallel to the lines', 'point of intersection of the lines', 'locus of the point', 'straight line', 'slope'] },
  { subject: 'Mathematics', chapter: 'Coordinate Geometry', topic: 'Hyperbola', keywords: ['normal to the hyperbola, 4x^2 - 9y^2 = 36', 'hyperbola', 'asymptote', 'eccentricity of hyperbola'] },
  { subject: 'Mathematics', chapter: 'Coordinate Geometry', topic: 'Circles', keywords: ['tangent to the circle c_1', 'cuts off a chord of length 4', 'circle', 'chord of contact'] },
  { subject: 'Mathematics', chapter: 'Coordinate Geometry', topic: 'Parabola', keywords: ['tangents drawn from the point (-8, 0) to the parabola y^2 = 8x', 'parabola y^2 = 8x', 'parabola', 'latus rectum'] },
  { subject: 'Mathematics', chapter: 'Coordinate Geometry', topic: 'Ellipse', keywords: ['latus rectum of an ellipse', 'ellipse is 4 units', 'eccentricity', 'focus and its nearest vertex'] },

  // Differential Calculus
  { subject: 'Mathematics', chapter: 'Differential Calculus', topic: 'Differentiation and Chain Rule', keywords: ['f\'\\left(-\\frac{1}{2}\\right)', 'derivative', 'dy/dx', 'slope of tangent'] },
  { subject: 'Mathematics', chapter: 'Differential Calculus', topic: 'Maxima and Minima', keywords: ['polynomial of degree 4 having extreme values at x = 1 and x = 2', 'extreme values', 'maxima', 'minima'] },
  { subject: 'Mathematics', chapter: 'Differential Calculus', topic: 'Limits and Continuity', keywords: ['\\lim_{x \\to 0} \\frac{x \\tan 2x', 'value of k for which f(x) is continuous', 'lim_{x', 'lim_', 'limit', 'continuous', 'indeterminate form'] },

  // Integral Calculus
  { subject: 'Mathematics', chapter: 'Integral Calculus', topic: 'Indefinite Integration', keywords: ['\\int \\frac{2x + 5}{\\sqrt{7 - 6x - x^2}}', '\\int', 'tan x', 'integral', 'integration'] },
  { subject: 'Mathematics', chapter: 'Integral Calculus', topic: 'Definite Integration and Properties', keywords: ['\\int_{\\frac{\\pi}{4}}^{\\frac{3\\pi}{4}} \\frac{x}{1 + \\sin x}', 'i_1 = \\int_{0}^{1} e^{-x} \\cos^2 x', 'definite integral', 'properties of definite integral'] }
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

  // 3. Find topic ID in allTopics (exact name -> partial name -> chapter match)
  if (bestMatch && allTopics.length > 0) {
    const subjectTopics = allTopics.filter(t => t.subject?.toLowerCase() === bestMatch.subject.toLowerCase());
    
    // Stage 1: Exact topic name match
    let matchedTopic = subjectTopics.find(t =>
      t.name?.toLowerCase() === bestMatch.topic.toLowerCase()
    );

    // Stage 2: Loose / partial topic name match
    if (!matchedTopic) {
      matchedTopic = subjectTopics.find(t =>
        t.name?.toLowerCase().includes(bestMatch.topic.toLowerCase()) ||
        bestMatch.topic.toLowerCase().includes(t.name?.toLowerCase())
      );
    }

    // Stage 3: Chapter match
    if (!matchedTopic) {
      matchedTopic = subjectTopics.find(t =>
        t.chapter?.toLowerCase() === bestMatch.chapter.toLowerCase()
      );
    }

    if (matchedTopic) {
      return {
        subject: bestMatch.subject,
        chapter: matchedTopic.chapter || bestMatch.chapter,
        topicName: matchedTopic.name || bestMatch.topic,
        topicId: matchedTopic.id,
        confidence: highestScore >= 8 ? 'HIGH' : 'MEDIUM'
      };
    }
  }

  // If no match found, do NOT blindly assign to the first topic of the subject (e.g. Kinematics).
  // Return null topicId so admins or the AI agent can classify it accurately.
  return {
    subject: targetSubject,
    chapter: null,
    topicName: null,
    topicId: null,
    confidence: 'NONE'
  };
}
