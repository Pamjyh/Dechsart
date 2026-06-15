// config.js — single source of truth for all balance values
// เดชศาสตร์อนันต์ v0.1

const CONFIG = {
  // ── Firebase (Phase 5) ──────────────────────────────────────
  // ใส่ค่าจาก Firebase Console → Project settings → Your apps → SDK setup
  FIREBASE: {
    apiKey:            'AIzaSyDBtKwK5Ugwv8nZA1s6PtnrCXIvB2I_qv8',
    authDomain:        'dechsart-infinity.firebaseapp.com',
    projectId:         'dechsart-infinity',
    storageBucket:     'dechsart-infinity.firebasestorage.app',
    messagingSenderId: '36918913534',
    appId:             '1:36918913534:web:ec93ff3cb2b0d0d19bb8af',
  },


  // ── Canvas ──────────────────────────────────────────
  CANVAS: {
    BASE_WIDTH: 400,
    BASE_HEIGHT: 700,
  },

  // ── Speed Bonus ──────────────────────────────────────
  SPEED: {
    // ค่า fallback (ไม่ถูกใช้โดยตรงใน battle — ดู TIMER_TIERS)
    CRITICAL_MS: 1500,
    FAST_MS: 3000,
    TIMEOUT_MS: 5000,
    MULTIPLIER_CRIT: 1.8,
    MULTIPLIER_FAST: 1.4,
    MULTIPLIER_NORMAL: 1.0,
  },

  // ── Timer Tiers (Floor-based + Op-based scaling) ──────
  // ตาม TD spec: ยิ่งชั้นสูง + operation ยากขึ้น = เวลาน้อยลง
  // crit/fast เป็น % ของ timeout → scale ตามไปเองอัตโนมัติ
  TIMER_TIERS: [
    // { maxFloor, easy (+-), hard (×÷), critPct, fastPct }
    { maxFloor: 20, easyMs: 8000, hardMs: 10000, critPct: 0.30, fastPct: 0.55 },
    { maxFloor: 40, easyMs: 6000, hardMs:  8000, critPct: 0.25, fastPct: 0.50 },
    { maxFloor: 60, easyMs: 5000, hardMs:  6000, critPct: 0.25, fastPct: 0.50 },
  ],

  // ── Damage ───────────────────────────────────────────
  DAMAGE: {
    HERO_BASE: 20,
    BOSS_BASE: 15,
    WEAK_MULTIPLIER: 2.0,    // boss weak to this element
    RESIST_MULTIPLIER: 0.5,  // boss resists this element
    // Boss Rage Phase
    RAGE_THRESHOLD:    0.30, // HP% ที่ boss เข้า rage (เหลือ 30%)
    RAGE_DMG_MULT:     1.5,  // boss damage multiplier ตอน rage
    RAGE_TIMER_MULT:   0.80, // timer ลดลง 20% ตอน rage
  },

  // ── HP ───────────────────────────────────────────────
  HP: {
    HERO_BASE: 100,
    BOSS_BASE: 350,   // ~10-12 ข้อต่อ boss floor แรก
  },

  // ── Elements ─────────────────────────────────────────
  ELEMENTS: {
    FIRE:  { id: 'fire',  label: '🔥 ไฟ',  op: '+', color: '#FF6B35' },
    WATER: { id: 'water', label: '💧 น้ำ', op: '-', color: '#4ECDC4' },
    THUNDER:{ id:'thunder',label: '⚡ ฟ้า',op: '*', color: '#FFD93D' },
    WIND:  { id: 'wind',  label: '🌪 ลม',  op: '/', color: '#6BCB77' },
  },

  // ── Particles ────────────────────────────────────────
  PARTICLES: {
    HIT_COUNT: 12,
    CRIT_COUNT: 25,
    SPEED_BASE: 4,
    LIFESPAN_MS: 600,
  },

  // ── Colors ───────────────────────────────────────────
  COLORS: {
    BG_TOP:    '#1a0a2e',
    BG_BOTTOM: '#2d1b4e',
    HP_HERO:   '#6BCB77',
    HP_BOSS:   '#FF6B6B',
    HP_BG:     '#333',
    TIMER_BAR: '#FFD93D',
    TEXT_MAIN: '#FFFFFF',
    TEXT_SHADOW: '#000000',
    ANSWER_BTN: '#2a1a4e',
    ANSWER_HOVER: '#3d2a6e',
    ANSWER_CORRECT: '#2d7a3a',
    ANSWER_WRONG: '#7a2d2d',
  },
};
