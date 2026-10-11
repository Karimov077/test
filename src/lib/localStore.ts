export type Question = {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
};

export type TestCategory = 'fractions-add-sub' | 'fractions-mul-div' | 'mixed-numbers' | 'word-part' | 'word-remaining' | 'word-find-whole' | 'word-practical' | 'gcd-lcm';

export type TestItem = {
  id: number;
  title: string;
  description: string;
  category?: string;
  code: string;
  isActive: boolean;
  durationSeconds: number;
  startsAt: string | null;
  openedAt: string | null;
  deadlineAt: string | null;
  questions: Question[];
};

export type TestResult = {
  id: number;
  studentName: string;
  testId: number;
  testTitle: string;
  testCode: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  answers?: Record<number, string>;
};

export type LocalData = {
  tests: TestItem[];
  results: TestResult[];
};

export function isTestAvailable(test: TestItem, now = Date.now()): boolean {
  if (!test.questions || test.questions.length === 0) return false;
  if (!test.isActive) return false;
  // Test faqat admin muddat belgilagan bo'lsa va muddat o'tmagan bo'lsagina o'quvchiga ko'rinadi!
  if (!test.deadlineAt) return false;

  const deadlineTime = Date.parse(test.deadlineAt);
  if (!Number.isFinite(deadlineTime) || now >= deadlineTime) return false;

  if (test.startsAt) {
    const startTime = Date.parse(test.startsAt);
    if (Number.isFinite(startTime) && now < startTime) return false;
  }

  return true;
}

const STORAGE_KEY = 'testgennis-local-data-v5';
const LEGACY_STORAGE_KEYS = ['testgennis-local-data-v4', 'testgennis-local-data-v3', 'testgennis-local-data-v2', 'testgennis-local-data-v1'];
const letters: Question['correctAnswer'][] = ['A', 'B', 'C', 'D'];

export function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

export function lcm(left: number, right: number): number {
  return (Math.abs(left * right)) / gcd(left, right);
}

export function fraction(numerator: number, denominator: number): string {
  if (denominator === 0) return '0';
  const divisor = gcd(numerator, denominator);
  const sign = (numerator < 0 && denominator < 0) || (numerator > 0 && denominator > 0) ? 1 : (numerator === 0 ? 0 : -1);
  const top = Math.abs(numerator / divisor) * sign;
  const bottom = Math.abs(denominator / divisor);
  return bottom === 1 ? String(top) : `${top}/${bottom}`;
}

export function makeQuestion(
  testId: number,
  index: number,
  prompt: string,
  answer: string,
  distractors: string[],
  explanation = ''
): Question {
  const options = [answer];
  for (const distractor of distractors) {
    const trimmed = String(distractor).trim();
    if (trimmed && !options.includes(trimmed)) {
      options.push(trimmed);
    }
  }

  // Fallback to guarantee 4 distinct options if distractors had duplicates
  let fallback = 1;
  while (options.length < 4) {
    let candidate = '';
    const num = Number(answer);
    if (Number.isFinite(num) && !answer.includes('/')) {
      candidate = String(num + fallback);
    } else if (answer.includes('/')) {
      const [top, bot] = answer.split('/').map(Number);
      candidate = `${top + fallback}/${bot}`;
    } else {
      candidate = `${answer} + ${fallback}`;
    }
    if (!options.includes(candidate)) {
      options.push(candidate);
    }
    fallback += 1;
  }

  const correctIndex = index % 4;
  const ordered = [0, 1, 2, 3].map((position) =>
    position === correctIndex ? options[0] : options[position < correctIndex ? position + 1 : position]
  );

  return {
    id: testId * 1000 + index + 1,
    questionText: prompt,
    optionA: ordered[0],
    optionB: ordered[1],
    optionC: ordered[2],
    optionD: ordered[3],
    correctAnswer: letters[correctIndex],
    explanation: explanation || `${prompt} To‘g‘ri javob: ${answer}.`
  };
}

// -------------------------------------------------------------
// Dastlabki holatda testlar yopiq bo‘ladi.
// Faqat o‘qituvchi admin paneldan muddat belgilab ochganda ko‘rinadi.
// -------------------------------------------------------------
function getDefaultDates() {
  return {
    startsAt: null,
    openedAt: null,
    deadlineAt: null
  };
}

// -------------------------------------------------------------
// Test 1: Kasrlarni qo‘shish va ayirish (20 ta savol)
// -------------------------------------------------------------
function fractionAddSubTest(): TestItem {
  const id = 1;
  const items: Array<{ prompt: string; answer: string; distractors: string[]; explanation: string }> = [
    { prompt: '1/4 + 2/4 = ?', answer: '3/4', distractors: ['2/4', '3/8', '1'], explanation: 'Bir xil maxrajli kasrlarni qo‘shishda suratlari qo‘shiladi: (1 + 2)/4 = 3/4.' },
    { prompt: '5/7 − 2/7 = ?', answer: '3/7', distractors: ['4/7', '3/14', '2/7'], explanation: 'Bir xil maxrajli kasrlarni ayirishda suratlari ayiriladi: (5 − 2)/7 = 3/7.' },
    { prompt: '1/3 + 1/6 = ?', answer: '1/2', distractors: ['2/9', '2/6', '5/6'], explanation: 'Umumiy maxraj 6: 1/3 = 2/6. Demak, 2/6 + 1/6 = 3/6 = 1/2.' },
    { prompt: '3/4 − 1/8 = ?', answer: '5/8', distractors: ['2/8', '1/4', '7/8'], explanation: 'Umumiy maxraj 8: 3/4 = 6/8. Demak, 6/8 − 1/8 = 5/8.' },
    { prompt: '2/5 + 1/10 = ?', answer: '1/2', distractors: ['3/15', '3/10', '4/10'], explanation: 'Umumiy maxraj 10: 2/5 = 4/10. 4/10 + 1/10 = 5/10 = 1/2.' },
    { prompt: '5/6 − 1/3 = ?', answer: '1/2', distractors: ['4/6', '1/3', '2/3'], explanation: 'Umumiy maxraj 6: 1/3 = 2/6. 5/6 − 2/6 = 3/6 = 1/2.' },
    { prompt: '7/12 + 1/6 = ?', answer: '3/4', distractors: ['8/18', '5/12', '11/12'], explanation: 'Umumiy maxraj 12: 1/6 = 2/12. 7/12 + 2/12 = 9/12 = 3/4.' },
    { prompt: '5/8 − 1/4 = ?', answer: '3/8', distractors: ['4/8', '1/8', '1/2'], explanation: 'Umumiy maxraj 8: 1/4 = 2/8. 5/8 − 2/8 = 3/8.' },
    { prompt: '1/2 + 3/8 = ?', answer: '7/8', distractors: ['4/10', '5/8', '1'], explanation: 'Umumiy maxraj 8: 1/2 = 4/8. 4/8 + 3/8 = 7/8.' },
    { prompt: '9/10 − 2/5 = ?', answer: '1/2', distractors: ['7/10', '7/5', '3/5'], explanation: 'Umumiy maxraj 10: 2/5 = 4/10. 9/10 − 4/10 = 5/10 = 1/2.' },
    { prompt: '3/5 + 2/15 = ?', answer: '11/15', distractors: ['5/20', '7/15', '4/5'], explanation: 'Umumiy maxraj 15: 3/5 = 9/15. 9/15 + 2/15 = 11/15.' },
    { prompt: '7/9 − 1/3 = ?', answer: '4/9', distractors: ['6/9', '2/9', '5/9'], explanation: 'Umumiy maxraj 9: 1/3 = 3/9. 7/9 − 3/9 = 4/9.' },
    { prompt: '2/3 + 1/9 = ?', answer: '7/9', distractors: ['3/12', '5/9', '8/9'], explanation: 'Umumiy maxraj 9: 2/3 = 6/9. 6/9 + 1/9 = 7/9.' },
    { prompt: '11/12 − 1/4 = ?', answer: '2/3', distractors: ['10/8', '7/12', '5/6'], explanation: 'Umumiy maxraj 12: 1/4 = 3/12. 11/12 − 3/12 = 8/12 = 2/3.' },
    { prompt: '1/4 + 1/3 = ?', answer: '7/12', distractors: ['2/7', '5/12', '1/2'], explanation: 'Umumiy maxraj 12: 1/4 = 3/12, 1/3 = 4/12. 3/12 + 4/12 = 7/12.' },
    { prompt: '5/6 − 1/2 = ?', answer: '1/3', distractors: ['4/4', '1/6', '2/3'], explanation: 'Umumiy maxraj 6: 1/2 = 3/6. 5/6 − 3/6 = 2/6 = 1/3.' },
    { prompt: '3/4 + 1/12 = ?', answer: '5/6', distractors: ['4/16', '7/12', '11/12'], explanation: 'Umumiy maxraj 12: 3/4 = 9/12. 9/12 + 1/12 = 10/12 = 5/6.' },
    { prompt: '4/5 − 3/10 = ?', answer: '1/2', distractors: ['1/5', '3/5', '7/10'], explanation: 'Umumiy maxraj 10: 4/5 = 8/10. 8/10 − 3/10 = 5/10 = 1/2.' },
    { prompt: '2/7 + 3/14 = ?', answer: '1/2', distractors: ['5/21', '5/14', '4/7'], explanation: 'Umumiy maxraj 14: 2/7 = 4/14. 4/14 + 3/14 = 7/14 = 1/2.' },
    { prompt: '7/15 + 2/5 = ?', answer: '13/15', distractors: ['9/20', '11/15', '4/5'], explanation: 'Umumiy maxraj 15: 2/5 = 6/15. 7/15 + 6/15 = 13/15.' }
  ];

  const questions = items.map((item, index) =>
    makeQuestion(id, index, item.prompt, item.answer, item.distractors, item.explanation)
  );

  return {
    id,
    title: 'Oddiy kasrlarni qo‘shish va ayirish',
    description: 'Bir xil va har xil maxrajli kasrlarni qo‘shish hamda ayirish amallari.',
    category: 'fractions-add-sub',
    code: 'KASR-QOSH-01',
    isActive: false,
    durationSeconds: 18000,
    ...getDefaultDates(),
    questions
  };
}

// -------------------------------------------------------------
// Test 2: Kasrlarni ko‘paytirish va bo‘lish (20 ta savol)
// -------------------------------------------------------------
function fractionMulDivTest(): TestItem {
  const id = 2;
  const items: Array<{ prompt: string; answer: string; distractors: string[]; explanation: string }> = [
    { prompt: '1/2 × 2/3 = ?', answer: '1/3', distractors: ['2/5', '1/2', '3/5'], explanation: 'Surat suratga, maxraj maxrajga ko‘paytiriladi: (1 × 2)/(2 × 3) = 2/6 = 1/3.' },
    { prompt: '3/4 × 4/5 = ?', answer: '3/5', distractors: ['7/9', '12/20', '1/2'], explanation: '4 lar qisqaradi: (3 × 4)/(4 × 5) = 3/5.' },
    { prompt: '2/5 × 5/8 = ?', answer: '1/4', distractors: ['10/40', '2/8', '3/8'], explanation: '5 lar qisqaradi: 2/8 = 1/4.' },
    { prompt: '5/6 × 3/10 = ?', answer: '1/4', distractors: ['15/60', '1/2', '1/3'], explanation: '5 bilan 10 qisqarib 1/2, 3 bilan 6 qisqarib 1/2 bo‘ladi: 1/2 × 1/2 = 1/4.' },
    { prompt: '7/9 × 3/7 = ?', answer: '1/3', distractors: ['21/63', '3/9', '2/3'], explanation: '7 lar qisqaradi: 3/9 = 1/3.' },
    { prompt: '3/8 × 4/9 = ?', answer: '1/6', distractors: ['12/72', '1/8', '2/9'], explanation: '3 bilan 9 qisqarib 1/3, 4 bilan 8 qisqarib 1/2: 1/2 × 1/3 = 1/6.' },
    { prompt: '4/7 × 7/8 = ?', answer: '1/2', distractors: ['28/56', '4/8', '3/4'], explanation: '7 lar qisqaradi: 4/8 = 1/2.' },
    { prompt: '5/12 × 6/25 = ?', answer: '1/10', distractors: ['30/300', '1/5', '1/6'], explanation: '5 bilan 25 qisqarib 1/5, 6 bilan 12 qisqarib 1/2: 1/2 × 1/5 = 1/10.' },
    { prompt: '2/3 ÷ 4/9 = ?', answer: '3/2', distractors: ['8/27', '2/3', '1/2'], explanation: 'Bo‘lishda ikkinchi kasr teskarisiga ko‘paytiriladi: 2/3 × 9/4 = 18/12 = 3/2.' },
    { prompt: '3/4 ÷ 3/8 = ?', answer: '2', distractors: ['9/32', '1/2', '4'], explanation: '3/4 × 8/3 = 24/12 = 2.' },
    { prompt: '5/6 ÷ 5/12 = ?', answer: '2', distractors: ['25/72', '1/2', '3'], explanation: '5/6 × 12/5 = 12/6 = 2.' },
    { prompt: '7/10 ÷ 7/5 = ?', answer: '1/2', distractors: ['49/50', '2', '1'], explanation: '7/10 × 5/7 = 5/10 = 1/2.' },
    { prompt: '4/5 ÷ 2/3 = ?', answer: '6/5', distractors: ['8/15', '5/6', '3/4'], explanation: '4/5 × 3/2 = 12/10 = 6/5.' },
    { prompt: '3/7 ÷ 6/7 = ?', answer: '1/2', distractors: ['18/49', '2', '3/6'], explanation: '3/7 × 7/6 = 3/6 = 1/2.' },
    { prompt: '8/9 ÷ 4/3 = ?', answer: '2/3', distractors: ['32/27', '3/4', '1/3'], explanation: '8/9 × 3/4 = (8×3)/(9×4) = 24/36 = 2/3.' },
    { prompt: '5/8 ÷ 15/16 = ?', answer: '2/3', distractors: ['75/128', '3/2', '1/2'], explanation: '5/8 × 16/15 = (5×16)/(8×15) = 2/3.' },
    { prompt: '1/6 × 12 = ?', answer: '2', distractors: ['12/6', '1/2', '3'], explanation: 'Kasr butun songa ko‘paytiriladi: (1 × 12)/6 = 12/6 = 2.' },
    { prompt: '15 × 2/5 = ?', answer: '6', distractors: ['30/5', '5', '8'], explanation: '(15 × 2)/5 = 30/5 = 6.' },
    { prompt: '6 ÷ 3/4 = ?', answer: '8', distractors: ['18/4', '6', '9'], explanation: '6 × 4/3 = 24/3 = 8.' },
    { prompt: '10 ÷ 2/5 = ?', answer: '25', distractors: ['20/5', '4', '20'], explanation: '10 × 5/2 = 50/2 = 25.' }
  ];

  const questions = items.map((item, index) =>
    makeQuestion(id, index, item.prompt, item.answer, item.distractors, item.explanation)
  );

  return {
    id,
    title: 'Kasrlarni ko‘paytirish va bo‘lish',
    description: 'Oddiy kasrlar va butun sonlar ustida ko‘paytirish va bo‘lish amallari.',
    category: 'fractions-mul-div',
    code: 'KASR-KOP-02',
    isActive: false,
    durationSeconds: 18000,
    ...getDefaultDates(),
    questions
  };
}

// -------------------------------------------------------------
// Test 3: Aralash sonlar ustida amallar (20 ta savol)
// -------------------------------------------------------------
function mixedNumbersTest(): TestItem {
  const id = 3;
  const items: Array<{ prompt: string; answer: string; distractors: string[]; explanation: string }> = [
    { prompt: '1 1/2 + 2 1/2 = ?', answer: '4', distractors: ['3 1/2', '3', '5'], explanation: 'Butun qismlar: 1 + 2 = 3. Kasr qismlar: 1/2 + 1/2 = 1. Jami: 3 + 1 = 4.' },
    { prompt: '2 1/3 + 1 2/3 = ?', answer: '4', distractors: ['3 2/3', '3 1/3', '5'], explanation: '2 + 1 = 3; 1/3 + 2/3 = 3/3 = 1; 3 + 1 = 4.' },
    { prompt: '3 3/4 − 1 1/4 = ?', answer: '2 1/2', distractors: ['2 2/4', '2 1/4', '3'], explanation: '3 − 1 = 2; 3/4 − 1/4 = 2/4 = 1/2. Natija: 2 1/2.' },
    { prompt: '4 5/6 − 2 1/6 = ?', answer: '2 2/3', distractors: ['2 4/6', '2 1/3', '3'], explanation: '4 − 2 = 2; 5/6 − 1/6 = 4/6 = 2/3. Natija: 2 2/3.' },
    { prompt: '1 1/4 + 2 1/2 = ?', answer: '3 3/4', distractors: ['3 2/4', '3 1/2', '4'], explanation: '2 1/2 = 2 2/4. 1 1/4 + 2 2/4 = 3 3/4.' },
    { prompt: '3 1/2 − 1 1/4 = ?', answer: '2 1/4', distractors: ['2 1/2', '2', '3 1/4'], explanation: '3 2/4 − 1 1/4 = 2 1/4.' },
    { prompt: '2 1/3 + 1 1/6 = ?', answer: '3 1/2', distractors: ['3 2/6', '3 1/3', '4'], explanation: '2 2/6 + 1 1/6 = 3 3/6 = 3 1/2.' },
    { prompt: '4 2/5 − 1 1/10 = ?', answer: '3 3/10', distractors: ['3 1/5', '3 2/10', '3 1/2'], explanation: '4 4/10 − 1 1/10 = 3 3/10.' },
    { prompt: '2 1/4 × 2 = ?', answer: '4 1/2', distractors: ['4 1/4', '5', '4'], explanation: '2 1/4 = 9/4. 9/4 × 2 = 9/2 = 4 1/2.' },
    { prompt: '1 1/2 × 1 1/3 = ?', answer: '2', distractors: ['1 1/6', '2 1/2', '3'], explanation: '1 1/2 = 3/2, 1 1/3 = 4/3. 3/2 × 4/3 = 12/6 = 2.' },
    { prompt: '2 2/3 × 3/4 = ?', answer: '2', distractors: ['2 1/3', '1 1/2', '3'], explanation: '2 2/3 = 8/3. 8/3 × 3/4 = 24/12 = 2.' },
    { prompt: '3 1/3 ÷ 1 2/3 = ?', answer: '2', distractors: ['1 1/2', '3', '2 1/3'], explanation: '3 1/3 = 10/3, 1 2/3 = 5/3. 10/3 ÷ 5/3 = 10/5 = 2.' },
    { prompt: '2 1/2 ÷ 1/2 = ?', answer: '5', distractors: ['4', '2', '6'], explanation: '2 1/2 = 5/2. 5/2 ÷ 1/2 = 5.' },
    { prompt: '4 1/2 ÷ 3 = ?', answer: '1 1/2', distractors: ['1 1/3', '2', '1'], explanation: '4 1/2 = 9/2. 9/2 ÷ 3 = 9/6 = 3/2 = 1 1/2.' },
    { prompt: '1 3/5 + 2 1/5 = ?', answer: '3 4/5', distractors: ['3 2/5', '4', '3 3/5'], explanation: '1 + 2 = 3; 3/5 + 1/5 = 4/5. Natija: 3 4/5.' },
    { prompt: '5 − 2 1/3 = ?', answer: '2 2/3', distractors: ['3 1/3', '2 1/3', '3 2/3'], explanation: '5 ni 4 3/3 deb olamiz: 4 3/3 − 2 1/3 = 2 2/3.' },
    { prompt: '4 − 1 3/4 = ?', answer: '2 1/4', distractors: ['3 1/4', '2 3/4', '3'], explanation: '4 = 3 4/4. 3 4/4 − 1 3/4 = 2 1/4.' },
    { prompt: '1 1/2 × 4 = ?', answer: '6', distractors: ['4 1/2', '5', '8'], explanation: '3/2 × 4 = 12/2 = 6.' },
    { prompt: '2 1/4 + 3 3/4 = ?', answer: '6', distractors: ['5 3/4', '5', '6 1/4'], explanation: '2 + 3 = 5; 1/4 + 3/4 = 1; 5 + 1 = 6.' },
    { prompt: '3 1/2 − 1 1/2 = ?', answer: '2', distractors: ['1', '2 1/2', '3'], explanation: '3 − 1 = 2; 1/2 − 1/2 = 0. Natija: 2.' }
  ];

  const questions = items.map((item, index) =>
    makeQuestion(id, index, item.prompt, item.answer, item.distractors, item.explanation)
  );

  return {
    id,
    title: 'Aralash sonlar ustida amallar',
    description: 'Aralash sonlarni qo‘shish, ayirish, ko‘paytirish va bo‘lish qoidalari.',
    category: 'mixed-numbers',
    code: 'ARALASH-SON-03',
    isActive: false,
    durationSeconds: 18000,
    ...getDefaultDates(),
    questions
  };
}

// -------------------------------------------------------------
// Test 4: Matnli masalalar: Sonning kasrini topish (20 ta savol)
// -------------------------------------------------------------
function wordFractionOfNumberTest(): TestItem {
  const id = 4;
  const items: Array<{ prompt: string; answer: string; distractors: string[]; explanation: string }> = [
    { prompt: 'Kitob 120 bet. Nodir kitobning 1/3 qismini o‘qidi. U necha bet kitob o‘qigan?', answer: '40', distractors: ['30', '50', '60'], explanation: '120 × 1/3 = 120 ÷ 3 = 40 bet.' },
    { prompt: 'Savatda 45 ta olma bor edi. Olmalarning 2/5 qismi sotildi. Nechta olma sotildi?', answer: '18', distractors: ['15', '20', '25'], explanation: '45 × 2/5 = (45 ÷ 5) × 2 = 9 × 2 = 18 ta.' },
    { prompt: 'Sinfda 32 nafar o‘quvchi bor. Ularning 3/4 qismi to‘garakka qatnashadi. Nechta o‘quvchi to‘garakka qatnashadi?', answer: '24', distractors: ['20', '26', '28'], explanation: '32 × 3/4 = (32 ÷ 4) × 3 = 8 × 3 = 24 nafar.' },
    { prompt: 'Ombordagi 60 kg unning 3/5 qismi ishlatildi. Necha kg un ishlatildi?', answer: '36', distractors: ['30', '40', '45'], explanation: '60 × 3/5 = (60 ÷ 5) × 3 = 12 × 3 = 36 kg.' },
    { prompt: 'Daraxtda 28 ta qush qo‘ngan edi. Ularning 1/4 qismi uchib ketdi. Nechta qush uchib ketdi?', answer: '7', distractors: ['6', '8', '9'], explanation: '28 × 1/4 = 28 ÷ 4 = 7 ta.' },
    { prompt: 'Poyezdda 150 nafar yo‘lovchi bor. Ularning 2/3 qismi kattalar. Nechta katta yoshli yo‘lovchi bor?', answer: '100', distractors: ['90', '110', '120'], explanation: '150 × 2/3 = (150 ÷ 3) × 2 = 50 × 2 = 100 kishi.' },
    { prompt: 'Bog‘bon 50 tup ko‘chatning 4/5 qismini ekdi. U nechta ko‘chat ekdi?', answer: '40', distractors: ['35', '45', '30'], explanation: '50 × 4/5 = (50 ÷ 5) × 4 = 10 × 4 = 40 tup.' },
    { prompt: 'Avtomobil 90 km masofaning 2/3 qismini bosib o‘tdi. U necha km yo‘l yurdi?', answer: '60', distractors: ['50', '70', '45'], explanation: '90 × 2/3 = (90 ÷ 3) × 2 = 30 × 2 = 60 km.' },
    { prompt: 'Do‘konga 80 ta daftar keltirildi. Kunning birinchi yarmida ularning 5/8 qismi sotildi. Nechta daftar sotildi?', answer: '50', distractors: ['40', '60', '45'], explanation: '80 × 5/8 = (80 ÷ 8) × 5 = 10 × 5 = 50 ta.' },
    { prompt: 'Nodirda 40 000 so‘m pul bor edi. U pulining 3/10 qismiga qalamlar sotib oldi. Qalamlarga necha so‘m sarfladi?', answer: '12 000', distractors: ['10 000', '15 000', '14 000'], explanation: '40 000 × 3/10 = 4 000 × 3 = 12 000 so‘m.' },
    { prompt: 'Kutubxonadagi 200 ta kitobning 3/10 qismi ertak kitoblari. Kutubxonada nechta ertak kitobi bor?', answer: '60', distractors: ['50', '70', '80'], explanation: '200 × 3/10 = 20 × 3 = 60 ta kitob.' },
    { prompt: 'Fermada 72 ta qo‘y bor. Ularning 5/9 qismi oq rangda. Nechta oq qo‘y bor?', answer: '40', distractors: ['35', '45', '50'], explanation: '72 × 5/9 = (72 ÷ 9) × 5 = 8 × 5 = 40 ta.' },
    { prompt: 'Maktab oshxonasiga 48 litr sut keltirildi. Tushlikkacha uning 3/8 qismi ichildi. Necha litr sut ichildi?', answer: '18', distractors: ['16', '20', '24'], explanation: '48 × 3/8 = (48 ÷ 8) × 3 = 6 × 3 = 18 litr.' },
    { prompt: 'Anvar 60 daqiqaning 2/5 qismini uy vazifasiga sarfladi. U necha daqiqa uy vazifasi bajardi?', answer: '24', distractors: ['20', '30', '25'], explanation: '60 × 2/5 = (60 ÷ 5) × 2 = 12 × 2 = 24 daqiqa.' },
    { prompt: 'Bog‘dagi 96 tup daraxtning 7/12 qismi mevali daraxtlar. Nechta mevali daraxt bor?', answer: '56', distractors: ['50', '60', '52'], explanation: '96 × 7/12 = (96 ÷ 12) × 7 = 8 × 7 = 56 tup.' },
    { prompt: 'Do‘kondagi 75 kg guruchning 2/3 qismi qadoqlandi. Necha kg guruch qadoqlandi?', answer: '50', distractors: ['45', '55', '60'], explanation: '75 × 2/3 = (75 ÷ 3) × 2 = 25 × 2 = 50 kg.' },
    { prompt: 'Samolyotda 180 ta o‘rindiq bor. Ularning 5/6 qismi band. Nechta o‘rindiq band?', answer: '150', distractors: ['140', '160', '130'], explanation: '180 × 5/6 = (180 ÷ 6) × 5 = 30 × 5 = 150 ta.' },
    { prompt: 'Gulshanda 36 ta atirgul ochilgan edi. Ularning 3/4 qismi qizil rangda. Nechta qizil atirgul bor?', answer: '27', distractors: ['24', '30', '28'], explanation: '36 × 3/4 = (36 ÷ 4) × 3 = 9 × 3 = 27 ta.' },
    { prompt: 'Sportchining yugurish masofasi 12 km. U masofaning 3/4 qismini yugurib o‘tdi. U necha km yugurgan?', answer: '9', distractors: ['8', '10', '7'], explanation: '12 × 3/4 = (12 ÷ 4) × 3 = 3 × 3 = 9 km.' },
    { prompt: '500 000 so‘m oylik mukofotning 1/5 qismi xayriyaga ajratildi. Necha so‘m xayriya qilindi?', answer: '100 000', distractors: ['80 000', '120 000', '150 000'], explanation: '500 000 × 1/5 = 500 000 ÷ 5 = 100 000 so‘m.' }
  ];

  const questions = items.map((item, index) =>
    makeQuestion(id, index, item.prompt, item.answer, item.distractors, item.explanation)
  );

  return {
    id,
    title: 'Matnli masalalar: Sonning kasrini topish',
    description: 'Miqdorning berilgan kasr qismini topishga doir sodda va qiziqarli masalalar.',
    category: 'word-part',
    code: 'MATN-KASR-04',
    isActive: false,
    durationSeconds: 18000,
    ...getDefaultDates(),
    questions
  };
}

// -------------------------------------------------------------
// Test 5: Matnli masalalar: Qoldiq va ayirmani topish (20 ta savol)
// -------------------------------------------------------------
function wordRemainingTest(): TestItem {
  const id = 5;
  const items: Array<{ prompt: string; answer: string; distractors: string[]; explanation: string }> = [
    { prompt: 'Kitob 100 bet. Madina kitobning 1/4 qismini o‘qidi. U yana necha bet o‘qishi kerak?', answer: '75', distractors: ['25', '70', '80'], explanation: 'O‘qilgan: 100 × 1/4 = 25 bet. Qolgan: 100 − 25 = 75 bet.' },
    { prompt: 'Idishda 7/8 litr sharbat bor edi. Undan 3/8 litr ichildi. Idishda necha litr sharbat qoldi?', answer: '1/2', distractors: ['4/8', '3/8', '5/8'], explanation: '7/8 − 3/8 = 4/8 = 1/2 litr.' },
    { prompt: 'Sinfda 30 nafar o‘quvchi bor. Ularning 2/5 qismi o‘g‘il bolalar. Sinfda nechta qiz bola bor?', answer: '18', distractors: ['12', '15', '20'], explanation: 'O‘g‘il bolalar: 30 × 2/5 = 12 nafar. Qizlar: 30 − 12 = 18 nafar.' },
    { prompt: 'Oshpazda 20 kg go‘sht bor edi. U go‘shtning 3/4 qismini tushlikka ishlatdi. Necha kg go‘sht qoldi?', answer: '5', distractors: ['15', '4', '6'], explanation: 'Ishlatildi: 20 × 3/4 = 15 kg. Qoldi: 20 − 15 = 5 kg.' },
    { prompt: 'Sayyoh yo‘lning 3/7 qismini bosib o‘tdi. U yana yo‘lning qancha qismini bosib o‘tishi kerak?', answer: '4/7', distractors: ['3/7', '1/7', '5/7'], explanation: 'Butun yo‘l 1 qism: 1 − 3/7 = 4/7 qismi qoldi.' },
    { prompt: 'Kasalxonaga 60 litr dori keltirildi. Uning 2/3 qismi tarqatildi. Necha litr dori qoldi?', answer: '20', distractors: ['40', '15', '30'], explanation: 'Tarqatildi: 60 × 2/3 = 40 litr. Qoldi: 60 − 40 = 20 litr.' },
    { prompt: 'Uzunligi 5/6 metr bo‘lgan tasmadan 1/3 metr qirqib olindi. Necha metr tasma qoldi?', answer: '1/2', distractors: ['4/6', '1/6', '2/3'], explanation: '1/3 = 2/6. 5/6 − 2/6 = 3/6 = 1/2 metr.' },
    { prompt: 'Do‘konda 80 kg shakar bor edi. Ertalab uning 1/4 qismi, kechqurun 1/2 qismi sotildi. Qancha kg shakar qoldi?', answer: '20', distractors: ['15', '25', '30'], explanation: 'Ertalab: 20 kg. Kechqurun: 40 kg. Jami sotildi: 60 kg. Qoldi: 80 − 60 = 20 kg.' },
    { prompt: 'Birinchi savatchada 3/5 kg, ikkinchi savatchada 1/5 kg meva bor. Birinchi savatchada ikkinchisidan necha kg ko‘p meva bor?', answer: '2/5', distractors: ['4/5', '1/5', '1/2'], explanation: '3/5 − 1/5 = 2/5 kg.' },
    { prompt: 'Akromda 50 000 so‘m bor edi. U pulining 2/5 qismiga kitob sotib oldi. Unda necha so‘m pul qoldi?', answer: '30 000', distractors: ['20 000', '25 000', '35 000'], explanation: 'Kitob: 50 000 × 2/5 = 20 000 so‘m. Qoldi: 50 000 − 20 000 = 30 000 so‘m.' },
    { prompt: '120 kg olmaning 3/8 qismi birinchi kuni, 1/4 qismi ikkinchi kuni sotildi. Necha kg olma qoldi?', answer: '45', distractors: ['40', '50', '35'], explanation: '1-kun: 45 kg. 2-kun: 30 kg. Jami sotildi: 75 kg. Qoldi: 120 − 75 = 45 kg.' },
    { prompt: 'Hovuzdagi suvning 5/9 qismi sarflandi. Hovuzda suvning qancha qismi qoldi?', answer: '4/9', distractors: ['5/9', '1/9', '3/9'], explanation: '1 − 5/9 = 4/9 qismi.' },
    { prompt: 'Tikuvchida 16 metr mato bor edi. U matoning 5/8 qismidan ko‘ylak tikdi. Necha metr mato qoldi?', answer: '6', distractors: ['10', '5', '8'], explanation: 'Tikildi: 16 × 5/8 = 10 metr. Qoldi: 16 − 10 = 6 metr.' },
    { prompt: 'O‘quvchi 80 betlik daftarning 3/10 qismini yozib to‘ldirdi. Daftarda necha bet bo‘sh qoldi?', answer: '56', distractors: ['24', '50', '60'], explanation: 'Yozildi: 80 × 3/10 = 24 bet. Bo‘sh qoldi: 80 − 24 = 56 bet.' },
    { prompt: 'Bir idishda 9/10 litr sut bor edi. Undan 2/5 litr ishlatildi. Idishda necha litr sut qoldi?', answer: '1/2', distractors: ['7/10', '3/10', '3/5'], explanation: '2/5 = 4/10. 9/10 − 4/10 = 5/10 = 1/2 litr.' },
    { prompt: 'Avtomobil 200 km yo‘lning 3/5 qismini bosib o‘tdi. Manzilgacha yana necha km yo‘l qoldi?', answer: '80', distractors: ['120', '70', '90'], explanation: 'Yurildi: 200 × 3/5 = 120 km. Qoldi: 200 − 120 = 80 km.' },
    { prompt: 'Kutubxonada 150 ta yangi jurnal bor edi. Ularning 4/5 qismi o‘quvchilarga berildi. Nechta jurnal qoldi?', answer: '30', distractors: ['120', '25', '35'], explanation: 'Berildi: 150 × 4/5 = 120 ta. Qoldi: 150 − 120 = 30 ta.' },
    { prompt: 'Ishchi kunlik rejaning 7/10 qismini bajardi. Rejani tugatish uchun yana qancha qismi qoldi?', answer: '3/10', distractors: ['7/10', '1/10', '4/10'], explanation: '1 − 7/10 = 3/10 qismi.' },
    { prompt: '70 metr simning 3/7 qismi ishlatildi. Necha metr sim qoldi?', answer: '40', distractors: ['30', '45', '50'], explanation: 'Ishlatildi: 70 × 3/7 = 30 metr. Qoldi: 70 − 30 = 40 metr.' },
    { prompt: 'Bog‘da 64 ta daraxt bor. Ularning 3/8 qismi nok, qolgani olma. Nechta olma daraxti bor?', answer: '40', distractors: ['24', '36', '42'], explanation: 'Nok: 64 × 3/8 = 24 ta. Olma: 64 − 24 = 40 ta.' }
  ];

  const questions = items.map((item, index) =>
    makeQuestion(id, index, item.prompt, item.answer, item.distractors, item.explanation)
  );

  return {
    id,
    title: 'Matnli masalalar: Qoldiq va ayirmani topish',
    description: 'Qolgan qismni, ayirmani va qoldiq miqdorni topishga doir amaliy masalalar.',
    category: 'word-remaining',
    code: 'MATN-QOLDIQ-05',
    isActive: false,
    durationSeconds: 18000,
    ...getDefaultDates(),
    questions
  };
}

// -------------------------------------------------------------
// Test 6: Matnli masalalar: Kasriga ko‘ra sonning o‘zini topish (20 ta savol)
// -------------------------------------------------------------
function wordFindWholeTest(): TestItem {
  const id = 6;
  const items: Array<{ prompt: string; answer: string; distractors: string[]; explanation: string }> = [
    { prompt: 'Nodir kitobning 1/3 qismini o‘qidi, bu 30 betni tashkil qiladi. Kitob jami necha bet?', answer: '90', distractors: ['60', '80', '100'], explanation: '30 ÷ 1/3 = 30 × 3 = 90 bet.' },
    { prompt: 'Matoning 3/5 qismi 15 metrga teng. Butun mato necha metr?', answer: '25', distractors: ['20', '30', '35'], explanation: '15 ÷ 3/5 = 15 × 5/3 = 25 metr.' },
    { prompt: 'Do‘kondagi qalamlarning 2/7 qismi 14 ta. Do‘konda jami nechta qalam bor?', answer: '49', distractors: ['42', '56', '35'], explanation: '14 ÷ 2/7 = 14 × 7/2 = 49 ta.' },
    { prompt: 'Sayyoh yo‘lning 3/4 qismini bosib o‘tdi, bu 60 km. Butun yo‘l uzunligi necha km?', answer: '80', distractors: ['75', '85', '90'], explanation: '60 ÷ 3/4 = 60 × 4/3 = 80 km.' },
    { prompt: 'Hovuzga 40 litr suv quyilgach, uning 2/5 qismi to‘ldi. Hovuz sig‘imi necha litr?', answer: '100', distractors: ['80', '120', '90'], explanation: '40 ÷ 2/5 = 40 × 5/2 = 100 litr.' },
    { prompt: 'Sinfdagi a’lochi o‘quvchilar soni 8 nafar bo‘lib, bu barcha o‘quvchilarning 1/4 qismi. Sinfda nechta o‘quvchi bor?', answer: '32', distractors: ['28', '36', '30'], explanation: '8 ÷ 1/4 = 8 × 4 = 32 nafar.' },
    { prompt: 'Avtobusdagi yo‘lovchilarning 5/8 qismi 25 kishi. Avtobusda jami nechta yo‘lovchi bor?', answer: '40', distractors: ['35', '45', '50'], explanation: '25 ÷ 5/8 = 25 × 8/5 = 40 kishi.' },
    { prompt: 'Oshxonada bir haftada 18 kg go‘sht ishlatildi. Bu oylik zaxiraning 3/10 qismi bo‘lsa, zaxirada jami necha kg go‘sht bo‘lgan?', answer: '60', distractors: ['50', '70', '80'], explanation: '18 ÷ 3/10 = 18 × 10/3 = 60 kg.' },
    { prompt: 'Daftarning 2/3 qismi yozilgan bo‘lib, bu 40 betni tashkil qiladi. Daftarda jami necha bet bor?', answer: '60', distractors: ['50', '70', '80'], explanation: '40 ÷ 2/3 = 40 × 3/2 = 60 bet.' },
    { prompt: 'Bir quti konfetning 3/5 qismi 24 ta konfet. Qutida jami nechta konfet bo‘lgan?', answer: '40', distractors: ['35', '45', '50'], explanation: '24 ÷ 3/5 = 24 × 5/3 = 40 ta.' },
    { prompt: 'Traktor maydonning 4/7 qismini haydadi, bu 28 gektar. Butun maydon necha gektar?', answer: '49', distractors: ['42', '56', '35'], explanation: '28 ÷ 4/7 = 28 × 7/4 = 49 gektar.' },
    { prompt: 'Sportchi masofaning 5/6 qismini yugurib o‘tdi, bu 15 km. Butun masofa necha km?', answer: '18', distractors: ['16', '20', '22'], explanation: '15 ÷ 5/6 = 15 × 6/5 = 18 km.' },
    { prompt: 'Do‘kondagi olmalarning 3/8 qismi 27 kg. Jami necha kg olma bor?', answer: '72', distractors: ['64', '80', '70'], explanation: '27 ÷ 3/8 = 27 × 8/3 = 72 kg.' },
    { prompt: 'O‘quvchi kunlik rejasining 2/5 qismini bajardi, bu 6 ta masala. Kunlik rejada nechta masala bor?', answer: '15', distractors: ['12', '18', '20'], explanation: '6 ÷ 2/5 = 6 × 5/2 = 15 ta masala.' },
    { prompt: 'Qopdagi unning 4/9 qismi 36 kg. Qopda jami necha kg un bo‘lgan?', answer: '81', distractors: ['72', '90', '84'], explanation: '36 ÷ 4/9 = 36 × 9/4 = 81 kg.' },
    { prompt: 'Uy devorining 3/10 qismi bo‘yaldi, bu 30 metr kvadrat. Butun devor yuzi necha kvadrat metr?', answer: '100', distractors: ['90', '110', '120'], explanation: '30 ÷ 3/10 = 30 × 10/3 = 100 kv.m.' },
    { prompt: 'Avtomobil bakidagi benzinning 2/3 qismi 30 litr. Bakning to‘liq sig‘imi necha litr?', answer: '45', distractors: ['40', '50', '60'], explanation: '30 ÷ 2/3 = 30 × 3/2 = 45 litr.' },
    { prompt: 'To‘garakka 16 ta qiz bola qatnashadi, bu jami qatnashuvchilarning 4/5 qismi. To‘garakda jami nechta o‘quvchi bor?', answer: '20', distractors: ['18', '24', '25'], explanation: '16 ÷ 4/5 = 16 × 5/4 = 20 nafar.' },
    { prompt: 'Idishdagi asalning 3/4 qismi 12 kg. Idish to‘la bo‘lsa necha kg asal sig‘adi?', answer: '16', distractors: ['15', '18', '20'], explanation: '12 ÷ 3/4 = 12 × 4/3 = 16 kg.' },
    { prompt: 'O‘quvchi daftarga 35 ta so‘z yozdi, bu matnning 5/7 qismi. Matnda jami nechta so‘z bor?', answer: '49', distractors: ['42', '56', '50'], explanation: '35 ÷ 5/7 = 35 × 7/5 = 49 ta so‘z.' }
  ];

  const questions = items.map((item, index) =>
    makeQuestion(id, index, item.prompt, item.answer, item.distractors, item.explanation)
  );

  return {
    id,
    title: 'Matnli masalalar: Kasriga ko‘ra sonning o‘zini topish',
    description: 'Qismi ma’lum bo‘lgan butun miqdorni bo‘lish orqali topish masalalari.',
    category: 'word-find-whole',
    code: 'MATN-BUTUN-06',
    isActive: false,
    durationSeconds: 18000,
    ...getDefaultDates(),
    questions
  };
}

// -------------------------------------------------------------
// Test 7: Matnli masalalar: Bo‘lish va ko‘paytirishga doir amaliy masalalar (20 ta savol)
// -------------------------------------------------------------
function wordPracticalTest(): TestItem {
  const id = 7;
  const items: Array<{ prompt: string; answer: string; distractors: string[]; explanation: string }> = [
    { prompt: 'Uzunligi 6 metr bo‘lgan arqon har biri 3/4 metrli bo‘laklarga kesildi. Nechta bo‘lak hosil bo‘ldi?', answer: '8', distractors: ['6', '7', '9'], explanation: '6 ÷ 3/4 = 6 × 4/3 = 24/3 = 8 ta bo‘lak.' },
    { prompt: 'Bitta bankaga 2/3 litr sharbat sig‘adi. 10 litr sharbatni quyish uchun nechta shunday banka kerak?', answer: '15', distractors: ['12', '14', '16'], explanation: '10 ÷ 2/3 = 10 × 3/2 = 30/2 = 15 ta banka.' },
    { prompt: '1 kg olma 8 000 so‘m turadi. 3/4 kg olma necha so‘m bo‘ladi?', answer: '6 000', distractors: ['5 000', '7 000', '6 500'], explanation: '8 000 × 3/4 = 2 000 × 3 = 6 000 so‘m.' },
    { prompt: 'Bitta ko‘ylak tikish uchun 2 1/2 metr (5/2 metr) mato ketadi. 15 metr matodan nechta ko‘ylak tiksa bo‘ladi?', answer: '6', distractors: ['5', '7', '8'], explanation: '15 ÷ (5/2) = 15 × 2/5 = 30/5 = 6 ta ko‘ylak.' },
    { prompt: 'Avtomobil 1 soatda 80 km yo‘l bosadi. U 3/4 soatda necha km yo‘l yuradi?', answer: '60', distractors: ['50', '70', '65'], explanation: '80 × 3/4 = 20 × 3 = 60 km.' },
    { prompt: 'Velosipedchi 1/2 soatda 9 km yo‘l bosdi. Uning 1 soatdagi tezligi necha km/soat?', answer: '18', distractors: ['16', '20', '15'], explanation: 'Tezlik = 9 ÷ 1/2 = 9 × 2 = 18 km/soat.' },
    { prompt: 'Har bir qutiga 1/4 kg shirinlik joylanadi. 6 kg shirinlik uchun nechta shunday quti kerak?', answer: '24', distractors: ['20', '22', '28'], explanation: '6 ÷ 1/4 = 6 × 4 = 24 ta quti.' },
    { prompt: 'Bitta shishaga 1/2 litr suv sig‘adi. 8 ta shunday shishaga jami necha litr suv sig‘adi?', answer: '4', distractors: ['3', '5', '6'], explanation: '8 × 1/2 = 4 litr.' },
    { prompt: '1 kg go‘sht 90 000 so‘m turadi. 1/3 kg go‘sht necha so‘m bo‘ladi?', answer: '30 000', distractors: ['25 000', '35 000', '40 000'], explanation: '90 000 × 1/3 = 30 000 so‘m.' },
    { prompt: 'Uzunligi 12 metr bo‘lgan taxta 2/3 metrli bo‘laklarga arralandi. Nechta bo‘lak hosil bo‘ldi?', answer: '18', distractors: ['15', '16', '20'], explanation: '12 ÷ 2/3 = 12 × 3/2 = 18 ta bo‘lak.' },
    { prompt: 'Poyezd 1/3 soatda (20 daqiqada) 25 km yo‘l bosdi. Poyezdning o‘rtacha tezligi soatiga necha km?', answer: '75', distractors: ['60', '70', '80'], explanation: 'Tezlik = 25 ÷ 1/3 = 25 × 3 = 75 km/soat.' },
    { prompt: '1 litr o‘simlik yog‘i 20 000 so‘m. 3/5 litr yog‘ necha so‘m bo‘ladi?', answer: '12 000', distractors: ['10 000', '14 000', '15 000'], explanation: '20 000 × 3/5 = 4 000 × 3 = 12 000 so‘m.' },
    { prompt: 'Oshpaz 4 kg unni har biri 1/2 kg dan bo‘lgan xaltachalarga taqsimladi. Nechta xaltacha hosil bo‘ldi?', answer: '8', distractors: ['6', '7', '10'], explanation: '4 ÷ 1/2 = 4 × 2 = 8 ta.' },
    { prompt: 'Bitta stakanga 1/5 litr sut sig‘adi. 3 litr sutni quyish uchun nechta stakan kerak bo‘ladi?', answer: '15', distractors: ['12', '14', '18'], explanation: '3 ÷ 1/5 = 3 × 5 = 15 ta stakan.' },
    { prompt: 'Avtomobil har bir kilometrga 1/10 litr yoqilg‘i sarflaydi. 80 km yo‘l uchun necha litr yoqilg‘i ketadi?', answer: '8', distractors: ['6', '7', '10'], explanation: '80 × 1/10 = 8 litr.' },
    { prompt: 'Har bir bolaga 3/4 dona shokolad berildi. 12 dona shokolad nechta bolaga yetadi?', answer: '16', distractors: ['14', '15', '18'], explanation: '12 ÷ 3/4 = 12 × 4/3 = 16 ta bola.' },
    { prompt: '1 kg pishloq 60 000 so‘m. 1 1/2 kg (3/2 kg) pishloq necha so‘m turadi?', answer: '90 000', distractors: ['80 000', '85 000', '100 000'], explanation: '60 000 × 3/2 = 30 000 × 3 = 90 000 so‘m.' },
    { prompt: 'Bitta qadami 3/5 metr bo‘lgan bola 50 qadam bosdi. U necha metr masofa yurgan?', answer: '30', distractors: ['25', '35', '40'], explanation: '50 × 3/5 = 10 × 3 = 30 metr.' },
    { prompt: 'Hovuzdagi quvurdan soatiga 1 1/2 tonna (3/2 tonna) suv oqadi. 4 soatda hovuzga necha tonna suv quyiladi?', answer: '6', distractors: ['5', '7', '8'], explanation: '4 × 3/2 = 6 tonna.' },
    { prompt: '15 metr sim har biri 1 1/4 metr (5/4 metr) bo‘lgan bo‘laklarga qirqildi. Nechta bo‘lak chiqdi?', answer: '12', distractors: ['10', '11', '14'], explanation: '15 ÷ 5/4 = 15 × 4/5 = 3 × 4 = 12 ta bo‘lak.' }
  ];

  const questions = items.map((item, index) =>
    makeQuestion(id, index, item.prompt, item.answer, item.distractors, item.explanation)
  );

  return {
    id,
    title: 'Matnli masalalar: Amaliy hayotiy hisoblar',
    description: 'Kundalik hayot, do‘kon, masofa va taqsimlashga doir kasrli masalalar.',
    category: 'word-practical',
    code: 'MATN-HAYOT-07',
    isActive: false,
    durationSeconds: 18000,
    ...getDefaultDates(),
    questions
  };
}

// -------------------------------------------------------------
// Test 8: EKUB va EKUK (Kasrlarning umumiy maxraji asosi, 20 ta savol)
// -------------------------------------------------------------
function gcdLcmTest(): TestItem {
  const id = 8;
  const pairs: Array<[number, number]> = [
    [12, 18], [8, 12], [15, 20], [24, 36], [14, 21],
    [30, 45], [16, 24], [9, 15], [10, 25], [21, 35],
    [28, 42], [6, 15], [32, 40], [27, 45], [18, 24],
    [20, 30], [12, 16], [25, 40], [15, 25], [36, 48]
  ];

  const questions = pairs.map(([left, right], index) => {
    const isLcm = index % 2 === 1;
    const g = gcd(left, right);
    const l = lcm(left, right);
    const answer = isLcm ? l : g;
    const distractors = isLcm
      ? [String(l + g), String(Math.max(1, l - g)), String(l * 2)]
      : [String(g + 1), String(g + 2), String(Math.max(1, g - 1))];
    const operation = isLcm ? 'EKUK' : 'EKUB';
    const explanation = isLcm
      ? `${left} va ${right} sonlarining EKUKi = ${l} (ikkalasiga ham bo‘linadigan eng kichik son).`
      : `${left} va ${right} sonlarining EKUBi = ${g} (ikkalasini ham bo‘ladigan eng katta son).`;

    return makeQuestion(
      id,
      index,
      `${left} va ${right} sonlarining ${operation}ini toping.`,
      String(answer),
      distractors,
      explanation
    );
  });

  return {
    id,
    title: 'EKUB va EKUK (Kasr maxraji asosi)',
    description: 'Kasrlarni umumiy maxrajga keltirish va qisqartirish uchun zarur EKUB va EKUK.',
    category: 'gcd-lcm',
    code: 'EKUB-EKUK-08',
    isActive: false,
    durationSeconds: 18000,
    ...getDefaultDates(),
    questions
  };
}

export function createInitialData(): LocalData {
  return {
    tests: [
      fractionAddSubTest(),
      fractionMulDivTest(),
      mixedNumbersTest(),
      wordFractionOfNumberTest(),
      wordRemainingTest(),
      wordFindWholeTest(),
      wordPracticalTest(),
      gcdLcmTest()
    ],
    results: []
  };
}

export function loadLocalData(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): LocalData {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      const saved = storage.getItem(key);
      if (!saved) continue;
      const parsed = JSON.parse(saved) as Partial<LocalData>;
      if (Array.isArray(parsed.tests) && Array.isArray(parsed.results)) {
        const demoDefaults = createInitialData().tests;

        // Custom tests created by admin
        const userCustomTests = parsed.tests.filter((t) => !demoDefaults.some((d) => d.id === t.id || d.code === t.code));

        const migratedTests = [
          ...demoDefaults.map((demo) => {
            // Check if admin previously configured an active schedule for this test in current version
            if (key === STORAGE_KEY) {
              const prev = parsed.tests?.find((t) => t.id === demo.id);
              if (prev && prev.isActive && prev.deadlineAt) {
                return prev;
              }
            }
            return demo;
          }),
          ...userCustomTests.map((test) => {
            const hasValidDeadline = typeof test.deadlineAt === 'string' && Number.isFinite(Date.parse(test.deadlineAt));
            const isAvail = Boolean(test.isActive && hasValidDeadline && Date.parse(test.deadlineAt!) > Date.now());
            return {
              ...test,
              isActive: isAvail,
              startsAt: test.startsAt ?? test.openedAt ?? null,
              openedAt: test.openedAt ?? null,
              deadlineAt: isAvail ? test.deadlineAt : null
            };
          })
        ];

        const migrated: LocalData = {
          tests: migratedTests,
          results: parsed.results
        };
        storage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    // Restore default if storage is corrupted
  }

  const initial = createInitialData();
  storage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

export function saveLocalData(data: LocalData, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function parseLocalData(value: string): LocalData {
  const parsed = JSON.parse(value) as Partial<LocalData>;
  if (!Array.isArray(parsed.tests) || !Array.isArray(parsed.results)) {
    throw new Error('Faylda testlar va natijalar ro‘yxati topilmadi.');
  }
  return {
    tests: parsed.tests.map((test) => {
      const hasValidDeadline = typeof test.deadlineAt === 'string' && Number.isFinite(Date.parse(test.deadlineAt));
      return {
        ...test,
        isActive: Boolean(test.isActive && hasValidDeadline),
        startsAt: test.startsAt ?? test.openedAt ?? null,
        openedAt: test.openedAt ?? null,
        deadlineAt: test.deadlineAt ?? null
      };
    }),
    results: parsed.results
  };
}
