// daily-scene.js — Daily Quest / Login Streak / Weekly Boss UI (Phase 4)

var DailyScene = (function() {

  var canvas, ctx, save;

  // ---- layout ----
  var PAD = 20;
  var CARD_W, CARD_H;

  function init(c, saveData) {
    canvas = c;
    ctx = c.getContext('2d');
    save = saveData;
    CARD_W = canvas.width - PAD * 2;
  }

  // ---- draw helpers ----

  function roundRect(x, y, w, h, r, fill, stroke) {
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
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function progressBar(x, y, w, h, pct, colorFill, colorBg) {
    roundRect(x, y, w, h, h / 2, colorBg || '#333');
    if (pct > 0) roundRect(x, y, w * Math.min(pct, 1), h, h / 2, colorFill || '#f0a030');
  }

  function text(str, x, y, opts) {
    opts = opts || {};
    ctx.font = (opts.bold ? 'bold ' : '') + (opts.size || 16) + 'px Kanit, sans-serif';
    ctx.fillStyle = opts.color || '#fff';
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.base || 'top';
    ctx.fillText(str, x, y);
  }

  // ---- section: Daily Quests ----

  var questButtons = []; // { id, x, y, w, h }

  function drawDailyQuests(quests, startY) {
    questButtons = [];
    text('ภารกิจประจำวัน', PAD, startY, { bold: true, size: 18, color: '#ffd700' });
    var y = startY + 28;

    quests.forEach(function(q) {
      var cardH = 62;
      roundRect(PAD, y, CARD_W, cardH, 10, '#1a1a2e', '#333');

      // label
      text(q.label, PAD + 12, y + 10, { size: 14, color: q.done ? '#7fff7f' : '#fff' });
      text('+ ' + q.reward + ' 💎', PAD + 12, y + 30, { size: 12, color: '#88ccff' });

      // progress bar
      var barX = PAD + 12, barY = y + 46, barW = CARD_W - 120, barH = 8;
      progressBar(barX, barY, barW, barH, q.current / q.target, '#f0a030', '#333');
      text(q.current + '/' + q.target, barX + barW + 8, barY - 2, { size: 12, color: '#aaa' });

      // claim button
      var btnW = 70, btnH = 32, btnX = PAD + CARD_W - btnW - 10, btnY = y + 15;
      if (q.claimed) {
        roundRect(btnX, btnY, btnW, btnH, 8, '#333');
        text('รับแล้ว', btnX + btnW / 2, btnY + 8, { size: 12, color: '#888', align: 'center' });
      } else if (q.done) {
        roundRect(btnX, btnY, btnW, btnH, 8, '#f0a030');
        text('รับรางวัล', btnX + btnW / 2, btnY + 8, { size: 12, color: '#000', align: 'center', bold: true });
        questButtons.push({ id: q.id, x: btnX, y: btnY, w: btnW, h: btnH });
      } else {
        roundRect(btnX, btnY, btnW, btnH, 8, '#333');
        text('ยังไม่ครบ', btnX + btnW / 2, btnY + 8, { size: 12, color: '#666', align: 'center' });
      }

      y += cardH + 8;
    });
    return y;
  }

  // ---- section: Login Streak ----

  var streakClaimBtn = null;

  function drawStreak(streakInfo, startY) {
    streakClaimBtn = null;
    text('เข้าเกมติดต่อกัน', PAD, startY, { bold: true, size: 18, color: '#ffd700' });
    var y = startY + 28;

    roundRect(PAD, y, CARD_W, 70, 10, '#1a1a2e', '#333');

    // streak counter
    text('🔥 ' + streakInfo.streak + ' วัน', PAD + 12, y + 10, { bold: true, size: 20, color: '#ff8844' });

    // progress to next milestone
    var streakInCycle = streakInfo.streak % 7;
    var pct = streakInCycle === 0 ? 1 : streakInCycle / 7;
    progressBar(PAD + 12, y + 42, CARD_W - 140, 10, pct, '#ff8844', '#333');

    if (streakInfo.milestoneReady) {
      // claim button
      var btnW = 100, btnH = 32, btnX = PAD + CARD_W - btnW - 10, btnY = y + 20;
      roundRect(btnX, btnY, btnW, btnH, 8, '#ffd700');
      text('รับ Epic Hero!', btnX + btnW / 2, btnY + 8, { size: 12, color: '#000', align: 'center', bold: true });
      streakClaimBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    } else {
      text('อีก ' + streakInfo.nextMilestone + ' วัน → Epic Hero 🎁', PAD + 12, y + 56, { size: 11, color: '#aaa' });
    }

    return y + 80;
  }

  // ---- section: Weekly Boss ----

  var weeklyClaimBtn = null;

  function drawWeeklyBoss(bossInfo, startY) {
    weeklyClaimBtn = null;
    text('บอสประจำสัปดาห์', PAD, startY, { bold: true, size: 18, color: '#ffd700' });
    var y = startY + 28;

    roundRect(PAD, y, CARD_W, 90, 10, '#1a1a2e', '#333');

    // boss name
    text('💀 อสูรมืดแห่งสัปดาห์', PAD + 12, y + 10, { bold: true, size: 15, color: '#cc44ff' });
    text('ความเสียหายสะสม: ' + bossInfo.hp + ' / ' + bossInfo.maxHp, PAD + 12, y + 32, { size: 12, color: '#aaa' });

    // HP bar
    progressBar(PAD + 12, y + 52, CARD_W - 24, 14, bossInfo.pct, '#cc44ff', '#333');

    if (bossInfo.defeated && !bossInfo.rewardClaimed) {
      var btnW = 110, btnH = 32, btnX = PAD + CARD_W - btnW - 10, btnY = y + 44;
      roundRect(btnX, btnY, btnW, btnH, 8, '#cc44ff');
      text('รับรางวัล 20💎', btnX + btnW / 2, btnY + 8, { size: 12, color: '#fff', align: 'center', bold: true });
      weeklyClaimBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    } else if (bossInfo.defeated && bossInfo.rewardClaimed) {
      text('✅ รับรางวัลแล้ว', PAD + CARD_W - 130, y + 62, { size: 12, color: '#888' });
    } else {
      text('สัปดาห์เริ่ม: ' + bossInfo.weekStart, PAD + 12, y + 72, { size: 11, color: '#555' });
    }

    return y + 100;
  }

  // ---- main draw ----

  var closeBtn = null;
  var floatMsg = null; // { text, alpha, y }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // bg
    var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0d0d1a');
    grad.addColorStop(1, '#1a0d2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // title bar
    roundRect(0, 0, canvas.width, 50, 0, '#16213e');
    text('📋 ภารกิจ & สตรีค', canvas.width / 2, 14, { bold: true, size: 18, color: '#ffd700', align: 'center' });

    // close button
    var cbX = canvas.width - 44, cbY = 10, cbW = 34, cbH = 30;
    roundRect(cbX, cbY, cbW, cbH, 6, '#333');
    text('✕', cbX + cbW / 2, cbY + 6, { size: 16, color: '#fff', align: 'center' });
    closeBtn = { x: cbX, y: cbY, w: cbW, h: cbH };

    var y = 62;
    var quests = getDailyQuestStatus(save);
    var streak = getStreakStatus(save);
    var weekly = getWeeklyBossStatus(save);

    y = drawDailyQuests(quests, y) + 12;
    y = drawStreak(streak, y) + 12;
    drawWeeklyBoss(weekly, y);

    // crystal count top-right
    text('💎 ' + save.crystals, canvas.width - PAD, 14, { size: 15, color: '#88ccff', align: 'right' });

    // float message (reward notification)
    if (floatMsg && floatMsg.alpha > 0) {
      ctx.globalAlpha = floatMsg.alpha;
      text(floatMsg.text, canvas.width / 2, floatMsg.y, { bold: true, size: 18, color: '#ffd700', align: 'center' });
      ctx.globalAlpha = 1;
      floatMsg.y -= 1;
      floatMsg.alpha -= 0.02;
    }
  }

  // ---- input ----

  function showFloatMsg(msg) {
    floatMsg = { text: msg, alpha: 1, y: canvas.height / 2 };
  }

  function handleTap(x, y) {
    // close
    if (closeBtn && x >= closeBtn.x && x <= closeBtn.x + closeBtn.w &&
        y >= closeBtn.y && y <= closeBtn.y + closeBtn.h) {
      return 'close';
    }

    // quest claim buttons
    for (var i = 0; i < questButtons.length; i++) {
      var b = questButtons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        var earned = claimDailyQuest(save, b.id);
        if (earned > 0) {
          saveProgress(save);
          showFloatMsg('+ ' + earned + ' 💎');
        }
        return 'tap';
      }
    }

    // streak claim
    if (streakClaimBtn && x >= streakClaimBtn.x && x <= streakClaimBtn.x + streakClaimBtn.w &&
        y >= streakClaimBtn.y && y <= streakClaimBtn.y + streakClaimBtn.h) {
      var result = claimStreakReward(save);
      if (result) {
        saveProgress(save);
        if (result.type === 'hero') showFloatMsg('🎉 ได้ ' + result.hero.name + '!');
        else showFloatMsg('+ ' + result.amount + ' 💎 (hero ครบแล้ว)');
      }
      return 'tap';
    }

    // weekly claim
    if (weeklyClaimBtn && x >= weeklyClaimBtn.x && x <= weeklyClaimBtn.x + weeklyClaimBtn.w &&
        y >= weeklyClaimBtn.y && y <= weeklyClaimBtn.y + weeklyClaimBtn.h) {
      var w = claimWeeklyBossReward(save);
      if (w > 0) {
        saveProgress(save);
        showFloatMsg('+ ' + w + ' 💎 (Weekly Boss!)');
      }
      return 'tap';
    }

    return null;
  }

  // ---- game loop ----

  var rafId = null;

  function start(c, saveData, onClose) {
    init(c, saveData);

    function loop() {
      draw();
      rafId = requestAnimationFrame(loop);
    }
    loop();

    function onTap(e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var cx = (e.touches ? e.touches[0].clientX : e.clientX);
      var cy = (e.touches ? e.touches[0].clientY : e.clientY);
      var tx = (cx - rect.left) * scaleX;
      var ty = (cy - rect.top) * scaleY;
      var result = handleTap(tx, ty);
      if (result === 'close') stop(onClose);
    }

    canvas.addEventListener('click', onTap);
    canvas.addEventListener('touchstart', onTap, { passive: false });
    canvas._dailyTapHandler = onTap;
  }

  function stop(callback) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (canvas._dailyTapHandler) {
      canvas.removeEventListener('click', canvas._dailyTapHandler);
      canvas.removeEventListener('touchstart', canvas._dailyTapHandler);
      canvas._dailyTapHandler = null;
    }
    if (callback) callback();
  }

  return { start: start, stop: stop };

})();
