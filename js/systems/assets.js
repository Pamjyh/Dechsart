// assets.js — Image preloader
// โหลดรูปทั้งหมดก่อนเกมเริ่ม

var ASSETS = {
  heroes: {},   // ASSETS.heroes['devasri'] = Image
  bosses: {},   // ASSETS.bosses['fire_king'] = Image
  bg: {},       // ASSETS.bg.battle, ASSETS.bg.menu
  loaded: 0,
  total: 0,
  ready: false,
  onReady: null
};

// ── path map ────────────────────────────────────────────────────
// โฟลเดอร์ที่ gen มาชื่อ 'heros' ไม่ใช่ 'heroes'
var ASSET_PATHS = {
  heroes: {
    devasri:  'assets/heros/devasri.png',
    hanuman:  'assets/heros/hanuman.png',
    naka:     'assets/heros/naka.png',
    kinnari:  'assets/heros/kinnari.png',
    garuda:   'assets/heros/garuda.png',
    indra:    'assets/heros/indra.png',
    wessawan: 'assets/heros/wessawan.png',
    yaksha:   'assets/heros/yaksha.png',
    brahma:   'assets/heros/brahma.png',
    narai:    'assets/heros/narai.png',
  },
  bosses: {
    fire_king:  'assets/bosses/fire_king.png',
    naga_king:  'assets/bosses/naga_king.png',
    storm_king: 'assets/bosses/storm_king.png',
    wind_demon: 'assets/bosses/wind_demon.png',
    final_boss: 'assets/bosses/final_boss.png',
  },
  bg: {
    battle: 'assets/bg/battle_bg.png',
    menu:   'assets/bg/menu_bg.png',
  }
};

/**
 * โหลดรูปทั้งหมด
 * @param {function} onComplete — callback เมื่อโหลดครบ
 * @param {function} onProgress — callback(loaded, total) ระหว่างโหลด
 */
function loadAllAssets(onComplete, onProgress) {
  var entries = [];

  Object.keys(ASSET_PATHS.heroes).forEach(function(id) {
    entries.push({ type: 'hero', id: id, path: ASSET_PATHS.heroes[id] });
  });
  Object.keys(ASSET_PATHS.bosses).forEach(function(id) {
    entries.push({ type: 'boss', id: id, path: ASSET_PATHS.bosses[id] });
  });
  Object.keys(ASSET_PATHS.bg).forEach(function(id) {
    entries.push({ type: 'bg', id: id, path: ASSET_PATHS.bg[id] });
  });

  ASSETS.total  = entries.length;
  ASSETS.loaded = 0;
  ASSETS.ready  = false;

  if (entries.length === 0) {
    ASSETS.ready = true;
    if (onComplete) onComplete();
    return;
  }

  function onLoad(entry) {
    ASSETS.loaded++;
    if (onProgress) onProgress(ASSETS.loaded, ASSETS.total);
    if (ASSETS.loaded >= ASSETS.total) {
      ASSETS.ready = true;
      if (onComplete) onComplete();
    }
  }

  entries.forEach(function(entry) {
    var img = new Image();
    // crossOrigin ต้องตั้งก่อน src เสมอ — ป้องกัน CORS block getImageData
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var result = img; // default: ใช้รูปเดิมถ้า removeWhiteBg ล้มเหลว
      if (entry.type !== 'bg') {
        // hero/boss: ลบ white bg เสมอ
        try {
          result = removeWhiteBg(img, 220);
        } catch(e) {
          console.warn('removeWhiteBg failed for', entry.path, e);
        }
      }
      if (entry.type === 'hero')  ASSETS.heroes[entry.id] = result;
      if (entry.type === 'boss')  ASSETS.bosses[entry.id] = result;
      if (entry.type === 'bg')    ASSETS.bg[entry.id]     = result;
      onLoad(entry);
    };
    img.onerror = function() {
      // ไม่ block เกม ถ้าโหลดไม่ได้ → fallback canvas draw
      console.warn('Asset not loaded:', entry.path);
      // clear slot ออก เพื่อให้ imgReady คืน false → ใช้ canvas draw แทน
      if (entry.type === 'hero')  ASSETS.heroes[entry.id] = null;
      if (entry.type === 'boss')  ASSETS.bosses[entry.id] = null;
      if (entry.type === 'bg')    ASSETS.bg[entry.id]     = null;
      onLoad(entry);
    };
    img.src = entry.path;
  });
}

/** ตรวจว่า image/canvas โหลดสำเร็จและใช้ได้ */
function imgReady(img) {
  if (!img) return false;
  if (img.tagName === 'CANVAS') return img.width > 0; // offscreen canvas
  return img.complete && img.naturalWidth > 0;
}

/** วาด sprite กลาง (x,y) ด้วย size เป็น half-height */
function drawSprite(ctx, img, x, y, halfH, frame) {
  if (!imgReady(img)) return false;
  var ratio  = img.naturalWidth ? img.naturalWidth / img.naturalHeight
               : img.width / img.height;
  var h = halfH * 2;
  var w = h * ratio;
  // pulse เล็กน้อยให้มีชีวิต
  var pulse  = frame ? Math.sin(frame * 0.05) * 0.03 : 0;
  var sw = w * (1 + pulse), sh = h * (1 + pulse);
  ctx.drawImage(img, x - sw / 2, y - sh / 2, sw, sh);
  return true;
}

/**
 * ลบ background ออกจากรูปโดย sample สีจาก corners
 * รองรับทั้ง white, grey, checkerboard backgrounds
 * @param {HTMLImageElement} img
 * @param {number} tolerance — ระยะห่างสีสูงสุด (0-255 per channel, default 50)
 */
function removeWhiteBg(img, tolerance) {
  tolerance = tolerance || 50;

  var c = document.createElement('canvas');
  c.width  = img.naturalWidth  || img.width;
  c.height = img.naturalHeight || img.height;
  var cx = c.getContext('2d');
  cx.drawImage(img, 0, 0);

  var data = cx.getImageData(0, 0, c.width, c.height);
  var px = data.data;
  var W = c.width, H = c.height;

  // ── Sample background color จาก corners + mid-edges ──────────
  function getPx(x, y) {
    var idx = (y * W + x) * 4;
    return [px[idx], px[idx+1], px[idx+2], px[idx+3]];
  }

  var samples = [
    getPx(0, 0),              getPx(W-1, 0),
    getPx(0, H-1),            getPx(W-1, H-1),
    getPx(Math.floor(W/2), 0),getPx(0, Math.floor(H/2)),
    getPx(W-1, Math.floor(H/2)), getPx(Math.floor(W/2), H-1),
  ].filter(function(p) { return p[3] > 100; }); // เฉพาะ opaque

  if (samples.length === 0) return c; // ไม่รู้ bg → คืนเดิม

  var bgR = Math.round(samples.reduce(function(s,p){return s+p[0];},0)/samples.length);
  var bgG = Math.round(samples.reduce(function(s,p){return s+p[1];},0)/samples.length);
  var bgB = Math.round(samples.reduce(function(s,p){return s+p[2];},0)/samples.length);

  var maxDist = tolerance * 3; // Manhattan distance threshold

  // ── ลบ pixels ที่ใกล้เคียง bg color ─────────────────────────
  for (var i = 0; i < px.length; i += 4) {
    if (px[i+3] < 10) continue; // transparent อยู่แล้ว → ข้าม
    var dist = Math.abs(px[i]-bgR) + Math.abs(px[i+1]-bgG) + Math.abs(px[i+2]-bgB);
    if (dist < maxDist) {
      // fade: ยิ่งใกล้ bg → alpha ยิ่งต่ำ
      var alpha = Math.round((dist / maxDist) * px[i+3]);
      px[i+3] = alpha;
    }
  }

  cx.putImageData(data, 0, 0);
  return c;
}
