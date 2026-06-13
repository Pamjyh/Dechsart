// firebase.js — Cloud sync layer (Phase 5 — Firebase edition)
// ใช้ตัวแปร SUPA เหมือนเดิม → ไม่ต้องแก้ไฟล์อื่น
// localStorage = primary (offline OK), Firestore = async mirror

var SUPA = (function () {

  var _db    = null;
  var _auth  = null;
  var _ready = false;

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    var cfg = CONFIG.FIREBASE;
    if (!cfg || cfg.apiKey === 'YOUR_API_KEY') {
      console.info('[FB] ยังไม่ตั้งค่า — ใช้ localStorage อย่างเดียว');
      return;
    }
    if (typeof firebase === 'undefined') {
      console.warn('[FB] Firebase SDK ไม่โหลด — ตรวจสอบ CDN');
      return;
    }
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      _auth  = firebase.auth();
      _db    = firebase.firestore();
      _ready = true;
      console.info('[FB] connected to project:', cfg.projectId);

      // sign in anonymously ทันที (fire-and-forget)
      _auth.onAuthStateChanged(function (user) {
        if (!user) {
          _auth.signInAnonymously().catch(function (e) {
            console.warn('[FB] anon sign-in failed:', e.message);
          });
        } else {
          localStorage.setItem('fb_uid', user.uid);
        }
      });
    } catch (e) {
      console.warn('[FB] init failed:', e);
    }
  }

  function isReady() { return _ready; }

  // ── Auth helper — คืน Promise<uid> ───────────────────────────
  function _getUid() {
    return new Promise(function (resolve, reject) {
      var user = _auth.currentUser;
      if (user) { resolve(user.uid); return; }
      // รอ auth state (กรณีเพิ่ง init)
      var unsub = _auth.onAuthStateChanged(function (u) {
        unsub();
        if (u) {
          localStorage.setItem('fb_uid', u.uid);
          resolve(u.uid);
        } else {
          _auth.signInAnonymously()
            .then(function (c) { resolve(c.user.uid); })
            .catch(reject);
        }
      });
    });
  }

  // ── Upsert user profile ────────────────────────────────────────
  function upsertUser(save, cb) {
    if (!isReady()) { cb && cb(null); return; }
    _getUid().then(function (uid) {
      return _db.collection('users').doc(uid).set({
        nickname:      save.nickname      || 'นักรบนิรนาม',
        classroomCode: save.classroomCode || null,
        updatedAt:     firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }).then(function () { cb && cb(true); })
      .catch(function (e) { console.warn('[FB] upsertUser:', e.message); cb && cb(null); });
  }

  // ── Sync scores (fire-and-forget) ─────────────────────────────
  // เขียน 2 collections คู่กัน:
  //   daily_scores  — ใช้โดย teacher dashboard (รายวัน)
  //   weekly_scores — ใช้โดย leaderboard (สะสม จ-ศ รีเซ็ตเสาร์)
  function syncDailyScore(save) {
    if (!isReady()) return;
    var today = todayStr();
    var wk    = weekStartStr();

    _getUid().then(function (uid) {
      // 1) daily_scores — เหมือนเดิม (ใช้โดย teacher dashboard)
      var dailyDmg = (save.daily.correctAnswers || 0) * 25;
      _db.collection('daily_scores').doc(uid + '_' + today).set({
        userId:         uid,
        date:           today,
        nickname:       save.nickname              || 'นักรบนิรนาม',
        damageDealt:    dailyDmg,
        correctAnswers: save.daily.correctAnswers  || 0,
        wrongAnswers:   save.daily.wrongAnswers    || 0,
        opErrors:       save.opErrors              || {},
        floorReached:   save.maxFloor              || 1,
        classroomCode:  save.classroomCode         || null
      }, { merge: true }).catch(function (e) { console.warn('[FB] daily_scores:', e.message); });

      // 2) weekly_scores — สะสมตลอดสัปดาห์ (จ-ศ)
      var weeklyCorrect = (save.weekly && save.weekly.correctAnswers) || 0;
      var weeklyDmg     = weeklyCorrect * 25;
      return _db.collection('weekly_scores').doc(uid + '_' + wk).set({
        userId:         uid,
        weekStart:      wk,
        nickname:       save.nickname              || 'นักรบนิรนาม',
        damageDealt:    weeklyDmg,
        correctAnswers: weeklyCorrect,
        floorReached:   save.maxFloor              || 1,
        classroomCode:  save.classroomCode         || null
      }, { merge: true });
    }).catch(function (e) { console.warn('[FB] syncDailyScore:', e.message); });
  }

  // ── Subscribe leaderboard (real-time onSnapshot) ──────────────
  // query จาก daily_scores สะสม จ–ศ ของสัปดาห์นี้
  // รองรับข้อมูลเก่าก่อน weekly_scores โดยไม่ต้อง migrate
  // cb(rows, errorMsg) — errorMsg = null ถ้าสำเร็จ
  function subscribeLeaderboard(weekStart, classroomCode, cb) {
    if (!isReady()) { cb([], 'Firebase ยังไม่พร้อม — ตรวจสอบ config.js'); return function () {}; }

    // สร้าง array วันจันทร์–วันนี้ (สูงสุด 5 วัน)
    var dates = [];
    var mon   = new Date(weekStart + 'T00:00:00');
    var now   = new Date(todayStr()  + 'T00:00:00');
    var fri   = new Date(mon); fri.setDate(fri.getDate() + 4);
    var end   = now < fri ? now : fri;
    for (var d = new Date(mon); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.getFullYear() + '-' + _p2(d.getMonth()+1) + '-' + _p2(d.getDate()));
    }
    if (dates.length === 0) { cb([], null); return function () {}; }

    var q = _db.collection('daily_scores').where('date', 'in', dates);
    if (classroomCode) q = q.where('classroomCode', '==', classroomCode);

    return q.onSnapshot(function (snap) {
      // รวมคะแนนแต่ละ user ข้ามวัน
      var byUser = {};
      snap.forEach(function (doc) {
        var d = doc.data();
        var uid = d.userId || doc.id;
        if (!byUser[uid]) {
          byUser[uid] = { nickname: d.nickname || 'นักรบนิรนาม', correct: 0 };
        }
        byUser[uid].correct += (d.correctAnswers || 0);
        if (d.nickname) byUser[uid].nickname = d.nickname; // nickname ล่าสุดชนะ
      });
      var rows = Object.keys(byUser).map(function (uid) {
        var u = byUser[uid];
        return {
          nickname:        u.nickname,
          damage_dealt:    u.correct * 25,
          correct_answers: u.correct
        };
      });
      rows.sort(function (a, b) { return b.damage_dealt - a.damage_dealt; });
      cb(rows.slice(0, 30), null);
    }, function (e) {
      console.warn('[FB] subscribeLeaderboard:', e.message);
      cb([], e.message);
    });
  }

  // ── One-time fetch (fallback / teacher dashboard) ─────────────
  function getLeaderboard(weekStart, classroomCode, cb) {
    if (!isReady()) { cb([]); return; }
    var unsub = subscribeLeaderboard(weekStart, classroomCode, function (rows) {
      unsub && unsub();
      cb(rows);
    });
  }

  // ── Join classroom ─────────────────────────────────────────────
  function joinClassroom(code, save, cb) {
    if (!isReady()) { cb({ ok: false, msg: 'ออฟไลน์ — ตั้งค่า Firebase ก่อน' }); return; }
    _db.collection('classrooms').doc(code.toUpperCase()).get()
      .then(function (doc) {
        if (!doc.exists) {
          cb({ ok: false, msg: 'ไม่พบรหัสห้อง "' + code.toUpperCase() + '"' });
          return;
        }
        save.classroomCode = code.toUpperCase();
        saveProgress(save);
        upsertUser(save, function () {
          cb({ ok: true, name: doc.data().name });
        });
      }).catch(function (e) {
        cb({ ok: false, msg: 'ข้อผิดพลาด: ' + e.message });
      });
  }

  // ── Create classroom (ครู — ใช้ใน teacher.html) ───────────────
  function createClassroom(name, teacherEmail, cb) {
    if (!isReady()) { cb(null, 'ออฟไลน์'); return; }
    var code = _genCode();
    _db.collection('classrooms').doc(code).set({
      name:         name,
      teacherEmail: teacherEmail,
      createdAt:    firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () { cb(code, null); })
      .catch(function (e) { cb(null, e.message); });
  }

  // ── Sync weekly boss damage ────────────────────────────────────
  function syncWeeklyBoss(save) {
    if (!isReady()) return;
    var wk = weekStartStr();
    _getUid().then(function (uid) {
      return _db.collection('weekly_boss_damage').doc(uid + '_' + wk).set({
        userId:        uid,
        weekStart:     wk,
        damage:        save.weeklyBoss.totalDamage || 0,
        classroomCode: save.classroomCode          || null
      }, { merge: true });
    }).catch(function (e) { console.warn('[FB] weeklyBoss:', e.message); });
  }

  // HP pool เหลือของบอสสัปดาห์นี้
  function getWeeklyBossHP(classroomCode, cb) {
    if (!isReady()) { cb(null); return; }
    var wk = weekStartStr();
    var q  = _db.collection('weekly_boss_damage').where('weekStart', '==', wk);
    if (classroomCode) q = q.where('classroomCode', '==', classroomCode);
    q.get().then(function (snap) {
      var total = 0;
      snap.forEach(function (doc) { total += doc.data().damage || 0; });
      cb(Math.max(0, 5000 - total));
    }).catch(function () { cb(null); });
  }

  // ── Teacher dashboard — 7 วันล่าสุด ──────────────────────────
  function getClassroomStats(classroomCode, cb) {
    if (!isReady()) { cb(null); return; }
    var dates = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.getFullYear() + '-' + _p2(d.getMonth()+1) + '-' + _p2(d.getDate()));
    }
    // Firestore 'in' รองรับสูงสุด 10 values — 7 วัน OK
    _db.collection('daily_scores')
      .where('classroomCode', '==', classroomCode)
      .where('date', 'in', dates)
      .get()
      .then(function (snap) {
        var rows = [];
        snap.forEach(function (doc) { rows.push(doc.data()); });
        cb(rows);
      }).catch(function (e) {
        console.warn('[FB] classStats:', e.message);
        cb(null);
      });
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
  // คืน string "D เดือน – D เดือน พ.ศ." เช่น "15–21 มิ.ย. 69"
  function weekRangeStr() {
    var TH_M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    var sun = new Date(weekStartStr());
    var sat = new Date(sun); sat.setDate(sat.getDate() + 6);
    var sunPart = sun.getDate() + ' ' + TH_M[sun.getMonth()];
    var satPart = sat.getDate() + ' ' + TH_M[sat.getMonth()];
    var thYear  = (sat.getFullYear() + 543).toString().slice(-2);
    if (sun.getMonth() === sat.getMonth()) {
      return sun.getDate() + '–' + sat.getDate() + ' ' + TH_M[sat.getMonth()] + ' ' + thYear;
    }
    return sunPart + ' – ' + satPart + ' ' + thYear;
  }
  function _p2(n) { return n < 10 ? '0'+n : ''+n; }
  function _genCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code  = '';
    for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  return {
    init:              init,
    isReady:           isReady,
    todayStr:          todayStr,
    weekStartStr:      weekStartStr,
    weekRangeStr:      weekRangeStr,
    upsertUser:        upsertUser,
    syncDailyScore:    syncDailyScore,
    subscribeLeaderboard: subscribeLeaderboard,
    getLeaderboard:    getLeaderboard,
    joinClassroom:     joinClassroom,
    createClassroom:   createClassroom,
    syncWeeklyBoss:    syncWeeklyBoss,
    getWeeklyBossHP:   getWeeklyBossHP,
    getClassroomStats: getClassroomStats
  };

})();
