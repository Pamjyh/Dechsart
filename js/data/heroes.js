// heroes.js — hero roster (ฮีโร่ทั้ง 10 ตัว)

var HEROES = {

  // ── FIRE ──────────────────────────────────────────────────────
  devasri: {
    id: 'devasri', name: 'เทวดาศรี', element: 'fire', rarity: 'common',
    unlockFloor: 0, hpBonus: 0, dmgBonus: 0, speedBonus: 0,
    description: 'วีรบุรุษไฟเริ่มต้น ถนัดบวก',
    draw: function(ctx, x, y, size, frame) {
      var bounce = Math.sin(frame * 0.05) * 3;
      ctx.fillStyle = '#FFD700'; ctx.beginPath();
      ctx.ellipse(x, y+bounce, size*0.35, size*0.45, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFE082'; ctx.beginPath();
      ctx.arc(x, y-size*0.3+bounce, size*0.25, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF6B35'; ctx.beginPath();
      ctx.moveTo(x-size*0.15, y-size*0.5+bounce); ctx.lineTo(x-size*0.05, y-size*0.65+bounce);
      ctx.lineTo(x, y-size*0.55+bounce); ctx.lineTo(x+size*0.05, y-size*0.65+bounce);
      ctx.lineTo(x+size*0.15, y-size*0.5+bounce); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,180,50,0.7)';
      ctx.beginPath(); ctx.ellipse(x-size*0.5, y+bounce, size*0.2, size*0.4, -0.4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+size*0.5, y+bounce, size*0.2, size*0.4, 0.4, 0, Math.PI*2); ctx.fill();
    }
  },

  hanuman: {
    id: 'hanuman', name: 'หนุมานพลัง', element: 'fire', rarity: 'rare',
    unlockFloor: 5, hpBonus: 0, dmgBonus: 0, speedBonus: 0.2,
    description: 'Speed bonus +20%',
    draw: function(ctx, x, y, size, frame) {
      var b = Math.sin(frame * 0.07) * 4;
      // กระบอง
      ctx.fillStyle = '#C0A020'; ctx.fillRect(x+size*0.3, y-size*0.6+b, size*0.12, size*0.8);
      // ตัว
      ctx.fillStyle = '#F0F0E0'; ctx.beginPath();
      ctx.ellipse(x, y+b, size*0.38, size*0.48, 0, 0, Math.PI*2); ctx.fill();
      // หัว
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
      ctx.arc(x, y-size*0.35+b, size*0.28, 0, Math.PI*2); ctx.fill();
      // หน้า (ลิง)
      ctx.fillStyle = '#FFB6A0'; ctx.beginPath();
      ctx.ellipse(x, y-size*0.28+b, size*0.18, size*0.14, 0, 0, Math.PI*2); ctx.fill();
      // ตา
      ctx.fillStyle = '#222'; [x-size*0.1, x+size*0.1].forEach(function(ex) {
        ctx.beginPath(); ctx.arc(ex, y-size*0.38+b, size*0.05, 0, Math.PI*2); ctx.fill();
      });
      // หาง
      ctx.strokeStyle = '#DDD'; ctx.lineWidth = size*0.07;
      ctx.beginPath(); ctx.moveTo(x-size*0.35, y+size*0.3+b);
      ctx.quadraticCurveTo(x-size*0.7, y+b, x-size*0.4, y-size*0.3+b); ctx.stroke();
      ctx.lineWidth = 1;
    }
  },

  // ── WATER ─────────────────────────────────────────────────────
  naka: {
    id: 'naka', name: 'นาคาเงิน', element: 'water', rarity: 'rare',
    unlockFloor: 11, hpBonus: 0, dmgBonus: 0, speedBonus: 0,
    description: 'ลบ + shield',
    draw: function(ctx, x, y, size, frame) {
      var wave = Math.sin(frame * 0.04) * 5;
      // ลำตัวนาค (หลายปล้อง)
      ctx.strokeStyle = '#B0D8FF'; ctx.lineWidth = size*0.22;
      ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(x, y+size*0.6+wave);
      ctx.quadraticCurveTo(x+size*0.4, y+wave, x, y-size*0.4+wave);
      ctx.stroke();
      // เกล็ด shimmer
      ctx.strokeStyle = '#7EC8FF'; ctx.lineWidth = size*0.12;
      ctx.beginPath();
      ctx.moveTo(x, y+size*0.6+wave);
      ctx.quadraticCurveTo(x+size*0.4, y+wave, x, y-size*0.4+wave);
      ctx.stroke();
      // หัวนาค
      ctx.fillStyle = '#90C8F0'; ctx.beginPath();
      ctx.ellipse(x, y-size*0.45+wave, size*0.3, size*0.2, 0, 0, Math.PI*2); ctx.fill();
      // เขี้ยว
      ctx.fillStyle = '#FFF'; ctx.beginPath();
      ctx.moveTo(x-size*0.08, y-size*0.35+wave); ctx.lineTo(x-size*0.04, y-size*0.22+wave); ctx.lineTo(x, y-size*0.35+wave); ctx.fill();
      // เกล็ดบนหัว
      ctx.fillStyle = '#4A90D9'; ctx.beginPath();
      ctx.moveTo(x, y-size*0.65+wave); ctx.lineTo(x-size*0.15, y-size*0.48+wave);
      ctx.lineTo(x+size*0.15, y-size*0.48+wave); ctx.closePath(); ctx.fill();
      // ตา
      ctx.fillStyle = '#FFD700'; ctx.beginPath();
      ctx.arc(x+size*0.12, y-size*0.48+wave, size*0.06, 0, Math.PI*2); ctx.fill();
      ctx.lineWidth = 1; ctx.lineCap = 'butt';
    }
  },

  kinnari: {
    id: 'kinnari', name: 'กินนรีทอง', element: 'water', rarity: 'rare',
    unlockFloor: 15, hpBonus: 10, dmgBonus: 0, speedBonus: 0,
    description: 'รักษา HP เมื่อตอบถูก',
    draw: function(ctx, x, y, size, frame) {
      var b = Math.sin(frame * 0.04) * 3;
      // ปีก (นก-มนุษย์)
      ctx.fillStyle = 'rgba(255,220,100,0.7)';
      ctx.beginPath(); ctx.ellipse(x-size*0.6, y+b, size*0.35, size*0.55, -0.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+size*0.6, y+b, size*0.35, size*0.55, 0.3, 0, Math.PI*2); ctx.fill();
      // หาง (นก)
      ctx.fillStyle = '#FFD700';
      [-0.3,0,0.3].forEach(function(a) {
        ctx.beginPath(); ctx.moveTo(x, y+size*0.5+b);
        ctx.lineTo(x+Math.sin(a)*size*0.3, y+size*0.9+b); ctx.lineTo(x+Math.sin(a+0.2)*size*0.15, y+size*0.5+b); ctx.fill();
      });
      // ลำตัว
      ctx.fillStyle = '#FFE082'; ctx.beginPath();
      ctx.ellipse(x, y+b, size*0.28, size*0.4, 0, 0, Math.PI*2); ctx.fill();
      // หัว
      ctx.fillStyle = '#FFDDB0'; ctx.beginPath();
      ctx.arc(x, y-size*0.3+b, size*0.22, 0, Math.PI*2); ctx.fill();
      // มงกุฎ
      ctx.fillStyle = '#FF9900'; ctx.beginPath();
      ctx.moveTo(x-size*0.12, y-size*0.48+b); ctx.lineTo(x, y-size*0.62+b); ctx.lineTo(x+size*0.12, y-size*0.48+b); ctx.closePath(); ctx.fill();
    }
  },

  // ── THUNDER ───────────────────────────────────────────────────
  garuda: {
    id: 'garuda', name: 'ครุฑราช', element: 'thunder', rarity: 'epic',
    unlockFloor: 21, hpBonus: 0, dmgBonus: 0, speedBonus: 0,
    description: 'คูณ crit rate +30%',
    draw: function(ctx, x, y, size, frame) {
      var b = Math.sin(frame * 0.06) * 4;
      // ปีกใหญ่
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.moveTo(x, y+b); ctx.lineTo(x-size*0.9, y-size*0.3+b); ctx.lineTo(x-size*0.3, y+size*0.2+b); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y+b); ctx.lineTo(x+size*0.9, y-size*0.3+b); ctx.lineTo(x+size*0.3, y+size*0.2+b); ctx.closePath(); ctx.fill();
      // ขน secondary
      ctx.fillStyle = '#FFA500';
      ctx.beginPath(); ctx.moveTo(x, y+b); ctx.lineTo(x-size*0.65, y+b); ctx.lineTo(x-size*0.25, y+size*0.35+b); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y+b); ctx.lineTo(x+size*0.65, y+b); ctx.lineTo(x+size*0.25, y+size*0.35+b); ctx.closePath(); ctx.fill();
      // ลำตัว
      ctx.fillStyle = '#CC8800'; ctx.beginPath();
      ctx.ellipse(x, y+size*0.1+b, size*0.25, size*0.45, 0, 0, Math.PI*2); ctx.fill();
      // หัว
      ctx.fillStyle = '#FFD700'; ctx.beginPath();
      ctx.arc(x, y-size*0.3+b, size*0.25, 0, Math.PI*2); ctx.fill();
      // จะงอย
      ctx.fillStyle = '#FF8C00'; ctx.beginPath();
      ctx.moveTo(x, y-size*0.15+b); ctx.lineTo(x-size*0.12, y+b); ctx.lineTo(x+size*0.12, y+b); ctx.closePath(); ctx.fill();
      // สายฟ้า
      ctx.strokeStyle = '#FFFAAA'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y-size*0.6+b); ctx.lineTo(x+size*0.1, y-size*0.45+b);
      ctx.lineTo(x-size*0.05, y-size*0.35+b); ctx.lineTo(x+size*0.08, y-size*0.25+b); ctx.stroke();
      ctx.lineWidth = 1;
    }
  },

  indra: {
    id: 'indra', name: 'พระอินทร์', element: 'thunder', rarity: 'epic',
    unlockFloor: 28, hpBonus: 0, dmgBonus: 10, speedBonus: 0,
    description: 'ฟ้าผ่า 2 ตัวพร้อมกัน',
    draw: function(ctx, x, y, size, frame) {
      var b = Math.sin(frame * 0.05) * 3;
      // ฉลองพระองค์
      ctx.fillStyle = '#6633CC'; ctx.beginPath();
      ctx.ellipse(x, y+size*0.1+b, size*0.32, size*0.5, 0, 0, Math.PI*2); ctx.fill();
      // ชฎา
      ctx.fillStyle = '#9955FF';
      [0,1,2,3,4].forEach(function(i) {
        var a = (i/5)*Math.PI*2 - Math.PI/2;
        ctx.beginPath(); ctx.moveTo(x, y-size*0.42+b);
        ctx.lineTo(x+Math.cos(a)*size*0.18, y-size*0.42+b+Math.sin(a)*size*0.18);
        ctx.lineTo(x+Math.cos(a+0.3)*size*0.1, y-size*0.3+b); ctx.closePath(); ctx.fill();
      });
      // หัว
      ctx.fillStyle = '#FFDDB0'; ctx.beginPath();
      ctx.arc(x, y-size*0.32+b, size*0.23, 0, Math.PI*2); ctx.fill();
      // ตาสีฟ้า
      ctx.fillStyle = '#4488FF'; [x-0.09*size, x+0.09*size].forEach(function(ex) {
        ctx.beginPath(); ctx.arc(ex, y-size*0.34+b, size*0.05, 0, Math.PI*2); ctx.fill();
      });
      // วัชระ (อาวุธ)
      ctx.fillStyle = '#FFD700'; ctx.fillRect(x+size*0.28, y-size*0.5+b, size*0.1, size*0.7);
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(x+size*0.22, y-size*0.52+b, size*0.22, size*0.12);
      ctx.fillRect(x+size*0.22, y+size*0.1+b, size*0.22, size*0.12);
    }
  },

  // ── WIND ──────────────────────────────────────────────────────
  wessawan: {
    id: 'wessawan', name: 'ท้าวเวสสุวรรณ', element: 'wind', rarity: 'epic',
    unlockFloor: 36, hpBonus: 0, dmgBonus: 0, speedBonus: 0,
    description: 'หาร + def สูงมาก',
    draw: function(ctx, x, y, size, frame) {
      var b = Math.sin(frame * 0.04) * 3;
      // เงาใต้เท้า
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath();
      ctx.ellipse(x, y+size*0.65+b, size*0.35, size*0.08, 0, 0, Math.PI*2); ctx.fill();
      // ลำตัว (ยักษ์ใหญ่)
      ctx.fillStyle = '#228B22'; ctx.beginPath();
      ctx.ellipse(x, y+size*0.1+b, size*0.42, size*0.55, 0, 0, Math.PI*2); ctx.fill();
      // เกราะ
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(x-size*0.3, y-size*0.2+b, size*0.6, size*0.15);
      ctx.fillRect(x-size*0.25, y+size*0.1+b, size*0.5, size*0.12);
      // แขน
      ctx.fillStyle = '#1A6E1A';
      ctx.beginPath(); ctx.ellipse(x-size*0.5, y+b, size*0.14, size*0.35, 0.2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+size*0.5, y+b, size*0.14, size*0.35, -0.2, 0, Math.PI*2); ctx.fill();
      // หัว
      ctx.fillStyle = '#2E8B57'; ctx.beginPath();
      ctx.arc(x, y-size*0.36+b, size*0.3, 0, Math.PI*2); ctx.fill();
      // ใบหน้า
      ctx.fillStyle = '#1F6B3A'; ctx.beginPath();
      ctx.arc(x, y-size*0.3+b, size*0.2, 0, Math.PI*2); ctx.fill();
      // ตา (โต)
      ctx.fillStyle = '#FF4400'; [x-0.1*size, x+0.1*size].forEach(function(ex) {
        ctx.beginPath(); ctx.arc(ex, y-size*0.36+b, size*0.07, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(ex, y-size*0.36+b, size*0.03, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FF4400';
      });
      // เขา
      ctx.fillStyle = '#8B0000';
      ctx.beginPath(); ctx.moveTo(x-size*0.18, y-size*0.6+b); ctx.lineTo(x-size*0.28, y-size*0.82+b); ctx.lineTo(x-size*0.08, y-size*0.62+b); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+size*0.18, y-size*0.6+b); ctx.lineTo(x+size*0.28, y-size*0.82+b); ctx.lineTo(x+size*0.08, y-size*0.62+b); ctx.closePath(); ctx.fill();
      // กระบองงา
      ctx.fillStyle = '#8B4513'; ctx.fillRect(x+size*0.35, y-size*0.7+b, size*0.1, size);
      ctx.fillStyle = '#F5F5DC'; ctx.beginPath();
      ctx.arc(x+size*0.4, y-size*0.72+b, size*0.12, 0, Math.PI*2); ctx.fill();
    }
  },

  yaksha: {
    id: 'yaksha', name: 'ยักษ์มหาพลัง', element: 'wind', rarity: 'rare',
    unlockFloor: 40, hpBonus: 30, dmgBonus: 0, speedBonus: 0,
    description: 'HP สูง, tank',
    draw: function(ctx, x, y, size, frame) {
      var b = Math.sin(frame * 0.035) * 4;
      ctx.fillStyle = '#8B0000'; ctx.beginPath();
      ctx.ellipse(x, y+size*0.15+b, size*0.48, size*0.6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#A00000'; ctx.beginPath();
      ctx.arc(x, y-size*0.35+b, size*0.32, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#C0392B'; ctx.beginPath();
      ctx.ellipse(x-size*0.55, y+b, size*0.18, size*0.4, 0.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+size*0.55, y+b, size*0.18, size*0.4, -0.3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF6B35';
      [x-size*0.12, x+size*0.12].forEach(function(ex) {
        ctx.beginPath(); ctx.arc(ex, y-size*0.38+b, size*0.07, 0, Math.PI*2); ctx.fill();
      });
      ctx.fillStyle = '#FF0000'; ctx.beginPath();
      ctx.moveTo(x-size*0.22, y-size*0.52+b); ctx.lineTo(x-size*0.32, y-size*0.72+b); ctx.lineTo(x-size*0.12, y-size*0.54+b); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+size*0.22, y-size*0.52+b); ctx.lineTo(x+size*0.32, y-size*0.72+b); ctx.lineTo(x+size*0.12, y-size*0.54+b); ctx.closePath(); ctx.fill();
    }
  },

  // ── MIXED ─────────────────────────────────────────────────────
  brahma: {
    id: 'brahma', name: 'พระพรหม', element: 'mixed', rarity: 'legendary',
    unlockFloor: 50, hpBonus: 10, dmgBonus: 5, speedBonus: 0,
    description: 'buff ทีมทุกธาตุ',
    draw: function(ctx, x, y, size, frame) {
      var b = Math.sin(frame * 0.03) * 3;
      var spin = frame * 0.015;
      // 4 แขน
      ['#FF6B35','#4ECDC4','#FFD93D','#6BCB77'].forEach(function(c, i) {
        var a = spin + (i/4)*Math.PI*2;
        ctx.fillStyle = c; ctx.beginPath();
        ctx.ellipse(x+Math.cos(a)*size*0.55, y+Math.sin(a)*size*0.4+b, size*0.12, size*0.3, a, 0, Math.PI*2); ctx.fill();
      });
      // ลำตัว
      ctx.fillStyle = '#FFD700'; ctx.beginPath();
      ctx.ellipse(x, y+size*0.05+b, size*0.3, size*0.42, 0, 0, Math.PI*2); ctx.fill();
      // 4 หัว
      ['#FFDDB0','#FFD0A0','#FFDDB0','#FFD0A0'].forEach(function(c, i) {
        var a = spin*0.5 + (i/4)*Math.PI*2;
        var hx = x + Math.cos(a)*size*0.18, hy = y-size*0.3+b + Math.sin(a)*size*0.08;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(hx, hy, size*0.16, 0, Math.PI*2); ctx.fill();
      });
    }
  },

  narai: {
    id: 'narai', name: 'พระนารายณ์', element: 'mixed', rarity: 'legendary',
    unlockFloor: 55, hpBonus: 20, dmgBonus: 15, speedBonus: 0.1,
    description: 'Ultimate — โจมตีทุกธาตุพร้อมกัน',
    draw: function(ctx, x, y, size, frame) {
      var b = Math.sin(frame * 0.04) * 3;
      var spin = frame * 0.012;
      // จักร (สุทรรศนะ) หมุน
      ctx.save(); ctx.translate(x+size*0.45, y-size*0.1+b); ctx.rotate(spin*2);
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = size*0.06;
      ctx.beginPath(); ctx.arc(0, 0, size*0.2, 0, Math.PI*2); ctx.stroke();
      [0,1,2,3,4,5,6,7].forEach(function(i) {
        var a = (i/8)*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*size*0.22, Math.sin(a)*size*0.22); ctx.stroke();
      });
      ctx.restore(); ctx.lineWidth = 1;
      // 4 แขน
      ctx.fillStyle = '#1A5C3A';
      [0.5,-0.5,0.7,-0.7].forEach(function(dy, i) {
        var dx = i < 2 ? -size*0.5 : size*0.5;
        ctx.beginPath(); ctx.ellipse(x+dx, y+dy*size+b, size*0.12, size*0.28, dx>0?-0.3:0.3, 0, Math.PI*2); ctx.fill();
      });
      // ลำตัว
      ctx.fillStyle = '#1E7A4A'; ctx.beginPath();
      ctx.ellipse(x, y+size*0.05+b, size*0.32, size*0.48, 0, 0, Math.PI*2); ctx.fill();
      // หัว
      ctx.fillStyle = '#2ABF6A'; ctx.beginPath();
      ctx.arc(x, y-size*0.35+b, size*0.26, 0, Math.PI*2); ctx.fill();
      // มงกุฎ ทรงกรวย
      ctx.fillStyle = '#FFD700'; ctx.beginPath();
      ctx.moveTo(x, y-size*0.72+b); ctx.lineTo(x-size*0.18, y-size*0.56+b); ctx.lineTo(x+size*0.18, y-size*0.56+b); ctx.closePath(); ctx.fill();
      // ตา 3 ตา
      ctx.fillStyle = '#FF4400'; [-0.12,0,0.12].forEach(function(dx) {
        ctx.beginPath(); ctx.arc(x+dx*size, y-size*0.37+b, size*0.05, 0, Math.PI*2); ctx.fill();
      });
    }
  }
};

var STARTER_HERO = HEROES.devasri;

var ALL_HEROES = Object.values(HEROES);

function getHeroById(id) {
  return HEROES[id] || null;
}

// ── Sprite wrapper — ใส่ sprite check ให้ทุก hero ──────────────
(function() {
  Object.keys(HEROES).forEach(function(id) {
    var hero = HEROES[id];
    var origDraw = hero.draw;
    hero.draw = function(ctx, x, y, size, frame) {
      var img = ASSETS && ASSETS.heroes && ASSETS.heroes[id];
      if (drawSprite(ctx, img, x, y, size, frame)) return;
      origDraw.call(this, ctx, x, y, size, frame);
    };
  });
})();
