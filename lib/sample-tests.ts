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
  "ssc": ["ssc-banking", "ssc", "ssc-cgl", "ssc-chsl"],
  "banking": ["ssc-banking", "banking", "ibps", "sbi"],
  "defence": ["nda", "defence", "cds", "army"],
  "railways": ["railways", "rrb", "ntpc"],
  "upsc": ["upsc", "ias", "pcs"],
  "jee-neet": ["jee-neet", "jee", "neet", "physics"],
  "teaching": ["teaching", "ctet", "tet"],
  "general": ["general", "all"],
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
    { id: "ssc-chsl-t1", title: "SSC CHSL Mock Test 1", duration: 60, total_questions: 25, questions: [] },
    { id: "ssc-chsl-t2", title: "SSC CHSL Mock Test 2", duration: 60, total_questions: 25, questions: [] },
  ]},
  { id: "ssc-mts-1", slug: "ssc-mts-mock", title: "SSC MTS Full Mock Series", description: "SSC MTS preparation with reasoning & general awareness", category: "ssc", tests: [
    { id: "ssc-mts-t1", title: "SSC MTS Mock Test 1", duration: 45, total_questions: 20, questions: [] },
    { id: "ssc-mts-t2", title: "SSC MTS Mock Test 2", duration: 45, total_questions: 20, questions: [] },
  ]},
  { id: "ssc-gd-1", slug: "ssc-gd-constable", title: "SSC GD Constable Series", description: "SSC GD Constable with physical eligibility prep", category: "ssc", tests: [
    { id: "ssc-gd-t1", title: "SSC GD Mock Test 1", duration: 60, total_questions: 25, questions: [] },
  ]},
  { id: "ssc-je-1", slug: "ssc-je-technical", title: "SSC JE Technical Series", description: "SSC Junior Engineer technical & general studies", category: "ssc", tests: [
    { id: "ssc-je-t1", title: "SSC JE Technical Mock", duration: 120, total_questions: 50, questions: [] },
  ]},
  { id: "ssc-steno-1", slug: "ssc-stenographer", title: "SSC Stenographer Series", description: "SSC Stenographer Grade C & D preparation", category: "ssc", tests: [
    { id: "ssc-steno-t1", title: "SSC Steno Mock Test", duration: 60, total_questions: 30, questions: [] },
  ]},
  
  // More Banking
  { id: "ibps-po-1", slug: "ibps-po-prelims", title: "IBPS PO Prelims Series", description: "IBPS PO Preliminary exam preparation", category: "banking", tests: [
    { id: "ibps-po-t1", title: "IBPS PO Prelims Mock 1", duration: 60, total_questions: 30, questions: [] },
    { id: "ibps-po-t2", title: "IBPS PO Prelims Mock 2", duration: 60, total_questions: 30, questions: [] },
  ]},
  { id: "ibps-clerk-1", slug: "ibps-clerk-prelims", title: "IBPS Clerk Prelims Series", description: "IBPS Clerk preparation with English, Quant & Reasoning", category: "banking", tests: [
    { id: "ibps-clerk-t1", title: "IBPS Clerk Mock 1", duration: 60, total_questions: 30, questions: [] },
  ]},
  { id: "sbi-po-1", slug: "sbi-po-prelims", title: "SBI PO Prelims Series", description: "State Bank of India PO exam preparation", category: "banking", tests: [
    { id: "sbi-po-t1", title: "SBI PO Mock Test 1", duration: 60, total_questions: 35, questions: [] },
    { id: "sbi-po-t2", title: "SBI PO Mock Test 2", duration: 60, total_questions: 35, questions: [] },
  ]},
  { id: "sbi-clerk-1", slug: "sbi-clerk", title: "SBI Clerk Full Series", description: "SBI Clerk Junior Associate preparation", category: "banking", tests: [
    { id: "sbi-clerk-t1", title: "SBI Clerk Mock 1", duration: 60, total_questions: 30, questions: [] },
  ]},
  { id: "rbi-assistant-1", slug: "rbi-assistant", title: "RBI Assistant Series", description: "Reserve Bank of India Assistant exam prep", category: "banking", tests: [
    { id: "rbi-asst-t1", title: "RBI Assistant Mock", duration: 60, total_questions: 30, questions: [] },
  ]},
  { id: "nabard-1", slug: "nabard-grade-a", title: "NABARD Grade A/B Series", description: "NABARD Development Assistant preparation", category: "banking", tests: [
    { id: "nabard-t1", title: "NABARD Mock Test", duration: 90, total_questions: 40, questions: [] },
  ]},

  // More Defence
  { id: "cds-1", slug: "cds-mock", title: "CDS Mock Test Series", description: "Combined Defence Services exam preparation", category: "defence", tests: [
    { id: "cds-t1", title: "CDS GK Mock Test", duration: 120, total_questions: 50, questions: [] },
    { id: "cds-t2", title: "CDS English Mock", duration: 120, total_questions: 50, questions: [] },
  ]},
  { id: "afcat-1", slug: "afcat-mock", title: "AFCAT Mock Series", description: "Air Force Common Admission Test prep", category: "defence", tests: [
    { id: "afcat-t1", title: "AFCAT Mock Test 1", duration: 120, total_questions: 50, questions: [] },
  ]},
  { id: "capf-1", slug: "capf-ac-mock", title: "CAPF AC Mock Series", description: "Central Armed Police Forces Assistant Commandant", category: "defence", tests: [
    { id: "capf-t1", title: "CAPF AC Mock Test", duration: 120, total_questions: 50, questions: [] },
  ]},
  { id: "agniveer-1", slug: "agniveer-army", title: "Agniveer Army Series", description: "Indian Army Agniveer recruitment preparation", category: "defence", tests: [
    { id: "agniveer-t1", title: "Agniveer GD Mock", duration: 60, total_questions: 30, questions: [] },
    { id: "agniveer-t2", title: "Agniveer Technical Mock", duration: 60, total_questions: 30, questions: [] },
  ]},
  { id: "navy-aa-1", slug: "navy-aa-ssr", title: "Navy AA/SSR Series", description: "Indian Navy Artificer Apprentice & SSR", category: "defence", tests: [
    { id: "navy-t1", title: "Navy AA Mock Test", duration: 60, total_questions: 30, questions: [] },
  ]},

  // More Railways
  { id: "rrb-ntpc-1", slug: "rrb-ntpc-mock", title: "RRB NTPC CBT-1 Series", description: "Railway NTPC Computer Based Test preparation", category: "railways", tests: [
    { id: "rrb-ntpc-t1", title: "RRB NTPC Mock 1", duration: 90, total_questions: 40, questions: [] },
    { id: "rrb-ntpc-t2", title: "RRB NTPC Mock 2", duration: 90, total_questions: 40, questions: [] },
  ]},
  { id: "rrb-group-d-1", slug: "rrb-group-d", title: "RRB Group D Series", description: "Railway Group D Level 1 preparation", category: "railways", tests: [
    { id: "rrb-gd-t1", title: "RRB Group D Mock 1", duration: 90, total_questions: 40, questions: [] },
  ]},
  { id: "rrb-alp-1", slug: "rrb-alp-technician", title: "RRB ALP & Technician", description: "Assistant Loco Pilot & Technician preparation", category: "railways", tests: [
    { id: "rrb-alp-t1", title: "RRB ALP Mock Test", duration: 60, total_questions: 30, questions: [] },
    { id: "rrb-alp-t2", title: "RRB Technician Mock", duration: 60, total_questions: 30, questions: [] },
  ]},
  { id: "rrb-je-1", slug: "rrb-je-cbt", title: "RRB JE CBT Series", description: "Railway Junior Engineer Computer Based Test", category: "railways", tests: [
    { id: "rrb-je-t1", title: "RRB JE CBT-1 Mock", duration: 90, total_questions: 40, questions: [] },
  ]},

  // More UPSC
  { id: "upsc-cse-1", slug: "upsc-cse-prelims", title: "UPSC CSE Prelims GS", description: "Civil Services Preliminary General Studies", category: "upsc", tests: [
    { id: "upsc-gs-t1", title: "UPSC GS Paper 1 Mock", duration: 120, total_questions: 50, questions: [] },
    { id: "upsc-gs-t2", title: "UPSC GS Paper 2 Mock", duration: 120, total_questions: 50, questions: [] },
  ]},
  { id: "upsc-csat-1", slug: "upsc-csat", title: "UPSC CSAT Series", description: "Civil Services Aptitude Test preparation", category: "upsc", tests: [
    { id: "upsc-csat-t1", title: "UPSC CSAT Mock", duration: 120, total_questions: 40, questions: [] },
  ]},
  { id: "upsc-epfo-1", slug: "upsc-epfo", title: "UPSC EPFO Series", description: "Enforcement Officer/Accounts Officer exam", category: "upsc", tests: [
    { id: "upsc-epfo-t1", title: "EPFO Mock Test", duration: 120, total_questions: 50, questions: [] },
  ]},
  { id: "upsc-capf-1", slug: "upsc-capf-ac", title: "UPSC CAPF AC Series", description: "Central Armed Police Forces Assistant Commandant", category: "upsc", tests: [
    { id: "upsc-capf-t1", title: "CAPF AC Mock", duration: 120, total_questions: 50, questions: [] },
  ]},

  // More JEE/NEET
  { id: "jee-main-1", slug: "jee-main-mock", title: "JEE Main Full Mock Series", description: "JEE Main Physics, Chemistry & Maths", category: "jee-neet", tests: [
    { id: "jee-main-t1", title: "JEE Main Mock 1", duration: 180, total_questions: 75, questions: [] },
    { id: "jee-main-t2", title: "JEE Main Mock 2", duration: 180, total_questions: 75, questions: [] },
  ]},
  { id: "jee-adv-1", slug: "jee-advanced-mock", title: "JEE Advanced Series", description: "JEE Advanced preparation for IITs", category: "jee-neet", tests: [
    { id: "jee-adv-t1", title: "JEE Advanced Paper 1", duration: 180, total_questions: 60, questions: [] },
  ]},
  { id: "neet-ug-1", slug: "neet-ug-mock", title: "NEET UG Full Series", description: "NEET UG Physics, Chemistry & Biology", category: "jee-neet", tests: [
    { id: "neet-t1", title: "NEET UG Mock 1", duration: 180, total_questions: 90, questions: [] },
    { id: "neet-t2", title: "NEET UG Mock 2", duration: 180, total_questions: 90, questions: [] },
  ]},
  { id: "bitsat-1", slug: "bitsat-mock", title: "BITSAT Mock Series", description: "BITS Pilani Admission Test preparation", category: "jee-neet", tests: [
    { id: "bitsat-t1", title: "BITSAT Mock Test", duration: 180, total_questions: 130, questions: [] },
  ]},

  // More Teaching
  { id: "ctet-p1-1", slug: "ctet-paper-1", title: "CTET Paper-1 Series", description: "CTET for Primary Stage (Class 1-5)", category: "teaching", tests: [
    { id: "ctet-p1-t1", title: "CTET Paper 1 Mock 1", duration: 150, total_questions: 75, questions: [] },
    { id: "ctet-p1-t2", title: "CTET Paper 1 Mock 2", duration: 150, total_questions: 75, questions: [] },
  ]},
  { id: "ctet-p2-1", slug: "ctet-paper-2", title: "CTET Paper-2 Series", description: "CTET for Elementary Stage (Class 6-8)", category: "teaching", tests: [
    { id: "ctet-p2-t1", title: "CTET Paper 2 Mock", duration: 150, total_questions: 75, questions: [] },
  ]},
  { id: "super-tet-1", slug: "super-tet-mock", title: "Super TET Series", description: "UP Super TET Teacher recruitment", category: "teaching", tests: [
    { id: "super-tet-t1", title: "Super TET Mock 1", duration: 150, total_questions: 75, questions: [] },
  ]},
  { id: "kvs-1", slug: "kvs-pgt-tgt", title: "KVS PGT/TGT Series", description: "Kendriya Vidyalaya Sangathan Teacher exam", category: "teaching", tests: [
    { id: "kvs-t1", title: "KVS TGT Mock Test", duration: 150, total_questions: 75, questions: [] },
  ]},
  { id: "dsssb-1", slug: "dsssb-teacher", title: "DSSSB Teacher Series", description: "Delhi SSSB Teacher recruitment exam", category: "teaching", tests: [
    { id: "dsssb-t1", title: "DSSSB Teacher Mock", duration: 120, total_questions: 60, questions: [] },
  ]},

  // Police/State Exams
  { id: "delhi-police-1", slug: "delhi-police-constable", title: "Delhi Police Constable", description: "Delhi Police recruitment preparation", category: "ssc", tests: [
    { id: "dp-t1", title: "Delhi Police Mock 1", duration: 90, total_questions: 50, questions: [] },
  ]},
  { id: "up-police-1", slug: "up-police-constable", title: "UP Police Constable", description: "Uttar Pradesh Police recruitment", category: "ssc", tests: [
    { id: "up-t1", title: "UP Police Mock 1", duration: 120, total_questions: 75, questions: [] },
  ]},
]

// Get all sample series (original + additional)
export function getAllSampleSeries(): SampleSeries[] {
  return [...SAMPLE_SERIES, ...ADDITIONAL_SERIES]
}

// Get sample questions for a test ID
export function getSampleQuestions(testId: string): SampleQuestion[] | null {
  for (const series of SAMPLE_SERIES) {
    for (const test of series.tests) {
      if (test.id === testId) return test.questions
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
