// math.js — question generator พร้อม progressive difficulty

/**
 * @param {string} op     '+' | '-' | '*' | '/'
 * @param {number} floor  ชั้นปัจจุบัน (กำหนด range หลัก)
 * @param {number} round  จำนวนข้อที่ตอบไปแล้วในรอบนี้ (0 = ข้อแรก)
 * @returns {{ question, answer, choices, op, difficulty }}
 */
function generateQuestion(op, floor, round) {
  round = round || 0;

  // difficulty tier ตาม round (ยากขึ้นเรื่อยๆ ใน battle เดียวกัน)
  // round 0-3 = easy, 4-6 = medium, 7+ = hard
  var tier = round <= 3 ? 0 : round <= 6 ? 1 : 2;

  var a, b, answer;

  if (op === '+') {
    var maxVal = getRange(floor, tier, [20, 50, 99], [30, 70, 200]);
    a = randInt(1, maxVal);
    b = randInt(1, maxVal);
    answer = a + b;

  } else if (op === '-') {
    var maxVal = getRange(floor, tier, [20, 50, 99], [30, 70, 200]);
    a = randInt(1, maxVal);
    b = randInt(0, a);
    answer = a - b;

  } else if (op === '*') {
    // tier 0: ×1-6, tier 1: ×7-9, tier 2: ×10-12 + 2หลัก
    if (tier === 0) {
      a = randInt(2, 9); b = randInt(2, 6);
    } else if (tier === 1) {
      a = randInt(2, 12); b = randInt(2, 9);
    } else {
      a = randInt(3, 15); b = randInt(3, 12);
    }
    answer = a * b;

  } else { // '/'
    if (tier === 0) {
      b = randInt(2, 6); answer = randInt(2, 9);
    } else if (tier === 1) {
      b = randInt(2, 9); answer = randInt(2, 12);
    } else {
      b = randInt(2, 12); answer = randInt(2, 15);
    }
    a = b * answer;
  }

  var question = buildQuestion(a, b, op);
  var choices  = buildChoices(answer, op, tier);

  return { question: question, answer: answer, choices: choices, op: op, difficulty: tier };
}

// ── Helpers ──────────────────────────────────────────────────────

function getRange(floor, tier, lowFloorRanges, highFloorRanges) {
  var isHighFloor = floor > 20;
  var ranges = isHighFloor ? highFloorRanges : lowFloorRanges;
  return ranges[tier] || ranges[ranges.length - 1];
}

function buildQuestion(a, b, op) {
  var symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  return a + ' ' + symbols[op] + ' ' + b + ' = ?';
}

function buildChoices(answer, op, tier) {
  var wrongs = new Set();
  var attempts = 0;

  while (wrongs.size < 2 && attempts < 50) {
    attempts++;
    var spread = Math.max(2, Math.floor(answer * (tier === 2 ? 0.15 : 0.3)));
    var delta = randInt(1, spread);
    var wrong = Math.random() < 0.5 ? answer + delta : Math.max(0, answer - delta);

    if (op === '/') wrong = Math.max(1, Math.round(wrong));
    if (op === '-') wrong = Math.max(0, wrong);
    if (wrong !== answer) wrongs.add(wrong);
  }

  // fallback ถ้า choices ยังไม่ครบ
  if (wrongs.size < 2) {
    wrongs.add(answer + 1);
    wrongs.add(answer > 1 ? answer - 1 : answer + 2);
  }

  var choices = [answer].concat(Array.from(wrongs).slice(0, 2));

  // shuffle
  for (var i = choices.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = choices[i]; choices[i] = choices[j]; choices[j] = tmp;
  }
  return choices;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
