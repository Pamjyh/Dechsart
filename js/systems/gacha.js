// gacha.js — ระบบ "พิธีปลุกเสก"

var GACHA_RATES = [
  { rarity: 'legendary', rate: 0.02 },
  { rarity: 'epic',      rate: 0.08 },
  { rarity: 'rare',      rate: 0.30 },
  { rarity: 'common',    rate: 0.60 },
];

var GACHA_COST_SINGLE = 50;
var GACHA_COST_TEN    = 450;
var PITY_EPIC        = 50;   // ครั้งที่ 50 = Epic guaranteed
var PITY_LEGENDARY   = 100;  // ครั้งที่ 100 = Legendary guaranteed

// Crystal rewards per battle
var CRYSTAL_WIN_BASE  = 5;
var CRYSTAL_WIN_BOSS  = 10;  // ทุก 10 ชั้น
var CRYSTAL_CRIT_BONUS = 1;  // ต่อ critical hit ในรอบ (max 3)

function rollRarity(pityEpic, pityLegendary) {
  // Pity overrides
  if (pityLegendary >= PITY_LEGENDARY) return 'legendary';
  if (pityEpic      >= PITY_EPIC)      return 'epic';

  var roll = Math.random();
  var cum  = 0;
  for (var i = 0; i < GACHA_RATES.length; i++) {
    cum += GACHA_RATES[i].rate;
    if (roll < cum) return GACHA_RATES[i].rarity;
  }
  return 'common';
}

function pickHeroByRarity(rarity, unlockedIds) {
  var pool = ALL_HEROES.filter(function(h) {
    return h.rarity === rarity && !unlockedIds.includes(h.id);
  });
  // ถ้า rarity นั้น unlock หมดแล้ว → ลด rarity ลงหนึ่งขั้น
  if (pool.length === 0) {
    var fallback = { legendary:'epic', epic:'rare', rare:'common', common:'common' };
    pool = ALL_HEROES.filter(function(h) {
      return h.rarity === fallback[rarity];
    });
  }
  if (pool.length === 0) return ALL_HEROES[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * ทำการ pull 1 ครั้ง
 * @param {object} save — progress save object (จะถูก mutate)
 * @returns {{ hero: heroObj, rarity: string, isNew: boolean }} | null (ถ้า crystals ไม่พอ)
 */
function gachaPullOne(save) {
  if (save.crystals < GACHA_COST_SINGLE) return null;

  save.crystals -= GACHA_COST_SINGLE;
  save.pityEpic      = (save.pityEpic      || 0) + 1;
  save.pityLegendary = (save.pityLegendary || 0) + 1;

  var rarity = rollRarity(save.pityEpic, save.pityLegendary);
  var hero   = pickHeroByRarity(rarity, save.unlockedHeroes);
  var isNew  = !save.unlockedHeroes.includes(hero.id);

  // reset pity ถ้าได้ตามเกณฑ์
  if (rarity === 'legendary') { save.pityLegendary = 0; save.pityEpic = 0; }
  else if (rarity === 'epic') { save.pityEpic = 0; }

  if (isNew) save.unlockedHeroes.push(hero.id);

  return { hero: hero, rarity: rarity, isNew: isNew };
}

/**
 * ทำการ pull 10 ครั้ง (guarantee อย่างน้อย 1 Rare)
 */
function gachaPullTen(save) {
  if (save.crystals < GACHA_COST_TEN) return null;

  save.crystals -= GACHA_COST_TEN; // หัก 450 ครั้งเดียว
  save.pityEpic      = save.pityEpic      || 0;
  save.pityLegendary = save.pityLegendary || 0;

  var results = [];
  for (var i = 0; i < 10; i++) {
    save.pityEpic++;
    save.pityLegendary++;
    var rarity = rollRarity(save.pityEpic, save.pityLegendary);
    var hero   = pickHeroByRarity(rarity, save.unlockedHeroes);
    var isNew  = !save.unlockedHeroes.includes(hero.id);
    if (rarity === 'legendary') { save.pityLegendary = 0; save.pityEpic = 0; }
    else if (rarity === 'epic') { save.pityEpic = 0; }
    if (isNew) save.unlockedHeroes.push(hero.id);
    results.push({ hero: hero, rarity: rarity, isNew: isNew });
  }

  // Guarantee: อย่างน้อย 1 Rare+
  var hasRarePlus = results.some(function(r) {
    return r.rarity === 'rare' || r.rarity === 'epic' || r.rarity === 'legendary';
  });
  if (!hasRarePlus) {
    var rareHero = pickHeroByRarity('rare', save.unlockedHeroes);
    var rIsNew   = !save.unlockedHeroes.includes(rareHero.id);
    if (rIsNew) save.unlockedHeroes.push(rareHero.id);
    results[results.length - 1] = { hero: rareHero, rarity: 'rare', isNew: rIsNew };
  }

  return results;
}

/**
 * คำนวณ crystals ที่ได้จากชัยชนะ
 */
function calcCrystalReward(floor, critCount) {
  var base   = (floor % 10 === 0) ? CRYSTAL_WIN_BOSS : CRYSTAL_WIN_BASE;
  var bonus  = Math.min(critCount || 0, 3) * CRYSTAL_CRIT_BONUS;
  return base + bonus;
}
