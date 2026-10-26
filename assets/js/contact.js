/* ================================================================
   CONTACT PAGE ENGINE — contact.js
   Starfield, outlined titles, UFO cursor + tractor beam, form.
   ================================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DESKTOP_HOVER = window.matchMedia('(hover: hover)').matches && !REDUCED;
  var gsap = window.gsap || null;

  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ── 1. Starfield ─────────────────────────────────────────────── */
  var starsCanvas = document.getElementById('starsCanvas');
  var stars = [];

  function initStars() {
    if (!starsCanvas || REDUCED) return;
    var ctx = starsCanvas.getContext('2d');
    starsCanvas.width = window.innerWidth;
    starsCanvas.height = window.innerHeight;
    var n = Math.floor(window.innerWidth * window.innerHeight / 7000);
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * starsCanvas.width,
        y: Math.random() * starsCanvas.height,
        r: Math.random() * 0.9 + 0.2,
        phase: Math.random() * Math.PI * 2,
        spd: Math.random() * 0.012 + 0.004
      });
    }
    (function draw() {
      if (!stars.length) return;
      ctx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
      stars.forEach(function (s) {
        s.phase += s.spd;
        var a = (Math.sin(s.phase) * 0.4 + 0.5) * 0.50 + 0.04;
        ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    })();
    window.addEventListener('resize', initStars);
  }

  /* ── 2. UFO cursor ────────────────────────────────────────────── */
  var ufo = document.getElementById('ufoCursor');
  var ufoX = 0, ufoY = 0, prevX = 0;
  var beamCone = null;

  function tweenUfo() {
    /* GSAP when present; otherwise a lerp loop with identical timings */
    if (gsap) return;
    (function fall() {
      ufoX = lerp(ufoX, targetUfoX, 0.18);
      ufoY = lerp(ufoY, targetUfoY, 0.18);
      ufo.style.transform = 'translate(' + ufoX.toFixed(1) + 'px,' + ufoY.toFixed(1) + 'px) rotate(' + ufoTilt.toFixed(2) + 'deg)';
      ufoTilt = lerp(ufoTilt, 0, 0.06);
      requestAnimationFrame(fall);
    })();
  }
  var targetUfoX = -200, targetUfoY = -200, ufoTilt = 0;

  function positionCone() {
    if (!beamCone || !ufo || !emailEl) return;
    var strength = beamStrength;
    if (strength <= 0) { beamCone.style.opacity = '0'; return; }
    var ufoRect = ufo.getBoundingClientRect();
    var eRect = emailEl.getBoundingClientRect();
    var x1 = ufoRect.left + ufoRect.width / 2;
    var y1 = ufoRect.top + ufoRect.height * 0.85;
    var x2 = eRect.left + eRect.width / 2;
    var y2 = eRect.top + eRect.height / 2;
    var dist = Math.hypot(x2 - x1, y2 - y1);
    var angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI - 90;
    beamCone.style.left = (x1 - 30) + 'px';
    beamCone.style.top = y1 + 'px';
    beamCone.style.height = dist + 'px';
    beamCone.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)';
    beamCone.style.opacity = strength;
  }

  /* ── 3. Beam interaction ──────────────────────────────────────── */
  var emailEl = document.getElementById('ctEmail');
  var heroEl = document.getElementById('ctHero');
  var beamStrength = 0;

  function setupUfo() {
    if (!ufo || !DESKTOP_HOVER) return;
    beamCone = document.createElement('div');
    beamCone.className = 'ct-beam-cone';
    document.body.appendChild(beamCone);

    var isTouch = 'ontouchstart' in window;
    if (window.innerWidth >= 768 && isTouch) {
      /* tablet-touch hybrid: park the UFO above the email */
      document.addEventListener('mousemove', positionHybrid, { passive: true });
      window.addEventListener('resize', positionHybrid);
      positionHybrid();
      return;
    }

    /* hovering the email: keep the UFO glued to the cursor (just lifted higher
       so it doesn't cover the text), force the beam onto the email and show
       the pointer marker above it — reads clearly as a button */
    var emailHover = false;
    var emailWrap = document.getElementById('ctEmailWrap');
    if (emailEl) {
      emailEl.addEventListener('mouseenter', function () {
        emailHover = true;
        if (emailWrap) emailWrap.classList.add('is-hover');
      });
      emailEl.addEventListener('mouseleave', function () {
        emailHover = false;
        if (emailWrap) emailWrap.classList.remove('is-hover');
      });
    }

    document.addEventListener('mousemove', function (e) {
      var eRect = emailEl ? emailEl.getBoundingClientRect() : null;
      if (emailHover && eRect) {
        targetUfoX = e.clientX - 40;
        targetUfoY = e.clientY - 95;
        var dxh = e.clientX - prevX;
        prevX = e.clientX;
        ufoTilt = clamp(dxh * 1.4, -14, 14);
        beamStrength = 1;
        if (heroEl) heroEl.style.setProperty('--hero-glow', '1');
        emailEl.classList.add('is-beamed');
      } else {
        targetUfoX = e.clientX - 40;
        targetUfoY = e.clientY - 20 - 10;
        var dx = e.clientX - prevX;
        prevX = e.clientX;
        ufoTilt = clamp(dx * 1.4, -14, 14);
        if (eRect) {
          var ecx = eRect.left + eRect.width / 2;
          var ecy = eRect.top + eRect.height / 2;
          var dist = Math.hypot(e.clientX - ecx, e.clientY - ecy);
          var t = Math.max(0, 1 - dist / 600);
          beamStrength = Math.pow(t, 1.8);
          if (heroEl) heroEl.style.setProperty('--hero-glow', String(t));
          emailEl.classList.toggle('is-beamed', beamStrength > 0.08);
        }
      }
      if (gsap) {
        gsap.to(ufo, { x: targetUfoX, y: targetUfoY, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
        gsap.to(ufo, { rotate: ufoTilt, duration: 0.18, ease: 'power1.out', overwrite: 'auto',
          onComplete: function () {
            gsap.to(ufo, { rotate: 0, duration: 0.55, ease: 'power2.out' });
          } });
      } else {
        ufo.style.transform = 'translate(' + ufoX.toFixed(1) + 'px,' + ufoY.toFixed(1) + 'px) rotate(' + ufoTilt.toFixed(2) + 'deg)';
      }
      positionCone();
    }, { passive: true });
    tweenUfo();

    /* keep the beam glued to the UFO while it glides (mousemove alone would
       freeze the cone mid-tween, e.g. right after it parks over the email) */
    (function coneLoop() {
      positionCone();
      requestAnimationFrame(coneLoop);
    })();

    /* right column hover tint */
    var right = document.getElementById('ctRight');
    if (right && heroEl) {
      right.addEventListener('mouseenter', function () { heroEl.classList.add('is-right-hover'); });
      right.addEventListener('mouseleave', function () { heroEl.classList.remove('is-right-hover'); });
    }
  }

  function positionHybrid() {
    if (!emailEl || !ufo || !beamCone) return;
    var eRect = emailEl.getBoundingClientRect();
    ufo.style.display = 'block';
    ufo.style.transform = 'none';
    ufo.style.position = 'fixed';
    ufo.style.left = (eRect.left + eRect.width / 2 - 40) + 'px';
    ufo.style.top = Math.max(120, eRect.top - 160) + 'px';
    ufo.style.zIndex = '8000';
    beamCone.style.display = 'block';
    beamCone.style.opacity = '0.75';
    beamCone.style.zIndex = '8000';
    beamCone.style.left = (eRect.left + eRect.width / 2 - 30) + 'px';
    beamCone.style.top = (eRect.top - 130) + 'px';
    beamCone.style.height = '130px';
    beamCone.style.transform = 'none';
    emailEl.classList.add('is-beamed');
  }

  /* ── 4. Titles ────────────────────────────────────────────────── */
  function setupTitles() {
    if (!DESKTOP_HOVER || !heroEl) return;
    document.querySelectorAll('.ct-line').forEach(function (line) {
      line.addEventListener('mouseenter', function () {
        if (gsap) {
          gsap.to(line, { color: '#ffffff', duration: 0.40, ease: 'power2.out' });
          gsap.to(line, { webkitTextStrokeColor: 'rgba(255,255,255,0)', duration: 0.40, ease: 'power2.out' });
        } else {
          line.style.color = '#ffffff';
          line.style.webkitTextStrokeColor = 'rgba(255,255,255,0)';
        }
      });
      line.addEventListener('mousemove', function (e) {
        var r = line.getBoundingClientRect();
        var dyNorm = clamp(Math.abs(e.clientY - (r.top + r.height / 2)) / (r.height / 2), 0, 1);
        var scale = 1 + (1 - dyNorm) * 0.20;
        if (gsap) gsap.to(line, { scaleY: scale, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
        else line.style.transform = 'scaleY(' + scale.toFixed(3) + ')';
      });
      line.addEventListener('mouseleave', function () {
        if (gsap) {
          gsap.to(line, { color: 'transparent', duration: 0.45, ease: 'power3.out' });
          gsap.to(line, { webkitTextStrokeColor: 'rgba(255,255,255,0.20)', duration: 0.45, ease: 'power3.out' });
          gsap.to(line, { scaleY: 1, duration: 0.55, ease: 'power3.out' });
        } else {
          line.style.color = 'transparent';
          line.style.webkitTextStrokeColor = 'rgba(255,255,255,0.20)';
          line.style.transform = 'scaleY(1)';
        }
      });
    });
    /* mouse-tracked glow position */
    document.addEventListener('mousemove', function (e) {
      if (!heroEl) return;
      var r = heroEl.getBoundingClientRect();
      heroEl.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      heroEl.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  /* ── 5. Contact overlay ───────────────────────────────────────── */
  var overlay = document.getElementById('ctOverlay');
  var form = document.getElementById('ctOverlayForm');
  var submitBtn = document.getElementById('ctOverlaySubmit');
  var submitLabel = document.getElementById('ctOverlaySubmitLabel');
  var successPanel = document.getElementById('ctOverlaySuccess');
  var errorPanel = document.getElementById('ctOverlayError');
  var lastFocused = null;

  function openOverlay() {
    if (!overlay) return;
    lastFocused = document.activeElement;
    form.style.display = '';
    if (form) form.reset();
    if (submitBtn) submitBtn.disabled = false;
    if (submitLabel) submitLabel.textContent = 'Send message';
    document.querySelector('.ct-overlay-header').style.display = '';
    successPanel.hidden = true;
    errorPanel.hidden = true;
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      document.body.classList.add('ct-overlay-open');
      if (starsCanvas && gsap) gsap.to(starsCanvas, { opacity: 0, duration: 0.4 });
      setTimeout(function () {
        var first = document.getElementById('ctOName');
        if (first) first.focus();
      }, 350);
    });
  }

  function closeOverlay() {
    if (!overlay || !overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('ct-overlay-open');
    if (starsCanvas && gsap) gsap.to(starsCanvas, { opacity: 0.85, duration: 0.5 });
    else if (starsCanvas) starsCanvas.style.opacity = '0.85';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function wireOverlay() {
    if (!overlay) return;
    if (emailEl) {
      emailEl.addEventListener('click', function (e) {
        e.preventDefault();
        openOverlay();
      });
    }
    document.getElementById('ctOverlayClose').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeOverlay();
      if (e.key === 'Tab' && overlay.classList.contains('is-open')) {
        var focusables = Array.prototype.filter.call(
          overlay.querySelectorAll('a[href], button:not([disabled]), input:not([name="bot-field"]), textarea'),
          function (n) { return n.offsetParent !== null; }
        );
        if (!focusables.length) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();
      var bot = form.elements['bot-field'] ? form.elements['bot-field'].value : '';
      var emailInput = document.getElementById('ctOEmail');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        emailInput.setCustomValidity('Please enter a valid email address.');
        emailInput.reportValidity();
        emailInput.setCustomValidity('');
        return;
      }
      if (!form.checkValidity()) { form.reportValidity(); return; }
      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending\u2026';

      /* deliver via the Vercel serverless function (api/contact.js);
         fall back to the visitor's mail client if it is unavailable (local static server) */
      fetch((window.SITE_BASE || '') + 'api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, message: message, 'bot-field': bot })
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (data) {
        if (!data || data.ok !== true) throw new Error('send failed');
        form.style.display = 'none';
        document.querySelector('.ct-overlay-header').style.display = 'none';
        successPanel.hidden = false;
      }).catch(function () {
        var subject = encodeURIComponent('Portfolio message from ' + name);
        var body = encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')');
        window.location.href = 'mailto:chauhandev591@gmail.com?subject=' + subject + '&body=' + body;
        submitBtn.disabled = false;
        submitLabel.textContent = 'Send message';
        errorPanel.hidden = false;
      });
    });
  }

  /* ── 6. Footer transitions ────────────────────────────────────── */
  var LOCAL_MAP = { '/': 'index.html', '/projects': 'projects.html', '/artworks': 'artworks.html', '/contact': 'contact.html' };
  var TX_COLORS = { '/': '#1c1c22', '/projects': '#ef4444', '/artworks': '#1d4ed8', '/contact': '#1c1c22' };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-nav-link]');
    if (!a) return;
    e.preventDefault();
    var clean = a.getAttribute('data-nav-link');
    var label = (a.textContent || '').replace(/\s*↗\uFE0E?\s*$/, '').trim().toUpperCase();
    var target = (window.SITE_BASE || '') + (LOCAL_MAP[clean] || clean);
    if (typeof window.TxOut === 'function') window.TxOut(target, label, TX_COLORS[clean] || '#1a1614');
    else window.location.href = target;
  });

  /* ── Init ─────────────────────────────────────────────────────── */
  function init() {
    if (typeof window.TxIn === 'function') window.TxIn();
    initStars();
    setupUfo();
    setupTitles();
    wireOverlay();
    if (window.contentFetch) {
      window.contentFetch('*[_type=="globalSettings"][0]{email}').then(function (s) {
        if (s && s.email && emailEl) {
          emailEl.textContent = s.email;
        }
      }).catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
