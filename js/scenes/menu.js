// scenes/menu.js — หน้าปก Chibi Thai Fantasy style

var menuState = { frame: 0, animId: null };

function initMenu(canvas) {
  menuState.frame = 0;
  var ctx = canvas.getContext('2d');

  function loop() {
    menuState.frame++;
    renderMenu(canvas, ctx);
    menuState.animId = requestAnimationFrame(loop);
  }

  if (menuState.animId) cancelAnimationFrame(menuState.animId);
  if (menuState._handler)      canvas.removeEventListener('click',      menuState._handler);
  if (menuState._touchHandler) canvas.removeEventListener('touchstart', menuState._touchHandler);

  function menuTap(clientX, clientY) {
    resumeAudio();
    var rect = canvas.getBoundingClientRect();
    var sx = CONFIG.CANVAS.BASE_WIDTH  / rect.width;
    var sy = CONFIG.CANVAS.BASE_HEIGHT / rect.height;
    var cx = (clientX - rect.left) * sx;
    var cy = (clientY - rect.top)  * sy;
    var W = canvas.width, H = canvas.height;
    var btnW = 260, btnH = 60;
    var bx = (W - btnW) / 2, by = H * 0.82;
    if (cx >= bx && cx <= bx + btnW && cy >= by && cy <= by + btnH) {
      cancelAnimationFrame(menuState.animId);
      canvas.removeEventListener('click',      menuState._handler);
      canvas.removeEventListener('touchstart', menuState._touchHandler);
      SCENE.switch('tower', canvas);
    }
  }

  menuState._handler = function(e) {
    if (menuState._touchHandled) { menuState._touchHandled = false; return; }
    menuTap(e.clientX, e.clientY);
  };
  menuState._touchHandler = function(e) {
    e.preventDefault();
    menuState._touchHandled = true;
    menuTap(e.touches[0].clientX, e.touches[0].clientY);
  };

  canvas.addEventListener('click', menuState._handler);
  canvas.addEventListener('touchstart', menuState._touchHandler, { passive: false });
  loop();
}

// ── Chibi draw helpers ────────────────────────────────────────────

function chibiFace(ctx, x, y, r, skinColor, eyeColor) {
  // หัวกลมใหญ่ (Chibi signature)
  ctx.fillStyle = skinColor;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  // แก้มชมพู
  ctx.fillStyle = 'rgba(255,150,120,0.35)';
  ctx.beginPath(); ctx.ellipse(x - r*0.5, y + r*0.15, r*0.28, r*0.18, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r*0.5, y + r*0.15, r*0.28, r*0.18, 0, 0, Math.PI*2); ctx.fill();
  // ตา (chibi ใหญ่เป็นครึ่งวงกลม)
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath(); ctx.ellipse(x - r*0.3, y - r*0.05, r*0.18, r*0.22, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r*0.3, y - r*0.05, r*0.18, r*0.22, 0, 0, Math.PI*2); ctx.fill();
  // highlight ตา
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r*0.24, y - r*0.12, r*0.07, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r*0.36, y - r*0.12, r*0.07, 0, Math.PI*2); ctx.fill();
  // ปาก (รอยยิ้มเล็ก)
  ctx.strokeStyle = '#c06040';
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y + r*0.25, r*0.15, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.lineWidth = 1; ctx.lineCap = 'butt';
}

// Chibi body (ตัวเล็กกลม แบบ chibi)
function chibiBody(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI*2);
  ctx.fill();
}

// ── Chibi เทวดาศรี (ไฟ) ─────────────────────────────────────────
function drawChibiDevasri(ctx, x, y, scale, frame) {
  var b = Math.sin(frame * 0.05) * 3 * scale;
  var r = 28 * scale;

  // รัศมีกลอรี่
  var glow = ctx.createRadialGradient(x, y + b, r*0.5, x, y + b, r*2.2);
  glow.addColorStop(0, 'rgba(255,200,60,0.35)');
  glow.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y + b, r*2.2, 0, Math.PI*2); ctx.fill();

  // ปีกแองเจิล (chibi ปีกเล็กน่ารัก)
  ctx.fillStyle = 'rgba(255,240,180,0.9)';
  ctx.beginPath();
  ctx.ellipse(x - r*1.1, y - r*0.3 + b, r*0.55, r*0.85, -0.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + r*1.1, y - r*0.3 + b, r*0.55, r*0.85, 0.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = scale;
  ctx.beginPath(); ctx.ellipse(x - r*1.1, y - r*0.3 + b, r*0.55, r*0.85, -0.5, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + r*1.1, y - r*0.3 + b, r*0.55, r*0.85, 0.5, 0, Math.PI*2); ctx.stroke();
  ctx.lineWidth = 1;

  // ตัว (chibi เล็ก)
  chibiBody(ctx, x, y + r*1.15 + b, r*0.68, r*0.55, '#FF8C00');
  // ชุดลายไทย (แถบทอง)
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = scale * 1.5;
  ctx.beginPath(); ctx.arc(x, y + r*1.15 + b, r*0.4, -Math.PI*0.7, Math.PI*0.7); ctx.stroke();
  ctx.lineWidth = 1;

  // มงกุฎ
  ctx.fillStyle = '#FFD700';
  for (var i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i*r*0.25, y - r*0.88 + b);
    ctx.lineTo(x + i*r*0.25 - r*0.1, y - r*1.1 + b);
    ctx.lineTo(x + i*r*0.25 + r*0.1, y - r*1.1 + b);
    ctx.closePath(); ctx.fill();
  }

  // หัว
  chibiFace(ctx, x, y + b, r, '#FFDCA0', '#c06000');

  // ขาน้อยๆ
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath(); ctx.ellipse(x - r*0.22, y + r*1.72 + b, r*0.18, r*0.24, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r*0.22, y + r*1.72 + b, r*0.18, r*0.24, 0, 0, Math.PI*2); ctx.fill();
}

// ── Chibi ครุฑราช (ฟ้า) ──────────────────────────────────────────
function drawChibiGaruda(ctx, x, y, scale, frame) {
  var b = Math.sin(frame * 0.04 + 1) * 4 * scale;
  var r = 26 * scale;

  // ปีกครุฑใหญ่ (เด่นมาก)
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(x, y + b);
  ctx.bezierCurveTo(x - r*2, y - r*1.2 + b, x - r*2.8, y + r*0.5 + b, x - r*1.5, y + r*0.8 + b);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y + b);
  ctx.bezierCurveTo(x + r*2, y - r*1.2 + b, x + r*2.8, y + r*0.5 + b, x + r*1.5, y + r*0.8 + b);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#FF9900'; ctx.lineWidth = scale * 1.5;
  ctx.beginPath();
  ctx.moveTo(x - r*0.3, y - r*0.2 + b);
  ctx.bezierCurveTo(x - r*1.4, y - r*0.8 + b, x - r*2, y + r*0.3 + b, x - r*1.2, y + r*0.7 + b);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + r*0.3, y - r*0.2 + b);
  ctx.bezierCurveTo(x + r*1.4, y - r*0.8 + b, x + r*2, y + r*0.3 + b, x + r*1.2, y + r*0.7 + b);
  ctx.stroke();
  ctx.lineWidth = 1;

  // ตัว
  chibiBody(ctx, x, y + r*1.05 + b, r*0.62, r*0.5, '#E8A000');
  // หัว
  chibiFace(ctx, x, y + b, r, '#FFE0A0', '#996600');
  // จะงอยปาก (chibi) เล็กน่ารัก
  ctx.fillStyle = '#FF8800';
  ctx.beginPath();
  ctx.moveTo(x - r*0.12, y + r*0.18 + b);
  ctx.lineTo(x + r*0.12, y + r*0.18 + b);
  ctx.lineTo(x, y + r*0.38 + b);
  ctx.closePath(); ctx.fill();
  // หน้าผากครุฑ (แดงสด)
  ctx.fillStyle = '#CC2200';
  ctx.beginPath(); ctx.ellipse(x, y - r*0.82 + b, r*0.22, r*0.14, 0, 0, Math.PI*2); ctx.fill();
}

// ── Chibi นาคาเงิน (น้ำ) ─────────────────────────────────────────
function drawChibiNaka(ctx, x, y, scale, frame) {
  var b = Math.sin(frame * 0.035 + 2) * 3 * scale;
  var r = 25 * scale;

  // หางนาคโค้ง (แทนขา)
  ctx.strokeStyle = '#5BC8DC';
  ctx.lineWidth = r * 0.55;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + r*1.3 + b);
  ctx.quadraticCurveTo(x + r*1.4, y + r*2.0 + b, x + r*0.4, y + r*2.6 + b);
  ctx.stroke();
  ctx.strokeStyle = '#90E0EF'; ctx.lineWidth = r * 0.28;
  ctx.beginPath();
  ctx.moveTo(x, y + r*1.3 + b);
  ctx.quadraticCurveTo(x + r*1.4, y + r*2.0 + b, x + r*0.4, y + r*2.6 + b);
  ctx.stroke();
  ctx.lineWidth = 1; ctx.lineCap = 'butt';

  // เกล็ดนาค (เส้นโค้งเล็ก)
  ctx.strokeStyle = 'rgba(144,224,239,0.7)'; ctx.lineWidth = scale;
  for (var i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + (i-1)*r*0.28, y + r*(1.5 + i*0.3) + b, r*0.18, 0, Math.PI);
    ctx.stroke();
  }
  ctx.lineWidth = 1;

  // ตัว
  chibiBody(ctx, x, y + r*1.05 + b, r*0.6, r*0.48, '#4EC9E0');
  // อัญมณีหน้าอก
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.arc(x, y + r*1.0 + b, r*0.14, 0, Math.PI*2); ctx.fill();

  // หัว
  chibiFace(ctx, x, y + b, r, '#B8EEF8', '#0077AA');
  // มงกุฎนาค (7 ยอด แบบย่อ)
  ctx.fillStyle = '#00AADD';
  for (var j = -2; j <= 2; j++) {
    var h2 = j === 0 ? r*0.45 : r*0.3;
    ctx.beginPath();
    ctx.moveTo(x + j*r*0.2 - r*0.08, y - r*0.88 + b);
    ctx.lineTo(x + j*r*0.2, y - r*0.88 - h2 + b);
    ctx.lineTo(x + j*r*0.2 + r*0.08, y - r*0.88 + b);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.arc(x, y - r*0.88 - r*0.45 + b, r*0.1, 0, Math.PI*2); ctx.fill();
}

// ── Chibi หนุมาน (ไฟ/ลม) ─────────────────────────────────────────
function drawChibiHanuman(ctx, x, y, scale, frame) {
  var b = Math.sin(frame * 0.06 + 0.5) * 2 * scale;
  var r = 24 * scale;

  // หางหนุมาน (ม้วนขึ้น)
  ctx.strokeStyle = '#DDD'; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r*0.5, y + r*1.3 + b);
  ctx.quadraticCurveTo(x - r*1.6, y + r*1.8 + b, x - r*1.2, y + r*0.5 + b);
  ctx.quadraticCurveTo(x - r*1.0, y - r*0.3 + b, x - r*0.6, y - r*0.0 + b);
  ctx.stroke();
  ctx.lineWidth = 1; ctx.lineCap = 'butt';

  // กระบองทอง
  ctx.fillStyle = '#C8A000';
  ctx.fillRect(x + r*0.5 - r*0.08, y - r*1.0 + b, r*0.16, r*1.4);
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.arc(x + r*0.5, y - r*1.05 + b, r*0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r*0.5, y + r*0.42 + b, r*0.15, 0, Math.PI*2); ctx.fill();

  // ตัวขาว
  chibiBody(ctx, x, y + r*1.0 + b, r*0.6, r*0.5, '#F0F0E8');
  // หัวลิง (chibi) — หน้าปาก
  ctx.fillStyle = '#F5F5EE';
  ctx.beginPath(); ctx.arc(x, y + b, r, 0, Math.PI*2); ctx.fill();
  // หน้าปาก (สีชมพู)
  ctx.fillStyle = '#FFCCAA';
  ctx.beginPath(); ctx.ellipse(x, y + r*0.2 + b, r*0.45, r*0.32, 0, 0, Math.PI*2); ctx.fill();
  // ตา
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.ellipse(x - r*0.3, y - r*0.1 + b, r*0.15, r*0.18, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r*0.3, y - r*0.1 + b, r*0.15, r*0.18, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r*0.25, y - r*0.16 + b, r*0.06, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r*0.36, y - r*0.16 + b, r*0.06, 0, Math.PI*2); ctx.fill();
  // ปาก
  ctx.strokeStyle = '#c06040'; ctx.lineWidth = r*0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y + r*0.28 + b, r*0.16, 0.1, Math.PI - 0.1); ctx.stroke();
  ctx.lineWidth = 1; ctx.lineCap = 'butt';
  // หูลิง
  ctx.fillStyle = '#F5F5EE';
  ctx.beginPath(); ctx.arc(x - r*0.9, y - r*0.2 + b, r*0.28, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r*0.9, y - r*0.2 + b, r*0.28, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FFBBAA';
  ctx.beginPath(); ctx.arc(x - r*0.9, y - r*0.2 + b, r*0.16, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r*0.9, y - r*0.2 + b, r*0.16, 0, Math.PI*2); ctx.fill();
  // ขาน้อย
  ctx.fillStyle = '#E8E8E0';
  ctx.beginPath(); ctx.ellipse(x - r*0.22, y + r*1.52 + b, r*0.18, r*0.22, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r*0.22, y + r*1.52 + b, r*0.18, r*0.22, 0, 0, Math.PI*2); ctx.fill();
}

// ── ดอกบัว decoration ────────────────────────────────────────────
function drawLotus(ctx, x, y, size, alpha) {
  ctx.globalAlpha = alpha;
  var petals = 6;
  for (var i = 0; i < petals; i++) {
    var angle = (i / petals) * Math.PI * 2 - Math.PI/2;
    ctx.fillStyle = i % 2 === 0 ? '#FF9EC4' : '#FFB8D4';
    ctx.beginPath();
    ctx.ellipse(
      x + Math.cos(angle) * size * 0.55,
      y + Math.sin(angle) * size * 0.55,
      size * 0.3, size * 0.55, angle, 0, Math.PI * 2
    );
    ctx.fill();
  }
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.arc(x, y, size * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// ── sparkle ─────────────────────────────────────────────────────
function drawSparkle(ctx, x, y, size, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  for (var i = 0; i < 4; i++) {
    var a = (i / 4) * Math.PI * 2;
    var a2 = a + Math.PI / 4;
    ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size);
    ctx.lineTo(x + Math.cos(a2) * size * 0.35, y + Math.sin(a2) * size * 0.35);
  }
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
}

// ── Main render ──────────────────────────────────────────────────
function renderMenu(canvas, ctx) {
  var W = canvas.width, H = canvas.height;
  var f = menuState.frame;

  // ── Background ──────────────────────────────────────────────
  var menuBg = ASSETS && ASSETS.bg && ASSETS.bg.menu;
  if (imgReady(menuBg)) {
    ctx.drawImage(menuBg, 0, 0, W, H);
    // overlay ทำให้ chibi อ่านง่ายขึ้น
    var overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0,   'rgba(10,4,30,0.55)');
    overlay.addColorStop(0.4, 'rgba(10,4,30,0.20)');
    overlay.addColorStop(0.7, 'rgba(10,4,30,0.10)');
    overlay.addColorStop(1,   'rgba(10,4,30,0.65)');
    ctx.fillStyle = overlay; ctx.fillRect(0, 0, W, H);
  } else {
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   '#0a0420');
    bg.addColorStop(0.5, '#1a0a3a');
    bg.addColorStop(1,   '#0d1a0a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  }

  // ── Stars ────────────────────────────────────────────────────
  for (var i = 0; i < 55; i++) {
    var sx = (i * 137.5) % W, sy = (i * 97.3) % (H * 0.55);
    ctx.globalAlpha = (Math.sin(f * 0.03 + i) * 0.3 + 0.7) * 0.5;
    ctx.fillStyle = i % 4 === 0 ? '#FFD700' : '#ffffff';
    ctx.beginPath(); ctx.arc(sx, sy, i % 5 === 0 ? 1.8 : 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Sparkles ลอยรอบตัวละคร ──────────────────────────────────
  var sparkleData = [
    [W*0.12, H*0.55, 6],  [W*0.88, H*0.52, 5],
    [W*0.22, H*0.72, 4],  [W*0.78, H*0.68, 7],
    [W*0.05, H*0.65, 4],  [W*0.92, H*0.63, 5],
  ];
  sparkleData.forEach(function(s, idx) {
    var pulse = Math.abs(Math.sin(f * 0.04 + idx * 1.3));
    drawSparkle(ctx, s[0], s[1] + Math.sin(f*0.03+idx)*6, s[2] * pulse, pulse * 0.8);
  });

  // ── ดอกบัวล่าง ───────────────────────────────────────────────
  var lotusData = [
    [W*0.1,  H*0.91, 28, 0.6],
    [W*0.88, H*0.93, 22, 0.5],
    [W*0.55, H*0.95, 18, 0.45],
    [W*0.3,  H*0.97, 16, 0.4],
  ];
  lotusData.forEach(function(l) {
    drawLotus(ctx, l[0], l[1] + Math.sin(f*0.025)*3, l[2], l[3]);
  });

  // ── subtitle ไทย (DECHSART/INFINITY อยู่ใน bg PNG แล้ว) ────
  ctx.textAlign = 'center';
  ctx.shadowBlur = 0;
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255,220,255,0.7)';
  ctx.fillText('เดชศาสตร์อนันต์ · วีรบุรุษพลิกสูตรจักรวาล', W/2, H*0.215);

  // ── ปุ่ม START ───────────────────────────────────────────────
  var btnW = 260, btnH = 60;
  var bx = (W - btnW) / 2, by = H * 0.82;
  var pulse = Math.sin(f * 0.07) * 10;

  // กรอบเรืองแสง
  ctx.shadowColor = '#CC44FF'; ctx.shadowBlur = 18 + pulse;
  // bg ปุ่ม gradient ไทย
  var btnGrad = ctx.createLinearGradient(bx, by, bx + btnW, by + btnH);
  btnGrad.addColorStop(0, '#4a0e8f');
  btnGrad.addColorStop(0.5, '#6a1ab0');
  btnGrad.addColorStop(1, '#3a0a6f');
  ctx.fillStyle = btnGrad;
  menuRoundRect(ctx, bx, by, btnW, btnH, 30); ctx.fill();
  ctx.shadowBlur = 0;

  // ขอบทอง
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
  menuRoundRect(ctx, bx, by, btnW, btnH, 30); ctx.stroke();
  // เส้นขอบนอก (ม่วง)
  ctx.strokeStyle = 'rgba(200,100,255,0.5)'; ctx.lineWidth = 4;
  menuRoundRect(ctx, bx - 2, by - 2, btnW + 4, btnH + 4, 32); ctx.stroke();
  ctx.lineWidth = 1;

  // ข้อความปุ่ม
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('⚔️  เริ่มผจญภัย', W/2, by + btnH/2 + 9);

  // ── version ────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = '11px sans-serif';
  ctx.fillText('Phase 4 · pamjyh.github.io', W/2, H * 0.975);
  ctx.textAlign = 'left';
}

function menuRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y); ctx.closePath();
}
