/* 잡동사니 카테고리 상단: 수식이 나타났다 사라지는 배경 (의존성 없음)

   - 여러 수식이 제각각 다른 박자로 서서히 나타나고, 잠깐 머물다가, 서서히 사라집니다.
     사라진 자리에는 얼마 뒤 다른 수식이 다른 위치에 나타납니다. (같은 수식이 한 번에 두 개 보이지는 않습니다)
   - 제목·설명 글과 겹치는 자리에는 수식이 놓이지 않습니다. 화면 크기가 바뀌어도 글 위치를 다시 재서 피합니다.
   - 수식은 MathJax 가 아니라 아래의 작은 변환기로 그립니다. (이 페이지에서는 MathJax 를 받지 않아도 됩니다)
     새 수식은 FORMULAS 에 TeX 비슷한 문장으로 한 줄 추가하면 됩니다. 지원하는 문법은 tex() 위의 표를 보세요.
   - prefers-reduced-motion 이면 움직이지 않고 수식이 놓인 정지 화면 한 장만 보여 줍니다.
   - 일시정지 버튼과 화면 밖(스크롤) 정지는 홈·About 의 배경과 같은 방식입니다.

   마크업: _layouts/category.html 의 [data-math-hero] 안에
     [data-math-art]    수식이 놓이는 층
     [data-math-toggle] 일시정지 버튼
     [data-math-keep]   수식이 피해야 할 글·버튼 */
(function () {
  'use strict';

  /* ======================================================================
     1. 수식 목록 (TeX 비슷한 문장)
     ====================================================================== */
  var FORMULAS = [
    'e^{i\\pi} + 1 = 0',
    '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}',
    '\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}',
    'a^2 + b^2 = c^2',
    'e^{ix} = \\cos x + i\\sin x',
    '\\sin^2 x + \\cos^2 x = 1',
    'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    '\\lim_{n\\to\\infty}\\left(1 + \\frac{1}{n}\\right)^{n} = e',
    '\\zeta(s) = \\sum_{n=1}^{\\infty} n^{-s}',
    '\\prod_{p} \\frac{1}{1 - p^{-s}} = \\zeta(s)',
    '\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}',
    'f(x) = \\sum_{k=0}^{\\infty} \\frac{f^{(k)}(a)}{k!}(x - a)^k',
    '\\int_a^b f\'(x)\\,dx = f(b) - f(a)',
    '\\frac{d}{dx}\\int_a^x f(t)\\,dt = f(x)',
    '\\int_0^1 x^n\\,dx = \\frac{1}{n+1}',
    '\\Delta u = \\frac{\\partial^2 u}{\\partial x^2} + \\frac{\\partial^2 u}{\\partial y^2}',
    'n! \\sim \\sqrt{2\\pi n}\\left(\\frac{n}{e}\\right)^{n}',
    'C(n,k) = \\frac{n!}{k!\\,(n-k)!}',
    'F_n = F_{n-1} + F_{n-2}',
    'V - E + F = 2',
    '\\det(AB) = \\det A \\cdot \\det B',
    '\\cos\\theta = \\frac{\\langle u, v\\rangle}{\\lVert u\\rVert\\,\\lVert v\\rVert}',
    '\\sqrt{2} \\notin \\mathbb{Q}',
    'P(A \\mid B) = \\frac{P(B \\mid A)\\,P(A)}{P(B)}',
    '\\mathrm{Var}(X) = E[X^2] - E[X]^2',
    'H(X) = -\\sum_{x} p(x)\\log_2 p(x)',
    '\\forall \\varepsilon > 0\\ \\exists \\delta > 0',
    'f : S \\to T,\\quad g \\circ f = \\mathrm{Id}_S',
    '\\ker f = \\{ x \\in G \\mid f(x) = e \\}',
    'G / \\ker\\varphi \\cong \\mathrm{Im}\\,\\varphi',
    '|G| = |H|\\,[G : H]',
    '\\gcd(a,b)\\cdot\\mathrm{lcm}(a,b) = ab',
    'a^{p-1} \\equiv 1 \\pmod{p}',
    'a^{\\varphi(n)} \\equiv 1 \\pmod{n}',
    '\\varphi(n) = n\\prod_{p \\mid n}\\left(1 - \\frac{1}{p}\\right)',
    'm^{ed} \\equiv m \\pmod{n}',
    '(\\mathbb{Z}/p\\mathbb{Z})^{\\times} \\cong C_{p-1}',
    'g^{x} \\equiv h \\pmod{p}',
    'y^2 = x^3 + ax + b',
    'x^n + y^n \\ne z^n \\quad (n > 2)'
  ];

  /* ======================================================================
     2. 작은 TeX 변환기 (그림용: 수식 한 줄을 HTML 로 바꿉니다)

     지원 문법
       ^x ^{..}  _x _{..}        위·아래 첨자 (둘 다 있으면 위아래로 쌓음)
       \frac{a}{b}  \sqrt{a}     분수, 제곱근
       \sum \prod \lim           아래·위 한계를 위아래로 (\sum_{k=1}^{n})
       \int \oint                한계를 옆에 위아래로
       \mathbb{R}  \mathrm{..}  \mathbf{..}
       \pmod{p}  \left \right    (괄호를 세로로 늘려 그림)
       \, \; \ \quad             간격
       그리스 문자, 연산자, 관계 기호 → SYM·BIN·REL 표
       그 밖의 글자: 영문은 기울임, 숫자와 기호는 그대로
     ====================================================================== */
  var SYM = {                                   // 그냥 글자처럼 놓이는 기호 (영문 기호는 기울임)
    alpha: ['α', 1], beta: ['β', 1], gamma: ['γ', 1], delta: ['δ', 1], varepsilon: ['ε', 1], epsilon: ['ε', 1],
    zeta: ['ζ', 1], eta: ['η', 1], theta: ['θ', 1], lambda: ['λ', 1], mu: ['μ', 1], nu: ['ν', 1], xi: ['ξ', 1],
    pi: ['π', 1], rho: ['ρ', 1], sigma: ['σ', 1], tau: ['τ', 1], varphi: ['φ', 1], chi: ['χ', 1], psi: ['ψ', 1],
    omega: ['ω', 1],
    Gamma: ['Γ'], Delta: ['Δ'], Theta: ['Θ'], Lambda: ['Λ'], Xi: ['Ξ'], Pi: ['Π'], Sigma: ['Σ'], Phi: ['Φ'],
    Psi: ['Ψ'], Omega: ['Ω'],
    infty: ['∞'], partial: ['∂'], nabla: ['∇'], emptyset: ['∅'], ell: ['ℓ'], hbar: ['ħ'],
    ldots: ['…'], cdots: ['⋯'], forall: ['∀'], exists: ['∃'], prime: ['′']
  };
  var BIN = { pm: '±', mp: '∓', times: '×', cdot: '·', circ: '∘', cup: '∪', cap: '∩', setminus: '∖', oplus: '⊕', otimes: '⊗' };
  var REL = {
    in: '∈', notin: '∉', ni: '∋', subset: '⊂', subseteq: '⊆', supset: '⊃', le: '≤', leq: '≤', ge: '≥', geq: '≥',
    ne: '≠', neq: '≠', approx: '≈', equiv: '≡', cong: '≅', sim: '∼', propto: '∝', to: '→', mapsto: '↦',
    Rightarrow: '⇒', Leftrightarrow: '⇔', iff: '⇔', mid: '∣', perp: '⊥'
  };
  var FN = { sin: 1, cos: 1, tan: 1, log: 1, ln: 1, exp: 1, det: 1, gcd: 1, ker: 1, dim: 1, max: 1, min: 1, sup: 1, inf: 1, arg: 1 };
  var BB = { R: 'ℝ', C: 'ℂ', Z: 'ℤ', N: 'ℕ', Q: 'ℚ', P: 'ℙ', H: 'ℍ' };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

  function tex(src) {
    var T = [], i = 0, m, p = 0;
    while (i < src.length) {                    // 토큰으로 자르기
      var c = src.charAt(i);
      if (c === '\\') {
        m = /^\\([A-Za-z]+)/.exec(src.slice(i));
        if (m) { T.push({ k: 'cmd', v: m[1] }); i += m[0].length; }
        else { T.push({ k: 'cmd', v: src.charAt(i + 1) }); i += 2; }
      } else if (c === '{' || c === '}' || c === '^' || c === '_') { T.push({ k: c }); i++; }
      else if (c === ' ') { i++; }
      else { T.push({ k: 'ch', v: c }); i++; }
    }

    function esc(s) { return s.replace(/[&<>]/g, function (x) { return ESC[x]; }); }
    function bin(s, prev) { return { h: prev ? '<span class="bin">' + s + '</span>' : s, o: false }; }
    function rel(s) { return { h: '<span class="rel">' + s + '</span>', o: false }; }
    function sp(cls) { return { h: '<span class="' + cls + '"></span>', o: null }; }   // o:null → 앞의 상태 유지

    function group(up) {                        // {...} 또는 토큰 하나
      var t = T[p];
      if (t && t.k === '{') { p++; var h = seq(up, true); p++; return h; }
      if (!t) return '';
      return atom(up, false).h;
    }
    function scripts() {                        // 한계 읽기: 아래(_)·위(^) 순서는 아무래도 됨
      var lo = '', hi = '';
      while (T[p] && (T[p].k === '^' || T[p].k === '_')) {
        var k = T[p++].k, g = group(false);
        if (k === '^') hi = g; else lo = g;
      }
      return { lo: lo, hi: hi };
    }
    function big(sym, cls) {                    // \sum \prod \lim : 위아래로 쌓기
      var s = scripts(), h = '<span class="' + cls + '">' + sym + '</span>';
      if (s.lo || s.hi) h = '<span class="lm"><span>' + (s.hi || '&nbsp;') + '</span>' + h + '<span>' + (s.lo || '&nbsp;') + '</span></span>';
      return { h: h, o: false };
    }
    function chr(c, up, prev) {
      if (/[A-Za-z]/.test(c)) return { h: up ? c : '<i>' + c + '</i>', o: true };
      if (/[0-9.]/.test(c)) return { h: c, o: true };
      switch (c) {
        case '+': return bin('+', prev);
        case '-': return bin('−', prev);
        case '=': case '<': case '>': return rel(esc(c));
        case ',': return { h: '<span class="cm">,</span>', o: false };
        case ':': return { h: '<span class="cl">:</span>', o: false };
        case '(': case '[': return { h: c, o: false };
        case ')': case ']': return { h: c, o: true };
        case '|': return { h: '|', o: null };
        case '\'': return { h: '<span class="pr">′</span>', o: true };
        case '/': return { h: '/', o: false };
        default: return { h: esc(c), o: true };
      }
    }
    function cmd(n, up, prev) {
      var h, a, b;
      if (n === 'forall' || n === 'exists') return { h: SYM[n][0] + '<span class="th"></span>', o: false };
      if (SYM[n]) return { h: SYM[n][1] && !up ? '<i>' + SYM[n][0] + '</i>' : SYM[n][0], o: true };
      if (BIN[n]) return bin(BIN[n], prev);
      if (REL[n]) return rel(REL[n]);
      if (FN[n]) return { h: '<span class="fn">' + n + '</span>', o: false };
      switch (n) {
        case 'frac': a = group(false); b = group(false); return { h: '<span class="fr"><span>' + a + '</span><span>' + b + '</span></span>', o: true };
        case 'sqrt': a = group(false); return { h: '<span class="sq"><span class="rt">' + a + '</span></span>', o: true };
        case 'sum': return big('∑', 'bg');
        case 'prod': return big('∏', 'bg');
        case 'lim': return big('lim', 'fn');
        case 'int': case 'oint':
          h = '<span class="ig">' + (n === 'int' ? '∫' : '∮') + '</span>';
          a = scripts();
          if (a.lo || a.hi) h += '<span class="sl"><span>' + (a.hi || '&nbsp;') + '</span><span>' + (a.lo || '&nbsp;') + '</span></span>';
          return { h: h, o: false };
        case 'mathbb': a = group(true); return { h: BB[a] || '<b>' + a + '</b>', o: true };
        case 'mathrm': return { h: group(true), o: true };
        case 'mathbf': return { h: '<b>' + group(true) + '</b>', o: true };
        case 'pmod': a = group(false); return { h: '<span class="q7"></span>(mod&nbsp;' + a + ')', o: true };
        case 'left': case 'right': a = atom(up, prev); return { h: '<span class="dl">' + a.h + '</span>', o: n === 'right' };
        case 'langle': return { h: '⟨', o: false };
        case 'rangle': return { h: '⟩', o: true };
        case 'lVert': return { h: '‖', o: false };
        case 'rVert': return { h: '‖', o: true };
        case '{': return { h: '{', o: false };
        case '}': return { h: '}', o: true };
        case ',': return sp('th');
        case ';': return sp('mh');
        case ' ': return sp('mh');
        case 'quad': return sp('q1');
        default: return { h: esc(n), o: true };    // 모르는 명령은 이름 그대로 (실수를 눈에 띄게)
      }
    }
    function atom(up, prev) {
      var t = T[p++];
      if (t.k === '{') { var h = seq(up, true); p++; return { h: h, o: true }; }
      if (t.k === 'ch') return chr(t.v, up, prev);
      if (t.k === 'cmd') return cmd(t.v, up, prev);
      return { h: '', o: null };                // 짝 없는 ^ _ 는 무시
    }
    function seq(up, inBrace) {
      var out = '', prev = false;
      while (p < T.length) {
        if (T[p].k === '}') { if (inBrace) break; p++; continue; }
        var r = atom(up, prev), h = r.h, o = r.o;
        if (T[p] && (T[p].k === '^' || T[p].k === '_')) {      // 이 글자 뒤에 붙는 첨자
          var s = scripts();
          if (s.hi && s.lo) h += '<span class="ss"><span>' + s.hi + '</span><span>' + s.lo + '</span></span>';
          else if (s.hi) h += '<sup>' + s.hi + '</sup>';
          else if (s.lo) h += '<sub>' + s.lo + '</sub>';
          o = true;
        }
        out += h;
        if (o !== null) prev = o;
      }
      return out;
    }
    return seq(false, false);
  }

  /* ======================================================================
     3. 작은 도구들
     ====================================================================== */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function rects(el) {                          // 글은 줄마다 따로, 버튼은 상자 하나로
    var out = [], list, i;
    if (el.tagName === 'BUTTON') list = [el.getBoundingClientRect()];
    else {
      var r = document.createRange();
      r.selectNodeContents(el);
      list = r.getClientRects();
    }
    for (i = 0; i < list.length; i++) if (list[i].width > 0 && list[i].height > 0) out.push(list[i]);
    return out;
  }
  function hit(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }

  /* ======================================================================
     4. 화면에 붙이기
     ====================================================================== */
  var IN = 1.8, OUT = 2.0;                      // 나타나는 시간, 사라지는 시간 (초)
  var PEAK = [0, 0.7, 0.56, 0.4];              // 크기(1~3)별 가장 진한 정도: 클수록 옅게

  function init(root) {
    var host = root.querySelector('[data-math-art]');
    var toggle = root.querySelector('[data-math-toggle]');
    if (!host) return null;

    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var html = FORMULAS.map(tex);
    var W = 0, H = 0, slots = [], deck = [], rnd = Math.random;
    var PAD = 18;                               // 글·다른 수식과 띄울 간격(px)

    function nextFormula() {                    // 섞은 순서대로, 지금 보이는 것과는 겹치지 않게
      for (var tries = 0; tries < 6; tries++) {
        if (!deck.length) {
          for (var i = 0; i < html.length; i++) deck.push(i);
          for (i = deck.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
        }
        var f = deck.pop();
        if (!slots.some(function (s) { return s.f === f && s.state > 0; })) return f;
      }
      return Math.floor(rnd() * html.length);
    }
    function keepBoxes() {                      // 수식이 피해야 할 자리 (host 기준 좌표)
      var hb = host.getBoundingClientRect(), out = [];
      Array.prototype.forEach.call(root.querySelectorAll('[data-math-keep]'), function (el) {
        rects(el).forEach(function (r) {
          out.push({ x: r.left - hb.left - PAD, y: r.top - hb.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
        });
      });
      return out;
    }
    function alive(except) {
      return slots.filter(function (s) { return s !== except && s.state > 0; });
    }
    /* 놓을 자리 고르기: 후보를 여러 개 뽑아 글·다른 수식과 안 겹치는 것 중 가장 한가한 곳 */
    function place(s, size, f) {
      var el = s.el, keep = keepBoxes(), others = alive(s), best = null, bestD = -1;
      el.className = 'mf s' + size;
      el.innerHTML = html[f];
      var w = el.offsetWidth, h = el.offsetHeight;
      if (w > W - 16 || h > H - 20) return false;
      for (var k = 0; k < 14; k++) {
        var b = { x: 8 + rnd() * (W - w - 16), y: 10 + rnd() * (H - h - 20), w: w, h: h }, ok = true, d = 1e9, i;
        for (i = 0; i < keep.length && ok; i++) if (hit(b, keep[i])) ok = false;
        for (i = 0; i < others.length && ok; i++) {
          var o = others[i];
          if (hit(b, { x: o.x - 12, y: o.y - 14, w: o.w + 24, h: o.h + 28 })) ok = false;
          else d = Math.min(d, Math.hypot(b.x + w / 2 - o.x - o.w / 2, b.y + h / 2 - o.y - o.h / 2));
        }
        if (ok && d > bestD) { best = b; bestD = d; }
      }
      if (!best) return false;
      s.x = best.x; s.y = best.y; s.w = w; s.h = h; s.f = f; s.size = size;
      return true;
    }
    function pickSize() { var r = rnd(); return r < 0.4 ? 1 : r < 0.8 ? 2 : 3; }

    /* 한 칸의 일생: 0 쉼 → 1 나타남 → 2 머묾 → 3 사라짐 → 다시 0 */
    function spawn(s, age) {
      var size = pickSize(), f = nextFormula(), ok = false;
      s.state = 0;                              // 자리를 고르는 동안 자기 자신은 빼고 계산
      for (var t = 0; t < 4 && !ok; t++) {
        ok = place(s, size, f);
        if (!ok) { size = Math.max(1, size - 1); if (t > 1) f = nextFormula(); }
      }
      if (!ok) { s.state = 0; s.age = 0; s.wait = 0.6; s.el.style.opacity = 0; return; }
      s.hold = 2.4 + rnd() * 3.2;
      s.state = 1; s.age = 0;
      s.life = IN + s.hold + OUT;
      if (age) setAge(s, age);
      paint(s);
    }
    function setAge(s, a) {
      s.age = a;
      s.state = a < IN ? 1 : a < IN + s.hold ? 2 : 3;
    }
    function paint(s) {
      var a = s.age, o;
      if (s.state === 1) o = smooth(a / IN);
      else if (s.state === 2) o = 1;
      else o = 1 - smooth((a - IN - s.hold) / OUT);
      var drift = reduce ? 0 : 6 - 12 * clamp(a / s.life, 0, 1);       // 살짝 떠오르는 움직임
      s.el.style.opacity = (o * PEAK[s.size]).toFixed(3);
      s.el.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + (s.y + drift).toFixed(1) + 'px)';
    }
    function tick(dt) {
      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        if (s.state === 0) {
          s.wait -= dt;
          if (s.wait <= 0) spawn(s, 0);
          continue;
        }
        s.age += dt;
        if (s.age >= s.life) {                  // 끝: 잠시 쉬었다가 다른 수식으로
          s.state = 0; s.wait = 0.3 + rnd() * 2.2; s.el.style.opacity = 0;
          continue;
        }
        s.state = s.age < IN ? 1 : s.age < IN + s.hold ? 2 : 3;
        paint(s);
      }
    }

    /* --- 칸 만들기: 크기에 맞춰 개수를 정하고, 처음부터 일부는 이미 떠 있게 --- */
    function build() {
      var hb = host.getBoundingClientRect();
      W = hb.width; H = hb.height;
      host.textContent = '';
      slots = []; deck = [];
      if (W < 120 || H < 60) return;
      var n = clamp(Math.round(W * H / 26000), 4, 12);
      for (var i = 0; i < n; i++) {
        var el = document.createElement('span');
        el.className = 'mf';
        host.appendChild(el);
        slots.push({ el: el, state: 0, age: 0, wait: 0, hold: 0, life: 1, x: 0, y: 0, w: 0, h: 0, f: -1, size: 1 });
      }
      slots.forEach(function (s, i) {
        if (reduce) { spawn(s, 0); if (s.state) { setAge(s, IN + 0.01); paint(s); } return; }
        if (rnd() < 0.3) { s.wait = rnd() * 2.5; return; }
        spawn(s, 0);
        if (s.state) { setAge(s, rnd() * s.life * 0.98); paint(s); }
      });
    }

    /* --- 시간 흐름 --- */
    var raf = 0, last = 0, paused = reduce, visible = true;
    function frame(now) {
      raf = 0;
      if (paused || !visible) return;
      var dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      tick(dt);
      raf = requestAnimationFrame(frame);
    }
    function play() {
      if (raf || paused || !visible || reduce) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function label() {
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      toggle.setAttribute('aria-label', paused ? '배경 애니메이션 재생' : '배경 애니메이션 일시정지');
      toggle.setAttribute('data-state', paused ? 'paused' : 'playing');
    }
    if (toggle) {
      if (reduce) toggle.hidden = true;
      toggle.addEventListener('click', function () {
        paused = !paused; label();
        if (paused) pause(); else play();
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) play(); else pause();
      }, { threshold: 0 }).observe(root);
    }
    var rz = null;
    window.addEventListener('resize', function () {
      if (rz) window.cancelAnimationFrame(rz);
      rz = window.requestAnimationFrame(function () { rz = null; build(); });
    });
    if (document.fonts && document.fonts.ready) {          // 글꼴이 바뀌면 글 위치도 바뀌므로 한 번 다시 배치
      document.fonts.ready.then(function () { if (W) build(); }).catch(function () {});
    }

    build();
    label();
    play();

    var api = {
      slots: function () { return slots; },
      advance: function (sec) { for (var t = 0; t < sec; t += 1 / 30) tick(1 / 30); },      // 테스트·캡처용
      rebuild: build,
      seed: function (fn) { rnd = fn; },
      formulas: FORMULAS, html: html
    };
    window.MathArt.last = api;
    return api;
  }

  window.MathArt = { init: init, tex: tex, formulas: FORMULAS };

  /* main.js 를 고치지 않아도 되도록 스스로 시작합니다 (defer 스크립트라 문서는 이미 읽힌 뒤입니다) */
  var hero = document.querySelector('[data-math-hero]');
  if (hero) {
    try { init(hero); } catch (e) { /* 그림이 없어도 목록은 정상 */ }
  }
})();
