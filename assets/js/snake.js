/* ================================================================
   HIDDEN GAME — SNAKE (snake.js)
   Player vs CPU on one field with labyrinth walls.
   Trigger: single click on the nav icon strip (desktop only).
   ================================================================ */
(function () {
  'use strict';

  var CELL = 20, TICK_MS = 140, STUN_TICKS = 5;
  var MODES = [10, 20, 0]; /* 0 = endless */
  var PALETTE = {
    bg: '#0a0606', playerBody: '#ef4444', playerHead: '#ffffff',
    cpuBody: 'rgba(255,255,255,0.30)', cpuHead: 'rgba(255,255,255,0.76)',
    food: '#ef4444', foodGlow: 'rgba(239,68,68,0.75)',
    wallFill: 'rgba(90,48,4,0.88)', wallStroke: 'rgba(180,100,20,0.90)',
    textMain: '#ffffff', textDim: '#ef4444', textFade: 'rgba(239,68,68,0.42)',
    overlay: 'rgba(6,2,2,0.91)', gridLine: 'rgba(255,255,255,0.020)'
  };
  /* 33 shape templates (6–12 cells each), [dx,dy] offsets */
  var SHAPES = [
    [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0]],
    [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]],
    [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]],
    [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7]],
    [[0,0],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4]],
    [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4]],
    [[0,0],[1,0],[2,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6]],
    [[0,2],[1,2],[2,2],[2,1],[2,0],[2,3],[2,4],[2,5],[2,6]],
    [[0,0],[1,0],[1,1],[1,2],[1,3],[1,4],[1,5]],
    [[0,0],[0,1],[0,2],[1,2],[2,2],[2,3],[2,4]],
    [[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[3,4],[3,5]],
    [[0,0],[1,0],[1,1],[2,1],[2,2],[3,2],[3,3],[4,3]],
    [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]],
    [[0,0],[0,1],[1,1],[2,1],[2,0],[3,0],[4,0],[4,1],[4,2]],
    [[0,0],[1,0],[2,0],[3,0],[0,1],[0,2],[0,3],[0,4]],
    [[0,0],[1,0],[1,1],[2,1],[2,2],[2,3],[1,3]],
    [[0,0],[0,1],[0,2],[0,3],[1,3],[2,3],[2,2],[2,1]],
    [[0,0],[1,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,3],[0,4]],
    [[0,0],[1,0],[2,0],[2,1],[1,1],[0,1],[0,2],[1,2],[2,2],[2,3],[0,3]],
    [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]],
    [[0,0],[1,0],[0,1],[2,0],[2,1],[0,2],[1,2],[2,2],[3,1],[3,2]],
    [[0,0],[0,1],[1,0],[2,0],[2,1]],
    [[0,0],[1,0],[2,0],[2,1],[2,2]],
    [[0,0],[0,1],[0,2],[0,3],[0,4],[1,2],[2,2],[3,2]],
    [[0,0],[1,0],[2,0],[2,1],[2,2],[2,3],[2,4]],
    [[0,0],[1,0],[1,1],[1,2],[1,3],[0,3]],
    [[0,0],[1,0],[2,0],[2,1],[2,2],[2,3],[1,3],[0,3],[0,2],[0,1]],
    [[0,0],[1,0],[2,0],[0,1],[0,2],[1,2],[2,2],[2,1]],
    [[0,0],[0,1],[1,1],[2,1],[2,2],[2,3]],
    [[0,0],[1,0],[1,1],[1,2],[0,2],[0,3],[0,4]],
    [[0,0],[1,0],[1,1],[1,2],[1,3],[2,3]],
    [[0,0],[1,0],[1,1],[2,1],[2,2]]
  ];

  var overlay, canvas, ctx, wrapEl, modeSelect, modeBtns, modeHint;
  var COLS = 0, ROWS = 0;
  var player, cpu, walls, food, playerScore, cpuScore;
  var modeIdx = 0, gameMode = MODES[0];
  var running = false, waiting = true, gameOver = false, paused = false;
  var tickTimer = null, rafId = null;
  var nextPlayerDir = null;
  var prevFoodDist = 999;

  function eligible() { return window.innerWidth >= 768; }

  function buildDom() {
    overlay = document.createElement('div');
    overlay.id = 'snakeOverlay';
    overlay.className = 'game-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = '--game-bg:#060303;--game-fg:#ef4444;' +
      '--game-fg-dim:rgba(239,68,68,0.42);--game-accent:#ef4444;' +
      '--game-head:#ffffff;--game-border:rgba(239,68,68,0.22);';
    overlay.innerHTML =
      '<div class="game-hud">' +
        '<div class="game-hud-score">' +
          '<span class="pong-score-num" id="snkPS">0</span>' +
          '<span class="pong-score-lbl">YOU</span>' +
        '</div>' +
        '<span class="game-title-label">SNAKE</span>' +
        '<div class="game-hud-right">' +
          '<div class="game-hud-score">' +
            '<span class="pong-score-num" id="snkCS">0</span>' +
            '<span class="pong-score-lbl">CPU</span>' +
          '</div>' +
          '<button class="game-pause-btn" id="snkPause" aria-label="Pause">II</button>' +
          '<button class="game-close" id="snkClose" aria-label="Close">\u2715</button>' +
        '</div>' +
      '</div>' +
      '<div class="game-body">' +
        '<div class="game-canvas-wrap" id="snkWrap">' +
          '<canvas id="snkCanvas"></canvas>' +
          '<div class="pong-mode-select" id="snkMode">' +
            '<span class="pong-mode-title">SELECT MODE</span>' +
            '<div class="pong-mode-options">' +
              '<button class="pong-mode-btn is-selected" data-idx="0">10 PTS</button>' +
              '<button class="pong-mode-btn" data-idx="1">20 PTS</button>' +
              '<button class="pong-mode-btn" data-idx="2">ENDLESS</button>' +
            '</div>' +
            '<span class="pong-mode-hint" id="snkModeHint">\u2190 \u2192 SELECT&nbsp;&nbsp;ENTER CONFIRM</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    canvas = overlay.querySelector('#snkCanvas');
    ctx = canvas.getContext('2d');
    wrapEl = overlay.querySelector('#snkWrap');
    modeSelect = overlay.querySelector('#snkMode');
    modeBtns = Array.prototype.slice.call(overlay.querySelectorAll('.pong-mode-btn'));
    modeHint = overlay.querySelector('#snkModeHint');

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      modeHint.textContent = 'TAP TO SELECT';
      attachTouch();
    }

    modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        modeIdx = parseInt(btn.dataset.idx, 10);
        syncModeButtons();
      });
      btn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        modeIdx = parseInt(btn.dataset.idx, 10);
        syncModeButtons();
      });
    });

    overlay.querySelector('#snkClose').addEventListener('click', closeGame);
    overlay.querySelector('#snkPause').addEventListener('click', togglePause);
    canvas.addEventListener('mouseenter', function () { document.body.classList.add('game-canvas-hover'); });
    canvas.addEventListener('mouseleave', function () { document.body.classList.remove('game-canvas-hover'); });
    document.addEventListener('keydown', onKey);
  }

  function syncModeButtons() {
    modeBtns.forEach(function (b, i) { b.classList.toggle('is-selected', i === modeIdx); });
  }

  function layout() {
    var w = Math.max(300, wrapEl.offsetWidth);
    var h = Math.max(200, wrapEl.offsetHeight);
    COLS = Math.floor(w / CELL);
    ROWS = Math.floor(h / CELL);
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;
  }

  function initGame() {
    playerScore = 0; cpuScore = 0;
    gameOver = false; paused = false; waiting = true;
    nextPlayerDir = null;
    var midY = Math.floor(ROWS / 2);
    player = { body: [{ x: Math.floor(COLS * 0.25), y: midY }], dir: { x: 1, y: 0 }, alive: true, stun: 0 };
    cpu = { body: [{ x: Math.floor(COLS * 0.75), y: midY }], dir: { x: -1, y: 0 }, alive: true, stun: 3 };
    walls = new Set();
    spawnFood();
    updateHud();
  }

  function key(x, y) { return x + ',' + y; }
  function blocked(x, y, forWallCheck) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    return walls.has(key(x, y));
  }
  function onSnake(x, y) {
    return player.body.some(function (s) { return s.x === x && s.y === y; }) ||
           cpu.body.some(function (s) { return s.x === x && s.y === y; });
  }

  function spawnFood() {
    var minPrev = Math.min(60, Math.floor((COLS + ROWS) * 1.5));
    var fx = Math.floor(COLS / 2), fy = Math.floor(ROWS / 2);
    for (var t = 0; t < 600; t++) {
      var x = 1 + Math.floor(Math.random() * (COLS - 2));
      var y = 1 + Math.floor(Math.random() * (ROWS - 2));
      if (onSnake(x, y) || walls.has(key(x, y))) continue;
      var dp = Math.abs(x - player.body[0].x) + Math.abs(y - player.body[0].y);
      var dc = Math.abs(x - cpu.body[0].x) + Math.abs(y - cpu.body[0].y);
      if (dp < 8 || dc < 8) continue;
      if (prevFoodDist < 999) {
        var df = Math.abs(x - food.x) + Math.abs(y - food.y);
        if (df < minPrev) continue;
      }
      fx = x; fy = y; break;
    }
    food = { x: fx, y: fy };
    spawnWalls();
    prevFoodDist = 1;
  }

  function spawnWalls() {
    var R = 6 + Math.floor(Math.random() * 3); /* 6..8 */
    var shift = 2 + Math.floor(Math.random() * (R - 2));
    function inRing(x, y) {
      var dx = Math.abs(x - food.x), dy = Math.abs(y - food.y);
      var onEdge = (Math.abs(dx - R) <= 0 || Math.abs(dy - R) <= 0);
      return dx <= R && dy <= R && onEdge;
    }
    function gapOk(x, y) {
      /* misaligned gaps: top gap shifted left, bottom right, left up, right down */
      if (y === food.y - R && Math.abs(x - (food.x - shift)) <= 1) return true;
      if (y === food.y + R && Math.abs(x - (food.x + shift)) <= 1) return true;
      if (x === food.x - R && Math.abs(y - (food.y - shift)) <= 1) return true;
      if (x === food.x + R && Math.abs(y - (food.y + shift)) <= 1) return true;
      return false;
    }
    function safe(x, y) {
      var dp = Math.abs(x - player.body[0].x) + Math.abs(y - player.body[0].y);
      var dc = Math.abs(x - cpu.body[0].x) + Math.abs(y - cpu.body[0].y);
      var df = Math.abs(x - food.x) + Math.abs(y - food.y);
      return dp > 5 && dc > 5 && df > 2;
    }
    for (var y = Math.max(0, food.y - R); y <= Math.min(ROWS - 1, food.y + R); y++) {
      for (var x = Math.max(0, food.x - R); x <= Math.min(COLS - 1, food.x + R); x++) {
        if (inRing(x, y) && !gapOk(x, y) && safe(x, y) && !onSnake(x, y)) walls.add(key(x, y));
      }
    }
    /* extra shapes */
    var extra = 3 + Math.floor(Math.random() * 2);
    for (var s = 0; s < extra; s++) {
      var shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      var ox = 1 + Math.floor(Math.random() * (COLS - 10));
      var oy = 1 + Math.floor(Math.random() * (ROWS - 6));
      shape.forEach(function (cell) {
        var cx = ox + cell[0], cy = oy + cell[1];
        if (cx <= 0 || cx >= COLS - 1 || cy <= 0 || cy >= ROWS - 1) return;
        if (Math.abs(cx - food.x) <= R + 2 && Math.abs(cy - food.y) <= R + 2) return;
        if (!safe(cx, cy) || onSnake(cx, cy)) return;
        walls.add(key(cx, cy));
      });
    }
  }

  function updateHud() {
    document.getElementById('snkPS').textContent = String(Math.max(0, playerScore));
    document.getElementById('snkCS').textContent = String(cpuScore);
  }

  /* ── CPU AI: BFS to food, greedy fallback ─────────────────────── */
  function computeCpuDir() {
    if (cpu.stun > 0) return cpu.dir;
    var start = cpu.body[0];
    var goal = food;
    var solid = new Set(walls);
    player.body.forEach(function (s) { solid.add(key(s.x, s.y)); });
    cpu.body.slice(0, -1).forEach(function (s) { solid.add(key(s.x, s.y)); });
    var dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    /* never plan a 180° reversal: the tick guard would silently reject it and
       the CPU would cruise straight into a wall */
    dirs = dirs.filter(function (d) { return !(d.x === -cpu.dir.x && d.y === -cpu.dir.y); });
    /* BFS */
    var queue = [start], came = new Map();
    came.set(key(start.x, start.y), null);
    var found = false;
    while (queue.length && !found) {
      var cur = queue.shift();
      dirs.forEach(function (d) {
        var nx = cur.x + d.x, ny = cur.y + d.y;
        var k = key(nx, ny);
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
        if (solid.has(k) || came.has(k)) return;
        came.set(k, cur);
        if (nx === goal.x && ny === goal.y) found = true;
        queue.push({ x: nx, y: ny });
      });
    }
    if (came.has(key(goal.x, goal.y))) {
      /* walk back to find the first step */
      var cur = goal;
      while (true) {
        var prev = came.get(key(cur.x, cur.y));
        if (!prev) break;
        if (prev.x === start.x && prev.y === start.y) {
          return { x: cur.x - start.x, y: cur.y - start.y };
        }
        cur = prev;
      }
    }
    /* greedy fallback */
    var best = null, bestScore = -Infinity;
    dirs.forEach(function (d) {
      var nx = start.x + d.x, ny = start.y + d.y;
      var score = 0;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) score -= 1000;
      else {
        if (walls.has(key(nx, ny))) score -= 300;
        if (player.body.some(function (s) { return s.x === nx && s.y === ny; })) score -= 900;
        if (cpu.body.slice(0, -1).some(function (s) { return s.x === nx && s.y === ny; })) score -= 950;
        /* avoid dead-end pockets: reward steps with more free neighbors */
        var freeN = 0;
        dirs.forEach(function (d2) {
          var ax = nx + d2.x, ay = ny + d2.y;
          if (ax < 0 || ax >= COLS || ay < 0 || ay >= ROWS) return;
          if (walls.has(key(ax, ay))) return;
          if (player.body.some(function (s) { return s.x === ax && s.y === ay; })) return;
          if (cpu.body.slice(0, -1).some(function (s) { return s.x === ax && s.y === ay; })) return;
          freeN++;
        });
        score += (freeN - 2) * 18;
        score -= (Math.abs(nx - goal.x) + Math.abs(ny - goal.y));
      }
      if (score > bestScore) { bestScore = score; best = d; }
    });
    return best || cpu.dir;
  }

  function advanceSnake(snake, dir, isPlayer) {
    var head = { x: snake.body[0].x + dir.x, y: snake.body[0].y + dir.y };
    /* border */
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      snake.alive = false; snake.deathCause = 'border'; return;
    }
    /* wall: remove it, stun, score penalty */
    if (walls.has(key(head.x, head.y))) {
      walls.delete(key(head.x, head.y));
      snake.stun = STUN_TICKS;
      if (isPlayer) playerScore = Math.max(0, playerScore - 1);
      return;
    }
    /* self / opponent */
    for (var i = 0; i < snake.body.length; i++) {
      if (snake.body[i].x === head.x && snake.body[i].y === head.y) { snake.alive = false; snake.deathCause = 'self'; return; }
    }
    var other = isPlayer ? cpu : player;
    for (var j = 0; j < other.body.length; j++) {
      if (other.body[j].x === head.x && other.body[j].y === head.y) { snake.alive = false; snake.deathCause = 'opponent'; return; }
    }
    snake.body.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      if (isPlayer) {
        playerScore += 1;
        var best = parseInt(localStorage.getItem('galekto_snake_best') || '0', 10) || 0;
        if (playerScore > best) { try { localStorage.setItem('galekto_snake_best', String(playerScore)); } catch (_) {} }
        cpu.stun = Math.max(cpu.stun, 2);
      } else {
        cpuScore += 1;
      }
      spawnFood();
    } else {
      snake.body.pop();
    }
  }

  function tick() {
    if (paused || waiting || gameOver) return;
    if (player.stun > 0) player.stun--;
    if (cpu.stun > 0) cpu.stun--;

    if (!nextPlayerDir ||
        (nextPlayerDir.x !== -player.dir.x || nextPlayerDir.y !== -player.dir.y)) {
      if (nextPlayerDir) player.dir = nextPlayerDir;
    }
    nextPlayerDir = null;

    if (player.alive && player.stun === 0) advanceSnake(player, player.dir, true);
    if (cpu.alive && cpu.stun === 0) {
      var d = computeCpuDir();
      if (d && (d.x !== -cpu.dir.x || d.y !== -cpu.dir.y)) cpu.dir = d;
      advanceSnake(cpu, cpu.dir, false);
    }
    updateHud();

    if (gameMode > 0 && (playerScore >= gameMode || cpuScore >= gameMode)) {
      gameOver = true;
    } else if (!player.alive || !cpu.alive) {
      gameOver = true;
    }
    if (gameOver) { stopTick(); draw(); }
  }

  function startTick() {
    stopTick();
    tickTimer = setInterval(tick, TICK_MS);
  }
  function stopTick() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  /* ── Rendering ────────────────────────────────────────────────── */
  function drawSnakeBody(snake, bodyColor, headColor) {
    snake.body.forEach(function (s, i) {
      var isHead = i === 0;
      ctx.fillStyle = isHead ? headColor : bodyColor;
      if (isHead) {
        ctx.shadowColor = 'rgba(255,255,255,0.28)';
        ctx.shadowBlur = 6;
      }
      ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
      ctx.shadowBlur = 0;
    });
  }

  function draw() {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* grid */
    ctx.strokeStyle = PALETTE.gridLine;
    ctx.lineWidth = 0.5;
    for (var gx = 0; gx <= COLS; gx++) {
      ctx.beginPath(); ctx.moveTo(gx * CELL, 0); ctx.lineTo(gx * CELL, canvas.height); ctx.stroke();
    }
    for (var gy = 0; gy <= ROWS; gy++) {
      ctx.beginPath(); ctx.moveTo(0, gy * CELL); ctx.lineTo(canvas.width, gy * CELL); ctx.stroke();
    }

    /* walls */
    walls.forEach(function (k) {
      var parts = k.split(',');
      var x = +parts[0], y = +parts[1];
      ctx.fillStyle = PALETTE.wallFill;
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      ctx.strokeStyle = PALETTE.wallStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(x * CELL + 1.5, y * CELL + 1.5, CELL - 3, CELL - 3);
    });

    /* food */
    ctx.fillStyle = PALETTE.food;
    ctx.shadowColor = PALETTE.foodGlow;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    /* snakes */
    drawSnakeBody(cpu, PALETTE.cpuBody, PALETTE.cpuHead);
    drawSnakeBody(player, PALETTE.playerBody, PALETTE.playerHead);

    /* waiting / paused / game over screens */
    var cx = canvas.width / 2, cy = canvas.height / 2;
    ctx.textAlign = 'center';
    if (waiting) {
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('MODE: ' + (gameMode === 0 ? 'ENDLESS' : gameMode + ' PTS'), cx, cy - 50);
      ctx.fillStyle = PALETTE.textMain;
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillText('PRESS ANY KEY TO START', cx, cy - 14);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('WASD / ARROWS  |  SPACE: PAUSE', cx, cy + 14);
      ctx.fillStyle = PALETTE.textFade;
      ctx.fillText('WALL: STUN -1PT', cx, cy + 38);
      ctx.fillText('BORDER / BODY: DEATH', cx, cy + 56);
    } else if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.80)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = PALETTE.textMain;
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillText('PAUSED', cx, cy - 12);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('SPACE TO RESUME', cx, cy + 14);
    } else if (gameOver) {
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      var title, titleColor, msg;
      if (playerScore >= gameMode && gameMode > 0) {
        title = 'YOU WIN!'; titleColor = PALETTE.textMain;
        msg = Math.random() < 0.5 ? ['Flawless.'] : ['The CPU needs a moment.'];
      } else if (cpuScore >= gameMode && gameMode > 0) {
        title = 'OPPONENT WINS'; titleColor = PALETTE.textFade;
        msg = Math.random() < 0.5 ? ['The machine wins', 'this round. Suspicious.'] : ['The machine wins', 'this round. Suspicious.'];
      } else if (!player.alive && !cpu.alive) {
        title = 'DRAW'; titleColor = PALETTE.textFade;
        msg = ['A perfectly synchronized', 'disaster.'];
      } else if (!player.alive) {
        title = 'GAME OVER'; titleColor = PALETTE.textFade;
        msg = player.deathCause === 'border' ? ['You found the edge', 'of the universe.']
            : player.deathCause === 'self' ? ['You got tangled', 'in your own ambition.']
            : ['You went for the hug.', "They didn't survive."];
      } else {
        title = 'YOU WIN!'; titleColor = PALETTE.textMain;
        msg = cpu.deathCause === 'border' ? ['Your opponent forgot', 'the world had walls.']
            : cpu.deathCause === 'self' ? ['The AI outsmarted', 'itself. Classic.']
            : ['They came at you', 'like a moth to a flame.'];
      }
      ctx.fillStyle = titleColor;
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.fillText(title, cx, cy - 58);
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = '9px "Press Start 2P", monospace';
      msg.forEach(function (line, i) { ctx.fillText(line, cx, cy - 26 + i * 20); });
      ctx.fillStyle = PALETTE.textMain;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(Math.max(0, playerScore) + ' \u2014 ' + cpuScore, cx, cy + 20);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('R: PLAY AGAIN', cx, cy + 44);
      ctx.fillStyle = PALETTE.textFade;
      ctx.fillText('ESC: EXIT', cx, cy + 64);
    }
  }

  function renderLoop() {
    if (!overlay.classList.contains('is-open')) { rafId = null; return; }
    draw();
    rafId = requestAnimationFrame(renderLoop);
  }

  /* ── Controls ─────────────────────────────────────────────────── */
  function onKey(e) {
    if (!overlay.classList.contains('is-open')) return;
    var k = e.key;
    var dirs = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
      W: { x: 0, y: -1 }, S: { x: 0, y: 1 }, A: { x: -1, y: 0 }, D: { x: 1, y: 0 }
    };
    if (modeSelect.style.display !== 'none') {
      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        e.preventDefault();
        modeIdx = (modeIdx + (k === 'ArrowRight' ? 1 : 2)) % 3;
        syncModeButtons();
        return;
      }
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        confirmMode();
        return;
      }
    }
    if (dirs[k]) {
      e.preventDefault();
      if (waiting) startPlaying();
      nextPlayerDir = dirs[k];
      return;
    }
    if (k === ' ') {
      e.preventDefault();
      togglePause();
      return;
    }
    if ((k === 'r' || k === 'R') && gameOver) {
      initGame();
      modeSelect.style.display = '';
      return;
    }
    if (k === 'Escape') { closeGame(); return; }
    if (waiting) startPlaying();
  }

  function confirmMode() {
    gameMode = MODES[modeIdx];
    initGame();
    modeSelect.style.display = 'none';
  }

  function startPlaying() {
    waiting = false;
    startTick();
  }

  function togglePause() {
    if (waiting || gameOver) return;
    paused = !paused;
  }

  function attachTouch() {
    var origin = null;
    wrapEl.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (modeSelect.style.display !== 'none') { confirmMode(); return; }
      if (waiting) startPlaying();
      origin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: false });
    wrapEl.addEventListener('touchend', function (e) {
      if (!origin) return;
      var dx = e.changedTouches[0].clientX - origin.x;
      var dy = e.changedTouches[0].clientY - origin.y;
      if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return;
      nextPlayerDir = Math.abs(dx) > Math.abs(dy)
        ? { x: dx > 0 ? 1 : -1, y: 0 }
        : { x: 0, y: dy > 0 ? 1 : -1 };
      origin = null;
    }, { passive: false });
  }

  /* ── Open / close ─────────────────────────────────────────────── */
  function openGame() {
    if (!eligible()) return;
    if (!overlay) buildDom();
    layout();
    initGame();
    modeSelect.style.display = '';
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('game-open');
    if (!rafId) rafId = requestAnimationFrame(renderLoop);
  }

  function closeGame() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('game-open', 'game-canvas-hover');
    stopTick();
  }

  window.addEventListener('resize', function () {
    if (overlay && overlay.classList.contains('is-open')) {
      if (!eligible()) { closeGame(); return; }
      stopTick();
      layout();
      initGame();
      modeSelect.style.display = '';
    }
  });

  /* ── Trigger: single click on the nav icon strip ──────────────── */
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
})();
