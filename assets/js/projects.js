/* ================================================================
   PROJECTS PAGE ENGINE — projects.js
   Fluid ink typography, project rows + magnetic image, clients
   marquee, journey timeline, skills, CTA. Plus the Snake trigger.
   ================================================================ */
(function () {
  'use strict';

  /* ── Live fluid config: warm white ink, no bg plate ───────────── */
  window.FLUID_NO_BG_IMAGE = true;
  window.BgConfig = { GRAY_R: 225, GRAY_G: 222, GRAY_B: 218, EDGE_LOW: 0.08, EDGE_HIGH: 0.09 };

  var wrap = document.querySelector('.projects-wrap');
  var isTouch = window.matchMedia('(pointer: coarse)').matches;
  var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Scroll-driven page color (red → paper) ───────────────────── */
  var bgProgress = 0;
  var journeySection = null;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

  function updateBgProgress() {
    if (!journeySection) return;
    var rect = journeySection.getBoundingClientRect();
    var viewH = window.innerHeight;
    bgProgress = clamp((viewH * 0.50 - rect.top) / (viewH * 0.35), 0, 1);
    var r = Math.round(lerp(239, 244, bgProgress));
    var g = Math.round(lerp(68, 242, bgProgress));
    var b = Math.round(lerp(68, 238, bgProgress));
    document.body.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    document.documentElement.style.setProperty('--page-bg', 'rgb(' + r + ',' + g + ',' + b + ')');
  }

  /* ── Fluid-fed ink typography (background-clip: text) ─────────── */
  var _textCanvases = new Map();
  var FLUID_TEXT_ELS = [];

  function initFluidText() {
    var els = [
      document.querySelector('.projects-hero-title'),
      document.querySelector('.page-intro-text'),
      document.querySelector('.clients-label')
    ].filter(Boolean);
    els.forEach(function (el) {
      el.style.webkitBackgroundClip = 'text';
      el.style.backgroundClip = 'text';
      el.style.webkitTextFillColor = 'transparent';
      var grad = 'linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85))';
      el.style.backgroundImage = grad;
      el.style.backgroundSize = '100% 100%';
      el.style.backgroundRepeat = 'no-repeat';
      FLUID_TEXT_ELS.push(el);
    });
  }

  function applyFluidTextMask(el) {
    if (!window.FluidSim || !window.FluidSim.getRegionPixels) return;
    var rect = el.getBoundingClientRect();
    var w = Math.max(1, Math.ceil(rect.width));
    var h = Math.max(1, Math.ceil(rect.height));
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    var pixels = window.FluidSim.getRegionPixels(rect.left, rect.top, w, h);
    var cache = _textCanvases.get(el);
    if (!cache || cache.width !== w || cache.height !== h) {
      cache = document.createElement('canvas');
      cache.width = w; cache.height = h;
      _textCanvases.set(el, cache);
    }
    var ctx = cache.getContext('2d');
    var img = ctx.createImageData(w, h);
    var d = img.data;
    var THRESHOLD = 0.06, EDGE = 0.025;
    /* fluid rows are bottom-to-top; flip while writing */
    for (var y = 0; y < h; y++) {
      var srcY = h - 1 - y;
      for (var x = 0; x < w; x++) {
        var si = (srcY * w + x) * 4;
        var di = (y * w + x) * 4;
        var a = pixels[si + 3] / 255;
        var t = clamp((a - THRESHOLD) / EDGE, 0, 1);
        t = t * t * (3 - 2 * t); /* smoothstep */
        var val = Math.round(255 - t * (255 - 42));
        d[di] = d[di + 1] = d[di + 2] = val;
        d[di + 3] = Math.round(217 + t * (255 - 217));
      }
    }
    ctx.putImageData(img, 0, 0);
    el.style.backgroundImage = 'url(' + cache.toDataURL() + ')';
  }

  /* ── Title scramble ───────────────────────────────────────────── */
  function scrambleTitle(el, original, duration) {
    if (el.dataset.scrambling) return;
    el.dataset.scrambling = '1';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var start = performance.now();
    var len = original.length;
    (function frame(now) {
      var t = clamp((now - start) / duration, 0, 1);
      var out = '';
      for (var i = 0; i < len; i++) {
        var ch = original[i];
        if (ch === ' ') { out += ' '; continue; }
        out += (t > i / len) ? ch : chars[Math.floor(Math.random() * 26)];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else {
        el.textContent = original;
        setTimeout(function () { delete el.dataset.scrambling; }, 3000);
      }
    })(start);
  }

  /* ── Data ─────────────────────────────────────────────────────── */
  var MOCK = {
    projects: [],
    introText: 'Dev Chauhan — 3rd Year CSE student. Experienced in designing, building, and testing full-stack and AI-integrated systems',
    journey: [],
    skills: ['Full-Stack', 'Machine Learning', 'Backend API Architecture',
             'Edge AI & LLM Integration', 'UI/UX', 'System Design',
             'Gen-AI', 'Context Engineering', 'Agentic Systems', 'Git/GitHub'],
    logos: [],
    settings: { email: 'chauhandev591@gmail.com', cvUrl: 'assets/Dev_Chauhan_Resume_SWE.pdf' }
  };
  var projects = [], journey = [], skills = [];

  /* ── Render rows ──────────────────────────────────────────────── */
  function renderRows() {
    var list = document.getElementById('projectsList');
    if (!list) return;
    list.innerHTML = '';
    projects.forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'project-row';
      li.dataset.id = p.slug;
      li.dataset.image = p.cardImage || p.heroImage || '';
      var href = 'projects/' + p.slug + '.html';
      li.innerHTML =
        '<a class="project-row-link" href="' + href + '" aria-label="' + p.title + ' project' +
        (p.type ? ', ' + p.type : '') + '">' +
        '<div class="project-row-head">' +
        '<span class="project-row-title" data-orig="' + p.title + '">' + p.title + '</span>' +
        (p.type ? '<span class="project-row-cat">' + p.type + '</span>' : '') +
        (p.client ? '<span class="project-row-client">' + p.client + '</span>' : '') +
        '<span class="project-row-year">' + (p.year || '') + '</span>' +
        '</div></a>';
      list.appendChild(li);
    });
  }

  /* ── Magnetic image ───────────────────────────────────────────── */
  var magImg = document.getElementById('magneticImg');
  var magImgEl = document.getElementById('magneticImgEl');
  var isOverList = false;
  var imgX = -500, imgY = -500, imgTargetX = -500, imgTargetY = -500;
  var imgVelX = 0, imgVelY = 0, imgPrevX = 0, imgPrevY = 0;
  var imgRotation = 0, currentImgSrc = '';
  var rawMouseX = 0, rawMouseY = 0;

  function updateMagneticImage(src) {
    if (src === currentImgSrc) return;
    currentImgSrc = src;
    if (!src) { magImgEl.style.opacity = '0'; return; }
    magImgEl.classList.add('is-changing');
    setTimeout(function () {
      magImgEl.src = src;
      magImgEl.onload = function () { magImgEl.classList.remove('is-changing'); };
      magImgEl.onerror = function () {
        magImgEl.style.opacity = '0';
        magImgEl.classList.remove('is-changing');
      };
    }, 120);
  }

  function renderMagnetic() {
    if (!magImg) return;
    imgX = lerp(imgX, imgTargetX, 0.10);
    imgY = lerp(imgY, imgTargetY, 0.10);
    imgVelX = lerp(imgVelX, rawMouseX - imgPrevX, 0.25);
    imgVelY = lerp(imgVelY, rawMouseY - imgPrevY, 0.25);
    imgPrevX = rawMouseX; imgPrevY = rawMouseY;
    imgRotation = lerp(imgRotation, imgVelX * 5, 0.08);
    var tiltY = imgVelX * 1.2, tiltX = -imgVelY * 1.2;
    magImg.style.transform =
      'translate(' + imgX.toFixed(1) + 'px,' + imgY.toFixed(1) + 'px) ' +
      'rotate(' + imgRotation.toFixed(2) + 'deg) ' +
      'perspective(600px) rotateX(' + tiltX.toFixed(2) + 'deg) rotateY(' + tiltY.toFixed(2) + 'deg)';
    var glare = document.getElementById('magneticImgGlare');
    if (glare) {
      var gx = clamp(imgVelX * 3 + 50, 10, 90).toFixed(1);
      var gy = clamp(imgVelY * 3 + 50, 10, 90).toFixed(1);
      glare.style.background =
        'radial-gradient(circle at ' + gx + '% ' + gy + '%,' +
        ' rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 45%, transparent 70%)';
    }
  }

  function wireRows() {
    var rows = document.querySelectorAll('.project-row');
    rows.forEach(function (row) {
      var link = row.querySelector('.project-row-link');
      var titleEl = row.querySelector('.project-row-title');
      row.addEventListener('mouseenter', function () {
        if (isTouch) return;
        document.querySelectorAll('.project-row.is-active').forEach(function (r) {
          r.classList.remove('is-active');
        });
        row.classList.add('is-active');
        isOverList = true;
        if (magImg) magImg.classList.add('is-visible');
        updateMagneticImage(row.dataset.image || '');
        scrambleTitle(titleEl, titleEl.dataset.orig || titleEl.textContent, 650);
      });
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var title = titleEl.dataset.orig || titleEl.textContent;
        if (typeof window.TxOut === 'function') {
          window.TxOut(link.getAttribute('href'), String(title).toUpperCase());
        } else {
          window.location.href = link.getAttribute('href');
        }
      });
    });
    var list = document.getElementById('projectsList');
    if (list) {
      list.addEventListener('mouseleave', function () {
        isOverList = false;
        if (magImg) magImg.classList.remove('is-visible');
        document.querySelectorAll('.project-row.is-active').forEach(function (r) {
          r.classList.remove('is-active');
        });
        currentImgSrc = '';
      });
    }
  }

  /* ── Marquee ──────────────────────────────────────────────────── */
  function renderMarquee() {
    var track = document.getElementById('clientsTrack');
    if (!track) return;
    track.innerHTML = '';
    var names = MOCK.logos.length ? MOCK.logos : (window.__contentClients || []);
    if (!names.length) return;
    var set = names.map(function (name) {
      var span = document.createElement('span');
      span.className = 'client-logo';
      span.style.cssText = 'height:54px;display:flex;align-items:center;font-family:var(--font-name);' +
        'font-weight:900;font-size:2rem;text-transform:uppercase;letter-spacing:0.04em;' +
        'color:rgba(255,255,255,0.75);white-space:nowrap;';
      span.textContent = name;
      return span;
    });
    for (var rep = 0; rep < 2; rep++) set.forEach(function (el) { track.appendChild(el.cloneNode(true)); });
  }

  /* ── Journey ──────────────────────────────────────────────────── */
  function renderJourney() {
    var listEl = document.getElementById('journeyList');
    if (!listEl) return;
    listEl.innerHTML = '';
    journey.forEach(function (j, i) {
      var art = document.createElement('article');
      art.className = 'journey-entry';
      art.innerHTML =
        '<div class="journey-entry-head">' +
        '<span class="journey-nr">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<h3 class="journey-company" data-orig="' + j.company + ' (yet to come)">' + j.company + ' (yet to come)</h3>' +
        (j.tag ? '<span class="journey-cat">' + j.tag + '</span>' : '') +
        '<span class="journey-period">' + (j.period || '') + '</span>' +
        '</div>' +
        '<div class="journey-entry-body">' +
        (j.role ? '<span class="journey-role">' + j.role + '</span>' : '') +
        (j.description ? '<p class="journey-desc">' + j.description + '</p>' : '') +
        '</div>';
      listEl.appendChild(art);
    });

    /* company scramble on hover */
    if (!isTouch) {
      listEl.querySelectorAll('.journey-entry').forEach(function (entry) {
        entry.addEventListener('mouseenter', function () {
          var companyEl = entry.querySelector('.journey-company');
          if (!companyEl) return;
          scrambleTitle(companyEl, companyEl.dataset.orig || companyEl.textContent, 600);
        });
      });
    }

    /* reveal on scroll */
    var obs = new IntersectionObserver(function (recs) {
      recs.forEach(function (rec) {
        if (rec.isIntersecting) {
          rec.target.classList.add('is-visible');
          obs.unobserve(rec.target);
        }
      });
    }, { threshold: 0.10 });
    listEl.querySelectorAll('.journey-entry').forEach(function (el) { obs.observe(el); });
    var hero = document.querySelector('.journey-hero');
    if (hero) obs.observe(hero);
    var skillsWrap = document.getElementById('journeySkills');
    if (skillsWrap) obs.observe(skillsWrap);
  }

  function renderSkills() {
    var host = document.getElementById('skillsList');
    if (!host) return;
    host.innerHTML = '';
    skills.forEach(function (s) {
      var el = document.createElement('span');
      el.className = 'skill-tag';
      el.textContent = s;
      host.appendChild(el);
    });
  }

  function wireCvAndCta() {
    var cvBtn = document.getElementById('cvBtn');
    if (cvBtn && MOCK.settings.cvUrl && MOCK.settings.cvUrl !== '#') {
      cvBtn.href = MOCK.settings.cvUrl;
    }
    var cta = document.getElementById('journeyContactBtn');
    if (cta) {
      cta.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.TxOut === 'function') window.TxOut('contact.html', 'CONTACT', '#1c1c22');
        else window.location.href = 'contact.html';
      });
    }
  }

  /* ── Topographic background (projects variant) ────────────────── */
  var bgCanvas = document.getElementById('bgCanvas');
  var bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
  var bgTime = 0, lastTs = 0, _hGrid = null, _isMobileBg = window.innerWidth < 768;
  var PEAKS = [
    [0.20, 0.40, 0.26, 0.32, 1.00],
    [0.72, 0.28, 0.28, 0.32, 1.00],
    [0.48, 0.72, 0.26, 0.24, 0.85],
    [0.05, 0.60, 0.20, 0.26, 0.75],
    [0.92, 0.55, 0.22, 0.28, 0.75],
    [0.38, 0.05, 0.24, 0.20, 0.65]
  ];

  function drawTopo(dt) {
    if (!bgCtx) return;
    bgTime += dt;
    var W = bgCanvas.width, H = bgCanvas.height;
    bgCtx.clearRect(0, 0, W, H);
    var GW = 70, GH = 50, GW1 = GW + 1;
    if (!_hGrid || _hGrid.length !== GW1 * (GH + 1)) _hGrid = new Float32Array(GW1 * (GH + 1));
    var cellW = W / GW, cellH = H / GH;
    var bs = bgTime * 0.5;
    for (var row = 0; row <= GH; row++) {
      var ny = row / GH, base = row * GW1;
      for (var col = 0; col <= GW; col++) {
        var nx = col / GW, h = 0;
        for (var p = 0; p < PEAKS.length; p++) {
          var pk = PEAKS[p];
          var dxp = 0.014 * Math.sin(bs * 0.08 + p * 2.1);
          var dyp = 0.010 * Math.cos(bs * 0.10 + p * 1.7);
          var amp = pk[4] * (1 + 0.18 * Math.sin(bs * 0.28 + p * 0.9));
          var dx = (nx - pk[0] - dxp) / pk[2];
          var dy = (ny - pk[1] - dyp) / pk[3];
          h += amp * Math.exp(-0.5 * (dx * dx + dy * dy));
        }
        _hGrid[base + col] = h;
      }
    }
    var lvMin = 0.22, lvMax = 2.58, nL = 7;
    var spacing = (lvMax - lvMin) / (nL - 1);
    var shade = Math.round(255 * (1 - bgProgress));
    bgCtx.lineCap = 'round'; bgCtx.lineJoin = 'round';
    for (var li = 0; li < nL; li++) {
      var lv = lvMin + li * spacing;
      var isIdx = (li % 3 === 0);
      bgCtx.beginPath();
      bgCtx.lineWidth = isIdx ? 1.0 : 0.5;
      bgCtx.strokeStyle = 'rgba(' + shade + ',' + shade + ',' + shade + ',' +
        (isIdx ? 0.18 + bgProgress * 0.04 : 0.09 + bgProgress * 0.03).toFixed(3) + ')';
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
            case 1: case 14: bgCtx.moveTo(xx0 + (lv - h00) / (h10 - h00) * cellW, yy0); bgCtx.lineTo(xx0, yy0 + (lv - h00) / (h01 - h00) * cellH); break;
            case 2: case 13: bgCtx.moveTo(xx0 + (lv - h00) / (h10 - h00) * cellW, yy0); bgCtx.lineTo(xx1, yy0 + (lv - h10) / (h11 - h10) * cellH); break;
            case 3: case 12: bgCtx.moveTo(xx0, yy0 + (lv - h00) / (h01 - h00) * cellH); bgCtx.lineTo(xx1, yy0 + (lv - h10) / (h11 - h10) * cellH); break;
            case 4: case 11: bgCtx.moveTo(xx1, yy0 + (lv - h10) / (h11 - h10) * cellH); bgCtx.lineTo(xx0 + (lv - h01) / (h11 - h01) * cellW, yy1); break;
            case 5: bgCtx.moveTo(xx0 + (lv - h00) / (h10 - h00) * cellW, yy0); bgCtx.lineTo(xx0, yy0 + (lv - h00) / (h01 - h00) * cellH); bgCtx.moveTo(xx1, yy0 + (lv - h10) / (h11 - h10) * cellH); bgCtx.lineTo(xx0 + (lv - h01) / (h11 - h01) * cellW, yy1); break;
            case 6: case 9: bgCtx.moveTo(xx0 + (lv - h00) / (h10 - h00) * cellW, yy0); bgCtx.lineTo(xx0 + (lv - h01) / (h11 - h01) * cellW, yy1); break;
            case 7: case 8: bgCtx.moveTo(xx0, yy0 + (lv - h00) / (h01 - h00) * cellH); bgCtx.lineTo(xx0 + (lv - h01) / (h11 - h01) * cellW, yy1); break;
            case 10: bgCtx.moveTo(xx0 + (lv - h00) / (h10 - h00) * cellW, yy0); bgCtx.lineTo(xx1, yy0 + (lv - h10) / (h11 - h10) * cellH); bgCtx.moveTo(xx0, yy0 + (lv - h00) / (h01 - h00) * cellH); bgCtx.lineTo(xx0 + (lv - h01) / (h11 - h01) * cellW, yy1); break;
          }
        }
      }
      bgCtx.stroke();
    }
  }

  /* ── Custom cursor (dot instant, ring lagging) ────────────────── */
  var ringX = -200, ringY = -200, curDot = null, curRing = null;
  function initCursor() {
    curDot = document.getElementById('cursorDot');
    curRing = document.getElementById('cursorRing');
  }

  /* ── Main loop ────────────────────────────────────────────────── */
  var maskFrame = 0;
  function loop(ts) {
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    drawTopo(dt);
    if (curRing) {
      ringX += (rawMouseX - ringX) * 0.12;
      ringY += (rawMouseY - ringY) * 0.12;
      curRing.style.left = ringX.toFixed(2) + 'px';
      curRing.style.top = ringY.toFixed(2) + 'px';
    }
    if (bgCanvas.width !== window.innerWidth || bgCanvas.height !== window.innerHeight) {
      bgCanvas.width = window.innerWidth;
      bgCanvas.height = window.innerHeight;
      _isMobileBg = window.innerWidth < 768;
    }
    if (!isTouch && !isSafari && !REDUCED && !document.hidden && FLUID_TEXT_ELS.length) {
      /* one element per frame — readPixels+toDataURL are pipeline stalls */
      maskFrame++;
      applyFluidTextMask(FLUID_TEXT_ELS[maskFrame % FLUID_TEXT_ELS.length]);
    }
    renderMagnetic();
    requestAnimationFrame(loop);
  }

  /* ── Init ─────────────────────────────────────────────────────── */
  function init() {
    journeySection = document.getElementById('journeySection');
    if (bgCanvas) { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
    initFluidText();
    initCursor();

    if (wrap) {
      wrap.addEventListener('scroll', function () {
        updateBgProgress();
      }, { passive: true });
    }
    document.addEventListener('mousemove', function (e) {
      rawMouseX = e.clientX; rawMouseY = e.clientY;
      if (curDot) { curDot.style.left = e.clientX + 'px'; curDot.style.top = e.clientY + 'px'; }
      if (isOverList && magImg) {
        var w = 360;
        var imgH = w * (10 / 16);
        if (rawMouseX > window.innerWidth * 0.6) imgTargetX = rawMouseX - (w + 32);
        else imgTargetX = rawMouseX + 32;
        imgTargetY = rawMouseY - imgH / 2;
      }
    }, { passive: true });

    if (window.contentFetch) {
      window.contentFetch('*[_type=="project" && published == true] | order(order asc)').then(function (r) { projects = r || []; renderRows(); wireRows(); }).catch(function () { projects = MOCK.projects; renderRows(); wireRows(); });
      window.contentFetch('*[_type=="projectsPage"][0]{introText,skills}').then(function (page) {
        var intro = document.querySelector('.page-intro-text');
        if (page && page.introText && intro) intro.textContent = page.introText;
        skills = (page && page.skills && page.skills.length) ? page.skills : MOCK.skills;
        renderSkills();
      }).catch(function () { skills = MOCK.skills; renderSkills(); });
      window.contentFetch('*[_type=="journeyEntry"] | order(order asc)').then(function (r) {
        journey = (r && r.length) ? r : MOCK.journey;
        renderJourney();
      }).catch(function () { journey = MOCK.journey; renderJourney(); });
      window.contentFetch('*[_type=="clientLogo"] | order(order asc)').then(function (r) {
        MOCK.logos = (r || []).map(function (c) { return c.name; });
        renderMarquee();
      }).catch(function () { renderMarquee(); });
    } else {
      projects = MOCK.projects; renderRows(); wireRows();
      skills = MOCK.skills; renderSkills();
      journey = MOCK.journey; renderJourney();
      renderMarquee();
    }
    wireCvAndCta();

    requestAnimationFrame(function (ts) { lastTs = ts; requestAnimationFrame(loop); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
