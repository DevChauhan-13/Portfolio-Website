/* ================================================================
   PROJECT DETAIL ENGINE — project-detail.js
   Reads the slug from the URL, loads the project from
   content.json, renders 17 block types, wires reveals/parallax.
   ================================================================ */
(function () {
  'use strict';

  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COARSE = window.matchMedia('(pointer: coarse)').matches;

  /* ── Split helpers ────────────────────────────────────────────── */
  function splitWords(el) {
    var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    el.textContent = '';
    el.classList.add('split-words');
    var wi = 0;
    text.split(' ').forEach(function (word, i) {
      if (i > 0) el.appendChild(document.createTextNode(' '));
      var span = document.createElement('span');
      span.className = 'wd';
      span.style.setProperty('--wi', wi++);
      span.textContent = word;
      el.appendChild(span);
    });
  }
  function splitChars(el, cls) {
    cls = cls || 'ch';
    var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    el.textContent = '';
    var ci = 0;
    text.split(' ').forEach(function (word, wi) {
      if (wi > 0) el.appendChild(document.createTextNode('\u00A0'));
      var ww = document.createElement('span');
      ww.style.cssText = 'display:inline-block;white-space:nowrap;vertical-align:top;';
      word.split('').forEach(function (char) {
        var outer = document.createElement('span');
        outer.className = cls;
        outer.style.setProperty('--ci', ci++);
        var inner = document.createElement('span');
        inner.className = cls + '-inner';
        inner.textContent = char;
        outer.appendChild(inner);
        ww.appendChild(outer);
      });
      el.appendChild(ww);
    });
  }
  function splitHeroTitle(el) {
    var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    el.textContent = '';
    var ci = 0;
    text.split(' ').forEach(function (word, wi) {
      if (wi > 0) el.appendChild(document.createTextNode('\u00A0'));
      var ww = document.createElement('span');
      ww.style.cssText = 'display:inline-block;white-space:nowrap;vertical-align:top;';
      word.split('').forEach(function (char) {
        var outer = document.createElement('span');
        outer.className = 'hero-char';
        outer.style.setProperty('--i', ci++);
        var inner = document.createElement('span');
        inner.className = 'hero-char-inner';
        inner.textContent = char;
        outer.appendChild(inner);
        ww.appendChild(outer);
      });
      el.appendChild(ww);
    });
  }

  /* ── Reveal observer ──────────────────────────────────────────── */
  function setupReveal() {
    var hero = document.getElementById('pdHero');
    if (hero) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { hero.classList.add('is-revealed'); });
      });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll(
      '.reveal, .img-reveal, .split-chars, .split-words, .pd-meta-item'
    ).forEach(function (el) { io.observe(el); });
  }

  /* ── Parallax + progress ──────────────────────────────────────── */
  function setupScrollFx() {
    var heroBgImg = document.getElementById('pdHeroImg');
    var progressBar = document.getElementById('pdProgress');
    var darkSections = Array.prototype.slice.call(document.querySelectorAll('.pd-hero, .pd-next'));
    window.addEventListener('scroll', function () {
      var sy = window.scrollY;
      if (heroBgImg && !COARSE) heroBgImg.style.transform = 'translateY(' + (sy * 0.22) + 'px)';
      if (!COARSE) {
        document.querySelectorAll('.pd-img-full img, .pd-img-contained-img img').forEach(function (img) {
          var wrap = img.closest('.pd-img-full, .pd-img-contained-img');
          if (!wrap) return;
          var rect = wrap.getBoundingClientRect();
          var center = rect.top + rect.height / 2 - window.innerHeight / 2;
          img.style.transform = 'scale(1.06) translateY(' + (center * 0.06).toFixed(1) + 'px)';
        });
      }
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressBar) progressBar.style.transform = 'scaleX(' + (max > 0 ? sy / max : 0) + ')';
      /* nav theme flip */
      var NAV_H = 90;
      var onDark = darkSections.some(function (el) {
        var r = el.getBoundingClientRect();
        return r.top <= NAV_H && r.bottom >= 0;
      });
      document.body.classList.toggle('is-on-dark', onDark);
      document.body.classList.toggle('is-on-light', !onDark);
    }, { passive: true });
  }

  /* ── Block renderer ───────────────────────────────────────────── */
  function img(url, w) {
    if (!url) return '';
    if (url.indexOf('http') === 0 || url.indexOf('/') === 0) return url;
    return (window.SITE_BASE || '') + url;
  }

  function renderBlocks(blocks, projectTitle) {
    var content = document.getElementById('pdContent');
    if (!content || !blocks || !blocks.length) return;
    content.innerHTML = '';

    blocks.forEach(function (block) {
      var el;
      switch (block._type) {
        case 'text': {
          el = document.createElement('div');
          el.className = 'pd-intro';
          var paras = String(block.body || '').split(/\n\n+/).filter(Boolean);
          el.innerHTML = paras.map(function (p, i) {
            return '<p data-split="words"' + (i > 0 ? ' class="reveal"' : '') + '>' +
              escapeHtml(p.replace(/\n/g, ' ')) + '</p>';
          }).join('');
          break;
        }
        case 'chapter':
          el = document.createElement('div');
          el.className = 'pd-chapter';
          el.innerHTML =
            '<h2 class="pd-chapter-heading" data-split="chars">' + escapeHtml(block.chapterLabel) + '</h2>' +
            '<div class="pd-chapter-body">' +
            String(block.body || '').split('\n').filter(Boolean).map(function (p, i) {
              return '<p class="reveal' + (i > 0 ? ' delay-' + i : '') + '">' + escapeHtml(p) + '</p>';
            }).join('') +
            '</div>';
          break;
        case 'statement':
          el = document.createElement('div');
          el.className = 'pd-statement reveal';
          el.innerHTML = '<p>' + escapeHtml(block.text) + '</p>';
          break;
        case 'imageFullBleed':
          el = document.createElement('div');
          el.className = 'pd-img-full-wrap';
          el.innerHTML =
            '<div class="pd-img-full img-reveal">' +
            '<img src="' + img(block.image, 3200) + '" alt="' + escapeHtml(block.alt || projectTitle) + '">' +
            '</div>' +
            (block.caption ? '<div class="pd-img-caption pd-img-full-caption reveal">' + escapeHtml(block.caption) + '</div>' : '');
          break;
        case 'imageContained':
          el = document.createElement('div');
          el.className = 'pd-img-contained img-reveal';
          el.innerHTML =
            '<div class="pd-img-contained-img">' +
            '<img src="' + img(block.image, 1400) + '" alt="' + escapeHtml(block.alt || projectTitle) + '">' +
            '</div>' +
            (block.caption ? '<div class="pd-img-caption reveal">' + escapeHtml(block.caption) + '</div>' : '');
          break;
        case 'imageSide': {
          var isRight = block.imagePosition === 'right';
          el = document.createElement('div');
          el.className = 'pd-img-side' + (isRight ? ' is-right' : '');
          el.innerHTML =
            '<div class="pd-img-side-img img-reveal">' +
            '<img src="' + img(block.image, 1200) + '" alt="' + escapeHtml(block.alt || projectTitle) + '">' +
            '</div>' +
            '<div class="pd-img-side-copy">' +
            (block.heading ? '<h3 class="pd-img-side-heading" data-split="chars">' + escapeHtml(block.heading) + '</h3>' : '') +
            String(block.copy || '').split('\n').filter(Boolean).map(function (p, i) {
              return '<p class="reveal' + (i > 0 ? ' delay-' + i : '') + '">' + escapeHtml(p) + '</p>';
            }).join('') +
            '</div>';
          break;
        }
        case 'imageDuo':
          el = document.createElement('div');
          el.className = 'pd-img-duo';
          el.innerHTML =
            '<div class="img-reveal">' +
            '<div class="pd-img-duo-img"><img src="' + img(block.imageLeft, 900) + '" alt="' + escapeHtml(block.captionLeft) + '"></div>' +
            (block.captionLeft ? '<div class="pd-img-caption">' + escapeHtml(block.captionLeft) + '</div>' : '') +
            '</div>' +
            '<div class="img-reveal" style="transition-delay:.12s">' +
            '<div class="pd-img-duo-img"><img src="' + img(block.imageRight, 900) + '" alt="' + escapeHtml(block.captionRight) + '"></div>' +
            (block.captionRight ? '<div class="pd-img-caption">' + escapeHtml(block.captionRight) + '</div>' : '') +
            '</div>';
          break;
        case 'pullquote':
          el = document.createElement('div');
          el.className = 'pd-pullquote reveal' + (block.accentBackground ? ' has-accent' : '');
          el.innerHTML = '<blockquote><span class="pd-pq-mark" aria-hidden="true">"</span>' + escapeHtml(block.quote) + '</blockquote>';
          break;
        case 'stats':
          el = document.createElement('div');
          el.className = 'pd-stats reveal';
          el.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:32px;padding:52px 96px;';
          el.innerHTML = (block.items || []).map(function (s) {
            return '<div class="pd-stat-item">' +
              '<span style="font-family:var(--font-name);font-weight:900;font-size:clamp(2.5rem,5vw,5rem);line-height:1;color:var(--fg);display:block;">' + escapeHtml(s.value) + '</span>' +
              '<span style="font-family:var(--font-ui);font-size:0.72rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--fg-dim);">' + escapeHtml(s.label) + '</span>' +
              '</div>';
          }).join('');
          break;
        case 'marquee': {
          var words = (block.words || []).filter(Boolean);
          var repeated = words.length ? words.concat(words) : [];
          el = document.createElement('div');
          el.className = 'pd-marquee';
          el.setAttribute('aria-hidden', 'true');
          el.innerHTML = '<div class="pd-marquee-track">' +
            repeated.map(function (w) {
              return '<span class="pd-marquee-word">' + escapeHtml(w) + '</span><span class="pd-marquee-dot">\u00b7</span>';
            }).join('') +
            '</div>';
          break;
        }
        case 'challengeSolution':
          el = document.createElement('div');
          el.className = 'pd-cs';
          el.innerHTML =
            '<div class="pd-cs-col">' +
            '<div class="pd-cs-nr reveal" aria-hidden="true">01</div>' +
            '<h3 class="pd-cs-heading" data-split="chars">' + escapeHtml(block.challengeHeading || 'THE PROBLEM') + '</h3>' +
            '<div class="pd-cs-body">' +
            String(block.challenge || '').split('\n').filter(Boolean).map(function (p, i) {
              return '<p class="reveal ' + (i > 0 ? 'delay-' + i : 'delay-1') + '">' + escapeHtml(p) + '</p>';
            }).join('') +
            '</div></div>' +
            '<div class="pd-cs-divider" aria-hidden="true"></div>' +
            '<div class="pd-cs-col">' +
            '<div class="pd-cs-nr reveal" aria-hidden="true">02</div>' +
            '<h3 class="pd-cs-heading" data-split="chars">' + escapeHtml(block.solutionHeading || 'THE SOLUTION') + '</h3>' +
            '<div class="pd-cs-body">' +
            String(block.solution || '').split('\n').filter(Boolean).map(function (p, i) {
              return '<p class="reveal ' + (i > 0 ? 'delay-' + i : 'delay-1') + '">' + escapeHtml(p) + '</p>';
            }).join('') +
            '</div></div>';
          break;
        case 'roleOverview':
          el = document.createElement('div');
          el.className = 'pd-role-overview';
          el.style.cssText = 'padding:52px 96px;border-top:1px solid var(--line);';
          el.innerHTML =
            (block.heading ? '<h3 class="pd-role-heading reveal" style="font-family:var(--font-name);font-weight:900;font-size:clamp(1.4rem,2vw,2.2rem);text-transform:uppercase;color:var(--fg);margin:0 0 24px;">' + escapeHtml(block.heading) + '</h3>' : '') +
            '<div class="pd-role-tags" style="display:flex;flex-wrap:wrap;gap:10px;">' +
            (block.roles || []).map(function (r) {
              return '<span class="pd-role-tag reveal" style="font-family:var(--font-ui);font-size:0.62rem;font-weight:600;letter-spacing:0.10em;text-transform:uppercase;color:var(--fg);border:1px solid rgba(28,25,23,0.22);padding:6px 16px;border-radius:2px;">' + escapeHtml(r) + '</span>';
            }).join('') +
            '</div>';
          break;
        case 'sectionText':
          el = document.createElement('div');
          el.className = 'pd-section-text';
          el.innerHTML =
            (block.heading ? '<h3 class="pd-section-text-heading reveal">' + escapeHtml(block.heading) + '</h3>' : '') +
            '<div class="pd-section-text-body">' +
            String(block.body || '').split('\n').filter(Boolean).map(function (p, i) {
              return '<p class="reveal' + (i > 0 ? ' delay-1' : '') + '">' + escapeHtml(p) + '</p>';
            }).join('') +
            '</div>';
          break;
        case 'imageFloat':
          el = document.createElement('div');
          el.className = 'pd-img-float ' + (block.imagePosition === 'right' ? 'is-right' : 'is-left');
          el.innerHTML =
            '<div class="pd-img-float-img img-reveal">' +
            '<img src="' + img(block.image, 1400) + '" alt="' + escapeHtml(block.alt || projectTitle) + '">' +
            (block.caption ? '<div class="pd-img-caption pd-img-float-caption">' + escapeHtml(block.caption) + '</div>' : '') +
            '</div>';
          break;
        case 'imageGrid': {
          var imgs = block.gridImages || [];
          el = document.createElement('div');
          el.className = 'pd-img-grid count-' + clamp(imgs.length, 2, 4);
          el.innerHTML = imgs.map(function (item, i) {
            return '<div class="pd-img-grid-cell">' +
              '<div class="pd-img-grid-item img-reveal"' + (i > 0 ? ' style="transition-delay:' + (i * 0.08) + 's"' : '') + '>' +
              '<img src="' + img(item.url, 900) + '" alt="' + escapeHtml(item.alt || projectTitle) + '">' +
              '</div>' +
              (item.caption ? '<div class="pd-img-caption pd-img-grid-caption">' + escapeHtml(item.caption) + '</div>' : '') +
              '</div>';
          }).join('');
          break;
        }
        case 'process': {
          var steps = block.processSteps || [];
          el = document.createElement('div');
          el.className = 'pd-process';
          el.innerHTML =
            (block.sectionLabel ? '<div class="pd-process-label reveal">' + escapeHtml(block.sectionLabel) + '</div>' : '') +
            '<div class="pd-process-steps">' +
            steps.map(function (s, i) {
              return '<div class="pd-process-step reveal" style="transition-delay:' + (i * 0.08) + 's">' +
                '<div class="pd-process-step-nr" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</div>' +
                '<div class="pd-process-step-title">' + escapeHtml(s.title) + '</div>' +
                (s.description ? '<div class="pd-process-step-desc">' + escapeHtml(s.description) + '</div>' : '') +
                '</div>';
            }).join('') +
            '</div>';
          break;
        }
        case 'keyInsight':
          el = document.createElement('div');
          el.className = 'pd-key-insight reveal';
          el.innerHTML =
            '<div class="pd-key-insight-inner">' +
            '<div class="pd-key-insight-label">' + escapeHtml(block.insightLabel || 'Key Insight') + '</div>' +
            '<div class="pd-key-insight-text">' + escapeHtml(block.insightText) + '</div>' +
            '</div>';
          break;
        case 'beforeAfter':
          el = document.createElement('div');
          el.className = 'pd-before-after';
          el.innerHTML =
            '<div class="pd-before-after-grid">' +
            '<div class="pd-before-after-item img-reveal">' +
            '<img src="' + img(block.imageLeft, 1000) + '" alt="' + escapeHtml(block.labelLeft || 'Before') + '">' +
            '<span class="pd-before-after-label">' + escapeHtml(block.labelLeft || 'Before') + '</span>' +
            '</div>' +
            '<div class="pd-before-after-item img-reveal" style="transition-delay:.1s">' +
            '<img src="' + img(block.imageRight, 1000) + '" alt="' + escapeHtml(block.labelRight || 'After') + '">' +
            '<span class="pd-before-after-label">' + escapeHtml(block.labelRight || 'After') + '</span>' +
            '</div>' +
            '</div>' +
            (block.caption ? '<div class="pd-img-caption pd-before-after-caption reveal">' + escapeHtml(block.caption) + '</div>' : '');
          break;
        default:
          return;
      }
      if (el) content.appendChild(el);
    });
  }

  /* ── Load ─────────────────────────────────────────────────────── */
  function loadProject() {
    var match = window.location.pathname.match(/projects\/([a-z0-9-]+)\.html/);
    var slug = match ? match[1] : null;
    if (!slug || !window.contentFetch) return Promise.resolve();

    return window.contentFetch('*[_type=="project"] | order(order asc)').then(function (all) {
      all = all || [];
      var idx = -1;
      for (var i = 0; i < all.length; i++) {
        if (all[i].slug === slug) { idx = i; break; }
      }
      if (idx < 0) return;
      var project = all[idx];

      /* title */
      var titleEl = document.getElementById('pdHeroTitle');
      if (titleEl) {
        titleEl.textContent = project.title || '';
        splitHeroTitle(titleEl);
      }
      document.title = project.title + ' — Dev Chauhan';

      /* hero image */
      var heroImg = document.getElementById('pdHeroImg');
      if (heroImg && project.heroImage) {
        var isMobile = window.innerWidth <= 768;
        var src = (isMobile && project.heroImageMobile) ? project.heroImageMobile : project.heroImage;
        heroImg.src = (src.indexOf('http') === 0 || src.indexOf('/') === 0) ? src : (window.SITE_BASE || '') + src;
        heroImg.alt = project.title || '';
      }

      /* meta strip */
      var metaEl = document.getElementById('pdMeta');
      if (metaEl) {
        var items = [
          project.client ? { label: 'Client', value: project.client } : null,
          project.year ? { label: 'Year', value: project.year } : null,
          project.role ? { label: 'Role', value: project.role } : null,
          project.platform ? { label: 'Platform', value: project.platform } : null,
          (project.liveUrl || project.repoUrl || project.paperUrl) ? { label: 'Links', raw: true, value:
            (project.liveUrl ? '<a class="pd-meta-link" href="' + escapeHtml(project.liveUrl) + '" target="_blank" rel="noopener">Visit live ↗</a>' : '') +
            (project.paperUrl ? '<a class="pd-meta-link" href="' + escapeHtml(project.paperUrl.indexOf('http') === 0 ? project.paperUrl : (window.SITE_BASE || '') + project.paperUrl) + '" target="_blank" rel="noopener">Read paper ↗</a>' : '') +
            (project.repoUrl ? '<a class="pd-meta-link" href="' + escapeHtml(project.repoUrl) + '" target="_blank" rel="noopener">GitHub ↗</a>' : '')
          } : null
        ].filter(Boolean);
        metaEl.innerHTML = items.map(function (m) {
          return '<div class="pd-meta-item"><div class="pd-meta-label">' + escapeHtml(m.label) +
            '</div><div class="pd-meta-value">' + (m.raw ? m.value : escapeHtml(m.value)) + '</div></div>';
        }).join('');
      }

      /* blocks + descriptions-as-intro */
      var blocks = (project.blocks || []).slice();
      if (project.description) {
        blocks.unshift({ _type: 'text', body: project.description });
      }
      renderBlocks(blocks, project.title);

      /* wire splits inside rendered content */
      document.querySelectorAll('[data-split="words"]').forEach(function (el) {
        if (!el.classList.contains('split-words')) splitWords(el);
      });
      document.querySelectorAll('[data-split="chars"]').forEach(function (el) {
        if (!el.classList.contains('split-chars') && !el.closest('.pd-hero')) {
          el.classList.add('split-chars');
          splitChars(el);
        }
      });

      /* next / prev */
      var next = all[idx + 1];
      var prev = all[idx - 1];
      var nextSection = document.getElementById('pdNext');
      var prevSection = document.getElementById('pdPrev');
      var base = window.SITE_BASE || '';
      if (next && nextSection) {
        nextSection.style.display = '';
        var nextImg = document.getElementById('pdNextImg');
        var nextLink = document.getElementById('pdNextLink');
        var nextTitle = document.getElementById('pdNextTitle');
        if (nextImg && next.heroImage) { nextImg.src = base + next.heroImage; nextImg.alt = next.title || ''; }
        if (nextLink) nextLink.href = base + 'projects/' + next.slug + '.html';
        if (nextTitle) {
          nextTitle.textContent = next.title;
          splitChars(nextTitle);
        }
      }
      if (prev && prevSection) {
        prevSection.style.display = '';
        var prevLink = document.getElementById('pdPrevLink');
        var prevTitle = document.getElementById('pdPrevTitle');
        if (prevLink) prevLink.href = base + 'projects/' + prev.slug + '.html';
        if (prevTitle) prevTitle.textContent = prev.title;
      }

      setupReveal();
    }).catch(function (e) {
      console.warn('Project load failed', e);
    });
  }

  /* ── Cursor ───────────────────────────────────────────────────── */
  function setupCursor() {
    var dot = document.getElementById('cursorDot');
    var ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;
    var mx = parseFloat(sessionStorage.getItem('mx') || '');
    var my = parseFloat(sessionStorage.getItem('my') || '');
    var rawX = isNaN(mx) ? -200 : mx, rawY = isNaN(my) ? -200 : my;
    var rx = rawX, ry = rawY;
    dot.style.left = rawX + 'px'; dot.style.top = rawY + 'px';
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    document.addEventListener('mousemove', function (e) {
      rawX = e.clientX; rawY = e.clientY;
      dot.style.left = rawX + 'px';
      dot.style.top = rawY + 'px';
      try {
        sessionStorage.setItem('mx', String(e.clientX));
        sessionStorage.setItem('my', String(e.clientY));
      } catch (_) {}
    });
    (function loop() {
      rx = lerp(rx, rawX, 0.12);
      ry = lerp(ry, rawY, 0.12);
      ring.style.left = rx.toFixed(2) + 'px';
      ring.style.top = ry.toFixed(2) + 'px';
      requestAnimationFrame(loop);
    })();
  }

  /* ── Menu dots ────────────────────────────────────────────────── */
  var FORMATIONS = [
    [[10,10],[21,10],[32,10],[10,21],[21,21],[32,21],[10,32],[21,32],[32,32]],
    [[21,8],[29,11],[34,19],[32,28],[25,33],[17,33],[9,28],[8,19],[11,11]],
    [[21,7],[21,13],[7,21],[13,21],[21,21],[29,21],[35,21],[21,29],[21,35]],
    [[5,4],[21,6],[37,4],[7,21],[21,21],[35,21],[5,37],[21,35],[37,37]]
  ];
  function setupMenuDots() {
    var btn = document.getElementById('menuDots');
    if (!btn) return;
    if (!btn.querySelector('span')) {
      for (var i = 0; i < 9; i++) btn.appendChild(document.createElement('span'));
    }
    var idx = 0;
    function apply(f) {
      btn.querySelectorAll('span').forEach(function (s, i) {
        s.style.left = f[i][0] + 'px';
        s.style.top = f[i][1] + 'px';
      });
    }
    apply(FORMATIONS[0]);
    setInterval(function () {
      idx = (idx + 1) % FORMATIONS.length;
      apply(FORMATIONS[idx]);
    }, 3500);
  }

  /* ── Nav wiring ───────────────────────────────────────────────── */
  function setupNavLinks() {
    var nextLink = document.querySelector('.pd-next-link');
    var nextSection = document.querySelector('.pd-next');
    function go(href) {
      if (typeof window.TxOut === 'function') window.TxOut(href);
      else window.location.href = href;
    }
    if (nextLink) nextLink.addEventListener('click', function (e) { e.preventDefault(); go(nextLink.getAttribute('href')); });
    if (nextSection && nextLink) nextSection.addEventListener('click', function () { go(nextLink.getAttribute('href')); });
  }

  /* ── Init ─────────────────────────────────────────────────────── */
  function init() {
    if (typeof window.TxIn === 'function') window.TxIn();
    setupMenuDots();
    setupScrollFx();
    setupReveal();
    setupCursor();
    setupNavLinks();
    loadProject();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
