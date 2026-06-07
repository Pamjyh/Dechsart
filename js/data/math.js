// math.js — question generator
// ผลิตโจทย์ + ตัวเลือก 3 ข้อตาม operation และระดับความยาก

/**
 * @param {string} op  '+' | '-' | '*' | '/'
 * @param {number} floor  ชั้นปัจจุบัน (กำหนด difficulty)
 * @returns {{ question: string, answer: number, choices: number[], op: string }}
 */
function generateQuestion(op, floor) {
  let a, b, answer;

  if (op === '+') {
    const max = floor <= 10 ? 20 : 99;
    a = randInt(1, max);
    b = randInt(1, max);
    answer = a + b;
  } else if (op === '-') {
    const max = floor <= 10 ? 20 : 99;
    a = randInt(1, max);
    b = randInt(1, a);       // b <= a → ผลไม่ติดลบ
    answer = a - b;
  } else if (op === '*') {
    const maxB = floor <= 35 ? 6 : 12;
    a = randInt(2, 12);
    b = randInt(2, maxB);
    answer = a * b;
  } else if (op === '/') {
    b = randInt(2, 12);
    answer = randInt(2, 12);
    a = b * answer;           // หารลงตัวเสมอ
  }

  const question = buildQuestion(a, b, op);
  const choices  = buildChoices(answer, op);

  return { question, answer, choices, op };
}

function buildQuestion(a, b, op) {
  const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  return `${a} ${symbols[op]} ${b} = ?`;
}

function buildChoices(answer, op) {
  const wrongs = new Set();

  while (wrongs.size < 2) {
    let wrong;
    const delta = randInt(1, Math.max(3, Math.floor(answer * 0.3)));
    wrong = Math.random() < 0.5 ? answer + delta : Math.max(0, answer - delta);

    // หาร: ตัวเลือกต้องเป็น integer >=1
    if (op === '/') wrong = Math.max(1, Math.round(wrong));
    if (wrong !== answer) wrongs.add(wrong);
  }

  const choices = [answer, ...[...wrongs]];
  // shuffle
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
