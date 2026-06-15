// scene-manager.js — จัดการการเปลี่ยน scene

var SCENE = {
  current: null,

  switch: function(name, canvas, data) {
    this.current = name;
    // resize canvas ก่อนเปลี่ยน scene
    var W = CONFIG.CANVAS.BASE_WIDTH, H = CONFIG.CANVAS.BASE_HEIGHT;
    var scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width  = W * scale + 'px';
    canvas.style.height = H * scale + 'px';
    canvas.width  = W;
    canvas.height = H;

    if (name === 'menu') {
      initMenu(canvas);
    } else if (name === 'tower') {
      initTower(canvas);
    } else if (name === 'gacha') {
      var save = data ? data.save : loadProgress();
      initGacha(canvas, save);
    } else if (name === 'party-select') {
      var floor = data ? data.floor : 1;
      var save  = data ? data.save  : loadProgress();
      initPartySelect(canvas, floor, save);
    } else if (name === 'battle') {
      var floor        = data ? data.floor        : 1;
      var save         = data ? data.save         : loadProgress();
      var endless      = data ? !!data.endless    : false;
      var endlessFloor = data ? (data.endlessFloor || 0) : 0;
      initBattle(canvas, floor, save, endless, endlessFloor);
    }
  }
};
