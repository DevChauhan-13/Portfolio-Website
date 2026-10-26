/* ================================================================
   HIDDEN GAME — PONG (pong.js)
   Player vs CPU, both paddles move in 2D. Modes: 5/10 PTS, ENDLESS.
   Trigger: single click on the nav icon strip (desktop only).
   ================================================================ */
(function () {
  'use strict';

  var PW = 10, PH = 80, BR = 7, PAD = 24;
  var MODES = [5, 10, 0], MODE_LABELS = ['5 PTS', '10 PTS', 'ENDLESS'];
  var PALETTE = {
    field: '#060c1a', surround: '#020408',
    centerLine: 'rgba(255,255,255,0.06)',
    player: '#ffffff', playerGlow: 'rgba(255,255,255,0.3)',
    cpu: 'rgba(255,255,255,0.5)',
    ball: '#60a5fa', ballGlow: 'rgba(96,165,250,0.6)',
    main: '#ffffff', dim: '#60a5fa', fade: 'rgba(96,165,250,0.5)',
    overlay: 'rgba(6,12,26,0.88)'
  };
  var TAUNTS = {
    winBig: ['That wasn\u2019t a match.\nThat was a statement.',
             'Flawless.\nThe CPU needs therapy.',
             'Dominant.\nAlmost felt bad.\nAlmost.'],
    winNorm: ['The CPU is considering\na career change.',
              'Victory.\nDon\u2019t let it\ngo to your head.',
              'The algorithm\ndid not expect this.'],
    lossBig: ['It calculated\nyour every move. Rude.',
              "The CPU felt nothing.\nThat\u2019s the worst part.",
              'Total annihilation.\nRespect, almost.'],
    lossNorm: ['Beaten by math.\nThat stings.',
               'So close.\nSo very not close.',
               'The CPU says:\ntry again, human.']
  };

  var overlay, canvas, ctx, wrapEl, modeSelect, modeBtns, modeHint;
  var modeIdx = 0, gameMode = MODES[0];
  var player = { x: PAD, y: 0, homeY: 0 }, cpu = { x: 0, y: 0 };
  var ball = { x: 0, y: 0, vx: 0, vy: 0, speed: 5 };
  var pScore = 0, cScore = 0;
  var running = false, waiting = true, paused = false, gameOver = false;
  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  var rafId = null, keys = {};
  var W = 0, H = 0;

  function eligible() { return window.innerWidth >= 768; }

  function buildDom() {
    overlay = document.createElement('div');
    overlay.id = 'pongOverlay';
    overlay.className = 'game-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = '--game-bg:#020408;--game-fg:#60a5fa;' +
      '--game-fg-dim:rgba(96,165,250,0.5);--game-accent:#60a5fa;' +
      '--game-head:#ffffff;--game-border:rgba(96,165,250,0.18);';
    overlay.innerHTML =
      '<div class="game-hud">' +
        '<div class="game-hud-score">' +
          '<span class="pong-score-num" id="pngPS">0</span>' +
          '<span class="pong-score-lbl">YOU</span>' +
        '</div>' +
        '<span class="game-title-label">PONG</span>' +
        '<div class="game-hud-right">' +
          '<div class="game-hud-score">' +
            '<span class="pong-score-num" id="pngCS">0</span>' +
            '<span class="pong-score-lbl">CPU</span>' +
          '</div>' +
          '<button class="game-pause-btn" id="pngPause" aria-label="Pause">II</button>' +
          '<button class="game-close" id="pngClose" aria-label="Close">\u2715</button>' +
        '</div>' +
      '</div>' +
      '<div class="game-body">' +
        '<div class="game-canvas-wrap" id="pongCanvasWrap">' +
          '<canvas id="pongCanvas"></canvas>' +
          '<div class="pong-mode-select" id="pongModeSelect">' +
            '<span class="pong-mode-title">SELECT MODE</span>' +
            '<div class="pong-mode-options">' +
              '<button class="pong-mode-btn is-selected" data-idx="0">5 PTS</button>' +
              '<button class="pong-mode-btn" data-idx="1">10 PTS</button>' +
              '<button class="pong-mode-btn" data-idx="2">ENDLESS</button>' +
            '</div>' +
            '<span class="pong-mode-hint" id="pngModeHint">\u2190 \u2192 SELECT&nbsp;&nbsp;ENTER CONFIRM</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    canvas = overlay.querySelector('#pongCanvas');
    ctx = canvas.getContext('2d');
    wrapEl = overlay.querySelector('#pongCanvasWrap');
    modeSelect = overlay.querySelector('#pongModeSelect');
    modeBtns = Array.prototype.slice.call(overlay.querySelectorAll('.pong-mode-btn'));
    modeHint = overlay.querySelector('#pngModeHint');
    if (isTouch) modeHint.textContent = 'TAP TO SELECT';

    modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        modeIdx = parseInt(btn.dataset.idx, 10);
        syncModeButtons();
      });
    });
    overlay.querySelector('#pngClose').addEventListener('click', closeGame);
    overlay.querySelector('#pngPause').addEventListener('click', togglePause);
    canvas.addEventListener('mouseenter', function () { document.body.classList.add('game-canvas-hover'); });
    canvas.addEventListener('mouseleave', function () { document.body.classList.remove('game-canvas-hover'); });
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', function (e) { keys[e.key] = false; });
    if (isTouch) attachTouch();
  }

  function syncModeButtons() {
    modeBtns.forEach(function (b, i) { b.classList.toggle('is-selected', i === modeIdx); });
  }

  function layout() {
    var w = Math.max(300, wrapEl.offsetWidth);
    var h = Math.max(200, wrapEl.offsetHeight);
    canvas.width = w; canvas.height = h;
    W = w; H = h;
    player.homeY = H / 2 - PH / 2;
    player.y = player.homeY; player.x = PAD;
    cpu.x = W - PAD - PW; cpu.y = H / 2 - PH / 2;
    resetBall(1);
  }

  function resetBall(dir) {
    ball.x = W / 2; ball.y = H / 2;
    ball.speed = isTouch ? 8 : 5;
    var ang = (Math.random() * 60 - 30) * Math.PI / 180;
    ball.vx = Math.cos(ang) * ball.speed * dir;
    ball.vy = Math.sin(ang) * ball.speed;
  }

  function initGame() {
    pScore = 0; cScore = 0;
    gameOver = false; paused = false; waiting = true;
    layout();
    updateHud();
  }

  function updateHud() {
    document.getElementById('pngPS').textContent = String(pScore);
    document.getElementById('pngCS').textContent = String(cScore);
  }

  function onKey(e) {
    if (!overlay || !overlay.classList.contains('is-open')) return;
    keys[e.key] = true;
    if (modeSelect.style.display !== 'none') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        modeIdx = (modeIdx + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
        syncModeButtons();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        confirmMode();
        return;
      }
    }
    if (e.key === ' ') { e.preventDefault(); togglePause(); return; }
    if ((e.key === 'r' || e.key === 'R') && gameOver) {
      initGame();
      modeSelect.style.display = '';
      return;
    }
    if (e.key === 'Escape') { closeGame(); return; }
    if (waiting && !gameOver) { waiting = false; running = true; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) e.preventDefault();
  }

  function confirmMode() {
    gameMode = MODES[modeIdx];
    initGame();
    modeSelect.style.display = 'none';
  }

  function togglePause() {
    if (waiting || gameOver) return;
    paused = !paused;
  }

  function update() {
    if (!running || waiting || paused || gameOver) return;
    var pspeed = isTouch ? 9 : 6;
    /* player vertical */
    if (keys['ArrowUp'] || keys['w'] || keys['W']) player.y -= pspeed;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) player.y += pspeed;
    player.y = Math.max(0, Math.min(H - PH, player.y));
    /* player horizontal within own half */
    var minX = PAD, maxX = W / 2 - PW;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.x -= pspeed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) player.x += pspeed;
    player.x = Math.max(minX, Math.min(maxX, player.x));

    /* ball */
    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.y - BR <= 0) { ball.y = BR; ball.vy = Math.abs(ball.vy); }
    if (ball.y + BR >= H) { ball.y = H - BR; ball.vy = -Math.abs(ball.vy); }

    /* player paddle collision */
    if (ball.vx < 0 &&
        ball.x - BR <= player.x + PW && ball.x - BR >= player.x - 8 &&
        ball.y >= player.y - BR && ball.y <= player.y + PH + BR) {
      var hit = Math.max(-1, Math.min(1, (ball.y - (player.y + PH / 2)) / (PH / 2)));
      ball.speed = Math.min(22, ball.speed + 0.5);
      var ang = hit * 0.9;
      ball.vx = Math.cos(ang) * ball.speed;
      ball.vy = Math.sin(ang) * ball.speed;
      ball.x = player.x + PW + BR + 1;
    }
    /* cpu paddle collision */
    if (ball.vx > 0 &&
        ball.x + BR >= cpu.x && ball.x + BR <= cpu.x + PW + 8 &&
        ball.y >= cpu.y - BR && ball.y <= cpu.y + PH + BR) {
      var hit2 = Math.max(-1, Math.min(1, (ball.y - (cpu.y + PH / 2)) / (PH / 2)));
      ball.speed = Math.min(22, ball.speed + 0.4);
      var ang2 = Math.PI - hit2 * 0.8;
      ball.vx = Math.cos(ang2) * ball.speed;
      ball.vy = Math.sin(ang2) * ball.speed;
      ball.x = cpu.x - BR - 1;
    }

    /* scoring */
    if (ball.x + BR < 0) { cScore++; pointScored(1); }
    else if (ball.x - BR > W) { pScore++; pointScored(-1); }

    /* CPU AI */
    var targetY = ball.y - PH / 2;
    var cpuSpeed = Math.min(ball.speed * 0.72, 11);
    if (cpu.y < targetY - 4) cpu.y += cpuSpeed;
    else if (cpu.y > targetY + 4) cpu.y -= cpuSpeed;
    cpu.y = Math.max(0, Math.min(H - PH, cpu.y));
    var cpuSpeedX = 3;
    if (ball.vx > 0 && ball.x > W / 2) {
      if (cpu.x > W / 2) cpu.x -= cpuSpeedX;
    } else {
      if (cpu.x < W - PAD - PW) cpu.x += cpuSpeedX;
    }
    cpu.x = Math.max(W / 2, Math.min(W - PAD - PW, cpu.x));

    if (gameMode > 0 && (pScore >= gameMode || cScore >= gameMode)) {
      gameOver = true;
    }
  }

  function pointScored(dir) {
    updateHud();
    var best = parseInt(localStorage.getItem('galekto_pong_best') || '0', 10) || 0;
    if (pScore > best) { try { localStorage.setItem('galekto_pong_best', String(pScore)); } catch (_) {} }
    running = false;
    setTimeout(function () {
      player.y = player.homeY; player.x = PAD;
      cpu.x = W - PAD - PW; cpu.y = H / 2 - PH / 2;
      resetBall(dir);
      if (!gameOver) running = true;
    }, 800);
  }

  function draw() {
    ctx.fillStyle = PALETTE.field;
    ctx.fillRect(0, 0, W, H);
    /* center line */
    ctx.strokeStyle = PALETTE.centerLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);
    /* paddles */
    ctx.fillStyle = PALETTE.player;
    ctx.shadowColor = PALETTE.playerGlow; ctx.shadowBlur = 8;
    ctx.fillRect(player.x, player.y, PW, PH);
    ctx.fillStyle = PALETTE.cpu;
    ctx.fillRect(cpu.x, cpu.y, PW, PH);
    ctx.shadowBlur = 0;
    /* ball */
    ctx.fillStyle = PALETTE.ball;
    ctx.shadowColor = PALETTE.ballGlow; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    var cx = W / 2, cy = H / 2;
    ctx.textAlign = 'center';
    if (waiting) {
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = PALETTE.fade;
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('MODE: ' + MODE_LABELS[modeIdx], cx, cy - 40);
      ctx.fillStyle = PALETTE.main;
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillText(isTouch ? 'TOUCH & DRAG TO PLAY' : 'PRESS ANY KEY TO START', cx, cy - 6);
      ctx.fillStyle = PALETTE.fade;
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText(isTouch ? 'DRAG TO MOVE PADDLE' : 'SPACE: PAUSE', cx, cy + 20);
    } else if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.80)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = PALETTE.main;
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillText('PAUSED', cx, cy - 12);
      ctx.fillStyle = PALETTE.fade;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('SPACE TO RESUME', cx, cy + 14);
    } else if (gameOver) {
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, 0, W, H);
      var won = pScore > cScore;
      ctx.fillStyle = won ? PALETTE.main : PALETTE.dim;
      ctx.font = '22px "Press Start 2P", monospace';
      ctx.fillText(won ? 'YOU WIN!' : 'YOU LOSE', cx, cy - 60);
      var tier = won
        ? (cScore <= Math.floor(gameMode * 0.3) ? 'winBig' : 'winNorm')
        : (pScore <= Math.floor(gameMode * 0.3) ? 'lossBig' : 'lossNorm');
      var taunt = TAUNTS[tier][Math.floor(Math.random() * TAUNTS[tier].length)].split('\n');
      ctx.fillStyle = PALETTE.fade;
      ctx.font = '10px "Press Start 2P", monospace';
      taunt.forEach(function (line, i) { ctx.fillText(line, cx, cy - 24 + i * 18); });
      ctx.fillStyle = PALETTE.main;
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillText(pScore + '  \u2014  ' + cScore, cx, cy + 18);
      ctx.fillStyle = PALETTE.fade;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('R : PLAY AGAIN', cx, cy + 44);
      ctx.fillStyle = 'rgba(96,165,250,0.5)';
      ctx.fillText('ESC : EXIT', cx, cy + 64);
    }
  }

  function frame() {
    if (!overlay.classList.contains('is-open')) { rafId = null; return; }
    update();
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function attachTouch() {
    var touchId = null;
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (modeSelect.style.display !== 'none') { confirmMode(); return; }
      if (waiting && !gameOver) { waiting = false; running = true; }
      if (gameOver) { initGame(); modeSelect.style.display = ''; return; }
      touchId = e.changedTouches[0].identifier;
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          var t = e.changedTouches[i];
          var rect = canvas.getBoundingClientRect();
          player.y = Math.max(0, Math.min(H - PH, t.clientY - rect.top - PH - 12));
        }
      }
    }, { passive: false });
    canvas.addEventListener('touchend', function () { touchId = null; });
  }

  function openGame() {
    if (!eligible()) return;
    if (!overlay) buildDom();
    layout();
    initGame();
    modeSelect.style.display = '';
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('game-open');
    if (!rafId) { running = false; rafId = requestAnimationFrame(frame); }
  }

  function closeGame() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('game-open', 'game-canvas-hover');
    running = false;
  }

  window.addEventListener('resize', function () {
    if (overlay && overlay.classList.contains('is-open')) {
      if (!eligible()) { closeGame(); return; }
      running = false;
      layout();
      initGame();
      modeSelect.style.display = '';
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
})();
