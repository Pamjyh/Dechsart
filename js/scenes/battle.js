// scenes/battle.js — Core Battle Scene
// Canvas rendering + game loop + particles + touch/click input


// ── State ────────────────────────────────────────────────────────
// ใช้ var top-level เสมอ (Safari compat rule)
var state = {
  floor: 1,
  hero: null,      // active hero (ธาตุตรง)
  party: [],        // array of hero objects (max 3)
  boss: null,
  heroHP: 0, heroMaxHP: 0,
  bossHP: 0, bossMaxHP: 0,
  question: null,
  phase: 'idle',      // 'idle' | 'question' | 'feedback' | 'boss_attack' | 'victory' | 'defeat'
  questionStart: 0,
  // ── Timer snapshot (set ตอน startQuestion, ไม่ re-calc ระหว่างโจทย์) ──
  currentTimeoutMs: 5000,
  currentCritMs:    1250,
  currentFastMs:    2750,
  feedbackType: null, // 'correct_crit' | 'correct_fast' | 'correct_normal' | 'wrong' | 'timeout'
  feedbackTimer: 0,
  particles: [],
  damageNumbers: [],
  frame: 0,
  score: 0,
  combo: 0,
  saveData: null,
  opErrors: null,
  combos: [],        // active combos ใน party
  flowState: false,  // ตอบถูก 5 ติด = crit ต่อไป 3 ข้อ
  flowCount: 0,      // crit ที่เหลือจาก Flow State
  critCount: 0,      // นับ critical hits ในรอบ (สำหรับ crystal reward)
  battleRound: 0,    // จำนวนข้อที่ตอบไปแล้วในรอบนี้
  opCounts: { '+': 0, '-': 0, '*': 0, '/': 0 },
  currentOp: '+',
  // Boss Rage Phase
  rage: false,              // true เมื่อ boss HP < RAGE_THRESHOLD
  rageFlashTimer: 0,        // frame countdown สำหรับ flash effect
  // Endless Arena
  endless:           false,
  endlessFloor:      0,
  correctSinceShift: 0,   // นับตอบถูกสะสม → ทุก 3 ข้อ สลับ weak/resist
  shiftBannerTimer:  0,   // frame countdown แสดง banner "ธาตุสลับ!"
  currentWeak:       null, // element id ที่ weak ในรอบนี้ (endless เท่านั้น)
  currentResist:     null, // element id ที่ resist ในรอบนี้
  // Chain Question
  mustRetry: false,        // true = ต้องตอบโจทย์เดิมซ้ำ (ตอบผิด/timeout)
  retryQ:    null,         // { question, answer, choices, op, difficulty }
  // Boss Intro Animation
  introTimer: 0,           // countdown frames สำหรับ intro (90 = 1.5s)
  // Hint System
  hintUsed: false,         // ใช้ hint ในโจทย์นี้แล้วหรือยัง
  hintElim: null,          // ค่าตัวเลือกผิดที่ถูก eliminate โดย hint
};

var canvas, ctx;
var animId = null;
var inputAbort = null;

// ── Timer scaling helper ──────────────────────────────────────────
// คืน { timeoutMs, critMs, fastMs } ตาม floor + op
// easy ops: + -   hard ops: * /
function _getTimerMs(floor, op) {
  var tiers = CONFIG.TIMER_TIERS;
  var tier = tiers[tiers.length - 1]; // fallback = tier สุดท้าย
  for (var i = 0; i < tiers.length; i++) {
    if (floor <= tiers[i].maxFloor) { tier = tiers[i]; break; }
  }
  var isHard = (op === '*' || op === '/');
  var timeout = isHard ? tier.hardMs : tier.easyMs;
  return {
    timeoutMs: timeout,
    critMs:    Math.round(timeout * tier.critPct),
    fastMs:    Math.round(timeout * tier.fastPct),
  };
}

// ── Endless: สุ่ม weak/resist จาก element pool ────────────────────
var _ELEM_IDS = ['fire', 'water', 'thunder', 'wind'];
function _pickEndlessElements() {
  var pool = _ELEM_IDS.slice();
  // สลับ array แบบ Fisher-Yates
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return { weak: pool[0], resist: pool[1] };
}

// ── Init ─────────────────────────────────────────────────────────
function initBattle(canvasEl, floor, saveData, endless, endlessFloor) {
  floor = floor || 1;
  saveData = saveData || loadProgress();
  endless = !!endless;
  endlessFloor = endlessFloor || 0;
  canvas = canvasEl;
  ctx    = canvas.getContext('2d');
  // ลบ listener เก่าก่อน เพื่อป้องกัน resize handlers ซ้อนทับ
  window.removeEventListener('resize', resizeCanvas);
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  state.floor    = floor;
  state.endless       = endless;
  state.endlessFloor  = endlessFloor;
  state.correctSinceShift = 0;
  state.shiftBannerTimer  = 0;
  // โหลด party ทั้งหมด
  var partyIds = (saveData.party && saveData.party.length > 0) ? saveData.party : ['devasri'];
  state.party = partyIds.map(function(id) { return HEROES[id] || STARTER_HERO; });
  state.hero  = state.party[0]; // default active hero

  if (endless) {
    state.boss    = getBossForEndless(endlessFloor);
    state.bossHP  = state.bossMaxHP = getBossHPEndless(endlessFloor);
    var shifted   = _pickEndlessElements();
    state.currentWeak   = shifted.weak;
    state.currentResist = shifted.resist;
  } else {
    state.boss    = getBossForFloor(floor);
    state.bossHP  = state.bossMaxHP = getBossHP(floor);
    state.currentWeak   = null;
    state.currentResist = null;
  }

  state.heroHP   = state.heroMaxHP = CONFIG.HP.HERO_BASE + (state.hero.hpBonus || 0);
  state.phase    = 'intro'; // intro → แสดง boss showcase ก่อนข้อแรก
  state.particles  = [];
  state.damageNumbers = [];
  state.frame    = 0;
  state.score    = 0;
  state.combo    = 0;
  state.saveData = saveData;
  state.opErrors = saveData.opErrors || { '+':0, '-':0, '*':0, '/':0 };
  state.currentOp = '+';
  state.combos    = detectCombos(state.party);
  state.flowState = false;
  state.flowCount = 0;
  state.critCount = 0;
  state.battleRound = 0;
  state.rage = false;
  state.rageFlashTimer = 0;
  state.mustRetry  = false;
  state.retryQ     = null;
  state.introTimer = CONFIG.GAME.INTRO_FRAMES;
  state.hintUsed   = false;
  state.hintElim   = null;
  // รีเซ็ต end-screen flag เสมอ เพื่อป้องกัน handler ค้างจาก session ก่อน
  canvas._endHandled = false;
  canvas._endTouched = false;

  if (inputAbort) inputAbort.abort();
  inputAbort = new AbortController();
  const sig = inputAbort.signal;
  canvas.addEventListener('click',     onInput, { signal: sig });
  canvas.addEventListener('touchstart', onTouch, { passive: false, signal: sig });

  if (animId) cancelAnimationFrame(animId);
  loop();
  // playStart ตอนต้น intro — startQuestion จัดการโดย update() ผ่าน introTimer
  setTimeout(function() { playStart(); }, 300);
}

function resizeCanvas() {
  if (!canvas) return;
  var W = CONFIG.CANVAS.BASE_WIDTH;
  var H = CONFIG.CANVAS.BASE_HEIGHT;
  var vw = window.visualViewport ? window.visualViewport.width  : window.innerWidth;
  var vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  var scale = Math.min(vw / W, vh / H);
  // เปลี่ยนแค่ CSS style — ห้าม set canvas.width/height เพราะ reset ctx ทิ้งทั้งหมด
  canvas.style.width  = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
}

// ── Game Loop ────────────────────────────────────────────────────
function loop() {
  state.frame++;
  update();
  render();
  animId = requestAnimationFrame(loop);
}

function update() {
  // Boss Intro countdown
  if (state.phase === 'intro') {
    state.introTimer--;
    if (state.introTimer <= 0) startQuestion();
    return; // ยังไม่เริ่ม game loop จริง
  }

  // timer
  if (state.phase === 'question') {
    const elapsed = performance.now() - state.questionStart;
    if (elapsed >= state.currentTimeoutMs) {
      onTimeout();
    }
  }

  // feedback timer
  if (state.phase === 'feedback' || state.phase === 'boss_attack') {
    state.feedbackTimer--;
    if (state.feedbackTimer <= 0) {
      if (state.phase === 'boss_attack') {
        if (state.heroHP <= 0) { state.phase = 'defeat'; playHeroDie(); return; }
        startQuestion();
      } else {
        startQuestion();
      }
    }
  }

  // particles
  state.particles = state.particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
    return p.life > 0;
  });

  // damage numbers (ใช้ vy แต่ละตัว)
  state.damageNumbers = state.damageNumbers.filter(function(d) {
    d.y += d.vy; d.vy *= 0.92; d.life--; return d.life > 0;
  });

  // Endless shift banner countdown
  if (state.shiftBannerTimer > 0) state.shiftBannerTimer--;

  // Rage flash countdown
  if (state.rageFlashTimer > 0) state.rageFlashTimer--;
}

// ── Questions ────────────────────────────────────────────────────
function startQuestion() {
  if (state.phase === 'victory' || state.phase === 'defeat') return;

  // ── ตรวจ Boss Rage Phase ──────────────────────────────────────
  var wasRage = state.rage;
  state.rage = (state.bossHP / state.bossMaxHP) < CONFIG.DAMAGE.RAGE_THRESHOLD;
  if (state.rage && !wasRage) {
    // เพิ่งเข้า rage — flash ครั้งแรก
    state.rageFlashTimer = 45;
    spawnParticles(canvas.width * 0.5, canvas.height * 0.20, 18, '#FF2222', 'circle');
  }

  // Chain Question: ถ้าตอบผิดครั้งก่อน ใช้โจทย์เดิมซ้ำ
  if (state.mustRetry && state.retryQ) {
    state.currentOp = state.retryQ.op;
    state.question  = state.retryQ;
    // hint ยังคงใช้ได้กับโจทย์เดิม (ไม่ reset)
  } else {
    // สลับ op ตาม boss weak/resist เพื่อบังคับ variety
    state.currentOp = pickOp();
    state.question  = generateQuestion(state.currentOp, state.floor, state.battleRound, state.opErrors);
    // โจทย์ใหม่ → reset hint
    state.hintUsed = false;
    state.hintElim = null;
  }
  state.questionStart = performance.now();
  // snapshot timer values ณ ตอนนี้ — ไม่ re-calc ระหว่างโจทย์ (QA req)
  var t = _getTimerMs(state.floor, state.currentOp);
  state.currentTimeoutMs = t.timeoutMs;
  state.currentCritMs    = t.critMs;
  state.currentFastMs    = t.fastMs;
  // Rage: timer สั้นลง 20%
  if (state.rage) {
    state.currentTimeoutMs = Math.round(state.currentTimeoutMs * CONFIG.DAMAGE.RAGE_TIMER_MULT);
    state.currentCritMs    = Math.round(state.currentCritMs    * CONFIG.DAMAGE.RAGE_TIMER_MULT);
    state.currentFastMs    = Math.round(state.currentFastMs    * CONFIG.DAMAGE.RAGE_TIMER_MULT);
  }
  state.phase = 'question';
}

function getAvailableOps(floor) {
  if (floor <= 10)  return ['+', '-'];
  if (floor <= 20)  return ['+', '-'];
  if (floor <= 35)  return ['+', '-', '*'];
  if (floor <= 50)  return ['+', '-', '*', '/'];
  return ['+', '-', '*', '/'];
}

function pickOp() {
  var ops = getAvailableOps(state.floor);
  var errors = state.opErrors || {};

  // Weight: base 2 + accumulated errors (errors ยิ่งเยอะ ยิ่งถูกเลือกบ่อย)
  var weights = ops.map(function(op) { return 2 + (errors[op] || 0); });
  var total = weights.reduce(function(a, b) { return a + b; }, 0);
  var rand = Math.random() * total;
  var cum = 0;
  for (var i = 0; i < ops.length; i++) {
    cum += weights[i];
    if (rand <= cum) return ops[i];
  }
  return ops[0];
}

// ── Input ────────────────────────────────────────────────────────
function onTouch(e) {
  e.preventDefault();
  resumeAudio();
  const t = e.touches[0];
  handleTap(t.clientX, t.clientY);
}

function onInput(e) {
  resumeAudio();
  handleTap(e.clientX, e.clientY);
}

function handleTap(clientX, clientY) {
  var rect  = canvas.getBoundingClientRect();
  var scaleX = CONFIG.CANVAS.BASE_WIDTH  / rect.width;
  var scaleY = CONFIG.CANVAS.BASE_HEIGHT / rect.height;
  var x = (clientX - rect.left) * scaleX;
  var y = (clientY - rect.top)  * scaleY;

  // Boss Intro: tap ใดๆ ก็ข้ามได้
  if (state.phase === 'intro') {
    startQuestion();
    return;
  }

  // ปุ่มกลับหอ (top-left) — ทำงานทุก phase ยกเว้น end screen
  if (state.phase !== 'victory' && state.phase !== 'defeat') {
    if (x >= 6 && x <= 58 && y >= 6 && y <= 34) {
      if (inputAbort) inputAbort.abort();
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
      // บันทึก progress รวม correctAnswers ที่ตอบไปแล้วในรอบนี้
      if (state.saveData) saveProgress(state.saveData);
      SCENE.switch('tower', canvas);
      return;
    }
  }

  if (state.phase !== 'question') return;

  // Hint button (right of answer buttons, aligned with btn 0)
  var W = CONFIG.CANVAS.BASE_WIDTH, H = CONFIG.CANVAS.BASE_HEIGHT;
  var hBtnX = W - 42, hBtnY = H * 0.50, hBtnW = 38, hBtnH = 44;
  if (!state.hintUsed && x >= hBtnX && x <= hBtnX + hBtnW && y >= hBtnY && y <= hBtnY + hBtnH) {
    onHintTapped();
    return;
  }

  var btnRegions = getAnswerRegions();
  for (var i = 0; i < btnRegions.length; i++) {
    var r = btnRegions[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      onAnswerSelected(state.question.choices[i]);
      return;
    }
  }
}


// ── Combo Detection ───────────────────────────────────────────────
function detectCombos(party) {
  var elements = party.map(function(h) { return h.element; });
  var combos = [];
  var hasF = elements.includes('fire'),   hasW = elements.includes('water');
  var hasT = elements.includes('thunder'),hasV = elements.includes('wind');
  var hasM = elements.includes('mixed');

  if (hasF && hasW)               combos.push('balance');     // Balance Strike
  if (hasT && hasV)               combos.push('inverse');     // Inverse Blast
  if ((hasF&&hasW&&hasT&&hasV)||hasM) combos.push('storm');   // Elemental Storm
  return combos;
}

function getComboMultiplier(combos, elem) {
  var mult = 1;
  if (!elem) return mult;
  if (combos.includes('balance') && (elem.id==='fire'||elem.id==='water'))  mult *= 1.3;
  if (combos.includes('inverse') && (elem.id==='thunder'||elem.id==='wind')) mult *= 2.5;
  return mult;
}

function onAnswerSelected(chosen) {
  // Hint: ตัวเลือกที่ถูก eliminate → ไม่ตอบสนอง
  if (state.hintElim !== null && chosen === state.hintElim) return;
  state.lastChosen = chosen;
  const elapsed = performance.now() - state.questionStart;
  const correct = chosen === state.question.answer;

  if (correct) {
    let mult, type;
    var speedMult = 1 + (state.hero.speedBonus || 0);
    var critMs = state.currentCritMs * speedMult;
    var fastMs = state.currentFastMs * speedMult;
    if (elapsed < critMs) {
      mult = (CONFIG.DAMAGE.HERO_BASE + (state.hero.dmgBonus || 0)) * CONFIG.SPEED.MULTIPLIER_CRIT;
      type = 'correct_crit'; playCritical();
    } else if (elapsed < fastMs) {
      mult = (CONFIG.DAMAGE.HERO_BASE + (state.hero.dmgBonus || 0)) * CONFIG.SPEED.MULTIPLIER_FAST;
      type = 'correct_fast'; playFastHit();
    } else {
      mult = (CONFIG.DAMAGE.HERO_BASE + (state.hero.dmgBonus || 0)) * CONFIG.SPEED.MULTIPLIER_NORMAL;
      type = 'correct_normal'; playHit();
    }

    // Weak/Resist
    const elem = CONFIG.ELEMENTS[Object.keys(CONFIG.ELEMENTS).find(k =>
      CONFIG.ELEMENTS[k].op === state.currentOp
    )];
    if (elem) {
      // Endless: ใช้ currentWeak/currentResist (สลับได้); ปกติ: ใช้ boss.weak/resist
      var weakId   = state.endless ? state.currentWeak   : state.boss.weak;
      var resistId = state.endless ? state.currentResist : state.boss.resist;
      if (weakId   && elem.id === weakId)   mult *= CONFIG.DAMAGE.WEAK_MULTIPLIER;
      if (resistId && elem.id === resistId) mult *= CONFIG.DAMAGE.RESIST_MULTIPLIER;
    }

    const dmg = Math.round(mult);
    state.bossHP  = Math.max(0, state.bossHP - dmg);
    state.score  += dmg;
    state.combo++;
    state.battleRound++;
    // Chain: ตอบถูกแล้ว → เคลียร์ retry
    state.mustRetry = false;
    state.retryQ    = null;

    // Endless: นับตอบถูก → ทุก 3 ข้อสลับ weak/resist
    if (state.endless) {
      state.correctSinceShift++;
      if (state.correctSinceShift >= 3) {
        state.correctSinceShift = 0;
        var shifted = _pickEndlessElements();
        state.currentWeak   = shifted.weak;
        state.currentResist = shifted.resist;
        state.shiftBannerTimer = 90; // ~1.5 วินาที ที่ 60fps
      }
    }

    // Flow State trigger (5 ติด)
    if (state.combo > 0 && state.combo % 5 === 0 && state.flowCount === 0) {
      state.flowCount = 3;
      state.flowState = true;
    }

    // Elemental Storm: ถ้า combo includes storm → bonus particles
    if (state.combos.includes('storm') && state.combo > 0 && state.combo % 3 === 0) {
      spawnParticles(W * 0.5, H * 0.3, 20, '#FFD700');
    }

    spawnParticles(
      canvas.width * 0.72, canvas.height * 0.3,
      type === 'correct_crit' ? CONFIG.PARTICLES.CRIT_COUNT : CONFIG.PARTICLES.HIT_COUNT,
      type === 'correct_crit' ? '#FFD700' : '#FF6B35'
    );
    spawnDamageNumber(canvas.width * 0.72, canvas.height * 0.25, dmg,
      type === 'correct_crit' ? '#FFD700' : '#FFF');

    // Daily quest: นับตอบถูก
    if (state.saveData) state.saveData = onCorrectAnswer(state.saveData);

    state.feedbackType  = type;
    state.feedbackTimer = type === 'correct_crit' ? 55 : 40;
    state.phase = 'feedback';

    if (state.bossHP <= 0) {
      state.phase = 'victory';
      playBossDie();
      spawnParticles(canvas.width / 2, canvas.height / 2, 50, '#FFD700');
      return;
    }

  } else {
    state.combo = 0;
    // Chain: ตอบผิด → บังคับโจทย์เดิมรอบถัดไป
    state.mustRetry = true;
    state.retryQ    = state.question;
    // Adaptive: บันทึก error ของ op นี้
    if (state.opErrors && state.currentOp) {
      state.opErrors[state.currentOp] = (state.opErrors[state.currentOp] || 0) + 1;
      if (state.saveData) {
        state.saveData.opErrors = state.opErrors;
        // daily.wrongAnswers (สำหรับ teacher dashboard)
        if (state.saveData.daily) {
          state.saveData.daily.wrongAnswers = (state.saveData.daily.wrongAnswers || 0) + 1;
        }
      }
    }
    var dmg = state.rage
      ? Math.round(CONFIG.DAMAGE.BOSS_BASE * CONFIG.DAMAGE.RAGE_DMG_MULT)
      : CONFIG.DAMAGE.BOSS_BASE;
    state.heroHP = Math.max(0, state.heroHP - dmg);
    playWrong();
    spawnParticles(canvas.width * 0.28, canvas.height * 0.65, 8, '#FF4444');
    spawnDamageNumber(canvas.width * 0.28, canvas.height * 0.6, dmg, '#FF4444');

    state.feedbackType  = 'wrong';
    state.feedbackTimer = 45;
    state.phase = 'boss_attack';

    if (state.heroHP <= 0) {
      state.phase = 'defeat';
      playHeroDie();
    }
  }
}

function onTimeout() {
  state.combo = 0;
  // Chain: หมดเวลา → บังคับโจทย์เดิมรอบถัดไป
  state.mustRetry = true;
  state.retryQ    = state.question;
  var dmg = state.rage
    ? Math.round(CONFIG.DAMAGE.BOSS_BASE * CONFIG.DAMAGE.RAGE_DMG_MULT)
    : CONFIG.DAMAGE.BOSS_BASE;
  state.heroHP = Math.max(0, state.heroHP - dmg);
  playTimeout();
  spawnParticles(canvas.width * 0.28, canvas.height * 0.65, 6, '#888');
  spawnDamageNumber(canvas.width * 0.28, canvas.height * 0.6, dmg, '#AAA');

  state.feedbackType  = 'timeout';
  state.feedbackTimer = 45;
  state.phase = 'boss_attack';

  if (state.heroHP <= 0) {
    state.phase = 'defeat';
    playHeroDie();
  }
}

// ── Particles (cartoon style) ────────────────────────────────────
// shape: 'star' | 'circle' | 'ring'
function spawnParticles(x, y, count, color, shape) {
  shape = shape || 'star';
  for (var i = 0; i < count; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = CONFIG.PARTICLES.SPEED_BASE * (0.6 + Math.random() * 1.2);
    var lifeBase = Math.floor(CONFIG.PARTICLES.LIFESPAN_MS / 16);
    state.particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      life: Math.floor(lifeBase * (0.5 + Math.random() * 0.8)),
      maxLife: lifeBase,
      color: color,
      size: 4 + Math.random() * 6,
      shape: i % 3 === 0 ? 'circle' : shape,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3,
    });
  }
}

// วาด star shape
function drawStar(ctx, x, y, r, points, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,' + (alpha * 0.4) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (var i = 0; i < points * 2; i++) {
    var radius = i % 2 === 0 ? r : r * 0.45;
    var a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    else ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

function spawnDamageNumber(x, y, value, color) {
  state.damageNumbers.push({
    x: x, y: y, value: value, color: color,
    life: 55, maxLife: 55,
    scale: 0.3,   // เริ่มเล็ก → เด้งขึ้นใหญ่
    vy: -2.5,
  });
}

// ── Layout helpers ───────────────────────────────────────────────
// Layout zones (H=700):
//   Boss HP:      y=35
//   Boss sprite:  cy=H*0.20=140
//   Element hint: y=H*0.38=266
//   Timer bar:    y=H*0.41=287
//   Question box: y=H*0.44=308, h=50
//   Answer btns:  y=H*0.52=364  (ห่างจาก heroes ชัดเจน)
//   Heroes:       cy=H*0.79=553
//   Hero HP:      y=H-38=662
function getAnswerRegions() {
  var W = canvas.width, H = canvas.height;
  var btnW = W * 0.78, btnH = 44;
  var startX = (W - btnW) / 2;
  var startY = H * 0.50;
  return [0, 1, 2].map(function(i) {
    return { x: startX, y: startY + i * (btnH + 8), w: btnW, h: btnH };
  });
}

// ── Render ───────────────────────────────────────────────────────
function render() {
  const W = canvas.width, H = canvas.height;

  // Background
  var battleBg = ASSETS && ASSETS.bg && ASSETS.bg.battle;
  if (imgReady(battleBg)) {
    ctx.drawImage(battleBg, 0, 0, W, H);
    // overlay เพื่อให้ UI อ่านง่าย
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
  } else {
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, CONFIG.COLORS.BG_TOP);
    bg.addColorStop(1, CONFIG.COLORS.BG_BOTTOM);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // Stars
  drawStars(W, H);

  // ── Boss Intro — แสดงแล้ว return ก่อนวาด UI ─────────────────────
  if (state.phase === 'intro') {
    drawIntro(W, H);
    return;
  }

  // ปุ่มกลับ (top-left) — แสดงเฉพาะตอนอยู่ในเกม ไม่ใช่ end screen
  if (state.phase !== 'victory' && state.phase !== 'defeat') {
    ctx.fillStyle = 'rgba(40,20,80,0.75)';
    roundRect(ctx, 6, 6, 52, 28, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(150,100,255,0.6)'; ctx.lineWidth = 1;
    roundRect(ctx, 6, 6, 52, 28, 7); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = '#DDD'; ctx.font = 'bold 11px sans-serif';
    drawIconLabel(ctx, '⬅', 'หอ', 32, 24, 14);
  }

  // Floor label
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  var tierLabel = state.battleRound <= 3 ? '' : state.battleRound <= 6 ? ' 🔥' : ' 💥';
  var floorLabel = state.endless
    ? ('⚔ อนันต์ ' + (state.endlessFloor + 1) + '  ข้อที่ ' + (state.battleRound+1) + tierLabel)
    : ('ชั้น ' + state.floor + '  ข้อที่ ' + (state.battleRound+1) + tierLabel);
  ctx.fillText(floorLabel, 66, 22);

  // Score + Combo
  ctx.textAlign = 'right';
  ctx.fillText(`คะแนน: ${state.score}`, W - 14, 22);
  if (state.combo >= 3) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`🔥 Combo ×${state.combo}`, W - 14, 38);
  }

  // Boss HP bar (top)
  drawHPBar(W * 0.08, 35, W * 0.84, 14, state.bossHP, state.bossMaxHP, CONFIG.COLORS.HP_BOSS, 'บอส');

  // Boss sprite — ย้ายขึ้นมา H*0.20
  if (state.rage) {
    // Rage: กระพริบสีแดงรอบ boss
    var ragePulse = Math.sin(state.frame * 0.25) * 0.5 + 0.5; // 0-1
    ctx.shadowColor = '#FF2222';
    ctx.shadowBlur  = 15 + ragePulse * 20;
  }
  state.boss.draw(ctx, W * 0.5, H * 0.20, 80, state.frame);
  ctx.shadowBlur = 0;

  // Element indicator (op ปัจจุบัน)
  if (state.currentOp) {
    var curElem = Object.values(CONFIG.ELEMENTS).find(function(e) { return e.op === state.currentOp; });
    if (curElem) {
      ctx.fillStyle = curElem.color + 'CC';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(curElem.label + ' operation', W / 2, H * 0.38);
    }
  }

  // Timer bar — y=H*0.41
  if (state.phase === 'question') {
    var elapsed  = performance.now() - state.questionStart;
    var pct      = Math.max(0, 1 - elapsed / state.currentTimeoutMs);
    var barW     = W * 0.84;
    var barX     = W * 0.08;
    var barY     = H * 0.41;

    ctx.fillStyle = '#1a1a3a';
    roundRect(ctx, barX, barY, barW, 8, 4);
    ctx.fill();

    var barColor = pct > 0.5 ? CONFIG.COLORS.TIMER_BAR
                 : pct > 0.25 ? '#FF9900' : '#FF4444';
    ctx.fillStyle = barColor;
    roundRect(ctx, barX, barY, barW * pct, 8, 4);
    ctx.fill();

    // Speed hint — ใช้ snapshot threshold (ตรง dynamic tier)
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = elapsed < state.currentCritMs ? '#FFD700'
                  : elapsed < state.currentFastMs ? '#FF9900'
                  : 'rgba(255,255,255,0.4)';
    ctx.fillText(
      elapsed < state.currentCritMs ? '⚡ Critical zone!' :
      elapsed < state.currentFastMs ? '🔥 Fast zone'      : '💤',
      W / 2, barY - 5
    );
  }

  // Chain Question indicator — แสดงเมื่อต้องตอบโจทย์เดิมซ้ำ
  if (state.mustRetry && state.phase === 'question') {
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF9900';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeText('🔄 ตอบใหม่!', W / 2, H * 0.42);
    ctx.fillText('🔄 ตอบใหม่!', W / 2, H * 0.42);
    ctx.lineWidth = 1;
  }

  // Hint button — right of first answer button, phase question เท่านั้น
  if (state.phase === 'question') {
    var hBtnX = W - 42, hBtnY = H * 0.50;
    var crystals = (state.saveData && state.saveData.crystals) || 0;
    var canHint = !state.hintUsed && crystals >= CONFIG.GAME.HINT_CRYSTAL_COST;
    // background
    ctx.fillStyle = canHint ? 'rgba(255,210,0,0.92)' : 'rgba(60,60,60,0.7)';
    roundRect(ctx, hBtnX, hBtnY, 38, 44, 8); ctx.fill();
    ctx.strokeStyle = canHint ? '#FFD700' : '#555'; ctx.lineWidth = 1.5;
    roundRect(ctx, hBtnX, hBtnY, 38, 44, 8); ctx.stroke(); ctx.lineWidth = 1;
    // icon
    ctx.font = '19px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = canHint ? 1 : 0.4;
    ctx.fillText('💡', hBtnX + 19, hBtnY + 22);
    // crystal cost label
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = canHint ? '#333' : '#888';
    ctx.fillText('💎' + CONFIG.GAME.HINT_CRYSTAL_COST, hBtnX + 19, hBtnY + 38);
    ctx.globalAlpha = 1;
  }

  // Question box — y=H*0.44
  if (state.phase === 'question' || state.phase === 'feedback' || state.phase === 'boss_attack') {
    drawQuestionBox(W, H);
    drawAnswerButtons(W, H);
  }

  // Heroes — ย้ายลงมา H*0.79 (ใต้ answer buttons ชัดเจน)
  var partySize = state.party.length;
  state.party.forEach(function(h, i) {
    var hx = W * (0.5 + (i - (partySize-1)/2) * 0.30);
    var hy = H * 0.81;
    var isActive = (h === state.hero);
    var heroSize = isActive ? 52 : 38;
    if (isActive) {
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
    }
    h.draw(ctx, hx, hy, heroSize, state.frame);
    ctx.shadowBlur = 0;
    ctx.fillStyle = isActive ? '#FFD700' : 'rgba(255,255,255,0.4)';
    ctx.font = (isActive ? 'bold ' : '') + '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(h.name, hx, hy + heroSize + 8);
  });
  ctx.textAlign = 'left';

  // Hero HP bar — y=H-38
  drawHPBar(W * 0.08, H - 38, W * 0.84, 14, state.heroHP, state.heroMaxHP, CONFIG.COLORS.HP_HERO, 'ฮีโร่');

  // Feedback overlay
  if (state.phase === 'feedback') {
    drawFeedback(W, H, true);
  } else if (state.phase === 'boss_attack') {
    drawFeedback(W, H, false);
  }

  // Particles (cartoon stars + circles)
  state.particles.forEach(function(p) {
    var alpha = p.life / p.maxLife;
    p.rotation += p.spin;
    if (p.shape === 'star') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      drawStar(ctx, 0, 0, p.size, 4, p.color, alpha);
      ctx.restore();
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = 'rgba(0,0,0,' + (alpha * 0.3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
  });
  ctx.globalAlpha = 1;

  // Damage numbers (cartoon pop + bounce)
  state.damageNumbers.forEach(function(d) {
    var t = 1 - d.life / d.maxLife; // 0→1
    // เด้ง: scale เพิ่มเร็ว แล้วค่อยหด
    var sc = t < 0.25 ? (t / 0.25) * 1.3
           : t < 0.4  ? 1.3 - (t - 0.25) / 0.15 * 0.3
           : 1.0;
    var alpha = d.life < 20 ? d.life / 20 : 1;
    var isBig = d.value > 30;
    var fontSize = (isBig ? 32 : 24) * sc;
    var txt = isBig ? d.value + '!' : String(d.value);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold ' + Math.round(fontSize) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // ขอบดำหนา (cartoon outline)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(3, fontSize * 0.18);
    ctx.strokeText(txt, d.x, d.y);
    ctx.fillStyle = d.color;
    ctx.fillText(txt, d.x, d.y);
    ctx.restore();
  });
  ctx.lineWidth = 1;

  // Rage: แสดง RAGE! banner ตอนเพิ่งเข้า rage + indicator ถาวร
  if (state.rageFlashTimer > 0) {
    var rfAlpha = state.rageFlashTimer > 30 ? 1 : state.rageFlashTimer / 30;
    ctx.globalAlpha = rfAlpha;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
    ctx.strokeText('💢 RAGE!', W / 2, H * 0.14);
    ctx.fillStyle = '#FF3333';
    ctx.fillText('💢 RAGE!', W / 2, H * 0.14);
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  } else if (state.rage && state.phase !== 'victory' && state.phase !== 'defeat') {
    // indicator เล็กๆ ถาวรตลอดช่วง rage
    ctx.globalAlpha = 0.75 + Math.sin(state.frame * 0.15) * 0.25;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FF4444';
    ctx.fillText('💢 RAGE', 66, 38);
    ctx.globalAlpha = 1;
  }

  // Impact flash (cartoon crit effect)
  if (state.phase === 'feedback' && state.feedbackType === 'correct_crit' && state.feedbackTimer > 45) {
    var flashAlpha = (state.feedbackTimer - 45) / 10 * 0.45;
    ctx.fillStyle = 'rgba(255,240,100,' + flashAlpha + ')';
    ctx.fillRect(0, 0, W, H);
  }

  // Endless: แสดง weak/resist ปัจจุบัน
  if (state.endless && state.currentWeak) {
    ctx.textAlign = 'right';
    ctx.font = '11px sans-serif';
    // หา label ของ weak/resist
    var wElem = Object.values(CONFIG.ELEMENTS).find(function(e){ return e.id === state.currentWeak; });
    var rElem = Object.values(CONFIG.ELEMENTS).find(function(e){ return e.id === state.currentResist; });
    if (wElem) { ctx.fillStyle = '#aaffaa'; ctx.fillText('💚 ' + wElem.label, W - 8, H * 0.08); }
    if (rElem) { ctx.fillStyle = '#ffaaaa'; ctx.fillText('❤ ' + rElem.label, W - 8, H * 0.08 + 15); }
    ctx.textAlign = 'left';
  }

  // Endless: Shift banner "⚡ ธาตุสลับ!"
  if (state.shiftBannerTimer > 0) {
    var bAlpha = state.shiftBannerTimer > 70 ? 1
               : state.shiftBannerTimer / 70;
    ctx.globalAlpha = bAlpha;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    ctx.strokeText('⚡ ธาตุสลับ!', W / 2, H * 0.70);
    ctx.fillStyle = '#FFE135';
    ctx.fillText('⚡ ธาตุสลับ!', W / 2, H * 0.70);
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  // Victory / Defeat
  if (state.phase === 'victory')  drawEndScreen(W, H, true);
  if (state.phase === 'defeat')   drawEndScreen(W, H, false);
}

// ── Boss Intro Animation ──────────────────────────────────────────
function drawIntro(W, H) {
  // fade in/out ตาม introTimer (90→0)
  var alpha;
  if (state.introTimer > 75)      alpha = (CONFIG.GAME.INTRO_FRAMES - state.introTimer) / 15;
  else if (state.introTimer > 15) alpha = 1;
  else                             alpha = state.introTimer / 15;

  // overlay มืดลงเล็กน้อย
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = alpha;

  // Boss sprite — ใหญ่กว่าปกติ (110 vs 80) + bounce เล็กน้อย
  var bounce = Math.sin(state.frame * 0.12) * 5;
  if (state.boss && state.boss.draw) {
    state.boss.draw(ctx, W * 0.5, H * 0.30 + bounce, 110, state.frame);
  }

  // Boss name — พร้อม outline สี
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
  ctx.strokeText(state.boss.name || 'Boss', W / 2, H * 0.55);
  ctx.fillStyle = '#FFD700';
  ctx.fillText(state.boss.name || 'Boss', W / 2, H * 0.55);
  ctx.lineWidth = 1;

  // Element badge
  var bossElem = Object.values(CONFIG.ELEMENTS).find(function(e) {
    return e.id === state.boss.element;
  });
  if (bossElem) {
    ctx.font = 'bold 17px sans-serif';
    ctx.fillStyle = bossElem.color;
    ctx.fillText(bossElem.label, W / 2, H * 0.62);
  }

  // Floor / Endless label
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  var introFloor = state.endless
    ? ('⚔ อนันต์ ' + (state.endlessFloor + 1))
    : ('ชั้น ' + state.floor);
  ctx.fillText(introFloor, W / 2, H * 0.68);

  // "tap เพื่อเริ่ม" prompt — กระพริบ
  if (state.introTimer < 60) {
    var blink = Math.sin(state.frame * 0.18) * 0.5 + 0.5;
    ctx.globalAlpha = alpha * blink;
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('แตะเพื่อเริ่ม', W / 2, H * 0.76);
  }

  ctx.globalAlpha = 1;
}

// ── Hint System ───────────────────────────────────────────────────
function onHintTapped() {
  if (!state.question || state.hintUsed) return;
  var cost = CONFIG.GAME.HINT_CRYSTAL_COST;
  if ((state.saveData.crystals || 0) < cost) return; // ไม่มี crystal พอ

  state.saveData.crystals -= cost;
  state.hintUsed = true;

  // เลือก wrong answer แบบสุ่มมา 1 ตัว
  var wrongs = state.question.choices.filter(function(c) {
    return c !== state.question.answer;
  });
  state.hintElim = wrongs[Math.floor(Math.random() * wrongs.length)];

  saveProgress(state.saveData);
}

// ── Draw helpers ─────────────────────────────────────────────────
function drawStars(W, H) {
  // deterministic stars ตาม seed
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 40; i++) {
    const x = ((i * 137.5) % W);
    const y = ((i * 97.3)  % (H * 0.55));
    const r = (i % 3 === 0) ? 1.5 : 1;
    const twinkle = Math.sin(state.frame * 0.03 + i) * 0.3 + 0.7;
    ctx.globalAlpha = twinkle * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHPBar(x, y, w, h, hp, maxHp, color, label) {
  var pct = hp / maxHp;
  var r = h / 2;

  // ขอบดำ (cartoon outline)
  ctx.fillStyle = '#111';
  roundRect(ctx, x - 2, y - 2, w + 4, h + 4, r + 2); ctx.fill();

  // พื้น bar
  ctx.fillStyle = '#2a1a2a';
  roundRect(ctx, x, y, w, h, r); ctx.fill();

  // fill gradient
  if (pct > 0) {
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, lightenColor(color, 40));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, w * pct, h, r); ctx.fill();

    // shine บน bar
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, x + 1, y + 1, w * pct - 2, h * 0.4, r); ctx.fill();
  }

  // ขอบใน (cartoon border)
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, r); ctx.stroke();
  ctx.lineWidth = 1;

  // label + numbers
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.strokeText(label + ' ' + hp + '/' + maxHp, x + 6, y + h - 2);
  ctx.fillText(label + ' ' + hp + '/' + maxHp, x + 6, y + h - 2);
  ctx.lineWidth = 1;
}

// helper: lighten hex color
function lightenColor(hex, amount) {
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  r = Math.min(255, r + amount); g = Math.min(255, g + amount); b = Math.min(255, b + amount);
  return '#' + [r,g,b].map(function(v){ return ('0'+v.toString(16)).slice(-2); }).join('');
}

function drawQuestionBox(W, H) {
  var q = state.question;
  if (!q) return;

  // box — y=H*0.44, h=52
  var bx = W * 0.08, by = H * 0.44, bw = W * 0.84, bh = 52;
  ctx.fillStyle = 'rgba(20, 10, 50, 0.88)';
  roundRect(ctx, bx, by, bw, bh, 12);
  ctx.fill();

  ctx.strokeStyle = 'rgba(120, 90, 220, 0.7)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, bw, bh, 12);
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.fillStyle = CONFIG.COLORS.TEXT_MAIN;
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(q.question, W / 2, by + 36);
}

function drawAnswerButtons(W, H) {
  const q = state.question;
  if (!q) return;

  const regions = getAnswerRegions();
  regions.forEach((r, i) => {
    const val = q.choices[i];
    var isEliminated = (state.hintElim !== null && val === state.hintElim);
    let bgColor = CONFIG.COLORS.ANSWER_BTN;

    // feedback highlight
    if (state.phase === 'feedback' && val === q.answer)
      bgColor = CONFIG.COLORS.ANSWER_CORRECT;
    if (state.phase === 'boss_attack' && state.feedbackType !== 'timeout' && val !== q.answer && state.lastChosen === val)
      bgColor = CONFIG.COLORS.ANSWER_WRONG;

    // ขอบดำ cartoon
    ctx.fillStyle = '#111';
    roundRect(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 13);
    ctx.fill();

    // bg gradient
    var btnGr = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    if (isEliminated) {
      btnGr.addColorStop(0, '#444'); btnGr.addColorStop(1, '#2a2a2a');
    } else if (bgColor === CONFIG.COLORS.ANSWER_CORRECT) {
      btnGr.addColorStop(0, '#5aff7a'); btnGr.addColorStop(1, '#22bb44');
    } else if (bgColor === CONFIG.COLORS.ANSWER_WRONG) {
      btnGr.addColorStop(0, '#ff6666'); btnGr.addColorStop(1, '#cc2222');
    } else {
      btnGr.addColorStop(0, '#3a2060'); btnGr.addColorStop(1, '#220d50');
    }
    ctx.fillStyle = btnGr;
    roundRect(ctx, r.x, r.y, r.w, r.h, 11);
    ctx.fill();

    // shine บนปุ่ม
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h * 0.38, 9);
    ctx.fill();

    // ขอบสี
    ctx.strokeStyle = isEliminated                             ? 'rgba(100,100,100,0.6)'
                    : bgColor === CONFIG.COLORS.ANSWER_CORRECT ? '#aaffbb'
                    : bgColor === CONFIG.COLORS.ANSWER_WRONG   ? '#ffaaaa'
                    : 'rgba(160,120,255,0.8)';
    ctx.lineWidth = 2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 11);
    ctx.stroke();
    ctx.lineWidth = 1;

    // text + outline
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isEliminated) {
      // ข้อความสีเทา + ขีดทับ
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(String(val), r.x + r.w / 2, r.y + r.h / 2);
      ctx.fillStyle = '#aaa';
      ctx.fillText(String(val), r.x + r.w / 2, r.y + r.h / 2);
      // ขีดทับ
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r.x + 12, r.y + r.h / 2);
      ctx.lineTo(r.x + r.w - 12, r.y + r.h / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(String(val), r.x + r.w / 2, r.y + r.h / 2);
      ctx.fillStyle = '#fff';
      ctx.fillText(String(val), r.x + r.w / 2, r.y + r.h / 2);
    }
    ctx.lineWidth = 1; ctx.textBaseline = 'alphabetic';
  });
}

function drawFeedback(W, H, correct) {
  const msgs = {
    correct_crit:   { text: 'Critical! ⚡', color: '#FFD700' },
    correct_fast:   { text: 'Fast Hit! 🔥',  color: '#FF9900' },
    correct_normal: { text: 'Hit!',           color: '#6BCB77' },
    wrong:          { text: 'ผิด! 😱',        color: '#FF4444' },
    timeout:        { text: 'หมดเวลา!',       color: '#888888' },
  };
  const m = msgs[state.feedbackType];
  if (!m) return;

  const alpha = Math.min(1, state.feedbackTimer / 15);
  ctx.globalAlpha = alpha;
  ctx.font = `bold 36px sans-serif`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeText(m.text, W / 2, H * 0.5);
  ctx.fillStyle = m.color;
  ctx.fillText(m.text, W / 2, H * 0.5);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

function drawEndScreen(W, H, victory) {
  // ── ชนะเกมทั้งหมด (floor 60, ไม่ใช่ endless) ─────────────────
  var isGameClear = victory && state.floor >= 60 && !state.endless;
  var isEndlessVictory = victory && state.endless;

  ctx.fillStyle = isGameClear     ? 'rgba(0,10,30,0.85)'
                : isEndlessVictory ? 'rgba(0,0,20,0.82)'
                : victory          ? 'rgba(0,20,0,0.75)'
                :                    'rgba(20,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);

  if (isGameClear) {
    // หน้าพิเศษ: ชนะเกม!
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', W / 2 - 26, H * 0.28);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 32px sans-serif';
    ctx.fillText('ชนะเกม!', W / 2 + 30, H * 0.28);
    ctx.fillStyle = '#FFF'; ctx.font = '16px sans-serif';
    ctx.fillText('พิชิตเขาจักรวาล 60 ชั้น', W / 2, H * 0.38);
    ctx.fillStyle = '#4ECDC4'; ctx.font = 'bold 18px sans-serif';
    ctx.fillText('คะแนน: ' + state.score, W / 2, H * 0.46);
    ctx.textAlign = 'left';
  } else if (isEndlessVictory) {
    // Endless victory
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF9EFF'; ctx.font = 'bold 28px sans-serif';
    ctx.fillText('⚔ อนันต์ ' + (state.endlessFloor + 1) + ' ✓', W / 2, H * 0.30);
    ctx.fillStyle = '#FFF'; ctx.font = '16px sans-serif';
    ctx.fillText('ผ่านแล้ว! ต่อไปหรือกลับ?', W / 2, H * 0.38);
    ctx.fillStyle = '#4ECDC4'; ctx.font = 'bold 18px sans-serif';
    ctx.fillText('คะแนน: ' + state.score, W / 2, H * 0.45);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = victory ? '#FFD700' : '#FF4444';
    ctx.font = 'bold 48px sans-serif';
    drawIconLabel(ctx, victory ? '🎉' : '💀', victory ? 'ชนะ!' : 'แพ้', W / 2, H * 0.35, 52);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText('คะแนน: ' + state.score, W / 2, H * 0.45);
  }

  // ปุ่มหลัก: ชั้นต่อไป (ชนะ ไม่ใช่ clear) | ลองใหม่ (แพ้) | กลับหอ (game clear)
  var btn1W = 220, btn1H = 52;
  var b1x = (W - btn1W) / 2, b1y = H * 0.51;
  var showBtn1 = !isGameClear; // game clear ไม่มีปุ่มหลัก
  if (showBtn1) {
    var btn1Color = victory ? '#2d7a3a' : '#7a2d2d';
    if (isEndlessVictory) btn1Color = '#4a1a7a';
    ctx.fillStyle = btn1Color;
    roundRect(ctx, b1x, b1y, btn1W, btn1H, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
    var btn1Icon  = isEndlessVictory ? '⚔' : (victory ? '⬆️' : '🔄');
    var btn1Label = isEndlessVictory ? 'อนันต์ต่อไป' : (victory ? 'ชั้นต่อไป' : 'ลองใหม่');
    drawIconLabel(ctx, btn1Icon, btn1Label, W / 2, b1y + btn1H / 2 + 7, 26);
  }

  // ปุ่มรอง: กลับหน้าหอ
  var btn2W = 220, btn2H = 44;
  var b2x = (W - btn2W) / 2;
  var b2y = isGameClear ? H * 0.54 : b1y + btn1H + 12;
  if (isGameClear) btn2H = 52;
  ctx.fillStyle = isGameClear ? '#5a3a00' : '#2a2a4a';
  roundRect(ctx, b2x, b2y, btn2W, btn2H, 12); ctx.fill();
  ctx.strokeStyle = isGameClear ? '#FFD700' : '#6655AA'; ctx.lineWidth = isGameClear ? 2 : 1.5;
  roundRect(ctx, b2x, b2y, btn2W, btn2H, 12); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = isGameClear ? '#FFD700' : '#CCC';
  ctx.font = isGameClear ? 'bold 18px sans-serif' : '17px sans-serif';
  drawIconLabel(ctx, '⬅️', 'กลับหน้าหอ', W / 2, b2y + btn2H / 2 + 6, 22);
  ctx.textAlign = 'left';

  // ผูก handler ครั้งเดียว รองรับทั้ง click และ touchend (iOS fix)
  if (!canvas._endHandled) {
    canvas._endHandled = true;

    function doEndAction(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      var sx = W / rect.width, sy = H / rect.height;
      var cx = (clientX - rect.left) * sx;
      var cy = (clientY - rect.top)  * sy;
      // hit1 ใช้งานได้เฉพาะกรณีไม่ใช่ game clear
      var hit1 = showBtn1 && cx >= b1x && cx <= b1x + btn1W && cy >= b1y && cy <= b1y + btn1H;
      var hit2 = cx >= b2x && cx <= b2x + btn2W && cy >= b2y && cy <= b2y + btn2H;
      if (!hit1 && !hit2) return;

      canvas._endHandled = false;
      canvas.removeEventListener('click',    endClickH);
      canvas.removeEventListener('touchend', endTouchH);

      // บันทึก crystal/quest ถ้าชนะ
      function saveVictory() {
        var crystalGain = calcCrystalReward(state.floor, state.critCount || 0);
        state.saveData.crystals = (state.saveData.crystals || 0) + crystalGain;
        state.saveData = onFloorCleared(state.saveData);
        // onBossDefeated เฉพาะโหมดปกติ (endless ใช้ floor=60 ตลอด ทำให้ trigger ทุกครั้ง)
        if (!state.endless && state.floor % 10 === 0) state.saveData = onBossDefeated(state.saveData, state.score);
        if (!state.endless) {
          updateAfterVictory(state.saveData, state.floor, state.score);
        } else {
          // Endless: อัปเดต endlessMaxFloor
          var nextEF = state.endlessFloor + 1;
          if (nextEF > (state.saveData.endlessMaxFloor || 0)) {
            state.saveData.endlessMaxFloor = nextEF;
          }
          saveProgress(state.saveData);
        }
      }

      if (hit1) {
        if (isEndlessVictory) {
          // ต่อ Endless Floor ถัดไป (floor ยังคงเป็น 60 แต่ endlessFloor++)
          saveVictory();
          var nextEF = state.endlessFloor + 1;
          SCENE.switch('battle', canvas, {
            floor: 60, save: state.saveData,
            endless: true, endlessFloor: nextEF
          });
        } else if (victory) {
          // ชั้นต่อไปปกติ
          saveVictory();
          SCENE.switch('battle', canvas, { floor: state.floor + 1, save: state.saveData });
        } else {
          // ลองใหม่
          updateAfterDefeat(state.saveData, state.score);
          if (state.endless) {
            SCENE.switch('battle', canvas, {
              floor: 60, save: state.saveData,
              endless: true, endlessFloor: state.endlessFloor
            });
          } else {
            SCENE.switch('battle', canvas, { floor: state.floor, save: state.saveData });
          }
        }
      } else {
        // กลับหน้าหอ (hit2)
        if (victory) saveVictory(); else updateAfterDefeat(state.saveData, state.score);
        SCENE.switch('tower', canvas);
      }
    }

    var endClickH = function(e) {
      if (canvas._endTouched) { canvas._endTouched = false; return; }
      doEndAction(e.clientX, e.clientY);
    };
    var endTouchH = function(e) {
      e.preventDefault();
      canvas._endTouched = true;
      doEndAction(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    };
    canvas.addEventListener('click',    endClickH);
    canvas.addEventListener('touchend', endTouchH, { passive: false });
  }
}

// วาด icon + label ให้กึ่งกลาง cx โดยไม่พึ่ง textAlign=center กับ emoji
// (iOS Canvas วัด emoji width ไม่แม่น → ใช้ iconW fixed แทน)
function drawIconLabel(ctx, icon, label, cx, y, iconW) {
  var gap = 6;
  var labelW = ctx.measureText(label).width;
  var totalW = iconW + gap + labelW;
  var sx = Math.round(cx - totalW / 2);
  ctx.textAlign = 'left';
  ctx.fillText(icon,  sx, y);
  ctx.fillText(label, sx + iconW + gap, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
