// party-select.js — เลือก 3 heroes ก่อนเข้าชั้น

var partyState = {
  frame: 0, animId: null,
  save: null, floor: 1,
  selected: [],       // hero IDs ที่เลือกแล้ว (max 3)
  hoveredIdx: -1,
  scrollY: 0,
  _handlers: []
};

var ELEM_COLORS = { fire:'#FF6B35', water:'#4ECDC4', thunder:'#FFD93D', wind:'#6BCB77', mixed:'#FFD700' };
var RARITY_COLORS = { common:'#888', rare:'#4488FF', epic:'#CC44FF', legendary:'#FFD700' };

function initPartySelect(canvas, floor, save) {
  partyState.frame    = 0;
  partyState.save     = save;
  partyState.floor    = floor;
  partyState.scrollY  = 0;
  // โหลด party จาก save (กรอง unlocked เท่านั้น)
  partyState.selected = (save.party || ['devasri']).filter(function(id) {
    return save.unlockedHeroes.includes(id);
  });
  if (partyState.selected.length === 0) partyState.selected = ['devasri'];

  var ctx = canvas.getContext('2d');

  partyState._handlers.forEach(function(h) {
    canvas.removeEventListener(h.type, h.fn);
  });
  partyState._handlers = [];

  function addH(type, fn, opts) {
    canvas.addEventListener(type, fn, opts || false);
    partyState._handlers.push({ type: type, fn: fn });
  }

  // ── Click (desktop fallback) ──────────────────────
  addH('click', function(e) {
    if (partyState._touchHandled) { partyState._touchHandled = false; return; }
    if (partyState._dragging) return;
    var pt = getPartyPt(e.clientX, e.clientY, canvas);
    handlePartyTap(pt.x, pt.y, canvas);
  });

  // ── Touch drag + tap ──────────────────────────────
  partyState._touchX0 = 0;
  partyState._touchHandled = false;

  addH('touchstart', function(e) {
    e.preventDefault();
    partyState._dragY0  = e.touches[0].clientY;
    partyState._touchX0 = e.touches[0].clientX;
    partyState._scrollY0 = partyState.scrollY;
    partyState._dragging = false;
  }, { passive: false });

  addH('touchmove', function(e) {
    e.preventDefault();
    var dy = partyState._dragY0 - e.touches[0].clientY;
    if (Math.abs(dy) > 8) partyState._dragging = true;
    partyState.scrollY = Math.max(0, partyState._scrollY0 + dy);
  }, { passive: false });

  addH('touchend', function(e) {
    e.preventDefault();
    var t = e.changedTouches[0];
    var dx = Math.abs(t.clientX - partyState._touchX0);
    var dy = Math.abs(t.clientY - partyState._dragY0);
    if (dx < 10 && dy < 10 && !partyState._dragging) {
      partyState._touchHandled = true;
      var pt = getPartyPt(t.clientX, t.clientY, canvas);
      handlePartyTap(pt.x, pt.y, canvas);
    }
    partyState._dragging = false;
  }, { passive: false });

  if (partyState.animId) cancelAnimationFrame(partyState.animId);
  function loop() {
    partyState.frame++;
    renderPartySelect(canvas, ctx);
    partyState.animId = requestAnimationFrame(loop);
  }
  loop();
}

function getPartyPt(cx, cy, canvas) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: (cx - rect.left) * (CONFIG.CANVAS.BASE_WIDTH  / rect.width),
    y: (cy - rect.top)  * (CONFIG.CANVAS.BASE_HEIGHT / rect.height)
  };
}

function handlePartyTap(cx, cy, canvas) {
  if (partyState._dragging) return;
  var W = canvas.width, H = canvas.height;

  // ── ปุ่ม ย้อนกลับ ──────────────────────────────
  if (cx >= 8 && cx <= 80 && cy >= 8 && cy <= 44) {
    cleanup(canvas);
    SCENE.switch('tower', canvas);
    return;
  }

  // ── ปุ่ม เริ่มสู้! ─────────────────────────────
  var btnW = 200, btnH = 50;
  var bx = (W - btnW) / 2, by = H - 70;
  if (partyState.selected.length > 0 &&
      cx >= bx && cx <= bx + btnW && cy >= by && cy <= by + btnH) {
    var save = partyState.save;
    save.party = partyState.selected.slice();
    saveProgress(save);
    cleanup(canvas);
    SCENE.switch('battle', canvas, { floor: partyState.floor, save: save });
    return;
  }

  // ── hero card tap ───────────────────────────────
  var cardIdx = hitTestPartyCard(cx, cy + partyState.scrollY, W);
  if (cardIdx !== null) {
    var unlocked = partyState.save.unlockedHeroes;
    var heroId   = ALL_HEROES.filter(function(h) {
      return unlocked.includes(h.id);
    })[cardIdx];
    if (!heroId) return;

    var idx = partyState.selected.indexOf(heroId.id);
    if (idx >= 0) {
      partyState.selected.splice(idx, 1); // deselect
    } else if (partyState.selected.length < 3) {
      partyState.selected.push(heroId.id); // select
    }
    // ถ้าเต็ม 3 แล้ว ไม่ทำอะไร
  }
}

function hitTestPartyCard(cx, cy, W) {
  var cols = 3;
  var cW = (W * 0.9) / cols, cH = 110;
  var startX = W * 0.05, startY = 60;

  var unlocked = partyState.save.unlockedHeroes;
  for (var i = 0; i < unlocked.length; i++) {
    var row = Math.floor(i / cols), col = i % cols;
    var fx = startX + col * cW, fy = startY + row * (cH + 8);
    if (cx >= fx && cx <= fx + cW - 4 && cy >= fy && cy <= fy + cH) return i;
  }
  return null;
}

function cleanup(canvas) {
  cancelAnimationFrame(partyState.animId);
  partyState._handlers.forEach(function(h) {
    canvas.removeEventListener(h.type, h.fn);
  });
}

function renderPartySelect(canvas, ctx) {
  var W = canvas.width, H = canvas.height;
  var f = partyState.frame;
  var save = partyState.save;

  // BG
  var bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d0620'); bg.addColorStop(1, '#1a0a2e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = '#1a0a3e'; ctx.fillRect(0, 0, W, 52);

  // ปุ่มกลับ
  ctx.fillStyle = '#3d1a6e';
  psRR(ctx, 8, 8, 68, 36, 8); ctx.fill();
  ctx.strokeStyle = '#6633CC'; ctx.lineWidth = 1; psRR(ctx, 8, 8, 68, 36, 8); ctx.stroke();
  ctx.fillStyle = '#DDD'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('⬅ กลับ', 42, 31);

  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 17px sans-serif';
  ctx.fillText('⚔️ เลือกทีม', W / 2, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '11px sans-serif';
  ctx.fillText('เลือก 1-3 คน  |  เลือกแล้ว ' + partyState.selected.length + '/3', W / 2, 42);
  ctx.textAlign = 'left';

  // Hero cards
  var cols = 3;
  var cW = (W * 0.9) / cols, cH = 110;
  var startX = W * 0.05, startY = 60 - partyState.scrollY;
  var unlocked = save.unlockedHeroes;

  unlocked.forEach(function(hid, i) {
    var hero = getHeroById(hid);
    if (!hero) return;

    var row = Math.floor(i / cols), col = i % cols;
    var fx = startX + col * cW, fy = startY + row * (cH + 8);
    var fw = cW - 4;

    if (fy + cH < 52 || fy > H - 60) return; // clip

    var isSelected = partyState.selected.includes(hid);
    var selIdx     = partyState.selected.indexOf(hid);

    // card bg
    ctx.fillStyle = isSelected ? '#2a1a5e' : '#111';
    psRR(ctx, fx, fy, fw, cH, 10); ctx.fill();

    // element glow border
    ctx.strokeStyle = isSelected ? (ELEM_COLORS[hero.element] || '#9933FF') : '#333';
    ctx.lineWidth = isSelected ? 2.5 : 1;
    psRR(ctx, fx, fy, fw, cH, 10); ctx.stroke();
    ctx.lineWidth = 1;

    // Draw hero (mini)
    hero.draw(ctx, fx + fw / 2, fy + 44, 36, f + i * 17);

    // element badge
    ctx.fillStyle = ELEM_COLORS[hero.element] || '#888';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(hero.element === 'mixed' ? '🌈' : CONFIG.ELEMENTS[Object.keys(CONFIG.ELEMENTS).find(function(k){ return CONFIG.ELEMENTS[k].id === hero.element; }) || 'FIRE'].label.split(' ')[0], fx + fw - 12, fy + 14);

    // rarity
    ctx.fillStyle = RARITY_COLORS[hero.rarity] || '#888';
    ctx.font = '8px sans-serif';
    ctx.fillText(hero.rarity, fx + fw / 2, fy + 82);

    // name
    ctx.fillStyle = isSelected ? '#FFD700' : '#CCC';
    ctx.font = (isSelected ? 'bold ' : '') + '11px sans-serif';
    ctx.fillText(hero.name, fx + fw / 2, fy + 96);

    // selection number badge
    if (isSelected) {
      ctx.fillStyle = '#9933FF';
      ctx.beginPath(); ctx.arc(fx + 14, fy + 14, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px sans-serif';
      ctx.fillText(String(selIdx + 1), fx + 14, fy + 18);
    }

    // stats mini
    if (hero.speedBonus > 0 || hero.dmgBonus > 0 || hero.hpBonus > 0) {
      ctx.fillStyle = 'rgba(255,255,100,0.7)'; ctx.font = '8px sans-serif';
      var stats = [];
      if (hero.speedBonus > 0) stats.push('⚡+' + Math.round(hero.speedBonus * 100) + '%');
      if (hero.dmgBonus > 0)   stats.push('⚔+' + hero.dmgBonus);
      if (hero.hpBonus > 0)    stats.push('❤+' + hero.hpBonus);
      ctx.fillText(stats.join(' '), fx + fw / 2, fy + 106);
    }
  });

  ctx.textAlign = 'left';

  // Footer: ปุ่มเริ่ม
  ctx.fillStyle = '#0d0620'; ctx.fillRect(0, H - 80, W, 80);
  ctx.fillStyle = '#1a0a3e'; ctx.fillRect(0, H - 78, W, 2);

  // selected party preview (3 slots)
  [0, 1, 2].forEach(function(i) {
    var sx = W / 2 + (i - 1) * 52, sy = H - 58;
    var hid = partyState.selected[i];
    var hero = hid ? getHeroById(hid) : null;

    ctx.fillStyle = hero ? '#2a1a4e' : '#111';
    psRR(ctx, sx - 20, sy - 20, 40, 40, 8); ctx.fill();
    ctx.strokeStyle = hero ? (ELEM_COLORS[hero.element] || '#555') : '#333';
    ctx.lineWidth = hero ? 2 : 1;
    psRR(ctx, sx - 20, sy - 20, 40, 40, 8); ctx.stroke();
    ctx.lineWidth = 1;

    if (hero) {
      hero.draw(ctx, sx, sy, 16, f);
    } else {
      ctx.fillStyle = '#333'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('+', sx, sy + 6);
    }
  });

  // Start button
  var btnW = 180, btnH = 46;
  var bx = (W - btnW) / 2, by = H - 22;
  var canStart = partyState.selected.length > 0;
  var pulse = Math.sin(f * 0.1) * 6;
  ctx.shadowColor = '#9933FF'; ctx.shadowBlur = canStart ? 12 + pulse : 0;
  ctx.fillStyle = canStart ? '#3d1a6e' : '#222';
  psRR(ctx, bx, by - btnH, btnW, btnH, 12); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = canStart ? '#9933FF' : '#333'; ctx.lineWidth = canStart ? 2 : 1;
  psRR(ctx, bx, by - btnH, btnW, btnH, 12); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = canStart ? '#FFD700' : '#555';
  ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(canStart ? '⚔️ เริ่มสู้!' : 'เลือก hero ก่อน', W / 2, by - btnH / 2 + 7);
  ctx.textAlign = 'left';
}

function psRR(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
