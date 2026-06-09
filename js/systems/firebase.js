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

  // ── Sync daily score (fire-and-forget) ────────────────────────
  // nickname denormalized → leaderboard query ไม่ต้อง JOIN
  function syncDailyScore(save) {
    if (!isReady()) return;
    var today = todayStr();
    var dmg   = (save.daily.correctAnswers || 0) * 25;
    _getUid().then(function (uid) {
      return _db.collection('daily_scores').doc(uid + '_' + today).set({
        userId:         uid,
        date:           today,
        nickname:       save.nickname              || 'นักรบนิรนาม',
        damageDealt:    dmg,
        correctAnswers: save.daily.correctAnswers  || 0,
        wrongAnswers:   save.daily.wrongAnswers    || 0,
        opErrors:       save.opErrors              || {},
        floorReached:   save.maxFloor              || 1,
        classroomCode:  save.classroomCode         || null
      }, { merge: true });
    }).catch(function (e) { console.warn('[FB] syncDailyScore:', e.message); });
  }

  // ── Subscribe leaderboard (real-time onSnapshot) ──────────────
  // ไม่ใช้ orderBy → ไม่ต้องสร้าง composite index
  // sort ใน JS แทน (30 records ต่อวัน — เร็วพอ)
  // cb(rows, errorMsg) — errorMsg = null ถ้าสำเร็จ
  function subscribeLeaderboard(date, classroomCode, cb) {
    if (!isReady()) { cb([], 'Firebase ยังไม่พร้อม — ตรวจสอบ config.js'); return function () {}; }
    var q;
    if (classroomCode) {
      q = _db.collection('daily_scores')
        .where('date', '==', date)
        .where('classroomCode', '==', classroomCode);
    } else {
      q = _db.collection('daily_scores')
        .where('date', '==', date);
    }
    return q.onSnapshot(function (snap) {
      var rows = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        rows.push({
          nickname:        d.nickname        || 'นักรบนิรนาม',
          damage_dealt:    d.damageDealt     || 0,
          correct_answers: d.correctAnswers  || 0
        });
      });
      // sort by damage desc, take top 30
      rows.sort(function(a, b) { return b.damage_dealt - a.damage_dealt; });
      cb(rows.slice(0, 30), null);
    }, function (e) {
      console.warn('[FB] subscribeLeaderboard:', e.message);
      cb([], e.message);
    });
  }

  // ── One-time fetch (fallback / teacher dashboard) ─────────────
  function getLeaderboard(date, classroomCode, cb) {
    if (!isReady()) { cb([]); return; }
    var unsub = subscribeLeaderboard(date, classroomCode, function (rows) {
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
    var d   = new Date();
    var day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d.getFullYear() + '-' + _p2(d.getMonth()+1) + '-' + _p2(d.getDate());
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
