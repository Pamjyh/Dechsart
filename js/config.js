// config.js — single source of truth for all balance values
// เดชศาสตร์อนันต์ v0.1

const CONFIG = {
  // ── Canvas ──────────────────────────────────────────
  CANVAS: {
    BASE_WIDTH: 400,
    BASE_HEIGHT: 700,
  },

  // ── Speed Bonus ──────────────────────────────────────
  SPEED: {
    CRITICAL_MS: 1500,   // < 1.5s = Critical Hit
    FAST_MS: 3000,        // < 3s   = Fast Hit
    TIMEOUT_MS: 5000,     // > 5s   = Miss
    MULTIPLIER_CRIT: 1.8,
    MULTIPLIER_FAST: 1.4,
    MULTIPLIER_NORMAL: 1.0,
  },

  // ── Damage ───────────────────────────────────────────
  DAMAGE: {
    HERO_BASE: 20,
    BOSS_BASE: 15,
    WEAK_MULTIPLIER: 2.0,    // boss weak to this element
    RESIST_MULTIPLIER: 0.5,  // boss resists this element
  },

  // ── HP ───────────────────────────────────────────────
  HP: {
    HERO_BASE: 100,
    BOSS_BASE: 200,
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
