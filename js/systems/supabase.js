// supabase.js — Cloud sync layer (Phase 5)
// localStorage = primary save (offline OK), Supabase = async mirror
// fire-and-forget: ถ้า Supabase ล้มเหลว game ยังเดินต่อได้ปกติ

var SUPA = (function () {

  var _client = null;
  var _ready  = false;

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    var url = CONFIG.SUPABASE && CONFIG.SUPABASE.URL;
    var key = CONFIG.SUPABASE && CONFIG.SUPABASE.ANON_KEY;
    if (!url || url === 'YOUR_SUPABASE_URL') {
      console.info('[SUPA] ยังไม่ตั้งค่า — ใช้ localStorage อย่างเดียว');
      return;
    }
    try {
      _client = window.supabase.createClient(url, key);
      _ready  = true;
      console.info('[SUPA] connected');
    } catch (e) {
      console.warn('[SUPA] init failed:', e);
    }
  }

  function isReady() { return _ready && !!_client; }

  // ── Anonymous auth (UUID เก็บใน localStorage) ─────────────────
  function _getUserId() {
    var stored = localStorage.getItem('supa_uid');
    if (stored) return Promise.resolve(stored);
    return _client.auth.signInAnonymously().then(function (res) {
      if (res.error) throw new Error(res.error.message);
      var uid = res.data.user.id;
      localStorage.setItem('supa_uid', uid);
      return uid;
    });
  }

  // ── Upsert user profile ────────────────────────────────────────
  // เรียกหลัง nickname หรือ classroomCode เปลี่ยน
  function upsertUser(save, cb) {
    if (!isReady()) { cb && cb(null); return; }
    _getUserId().then(function (uid) {
      return _client.from('users').upsert({
        id: uid,
        nickname: save.nickname || 'นักรบนิรนาม',
        classroom_code: save.classroomCode || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }).then(function (res) {
      if (res.error) console.warn('[SUPA] upsertUser:', res.error.message);
      cb && cb(res.data);
    }).catch(function (e) {
      console.warn('[SUPA] upsertUser error:', e);
      cb && cb(null);
    });
  }

  // ── Sync daily score (fire-and-forget) ────────────────────────
  // damage_dealt = correctAnswers × 25 (proxy — no battle.js changes needed)
  function syncDailyScore(save) {
    if (!isReady()) return;
    var today = todayStr();
    _getUserId().then(function (uid) {
      var dmg = (save.daily.correctAnswers || 0) * 25;
      return _client.from('daily_scores').upsert({
        user_id:         uid,
        date:            today,
        damage_dealt:    dmg,
        correct_answers: save.daily.correctAnswers || 0,
        wrong_answers:   save.daily.wrongAnswers   || 0,
        op_errors:       save.opErrors             || {},
        floor_reached:   save.maxFloor             || 1,
        classroom_code:  save.classroomCode        || null
      }, { onConflict: 'user_id,date' });
    }).then(function (res) {
      if (res.error) console.warn('[SUPA] syncDailyScore:', res.error.message);
    }).catch(function (e) {
      console.warn('[SUPA] syncDailyScore error:', e);
    });
  }

  // ── Fetch leaderboard ─────────────────────────────────────────
  // classroomCode = null → global top 30
  function getLeaderboard(date, classroomCode, cb) {
    if (!isReady()) { cb([]); return; }
    var q = _client
      .from('daily_scores')
      .select('damage_dealt, correct_answers, users(nickname)')
      .eq('date', date)
      .order('damage_dealt', { ascending: false })
      .limit(30);
    if (classroomCode) q = q.eq('classroom_code', classroomCode);
    q.then(function (res) {
      if (res.error) { console.warn('[SUPA] getLeaderboard:', res.error.message); cb([]); return; }
      // flatten nested users(nickname) → { nickname, damage_dealt, correct_answers }
      var rows = (res.data || []).map(function (r) {
        return {
          nickname:        (r.users && r.users.nickname) || 'นักรบนิรนาม',
          damage_dealt:    r.damage_dealt    || 0,
          correct_answers: r.correct_answers || 0
        };
      });
      cb(rows);
    }).catch(function (e) { console.warn('[SUPA] getLeaderboard error:', e); cb([]); });
  }

  // ── Join classroom ─────────────────────────────────────────────
  // cb({ ok: true, name }) หรือ cb({ ok: false, msg })
  function joinClassroom(code, save, cb) {
    if (!isReady()) { cb({ ok: false, msg: 'ออฟไลน์ — ตั้งค่า Supabase ก่อน' }); return; }
    _client.from('classrooms').select('name').eq('code', code.toUpperCase()).single()
      .then(function (res) {
        if (res.error || !res.data) {
          cb({ ok: false, msg: 'ไม่พบรหัสห้อง "' + code.toUpperCase() + '"' });
          return;
        }
        save.classroomCode = code.toUpperCase();
        saveProgress(save);
        upsertUser(save, function () {
          cb({ ok: true, name: res.data.name });
        });
      }).catch(function (e) {
        cb({ ok: false, msg: 'ข้อผิดพลาด: ' + e.message });
      });
  }

  // ── Create classroom (ครู) ─────────────────────────────────────
  // สร้างรหัสสุ่ม 6 ตัว, cb(code, null) หรือ cb(null, errorMsg)
  function createClassroom(name, teacherEmail, cb) {
    if (!isReady()) { cb(null, 'ออฟไลน์'); return; }
    var code = _genCode();
    _client.from('classrooms').insert({
      code: code, name: name, teacher_email: teacherEmail
    }).then(function (res) {
      if (res.error) { cb(null, res.error.message); return; }
      cb(code, null);
    }).catch(function (e) { cb(null, e.message); });
  }

  // ── Sync weekly boss damage ────────────────────────────────────
  function syncWeeklyBoss(save) {
    if (!isReady()) return;
    var wk = weekStartStr();
    _getUserId().then(function (uid) {
      return _client.from('weekly_boss_damage').upsert({
        user_id:        uid,
        week_start:     wk,
        damage:         save.weeklyBoss.totalDamage || 0,
        classroom_code: save.classroomCode || null
      }, { onConflict: 'user_id,week_start' });
    }).then(function (res) {
      if (res.error) console.warn('[SUPA] weeklyBoss:', res.error.message);
    }).catch(function (e) { console.warn('[SUPA] weeklyBoss error:', e); });
  }

  // รวม damage ทั้งห้องต่อบอสสัปดาห์นี้ → cb(hpRemaining)
  function getWeeklyBossHP(classroomCode, cb) {
    if (!isReady()) { cb(null); return; }
    var wk = weekStartStr();
    var q  = _client.from('weekly_boss_damage')
      .select('damage').eq('week_start', wk);
    if (classroomCode) q = q.eq('classroom_code', classroomCode);
    q.then(function (res) {
      if (res.error) { cb(null); return; }
      var total = (res.data || []).reduce(function (s, r) { return s + (r.damage || 0); }, 0);
      cb(Math.max(0, 5000 - total));
    }).catch(function () { cb(null); });
  }

  // ── Teacher dashboard data ─────────────────────────────────────
  // ดึงข้อมูลนักเรียนในห้อง (7 วันล่าสุด)
  function getClassroomStats(classroomCode, cb) {
    if (!isReady()) { cb(null); return; }
    _client.from('daily_scores')
      .select('user_id, date, damage_dealt, correct_answers, wrong_answers, op_errors, floor_reached, users(nickname)')
      .eq('classroom_code', classroomCode)
      .order('date', { ascending: false })
      .limit(210)   // 30 students × 7 days
      .then(function (res) {
        if (res.error) { console.warn('[SUPA] classStats:', res.error.message); cb(null); return; }
        cb(res.data || []);
      }).catch(function (e) { console.warn('[SUPA] classStats:', e); cb(null); });
  }

  // ── Helpers ──────────────────────────────────────────────────
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + _p2(d.getMonth()+1) + '-' + _p2(d.getDate());
  }
  function weekStartStr() {
    // คืน Sunday ต้นสัปดาห์ (สัปดาห์รัน อา–ส รีเซ็ตทุกอาทิตย์)
    var d   = new Date();
    var day = d.getDay(); // 0=Sun,...,6=Sat
    d.setDate(d.getDate() - day); // ถอยกลับหา Sunday
    return d.getFullYear() + '-' + _p2(d.getMonth()+1) + '-' + _p2(d.getDate());
  }
  function _p2(n) { return n < 10 ? '0'+n : ''+n; }
  function _genCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ตัดตัวที่สับสน (0,O,I,1)
    var code  = '';
    for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  return {
    init:             init,
    isReady:          isReady,
    todayStr:         todayStr,
    weekStartStr:     weekStartStr,
    upsertUser:       upsertUser,
    syncDailyScore:   syncDailyScore,
    getLeaderboard:   getLeaderboard,
    joinClassroom:    joinClassroom,
    createClassroom:  createClassroom,
    syncWeeklyBoss:   syncWeeklyBoss,
    getWeeklyBossHP:  getWeeklyBossHP,
    getClassroomStats: getClassroomStats
  };

})();
