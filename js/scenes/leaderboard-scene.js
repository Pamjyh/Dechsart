// leaderboard-scene.js — Daily Damage Leaderboard (Phase 5)
// Canvas scene: top 30, badge top 3, toggle global / ห้องเรียน

var LeaderboardScene = (function () {

  var _state = {
    canvas: null, ctx: null, animId: null, save: null,
    onBack: null,
    mode: 'global',    // 'global' | 'classroom'
    rows: null,        // null = loading, [] = empty/loaded
    loadError: false,
    frame: 0,
    _handlers: []
  };

  // ── Public API ─────────────────────────────────────────────────
  function start(canvas, save, onBack) {
    _state.canvas    = canvas;
    _state.ctx       = canvas.getContext('2d');
    _state.save      = save;
    _state.onBack    = onBack;
    _state.frame     = 0;
    _state.rows      = null;
    _state.loadError = false;
    _state.mode      = save.classroomCode ? 'classroom' : 'global';

    _removeHandlers();
    _attachHandlers();
    _fetchData();

    if (_state.animId) cancelAnimationFrame(_state.animId);
    function loop() {
      _state.frame++;
      _render();
      _state.animId = requestAnimationFrame(loop);
    }
    loop();
  }

  function stop() {
    if (_state.animId) cancelAnimationFrame(_state.animId);
    _removeHandlers();
  }

  // ── Data ───────────────────────────────────────────────────────
  function _fetchData() {
    _state.rows      = null;
    _state.loadError = false;
    var date        = SUPA.todayStr();
    var code        = _state.mode === 'classroom' ? _state.save.classroomCode : null;
    if (!SUPA.isReady()) {
      // offline: แสดง placeholder
      _state.rows = [];
      _state.loadError = true;
      return;
    }
    SUPA.getLeaderboard(date, code, function (rows) {
      _state.rows = rows || [];
    });
  }

  // ── Render ─────────────────────────────────────────────────────
  function _render() {
    var canvas = _state.canvas;
    var ctx    = _state.ctx;
    var W = canvas.width, H = canvas.height;
    var save  = _state.save;
    var frame = _state.frame;

    // BG
    ctx.fillStyle = '#0d0620'; ctx.fillRect(0, 0, W, H);
    // stars
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (var s = 0; s < 20; s++) {
      var sx = (s * 137.5) % W;
      var sy = (s * 97.3)  % H;
      var ss = 1 + (s % 3) * 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill();
    }

    // ── Header ──────────────────────────────────────────────────
    ctx.fillStyle = '#1a0a3e'; ctx.fillRect(0, 0, W, 52);
    // ปุ่มกลับ
    _lbRR(ctx, 8, 8, 68, 36, 8);
    ctx.fillStyle = '#3d1a6e'; ctx.fill();
    ctx.strokeStyle = '#6633CC'; ctx.lineWidth = 1; _lbRR(ctx, 8, 8, 68, 36, 8); ctx.stroke();
    ctx.fillStyle = '#DDD'; ctx.font = 'bold 13px sans-serif';
    drawIconLabel(ctx, '⬅', 'กลับ', 42, 31, 16);

    // title
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 18px sans-serif';
    drawIconLabel(ctx, '🏆', 'อันดับวันนี้', W / 2, 26, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(SUPA.todayStr(), W / 2, 44);
    ctx.textAlign = 'left';

    // ── Mode toggle ─────────────────────────────────────────────
    var tY = 58, tH = 32;
    var globalActive    = _state.mode === 'global';
    var classroomActive = _state.mode === 'classroom';

    // Global tab
    _lbRR(ctx, 8, tY, W / 2 - 12, tH, 6);
    ctx.fillStyle = globalActive ? '#4a2a8e' : '#1e1030'; ctx.fill();
    ctx.strokeStyle = globalActive ? '#9933FF' : '#443';
    ctx.lineWidth = 1; _lbRR(ctx, 8, tY, W / 2 - 12, tH, 6); ctx.stroke();
    ctx.fillStyle = globalActive ? '#FFD700' : '#888'; ctx.font = 'bold 12px sans-serif';
    drawIconLabel(ctx, '🌐', 'ทั่วโลก', W / 4, tY + 20, 16);

    // Classroom tab
    _lbRR(ctx, W / 2 + 4, tY, W / 2 - 12, tH, 6);
    ctx.fillStyle = classroomActive ? '#0a3e1a' : '#1e1030'; ctx.fill();
    ctx.strokeStyle = classroomActive ? '#33cc66' : '#443';
    ctx.lineWidth = 1; _lbRR(ctx, W / 2 + 4, tY, W / 2 - 12, tH, 6); ctx.stroke();
    ctx.fillStyle = classroomActive ? '#7fff7f' : '#888'; ctx.font = 'bold 12px sans-serif';
    drawIconLabel(ctx, '🏫', 'ห้องเรียน', W * 3 / 4, tY + 20, 16);

    // ── Body ────────────────────────────────────────────────────
    var listY = tY + tH + 8;
    var listH = H - listY - 56;

    if (_state.rows === null) {
      // loading
      var dots = '.'.repeat((Math.floor(frame / 20) % 4));
      ctx.fillStyle = '#AAA'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('กำลังโหลด' + dots, W / 2, listY + listH / 2);
      ctx.textAlign = 'left';
    } else if (_state.loadError || !SUPA.isReady()) {
      ctx.fillStyle = '#FF9999'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚠️ ยังไม่ได้ตั้งค่า Supabase', W / 2, listY + 30);
      ctx.fillStyle = '#888'; ctx.font = '11px sans-serif';
      ctx.fillText('ใส่ URL + ANON_KEY ใน config.js', W / 2, listY + 50);
      ctx.textAlign = 'left';
    } else if (_state.rows.length === 0) {
      ctx.fillStyle = '#888'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('ยังไม่มีข้อมูลวันนี้', W / 2, listY + listH / 2 - 10);
      ctx.fillStyle = '#555'; ctx.font = '11px sans-serif';
      ctx.fillText('เล่นและเอาชนะบอสเพื่อขึ้นอันดับ!', W / 2, listY + listH / 2 + 12);
      ctx.textAlign = 'left';
    } else {
      _renderRows(ctx, W, listY, listH);
    }

    // ── Footer ─────────────────────────────────────────────────
    ctx.fillStyle = '#1a0a3e'; ctx.fillRect(0, H - 50, W, 50);
    // ปุ่มเข้าห้องเรียน
    _lbRR(ctx, 8, H - 42, W - 16, 34, 8);
    ctx.fillStyle = '#0a2e40'; ctx.fill();
    ctx.strokeStyle = '#33aaff'; ctx.lineWidth = 1;
    _lbRR(ctx, 8, H - 42, W - 16, 34, 8); ctx.stroke();
    ctx.fillStyle = '#66CCFF'; ctx.font = 'bold 13px sans-serif';
    if (save.classroomCode) {
      drawIconLabel(ctx, '🏫', 'ห้อง: ' + save.classroomCode + '   (กดเพื่อเปลี่ยน)', W / 2, H - 20, 16);
    } else {
      drawIconLabel(ctx, '🏫', 'เข้าห้องเรียน — กรอกรหัส 6 ตัว', W / 2, H - 20, 16);
    }
    ctx.textAlign = 'left';
  }

  function _renderRows(ctx, W, listY, listH) {
    var rows  = _state.rows;
    var rowH  = 40;
    var padX  = 10;
    var BADGE = ['🥇', '🥈', '🥉'];

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, listY, W, listH);
    ctx.clip();

    for (var i = 0; i < rows.length; i++) {
      var r  = rows[i];
      var ry = listY + i * rowH + 2;
      if (ry > listY + listH) break;

      // row bg
      _lbRR(ctx, padX, ry, W - padX * 2, rowH - 4, 6);
      ctx.fillStyle = i < 3 ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.04)';
      ctx.fill();
      ctx.strokeStyle = i < 3 ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1; _lbRR(ctx, padX, ry, W - padX * 2, rowH - 4, 6); ctx.stroke();

      // rank badge / number
      ctx.textAlign = 'center';
      if (i < 3) {
        ctx.font = '18px sans-serif';
        ctx.fillText(BADGE[i], padX + 22, ry + rowH - 12);
      } else {
        ctx.fillStyle = '#888'; ctx.font = 'bold 13px sans-serif';
        ctx.fillText(String(i + 1), padX + 22, ry + rowH - 12);
      }

      // nickname
      ctx.textAlign = 'left';
      ctx.fillStyle = i < 3 ? '#FFD700' : '#DDD';
      ctx.font = (i < 3 ? 'bold ' : '') + '13px sans-serif';
      // truncate ถ้ายาวเกิน
      var nick = r.nickname.length > 14 ? r.nickname.slice(0, 13) + '…' : r.nickname;
      ctx.fillText(nick, padX + 44, ry + rowH - 12);

      // damage
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FF9944'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText('⚔ ' + r.damage_dealt, W - padX - 4, ry + rowH - 12);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  // ── Event Handlers ─────────────────────────────────────────────
  function _attachHandlers() {
    var canvas = _state.canvas;
    function addH(type, fn, opts) {
      canvas.addEventListener(type, fn, opts || false);
      _state._handlers.push({ type: type, fn: fn });
    }
    addH('click', function (e) {
      if (_state._touchHandled) { _state._touchHandled = false; return; }
      _handleTap(getCanvasPoint(e.clientX, e.clientY, canvas));
    });
    addH('touchend', function (e) {
      e.preventDefault();
      _state._touchHandled = true;
      _handleTap(getCanvasPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY, canvas));
    }, { passive: false });
  }

  function _removeHandlers() {
    var canvas = _state.canvas;
    if (!canvas) return;
    _state._handlers.forEach(function (h) { canvas.removeEventListener(h.type, h.fn); });
    _state._handlers = [];
  }

  function _handleTap(pt) {
    var canvas = _state.canvas;
    var W = canvas.width, H = canvas.height;
    var x = pt.x, y = pt.y;

    // ปุ่มกลับ
    if (x >= 8 && x <= 76 && y >= 8 && y <= 44) {
      stop();
      _state.onBack && _state.onBack();
      return;
    }

    // Global tab
    var tY = 58, tH = 32;
    if (x >= 8 && x <= W / 2 - 4 && y >= tY && y <= tY + tH) {
      if (_state.mode !== 'global') { _state.mode = 'global'; _fetchData(); }
      return;
    }
    // Classroom tab
    if (x >= W / 2 + 4 && x <= W - 8 && y >= tY && y <= tY + tH) {
      if (_state.mode !== 'classroom') { _state.mode = 'classroom'; _fetchData(); }
      return;
    }
    // Footer — เข้าห้องเรียน
    if (x >= 8 && x <= W - 8 && y >= H - 42 && y <= H - 8) {
      stop();
      ClassroomScene.start(canvas, _state.save, function () {
        // กลับมา leaderboard หลัง join/cancel
        start(canvas, loadProgress(), _state.onBack);
      });
      return;
    }
  }

  // ── Util ───────────────────────────────────────────────────────
  function _lbRR(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  return { start: start, stop: stop };

})();
