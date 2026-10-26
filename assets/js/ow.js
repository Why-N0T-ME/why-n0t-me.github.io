/* Overwatch UI blog — 동작 스크립트 (의존성 없음)
   0 예전 PWA 정리  1 설정(테마·전체화면)  2 Categories 메뉴  3 랜덤 글  4 글 상세(목차·진행률·키보드)
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
