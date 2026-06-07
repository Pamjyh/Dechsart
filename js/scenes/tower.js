// scenes/tower.js — เลือกชั้น + แสดง progress

var towerState = { frame:0, animId:null, save:null, scrollY:0, _handler:null, _touchHandler:null };

function initTower(canvas) {
  towerState.frame = 0;
  towerState.save  = loadProgress();
  towerState.scrollY = 0;
  var ctx = canvas.getContext('2d');

  if (towerState.animId) cancelAnimationFrame(towerState.animId);
  if (towerState._handler) canvas.removeEventListener('click', towerState._handler);

  towerState._handler = function(e) {
    resumeAudio();
    var rect = canvas.getBoundingClientRect();
    var sx = CONFIG.CANVAS.BASE_WIDTH / rect.width;
    var sy = CONFIG.CANVAS.BASE_HEIGHT / rect.height;
    var cx = (e.clientX - rect.left) * sx;
    var cy = (e.clientY - rect.top) * sy + towerState.scrollY;
    var W = canvas.width;

    var floor = hitTestFloor(cx, cy, W);
    if (floor !== null && floor <= towerState.save.maxFloor) {
      cancelAnimationFrame(towerState.animId);
      canvas.removeEventListener('click', towerState._handler);
      towerState.save.currentFloor = floor;
      saveProgress(towerState.save);
      SCENE.switch('battle', canvas, { floor: floor, save: towerState.save });
    }
  };
  canvas.addEventListener('click', towerState._handler);

  function loop() {
    towerState.frame++;
    renderTower(canvas, ctx);
    towerState.animId = requestAnimationFrame(loop);
  }
  loop();
}

function hitTestFloor(cx, cy, W) {
  var cols = 5, cellW = (W*0.88)/cols, startX = W*0.06;
  var startY = 80;
  for (var row = 0; row < 12; row++) {
    for (var col = 0; col < cols; col++) {
      var floor = row * cols + col + 1;
      if (floor > 60) break;
      var fx = startX + col * cellW + cellW*0.05;
      var fy = startY + row * 52 + 2;
      var fw = cellW * 0.9, fh = 44;
      if (cx >= fx && cx <= fx+fw && cy >= fy && cy <= fy+fh) return floor;
    }
  }
  return null;
}

function renderTower(canvas, ctx) {
  var W = canvas.width, H = canvas.height;
  var f = towerState.frame;
  var save = towerState.save;

  ctx.fillStyle = '#0d0620'; ctx.fillRect(0,0,W,H);

  // header
  ctx.fillStyle = '#1a0a3e'; ctx.fillRect(0,0,W,56);
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('⛰ เขาจักรวาล', W/2, 36);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif';
  ctx.fillText('ถึงชั้น ' + save.maxFloor + ' / 60', W/2, 50);
  ctx.textAlign = 'left';

  // floor grid
  var cols = 5, cellW = (W*0.88)/cols, startX = W*0.06;
  var startY = 68 - towerState.scrollY;

  for (var row = 0; row < 12; row++) {
    for (var col = 0; col < cols; col++) {
      var floor = row * cols + col + 1;
      if (floor > 60) break;

      var fx = startX + col * cellW + cellW*0.05;
      var fy = startY + row * 52 + 2;
      var fw = cellW * 0.9, fh = 44;

      if (fy + fh < 56 || fy > H) continue; // clip

      var isUnlocked = floor <= save.maxFloor;
      var isCurrent  = floor === save.currentFloor;
      var isCleared  = floor < save.maxFloor;

      // cell bg
      if (isCurrent) {
        ctx.fillStyle = '#4a2a8e';
        ctx.shadowColor = '#9933FF'; ctx.shadowBlur = 10 + Math.sin(f*0.1)*5;
      } else if (isCleared) {
        ctx.fillStyle = '#1a3a1a';
      } else if (isUnlocked) {
        ctx.fillStyle = '#2a1a4e';
      } else {
        ctx.fillStyle = '#111';
      }
      towerRoundRect(ctx, fx, fy, fw, fh, 8); ctx.fill();
      ctx.shadowBlur = 0;

      // border
      ctx.strokeStyle = isCurrent ? '#9933FF' : isCleared ? '#2d7a3a' : isUnlocked ? '#553388' : '#333';
      ctx.lineWidth = isCurrent ? 2 : 1;
      towerRoundRect(ctx, fx, fy, fw, fh, 8); ctx.stroke();
      ctx.lineWidth = 1;

      // floor number
      ctx.fillStyle = isUnlocked ? '#FFF' : '#555';
      ctx.font = (isCurrent ? 'bold ' : '') + '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isCleared ? '✓ ' + floor : isUnlocked ? String(floor) : '🔒',
        fx + fw/2, fy + fh/2 + 5
      );

      // boss element badge
      if (isUnlocked) {
        var boss = getBossForFloor(floor);
        var elemColors = { fire:'#FF6B35', water:'#4ECDC4', thunder:'#FFD93D', wind:'#6BCB77', shadow:'#9933FF', mixed:'#FFD700' };
        ctx.fillStyle = elemColors[boss.element] || '#888';
        ctx.font = '9px sans-serif';
        ctx.fillText(boss.element[0].toUpperCase(), fx+fw-10, fy+12);
      }
    }
  }
  ctx.textAlign = 'left';

  // score footer
  ctx.fillStyle = '#1a0a3e'; ctx.fillRect(0, H-44, W, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('คะแนนสะสม: ' + save.totalScore + '  |  เล่นแล้ว: ' + save.gamesPlayed + ' ครั้ง', W/2, H-16);
  ctx.textAlign = 'left';
}

function towerRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
