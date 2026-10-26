/* ================================================================
   CONTENT CLIENT — content-client.js
   Local stand-in for the CMS fetch layer. Pages keep the same
   Promise-based call shape; data comes from assets/data/content.json.
   ================================================================ */
(function () {
  'use strict';

  /* Site root — pages live at the root or one level down (/projects/),
     so derive the base from the document location. */
  var SITE_BASE = window.location.pathname.indexOf('/projects/') === 0 ? '../' : '';
  window.SITE_BASE = SITE_BASE;

  var _cache = null;

  function load() {
    if (_cache) return Promise.resolve(_cache);
    return fetch(SITE_BASE + 'assets/data/content.json?v=4', {cache:'reload'})
      .then(function (r) {
        if (!r.ok) throw new Error('content.json fetch error: ' + r.status);
        return r.json();
      })
      .then(function (json) { _cache = json; return json; });
  }

  /* Resolve a GROQ-shaped query string to the matching local dataset.
     Only the handful of query patterns the pages use are recognized. */
  function resolve(data, query) {
    var q = String(query || '');
    if (q.indexOf('homePage') !== -1)        return data.homePage || null;
    if (q.indexOf('globalSettings') !== -1)  return data.globalSettings || null;
    if (q.indexOf('projectsPage') !== -1)    return data.projectsPage || null;
    if (q.indexOf('clientLogo') !== -1)      return data.clients || [];
    if (q.indexOf('journeyEntry') !== -1)    return data.journey || [];
    if (q.indexOf('artwork') !== -1 &&
        q.indexOf('slug.current ==') === -1) return data.artworks || [];
    if (q.indexOf('slug.current == $slug') !== -1) {
      /* Project-by-slug: the caller passes params via $slug interpolation
         already substituted in the query string by the page code. */
      var m = q.match(/slug\.current\s*==\s*"([^"]+)"/);
      if (m) {
        return (data.projects || []).filter(function (p) { return p.slug === m[1]; })[0] || null;
      }
      return null;
    }
    if (q.indexOf('project') !== -1)         return data.projects || [];
    return null;
  }

  /**
   * Fetch content. Signature mirrors the original CMS helper so page
   * code keeps the same shape:
   *   contentFetch(query)                → dataset
   *   contentFetch(query, { slug: 'x' }) → dataset
   * A "$slug" placeholder in the query is substituted before matching.
   */
  function contentFetch(query, params) {
    params = params || {};
    var q = String(query || '');
    Object.keys(params).forEach(function (k) {
      q = q.split('$' + k).join('"' + params[k] + '"');
    });
    return load().then(function (data) { return resolve(data, q); });
  }

  /**
   * Local image helper mirroring the CDN-transform helper:
   * returns the URL unchanged (local files), so page code that wraps
   * every image URL keeps working.
   */
  function imgUrl(url, width) {
    if (!url) return '';
    return url;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function safeUrl(url) {
    if (!url) return '#';
    try {
      var u = new URL(url, window.location.href);
      return (u.protocol === 'https:' || u.protocol === 'http:' ||
              u.protocol === 'mailto:') ? u.href : '#';
    } catch (_) { return '#'; }
  }

  window.contentFetch = contentFetch;
  /* Alias so later page modules can use the CMS-era name unchanged */
  window.sanityFetch = contentFetch;
  window.sanityImgUrl = imgUrl;
  window.escapeHtml = escapeHtml;
  window.safeUrl = safeUrl;
})();
