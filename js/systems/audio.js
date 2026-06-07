// audio.js — Web Audio API sound synthesis
// ไม่พึ่ง asset files — สังเคราะห์เสียงด้วยโค้ดล้วน

let _audioCtx = null;

function _getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

/**
 * เล่นเสียงเดี่ยว
 * @param {number} freq  ความถี่ Hz
 * @param {string} type  'sine' | 'square' | 'sawtooth' | 'triangle'
 * @param {number} duration  วินาที
 * @param {number} volume  0-1
 * @param {number} freqEnd  ความถี่สุดท้าย (สำหรับ pitch sweep)
 */
function playTone(freq, type, duration, volume = 0.4, freqEnd = null) {
  const ac = _getAudioCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + duration);
  }

  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

// ── เสียงเฉพาะ ───────────────────────────────────────────────────

/** ตอบถูก — Normal Hit */
function playHit() {
  playTone(440, 'square', 0.08, 0.3);
  setTimeout(() => playTone(660, 'square', 0.12, 0.25), 60);
}

/** ตอบถูกเร็ว — Fast Hit */
function playFastHit() {
  playTone(520, 'sawtooth', 0.06, 0.3);
  setTimeout(() => playTone(780, 'sawtooth', 0.15, 0.3), 50);
  setTimeout(() => playTone(1040, 'square', 0.1, 0.2), 100);
}

/** ตอบถูกเร็วมาก — Critical! */
function playCritical() {
  playTone(440, 'square',    0.05, 0.4);
  setTimeout(() => playTone(660,  'square', 0.05, 0.4), 40);
  setTimeout(() => playTone(880,  'square', 0.05, 0.4), 80);
  setTimeout(() => playTone(1320, 'sawtooth', 0.2, 0.5, 880), 120);
  // เสียง sparkle เพิ่ม
  setTimeout(() => playTone(2000, 'sine', 0.15, 0.2, 3000), 150);
}

/** ตอบผิด */
function playWrong() {
  playTone(200, 'sawtooth', 0.15, 0.4, 100);
  setTimeout(() => playTone(150, 'sawtooth', 0.2, 0.4, 80), 120);
}

/** หมดเวลา */
function playTimeout() {
  playTone(300, 'triangle', 0.3, 0.3, 150);
}

/** บอสโจมตี */
function playBossAttack() {
  playTone(120, 'sawtooth', 0.1, 0.5, 80);
  setTimeout(() => playTone(100, 'square', 0.25, 0.5), 80);
}

/** บอสตาย */
function playBossDie() {
  const notes = [880, 1100, 1320, 1760];
  notes.forEach((n, i) => setTimeout(() => playTone(n, 'sine', 0.12, 0.4), i * 80));
  setTimeout(() => playTone(2200, 'sine', 0.3, 0.5, 1100), 350);
}

/** Hero ตาย */
function playHeroDie() {
  playTone(330, 'sawtooth', 0.08, 0.4);
  setTimeout(() => playTone(220, 'sawtooth', 0.5, 0.4, 100), 60);
}

/** เริ่มเกม */
function playStart() {
  [262, 330, 392, 523].forEach((n, i) =>
    setTimeout(() => playTone(n, 'triangle', 0.15, 0.3), i * 100)
  );
}

/** Unlock / Resume AudioContext หลัง user interaction */
function resumeAudio() {
  if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
}
