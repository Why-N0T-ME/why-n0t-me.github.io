/* 연구 노트형 블로그 스크립트 (의존성 없음)
   1. 예전 서비스 워커 정리  2. 화면 모드 버튼  3. 히어로·About 애니메이션 시작
   4. 글의 목차와 현재 위치  5. 코드 블록 머리글·복사, 표 감싸기 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* 1. 예전 Chirpy(PWA)가 남긴 서비스 워커·캐시 정리 ------------------------- */
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

  /* 2. 화면 모드: 라이트 → 다크 → 다크 그린 순으로 바뀝니다 ---------------- */
  var themeBtn = $('#theme-btn');
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var MODES = ['light', 'dark', 'green'];
  var MODE_NAME = { light: '라이트', dark: '다크', green: '다크 그린' };
  var META_COLOR = { light: '#fbfbfc', dark: '#0e1116', green: '#0c1713' };   // 주소창 색
  var metas = $$('meta[name="theme-color"]');
  metas.forEach(function (m) { m.setAttribute('data-orig', m.getAttribute('content') || ''); });

  function currentMode() {
    var t = root.getAttribute('data-theme');
    if (MODES.indexOf(t) !== -1) return t;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }
  function syncTheme() {
    var forced = root.getAttribute('data-theme');
    metas.forEach(function (m) {
      m.setAttribute('content', MODES.indexOf(forced) !== -1 ? META_COLOR[forced] : m.getAttribute('data-orig'));
    });
    if (!themeBtn) return;
    var cur = currentMode(), next = MODES[(MODES.indexOf(cur) + 1) % MODES.length];
    themeBtn.setAttribute('data-mode', cur);
    themeBtn.setAttribute('aria-label', '화면 모드 전환 (지금: ' + MODE_NAME[cur] + ')');
    themeBtn.setAttribute('title', MODE_NAME[cur] + ' → ' + MODE_NAME[next]);
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = MODES[(MODES.indexOf(currentMode()) + 1) % MODES.length];
      root.setAttribute('data-theme', next);
      try { window.localStorage.setItem('theme', next); } catch (e) { /* 저장소를 못 쓰면 이번 방문에만 적용 */ }
      syncTheme();
    });
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', syncTheme);
  syncTheme();

  /* 3. 히어로 애니메이션 ---------------------------------------------------- */
  var hero = $('[data-art]');
  if (hero && window.HeroArt) {
    try { window.HeroArt.init(hero); } catch (e) { /* 애니메이션이 없어도 페이지는 정상 */ }
  }

  /* 3-2. About 상단의 배경 애니메이션 ---------------------------------------- */
  var aboutHero = $('[data-about-hero]');
  if (aboutHero && window.AboutArt) {
    try { window.AboutArt.init(aboutHero); } catch (e) { /* 그림이 없어도 소개 글은 정상 */ }
  }

  /* 4. 글: 목차와 현재 위치 ------------------------------------------------- */
  var article = $('#article');
  var toc = $('#toc');
  var tocList = $('#toc-list');

  if (article && toc && tocList) {
    var heads = $$('h2, h3', article);
    var links = [];
    var used = {};

    heads.forEach(function (h, i) {
      if (!h.id || used[h.id]) h.id = 'section-' + (i + 1);
      used[h.id] = true;
      var li = doc.createElement('li');
      if (h.tagName === 'H3') li.className = 'sub';
      var a = doc.createElement('a');
      a.href = '#' + encodeURIComponent(h.id);
      a.textContent = h.textContent.replace(/\s+/g, ' ').trim();
      li.appendChild(a);
      tocList.appendChild(li);
      links.push(a);
    });

    // 좁은 화면에서는 접어 두고, 넓은 화면에서는 항상 펼쳐 둔다
    var narrow = window.matchMedia ? window.matchMedia('(max-width: 960px)') : null;
    function syncToc() { toc.open = !(narrow && narrow.matches); }
    syncToc();
    if (narrow && narrow.addEventListener) narrow.addEventListener('change', syncToc);
    tocList.addEventListener('click', function (e) {
      if (narrow && narrow.matches && e.target.closest && e.target.closest('a')) toc.open = false;
    });

    var ticking = false;
    var current = -1;
    function update() {
      ticking = false;
      var cur = -1;
      for (var i = 0; i < heads.length; i++) {
        if (heads[i].getBoundingClientRect().top <= 120) cur = i; else break;
      }
      if (cur === current) return;
      current = cur;
      links.forEach(function (a, i) {
        var on = i === cur;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      // 목차가 길어서 스크롤되는 경우, 현재 항목이 보이도록 목차 안에서만 움직인다
      if (cur >= 0 && toc.scrollHeight > toc.clientHeight) {
        var a2 = links[cur];
        var top = a2.offsetTop - toc.offsetTop;
        if (top < toc.scrollTop || top + a2.offsetHeight > toc.scrollTop + toc.clientHeight) {
          toc.scrollTop = Math.max(0, top - toc.clientHeight / 2);
        }
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

  /* 5. 본문 다듬기: 코드 머리글 · 복사 · 표 --------------------------------- */
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

  $$('.prose div.highlighter-rouge').forEach(function (box) {
    if ($('.code-head', box)) return;
    var file = box.getAttribute('file') || box.getAttribute('data-file');
    var m = /(?:^|\s)language-([^\s]+)/.exec(box.className);
    var lang = m ? m[1] : '';
    var label = file || (lang && lang !== 'plaintext' ? lang : 'text');

    var head = doc.createElement('div');
    head.className = 'code-head';
    var span = doc.createElement('span');
    span.className = 'code-label';
    span.textContent = label;
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
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

  $$('.prose table').forEach(function (tb) {
    if (tb.classList.contains('rouge-table')) return;
    if (tb.parentNode.classList.contains('table-wrap')) return;
    var wrap = doc.createElement('div');
    wrap.className = 'table-wrap';
    tb.parentNode.insertBefore(wrap, tb);
    wrap.appendChild(tb);
    // 표가 화면보다 넓어서 가로로 스크롤될 때만 키보드로 닿게 한다
    var mark = function () {
      if (wrap.scrollWidth > wrap.clientWidth + 1) {
        wrap.tabIndex = 0;
        wrap.setAttribute('role', 'region');
        wrap.setAttribute('aria-label', '표 (가로로 스크롤)');
      } else {
        wrap.removeAttribute('tabindex');
        wrap.removeAttribute('role');
        wrap.removeAttribute('aria-label');
      }
    };
    mark();
    window.addEventListener('resize', mark);
    window.addEventListener('load', mark);
  });
})();
