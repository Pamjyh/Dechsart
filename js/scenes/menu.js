// scenes/menu.js — หน้าแรก

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

  if (menuState._handler) canvas.removeEventListener('click', menuState._handler);
  menuState._handler = function(e) {
    resumeAudio();
    var rect = canvas.getBoundingClientRect();
    var sx = CONFIG.CANVAS.BASE_WIDTH / rect.width;
    var sy = CONFIG.CANVAS.BASE_HEIGHT / rect.height;
    var cx = (e.clientX - rect.left) * sx;
    var cy = (e.clientY - rect.top) * sy;
    var W = canvas.width, H = canvas.height;
    var btnW = 240, btnH = 56;
    var bx = (W - btnW) / 2, by = H * 0.62;
    if (cx >= bx && cx <= bx + btnW && cy >= by && cy <= by + btnH) {
      cancelAnimationFrame(menuState.animId);
      canvas.removeEventListener('click', menuState._handler);
      SCENE.switch('tower', canvas);
    }
  };
  canvas.addEventListener('click', menuState._handler);
  loop();
}

function renderMenu(canvas, ctx) {
  var W = canvas.width, H = canvas.height;
  var f = menuState.frame;

  // BG
  var menuBg = ASSETS && ASSETS.bg && ASSETS.bg.menu;
  if (imgReady(menuBg)) {
    ctx.drawImage(menuBg, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, W, H);
  } else {
    var bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0, '#0d0620'); bg.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  }

  // stars
  ctx.fillStyle = '#fff';
  for (var i = 0; i < 50; i++) {
    var sx = (i*137.5) % W, sy = (i*97.3) % (H*0.8);
    ctx.globalAlpha = (Math.sin(f*0.03+i)*0.3+0.7)*0.6;
    ctx.beginPath(); ctx.arc(sx,sy,i%3===0?1.5:1,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // logo glow
  var grd = ctx.createRadialGradient(W/2,H*0.28,10,W/2,H*0.28,W*0.45);
  grd.addColorStop(0,'rgba(150,80,255,0.3)'); grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);

  // title
  ctx.textAlign = 'center';
  ctx.font = 'bold 36px sans-serif';
  ctx.strokeStyle = '#6600CC'; ctx.lineWidth = 4;
  ctx.strokeText('เดชศาสตร์อนันต์', W/2, H*0.25);
  ctx.fillStyle = '#FFD700'; ctx.fillText('เดชศาสตร์อนันต์', W/2, H*0.25);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#CC99FF';
  ctx.fillText('วีรบุรุษพลิกสูตรจักรวาล', W/2, H*0.33);

  // hero preview (วาด 3 ตัว)
  var heroList = [HEROES.devasri, HEROES.garuda, HEROES.narai];
  heroList.forEach(function(h, i) {
    var hx = W/2 + (i-1)*105;
    var hy = H*0.50;
    h.draw(ctx, hx, hy, 60, f);
  });

  // start button
  var bW = 240, bH = 56, bx = (W-bW)/2, by = H*0.62;
  var pulse = Math.sin(f*0.08)*8;
  ctx.shadowColor = '#9933FF'; ctx.shadowBlur = 15 + pulse;
  ctx.fillStyle = '#3d1a6e';
  menuRoundRect(ctx, bx, by, bW, bH, 12); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#9933FF'; ctx.lineWidth = 2;
  menuRoundRect(ctx, bx, by, bW, bH, 12); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('⚔️ เริ่มผจญภัย', W/2, by+bH/2+8);

  // version
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px sans-serif';
  ctx.fillText('Phase 2 Beta', W/2, H*0.95);
  ctx.textAlign = 'left';
}

function menuRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
