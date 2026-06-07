// progress.js — save/load ด้วย localStorage (Phase 2)
// Scenes ไม่ควรเรียก localStorage ตรงๆ — ใช้ฟังก์ชันใน module นี้เท่านั้น

var SAVE_KEY = 'dechsart_v1';

var DEFAULT_SAVE = {
  maxFloor: 1,
  currentFloor: 1,
  unlockedHeroes: ['devasri'],
  party: ['devasri'],
  totalScore: 0,
  gamesPlayed: 0,
};

function loadProgress() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return Object.assign({}, DEFAULT_SAVE);
    var data = JSON.parse(raw);
    // migration guard: ถ้า field ใหม่ที่ default มีแต่ save เก่าไม่มี ให้ใช้ค่า default
    return Object.assign({}, DEFAULT_SAVE, data);
  } catch (e) {
    console.warn('Save data corrupted, resetting:', e);
    return Object.assign({}, DEFAULT_SAVE);
  }
}

function saveProgress(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save:', e);
  }
}

function updateAfterVictory(data, floor, score) {
  data.maxFloor   = Math.max(data.maxFloor, floor + 1);
  data.currentFloor = Math.min(floor + 1, 60);
  data.totalScore += score;
  data.gamesPlayed++;

  // unlock heroes by floor
  ALL_HEROES.forEach(function(hero) {
    if (floor >= hero.unlockFloor && !data.unlockedHeroes.includes(hero.id)) {
      data.unlockedHeroes.push(hero.id);
    }
  });

  saveProgress(data);
  return data;
}

function updateAfterDefeat(data, score) {
  data.totalScore += score;
  data.gamesPlayed++;
  saveProgress(data);
  return data;
}

function resetProgress() {
  localStorage.removeItem(SAVE_KEY);
  return Object.assign({}, DEFAULT_SAVE);
}
