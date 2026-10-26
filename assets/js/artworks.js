/* ================================================================
   ARTWORKS PAGE ENGINE — artworks.js
   Blueprint canvas scene, marquee/static grid, lightbox.
   ================================================================ */
(function () {
  'use strict';

  var NUM_COLS = 4;
  var COL_SPEEDS = [22, 34, 18, 28]; /* seconds per column */
  var isDesktop = window.matchMedia('(min-width: 1201px)');

  var artworks = [];
  var bgCanvas = document.getElementById('bgCanvas');
  var bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
  var lbBgCanvas = document.getElementById('lightboxBgCanvas');
  var lbBgCtx = lbBgCanvas ? lbBgCanvas.getContext('2d') : null;
  var grid = document.getElementById('artworksGrid');
  var wrapEl0 = document.querySelector('.artworks-wrap');
  var lightbox = document.getElementById('lightbox');
  var currentIdx = 0, currentImgIdx = 0, lastFocused = null;

  /* ── Canvas scene ─────────────────────────────────────────────── */
  var ANGLES = [0, 30, 45, 60, 90, 120, 150].map(function (d) { return d * Math.PI / 180; });
  var lines = [], arcs = [], ripples = [];
  var heroArc = { sweep: 0.05, growing: true };
  var scanner = { y: -40, pause: 100 };
  var mouseRX = -200, mouseRY = -200, ringX = -200, ringY = -200;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function spawnLine() {
    lines.push({
      x: rnd(0, window.innerWidth), y: rnd(0, window.innerHeight),
      angle: ANGLES[Math.floor(Math.random() * ANGLES.length)],
      len: 0, maxLen: rnd(140, 460), speed: rnd(0.5, 1.2),
      alpha: 0, hold: Math.floor(rnd(70, 190)), state: 'in'
    });
  }
  function spawnArc() {
    arcs.push({
      x: rnd(0, window.innerWidth), y: rnd(0, window.innerHeight),
      r: rnd(40, 160), a0: rnd(0, Math.PI * 2),
      sweep: 0.01, maxSweep: Math.PI * rnd(0.45, 1.75),
      speed: rnd(0.007, 0.015),
      alpha: 0, hold: Math.floor(rnd(90, 210)), state: 'in'
    });
  }
  function addRipple(x, y) {
    ripples.push({ x: x, y: y, r: 0, maxR: rnd(55, 90), alpha: 0.32 });
    ripples.push({ x: x, y: y, r: 10, maxR: rnd(82, 112), alpha: 0.12 });
  }

  function resizeBg() {
    if (bgCanvas) { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
    if (lbBgCanvas) { lbBgCanvas.width = window.innerWidth; lbBgCanvas.height = window.innerHeight; }
  }

  function drawScene(ctx, withScanner) {
    var W = window.innerWidth, H = window.innerHeight;
    ctx.clearRect(0, 0, W, H);

    /* construction lines */
    lines.forEach(function (l, idx) {
      if (l.state === 'in') {
        l.alpha = Math.min(0.42, l.alpha + 0.005);
        l.len = Math.min(l.maxLen, l.len + l.speed);
        if (l.alpha >= 0.42 && l.len >= l.maxLen) l.state = 'hold';
      } else if (l.state === 'hold') {
        if (--l.hold <= 0) l.state = 'out';
      } else {
        l.alpha -= 0.004;
        if (l.alpha <= 0) { lines.splice(idx, 1); return; }
      }
      var dx = Math.cos(l.angle), dy = Math.sin(l.angle);
      ctx.strokeStyle = 'rgba(255,255,255,' + l.alpha.toFixed(3) + ')';
      ctx.lineWidth = 1; ctx.lineCap = 'round';
      ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(255,255,255,' + (l.alpha * 0.9).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x + dx * l.len, l.y + dy * l.len);
      ctx.stroke();
      if (l.state === 'hold') {
        var hx = l.x + dx * l.len, hy = l.y + dy * l.len;
        ctx.beginPath();
        ctx.moveTo(hx - dy * 3.5, hy + dx * 3.5);
        ctx.lineTo(hx + dy * 3.5, hy - dx * 3.5);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    });

    /* compass arcs */
    arcs.forEach(function (a, idx) {
      if (a.state === 'in') {
        a.alpha = Math.min(0.38, a.alpha + 0.005);
        a.sweep = Math.min(a.maxSweep, a.sweep + a.speed);
        if (a.alpha >= 0.38 && a.sweep >= a.maxSweep) a.state = 'hold';
      } else if (a.state === 'hold') {
        if (--a.hold <= 0) a.state = 'out';
      } else {
        a.alpha -= 0.003;
        if (a.alpha <= 0) { arcs.splice(idx, 1); return; }
      }
      ctx.strokeStyle = 'rgba(255,255,255,' + a.alpha.toFixed(3) + ')';
      ctx.lineWidth = 0.9;
      ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, a.a0, a.a0 + a.sweep);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.55, a.alpha * 2.5).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(a.x, a.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    /* hero arc */
    if (heroArc.growing) {
      heroArc.sweep += 0.0010;
      if (heroArc.sweep >= 0.90) heroArc.growing = false;
    } else {
      heroArc.sweep -= 0.00065;
      if (heroArc.sweep <= 0.05) heroArc.growing = true;
    }
    var hcx = -W * 0.08, hcy = H * 0.44, r1 = W * 0.74, r2 = W * 0.82, base = -0.32;
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 0.6;
    ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(hcx, hcy, r2, base, base + heroArc.sweep); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 1.5;
    ctx.shadowBlur = 22; ctx.shadowColor = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(hcx, hcy, r1, base, base + heroArc.sweep); ctx.stroke();
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.moveTo(hcx, hcy);
    ctx.lineTo(hcx + Math.cos(base) * r1, hcy + Math.sin(base) * r1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(hcx, hcy);
    ctx.lineTo(hcx + Math.cos(base + heroArc.sweep) * r1, hcy + Math.sin(base + heroArc.sweep) * r1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(hcx, hcy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    /* scanner */
    if (withScanner) {
      if (scanner.pause > 0) scanner.pause--;
      else {
        scanner.y += H / 480;
        if (scanner.y > H + 40) { scanner.y = -40; scanner.pause = 150; }
        var grad = ctx.createLinearGradient(0, scanner.y - 50, 0, scanner.y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(255,255,255,0.055)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanner.y - 50, W, 50);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2;
        ctx.shadowBlur = 22; ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.moveTo(0, scanner.y); ctx.lineTo(W, scanner.y); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    /* ripples */
    ripples.forEach(function (rp, idx) {
      rp.r += 2.2; rp.alpha -= 0.008;
      if (rp.alpha <= 0 || rp.r > rp.maxR) { ripples.splice(idx, 1); return; }
      ctx.strokeStyle = 'rgba(255,255,255,' + rp.alpha.toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    });

    /* keep population up */
    while (lines.length < 10) spawnLine();
    while (arcs.length < 6) spawnArc();
  }

  function frame() {
    if (bgCtx) drawScene(bgCtx, true);
    if (lbBgCtx && lightbox.classList.contains('is-open')) drawScene(lbBgCtx, false);
    /* cursor ring */
    ringX += (mouseRX - ringX) * 0.12;
    ringY += (mouseRY - ringY) * 0.12;
    var dot = document.getElementById('cursorDot');
    var ring = document.getElementById('cursorRing');
    if (ring) { ring.style.left = ringX.toFixed(2) + 'px'; ring.style.top = ringY.toFixed(2) + 'px'; }
    requestAnimationFrame(frame);
  }

  document.addEventListener('mousemove', function (e) {
    mouseRX = e.clientX; mouseRY = e.clientY;
    var dot = document.getElementById('cursorDot');
    if (dot) { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }
    try {
      sessionStorage.setItem('mx', String(e.clientX));
      sessionStorage.setItem('my', String(e.clientY));
    } catch (_) {}
  }, { passive: true });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.artwork-card, .lightbox, .lb-nav, .lightbox-close')) return;
    addRipple(e.clientX, e.clientY);
  });

  /* ── Data ─────────────────────────────────────────────────────── */
  function getImages(art) {
    return (art.images || []).filter(Boolean);
  }

  /* ── Grid ─────────────────────────────────────────────────────── */
  function makeCard(art, idx) {
    var card = document.createElement('div');
    card.className = 'artwork-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.dataset.idx = idx;
    var refNum = String(idx + 1).padStart(3, '0');
    var img = getImages(art)[0] || '';
    var buyable = art.buyUrl && art.buyUrl !== '#' && art.buyUrl !== null;
    card.innerHTML =
      '<div class="artwork-img-wrap">' +
        '<img class="artwork-img" src="' + img + '" alt="' + (art.title || 'Artwork') + '" loading="lazy" draggable="false">' +
        '<div class="artwork-hover-overlay">' +
          '<span class="ahov-title">' + (art.title || '') + '</span>' +
          '<span class="ahov-meta">REF.' + refNum + (art.medium ? ' · ' + art.medium : '') + '</span>' +
          '<span class="ahov-view">VIEW</span>' +
        '</div>' +
        (buyable ? '<span class="artwork-status-badge">AVAILABLE</span>' : '') +
        '<div class="artwork-corners">' +
          '<span class="corner tl"></span><span class="corner tr"></span>' +
          '<span class="corner bl"></span><span class="corner br"></span>' +
        '</div>' +
      '</div>' +
      '<div class="artwork-meta"><span class="artwork-ref">REF.' + refNum + '</span></div>';
    card.addEventListener('click', function () {
      var r = card.getBoundingClientRect();
      addRipple(r.left + r.width / 2, r.top + r.height / 2);
      openLightbox(idx);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(idx); }
    });
    card.addEventListener('contextmenu', function (e) { e.preventDefault(); card.blur(); });
    return card;
  }

  function renderGrid() {
    if (!grid) return;
    grid.innerHTML = '';
    if (isDesktop.matches) {
      grid.classList.remove('is-static');
      var cols = [];
      for (var c = 0; c < NUM_COLS; c++) {
        var col = document.createElement('div');
        col.className = 'marquee-col';
        var track = document.createElement('div');
        track.className = 'marquee-col-track';
        track.style.setProperty('--col-dur', COL_SPEEDS[c] + 's');
        col.appendChild(track);
        grid.appendChild(col);
        cols.push(track);
      }
      artworks.forEach(function (art, i) {
        cols[i % NUM_COLS].appendChild(makeCard(art, i));
      });
      /* duplicate each column's set for a seamless -50% loop */
      cols.forEach(function (track) {
        var base = Array.prototype.slice.call(track.children);
        while (base.length && base.length < 3) {
          base.forEach(function (el) { track.appendChild(el.cloneNode(true)); });
          base = Array.prototype.slice.call(track.children);
        }
        base.forEach(function (el) {
          var clone = el.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          track.appendChild(clone);
        });
      });
    } else {
      grid.classList.add('is-static');
      artworks.forEach(function (art, i) { grid.appendChild(makeCard(art, i)); });
      var header = document.querySelector('.artworks-header');
      if (header) grid.style.paddingTop = (header.offsetHeight + 24) + 'px';
    }
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderGrid, 150);
  });

  /* ── Lightbox ─────────────────────────────────────────────────── */
  function lightboxEls() {
    return {
      img: document.getElementById('lightboxImg'),
      wrap: document.getElementById('lightboxImgWrap'),
      title: document.getElementById('lightboxTitle'),
      ref: document.getElementById('lightboxRef'),
      medium: document.getElementById('lightboxMedium'),
      dims: document.getElementById('lightboxDimensions'),
      buy: document.getElementById('lightboxBuy'),
      counter: document.getElementById('lbImgCounter'),
      dots: document.getElementById('lbImgDots'),
      prev: document.getElementById('lbPrev'),
      next: document.getElementById('lbNext'),
      close: document.getElementById('lightboxClose'),
      announcer: document.getElementById('srAnnouncer')
    };
  }

  function updateImgUI() {
    var el = lightboxEls();
    var art = artworks[currentIdx];
    var imgs = getImages(art);
    var img = imgs[currentImgIdx] || imgs[0] || '';
    el.img.src = img;
    el.img.alt = art.title || 'Artwork';
    el.wrap.classList.toggle('is-multi', imgs.length > 1);
    if (imgs.length > 1) {
      el.counter.style.display = '';
      el.counter.textContent = (currentImgIdx + 1) + ' / ' + imgs.length;
      el.dots.innerHTML = '';
      imgs.forEach(function (_, i) {
        var dot = document.createElement('button');
        dot.className = 'lb-dot' + (i === currentImgIdx ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Image ' + (i + 1));
        dot.addEventListener('click', function (e) {
          e.stopPropagation();
          currentImgIdx = i;
          updateImgUI();
        });
        el.dots.appendChild(dot);
      });
    } else {
      el.counter.style.display = 'none';
      el.dots.innerHTML = '';
    }
  }

  function fillLightbox() {
    var el = lightboxEls();
    var art = artworks[currentIdx];
    var total = artworks.length;
    currentImgIdx = 0;
    var refNum = String(currentIdx + 1).padStart(3, '0');
    el.title.textContent = art.title || '';
    el.ref.textContent = 'REF.' + refNum + ' · ' + (currentIdx + 1) + ' of ' + total;
    var mediumBits = [art.medium, art.year].filter(Boolean).join(' · ');
    el.medium.textContent = mediumBits;
    el.medium.style.display = mediumBits ? '' : 'none';
    el.dims.textContent = art.dimensions || '';
    el.dims.style.display = art.dimensions ? '' : 'none';
    var buyable = art.buyUrl && art.buyUrl !== '#';
    if (buyable) {
      var href = art.buyUrl;
      try { var u = new URL(art.buyUrl, window.location.href); href = u.href; } catch (_) {}
      el.buy.href = href;
      el.buy.target = '_blank';
      el.buy.rel = 'noopener noreferrer';
      el.buy.style.display = '';
      el.buy.querySelector('span').textContent =
        'BUY ORIGINAL' + (art.price ? ' - $' + art.price : '');
    } else {
      el.buy.style.display = 'none';
    }
    el.prev.classList.toggle('is-hidden', currentIdx === 0);
    el.next.classList.toggle('is-hidden', currentIdx === total - 1);
    updateImgUI();
    if (el.announcer) {
      el.announcer.textContent = 'Artwork ' + (currentIdx + 1) + ' of ' + total + ': ' + (art.title || '');
    }
  }

  function openLightbox(idx) {
    currentIdx = Math.max(0, Math.min(idx, artworks.length - 1));
    lastFocused = document.activeElement;
    fillLightbox();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-open');
    lightbox.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-open');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    if (document.getElementById('srAnnouncer')) {
      document.getElementById('srAnnouncer').textContent = 'Lightbox closed';
    }
  }

  function navigateLightbox(delta) {
    var next = currentIdx + delta;
    if (next < 0 || next >= artworks.length) return;
    currentIdx = next;
    fillLightbox();
  }

  function wireLightbox() {
    var el = lightboxEls();
    el.close.addEventListener('click', closeLightbox);
    el.prev.addEventListener('click', function (e) { e.stopPropagation(); navigateLightbox(-1); });
    el.next.addEventListener('click', function (e) { e.stopPropagation(); navigateLightbox(1); });
    el.wrap.addEventListener('click', function () {
      var imgs = getImages(artworks[currentIdx]);
      if (imgs.length > 1) {
        currentImgIdx = (currentImgIdx + 1) % imgs.length;
        updateImgUI();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      else if (e.key === 'ArrowRight') navigateLightbox(1);
      else if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'Tab') {
        var focusables = Array.prototype.filter.call(
          lightbox.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'),
          function (n) { return n.offsetParent !== null || n === el.close; }
        );
        if (!focusables.length) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    /* swipe: changes image within artwork */
    var touchOrigin = null;
    el.wrap.addEventListener('touchstart', function (e) {
      touchOrigin = { x: e.touches[0].clientX };
    }, { passive: true });
    el.wrap.addEventListener('touchend', function (e) {
      if (!touchOrigin) return;
      var dx = e.changedTouches[0].clientX - touchOrigin.x;
      var imgs = getImages(artworks[currentIdx]);
      if (Math.abs(dx) > 40 && imgs.length > 1) {
        currentImgIdx = (currentImgIdx + (dx < 0 ? 1 : imgs.length - 1)) % imgs.length;
        updateImgUI();
      }
      touchOrigin = null;
    }, { passive: true });
  }

  /* ── Init ─────────────────────────────────────────────────────── */
  function init() {
    resizeBg();
    window.addEventListener('resize', resizeBg);
    for (var i = 0; i < 10; i++) spawnLine();
    for (var j = 0; j < 6; j++) spawnArc();
    requestAnimationFrame(frame);

    /* footer staggered reveal */
    var footerEls = document.querySelectorAll('.footer-anim');
    if (footerEls.length && wrapEl0) {
      footerEls.forEach(function (el, i) {
        el.style.transitionDelay = (i * 0.09).toFixed(2) + 's';
      });
      var fObs = new IntersectionObserver(function (recs) {
        recs.forEach(function (rec) {
          if (rec.isIntersecting) {
            rec.target.classList.add('is-visible');
            fObs.unobserve(rec.target);
          }
        });
      }, { root: wrapEl0, threshold: 0.1 });
      footerEls.forEach(function (el) { fObs.observe(el); });
    }

    if (window.contentFetch) {
      window.contentFetch('*[_type=="artwork"] | order(order desc)')
        .then(function (r) {
          artworks = (r && r.length) ? r : fallbackArtworks();
          renderGrid();
        })
        .catch(function () { artworks = fallbackArtworks(); renderGrid(); });
    } else {
      artworks = fallbackArtworks();
      renderGrid();
    }
    wireLightbox();
  }

  function fallbackArtworks() {
    var out = [];
    for (var i = 1; i <= 8; i++) {
      out.push({
        title: 'Placeholder ' + i,
        medium: 'Digital Illustration',
        dimensions: i % 2 ? '35 × 50 cm' : '35 × 35 cm',
        images: ['assets/images/artworks/art-' + i + '.jpg'],
        buyUrl: null
      });
    }
    return out;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
