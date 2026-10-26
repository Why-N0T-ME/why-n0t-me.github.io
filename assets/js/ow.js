/* Overwatch UI blog — 동작 스크립트 (의존성 없음)
   0 예전 PWA 정리  1 설정(테마·전체화면)  2 Categories 메뉴  3 랜덤 글 · 전리품 상자  4 글 상세(목차·진행률·키보드)
   5 본문 다듬기(코드 헤더·표) */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* 0. 예전 Chirpy(PWA)가 남긴 서비스 워커·캐시 정리 ------------------------- */
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (list) {
        list.forEach(function (r) { r.unregister(); });
      }).catch(function () {});
    }
    if (window.caches && window.caches.keys) {
      window.caches.keys().then(function (keys) {
        keys.forEach(function (k) { window.caches.delete(k); });
      }).catch(function () {});
    }
  } catch (e) { /* 지원하지 않는 환경이면 무시 */ }

  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { /* 저장소를 못 쓰는 환경에서는 무시 */ }
    return null;
  }

  /* 1. 설정 ---------------------------------------------------------------- */
  var panel = $('#ow-settings');
  var openBtn = $('#ow-settings-btn');

  function setSettings(open) {
    if (!panel || !openBtn) return;
    panel.hidden = !open;
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      var first = $('button', panel);
      if (first) first.focus();
    }
  }

  if (panel && openBtn) {
    openBtn.addEventListener('click', function () { setSettings(panel.hidden); });
    doc.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target) || openBtn.contains(e.target)) return;
      setSettings(false);
    });
  }

  // 테마
  var themeBtns = $$('[data-theme-set]');
  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    themeBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-set') === mode));
    });
  }
  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  themeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var mode = b.getAttribute('data-theme-set');
      applyTheme(mode);
      store('ow-theme', mode);
    });
  });

  // 전체화면
  var fsRow = $('[data-fs-row]');
  var fsBtn = $('[data-fs-toggle]');
  var canFs = !!(doc.fullscreenEnabled && root.requestFullscreen);
  if (fsRow && fsBtn) {
    if (!canFs) {
      fsRow.hidden = true;
    } else {
      var syncFs = function () {
        var on = !!doc.fullscreenElement;
        fsBtn.setAttribute('aria-pressed', String(on));
        fsBtn.textContent = on ? '끄기' : '켜기';
      };
      fsBtn.addEventListener('click', function () {
        var p = doc.fullscreenElement ? doc.exitFullscreen() : root.requestFullscreen();
        if (p && p.catch) p.catch(function () {});
      });
      doc.addEventListener('fullscreenchange', syncFs);
      syncFs();
    }
  }

  /* 2. Categories 메뉴 ------------------------------------------------------ */
  var dd = $('[data-dd]');
  var ddBtn = $('[data-dd-btn]');
  function setDd(open) {
    if (!dd || !ddBtn) return;
    dd.classList.toggle('is-open', open);
    ddBtn.setAttribute('aria-expanded', String(open));
  }
  if (dd && ddBtn) {
    ddBtn.addEventListener('click', function () { setDd(!dd.classList.contains('is-open')); });
    doc.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) setDd(false);
    });
    dd.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dd.classList.contains('is-open')) {
        setDd(false);
        ddBtn.focus();
        e.stopPropagation();
      }
    });
  }

  /* 3-1. 전리품 상자 — 오늘 공부할 분야 뽑기 -------------------------------- */
  var loot = $('#ow-loot');
  var lootStage = loot ? $('.ow-loot-stage', loot) : null;
  var RARITIES = [
    { key: 'common', name: '일반', weight: 55 },
    { key: 'rare', name: '희귀', weight: 30 },
    { key: 'epic', name: '영웅', weight: 12 },
    { key: 'legendary', name: '전설', weight: 3 },
    { key: 'transcendent', name: '초월', weight: 0 } // 확률로는 나오지 않고, 분야에 rarity 를 적었을 때만 나온다
  ];
  var SPARKS = { common: 0, rare: 6, epic: 10, legendary: 18, transcendent: 30 };
  var lootTimers = [];
  var lootOpener = null;

  function lootIsOpen() { return !!(loot && !loot.hidden); }
  function lootClear() { lootTimers.forEach(function (t) { window.clearTimeout(t); }); lootTimers = []; }
  function lootLater(fn, ms) { lootTimers.push(window.setTimeout(fn, ms)); }
  function lootState(st) { if (lootStage) lootStage.setAttribute('data-state', st); }
  function calm() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function rarityByKey(key) {
    return RARITIES.filter(function (r) { return r.key === key; })[0] || null;
  }

  function pickRarity() {
    var total = RARITIES.reduce(function (n, r) { return n + r.weight; }, 0);
    var x = Math.random() * total;
    for (var i = 0; i < RARITIES.length; i++) {
      x -= RARITIES[i].weight;
      if (x < 0) return RARITIES[i];
    }
    return RARITIES[0];
  }

  // 분야를 비중(weight)대로 뽑고, 방금 나온 분야는 잠시 제외한다
  function pickField() {
    var fields = (window.OW && window.OW.fields) || [];
    if (!fields.length) return null;
    var recent = [];
    try { recent = JSON.parse(store('ow-loot-recent') || '[]'); } catch (e) { recent = []; }
    var pool = fields.filter(function (f) { return recent.indexOf(f.name) < 0; });
    if (!pool.length) pool = fields;
    var w = function (f) { return typeof f.weight === 'number' && f.weight >= 0 ? f.weight : 1; };
    var total = pool.reduce(function (n, f) { return n + w(f); }, 0);
    var x = Math.random() * total;
    var f = pool[pool.length - 1];
    for (var i = 0; i < pool.length; i++) {
      x -= w(pool[i]);
      if (x < 0) { f = pool[i]; break; }
    }
    recent.push(f.name);
    store('ow-loot-recent', JSON.stringify(recent.slice(-Math.min(3, fields.length - 1 || 1))));
    return f;
  }

  // 한 번 뽑기: 분야 + 등급 (분야에 rarity 가 적혀 있으면 그 등급으로 고정)
  function drawLoot() {
    var field = pickField();
    if (!field) return null;
    return { field: field, rarity: rarityByKey(field.rarity) || pickRarity() };
  }

  function lootFill(rarity, field) {
    loot.setAttribute('data-rarity', rarity.key);
    var idx = RARITIES.indexOf(rarity);
    $$('#ow-loot-pips i').forEach(function (p, i) { p.classList.toggle('on', i <= idx); });
    $('#ow-loot-rarity').textContent = rarity.name;
    $('#ow-loot-field').textContent = field.name;
    var face = $('.ow-loot-face', loot);
    face.style.setProperty('--c1', field.from || '#1e6fd9');
    face.style.setProperty('--c2', field.to || '#0a2a5c');
    var sub = $('#ow-loot-sub');
    if (sub) { sub.textContent = field.sub || ''; sub.hidden = !field.sub; }
    var live = $('#ow-loot-live');
    if (live) live.textContent = '';
    lootLater(function () { if (live) live.textContent = rarity.name + ' 등급, 오늘의 공부 분야: ' + field.name; }, 900);
  }

  function lootSparks(rarity) {
    var box = $('.ow-loot-sparks', loot);
    box.textContent = '';
    var n = SPARKS[rarity.key] || 0;
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      var r = 110 + Math.random() * 90;
      var el = doc.createElement('i');
      el.style.setProperty('--dx', Math.round(Math.cos(a) * r) + 'px');
      el.style.setProperty('--dy', Math.round(Math.sin(a) * r * 0.9 - 30) + 'px');
      el.style.setProperty('--d', (Math.random() * 0.12).toFixed(2) + 's');
      el.style.setProperty('--hue', String(Math.floor(Math.random() * 360)));
      box.appendChild(el);
    }
  }

  // opts: { rarity: 'rare', field: '암호학', hold: 'shake' | 'open' | 'reveal' }  (시안 확인용)
  function lootPlay(opts) {
    if (!loot) return;
    opts = opts || {};
    lootClear();
    var fields = (window.OW && window.OW.fields) || [];
    var field = fields.filter(function (f) { return f.name === opts.field; })[0];
    var rarity = rarityByKey(opts.rarity);
    if (field) {
      rarity = rarity || rarityByKey(field.rarity) || pickRarity();
    } else {
      var d = drawLoot();
      if (!d) return;
      field = d.field;
      rarity = rarity || d.rarity;
    }
    lootFill(rarity, field);
    lootSparks(rarity);

    if (calm() || opts.hold === 'reveal') { lootState('reveal'); focusAgain(); return; }
    var shakeMs = rarity.key === 'transcendent' ? 950 : 560; // 초월은 뜸을 조금 더 들인다
    lootState('idle');
    lootLater(function () {
      lootState('shake');
      if (opts.hold === 'shake') return;
      lootLater(function () {
        lootState('open');
        if (opts.hold === 'open') return;
        lootLater(function () { lootState('reveal'); focusAgain(); }, 260);
      }, shakeMs);
    }, 340);
  }

  function focusAgain() {
    var b = $('[data-loot-again]', loot);
    if (b && loot.contains(doc.activeElement) && doc.activeElement !== b) {
      lootLater(function () { b.focus(); }, 380);
    }
  }

  function openLoot(opts, opener) {
    if (!loot) return;
    lootOpener = opener || doc.activeElement;
    setSettings(false);
    loot.hidden = false;
    root.classList.add('ow-loot-lock');
    void loot.offsetWidth; // 페이드 인을 위해 레이아웃 확정
    loot.classList.add('is-open');
    var c = $('.ow-loot-close', loot);
    if (c) c.focus();
    lootPlay(opts);
  }

  function closeLoot() {
    if (!lootIsOpen()) return;
    lootClear();
    loot.classList.remove('is-open');
    root.classList.remove('ow-loot-lock');
    window.setTimeout(function () { if (!loot.classList.contains('is-open')) loot.hidden = true; }, 230);
    if (lootOpener && lootOpener.focus) { try { lootOpener.focus(); } catch (e) { /* 무시 */ } }
  }

  if (loot) {
    $$('[data-loot-open]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); openLoot(null, a); });
    });
    $$('[data-loot-close]', loot).forEach(function (el) { el.addEventListener('click', closeLoot); });
    var again = $('[data-loot-again]', loot);
    if (again) again.addEventListener('click', function () { lootPlay(); });
    // 포커스가 상자 밖으로 나가지 않게 가둔다
    loot.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var items = $$('button, a[href]', loot).filter(function (el) {
        return !el.hidden && window.getComputedStyle(el).visibility !== 'hidden';
      });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.OWLoot = { open: openLoot, close: closeLoot, draw: drawLoot };
  }

  /* 3. 랜덤 글 -------------------------------------------------------------- */
  var ow = window.OW || { base: '', posts: [] };
  function norm(path) {
    var p = path;
    try { p = decodeURIComponent(path); } catch (e) { /* 그대로 사용 */ }
    return p.replace(/index\.html$/, '').replace(/\/+$/, '');
  }
  $$('[data-random]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var here = norm(location.pathname);
      var list = (ow.posts || []).filter(function (u) { return norm((ow.base || '') + u) !== here; });
      if (!list.length) return; // 후보가 없으면 기본 링크(전체 글)로 이동
      e.preventDefault();
      location.href = (ow.base || '') + list[Math.floor(Math.random() * list.length)];
    });
  });

  /* 키보드: ESC = 설정, ← → = 이전/다음 글 */
  var article = $('#ow-article');
  doc.addEventListener('keydown', function (e) {
    var t = e.target;
    var typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (e.key === 'Escape') {
      if (lootIsOpen()) { closeLoot(); return; }
      if (dd && dd.classList.contains('is-open')) { setDd(false); return; }
      if (panel) {
        var willOpen = panel.hidden;
        setSettings(willOpen);
        if (!willOpen) openBtn.focus();
      }
      return;
    }
    if (!article || typing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var url = null;
    if (e.key === 'ArrowLeft') url = article.getAttribute('data-prev');
    else if (e.key === 'ArrowRight') url = article.getAttribute('data-next');
    if (url) location.href = url;
  });

  /* 4. 글 상세: 목차 · 읽은 정도 -------------------------------------------- */
  if (article) {
    var ring = $('#ow-ring');
    var ringTxt = $('#ow-ring-txt');
    var toc = $('#ow-toc');
    var tocList = $('#ow-toc-list');
    var C = 188.5;

    var heads = $$('h2, h3', article);
    var links = [];

    if (heads.length >= 2 && toc && tocList) {
      var used = {};
      heads.forEach(function (h, i) {
        if (!h.id || used[h.id]) h.id = 'ow-h-' + (i + 1);
        used[h.id] = true;
        var li = doc.createElement('li');
        if (h.tagName === 'H3') li.className = 'is-sub';
        var a = doc.createElement('a');
        a.href = '#' + encodeURIComponent(h.id);
        a.textContent = h.textContent.replace(/\s+/g, ' ').trim();
        li.appendChild(a);
        tocList.appendChild(li);
        links.push(a);
      });
      toc.hidden = false;
    }

    var ticking = false;
    function update() {
      ticking = false;
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight * 0.6;
      var done = total > 0 ? Math.min(1, Math.max(0, (window.innerHeight * 0.3 - rect.top) / total)) : 1;
      if (ring) ring.setAttribute('stroke-dashoffset', String(C * (1 - done)));
      if (ringTxt) ringTxt.textContent = Math.round(done * 100) + '%';

      if (links.length) {
        var cur = 0;
        for (var i = 0; i < heads.length; i++) {
          if (heads[i].getBoundingClientRect().top <= 140) cur = i; else break;
        }
        links.forEach(function (a, i) {
          var on = i === cur && rect.top < 140;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        });
      }
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', update);
    update();
  }

  /* 5. 본문 다듬기: 코드 헤더 · 복사 · 표 ---------------------------------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = doc.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      doc.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      doc.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  $$('.ow-typo div.highlighter-rouge').forEach(function (box) {
    if ($('.ow-code-head', box)) return;
    var file = box.getAttribute('file') || box.getAttribute('data-file');
    var m = /(?:^|\s)language-([^\s]+)/.exec(box.className);
    var lang = m ? m[1] : '';
    var label = file || (lang && lang !== 'plaintext' ? lang : 'text');

    var head = doc.createElement('div');
    head.className = 'ow-code-head';
    var span = doc.createElement('span');
    span.className = 'ow-code-label';
    span.textContent = label;
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'ow-code-copy';
    btn.textContent = '복사';
    btn.setAttribute('aria-label', label + ' 코드 복사');
    var timer = null;
    btn.addEventListener('click', function () {
      var src = $('.rouge-code pre', box) || $('pre', box);
      var text = src ? src.textContent.replace(/\n$/, '') : '';
      copyText(text).then(function () {
        btn.textContent = '복사됨';
      }, function () {
        btn.textContent = '실패';
      }).then(function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { btn.textContent = '복사'; }, 1600);
      });
    });
    head.appendChild(span);
    head.appendChild(btn);
    box.insertBefore(head, box.firstChild);
  });

  $$('.ow-typo table').forEach(function (tb) {
    if (tb.classList.contains('rouge-table') || tb.parentNode.classList.contains('ow-table')) return;
    var wrap = doc.createElement('div');
    wrap.className = 'ow-table';
    tb.parentNode.insertBefore(wrap, tb);
    wrap.appendChild(tb);
  });
})();
