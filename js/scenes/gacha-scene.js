// gacha-scene.js — หน้า "พิธีปลุกเสก"

var gachaState = {
  frame: 0, animId: null, save: null,
  phase: 'lobby',  // 'lobby' | 'pulling' | 'reveal'
  results: [],     // [{hero, rarity, isNew}]
  revealIdx: 0,    // index ที่กำลัง reveal
  revealTimer: 0,
  particles: [],
  _handlers: []
};

var RARITY_GLOW = { common:'#888888', rare:'#4488FF', epic:'#CC44FF', legendary:'#FFD700' };
var RARITY_NAME = { common:'Common', rare:'Rare', epic:'Epic', legendary:'Legendary' };

function initGacha(canvas, save) {
  gachaState.frame     = 0;
  gachaState.save      = save;
  gachaState.phase     = 'lobby';
  gachaState.results   = [];
  gachaState.revealIdx = 0;
  gachaState.particles = [];

  var ctx = canvas.getContext('2d');

  gachaState._handlers.forEach(function(h) {
    canvas.removeEventListener(h.type, h.fn);
  });
  gachaState._handlers = [];

  function addH(type, fn, opts) {
    canvas.addEventListener(type, fn, opts || false);
    gachaState._handlers.push({ type: type, fn: fn });
  }

  addH('click', function(e) {
    resumeAudio();
    var rect = canvas.getBoundingClientRect();
    var cx = (e.clientX - rect.left) * (CONFIG.CANVAS.BASE_WIDTH  / rect.width);
    var cy = (e.clientY - rect.top)  * (CONFIG.CANVAS.BASE_HEIGHT / rect.height);
    handleGachaTap(cx, cy, canvas);
  });

  if (gachaState.animId) cancelAnimationFrame(gachaState.animId);
  function loop() {
    gachaState.frame++;
    updateGacha();
    renderGacha(canvas, ctx);
    gachaState.animId = requestAnimationFrame(loop);
  }
  loop();
}

function handleGachaTap(cx, cy, canvas) {
  var W = canvas.width, H = canvas.height;
  var save = gachaState.save;

  if (gachaState.phase === 'pulling') return; // รอ animation

  // ── ปุ่มกลับ ──
  if (cx >= 8 && cx <= 80 && cy >= 8 && cy <= 44) {
    cleanupGacha(canvas);
    saveProgress(save);
    SCENE.switch('tower', canvas);
    return;
  }

  if (gachaState.phase === 'lobby') {
    // Single pull
    if (hitGachaBtn(cx, cy, W, H, 0)) {
      if (save.crystals >= GACHA_COST_SINGLE) {
        var r = gachaPullOne(save);
        if (r) startReveal([r], canvas);
      }
    }
    // 10× pull
    if (hitGachaBtn(cx, cy, W, H, 1)) {
      if (save.crystals >= GACHA_COST_TEN) {
        var rs = gachaPullTen(save);
        if (rs) startReveal(rs, canvas);
      }
    }
  }

  if (gachaState.phase === 'reveal') {
    // tap เพื่อ reveal ถัดไป
    if (gachaState.revealIdx < gachaState.results.length - 1) {
      gachaState.revealIdx++;
      gachaState.revealTimer = 0;
      spawnGachaParticles(gachaState.results[gachaState.revealIdx]);
    } else {
      // reveal ครบ → กลับ lobby
      saveProgress(save);
      gachaState.phase = 'lobby';
    }
  }
}

function hitGachaBtn(cx, cy, W, H, btnIdx) {
  var btnW = 160, btnH = 52;
  var bx = W / 2 - btnW - 8 + btnIdx * (btnW + 16);
  var by = H * 0.82;
  return cx >= bx && cx <= bx + btnW && cy >= by && cy <= by + btnH;
}

function startReveal(results, canvas) {
  gachaState.results   = results;
  gachaState.revealIdx = 0;
  gachaState.revealTimer = 0;
  gachaState.phase = 'reveal';
  spawnGachaParticles(results[0]);
  if (results[0].rarity === 'legendary') playCritical();
  else if (results[0].rarity === 'epic') playFastHit();
  else playHit();
}

function spawnGachaParticles(result) {
  var color = RARITY_GLOW[result.rarity];
  var count = result.rarity === 'legendary' ? 60 : result.rarity === 'epic' ? 35 : 15;
  var W = CONFIG.CANVAS.BASE_WIDTH, H = CONFIG.CANVAS.BASE_HEIGHT;
  for (var i = 0; i < count; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = 3 + Math.random() * 5;
    gachaState.particles.push({
      x: W / 2, y: H * 0.38,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3,
      life: 50 + Math.floor(Math.random() * 30),
      maxLife: 80, color: color, size: 3 + Math.random() * 5
    });
  }
}

function updateGacha() {
  gachaState.particles = gachaState.particles.filter(function(p) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--;
    return p.life > 0;
  });
  if (gachaState.phase === 'reveal') {
    gachaState.revealTimer++;
  }
}

function cleanupGacha(canvas) {
  cancelAnimationFrame(gachaState.animId);
  gachaState._handlers.forEach(function(h) {
    canvas.removeEventListener(h.type, h.fn);
  });
}

function renderGacha(canvas, ctx) {
  var W = canvas.width, H = canvas.height;
  var f = gachaState.frame;
  var save = gachaState.save;

  // BG
  var bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d0620'); bg.addColorStop(1, '#200a3e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // stars
  for (var i = 0; i < 40; i++) {
    ctx.globalAlpha = (Math.sin(f * 0.03 + i) * 0.3 + 0.7) * 0.5;
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc((i * 137.5) % W, (i * 97.3) % (H * 0.7), i % 3 === 0 ? 1.5 : 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // header
  ctx.fillStyle = '#1a0a3e'; ctx.fillRect(0, 0, W, 52);
  ctx.fillStyle = '#3d1a6e'; gachaRR(ctx, 8, 8, 68, 36, 8); ctx.fill();
  ctx.strokeStyle = '#6633CC'; ctx.lineWidth = 1; gachaRR(ctx, 8, 8, 68, 36, 8); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = '#DDD'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('⬅ กลับ', 42, 31);
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('✨ พิธีปลุกเสก', W / 2, 24);

  // crystal display
  ctx.fillStyle = '#4ECDC4'; ctx.font = 'bold 20px sans-serif';
  ctx.fillText('💎 ' + save.crystals, W / 2, 46);

  // Pity info
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px sans-serif';
  var pityE = PITY_EPIC - (save.pityEpic || 0);
  var pityL = PITY_LEGENDARY - (save.pityLegendary || 0);
  ctx.fillText('Epic ใน ' + pityE + ' ครั้ง | Legendary ใน ' + pityL + ' ครั้ง', W / 2, 60);

  ctx.textAlign = 'left';

  if (gachaState.phase === 'lobby') {
    renderGachaLobby(ctx, W, H, f, save);
  } else if (gachaState.phase === 'reveal') {
    renderGachaReveal(ctx, W, H, f);
  }

  // particles
  gachaState.particles.forEach(function(p) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function renderGachaLobby(ctx, W, H, f, save) {
  // วาด orb กลาง
  var cx = W / 2, cy = H * 0.38;
  var pulse = Math.sin(f * 0.05) * 10;

  var grd = ctx.createRadialGradient(cx, cy, 5, cx, cy, 90 + pulse);
  grd.addColorStop(0, 'rgba(200,150,255,0.8)');
  grd.addColorStop(0.5, 'rgba(100,50,200,0.4)');
  grd.addColorStop(1, 'rgba(50,0,100,0)');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(cx, cy, 90 + pulse, 0, Math.PI * 2); ctx.fill();

  // วง rotate
  ctx.strokeStyle = 'rgba(180,100,255,0.5)'; ctx.lineWidth = 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(f * 0.015);
  for (var i = 0; i < 8; i++) {
    var a = (i / 8) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
    ctx.lineTo(Math.cos(a) * 80, Math.sin(a) * 80); ctx.stroke();
  }
  ctx.restore(); ctx.lineWidth = 1;

  // core orb
  var orbGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
  orbGrd.addColorStop(0, '#FFFFFF'); orbGrd.addColorStop(0.3, '#CC88FF');
  orbGrd.addColorStop(1, 'rgba(100,0,200,0)');
  ctx.fillStyle = orbGrd;
  ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🔮', cx, cy + 10);

  // hero count
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '12px sans-serif';
  ctx.fillText('มี ' + ALL_HEROES.length + ' วีรบุรุษ — ได้รับ ' + save.unlockedHeroes.length + ' ตัวแล้ว', W/2, H * 0.6);

  // pull buttons
  var btnW = 155, btnH = 52;
  var canSingle = save.crystals >= GACHA_COST_SINGLE;
  var canTen    = save.crystals >= GACHA_COST_TEN;

  [[0, '1× ปลุกเสก', GACHA_COST_SINGLE + ' 💎', canSingle],
   [1, '10× ปลุกเสก', GACHA_COST_TEN + ' 💎', canTen]].forEach(function(btn) {
    var bx = W/2 - btnW - 8 + btn[0] * (btnW + 16);
    var by = H * 0.82;
    ctx.fillStyle = btn[3] ? '#3d1a6e' : '#1a1a1a';
    gachaRR(ctx, bx, by, btnW, btnH, 12); ctx.fill();
    ctx.strokeStyle = btn[3] ? '#9933FF' : '#333';
    ctx.lineWidth = btn[3] ? 2 : 1;
    gachaRR(ctx, bx, by, btnW, btnH, 12); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = btn[3] ? '#FFF' : '#555';
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(btn[1], bx + btnW/2, by + 22);
    ctx.fillStyle = btn[3] ? '#4ECDC4' : '#444';
    ctx.font = '12px sans-serif';
    ctx.fillText(btn[2], bx + btnW/2, by + 40);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Common 60% | Rare 30% | Epic 8% | Legendary 2%', W/2, H * 0.95);
  ctx.textAlign = 'left';
}

function renderGachaReveal(ctx, W, H, f) {
  var result = gachaState.results[gachaState.revealIdx];
  var total  = gachaState.results.length;
  var color  = RARITY_GLOW[result.rarity];
  var t      = Math.min(1, gachaState.revealTimer / 20); // fade-in

  // BG glow
  ctx.globalAlpha = t * 0.5;
  var grd = ctx.createRadialGradient(W/2, H*0.38, 10, W/2, H*0.38, 200);
  grd.addColorStop(0, color); grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // draw hero (large)
  ctx.globalAlpha = t;
  result.hero.draw(ctx, W/2, H * 0.38, 70, f);
  ctx.globalAlpha = 1;

  // rarity banner
  ctx.fillStyle = color;
  ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
  ctx.shadowColor = color; ctx.shadowBlur = 15;
  ctx.fillText('★ ' + RARITY_NAME[result.rarity] + ' ★', W/2, H * 0.62);
  ctx.shadowBlur = 0;

  // hero name
  ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px sans-serif';
  ctx.fillText(result.hero.name, W/2, H * 0.68);

  // NEW! badge
  if (result.isNew) {
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('✨ NEW!', W/2, H * 0.74);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif';
    ctx.fillText('(มีแล้ว)', W/2, H * 0.74);
  }

  // progress dots (สำหรับ 10x)
  if (total > 1) {
    var dotW = 10, gap = 6;
    var totalW = total * (dotW + gap) - gap;
    var startX = W/2 - totalW/2;
    for (var i = 0; i < total; i++) {
      var r = gachaState.results[i];
      ctx.fillStyle = i <= gachaState.revealIdx ? RARITY_GLOW[r.rarity] : '#333';
      ctx.beginPath();
      ctx.arc(startX + i * (dotW + gap) + dotW/2, H * 0.82, dotW/2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // hint
  var remaining = total - gachaState.revealIdx - 1;
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif';
  ctx.fillText(remaining > 0 ? 'แตะเพื่อดูถัดไป (' + remaining + ' คน)' : 'แตะเพื่อเสร็จสิ้น', W/2, H * 0.9);
  ctx.textAlign = 'left';
}

function gachaRR(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
