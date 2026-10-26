/* ================================================================
   HOME PAGE ENGINE — main.js
   Slot-machine name, topographic canvas, liquid illustration mask,
   side rails, TV preloader + BIOS boot, reveal choreography.
   ================================================================ */
(function () {
  'use strict';

  /* ── DOM ──────────────────────────────────────────────────────── */
  var body, bgCanvas, bgCtx, nameDisplay, portraitIllus, portraitSection,
      slideGroup, cursorDot, cursorRing;
  var nameSection = null, portraitFrame = null;
  var illustrationCanvas = null, illustrationCtx = null;
  var illustrationImg = null;

  /* ── Constants ────────────────────────────────────────────────── */
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var NAMES = { left: 'DEV', right: 'CHAUHAN' };
  var MOUSE_EASE = 0.08;
  var RING_EASE = 0.12;
  var SLIDE_EASE = 0.045;
  var SLIDE_PX = 250;
  var MASK_EASE = 0.012;

  /* ── State ────────────────────────────────────────────────────── */
  var rawX = 0.5, rawY = 0.5;
  var smoothX = 0.5, smoothY = 0.5;
  var rawRingX = -200, rawRingY = -200;
  var mouseX = -200, mouseY = -200;
  (function () {
    var mx = parseFloat(sessionStorage.getItem('mx') || '');
    var my = parseFloat(sessionStorage.getItem('my') || '');
    if (!isNaN(mx) && !isNaN(my)) { mouseX = mx; mouseY = my; rawRingX = mx; rawRingY = my; }
  })();
  var currentSide = null, currentName = '', isAnimatingName = false;
  var idleTimer = null, isIdle = true, idleT = 0, bgTime = 0;
  var prevMouseX = 0, prevMouseY = 0;
  var idleFluidTimer = 0;
  var _hGrid = null;
  var _isMobile = window.innerWidth < 768;
  var _mobileBgDrawn = false;

  var smoothParaY = 0, smoothParaName = 0, parallaxReady = false;

  var MENU_FORMATIONS = [
    [[10,10],[21,10],[32,10],[10,21],[21,21],[32,21],[10,32],[21,32],[32,32]],
    [[21,8],[29,11],[34,19],[32,28],[25,33],[17,33],[9,28],[8,19],[11,11]],
    [[21,7],[21,13],[7,21],[13,21],[21,21],[29,21],[35,21],[21,29],[21,35]],
    [[5,4],[21,6],[37,4],[7,21],[21,21],[35,21],[5,37],[21,35],[37,37]]
  ];
  var _menuFormIdx = 0;
  function applyMenuFormation(idx) {
    var spans = document.querySelectorAll('.menu-dots span');
    var f = MENU_FORMATIONS[idx];
    spans.forEach(function (s, i) {
      s.style.left = f[i][0] + 'px';
      s.style.top = f[i][1] + 'px';
    });
  }

  /* Live config read by fluid.js display pass */
  window.BgConfig = {
    GRAY_R: 194, GRAY_G: 194, GRAY_B: 194,
    EDGE_LOW: 0.08, EDGE_HIGH: 0.09
  };

  var slideOffset = 0, targetSlide = 0, slideReady = false;
  var maskX = 0.5, maskY = 0.38, tgtMaskX = 0.5, tgtMaskY = 0.38;

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ── 1. SLOT MACHINE ──────────────────────────────────────────── */
  function getCharHeight() {
    var d = makeChar('A');
    d.style.visibility = 'hidden'; d.style.position = 'absolute';
    nameDisplay.appendChild(d);
    var h = d.getBoundingClientRect().height;
    d.remove();
    return h;
  }
  function getCharWidth(ch) {
    // measure inside a real slot so CSS vars (--name-fs) resolve correctly
    var host = nameDisplay.querySelector('.name-slot') || makeSlot();
    var d = makeChar(ch);
    d.style.visibility = 'hidden'; d.style.position = 'absolute';
    host.appendChild(d);
    var w = d.getBoundingClientRect().width;
    d.remove();
    if (host.parentNode !== nameDisplay) host.remove();
    return w;
  }
  var makeSlot = function () {
    var el = document.createElement('div'); el.className = 'name-slot'; return el;
  };
  var makeChar = function (ch) {
    var el = document.createElement('span');
    el.className = 'name-char'; el.textContent = ch; return el;
  };
  function makeReel(slot) {
    var old = slot.querySelector('.name-reel');
    if (old) old.remove();
    var r = document.createElement('div');
    r.className = 'name-reel';
    slot.appendChild(r);
    return r;
  }

  function buildSlots(name, animate) {
    var existing = nameDisplay.querySelectorAll('.name-slot');
    var oldLen = existing.length;

    if (oldLen > name.length) {
      for (var x = name.length; x < oldLen; x++) {
        (function (s) {
          s.classList.add('exiting');
          setTimeout(function () { s.remove(); }, 380);
        })(existing[x]);
      }
    }

    name.split('').forEach(function (targetChar, i) {
      if (!animate) {
        var slot = existing[i] || makeSlot();
        if (!existing[i]) nameDisplay.appendChild(slot);
        var reel = makeReel(slot);
        reel.style.cssText = 'transform:translateY(0);transition:none';
        reel.appendChild(makeChar(targetChar));
        return;
      }

      var spinCount = 2 + Math.floor(Math.random() * 3);
      var aslot = existing[i];
      if (!aslot) {
        aslot = makeSlot();
        aslot.style.cssText = 'width:0;opacity:0';
        nameDisplay.appendChild(aslot);
        (function (slot, ch, idx) {
          setTimeout(function () {
            var w = getCharWidth(ch);
            if (isFinite(w) && w > 0) slot.style.width = w + 'px';
            slot.style.opacity = '1';
          }, idx * 70 + Math.random() * 35);
        })(aslot, targetChar, i);
      } else {
        // reused slot: width may have been measured before the font loaded — re-measure
        (function (slot, ch) {
          var w = getCharWidth(ch);
          if (isFinite(w) && w > 0) slot.style.width = w + 'px';
        })(aslot, targetChar);
      }

      var reel2 = makeReel(aslot);
      reel2.style.cssText = 'transform:translateY(0);transition:none';
      for (var s = 0; s < spinCount; s++) {
        reel2.appendChild(makeChar(CHARS[Math.floor(Math.random() * CHARS.length)]));
      }
      reel2.appendChild(makeChar(targetChar));

      var dur = 380 + spinCount * 130;
      (function (reel, sc, ch, idx, isLast) {
        setTimeout(function () {
          var h = getCharHeight();
          reel.style.transition = 'transform ' + dur + 'ms cubic-bezier(0.25,0.46,0.45,0.94)';
          reel.style.transform = 'translateY(-' + (sc * h) + 'px)';
          setTimeout(function () {
            reel.style.cssText = 'transform:translateY(0);transition:none';
            reel.innerHTML = '';
            reel.appendChild(makeChar(ch));
            if (isLast) isAnimatingName = false;
          }, dur + 15);
        }, idx * 70 + Math.random() * 35);
      })(reel2, spinCount, targetChar, i, i === name.length - 1);
    });
  }

  function animateNameChange(newName) {
    if (isAnimatingName || currentName === newName) return;
    isAnimatingName = true;
    currentName = newName;
    buildSlots(newName, true);
  }

  /* ── 2. TOPOGRAPHIC BACKGROUND ────────────────────────────────── */
  function resizeBgCanvas() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }

  var PEAKS = [
    [0.20, 0.40, 0.22, 0.28, 1.00],
    [0.72, 0.28, 0.26, 0.30, 1.00],
    [0.48, 0.72, 0.24, 0.20, 0.90],
    [0.05, 0.60, 0.18, 0.24, 0.80],
    [0.92, 0.55, 0.20, 0.26, 0.80],
    [0.38, 0.05, 0.22, 0.18, 0.70],
    [0.75, 0.90, 0.20, 0.22, 0.70],
    [0.15, 0.92, 0.18, 0.20, 0.60],
    [0.46, 0.34, 0.14, 0.18, 0.50]
  ];

  function drawBackground(dt) {
    if (!bgCtx || !bgCanvas) return;
    if (_isMobile) {
      if (_mobileBgDrawn) return;
      _mobileBgDrawn = true;
    }

    bgTime += dt;
    var W = bgCanvas.width, H = bgCanvas.height;
    bgCtx.clearRect(0, 0, W, H);

    var GW = _isMobile ? 60 : 140;
    var GH = _isMobile ? 40 : 100;
    var GW1 = GW + 1, TOTAL = GW1 * (GH + 1);
    if (!_hGrid || _hGrid.length !== TOTAL) _hGrid = new Float32Array(TOTAL);

    var cellW = W / GW, cellH = H / GH;
    var bs = bgTime * 0.5;

    for (var row = 0; row <= GH; row++) {
      var ny = row / GH, base = row * GW1;
      for (var col = 0; col <= GW; col++) {
        var nx = col / GW;
        var h = 0;
        for (var p = 0; p < PEAKS.length; p++) {
          var pk = PEAKS[p];
          var driftX = 0.014 * Math.sin(bs * 0.08 + p * 2.1);
          var driftY = 0.010 * Math.cos(bs * 0.10 + p * 1.7);
          var amp = pk[4] * (1.0 + 0.18 * Math.sin(bs * 0.28 + p * 0.9));
          var dx = (nx - pk[0] - driftX) / pk[2];
          var dy = (ny - pk[1] - driftY) / pk[3];
          h += amp * Math.exp(-0.5 * (dx * dx + dy * dy));
        }
        _hGrid[base + col] = h;
      }
    }

    var lvMin = 0.22, lvMax = 2.58, nL = 14;
    var spacing = (lvMax - lvMin) / (nL - 1);

    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';

    for (var li = 0; li < nL; li++) {
      var lv = lvMin + li * spacing;
      var isIdx = (li % 4 === 0);
      bgCtx.beginPath();
      bgCtx.lineWidth = isIdx ? 1.4 : 0.65;
      bgCtx.strokeStyle = isIdx
        ? 'rgba(160,115,20,0.42)'
        : 'rgba(180,140,50,0.17)';

      for (var r2 = 0; r2 < GH; r2++) {
        var rr0 = r2 * GW1, rr1 = (r2 + 1) * GW1;
        var yy0 = r2 * cellH, yy1 = yy0 + cellH;
        for (var c2 = 0; c2 < GW; c2++) {
          var h00 = _hGrid[rr0 + c2], h10 = _hGrid[rr0 + c2 + 1];
          var h11 = _hGrid[rr1 + c2 + 1], h01 = _hGrid[rr1 + c2];
          var b0 = h00 > lv ? 1 : 0, b1 = h10 > lv ? 1 : 0;
          var b2 = h11 > lv ? 1 : 0, b3 = h01 > lv ? 1 : 0;
          var mc = b0 | (b1 << 1) | (b2 << 2) | (b3 << 3);
          if (mc === 0 || mc === 15) continue;

          var xx0 = c2 * cellW, xx1 = xx0 + cellW;
          switch (mc) {
            case 1: case 14: {
              var tT = (lv - h00) / (h10 - h00), tL = (lv - h00) / (h01 - h00);
              bgCtx.moveTo(xx0 + tT * cellW, yy0); bgCtx.lineTo(xx0, yy0 + tL * cellH);
              break;
            }
            case 2: case 13: {
              var tT2 = (lv - h00) / (h10 - h00), tR = (lv - h10) / (h11 - h10);
              bgCtx.moveTo(xx0 + tT2 * cellW, yy0); bgCtx.lineTo(xx1, yy0 + tR * cellH);
              break;
            }
            case 3: case 12: {
              var tL2 = (lv - h00) / (h01 - h00), tR2 = (lv - h10) / (h11 - h10);
              bgCtx.moveTo(xx0, yy0 + tL2 * cellH); bgCtx.lineTo(xx1, yy0 + tR2 * cellH);
              break;
            }
            case 4: case 11: {
              var tR3 = (lv - h10) / (h11 - h10), tB = (lv - h01) / (h11 - h01);
              bgCtx.moveTo(xx1, yy0 + tR3 * cellH); bgCtx.lineTo(xx0 + tB * cellW, yy1);
              break;
            }
            case 5: {
              var aT = (lv - h00) / (h10 - h00), aL = (lv - h00) / (h01 - h00);
              var aR = (lv - h10) / (h11 - h10), aB = (lv - h01) / (h11 - h01);
              bgCtx.moveTo(xx0 + aT * cellW, yy0); bgCtx.lineTo(xx0, yy0 + aL * cellH);
              bgCtx.moveTo(xx1, yy0 + aR * cellH); bgCtx.lineTo(xx0 + aB * cellW, yy1);
              break;
            }
            case 6: case 9: {
              var bT = (lv - h00) / (h10 - h00), bB = (lv - h01) / (h11 - h01);
              bgCtx.moveTo(xx0 + bT * cellW, yy0); bgCtx.lineTo(xx0 + bB * cellW, yy1);
              break;
            }
            case 7: case 8: {
              var cL = (lv - h00) / (h01 - h00), cB = (lv - h01) / (h11 - h01);
              bgCtx.moveTo(xx0, yy0 + cL * cellH); bgCtx.lineTo(xx0 + cB * cellW, yy1);
              break;
            }
            case 10: {
              var dT = (lv - h00) / (h10 - h00), dR = (lv - h10) / (h11 - h10);
              var dL = (lv - h00) / (h01 - h00), dB = (lv - h01) / (h11 - h01);
              bgCtx.moveTo(xx0 + dT * cellW, yy0); bgCtx.lineTo(xx1, yy0 + dR * cellH);
              bgCtx.moveTo(xx0, yy0 + dL * cellH); bgCtx.lineTo(xx0 + dB * cellW, yy1);
              break;
            }
          }
        }
      }
      bgCtx.stroke();
    }
  }

  /* ── 3. IDLE & MAIN LOOP ──────────────────────────────────────── */
  function getIdleMask() {
    return {
      x: 0.5 + Math.cos(idleT * 0.44) * 0.32,
      y: 0.38 + Math.sin(idleT * 0.63) * 0.30
    };
  }

  var lastTs = 0;
  function loop(ts) {
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    idleT += dt;

    smoothX = lerp(smoothX, rawX, MOUSE_EASE);
    smoothY = lerp(smoothY, rawY, MOUSE_EASE);

    if (isIdle) {
      var idle = getIdleMask();
      tgtMaskX = idle.x; tgtMaskY = idle.y;

      if (window.FluidSim) {
        idleFluidTimer += dt;
        var IDLE_INTERVAL = 0.038;
        if (idleFluidTimer >= IDLE_INTERVAL) {
          idleFluidTimer = 0;
          var cx = window.innerWidth * 0.50;
          var cy = window.innerHeight * 0.44;
          var baseR = Math.min(window.innerWidth, window.innerHeight) * 0.15;
          [
            { spd: 0.52, r: baseR * 1.00, ph: 0.00 },
            { spd: 0.33, r: baseR * 1.55, ph: Math.PI * 0.667 },
            { spd: 0.74, r: baseR * 0.72, ph: Math.PI * 1.333 }
          ].forEach(function (s) {
            var ang = idleT * s.spd + s.ph;
            var sx = cx + Math.cos(ang) * s.r;
            var sy = cy + Math.sin(ang) * s.r;
            var vx = -Math.sin(ang) * s.spd * 0.0018;
            var vy = Math.cos(ang) * s.spd * 0.0018;
            window.FluidSim.splat(sx, sy, vx, vy);
          });
        }
      }
    } else {
      tgtMaskX = rawX; tgtMaskY = rawY;
      idleFluidTimer = 0;
    }

    maskX = lerp(maskX, tgtMaskX, MASK_EASE);
    maskY = lerp(maskY, tgtMaskY, MASK_EASE);

    drawBackground(dt);

    if (slideReady) {
      slideOffset = lerp(slideOffset, targetSlide, SLIDE_EASE);
      slideGroup.style.transform = 'translateX(' + slideOffset.toFixed(2) + 'px)';
    }

    rawRingX += (mouseX - rawRingX) * RING_EASE;
    rawRingY += (mouseY - rawRingY) * RING_EASE;
    cursorRing.style.left = rawRingX.toFixed(2) + 'px';
    cursorRing.style.top = rawRingY.toFixed(2) + 'px';

    /* menu dots over fluid? */
    (function () {
      var menuEl = document.getElementById('menuDots');
      if (menuEl && window.FluidSim && window.FluidSim.getFluidAlpha) {
        var mr = menuEl.getBoundingClientRect();
        var alpha = window.FluidSim.getFluidAlpha((mr.left + mr.right) / 2, (mr.top + mr.bottom) / 2);
        menuEl.classList.toggle('fluid-over', alpha > 0.08);
      }
    })();

    /* illustration canvas: fluid-masked illustration */
    if (illustrationCtx && illustrationImg && illustrationImg.complete && illustrationImg.naturalWidth > 0) {
      var fluidEl = document.getElementById('fluidCanvas');
      var frameRect = portraitFrame ? portraitFrame.getBoundingClientRect() : null;
      if (fluidEl && frameRect && frameRect.width > 0) {
        var cw = Math.round(frameRect.width), ch = Math.round(frameRect.height);
        if (illustrationCanvas.width !== cw || illustrationCanvas.height !== ch) {
          illustrationCanvas.width = cw;
          illustrationCanvas.height = ch;
        }
        var imgAR = illustrationImg.naturalWidth / illustrationImg.naturalHeight;
        var canAR = cw / ch;
        var dw, dh, dx, dy;
        if (imgAR > canAR) { dw = cw; dh = cw / imgAR; dx = 0; dy = ch - dh; }
        else { dh = ch; dw = ch * imgAR; dx = (cw - dw) / 2; dy = 0; }
        illustrationCtx.clearRect(0, 0, cw, ch);
        illustrationCtx.drawImage(illustrationImg, dx, dy, dw, dh);
        illustrationCtx.globalCompositeOperation = 'destination-in';
        illustrationCtx.drawImage(
          fluidEl,
          frameRect.left, frameRect.top, frameRect.width, frameRect.height,
          0, 0, cw, ch
        );
        illustrationCtx.globalCompositeOperation = 'source-over';
      }
    }

    /* vertical parallax */
    if (parallaxReady) {
      var paraTarget = rawY - 0.5;
      smoothParaY = lerp(smoothParaY, paraTarget, 0.022);
      smoothParaName = lerp(smoothParaName, paraTarget, 0.09);
      portraitSection.style.transform =
        'translateX(-50%) translateY(' + (smoothParaY * -45).toFixed(1) + 'px)';
      if (nameSection) {
        nameSection.style.transform =
          'translateY(' + (smoothParaName * -15).toFixed(1) + 'px)';
      }
    }

    requestAnimationFrame(loop);
  }

  /* ── 5. EVENTS ────────────────────────────────────────────────── */
  function setupEvents() {
    document.addEventListener('mousemove', function (e) {
      if (window.FluidSim) {
        var dx = (e.clientX - prevMouseX) / window.innerWidth;
        var dy = (e.clientY - prevMouseY) / window.innerHeight;
        window.FluidSim.splat(e.clientX, e.clientY, dx, dy);
      }
      prevMouseX = e.clientX; prevMouseY = e.clientY;

      rawX = e.clientX / window.innerWidth;
      rawY = e.clientY / window.innerHeight;

      var side;
      if (rawX < 0.4) side = 'left';
      else if (rawX > 0.6) side = 'right';
      else side = 'center';
      if (side !== currentSide) {
        currentSide = side;
        body.classList.remove('cursor-left', 'cursor-right');
        if (side === 'left') {
          body.classList.add('cursor-left');
          targetSlide = SLIDE_PX;
          animateNameChange(NAMES.left);
        } else if (side === 'right') {
          body.classList.add('cursor-right');
          targetSlide = -SLIDE_PX;
          animateNameChange(NAMES.right);
        } else {
          targetSlide = 0;
        }
      }

      isIdle = false;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { isIdle = true; }, 2200);

      cursorDot.style.left = e.clientX + 'px';
      cursorDot.style.top = e.clientY + 'px';
      mouseX = e.clientX; mouseY = e.clientY;
    });

    document.addEventListener('mouseleave', function () { isIdle = true; });

    window.addEventListener('resize', function () {
      resizeBgCanvas();
      _isMobile = window.innerWidth < 768;
      _mobileBgDrawn = false;
    });
  }

  /* ── 6. CMS ───────────────────────────────────────────────────── */
  function loadCms() {
    if (!window.contentFetch) return;
    window.contentFetch('*[_type=="homePage"][0]{portraitImage,illustrationEnabled,illustrationImage,fluidBgEnabled,fluidBgImage,fluidBgColor}')
      .then(function (data) {
        if (!data) return;
        var base = document.getElementById('portraitBase');
        if (data.portraitImage && base) base.src = data.portraitImage;
        if (data.illustrationEnabled !== false && data.illustrationImage) {
          illustrationImg = new Image();
          illustrationImg.src = data.illustrationImage;
        }
        if (window.FluidSim) {
          if (data.fluidBgEnabled === false) {
            window.FluidSim.setBgImage(null);
            if (data.fluidBgColor) {
              var hex = String(data.fluidBgColor).replace('#', '');
              window.BgConfig.GRAY_R = parseInt(hex.substring(0, 2), 16);
              window.BgConfig.GRAY_G = parseInt(hex.substring(2, 4), 16);
              window.BgConfig.GRAY_B = parseInt(hex.substring(4, 6), 16);
            }
          } else if (data.fluidBgImage) {
            window.FluidSim.setBgImage(data.fluidBgImage);
          } else {
            window.FluidSim.loadStaticBg();
          }
        }
      })
      .catch(function () {});
  }

  /* ── 7. PRELOADER ─────────────────────────────────────────────── */
  var CHAOS_BLOCKS = [
    [4, 8, 6, 3, '#ff7aff'], [14, 16, 4, 4, '#0033dd'], [26, 9, 8, 3, '#ff00cc'],
    [38, 14, 5, 5, '#00ffff'], [52, 7, 4, 6, '#ff44bb'], [63, 18, 7, 3, '#ff0000'],
    [74, 10, 5, 4, '#ff7aff'], [86, 15, 6, 3, '#0033cc'], [8, 30, 4, 5, '#00ffff'],
    [18, 42, 6, 4, '#ffff00'], [31, 33, 3, 6, '#ff00cc'], [44, 45, 8, 3, '#0000ff'],
    [57, 30, 4, 4, '#ff44bb'], [69, 40, 6, 5, '#00ffff'], [81, 34, 3, 4, '#ff7aff'],
    [91, 44, 5, 3, '#ff0000'], [6, 58, 7, 4, '#0d0d0d'], [17, 70, 4, 6, '#ff00cc'],
    [29, 62, 6, 3, '#0033dd'], [41, 74, 5, 4, '#ffff00'], [54, 60, 4, 4, '#ff44bb'],
    [66, 72, 7, 3, '#00ffff'], [78, 64, 4, 5, '#0000ff'], [89, 74, 6, 4, '#ff7aff'],
    [12, 86, 5, 3, '#ff00cc'], [24, 90, 8, 4, '#0d0d0d'], [37, 84, 4, 4, '#0033cc'],
    [50, 92, 5, 3, '#ff0000'], [64, 86, 6, 4, '#ff44bb'], [77, 90, 4, 3, '#00ffff']
  ];
  var CHAOS_CROSSES = [[20, 24], [58, 52], [84, 22]];

  function buildChaos() {
    var host = document.querySelector('.tv-chaos');
    if (!host) return;
    CHAOS_BLOCKS.forEach(function (b, i) {
      var d = document.createElement('div');
      d.className = 'tv-cb tv-cb-' + (i + 1);
      d.style.left = b[0] + '%';
      d.style.top = b[1] + '%';
      d.style.width = b[2] + '%';
      d.style.height = b[3] + '%';
      d.style.background = b[4];
      if (i % 3 === 0) d.style.transform = 'rotate(45deg)';
      d.style.opacity = (0.5 + (i % 5) * 0.1).toFixed(2);
      host.appendChild(d);
    });
    CHAOS_CROSSES.forEach(function (c, i) {
      var d = document.createElement('div');
      d.className = 'tv-cross tv-cross-' + (i + 1);
      d.style.left = c[0] + '%';
      d.style.top = c[1] + '%';
      host.appendChild(d);
    });
  }

  function dotted(label) {
    return label + ' ' + '.'.repeat(Math.max(3, 44 - label.length));
  }

  function runBiosSequence(container, onComplete) {
    var DSEP = '\u2550'.repeat(48);
    var SSEP = '\u2500'.repeat(40);

    [
      ['bios-line bios-line--empty', ''],
      ['bios-line bios-line--logo', 'D E V D R O M E'],
      ['bios-line bios-line--logo-tag', 'CREATIVE COMPUTING SYSTEM \u25a0 v2026'],
      ['bios-line bios-line--empty', '']
    ].forEach(function (pair) {
      var r = document.createElement('div');
      r.className = pair[0]; r.textContent = pair[1];
      container.appendChild(r);
    });

    var hdrRow = document.createElement('div');
    hdrRow.className = 'bios-line bios-line--header';
    hdrRow.textContent = 'DEVDROME NEURAL BOOT SEQUENCE v1.3';
    container.appendChild(hdrRow);

    var sepRow = document.createElement('div');
    sepRow.className = 'bios-line bios-line--sep';
    sepRow.textContent = DSEP;
    container.appendChild(sepRow);

    var termBody = document.createElement('div');
    termBody.className = 'bios-terminal-body';
    container.appendChild(termBody);

    /* [delay, type, label, okTag] */
    var lines = [
      [0, 'empty', '', ''],
      [80, 'status', 'DEEP SIGNAL SCAN', '[LOCKED]'],
      [240, 'status', 'COSMIC NETWORK LINK', '[ESTABLISHED]'],
      [400, 'status', 'CREATIVE MATRIX', '[ONLINE]'],
      [560, 'status', 'VISUAL CORTEX', '[SYNCHRONIZED]'],
      [720, 'status', 'NEURAL CANVAS', '[LOADED]'],
      [880, 'status', 'STYLE MATRIX', '[STABLE]'],
      [1040, 'status', 'ARTWORK ENGINE', '[ACTIVE]'],
      [1200, 'status', 'PROJECT GRID', '[MOUNTED]'],
      [1360, 'empty', '', ''],
      [1440, 'section', 'SYSTEM DIAGNOSTICS', ''],
      [1520, 'sep', SSEP, ''],
      [1640, 'status', 'MEMORY BANK', '[CLEAR]'],
      [1790, 'status', 'ERROR TRACE', '[NONE]'],
      [1940, 'plain', dotted('LATENCY') + ' 0.01ms', ''],
      [2090, 'plain', dotted('CREATIVE POWER') + ' 99%', ''],
      [2240, 'status', 'IMAGINATION CORE', '[FLOWING]'],
      [2400, 'empty', '', ''],
      [2480, 'section', 'SUBSYSTEM INITIALIZATION', ''],
      [2560, 'sep', SSEP, ''],
      [2680, 'status', 'INSPIRATION ENGINE', '[ACTIVE]'],
      [2830, 'status', 'IDEA GENERATOR', '[GENERATING]'],
      [2980, 'status', 'VISUAL LIBRARY', '[INDEXED]'],
      [3130, 'status', 'CONCEPT ARCHIVE', '[SYNCED]'],
      [3280, 'status', 'REALITY DISTORTION MODULE', '[ENABLED]'],
      [3440, 'empty', '', ''],
      [3520, 'section', 'IDENTITY PROTOCOL', ''],
      [3600, 'sep', SSEP, ''],
      [3720, 'status', 'CREATOR SIGNATURE', '[VERIFIED]'],
      [3870, 'status', 'ACCESS LEVEL', '[OMEGA PRIME]'],
      [4020, 'status', 'NEURAL LINK', '[STABLE]'],
      [4180, 'empty', '', ''],
      [4260, 'sep', DSEP, ''],
      [4380, 'empty', '', ''],
      [4460, 'access', 'GALACTIC CREATIVE SYSTEM READY', ''],
      [4620, 'empty', '', ''],
      [4700, 'welcome', 'WELCOME, FRIEND', ''],
      [4860, 'empty', '', ''],
      [4940, 'welcome', "IT'S ALWAYS NICE TO SEE YOU", ''],
      [5100, 'welcome', 'HAVE A NICE DAY', ''],
      [5180, 'enter', 'ENTERING THE DROME...', ''],
      [5380, 'enter', 'EXPANDING CREATIVE UNIVERSE', '']
    ];

    lines.forEach(function (item) {
      var t = item[0], type = item[1], text = item[2], ok = item[3];
      setTimeout(function () {
        var row = document.createElement('div');
        row.className = 'bios-line bios-line--' + (type === 'plain' ? 'status' : type);

        if (type === 'status') {
          var lbl = document.createElement('span');
          lbl.className = 'bl-label';
          lbl.textContent = dotted(text);
          var okSpan = document.createElement('span');
          okSpan.className = 'bl-ok';
          row.appendChild(lbl);
          row.appendChild(okSpan);
          termBody.appendChild(row);
          termBody.scrollTop = termBody.scrollHeight;
          setTimeout(function () { okSpan.textContent = ok; }, 200);

        } else if (type === 'enter' && text === 'EXPANDING CREATIVE UNIVERSE') {
          termBody.appendChild(row);
          var i = 0;
          var cursor = document.createElement('span');
          cursor.className = 'bios-cursor';
          row.appendChild(cursor);
          var typeNext = function () {
            if (i < text.length) {
              row.insertBefore(document.createTextNode(text.charAt(i++)), cursor);
              setTimeout(typeNext, 48);
            } else {
              cursor.remove();
              row.classList.add('is-blinking');
              setTimeout(onComplete, 1600);
            }
          };
          setTimeout(typeNext, 60);

        } else {
          row.textContent = text;
          termBody.appendChild(row);
          termBody.scrollTop = termBody.scrollHeight;
        }
      }, t);
    });
  }

  function runPreloader() {
    var preloader = document.getElementById('preloader');
    var fluidCanvas = document.getElementById('fluidCanvas');
    var bgCanvasEl = document.getElementById('bgCanvas');
    var illustCanvas = document.getElementById('illustrationCanvas');
    var tvInnerEl = document.getElementById('tvInner');

    buildChaos();

    /* Hide bg layers until boot ends */
    [fluidCanvas, bgCanvasEl, illustCanvas].forEach(function (el) {
      if (el) { el.style.opacity = '0'; el.style.transition = 'none'; }
    });

    /* Internal navigation → skip the TV entirely */
    var isInternalNav = false;
    try { isInternalNav = sessionStorage.getItem('txText') !== null; } catch (_) {}

    if (typeof window.TxIn === 'function') window.TxIn();

    if (isInternalNav) {
      if (preloader) { preloader.style.transition = 'none'; preloader.style.display = 'none'; }
      body.classList.remove('boot-pending');
      [fluidCanvas, bgCanvasEl, illustCanvas].forEach(function (el) {
        if (el) { el.style.transition = 'opacity 1s ease'; el.style.opacity = '1'; }
      });
      return;
    }

    var _grainRaf = null, _glitchRaf = null, _shakeTimer = null;

    /* Grain: 1600×900, every 5th frame */
    var grainCanvas = document.getElementById('tvGrainCanvas');
    if (grainCanvas) {
      grainCanvas.width = 1600; grainCanvas.height = 900;
      var gc = grainCanvas.getContext('2d');
      var grainTick = 0;
      (function drawGrain() {
        grainTick++;
        if (grainTick % 5 === 0) {
          var img = gc.createImageData(1600, 900);
          var d = img.data;
          for (var i = 0; i < d.length; i += 4) {
            var v = (Math.random() * 255) | 0;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 255;
          }
          gc.putImageData(img, 0, 0);
        }
        _grainRaf = requestAnimationFrame(drawGrain);
      })();
    }

    /* Glitch: 2 bursts at 400/1100ms, 220ms each */
    var glitchCanvas = document.getElementById('tvGlitchCanvas');
    if (glitchCanvas) {
      var GW = 320, GH = 200;
      glitchCanvas.width = GW; glitchCanvas.height = GH;
      var gg = glitchCanvas.getContext('2d');
      var snowImg = gg.createImageData(GW, GH);
      var sd = snowImg.data;
      var STRIP_COLORS = [
        [191, 191, 191], [191, 191, 0], [0, 191, 191],
        [0, 191, 0], [191, 0, 191], [191, 0, 0], [0, 0, 191]
      ];
      var N_STRIPS = STRIP_COLORS.length;
      var stripOffsets = new Float32Array(N_STRIPS);
      var stripTargets = new Float32Array(N_STRIPS);
      var STRIP_H = Math.ceil(GH * 0.62);
      var STRIP_W = Math.ceil(GW / N_STRIPS);
      var BURST_AT = [400, 1100];
      var BURST_DUR = 220;
      var glitchStart = Date.now();
      var burstActive = false, burstEnd = 0, nextBurst = 0;

      function stopShake() {
        if (_shakeTimer) { clearInterval(_shakeTimer); _shakeTimer = null; }
        if (tvInnerEl) tvInnerEl.style.transform = '';
      }
      function startShake() {
        stopShake();
        var step = 0;
        _shakeTimer = setInterval(function () {
          step++;
          if (step >= 12 || !tvInnerEl) { stopShake(); return; }
          tvInnerEl.style.transform = 'translateX(' + ((Math.random() - 0.5) * 28) + 'px)';
        }, BURST_DUR / 12);
      }

      (function drawGlitch() {
        var now = Date.now();
        var elapsed = now - glitchStart;

        if (!burstActive && nextBurst < BURST_AT.length && elapsed >= BURST_AT[nextBurst]) {
          burstActive = true;
          burstEnd = now + BURST_DUR;
          for (var i = 0; i < N_STRIPS; i++) stripTargets[i] = (Math.random() - 0.5) * 36;
          startShake();
          nextBurst++;
        }

        if (burstActive && now >= burstEnd) {
          burstActive = false;
          stopShake();
          gg.clearRect(0, 0, GW, GH);
          stripOffsets.fill(0);
        }

        if (burstActive) {
          for (var j = 0; j < sd.length; j += 4) {
            var v = (Math.random() * 255) | 0;
            sd[j] = sd[j + 1] = sd[j + 2] = v;
            sd[j + 3] = ((Math.random() * 180 + 55) | 0);
          }
          gg.putImageData(snowImg, 0, 0);
          for (var k = 0; k < N_STRIPS; k++) {
            stripOffsets[k] += (stripTargets[k] - stripOffsets[k]) * 0.35;
            if (Math.random() < 0.18) stripTargets[k] = (Math.random() - 0.5) * 36;
            var col = STRIP_COLORS[k];
            gg.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.72)';
            gg.fillRect(k * STRIP_W + stripOffsets[k], 0, STRIP_W + 1, STRIP_H);
          }
        }

        _glitchRaf = requestAnimationFrame(drawGlitch);
      })();
    }

    /* Loading bar */
    var fillEl = document.getElementById('tvProgressFill');
    var pctEl = document.getElementById('tvPct');
    var progressEl = fillEl ? fillEl.parentElement : null;
    var loadN = 0;

    function updateLoadBar(n) {
      if (!fillEl || !progressEl) return;
      var barW = progressEl.offsetWidth;
      if (!barW) return;
      var N = Math.max(1, Math.floor(barW / 14));
      var segW = barW / N;
      var whiteW = segW * (10 / 14);
      var visN = n >= 100 ? N : Math.floor(n * N / 100);
      fillEl.style.width = n >= 100 ? '100%' : (visN * segW) + 'px';
      fillEl.style.background =
        'repeating-linear-gradient(to right,' +
        ' rgba(255,255,255,0.95) 0px,' +
        ' rgba(255,255,255,0.95) ' + whiteW + 'px,' +
        ' transparent ' + whiteW + 'px,' +
        ' transparent ' + segW + 'px)';
      if (pctEl) pctEl.textContent = n + '%';
    }
    updateLoadBar(0);

    var loadTimer = setInterval(function () {
      loadN += Math.random() > 0.4 ? 3 : 2;
      if (loadN >= 100) { loadN = 100; clearInterval(loadTimer); }
      updateLoadBar(loadN);
    }, 42);

    /* Visit counter + skip */
    var _SKIP_KEY = 'dev_vc';
    var _vc = 0;
    try { _vc = parseInt(localStorage.getItem(_SKIP_KEY) || '0', 10) || 0; } catch (_) {}
    _vc++;
    try { localStorage.setItem(_SKIP_KEY, String(_vc)); } catch (_) {}
    var _showSkip = _vc >= 2;
    var _skipped = false;
    var _skipHintEl = document.getElementById('tvSkipHint');
    var _isMobilePtr = window.matchMedia('(pointer: coarse)').matches;

    function revealPage() {
      body.classList.remove('boot-pending');
      var pSection = document.getElementById('portraitSection');
      var nSection = document.getElementById('nameSection');
      var sLeft = document.getElementById('sideLeft');
      var sRight = document.getElementById('sideRight');

      if (nSection) { nSection.style.animation = 'none'; nSection.style.opacity = '0'; }
      if (sLeft) {
        sLeft.style.animation = 'none'; sLeft.style.opacity = '0';
        sLeft.style.transform = 'translateY(-50%) translateX(-180%)';
      }
      if (sRight) {
        sRight.style.animation = 'none'; sRight.style.opacity = '0';
        sRight.style.transform = 'translateY(-50%) translateX(180%)';
      }

      /* Portrait CRT power-on blinks */
      if (pSection) {
        pSection.style.animation = 'none';
        pSection.style.opacity = '0';
        pSection.style.transform = 'translateX(-50%) translateY(0)';
        pSection.style.transition = 'none';
        var blinks = [
          [50, '1'], [105, '0'], [160, '1'], [215, '0'], [270, '1'], [325, '0'],
          [380, '1'], [435, '0'], [555, '1'], [675, '0'], [855, '1'], [1035, '0'],
          [1285, '1'], [1535, '0'], [2135, '1'], [2600, '0'], [3300, '1']
        ];
        blinks.forEach(function (b) {
          setTimeout(function () { pSection.style.opacity = b[1]; }, b[0]);
        });
        setTimeout(function () {
          pSection.style.transition = 'opacity 0.6s ease';
          pSection.style.opacity = '1';
        }, 3400);
      }

      setTimeout(function () {
        if (nSection) { nSection.style.transition = 'opacity 1.3s ease'; nSection.style.opacity = '1'; }
      }, 4000);

      setTimeout(function () {
        [sLeft, sRight].forEach(function (el) {
          if (!el) return;
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              el.style.transition =
                'opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)';
              el.style.opacity = '1';
              el.style.transform = 'translateY(-50%) translateX(0)';
            });
          });
        });
      }, 4900);

      setTimeout(function () {
        if (bgCanvasEl)  { bgCanvasEl.style.transition  = 'opacity 1.4s ease'; bgCanvasEl.style.opacity  = '1'; }
        if (fluidCanvas) { fluidCanvas.style.transition = 'opacity 1.4s ease'; fluidCanvas.style.opacity = '1'; }
        if (illustCanvas) { illustCanvas.style.transition = 'opacity 1.4s ease'; illustCanvas.style.opacity = '1'; }
      }, 6000);
    }

    function skipKeyHandler(e) {
      if (e.key === ' ' || e.key === 'Escape') { e.preventDefault(); skipPreloader(); }
    }
    function skipPreloader() {
      if (_skipped) return;
      _skipped = true;
      document.removeEventListener('keydown', skipKeyHandler);
      if (preloader) preloader.removeEventListener('click', skipPreloader);
      clearInterval(loadTimer);
      clearTimeout(_biosTimer);
      if (_grainRaf) cancelAnimationFrame(_grainRaf);
      if (_glitchRaf) cancelAnimationFrame(_glitchRaf);
      if (_shakeTimer) { clearInterval(_shakeTimer); _shakeTimer = null; }
      if (tvInnerEl) tvInnerEl.style.transform = '';
      if (preloader) {
        preloader.style.transition = 'opacity 0.3s ease';
        preloader.style.opacity = '0';
        setTimeout(function () {
          if (preloader) preloader.style.visibility = 'hidden';
          revealPage();
        }, 320);
      } else {
        revealPage();
      }
    }

    if (_showSkip) {
      document.addEventListener('keydown', skipKeyHandler);
      if (preloader) preloader.addEventListener('click', skipPreloader);
      var hintDelay = _isMobilePtr ? 800 : 1100;
      setTimeout(function () {
        if (_skipped || !_skipHintEl) return;
        _skipHintEl.classList.add('is-visible');
        if (_isMobilePtr) {
          setTimeout(function () {
            if (!_skipped) _skipHintEl.classList.add('is-pulsing');
          }, 700);
        }
      }, hintDelay);
    }

    /* At 3.3s: stop glitch, run BIOS */
    var _biosTimer = setTimeout(function () {
      if (_glitchRaf) cancelAnimationFrame(_glitchRaf);
      if (_shakeTimer) { clearInterval(_shakeTimer); _shakeTimer = null; }
      if (tvInnerEl) tvInnerEl.style.transform = '';

      if (tvInnerEl) {
        tvInnerEl.style.transition = 'opacity 0.28s ease';
        tvInnerEl.style.opacity = '0';
      }

      var biosEl = document.getElementById('tvBios');
      if (biosEl) {
        biosEl.classList.add('is-visible');
        runBiosSequence(biosEl, function () {
          if (_skipped) return;
          if (preloader) {
            preloader.style.transition = 'opacity 0.5s ease';
            preloader.style.opacity = '0';
            setTimeout(function () {
              if (preloader) preloader.style.visibility = 'hidden';
            }, 530);
          }
          setTimeout(revealPage, 700);
        });
      }
    }, 3300);
  }

  /* ── INIT ─────────────────────────────────────────────────────── */
  function init() {
    body = document.body;
    bgCanvas = document.getElementById('bgCanvas');
    bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
    nameDisplay = document.getElementById('nameDisplay');
    portraitIllus = document.getElementById('portraitIllustration');
    portraitSection = document.getElementById('portraitSection');
    portraitFrame = document.getElementById('portraitFrame');
    nameSection = document.getElementById('nameSection');
    illustrationCanvas = document.getElementById('illustrationCanvas');
    illustrationCtx = illustrationCanvas ? illustrationCanvas.getContext('2d') : null;

    illustrationImg = new Image();
    illustrationImg.src = 'assets/images/portrait-illustration.webp?v=3';

    slideGroup = document.getElementById('slideGroup');
    cursorDot = document.getElementById('cursorDot');
    cursorRing = document.getElementById('cursorRing');
    if (cursorDot)  { cursorDot.style.left  = mouseX + 'px'; cursorDot.style.top  = mouseY + 'px'; }
    if (cursorRing) { cursorRing.style.left = rawRingX + 'px'; cursorRing.style.top = rawRingY + 'px'; }

    resizeBgCanvas();
    setupEvents();
    loadCms();

    buildSlots(NAMES.left, false);
    currentName = NAMES.left;

    // Re-measure slot widths once the display font has actually loaded,
    // otherwise wide glyphs (e.g. the U/H in CHAUHAN) render clipped.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (isAnimatingName) return;
        currentName = '';
        animateNameChange(NAMES.left);
      });
    }

    idleTimer = setTimeout(function () { isIdle = true; }, 1800);
    setTimeout(function () { slideReady = true; }, 1800);
    prevMouseX = mouseX; prevMouseY = mouseY;

    /* Menu dots: create 9 spans + formations cycle */
    var menuBtn = document.getElementById('menuDots');
    if (menuBtn && !menuBtn.querySelector('span')) {
      for (var i = 0; i < 9; i++) menuBtn.appendChild(document.createElement('span'));
    }
    applyMenuFormation(0);
    setInterval(function () {
      _menuFormIdx = (_menuFormIdx + 1) % MENU_FORMATIONS.length;
      applyMenuFormation(_menuFormIdx);
    }, 3500);

    setTimeout(function () { parallaxReady = true; }, 2600);

    body.classList.add('boot-pending');
    body.classList.add('js-ready');
    requestAnimationFrame(function (ts) {
      lastTs = ts;
      requestAnimationFrame(loop);
    });

    /* Side rail navigation */
    var sideLeftEl = document.getElementById('sideLeft');
    var sideRightEl = document.getElementById('sideRight');
    if (sideLeftEl) {
      sideLeftEl.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.TxOut === 'function') {
          window.TxOut(sideLeftEl.getAttribute('href'), 'PROJECTS', '#ef4444');
        } else {
          window.location.href = sideLeftEl.getAttribute('href');
        }
      });
    }
    if (sideRightEl) {
      sideRightEl.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.TxOut === 'function') {
          window.TxOut(sideRightEl.getAttribute('href'), 'ARTWORKS', '#1d4ed8');
        } else {
          window.location.href = sideRightEl.getAttribute('href');
        }
      });
    }

    /* CRT barrel shape for the preloader's tv-outer */
    function setCRTShape() {
      var outer = document.querySelector('.tv-outer');
      if (!outer) return;
      var W = outer.offsetWidth, H = outer.offsetHeight;
      if (!W || !H) return;
      var M = window.innerWidth <= 768 ? 12 : 38;
      var R = Math.min(Math.max(40, W * 0.042), 70);
      var path = [
        'M ' + (M + R) + ',' + M,
        'Q ' + (W / 2) + ',0 ' + (W - M - R) + ',' + M,
        'Q ' + (W - M) + ',' + M + ' ' + (W - M) + ',' + (M + R),
        'Q ' + W + ',' + (H / 2) + ' ' + (W - M) + ',' + (H - M - R),
        'Q ' + (W - M) + ',' + (H - M) + ' ' + (W - M - R) + ',' + (H - M),
        'Q ' + (W / 2) + ',' + H + ' ' + (M + R) + ',' + (H - M),
        'Q ' + M + ',' + (H - M) + ' ' + M + ',' + (H - M - R),
        'Q 0,' + (H / 2) + ' ' + M + ',' + (M + R),
        'Q ' + M + ',' + M + ' ' + (M + R) + ',' + M,
        'Z'
      ].join(' ');
      outer.style.clipPath = "path('" + path + "')";
    }
    requestAnimationFrame(function () { requestAnimationFrame(setCRTShape); });
    if (window.ResizeObserver) {
      new ResizeObserver(setCRTShape).observe(document.documentElement);
    }

    runPreloader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
