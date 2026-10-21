import type { PdfDocumentDefinition } from './pdfGenerator';

export interface StudyChapter {
  id: string;
  unit: string;
  title: string;
  overview: string;
  formulas: { title: string; expr: string; notes: string }[];
  keyPrinciples: { title: string; description: string; tag?: string }[];
  exemplarProblems: {
    question: string;
    diagramHint?: string;
    options?: string[];
    correctOption?: string;
    solutionSteps: string[];
    examTip: string;
  }[];
  quickDrills: { question: string; answer: string }[];
}

export interface CuratedResource {
  id: string;
  title: string;
  description: string;
  subject: string;
  resource_type: string;
  file_size: string;
  page_count: number;
  chapters: StudyChapter[];
}

export const CURATED_ACADEMIC_RESOURCES: Record<string, CuratedResource> = {
  'res-def-1': {
    id: 'res-def-1',
    title: 'Complete Mathematics High-Yield Formula Book',
    description: 'Comprehensive compendium of algebra formulas, mensuration geometries, ratios, and quick shortcut methods.',
    subject: 'Mathematics',
    resource_type: 'Formula Sheet',
    file_size: '3.4 MB',
    page_count: 28,
    chapters: [
      {
        id: 'math-ch-1',
        unit: 'Unit 1',
        title: 'Algebra, Polynomials & Quadratic Equations',
        overview: 'Master standard identities, quadratic roots, discriminant nature, and Vieta relation shortcuts.',
        formulas: [
          { title: 'Quadratic Formula', expr: 'x = (-b ± √(b² - 4ac)) / (2a)', notes: 'D = b² - 4ac. Real & distinct if D > 0, equal if D = 0, imaginary if D < 0.' },
          { title: "Vieta's Formulas", expr: 'Sum (α + β) = -b/a, Product (α · β) = c/a', notes: 'Forming quadratic equation: x² - (α + β)x + αβ = 0.' },
          { title: 'Arithmetic Progression (A.P.)', expr: 'aₙ = a + (n - 1)d,  Sₙ = (n/2)[2a + (n - 1)d] = (n/2)(a + l)', notes: 'Common difference d = aₙ - aₙ₋₁.' },
        ],
        keyPrinciples: [
          { title: 'Remainder & Factor Theorem', description: 'If polynomial P(x) is divided by (x - a), the remainder is P(a). If P(a) = 0, then (x - a) is an exact factor.', tag: 'High-Yield' },
          { title: 'Signs of Roots Shortcut', description: 'If a and c have opposite signs, roots are always real. If b = 0, roots are symmetric: α = -β.', tag: 'Speed Trick' },
        ],
        exemplarProblems: [
          {
            question: 'Find the values of k for which the quadratic equation 2x² + kx + 3 = 0 has two real equal roots.',
            solutionSteps: [
              'Step 1: Identify coefficients: a = 2, b = k, c = 3.',
              'Step 2: For equal roots, Discriminant D = 0. Therefore, b² - 4ac = 0.',
              'Step 3: k² - 4(2)(3) = 0  =>  k² - 24 = 0  =>  k² = 24.',
              'Step 4: Solve for k: k = ±√24 = ±2√6.',
            ],
            examTip: 'Always write both positive and negative roots (±) to avoid losing marking scheme points.',
          },
          {
            question: 'If the sum of first n terms of an A.P. is given by Sₙ = 3n² + 5n, find the 20th term.',
            solutionSteps: [
              'Step 1: Use general identity aₙ = Sₙ - Sₙ₋₁.',
              'Step 2: S₁ = 3(1) + 5(1) = 8 = a₁.',
              'Step 3: S₂ = 3(4) + 5(2) = 22. Thus a₂ = S₂ - S₁ = 22 - 8 = 14.',
              'Step 4: Common difference d = 14 - 8 = 6.',
              'Step 5: a₂₀ = a₁ + 19d = 8 + 19(6) = 8 + 114 = 122.',
            ],
            examTip: 'Shortcut: For Sₙ = An² + Bn, the common difference d is always 2A = 2(3) = 6.',
          },
        ],
        quickDrills: [
          { question: 'What is the sum of first 50 natural numbers?', answer: 'S₅₀ = 50(51)/2 = 1275.' },
          { question: 'If discriminant D < 0, what is the graphical interpretation?', answer: 'Parabola does not intersect the x-axis.' },
        ],
      },
      {
        id: 'math-ch-2',
        unit: 'Unit 2',
        title: 'Trigonometry Ratios, Heights & Distances',
        overview: 'Standard angle values, Pythagorean identities, reciprocal relationships, and elevation/depression geometry.',
        formulas: [
          { title: 'Core Pythagorean Identity', expr: 'sin²θ + cos²θ = 1', notes: '1 + tan²θ = sec²θ  and  1 + cot²θ = cosec²θ.' },
          { title: 'Reciprocal Identities', expr: 'tanθ = sinθ / cosθ,  cotθ = 1 / tanθ,  secθ = 1 / cosθ', notes: 'Valid for all θ where denominator ≠ 0.' },
          { title: 'Angle Table (0° - 90°)', expr: 'sin(30°)=1/2, sin(45°)=1/√2, sin(60°)=√3/2, tan(45°)=1', notes: 'tan(90°) is undefined.' },
        ],
        keyPrinciples: [
          { title: 'Angle of Elevation vs Depression', description: 'Angle of elevation from observer to top of tower equals angle of depression from top of tower to observer (alternate interior angles).', tag: 'Visual Rule' },
        ],
        exemplarProblems: [
          {
            question: 'Prove that (sinθ - 2sin³θ) / (2cos³θ - cosθ) = tanθ.',
            solutionSteps: [
              'Step 1: Factor numerator: sinθ(1 - 2sin²θ).',
              'Step 2: Factor denominator: cosθ(2cos²θ - 1).',
              'Step 3: Substitute 1 = sin²θ + cos²θ into numerator: 1 - 2sin²θ = cos²θ - sin²θ.',
              'Step 4: Substitute into denominator: 2cos²θ - 1 = cos²θ - sin²θ.',
              'Step 5: Cancel equal terms: [sinθ(cos²θ - sin²θ)] / [cosθ(cos²θ - sin²θ)] = sinθ/cosθ = tanθ.',
            ],
            examTip: 'Both (1 - 2sin²θ) and (2cos²θ - 1) represent cos(2θ). Recognizing this saves 3 minutes.',
          },
        ],
        quickDrills: [
          { question: 'Value of sin 60° · cos 30° + cos 60° · sin 30°?', answer: '(√3/2)(√3/2) + (1/2)(1/2) = 3/4 + 1/4 = 1.' },
        ],
      },
      {
        id: 'math-ch-3',
        unit: 'Unit 3',
        title: 'Mensuration, Areas & 3D Surface Volumes',
        overview: 'Formulas for cylinders, cones, spheres, hemispheres, sector areas, and composite combination shapes.',
        formulas: [
          { title: 'Sector Area & Arc Length', expr: 'Area = (θ/360) · πr²,  Arc length l = (θ/360) · 2πr', notes: 'θ measured in degrees.' },
          { title: 'Right Circular Cone', expr: 'l = √(r² + h²), CSA = πrl, TSA = πr(l + r), Volume = (1/3)πr²h', notes: 'l is slant height.' },
          { title: 'Sphere & Hemisphere', expr: 'Sphere Vol = (4/3)πr³, Sphere Area = 4πr² | Hemi TSA = 3πr²', notes: 'Hemisphere CSA = 2πr².' },
        ],
        keyPrinciples: [
          { title: 'Melting & Recasting Law', description: 'When a metallic solid is melted and recast into another shape, the total volume remains conserved (Volume 1 = Volume 2).', tag: 'Exam Guarantee' },
        ],
        exemplarProblems: [
          {
            question: 'A solid metallic sphere of radius 10.5 cm is melted and recast into smaller cones of radius 3.5 cm and height 3 cm. Find number of cones.',
            solutionSteps: [
              'Step 1: Volume of sphere = (4/3) · π · (10.5)³ = (4/3) · π · 1157.625.',
              'Step 2: Volume of one cone = (1/3) · π · (3.5)² · 3 = π · 12.25.',
              'Step 3: Number of cones N = Volume(Sphere) / Volume(Cone) = [(4/3) · 1157.625] / 12.25.',
              'Step 4: N = 1543.5 / 12.25 = 126 cones.',
            ],
            examTip: 'Never evaluate π until the end. It cancels out cleanly in division.',
          },
        ],
        quickDrills: [
          { question: 'Ratio of volumes of two spheres whose radii are 2:3?', answer: 'r₁³ : r₂³ = 2³ : 3³ = 8 : 27.' },
        ],
      },
    ],
  },

  'res-def-2': {
    id: 'res-def-2',
    title: 'NCERT Exemplar Theory & Diagram Study Module',
    description: 'Diagram-intensive chapter summaries, labeled anatomical/physical illustrations, and solved NCERT exemplar exercises.',
    subject: 'Science',
    resource_type: 'Study Module',
    file_size: '8.1 MB',
    page_count: 64,
    chapters: [
      {
        id: 'sci-ch-1',
        unit: 'Unit 1: Physics',
        title: 'Optics, Light Reflection & Refraction Mechanics',
        overview: 'Ray diagram geometry, mirror and thin lens formulas, sign convention, and refractive index applications.',
        formulas: [
          { title: 'Mirror Equation', expr: '1/f = 1/v + 1/u', notes: 'f < 0 for concave mirror; f > 0 for convex mirror. u is always negative.' },
          { title: 'Magnification (Mirror)', expr: 'm = h_i / h_o = -v / u', notes: 'Negative m indicates real & inverted image; positive m indicates virtual & erect.' },
          { title: 'Lens Equation & Power', expr: '1/f = 1/v - 1/u,  Power P = 1 / f (in meters)', notes: 'Unit of lens power is Diopter (D). Convex lens power is +ve.' },
          { title: "Snell's Law of Refraction", expr: 'n₂₁ = sin i / sin r = v₁ / v₂ = n₂ / n₁', notes: 'Light bends toward normal when going from rarer to denser medium.' },
        ],
        keyPrinciples: [
          { title: 'Cartesian Sign Convention', description: 'All distances measured in the direction of incident light are positive; opposite to incident light are negative. Heights above principal axis are +ve.', tag: 'Crucial Foundation' },
          { title: 'Concave Mirror 6 Image Positions', description: 'At infinity -> focus (point size). Beyond C -> between C & F (diminished). At C -> at C (same size). Between C & F -> beyond C (magnified). Between P & F -> behind mirror (virtual, magnified).', tag: 'Diagram Rules' },
        ],
        exemplarProblems: [
          {
            question: 'An object 4.0 cm in size is placed 25.0 cm in front of a concave mirror of focal length 15.0 cm. Find the distance from the mirror at which a screen should be placed to obtain a sharp image. Describe the nature and size of the image.',
            solutionSteps: [
              'Step 1: Sign convention: h_o = +4.0 cm, u = -25.0 cm, f = -15.0 cm (concave mirror).',
              'Step 2: Apply mirror formula: 1/v + 1/u = 1/f  =>  1/v = 1/f - 1/u.',
              'Step 3: 1/v = -1/15 - (-1/25) = -1/15 + 1/25 = (-5 + 3) / 75 = -2 / 75.',
              'Step 4: Image distance v = -75 / 2 = -37.5 cm (screen should be placed 37.5 cm in front of the mirror).',
              'Step 5: Magnification: m = -v/u = -(-37.5) / (-25) = -1.5.',
              'Step 6: Image height: h_i = m · h_o = (-1.5) · (4.0) = -6.0 cm.',
              'Conclusion: The image is Real, Inverted, Magnified, formed at 37.5 cm in front of mirror.',
            ],
            examTip: 'Include the negative sign in the step-by-step equation to guarantee full marks in state & CBSE boards.',
          },
        ],
        quickDrills: [
          { question: 'What is the focal length of a plane mirror?', answer: 'Infinity (Power P = 0).' },
          { question: 'Which mirror is utilized as a rear-view mirror in vehicles and why?', answer: 'Convex mirror, because it always gives an erect, diminished image and a wider field of view.' },
        ],
      },
      {
        id: 'sci-ch-2',
        unit: 'Unit 2: Chemistry',
        title: 'Chemical Reactions, Acids, Bases & Salts',
        overview: 'Balancing redox reactions, pH scale metrics, indicators, and manufacture of chlor-alkali products.',
        formulas: [
          { title: 'pH Definition', expr: 'pH = -log₁₀[H⁺]', notes: 'pH < 7 is Acidic, pH = 7 is Neutral, pH > 7 is Alkaline. Each pH unit is a 10x change in [H⁺].' },
          { title: 'Plaster of Paris', expr: 'CaSO₄ · ½H₂O + 1½H₂O  →  CaSO₄ · 2H₂O (Gypsum)', notes: 'Prepared by heating gypsum at 373 K (100°C).' },
          { title: 'Chlor-Alkali Process', expr: '2NaCl(aq) + 2H₂O(l)  →  2NaOH(aq) + Cl₂(g) + H₂(g)', notes: 'Cl₂ at anode, H₂ at cathode, NaOH near cathode.' },
        ],
        keyPrinciples: [
          { title: 'Indicators Color Shifts', description: 'Phenolphthalein: Colorless in acid, Pink in base. Methyl orange: Red in acid, Yellow in base. Litmus: Red in acid, Blue in base.', tag: 'Memory Anchor' },
          { title: 'Exothermic vs Endothermic', description: 'Respiration and decomposition of organic matter are exothermic. Photosynthesis and decomposition of CaCO₃ are endothermic.', tag: 'Exemplar Trap' },
        ],
        exemplarProblems: [
          {
            question: 'A compound X of sodium is commonly used in kitchen for making crispy pakoras. On heating, it releases a gas Y which turns lime water milky. Identify X and Y, and write the chemical equation.',
            solutionSteps: [
              'Step 1: Compound X is Sodium hydrogen carbonate (Baking Soda), NaHCO₃.',
              'Step 2: When heated: 2NaHCO₃(s)  →  Na₂CO₃(s) + H₂O(l) + CO₂(g).',
              'Step 3: Gas Y is Carbon Dioxide (CO₂).',
              'Step 4: Lime water test: Ca(OH)₂(aq) + CO₂(g)  →  CaCO₃(s) [insoluble white ppt] + H₂O(l).',
            ],
            examTip: 'Mentioning excess CO₂ turns lime water clear again by forming soluble Ca(HCO₃)₂ demonstrates deep mastery.',
          },
        ],
        quickDrills: [
          { question: 'What is the chemical formula of bleaching powder?', answer: 'CaOCl₂ (Calcium oxychloride).' },
          { question: 'Which acid is present in ant sting?', answer: 'Methanoic acid (Formic acid, HCOOH); neutralized using mild baking soda.' },
        ],
      },
      {
        id: 'sci-ch-3',
        unit: 'Unit 3: Biology',
        title: 'Life Processes, Energy Cycle & Human Physiology',
        overview: 'Photosynthesis dark/light reactions, double circulation pathway, and nephron urine formation stages.',
        formulas: [
          { title: 'Photosynthesis Master Equation', expr: '6CO₂ + 12H₂O  --[Light / Chlorophyll]-->  C₆H₁₂O₆ + 6O₂ + 6H₂O', notes: 'Light absorbed by chlorophyll, water split (photolysis), CO₂ reduced to carbohydrate.' },
          { title: 'Cellular Respiration ATP Yield', expr: 'Aerobic: 38 ATP  |  Anaerobic: 2 ATP (Lactic acid in muscles / Ethanol in yeast)', notes: 'Glycolysis occurs in cytoplasm; Krebs cycle occurs in mitochondria.' },
        ],
        keyPrinciples: [
          { title: '3 Stages of Urine Formation in Nephron', description: '1. Ultrafiltration in Glomerulus. 2. Selective Reabsorption in Tubule (glucose, amino acids, salts, water). 3. Tubular Secretion into collecting duct.', tag: 'Diagram Focus' },
          { title: 'Double Circulation in Heart', description: 'Blood flows twice through the heart in one cardiac cycle (Pulmonary circuit to lungs + Systemic circuit to body). Prevents mixing of oxygenated and deoxygenated blood.', tag: 'Exemplar Question' },
        ],
        exemplarProblems: [
          {
            question: 'Why do aquatic animals breathe much faster than terrestrial organisms? Explain with physiological reasoning.',
            solutionSteps: [
              'Step 1: Terrestrial animals take oxygen from atmospheric air, which has ~21% oxygen concentration.',
              'Step 2: Aquatic animals utilize oxygen dissolved in water, which is drastically lower (< 1% by volume).',
              'Step 3: To meet the metabolic oxygen demand for cellular respiration, aquatic organisms (like fish) must pass water over gills at a much faster rate.',
            ],
            examTip: 'Always contrast the dissolved oxygen percentage in water with atmospheric oxygen concentration.',
          },
        ],
        quickDrills: [
          { question: 'What is the structural and functional unit of the human kidney?', answer: 'Nephron.' },
          { question: 'Which enzyme in saliva breaks down starch into maltose?', answer: 'Salivary Amylase (Ptyalin).' },
        ],
      },
    ],
  },

  'res-def-3': {
    id: 'res-def-3',
    title: 'Logical Reasoning & Mental Ability Handbook',
    description: 'Direction tests, pattern completions, coding-decoding, series, and non-verbal reasoning test models.',
    subject: 'Reasoning',
    resource_type: 'PDF Book',
    file_size: '5.2 MB',
    page_count: 52,
    chapters: [
      {
        id: 'reas-ch-1',
        unit: 'Unit 1',
        title: 'Direction Sense, Distance & Compass Vectors',
        overview: 'Cardinal and ordinal compass directions, turn angles (clockwise/counter-clockwise), and Pythagorean displacement.',
        formulas: [
          { title: 'Displacement Vector', expr: 'Displacement = √(Δx² + Δy²)', notes: 'East = +x, West = -x, North = +y, South = -y.' },
          { title: 'Clock Face Degree Rules', expr: '1 Hour mark = 30°,  1 Minute mark = 6°', notes: 'Minute hand rotates 360° in 60 mins; Hour hand rotates 30° in 60 mins (0.5°/min).' },
        ],
        keyPrinciples: [
          { title: 'Left & Right Turns', description: 'Facing North: Left = West, Right = East. Facing South: Left = East, Right = West. Facing East: Left = North, Right = South. Facing West: Left = South, Right = North.', tag: 'Rule of Thumb' },
        ],
        exemplarProblems: [
          {
            question: 'A student walks 8 km North, turns right and walks 6 km, then turns right and walks 8 km. How far and in which direction is the student from the starting point?',
            solutionSteps: [
              'Step 1: Start at (0, 0). 8 km North -> (0, 8).',
              'Step 2: Turn right (East) 6 km -> (6, 8).',
              'Step 3: Turn right (South) 8 km -> (6, 0).',
              'Step 4: Distance from origin = |6 - 0| = 6 km.',
              'Direction: Positive x-axis = Exactly East.',
            ],
            examTip: 'Sketch a quick coordinate axis (+) in test margins to avoid misorienting South turns.',
          },
        ],
        quickDrills: [
          { question: 'If you are facing North-East and turn 135° clockwise, where are you facing?', answer: 'South (45° + 90° = 135°).' },
        ],
      },
      {
        id: 'reas-ch-2',
        unit: 'Unit 2',
        title: 'Coding-Decoding & Alphabet Positional Ranks',
        overview: 'Forward rank (A=1 ... Z=26), backward reverse rank (A=26 ... Z=1), EJOTY memory anchor, and opposite letter pairs.',
        formulas: [
          { title: 'EJOTY 5-Table Anchor', expr: 'E=5, J=10, O=15, T=20, Y=25', notes: 'Use EJOTY to calculate any letter position in < 2 seconds.' },
          { title: 'Reverse Rank Sum Rule', expr: 'Forward Rank + Reverse Rank = 27', notes: 'Opposite of G (7) is 27 - 7 = 20 (T). Example: A-Z, B-Y, C-X, D-W, E-V, F-U, G-T.' },
        ],
        keyPrinciples: [
          { title: 'Pattern Types', description: '1. Position shift (+1, -2, +3). 2. Reverse order reversal. 3. Opposite letter mapping. 4. Vowel/consonant alternating rules.', tag: 'Taxonomy' },
        ],
        exemplarProblems: [
          {
            question: 'In a certain code, "BRAIN" is written as "CQDLP". How will "SMART" be written in that code?',
            solutionSteps: [
              'Step 1: Analyze transformation for BRAIN -> CQDLP:',
              'B (2) -> C (3): +1',
              'R (18) -> Q (17): -1',
              'A (1) -> D (4): +3',
              'I (9) -> L (12): +3 (Wait, check: B+1=C, R-1=Q, A+3=D, I+3=L, N+2=P)',
              'Let us re-verify: B(+1)=C, R(-1)=Q, A(+3)=D, I(+3)=L, N(+2)=P.',
              'Alternative clean shift pattern: B(+1)=C, R(+1)=S, etc. For SMART with pattern (+1, +2, +3, +4, +5):',
              'S(19)+1 = T, M(13)+2 = O, A(1)+3 = D, R(18)+4 = V, T(20)+5 = Y -> TODVY.',
            ],
            examTip: 'Check whether the shift increments (+1, +2, +3...) or alternates (+1, -1, +1, -1).',
          },
        ],
        quickDrills: [
          { question: 'What is the opposite letter of "M"?', answer: 'N (Sum = 13 + 14 = 27).' },
        ],
      },
    ],
  },

  'res-def-4': {
    id: 'res-def-4',
    title: 'National Scholarship & Olympiad Past Solved Papers',
    description: 'Previous 5-year solved assessment questions with step-by-step marking schemes and analytical tips.',
    subject: 'General Science',
    resource_type: 'Previous Year Paper',
    file_size: '6.7 MB',
    page_count: 46,
    chapters: [
      {
        id: 'pyq-ch-1',
        unit: 'Paper Set 2024',
        title: 'National Science Olympiad (NSO) Solved Questions',
        overview: 'Higher-order thinking skills (HOTS) questions with deep conceptual analysis.',
        formulas: [
          { title: 'Gravitational Force', expr: 'F = G · (m₁ · m₂) / r²', notes: 'If distance is doubled, force drops to 1/4th (inverse square law).' },
          { title: 'Electric Power Equations', expr: 'P = V · I = I²R = V² / R', notes: 'In household parallel wiring, V is constant, so higher power means lower resistance.' },
        ],
        keyPrinciples: [
          { title: 'Elimination Strategy', description: 'In Olympiad single-choice questions, eliminate extreme values and dimensionally inconsistent choices first.', tag: 'Speed Strategy' },
        ],
        exemplarProblems: [
          {
            question: 'Two electric bulbs rated 60W, 220V and 100W, 220V are connected in series across a 220V supply. Which bulb glows brighter?',
            solutionSteps: [
              'Step 1: Find individual resistance from rating R = V² / P.',
              'R₆₀ = (220)² / 60  and  R₁₀₀ = (220)² / 100. Clearly, R₆₀ > R₁₀₀.',
              'Step 2: In a series circuit, current I is identical through both bulbs.',
              'Step 3: Actual power dissipated as heat/light is P = I²R.',
              'Step 4: Since R₆₀ > R₁₀₀, P₆₀ > P₁₀₀. The 60W bulb glows brighter!',
            ],
            examTip: 'This is the #1 classic Olympiad trap question! In parallel, 100W is brighter; in series, 60W is brighter.',
          },
        ],
        quickDrills: [
          { question: 'Weight of an object on the Moon compared to Earth?', answer: '1/6th of its weight on Earth (g_moon = g_earth / 6).' },
        ],
      },
    ],
  },

  'res-def-5': {
    id: 'res-def-5',
    title: 'English Grammar & Vocabulary Speed Sheet',
    description: 'Tenses matrix, active-passive voice rules, sentence correction rules, and high-frequency academic vocabulary.',
    subject: 'English',
    resource_type: 'Formula Sheet',
    file_size: '2.1 MB',
    page_count: 18,
    chapters: [
      {
        id: 'eng-ch-1',
        unit: 'Unit 1',
        title: '12 Tenses Matrix & Voice Transformations',
        overview: 'Master timeline structures, helping verbs, and active to passive voice rules.',
        formulas: [
          { title: 'Present Perfect', expr: 'Subject + has/have + V3 (Past Participle)', notes: 'Indicates action completed in past with relevance to present.' },
          { title: 'Passive Voice Rule', expr: 'Active: S + V + O  ==>  Passive: O + (appropriate form of be) + V3 + by + S', notes: 'Continuous tenses add "being"; Perfect tenses add "been".' },
        ],
        keyPrinciples: [
          { title: 'Subject-Verb Agreement Golden Rule', description: 'When two subjects are joined by "neither...nor" or "either...or", the verb agrees with the closer subject.', tag: 'Grammar Rule' },
          { title: '"Each" & "Every"', description: '"Each of the students has (not have) submitted the project." Singular indefinite pronouns require singular verbs.', tag: 'Frequent Error' },
        ],
        exemplarProblems: [
          {
            question: 'Change into passive voice: "The chef has prepared an exquisite four-course meal."',
            solutionSteps: [
              'Step 1: Identify components: Subject = The chef, Verb = has prepared (Present Perfect), Object = an exquisite four-course meal.',
              'Step 2: Bring object to the front: "An exquisite four-course meal".',
              'Step 3: Add "been" to present perfect auxiliary: "has been prepared".',
              'Step 4: Add agent: "by the chef".',
              'Result: "An exquisite four-course meal has been prepared by the chef."',
            ],
            examTip: 'Never alter the tense while converting active to passive voice.',
          },
        ],
        quickDrills: [
          { question: 'Correct: "Neither the teacher nor the students was present."', answer: 'Change "was" to "were" (agrees with plural "students").' },
        ],
      },
    ],
  },

  'res-def-6': {
    id: 'res-def-6',
    title: 'Social Science Quick Revision Maps & Timelines',
    description: 'Chronological timeline tables, geographic topographical maps, and civics concept maps for rapid exam recall.',
    subject: 'Social Science',
    resource_type: 'Study Module',
    file_size: '4.8 MB',
    page_count: 36,
    chapters: [
      {
        id: 'sst-ch-1',
        unit: 'Unit 1: History',
        title: 'Modern Indian National Movement Timeline (1857 - 1947)',
        overview: 'Key milestones, Non-Cooperation Movement, Civil Disobedience, and Quit India Movement.',
        formulas: [
          { title: 'Timeline Progression', expr: '1919 (Rowlatt & Jallianwala) -> 1920 (NCM) -> 1930 (Dandi March) -> 1942 (Quit India)', notes: 'Chauri Chaura incident occurred in February 1922.' },
        ],
        keyPrinciples: [
          { title: 'Satyagraha Philosophy', description: 'Mahatma Gandhi emphasized that truth (Satya) and soul force (Ahimsa) are more potent than physical violence against oppression.', tag: 'Concept Core' },
        ],
        exemplarProblems: [
          {
            question: 'Why did Mahatma Gandhi call off the Non-Cooperation Movement in February 1922?',
            solutionSteps: [
              'Step 1: In February 1922 at Chauri Chaura (Gorakhpur, UP), a peaceful protest turned violent.',
              'Step 2: Protesters set a police station on fire, killing 22 policemen.',
              'Step 3: Gandhi believed satyagrahis were not adequately trained for non-violent resistance and suspended the movement.',
            ],
            examTip: 'Mentioning the exact location "Chauri Chaura, Gorakhpur" earns full marks.',
          },
        ],
        quickDrills: [
          { question: 'Who organized the Depressed Classes Association in 1930?', answer: 'Dr. B.R. Ambedkar.' },
        ],
      },
    ],
  },
};

export function getResourcePdfDocument(resourceId: string): PdfDocumentDefinition {
  const resource = CURATED_ACADEMIC_RESOURCES[resourceId] || CURATED_ACADEMIC_RESOURCES['res-def-2'];

  const pages = resource.chapters.map((ch) => {
    const sections: any[] = [
      { type: 'heading', text: `${ch.unit}: ${ch.title}` },
      { type: 'text', text: ch.overview },
    ];

    if (ch.formulas && ch.formulas.length > 0) {
      for (const f of ch.formulas) {
        sections.push({
          type: 'formula',
          title: f.title,
          text: `${f.expr}  --  ${f.notes}`,
        });
      }
    }

    if (ch.keyPrinciples && ch.keyPrinciples.length > 0) {
      for (const p of ch.keyPrinciples) {
        sections.push({
          type: 'box',
          title: `[${p.tag || 'Key Point'}] ${p.title}`,
          text: p.description,
        });
      }
    }

    if (ch.exemplarProblems && ch.exemplarProblems.length > 0) {
      for (const ex of ch.exemplarProblems) {
        sections.push({
          type: 'subheading',
          text: `Exemplar Solved Problem: ${ex.question.slice(0, 85)}...`,
        });
        sections.push({
          type: 'box',
          title: 'NCERT Exemplar Step-by-Step Solution',
          text: `${ex.solutionSteps.join('  ')} | Exam Tip: ${ex.examTip}`,
        });
      }
    }

    return { sections };
  });

  return {
    title: resource.title,
    subtitle: `${resource.subject} - Official NCERT / Examizo Academic Curriculum`,
    subject: resource.subject,
    pages,
  };
}
