/* ================================================================
   PAGE TRANSITION ENGINE — transition.js
   TxOut: 3 panels rise + giant word fills/drains → navigate (2200ms)
   TxIn:  solid block holds 400ms → slides down (750ms)
   ================================================================ */
(function () {
  'use strict';

  var COLORS = {
    '/':                '#1c1c22',
    '/projects':        '#ef4444',
    '/artworks':        '#1d4ed8',
    '/contact':         '#1c1c22',
    '/project-detail':  '#1a1614'
  };
  var LABELS = {
    '/':                'HOME',
    '/projects':        'PROJECTS',
    '/artworks':        'ARTWORKS',
    '/contact':         'CONTACT',
    '/project-detail':  'PROJECT'
  };

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Keep last mouse position warm across pages */
  document.addEventListener('mousemove', function (e) {
    try {
      sessionStorage.setItem('mx', String(e.clientX));
      sessionStorage.setItem('my', String(e.clientY));
    } catch (_) {}
  }, { passive: true });

  function setScanners(visible) {
    document.querySelectorAll('.page-scanner-lines').forEach(function (el) {
      el.style.visibility = visible ? '' : 'hidden';
    });
  }

  function hideUfo() {
    ['.ufo-cursor', '.ct-beam-cone'].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.animation = 'none';
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
      });
    });
  }

  function repeatWord(label, n) {
    var out = '';
    for (var i = 0; i < n; i++) out += '<span class="tx-word">' + label + '</span>';
    return out;
  }

  /* ── Outgoing transition ──────────────────────────────────────── */
  function TxOut(href, label, color) {
    label = label || LABELS[href] ||
      decodeURIComponent(String(href)).replace(/^[#/]/, '').replace(/\.html$/, '').toUpperCase() ||
      'LOADING';
    color = color || COLORS[href] || '#1a1614';

    try {
      sessionStorage.setItem('txText', label);
      sessionStorage.setItem('txColor', color);
    } catch (_) {}

    if (REDUCED) { window.location.href = href; return; }

    setScanners(false);
    hideUfo();

    var mobile  = window.innerWidth <= 768;
    var repeats = mobile ? 8 : 14;
    var ov = document.createElement('div');
    ov.id = 'txOverlay';
    ov.innerHTML =
      '<div class="tx-panels">' +
        '<div class="tx-panel tx-panel--l"></div>' +
        '<div class="tx-panel tx-panel--c"></div>' +
        '<div class="tx-panel tx-panel--r"></div>' +
      '</div>' +
      '<div class="tx-text">' +
        '<div class="tx-words tx-words--outline">' + repeatWord(label, repeats) + '</div>' +
        '<div class="tx-words tx-words--fill">'    + repeatWord(label, repeats) + '</div>' +
      '</div>';
    ov.querySelectorAll('.tx-panel').forEach(function (p) { p.style.background = color; });
    document.body.appendChild(ov);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { ov.classList.add('tx-in'); });
    });
    setTimeout(function () { ov.classList.add('tx-fill'); }, 480);
    setTimeout(function () { ov.classList.add('tx-drain'); }, 1410);
    setTimeout(function () { window.location.href = href; }, 2200);
  }
  window.TxOut = TxOut;

  /* ── Incoming transition ──────────────────────────────────────── */
  function TxIn() {
    var label, color;
    try { label = sessionStorage.getItem('txText'); } catch (_) {}
    try { color = sessionStorage.getItem('txColor'); } catch (_) {}

    /* Clear stale artifacts from the previous page */
    var staleOv = document.getElementById('txOverlay');
    if (staleOv) staleOv.remove();
    var initCover = document.getElementById('txInitCover');
    if (initCover) initCover.remove();

    if (!label) return;
    try {
      sessionStorage.removeItem('txText');
      sessionStorage.removeItem('txColor');
    } catch (_) {}

    if (REDUCED) { setScanners(true); return; }

    setScanners(false);
    var ov = document.createElement('div');
    ov.id = 'txOverlay';
    ov.classList.add('tx-solid');
    ov.style.background = color || '#1a1614';
    document.body.appendChild(ov);

    setTimeout(function () {
      ov.classList.add('tx-slide-down');
      setTimeout(function () {
        ov.remove();
        setScanners(true);
      }, 780);
    }, 400);
  }
  window.TxIn = TxIn;

  /* bfcache restore — clean any leftover overlays */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      var o = document.getElementById('txOverlay');
      if (o) o.remove();
      var c = document.getElementById('txInitCover');
      if (c) c.remove();
      setScanners(true);
    }
  });
})();
