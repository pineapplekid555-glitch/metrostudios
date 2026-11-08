/* Metro Studios — shared behaviour */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  /* ======================================================================
     Content: everything that can change lives in content.js (window.SITE).
     The markup carries data- hooks; this fills them in. It is safe to run
     more than once, and if content.js is missing or broken the page keeps
     whatever was already in the HTML.
     ====================================================================== */
  var S = window.SITE;
  var PREVIEW = !!window.MS_PREVIEW;
  var ROOT = root.getAttribute('data-root') || ''; /* path from this page back to the site's top folder, so the site works from any folder */
  var GAME_NAME = { 'westbrook-county': 'Westbrook County', 'project-alba': 'Project Alba', 'oath-of-caledonia': 'Oath of Caledonia' };
  var STATUS = { live: 'Out now', soon: 'Coming soon', testing: 'In testing', dev: 'In development' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var EXT_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true"><path d="M4 12 12 4M5 4h7v7"/></svg>';
  var AR_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4"/></svg>';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function str(x) { return typeof x === 'string' ? x.trim() : ''; }
  function link(x) { x = str(x); return /^(https?:\/\/|\/|#|mailto:)/i.test(x) ? x : ''; }
  function host(u) { return u.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./, ''); }
  function pageUrl(slug, hash) { return PREVIEW ? '#' + slug : ROOT + slug + '/' + (hash || ''); }
  function local(x) { x = str(x); if (!x) return ''; if (/^(https?:|mailto:|#)/i.test(x)) return x; if (/^(javascript|data):/i.test(x)) return ''; return ROOT + x.replace(/^\//, ''); }
  function fmtDate(d, short) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(d));
    if (!m || +m[2] < 1 || +m[2] > 12) return str(d);
    var mon = MONTHS[+m[2] - 1];
    return (+m[3]) + ' ' + (short ? mon.slice(0, 3) : mon) + ' ' + m[1];
  }
  function game(slug) {
    var g = (S && S.games && S.games[slug]) || {};
    var st = STATUS[g.status] ? g.status : 'dev';
    return { status: st, label: STATUS[st], release: str(g.release), play: link(g.play), website: link(g.website), shots: arr(g.screenshots) };
  }
  function news(slug) {
    return arr(S && S.news).filter(function (n) { return n && str(n.title) && (!slug || str(n.game) === slug); })
      .sort(function (a, b) { var x = str(a.date), y = str(b.date); return x < y ? 1 : x > y ? -1 : 0; });
  }
  function hide(el, on) {
    var p = el.parentElement;
    if (p && p.tagName === 'LI' && p.children.length === 1) el = p;
    el.hidden = !!on;
  }
  function hideSection(el, on) { var s = el.closest('section'); if (s) s.hidden = !!on; }
  var WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function num(n) { return WORDS[n] || String(n); }

  function updateBlock(n, allHref) {
    var items = arr(n.items).map(str).filter(Boolean);
    var more = local(n.link);
    var meta = '<div class="meta"><span class="label">' + esc(n.title) + '</span>' +
      (str(n.date) ? '<span class="date">' + esc(fmtDate(n.date)) + '</span>' : '') +
      (more ? '<a class="link" href="' + esc(more) + '" target="_blank" rel="noopener">Read more</a>' : '') +
      (allHref ? '<a class="link" href="' + esc(allHref) + '" target="_blank" rel="noopener">All updates on the game site</a>' : '') + '</div>';
    var body = (str(n.text) ? '<p>' + esc(n.text) + '</p>' : '') +
      (items.length ? '<ul' + (items.length > 5 ? ' class="cols"' : '') + '>' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' : '');
    return '<div class="update">' + meta + '<div class="u-body">' + body + '</div></div>';
  }
  function member(m) {
    if (typeof m === 'string') m = { name: m };
    if (!m || !str(m.name)) return '';
    var u = str(m.username).replace(/^@/, '');
    return '<li><b>' + esc(str(m.name)) + '</b>' +
      (str(m.title) ? '<span class="m-title">' + esc(str(m.title)) + '</span>' : '') +
      (u ? '<a class="m-user" href="https://www.roblox.com/users/profile?username=' + encodeURIComponent(u) + '" target="_blank" rel="noopener">@' + esc(u) + '</a>' : '') + '</li>';
  }

  var R = {
    'games-summary': function (el) {
      var live = 0, other = 0, dev = 0;
      Object.keys(GAME_NAME).forEach(function (s) { var st = game(s).status; if (st === 'live') live++; else { other++; if (st === 'dev') dev++; } });
      var pl = function (n) { return n === 1 ? 'game' : 'games'; }, be = function (n) { return n === 1 ? 'is' : 'are'; };
      var rest = dev === other ? 'in development' : 'on the way';
      var t;
      if (live && other) t = cap(num(live)) + ' ' + pl(live) + ' ' + be(live) + ' live and ' + num(other) + ' more ' + be(other) + ' ' + rest + '.';
      else if (other) t = cap(num(other)) + ' ' + pl(other) + ' ' + be(other) + ' ' + rest + '.';
      else t = 'All ' + num(live) + ' games are live.';
      el.textContent = t;
    },
    'team-roles': function (el) {
      var roles = arr(S.team && S.team.roles).filter(function (r) { return r && str(r.name); });
      el.innerHTML = roles.map(function (r) {
        var ms = arr(r.members).map(member).filter(Boolean);
        return '<li><h3>' + esc(str(r.name)) + (r.open === true ? '<span class="tag">Recruiting</span>' : '') + '</h3><div class="role-body">' +
          (str(r.description) ? '<p>' + esc(str(r.description)) + '</p>' : '') +
          (ms.length ? '<ul class="members">' + ms.join('') + '</ul>' : '') + '</div></li>';
      }).join('');
    },
    'team-note': function (el) { var t = str(S.team && S.team.note); el.textContent = t; el.hidden = !t; },
    'hiring': function (el) {
      var t = str(S.team && S.team.hiring);
      el.textContent = t ? t + (el.getAttribute('data-suffix') || '') : '';
      hideSection(el, !t);
    },
    'news-latest': function (el) {
      var slug = el.getAttribute('data-game'), list = news(slug), g = game(slug);
      if (!list.length) { el.innerHTML = ''; hideSection(el, true); return; }
      hideSection(el, false);
      var all = el.hasAttribute('data-all-updates') && g.website ? g.website + '/updates' : '';
      var html = updateBlock(list[0], all);
      if (list.length > 1) {
        html += '<details class="older"><summary>Earlier updates (' + (list.length - 1) + ')</summary>' +
          list.slice(1).map(function (n) { return updateBlock(n, ''); }).join('') + '</details>';
      }
      el.innerHTML = html;
    },
    'news-archive': function (el) {
      var want = (new URLSearchParams(location.search).get('game') || '').trim(), all = news(''), list = want ? all.filter(function (n) { return str(n.game) === want; }) : all;
      var pills = [['', 'All']].concat(Object.keys(GAME_NAME).map(function (k) { return [k, GAME_NAME[k]]; })).filter(function (p) { return !p[0] || all.some(function (n) { return str(n.game) === p[0]; }); });
      var head = pills.length > 2 ? '<div class="pillrow">' + pills.map(function (p) {
        return '<a class="pill" href="' + (PREVIEW ? '#' : '?' + (p[0] ? 'game=' + p[0] : '')) + '"' + (p[0] === want ? ' aria-current="true"' : '') + '>' + esc(p[1]) + '</a>';
      }).join('') + '</div>' : '';
      el.innerHTML = head + (list.length ? list.map(function (n) {
        var g = GAME_NAME[str(n.game)];
        return '<article class="arch rv">' + (g ? '<span class="n-game">' + esc(g) + '</span>' : '<span class="n-game">Studio</span>') + updateBlock(n, '') + '</article>';
      }).join('') : '<p class="note" style="margin:0">No news yet.</p>');
    },
    'faq': function (el) {
      var list = arr(S.faq).filter(function (f) { return f && str(f.q) && str(f.a); });
      if (!list.length) { el.innerHTML = ''; hideSection(el, true); return; }
      hideSection(el, false);
      el.innerHTML = '<div class="faqs">' + list.map(function (f) {
        return '<details class="faq rv"><summary>' + esc(str(f.q)) + '</summary><p>' + esc(str(f.a)) + '</p></details>';
      }).join('') + '</div>';
      var old = document.getElementById('faq-ld'); if (old) old.remove();
      var ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'faq-ld';
      ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map(function (f) { return { '@type': 'Question', name: str(f.q), acceptedAnswer: { '@type': 'Answer', text: str(f.a) } }; }) });
      document.head.appendChild(ld);
    },
    'news-home': function (el) {
      var limit = +el.getAttribute('data-limit') || 3, list = news('').slice(0, limit);
      if (!list.length) { el.innerHTML = ''; hideSection(el, true); return; }
      hideSection(el, false);
      el.innerHTML = '<div class="newslist">' + list.map(function (n) {
        var slug = str(n.game), items = arr(n.items).map(str).filter(Boolean), sub = str(n.text);
        if (!sub && items.length) sub = items[0] + (items.length > 1 ? ' and ' + (items.length - 1) + ' more' : '');
        if (sub.length > 120) sub = sub.slice(0, 117).replace(/\s+\S*$/, '') + '...';
        var href = GAME_NAME[slug] ? pageUrl(slug, '#updates') : local(n.link);
        var inner = '<span class="n-date">' + esc(fmtDate(n.date, true)) + '</span><span class="n-main"><span class="n-title">' + esc(n.title) + '</span>' +
          (GAME_NAME[slug] ? ' <span class="n-game">' + esc(GAME_NAME[slug]) + '</span>' : '') +
          (sub ? '<span class="n-sub">' + esc(sub) + '</span>' : '') + '</span>' + (href ? AR_SVG : '');
        return href ? '<a class="n-row rv" href="' + esc(href) + '">' + inner + '</a>' : '<div class="n-row rv">' + inner + '</div>';
      }).join('') + '</div>';
    },
    'shots': function (el) {
      var shots = game(el.getAttribute('data-game')).shots.map(function (s) {
        if (typeof s === 'string') s = { image: s };
        return s && local(s.image) ? { image: local(s.image), caption: str(s.caption), alt: str(s.alt) || str(s.caption) } : null;
      }).filter(Boolean);
      if (!shots.length) { el.innerHTML = ''; hideSection(el, true); return; }
      hideSection(el, false);
      el.innerHTML = '<ul class="shots">' + shots.map(function (s) {
        return '<li class="rv"><a href="' + esc(s.image) + '" target="_blank" rel="noopener"><img src="' + esc(s.image) + '" alt="' + esc(s.alt) + '" loading="lazy">' +
          (s.caption ? '<span class="cap">' + esc(s.caption) + '</span>' : '') + '</a></li>';
      }).join('') + '</ul>';
    },
    'release-copy': function (el) {
      var g = game(el.getAttribute('data-game')), t;
      if (g.status === 'live') t = g.play ? 'Out now on Roblox.' : 'Out now.';
      else if (g.status === 'soon') t = g.release ? 'Coming soon. Planned release: ' + g.release + '.' : 'Coming soon.';
      else if (g.status === 'testing') t = 'Currently in testing.' + (g.release ? ' Planned release: ' + g.release + '.' : '');
      else t = g.release ? 'Planned release: ' + g.release + '.' : 'There is no release date yet. Screenshots and news will be posted here as the game takes shape.';
      el.textContent = t;
    },
    'play-btn': function (el) {
      var g = game(el.getAttribute('data-game'));
      el.innerHTML = g.play ? '<a class="btn btn-solid ext" href="' + esc(g.play) + '" target="_blank" rel="noopener">Play on Roblox ' + EXT_SVG + '</a>' : '';
    }
  };

  function render(scope) {
    scope = scope || document;
    if (!S || typeof S !== 'object') {
      if (window.console) console.warn('[Metro Studios] content.js did not load, so the pages are showing their saved text. Open /content-check/ to find the problem.');
      return;
    }
    function each(sel, fn) {
      [].forEach.call(scope.querySelectorAll(sel), function (el) {
        try { fn(el); } catch (err) { if (window.console) console.warn('[Metro Studios] content.js problem near ' + sel + ':', err); }
      });
    }
    (function banner() {
      var b = S.banner || {}, t = str(b.text), site = document.querySelector('.site'), ex = document.getElementById('ms-banner');
      if (ex) ex.remove();
      if (!t || !site || PREVIEW) return;
      var u = link(b.link), d = document.createElement('div');
      d.className = 'banner'; d.id = 'ms-banner'; d.setAttribute('role', 'status');
      d.innerHTML = '<span>' + esc(t) + '</span>' + (u ? '<a href="' + esc(u) + '">' + esc(str(b.linkText) || 'Read more') + '</a>' : '');
      site.insertBefore(d, site.firstChild);
    })();
    each('[data-render]', function (el) { var f = R[el.getAttribute('data-render')]; if (f) f(el); });
    each('[data-link]', function (el) {
      var u = link(S.links && S.links[el.getAttribute('data-link')]);
      if (u) el.setAttribute('href', u + (el.getAttribute('data-path') || ''));
      hide(el, !u);
    });
    each('[data-play]', function (el) {
      var u = game(el.getAttribute('data-play')).play;
      if (u) el.setAttribute('href', u);
      hide(el, !u);
    });
    each('[data-website]', function (el) {
      var u = game(el.getAttribute('data-website')).website;
      if (u) {
        el.setAttribute('href', u + (el.getAttribute('data-path') || ''));
        var t = el.getAttribute('data-text') === 'host' ? el : el.querySelector('[data-text="host"]');
        if (t) t.textContent = host(u);
      }
      hide(el, !u);
    });
    each('[data-status]', function (el) {
      var g = game(el.getAttribute('data-status'));
      el.textContent = g.label;
      if (el.classList.contains('g-status')) el.classList.toggle('live', g.status === 'live');
    });
    each('[data-release]', function (el) {
      var g = game(el.getAttribute('data-release'));
      el.textContent = g.release || (g.status === 'live' ? 'Out now' : 'Not announced yet');
    });
  }
  window.MS_render = render;
  render(document);
  window.MS_RENDERED = true;
  if (window.MS_PRERENDER) return;

  /* ---- header: solid after scroll, mobile menu ---- */
  var top = document.getElementById('top');
  var nav = document.getElementById('nav');
  var btn = document.getElementById('menuBtn');
  function onScroll() {
    if (!top) return;
    top.classList.toggle('solid', (window.scrollY || 0) > 40);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  window.MS_onScroll = onScroll;

  function closeMenu() {
    if (!btn) return;
    btn.setAttribute('aria-expanded', 'false');
    if (btn.lastElementChild) btn.lastElementChild.textContent = 'Menu';
    nav && nav.classList.remove('open');
    top && top.classList.remove('menu-open');
  }
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.lastElementChild.textContent = open ? 'Close' : 'Menu';
      nav.classList.toggle('open', open);
      top.classList.toggle('menu-open', open);
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }
  window.MS_closeMenu = closeMenu;

  /* ---- skip link, back to top ---- */
  (function () {
    var main = document.querySelector('main');
    if (main) {
      main.id = main.id || 'main';
      var sk = document.createElement('a'); sk.className = 'skip'; sk.href = '#' + main.id; sk.textContent = 'Skip to content';
      document.body.insertBefore(sk, document.body.firstChild);
    }
    var up = document.createElement('button');
    up.className = 'to-top'; up.type = 'button'; up.setAttribute('aria-label', 'Back to top'); up.hidden = true;
    up.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true"><path d="M8 14V3M4 7l4-4 4 4"/></svg>';
    up.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    document.body.appendChild(up);
    addEventListener('scroll', function () { up.hidden = (window.scrollY || 0) < 900; }, { passive: true });
  })();

  /* ---- join form ---- */
  (function () {
    var f = document.getElementById('joinForm'); if (!f) return;
    var msg = document.getElementById('joinMsg'), btn = f.querySelector('button[type=submit]');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = {}; new FormData(f).forEach(function (v, k) { d[k] = v; });
      msg.className = 'form-msg'; msg.textContent = 'Sending…'; btn.disabled = true;
      fetch(ROOT + 'api/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j, status: r.status }; }); })
        .then(function (r) {
          if (r.ok) { f.hidden = true; var ok = document.getElementById('joinDone'); ok.hidden = false; ok.focus(); return; }
          btn.disabled = false; msg.className = 'form-msg bad';
          msg.textContent = r.j.error || (r.status === 404 || r.status === 405 ? 'The application form is not available on this version of the site yet.' : 'Something went wrong. Please try again.');
        })
        .catch(function () { btn.disabled = false; msg.className = 'form-msg bad'; msg.textContent = 'Could not reach the server. Check your connection and try again.'; });
    });
  })();


  /* ---- buttons that scroll to a section on the current page ---- */
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var y = el.getBoundingClientRect().top + (window.scrollY || 0) - 72;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  window.MS_scrollToId = scrollToId;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-scroll]');
    if (!a) return;
    e.preventDefault();
    scrollToId(a.getAttribute('data-scroll'));
  });

  /* ---- reveal on scroll (content stays visible, only offset) ---- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    [].forEach.call(document.querySelectorAll('.rv'), function (el) { io.observe(el); });
  } else {
    [].forEach.call(document.querySelectorAll('.rv'), function (el) { el.classList.add('in'); });
  }

  /* ---- intro: train doors (home page only) ---- */
  var intro = document.getElementById('intro');
  function go() { root.classList.add('go'); }
  if (!intro || !root.classList.contains('intro-on') || reduce) {
    root.classList.remove('intro-on');
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    go();
    return;
  }
  var timers = [], finished = false;
  try { if (!window.MS_INTRO_ALWAYS) sessionStorage.setItem('ms-intro', '1'); } catch (e) {}
  function finish() {
    if (finished) return;
    finished = true;
    root.classList.remove('intro-on');
    if (intro.parentNode) intro.parentNode.removeChild(intro);
  }
  function openDoors(fast) {
    intro.classList.add('open');
    timers.push(setTimeout(go, fast ? 150 : 480));
    timers.push(setTimeout(finish, fast ? 900 : 1500));
  }
  function skip() {
    if (intro.classList.contains('open')) return;
    timers.forEach(clearTimeout); timers = [];
    openDoors(true);
  }
  timers.push(setTimeout(function () { openDoors(false); }, 2300));
  intro.addEventListener('click', skip);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip(); });
  setTimeout(go, 5000); /* safety net */
})();
