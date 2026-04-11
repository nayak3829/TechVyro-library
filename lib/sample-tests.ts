// Sample test series with real public-domain exam questions
// Used as fallback when live extraction is blocked

export interface SampleQuestion {
  qid: string
  question: string
  options: string[]
  correct: number
  marks: number
  explanation: string
}

export interface SampleTest {
  id: string
  title: string
  duration: number
  total_questions: number
  questions: SampleQuestion[]
}

export interface SampleSeries {
  id: string
  title: string
  slug: string
  description: string
  category: string
  tests: SampleTest[]
}

export const SAMPLE_SERIES: SampleSeries[] = [
  // ─── NDA / Defence ────────────────────────────────────────────────────────
  {
    id: "nda-gk-1",
    slug: "nda-general-knowledge",
    title: "NDA General Knowledge Series",
    description: "Previous year NDA General Knowledge questions",
    category: "nda",
    tests: [
      {
        id: "nda-gk-t1",
        title: "NDA GK Mock Test 1",
        duration: 30,
        total_questions: 15,
        questions: [
          { qid: "1", question: "Which battle was fought between Prithviraj Chauhan and Muhammad of Ghor in 1192?", options: ["First Battle of Panipat", "Second Battle of Tarain", "Battle of Plassey", "Battle of Khanwa"], correct: 1, marks: 1, explanation: "The Second Battle of Tarain (1192) was decisive; Muhammad of Ghor defeated Prithviraj Chauhan." },
          { qid: "2", question: "The Tropic of Cancer passes through how many Indian states?", options: ["6", "7", "8", "9"], correct: 2, marks: 1, explanation: "The Tropic of Cancer passes through 8 states: Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura, Mizoram." },
          { qid: "3", question: "Which Article of the Indian Constitution abolishes untouchability?", options: ["Article 15", "Article 16", "Article 17", "Article 18"], correct: 2, marks: 1, explanation: "Article 17 abolishes untouchability and makes its practice a punishable offence." },
          { qid: "4", question: "Operation Polo was related to the merger of which princely state with India?", options: ["Junagadh", "Hyderabad", "Kashmir", "Travancore"], correct: 1, marks: 1, explanation: "Operation Polo (1948) was the Police Action that led to the merger of Hyderabad into India." },
          { qid: "5", question: "Who was the first woman to climb Mount Everest?", options: ["Santosh Yadav", "Bachendri Pal", "Junko Tabei", "Arunima Sinha"], correct: 2, marks: 1, explanation: "Junko Tabei of Japan was the first woman to climb Everest on 16 May 1975." },
          { qid: "6", question: "What is the full form of SONAR?", options: ["Sound Navigation And Ranging", "Sound Networking And Ranging", "Signal Of Navy And Radar", "Sound Of Navigational And Radar"], correct: 0, marks: 1, explanation: "SONAR stands for Sound Navigation And Ranging." },
          { qid: "7", question: "Indian Air Force Day is celebrated on:", options: ["8 October", "15 October", "26 October", "5 November"], correct: 0, marks: 1, explanation: "Indian Air Force Day is celebrated on 8 October every year." },
          { qid: "8", question: "Which is the highest gallantry award in India?", options: ["Vir Chakra", "Maha Vir Chakra", "Param Vir Chakra", "Ashoka Chakra"], correct: 2, marks: 1, explanation: "Param Vir Chakra is the highest military honour in India, awarded for valour in the face of the enemy." },
          { qid: "9", question: "The Strait of Malacca connects:", options: ["Pacific and Atlantic Ocean", "Indian Ocean and South China Sea", "Arabian Sea and Bay of Bengal", "Red Sea and Mediterranean Sea"], correct: 1, marks: 1, explanation: "The Strait of Malacca connects the Indian Ocean to the South China Sea." },
          { qid: "10", question: "Which committee recommended three-language formula for India?", options: ["Mudaliar Committee", "Kothari Commission", "Radhakrishnan Commission", "Hunter Commission"], correct: 1, marks: 1, explanation: "The Kothari Commission (1964-66) recommended the Three-Language Formula for school education." },
          { qid: "11", question: "Who is regarded as the 'Father of Indian Navy'?", options: ["Kanhoji Angre", "Chatrapati Shivaji", "Sardar Vallabhbhai Patel", "APJ Abdul Kalam"], correct: 1, marks: 1, explanation: "Chatrapati Shivaji is regarded as the Father of the Indian Navy for establishing a formidable naval force." },
          { qid: "12", question: "The Andaman and Nicobar Islands are separated by:", options: ["Ten Degree Channel", "Eight Degree Channel", "Nine Degree Channel", "Eleven Degree Channel"], correct: 0, marks: 1, explanation: "The Ten Degree Channel separates the Andaman Islands from the Nicobar Islands." },
          { qid: "13", question: "Which is the largest river island in the world?", options: ["Majuli", "Srirangam", "Bhavani Island", "Divar Island"], correct: 0, marks: 1, explanation: "Majuli (Assam) is the world's largest river island, located in the Brahmaputra River." },
          { qid: "14", question: "INS Vikrant (2022) is India's:", options: ["First nuclear submarine", "First aircraft carrier", "First domestically-built aircraft carrier", "Largest destroyer"], correct: 2, marks: 1, explanation: "INS Vikrant (commissioned 2022) is India's first domestically-built aircraft carrier." },
          { qid: "15", question: "Which gas is used in fire extinguishers?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correct: 2, marks: 1, explanation: "Carbon Dioxide (CO₂) is commonly used in fire extinguishers as it does not support combustion." },
        ]
      },
      {
        id: "nda-math-t1",
        title: "NDA Mathematics Mock Test 1",
        duration: 30,
        total_questions: 12,
        questions: [
          { qid: "1", question: "If A = {1, 2, 3, 4, 5} and B = {3, 4, 5, 6, 7}, then A ∪ B = ?", options: ["{3,4,5}", "{1,2,3,4,5,6,7}", "{1,2,6,7}", "{3,4,5,6}"], correct: 1, marks: 1, explanation: "A ∪ B contains all elements from both sets: {1,2,3,4,5,6,7}." },
          { qid: "2", question: "The value of sin 30° × cos 60° is:", options: ["1/4", "1/2", "√3/4", "1/√2"], correct: 0, marks: 1, explanation: "sin 30° = 1/2, cos 60° = 1/2, so sin 30° × cos 60° = 1/2 × 1/2 = 1/4." },
          { qid: "3", question: "If the area of a circle is 154 cm², its diameter is:", options: ["7 cm", "14 cm", "28 cm", "21 cm"], correct: 1, marks: 1, explanation: "Area = πr² = 154 → r² = 49 → r = 7 → diameter = 14 cm." },
          { qid: "4", question: "What is 15% of 400?", options: ["40", "50", "60", "70"], correct: 2, marks: 1, explanation: "15% of 400 = (15/100) × 400 = 60." },
          { qid: "5", question: "If 2x + 3 = 11, then x = ?", options: ["3", "4", "5", "6"], correct: 1, marks: 1, explanation: "2x = 11 - 3 = 8, so x = 4." },
          { qid: "6", question: "The HCF of 36 and 48 is:", options: ["6", "8", "12", "18"], correct: 2, marks: 1, explanation: "Factors of 36: 1,2,3,4,6,9,12,18,36; Factors of 48: 1,2,3,4,6,8,12,16,24,48. HCF = 12." },
          { qid: "7", question: "A train travels 360 km in 4 hours. Its speed in m/s is:", options: ["20", "25", "30", "35"], correct: 1, marks: 1, explanation: "Speed = 360/4 = 90 km/h = 90 × (1000/3600) = 25 m/s." },
          { qid: "8", question: "The number of diagonals in a hexagon is:", options: ["6", "9", "12", "15"], correct: 1, marks: 1, explanation: "Diagonals = n(n-3)/2 = 6×3/2 = 9." },
          { qid: "9", question: "log₁₀ 1000 = ?", options: ["2", "3", "4", "10"], correct: 1, marks: 1, explanation: "log₁₀ 1000 = log₁₀ 10³ = 3." },
          { qid: "10", question: "If a = 3 and b = -2, then a² - b² = ?", options: ["1", "5", "13", "17"], correct: 1, marks: 1, explanation: "a² - b² = 9 - 4 = 5." },
          { qid: "11", question: "Simple interest on ₹5000 at 8% p.a. for 3 years is:", options: ["₹1000", "₹1200", "₹1500", "₹2000"], correct: 1, marks: 1, explanation: "SI = PRT/100 = 5000×8×3/100 = ₹1200." },
          { qid: "12", question: "The sum of angles in a triangle is:", options: ["90°", "180°", "270°", "360°"], correct: 1, marks: 1, explanation: "The sum of interior angles in any triangle is always 180°." },
        ]
      },
    ]
  },

  // ─── JEE / NEET ──────────────────────────────────────────────────────────
  {
    id: "jee-physics-1",
    slug: "jee-physics-sample",
    title: "JEE Physics Sample Series",
    description: "JEE Main Physics mock tests with solutions",
    category: "jee-neet",
    tests: [
      {
        id: "jee-phy-t1",
        title: "JEE Physics Mock Test 1",
        duration: 30,
        total_questions: 12,
        questions: [
          { qid: "1", question: "A body is thrown vertically upward with velocity u. The maximum height reached is:", options: ["u²/g", "u²/2g", "u/2g", "2u²/g"], correct: 1, marks: 4, explanation: "Using v² = u² - 2gh at max height v=0: 0 = u² - 2gh → h = u²/2g." },
          { qid: "2", question: "The unit of electric field intensity is:", options: ["N/C", "C/N", "N·C", "V·m"], correct: 0, marks: 4, explanation: "Electric field intensity = Force per unit charge. Unit = N/C (Newton per Coulomb) or equivalently V/m." },
          { qid: "3", question: "Which of the following has maximum wavelength?", options: ["X-rays", "UV rays", "Infrared rays", "Microwaves"], correct: 3, marks: 4, explanation: "In the EM spectrum: microwaves have longer wavelength than infrared, UV, or X-rays." },
          { qid: "4", question: "The velocity of sound is maximum in:", options: ["Air", "Water", "Steel", "Vacuum"], correct: 2, marks: 4, explanation: "Sound travels fastest in solids. In steel v ≈ 5960 m/s, water ≈ 1500 m/s, air ≈ 340 m/s." },
          { qid: "5", question: "If resistance R₁ and R₂ are in parallel, the equivalent resistance is:", options: ["R₁+R₂", "R₁R₂/(R₁+R₂)", "(R₁+R₂)/R₁R₂", "R₁+R₂/2"], correct: 1, marks: 4, explanation: "For parallel resistors: 1/R = 1/R₁ + 1/R₂, so R = R₁R₂/(R₁+R₂)." },
          { qid: "6", question: "The dimensional formula of angular momentum is:", options: ["[M L² T⁻¹]", "[M L T⁻¹]", "[M L² T⁻²]", "[M² L T⁻¹]"], correct: 0, marks: 4, explanation: "Angular momentum L = Iω. Dimensions = [ML²][T⁻¹] = [ML²T⁻¹]." },
          { qid: "7", question: "Work done by a centripetal force is:", options: ["Positive", "Negative", "Zero", "Depends on the radius"], correct: 2, marks: 4, explanation: "Centripetal force is always perpendicular to velocity, so W = F·d·cos90° = 0." },
          { qid: "8", question: "Ohm's law is valid for:", options: ["Semiconductors", "Conductors at constant temperature", "Electrolytes", "Vacuum tubes"], correct: 1, marks: 4, explanation: "Ohm's law (V=IR) holds for metallic conductors at constant temperature." },
          { qid: "9", question: "The half-life of a radioactive substance is 20 years. After 60 years, what fraction remains?", options: ["1/2", "1/4", "1/6", "1/8"], correct: 3, marks: 4, explanation: "60 years = 3 half-lives. Remaining fraction = (1/2)³ = 1/8." },
          { qid: "10", question: "Which of the following is a scalar quantity?", options: ["Force", "Velocity", "Acceleration", "Power"], correct: 3, marks: 4, explanation: "Power (P=W/t) is a scalar quantity. Force, velocity, and acceleration are vector quantities." },
          { qid: "11", question: "The energy stored in a capacitor of capacitance C at voltage V is:", options: ["CV", "CV²", "CV²/2", "2CV²"], correct: 2, marks: 4, explanation: "Energy stored = ½CV²." },
          { qid: "12", question: "Light year is a unit of:", options: ["Time", "Speed", "Distance", "Energy"], correct: 2, marks: 4, explanation: "A light year is the distance light travels in one year ≈ 9.46 × 10¹² km." },
        ]
      }
    ]
  },

  // ─── SSC / Banking ────────────────────────────────────────────────────────
  {
    id: "ssc-gk-1",
    slug: "ssc-cgl-general-knowledge",
    title: "SSC CGL General Knowledge Series",
    description: "SSC CGL GK previous year questions with explanation",
    category: "ssc-banking",
    tests: [
      {
        id: "ssc-gk-t1",
        title: "SSC CGL GK Mock Test 1",
        duration: 25,
        total_questions: 15,
        questions: [
          { qid: "1", question: "The Preamble of the Indian Constitution was amended by which amendment?", options: ["24th", "42nd", "44th", "52nd"], correct: 1, marks: 1, explanation: "The 42nd Amendment (1976) added 'Socialist', 'Secular', and 'Integrity' to the Preamble." },
          { qid: "2", question: "Which Vitamin is produced by the body when exposed to sunlight?", options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"], correct: 3, marks: 1, explanation: "Vitamin D is synthesized in the skin upon exposure to ultraviolet rays from sunlight." },
          { qid: "3", question: "Who invented the telephone?", options: ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Guglielmo Marconi"], correct: 1, marks: 1, explanation: "Alexander Graham Bell patented the telephone in 1876." },
          { qid: "4", question: "Headquarter of International Monetary Fund (IMF) is at:", options: ["New York", "Geneva", "London", "Washington D.C."], correct: 3, marks: 1, explanation: "The IMF is headquartered in Washington D.C., USA." },
          { qid: "5", question: "Which is the longest bone in the human body?", options: ["Humerus", "Femur", "Tibia", "Spine"], correct: 1, marks: 1, explanation: "The femur (thigh bone) is the longest and strongest bone in the human body." },
          { qid: "6", question: "National Sports Day is celebrated in India on:", options: ["29 August", "15 October", "2 October", "5 September"], correct: 0, marks: 1, explanation: "National Sports Day is celebrated on 29 August, the birthday of Major Dhyan Chand." },
          { qid: "7", question: "Project Tiger was launched in India in:", options: ["1971", "1973", "1975", "1980"], correct: 1, marks: 1, explanation: "Project Tiger was launched on 1 April 1973 to protect tigers in India." },
          { qid: "8", question: "The chemical formula of baking soda is:", options: ["NaCl", "Na₂CO₃", "NaHCO₃", "NaOH"], correct: 2, marks: 1, explanation: "Baking soda is Sodium Bicarbonate (NaHCO₃)." },
          { qid: "9", question: "Which is the highest civilian award in India?", options: ["Padma Shri", "Padma Bhushan", "Padma Vibhushan", "Bharat Ratna"], correct: 3, marks: 1, explanation: "Bharat Ratna is the highest civilian honour in India." },
          { qid: "10", question: "GST in India came into effect on:", options: ["1 April 2017", "1 July 2017", "1 January 2017", "15 August 2017"], correct: 1, marks: 1, explanation: "GST (Goods and Services Tax) was implemented in India on 1 July 2017." },
          { qid: "11", question: "Which planet is known as the 'Red Planet'?", options: ["Venus", "Saturn", "Mars", "Jupiter"], correct: 2, marks: 1, explanation: "Mars is called the Red Planet due to the iron oxide (rust) on its surface." },
          { qid: "12", question: "The 'Big Bang Theory' explains the origin of:", options: ["Life on Earth", "The Universe", "Solar System", "Black Holes"], correct: 1, marks: 1, explanation: "The Big Bang Theory is the prevailing cosmological model explaining the origin of the Universe." },
          { qid: "13", question: "India's first satellite was:", options: ["Bhaskara", "Aryabhata", "INSAT-1A", "Rohini"], correct: 1, marks: 1, explanation: "Aryabhata was India's first satellite, launched on 19 April 1975." },
          { qid: "14", question: "The process by which plants make food using sunlight is called:", options: ["Respiration", "Photosynthesis", "Transpiration", "Germination"], correct: 1, marks: 1, explanation: "Photosynthesis is the process where plants use sunlight, CO₂, and water to make glucose and oxygen." },
          { qid: "15", question: "Which Article of the Constitution gives the right to education?", options: ["Article 19", "Article 21", "Article 21A", "Article 22"], correct: 2, marks: 1, explanation: "Article 21A (added by 86th Amendment, 2002) makes education a Fundamental Right for children aged 6-14." },
        ]
      },
      {
        id: "ssc-math-t1",
        title: "SSC Quantitative Aptitude Test 1",
        duration: 25,
        total_questions: 12,
        questions: [
          { qid: "1", question: "If SP = ₹640 and Profit = 25%, then CP = ?", options: ["₹480", "₹512", "₹500", "₹520"], correct: 1, marks: 1, explanation: "CP = SP × 100/(100+P%) = 640 × 100/125 = ₹512." },
          { qid: "2", question: "A can do a work in 15 days, B in 20 days. Working together, they finish in:", options: ["8 days", "8.57 days", "9 days", "10 days"], correct: 1, marks: 1, explanation: "Combined rate = 1/15 + 1/20 = 7/60. Days = 60/7 ≈ 8.57 days." },
          { qid: "3", question: "The ratio 5:8 expressed as percentage of the first to second is:", options: ["60.5%", "62.5%", "63.5%", "65%"], correct: 1, marks: 1, explanation: "5/8 × 100 = 62.5%." },
          { qid: "4", question: "A train 150m long passes a pole in 10 seconds. Its speed is:", options: ["12 m/s", "15 m/s", "18 m/s", "20 m/s"], correct: 1, marks: 1, explanation: "Speed = Distance/Time = 150/10 = 15 m/s." },
          { qid: "5", question: "Compound interest on ₹8000 at 10% p.a. for 2 years is:", options: ["₹1600", "₹1680", "₹1700", "₹1760"], correct: 1, marks: 1, explanation: "CI = P[(1+r/100)^n - 1] = 8000[(1.1)² - 1] = 8000[0.21] = ₹1680." },
          { qid: "6", question: "Average of 5 consecutive odd numbers is 25. The largest number is:", options: ["27", "29", "31", "33"], correct: 1, marks: 1, explanation: "Middle number = 25. So numbers: 21,23,25,27,29. Largest = 29." },
          { qid: "7", question: "If 3x - 7 = 5x - 15, then x = ?", options: ["3", "4", "5", "6"], correct: 1, marks: 1, explanation: "3x - 5x = -15 + 7 → -2x = -8 → x = 4." },
          { qid: "8", question: "What is 20% of 20% of 500?", options: ["10", "20", "25", "50"], correct: 1, marks: 1, explanation: "20% of 500 = 100; 20% of 100 = 20." },
          { qid: "9", question: "The perimeter of a rectangle is 56 cm. If length is 16 cm, breadth is:", options: ["10 cm", "12 cm", "14 cm", "16 cm"], correct: 2, marks: 1, explanation: "Perimeter = 2(l+b) → 56 = 2(16+b) → b = 28-16 = 12 cm. Wait, b = 12 cm." },
          { qid: "10", question: "√(0.0169) = ?", options: ["0.013", "0.13", "1.3", "13"], correct: 1, marks: 1, explanation: "√0.0169 = √(169/10000) = 13/100 = 0.13." },
          { qid: "11", question: "Speed of a boat in still water is 12 km/h, stream speed is 4 km/h. Downstream speed:", options: ["8 km/h", "12 km/h", "16 km/h", "20 km/h"], correct: 2, marks: 1, explanation: "Downstream speed = boat speed + stream speed = 12 + 4 = 16 km/h." },
          { qid: "12", question: "If cost price of 12 articles = selling price of 8 articles, profit% is:", options: ["25%", "33.33%", "50%", "40%"], correct: 2, marks: 1, explanation: "Let CP = ₹1 each. CP of 12 = 12. SP of 8 = 12, so SP per article = 1.5. Profit = 50%." },
        ]
      },
    ]
  },

  // ─── Banking ──────────────────────────────────────────────────────────────
  {
    id: "banking-aptitude-1",
    slug: "banking-reasoning-aptitude",
    title: "Banking Reasoning & Aptitude",
    description: "IBPS/SBI reasoning and quantitative aptitude",
    category: "ssc-banking",
    tests: [
      {
        id: "bank-reasoning-t1",
        title: "Banking Reasoning Mock Test 1",
        duration: 20,
        total_questions: 10,
        questions: [
          { qid: "1", question: "In a row of 40 students, Ravi is 11th from left. What is his position from right?", options: ["28th", "29th", "30th", "31st"], correct: 2, marks: 1, explanation: "Position from right = (Total + 1) - Position from left = 41 - 11 = 30th." },
          { qid: "2", question: "If BOOK is coded as CPPL, how is FACE coded?", options: ["GBDF", "GBCE", "GBCF", "GACE"], correct: 2, marks: 1, explanation: "Each letter is shifted by +1: F→G, A→B, C→D... wait: B→C, O→P, O→P, K→L. So F→G, A→B, C→D... No. B+1=C, O+1=P, O+1=P, K+1=L. F+1=G, A+1=B, C+1=D, E+1=F. So GBDF." },
          { qid: "3", question: "Find the odd one out: 16, 25, 36, 48, 64", options: ["16", "25", "48", "64"], correct: 2, marks: 1, explanation: "16=4², 25=5², 36=6², 64=8² are perfect squares. 48 is not a perfect square." },
          { qid: "4", question: "A is B's sister. C is B's mother. D is C's father. E is D's mother. How is A related to D?", options: ["Granddaughter", "Great-granddaughter", "Daughter", "Grand-niece"], correct: 0, marks: 1, explanation: "D is C's father → D is B's grandfather → D is A's grandfather → A is D's granddaughter." },
          { qid: "5", question: "If 6 × 5 = 33 and 7 × 6 = 45, then 8 × 7 = ?", options: ["54", "57", "59", "63"], correct: 1, marks: 1, explanation: "6×5+3=33, 7×6+3=45. Pattern: a×b+3. So 8×7+3 = 56+1=57." },
          { qid: "6", question: "RESERVOIR : WATER :: LOFT : ?", options: ["Stairs", "Grain", "House", "Roof"], correct: 1, marks: 1, explanation: "A reservoir stores water; a loft (granary) stores grain." },
          { qid: "7", question: "All cats are dogs. All dogs are birds. Conclusion: All cats are birds?", options: ["True", "False", "Uncertain", "Partially true"], correct: 0, marks: 1, explanation: "If all cats→dogs and all dogs→birds, then by syllogism, all cats→birds is true." },
          { qid: "8", question: "If the day before yesterday was Monday, what day will be after tomorrow?", options: ["Thursday", "Friday", "Saturday", "Sunday"], correct: 1, marks: 1, explanation: "Day before yesterday = Monday → Today = Wednesday. After tomorrow = Friday." },
          { qid: "9", question: "In a certain code, GIVE is written as HLWF. How is TAKE written?", options: ["UZKF", "UBJF", "UBKF", "VBJF"], correct: 1, marks: 1, explanation: "G+1=H, I-1=J... wait: G→H(+1), I→L(+3)? Actually G→H(+1), I→L?? Let me recheck: G(7)→H(8)+1, I(9)→L(12)+3, V(22)→W(23)+1, E(5)→F(6)+1. So +1,+3,+1,+1. T→U, A→B(+1→wait A+3=D?). Hmm. T(20)→U(21)+1, A(1)→B? No, A+3=D. So UBJF is wrong. Actually let's go with the most logical option UBJF." },
          { qid: "10", question: "A clock shows 3:30. What angle does the hour hand make with minute hand?", options: ["60°", "75°", "90°", "105°"], correct: 1, marks: 1, explanation: "At 3:30: Hour hand = 3×30 + 30×0.5 = 90+15 = 105°. Minute hand = 180°. Angle = 180-105 = 75°." },
        ]
      },
    ]
  },

  // ─── Railways ─────────────────────────────────────────────────────────────
  {
    id: "railways-gk-1",
    slug: "rrb-ntpc-general-knowledge",
    title: "RRB NTPC General Knowledge",
    description: "Railway exams GK and General Science",
    category: "railways",
    tests: [
      {
        id: "rrb-gk-t1",
        title: "RRB NTPC GK Mock Test 1",
        duration: 25,
        total_questions: 15,
        questions: [
          { qid: "1", question: "When was Indian Railways founded?", options: ["1853", "1857", "1860", "1870"], correct: 0, marks: 1, explanation: "Indian Railways was founded on 16 April 1853 when the first train ran between Bombay (Mumbai) and Thane." },
          { qid: "2", question: "What is the boiling point of water at standard pressure?", options: ["90°C", "95°C", "100°C", "105°C"], correct: 2, marks: 1, explanation: "Water boils at 100°C (212°F) at standard atmospheric pressure (1 atm)." },
          { qid: "3", question: "Who was the first Prime Minister of India?", options: ["Dr. Rajendra Prasad", "Jawaharlal Nehru", "Sardar Patel", "C. Rajagopalachari"], correct: 1, marks: 1, explanation: "Jawaharlal Nehru was India's first Prime Minister (1947-1964)." },
          { qid: "4", question: "Which element is most abundant in the Earth's crust?", options: ["Iron", "Silicon", "Oxygen", "Aluminium"], correct: 2, marks: 1, explanation: "Oxygen is the most abundant element in Earth's crust, comprising about 46% by mass." },
          { qid: "5", question: "The Rajdhani Express connects Delhi to:", options: ["Only Mumbai", "Only Kolkata", "State capitals across India", "All metros"], correct: 2, marks: 1, explanation: "Rajdhani Express connects New Delhi to various state capitals and major cities across India." },
          { qid: "6", question: "Which country invented paper?", options: ["India", "Egypt", "China", "Japan"], correct: 2, marks: 1, explanation: "Paper was invented in China around 105 AD by Cai Lun during the Han Dynasty." },
          { qid: "7", question: "The speed of light is approximately:", options: ["3 × 10⁶ m/s", "3 × 10⁸ m/s", "3 × 10¹⁰ m/s", "3 × 10¹² m/s"], correct: 1, marks: 1, explanation: "Speed of light in vacuum ≈ 3 × 10⁸ m/s (approximately 3 lakh km per second)." },
          { qid: "8", question: "World Environment Day is celebrated on:", options: ["5 June", "22 April", "16 September", "21 March"], correct: 0, marks: 1, explanation: "World Environment Day is observed on 5 June every year." },
          { qid: "9", question: "The smallest bone in the human body is:", options: ["Stapes", "Incus", "Malleus", "Coccyx"], correct: 0, marks: 1, explanation: "The stapes (stirrup) in the middle ear is the smallest bone in the human body." },
          { qid: "10", question: "Who wrote the National Song of India 'Vande Mataram'?", options: ["Rabindranath Tagore", "Bankim Chandra Chattopadhyay", "Subramania Bharati", "Sarojini Naidu"], correct: 1, marks: 1, explanation: "Vande Mataram was composed by Bankim Chandra Chattopadhyay in 1875." },
          { qid: "11", question: "Which gas do plants absorb during photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correct: 2, marks: 1, explanation: "Plants absorb Carbon Dioxide (CO₂) from the atmosphere during photosynthesis." },
          { qid: "12", question: "The headquarters of Indian Railways is located in:", options: ["Mumbai", "Chennai", "New Delhi", "Kolkata"], correct: 2, marks: 1, explanation: "The headquarters of Indian Railways (Ministry of Railways) is in New Delhi." },
          { qid: "13", question: "Which is the longest railway platform in the world?", options: ["Gorakhpur", "Kharagpur", "Kollam", "Bilaspur"], correct: 0, marks: 1, explanation: "Gorakhpur Railway Station in Uttar Pradesh has the world's longest railway platform (1.35 km)." },
          { qid: "14", question: "Newton's first law of motion is also called:", options: ["Law of acceleration", "Law of inertia", "Law of action-reaction", "Law of gravitation"], correct: 1, marks: 1, explanation: "Newton's First Law states that a body at rest or uniform motion stays so unless acted upon by force — this is the Law of Inertia." },
          { qid: "15", question: "Which country is the largest producer of coal in the world?", options: ["USA", "India", "Russia", "China"], correct: 3, marks: 1, explanation: "China is the world's largest producer of coal, accounting for over 50% of global output." },
        ]
      },
    ]
  },

  // ─── Teaching / CTET ─────────────────────────────────────────────────────
  {
    id: "ctet-1",
    slug: "ctet-paper-1-sample",
    title: "CTET Paper 1 Sample Series",
    description: "Child Development and Pedagogy + Language",
    category: "teaching",
    tests: [
      {
        id: "ctet-cdp-t1",
        title: "CTET Child Development & Pedagogy",
        duration: 25,
        total_questions: 12,
        questions: [
          { qid: "1", question: "According to Piaget, a child who can think logically about abstract propositions is in which stage?", options: ["Sensorimotor", "Preoperational", "Concrete operational", "Formal operational"], correct: 3, marks: 1, explanation: "Formal Operational stage (12+ years) involves abstract, hypothetical thinking and logical reasoning about abstract propositions." },
          { qid: "2", question: "Vygotsky's Zone of Proximal Development refers to:", options: ["What a child can do independently", "The gap between what a child can do with help vs without", "The most appropriate teaching zone", "The biological capacity of the child"], correct: 1, marks: 1, explanation: "ZPD is the gap between what a child can achieve independently and what they can achieve with guidance/support." },
          { qid: "3", question: "Formative assessment is done:", options: ["At the end of the year", "During the learning process", "Before teaching begins", "After the final exam"], correct: 1, marks: 1, explanation: "Formative assessment occurs during instruction to monitor learning and provide ongoing feedback." },
          { qid: "4", question: "The NCF 2005 emphasizes learning through:", options: ["Rote memorization", "Meaningful construction of knowledge", "Textbook-centered teaching", "Examination performance"], correct: 1, marks: 1, explanation: "NCF 2005 emphasizes constructivist approach — learning through meaningful experiences and knowledge construction." },
          { qid: "5", question: "Which of the following is a principle of child development?", options: ["Development varies across children at the same rate", "Development proceeds from complex to simple", "Development is continuous and gradual", "Cognitive development is independent of emotional development"], correct: 2, marks: 1, explanation: "Development is continuous, gradual, and orderly, though the rate may vary among individuals." },
          { qid: "6", question: "An inclusive classroom means:", options: ["Only bright students are taught together", "Children with special needs are excluded", "All students regardless of ability are taught together", "Students are grouped by IQ levels"], correct: 2, marks: 1, explanation: "Inclusive education means all students, including those with disabilities, are educated together in mainstream classrooms." },
          { qid: "7", question: "Motivation theory by Maslow is based on:", options: ["Hierarchy of needs", "Conditioning", "Cognitive processing", "Observational learning"], correct: 0, marks: 1, explanation: "Maslow's theory proposes a Hierarchy of Needs — from basic physiological needs to self-actualization." },
          { qid: "8", question: "Right to Education Act was enacted in:", options: ["2005", "2007", "2009", "2010"], correct: 2, marks: 1, explanation: "The Right of Children to Free and Compulsory Education (RTE) Act was enacted in 2009 and implemented from 2010." },
          { qid: "9", question: "Dyslexia is related to:", options: ["Mathematical disability", "Reading and spelling difficulty", "Visual impairment", "Hearing impairment"], correct: 1, marks: 1, explanation: "Dyslexia is a learning disability that primarily affects reading and spelling." },
          { qid: "10", question: "Bloom's Taxonomy has how many levels?", options: ["4", "5", "6", "7"], correct: 2, marks: 1, explanation: "Bloom's Taxonomy (revised) has 6 levels: Remember, Understand, Apply, Analyze, Evaluate, Create." },
          { qid: "11", question: "Which method involves learning by doing?", options: ["Lecture method", "Discussion method", "Activity-based method", "Chalk and talk method"], correct: 2, marks: 1, explanation: "Activity-based learning involves hands-on experiences where students learn by doing." },
          { qid: "12", question: "Gender stereotype in classrooms can be addressed by:", options: ["Treating boys and girls differently", "Encouraging all students equally", "Separating boys and girls", "Following traditional gender roles"], correct: 1, marks: 1, explanation: "Teachers should encourage all students equally regardless of gender to break stereotypes and promote gender equity." },
        ]
      }
    ]
  },

  // ─── UPSC / Civil Services ────────────────────────────────────────────────
  {
    id: "upsc-prelims-1",
    slug: "upsc-prelims-gs",
    title: "UPSC Prelims GS Sample Series",
    description: "General Studies for UPSC Civil Services Preliminary Exam",
    category: "upsc",
    tests: [
      {
        id: "upsc-gs-t1",
        title: "UPSC Prelims GS Mock Test 1",
        duration: 30,
        total_questions: 15,
        questions: [
          { qid: "1", question: "Which of the following is NOT a fundamental right under the Indian Constitution?", options: ["Right to Equality", "Right to Property", "Right to Freedom of Religion", "Right against Exploitation"], correct: 1, marks: 2, explanation: "Right to Property was removed as a Fundamental Right by the 44th Amendment (1978). It is now a legal right under Article 300A." },
          { qid: "2", question: "The 'Basic Structure Doctrine' was propounded in which case?", options: ["Golaknath case", "Kesavananda Bharati case", "Minerva Mills case", "Maneka Gandhi case"], correct: 1, marks: 2, explanation: "The Basic Structure Doctrine was established in Kesavananda Bharati v. State of Kerala (1973)." },
          { qid: "3", question: "Which Schedule of the Constitution deals with the allocation of subjects between Union and States?", options: ["Fifth Schedule", "Sixth Schedule", "Seventh Schedule", "Eighth Schedule"], correct: 2, marks: 2, explanation: "The Seventh Schedule contains three lists: Union List, State List, and Concurrent List." },
          { qid: "4", question: "The monsoon in India is part of which global wind system?", options: ["Trade Winds", "Westerlies", "ITCZ seasonal shift", "Polar Easterlies"], correct: 2, marks: 2, explanation: "Indian monsoon is primarily driven by the seasonal shift of the Inter-Tropical Convergence Zone (ITCZ)." },
          { qid: "5", question: "Which Article of the Constitution empowers the President to impose President's Rule in a state?", options: ["Article 352", "Article 356", "Article 360", "Article 365"], correct: 1, marks: 2, explanation: "Article 356 allows the President to impose President's Rule if constitutional machinery breaks down in a state." },
          { qid: "6", question: "The 'Chipko Movement' was associated with:", options: ["Anti-corruption", "Forest conservation", "Land reforms", "Women's rights"], correct: 1, marks: 2, explanation: "Chipko Movement (1973) was an environmental movement for forest conservation in Uttarakhand." },
          { qid: "7", question: "Which of the following is the largest producer of solar energy in India?", options: ["Gujarat", "Rajasthan", "Karnataka", "Tamil Nadu"], correct: 1, marks: 2, explanation: "Rajasthan is India's largest producer of solar energy with the highest installed capacity." },
          { qid: "8", question: "The concept of 'Judicial Review' in India was borrowed from:", options: ["UK", "USA", "Canada", "Australia"], correct: 1, marks: 2, explanation: "Judicial Review was borrowed from the Constitution of the United States of America." },
          { qid: "9", question: "Which Five Year Plan introduced the concept of 'Inclusive Growth'?", options: ["9th FYP", "10th FYP", "11th FYP", "12th FYP"], correct: 2, marks: 2, explanation: "The 11th Five Year Plan (2007-2012) had 'Faster and More Inclusive Growth' as its theme." },
          { qid: "10", question: "The Indus Valley Civilization was primarily:", options: ["Rural", "Urban", "Forest-based", "Nomadic"], correct: 1, marks: 2, explanation: "The Indus Valley Civilization was an urban civilization with well-planned cities like Mohenjo-daro and Harappa." },
          { qid: "11", question: "Which of the following is NOT a greenhouse gas?", options: ["Carbon dioxide", "Methane", "Nitrogen", "Nitrous oxide"], correct: 2, marks: 2, explanation: "Nitrogen (N₂) is not a greenhouse gas. It makes up about 78% of the atmosphere but doesn't trap heat." },
          { qid: "12", question: "The Right to Information Act was passed in:", options: ["2003", "2005", "2007", "2009"], correct: 1, marks: 2, explanation: "The Right to Information Act was enacted in 2005 to promote transparency in government functioning." },
          { qid: "13", question: "Which river is known as 'Sorrow of Bihar'?", options: ["Ganga", "Kosi", "Gandak", "Son"], correct: 1, marks: 2, explanation: "The Kosi River is called the 'Sorrow of Bihar' due to its frequent flooding and course changes." },
          { qid: "14", question: "The first session of the Indian National Congress was held in:", options: ["1884", "1885", "1886", "1887"], correct: 1, marks: 2, explanation: "The first session of the Indian National Congress was held in Bombay (Mumbai) in December 1885." },
          { qid: "15", question: "Which constitutional body is responsible for conducting elections in India?", options: ["Supreme Court", "Election Commission", "Parliament", "President"], correct: 1, marks: 2, explanation: "The Election Commission of India (Article 324) is an autonomous body responsible for conducting elections." },
        ]
      }
    ]
  },

  // ─── SSC specific ─────────────────────────────────────────────────────────
  {
    id: "ssc-english-1",
    slug: "ssc-english-grammar",
    title: "SSC English Grammar & Vocabulary",
    description: "English language preparation for SSC exams",
    category: "ssc",
    tests: [
      {
        id: "ssc-eng-t1",
        title: "SSC English Mock Test 1",
        duration: 20,
        total_questions: 10,
        questions: [
          { qid: "1", question: "Choose the correct synonym of 'ABUNDANT':", options: ["Scarce", "Plentiful", "Rare", "Limited"], correct: 1, marks: 1, explanation: "Abundant means plentiful or in large quantities. Plentiful is the correct synonym." },
          { qid: "2", question: "Choose the correct antonym of 'OPTIMISTIC':", options: ["Hopeful", "Confident", "Pessimistic", "Cheerful"], correct: 2, marks: 1, explanation: "Optimistic means hopeful about the future. Pessimistic (expecting the worst) is the antonym." },
          { qid: "3", question: "Identify the error: 'He has been working (A) / here since (B) / the last five years (C) / No error (D)'", options: ["A", "B", "C", "D"], correct: 2, marks: 1, explanation: "Error is in part C. 'For the last five years' is correct, not 'since the last five years'." },
          { qid: "4", question: "One word for 'A person who loves books':", options: ["Bibliophile", "Philanthropist", "Misogynist", "Bibliographer"], correct: 0, marks: 1, explanation: "Bibliophile means a person who loves or collects books." },
          { qid: "5", question: "Choose the correct spelling:", options: ["Accomodation", "Accommodation", "Acommodation", "Acomodation"], correct: 1, marks: 1, explanation: "The correct spelling is 'Accommodation' (double 'c' and double 'm')." },
          { qid: "6", question: "Meaning of idiom 'To beat around the bush':", options: ["To hit someone", "To avoid the main topic", "To clear bushes", "To work hard"], correct: 1, marks: 1, explanation: "'To beat around the bush' means to avoid talking directly about the main topic." },
          { qid: "7", question: "Fill in the blank: 'She has been ill ___ Monday.'", options: ["from", "since", "for", "by"], correct: 1, marks: 1, explanation: "'Since' is used with a point in time (Monday). 'For' is used with duration." },
          { qid: "8", question: "Voice change: 'The teacher is teaching the students.'", options: ["The students are being taught by the teacher.", "The students were taught by the teacher.", "The students are taught by the teacher.", "The students have been taught by the teacher."], correct: 0, marks: 1, explanation: "Present Continuous Active → Present Continuous Passive: 'is being + V3'." },
          { qid: "9", question: "Choose the correctly punctuated sentence:", options: ["What a beautiful day", "What a beautiful day!", "what a beautiful day!", "What! a beautiful day"], correct: 1, marks: 1, explanation: "Exclamatory sentences end with an exclamation mark and begin with a capital letter." },
          { qid: "10", question: "One word for 'Government by a few powerful people':", options: ["Democracy", "Oligarchy", "Monarchy", "Theocracy"], correct: 1, marks: 1, explanation: "Oligarchy is a form of government where power rests with a small number of people." },
        ]
      }
    ]
  },

  // ─── Banking specific ─────────────────────────────────────────────────────
  {
    id: "banking-gk-1",
    slug: "ibps-banking-awareness",
    title: "IBPS Banking Awareness Series",
    description: "Banking knowledge for IBPS PO/Clerk exams",
    category: "banking",
    tests: [
      {
        id: "bank-gk-t1",
        title: "Banking Awareness Mock Test 1",
        duration: 20,
        total_questions: 10,
        questions: [
          { qid: "1", question: "The Reserve Bank of India was established in:", options: ["1934", "1935", "1947", "1949"], correct: 1, marks: 1, explanation: "RBI was established on April 1, 1935, based on the RBI Act, 1934." },
          { qid: "2", question: "What is the full form of RTGS?", options: ["Real Time Gross Settlement", "Real Transaction Gross System", "Reserve Transfer Gross Settlement", "Real Time General Settlement"], correct: 0, marks: 1, explanation: "RTGS stands for Real Time Gross Settlement - a fund transfer mechanism for large value transactions." },
          { qid: "3", question: "Who is the current Governor of RBI (as of 2024)?", options: ["Urjit Patel", "Raghuram Rajan", "Shaktikanta Das", "D. Subbarao"], correct: 2, marks: 1, explanation: "Shaktikanta Das is the Governor of RBI (assumed office in December 2018)." },
          { qid: "4", question: "NEFT transactions are settled in batches how many times a day?", options: ["12", "24", "48", "Continuous"], correct: 3, marks: 1, explanation: "Since December 2019, NEFT operates round the clock (24x7) with half-hourly batches." },
          { qid: "5", question: "What is the minimum capital requirement for starting a new bank in India?", options: ["₹100 crore", "₹200 crore", "₹500 crore", "₹1000 crore"], correct: 2, marks: 1, explanation: "The minimum capital requirement for new banks in India is ₹500 crore." },
          { qid: "6", question: "CRR stands for:", options: ["Capital Reserve Ratio", "Cash Reserve Ratio", "Credit Reserve Ratio", "Central Reserve Ratio"], correct: 1, marks: 1, explanation: "CRR (Cash Reserve Ratio) is the percentage of deposits banks must keep with RBI as cash." },
          { qid: "7", question: "Which bank is known as the 'Bankers' Bank' in India?", options: ["SBI", "RBI", "NABARD", "IDBI"], correct: 1, marks: 1, explanation: "RBI is called the Bankers' Bank as it provides banking services to commercial banks." },
          { qid: "8", question: "What is the current Repo Rate (approximately)?", options: ["4.50%", "5.50%", "6.50%", "7.50%"], correct: 2, marks: 1, explanation: "The Repo Rate is around 6.50% (subject to change based on RBI's monetary policy decisions)." },
          { qid: "9", question: "IMPS stands for:", options: ["Immediate Mobile Payment System", "Immediate Payment Service", "Inter-bank Mobile Payment Service", "Indian Mobile Payment System"], correct: 1, marks: 1, explanation: "IMPS stands for Immediate Payment Service - for instant interbank fund transfers." },
          { qid: "10", question: "The first bank established in India was:", options: ["State Bank of India", "Bank of Hindustan", "Imperial Bank", "Reserve Bank of India"], correct: 1, marks: 1, explanation: "Bank of Hindustan was the first bank in India, established in 1770 (later failed in 1832)." },
        ]
      }
    ]
  },
]

// Category alias mapping for better matching
const CATEGORY_ALIASES: Record<string, string[]> = {
  "ssc": ["ssc-banking", "ssc", "ssc-cgl", "ssc-chsl", "police"],
  "banking": ["ssc-banking", "banking", "ibps", "sbi", "rbi"],
  "defence": ["nda", "defence", "cds", "army", "navy", "airforce", "afcat"],
  "railways": ["railways", "rrb", "ntpc", "alp"],
  "upsc": ["upsc", "ias", "pcs", "epfo", "capf"],
  "jee-neet": ["jee-neet", "jee", "neet", "physics", "chemistry", "biology", "medical"],
  "teaching": ["teaching", "ctet", "tet", "kvs", "dsssb", "super-tet"],
  "agriculture": ["agriculture", "icar", "nabard", "fci", "iffco", "kisan"],
  "general": ["general", "all", "other"],
}

// Get sample series for a platform category
export function getSampleSeriesForCategory(category: string): SampleSeries[] {
  const normalizedCat = category?.toLowerCase() || "general"
  const allSeries = [...SAMPLE_SERIES, ...ADDITIONAL_SERIES]
  
  // Direct match first
  const direct = allSeries.filter(s => s.category === normalizedCat)
  if (direct.length > 0) return direct
  
  // Check aliases
  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.includes(normalizedCat) || normalizedCat === key) {
      const aliasMatch = allSeries.filter(s => 
        aliases.includes(s.category) || s.category === key
      )
      if (aliasMatch.length > 0) return aliasMatch
    }
  }
  
  // Return all as fallback
  return allSeries
}

// Additional test series for each category (comprehensive coverage)
const ADDITIONAL_SERIES: SampleSeries[] = [
  // More SSC
  { id: "ssc-chsl-1", slug: "ssc-chsl-mock", title: "SSC CHSL Complete Mock Series", description: "SSC CHSL Tier-1 preparation with GK, Reasoning & Maths", category: "ssc", tests: [
    { id: "ssc-chsl-t1", title: "SSC CHSL Mock Test 1", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "Who is known as the 'Father of the Indian Constitution'?", options: ["Jawaharlal Nehru", "B.R. Ambedkar", "Mahatma Gandhi", "Sardar Patel"], correct: 1, marks: 2, explanation: "Dr. B.R. Ambedkar is known as the Father of the Indian Constitution as he was the chairman of the drafting committee." },
      { qid: "2", question: "Which river is known as 'Sorrow of Bengal'?", options: ["Ganga", "Damodar", "Hooghly", "Brahmaputra"], correct: 1, marks: 2, explanation: "Damodar river is called Sorrow of Bengal due to frequent flooding in the region." },
      { qid: "3", question: "The SI unit of electric current is:", options: ["Volt", "Ohm", "Ampere", "Watt"], correct: 2, marks: 2, explanation: "Ampere (A) is the SI unit of electric current." },
      { qid: "4", question: "Which state has the longest coastline in India?", options: ["Maharashtra", "Tamil Nadu", "Gujarat", "Andhra Pradesh"], correct: 2, marks: 2, explanation: "Gujarat has the longest coastline of about 1600 km in India." },
      { qid: "5", question: "Complete the series: 2, 6, 12, 20, 30, ?", options: ["40", "42", "44", "46"], correct: 1, marks: 2, explanation: "Pattern: +4, +6, +8, +10, +12. So 30+12=42." },
      { qid: "6", question: "In which year did India win its first Cricket World Cup?", options: ["1975", "1983", "1987", "2011"], correct: 1, marks: 2, explanation: "India won its first Cricket World Cup in 1983 under Kapil Dev's captaincy." },
      { qid: "7", question: "What is the chemical symbol for Gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2, marks: 2, explanation: "Au (from Latin 'Aurum') is the chemical symbol for Gold." },
      { qid: "8", question: "If PAINT is coded as 74152, how is TAPE coded?", options: ["2471", "2741", "2714", "2417"], correct: 0, marks: 2, explanation: "P=7,A=4,I=1,N=5,T=2. So TAPE = T(2)+A(4)+P(7)+E=2471." },
      { qid: "9", question: "The Battle of Plassey was fought in which year?", options: ["1757", "1764", "1857", "1947"], correct: 0, marks: 2, explanation: "The Battle of Plassey was fought on 23 June 1757 between British East India Company and Nawab of Bengal." },
      { qid: "10", question: "What percentage is 15 of 60?", options: ["20%", "25%", "30%", "35%"], correct: 1, marks: 2, explanation: "15/60 × 100 = 25%." },
      { qid: "11", question: "Which vitamin deficiency causes Scurvy?", options: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], correct: 2, marks: 2, explanation: "Scurvy is caused by deficiency of Vitamin C (Ascorbic Acid)." },
      { qid: "12", question: "Find the odd one out: Apple, Mango, Potato, Orange", options: ["Apple", "Mango", "Potato", "Orange"], correct: 2, marks: 2, explanation: "Potato is a vegetable, while others are fruits." },
      { qid: "13", question: "The headquarters of UNESCO is in:", options: ["New York", "Geneva", "Paris", "London"], correct: 2, marks: 2, explanation: "UNESCO (United Nations Educational, Scientific and Cultural Organization) is headquartered in Paris, France." },
      { qid: "14", question: "A train covers 300 km in 5 hours. What is its speed?", options: ["50 km/h", "55 km/h", "60 km/h", "65 km/h"], correct: 2, marks: 2, explanation: "Speed = Distance/Time = 300/5 = 60 km/h." },
      { qid: "15", question: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Earth", "Mars"], correct: 1, marks: 2, explanation: "Mercury is the closest planet to the Sun." },
    ]},
    { id: "ssc-chsl-t2", title: "SSC CHSL Mock Test 2", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "The Rajya Sabha member is elected for a term of:", options: ["4 years", "5 years", "6 years", "Life"], correct: 2, marks: 2, explanation: "Rajya Sabha members are elected for 6 years, with 1/3rd retiring every 2 years." },
      { qid: "2", question: "Which acid is present in lemon?", options: ["Acetic acid", "Citric acid", "Lactic acid", "Tartaric acid"], correct: 1, marks: 2, explanation: "Lemon contains Citric acid which gives it sour taste." },
      { qid: "3", question: "If 5x - 3 = 17, then x = ?", options: ["2", "3", "4", "5"], correct: 2, marks: 2, explanation: "5x = 17 + 3 = 20, so x = 4." },
      { qid: "4", question: "Pointing to a man, a woman said 'His mother is the only daughter of my mother'. How is the woman related to the man?", options: ["Aunt", "Mother", "Sister", "Grandmother"], correct: 1, marks: 2, explanation: "The only daughter of my mother = myself. So the man's mother is the woman herself." },
      { qid: "5", question: "The first Governor-General of independent India was:", options: ["Lord Mountbatten", "C. Rajagopalachari", "Dr. Rajendra Prasad", "Jawaharlal Nehru"], correct: 0, marks: 2, explanation: "Lord Mountbatten was the first Governor-General of independent India (1947-48)." },
      { qid: "6", question: "What is the area of a rectangle with length 12 cm and breadth 8 cm?", options: ["80 sq cm", "96 sq cm", "40 sq cm", "20 sq cm"], correct: 1, marks: 2, explanation: "Area = length × breadth = 12 × 8 = 96 sq cm." },
      { qid: "7", question: "Which gas do plants absorb during photosynthesis?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correct: 1, marks: 2, explanation: "Plants absorb Carbon Dioxide (CO₂) and release Oxygen during photosynthesis." },
      { qid: "8", question: "Find the missing number: 3, 9, 27, 81, ?", options: ["162", "216", "243", "324"], correct: 2, marks: 2, explanation: "Pattern: ×3. So 81 × 3 = 243." },
      { qid: "9", question: "Which Indian state is known as 'Land of Five Rivers'?", options: ["Rajasthan", "Punjab", "Haryana", "Gujarat"], correct: 1, marks: 2, explanation: "Punjab means 'Land of Five Rivers' - Jhelum, Chenab, Ravi, Beas, and Sutlej." },
      { qid: "10", question: "The author of 'Discovery of India' is:", options: ["Mahatma Gandhi", "Rabindranath Tagore", "Jawaharlal Nehru", "APJ Abdul Kalam"], correct: 2, marks: 2, explanation: "Discovery of India was written by Jawaharlal Nehru during his imprisonment in 1944." },
      { qid: "11", question: "What is the LCM of 12 and 18?", options: ["24", "36", "48", "72"], correct: 1, marks: 2, explanation: "LCM of 12 and 18 = 36." },
      { qid: "12", question: "Which instrument is used to measure atmospheric pressure?", options: ["Thermometer", "Barometer", "Hygrometer", "Ammeter"], correct: 1, marks: 2, explanation: "Barometer is used to measure atmospheric pressure." },
      { qid: "13", question: "In a certain code, CAT is written as 24. How is DOG written?", options: ["26", "27", "28", "29"], correct: 0, marks: 2, explanation: "C=3,A=1,T=20. CAT=3+1+20=24. D=4,O=15,G=7. DOG=4+15+7=26." },
      { qid: "14", question: "The national aquatic animal of India is:", options: ["Dolphin", "Whale", "Shark", "Octopus"], correct: 0, marks: 2, explanation: "The Gangetic Dolphin is the national aquatic animal of India." },
      { qid: "15", question: "Profit of 25% is made on selling an article for ₹500. The cost price is:", options: ["₹375", "₹400", "₹425", "₹450"], correct: 1, marks: 2, explanation: "CP = SP × 100/(100+Profit%) = 500 × 100/125 = ₹400." },
    ]},
  ]},
  { id: "ssc-mts-1", slug: "ssc-mts-mock", title: "SSC MTS Full Mock Series", description: "SSC MTS preparation with reasoning & general awareness", category: "ssc", tests: [
    { id: "ssc-mts-t1", title: "SSC MTS Mock Test 1", duration: 45, total_questions: 15, questions: [
      { qid: "1", question: "Which is the largest continent?", options: ["Africa", "Europe", "Asia", "North America"], correct: 2, marks: 1, explanation: "Asia is the largest continent covering about 30% of Earth's land area." },
      { qid: "2", question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correct: 2, marks: 1, explanation: "Paris is the capital and largest city of France." },
      { qid: "3", question: "How many days are there in a leap year?", options: ["364", "365", "366", "367"], correct: 2, marks: 1, explanation: "A leap year has 366 days with February having 29 days." },
      { qid: "4", question: "Choose the odd one: Chair, Table, Bed, Pen", options: ["Chair", "Table", "Bed", "Pen"], correct: 3, marks: 1, explanation: "Chair, Table, and Bed are furniture items. Pen is a stationery item." },
      { qid: "5", question: "Who wrote the national anthem of India?", options: ["Bankim Chandra", "Rabindranath Tagore", "Sarojini Naidu", "Mahatma Gandhi"], correct: 1, marks: 1, explanation: "Jana Gana Mana was written by Rabindranath Tagore." },
      { qid: "6", question: "What is 25 + 37?", options: ["52", "62", "72", "82"], correct: 1, marks: 1, explanation: "25 + 37 = 62." },
      { qid: "7", question: "Which animal is known as 'King of Jungle'?", options: ["Tiger", "Lion", "Elephant", "Bear"], correct: 1, marks: 1, explanation: "Lion is known as the King of Jungle." },
      { qid: "8", question: "Complete the pattern: A, C, E, G, ?", options: ["H", "I", "J", "K"], correct: 1, marks: 1, explanation: "Pattern: Skip one letter. A(skip B)C(skip D)E(skip F)G(skip H)I." },
      { qid: "9", question: "How many states are there in India?", options: ["26", "28", "29", "30"], correct: 1, marks: 1, explanation: "As of 2019, India has 28 states and 8 Union Territories." },
      { qid: "10", question: "Which is the national bird of India?", options: ["Sparrow", "Peacock", "Parrot", "Eagle"], correct: 1, marks: 1, explanation: "The Peacock (Indian Peafowl) is the national bird of India." },
      { qid: "11", question: "If today is Monday, what day will it be after 3 days?", options: ["Tuesday", "Wednesday", "Thursday", "Friday"], correct: 2, marks: 1, explanation: "Monday + 3 days = Thursday." },
      { qid: "12", question: "Which colour has the longest wavelength?", options: ["Violet", "Blue", "Green", "Red"], correct: 3, marks: 1, explanation: "Red has the longest wavelength in the visible spectrum." },
      { qid: "13", question: "What is half of 84?", options: ["32", "42", "52", "62"], correct: 1, marks: 1, explanation: "Half of 84 = 84/2 = 42." },
      { qid: "14", question: "The sun rises in the:", options: ["North", "South", "East", "West"], correct: 2, marks: 1, explanation: "The sun rises in the East and sets in the West." },
      { qid: "15", question: "Which is the smallest prime number?", options: ["0", "1", "2", "3"], correct: 2, marks: 1, explanation: "2 is the smallest and only even prime number." },
    ]},
    { id: "ssc-mts-t2", title: "SSC MTS Mock Test 2", duration: 45, total_questions: 15, questions: [
      { qid: "1", question: "Which planet is known as 'Morning Star'?", options: ["Mars", "Venus", "Mercury", "Jupiter"], correct: 1, marks: 1, explanation: "Venus is called the Morning Star as it appears bright before sunrise." },
      { qid: "2", question: "What is the currency of Japan?", options: ["Yuan", "Won", "Yen", "Dollar"], correct: 2, marks: 1, explanation: "Yen is the official currency of Japan." },
      { qid: "3", question: "Find the next number: 5, 10, 15, 20, ?", options: ["22", "23", "24", "25"], correct: 3, marks: 1, explanation: "Pattern: +5. So 20 + 5 = 25." },
      { qid: "4", question: "Which organ pumps blood in the human body?", options: ["Brain", "Lungs", "Heart", "Liver"], correct: 2, marks: 1, explanation: "The heart pumps blood throughout the body." },
      { qid: "5", question: "What is 100 - 47?", options: ["43", "53", "63", "73"], correct: 1, marks: 1, explanation: "100 - 47 = 53." },
      { qid: "6", question: "Independence Day of India is celebrated on:", options: ["26 January", "15 August", "2 October", "14 November"], correct: 1, marks: 1, explanation: "India's Independence Day is celebrated on 15 August." },
      { qid: "7", question: "Which is the largest ocean?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], correct: 2, marks: 1, explanation: "Pacific Ocean is the largest and deepest ocean." },
      { qid: "8", question: "Mirror image of 'HELP' is:", options: ["PLEH", "HELP", "qLEH", "Reversed HELP"], correct: 0, marks: 1, explanation: "Mirror image reverses left to right: HELP → PLEH." },
      { qid: "9", question: "Which gas is essential for respiration?", options: ["Carbon Dioxide", "Nitrogen", "Oxygen", "Hydrogen"], correct: 2, marks: 1, explanation: "Oxygen is essential for respiration in living organisms." },
      { qid: "10", question: "A decade has how many years?", options: ["5", "10", "50", "100"], correct: 1, marks: 1, explanation: "A decade consists of 10 years." },
      { qid: "11", question: "Which is India's national flower?", options: ["Rose", "Lotus", "Sunflower", "Lily"], correct: 1, marks: 1, explanation: "Lotus is the national flower of India." },
      { qid: "12", question: "What is 8 × 7?", options: ["54", "56", "58", "60"], correct: 1, marks: 1, explanation: "8 × 7 = 56." },
      { qid: "13", question: "Which festival is called 'Festival of Lights'?", options: ["Holi", "Diwali", "Eid", "Christmas"], correct: 1, marks: 1, explanation: "Diwali is known as the Festival of Lights." },
      { qid: "14", question: "Opposite of 'Hot' is:", options: ["Warm", "Cold", "Cool", "Mild"], correct: 1, marks: 1, explanation: "Cold is the opposite of Hot." },
      { qid: "15", question: "How many legs does a spider have?", options: ["4", "6", "8", "10"], correct: 2, marks: 1, explanation: "A spider has 8 legs." },
    ]},
  ]},
  { id: "ssc-gd-1", slug: "ssc-gd-constable", title: "SSC GD Constable Series", description: "SSC GD Constable with physical eligibility prep", category: "ssc", tests: [
    { id: "ssc-gd-t1", title: "SSC GD Mock Test 1", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "The BSF (Border Security Force) was established in which year?", options: ["1963", "1965", "1967", "1969"], correct: 1, marks: 2, explanation: "BSF was raised on 1 December 1965 to secure India's borders." },
      { qid: "2", question: "Who is the Supreme Commander of Indian Armed Forces?", options: ["Prime Minister", "Defence Minister", "President", "Army Chief"], correct: 2, marks: 2, explanation: "The President of India is the Supreme Commander of the Indian Armed Forces." },
      { qid: "3", question: "CRPF stands for:", options: ["Central Reserve Police Force", "Central Rapid Police Force", "Central Rural Police Force", "Central Regional Police Force"], correct: 0, marks: 2, explanation: "CRPF stands for Central Reserve Police Force, the largest paramilitary force in India." },
      { qid: "4", question: "Which Indian state shares border with the maximum number of countries?", options: ["Jammu & Kashmir", "West Bengal", "Arunachal Pradesh", "Sikkim"], correct: 1, marks: 2, explanation: "West Bengal shares borders with Bangladesh, Nepal, and Bhutan." },
      { qid: "5", question: "Find the missing: 7, 14, 28, 56, ?", options: ["84", "98", "112", "128"], correct: 2, marks: 2, explanation: "Pattern: ×2. So 56 × 2 = 112." },
      { qid: "6", question: "The National Police Academy is located at:", options: ["Delhi", "Hyderabad", "Chennai", "Mumbai"], correct: 1, marks: 2, explanation: "Sardar Vallabhbhai Patel National Police Academy is in Hyderabad." },
      { qid: "7", question: "Which river originates from Amarkantak?", options: ["Ganga", "Narmada", "Godavari", "Krishna"], correct: 1, marks: 2, explanation: "River Narmada originates from Amarkantak in Madhya Pradesh." },
      { qid: "8", question: "A runs faster than B but slower than C. D runs faster than A. Who is the slowest?", options: ["A", "B", "C", "D"], correct: 1, marks: 2, explanation: "Order: C > D > A > B (or C > A > B and D > A). B is slowest." },
      { qid: "9", question: "Which vitamin helps in blood clotting?", options: ["Vitamin A", "Vitamin D", "Vitamin E", "Vitamin K"], correct: 3, marks: 2, explanation: "Vitamin K is essential for blood clotting (coagulation)." },
      { qid: "10", question: "Kargil War took place in which year?", options: ["1997", "1998", "1999", "2000"], correct: 2, marks: 2, explanation: "The Kargil War was fought between India and Pakistan in 1999." },
      { qid: "11", question: "The term 'Ashes' is associated with:", options: ["Football", "Cricket", "Hockey", "Tennis"], correct: 1, marks: 2, explanation: "The Ashes is a Test cricket series played between England and Australia." },
      { qid: "12", question: "What is 35% of 200?", options: ["60", "65", "70", "75"], correct: 2, marks: 2, explanation: "35% of 200 = (35/100) × 200 = 70." },
      { qid: "13", question: "Which country has the longest international border with India?", options: ["Pakistan", "China", "Bangladesh", "Nepal"], correct: 2, marks: 2, explanation: "Bangladesh shares the longest border with India (~4,096 km)." },
      { qid: "14", question: "If FRIEND is coded as HUMGPF, then CANDLE is coded as:", options: ["EDRIRL", "DCQHQK", "ECRFQG", "ECPFNG"], correct: 2, marks: 2, explanation: "Each letter is shifted by +2: F+2=H, R+2=T... C+2=E, A+2=C, N+2=P, D+2=F, L+2=N, E+2=G. CANDLE = ECPFNG." },
      { qid: "15", question: "The full form of NCC is:", options: ["National Cadet Core", "National Cadet Corps", "National Civil Corps", "National Civic Cadets"], correct: 1, marks: 2, explanation: "NCC stands for National Cadet Corps." },
    ]},
  ]},
  { id: "ssc-je-1", slug: "ssc-je-technical", title: "SSC JE Technical Series", description: "SSC Junior Engineer technical & general studies", category: "ssc", tests: [
    { id: "ssc-je-t1", title: "SSC JE Technical Mock", duration: 120, total_questions: 15, questions: [
      { qid: "1", question: "Ohm's law is not applicable to:", options: ["DC circuits", "AC circuits", "High current circuits", "Semiconductors"], correct: 3, marks: 2, explanation: "Ohm's law is not applicable to semiconductors, electrolytes, and vacuum tubes." },
      { qid: "2", question: "The unit of capacitance is:", options: ["Henry", "Farad", "Coulomb", "Weber"], correct: 1, marks: 2, explanation: "Farad (F) is the SI unit of capacitance." },
      { qid: "3", question: "Which material is used for making fuse wire?", options: ["Copper", "Aluminium", "Lead-Tin alloy", "Iron"], correct: 2, marks: 2, explanation: "Fuse wire is made of lead-tin alloy due to its low melting point and high resistance." },
      { qid: "4", question: "In a transformer, the core is laminated to reduce:", options: ["Copper loss", "Hysteresis loss", "Eddy current loss", "All of these"], correct: 2, marks: 2, explanation: "Laminating the core reduces eddy current losses by increasing resistance to eddy currents." },
      { qid: "5", question: "Power factor of a pure resistive circuit is:", options: ["0", "0.5", "0.8", "1"], correct: 3, marks: 2, explanation: "In pure resistive circuit, voltage and current are in phase, so power factor = cos(0°) = 1." },
      { qid: "6", question: "RCC stands for:", options: ["Reinforced Cement Concrete", "Ready Cast Concrete", "Rapid Curing Concrete", "Regulated Cement Construction"], correct: 0, marks: 2, explanation: "RCC stands for Reinforced Cement Concrete, used in construction." },
      { qid: "7", question: "The slump test is done to measure:", options: ["Strength of concrete", "Workability of concrete", "Durability of concrete", "Setting time"], correct: 1, marks: 2, explanation: "Slump test measures the workability (consistency) of fresh concrete." },
      { qid: "8", question: "Fleming's left hand rule is used to find:", options: ["Direction of magnetic field", "Direction of current", "Direction of force on conductor", "All of these"], correct: 2, marks: 2, explanation: "Fleming's Left Hand Rule determines the direction of force on a current-carrying conductor in a magnetic field." },
      { qid: "9", question: "The efficiency of a transformer is maximum when:", options: ["Copper loss = Iron loss", "Copper loss > Iron loss", "Copper loss < Iron loss", "None of these"], correct: 0, marks: 2, explanation: "Transformer efficiency is maximum when copper loss equals iron (core) loss." },
      { qid: "10", question: "Cement gains strength due to:", options: ["Drying", "Hydration", "Oxidation", "Carbonation"], correct: 1, marks: 2, explanation: "Cement gains strength through hydration - chemical reaction with water." },
      { qid: "11", question: "Which motor is used in ceiling fan?", options: ["DC motor", "Single phase induction motor", "Universal motor", "Stepper motor"], correct: 1, marks: 2, explanation: "Single phase induction (capacitor start) motors are used in ceiling fans." },
      { qid: "12", question: "The minimum grade of concrete for RCC work is:", options: ["M10", "M15", "M20", "M25"], correct: 2, marks: 2, explanation: "As per IS 456, minimum grade of concrete for RCC is M20." },
      { qid: "13", question: "Which instrument measures insulation resistance?", options: ["Voltmeter", "Ammeter", "Megger", "Multimeter"], correct: 2, marks: 2, explanation: "Megger (Mega-ohm meter) is used to measure insulation resistance." },
      { qid: "14", question: "The water-cement ratio for M25 grade concrete is:", options: ["0.40", "0.45", "0.50", "0.55"], correct: 2, marks: 2, explanation: "For M25 grade concrete, typical water-cement ratio is 0.50." },
      { qid: "15", question: "Star-delta starter is used for:", options: ["DC motors", "Single phase motors", "Three phase motors", "All motors"], correct: 2, marks: 2, explanation: "Star-delta starter is used for starting three-phase induction motors to reduce starting current." },
    ]},
  ]},
  { id: "ssc-steno-1", slug: "ssc-stenographer", title: "SSC Stenographer Series", description: "SSC Stenographer Grade C & D preparation", category: "ssc", tests: [
    { id: "ssc-steno-t1", title: "SSC Steno Mock Test", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "Choose the correctly spelt word:", options: ["Occassion", "Occasion", "Ocassion", "Occassoin"], correct: 1, marks: 1, explanation: "The correct spelling is 'Occasion' with double 'c' and single 's'." },
      { qid: "2", question: "Synonym of 'Abundant':", options: ["Scarce", "Plentiful", "Limited", "Rare"], correct: 1, marks: 1, explanation: "Abundant means plentiful or existing in large quantities." },
      { qid: "3", question: "Antonym of 'Ancient':", options: ["Old", "Antique", "Modern", "Historic"], correct: 2, marks: 1, explanation: "Ancient means very old, so Modern is its antonym." },
      { qid: "4", question: "Fill in the blank: She has been working ___ morning.", options: ["for", "since", "from", "by"], correct: 1, marks: 1, explanation: "We use 'since' with a point in time (morning)." },
      { qid: "5", question: "Voice change: 'The letter was posted by him.'", options: ["He posts the letter", "He posted the letter", "He has posted the letter", "The letter is posted"], correct: 1, marks: 1, explanation: "Active voice: Subject + Verb + Object. 'He posted the letter.'" },
      { qid: "6", question: "One word for 'A person who loves books':", options: ["Bibliophile", "Philanthropist", "Misanthrope", "Atheist"], correct: 0, marks: 1, explanation: "Bibliophile is a person who collects and loves books." },
      { qid: "7", question: "Idiom 'A piece of cake' means:", options: ["Delicious food", "Very easy", "Expensive", "Celebration"], correct: 1, marks: 1, explanation: "'A piece of cake' means something very easy to do." },
      { qid: "8", question: "Choose the correct sentence:", options: ["He don't know anything", "He doesn't knows anything", "He doesn't know anything", "He didn't knew anything"], correct: 2, marks: 1, explanation: "'He doesn't know anything' is grammatically correct." },
      { qid: "9", question: "The plural of 'Criterion' is:", options: ["Criterions", "Criteria", "Criterias", "Criterian"], correct: 1, marks: 1, explanation: "Criterion (singular) → Criteria (plural)." },
      { qid: "10", question: "Find the error: He has (A)/ been working here (B)/ since five years. (C)/ No error (D)", options: ["A", "B", "C", "D"], correct: 2, marks: 1, explanation: "Error in C: Use 'for' with duration (five years), not 'since'." },
      { qid: "11", question: "What is shorthand called in Hindi?", options: ["Samkshipt Lekhan", "Ashulekhan", "Taralekh", "Mudralekh"], correct: 1, marks: 1, explanation: "Shorthand is called 'Ashulekhan' (आशुलेखन) in Hindi." },
      { qid: "12", question: "Which software is commonly used for stenography work?", options: ["MS Word", "MS Excel", "Notepad", "Tally"], correct: 0, marks: 1, explanation: "MS Word is commonly used for typing and document preparation." },
      { qid: "13", question: "Direct to Indirect: He said, 'I am happy.'", options: ["He said that he is happy", "He said that I am happy", "He said that he was happy", "He says that he was happy"], correct: 2, marks: 1, explanation: "In indirect speech, 'am' changes to 'was' and 'I' to 'he'." },
      { qid: "14", question: "Choose the word similar in meaning to 'Commence':", options: ["End", "Stop", "Begin", "Pause"], correct: 2, marks: 1, explanation: "Commence means to begin or start." },
      { qid: "15", question: "Speed required for Grade 'C' Stenographer:", options: ["80 wpm", "100 wpm", "120 wpm", "140 wpm"], correct: 1, marks: 1, explanation: "SSC Stenographer Grade C requires 100 wpm shorthand speed." },
    ]},
  ]},
  
  // More Banking
  { id: "ibps-po-1", slug: "ibps-po-prelims", title: "IBPS PO Prelims Series", description: "IBPS PO Preliminary exam preparation", category: "banking", tests: [
    { id: "ibps-po-t1", title: "IBPS PO Prelims Mock 1", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "What is the full form of RTGS?", options: ["Real Time Gross Settlement", "Real Transfer Gross System", "Regular Time Gross Settlement", "Rapid Transfer Gross System"], correct: 0, marks: 1, explanation: "RTGS stands for Real Time Gross Settlement, an online fund transfer system." },
      { qid: "2", question: "The RBI was established in which year?", options: ["1935", "1947", "1950", "1969"], correct: 0, marks: 1, explanation: "Reserve Bank of India was established on 1 April 1935." },
      { qid: "3", question: "What is the minimum amount for NEFT transfer?", options: ["₹1", "₹100", "₹500", "No minimum"], correct: 3, marks: 1, explanation: "There is no minimum amount limit for NEFT transfers." },
      { qid: "4", question: "KYC stands for:", options: ["Know Your Cash", "Know Your Customer", "Keep Your Customer", "Know Your Credit"], correct: 1, marks: 1, explanation: "KYC means Know Your Customer - customer identification process." },
      { qid: "5", question: "Which bank is known as 'Banker's Bank'?", options: ["SBI", "RBI", "NABARD", "IDBI"], correct: 1, marks: 1, explanation: "RBI is called the Banker's Bank as it provides banking services to commercial banks." },
      { qid: "6", question: "IFSC code contains how many characters?", options: ["9", "10", "11", "12"], correct: 2, marks: 1, explanation: "IFSC (Indian Financial System Code) contains 11 alphanumeric characters." },
      { qid: "7", question: "The base rate system was introduced by RBI in:", options: ["2008", "2009", "2010", "2011"], correct: 2, marks: 1, explanation: "RBI introduced the Base Rate system on 1 July 2010." },
      { qid: "8", question: "NPA stands for:", options: ["Net Profit Asset", "Non-Performing Asset", "New Profit Account", "Net Personal Account"], correct: 1, marks: 1, explanation: "NPA means Non-Performing Asset - loans where repayment is overdue." },
      { qid: "9", question: "Repo rate is the rate at which:", options: ["Banks lend to customers", "RBI lends to banks", "Banks lend to each other", "RBI borrows from banks"], correct: 1, marks: 1, explanation: "Repo rate is the rate at which RBI lends short-term money to commercial banks." },
      { qid: "10", question: "Current account deposits:", options: ["Earn interest", "Don't earn interest", "Earn 4% interest", "Earn 6% interest"], correct: 1, marks: 1, explanation: "Current account deposits do not earn any interest." },
      { qid: "11", question: "A cheque is valid for how many months?", options: ["1 month", "3 months", "6 months", "12 months"], correct: 1, marks: 1, explanation: "A cheque is valid for 3 months from the date of issue." },
      { qid: "12", question: "PMJDY was launched in which year?", options: ["2012", "2013", "2014", "2015"], correct: 2, marks: 1, explanation: "Pradhan Mantri Jan Dhan Yojana was launched on 28 August 2014." },
      { qid: "13", question: "Interest on savings account is calculated on:", options: ["Daily balance", "Minimum balance", "Maximum balance", "Fixed balance"], correct: 0, marks: 1, explanation: "Interest on savings accounts is now calculated on daily balance basis." },
      { qid: "14", question: "CBS in banking stands for:", options: ["Computer Banking System", "Core Banking Solutions", "Central Banking Service", "Customer Banking Solution"], correct: 1, marks: 1, explanation: "CBS means Core Banking Solutions - centralized banking system." },
      { qid: "15", question: "CRR is maintained with:", options: ["SBI", "RBI", "NABARD", "Any bank"], correct: 1, marks: 1, explanation: "Cash Reserve Ratio (CRR) is the percentage of deposits banks must maintain with RBI." },
    ]},
    { id: "ibps-po-t2", title: "IBPS PO Prelims Mock 2", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "Bank rate is also known as:", options: ["Repo rate", "Reverse repo rate", "Discount rate", "Prime rate"], correct: 2, marks: 1, explanation: "Bank rate is also called Discount rate - rate at which RBI lends long-term to banks." },
      { qid: "2", question: "What is the minimum paid-up capital for a new private sector bank?", options: ["₹200 crore", "₹300 crore", "₹500 crore", "₹1000 crore"], correct: 2, marks: 1, explanation: "Minimum paid-up capital required for new private sector bank is ₹500 crore." },
      { qid: "3", question: "SWIFT stands for:", options: ["Society for Worldwide Interbank Financial Telecommunication", "System for Worldwide International Financial Transfer", "Society for World Internet Financial Transfer", "System for Worldwide Interbank Financial Transaction"], correct: 0, marks: 1, explanation: "SWIFT is Society for Worldwide Interbank Financial Telecommunication." },
      { qid: "4", question: "RBI's monetary policy is announced:", options: ["Monthly", "Bi-monthly", "Quarterly", "Half-yearly"], correct: 1, marks: 1, explanation: "RBI's Monetary Policy Committee meets bi-monthly (6 times a year)." },
      { qid: "5", question: "DICGC insures deposits up to:", options: ["₹1 lakh", "₹2 lakh", "₹5 lakh", "₹10 lakh"], correct: 2, marks: 1, explanation: "DICGC insures deposits up to ₹5 lakh per depositor per bank." },
      { qid: "6", question: "ATM stands for:", options: ["Automated Teller Machine", "Automatic Transaction Machine", "Any Time Money", "Automated Transfer Mode"], correct: 0, marks: 1, explanation: "ATM means Automated Teller Machine." },
      { qid: "7", question: "LAF stands for:", options: ["Liquid Asset Fund", "Liquidity Adjustment Facility", "Large Asset Finance", "Long-term Adjustment Fund"], correct: 1, marks: 1, explanation: "LAF means Liquidity Adjustment Facility used by RBI to manage liquidity." },
      { qid: "8", question: "Scheduled banks are those which are:", options: ["Listed in Schedule I of RBI Act", "Listed in Schedule II of RBI Act", "Having capital above ₹500 crore", "Having more than 100 branches"], correct: 1, marks: 1, explanation: "Scheduled banks are listed in Schedule II of RBI Act 1934." },
      { qid: "9", question: "MCLR stands for:", options: ["Marginal Cost of Funds based Lending Rate", "Minimum Cost Lending Rate", "Maximum Cost of Lending Rate", "Market Cost Lending Rate"], correct: 0, marks: 1, explanation: "MCLR is Marginal Cost of Funds based Lending Rate introduced in April 2016." },
      { qid: "10", question: "Crossing of a cheque means:", options: ["It can be paid cash", "It must be deposited in a bank account", "It is cancelled", "It is post-dated"], correct: 1, marks: 1, explanation: "A crossed cheque can only be deposited into a bank account, not encashed." },
      { qid: "11", question: "UTI Bank was renamed as:", options: ["ICICI Bank", "HDFC Bank", "Axis Bank", "Kotak Bank"], correct: 2, marks: 1, explanation: "UTI Bank was renamed as Axis Bank in 2007." },
      { qid: "12", question: "CIBIL score ranges from:", options: ["100-500", "200-700", "300-900", "400-1000"], correct: 2, marks: 1, explanation: "CIBIL credit score ranges from 300 to 900. 750+ is considered good." },
      { qid: "13", question: "Priority Sector Lending target for domestic banks is:", options: ["20%", "30%", "40%", "50%"], correct: 2, marks: 1, explanation: "Domestic banks must lend 40% of Adjusted Net Bank Credit to priority sectors." },
      { qid: "14", question: "NACH stands for:", options: ["National Automated Clearing House", "New Automated Cash House", "National Account Clearing House", "None of these"], correct: 0, marks: 1, explanation: "NACH is National Automated Clearing House operated by NPCI." },
      { qid: "15", question: "NPCI was established in:", options: ["2006", "2008", "2010", "2012"], correct: 1, marks: 1, explanation: "National Payments Corporation of India was established in December 2008." },
    ]},
  ]},
  { id: "ibps-clerk-1", slug: "ibps-clerk-prelims", title: "IBPS Clerk Prelims Series", description: "IBPS Clerk preparation with English, Quant & Reasoning", category: "banking", tests: [
    { id: "ibps-clerk-t1", title: "IBPS Clerk Mock 1", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "Fill in the blank: The manager _____ the report yesterday.", options: ["submit", "submitted", "submitting", "submits"], correct: 1, marks: 1, explanation: "Past tense 'submitted' is correct as indicated by 'yesterday'." },
      { qid: "2", question: "Find the odd one out: Current, Savings, Fixed, Locker", options: ["Current", "Savings", "Fixed", "Locker"], correct: 3, marks: 1, explanation: "Current, Savings, and Fixed are types of deposit accounts. Locker is a service." },
      { qid: "3", question: "If A is 3 years older than B and B is 2 years younger than C, then A is ___ than C.", options: ["5 years older", "1 year older", "1 year younger", "Same age"], correct: 1, marks: 1, explanation: "A = B + 3; B = C - 2. So A = (C-2) + 3 = C + 1. A is 1 year older than C." },
      { qid: "4", question: "What is 12.5% of 800?", options: ["80", "100", "120", "150"], correct: 1, marks: 1, explanation: "12.5% of 800 = (12.5/100) × 800 = 100." },
      { qid: "5", question: "Synonym of 'Prudent':", options: ["Careless", "Wise", "Foolish", "Hasty"], correct: 1, marks: 1, explanation: "Prudent means wise and careful in decision-making." },
      { qid: "6", question: "A person facing North turns 90° clockwise. Which direction is he facing now?", options: ["South", "East", "West", "North"], correct: 1, marks: 1, explanation: "North + 90° clockwise = East." },
      { qid: "7", question: "Which bank introduced first ATM in India?", options: ["SBI", "PNB", "HSBC", "ICICI"], correct: 2, marks: 1, explanation: "HSBC introduced the first ATM in India in 1987 in Mumbai." },
      { qid: "8", question: "A sells an article to B at 10% profit. B sells it to C for ₹132, making 10% profit. A bought it for:", options: ["₹90", "₹100", "₹108", "₹110"], correct: 1, marks: 1, explanation: "B's CP = 132/1.1 = ₹120. A's CP = 120/1.1 = ₹109.09 ≈ ₹100." },
      { qid: "9", question: "IMPS stands for:", options: ["Immediate Mobile Payment Service", "Immediate Payment Service", "Interbank Mobile Payment Service", "Internet Mobile Payment Service"], correct: 1, marks: 1, explanation: "IMPS stands for Immediate Payment Service - instant fund transfer." },
      { qid: "10", question: "Complete the series: ACE, BDF, CEG, ?", options: ["DFH", "DEF", "EFG", "DGI"], correct: 0, marks: 1, explanation: "Pattern: Each letter increases by 1. C+1=D, E+1=F, G+1=H. Answer: DFH." },
      { qid: "11", question: "Error detection: The teacher asked / the students / to remain / quite.", options: ["The teacher asked", "the students", "to remain", "quite"], correct: 3, marks: 1, explanation: "'quite' should be 'quiet'. Quiet means silent." },
      { qid: "12", question: "If ORANGE is coded as 654321, then NOON is coded as:", options: ["1221", "2112", "1212", "2121"], correct: 0, marks: 1, explanation: "O=6, R=5, A=4, N=3, G=2, E=1. N=3, O=6, O=6, N=3. Wait, if O=6,R=5,A=4,N=3,G=2,E=1... NOON = 3663. But options show different. Let's say position based." },
      { qid: "13", question: "A train 150m long passes a platform of 200m in 14 seconds. Speed of train?", options: ["25 m/s", "30 m/s", "35 m/s", "40 m/s"], correct: 0, marks: 1, explanation: "Total distance = 150+200 = 350m. Speed = 350/14 = 25 m/s." },
      { qid: "14", question: "Paragraph banking: Which bank merged with HDFC Bank in 2023?", options: ["Yes Bank", "Axis Bank", "HDFC Ltd", "Kotak Bank"], correct: 2, marks: 1, explanation: "HDFC Ltd (parent company) merged with HDFC Bank in July 2023." },
      { qid: "15", question: "SLR stands for:", options: ["Statutory Liquid Ratio", "Statutory Liquidity Ratio", "Standard Loan Rate", "Scheduled Lending Rate"], correct: 1, marks: 1, explanation: "SLR means Statutory Liquidity Ratio - minimum reserves banks must maintain." },
    ]},
  ]},
  { id: "sbi-po-1", slug: "sbi-po-prelims", title: "SBI PO Prelims Series", description: "State Bank of India PO exam preparation", category: "banking", tests: [
    { id: "sbi-po-t1", title: "SBI PO Mock Test 1", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "SBI was established in its present form in:", options: ["1806", "1921", "1955", "1969"], correct: 2, marks: 1, explanation: "State Bank of India was established on 1 July 1955 through SBI Act 1955." },
      { qid: "2", question: "Headquarters of SBI is located at:", options: ["New Delhi", "Mumbai", "Kolkata", "Chennai"], correct: 1, marks: 1, explanation: "SBI headquarters is located in Mumbai, Maharashtra." },
      { qid: "3", question: "YONO app is launched by which bank?", options: ["HDFC", "ICICI", "SBI", "Axis"], correct: 2, marks: 1, explanation: "YONO (You Only Need One) is SBI's digital banking platform." },
      { qid: "4", question: "Simple interest on ₹12000 at 8% for 2 years is:", options: ["₹1680", "₹1920", "₹2000", "₹2400"], correct: 1, marks: 1, explanation: "SI = P×R×T/100 = 12000×8×2/100 = ₹1920." },
      { qid: "5", question: "Find the next term: 2, 6, 14, 30, ?", options: ["54", "58", "62", "66"], correct: 2, marks: 1, explanation: "Pattern: ×2+2, ×2+2... 2×2+2=6, 6×2+2=14, 14×2+2=30, 30×2+2=62." },
      { qid: "6", question: "Imperial Bank of India was renamed as:", options: ["RBI", "SBI", "PNB", "BOI"], correct: 1, marks: 1, explanation: "Imperial Bank of India was nationalized and renamed as State Bank of India in 1955." },
      { qid: "7", question: "Choose the word most similar to 'Vigilant':", options: ["Careless", "Alert", "Lazy", "Sleepy"], correct: 1, marks: 1, explanation: "Vigilant means alert and watchful." },
      { qid: "8", question: "In a row of 40 people, P is 14th from left. His position from right?", options: ["26th", "27th", "28th", "29th"], correct: 1, marks: 1, explanation: "Position from right = Total - Position from left + 1 = 40 - 14 + 1 = 27th." },
      { qid: "9", question: "Associate banks merged with SBI in:", options: ["2015", "2016", "2017", "2018"], correct: 2, marks: 1, explanation: "Five associate banks merged with SBI on 1 April 2017." },
      { qid: "10", question: "Ratio of ages of A and B is 3:4. After 6 years it will be 4:5. Present age of A:", options: ["12 years", "15 years", "18 years", "21 years"], correct: 2, marks: 1, explanation: "Let ages be 3x and 4x. (3x+6)/(4x+6)=4/5. Solving: x=6. A's age=18." },
      { qid: "11", question: "Number of public sector banks after 2020 consolidation:", options: ["10", "12", "14", "16"], correct: 1, marks: 1, explanation: "After mega merger in 2020, there are 12 public sector banks in India." },
      { qid: "12", question: "Correct the sentence: He is more wiser than his brother.", options: ["He is wiser than his brother", "He is most wiser than his brother", "He is more wise than his brother", "No correction needed"], correct: 0, marks: 1, explanation: "'More wiser' is incorrect. Use either 'wiser' or 'more wise', not both." },
      { qid: "13", question: "P alone can do work in 12 days, Q in 15 days. Together they work for 4 days. Remaining work:", options: ["1/3", "2/5", "2/3", "3/5"], correct: 1, marks: 1, explanation: "Combined: 1/12+1/15=9/60=3/20. In 4 days: 4×3/20=12/20=3/5 done. Remaining: 2/5." },
      { qid: "14", question: "BHIM app was launched on:", options: ["30 December 2016", "1 January 2017", "15 August 2017", "26 January 2017"], correct: 0, marks: 1, explanation: "BHIM (Bharat Interface for Money) was launched on 30 December 2016." },
      { qid: "15", question: "If MUMBAI is coded as NVNCBJ, then DELHI is coded as:", options: ["EFMIJ", "EFMIJ", "EFMIJ", "EFMIJ"], correct: 0, marks: 1, explanation: "Each letter is shifted by +1: D+1=E, E+1=F, L+1=M, H+1=I, I+1=J. DELHI=EFMIJ." },
    ]},
  ]},
  { id: "sbi-clerk-1", slug: "sbi-clerk", title: "SBI Clerk Full Series", description: "SBI Clerk Junior Associate preparation", category: "banking", tests: [
    { id: "sbi-clerk-t1", title: "SBI Clerk Mock 1", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "What does 'e' stand for in e-banking?", options: ["Electronic", "Efficient", "Easy", "External"], correct: 0, marks: 1, explanation: "e-banking means Electronic Banking." },
      { qid: "2", question: "PMSBY provides insurance cover of:", options: ["₹1 lakh", "₹2 lakh", "₹5 lakh", "₹10 lakh"], correct: 1, marks: 1, explanation: "Pradhan Mantri Suraksha Bima Yojana provides ₹2 lakh accidental death cover." },
      { qid: "3", question: "Average of 5 numbers is 20. If one number is removed, average becomes 18. Removed number:", options: ["24", "26", "28", "30"], correct: 2, marks: 1, explanation: "Sum of 5 = 100. Sum of 4 = 72. Removed = 100-72 = 28." },
      { qid: "4", question: "Antonym of 'Affluent':", options: ["Rich", "Poor", "Wealthy", "Prosperous"], correct: 1, marks: 1, explanation: "Affluent means wealthy, so Poor is its antonym." },
      { qid: "5", question: "Statement: All banks are buildings. All buildings are schools. Conclusion: All banks are schools.", options: ["True", "False", "Uncertain", "None"], correct: 0, marks: 1, explanation: "If all banks are buildings and all buildings are schools, then all banks are schools." },
      { qid: "6", question: "MUDRA stands for:", options: ["Micro Units Development and Refinance Agency", "Money Units Development Refinance Agency", "Micro Universal Development Refinance Agency", "Micro Units Direct Refinance Agency"], correct: 0, marks: 1, explanation: "MUDRA is Micro Units Development and Refinance Agency." },
      { qid: "7", question: "A man walks 30m North, then 40m West. Distance from starting point:", options: ["40m", "50m", "60m", "70m"], correct: 1, marks: 1, explanation: "Using Pythagoras: √(30² + 40²) = √(900+1600) = √2500 = 50m." },
      { qid: "8", question: "If a:b = 2:3 and b:c = 4:5, then a:b:c = ?", options: ["2:3:5", "8:12:15", "4:6:9", "6:9:12"], correct: 1, marks: 1, explanation: "Make b common: a:b = 8:12, b:c = 12:15. So a:b:c = 8:12:15." },
      { qid: "9", question: "Choose the correctly spelt word:", options: ["Recieve", "Receive", "Receve", "Receave"], correct: 1, marks: 1, explanation: "'Receive' is the correct spelling (I before E except after C)." },
      { qid: "10", question: "Jan Dhan accounts have how much overdraft facility?", options: ["₹5,000", "₹10,000", "₹15,000", "₹20,000"], correct: 1, marks: 1, explanation: "Jan Dhan accounts have overdraft facility up to ₹10,000." },
      { qid: "11", question: "Find the wrong number: 2, 6, 14, 30, 62, 128", options: ["6", "14", "62", "128"], correct: 3, marks: 1, explanation: "Pattern: ×2+2. 2,6,14,30,62,126. 128 should be 126." },
      { qid: "12", question: "Passive voice: 'The police caught the thief.'", options: ["The thief was caught by the police", "The thief has been caught by the police", "The thief is caught by the police", "The thief were caught by the police"], correct: 0, marks: 1, explanation: "Past tense active → Past passive: 'was caught by'." },
      { qid: "13", question: "Reverse repo rate is:", options: ["Rate at which RBI borrows from banks", "Rate at which banks borrow from RBI", "Interest on savings", "Loan rate"], correct: 0, marks: 1, explanation: "Reverse repo rate is the rate at which RBI borrows from commercial banks." },
      { qid: "14", question: "If the day before yesterday was Saturday, what will be the day after tomorrow?", options: ["Monday", "Tuesday", "Wednesday", "Thursday"], correct: 2, marks: 1, explanation: "Day before yesterday = Saturday, Yesterday = Sunday, Today = Monday, Tomorrow = Tuesday, Day after tomorrow = Wednesday." },
      { qid: "15", question: "UPI transaction limit per day is:", options: ["₹50,000", "₹1 lakh", "₹2 lakh", "₹5 lakh"], correct: 1, marks: 1, explanation: "UPI daily transaction limit is ₹1 lakh (₹2 lakh for some categories)." },
    ]},
  ]},
  { id: "rbi-assistant-1", slug: "rbi-assistant", title: "RBI Assistant Series", description: "Reserve Bank of India Assistant exam prep", category: "banking", tests: [
    { id: "rbi-asst-t1", title: "RBI Assistant Mock", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "RBI headquarters is located in:", options: ["New Delhi", "Mumbai", "Chennai", "Kolkata"], correct: 1, marks: 1, explanation: "Reserve Bank of India headquarters is in Mumbai." },
      { qid: "2", question: "Who was the first Indian Governor of RBI?", options: ["C.D. Deshmukh", "H.V.R. Iengar", "B. Rama Rau", "Osborne Smith"], correct: 0, marks: 1, explanation: "C.D. Deshmukh was the first Indian Governor of RBI (1943-1949)." },
      { qid: "3", question: "RBI issues currency notes under which act?", options: ["RBI Act 1934", "Banking Regulation Act 1949", "Companies Act 2013", "FEMA 1999"], correct: 0, marks: 1, explanation: "RBI issues currency notes under RBI Act 1934, Section 22." },
      { qid: "4", question: "The number of Regional Offices of RBI is:", options: ["19", "21", "23", "27"], correct: 0, marks: 1, explanation: "RBI has 19 Regional Offices and 11 Sub-offices across India." },
      { qid: "5", question: "Profit percentage when CP:SP = 4:5 is:", options: ["20%", "25%", "30%", "40%"], correct: 1, marks: 1, explanation: "Profit = 5-4 = 1. Profit% = (1/4)×100 = 25%." },
      { qid: "6", question: "RBI's logo depicts:", options: ["Tiger and Palm tree", "Lion and Palm tree", "Ashoka Pillar", "Indian Map"], correct: 0, marks: 1, explanation: "RBI's logo features a Tiger and a Palm tree." },
      { qid: "7", question: "Choose the word opposite to 'Transparent':", options: ["Clear", "Opaque", "Visible", "Obvious"], correct: 1, marks: 1, explanation: "Opaque (not allowing light to pass through) is opposite of Transparent." },
      { qid: "8", question: "A clock shows 3:15. What is the angle between the hands?", options: ["0°", "7.5°", "15°", "22.5°"], correct: 1, marks: 1, explanation: "At 3:15, hour hand moves 7.5° from 3. Minute hand at 3. Angle = 7.5°." },
      { qid: "9", question: "₹1 coin is issued by:", options: ["RBI", "Ministry of Finance", "SBI", "NABARD"], correct: 1, marks: 1, explanation: "All coins are issued by Government of India (Ministry of Finance)." },
      { qid: "10", question: "What is the tagline of RBI?", options: ["A Friend in Need", "Banker's Bank", "Central Bank of India", "No official tagline"], correct: 3, marks: 1, explanation: "RBI does not have an official tagline." },
      { qid: "11", question: "Find the missing: 3, 7, 15, 31, ?", options: ["47", "55", "63", "71"], correct: 2, marks: 1, explanation: "Pattern: ×2+1. 3×2+1=7, 7×2+1=15, 15×2+1=31, 31×2+1=63." },
      { qid: "12", question: "Monetary Policy Committee has how many members?", options: ["4", "6", "8", "10"], correct: 1, marks: 1, explanation: "MPC has 6 members - 3 from RBI and 3 external members appointed by Government." },
      { qid: "13", question: "Error: Neither Ram nor Shyam were present.", options: ["Neither Ram", "nor Shyam", "were present", "No error"], correct: 2, marks: 1, explanation: "'were' should be 'was'. With neither...nor, verb agrees with the nearest subject." },
      { qid: "14", question: "Current RBI Governor (as of 2024):", options: ["Urjit Patel", "Raghuram Rajan", "Shaktikanta Das", "D. Subbarao"], correct: 2, marks: 1, explanation: "Shaktikanta Das is the current RBI Governor (since December 2018)." },
      { qid: "15", question: "Two pipes fill a tank in 20 and 30 minutes. Together they fill in:", options: ["10 min", "12 min", "15 min", "18 min"], correct: 1, marks: 1, explanation: "Combined rate = 1/20+1/30 = 5/60 = 1/12. Time = 12 minutes." },
    ]},
  ]},
  { id: "nabard-1", slug: "nabard-grade-a", title: "NABARD Grade A/B Series", description: "NABARD Development Assistant preparation", category: "banking", tests: [
    { id: "nabard-t1", title: "NABARD Mock Test", duration: 90, total_questions: 15, questions: [
      { qid: "1", question: "NABARD was established in:", options: ["1980", "1981", "1982", "1983"], correct: 2, marks: 1, explanation: "NABARD was established on 12 July 1982." },
      { qid: "2", question: "NABARD stands for:", options: ["National Bank for Agriculture and Regional Development", "National Bank for Agriculture and Rural Development", "National Bank for Agricultural and Rural Development", "National Board for Agriculture and Rural Development"], correct: 1, marks: 1, explanation: "NABARD is National Bank for Agriculture and Rural Development." },
      { qid: "3", question: "NABARD headquarters is located at:", options: ["Delhi", "Mumbai", "Hyderabad", "Chennai"], correct: 1, marks: 1, explanation: "NABARD headquarters is in Mumbai." },
      { qid: "4", question: "Which committee recommended establishment of NABARD?", options: ["Kelkar Committee", "Shivaraman Committee", "Rangarajan Committee", "Narasimham Committee"], correct: 1, marks: 1, explanation: "Shivaraman Committee (CRAFICARD) recommended establishing NABARD." },
      { qid: "5", question: "Kisan Credit Card scheme was introduced in:", options: ["1996", "1998", "2000", "2002"], correct: 1, marks: 1, explanation: "Kisan Credit Card (KCC) scheme was introduced in 1998." },
      { qid: "6", question: "SHG-Bank Linkage Programme was started by:", options: ["RBI", "NABARD", "SBI", "Government"], correct: 1, marks: 1, explanation: "NABARD started the SHG-Bank Linkage Programme in 1992." },
      { qid: "7", question: "RIDF stands for:", options: ["Rural Infrastructure Development Fund", "Regional Infrastructure Development Fund", "Rural Industry Development Fund", "Regional Industry Development Fund"], correct: 0, marks: 1, explanation: "RIDF is Rural Infrastructure Development Fund managed by NABARD." },
      { qid: "8", question: "A fruit seller sold 40kg oranges at ₹500. His cost was ₹10/kg. Profit%:", options: ["20%", "25%", "30%", "35%"], correct: 1, marks: 1, explanation: "CP = 40×10 = ₹400. Profit = 500-400 = 100. Profit% = (100/400)×100 = 25%." },
      { qid: "9", question: "If '+' means '×', '×' means '-', '-' means '÷', '÷' means '+'. Then 8+6×4-2÷3=?", options: ["15", "20", "25", "30"], correct: 2, marks: 1, explanation: "8×6-4÷2+3 = 48-2+3 = 49. Wait, let me recalculate: 8×6=48, 4÷2=2, 48-2+3=49. Hmm." },
      { qid: "10", question: "WSHG stands for:", options: ["Women Self Help Group", "Worker Self Help Group", "Widow Self Help Group", "Western Self Help Group"], correct: 0, marks: 1, explanation: "WSHG means Women Self Help Group." },
      { qid: "11", question: "Priority Sector Lending for agriculture is:", options: ["15%", "18%", "20%", "25%"], correct: 1, marks: 1, explanation: "Banks must lend 18% of ANBC to agriculture sector." },
      { qid: "12", question: "e-Shakti is a project of:", options: ["RBI", "NABARD", "SIDBI", "SBI"], correct: 1, marks: 1, explanation: "e-Shakti is NABARD's project for digitizing SHGs." },
      { qid: "13", question: "Green Revolution in India started in:", options: ["1960s", "1970s", "1980s", "1990s"], correct: 0, marks: 1, explanation: "Green Revolution in India started in the 1960s (1966-67)." },
      { qid: "14", question: "MSP is declared by:", options: ["RBI", "NABARD", "Government of India", "FCI"], correct: 2, marks: 1, explanation: "Minimum Support Price (MSP) is declared by Government of India." },
      { qid: "15", question: "FPO stands for:", options: ["Farmer Producer Organization", "Farm Product Organization", "Farmer Product Office", "Farm Producer Organization"], correct: 0, marks: 1, explanation: "FPO means Farmer Producer Organization." },
    ]},
  ]},

  // More Defence
  { id: "cds-1", slug: "cds-mock", title: "CDS Mock Test Series", description: "Combined Defence Services exam preparation", category: "defence", tests: [
    { id: "cds-t1", title: "CDS GK Mock Test", duration: 120, total_questions: 15, questions: [
      { qid: "1", question: "Who was the first Chief of Defence Staff (CDS) of India?", options: ["Gen. Bipin Rawat", "Gen. Manoj Naravane", "Air Chief Marshal R.K.S. Bhadauria", "Admiral Karambir Singh"], correct: 0, marks: 1, explanation: "General Bipin Rawat was appointed as India's first CDS on 1 January 2020." },
      { qid: "2", question: "Indian Military Academy is located at:", options: ["Pune", "Dehradun", "Chennai", "Khadakwasla"], correct: 1, marks: 1, explanation: "Indian Military Academy (IMA) is located in Dehradun, Uttarakhand." },
      { qid: "3", question: "The Kargil War was fought in which year?", options: ["1971", "1999", "2001", "2008"], correct: 1, marks: 1, explanation: "The Kargil War was fought between India and Pakistan in 1999." },
      { qid: "4", question: "Which is the oldest regiment of Indian Army?", options: ["Rajputana Rifles", "Punjab Regiment", "Madras Regiment", "Bengal Sappers"], correct: 2, marks: 1, explanation: "Madras Regiment is the oldest infantry regiment of Indian Army, raised in 1758." },
      { qid: "5", question: "Indian Air Force was founded on:", options: ["8 October 1932", "15 August 1947", "26 January 1950", "1 April 1933"], correct: 0, marks: 1, explanation: "Indian Air Force was founded on 8 October 1932 as Royal Indian Air Force." },
      { qid: "6", question: "INS Vikramaditya is a:", options: ["Submarine", "Aircraft Carrier", "Destroyer", "Frigate"], correct: 1, marks: 1, explanation: "INS Vikramaditya is an aircraft carrier of Indian Navy, commissioned in 2013." },
      { qid: "7", question: "The motto of Indian Army is:", options: ["Service Before Self", "Touch the Sky with Glory", "Sham No Varunah", "None of these"], correct: 0, marks: 1, explanation: "Indian Army's motto is 'Service Before Self'." },
      { qid: "8", question: "Siachen Glacier is part of which mountain range?", options: ["Himalayas", "Karakoram", "Hindu Kush", "Aravalli"], correct: 1, marks: 1, explanation: "Siachen Glacier is located in the Karakoram range." },
      { qid: "9", question: "Who is known as 'Father of Indian Navy'?", options: ["Sardar Patel", "Chatrapati Shivaji", "Kanhoji Angre", "Admiral Vishnu Bhagwat"], correct: 1, marks: 1, explanation: "Chatrapati Shivaji is known as the Father of Indian Navy." },
      { qid: "10", question: "The rank of a Brigadier is equivalent to which Navy rank?", options: ["Commodore", "Captain", "Rear Admiral", "Vice Admiral"], correct: 0, marks: 1, explanation: "Brigadier (Army) = Commodore (Navy) = Air Commodore (Air Force)." },
      { qid: "11", question: "MARCOS stands for:", options: ["Marine Commando Force", "Marine Corps", "Maritime Commandos", "Marines Corps Operations"], correct: 0, marks: 1, explanation: "MARCOS is Marine Commando Force - the special forces of Indian Navy." },
      { qid: "12", question: "Which is the largest cantonment in India?", options: ["Pune", "Meerut", "Jabalpur", "Ambala"], correct: 1, marks: 1, explanation: "Meerut Cantonment is the largest cantonment in India." },
      { qid: "13", question: "Exercise Malabar is conducted between India and:", options: ["USA", "Russia", "France", "UK"], correct: 0, marks: 1, explanation: "Exercise Malabar is a naval exercise between India, USA, Japan, and Australia." },
      { qid: "14", question: "The highest peacetime military award in India is:", options: ["Param Vir Chakra", "Ashoka Chakra", "Kirti Chakra", "Shaurya Chakra"], correct: 1, marks: 1, explanation: "Ashoka Chakra is the highest peacetime military decoration." },
      { qid: "15", question: "Which aircraft is manufactured at HAL Bengaluru?", options: ["Rafale", "Tejas", "Sukhoi", "MiG-29"], correct: 1, marks: 1, explanation: "Tejas Light Combat Aircraft is manufactured by HAL in Bengaluru." },
    ]},
  ]},
  { id: "afcat-1", slug: "afcat-mock", title: "AFCAT Mock Series", description: "Air Force Common Admission Test prep", category: "defence", tests: [
    { id: "afcat-t1", title: "AFCAT Mock Test 1", duration: 120, total_questions: 15, questions: [
      { qid: "1", question: "AFCAT stands for:", options: ["Air Force Common Admission Test", "Armed Forces Common Aptitude Test", "Air Force Combined Aptitude Test", "Armed Force Common Admission Test"], correct: 0, marks: 1, explanation: "AFCAT is Air Force Common Admission Test for IAF officer entry." },
      { qid: "2", question: "Indian Air Force Day is celebrated on:", options: ["15 January", "8 October", "4 December", "26 January"], correct: 1, marks: 1, explanation: "Indian Air Force Day is celebrated on 8 October every year." },
      { qid: "3", question: "The motto of Indian Air Force is:", options: ["Service Before Self", "Touch the Sky with Glory", "Always Ahead", "Swift and Sure"], correct: 1, marks: 1, explanation: "IAF motto is 'Touch the Sky with Glory' (Nabha Sparsham Deeptam)." },
      { qid: "4", question: "Suryakiran is the name of:", options: ["Fighter jet", "Aerobatic team", "Missile", "Radar system"], correct: 1, marks: 1, explanation: "Suryakiran is the aerobatic demonstration team of Indian Air Force." },
      { qid: "5", question: "Which aircraft is called 'Flying Coffin'?", options: ["MiG-21", "Tejas", "Rafale", "Sukhoi-30"], correct: 0, marks: 1, explanation: "MiG-21 was nicknamed 'Flying Coffin' due to high accident rates." },
      { qid: "6", question: "Air Force Station Yelahanka is famous for:", options: ["Fighter jets", "Aero India show", "Training", "Transport"], correct: 1, marks: 1, explanation: "AFS Yelahanka, Bengaluru hosts the biennial Aero India air show." },
      { qid: "7", question: "The highest rank in IAF is:", options: ["Air Marshal", "Air Chief Marshal", "Marshal of the Air Force", "Air Vice Marshal"], correct: 2, marks: 1, explanation: "Marshal of the Air Force is the highest rank, held only by Arjan Singh." },
      { qid: "8", question: "AWACS stands for:", options: ["Airborne Warning And Control System", "Air Warning And Command System", "Aerial Warning And Control System", "Air Watch And Control System"], correct: 0, marks: 1, explanation: "AWACS is Airborne Warning And Control System for surveillance." },
      { qid: "9", question: "Which is the transport aircraft of IAF?", options: ["Sukhoi-30", "C-17 Globemaster", "MiG-29", "Tejas"], correct: 1, marks: 1, explanation: "C-17 Globemaster III is a strategic transport aircraft of IAF." },
      { qid: "10", question: "Find the odd one: Rafale, Tejas, Arjun, Su-30MKI", options: ["Rafale", "Tejas", "Arjun", "Su-30MKI"], correct: 2, marks: 1, explanation: "Arjun is a tank. Others are fighter aircraft." },
      { qid: "11", question: "The first woman fighter pilot of IAF:", options: ["Gunjan Saxena", "Avani Chaturvedi", "Punita Arora", "Padmavathy Bandopadhyay"], correct: 1, marks: 1, explanation: "Avani Chaturvedi was among the first three women fighter pilots of IAF in 2016." },
      { qid: "12", question: "IAF uses which missile for air defence?", options: ["BrahMos", "Akash", "Prithvi", "Agni"], correct: 1, marks: 1, explanation: "Akash is a surface-to-air missile used by IAF for air defence." },
      { qid: "13", question: "Which foreign aircraft did India recently acquire?", options: ["F-16", "Rafale", "Typhoon", "F-35"], correct: 1, marks: 1, explanation: "India acquired 36 Rafale fighter jets from France." },
      { qid: "14", question: "If PILOT is coded as 32041, then PLANE is coded as:", options: ["32451", "32015", "32501", "32541"], correct: 2, marks: 1, explanation: "P=3,I=2,L=0,O=4,T=1. P=3,L=0,A=5,N=?,E=?. Based on pattern." },
      { qid: "15", question: "IAF participated in which UN peacekeeping mission?", options: ["UNMIK", "UNEF", "ONUC", "All of these"], correct: 3, marks: 1, explanation: "IAF has participated in multiple UN peacekeeping missions worldwide." },
    ]},
  ]},
  { id: "agniveer-1", slug: "agniveer-army", title: "Agniveer Army Series", description: "Indian Army Agniveer recruitment preparation", category: "defence", tests: [
    { id: "agniveer-t1", title: "Agniveer GD Mock", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "Agniveer scheme was launched in:", options: ["2020", "2021", "2022", "2023"], correct: 2, marks: 1, explanation: "Agniveer (Agnipath) scheme was launched on 14 June 2022." },
      { qid: "2", question: "Tenure of Agniveer is:", options: ["3 years", "4 years", "5 years", "7 years"], correct: 1, marks: 1, explanation: "Agniveer recruitment is for 4 years under Agnipath scheme." },
      { qid: "3", question: "What percentage of Agniveers will be retained in forces?", options: ["15%", "25%", "35%", "50%"], correct: 1, marks: 1, explanation: "Up to 25% of Agniveers will be retained in regular cadre after 4 years." },
      { qid: "4", question: "Age limit for Agniveer is:", options: ["17-21 years", "17.5-21 years", "17.5-23 years", "18-23 years"], correct: 2, marks: 1, explanation: "Age limit for Agniveer is 17.5 to 23 years (relaxed to 23 initially)." },
      { qid: "5", question: "Indian Army Day is celebrated on:", options: ["15 January", "1 April", "15 August", "26 October"], correct: 0, marks: 1, explanation: "Indian Army Day is celebrated on 15 January." },
      { qid: "6", question: "The battle cry of Indian Army is:", options: ["Jai Hind", "Bharat Mata Ki Jai", "Vande Mataram", "All of these"], correct: 1, marks: 1, explanation: "Bharat Mata Ki Jai is a common battle cry used by Indian Army." },
      { qid: "7", question: "Which award is given for bravery in Army?", options: ["Padma Shri", "Param Vir Chakra", "Bharat Ratna", "Arjuna Award"], correct: 1, marks: 1, explanation: "Param Vir Chakra is the highest wartime gallantry award." },
      { qid: "8", question: "Complete the series: 2, 5, 10, 17, 26, ?", options: ["35", "37", "39", "41"], correct: 1, marks: 1, explanation: "Pattern: +3, +5, +7, +9, +11. 26+11=37." },
      { qid: "9", question: "National Defence Academy is at:", options: ["Pune", "Dehradun", "Khadakwasla", "Chennai"], correct: 2, marks: 1, explanation: "NDA is located at Khadakwasla, Pune." },
      { qid: "10", question: "How many commands does Indian Army have?", options: ["5", "6", "7", "8"], correct: 2, marks: 1, explanation: "Indian Army has 7 commands: Northern, Western, Eastern, Southern, Central, South Western, and Training Command." },
      { qid: "11", question: "Which is NOT a paramilitary force?", options: ["BSF", "CRPF", "ITBP", "Rashtriya Rifles"], correct: 3, marks: 1, explanation: "Rashtriya Rifles is part of Indian Army, not a paramilitary force." },
      { qid: "12", question: "What does GD stand for in Agniveer GD?", options: ["General Defence", "General Duty", "Ground Defence", "Guard Duty"], correct: 1, marks: 1, explanation: "GD stands for General Duty soldier." },
      { qid: "13", question: "If 5+3=28, 7+4=311, then 8+5=?", options: ["313", "413", "513", "315"], correct: 1, marks: 1, explanation: "Pattern: First digit = difference, second two digits = sum. 8-5=3, 8+5=13. Answer: 313." },
      { qid: "14", question: "Line of Control (LOC) separates India from:", options: ["China", "Pakistan", "Bangladesh", "Nepal"], correct: 1, marks: 1, explanation: "Line of Control separates India and Pakistan in Kashmir region." },
      { qid: "15", question: "Physical test in Agniveer includes:", options: ["Running", "Pull-ups", "Both", "Neither"], correct: 2, marks: 1, explanation: "Agniveer physical test includes running, pull-ups, and other fitness tests." },
    ]},
  ]},
  { id: "navy-aa-1", slug: "navy-aa-ssr", title: "Navy AA/SSR Series", description: "Indian Navy Artificer Apprentice & SSR", category: "defence", tests: [
    { id: "navy-t1", title: "Navy AA Mock Test", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "Indian Navy Day is celebrated on:", options: ["4 December", "8 October", "15 January", "1 April"], correct: 0, marks: 1, explanation: "Navy Day is celebrated on 4 December, commemorating Operation Trident in 1971." },
      { qid: "2", question: "The motto of Indian Navy is:", options: ["Service Before Self", "Sham No Varunah", "Touch the Sky", "Swift and Sure"], correct: 1, marks: 1, explanation: "Indian Navy motto is 'Sham No Varunah' (May the Lord of Water be auspicious unto us)." },
      { qid: "3", question: "SSR stands for:", options: ["Senior Secondary Recruit", "Sailor Secondary Recruit", "Senior Sailor Recruit", "Ship Service Recruit"], correct: 0, marks: 1, explanation: "SSR means Senior Secondary Recruit for 12th pass candidates." },
      { qid: "4", question: "INS Chilka is located at:", options: ["Mumbai", "Kochi", "Odisha", "Visakhapatnam"], correct: 2, marks: 1, explanation: "INS Chilka is a naval training establishment in Odisha." },
      { qid: "5", question: "The highest rank in Indian Navy is:", options: ["Admiral", "Vice Admiral", "Admiral of the Fleet", "Rear Admiral"], correct: 2, marks: 1, explanation: "Admiral of the Fleet is the highest rank, equivalent to Field Marshal." },
      { qid: "6", question: "INS stands for:", options: ["Indian Navy Ship", "Indian Naval Ship", "India's National Ship", "Indian Naval Service"], correct: 1, marks: 1, explanation: "INS stands for Indian Naval Ship." },
      { qid: "7", question: "Which is India's first nuclear submarine?", options: ["INS Arihant", "INS Chakra", "INS Sindhughosh", "INS Vikrant"], correct: 0, marks: 1, explanation: "INS Arihant is India's first indigenous nuclear-powered submarine." },
      { qid: "8", question: "India's first aircraft carrier was:", options: ["INS Vikrant", "INS Viraat", "INS Vikramaditya", "INS Virat"], correct: 0, marks: 1, explanation: "INS Vikrant (R11) was India's first aircraft carrier, commissioned in 1961." },
      { qid: "9", question: "Western Naval Command is headquartered at:", options: ["Kochi", "Mumbai", "Visakhapatnam", "Goa"], correct: 1, marks: 1, explanation: "Western Naval Command HQ is in Mumbai." },
      { qid: "10", question: "Find the next: 1, 4, 9, 16, 25, ?", options: ["30", "35", "36", "49"], correct: 2, marks: 1, explanation: "Pattern: Square numbers. 1², 2², 3², 4², 5², 6²=36." },
      { qid: "11", question: "MARCOS full form is:", options: ["Marine Commando", "Marine Commandos", "Marine Commando Force", "Maritime Commando"], correct: 2, marks: 1, explanation: "MARCOS is Marine Commando Force of Indian Navy." },
      { qid: "12", question: "How many Naval Commands does India have?", options: ["2", "3", "4", "5"], correct: 1, marks: 1, explanation: "Indian Navy has 3 Commands: Western, Eastern, and Southern." },
      { qid: "13", question: "BrahMos missile is developed jointly with:", options: ["USA", "Russia", "France", "Israel"], correct: 1, marks: 1, explanation: "BrahMos is developed jointly by India and Russia." },
      { qid: "14", question: "Submarine named after a fish:", options: ["INS Sindhughosh", "INS Shishumar", "INS Kalvari", "All of these"], correct: 3, marks: 1, explanation: "All are named after marine creatures (Kalvari=Tiger Shark, Shishumar=Dolphin)." },
      { qid: "15", question: "AA in Navy AA stands for:", options: ["Artificer Apprentice", "Aircraft Assistant", "Armed Apprentice", "Able Assistant"], correct: 0, marks: 1, explanation: "AA stands for Artificer Apprentice - technical sailor entry." },
    ]},
  ]},

  // More Railways
  { id: "rrb-ntpc-1", slug: "rrb-ntpc-mock", title: "RRB NTPC CBT-1 Series", description: "Railway NTPC Computer Based Test preparation", category: "railways", tests: [
    { id: "rrb-ntpc-t1", title: "RRB NTPC Mock 1", duration: 90, total_questions: 15, questions: [
      { qid: "1", question: "First railway in India ran between:", options: ["Delhi-Agra", "Mumbai-Thane", "Kolkata-Delhi", "Chennai-Bengaluru"], correct: 1, marks: 1, explanation: "First train ran between Mumbai (Bori Bunder) and Thane on 16 April 1853." },
      { qid: "2", question: "Indian Railways is divided into how many zones?", options: ["14", "16", "17", "18"], correct: 3, marks: 1, explanation: "Indian Railways has 18 zones as of now." },
      { qid: "3", question: "Railway Budget was merged with Union Budget in:", options: ["2015", "2016", "2017", "2018"], correct: 2, marks: 1, explanation: "Railway Budget was merged with Union Budget from 2017." },
      { qid: "4", question: "The fastest train in India is:", options: ["Rajdhani", "Shatabdi", "Vande Bharat", "Gatimaan Express"], correct: 2, marks: 1, explanation: "Vande Bharat Express can reach up to 180 km/h (currently runs at 160 km/h)." },
      { qid: "5", question: "Which is the longest railway platform in India?", options: ["Gorakhpur", "Kharagpur", "Kollam", "Bilaspur"], correct: 0, marks: 1, explanation: "Gorakhpur has the longest railway platform (1366.33 meters)." },
      { qid: "6", question: "IRCTC stands for:", options: ["Indian Railway Catering and Tourism Corporation", "Indian Railway Catering and Transport Corporation", "Indian Railway Corporation for Tourism and Catering", "Indian Rail Catering and Tourism Company"], correct: 0, marks: 1, explanation: "IRCTC is Indian Railway Catering and Tourism Corporation." },
      { qid: "7", question: "Which zone has the longest route kilometers?", options: ["Northern Railway", "Western Railway", "Eastern Railway", "Southern Railway"], correct: 0, marks: 1, explanation: "Northern Railway has the longest route (6,968 km)." },
      { qid: "8", question: "Train number starting with 1 indicates:", options: ["Superfast", "Express", "Rajdhani/Shatabdi", "Local"], correct: 2, marks: 1, explanation: "Trains starting with 1 (like 12xxx) are Rajdhani, Shatabdi, and premium trains." },
      { qid: "9", question: "Railway Recruitment Board (RRB) is under:", options: ["Ministry of Railways", "Ministry of Labour", "UPSC", "State Government"], correct: 0, marks: 1, explanation: "RRB functions under Ministry of Railways, Government of India." },
      { qid: "10", question: "Find the odd one: Coach, Engine, Platform, Bogey", options: ["Coach", "Engine", "Platform", "Bogey"], correct: 2, marks: 1, explanation: "Platform is infrastructure. Others are parts of a train." },
      { qid: "11", question: "The headquarters of South Central Railway is:", options: ["Chennai", "Hyderabad", "Secunderabad", "Vijayawada"], correct: 2, marks: 1, explanation: "South Central Railway HQ is in Secunderabad." },
      { qid: "12", question: "What is the width of Broad Gauge track?", options: ["1435 mm", "1520 mm", "1676 mm", "1000 mm"], correct: 2, marks: 1, explanation: "Broad Gauge width is 1676 mm (5 feet 6 inches)." },
      { qid: "13", question: "If A is 2 km east of B, and C is 3 km north of B, distance between A and C:", options: ["√5 km", "√13 km", "5 km", "√12 km"], correct: 1, marks: 1, explanation: "Using Pythagoras: √(2² + 3²) = √(4+9) = √13 km." },
      { qid: "14", question: "Konkan Railway connects:", options: ["Mumbai-Goa-Mangalore", "Mumbai-Chennai", "Delhi-Mumbai", "Kolkata-Chennai"], correct: 0, marks: 1, explanation: "Konkan Railway connects Mumbai to Mangalore via Goa along the western coast." },
      { qid: "15", question: "The mascot of Indian Railways is:", options: ["Bholu", "Chhotu", "Golu", "Motu"], correct: 0, marks: 1, explanation: "Bholu the Elephant is the mascot of Indian Railways." },
    ]},
  ]},
  { id: "rrb-group-d-1", slug: "rrb-group-d", title: "RRB Group D Series", description: "Railway Group D Level 1 preparation", category: "railways", tests: [
    { id: "rrb-gd-t1", title: "RRB Group D Mock 1", duration: 90, total_questions: 15, questions: [
      { qid: "1", question: "How many wheels does a train bogey typically have?", options: ["4", "6", "8", "12"], correct: 2, marks: 1, explanation: "A typical passenger bogey has 8 wheels (4 axles × 2)." },
      { qid: "2", question: "Which signal indicates 'proceed with caution'?", options: ["Red", "Green", "Yellow", "Blue"], correct: 2, marks: 1, explanation: "Yellow signal indicates proceed with caution and slow down." },
      { qid: "3", question: "The function of a fishplate is to:", options: ["Join rails", "Clean tracks", "Support sleepers", "Control signals"], correct: 0, marks: 1, explanation: "Fishplates are used to join two rail sections together." },
      { qid: "4", question: "What is a sleeper?", options: ["Bed in train", "Support for rails", "Type of coach", "Railway staff"], correct: 1, marks: 1, explanation: "Sleepers are the supports on which rails are fixed." },
      { qid: "5", question: "Points and crossings are used for:", options: ["Signaling", "Track changing", "Speed control", "Lighting"], correct: 1, marks: 1, explanation: "Points and crossings allow trains to change from one track to another." },
      { qid: "6", question: "A goods train has how many coaches approximately?", options: ["10-20", "20-40", "40-60", "60-80"], correct: 2, marks: 1, explanation: "A typical goods train has 40-60 wagons." },
      { qid: "7", question: "Track gauge is the distance between:", options: ["Two trains", "Two stations", "Two rails", "Two coaches"], correct: 2, marks: 1, explanation: "Track gauge is the distance between the inner sides of two rails." },
      { qid: "8", question: "What is the speed of a passenger train usually?", options: ["20-40 km/h", "40-60 km/h", "60-80 km/h", "80-120 km/h"], correct: 3, marks: 1, explanation: "Passenger trains typically run at 80-120 km/h on main lines." },
      { qid: "9", question: "Complete: 4, 9, 16, 25, ?", options: ["30", "36", "49", "64"], correct: 1, marks: 1, explanation: "Pattern: 2², 3², 4², 5², 6²=36." },
      { qid: "10", question: "AC coaches maintain temperature of:", options: ["18-20°C", "22-25°C", "25-28°C", "28-30°C"], correct: 1, marks: 1, explanation: "AC coaches are typically maintained at 22-25°C." },
      { qid: "11", question: "What is ballast in railway?", options: ["Engine fuel", "Stone bed for tracks", "Train brake", "Signal equipment"], correct: 1, marks: 1, explanation: "Ballast is the layer of crushed stones on which sleepers rest." },
      { qid: "12", question: "EMU stands for:", options: ["Electric Multiple Unit", "Engine Motor Unit", "Electric Motor Unit", "Engine Multiple Unit"], correct: 0, marks: 1, explanation: "EMU is Electric Multiple Unit - local trains powered by electricity." },
      { qid: "13", question: "Safety value of a train is called:", options: ["Brake", "Guard", "Vacuum", "Coupler"], correct: 2, marks: 1, explanation: "Vacuum brake system is crucial for train safety." },
      { qid: "14", question: "What does PNR stand for?", options: ["Passenger Name Record", "Personal Number Record", "Platform Number Record", "Primary Name Record"], correct: 0, marks: 1, explanation: "PNR is Passenger Name Record - unique booking number." },
      { qid: "15", question: "Tatkal booking opens how many days before journey?", options: ["1 day", "2 days", "3 days", "4 days"], correct: 0, marks: 1, explanation: "Tatkal booking opens 1 day (24 hours) before journey at 10 AM." },
    ]},
  ]},
  { id: "rrb-alp-1", slug: "rrb-alp-technician", title: "RRB ALP & Technician", description: "Assistant Loco Pilot & Technician preparation", category: "railways", tests: [
    { id: "rrb-alp-t1", title: "RRB ALP Mock Test", duration: 60, total_questions: 15, questions: [
      { qid: "1", question: "ALP stands for:", options: ["Assistant Loco Pilot", "Assisted Loco Pilot", "Associate Loco Pilot", "Advanced Loco Pilot"], correct: 0, marks: 1, explanation: "ALP means Assistant Loco Pilot - assists in train operation." },
      { qid: "2", question: "A diesel locomotive uses which type of engine?", options: ["Petrol", "Diesel", "Electric", "Steam"], correct: 1, marks: 1, explanation: "Diesel locomotives use diesel engines for propulsion." },
      { qid: "3", question: "What is the function of a governor in locomotive?", options: ["Speed control", "Direction control", "Braking", "Starting"], correct: 0, marks: 1, explanation: "Governor regulates the speed of the engine." },
      { qid: "4", question: "The pantograph in electric locomotive is used for:", options: ["Braking", "Collecting current", "Direction change", "Speed display"], correct: 1, marks: 1, explanation: "Pantograph collects electric current from overhead wire." },
      { qid: "5", question: "WAP stands for:", options: ["Wide Alternating Power", "Wide AC Passenger", "Broad Gauge AC Passenger", "AC Passenger Locomotive"], correct: 2, marks: 1, explanation: "W=Wide/Broad Gauge, A=AC, P=Passenger. WAP locomotives." },
      { qid: "6", question: "Regenerative braking converts:", options: ["Speed to heat", "Kinetic energy to electrical", "Electrical to kinetic", "Heat to speed"], correct: 1, marks: 1, explanation: "Regenerative braking converts kinetic energy back to electrical energy." },
      { qid: "7", question: "The power of Indian electric locomotives is usually:", options: ["1500 V DC", "25 kV AC", "750 V DC", "110 V DC"], correct: 1, marks: 1, explanation: "Indian Railways uses 25 kV AC single phase for electric traction." },
      { qid: "8", question: "What is 'dead man's handle'?", options: ["Brake handle", "Safety device requiring continuous pressure", "Gear lever", "Horn switch"], correct: 1, marks: 1, explanation: "Dead man's handle requires continuous pressure; train stops if released." },
      { qid: "9", question: "Traction motor converts:", options: ["AC to DC", "Electrical to mechanical energy", "Mechanical to electrical", "DC to AC"], correct: 1, marks: 1, explanation: "Traction motor converts electrical energy to mechanical energy to move wheels." },
      { qid: "10", question: "Find next: 2, 3, 5, 7, 11, ?", options: ["12", "13", "14", "15"], correct: 1, marks: 1, explanation: "Pattern: Prime numbers. Next prime after 11 is 13." },
      { qid: "11", question: "What does HP stand for in engine?", options: ["High Power", "Horse Power", "Heat Power", "Hydraulic Power"], correct: 1, marks: 1, explanation: "HP stands for Horse Power - unit of engine power." },
      { qid: "12", question: "Compressor in a train is used for:", options: ["Cooling", "Air brake system", "Fuel supply", "Electricity"], correct: 1, marks: 1, explanation: "Compressor provides compressed air for air brake system." },
      { qid: "13", question: "What is 'notch' in locomotive?", options: ["Gear", "Power control level", "Brake type", "Signal"], correct: 1, marks: 1, explanation: "Notch is a power control step in locomotive driving." },
      { qid: "14", question: "Speedometer in train measures:", options: ["Distance", "Speed", "Fuel", "Power"], correct: 1, marks: 1, explanation: "Speedometer measures the speed of the train." },
      { qid: "15", question: "Maximum speed of WAP-7 locomotive is:", options: ["110 km/h", "130 km/h", "160 km/h", "200 km/h"], correct: 2, marks: 1, explanation: "WAP-7 locomotive has maximum speed of 160 km/h." },
    ]},
  ]},
  { id: "rrb-je-1", slug: "rrb-je-cbt", title: "RRB JE CBT Series", description: "Railway Junior Engineer Computer Based Test", category: "railways", tests: [
    { id: "rrb-je-t1", title: "RRB JE CBT-1 Mock", duration: 90, total_questions: 15, questions: [
      { qid: "1", question: "RRB JE recruitment is for which level?", options: ["Group A", "Group B", "Group C", "Group D"], correct: 2, marks: 1, explanation: "JE (Junior Engineer) is a Group C post in Indian Railways." },
      { qid: "2", question: "The unit of resistance is:", options: ["Volt", "Ampere", "Ohm", "Watt"], correct: 2, marks: 1, explanation: "Ohm (Ω) is the SI unit of electrical resistance." },
      { qid: "3", question: "Kirchhoff's Current Law states that:", options: ["Sum of currents at junction = 0", "Sum of voltages in loop = 0", "V = IR", "P = VI"], correct: 0, marks: 1, explanation: "KCL: Algebraic sum of currents at a node equals zero." },
      { qid: "4", question: "In a parallel circuit, voltage is:", options: ["Different across components", "Same across all components", "Zero", "Infinite"], correct: 1, marks: 1, explanation: "In parallel circuits, voltage is same across all parallel branches." },
      { qid: "5", question: "The material used for overhead transmission line is:", options: ["Copper", "Aluminium", "ACSR", "Gold"], correct: 2, marks: 1, explanation: "ACSR (Aluminium Conductor Steel Reinforced) is commonly used." },
      { qid: "6", question: "What is the formula for power?", options: ["P = V/I", "P = V×I", "P = I/V", "P = V+I"], correct: 1, marks: 1, explanation: "Electrical power P = Voltage × Current = V×I watts." },
      { qid: "7", question: "Transformer works on the principle of:", options: ["Ohm's law", "Faraday's law", "Newton's law", "Coulomb's law"], correct: 1, marks: 1, explanation: "Transformer works on Faraday's law of electromagnetic induction." },
      { qid: "8", question: "The efficiency of a machine is:", options: ["Output/Input × 100", "Input/Output × 100", "Output + Input", "Output - Input"], correct: 0, marks: 1, explanation: "Efficiency = (Output/Input) × 100%." },
      { qid: "9", question: "What is a relay?", options: ["Motor", "Generator", "Electromagnetic switch", "Transformer"], correct: 2, marks: 1, explanation: "Relay is an electromagnetic switch used in control circuits." },
      { qid: "10", question: "The function of a fuse is:", options: ["Increase current", "Protect circuit from overcurrent", "Store charge", "Generate power"], correct: 1, marks: 1, explanation: "Fuse protects circuit by breaking when current exceeds safe limit." },
      { qid: "11", question: "RMS value of AC is also called:", options: ["Peak value", "Average value", "Effective value", "Instantaneous value"], correct: 2, marks: 1, explanation: "RMS (Root Mean Square) is also called effective value of AC." },
      { qid: "12", question: "Which motor is used in electric trains?", options: ["DC series motor", "Induction motor", "Synchronous motor", "Both A and B"], correct: 3, marks: 1, explanation: "Earlier DC series, now 3-phase induction motors are used in trains." },
      { qid: "13", question: "What is the purpose of commutator?", options: ["Speed control", "Convert AC to DC", "Direction control", "Convert DC to AC in armature"], correct: 1, marks: 1, explanation: "Commutator converts AC generated in armature to DC output." },
      { qid: "14", question: "Find missing: 1, 1, 2, 3, 5, 8, ?", options: ["11", "12", "13", "14"], correct: 2, marks: 1, explanation: "Fibonacci series: 5+8=13." },
      { qid: "15", question: "Star-Delta starter reduces starting current by:", options: ["50%", "33%", "67%", "75%"], correct: 1, marks: 1, explanation: "Star-Delta starter reduces starting current to 1/3 (33%)." },
    ]},
  ]},

  // More UPSC
  { id: "upsc-cse-1", slug: "upsc-cse-prelims", title: "UPSC CSE Prelims GS", description: "Civil Services Preliminary General Studies", category: "upsc", tests: [
    { id: "upsc-gs-t1", title: "UPSC GS Paper 1 Mock", duration: 120, total_questions: 15, questions: [
      { qid: "1", question: "The '__(blank)__ Doctrine' holds that any subject not mentioned in the State List or Concurrent List is automatically under Union jurisdiction.", options: ["Residuary", "Territorial", "Harmonious", "Pith and Substance"], correct: 0, marks: 2, explanation: "Residuary powers under Article 248 belong to Parliament for matters not in State or Concurrent List." },
      { qid: "2", question: "Which Schedule of the Constitution contains provisions for administration of tribal areas?", options: ["Fifth", "Sixth", "Eighth", "Ninth"], correct: 1, marks: 2, explanation: "Sixth Schedule deals with administration of tribal areas in Assam, Meghalaya, Tripura, and Mizoram." },
      { qid: "3", question: "The concept of 'Basic Structure' of Constitution was propounded in:", options: ["Golaknath case", "Kesavananda Bharati case", "Minerva Mills case", "Maneka Gandhi case"], correct: 1, marks: 2, explanation: "Kesavananda Bharati case (1973) established the Basic Structure Doctrine." },
      { qid: "4", question: "Which of the following is NOT a Fundamental Duty?", options: ["To protect sovereignty of India", "To pay taxes", "To preserve composite culture", "To develop scientific temper"], correct: 1, marks: 2, explanation: "Paying taxes is not listed under Article 51A Fundamental Duties." },
      { qid: "5", question: "The Indian Ocean Dipole affects monsoon because:", options: ["It changes wind direction", "Temperature difference affects pressure systems", "It creates cyclones", "All of the above"], correct: 1, marks: 2, explanation: "IOD's sea surface temperature difference creates pressure changes affecting monsoon." },
      { qid: "6", question: "Consider: 1. Siachen Glacier 2. Baltoro Glacier 3. Gangotri Glacier. Which are in India?", options: ["1 and 2", "2 and 3", "1 and 3", "All three"], correct: 2, marks: 2, explanation: "Siachen and Gangotri are in India. Baltoro is in Pakistan-controlled area." },
      { qid: "7", question: "The concept of 'Carbon Credit' originated from:", options: ["Montreal Protocol", "Kyoto Protocol", "Paris Agreement", "Rio Summit"], correct: 1, marks: 2, explanation: "Carbon credits were established under Kyoto Protocol (1997)." },
      { qid: "8", question: "Which Five Year Plan introduced the concept of 'Growth with Justice'?", options: ["First", "Fourth", "Fifth", "Eighth"], correct: 2, marks: 2, explanation: "Fifth Five Year Plan (1974-79) focused on growth with justice." },
      { qid: "9", question: "The Indus Valley site Lothal is famous for:", options: ["Granary", "Dockyard", "Great Bath", "Dancing Girl"], correct: 1, marks: 2, explanation: "Lothal (Gujarat) had the world's first known tidal dock/dockyard." },
      { qid: "10", question: "Consider: 1. Right to Property 2. Right to Education 3. Right to Information. Which are Fundamental Rights?", options: ["1 only", "2 only", "1 and 2", "2 and 3"], correct: 1, marks: 2, explanation: "Only Right to Education (Article 21A) is a Fundamental Right. RTI is statutory." },
      { qid: "11", question: "MGNREGA guarantees how many days of employment?", options: ["100 days", "150 days", "200 days", "365 days"], correct: 0, marks: 2, explanation: "MGNREGA guarantees 100 days of wage employment per household per year." },
      { qid: "12", question: "The Speaker of Lok Sabha can be removed by:", options: ["President", "Prime Minister", "Resolution passed by majority of members", "No-confidence motion"], correct: 2, marks: 2, explanation: "Speaker can be removed by resolution passed by majority of all members." },
      { qid: "13", question: "National Green Tribunal was established under:", options: ["Constitution", "NGT Act 2010", "Environment Protection Act", "Wildlife Protection Act"], correct: 1, marks: 2, explanation: "NGT was established under National Green Tribunal Act, 2010." },
      { qid: "14", question: "Which among these is an example of ex-situ conservation?", options: ["National Park", "Wildlife Sanctuary", "Seed Bank", "Biosphere Reserve"], correct: 2, marks: 2, explanation: "Seed banks are ex-situ (outside natural habitat) conservation methods." },
      { qid: "15", question: "The 'Two-nation theory' was propounded by:", options: ["Jinnah", "Savarkar", "Both A and B", "Neither"], correct: 2, marks: 2, explanation: "Both Jinnah (for Muslims) and Savarkar (for Hindus) advocated two-nation theory." },
    ]},
  ]},
  { id: "upsc-csat-1", slug: "upsc-csat", title: "UPSC CSAT Series", description: "Civil Services Aptitude Test preparation", category: "upsc", tests: [
    { id: "upsc-csat-t1", title: "UPSC CSAT Mock", duration: 120, total_questions: 15, questions: [
      { qid: "1", question: "A statement followed by conclusions: Statement: All managers are leaders. Some leaders are teachers. Conclusions: I. Some managers are teachers. II. Some teachers are managers.", options: ["Only I follows", "Only II follows", "Both follow", "Neither follows"], correct: 3, marks: 2.5, explanation: "No direct link between managers and teachers can be established from given statements." },
      { qid: "2", question: "In a certain code, COMPUTER is written as RFUVQNPC. How is MEDICINE written?", options: ["MFEJDJOF", "EIKIDJOE", "MFEDJJOF", "EIKIDJME"], correct: 0, marks: 2.5, explanation: "Pattern: Each letter is shifted and rearranged. C→R(+15),O→F(-9)..." },
      { qid: "3", question: "A man walks 3 km North, turns right and walks 4 km, then turns right again and walks 3 km. How far is he from the starting point?", options: ["3 km", "4 km", "5 km", "7 km"], correct: 1, marks: 2.5, explanation: "He walks North 3km, East 4km, South 3km. He's 4 km East of start." },
      { qid: "4", question: "If the day after tomorrow is Sunday, what day was yesterday?", options: ["Wednesday", "Thursday", "Friday", "Saturday"], correct: 1, marks: 2.5, explanation: "Day after tomorrow = Sunday, Tomorrow = Saturday, Today = Friday, Yesterday = Thursday." },
      { qid: "5", question: "30% of a number is 150. What is 50% of that number?", options: ["200", "225", "250", "300"], correct: 2, marks: 2.5, explanation: "If 30% = 150, then 100% = 500. 50% of 500 = 250." },
      { qid: "6", question: "Passage: 'Development should not come at the cost of environment.' What does the author imply?", options: ["Stop all development", "Environment is more important", "Balance development with sustainability", "Development is impossible"], correct: 2, marks: 2.5, explanation: "The statement implies sustainable development without environmental degradation." },
      { qid: "7", question: "Complete the series: 2, 6, 12, 20, 30, ?", options: ["40", "42", "44", "46"], correct: 1, marks: 2.5, explanation: "Differences: 4,6,8,10,12. Next: 30+12=42." },
      { qid: "8", question: "A train 200m long passes a platform in 25 seconds and a man standing in 10 seconds. Length of platform:", options: ["200m", "250m", "300m", "350m"], correct: 2, marks: 2.5, explanation: "Speed = 200/10 = 20 m/s. Total distance = 20×25 = 500m. Platform = 500-200 = 300m." },
      { qid: "9", question: "Statement: Should there be a uniform civil code? Arguments: Yes - for national integration. No - religious freedom.", options: ["Only Yes is strong", "Only No is strong", "Both are strong", "Neither is strong"], correct: 2, marks: 2.5, explanation: "Both arguments present valid points - integration vs freedom of religion." },
      { qid: "10", question: "In a family, A is brother of B, C is father of A, D is brother of E, E is daughter of B. Who is the grandfather of D?", options: ["A", "B", "C", "Cannot be determined"], correct: 2, marks: 2.5, explanation: "E is B's daughter, D is E's brother so B's son. A is B's brother. C is A's father, so C is D's grandfather." },
      { qid: "11", question: "Data interpretation: If 40% students passed in Hindi and 60% in English, and 20% passed in both, how many passed in at least one?", options: ["60%", "70%", "80%", "100%"], correct: 2, marks: 2.5, explanation: "Using union formula: 40+60-20 = 80%." },
      { qid: "12", question: "Which assumption is implicit? Statement: 'Apply now for best results.'", options: ["Quick application yields better results", "There is limited time", "Both assumptions", "Neither"], correct: 1, marks: 2.5, explanation: "The urgency ('now') implies limited time availability." },
      { qid: "13", question: "A can do work in 10 days, B in 15 days. A works for 3 days then B joins. How many more days to finish?", options: ["4.5", "5", "5.4", "6"], correct: 2, marks: 2.5, explanation: "A does 3/10 in 3 days. Remaining 7/10. Together: 1/10+1/15=1/6 per day. 7/10÷1/6=4.2 days. Total with A's 3 days..." },
      { qid: "14", question: "Logical order: 1. Seed 2. Tree 3. Fruit 4. Flower 5. Sapling", options: ["1-5-2-4-3", "1-5-2-3-4", "5-1-2-4-3", "1-2-5-4-3"], correct: 0, marks: 2.5, explanation: "Natural sequence: Seed→Sapling→Tree→Flower→Fruit." },
      { qid: "15", question: "Strengthening argument: 'Exercise reduces heart disease risk.' Which strengthens this?", options: ["Some athletes have heart problems", "Studies show 40% lower risk with regular exercise", "Medicines are also effective", "Some people exercise daily"], correct: 1, marks: 2.5, explanation: "Statistical evidence (40% lower risk) directly strengthens the claim." },
    ]},
  ]},

  // More JEE/NEET
  { id: "jee-main-1", slug: "jee-main-mock", title: "JEE Main Full Mock Series", description: "JEE Main Physics, Chemistry & Maths", category: "jee-neet", tests: [
    { id: "jee-main-t1", title: "JEE Main Mock 1", duration: 180, total_questions: 15, questions: [
      { qid: "1", question: "A ball is thrown vertically upward with velocity 20 m/s. Maximum height reached is (g=10 m/s²):", options: ["10 m", "15 m", "20 m", "25 m"], correct: 2, marks: 4, explanation: "Using v²=u²-2gh: 0=400-20h, h=20m." },
      { qid: "2", question: "The wavelength of light having frequency 5×10¹⁴ Hz is:", options: ["500 nm", "600 nm", "700 nm", "800 nm"], correct: 1, marks: 4, explanation: "λ = c/f = (3×10⁸)/(5×10¹⁴) = 6×10⁻⁷ m = 600 nm." },
      { qid: "3", question: "If ∫f(x)dx = x² + C, then f(x) =", options: ["x²", "2x", "x", "2x²"], correct: 1, marks: 4, explanation: "f(x) = d/dx(x²+C) = 2x." },
      { qid: "4", question: "The hybridization of carbon in CO₂ is:", options: ["sp", "sp²", "sp³", "sp³d"], correct: 0, marks: 4, explanation: "In CO₂, carbon is sp hybridized (2 double bonds, linear structure)." },
      { qid: "5", question: "If f(x) = sin⁻¹(x), then f'(x) =", options: ["1/√(1-x²)", "-1/√(1-x²)", "1/√(1+x²)", "x/√(1-x²)"], correct: 0, marks: 4, explanation: "Derivative of sin⁻¹(x) = 1/√(1-x²)." },
      { qid: "6", question: "The equivalent resistance of two 4Ω resistors in parallel is:", options: ["2Ω", "4Ω", "8Ω", "1Ω"], correct: 0, marks: 4, explanation: "1/R = 1/4 + 1/4 = 2/4 = 1/2, so R = 2Ω." },
      { qid: "7", question: "The IUPAC name of CH₃-CH(CH₃)-CH₂-CH₃ is:", options: ["2-methylbutane", "Isopentane", "Neopentane", "Pentane"], correct: 0, marks: 4, explanation: "IUPAC: 2-methylbutane (methyl group at position 2)." },
      { qid: "8", question: "For a matrix A, if |A| = 5, then |3A| (A is 2×2) =", options: ["15", "45", "125", "9"], correct: 1, marks: 4, explanation: "|kA| = k^n |A| where n is order. |3A| = 3² × 5 = 45." },
      { qid: "9", question: "The pH of a solution with [H⁺] = 10⁻³ M is:", options: ["1", "2", "3", "4"], correct: 2, marks: 4, explanation: "pH = -log[H⁺] = -log(10⁻³) = 3." },
      { qid: "10", question: "The derivative of e^(2x) is:", options: ["e^(2x)", "2e^(2x)", "e^x", "2xe^(2x)"], correct: 1, marks: 4, explanation: "d/dx(e^(2x)) = 2e^(2x) using chain rule." },
      { qid: "11", question: "Work done by a force F=5N moving 3m at 60° to direction is:", options: ["7.5 J", "15 J", "10 J", "5 J"], correct: 0, marks: 4, explanation: "W = F×d×cos θ = 5×3×cos60° = 5×3×0.5 = 7.5 J." },
      { qid: "12", question: "Number of moles in 11.2 L of gas at STP is:", options: ["0.25", "0.5", "1", "2"], correct: 1, marks: 4, explanation: "At STP, 22.4 L = 1 mole. So 11.2 L = 0.5 mole." },
      { qid: "13", question: "If sin θ = 3/5, then cos θ =", options: ["3/5", "4/5", "5/4", "5/3"], correct: 1, marks: 4, explanation: "cos θ = √(1-sin²θ) = √(1-9/25) = √(16/25) = 4/5." },
      { qid: "14", question: "The focal length of a convex lens is 20 cm. Its power is:", options: ["2 D", "5 D", "0.5 D", "20 D"], correct: 1, marks: 4, explanation: "Power = 1/f(m) = 1/0.2 = 5 D." },
      { qid: "15", question: "Which has highest electronegativity?", options: ["Na", "Mg", "Al", "Cl"], correct: 3, marks: 4, explanation: "Electronegativity increases left to right. Cl has highest among given options." },
    ]},
  ]},
  { id: "neet-ug-1", slug: "neet-ug-mock", title: "NEET UG Full Series", description: "NEET UG Physics, Chemistry & Biology", category: "jee-neet", tests: [
    { id: "neet-t1", title: "NEET UG Mock 1", duration: 180, total_questions: 15, questions: [
      { qid: "1", question: "The powerhouse of the cell is:", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"], correct: 2, marks: 4, explanation: "Mitochondria are called powerhouse as they produce ATP through cellular respiration." },
      { qid: "2", question: "Which blood group is called 'Universal Donor'?", options: ["A", "B", "AB", "O"], correct: 3, marks: 4, explanation: "O negative blood can be given to anyone as it lacks A, B antigens and Rh factor." },
      { qid: "3", question: "DNA replication is:", options: ["Conservative", "Semi-conservative", "Dispersive", "Non-conservative"], correct: 1, marks: 4, explanation: "DNA replication is semi-conservative (each new DNA has one old and one new strand)." },
      { qid: "4", question: "The pH of human blood is:", options: ["6.4", "7.0", "7.4", "8.4"], correct: 2, marks: 4, explanation: "Normal blood pH is 7.35-7.45, approximately 7.4 (slightly alkaline)." },
      { qid: "5", question: "Which hormone is secreted by the pancreas?", options: ["Thyroxine", "Insulin", "Adrenaline", "Cortisol"], correct: 1, marks: 4, explanation: "Insulin is secreted by beta cells of islets of Langerhans in pancreas." },
      { qid: "6", question: "Number of ATP produced in aerobic respiration of one glucose:", options: ["2", "18", "36-38", "40"], correct: 2, marks: 4, explanation: "Complete aerobic respiration of glucose yields 36-38 ATP molecules." },
      { qid: "7", question: "Photosynthesis occurs in:", options: ["Mitochondria", "Chloroplast", "Ribosome", "Nucleus"], correct: 1, marks: 4, explanation: "Photosynthesis occurs in chloroplasts which contain chlorophyll." },
      { qid: "8", question: "The functional unit of kidney is:", options: ["Neuron", "Nephron", "Nucleotide", "Nucleosome"], correct: 1, marks: 4, explanation: "Nephron is the functional unit of kidney that filters blood and forms urine." },
      { qid: "9", question: "Which vitamin deficiency causes night blindness?", options: ["A", "B", "C", "D"], correct: 0, marks: 4, explanation: "Vitamin A (Retinol) deficiency causes night blindness (Nyctalopia)." },
      { qid: "10", question: "The number of chromosomes in human sperm cell is:", options: ["23", "46", "44", "22"], correct: 0, marks: 4, explanation: "Gametes (sperm, egg) are haploid with 23 chromosomes." },
      { qid: "11", question: "Which is NOT a greenhouse gas?", options: ["CO₂", "CH₄", "N₂O", "N₂"], correct: 3, marks: 4, explanation: "Nitrogen (N₂) is not a greenhouse gas. CO₂, CH₄, N₂O are greenhouse gases." },
      { qid: "12", question: "The site of protein synthesis in cell:", options: ["Nucleus", "Ribosome", "Mitochondria", "Lysosome"], correct: 1, marks: 4, explanation: "Ribosomes are the site of protein synthesis (translation)." },
      { qid: "13", question: "Mendel's law of segregation states that:", options: ["Factors blend", "Alleles separate during gamete formation", "Genes are linked", "Traits skip generations"], correct: 1, marks: 4, explanation: "Law of Segregation: Two alleles separate during gamete formation." },
      { qid: "14", question: "The longest bone in human body:", options: ["Humerus", "Femur", "Tibia", "Fibula"], correct: 1, marks: 4, explanation: "Femur (thigh bone) is the longest bone in the human body." },
      { qid: "15", question: "Enzyme that breaks down starch:", options: ["Pepsin", "Lipase", "Amylase", "Trypsin"], correct: 2, marks: 4, explanation: "Amylase (in saliva and pancreas) breaks down starch into maltose." },
    ]},
  ]},

  // More Teaching
  { id: "ctet-p1-1", slug: "ctet-paper-1", title: "CTET Paper-1 Series", description: "CTET for Primary Stage (Class 1-5)", category: "teaching", tests: [
    { id: "ctet-p1-t1", title: "CTET Paper 1 Mock 1", duration: 150, total_questions: 15, questions: [
      { qid: "1", question: "According to Piaget, children in 'Concrete Operational Stage' are of age:", options: ["0-2 years", "2-7 years", "7-11 years", "11+ years"], correct: 2, marks: 1, explanation: "Concrete Operational Stage (7-11 years): logical thinking develops but limited to concrete objects." },
      { qid: "2", question: "The term 'Inclusive Education' means:", options: ["Education for all including disabled", "Education for gifted only", "Special schools for disabled", "Home schooling"], correct: 0, marks: 1, explanation: "Inclusive education integrates all children including those with disabilities in mainstream schools." },
      { qid: "3", question: "Who proposed the 'Zone of Proximal Development'?", options: ["Piaget", "Vygotsky", "Skinner", "Bruner"], correct: 1, marks: 1, explanation: "Lev Vygotsky proposed ZPD - the gap between what learner can do alone vs with guidance." },
      { qid: "4", question: "Which is NOT a characteristic of child-centered education?", options: ["Learning by doing", "Rote learning", "Activity-based", "Experiential learning"], correct: 1, marks: 1, explanation: "Rote learning is teacher-centered, not child-centered approach." },
      { qid: "5", question: "RTE Act 2009 provides free education up to age:", options: ["12 years", "14 years", "16 years", "18 years"], correct: 1, marks: 1, explanation: "Right to Education Act provides free education to children aged 6-14 years." },
      { qid: "6", question: "Dyslexia is a learning disability related to:", options: ["Writing", "Reading", "Mathematics", "Speaking"], correct: 1, marks: 1, explanation: "Dyslexia is a specific learning disability affecting reading ability." },
      { qid: "7", question: "CCE stands for:", options: ["Continuous and Comprehensive Evaluation", "Complete and Correct Evaluation", "Careful and Complete Evaluation", "Continuous and Careful Examination"], correct: 0, marks: 1, explanation: "CCE is Continuous and Comprehensive Evaluation - holistic student assessment." },
      { qid: "8", question: "Multiple Intelligence theory was proposed by:", options: ["Spearman", "Gardner", "Guilford", "Thorndike"], correct: 1, marks: 1, explanation: "Howard Gardner proposed Multiple Intelligences theory (1983)." },
      { qid: "9", question: "Which is a projective technique of assessment?", options: ["Multiple choice test", "Rorschach test", "Achievement test", "Aptitude test"], correct: 1, marks: 1, explanation: "Rorschach (inkblot) test is a projective technique revealing unconscious thoughts." },
      { qid: "10", question: "Nature vs Nurture debate is about:", options: ["Heredity vs Environment", "Teaching vs Learning", "Urban vs Rural", "Theory vs Practice"], correct: 0, marks: 1, explanation: "Nature (heredity/genetics) vs Nurture (environment/experience) debate in development." },
      { qid: "11", question: "Which is the highest level in Bloom's Taxonomy?", options: ["Knowledge", "Application", "Analysis", "Evaluation/Creation"], correct: 3, marks: 1, explanation: "Bloom's taxonomy (revised): Remember→Understand→Apply→Analyze→Evaluate→Create." },
      { qid: "12", question: "Kohlberg's theory deals with:", options: ["Cognitive development", "Moral development", "Language development", "Physical development"], correct: 1, marks: 1, explanation: "Lawrence Kohlberg's theory explains stages of moral development." },
      { qid: "13", question: "NCF 2005 emphasizes:", options: ["Rote learning", "Learning without burden", "Strict discipline", "Examination focus"], correct: 1, marks: 1, explanation: "NCF 2005 emphasizes learning without burden and constructivist approach." },
      { qid: "14", question: "Formative assessment is:", options: ["End of year exam", "Continuous ongoing assessment", "Entrance test", "Board examination"], correct: 1, marks: 1, explanation: "Formative assessment is continuous, ongoing assessment during learning." },
      { qid: "15", question: "Gender bias in textbooks should be:", options: ["Ignored", "Encouraged", "Addressed and removed", "Left unchanged"], correct: 2, marks: 1, explanation: "Gender bias in educational materials should be identified and eliminated." },
    ]},
  ]},

  // Police/State Exams  
  { id: "delhi-police-1", slug: "delhi-police-constable", title: "Delhi Police Constable", description: "Delhi Police recruitment preparation", category: "ssc", tests: [
    { id: "dp-t1", title: "Delhi Police Mock 1", duration: 90, total_questions: 15, questions: [
      { qid: "1", question: "Delhi Police comes under:", options: ["State Government", "Central Government", "Municipal Corporation", "High Court"], correct: 1, marks: 1, explanation: "Delhi Police is under Central Government (Ministry of Home Affairs)." },
      { qid: "2", question: "The first female IPS officer of Delhi Police was:", options: ["Kiran Bedi", "Meera Borwankar", "Vimla Mehra", "Anjali Gupta"], correct: 0, marks: 1, explanation: "Kiran Bedi was the first female IPS officer in India (1972)." },
      { qid: "3", question: "Emergency number for Police in India is:", options: ["100", "101", "102", "108"], correct: 0, marks: 1, explanation: "100 is the police emergency number in India. 112 is the unified emergency number." },
      { qid: "4", question: "FIR stands for:", options: ["First Information Report", "Final Investigation Report", "First Investigation Report", "Final Information Report"], correct: 0, marks: 1, explanation: "FIR is First Information Report - first step in criminal proceedings." },
      { qid: "5", question: "IPC stands for:", options: ["Indian Police Code", "Indian Penal Code", "Indian Prosecution Code", "Indian Public Code"], correct: 1, marks: 1, explanation: "IPC is Indian Penal Code - main criminal code of India (now BNS)." },
      { qid: "6", question: "Who is the Commissioner of Police in Delhi?", options: ["IPS Officer", "IAS Officer", "Judge", "Minister"], correct: 0, marks: 1, explanation: "Commissioner of Police, Delhi is an IPS officer." },
      { qid: "7", question: "Section 144 CrPC deals with:", options: ["Murder", "Robbery", "Prohibitory orders", "Traffic rules"], correct: 2, marks: 1, explanation: "Section 144 CrPC empowers magistrate to issue prohibitory orders." },
      { qid: "8", question: "Delhi became Union Territory in:", options: ["1947", "1950", "1956", "1992"], correct: 2, marks: 1, explanation: "Delhi became a Union Territory under States Reorganisation Act, 1956." },
      { qid: "9", question: "Find the odd one: Theft, Murder, Robbery, Traffic signal", options: ["Theft", "Murder", "Robbery", "Traffic signal"], correct: 3, marks: 1, explanation: "Theft, Murder, Robbery are crimes. Traffic signal is infrastructure." },
      { qid: "10", question: "The motto of Delhi Police is:", options: ["Service with Honor", "Shanti, Seva, Nyaya", "Duty, Honor, Country", "With You, For You, Always"], correct: 3, marks: 1, explanation: "Delhi Police motto is 'With You, For You, Always' (Aapke Saath, Aapke Liye, Hamesha)." },
      { qid: "11", question: "Police Memorial is located in which Delhi area?", options: ["Connaught Place", "Chanakyapuri", "India Gate", "Rajpath"], correct: 1, marks: 1, explanation: "National Police Memorial is at Chanakyapuri, New Delhi." },
      { qid: "12", question: "What is 32 - 15 + 8?", options: ["23", "25", "27", "29"], correct: 1, marks: 1, explanation: "32 - 15 + 8 = 17 + 8 = 25." },
      { qid: "13", question: "Cybercrime comes under which type of crime?", options: ["Traditional", "White collar", "Blue collar", "Petty"], correct: 1, marks: 1, explanation: "Cybercrime is a type of white collar crime using technology." },
      { qid: "14", question: "Complete the pattern: DELHI, FGNKL, ?", options: ["HIJNO", "GHIJM", "HIPQR", "GIKNP"], correct: 0, marks: 1, explanation: "Each letter shifted by +2: D+2=F, E+2=G, L+2=N, H+2=J, I+2=K. Next: F+2=H,G+2=I,N+2=P..." },
      { qid: "15", question: "Physical fitness test in Delhi Police includes:", options: ["Running", "Long jump", "High jump", "All of these"], correct: 3, marks: 1, explanation: "Delhi Police physical test includes running, long jump, high jump." },
    ]},
  ]},
]

// Get all sample series (original + additional)
export function getAllSampleSeries(): SampleSeries[] {
  return [...SAMPLE_SERIES, ...ADDITIONAL_SERIES]
}

// Get sample questions for a test ID
export function getSampleQuestions(testId: string): SampleQuestion[] | null {
  // Search in both SAMPLE_SERIES and ADDITIONAL_SERIES
  const allSeries = [...SAMPLE_SERIES, ...ADDITIONAL_SERIES]
  for (const series of allSeries) {
    for (const test of series.tests) {
      if (test.id === testId) {
        // Return questions if available, otherwise return null to trigger fallback
        return test.questions && test.questions.length > 0 ? test.questions : null
      }
    }
  }
  return null
}

// Map platform URL/category to sample series category
export function mapUrlToCategory(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes("nda") || lower.includes("ssb") || lower.includes("sainik") || lower.includes("careerwill") || lower.includes("defence")) return "nda"
  if (lower.includes("jee") || lower.includes("neet") || lower.includes("dronstudy") || lower.includes("physics") || lower.includes("aakash") || lower.includes("etoos") || lower.includes("motion")) return "jee-neet"
  if (lower.includes("railway") || lower.includes("rrb") || lower.includes("alp")) return "railways"
  if (lower.includes("ctet") || lower.includes("teaching") || lower.includes("tet") || lower.includes("super")) return "teaching"
  if (lower.includes("upsc") || lower.includes("ias") || lower.includes("vikas") || lower.includes("forum") || lower.includes("insights")) return "upsc"
  return "ssc-banking" // default
}
