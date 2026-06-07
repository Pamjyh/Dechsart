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
  opErrors: { '+': 0, '-': 0, '*': 0, '/': 0 },
  crystals: 0,
  pityEpic: 0,
  pityLegendary: 0,
  totalPulls: 0,
  // Phase 4 — Daily & Streak
  lastLoginDate: '',        // 'YYYY-MM-DD' ของวันที่ login ล่าสุด
  loginStreak: 0,           // จำนวนวันติดต่อกัน
  streakRewardClaimed: [],  // วันที่ (YYYY-MM-DD) ที่รับรางวัล streak แล้ว
  daily: {
    date: '',               // วันที่ quest นี้เป็นของ (YYYY-MM-DD)
    correctAnswers: 0,      // quest 1: ตอบถูก
    floorsCleared: 0,       // quest 2: ไต่หอ
    bossDefeated: 0,        // quest 3: สู้บอส
    claimed: [],            // quest ids ที่รับรางวัลแล้ว ['q1','q2','q3']
    wrongAnswers: 0,        // Phase 5: ตอบผิดวันนี้ (สำหรับ teacher dashboard)
  },
  weeklyBoss: {
    weekStart: '',          // 'YYYY-MM-DD' ของวันจันทร์ที่เริ่ม week
    totalDamage: 0,         // damage สะสมของผู้เล่นคนนี้
    defeated: false,        // boss ตายแล้วหรือยัง (local simulation)
    rewardClaimed: false,
  },
  // Phase 5 — Cloud / Social
  nickname: '',             // ชื่อเล่น (สูงสุด 20 ตัว) แสดงใน leaderboard
  classroomCode: '',        // รหัสห้อง 6 ตัว (ว่าง = ไม่ได้เข้าห้อง)
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
    // Phase 5: fire-and-forget sync ไป Supabase (ถ้า ready)
    if (typeof SUPA !== 'undefined' && SUPA.isReady()) {
      SUPA.syncDailyScore(data);
    }
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
