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
 * ลบ white/near-white background ออกจากรูป
 * คืน OffscreenCanvas หรือ canvas element ที่ draw ได้
 * @param {HTMLImageElement} img
 * @param {number} threshold — 0-255 (230 = ลบสีขาวและเทาอ่อน)
 */
function removeWhiteBg(img, threshold) {
  threshold = threshold || 215;  // pixels สว่างกว่านี้ → ถูกลบ
  var hardCut = 240;             // สว่างกว่านี้ → ลบทันที (no fade)
  var c = document.createElement('canvas');
  c.width  = img.naturalWidth;
  c.height = img.naturalHeight;
  var cx = c.getContext('2d');
  cx.drawImage(img, 0, 0);

  var data = cx.getImageData(0, 0, c.width, c.height);
  var px   = data.data;

  for (var i = 0; i < px.length; i += 4) {
    var r = px[i], g = px[i+1], b = px[i+2];
    if (r > threshold && g > threshold && b > threshold) {
      var brightness = (r + g + b) / 3;
      var alpha;
      if (brightness >= hardCut) {
        alpha = 0; // สว่างมาก → ลบทันที
      } else {
        // fade zone: threshold~hardCut → alpha 255~0 (aggressive curve)
        var t = (brightness - threshold) / (hardCut - threshold);
        alpha = Math.round(255 * Math.pow(1 - t, 2)); // quadratic fade
      }
      px[i+3] = Math.min(px[i+3], alpha);
    }
  }

  cx.putImageData(data, 0, 0);
  return c;
}
