// bosses.js — boss data สำหรับทุกชั้น

var BOSSES = {

  // Floors 1-10: ไฟ
  fire_king: {
    id: 'fire_king', name: 'ราชันเพลิง', element: 'fire',
    hpMultiplier: 1.0, weak: 'water', resist: 'fire',
    floorRange: [1, 10],
    draw: function(ctx, x, y, size, frame) {
      var p = Math.sin(frame * 0.08) * 4;
      for (var i = 0; i < 8; i++) {
        var angle = (i/8)*Math.PI*2 + frame*0.02;
        var fx = x + Math.cos(angle)*(size*0.6+p), fy = y + Math.sin(angle)*(size*0.6+p);
        var g = ctx.createRadialGradient(fx,fy,0,fx,fy,size*0.2);
        g.addColorStop(0,'rgba(255,100,0,0.8)'); g.addColorStop(1,'rgba(255,50,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx,fy,size*0.22,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#8B0000'; ctx.beginPath(); ctx.ellipse(x,y+p*0.5,size*0.45,size*0.55,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#A00000'; ctx.beginPath(); ctx.arc(x,y-size*0.35+p*0.3,size*0.32,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF4500';
      [[x-size*0.2,x-size*0.35,x-size*0.08],[x+size*0.2,x+size*0.35,x+size*0.08]].forEach(function(pts) {
        ctx.beginPath(); ctx.moveTo(pts[0],y-size*0.55+p*0.3); ctx.lineTo(pts[1],y-size*0.85+p*0.3); ctx.lineTo(pts[2],y-size*0.6+p*0.3); ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = '#FFD700';
      [x-size*0.1,x+size*0.1].forEach(function(ex) { ctx.beginPath(); ctx.arc(ex,y-size*0.38+p*0.3,size*0.07,0,Math.PI*2); ctx.fill(); });
    }
  },

  // Floors 11-20: น้ำ
  naga_king: {
    id: 'naga_king', name: 'นาคราชน้ำวน', element: 'water',
    hpMultiplier: 1.2, weak: 'thunder', resist: 'water',
    floorRange: [11, 20],
    draw: function(ctx, x, y, size, frame) {
      var w = Math.sin(frame * 0.05) * 6;
      // วังวน
      ctx.strokeStyle = '#1A90D0'; ctx.lineWidth = size*0.25;
      ctx.beginPath(); ctx.arc(x, y, size*0.5, frame*0.02, frame*0.02+Math.PI*1.5); ctx.stroke();
      ctx.strokeStyle = '#4EC8FF'; ctx.lineWidth = size*0.12;
      ctx.beginPath(); ctx.arc(x, y, size*0.5, frame*0.02+0.2, frame*0.02+Math.PI*1.7); ctx.stroke();
      ctx.lineWidth = 1;
      // หัว
      ctx.fillStyle = '#0066AA'; ctx.beginPath();
      ctx.ellipse(x+Math.cos(frame*0.02+Math.PI*1.5)*size*0.5, y+Math.sin(frame*0.02+Math.PI*1.5)*size*0.5, size*0.35, size*0.25, frame*0.02+Math.PI*1.5, 0, Math.PI*2); ctx.fill();
      // มงกุฎนาค 7 หัว (แบบย่อ)
      ctx.fillStyle = '#003388';
      for (var i = 0; i < 5; i++) {
        var a = ((i-2)/4)*0.8;
        ctx.beginPath(); ctx.moveTo(x+Math.cos(frame*0.02+Math.PI*1.5)*size*0.5, y+Math.sin(frame*0.02+Math.PI*1.5)*size*0.5-size*0.15);
        ctx.lineTo(x+Math.cos(frame*0.02+Math.PI*1.5+a)*size*0.65, y+Math.sin(frame*0.02+Math.PI*1.5)*size*0.5-size*0.35);
        ctx.lineTo(x+Math.cos(frame*0.02+Math.PI*1.5+a+0.2)*size*0.5, y+Math.sin(frame*0.02+Math.PI*1.5)*size*0.5-size*0.12);
        ctx.closePath(); ctx.fill();
      }
      // ตา
      ctx.fillStyle = '#FFD700'; ctx.beginPath();
      ctx.arc(x+Math.cos(frame*0.02+Math.PI*1.5)*size*0.5+size*0.1, y+Math.sin(frame*0.02+Math.PI*1.5)*size*0.5, size*0.07, 0, Math.PI*2); ctx.fill();
    }
  },

  // Floors 21-35: ฟ้า
  storm_king: {
    id: 'storm_king', name: 'ราชาพายุฟ้า', element: 'thunder',
    hpMultiplier: 1.5, weak: 'wind', resist: 'thunder',
    floorRange: [21, 35],
    draw: function(ctx, x, y, size, frame) {
      var b = Math.sin(frame * 0.06) * 5;
      var flash = Math.sin(frame * 0.2) > 0.7;
      // เมฆพายุ
      ctx.fillStyle = flash ? 'rgba(200,200,255,0.6)' : 'rgba(50,50,100,0.7)';
      [[-size*0.4,-size*0.1,size*0.35],[0,-size*0.2,size*0.4],[size*0.35,-size*0.05,size*0.3]].forEach(function(c) {
        ctx.beginPath(); ctx.arc(x+c[0],y+c[1]+b,c[2],0,Math.PI*2); ctx.fill();
      });
      // สายฟ้า
      if (flash) {
        ctx.strokeStyle = '#FFFF00'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x,y-size*0.15+b); ctx.lineTo(x+size*0.12,y+size*0.1+b);
        ctx.lineTo(x-size*0.05,y+size*0.2+b); ctx.lineTo(x+size*0.1,y+size*0.5+b); ctx.stroke();
        ctx.lineWidth = 1;
      }
      // ลำตัว
      ctx.fillStyle = '#334'; ctx.beginPath();
      ctx.ellipse(x,y+size*0.2+b,size*0.3,size*0.4,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#223'; ctx.beginPath();
      ctx.arc(x,y-size*0.2+b,size*0.25,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#88AAFF';
      [x-size*0.1,x+size*0.1].forEach(function(ex) { ctx.beginPath(); ctx.arc(ex,y-size*0.22+b,size*0.07,0,Math.PI*2); ctx.fill(); });
    }
  },

  // Floors 36-50: ลม
  wind_demon: {
    id: 'wind_demon', name: 'จอมมารลมปั่น', element: 'wind',
    hpMultiplier: 1.8, weak: 'fire', resist: 'wind',
    floorRange: [36, 50],
    draw: function(ctx, x, y, size, frame) {
      var spin = frame * 0.04;
      var b = Math.sin(frame * 0.05) * 4;
      // กระแสลม วนรอบ
      ctx.strokeStyle = 'rgba(100,220,100,0.5)'; ctx.lineWidth = size*0.06;
      for (var i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(x, y+b, size*(0.4+i*0.15), spin+i*0.7, spin+i*0.7+Math.PI*1.2); ctx.stroke();
      }
      ctx.lineWidth = 1;
      // ลำตัว
      ctx.fillStyle = '#1A4A1A'; ctx.beginPath();
      ctx.ellipse(x,y+size*0.1+b,size*0.35,size*0.5,spin*0.2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2A6A2A'; ctx.beginPath();
      ctx.arc(x,y-size*0.32+b,size*0.28,0,Math.PI*2); ctx.fill();
      // ตาพายุ
      [x-size*0.1,x+size*0.1].forEach(function(ex) {
        ctx.fillStyle = '#00FF44'; ctx.beginPath(); ctx.arc(ex,y-size*0.34+b,size*0.07,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#003300'; ctx.beginPath(); ctx.arc(ex,y-size*0.34+b,size*0.03,0,Math.PI*2); ctx.fill();
      });
      // ผม/เส้นลม
      ctx.strokeStyle = '#5AE05A'; ctx.lineWidth = size*0.05;
      for (var j = 0; j < 6; j++) {
        var a = spin*2 + (j/6)*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(x,y-size*0.32+b);
        ctx.quadraticCurveTo(x+Math.cos(a)*size*0.4,y-size*0.32+b+Math.sin(a)*size*0.3,x+Math.cos(a)*size*0.5,y-size*0.32+b+Math.sin(a)*size*0.5);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }
  },

  // Floors 51-60: เงา (Final Boss)
  final_boss: {
    id: 'final_boss', name: 'ท้าวอนันตาสูร', element: 'shadow',
    hpMultiplier: 1.8, weak: 'mixed', resist: 'shadow',
    floorRange: [51, 60],
    draw: function(ctx, x, y, size, frame) {
      var b = Math.sin(frame * 0.04) * 5;
      var pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
      // void portal
      ctx.globalAlpha = pulse * 0.6;
      var grd = ctx.createRadialGradient(x,y+b,size*0.1,x,y+b,size*1.2);
      grd.addColorStop(0,'rgba(80,0,120,0.9)'); grd.addColorStop(0.5,'rgba(20,0,40,0.7)'); grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x,y+b,size*1.2,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      // ลำตัว (ทรงสูง)
      ctx.fillStyle = '#0D0020'; ctx.beginPath();
      ctx.ellipse(x,y+size*0.1+b,size*0.38,size*0.58,0,0,Math.PI*2); ctx.fill();
      // เกราะ void
      ctx.strokeStyle = '#9933FF'; ctx.lineWidth = 2;
      ctx.strokeRect(x-size*0.3,y-size*0.15+b,size*0.6,size*0.12);
      ctx.strokeRect(x-size*0.25,y+size*0.05+b,size*0.5,size*0.1);
      ctx.lineWidth = 1;
      // หัว
      ctx.fillStyle = '#1A0030'; ctx.beginPath();
      ctx.arc(x,y-size*0.38+b,size*0.3,0,Math.PI*2); ctx.fill();
      // มงกุฎ void
      ctx.fillStyle = '#6600CC';
      [0,1,2,3,4].forEach(function(i) {
        var a = ((i-2)/4)*0.9 - Math.PI/2;
        ctx.beginPath(); ctx.moveTo(x,y-size*0.62+b);
        ctx.lineTo(x+Math.cos(a)*size*0.2,y-size*0.62+b+Math.sin(a)*size*0.2);
        ctx.lineTo(x+Math.cos(a+0.2)*size*0.12,y-size*0.52+b); ctx.closePath(); ctx.fill();
      });
      // ตา 3 ดวง (สีม่วง)
      ctx.fillStyle = '#CC44FF';
      [-0.12,0,0.12].forEach(function(dx) {
        ctx.beginPath(); ctx.arc(x+dx*size,y-size*0.4+b,size*0.06*(1+Math.sin(frame*0.1)*0.3),0,Math.PI*2); ctx.fill();
      });
      // void tendrils
      ctx.strokeStyle = 'rgba(150,0,255,0.5)'; ctx.lineWidth = 2;
      for (var i = 0; i < 6; i++) {
        var a = (i/6)*Math.PI*2 + frame*0.02;
        ctx.beginPath(); ctx.moveTo(x,y+b);
        ctx.quadraticCurveTo(x+Math.cos(a)*size*0.6,y+Math.sin(a)*size*0.5+b,x+Math.cos(a)*size*0.9,y+Math.sin(a)*size*0.8+b);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }
  }
};

function getBossForFloor(floor) {
  return Object.values(BOSSES).find(function(b) {
    return floor >= b.floorRange[0] && floor <= b.floorRange[1];
  }) || BOSSES.fire_king;
}

function getBossHP(floor) {
  var boss = getBossForFloor(floor);
  return Math.floor(CONFIG.HP.BOSS_BASE * boss.hpMultiplier * (1 + Math.floor(floor/10)*0.05));
}

// ── Endless Arena ───────────────────────────────────────────────
var BOSS_POOL_IDS = ['fire_king', 'naga_king', 'storm_king', 'wind_demon', 'final_boss'];

function getBossForEndless(endlessFloor) {
  var idx = (endlessFloor * 7 + 3) % BOSS_POOL_IDS.length;
  return BOSSES[BOSS_POOL_IDS[idx]];
}

function getBossHPEndless(endlessFloor) {
  var boss = getBossForEndless(endlessFloor);
  return Math.floor(CONFIG.HP.BOSS_BASE * boss.hpMultiplier * (1 + endlessFloor * 0.15));
}

// ── Sprite wrapper — boss sprites ───────────────────────────────
(function() {
  Object.keys(BOSSES).forEach(function(id) {
    var boss = BOSSES[id];
    var origDraw = boss.draw;
    boss.draw = function(ctx, x, y, size, frame) {
      var img = ASSETS && ASSETS.bosses && ASSETS.bosses[id];
      // boss sprite ใหญ่กว่า hero: size * 1.4
      if (drawSprite(ctx, img, x, y, size * 1.4, frame)) return;
      origDraw.call(this, ctx, x, y, size, frame);
    };
  });
})();
