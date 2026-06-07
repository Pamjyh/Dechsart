// daily.js — Daily Quest, Login Streak, Weekly Boss (Phase 4)
// ใช้ร่วมกับ progress.js เสมอ — ไม่แตะ localStorage ตรงๆ

// ---- helpers ----

function todayStr() {
  var d = new Date();
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

function mondayOfWeek(dateStr) {
  // คืน 'YYYY-MM-DD' ของวันจันทร์ของสัปดาห์ที่ dateStr อยู่
  var d = new Date(dateStr);
  var day = d.getDay(); // 0=Sun,1=Mon,...
  var diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

function daysBetween(dateStr1, dateStr2) {
  var d1 = new Date(dateStr1);
  var d2 = new Date(dateStr2);
  return Math.round((d2 - d1) / 86400000);
}

// ---- Daily Quest config ----

var DAILY_QUESTS = [
  { id: 'q1', label: 'ตอบถูก 15 ข้อ',  key: 'correctAnswers', target: 15, reward: 3 },
  { id: 'q2', label: 'ไต่หอ 3 ชั้น',   key: 'floorsCleared',  target: 3,  reward: 2 },
  { id: 'q3', label: 'สู้บอส 1 ครั้ง', key: 'bossDefeated',   target: 1,  reward: 5 },
];

// Weekly Boss config
var WEEKLY_BOSS_HP = 5000; // HP รวมที่ต้องการเพื่อ "ทำลาย" (local simulation)

// ---- Login Streak ----

// เรียกตอนเปิดเกม — อัปเดต streak และ reset daily ถ้าวันใหม่
function checkLoginStreak(save) {
  var today = todayStr();

  // reset daily quest ถ้าวันใหม่
  if (save.daily.date !== today) {
    save.daily = {
      date: today,
      correctAnswers: 0,
      floorsCleared: 0,
      bossDefeated: 0,
      claimed: [],
    };
  }

  // update streak
  if (save.lastLoginDate === '') {
    // login ครั้งแรก
    save.loginStreak = 1;
  } else if (save.lastLoginDate === today) {
    // login วันเดิม ไม่ต้องทำอะไร
  } else {
    var diff = daysBetween(save.lastLoginDate, today);
    if (diff === 1) {
      save.loginStreak += 1;
    } else {
      // ขาดวัน — reset streak
      save.loginStreak = 1;
    }
  }

  save.lastLoginDate = today;

  // reset weekly boss ถ้าสัปดาห์ใหม่
  var thisMonday = mondayOfWeek(today);
  if (save.weeklyBoss.weekStart !== thisMonday) {
    save.weeklyBoss = {
      weekStart: thisMonday,
      totalDamage: 0,
      defeated: false,
      rewardClaimed: false,
    };
  }

  return save;
}

// ---- Quest Progress ----

// เรียกหลังตอบถูก (จาก battle.js)
function onCorrectAnswer(save) {
  if (save.daily.date === todayStr()) {
    save.daily.correctAnswers += 1;
  }
  return save;
}

// เรียกหลัง floor clear (จาก battle.js หลัง victory)
function onFloorCleared(save) {
  if (save.daily.date === todayStr()) {
    save.daily.floorsCleared += 1;
  }
  return save;
}

// เรียกหลัง boss floor clear
function onBossDefeated(save, damageDealt) {
  if (save.daily.date === todayStr()) {
    save.daily.bossDefeated = Math.min(save.daily.bossDefeated + 1, 1);
  }
  // weekly boss damage
  if (save.weeklyBoss.weekStart === mondayOfWeek(todayStr())) {
    save.weeklyBoss.totalDamage += (damageDealt || 100);
    if (save.weeklyBoss.totalDamage >= WEEKLY_BOSS_HP && !save.weeklyBoss.defeated) {
      save.weeklyBoss.defeated = true;
    }
  }
  return save;
}

// ---- Claim Rewards ----

// claim daily quest reward — คืน crystal ที่ได้, หรือ 0 ถ้า claim ไม่ได้
function claimDailyQuest(save, questId) {
  var quest = null;
  for (var i = 0; i < DAILY_QUESTS.length; i++) {
    if (DAILY_QUESTS[i].id === questId) { quest = DAILY_QUESTS[i]; break; }
  }
  if (!quest) return 0;
  if (save.daily.claimed.indexOf(questId) !== -1) return 0; // claim แล้ว
  if (save.daily[quest.key] < quest.target) return 0; // ยังไม่ครบ

  save.daily.claimed.push(questId);
  save.crystals += quest.reward;
  return quest.reward;
}

// claim weekly boss reward
function claimWeeklyBossReward(save) {
  if (!save.weeklyBoss.defeated) return 0;
  if (save.weeklyBoss.rewardClaimed) return 0;
  save.weeklyBoss.rewardClaimed = true;
  save.crystals += 20; // รางวัล weekly boss
  return 20;
}

// claim streak milestone reward (ทุก 7 วัน)
function claimStreakReward(save) {
  if (save.loginStreak % 7 !== 0) return null;
  var today = todayStr();
  if (save.streakRewardClaimed.indexOf(today) !== -1) return null;

  // ให้ Epic hero สุ่มที่ยังไม่มี
  var epicHeroes = ALL_HEROES.filter(function(h) {
    return h.rarity === 'epic' && save.unlockedHeroes.indexOf(h.id) === -1;
  });
  if (epicHeroes.length === 0) {
    // มีครบแล้ว — ให้ crystal แทน
    save.crystals += 50;
    save.streakRewardClaimed.push(today);
    return { type: 'crystal', amount: 50 };
  }

  var hero = epicHeroes[Math.floor(Math.random() * epicHeroes.length)];
  save.unlockedHeroes.push(hero.id);
  save.streakRewardClaimed.push(today);
  return { type: 'hero', hero: hero };
}

// ---- Quest Status helpers (ใช้ใน UI) ----

function getDailyQuestStatus(save) {
  return DAILY_QUESTS.map(function(q) {
    return {
      id: q.id,
      label: q.label,
      reward: q.reward,
      current: Math.min(save.daily[q.key], q.target),
      target: q.target,
      done: save.daily[q.key] >= q.target,
      claimed: save.daily.claimed.indexOf(q.id) !== -1,
    };
  });
}

function getStreakStatus(save) {
  return {
    streak: save.loginStreak,
    nextMilestone: 7 - (save.loginStreak % 7),
    milestoneReady: save.loginStreak > 0 && save.loginStreak % 7 === 0,
  };
}

function getWeeklyBossStatus(save) {
  var hp = save.weeklyBoss.totalDamage;
  return {
    hp: hp,
    maxHp: WEEKLY_BOSS_HP,
    pct: Math.min(hp / WEEKLY_BOSS_HP, 1),
    defeated: save.weeklyBoss.defeated,
    rewardClaimed: save.weeklyBoss.rewardClaimed,
    weekStart: save.weeklyBoss.weekStart,
  };
}
