/* about-art.js
   About 페이지 배경 애니메이션: 라쿤이 던진 공이 "함수 롤러코스터"를 타고 내려갑니다.
   내려갈수록 배경은 더 단순하고 근본적인 수학으로 바뀌고, 공이 맨 밑의 ∅(공집합)에 닿으면 새싹이 돋습니다.
   - 홈의 hero-art.js 와 같은 방식: SVG + requestAnimationFrame, 외부 라이브러리 없음.
   - 한 바퀴(약 45초)가 끝나면 처음부터 다시 돕니다. 화면 밖이면 멈추고, 일시정지 버튼이 있습니다.
   - prefers-reduced-motion 이면 움직이지 않고 정지 화면 한 장만 보여 줍니다.
   - 그림 안의 글자는 모두 영어(수식)입니다. 층의 이름·설명은 아래 LAYERS 에서 고칩니다. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var PI = Math.PI;

  /* ======================================================================
     1. 층 (위가 가장 고급, 아래로 갈수록 단순하고 근본적)
     ====================================================================== */
  var LAYERS = [
    { name: 'Analysis',              sub: 'limits, continuity, integrals, series' },
    { name: 'Abstract Algebra',      sub: 'groups, rings, fields' },
    { name: 'Linear Algebra',        sub: 'matrices, vectors, linear maps' },
    { name: 'Calculus',              sub: 'limits, derivatives, integrals' },
    { name: 'Equations & Functions', sub: 'polynomials, equations, graphs' },
    { name: 'Integers & Remainders', sub: 'divisors, primes, congruence' },
    { name: 'Arithmetic',            sub: 'add, subtract, multiply, divide' },
    { name: 'Counting',              sub: 'one, two, three ... and zero' },
    { name: 'Sets & Logic',          sub: 'elements, sets, true and false' }
  ];
  var N = LAYERS.length;

  /* ======================================================================
     2. 월드 좌표 (가로 1000 안팎, 세로로 길게)와 한 바퀴의 시간표
     ====================================================================== */
  var X0 = 370, X1 = 740, MID = (X0 + X1) / 2;   // 트랙이 오가는 가로 범위
  var Y0 = 410;                                   // 첫 층 트랙이 시작하는 높이
  var LH = 560;                                   // 층 하나의 높이
  var DROP = 350;                                 // 층 하나에서 트랙이 내려가는 높이
  var RX = 255, LEDGE = 235;                      // 라쿤이 앉은 자리(가로, 발판 높이)
  var DS = 3;                                     // 트랙을 점으로 나눈 간격
  var BOX_L = 170, BOX_R = 905;                   // 화면에 꼭 보여야 하는 가로 범위(라쿤 ~ 트랙)

  var T_THROW = 2.8, T_PIECE = 4.0, T_SPROUT = 3.2, T_HOLD = 2.6, T_FADE = 0.9;
  var D = T_THROW + N * T_PIECE + T_SPROUT;       // 던지기 + 트랙 타기 + 새싹
  var LOOP = D + T_HOLD;                          // 한 바퀴
  var PT = T_THROW / D;                           // 진행도 0~PT: 던지기
  var PE = (T_THROW + N * T_PIECE) / D;           // PT~PE: 트랙 타기, PE~1: 새싹

  /* ---------- 작은 도구들 (hero-art.js 와 같은 방식) ---------- */
  function S(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function easeIn(x) { return x * x; }
  function easeOut(x) { return 1 - (1 - x) * (1 - x); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }

  function txt(parent, str, x, y, size, cls, anchor) {
    var e = S('text', { x: x, y: y, 'font-size': size, 'class': cls || 'co-f', 'text-anchor': anchor || 'middle' }, parent);
    e.textContent = str;
    return e;
  }
  /* 아래첨자 _ 와 위첨자 ^ 를 쓸 수 있는 글자. 예: 'x^2 + a_n', 'lim_{x→a}' */
  function mtext(parent, str, x, y, size, cls, anchor) {
    var t = S('text', { x: x, y: y, 'font-size': size, 'class': cls || 'co-f', 'text-anchor': anchor || 'middle' }, parent);
    var cur = 0, buf = '', i = 0, c, j, arg;
    function put(s, m) {
      if (!s) return;
      var want = m === 1 ? size * 0.28 : (m === 2 ? -size * 0.42 : 0);
      var ts = S('tspan', {}, t);
      if (want !== cur) ts.setAttribute('dy', f1(want - cur));
      if (m) ts.setAttribute('font-size', f1(size * 0.7));
      ts.textContent = s;
      cur = want;
    }
    while (i < str.length) {
      c = str.charAt(i);
      if (c === '_' || c === '^') {
        put(buf, 0); buf = '';
        i++;
        if (str.charAt(i) === '{') { j = str.indexOf('}', i); arg = str.slice(i + 1, j); i = j + 1; }
        else { arg = str.charAt(i); i++; }
        put(arg, c === '_' ? 1 : 2);
      } else { buf += c; i++; }
    }
    put(buf, 0);
    return t;
  }
  function ln(parent, x1, y1, x2, y2, cls) { return S('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'class': cls || 'co-ln' }, parent); }
  function dot(parent, x, y, r, cls) { return S('circle', { cx: f1(x), cy: f1(y), r: r, 'class': cls || 'co-pt' }, parent); }
  function pathOf(pts, close) {
    var d = '', i;
    for (i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + f1(pts[i][0]) + ' ' + f1(pts[i][1]);
    return d + (close ? 'Z' : '');
  }
  function arrow(parent, x1, y1, x2, y2, cls) {
    var dx = x2 - x1, dy = y2 - y1, l = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / l, uy = dy / l, s = 7;
    ln(parent, x1, y1, x2 - ux * s * 0.6, y2 - uy * s * 0.6, cls || 'co-ln co-hl');
    S('path', {
      d: 'M' + f1(x2) + ' ' + f1(y2) + 'L' + f1(x2 - ux * s - uy * s * 0.45) + ' ' + f1(y2 - uy * s + ux * s * 0.45) +
         'L' + f1(x2 - ux * s + uy * s * 0.45) + ' ' + f1(y2 - uy * s - ux * s * 0.45) + 'Z',
      'class': 'co-ah'
    }, parent);
  }

  /* ======================================================================
     3. 트랙: 층마다 다른 함수의 그래프를 이어 붙인 지그재그
        홀수 번째 층은 오른쪽→왼쪽으로 갑니다. 층 사이는 부드러운 U턴.
     ====================================================================== */
  var SHAPES = [
    /* 0 Analysis: 푸리에 급수의 부분합 Σ (−1)^(n+1) sin(nθ)/n, n ≤ 4 */
    function (u) {
      var th = 2 * PI * 2 * u, s = 0, n;
      for (n = 1; n <= 4; n++) s += (n % 2 ? 1 : -1) * Math.sin(n * th) / n;
      return DROP * u + 30 * s;
    },
    /* 1 Abstract Algebra: 사인파 (원분체·단위근의 모양) */
    function (u) { return DROP * u + 34 * Math.sin(2 * PI * 2 * u); },
    /* 2 Linear Algebra: 직선 조각을 이은 톱니 (구간별 선형) */
    function (u) {
      var q = u * 4, f = q - Math.floor(q), tri = f < 0.5 ? f * 2 : 2 - 2 * f;
      return DROP * u + 46 * tri;
    },
    /* 3 Calculus: 3차 다항식 */
    function (u) { return DROP * (u + 2.4 * u * (1 - u) * (1 - 2 * u)); },
    /* 4 Equations & Functions: 포물선 y = x² */
    function (u) { return DROP * u * u; },
    /* 5 Integers & Remainders: 나머지(mod)의 톱니 — 완만한 오르막 뒤에 수직 낙하 */
    function (u) { var q = 3 * u; return DROP * u - 70 * (q - Math.floor(q)); },
    /* 6 Arithmetic: 직선 y = x + c */
    function (u) { return DROP * u; }
    /* 7 Counting 은 계단, 8 Sets & Logic 은 깔때기: 아래에서 따로 만듭니다 */
  ];

  /* 점 사이가 step 이하가 되도록 사이에 점을 채웁니다 */
  function dens(a, step) {
    var out = [a[0]], i, k, p, q, d, n;
    for (i = 1; i < a.length; i++) {
      p = a[i - 1]; q = a[i];
      d = Math.sqrt((q[0] - p[0]) * (q[0] - p[0]) + (q[1] - p[1]) * (q[1] - p[1]));
      n = Math.max(1, Math.ceil(d / step));
      for (k = 1; k <= n; k++) out.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n]);
    }
    return out;
  }
  function bez(p0, p1, p2, p3, n) {
    var out = [], k, t, m;
    for (k = 0; k <= n; k++) {
      t = k / n; m = 1 - t;
      out.push([
        m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
        m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1]
      ]);
    }
    return out;
  }
  function layerTop(i) { return Y0 + i * LH; }

  function segPts(i) {
    var dir = i % 2 ? -1 : 1, xa = dir > 0 ? X0 : X1, xb = dir > 0 ? X1 : X0, ty = layerTop(i);
    var pts = [], k, n = 240, u, st, tread, rise;
    if (i === 7) {                                   // 계단: 6칸
      st = 6; tread = (xb - xa) / st; rise = DROP / st;
      pts.push([xa, ty]);
      for (k = 0; k < st; k++) {
        pts.push([xa + tread * (k + 1), ty + rise * k]);
        pts.push([xa + tread * (k + 1), ty + rise * (k + 1)]);
      }
      return dens(pts, DS);
    }
    if (i === 8) {                                   // 깔때기: 가운데 한 점(∅)으로 모인다
      pts = bez([X0, ty], [X0 + 60, ty + 120], [MID, ty + DROP - 110], [MID, ty + DROP], 80);
      pts = dens(pts, DS);
      k = pts.length - 1;
      pts = pts.concat(dens([[MID, ty + DROP], [MID, ty + DROP + 100]], DS).slice(1));
      pts.entry = k;                                 // 수직으로 떨어지기 시작하는 점의 번호
      return pts;
    }
    for (k = 0; k <= n; k++) { u = k / n; pts.push([xa + (xb - xa) * u, ty + SHAPES[i](u)]); }
    return dens(pts, DS);
  }
  function tangentOf(pts, atEnd) {
    var a, b, dx, dy, l, m = pts.length;
    if (atEnd) { a = pts[m - 7]; b = pts[m - 1]; } else { a = pts[0]; b = pts[6]; }
    dx = b[0] - a[0]; dy = b[1] - a[1]; l = Math.sqrt(dx * dx + dy * dy) || 1;
    return [dx / l, dy / l];
  }
  function smooth(a, r) {
    var out = [], n = a.length, i, j, w, sx, sy, c;
    for (i = 0; i < n; i++) {
      w = Math.min(r, i, n - 1 - i);
      sx = 0; sy = 0; c = 0;
      for (j = -w; j <= w; j++) { sx += a[i + j][0]; sy += a[i + j][1]; c++; }
      out.push([sx / c, sy / c]);
    }
    return out;
  }

  function buildTrack() {
    var raw = [], mids = [], i, s, hp, t0, t1, p0, p3, entryIdx = 0;
    for (i = 0; i < N; i++) {
      s = segPts(i);
      if (i > 0) {                                   // 앞 층 끝 → 이 층 시작을 U턴으로 잇는다
        p0 = raw[raw.length - 1]; p3 = s[0];
        t0 = tangentOf(raw, true); t1 = tangentOf(s, false);
        hp = dens(bez(p0, [p0[0] + t0[0] * 120, p0[1] + t0[1] * 120], [p3[0] - t1[0] * 120, p3[1] - t1[1] * 120], p3, 90), DS);
        mids.push(raw.length + Math.floor(hp.length / 2) - 1);
        raw = raw.concat(hp.slice(1, hp.length - 1));
      }
      if (i === 8) entryIdx = raw.length + s.entry;
      raw = i === 0 ? s.slice() : raw.concat(s);
    }
    raw = smooth(raw, 4);

    var n = raw.length, cum = [0], L, M, k, j, sPos, seglen, fr, d;
    for (i = 1; i < n; i++) {
      d = Math.sqrt(Math.pow(raw[i][0] - raw[i - 1][0], 2) + Math.pow(raw[i][1] - raw[i - 1][1], 2));
      cum.push(cum[i - 1] + d);
    }
    L = cum[n - 1]; M = Math.floor(L / DS) + 1;
    var xs = new Float32Array(M), ys = new Float32Array(M);
    j = 0;
    for (k = 0; k < M; k++) {
      sPos = k * DS;
      while (j < n - 2 && cum[j + 1] < sPos) j++;
      seglen = cum[j + 1] - cum[j];
      fr = seglen > 1e-9 ? clamp((sPos - cum[j]) / seglen, 0, 1) : 0;
      xs[k] = lerp(raw[j][0], raw[j + 1][0], fr);
      ys[k] = lerp(raw[j][1], raw[j + 1][1], fr);
    }
    xs[M - 1] = raw[n - 1][0]; ys[M - 1] = raw[n - 1][1];

    /* 층 경계: U턴의 한가운데 */
    var pk = [0];
    for (i = 0; i < mids.length; i++) pk.push(Math.round(cum[mids[i]] / DS));
    pk.push(M - 1);
    var kEntry = Math.round(cum[entryIdx] / DS);

    /* 기울기(아래쪽이 +) → 속도. 내리막은 빠르고 오르막은 느리게 */
    var ty = new Float32Array(M), tc = new Float32Array(M), a, b, acc, v, kA, kB;
    for (k = 0; k < M; k++) {
      a = Math.max(0, k - 2); b = Math.min(M - 1, k + 2);
      ty[k] = clamp((ys[b] - ys[a]) / (Math.max(1, b - a) * DS), -1, 1);
    }
    for (i = 0; i < N; i++) {
      kA = pk[i]; kB = pk[i + 1]; acc = 0; tc[kA] = 0;
      for (k = kA + 1; k <= kB; k++) { v = 1 + 0.7 * ty[k]; acc += DS / v; tc[k] = acc; }
      for (k = kA; k <= kB; k++) tc[k] /= acc;
    }

    /* 카메라가 따라갈 완만한 높이: 앞뒤 350 에 걸친 평균 */
    var W = Math.round(350 / DS), pre = new Float64Array(M + 1), fy = new Float32Array(M), lo, hi;
    for (k = 0; k < M; k++) pre[k + 1] = pre[k] + ys[k];
    for (k = 0; k < M; k++) {
      lo = Math.max(0, k - W); hi = Math.min(M - 1, k + W);
      fy[k] = (pre[hi + 1] - pre[lo]) / (hi - lo + 1);
    }

    var dstr = 'M' + f1(xs[0]) + ' ' + f1(ys[0]);
    for (k = 1; k < M; k++) dstr += 'L' + f1(xs[k]) + ' ' + f1(ys[k]);

    return {
      xs: xs, ys: ys, M: M, L: L, pk: pk, kEntry: kEntry, ty: ty, tc: tc, fy: fy, d: dstr,
      C: [xs[M - 1], ys[M - 1]]
    };
  }

  /* ======================================================================
     4. 배경: 층마다 그 층의 수학 (글자와 작은 그림)
     ====================================================================== */
  var GRID = [25, 25, 30, 35, 40, 50, 60, 100, 0];     // 아래로 갈수록 눈금이 성기고, 마지막은 빈 종이
  var GX0 = -700, GX1 = 1100;                          // 눈금을 그리는 가로 범위

  function figEpsDelta(g, cx, cy) {
    var fn = function (t) { return -0.55 * t + 9 * Math.sin(t / 16); }, d = '', t;
    for (t = -62; t <= 62; t += 4) d += (t === -62 ? 'M' : 'L') + f1(cx + t) + ' ' + f1(cy + fn(t));
    S('path', { d: d, 'class': 'co-ln co-hl' }, g);
    ln(g, cx - 68, cy - 30, cx + 68, cy - 30, 'co-ln co-dash');
    ln(g, cx - 68, cy + 30, cx + 68, cy + 30, 'co-ln co-dash');
    ln(g, cx - 44, cy - 42, cx - 44, cy + 42, 'co-ln co-dash');
    ln(g, cx + 44, cy - 42, cx + 44, cy + 42, 'co-ln co-dash');
    dot(g, cx, cy, 3);
    txt(g, 'ε', cx + 76, cy - 26, 18, 'co-f', 'start');
    txt(g, 'a', cx, cy + 62, 16);
    txt(g, 'δ', cx + 44, cy + 62, 16);
  }
  function figRoots(g, cx, cy, r, n) {
    var k, a, pts = [], px, py;
    S('circle', { cx: cx, cy: cy, r: r, 'class': 'co-ln' }, g);
    for (k = 0; k < n; k++) {
      a = (-90 + 360 * k / n) * PI / 180;
      px = cx + Math.cos(a) * r; py = cy + Math.sin(a) * r;
      pts.push([px, py]);
      dot(g, px, py, 3.2);
      txt(g, String(k), cx + Math.cos(a) * (r + 15), cy + Math.sin(a) * (r + 15) + 4, 13, 'co-f co-f2');   // 원소 번호
    }
    S('path', { d: pathOf(pts, true), 'class': 'co-ln co-dash' }, g);
    dot(g, cx, cy, 2);
    a = (-90 + 360 / n) * PI / 180;
    arrow(g, cx, cy, cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    /* 시계 밑에: 어떤 집합인지 */
    txt(g, 'ℤ/8ℤ', cx, cy + r + 42, 19);
    txt(g, '{0, 1, 2, …, 7}', cx, cy + r + 65, 16);
  }
  /* 준동형사상 φ: G → H 를 집합 그림으로. 핵(ker φ)은 H 의 항등원 e_H 로, 나머지는 상(im φ)으로 간다 */
  function figHomo(g, cx, cy) {
    var gx = cx - 86, hx = cx + 86;
    function el(x, y, rx, ry, cls) { return S('ellipse', { cx: f1(x), cy: f1(y), rx: rx, ry: ry, 'class': cls }, g); }
    function map(p, q) {
      var dx = q[0] - p[0], dy = q[1] - p[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      arrow(g, p[0] + dx / l * 6, p[1] + dy / l * 6, q[0] - dx / l * 6, q[1] - dy / l * 6, 'co-ln');
    }
    el(gx, cy, 54, 46, 'co-ln co-soft');              // G
    el(hx, cy, 54, 46, 'co-ln co-soft');              // H
    el(gx - 12, cy + 18, 28, 17, 'co-ln co-dash');    // ker φ
    el(hx - 2, cy + 2, 40, 32, 'co-ln co-dash');      // im φ
    var k1 = [gx - 24, cy + 16], k2 = [gx - 4, cy + 22], a1 = [gx - 12, cy - 22], a2 = [gx + 24, cy - 8];
    var e = [hx - 26, cy + 8], b1 = [hx + 8, cy - 20], b2 = [hx + 24, cy - 4], c = [hx + 34, cy - 26];
    [k1, k2, a1, a2, e, b1, b2, c].forEach(function (p) { dot(g, p[0], p[1], 3.2); });
    map(k1, e); map(k2, e); map(a1, b1); map(a2, b2);
    mtext(g, 'e_H', e[0] + 7, e[1] + 5, 16, 'co-f', 'start');
    arrow(g, cx - 42, cy - 54, cx + 42, cy - 54);
    txt(g, 'φ', cx, cy - 62, 20);
    txt(g, 'G', gx - 60, cy - 36, 20, 'co-f', 'end');
    txt(g, 'H', hx + 58, cy - 32, 20, 'co-f', 'start');
    txt(g, 'ker φ', gx - 12, cy + 64, 16);
    txt(g, 'im φ', hx - 2, cy + 62, 16);
    txt(g, 'φ(ab) = φ(a)φ(b)', cx, cy + 92, 20);
  }
  function figLattice(g, cx, cy) {
    var i, j;
    for (i = -2; i <= 2; i++) for (j = -2; j <= 2; j++) dot(g, cx + i * 26 - j * 8, cy + i * 6 + j * 24, 2.6);
    S('path', { d: 'M' + cx + ' ' + cy + 'l26 6l-8 24l-26 -6Z', 'class': 'co-ln co-dash' }, g);   // 기본 평행사변형
    arrow(g, cx, cy, cx + 26, cy + 6);
    arrow(g, cx, cy, cx - 8, cy + 24);
    mtext(g, 'b_1', cx + 34, cy + 2, 16, 'co-f', 'start');
    mtext(g, 'b_2', cx - 18, cy + 40, 16, 'co-f', 'end');
  }
  function figMatrix(g, cx, cy) {
    var d = 'M' + (cx - 32) + ' ' + (cy - 30) + 'H' + (cx - 42) + 'V' + (cy + 28) + 'H' + (cx - 32) +
            'M' + (cx + 32) + ' ' + (cy - 30) + 'H' + (cx + 42) + 'V' + (cy + 28) + 'H' + (cx + 32);
    S('path', { d: d, 'class': 'co-ln co-hl' }, g);
    txt(g, '1', cx - 15, cy - 6, 26); txt(g, '2', cx + 15, cy - 6, 26);
    txt(g, '3', cx - 15, cy + 22, 26); txt(g, '4', cx + 15, cy + 22, 26);
    txt(g, 'det = −2', cx, cy + 58, 17);
  }
  function figParabola(g, cx, cy) {
    var X = function (x) { return cx - 60 + (x - 0.5) * 30; }, Yv = function (v) { return cy + 12 - v * 14; };
    var d = '', x;
    for (x = 0.5; x <= 4.501; x += 0.1) d += (x === 0.5 ? 'M' : 'L') + f1(X(x)) + ' ' + f1(Yv((x - 2) * (x - 3)));
    S('path', { d: d, 'class': 'co-ln co-hl' }, g);
    ln(g, cx - 70, cy + 12, cx + 70, cy + 12, 'co-ln');
    dot(g, X(2), cy + 12, 3.4); dot(g, X(3), cy + 12, 3.4);
    txt(g, '2', X(2), cy + 32, 16); txt(g, '3', X(3), cy + 32, 16);
  }
  function figClock(g, cx, cy, r) {
    var k, a;
    S('circle', { cx: cx, cy: cy, r: r, 'class': 'co-ln' }, g);
    for (k = 0; k < 12; k++) {
      a = (-90 + 30 * k) * PI / 180;
      ln(g, cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5), cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    txt(g, '12', cx, cy - r + 19, 13); txt(g, '3', cx + r - 14, cy + 5, 13);
    txt(g, '6', cx, cy + r - 10, 13); txt(g, '9', cx - r + 14, cy + 5, 13);
    a = -30 * PI / 180;
    arrow(g, cx, cy, cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14));
    dot(g, cx, cy, 2.4);
    txt(g, '9 + 5 ≡ 2', cx, cy + r + 24, 16);
    txt(g, '(mod 12)', cx, cy + r + 44, 16);
  }
  function figArray(g, cx, cy) {
    var r, c;
    for (r = 0; r < 3; r++) for (c = 0; c < 4; c++) dot(g, cx - 30 + c * 20, cy - 20 + r * 20, 5.2);
    txt(g, '3 × 4 = 12', cx, cy + 56, 18);
  }
  function figCount(g, cx, cy) {
    var r, c;
    for (r = 1; r <= 3; r++) for (c = 0; c < r; c++) dot(g, cx - (r - 1) * 10 + c * 20, cy - 24 + (r - 1) * 26, 6);
    txt(g, 'one · two · three', cx, cy + 62, 15);
  }
  function figVenn(g, cx, cy) {
    S('circle', { cx: cx - 20, cy: cy, r: 36, 'class': 'co-ln co-soft' }, g);
    S('circle', { cx: cx + 20, cy: cy, r: 36, 'class': 'co-ln co-soft' }, g);
    txt(g, 'A', cx - 40, cy + 6, 17); txt(g, 'B', cx + 40, cy + 6, 17);
    txt(g, 'A ∩ B', cx, cy + 62, 16);
  }

  function decor(i, g, top, bot) {
    var T = layerTop(i), odd = i % 2 === 1, k, d, gs = GRID[i], x, y;
    function X(v) { return odd ? 2 * MID - v : v; }
    function F(str, v, y2, size, cls) { return mtext(g, str, X(v), y2, size, cls || 'co-f'); }
    function B(str, v, y2, size) { return txt(g, str, X(v), y2, size, 'co-big'); }

    /* 눈금 */
    if (gs) {
      d = '';
      for (x = Math.ceil(GX0 / gs) * gs; x <= GX1; x += gs) d += 'M' + x + ' ' + top + 'V' + bot;
      for (y = Math.ceil(top / gs) * gs; y < bot; y += gs) d += 'M' + GX0 + ' ' + y + 'H' + GX1;
      S('path', { d: d, 'class': 'co-grid' }, g);
    }
    /* 층 경계선과 이름 */
    if (i > 0) ln(g, GX0, top, GX1, top, 'co-sep');
    var hx = odd ? 188 : 892, ha = odd ? 'start' : 'end', hy = i === 0 ? 70 : top + 40;
    txt(g, pad2(i + 1), hx, hy, 13, 'co-no', ha);
    txt(g, LAYERS[i].name, hx, hy + 24, 19, 'co-name', ha);

    if (i === 0) {
      figEpsDelta(g, X(275), T + 130);
      B('∫', 815, T + 215, 210);
      F('lim_{x→a} f(x) = L', 620, T + 70, 22);
      F('Σ 1/n^2 = π^2/6', 500, T + 300, 22);
      F('‖f‖_2', 290, T + 335, 22);
    } else if (i === 1) {
      figRoots(g, X(300), T + 112, 52, 8);
      figHomo(g, X(385), T + 345);
      B('ℤ', 815, T + 215, 190);
      F('y^2 = x^3 + ax + b', 620, T + 70, 22);
      F('|G| = [G:H]·|H|', 780, T + 10, 22);
    } else if (i === 2) {
      figLattice(g, X(275), T + 110);
      figMatrix(g, X(810), T + 100);
      F('Av = λv', 620, T + 70, 26);
      F('Ax = b', 500, T + 300, 26);
      B('λ', 290, T + 330, 150);
    } else if (i === 3) {
      B('f′', 815, T + 215, 190);
      F('f′(x) = lim_{h→0} Δf/h', 620, T + 70, 22);
      F('∫ x dx = x^2/2', 500, T + 300, 22);
      F('(e^x)′ = e^x', 275, T + 120, 22);
      F('(sin x)′ = cos x', 275, T + 190, 20);
    } else if (i === 4) {
      figParabola(g, X(275), T + 110);
      B('=', 815, T + 215, 230);
      F('x^2 − 5x + 6 = 0', 620, T + 70, 24);
      F('(x − 2)(x − 3) = 0', 500, T + 300, 24);
      F('y = ax + b', 815, T + 70, 20);
    } else if (i === 5) {
      figClock(g, X(275), T + 100, 50);
      B('≡', 815, T + 215, 230);
      F('17 = 5·3 + 2', 620, T + 70, 26);
      F('gcd(12, 18) = 6', 500, T + 300, 24);
      F('2  3  5  7  11  13', 600, T + 345, 20, 'co-f co-f2');
    } else if (i === 6) {
      figArray(g, X(275), T + 110);
      txt(g, '+', X(790), T + 130, 64, 'co-big co-big2'); txt(g, '−', X(855), T + 130, 64, 'co-big co-big2');
      txt(g, '×', X(790), T + 205, 64, 'co-big co-big2'); txt(g, '÷', X(855), T + 205, 64, 'co-big co-big2');
      F('3 + 4 = 7', 620, T + 60, 26);
      F('6 × 7 = 42', 640, T + 110, 26);
      F('a(b + c) = ab + ac', 500, T + 300, 24);
    } else if (i === 7) {
      figCount(g, X(275), T + 100);
      B('0', 815, T + 225, 230);
      F('S(n) = n + 1', 620, T + 40, 26);
      F('0, S(0), S(S(0)), …', 500, T + 320, 22);
      /* 계단 칸에 번호 */
      var st = 6, tread = (X1 - X0) / st, rise = DROP / st;
      for (k = 0; k < st; k++) txt(g, String(k + 1), X1 - tread * (k + 0.5), T + rise * k - 14, 22, 'co-f co-strong');
    } else {
      figVenn(g, X(275), T + 100);
      B('∈', 815, T + 215, 190);
      F('0 = ∅', 640, T + 60, 26);
      F('1 = {∅}', 640, T + 100, 26);
      F('2 = {∅, {∅}}', 640, T + 140, 26);
      F('p ∧ q    p ∨ q    ¬p', 480, T + 310, 22);
    }
  }

  /* ======================================================================
     5. 라쿤 (점과 선으로만 그린 그래프) · ∅ 와 새싹
        꼭짓점은 점, 변은 선. 눈 가면과 꼬리의 줄무늬만 살렸습니다.
     ====================================================================== */
  var SHOULDER = [17, -48], ARM_LEN = 26, BALL_DIST = 35;

  function cubicPts(p0, p1, p2, p3, n) { return bez(p0, p1, p2, p3, n); }

  function buildRaccoon(parent) {
    var g = S('g', { 'class': 'mr' }, parent), i, a, pl, pr, arm;
    /* 꼬리: 옅은 띠 + 중심선 + 고리 줄무늬 */
    var tail = cubicPts([-18, -6], [-46, -2], [-62, -22], [-54, -48], 28).concat(cubicPts([-54, -48], [-50, -60], [-40, -64], [-34, -58], 14).slice(1));
    var cum = [0], tot, f, idx, p, q, nx, ny, nl;
    for (i = 1; i < tail.length; i++) cum.push(cum[i - 1] + Math.sqrt(Math.pow(tail[i][0] - tail[i - 1][0], 2) + Math.pow(tail[i][1] - tail[i - 1][1], 2)));
    tot = cum[cum.length - 1];
    S('path', { d: pathOf(tail), 'class': 'mr-band' }, g);
    S('path', { d: pathOf(tail), 'class': 'mr-ln' }, g);
    for (f = 0.16; f < 0.95; f += 0.15) {
      idx = 1; while (idx < cum.length - 1 && cum[idx] < tot * f) idx++;
      p = tail[idx - 1]; q = tail[Math.min(tail.length - 1, idx + 1)];
      nx = -(q[1] - p[1]); ny = q[0] - p[0]; nl = Math.sqrt(nx * nx + ny * ny) || 1; nx = nx / nl * 7; ny = ny / nl * 7;
      ln(g, tail[idx][0] - nx, tail[idx][1] - ny, tail[idx][0] + nx, tail[idx][1] + ny, 'mr-ring');
    }
    dot(g, tail[tail.length - 1][0], tail[tail.length - 1][1], 3.4, 'mr-dot');

    /* 몸: 열린 다각형 */
    var body = [[-17, -53], [-25, -30], [-21, -3], [21, -3], [25, -30], [17, -53]];
    S('path', { d: pathOf(body), 'class': 'mr-ln' }, g);
    for (i = 0; i < body.length; i++) dot(g, body[i][0], body[i][1], 1.8, 'mr-dot');
    dot(g, 0, -42, 1.6, 'mr-dot mr-faint'); dot(g, 0, -32, 1.6, 'mr-dot mr-faint'); dot(g, 0, -22, 1.6, 'mr-dot mr-faint');
    dot(g, -12, -2, 3.4, 'mr-dot'); dot(g, 12, -2, 3.4, 'mr-dot');
    /* 가만히 있는 왼팔 */
    ln(g, -17, -48, -22, -28, 'mr-ln'); dot(g, -22, -27, 3, 'mr-dot');

    /* 머리: 귀가 뾰족한 다각형 */
    var head = [[-24, -97], [-12, -85], [0, -83], [12, -85], [24, -97], [31, -73], [21, -58], [0, -53], [-21, -58], [-31, -73]];
    S('path', { d: pathOf(head, true), 'class': 'mr-ln mr-fill' }, g);
    for (i = 0; i < head.length; i++) dot(g, head[i][0], head[i][1], 1.8, 'mr-dot');
    /* 눈 가면(띠) · 눈 · 코 */
    S('path', { d: pathOf([[-28, -79], [-14, -85], [0, -80], [14, -85], [28, -79], [27, -70], [14, -67], [0, -72], [-14, -67], [-27, -70]], true), 'class': 'mr-mask' }, g);
    S('circle', { cx: -13, cy: -76, r: 3.6, 'class': 'mr-eye' }, g);
    S('circle', { cx: 13, cy: -76, r: 3.6, 'class': 'mr-eye' }, g);
    pl = dot(g, -13, -76, 1.7, 'mr-dot'); pr = dot(g, 13, -76, 1.7, 'mr-dot');
    dot(g, 0, -63, 3, 'mr-dot');

    /* 공을 던지는 오른팔: 어깨를 축으로 회전 */
    arm = S('g', { transform: 'translate(' + SHOULDER[0] + ' ' + SHOULDER[1] + ')' }, g);
    ln(arm, 0, 0, 0, ARM_LEN, 'mr-ln');
    dot(arm, 0, ARM_LEN, 3.2, 'mr-dot');
    dot(g, SHOULDER[0], SHOULDER[1], 1.8, 'mr-dot');
    return { g: g, arm: arm, pl: pl, pr: pr };
  }

  function buildSprout(parent) {
    var g = S('g', { 'class': 'co-sprout' }, parent);
    var stem = S('path', { d: 'M0 0C-1 -7 2 -13 1 -20', 'class': 'sp-stem', pathLength: 100 }, g);
    var leafD = 'M0 0C4 -7 12 -9 19 -3C12 3 4 4 0 0Z';
    var lf = S('path', { d: leafD, 'class': 'sp-leaf' }, g);
    var rt = S('path', { d: leafD, 'class': 'sp-leaf' }, g);
    return { g: g, stem: stem, l: lf, r: rt };
  }

  /* ======================================================================
     6. 던지기: 팔을 뒤로 젖혔다가 휘두르고, 공은 포물선으로 트랙에 내려앉는다
     ====================================================================== */
  var ARM = { hold: -125, back: -232, rel: -108, fol: -35 };   // 도 단위. 0 = 팔이 아래를 향함
  var REL_AT = 0.52;                                            // 이 진행도에서 손을 떠난다
  function armAt(tau) {
    if (tau < 0.28) return lerp(ARM.hold, ARM.back, ease(tau / 0.28));
    if (tau < REL_AT) return lerp(ARM.back, ARM.rel, easeIn(seg(tau, 0.28, REL_AT)));
    return lerp(ARM.rel, ARM.fol, easeOut(seg(tau, REL_AT, 0.85)));
  }
  function pawPos(aDeg, k, dist) {
    var a = aDeg * PI / 180;
    return [RX + k * (SHOULDER[0] - Math.sin(a) * dist), LEDGE + k * (SHOULDER[1] + Math.cos(a) * dist)];
  }

  /* ======================================================================
     7. 화면에 붙이기 (홈의 hero-art.js 와 같은 틀)
     ====================================================================== */
  function init(root) {
    var host = root.querySelector('[data-about-art]');
    var toggle = root.querySelector('[data-about-toggle]');
    var caption = root.querySelector('[data-about-caption]');
    if (!host) return null;

    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var compactQ = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;
    var T = buildTrack();
    var H = T.C[1] + 380;
    var M = T.M;

    /* --- SVG --- */
    var svg = S('svg', { 'class': 'aa-world', 'aria-hidden': 'true', focusable: 'false' }, host);
    var fade = S('g', {}, svg);
    var world = S('g', {}, fade);

    var bands = [], i, gl, top, bot;
    for (i = 0; i < N; i++) {
      top = i === 0 ? 0 : T.ys[T.pk[i]];
      bot = i === N - 1 ? H : T.ys[T.pk[i + 1]];
      gl = S('g', {}, world);
      decor(i, gl, top, bot);
      bands.push({ g: gl, top: top, bot: bot });
    }

    var gt = S('g', {}, world);
    var rail = S('path', { d: T.d, 'class': 'co-rail' }, gt);
    var ties = S('path', { d: T.d, 'class': 'co-ties' }, gt);
    var trav = S('path', { d: T.d, 'class': 'co-trav' }, gt);

    var ringG = S('g', { 'class': 'co-ringg' }, world);
    S('circle', { cx: T.C[0], cy: T.C[1], r: 24, 'class': 'co-ring' }, ringG);
    ln(ringG, T.C[0] - 17, T.C[1] + 17, T.C[0] + 17, T.C[1] - 17, 'co-ring');

    var sprout = buildSprout(world);

    var tan = ln(world, 0, 0, 0, 0, 'co-tan');
    var tanLabel = txt(world, 'f′(x)', 0, 0, 18, 'co-f', 'middle');

    /* 발판과 라쿤 */
    var ledge = S('g', {}, world);
    ln(ledge, RX - 70, LEDGE, RX + 70, LEDGE, 'mr-ln mr-ledge');
    dot(ledge, RX - 70, LEDGE, 2.4, 'mr-dot'); dot(ledge, RX + 70, LEDGE, 2.4, 'mr-dot');
    var rcWrap = S('g', {}, world);
    var rc = buildRaccoon(rcWrap);

    var ball = S('g', { 'class': 'co-ball' }, world);
    var ballHalo = S('circle', { cx: 0, cy: 0, r: 15, 'class': 'co-ball-halo' }, ball);
    var ballC = S('circle', { cx: 0, cy: 0, r: 8, 'class': 'co-ball-c' }, ball);

    /* --- 크기 --- */
    var view = { vx: 0, vw: 1000, vh: 500, sc: 1, k: 1 };
    var lastP = 0, lastIdx = -1;

    function resize() {
      var r = host.getBoundingClientRect(), W = r.width || 600, Hh = r.height || 400, vw, vx;
      if (compactQ && compactQ.matches) { vw = BOX_R - BOX_L + 40; vx = BOX_L - 20; }     // 좁은 화면: 그림 전체를 가운데에
      else { vw = (BOX_R - BOX_L) / 0.42; vx = BOX_R - vw; }                               // 넓은 화면: 글 오른쪽의 42%에 모은다
      view.vw = vw; view.vx = vx; view.vh = vw * Hh / W; view.sc = W / vw;
      view.k = clamp(0.9 / view.sc, 1, 1.55);
      svg.setAttribute('viewBox', f1(vx) + ' 0 ' + f1(vw) + ' ' + f1(view.vh));
      var u = 1 / view.sc;
      rail.setAttribute('stroke-width', f1(2 * u));
      trav.setAttribute('stroke-width', f1(2.6 * u));
      ties.setAttribute('stroke-width', f1(8 * u));
      ties.setAttribute('stroke-dasharray', f1(1.6 * u) + ' ' + f1(11 * u));
      rcWrap.setAttribute('transform', 'translate(' + RX + ' ' + LEDGE + ') scale(' + f1(view.k) + ')');
      sprout.g.setAttribute('transform', 'translate(' + f1(T.C[0]) + ' ' + f1(T.C[1]) + ') scale(' + f1(view.k) + ')');
      draw(lastP);
    }

    /* --- 한 장면 그리기 (p: 0~1) --- */
    function at(kf) {
      var k0 = Math.min(M - 2, Math.max(0, Math.floor(kf))), fr = clamp(kf - k0, 0, 1);
      return [lerp(T.xs[k0], T.xs[k0 + 1], fr), lerp(T.ys[k0], T.ys[k0 + 1], fr), lerp(T.fy[k0], T.fy[k0 + 1], fr)];
    }
    function kOf(piece, u) {
      var lo = T.pk[piece], hi = T.pk[piece + 1], mid, fr, dd;
      while (hi - lo > 1) { mid = (lo + hi) >> 1; if (T.tc[mid] < u) lo = mid; else hi = mid; }
      dd = T.tc[hi] - T.tc[lo];
      fr = dd > 1e-9 ? (u - T.tc[lo]) / dd : 0;
      return lo + clamp(fr, 0, 1);
    }

    function draw(p) {
      lastP = p;
      var kk = view.k, tau, a, pos, kf = 0, ref, ballR = 8 * kk, shrink = 1, idx, g, bx, by, tp, tx, ty2, s, fl, lift;
      var tgt = [T.xs[0], T.ys[0]], rel = pawPos(ARM.rel, kk, BALL_DIST), near;

      if (p < PT) {
        tau = seg(p / PT, 0.1, 1); a = armAt(tau);
        if (tau < REL_AT) pos = pawPos(a, kk, BALL_DIST);
        else {
          fl = seg(tau, REL_AT, 1);
          lift = 70 + 0.3 * Math.abs(tgt[0] - rel[0]);
          pos = [lerp(rel[0], tgt[0], fl), lerp(rel[1], tgt[1], fl) - 4 * lift * fl * (1 - fl)];
        }
        ref = lerp(250, T.fy[0], ease(seg(p / PT, 0.1, 1)));
      } else {
        a = ARM.fol;
        if (p >= PE) kf = M - 1;
        else {
          idx = Math.min(N - 1, Math.floor((p - PT) / (PE - PT) * N));
          kf = kOf(idx, ((p - PT) / (PE - PT) * N) - idx);
        }
        tp = at(kf); pos = [tp[0], tp[1]]; ref = tp[2];
        shrink = 1 - 0.85 * ease(seg(kf, T.kEntry + 8, M - 1));
      }
      bx = pos[0]; by = pos[1];

      /* 새싹: PE 이후에 조그맣게 자란다 */
      g = ease(seg(p, PE, 1));
      var sl = ease(seg(g, 0.55, 1));
      sprout.stem.setAttribute('stroke-dasharray', '100');
      sprout.stem.setAttribute('stroke-dashoffset', f1(100 * (1 - seg(g, 0, 0.7))));
      sprout.l.setAttribute('transform', 'translate(1 -20) rotate(22) scale(' + f1(-sl) + ' ' + f1(sl) + ')');
      sprout.r.setAttribute('transform', 'translate(1 -20) rotate(-22) scale(' + f1(sl) + ' ' + f1(sl) + ')');
      sprout.g.setAttribute('opacity', g > 0.001 ? 1 : 0);
      ringG.setAttribute('opacity', f1(1 - 0.55 * g));

      /* 공 */
      ball.setAttribute('transform', 'translate(' + f1(bx) + ' ' + f1(by) + ')');
      ballC.setAttribute('r', f1(ballR * shrink));
      ballHalo.setAttribute('r', f1(ballR * 1.9 * shrink));
      ball.setAttribute('opacity', g > 0.08 ? 0 : 1);

      /* 지나온 길만 진하게 */
      if (p < PT) trav.setAttribute('stroke-dasharray', '0 ' + f1(T.L + 100));
      else trav.setAttribute('stroke-dasharray', f1(kf * DS) + ' ' + f1(T.L + 100));

      /* Calculus 층: 공이 있는 곳의 접선 */
      near = p >= PT && p < PE ? Math.min(N - 1, Math.floor((p - PT) / (PE - PT) * N)) : -1;
      if (near === 3) {
        tx = T.xs[Math.min(M - 1, Math.ceil(kf))] - T.xs[Math.max(0, Math.floor(kf) - 1)];
        ty2 = T.ys[Math.min(M - 1, Math.ceil(kf))] - T.ys[Math.max(0, Math.floor(kf) - 1)];
        s = Math.sqrt(tx * tx + ty2 * ty2) || 1; tx /= s; ty2 /= s;
        tan.setAttribute('x1', f1(bx - tx * 70)); tan.setAttribute('y1', f1(by - ty2 * 70));
        tan.setAttribute('x2', f1(bx + tx * 70)); tan.setAttribute('y2', f1(by + ty2 * 70));
        tan.setAttribute('opacity', 1);
        tanLabel.setAttribute('x', f1(bx)); tanLabel.setAttribute('y', f1(by - 30));
        tanLabel.setAttribute('opacity', 1);
      } else { tan.setAttribute('opacity', 0); tanLabel.setAttribute('opacity', 0); }

      /* 라쿤: 팔과 눈동자 */
      rc.arm.setAttribute('transform', 'translate(' + SHOULDER[0] + ' ' + SHOULDER[1] + ') rotate(' + f1(a) + ')');
      var hdx = bx - RX, hdy = by - (LEDGE - 76 * kk), hl = Math.sqrt(hdx * hdx + hdy * hdy) || 1, amt = Math.min(1, hl / 120) * 1.8;
      rc.pl.setAttribute('cx', f1(-13 + hdx / hl * amt)); rc.pl.setAttribute('cy', f1(-76 + hdy / hl * amt));
      rc.pr.setAttribute('cx', f1(13 + hdx / hl * amt));  rc.pr.setAttribute('cy', f1(-76 + hdy / hl * amt));

      /* 카메라: 공이 있는 곳의 완만한 높이를 따라 내려간다 */
      var phi = lerp(0.6, 0.42, ease(seg(p, PT, PT + 0.1)));
      var cam = clamp(ref - phi * view.vh, 0, Math.max(0, H - view.vh));
      world.setAttribute('transform', 'translate(0 ' + f1(-cam) + ')');
      for (i = 0; i < N; i++) {
        bands[i].g.setAttribute('display', (bands[i].bot < cam - 80 || bands[i].top > cam + view.vh + 80) ? 'none' : 'inline');
      }

      /* 아래 줄의 설명 */
      idx = p < PT ? 0 : (p >= PE ? N - 1 : Math.min(N - 1, Math.floor((p - PT) / (PE - PT) * N)));
      if (idx !== lastIdx) {
        lastIdx = idx;
        if (caption) caption.textContent = pad2(idx + 1) + ' / ' + pad2(N) + '  ' + LAYERS[idx].name + ' · ' + LAYERS[idx].sub;
      }
    }

    /* --- 시간 → 장면 --- */
    var t = 0, last = 0, raf = 0, paused = reduce, visible = true;

    function render(tt) {
      draw(clamp(tt / D, 0, 1));
      fade.setAttribute('opacity', reduce ? 1 : f1(Math.min(seg(tt, 0, T_FADE), 1 - seg(tt, LOOP - T_FADE, LOOP))));
    }
    function frame(now) {
      raf = 0;
      if (paused || !visible) return;
      var dt = Math.min((now - last) / 1000, 0.1);
      last = now; t += dt;
      if (t >= LOOP) t -= LOOP;
      render(t);
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
      rz = window.requestAnimationFrame(function () { rz = null; resize(); });
    });

    resize();
    if (reduce) { t = (PT + 0.012) * D; render(t); }      // 움직이지 않는 화면: 공이 막 트랙에 내려앉은 순간
    else { render(0); label(); play(); }
    label();

    var api = {
      show: function (tt) { pause(); paused = true; label(); t = tt; render(tt); },   // 테스트·캡처용
      track: T, view: view, layers: LAYERS, D: D, LOOP: LOOP, PT: PT, PE: PE
    };
    window.AboutArt.last = api;
    return api;
  }

  window.AboutArt = { init: init };
})();
