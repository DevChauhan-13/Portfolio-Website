/* ================================================================
   HIDDEN GAME — SPACE INVADERS (spaceinvaders.js)
   Ship on the left shooting right; 4 enemy types; 7 wave patterns;
   asteroid gauntlets; black holes; 6 power-ups; 8 boss designs with
   shield turrets and 3 rage phases. Trigger: single click on the
   nav icon strip (desktop only). Silent — no audio.
   ================================================================ */
(function () {
  'use strict';

  var DIFFS = [
    { name: 'EASY',   spdM: 0.60, eFirCD: 4.5, bossHPM: 0.50 },
    { name: 'NORMAL', spdM: 1.00, eFirCD: 2.8, bossHPM: 1.00 },
    { name: 'HARD',   spdM: 1.35, eFirCD: 1.6, bossHPM: 1.50 }
  ];
  var diffIdx = 1;
  var PALETTE = {
    bg: '#010101', fg: '#00ff88', fgDim: 'rgba(0,255,136,0.35)',
    accent: '#ff3355', head: '#ffffff', border: 'rgba(0,255,136,0.22)',
    bullet: '#aaffcc', bulletTriple: '#ffff44', eBullet: '#ff4455'
  };

  var overlay, canvas, ctx, wrapEl, modeSelect, modeBtns;
  var diffIdxShown = 1;
  var W = 0, H = 0, sc = 1, SS = 5, SE = 4, SB = 8, MAX_ENE = 9;
  var ship, bullets, eBullets, enemies, asteroids, powerups, blackHoles, particles;
  var pScore = 0, best = 0, lives = 3, level = 1;
  var phase = 'combat'; /* combat | gauntlet | boss | bosswave */
  var wavesLeft = 0, waveTimer = 0, gauntLeft = 0, gauntSpawnT = 3.5;
  var boss = null, bossTurrets = [], bossEscortMax = 2;
  var holeTimer = 16, ambDropTimer = 24, bossDropTimer = 20;
  var laser = { active: false, t: 0, cd: 0 };
  var powers = { rapid: 0, triple: 0, shield: 0, laser: 0 };
  var respawnShield = 0, invuln = 0, blinkT = 0;
  var fireHeld = false, fireCd = 0;
  var running = false, waiting = true, paused = false, gameOver = false;
  var rafId = null, keys = {}, lastTs = 0;
  var message = null; /* {l1, l2, t} */
  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  var touchMoveX = null;

  function eligible() { return window.innerWidth >= 768; }

  /* ── Pixel sprites (strings; 1 = filled) ──────────────────────── */
  var SHIP = [
    '......#.',
    '.....###',
    '#...####',
    '########',
    '##.#####',
    '#..#####',
    '......##'
  ];
  var SPRITES = {
    fighter: ['..#..#.', '######.', '#.##.#.', '#######', '.#..#..', '#....#'],
    bomber: ['..####..', '.######.', '########', '#.#..#.#', '#.#..#.#', '########', '.######.', '..####..'],
    elite: ['#..#####', '.######.', '##.##.##', '.######.', '#..#####'],
    drone: ['_##_', '####', '_##_']
  };
  var BOSSES = [
    { name: 'DREADNOUGHT', hpM: 1.0, move: 'figure8', fireCD: 1.2, escorts: 'fighter', escN: 2, turrets: 0,
      sprite: ['....########....', '################', '##..##..##..##..', '################', '....########....', '......####......', '.......##.......'] },
    { name: 'WEDGE', hpM: 1.2, move: 'charge', fireCD: 1.0, escorts: 'drone', escN: 4, turrets: 0,
      sprite: ['.......##.......', '......####......', '.....######.....', '....########....', '...##########...', '..############..', '.##############.', '################'] },
    { name: 'RING STATION', hpM: 1.4, move: 'orbit', fireCD: 1.3, escorts: 'elite', escN: 2, turrets: 4,
      sprite: ['....########....', '..############..', '.###..####..###.', '.##..######..##.', '.###..####..###.', '..############..', '....########....'] },
    { name: 'CARRIER', hpM: 1.5, move: 'strafe', fireCD: 1.1, escorts: 'fighter', escN: 4, turrets: 2,
      sprite: ['################', '#..##..##..##..#', '################', '.##############.', '..##########..', '....######....', '......##......'] },
    { name: 'STEALTH', hpM: 1.6, move: 'blink', fireCD: 0.8, escorts: 'drone', escN: 5, turrets: 0,
      sprite: ['..##########..', '.############.', '####......####', '##..######..##', '####......####', '.############.', '..##########..'] },
    { name: 'SIEGE TANK', hpM: 1.8, move: 'advance', fireCD: 1.0, escorts: 'bomber', escN: 2, turrets: 2,
      sprite: ['################', '#.##.##..##.##.#', '################', '..############..', '.##############.', '..##########..', '...##....##...'] },
    { name: 'TWIN CORE', hpM: 2.0, move: 'zigzag', fireCD: 0.9, escorts: 'elite', escN: 3, turrets: 0,
      sprite: ['..####..####..', '.######.######', '####.####.####', '##..###..###..', '####.####.####', '.######.######', '..####..####..'] },
    { name: 'MOTHERSHIP', hpM: 2.2, move: 'sineX', fireCD: 0.7, escorts: 'elite', escN: 4, turrets: 4,
      sprite: ['..################..', '.##################.', '####..########..####', '####################', '##..############..##', '.##################.', '...##############...'] }
  ];

  function buildDom() {
    overlay = document.createElement('div');
    overlay.id = 'invadersOverlay';
    overlay.className = 'game-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = '--game-bg:#010101;--game-fg:#00ff88;' +
      '--game-fg-dim:rgba(0,255,136,0.35);--game-accent:#ff3355;' +
      '--game-head:#ffffff;--game-border:rgba(0,255,136,0.22);';
    overlay.innerHTML =
      '<div class="game-hud">' +
        '<div style="display:flex;gap:28px;">' +
          '<div class="game-hud-score"><span class="pong-score-num" id="invScore">0</span><span class="pong-score-lbl">SCORE</span></div>' +
          '<div class="game-hud-score"><span class="pong-score-num" id="invBest" style="font-size:12px;">0</span><span class="pong-score-lbl">BEST</span></div>' +
          '<div class="game-hud-score"><span class="pong-score-num" id="invPower" style="font-size:9px;">\u2014</span><span class="pong-score-lbl">POWER</span></div>' +
        '</div>' +
        '<span class="game-title-label">INVADERS</span>' +
        '<div class="game-hud-right">' +
          '<div class="game-hud-score"><span class="pong-score-num" id="invLives">\u2665\u2665\u2665</span><span class="pong-score-lbl">LIVES</span></div>' +
          '<button class="game-pause-btn" id="invPause" aria-label="Pause">II</button>' +
          '<button class="game-close" id="invClose" aria-label="Close">\u2715</button>' +
        '</div>' +
      '</div>' +
      '<div class="game-body">' +
        '<div class="game-canvas-wrap" id="invWrap">' +
          '<canvas id="invCanvas"></canvas>' +
          '<div class="pong-mode-select" id="invMode">' +
            '<span class="pong-mode-title">DIFFICULTY</span>' +
            '<div class="pong-mode-options">' +
              '<button class="pong-mode-btn" data-idx="0">EASY</button>' +
              '<button class="pong-mode-btn is-selected" data-idx="1">NORMAL</button>' +
              '<button class="pong-mode-btn" data-idx="2">HARD</button>' +
            '</div>' +
            '<span class="pong-mode-hint" id="invModeHint">\u2190\u2192 SELECT&nbsp;&nbsp;ENTER START</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<span id="invStage" style="position:absolute;top:110px;right:104px;font-family:\'Press Start 2P\',monospace;font-size:7px;color:rgba(0,255,136,0.35);letter-spacing:0.1em;"></span>';
    document.body.appendChild(overlay);
    canvas = overlay.querySelector('#invCanvas');
    ctx = canvas.getContext('2d');
    wrapEl = overlay.querySelector('#invWrap');
    modeSelect = overlay.querySelector('#invMode');
    modeBtns = Array.prototype.slice.call(overlay.querySelectorAll('.pong-mode-btn'));
    if (isTouch) overlay.querySelector('#invModeHint').textContent = 'TAP TO SELECT';
    modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        diffIdxShown = parseInt(btn.dataset.idx, 10);
        syncDiff();
      });
    });
    overlay.querySelector('#invClose').addEventListener('click', closeGame);
    overlay.querySelector('#invPause').addEventListener('click', togglePause);
    canvas.addEventListener('mouseenter', function () { document.body.classList.add('game-canvas-hover'); });
    canvas.addEventListener('mouseleave', function () { document.body.classList.remove('game-canvas-hover'); });
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', function (e) {
      keys[e.key] = false;
      if (e.key === ' ') fireHeld = false;
    });
    if (isTouch) attachTouch();
  }

  function syncDiff() {
    modeBtns.forEach(function (b, i) { b.classList.toggle('is-selected', i === diffIdxShown); });
  }

  function layout() {
    W = Math.max(480, wrapEl.offsetWidth);
    H = Math.max(280, wrapEl.offsetHeight);
    canvas.width = W; canvas.height = H;
    sc = Math.min(1, W / 960, H / 520);
    SS = Math.max(3, Math.round(5 * sc));
    SE = Math.max(3, Math.round(4 * sc));
    SB = Math.max(5, Math.round(8 * sc));
    MAX_ENE = Math.max(5, Math.floor(W / 100));
  }

  function fullInit() {
    pScore = 0; lives = 3; level = 1;
    best = parseInt(localStorage.getItem('galekto_invaders_hi') || '0', 10) || 0;
    initRound();
  }

  function initRound() {
    ship = { x: 18, y: H / 2, w: 8 * SS, h: 7 * SS };
    bullets = []; eBullets = []; enemies = []; asteroids = []; powerups = [];
    blackHoles = []; particles = [];
    powers = { rapid: 0, triple: 0, shield: 0, laser: 0 };
    respawnShield = 0; invuln = 0; fireCd = 0;
    laser = { active: false, t: 0, cd: 0 };
    boss = null; bossTurrets = [];
    holeTimer = rnd(16, 28); ambDropTimer = rnd(20, 30); bossDropTimer = rnd(16, 28);
    message = null;
    startCombat();
    updateHud();
  }

  function startCombat() {
    phase = 'combat';
    wavesLeft = 13 + level * 3;
    waveTimer = 0.5;
    setStage();
  }

  function startGauntlet() {
    phase = 'gauntlet';
    gauntLeft = 30; gauntSpawnT = 3.5;
    showMessage('APPROACHING ASTEROID FIELD', '', 3.5);
    setStage();
  }

  function startBoss() {
    phase = 'boss';
    var def = BOSSES[(level - 1) % BOSSES.length];
    var cols = def.sprite[0].length, rows = def.sprite.length;
    boss = {
      def: def, sprite: def.sprite,
      x: W, y: H / 2 - rows * SB / 2,
      w: cols * SB, h: rows * SB,
      hp: Math.round((55 + level * 15) * def.hpM * DIFFS[diffIdx].bossHPM),
      hpMax: Math.round((55 + level * 15) * def.hpM * DIFFS[diffIdx].bossHPM),
      vulnerable: false, vulnT: 0.7,
      t: 0, entered: false, fireT: def.fireCD, phase: 0
    };
    bossTurrets = [];
    for (var i = 0; i < def.turrets; i++) {
      bossTurrets.push({
        hp: Math.round((12 + level * 3) * DIFFS[diffIdx].bossHPM),
        ang: i * (Math.PI * 2 / def.turrets),
        spd: 0.9 + i * 0.15
      });
    }
    bossEscortMax = def.escN;
    showMessage('BOSS INCOMING', def.name, 3.2);
    setStage();
  }

  function setStage() {
    var el = document.getElementById('invStage');
    if (!el) return;
    if (phase === 'combat') el.textContent = 'STAGE ' + level + ' ' + DIFFS[diffIdx].name;
    else if (phase === 'gauntlet') el.textContent = 'STAGE ' + level + ' ASTEROID FIELD ' + Math.ceil(gauntLeft) + 's';
    else el.textContent = 'STAGE ' + level + ' [' + ['', 'I', 'II', 'III'][bossPhase()] + ']';
  }
  function bossPhase() {
    if (!boss) return 0;
    var hpr = boss.hp / boss.hpMax;
    return hpr < 0.30 ? 3 : hpr < 0.65 ? 2 : 1;
  }

  function showMessage(l1, l2, dur) {
    message = { l1: l1, l2: l2 || '', t: dur, t0: dur };
  }

  function updateHud() {
    document.getElementById('invScore').textContent = String(pScore);
    document.getElementById('invBest').textContent = String(best);
    var tokens = [];
    if (powers.rapid > 0) tokens.push('RPD');
    if (powers.triple > 0) tokens.push('TRI');
    if (powers.laser > 0) tokens.push('LZR');
    if (respawnShield > 0) tokens.push('\u25c6' + respawnShield);
    var pw = document.getElementById('invPower');
    if (tokens.length) {
      pw.textContent = tokens.join(' ');
      pw.style.color = respawnShield >= 8 ? '#44aaff' : respawnShield >= 4 ? '#ffdd00' : respawnShield > 0 ? '#ff4455' : '#ffff00';
    } else {
      pw.textContent = '\u2014';
      pw.style.color = '';
    }
    document.getElementById('invLives').textContent =
      lives > 0 ? '\u2665'.repeat(lives) : '\u2620';
  }

  function addScore(n) {
    pScore += n;
    if (pScore > best) {
      best = pScore;
      try { localStorage.setItem('galekto_invaders_hi', String(best)); } catch (_) {}
    }
    updateHud();
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ── Spawning ─────────────────────────────────────────────────── */
  function spawnWave() {
    var n = Math.max(3, Math.min(MAX_ENE, 4 + level));
    var pattern = 1 + Math.floor(Math.random() * 7);
    var spd = DIFFS[diffIdx].spdM;
    var targetY = rnd(H * 0.3, H * 0.7);
    for (var i = 0; i < n; i++) {
      var type = ['fighter', 'fighter', 'bomber', 'elite', 'drone'][Math.floor(Math.random() * 5)];
      var e = makeEnemy(type, W + 40 + i * 30, 0, spd);
      switch (pattern) {
        case 1: e.y = H * (0.15 + 0.7 * i / n); e.vx = -110 * spd; break;
        case 2: e.y = H / 2 + (i - n / 2) * 40; e.vx = -100 * spd; break;
        case 3: e.y = i % 2 ? -30 : H + 30; e.tx = targetY; e.vx = -80 * spd; break;
        case 4: e.y = H * 0.5; e.sineA = H * 0.30; e.sineF = 1.8 + 0.2 * i; e.sineP = i * 0.6; e.vx = -90 * spd; break;
        case 5: type = e.type = 'drone'; e.y = rnd(-30, H + 30); e.x = rnd(W * 0.6, W + 80); e.vx = -140 * spd; break;
        case 6: type = e.type = 'bomber'; e.y = H * (0.2 + 0.6 * i / Math.max(1, n / 2)); e.vx = -55 * spd; break;
        case 7: type = e.type = 'elite'; e.y = i % 2 ? -30 : H + 30; e.vx = -85 * spd; e.decel = true; break;
      }
      e.y = Math.max(-40, Math.min(H + 40, e.y));
      e.fireT = rnd(0.5, 2.5);
      enemies.push(e);
    }
  }

  function makeEnemy(type, x, y, spdM) {
    var defs = {
      fighter: { w: 7, h: 6, hp: 1, pts: 20, speed: 120, bSpd: 170, color: '#ff3355' },
      bomber:  { w: 9, h: 8, hp: 4, pts: 50, speed: 55,  bSpd: 140, color: '#ffaa00' },
      elite:   { w: 9, h: 5, hp: diffIdx === 0 ? 2 : 3, pts: 80, speed: 85, bSpd: 200, color: '#cc55ff' },
      drone:   { w: 4, h: 3, hp: 1, pts: 10, speed: 160, bSpd: 0,   color: '#ff7700' }
    };
    var d = defs[type];
    return {
      type: type, x: x, y: y, w: d.w * SE, h: d.h * SE,
      hp: d.hp, pts: d.pts, speed: d.speed * spdM, bSpd: d.bSpd * spdM,
      color: d.color, vx: -d.speed * spdM, vy: 0, fireT: rnd(0.5, 2.5),
      hitT: 0
    };
  }

  function spawnAsteroid() {
    var n = 3 + Math.floor(Math.random() * 4);
    for (var k = 0; k < n; k++) {
      var r = rnd(9, 23);
      var verts = [];
      var sides = 7 + Math.floor(Math.random() * 4);
      for (var i = 0; i < sides; i++) {
        verts.push({ a: i / sides * Math.PI * 2, r: r * rnd(0.7, 1.15) });
      }
      var fromTop = Math.random() < 0.5;
      asteroids.push({
        x: rnd(W * 0.2, W), y: fromTop ? -r : H + r,
        r: r, verts: verts,
        hp: Math.max(1, Math.floor(r / 6)),
        vx: -(90 + level * 12 + rnd(-55, 55)),
        vy: (fromTop ? 1 : -1) * rnd(10, 60) * 0.75,
        wob: Math.random() < 0.55 ? { a: rnd(H * 0.08, H * 0.23), f: rnd(0.5, 1.7), p: rnd(0, 6) } : null,
        rot: rnd(-1, 1), ang: 0, y0: 0, t: 0
      });
    }
  }

  function spawnPowerup(kind, x, y) {
    var colors = { RPD: '#ffff00', TRI: '#00ffff', SHD: '#4499ff', LZR: '#ff44ff', LIFE: '#ff6688', BOM: '#ff4400' };
    powerups.push({ kind: kind, x: x, y: y, color: colors[kind] });
  }

  function maybeDrop(x, y) {
    if (Math.random() < 0.08) {
      var r = Math.random(), kind =
        r < 0.30 ? 'RPD' : r < 0.54 ? 'TRI' : r < 0.74 ? 'SHD' :
        r < 0.78 ? 'BOM' : r < 0.92 ? 'LZR' : 'LIFE';
      spawnPowerup(kind, x, y);
    }
  }

  function spawnBlackHole() {
    blackHoles.push({ x: rnd(W * 0.25, W * 0.8), y: rnd(H * 0.1, H * 0.9), r: rnd(18, 32), life: rnd(7, 12), spin: 0 });
  }

  /* ── Update ───────────────────────────────────────────────────── */
  function update(dt) {
    if (paused || waiting || gameOver) return;

    /* ship */
    var spd = 230;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) ship.y -= spd * dt;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) ship.y += spd * dt;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) ship.x -= spd * dt;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) ship.x += spd * dt;
    if (touchMoveX !== null) ship.y = clamp(touchMoveX, 4, H - ship.h - 4);
    ship.x = clamp(ship.x, 4, W - ship.w - 4);
    ship.y = clamp(ship.y, 4, H - ship.h - 4);

    /* fire */
    fireCd -= dt;
    if ((fireHeld || keys[' ']) && fireCd <= 0) {
      fireCd = 0.22 * (powers.rapid > 0 ? 0.22 : 1);
      var bvy = 0;
      bullets.push({ x: ship.x + ship.w, y: ship.y + ship.h / 2 - 2, vx: 580, vy: 0, w: 14, h: 4 });
      if (powers.triple > 0) {
        bullets.push({ x: ship.x + ship.w, y: ship.y + ship.h / 2 - 12, vx: 580, vy: -30, w: 12, h: 3 });
        bullets.push({ x: ship.x + ship.w, y: ship.y + ship.h / 2 + 8, vx: 580, vy: 30, w: 12, h: 3 });
      }
      if (powers.laser > 0) laser.cd = laser.cd <= 0 ? 1.8 : laser.cd;
    }
    if (powers.laser > 0) {
      laser.cd -= dt;
      if (laser.cd <= 0 && (fireHeld || keys[' '])) { laser.active = true; laser.t = 0.22; laser.cd = 1.8; }
      if (laser.active) {
        laser.t -= dt;
        if (laser.t <= 0) laser.active = false;
        var ly = ship.y + ship.h / 2;
        enemies.forEach(function (e) {
          if (e.y < ly + 10 && e.y + e.h > ly - 10) { e.hp -= 3 * dt * 8; e.hitT = 0.1; }
        });
        if (boss && boss.vulnerable && boss.y < ly + 20 && boss.y + boss.h > ly - 20) {
          boss.hp -= 2 * dt * 8;
        }
        addScore(2);
      }
    }
    powers.rapid = Math.max(0, powers.rapid - dt);
    powers.triple = Math.max(0, powers.triple - dt);
    powers.laser = Math.max(0, powers.laser - dt);
    invuln = Math.max(0, invuln - dt);
    if (respawnShield > 0) {
      blinkT += dt;
      if (blinkT > 3) { blinkT = 0; respawnShield = Math.max(0, respawnShield - 1); if (respawnShield === 0) showMessage('SHIELD DOWN!', '', 1.5); }
    }

    /* bullets */
    bullets.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; });
    bullets = bullets.filter(function (b) { return b.x < W + 20 && !swallowed(b.x, b.y); });
    eBullets.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; });
    eBullets = eBullets.filter(function (b) { return b.x > -20 && !swallowed(b.x, b.y); });

    /* enemies */
    enemies.forEach(function (e) {
      e.t = (e.t || 0) + dt;
      e.x += e.vx * dt;
      if (e.sineA) e.y = H / 2 + Math.sin(e.t * e.sineF + e.sineP) * e.sineA;
      if (e.tx !== undefined) e.y += Math.sign(e.tx - e.y) * Math.min(120 * dt, Math.abs(e.tx - e.y));
      if (e.decel) {
        var band = e.y > H * 0.1 && e.y < H * 0.9;
        if (band) e.vx *= Math.pow(0.92, dt * 60);
      }
      if (e.type === 'drone') {
        var dy = ship.y + ship.h / 2 - (e.y + e.h / 2);
        e.vy = clamp(dy * 2, -120, 120);
        e.y += e.vy * dt;
      }
      e.y = clamp(e.y, -50, H + 50);
      e.hitT = Math.max(0, (e.hitT || 0) - dt);
      /* kamikaze collision */
      if (e.type === 'drone' &&
          e.x < ship.x + ship.w && e.x + e.w > ship.x &&
          e.y < ship.y + ship.h && e.y + e.h > ship.y) {
        e.hp = 0; hitShip();
      }
      /* fire */
      if (e.bSpd > 0) {
        e.fireT -= dt;
        if (e.fireT <= 0) {
          e.fireT = DIFFS[diffIdx].eFirCD + rnd(0, 0.8);
          var bx = e.x, by = e.y + e.h / 2;
          var ang = Math.atan2(ship.y + ship.h / 2 - by, ship.x - bx);
          if (e.type === 'elite') {
            [-0.35, 0, 0.35].forEach(function (a) {
              eBullets.push({ x: bx, y: by, vx: Math.cos(ang + a) * e.bSpd, vy: Math.sin(ang + a) * e.bSpd, w: 7, h: 4 });
            });
          } else {
            eBullets.push({ x: bx, y: by, vx: Math.cos(ang) * e.bSpd, vy: Math.sin(ang) * e.bSpd, w: 7, h: 4 });
          }
        }
      }
    });
    enemies = enemies.filter(function (e) { return e.x > -60 && e.hp > 0; });

    /* wave logic */
    if (phase === 'combat') {
      waveTimer -= dt;
      if (waveTimer <= 0 && wavesLeft > 0) { spawnWave(); wavesLeft--; waveTimer = Math.max(1.2, 2.2 - level * 0.15); }
      if (wavesLeft <= 0 && enemies.length === 0) {
        if (level % 3 === 0) startBoss();
        else startGauntlet();
      }
      holeTimer -= dt;
      if (holeTimer <= 0) { spawnBlackHole(); holeTimer = rnd(16, 28); }
    } else if (phase === 'gauntlet') {
      gauntLeft -= dt;
      gauntSpawnT -= dt;
      if (gauntSpawnT <= 0) { spawnAsteroid(); gauntSpawnT = Math.max(0.9, 3.5 - (30 - gauntLeft) * 0.08 - level * 0.08); }
      if (gauntLeft <= 3 && Math.ceil(gauntLeft) !== Math.ceil(gauntLeft + dt)) {
        if (gauntLeft <= 3) showMessage('BOSS INCOMING', '', 2.5);
      }
      if (gauntLeft <= 0) startBoss();
      ambDropTimer -= dt;
      if (ambDropTimer <= 0) {
        var r = Math.random();
        spawnPowerup(r < 0.30 ? 'RPD' : r < 0.55 ? 'TRI' : r < 0.75 ? 'SHD' : r < 0.87 ? 'LIFE' : 'LZR', W - 24, rnd(H * 0.2, H * 0.8));
        ambDropTimer = rnd(20, 30);
      }
      setStage();
    } else if (phase === 'boss') {
      updateBoss(dt);
      bossDropTimer -= dt;
      if (bossDropTimer <= 0) {
        var kinds = ['RPD', 'TRI', 'SHD', 'LIFE'];
        spawnPowerup(kinds[Math.floor(Math.random() * 4)], W - 24, rnd(H * 0.2, H * 0.8));
        bossDropTimer = rnd(16, 28);
      }
      setStage();
    }

    /* asteroids */
    asteroids.forEach(function (a) {
      a.t += dt;
      a.x += a.vx * dt; a.y += a.vy * dt;
      a.ang += a.rot * dt;
      if (a.wob) a.y0 = Math.sin(a.t * a.wob.f + a.wob.p) * a.wob.a * 0.02;
    });
    asteroids = asteroids.filter(function (a) { return a.x > -40 && a.hp > 0 && a.y > -80 && a.y < H + 80; });

    /* powerups */
    powerups.forEach(function (p) { p.x -= 55 * dt; });
    powerups = powerups.filter(function (p) {
      if (p.x < -30) return false;
      if (ship.x < p.x + 24 && ship.x + ship.w > p.x && ship.y < p.y + 24 && ship.y + ship.h > p.y) {
        applyPowerup(p.kind);
        return false;
      }
      return true;
    });

    /* black holes */
    blackHoles.forEach(function (h) { h.life -= dt; h.spin += 2.2 * dt; });
    blackHoles = blackHoles.filter(function (h) {
      if (h.life <= 0) return false;
      var d = Math.hypot(ship.x + ship.w / 2 - h.x, ship.y + ship.h / 2 - h.y);
      if (d < h.r * 0.5) {
        ship.x = rnd(20, W * 0.4); ship.y = rnd(H * 0.2, H * 0.8);
        invuln = 0.8;
        return false;
      }
      return true;
    });

    /* enemy bullets vs ship */
    if (invuln <= 0) {
      for (var i = 0; i < eBullets.length; i++) {
        var b = eBullets[i];
        if (b.x < ship.x + ship.w && b.x + b.w > ship.x && b.y < ship.y + ship.h && b.y + b.h > ship.y) {
          eBullets.splice(i, 1);
          hitShip();
          break;
        }
      }
    }

    /* particles */
    particles.forEach(function (p) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; });
    particles = particles.filter(function (p) { return p.t > 0; });

    /* player bullets vs everything */
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var pb = bullets[bi];
      var hit = false;
      for (var ei = 0; ei < enemies.length; ei++) {
        var e = enemies[ei];
        if (pb.x > e.x && pb.x < e.x + e.w && pb.y > e.y && pb.y < e.y + e.h) {
          e.hp--; e.hitT = 0.1;
          spark(pb.x, pb.y);
          hit = true;
          if (e.hp <= 0) { addScore(e.pts); maybeDrop(e.x, e.y); }
          break;
        }
      }
      if (!hit && boss && boss.entered) {
        if (pb.x > boss.x && pb.x < boss.x + boss.w && pb.y > boss.y && pb.y < boss.y + boss.h) {
          if (boss.vulnerable) { boss.hp -= 1; addScore(18); bossHitFlash(); hit = true; }
          else hit = true; /* absorbed by shields */
        }
        if (!hit) {
          for (var ti = 0; ti < bossTurrets.length; ti++) {
            var t = bossTurrets[ti];
            var tx = boss.x + boss.w / 2 + Math.cos(t.ang) * (Math.max(boss.w, boss.h) * 0.62 + 18);
            var ty = boss.y + boss.h / 2 + Math.sin(t.ang) * (Math.max(boss.w, boss.h) * 0.62 + 18);
            if (Math.hypot(pb.x - tx, pb.y - ty) < 14) {
              t.hp--; spark(pb.x, pb.y); hit = true;
              if (t.hp <= 0) { addScore(80); bossTurrets.splice(ti, 1); }
              break;
            }
          }
        }
      }
      if (!hit) {
        for (var ai = 0; ai < asteroids.length; ai++) {
          var a = asteroids[ai];
          if (Math.hypot(pb.x - a.x, pb.y - a.y + a.y0 * 50) < a.r) {
            a.hp--; spark(pb.x, pb.y); addScore(5); hit = true;
            if (a.hp <= 0 && a.r >= 16 && Math.random() < 0.30) {
              for (var f = 0; f < 2 + Math.floor(Math.random() * 2); f++) {
                asteroids.push({
                  x: a.x, y: a.y, r: a.r * rnd(0.35, 0.6), verts: a.verts,
                  hp: 1, vx: a.vx * 1.4, vy: rnd(-60, 60), wob: null, rot: rnd(-2, 2), ang: 0, y0: 0, t: 0
                });
              }
            }
            break;
          }
        }
      }
      if (hit) bullets.splice(bi, 1);
    }

    if (lives <= 0 && !gameOver) {
      gameOver = true;
      running = false;
    }
  }

  function swallowed(x, y) {
    for (var i = 0; i < blackHoles.length; i++) {
      if (Math.hypot(x - blackHoles[i].x, y - blackHoles[i].y) < blackHoles[i].r) return true;
    }
    return false;
  }

  function spark(x, y) {
    for (var i = 0; i < 4; i++) {
      particles.push({
        x: x, y: y, vx: rnd(-80, 80), vy: rnd(-80, 80),
        t: rnd(0.35, 0.55), color: 'rgba(255,' + Math.floor(rnd(160, 240)) + ',80,0.8)'
      });
    }
  }
  function bossHitFlash() { if (boss) boss.flash = 0.1; }

  function hitShip() {
    if (invuln > 0) return;
    if (powers.shield > 0) { powers.shield = 0; invuln = 0.5; return; }
    if (respawnShield > 0) { respawnShield--; invuln = 0.3; if (respawnShield === 0) showMessage('SHIELD DOWN!', '', 1.5); return; }
    lives--;
    updateHud();
    if (lives > 0) {
      invuln = 1.2;
      respawnShield = 10;
      ship.x = 18; ship.y = H / 2;
      showMessage(lives + ' LIVES LEFT', '', 2.2);
    }
  }

  function applyPowerup(kind) {
    switch (kind) {
      case 'RPD': powers.rapid += 10; break;
      case 'TRI': powers.triple += 12; break;
      case 'SHD': powers.shield = 1; break;
      case 'LZR': powers.laser += 15; break;
      case 'LIFE': lives = Math.min(5, lives + 1); break;
      case 'BOM':
        enemies.forEach(function (e) { addScore(Math.floor(e.pts / 2)); });
        enemies = [];
        break;
    }
    updateHud();
  }

  /* ── Boss update ──────────────────────────────────────────────── */
  function updateBoss(dt) {
    if (!boss) return;
    boss.t += dt;
    if (!boss.entered) {
      boss.x -= 85 * dt;
      if (boss.x <= W - boss.w - 55) { boss.x = W - boss.w - 55; boss.entered = true; }
      return;
    }
    boss.vulnT -= dt;
    boss.flash = Math.max(0, (boss.flash || 0) - dt);
    var hpr = boss.hp / boss.hpMax;
    var newPhase = hpr < 0.30 ? 3 : hpr < 0.65 ? 2 : 1;
    if (newPhase !== boss.phase) boss.phase = newPhase;
    boss.vulnerable = boss.vulnT <= 0 && (boss.def.turrets === 0 || bossTurrets.length === 0);
    if (boss.hp <= 0) {
      addScore(800 + level * 200);
      lives = Math.min(5, lives + 1);
      level++;
      boss = null; bossTurrets = [];
      showMessage('BOSS DEFEATED!', 'STAGE ' + level + '   +1 LIFE', 3.2);
      setTimeout(function () { if (phase === 'boss') startCombat(); }, 3300);
      updateHud();
      return;
    }
    var def = boss.def;
    /* movement */
    switch (def.move) {
      case 'figure8':
        boss.y = H / 2 + Math.sin(boss.t * 1.4) * H * 0.22;
        boss.x = W - boss.w - 55 + Math.sin(boss.t * 0.9) * 30;
        break;
      case 'charge':
        boss.x -= 40 * dt * (1 + boss.phase * 0.4);
        if (boss.x < W * 0.55) boss.x = W - boss.w - 55;
        break;
      case 'orbit':
        boss.y = H / 2 + Math.cos(boss.t * 0.8) * H * 0.18;
        break;
      case 'strafe':
        boss.y = H / 2 + Math.sin(boss.t * 0.5) * H * 0.3;
        break;
      case 'blink':
        if (Math.random() < dt * 0.4) {
          boss.x = rnd(W * 0.5, W - boss.w - 55);
          boss.y = rnd(H * 0.15, H * 0.85 - boss.h);
        }
        break;
      case 'advance':
        boss.x -= 22 * dt;
        if (boss.x < W * 0.6) boss.x = W - boss.w - 55;
        break;
      case 'zigzag':
        boss.y += Math.sin(boss.t * 2.4) * 200 * dt;
        boss.y = clamp(boss.y, 10, H - boss.h - 10);
        break;
      case 'sineX':
        boss.y = H / 2 + Math.sin(boss.t * 0.9) * H * 0.25;
        boss.x = W - boss.w - 55 + Math.sin(boss.t * 0.5) * 40;
        break;
    }
    /* turrets orbit + fire */
    var orbitR = Math.max(boss.w, boss.h) * 0.62 + 18;
    bossTurrets.forEach(function (t, i) {
      t.ang += t.spd * dt;
      if (Math.random() < dt * 0.5) {
        var tx = boss.x + boss.w / 2 + Math.cos(t.ang) * orbitR;
        var ty = boss.y + boss.h / 2 + Math.sin(t.ang) * orbitR;
        var ang = Math.atan2(ship.y - ty, ship.x - tx);
        eBullets.push({ x: tx, y: ty, vx: Math.cos(ang) * (200 + level * 10), vy: Math.sin(ang) * (200 + level * 10), w: 6, h: 4 });
      }
    });
    /* boss fire — scaled by phase */
    boss.fireT -= dt;
    if (boss.fireT <= 0 && boss.vulnerable) {
      boss.fireT = Math.max(0.20, def.fireCD * (1 - (1 - hpr) * 0.55));
      var bs = 230 + level * 20;
      var bx = boss.x, by = boss.y + boss.h / 2;
      var p = boss.phase;
      var mode = p === 1 ? 'spread' : p === 2 ? 'spiral' : 'burst';
      if (def.name === 'MOTHERSHIP') mode = ['spiral', 'spread', 'aimed', 'burst'][Math.floor(Math.random() * 4)];
      if (mode === 'spread') {
        var spread = p === 1 ? 0.35 : 0.87;
        for (var s = -2; s <= 2; s++) {
          eBullets.push({ x: bx, y: by, vx: -bs, vy: s * bs * spread / 2.5, w: 8, h: 5 });
        }
      } else if (mode === 'spiral') {
        var arms = p >= 2 ? 4 : 3;
        for (var a2 = 0; a2 < arms; a2++) {
          var ang2 = boss.t * 2.4 + a2 * Math.PI * 2 / arms;
          eBullets.push({ x: bx, y: by, vx: Math.cos(ang2) * bs * 0.7, vy: Math.sin(ang2) * bs * 0.7, w: 7, h: 4 });
        }
      } else if (mode === 'aimed') {
        var ang3 = Math.atan2(ship.y + ship.h / 2 - by, ship.x - bx);
        eBullets.push({ x: bx, y: by, vx: Math.cos(ang3) * bs, vy: Math.sin(ang3) * bs, w: 10, h: 6 });
      } else {
        for (var b3 = 0; b3 < 5 + p; b3++) {
          eBullets.push({ x: bx, y: rnd(boss.y, boss.y + boss.h), vx: -bs * rnd(0.8, 1.2), vy: rnd(-40, 40), w: 6, h: 4 });
        }
      }
    }
    /* escorts */
    if (Math.random() < dt * (0.35 + boss.phase * 0.2) && enemies.length < bossEscortMax + (boss.phase >= 2 ? 1 : 0)) {
      var e = makeEnemy(def.escorts, boss.x, boss.y + rnd(0, boss.h), DIFFS[diffIdx].spdM);
      e.y = clamp(boss.y + rnd(0, boss.h), 10, H - 30);
      enemies.push(e);
    }
  }

  /* ── Rendering ────────────────────────────────────────────────── */
  function drawSprite(sprite, x, y, cell, color, hitFlash) {
    ctx.fillStyle = hitFlash ? 'rgba(255,255,255,0.9)' : color;
    for (var r = 0; r < sprite.length; r++) {
      for (var c = 0; c < sprite[r].length; c++) {
        if (sprite[r][c] === '#' || sprite[r][c] === '1') {
          ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);

    /* ship */
    if (ship && (!gameOver)) {
      var blink = invuln > 0 && (Math.floor(Date.now() / 80) % 2 === 0);
      if (!blink) {
        drawSprite(SHIP, ship.x, ship.y, SS, PALETTE.fg);
        /* engine glow + cockpit */
        ctx.fillStyle = '#00aaff';
        ctx.fillRect(ship.x, ship.y + 2 * SS, SS * 0.6, SS);
        ctx.fillStyle = 'rgba(0,220,255,0.65)';
        ctx.fillRect(ship.x + 5 * SS, ship.y + 2 * SS, SS * 0.7, SS * 0.7);
        if (respawnShield > 0) {
          var sc1 = respawnShield >= 8 ? '#44aaff' : respawnShield >= 4 ? '#ffdd00' : '#ff4455';
          ctx.strokeStyle = sc1;
          ctx.globalAlpha = 0.55 + 0.25 * Math.sin(Date.now() / 160);
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ship.x + ship.w / 2, ship.y + ship.h / 2, Math.max(ship.w, ship.h) * 0.7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = sc1;
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(respawnShield), ship.x + ship.w / 2, ship.y - 6);
        }
        if (powers.shield > 0) {
          ctx.strokeStyle = 'rgba(68,153,255,0.8)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(ship.x + ship.w / 2, ship.y + ship.h / 2, Math.max(ship.w, ship.h) * 0.85, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (laser.active) {
          var ly = ship.y + ship.h / 2;
          ctx.strokeStyle = 'rgba(255,100,255,0.4)'; ctx.lineWidth = 18;
          ctx.beginPath(); ctx.moveTo(ship.x + ship.w, ly); ctx.lineTo(W, ly); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,200,255,0.9)'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(ship.x + ship.w, ly); ctx.lineTo(W, ly); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(ship.x + ship.w, ly); ctx.lineTo(W, ly); ctx.stroke();
        }
      }
    }

    /* bullets */
    ctx.fillStyle = powers.triple > 0 ? PALETTE.bulletTriple : PALETTE.bullet;
    bullets.forEach(function (b) { ctx.fillRect(b.x, b.y, b.w, b.h); });
    ctx.fillStyle = PALETTE.eBullet;
    eBullets.forEach(function (b) { ctx.fillRect(b.x, b.y, b.w, b.h); });

    /* enemies */
    enemies.forEach(function (e) {
      var sp = SPRITES[e.type];
      ctx.save();
      if (e.type === 'drone') ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      drawSprite(sp, e.x, e.y, SE, e.color, e.hitT > 0);
      if (e.type === 'bomber' && e.hp < 4) {
        ctx.fillStyle = 'rgba(255,170,0,0.9)';
        ctx.fillRect(e.x, e.y - 5, e.w * (e.hp / 4), 3);
      }
      ctx.restore();
    });

    /* asteroids */
    asteroids.forEach(function (a) {
      ctx.save();
      ctx.translate(a.x, a.y + a.y0 * 50);
      ctx.rotate(a.ang);
      ctx.strokeStyle = 'rgba(200,190,180,0.9)';
      ctx.fillStyle = 'rgba(60,55,50,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      a.verts.forEach(function (v, i) {
        var px = Math.cos(v.a) * v.r, py = Math.sin(v.a) * v.r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    });

    /* powerups */
    powerups.forEach(function (p) {
      var pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200);
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x, p.y, 24, 24);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, 24, 24);
      ctx.shadowColor = p.color; ctx.shadowBlur = 10;
      ctx.strokeRect(p.x, p.y, 24, 24);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.fillStyle = p.color;
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.kind, p.x + 12, p.y + 15);
    });

    /* black holes */
    blackHoles.forEach(function (h) {
      ctx.fillStyle = '#110022';
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r * 0.32, 0, Math.PI * 2); ctx.fill();
      for (var i = 0; i < 4; i++) {
        ctx.strokeStyle = 'rgba(' + (170 - 35 * i) + ',0,' + (255 - 25 * i) + ',' + (0.8 - 0.16 * i) + ')';
        ctx.lineWidth = 2.5 - 0.4 * i;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (0.5 + i * 0.18), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.spin);
      ctx.strokeStyle = 'rgba(180,0,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, h.r * 1.1, h.r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    /* particles */
    particles.forEach(function (p) {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2.5, 2.5);
    });

    /* boss */
    if (boss) {
      var bph = bossPhase();
      var bcol = bph === 3 ? '#ff0000' : bph === 2 ? '#ff6600' : '#ff1144';
      ctx.save();
      if (bph === 3 && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.75;
      drawSprite(boss.sprite, boss.x, boss.y, SB, boss.flash > 0 ? '#ffffff' : bcol);
      ctx.restore();
      if (!boss.entered) {
        ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, 1 - boss.t) + ')';
        ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
      }
      var orbitR = Math.max(boss.w, boss.h) * 0.62 + 18;
      bossTurrets.forEach(function (t) {
        var tx = boss.x + boss.w / 2 + Math.cos(t.ang) * orbitR;
        var ty = boss.y + boss.h / 2 + Math.sin(t.ang) * orbitR;
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(tx, ty, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#44ccff'; ctx.lineWidth = 2;
        ctx.shadowColor = '#44ccff'; ctx.shadowBlur = 8;
        ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#44ccff';
        ctx.fillRect(tx - 10, ty - 18, 20 * (t.hp / Math.max(1, Math.round((12 + level * 3)))), 3);
      });
      if (!boss.def.turrets && boss.vulnT > 0) { /* warming up */ }
      if (boss.vulnerable) {
        var hpr = boss.hp / boss.hpMax;
        ctx.fillStyle = '#222';
        ctx.fillRect(boss.x, boss.y - 12, boss.w, 7);
        ctx.fillStyle = bcol;
        ctx.fillRect(boss.x, boss.y - 12, boss.w * hpr, 7);
        if (bossTurrets.length) {
          ctx.fillStyle = '#44ccff';
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SHIELDS: ' + bossTurrets.length, boss.x + boss.w / 2, boss.y - 16);
        }
      }
    }

    /* message */
    if (message) {
      message.t -= 1 / 60;
      if (message.t <= 0) message = null;
      else {
        ctx.fillStyle = 'rgba(0,0,0,' + (0.5 * Math.min(1, message.t / 0.5)).toFixed(2) + ')';
        ctx.fillRect(0, 0, W, H);
        var pulse = 0.78 + 0.22 * Math.sin(Date.now() / 150);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,80,80,' + pulse.toFixed(2) + ')';
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.fillText(message.l1, W / 2, H / 2 - 8);
        if (message.l2) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '9px "Press Start 2P", monospace';
          ctx.fillText(message.l2, W / 2, H / 2 + 16);
        }
      }
    }

    /* waiting / paused / game over screens */
    var cx = W / 2, cy = H / 2;
    ctx.textAlign = 'center';
    if (waiting) {
      ctx.fillStyle = 'rgba(0,0,0,0.88)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#00ff88';
      ctx.font = '18px "Press Start 2P", monospace';
      ctx.fillText('SPACE INVADERS', cx, cy - 40);
      ctx.fillStyle = PALETTE.fgDim;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(DIFFS[diffIdx].name + ' MODE', cx, cy - 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('ARROWS / WASD : MOVE', cx, cy + 8);
      ctx.fillStyle = PALETTE.fgDim;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('SPACE HOLD : FIRE', cx, cy + 26);
      ctx.fillText('P: PAUSE   ESC: EXIT', cx, cy + 40);
      ctx.fillStyle = '#00ff88';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillText(isTouch ? 'TAP TO START' : 'PRESS ANY KEY', cx, cy + 68);
    } else if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.80)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillText('PAUSED', cx, cy - 8);
      ctx.fillStyle = '#00ff88';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('P TO RESUME', cx, cy + 16);
    } else if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.90)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff3355';
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.fillText('GAME OVER', cx, cy - 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText('SCORE ' + pScore, cx, cy - 4);
      ctx.fillStyle = PALETTE.fgDim;
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('BEST ' + best, cx, cy + 18);
      ctx.fillStyle = '#00ff88';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillText('R : PLAY AGAIN', cx, cy + 48);
      ctx.fillStyle = PALETTE.fgDim;
      ctx.fillText('ESC : EXIT', cx, cy + 70);
    }
  }

  /* ── Loop / controls ──────────────────────────────────────────── */
  function frame(ts) {
    if (!overlay.classList.contains('is-open')) { rafId = null; return; }
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function onKey(e) {
    if (!overlay || !overlay.classList.contains('is-open')) return;
    keys[e.key] = true;
    if (modeSelect.style.display !== 'none') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        diffIdxShown = (diffIdxShown + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
        syncDiff();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        confirmDiff();
        return;
      }
    }
    if (e.key === ' ') fireHeld = true;
    if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
    if ((e.key === 'r' || e.key === 'R') && gameOver) {
      fullInit();
      modeSelect.style.display = '';
      waiting = true;
      return;
    }
    if (e.key === 'Escape') { closeGame(); return; }
    if (waiting && !gameOver) { waiting = false; lastTs = performance.now(); }
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) e.preventDefault();
  }

  function confirmDiff() {
    diffIdx = diffIdxShown;
    fullInit();
    modeSelect.style.display = 'none';
    waiting = true;
  }

  function togglePause() {
    if (waiting || gameOver) return;
    paused = !paused;
  }

  function attachTouch() {
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (modeSelect.style.display !== 'none') { confirmDiff(); return; }
      if (waiting && !gameOver) { waiting = false; lastTs = performance.now(); return; }
      if (gameOver) return;
      var t = e.changedTouches[0];
      if (t.clientX < W / 2) touchMoveX = t.clientY - ship.h / 2;
      else fireHeld = true;
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      if (t.clientX < W / 2) touchMoveX = t.clientY - ship.h / 2;
    }, { passive: false });
    canvas.addEventListener('touchend', function () { touchMoveX = null; fireHeld = false; });
  }

  /* ── Open / close ─────────────────────────────────────────────── */
  function openGame() {
    if (!eligible()) return;
    if (!overlay) buildDom();
    layout();
    fullInit();
    modeSelect.style.display = '';
    waiting = true;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('game-open');
    if (!rafId) { lastTs = performance.now(); rafId = requestAnimationFrame(frame); }
  }

  function closeGame() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('game-open', 'game-canvas-hover');
    running = false; fireHeld = false; keys = {};
  }

  window.addEventListener('resize', function () {
    if (overlay && overlay.classList.contains('is-open')) {
      if (!eligible()) { closeGame(); return; }
      layout();
      fullInit();
      modeSelect.style.display = '';
      waiting = true;
    }
  });

  function attachTrigger() {
    var navIcons = document.getElementById('navIcons');
    if (!navIcons) return;
    navIcons.style.pointerEvents = 'auto';
    navIcons.style.cursor = 'pointer';
    navIcons.addEventListener('click', openGame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (eligible()) attachTrigger();
    });
  } else {
    if (eligible()) attachTrigger();
  }

  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
})();
