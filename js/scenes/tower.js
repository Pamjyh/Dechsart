// scenes/tower.js — เลือกชั้น + แสดง progress

var towerState = {
  frame: 0, animId: null, save: null,
  scrollY: 0, maxScrollY: 0,
  dragging: false, dragStartY: 0, dragScrollStart: 0,
  _handlers: []
};

var TOWER_ROW_H = 52;
var TOWER_COLS  = 5;
var TOWER_START_Y = 68; // ใต้ header

function initTower(canvas) {
  towerState.frame   = 0;
  towerState.save    = loadProgress();
  towerState.scrollY = 0;
  towerState.dragging = false;

  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  // คำนวณ maxScroll (total height ของ grid)
  var rows = Math.ceil(60 / TOWER_COLS);
  var gridH = rows * TOWER_ROW_H + 20;
  var visibleH = H - TOWER_START_Y - 44; // 44 = footer
  towerState.maxScrollY = Math.max(0, gridH - visibleH);

  // ล้าง handlers เก่า
  towerState._handlers.forEach(function(h) {
    canvas.removeEventListener(h.type, h.fn);
  });
  towerState._handlers = [];

  function addHandler(type, fn, opts) {
    canvas.addEventListener(type, fn, opts || false);
    towerState._handlers.push({ type: type, fn: fn });
  }

  // ── Click (desktop fallback) ─────────────────────
  addHandler('click', function(e) {
    if (towerState._touchHandled) { towerState._touchHandled = false; return; }
    if (towerState.dragging) return;
    resumeAudio();
    var pt = getCanvasPoint(e.clientX, e.clientY, canvas);
    handleTowerTap(pt.x, pt.y, canvas);
  });

  // ── Touch drag scroll + tap ─────────────────────
  towerState._touchStartX = 0;
  towerState._touchStartY = 0;
  towerState._touchHandled = false;

  addHandler('touchstart', function(e) {
    e.preventDefault();
    towerState.dragging = false;
    towerState._touchStartX = e.touches[0].clientX;
    towerState._touchStartY = e.touches[0].clientY;
    towerState.dragStartY = e.touches[0].clientY;
    towerState.dragScrollStart = towerState.scrollY;
  }, { passive: false });

  addHandler('touchmove', function(e) {
    e.preventDefault();
    var dy = towerState.dragStartY - e.touches[0].clientY;
    if (Math.abs(dy) > 8) towerState.dragging = true;
    towerState.scrollY = Math.max(0, Math.min(towerState.maxScrollY,
      towerState.dragScrollStart + dy));
  }, { passive: false });

  addHandler('touchend', function(e) {
    e.preventDefault();
    var t = e.changedTouches[0];
    var dx = Math.abs(t.clientX - towerState._touchStartX);
    var dy = Math.abs(t.clientY - towerState._touchStartY);
    // tap = เคลื่อนน้อยกว่า 10px
    if (dx < 10 && dy < 10 && !towerState.dragging) {
      resumeAudio();
      towerState._touchHandled = true;
      var pt = getCanvasPoint(t.clientX, t.clientY, canvas);
      handleTowerTap(pt.x, pt.y, canvas);
    }
    towerState.dragging = false;
  }, { passive: false });

  // ── Mouse wheel scroll ──────────────────────────
  addHandler('wheel', function(e) {
    e.preventDefault();
    towerState.scrollY = Math.max(0, Math.min(towerState.maxScrollY,
      towerState.scrollY + e.deltaY * 0.5));
  }, { passive: false });

  if (towerState.animId) cancelAnimationFrame(towerState.animId);
  function loop() {
    towerState.frame++;
    renderTower(canvas, ctx);
    towerState.animId = requestAnimationFrame(loop);
  }
  loop();
}

function getCanvasPoint(clientX, clientY, canvas) {
  var rect = canvas.getBoundingClientRect();
  var sx = CONFIG.CANVAS.BASE_WIDTH  / rect.width;
  var sy = CONFIG.CANVAS.BASE_HEIGHT / rect.height;
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
}

function handleTowerTap(cx, cy, canvas) {
  var W = canvas.width, H = canvas.height;
  var save = towerState.save;

  // ── ปุ่ม เมนู (header ซ้าย) ──
  if (cx >= 8 && cx <= 80 && cy >= 6 && cy <= 44) {
    cancelAnimationFrame(towerState.animId);
    towerState._handlers.forEach(function(h) {
      canvas.removeEventListener(h.type, h.fn);
    });
    SCENE.switch('menu', canvas);
    return;
  }

  // ── ปุ่ม Gacha ──
  if (cx >= 8 && cx <= 98 && cy >= H - 38 && cy <= H - 6) {
    cancelAnimationFrame(towerState.animId);
    towerState._handlers.forEach(function(h) {
      canvas.removeEventListener(h.type, h.fn);
    });
    SCENE.switch('gacha', canvas, { save: towerState.save });
    return;
  }

  // ── ปุ่ม Daily Quest ── (render: W/2-94, w=90 → right=W/2-4)
  if (cx >= W / 2 - 94 && cx <= W / 2 - 4 && cy >= H - 38 && cy <= H - 6) {
    cancelAnimationFrame(towerState.animId);
    towerState._handlers.forEach(function(h) {
      canvas.removeEventListener(h.type, h.fn);
    });
    DailyScene.start(canvas, towerState.save, function() {
      SCENE.switch('tower', canvas);
    });
    return;
  }

  // ── ปุ่ม Leaderboard ──
  if (cx >= W / 2 + 2 && cx <= W / 2 + 96 && cy >= H - 38 && cy <= H - 6) {
    cancelAnimationFrame(towerState.animId);
    towerState._handlers.forEach(function(h) {
      canvas.removeEventListener(h.type, h.fn);
    });
    LeaderboardScene.start(canvas, towerState.save, function() {
      SCENE.switch('tower', canvas);
    });
    return;
  }

  // ── floor cells ──
  var floor = hitTestFloor(cx, cy + towerState.scrollY, W);
  if (floor !== null && floor <= save.maxFloor) {
    cancelAnimationFrame(towerState.animId);
    towerState._handlers.forEach(function(h) {
      canvas.removeEventListener(h.type, h.fn);
    });
    save.currentFloor = floor;
    saveProgress(save);
    SCENE.switch('party-select', canvas, { floor: floor, save: save });
  }
}

function hitTestFloor(cx, cy, W) {
  var startX = W * 0.06;
  var cellW = (W * 0.88) / TOWER_COLS;
  var startY = TOWER_START_Y;
  for (var row = 0; row < 12; row++) {
    for (var col = 0; col < TOWER_COLS; col++) {
      var floor = row * TOWER_COLS + col + 1;
      if (floor > 60) break;
      var fx = startX + col * cellW + cellW * 0.05;
      var fy = startY + row * TOWER_ROW_H + 2;
      var fw = cellW * 0.9, fh = 44;
      if (cx >= fx && cx <= fx + fw && cy >= fy && cy <= fy + fh) return floor;
    }
  }
  return null;
}

function renderTower(canvas, ctx) {
  var W = canvas.width, H = canvas.height;
  var save = towerState.save;
  var scroll = towerState.scrollY;

  ctx.fillStyle = '#0d0620'; ctx.fillRect(0, 0, W, H);

  // ── floor grid ──────────────────────────────────
  var startX = W * 0.06;
  var cellW = (W * 0.88) / TOWER_COLS;
  var elemColors = { fire:'#FF6B35', water:'#4ECDC4', thunder:'#FFD93D', wind:'#6BCB77', shadow:'#9933FF', mixed:'#FFD700' };

  for (var row = 0; row < 12; row++) {
    for (var col = 0; col < TOWER_COLS; col++) {
      var floor = row * TOWER_COLS + col + 1;
      if (floor > 60) break;

      var fx = startX + col * cellW + cellW * 0.05;
      var fy = TOWER_START_Y + row * TOWER_ROW_H + 2 - scroll;
      var fw = cellW * 0.9, fh = 44;

      // clip ใต้ header และ footer
      if (fy + fh < TOWER_START_Y || fy > H - 44) continue;

      var isUnlocked = floor <= save.maxFloor;
      var isCurrent  = floor === save.currentFloor;
      var isCleared  = floor < save.maxFloor;

      if (isCurrent) {
        ctx.fillStyle = '#4a2a8e';
        ctx.shadowColor = '#9933FF';
        ctx.shadowBlur = 10 + Math.sin(towerState.frame * 0.1) * 5;
      } else if (isCleared) {
        ctx.fillStyle = '#1a3a1a';
      } else if (isUnlocked) {
        ctx.fillStyle = '#2a1a4e';
      } else {
        ctx.fillStyle = '#111';
      }
      towerRR(ctx, fx, fy, fw, fh, 8); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = isCurrent ? '#9933FF' : isCleared ? '#2d7a3a' : isUnlocked ? '#553388' : '#333';
      ctx.lineWidth = isCurrent ? 2 : 1;
      towerRR(ctx, fx, fy, fw, fh, 8); ctx.stroke();
      ctx.lineWidth = 1;

      ctx.fillStyle = isUnlocked ? '#FFF' : '#555';
      ctx.font = (isCurrent ? 'bold ' : '') + '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isCleared ? '✓ ' + floor : isUnlocked ? String(floor) : '🔒',
        fx + fw / 2, fy + fh / 2 + 5
      );

      if (isUnlocked) {
        var boss = getBossForFloor(floor);
        ctx.fillStyle = elemColors[boss.element] || '#888';
        ctx.font = '9px sans-serif';
        ctx.fillText(boss.element[0].toUpperCase(), fx + fw - 10, fy + 12);
      }
    }
  }
  ctx.textAlign = 'left';

  // ── scroll indicator ────────────────────────────
  if (towerState.maxScrollY > 0) {
    var rows = Math.ceil(60 / TOWER_COLS);
    var gridH = rows * TOWER_ROW_H + 20;
    var visibleH = H - TOWER_START_Y - 44;
    var barH = Math.max(30, (visibleH / gridH) * (H - TOWER_START_Y - 44));
    var barY = TOWER_START_Y + (scroll / towerState.maxScrollY) * (visibleH - barH);
    ctx.fillStyle = 'rgba(150, 100, 255, 0.4)';
    towerRR(ctx, W - 6, barY, 4, barH, 2); ctx.fill();
  }

  // ── header ──────────────────────────────────────
  ctx.fillStyle = '#1a0a3e'; ctx.fillRect(0, 0, W, 52);

  // ปุ่มเมนู
  ctx.fillStyle = '#3d1a6e';
  towerRR(ctx, 8, 8, 68, 36, 8); ctx.fill();
  ctx.strokeStyle = '#6633CC'; ctx.lineWidth = 1;
  towerRR(ctx, 8, 8, 68, 36, 8); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#DDD'; ctx.font = 'bold 13px sans-serif';
  drawIconLabel(ctx, '⬅', 'เมนู', 42, 31, 16);

  // title
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 18px sans-serif';
  drawIconLabel(ctx, '⛰', 'เขาจักรวาล', W / 2, 26, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px sans-serif';
  ctx.textAlign = 'center'; // reset หลัง drawIconLabel — ห้ามลบ
  ctx.fillText('ถึงชั้น ' + save.maxFloor + ' / 60', W / 2, 44);
  ctx.textAlign = 'left';

  // ── footer ──────────────────────────────────────
  ctx.fillStyle = '#1a0a3e'; ctx.fillRect(0, H - 44, W, 44);

  // ปุ่ม Gacha (ซ้าย footer)
  ctx.fillStyle = '#3d0a5e';
  towerRR(ctx, 8, H-38, 90, 32, 8); ctx.fill();
  ctx.strokeStyle = '#9933FF'; ctx.lineWidth = 1;
  towerRR(ctx, 8, H-38, 90, 32, 8); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 11px sans-serif';
  drawIconLabel(ctx, '✨', 'ปลุกเสก', 53, H - 16, 16);

  // ปุ่ม Daily Quest (กลางซ้าย footer)
  ctx.fillStyle = '#0a3e1a';
  towerRR(ctx, W/2 - 94, H-38, 90, 32, 8); ctx.fill();
  ctx.strokeStyle = '#33cc66'; ctx.lineWidth = 1;
  towerRR(ctx, W/2 - 94, H-38, 90, 32, 8); ctx.stroke();
  ctx.fillStyle = '#7fff7f'; ctx.font = 'bold 11px sans-serif';
  drawIconLabel(ctx, '📋', 'ภารกิจ', W/2 - 49, H - 16, 16);

  // ปุ่ม Leaderboard (กลางขวา footer)
  ctx.fillStyle = '#1a0a3e';
  towerRR(ctx, W/2 + 2, H-38, 90, 32, 8); ctx.fill();
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1;
  towerRR(ctx, W/2 + 2, H-38, 90, 32, 8); ctx.stroke();
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 11px sans-serif';
  drawIconLabel(ctx, '🏆', 'อันดับ', W/2 + 47, H - 16, 16);

  // Crystal count (ขวาสุด)
  ctx.fillStyle = '#4ECDC4'; ctx.font = 'bold 11px sans-serif';
  drawIconLabel(ctx, '💎', String(save.crystals), W - 32, H - 16, 16);
  ctx.textAlign = 'left';

  // ── scroll hint (ครั้งแรก) ──────────────────────
  if (towerState.frame < 120 && towerState.maxScrollY > 0) {
    var alpha = Math.min(1, (120 - towerState.frame) / 40);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(W / 2 - 70, H - 90, 140, 30);
    ctx.fillStyle = '#FFD700'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('↕ เลื่อนเพื่อดูชั้นต่างๆ', W / 2, H - 70);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
}

function towerRR(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
