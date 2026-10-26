/* ================================================================
   GLOBAL NAV — nav.js
   Builds the floating nav bar per page, cycles the center icons,
   handles mobile menu, wires all internal links to TxOut.
   ================================================================ */
(function () {
  'use strict';

  /* ── Page transition map ──────────────────────────────────────── */
  var TX_COLORS = {
    '/':                '#1c1c22',
    '/projects':        '#ef4444',
    '/artworks':        '#1d4ed8',
    '/contact':         '#1c1c22',
    '/project-detail':  '#1a1614'
  };
  var TX_LABELS = {
    '/':                'HOME',
    '/projects':        'PROJECTS',
    '/artworks':        'ARTWORKS',
    '/contact':         'CONTACT',
    '/project-detail':  'PROJECT'
  };

  function navigate(href) {
    var color = TX_COLORS[href] || '#1a1614';
    var label = TX_LABELS[href] ||
      decodeURIComponent(String(href)).replace(/^[#/]/, '').replace(/\.html$/, '').toUpperCase();
    if (typeof window.TxOut === 'function') window.TxOut(href, label, color);
    else window.location.href = href;
  }

  /* Map clean URLs to local files (site-root aware) */
  function hrefFor(clean) {
    var base = window.SITE_BASE || '';
    var map = {
      '/':          base + 'index.html',
      '/projects':  base + 'projects.html',
      '/artworks':  base + 'artworks.html',
      '/contact':   base + 'contact.html'
    };
    if (map[clean]) return map[clean];
    var m = clean.match(/^\/projects\/([a-z0-9-]+)$/);
    if (m) return base + 'projects/' + m[1] + '.html';
    return clean;
  }
  /* TxOut must navigate to the local file, not the clean URL */
  function navigateTo(clean) {
    var color = TX_COLORS[clean] || '#1a1614';
    var label = TX_LABELS[clean] || clean.replace(/^[#/]/, '').toUpperCase();
    var target = hrefFor(clean);
    if (typeof window.TxOut === 'function') window.TxOut(target, label, color);
    else window.location.href = target;
  }

  /* ── Icon library (original 24×24 stroke glyphs) ──────────────── */
  var ICONS = {
    eye:           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2.6-4.2 6-6.3 10-6.3S19.4 7.8 22 12c-2.6 4.2-6 6.3-10 6.3S4.6 16.2 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>',
    diamond:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12,3 21,12 12,21 3,12"/></svg>',
    triangle:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12,4 21,20 3,20"/></svg>',
    hexagon:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12,2.5 20.5,7.25 20.5,16.75 12,21.5 3.5,16.75 3.5,7.25"/></svg>',
    grid:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="2.5" x2="9" y2="21.5"/><line x1="15" y1="2.5" x2="15" y2="21.5"/><line x1="2.5" y1="9" x2="21.5" y2="9"/><line x1="2.5" y1="15" x2="21.5" y2="15"/></svg>',
    compass:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><polygon points="15.5,8.5 13.8,13.8 8.5,15.5 10.2,10.2"/></svg>',
    frame:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1.5"/><rect x="7.5" y="7.5" width="9" height="9" rx="1"/></svg>',
    circle:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/></svg>',
    moon:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a7 7 0 0 0 10 10z"/></svg>',
    cross:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
    wave:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12c1.8-4 3.7-4 5.5 0s3.7 4 5.5 0 3.7-4 5.5 0 2 2 3.5 1"/></svg>',
    spiral:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 12c0-1.8 2.5-2 3.5-.5 1.3 2-.3 5-3.5 5-4 0-6-3.5-5.5-7C7 5.5 10.5 3.5 14 4c4 .7 6.5 4 6 8"/></svg>',
    ufo:           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 12.5C8 9.5 10 8 12 8s4 1.5 4.5 4.5"/><ellipse cx="12" cy="14" rx="9" ry="3.4"/><ellipse cx="12" cy="9.5" rx="2.6" ry="1.8"/><line x1="5.5" y1="17" x2="4" y2="19.5"/><line x1="12" y1="17.8" x2="12" y2="20.5"/><line x1="18.5" y1="17" x2="20" y2="19.5"/></svg>',
    alien:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4.4 0 7.5 3.2 7.5 7.2 0 4.6-3.6 10.3-7.5 10.3S4.5 14.8 4.5 10.2C4.5 6.2 7.6 3 12 3z"/><ellipse cx="9.3" cy="10" rx="1.7" ry="2.3"/><ellipse cx="14.7" cy="10" rx="1.7" ry="2.3"/><path d="M9.5 15.5c1.6 1.4 3.4 1.4 5 0"/></svg>',
    planet:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M3.5 15.5c-1.2-1-1.7-2-1.2-2.9.9-1.6 5.3-1.6 10.4.2s8.7 4.5 7.9 6.1c-.5.9-2 .9-3.9.4"/></svg>',
    signal:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 13c1.5-4.5 4-7 7-7s5.5 2.5 7 7"/><path d="M7.5 14c1-3 2.6-4.5 4.5-4.5s3.5 1.5 4.5 4.5"/><circle cx="12" cy="16.5" r="1.4" fill="currentColor" stroke="none"/></svg>',
    constellation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="7" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none"/><circle cx="7" cy="19" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="18" r="1.4" fill="currentColor" stroke="none"/><path d="M5 5l14 2-7 6-5 6 11-1"/></svg>'
  };

  /* ── Icon pools per page ──────────────────────────────────────── */
  var POOLS = {
    index:    ['eye', 'diamond', 'circle', 'hexagon', 'compass', 'spiral', 'frame', 'moon'],
    projects: ['diamond', 'grid', 'frame', 'hexagon', 'compass', 'triangle', 'cross', 'wave'],
    artworks: ['eye', 'frame', 'circle', 'moon', 'spiral', 'wave', 'constellation', 'diamond'],
    detail:   ['frame', 'triangle', 'hexagon', 'cross', 'circle', 'compass', 'grid', 'diamond'],
    contact:  ['ufo', 'alien', 'planet', 'signal', 'constellation', 'moon', 'ufo', 'alien']
  };

  /* ── Detect current page ──────────────────────────────────────── */
  function getPageKey() {
    var cl = document.body.classList;
    if (cl.contains('page-uxui'))     return 'projects';
    if (cl.contains('page-artworks')) return 'artworks';
    if (cl.contains('page-detail'))   return 'detail';
    if (cl.contains('page-contact'))  return 'contact';
    return 'index';
  }

  /* ── Build nav ────────────────────────────────────────────────── */
  function buildNav() {
    var pageKey = getPageKey();
    var pool    = POOLS[pageKey];
    var active  = { projects: 'projects', artworks: 'artworks', detail: '', contact: 'contact' }[pageKey] || '';

    var leftHTML;
    if (pageKey === 'projects' || pageKey === 'artworks') {
      leftHTML = '<a href="index.html" class="nav-left-text" data-nav-home>HOME</a>';
    } else if (pageKey === 'detail') {
      leftHTML = '<a href="projects.html" class="nav-left-text" data-nav-back="/projects">\u2190 BACK TO THE PROJECTS</a>';
    } else if (pageKey === 'contact') {
      leftHTML = '<a href="index.html" class="nav-left-text" data-nav-home>I WANT TO BELIEVE</a>';
    } else {
      leftHTML = '<span class="nav-left-text" id="navIndexLabel">DEV</span>';
    }

    function lc(name) { return 'nav-link' + (active === name ? ' is-active' : ''); }

    var iconsHTML = (pageKey === 'detail' || pageKey === 'index') ? '' :
      pool.slice(0, 3).map(function (k) {
        return '<span class="nav-icon">' + ICONS[k] + '</span>';
      }).join('');

    var burgerHTML = pageKey !== 'index'
      ? '<button class="nav-burger" id="navBurger" aria-label="Open menu"><span></span><span></span><span></span></button>'
      : '';

    var nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.setAttribute('aria-label', 'Site navigation');
    nav.innerHTML =
      '<div class="nav-left">' + leftHTML + '</div>' +
      (pageKey !== 'detail' && pageKey !== 'index'
        ? '<div class="nav-icons" id="navIcons">' + iconsHTML + '</div>' : '') +
      '<div class="nav-links">' +
        '<a href="projects.html" class="' + lc('projects') + '" data-nav-link="/projects">Projects</a>' +
        '<a href="artworks.html" class="' + lc('artworks') + '" data-nav-link="/artworks">Artworks</a>' +
        '<a href="contact.html" class="' + lc('contact') + '" data-nav-link="/contact">Contact</a>' +
      '</div>' +
      burgerHTML;
    return nav;
  }

  /* ── Wire nav links ───────────────────────────────────────────── */
  function wireLinks(nav) {
    nav.querySelectorAll('[data-nav-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        navigateTo(a.getAttribute('data-nav-link'));
      });
    });
    nav.querySelectorAll('[data-nav-home]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        navigateTo('/');
      });
    });
    nav.querySelectorAll('[data-nav-back]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var href = hrefFor(a.getAttribute('data-nav-back'));
        var cover = document.createElement('div');
        cover.style.cssText =
          'position:fixed;inset:0;z-index:9900;background:#1a1614;' +
          'opacity:0;transition:opacity 220ms ease;pointer-events:none;';
        document.body.appendChild(cover);
        void cover.offsetHeight;
        cover.style.opacity = '1';
        setTimeout(function () { window.location.href = href; }, 260);
      });
    });
  }

  /* ── Index label: EVREN ↔ GALEKTO by mouse half ───────────────── */
  function initIndexLabel() {
    var label = document.getElementById('navIndexLabel');
    if (!label) return;
    var current = 'DEV';
    document.addEventListener('mousemove', function (e) {
      var next = e.clientX < window.innerWidth / 2 ? 'DEV' : 'CHAUHAN';
      if (next !== current) { current = next; label.textContent = next; }
    }, { passive: true });
  }

  /* ── Scroll-reactive background ───────────────────────────────── */
  function initScrollReactive(nav, scrollEl) {
    var target = (scrollEl === window) ? window : scrollEl;
    target.addEventListener('scroll', function () {
      var sy = (scrollEl === window)
        ? (window.scrollY || window.pageYOffset)
        : scrollEl.scrollTop;
      nav.classList.toggle('is-scrolled', sy > 50);
    }, { passive: true });
  }

  /* ── Sequential icon cycling ──────────────────────────────────── */
  function initIconCycle(nav, pool, scrollEl) {
    var container = nav.querySelector('#navIcons');
    var offset = 0, busy = false;
    var OUT_MS = 150, IN_MS = 200, STAGGER = 100;

    function cycleIcons(dir) {
      if (busy || !container) return;
      busy = true;
      var iconEls = Array.prototype.slice.call(container.querySelectorAll('.nav-icon'));
      var nextOffset = (offset + dir + pool.length) % pool.length;
      var nextKeys = [
        pool[(nextOffset + pool.length) % pool.length],
        pool[(nextOffset + 1) % pool.length],
        pool[(nextOffset + 2) % pool.length]
      ];
      iconEls.forEach(function (el, i) {
        setTimeout(function () {
          el.classList.add('is-out');
          setTimeout(function () {
            el.classList.remove('is-out');
            el.innerHTML = ICONS[nextKeys[i]];
            el.classList.add('is-in');
            setTimeout(function () { el.classList.remove('is-in'); }, IN_MS);
          }, OUT_MS);
        }, i * STAGGER);
      });
      setTimeout(function () {
        offset = nextOffset;
        busy = false;
      }, iconEls.length * STAGGER + OUT_MS + IN_MS + 50);
    }

    /* Scroll trigger (≥90px steps) */
    var lastSY = null;
    (scrollEl === window ? window : scrollEl).addEventListener('scroll', function () {
      var sy = (scrollEl === window) ? (window.scrollY || window.pageYOffset) : scrollEl.scrollTop;
      if (lastSY === null) { lastSY = sy; return; }
      var delta = sy - lastSY;
      if (Math.abs(delta) >= 90) { cycleIcons(delta > 0 ? 1 : -1); lastSY = sy; }
    }, { passive: true });

    /* Mouse-move trigger (≥80px accumulated travel) */
    var accum = 0;
    document.addEventListener('mousemove', function (e) {
      accum += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) * 0.4;
      if (accum >= 80) {
        cycleIcons((e.movementX || 0) >= 0 ? 1 : -1);
        accum = 0;
      }
    }, { passive: true });

    /* Idle auto-cycle on static pages */
    var pageKey = getPageKey();
    if (pageKey === 'index' || pageKey === 'contact') {
      setInterval(function () { cycleIcons(1); }, 2800);
    }
  }

  /* ── Mobile menu overlay ──────────────────────────────────────── */
  function buildMobileMenu(pageKey) {
    var activeMap = { projects: 'projects', artworks: 'artworks', detail: '', contact: 'contact' };
    var active = activeMap[pageKey] || '';
    function ml(name, href, label) {
      return '<a href="' + href + '" class="mob-menu-link' + (active === name ? ' is-active' : '') +
        '" data-mob-link="' + href + '" data-text="' + label + '" tabindex="-1">' + label + '</a>';
    }
    var overlay = document.createElement('div');
    overlay.className = 'mob-menu';
    overlay.id = 'mobMenu';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Navigation menu');
    overlay.innerHTML =
      '<button class="mob-menu-close" id="mobMenuClose" aria-label="Close menu" tabindex="-1">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
      '<nav class="mob-menu-links">' +
        ml('', 'index.html', 'HOME') +
        ml('projects', 'projects.html', 'PROJECTS') +
        ml('artworks', 'artworks.html', 'ARTWORKS') +
        ml('contact', 'contact.html', 'CONTACT') +
      '</nav>' +
      '<div class="mob-menu-social">' +
        '<a href="https://github.com/DevChauhan-13" class="mob-menu-social-link" tabindex="-1" target="_blank" rel="noopener noreferrer">GitHub</a>' +
        '<a href="https://www.linkedin.com/in/dev-chauhan-b479a1201" class="mob-menu-social-link" tabindex="-1" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
        '<a href="https://www.instagram.com/devchauhan_53/" class="mob-menu-social-link" tabindex="-1" target="_blank" rel="noopener noreferrer">Instagram</a>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function typewriterLinks(overlay) {
    overlay.querySelectorAll('.mob-menu-link').forEach(function (link, i) {
      var fullText = link.getAttribute('data-text') || link.textContent;
      link.textContent = '';
      setTimeout(function () {
        var j = 0;
        var iv = setInterval(function () {
          link.textContent = fullText.slice(0, j + 1);
          j++;
          if (j >= fullText.length) clearInterval(iv);
        }, 48);
      }, i * 190);
    });
  }

  function initMobileMenu(nav, pageKey) {
    var overlay  = buildMobileMenu(pageKey);
    var burger   = nav.querySelector('#navBurger');
    var closeBtn = overlay.querySelector('#mobMenuClose');

    function focusable() {
      return overlay.querySelectorAll('button, a, [tabindex]');
    }
    function openMenu() {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('mob-menu-open');
      focusable().forEach(function (el) { el.setAttribute('tabindex', '0'); });
      typewriterLinks(overlay);
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 50);
    }
    function closeMenu() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('mob-menu-open');
      focusable().forEach(function (el) { el.setAttribute('tabindex', '-1'); });
      overlay.querySelectorAll('.mob-menu-link').forEach(function (link) {
        link.textContent = link.getAttribute('data-text') || link.textContent;
      });
      if (burger) burger.focus();
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeMenu();
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !overlay.classList.contains('is-open')) return;
      var focusables = Array.prototype.filter.call(
        overlay.querySelectorAll('button, a'),
        function (el) { return el.getAttribute('tabindex') !== '-1'; }
      );
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    if (burger) burger.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    overlay.querySelectorAll('[data-mob-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        document.body.classList.remove('mob-menu-open');
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        focusable().forEach(function (el) { el.setAttribute('tabindex', '-1'); });
        setTimeout(function () {
          var clean = a.getAttribute('data-mob-link');
          navigateTo(clean === 'index.html' ? '/' : clean.replace('.html', ''));
        }, 300);
      });
    });
  }

  /* ── Init ─────────────────────────────────────────────────────── */
  function init() {
    /* Arrival transition: consume txText/txColor and slide the cover away.
       (Phase 0 bootstrap — page modules own this call in later phases.) */
    if (typeof window.TxIn === 'function') window.TxIn();

    var nav = buildNav();
    var pageKey = getPageKey();
    document.body.insertBefore(nav, document.body.firstChild);
    wireLinks(nav);

    var scrollEl;
    if (pageKey === 'projects')  scrollEl = document.querySelector('.projects-wrap') || window;
    else if (pageKey === 'artworks') scrollEl = document.querySelector('.artworks-wrap') || window;
    else scrollEl = window;

    initScrollReactive(nav, scrollEl);
    initIconCycle(nav, POOLS[pageKey], scrollEl);
    if (pageKey === 'index') initIndexLabel();
    if (pageKey !== 'index') initMobileMenu(nav, pageKey);
  }

  /* Document-level delegation for footer / off-nav links */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-nav-link]');
    if (!a || a.closest('.site-nav')) return;
    e.preventDefault();
    navigateTo(a.getAttribute('data-nav-link'));
  });

  /* Touch → fluid splat (active once the fluid sim exists in Phase 1) */
  var prevTouchX = 0, prevTouchY = 0;
  document.addEventListener('touchstart', function (e) {
    if (!window.FluidSim) return;
    var t = e.changedTouches[0];
    prevTouchX = t.clientX; prevTouchY = t.clientY;
    window.FluidSim.splat(t.clientX, t.clientY, 0.08, 0.08);
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!window.FluidSim) return;
    var t = e.changedTouches[0];
    var dx = (t.clientX - prevTouchX) / window.innerWidth;
    var dy = (t.clientY - prevTouchY) / window.innerHeight;
    window.FluidSim.splat(t.clientX, t.clientY, dx, dy);
    prevTouchX = t.clientX; prevTouchY = t.clientY;
  }, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
