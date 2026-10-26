/* ================================================================
   PAGE TV OVERLAY — tv-overlay.js
   Grain engine, scanner-line choreography, barrel-path resize.
   ================================================================ */
(function () {
  'use strict';

  /* ── Grain: fixed 800×600 buffer, redraw every 2nd frame (~30fps) ── */
  (function initPageGrain() {
    var canvas = document.getElementById('pageGrainCanvas');
    if (!canvas || !canvas.getContext) return;
    var W = 800, H = 600;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(W, H);
    var d = img.data;
    var tick = 0;
    (function draw() {
      tick++;
      if (tick % 2 === 0) {
        for (var i = 0; i < d.length; i += 4) {
          var v = (Math.random() * 255) | 0;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      }
      requestAnimationFrame(draw);
    })();
  })();

  /* ── Scanner lines: staggered starts, random 3rd-line, group bursts ── */
  (function initScanners() {
    var wrap = document.querySelector('.page-scanner-lines');
    if (!wrap) return;
    var spans = Array.prototype.slice.call(wrap.querySelectorAll('span'));
    if (!spans.length) return;

    /* Initial staggered starts */
    spans.forEach(function (s, i) {
      s.style.animationDelay = (i * 0.25).toFixed(2) + 's';
    });

    /* Randomly show/hide the third line every 10–22s */
    (function cycleThird() {
      setTimeout(function () {
        var third = spans[2];
        if (third) third.style.display = (Math.random() > 0.45) ? '' : 'none';
        cycleThird();
      }, 10000 + Math.random() * 12000);
    })();

    /* Group burst: restart 2–3 lines together, 70ms stagger */
    (function cycleBursts() {
      setTimeout(function () {
        var count = 2 + (Math.random() < 0.5 ? 1 : 0);
        var picks = spans.slice(0, count);
        picks.forEach(function (s, i) {
          setTimeout(function () {
            s.style.animation = 'none';
            void s.offsetWidth; /* reflow */
            s.style.animation = '';
            s.style.animationDelay = (i * 0.07).toFixed(2) + 's';
          }, i * 70);
        });
        cycleBursts();
      }, 14000 + Math.random() * 16000);
    })();
  })();

  /* ── Barrel paths: recompute on resize (inline script did first paint) ── */
  function computeBarrelPaths() {
    var vv = window.visualViewport;
    var W = Math.round((vv && vv.width) || window.innerWidth);
    var H = Math.round((vv && vv.height) || window.innerHeight);
    var m = W <= 768;
    var MC = m ? 12 : 38;
    var MM = m ? 4 : 8;
    var R  = m ? Math.min(Math.max(18, W * 0.03), 28)
               : Math.min(Math.max(40, W * 0.042), 70);

    var inner =
      'M ' + (MC + R) + ',' + MC +
      ' Q ' + (W / 2) + ',' + MM + ' ' + (W - MC - R) + ',' + MC +
      ' Q ' + (W - MC) + ',' + MC + ' ' + (W - MC) + ',' + (MC + R) +
      ' Q ' + (W - MM) + ',' + (H / 2) + ' ' + (W - MC) + ',' + (H - MC - R) +
      ' Q ' + (W - MC) + ',' + (H - MC) + ' ' + (W - MC - R) + ',' + (H - MC) +
      ' Q ' + (W / 2) + ',' + (H - MM) + ' ' + (MC + R) + ',' + (H - MC) +
      ' Q ' + MC + ',' + (H - MC) + ' ' + MC + ',' + (H - MC - R) +
      ' Q ' + MM + ',' + (H / 2) + ' ' + MC + ',' + (MC + R) +
      ' Q ' + MC + ',' + MC + ' ' + (MC + R) + ',' + MC + ' Z';
    var outer = 'M 0,0 L ' + W + ',0 L ' + W + ',' + H + ' L 0,' + H + ' Z';

    var frame  = document.querySelector('.page-tv-frame');
    var bevel  = document.querySelector('.page-crt-bevel');
    var stroke = document.querySelector('.page-tv-stroke');

    if (frame) {
      frame.style.clipPath = "path(evenodd, '" + outer + ' ' + inner + "')";
      frame.style.visibility = 'visible';
    }
    if (bevel) bevel.style.clipPath = "path('" + inner + "')";
    if (stroke) {
      stroke.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      stroke.style.clipPath = "path('" + inner + "')";
      if (!stroke.querySelector('path')) {
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', 'rgba(30, 28, 26, 0.10)');
        p.setAttribute('stroke-width', '6');
        stroke.appendChild(p);
      }
      stroke.querySelector('path').setAttribute('d', inner);
    }
  }

  var raf = null;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = null; computeBarrelPaths(); });
  }
  window.addEventListener('resize', schedule);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule);
    window.visualViewport.addEventListener('scroll', schedule);
  }
})();
