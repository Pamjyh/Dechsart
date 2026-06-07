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
};

var canvas, ctx;
var animId = null;
var inputAbort = null;

// ── Init ─────────────────────────────────────────────────────────
function initBattle(canvasEl, floor, saveData) {
  floor = floor || 1;
  saveData = saveData || loadProgress();
  canvas = canvasEl;
  ctx    = canvas.getContext('2d');
  // ลบ listener เก่าก่อน เพื่อป้องกัน resize handlers ซ้อนทับ
  window.removeEventListener('resize', resizeCanvas);
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  state.floor    = floor;
  // โหลด party ทั้งหมด
  var partyIds = (saveData.party && saveData.party.length > 0) ? saveData.party : ['devasri'];
  state.party = partyIds.map(function(id) { return HEROES[id] || STARTER_HERO; });
  state.hero  = state.party[0]; // default active hero
  state.boss     = getBossForFloor(floor);
  state.heroHP   = state.heroMaxHP = CONFIG.HP.HERO_BASE + (state.hero.hpBonus || 0);
  state.bossHP   = state.bossMaxHP = getBossHP(floor);
  state.phase    = 'idle';
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

  if (inputAbort) inputAbort.abort();
  inputAbort = new AbortController();
  const sig = inputAbort.signal;
  canvas.addEventListener('click',     onInput, { signal: sig });
  canvas.addEventListener('touchstart', onTouch, { passive: false, signal: sig });

  if (animId) cancelAnimationFrame(animId);
  loop();
  setTimeout(() => { playStart(); startQuestion(); }, 600);
}

function resizeCanvas() {
  if (!canvas) return;
  const W = CONFIG.CANVAS.BASE_WIDTH;
  const H = CONFIG.CANVAS.BASE_HEIGHT;
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width  = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
  canvas.width  = W;
  canvas.height = H;
}

// ── Game Loop ────────────────────────────────────────────────────
function loop() {
  state.frame++;
  update();
  render();
  animId = requestAnimationFrame(loop);
}

function update() {
  // timer
  if (state.phase === 'question') {
    const elapsed = performance.now() - state.questionStart;
    if (elapsed >= CONFIG.SPEED.TIMEOUT_MS) {
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

  // damage numbers
  state.damageNumbers = state.damageNumbers.filter(d => {
    d.y -= 1.5; d.life--; return d.life > 0;
  });
}

// ── Questions ────────────────────────────────────────────────────
function startQuestion() {
  if (state.phase === 'victory' || state.phase === 'defeat') return;
  // สลับ op ตาม boss weak/resist เพื่อบังคับ variety
  state.currentOp = pickOp();
  state.question  = generateQuestion(state.currentOp, state.floor, state.battleRound);
  state.questionStart = performance.now();
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
  if (state.phase !== 'question') return;

  const rect  = canvas.getBoundingClientRect();
  const scaleX = CONFIG.CANVAS.BASE_WIDTH  / rect.width;
  const scaleY = CONFIG.CANVAS.BASE_HEIGHT / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top)  * scaleY;

  const btnRegions = getAnswerRegions();
  for (let i = 0; i < btnRegions.length; i++) {
    const r = btnRegions[i];
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
  state.lastChosen = chosen;
  const elapsed = performance.now() - state.questionStart;
  const correct = chosen === state.question.answer;

  if (correct) {
    let mult, type;
    var speedMult = 1 + (state.hero.speedBonus || 0);
    var critMs = CONFIG.SPEED.CRITICAL_MS * speedMult;
    var fastMs = CONFIG.SPEED.FAST_MS * speedMult;
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
      if (state.boss.weak === elem.id)    mult *= CONFIG.DAMAGE.WEAK_MULTIPLIER;
      if (state.boss.resist === elem.id)  mult *= CONFIG.DAMAGE.RESIST_MULTIPLIER;
    }

    const dmg = Math.round(mult);
    state.bossHP  = Math.max(0, state.bossHP - dmg);
    state.score  += dmg;
    state.combo++;
    state.battleRound++;

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
    // Adaptive: บันทึก error ของ op นี้
    if (state.opErrors && state.currentOp) {
      state.opErrors[state.currentOp] = (state.opErrors[state.currentOp] || 0) + 1;
      if (state.saveData) {
        state.saveData.opErrors = state.opErrors;
      }
    }
    var dmg = CONFIG.DAMAGE.BOSS_BASE;
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
  const dmg = CONFIG.DAMAGE.BOSS_BASE;
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

// ── Particles ────────────────────────────────────────────────────
function spawnParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = CONFIG.PARTICLES.SPEED_BASE * (0.5 + Math.random());
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: Math.floor(CONFIG.PARTICLES.LIFESPAN_MS / 16 * (0.6 + Math.random() * 0.8)),
      maxLife: Math.floor(CONFIG.PARTICLES.LIFESPAN_MS / 16),
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

function spawnDamageNumber(x, y, value, color) {
  state.damageNumbers.push({ x, y, value, color, life: 50, maxLife: 50 });
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

  // Floor label
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  var tierLabel = state.battleRound <= 3 ? '' : state.battleRound <= 6 ? ' 🔥' : ' 💥';
  ctx.fillText('ชั้น ' + state.floor + '  ข้อที่ ' + (state.battleRound+1) + tierLabel, 14, 22);

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
  state.boss.draw(ctx, W * 0.5, H * 0.20, 80, state.frame);

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
    var elapsed = performance.now() - state.questionStart;
    var pct = Math.max(0, 1 - elapsed / CONFIG.SPEED.TIMEOUT_MS);
    var barW = W * 0.84;
    var barX = W * 0.08;
    var barY = H * 0.41;

    ctx.fillStyle = '#1a1a3a';
    roundRect(ctx, barX, barY, barW, 8, 4);
    ctx.fill();

    var barColor = pct > 0.5 ? CONFIG.COLORS.TIMER_BAR
                 : pct > 0.25 ? '#FF9900' : '#FF4444';
    ctx.fillStyle = barColor;
    roundRect(ctx, barX, barY, barW * pct, 8, 4);
    ctx.fill();

    // Speed hint
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = elapsed < CONFIG.SPEED.CRITICAL_MS ? '#FFD700'
                  : elapsed < CONFIG.SPEED.FAST_MS     ? '#FF9900'
                  : 'rgba(255,255,255,0.4)';
    ctx.fillText(
      elapsed < CONFIG.SPEED.CRITICAL_MS ? '⚡ Critical zone!' :
      elapsed < CONFIG.SPEED.FAST_MS     ? '🔥 Fast zone'      : '💤',
      W / 2, barY - 5
    );
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

  // Particles
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Damage numbers
  for (const d of state.damageNumbers) {
    const alpha = d.life / d.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = d.color;
    ctx.font = `bold ${d.value > 30 ? 28 : 22}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(d.value > 30 ? `${d.value}!` : String(d.value), d.x, d.y);
    ctx.fillText(d.value > 30 ? `${d.value}!` : String(d.value), d.x, d.y);
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth   = 1;

  // Victory / Defeat
  if (state.phase === 'victory')  drawEndScreen(W, H, true);
  if (state.phase === 'defeat')   drawEndScreen(W, H, false);
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
  const pct = hp / maxHp;
  ctx.fillStyle = CONFIG.COLORS.HP_BG;
  roundRect(ctx, x, y, w, h, h / 2); ctx.fill();

  ctx.fillStyle = color;
  if (pct > 0) { roundRect(ctx, x, y, w * pct, h, h / 2); ctx.fill(); }

  ctx.fillStyle = '#fff';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${label} ${hp}/${maxHp}`, x + 6, y + h - 3);
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
    let bgColor = CONFIG.COLORS.ANSWER_BTN;

    // feedback highlight
    if (state.phase === 'feedback' && val === q.answer)
      bgColor = CONFIG.COLORS.ANSWER_CORRECT;
    if (state.phase === 'boss_attack' && state.feedbackType !== 'timeout' && val !== q.answer && state.lastChosen === val)
      bgColor = CONFIG.COLORS.ANSWER_WRONG;

    ctx.fillStyle = bgColor;
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(120, 100, 220, 0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.stroke();

    ctx.fillStyle = CONFIG.COLORS.TEXT_MAIN;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(val), r.x + r.w / 2, r.y + r.h / 2 + 8);
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
  ctx.fillStyle = victory ? 'rgba(0,20,0,0.75)' : 'rgba(20,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = victory ? '#FFD700' : '#FF4444';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(victory ? '🎉 ชนะ!' : '💀 แพ้', W / 2, H * 0.38);

  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(`คะแนน: ${state.score}`, W / 2, H * 0.48);

  // Restart button
  const btnW = 200, btnH = 52;
  const bx = (W - btnW) / 2, by = H * 0.56;
  ctx.fillStyle = victory ? '#2d7a3a' : '#7a2d2d';
  roundRect(ctx, bx, by, btnW, btnH, 12); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('เล่นใหม่', W / 2, by + btnH / 2 + 7);

  // ผูก click เดียว
  if (!canvas._endHandled) {
    canvas._endHandled = true;
    const handler = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width, scaleY = H / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top)  * scaleY;
      if (cx >= bx && cx <= bx + btnW && cy >= by && cy <= by + btnH) {
        canvas._endHandled = false;
        canvas.removeEventListener('click', handler);
        if (victory) {
          // Crystal reward
          var crystalGain = calcCrystalReward(state.floor, state.critCount || 0);
          state.saveData.crystals = (state.saveData.crystals || 0) + crystalGain;
          // Daily quest: floor cleared
          state.saveData = onFloorCleared(state.saveData);
          // Daily quest: boss defeated (every 10th floor)
          if (state.floor % 10 === 0) {
            state.saveData = onBossDefeated(state.saveData, state.score);
          }
          var updated = updateAfterVictory(state.saveData, state.floor, state.score);
          SCENE.switch('tower', canvas);
        } else {
          updateAfterDefeat(state.saveData, state.score);
          SCENE.switch('tower', canvas);
        }
      }
    };
    canvas.addEventListener('click', handler);
  }
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
