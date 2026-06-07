// classroom-scene.js — เข้าห้องเรียน / ตั้งชื่อเล่น (Phase 5)
// ใช้ HTML <input> overlay บน Canvas — รองรับ mobile keyboard

var ClassroomScene = (function () {

  var _state = {
    canvas: null, ctx: null, animId: null, save: null,
    onDone: null,
    step: 'nickname',   // 'nickname' | 'code' | 'result'
    resultOk: false, resultMsg: '',
    frame: 0,
    _handlers: [],
    _overlay: null,
    _input: null
  };

  // ── Public API ─────────────────────────────────────────────────
  function start(canvas, save, onDone) {
    _state.canvas  = canvas;
    _state.ctx     = canvas.getContext('2d');
    _state.save    = save;
    _state.onDone  = onDone;
    _state.frame   = 0;
    _state.step    = save.nickname ? 'code' : 'nickname';
    _state.resultOk  = false;
    _state.resultMsg = '';

    _removeHandlers();
    _buildOverlay();
    _showInput(_state.step);
    _attachHandlers();

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
    _destroyOverlay();
  }

  // ── HTML overlay สำหรับรับ text input ─────────────────────────
  function _buildOverlay() {
    _destroyOverlay(); // ล้างก่อนถ้ามีอยู่

    var wrap = document.createElement('div');
    wrap.id  = 'cs-overlay';
    wrap.style.cssText = [
      'position:fixed;top:0;left:0;width:100%;height:100%;',
      'display:flex;align-items:center;justify-content:center;',
      'pointer-events:none;z-index:100;'
    ].join('');

    var box = document.createElement('div');
    box.style.cssText = [
      'background:rgba(20,10,50,0.97);border:2px solid #9933FF;',
      'border-radius:16px;padding:20px 24px;width:min(320px,88vw);',
      'display:flex;flex-direction:column;gap:10px;',
      'pointer-events:auto;'
    ].join('');

    var title = document.createElement('div');
    title.style.cssText = 'color:#FFD700;font-size:16px;font-weight:bold;text-align:center;font-family:sans-serif;';
    title.id = 'cs-title';

    var input = document.createElement('input');
    input.id  = 'cs-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocorrect  = 'off';
    input.autocapitalize = 'characters';
    input.style.cssText = [
      'background:#1a0a3e;color:#fff;border:1px solid #6633CC;',
      'border-radius:8px;padding:10px 14px;font-size:18px;width:100%;',
      'box-sizing:border-box;font-family:sans-serif;text-align:center;',
      'letter-spacing:4px;outline:none;'
    ].join('');

    var hint = document.createElement('div');
    hint.id  = 'cs-hint';
    hint.style.cssText = 'color:#888;font-size:11px;text-align:center;font-family:sans-serif;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';

    var btnOk = document.createElement('button');
    btnOk.id  = 'cs-ok';
    btnOk.style.cssText = [
      'flex:1;background:#4a2a8e;color:#FFD700;border:1px solid #9933FF;',
      'border-radius:8px;padding:10px;font-size:14px;font-weight:bold;',
      'cursor:pointer;font-family:sans-serif;'
    ].join('');
    btnOk.textContent = 'ยืนยัน';

    var btnCancel = document.createElement('button');
    btnCancel.id  = 'cs-cancel';
    btnCancel.style.cssText = [
      'flex:1;background:#2a1a3e;color:#aaa;border:1px solid #443;',
      'border-radius:8px;padding:10px;font-size:14px;',
      'cursor:pointer;font-family:sans-serif;'
    ].join('');
    btnCancel.textContent = 'ยกเลิก';

    btnRow.appendChild(btnOk);
    btnRow.appendChild(btnCancel);
    box.appendChild(title);
    box.appendChild(input);
    box.appendChild(hint);
    box.appendChild(btnRow);
    wrap.appendChild(box);
    document.body.appendChild(wrap);

    _state._overlay = wrap;
    _state._input   = input;

    // button events
    btnOk.addEventListener('click', _onConfirm);
    btnCancel.addEventListener('click', function () { stop(); _state.onDone && _state.onDone(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') _onConfirm();
    });
  }

  function _destroyOverlay() {
    var el = document.getElementById('cs-overlay');
    if (el) el.parentNode.removeChild(el);
    _state._overlay = null;
    _state._input   = null;
  }

  function _showInput(step) {
    var title = document.getElementById('cs-title');
    var input = document.getElementById('cs-input');
    var hint  = document.getElementById('cs-hint');
    if (!title || !input) return;

    if (step === 'nickname') {
      title.textContent = '⚔️ ตั้งชื่อนักรบของคุณ';
      input.maxLength = 20;
      input.value     = _state.save.nickname || '';
      input.placeholder = 'ชื่อเล่น (สูงสุด 20 ตัว)';
      input.autocapitalize = 'off';
      hint.textContent = 'ชื่อนี้จะแสดงใน Leaderboard';
    } else if (step === 'code') {
      title.textContent = '🏫 กรอกรหัสห้องเรียน';
      input.maxLength = 6;
      input.value     = _state.save.classroomCode || '';
      input.placeholder = 'XXXXXX';
      input.autocapitalize = 'characters';
      hint.textContent = 'รหัส 6 ตัว จากครูผู้สอน';
    }
    // focus + select all
    setTimeout(function () { input.focus(); input.select(); }, 100);
  }

  function _onConfirm() {
    var input = document.getElementById('cs-input');
    if (!input) return;
    var val = input.value.trim();

    if (_state.step === 'nickname') {
      if (val.length < 1) { _setHint('กรุณากรอกชื่อ'); return; }
      _state.save.nickname = val.slice(0, 20);
      saveProgress(_state.save);
      // sync user profile
      if (SUPA.isReady()) SUPA.upsertUser(_state.save, null);
      // ไปต่อ step code
      _state.step = 'code';
      _showInput('code');

    } else if (_state.step === 'code') {
      val = val.toUpperCase();
      if (val.length !== 6) { _setHint('ต้องกรอกครบ 6 ตัว'); return; }
      _setHint('กำลังตรวจสอบรหัส...');
      document.getElementById('cs-ok').disabled = true;

      SUPA.joinClassroom(val, _state.save, function (res) {
        document.getElementById('cs-ok') && (document.getElementById('cs-ok').disabled = false);
        if (res.ok) {
          _destroyOverlay();
          _state.resultOk  = true;
          _state.resultMsg = '✅ เข้าห้อง "' + res.name + '" สำเร็จ!';
          _state.step = 'result';
          // ปิด scene หลัง 2 วิ
          setTimeout(function () {
            stop();
            _state.onDone && _state.onDone();
          }, 2000);
        } else {
          _setHint('❌ ' + res.msg);
        }
      });
    }
  }

  function _setHint(msg) {
    var hint = document.getElementById('cs-hint');
    if (hint) { hint.style.color = '#FF9999'; hint.textContent = msg; }
  }

  // ── Render ─────────────────────────────────────────────────────
  // วาด BG + result screen เท่านั้น — input overlay จาก HTML
  function _render() {
    var canvas = _state.canvas;
    var ctx    = _state.ctx;
    var W = canvas.width, H = canvas.height;
    var frame  = _state.frame;

    // BG gradient
    var gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#0d0620'); gr.addColorStop(1, '#1a0a3e');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);

    // Twinkling stars
    for (var i = 0; i < 25; i++) {
      var sx = (i * 137.5) % W, sy = (i * 97.3) % H;
      var alpha = 0.15 + 0.1 * Math.sin(frame * 0.05 + i);
      ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill();
    }

    if (_state.step === 'result') {
      // แสดง success message
      ctx.fillStyle = _state.resultOk ? '#7fff7f' : '#FF9999';
      ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(_state.resultMsg, W / 2, H / 2 - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '13px sans-serif';
      ctx.fillText('กำลังกลับ...', W / 2, H / 2 + 20);
      ctx.textAlign = 'left';
    }
  }

  // ── Handlers ──────────────────────────────────────────────────
  function _attachHandlers() {
    // Canvas ไม่มี handler พิเศษ — ทุกอย่างผ่าน HTML overlay
    _state._handlers = [];
  }
  function _removeHandlers() {
    _state._handlers = [];
  }

  return { start: start, stop: stop };

})();
