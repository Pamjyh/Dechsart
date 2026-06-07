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
    img.onload  = function() { onLoad(entry); };
    img.onerror = function() {
      // ไม่ block เกม ถ้าโหลดไม่ได้ → fallback canvas
      console.warn('Asset not loaded:', entry.path);
      onLoad(entry);
    };
    img.src = entry.path;

    if (entry.type === 'hero')  ASSETS.heroes[entry.id] = img;
    if (entry.type === 'boss')  ASSETS.bosses[entry.id] = img;
    if (entry.type === 'bg')    ASSETS.bg[entry.id]     = img;
  });
}

/** ตรวจว่า image โหลดสำเร็จและใช้ได้ */
function imgReady(img) {
  return img && img.complete && img.naturalWidth > 0;
}

/** วาด sprite กลาง (x,y) ด้วย size เป็น half-height */
function drawSprite(ctx, img, x, y, halfH, frame) {
  if (!imgReady(img)) return false;
  var ratio  = img.naturalWidth / img.naturalHeight;
  var h = halfH * 2;
  var w = h * ratio;
  // pulse เล็กน้อยให้มีชีวิต
  var pulse  = frame ? Math.sin(frame * 0.05) * 0.03 : 0;
  var sw = w * (1 + pulse), sh = h * (1 + pulse);
  ctx.drawImage(img, x - sw / 2, y - sh / 2, sw, sh);
  return true;
}
