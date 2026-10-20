/* Digital Movement US landing page · effects · v1.3 preview · 2026-10-20 · change log: landing-page/README.md
   Readable port of the dmtradies.com.au effects (site.min.js and the inline extras), adapted to the light theme:
    1 burger + drawer (drawer starts under the header: --dmt-hdr-b)      7 pinned horizontal rail (#wwdRail)
    2 header .stuck after the hero, scroll-progress line, to-top ring     8 reviews: first batch + "Read more reviews"
    3 .rv reveal, staggered 90 ms                                         9 work frames: wheel scroll inside the frame, pointer spotlight
    4 .lit per-letter light-up (.accent scrim, .outline stroke)           10 mobile "Request your preview" pill, hidden while a form is on screen
    5 process spine: fill, orb, 34 dust specks, passed nodes              11 hero proof strip fit (zoom)
    6 results fan                                                         12 marquee duplicates stay out of the tab order
   prefers-reduced-motion: every effect is off and content shows in its final state. No network, no cookies, no storage. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return [].slice.call((ctx || doc).querySelectorAll(sel)); };
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var vh = function () { return window.innerHeight || root.clientHeight; };
  var atPageEnd = function () { var max = root.scrollHeight - vh(); return max > 0 && window.pageYOffset >= max - 2; };
  var onScroll = function (fn) { window.addEventListener('scroll', fn, { passive: true }); };
  var onResize = function (fn) { window.addEventListener('resize', fn, { passive: true }); };
  // run fn at most once per animation frame
  var perFrame = function (fn) {
    var queued = false;
    return function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; fn(); }); };
  };
  var whenSettled = function (fn) {
    window.addEventListener('load', fn);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fn);
  };

  /* 1. Burger + drawer ------------------------------------------------------------------------------ */
  var header = $('#siteHeader'), burger = $('#burger'), drawer = $('#drawer');
  function setDrawer(open) {
    if (open && header) root.style.setProperty('--dmt-hdr-b', Math.max(0, Math.round(header.getBoundingClientRect().bottom)) + 'px');
    drawer.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    doc.body.style.overflow = open ? 'hidden' : '';
    doc.body.classList.toggle('drawer-open', open);
  }
  if (burger && drawer) {
    burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('open')); });
    drawer.addEventListener('click', function (e) { if (e.target === drawer || e.target.closest('a')) setDrawer(false); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) { setDrawer(false); burger.focus(); }
    });
    onResize(function () { if (window.innerWidth >= 1080 && drawer.classList.contains('open')) setDrawer(false); });
  }

  /* 2. Header drops in once the hero has scrolled away; scroll-progress line and to-top ring --------- */
  var hero = $('#home'), stickAt = 8;
  var progress = $('#scrollProgress'), toTop = $('#dmtToTop'), ring = toTop && $('.to-top-bar', toTop);
  function measureHero() { stickAt = hero && header ? Math.max(hero.offsetHeight - header.offsetHeight - 40, 8) : 8; }
  function paintChrome() {
    var y = window.pageYOffset || root.scrollTop;
    if (header) header.classList.toggle('stuck', y > stickAt);
    var max = root.scrollHeight - vh(), p = max > 0 ? clamp01(y / max) : 0;
    if (progress) progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (toTop) {
      toTop.classList.toggle('is-visible', y > 600);
      toTop.classList.toggle('is-done', p > 0.995);
      if (ring) ring.style.strokeDashoffset = (100 - p * 100).toFixed(2);
    }
  }
  onScroll(perFrame(paintChrome));
  onResize(function () { measureHero(); paintChrome(); });
  whenSettled(function () { measureHero(); paintChrome(); });
  measureHero(); paintChrome();
  if (toTop) toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    var target = $('#main'); if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  });

  /* 3. Reveal on scroll: .rv gets .in, batches staggered by 90 ms ---------------------------------- */
  var reveals = $$('.rv');
  if (reduce || !('IntersectionObserver' in window)) reveals.forEach(function (el) { el.classList.add('in'); });
  else {
    var revealer = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target, delay = Math.min(n++, 4) * 90;
        setTimeout(function () { el.classList.add('in'); }, delay);
        revealer.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { revealer.observe(el); });
  }

  /* 4. Per-letter light-up for .lit headings ---------------------------------------------------------
     Each .w word is split into .c letters. While the heading travels from 95 % to 16 % of the viewport,
     letters move from --fill-dim to --fill-lit one after another (5.5 letters overlap). Letters inside
     .outline change their stroke colour; letters inside .accent lose a white scrim that covers the
     gradient word underneath. */
  var SPREAD = 5.5;
  function rgbVar(el, name, fallback) {
    var raw = getComputedStyle(el).getPropertyValue(name).trim();
    var parts = raw ? raw.split(',').map(function (x) { return parseInt(x, 10); }) : [];
    return parts.length === 3 && parts.every(function (x) { return x >= 0 && x <= 255; }) ? parts : fallback;
  }
  function mix(a, b, t) { return Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t); }
  function lightUp(el) {
    var words = $$('.w', el);
    if (!words.length) return;
    // screen readers get the whole heading once; the letter spans are visual only
    var spoken = doc.createElement('b');
    spoken.className = 'sr-only';
    spoken.textContent = el.textContent.replace(/\s+/g, ' ').trim();
    el.insertBefore(spoken, el.firstChild);
    var dim = rgbVar(el, '--fill-dim', [222, 214, 232]), lit = rgbVar(el, '--fill-lit', [26, 14, 46]), scrim = rgbVar(el, '--scrim', [255, 255, 255]);
    var letters = [];
    words.forEach(function (word) {
      var text = word.textContent, frag = doc.createDocumentFragment();
      for (var i = 0; i < text.length; i++) {
        var c = doc.createElement('span');
        c.className = 'c'; c.textContent = text.charAt(i);
        frag.appendChild(c); letters.push(c);
      }
      word.textContent = ''; word.appendChild(frag);
      word.setAttribute('aria-hidden', 'true');
    });
    el.classList.add('is-split');
    var kinds = letters.map(function (c) { return c.closest('.accent') ? 'scrim' : c.closest('.outline') ? 'stroke' : 'fill'; });
    if (reduce) {
      var full = 'rgb(' + lit.join(',') + ')';
      letters.forEach(function (c, i) {
        if (kinds[i] === 'scrim') c.style.backgroundImage = 'none';
        else if (kinds[i] === 'stroke') c.style.webkitTextStrokeColor = full;
        else c.style.color = full;
      });
      return;
    }
    var last = -1;
    function paint() {
      var r = el.getBoundingClientRect(), h = vh(), start = h * 0.95, end = h * 0.16;
      var p = clamp01((start - r.top) / (start - end));
      if (atPageEnd()) p = 1;
      if (p === last) return;
      last = p;
      var span = letters.length - 1 + SPREAD;
      for (var i = 0; i < letters.length; i++) {
        var t = clamp01((p * span - i) / SPREAD);
        if (kinds[i] === 'scrim') {
          var col = 'rgba(' + scrim.join(',') + ',' + (0.86 * (1 - t)).toFixed(3) + ')';
          letters[i].style.backgroundImage = 'linear-gradient(' + col + ',' + col + ')';
        } else {
          var rgb = 'rgb(' + mix(dim, lit, t) + ')';
          if (kinds[i] === 'stroke') letters[i].style.webkitTextStrokeColor = rgb; else letters[i].style.color = rgb;
        }
      }
    }
    var schedule = perFrame(paint);
    onScroll(schedule); onResize(schedule); paint();
  }
  $$('.lit').forEach(lightUp);

  /* 5. Process spine: gradient fill follows the scroll, an orb rides its tip, nodes it passes light up */
  (function () {
    var rail = $('#procRail'), spine = $('#procSpine'), orb = $('#procOrb'), dust = $('#procDust');
    if (!rail || !spine) return;
    var steps = $$('.proc-step', rail);
    if (dust && !reduce) {
      var specks = '';
      for (var i = 0; i < 34; i++) {
        specks += '<span style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 100).toFixed(2) + '%;opacity:' + (0.16 + Math.random() * 0.5).toFixed(2) + '"></span>';
      }
      dust.innerHTML = specks;
    }
    if (reduce) { steps.forEach(function (s) { s.classList.add('passed'); }); spine.style.setProperty('--fill', '1'); return; }
    function paint() {
      var r = rail.getBoundingClientRect(), line = vh() * 0.58;
      var f = clamp01((line - r.top) / r.height);
      if (atPageEnd()) f = 1;
      spine.style.setProperty('--fill', f.toFixed(4));
      rail.classList.toggle('is-live', f > 0.002 && f < 0.999);
      if (orb) orb.style.top = (f * r.height).toFixed(1) + 'px';
      var tip = r.top + f * r.height;
      steps.forEach(function (step) {
        var node = $('.proc-node', step).getBoundingClientRect();
        step.classList.toggle('passed', tip >= node.top + node.height / 2 - 1);
      });
    }
    var schedule = perFrame(paint);
    onScroll(schedule); onResize(schedule); paint();
  })();

  /* 6. Results fan: five cards start stacked and fan out while the row scrolls into view (desktop) --- */
  (function () {
    var fan = $('#resFan');
    if (!fan) return;
    var cards = $$('.res-card', fan);
    if (!cards.length) return;
    var n = cards.length, mid = (n - 1) / 2, ROT = [-8, -4, 0, 4, 8], LIFT = [30, 10, -16, 10, 30], on = false;
    var wide = window.matchMedia('(min-width: 901px)');
    function clear() { cards.forEach(function (c) { ['--x', '--y', '--r', '--s'].forEach(function (p) { c.style.removeProperty(p); }); }); }
    function paint() {
      if (!on) return;
      var r = fan.getBoundingClientRect(), h = vh(), start = h * 0.98, end = h * 0.42;
      var g = clamp01((start - r.top) / (start - end));
      if (atPageEnd()) g = 1;
      var e = 1 - Math.pow(1 - g, 3);
      var step = cards[0].offsetWidth + (parseFloat(getComputedStyle(fan).columnGap) || 0);
      for (var i = 0; i < n; i++) {
        var k = i - mid;
        var x = (1 - e) * (-k * step * 0.8);
        var rot = (ROT[i] || 0) * e + (k * 7.5 + 4) * (1 - e);
        var y = (LIFT[i] || 0) * e + (Math.abs(k) * 5 + 18) * (1 - e);
        cards[i].style.setProperty('--x', x.toFixed(1) + 'px');
        cards[i].style.setProperty('--y', y.toFixed(1) + 'px');
        cards[i].style.setProperty('--r', rot.toFixed(2) + 'deg');
        cards[i].style.setProperty('--s', (0.9 + 0.1 * e).toFixed(3));
      }
    }
    function refresh() { on = !reduce && wide.matches; if (!on) { clear(); return; } paint(); }
    cards.forEach(function (c, i) { c.style.zIndex = i + 1; });
    onScroll(perFrame(paint));
    window.addEventListener('resize', refresh);
    whenSettled(refresh);
    refresh();
  })();

  /* 7. Pinned horizontal rail: the section is made as tall as the track is wide; while the sticky
        viewport is pinned, vertical scroll moves the track sideways. Phones stack the cards;
        reduced motion turns it into a swipe row. */
  (function () {
    var rail = $('#wwdRail'), stick = $('#wwdStick'), track = $('#wwdTrack');
    if (!rail || !stick || !track) return;
    var phones = window.matchMedia('(max-width: 767px)'), distance = 0, pinned = false;
    function paint() {
      if (!pinned || distance <= 0) return;
      var r = rail.getBoundingClientRect(), range = rail.offsetHeight - stick.offsetHeight;
      var p = range > 0 ? clamp01((-r.top + (parseFloat(getComputedStyle(stick).top) || 0)) / range) : 0;
      track.style.transform = 'translate3d(' + (-p * distance).toFixed(1) + 'px,0,0)';
    }
    function layout() {
      pinned = !reduce && !phones.matches;
      var swipe = reduce && !phones.matches;
      stick.classList.toggle('is-swipe', swipe);
      track.classList.toggle('is-swipe', swipe);
      if (!pinned) { rail.style.height = ''; track.style.transform = ''; distance = 0; return; }
      track.style.transform = 'none';
      distance = Math.max(0, track.scrollWidth - stick.clientWidth);
      rail.style.height = (stick.offsetHeight + distance) + 'px';
      paint();
    }
    onScroll(perFrame(paint));
    window.addEventListener('resize', layout);
    whenSettled(layout);
    layout();
  })();

  /* 8. Reviews: phones and tablets show a first batch; "Read more reviews" opens the rest.
        When every card is on screen, the button gives way to the link to all reviews on Google. */
  (function () {
    var grid = $('#rvGrid'), more = $('.rv-more'), google = $('.rv-google');
    if (!grid || !more) return;
    function hiddenCards() { return $$('.rv-card', grid).filter(function (c) { return getComputedStyle(c).display === 'none'; }); }
    function sync() {
      var hidden = hiddenCards().length;
      more.hidden = !hidden;
      if (google) google.hidden = !!hidden;
      more.setAttribute('aria-expanded', String(grid.classList.contains('is-expanded')));
    }
    more.addEventListener('click', function () {
      var first = hiddenCards()[0];
      grid.classList.add('is-expanded');
      sync();
      if (first) {
        first.classList.add('in');
        // keyboard and screen-reader users land on the first review that just appeared
        var q = $('blockquote', first); if (q) { q.setAttribute('tabindex', '-1'); q.focus({ preventScroll: true }); }
      }
    });
    window.addEventListener('resize', sync);
    sync();
  })();

  /* 9. Work frames: the wheel scrolls the screenshot inside its browser frame before the page moves;
        the card's glow follows the pointer (--mx / --my). Touch screens scroll the frame natively. */
  if (!window.matchMedia('(hover: none)').matches) {
    $$('.pj--site .pj-view').forEach(function (view) {
      var shot = $('.pj-shot', view);
      if (!shot) return;
      var y = 0;
      view.addEventListener('wheel', function (e) {
        var max = Math.max(0, shot.getBoundingClientRect().height - view.getBoundingClientRect().height);
        if (!max) return;
        var d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
        if ((d > 0 && y >= max) || (d < 0 && y <= 0)) return;
        e.preventDefault();
        y = Math.min(max, Math.max(0, y + d));
        view.classList.add('is-driven');
        shot.style.transform = 'translateY(' + (-y).toFixed(1) + 'px)';
      }, { passive: false });
    });
  }
  $$('.pj--site').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* 10. Mobile pill: hidden while either form is on screen (or the menu is open); a tap goes to the
         nearer of the two forms. */
  (function () {
    var pill = $('#dmtPill'), forms = $$('.lead');
    if (!pill || !forms.length) return;
    if ('IntersectionObserver' in window) {
      var onScreen = [];
      var watcher = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var i = onScreen.indexOf(entry.target);
          if (entry.isIntersecting && i < 0) onScreen.push(entry.target);
          if (!entry.isIntersecting && i >= 0) onScreen.splice(i, 1);
        });
        pill.classList.toggle('is-hidden', onScreen.length > 0);
      }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });
      forms.forEach(function (f) { watcher.observe(f); });
    }
    pill.addEventListener('click', function (e) {
      var best = null, bestDist = Infinity;
      forms.forEach(function (f) { var d = Math.abs(f.getBoundingClientRect().top); if (d < bestDist) { bestDist = d; best = f; } });
      if (!best) return;
      e.preventDefault();
      best.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + best.id);
      var first = best.querySelector('input:not([tabindex="-1"])');
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, reduce ? 0 : 450);
    });
  })();

  /* 11. Hero proof strip: the badge + Google card are zoomed for presence; if the row would overflow
         its width, the zoom steps down until everything fits on one line. */
  (function () {
    var proof = $('.hero-proof'), awards = proof && $('.hero-awards', proof);
    if (!proof || !awards) return;
    var desktop = window.matchMedia('(min-width: 900px)');
    function fit() {
      awards.style.removeProperty('--proof-zoom');
      if (!desktop.matches) return;
      var zoom = parseFloat(getComputedStyle(awards).zoom) || 1;
      while (zoom > 1 && proof.scrollWidth > proof.clientWidth + 1) {
        zoom = Math.round((zoom - 0.04) * 100) / 100;
        awards.style.setProperty('--proof-zoom', String(zoom));
      }
    }
    window.addEventListener('resize', fit);
    whenSettled(fit);
    fit();
  })();

  /* 12. Marquee: duplicated logos exist only for the seamless loop; keep them out of reach. */
  $$('.bx-tile[aria-hidden="true"]').forEach(function (tile) { tile.setAttribute('inert', ''); });
})();
