/* about-art.js
   About 페이지의 "수학 롤러코스터".
   라쿤이 던진 공이 함수 트랙을 타고 내려갑니다. 내려갈수록 배경은 더 단순하고 근본적인 수학으로 바뀌고,
   공이 맨 밑의 ∅(공집합)에 닿으면 그 자리에서 새싹이 자랍니다.
   - SVG 로 그리고, 스크롤 위치(0~1)가 곧 장면의 진행도입니다. 시간이 아니라 스크롤에 묶여 있어서
     올리면 거꾸로 올라갑니다. 외부 라이브러리 없음.
   - 공은 "곡선 위의 구슬"처럼 움직입니다. 내리막에서 빠르고 오르막에서 느립니다.
   - prefers-reduced-motion 이면 움직임 없이, 전체를 한 장으로 펼친 그림만 보여 줍니다.
   - 층의 이름·설명·연산은 아래 LAYERS 에서 고칩니다. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var PI = Math.PI;

  /* ======================================================================
     1. 층 (위가 가장 고급, 아래로 갈수록 단순하고 근본적)
     ====================================================================== */
  var LAYERS = [
    { name: '해석학',        sub: '극한 · 연속 · 적분 · 급수',        op: 'lim   ∫   Σ' },
    { name: '현대대수학',    sub: '군 · 환 · 체',                    op: 'a ∘ b' },
    { name: '선형대수',      sub: '행렬 · 벡터 · 선형사상',          op: 'A · B' },
    { name: '미적분',        sub: '극한 · 미분 · 적분',              op: 'd/dx   ∫' },
    { name: '방정식과 함수', sub: '다항식 · 방정식 · 그래프',        op: 'f(x) = 0' },
    { name: '정수와 나머지', sub: '약수 · 소수 · 합동',              op: 'mod   gcd' },
    { name: '사칙연산',      sub: '더하기 · 빼기 · 곱하기 · 나누기', op: '+   −   ×   ÷' },
    { name: '수 세기',       sub: '하나, 둘, 셋 … 그리고 0',         op: 'n → n + 1' },
    { name: '집합과 논리',   sub: '원소 · 집합 · 참과 거짓',         op: '∈   ∪   ∩   ¬' }
  ];
  var N = LAYERS.length;

  /* ======================================================================
     2. 월드 좌표 (가로 1000 고정, 세로로 길게)
     ====================================================================== */
  var X0 = 370, X1 = 740, MID = (X0 + X1) / 2;   // 트랙이 오가는 가로 범위
  var Y0 = 410;                                   // 첫 층 트랙이 시작하는 높이
  var LH = 560;                                   // 층 하나의 높이
  var DROP = 350;                                 // 층 하나에서 트랙이 내려가는 높이
  var RX = 255, LEDGE = 235;                      // 라쿤이 앉은 자리(가로, 발판 높이)
  var PT = 0.085;                                 // 스크롤 0~PT: 공 던지기
  var PE = 0.93;                                  // PT~PE: 트랙 타기, PE~1: 새싹
  var DS = 3;                                     // 트랙을 점으로 나눈 간격
  var STICKY_TOP = 16;                            // CSS 의 .co-stage top 과 같아야 함

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
    /* 0 해석학: 푸리에 급수의 부분합 Σ (−1)^(n+1) sin(nθ)/n, n ≤ 4 */
    function (u) {
      var th = 2 * PI * 2 * u, s = 0, n;
      for (n = 1; n <= 4; n++) s += (n % 2 ? 1 : -1) * Math.sin(n * th) / n;
      return DROP * u + 30 * s;
    },
    /* 1 현대대수학: 사인파 (원분체·단위근의 모양) */
    function (u) { return DROP * u + 34 * Math.sin(2 * PI * 2 * u); },
    /* 2 선형대수: 직선 조각을 이은 톱니 (구간별 선형) */
    function (u) {
      var q = u * 4, f = q - Math.floor(q), tri = f < 0.5 ? f * 2 : 2 - 2 * f;
      return DROP * u + 46 * tri;
    },
    /* 3 미적분: 3차 다항식 */
    function (u) { return DROP * (u + 2.4 * u * (1 - u) * (1 - 2 * u)); },
    /* 4 방정식과 함수: 포물선 y = x² */
    function (u) { return DROP * u * u; },
    /* 5 정수와 나머지: 나머지(mod)의 톱니 — 완만한 오르막 뒤에 수직 낙하 */
    function (u) { var q = 3 * u; return DROP * u - 70 * (q - Math.floor(q)); },
    /* 6 사칙연산: 직선 y = x + c */
    function (u) { return DROP * u; }
    /* 7 수 세기는 계단, 8 집합과 논리는 깔때기: 아래에서 따로 만듭니다 */
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
    var k, a, d = '', px, py;
    S('circle', { cx: cx, cy: cy, r: r, 'class': 'co-ln' }, g);
    for (k = 0; k < n; k++) {
      a = (-90 + 360 * k / n) * PI / 180;
      px = cx + Math.cos(a) * r; py = cy + Math.sin(a) * r;
      d += (k ? 'L' : 'M') + f1(px) + ' ' + f1(py);
      dot(g, px, py, 3.2);
    }
    S('path', { d: d + 'Z', 'class': 'co-ln co-dash' }, g);
    dot(g, cx, cy, 2);
    a = (-90 + 360 / n) * PI / 180;
    arrow(g, cx, cy, cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    txt(g, 'ℤ/8ℤ', cx, cy + r + 26, 18);
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
    txt(g, '하나 · 둘 · 셋', cx, cy + 62, 16, 'co-f co-k');
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
      for (x = 0; x <= 1000; x += gs) d += 'M' + x + ' ' + top + 'V' + bot;
      for (y = Math.ceil(top / gs) * gs; y < bot; y += gs) d += 'M0 ' + y + 'H1000';
      S('path', { d: d, 'class': 'co-grid' }, g);
    }
    /* 층 경계선과 이름 */
    if (i > 0) ln(g, 0, top, 1000, top, 'co-sep');
    var hx = odd ? 188 : 892, ha = odd ? 'start' : 'end', hy = i === 0 ? 70 : top + 40;
    txt(g, pad2(i + 1), hx, hy, 13, 'co-no', ha);
    txt(g, LAYERS[i].name, hx, hy + 28, 24, 'co-name', ha);

    if (i === 0) {
      figEpsDelta(g, X(275), T + 130);
      B('∫', 815, T + 215, 210);
      F('lim_{x→a} f(x) = L', 620, T + 70, 22);
      F('Σ 1/n^2 = π^2/6', 500, T + 300, 22);
      F('‖f‖_2', 290, T + 335, 22);
    } else if (i === 1) {
      figRoots(g, X(275), T + 120, 52, 8);
      B('ℤ', 815, T + 215, 190);
      F('y^2 = x^3 + ax + b', 620, T + 70, 22);
      F('|G| = [G:H]·|H|', 500, T + 300, 22);
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
     5. 라쿤 (원본 사진과 닮은 작은 벡터 그림) · ∅ 와 새싹
     ====================================================================== */
  function buildRaccoon(parent) {
    var g = S('g', { 'class': 'co-rc' }, parent), arm, pl, pr, tail;
    /* 꼬리: 두꺼운 선 위에 어두운 줄무늬(점선)를 얹어 고리무늬로 */
    var td = 'M-10 -8C-40 -4 -56 -24 -48 -50C-43 -64 -32 -68 -27 -60';
    S('path', { d: td, 'class': 'rc-tail-line' }, g);
    S('path', { d: td, 'class': 'rc-tail' }, g);
    S('path', { d: td, 'class': 'rc-rings' }, g);
    S('circle', { cx: -27, cy: -60, r: 10, 'class': 'rc-dark' }, g);
    /* 귀 */
    S('circle', { cx: -21, cy: -95, r: 9.5, 'class': 'rc-fur' }, g);
    S('circle', { cx: 21, cy: -95, r: 9.5, 'class': 'rc-fur' }, g);
    S('circle', { cx: -21, cy: -94, r: 5, 'class': 'rc-dark' }, g);
    S('circle', { cx: 21, cy: -94, r: 5, 'class': 'rc-dark' }, g);
    /* 몸 */
    S('path', { d: 'M-26 -6C-34 -30 -26 -62 0 -62C26 -62 34 -30 26 -6C14 0 -14 0 -26 -6Z', 'class': 'rc-fur rc-edge' }, g);
    S('ellipse', { cx: 0, cy: -28, rx: 14, ry: 22, 'class': 'rc-belly' }, g);
    S('ellipse', { cx: -13, cy: -2, rx: 11, ry: 5.5, 'class': 'rc-dark' }, g);
    S('ellipse', { cx: 13, cy: -2, rx: 11, ry: 5.5, 'class': 'rc-dark' }, g);
    /* 가만히 있는 왼팔 */
    S('path', { d: 'M-21 -52C-27 -44 -24 -34 -19 -29', 'class': 'rc-limb' }, g);
    S('circle', { cx: -18, cy: -28, r: 5, 'class': 'rc-dark' }, g);
    /* 머리 */
    S('ellipse', { cx: 0, cy: -76, rx: 29, ry: 22, 'class': 'rc-fur rc-edge' }, g);
    S('ellipse', { cx: -20, cy: -69, rx: 10, ry: 8, 'class': 'rc-belly' }, g);
    S('ellipse', { cx: 20, cy: -69, rx: 10, ry: 8, 'class': 'rc-belly' }, g);
    S('ellipse', { cx: -13, cy: -91, rx: 7, ry: 3, 'class': 'rc-belly' }, g);
    S('ellipse', { cx: 13, cy: -91, rx: 7, ry: 3, 'class': 'rc-belly' }, g);
    S('ellipse', { cx: 0, cy: -67, rx: 11, ry: 8, 'class': 'rc-belly' }, g);
    /* 눈 가면 */
    S('path', { d: 'M-28 -82C-20 -90 -6 -86 0 -80C6 -86 20 -90 28 -82C31 -72 22 -66 12 -68C6 -69 3 -73 0 -73C-3 -73 -6 -69 -12 -68C-22 -66 -31 -72 -28 -82Z', 'class': 'rc-dark' }, g);
    S('ellipse', { cx: -12, cy: -77, rx: 4.6, ry: 3.8, 'class': 'rc-eye' }, g);
    S('ellipse', { cx: 12, cy: -77, rx: 4.6, ry: 3.8, 'class': 'rc-eye' }, g);
    pl = S('circle', { cx: -12, cy: -77, r: 2.3, 'class': 'rc-dark' }, g);
    pr = S('circle', { cx: 12, cy: -77, r: 2.3, 'class': 'rc-dark' }, g);
    S('ellipse', { cx: 0, cy: -73, rx: 4.6, ry: 3.2, 'class': 'rc-dark' }, g);
    S('path', { d: 'M-4 -64Q0 -61 4 -64', 'class': 'rc-mouth' }, g);
    /* 공을 던지는 오른팔: 어깨를 축으로 회전 */
    arm = S('g', { transform: 'translate(22 -52)' }, g);
    S('path', { d: 'M0 0L0 26', 'class': 'rc-limb' }, arm);
    S('circle', { cx: 0, cy: 28, r: 5.5, 'class': 'rc-dark' }, arm);
    return { g: g, arm: arm, pl: pl, pr: pr };
  }

  function buildSprout(parent) {
    var g = S('g', { 'class': 'co-sprout' }, parent);
    var stem = S('path', { d: 'M0 0C-3 -22 6 -42 2 -66', 'class': 'sp-stem', pathLength: 100 }, g);
    var leafD = 'M0 0C8 -13 26 -17 40 -7C28 6 10 9 0 0Z';
    var lf = S('path', { d: leafD, 'class': 'sp-leaf' }, g);
    var rt = S('path', { d: leafD, 'class': 'sp-leaf' }, g);
    var bud = S('circle', { cx: 2, cy: -66, r: 3.4, 'class': 'sp-leaf' }, g);
    return { g: g, stem: stem, l: lf, r: rt, bud: bud };
  }

  /* ======================================================================
     6. 던지기: 팔을 뒤로 젖혔다가 휘두르고, 공은 포물선으로 트랙에 내려앉는다
     ====================================================================== */
  var ARM = { hold: -150, back: -232, rel: -108, fol: -35 };   // 도 단위. 0 = 팔이 아래를 향함
  var REL_AT = 0.52;                                            // 이 진행도에서 손을 떠난다
  function armAt(tau) {
    if (tau < 0.28) return lerp(ARM.hold, ARM.back, ease(tau / 0.28));
    if (tau < REL_AT) return lerp(ARM.back, ARM.rel, easeIn(seg(tau, 0.28, REL_AT)));
    return lerp(ARM.rel, ARM.fol, easeOut(seg(tau, REL_AT, 0.85)));
  }
  function pawPos(aDeg, k, dist) {
    var a = aDeg * PI / 180;
    return [RX + k * (22 - Math.sin(a) * dist), LEDGE + k * (-52 + Math.cos(a) * dist)];
  }

  /* ======================================================================
     7. 화면에 붙이기
     ====================================================================== */
  function init(root) {
    var track = root.querySelector('[data-co-track]');
    var stage = root.querySelector('[data-co-stage]');
    var holder = root.querySelector('[data-co-svg]');
    var card = root.querySelector('[data-co-card]');
    var elNo = root.querySelector('[data-co-no]');
    var elName = root.querySelector('[data-co-name]');
    var elSub = root.querySelector('[data-co-sub]');
    var elOp = root.querySelector('[data-co-op]');
    var dotsBox = root.querySelector('[data-co-dots]');
    var hint = root.querySelector('[data-co-hint]');
    var list = root.querySelector('[data-co-list]');
    if (!track || !stage || !holder) return null;

    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var T = buildTrack();
    var H = T.C[1] + 380;
    var M = T.M;

    /* --- SVG --- */
    var svg = S('svg', { 'class': 'co-world', 'aria-hidden': 'true', focusable: 'false' }, holder);
    var world = S('g', {}, svg);

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
    S('circle', { cx: T.C[0], cy: T.C[1], r: 34, 'class': 'co-ring' }, ringG);
    ln(ringG, T.C[0] - 24, T.C[1] + 24, T.C[0] + 24, T.C[1] - 24, 'co-ring');

    var sprout = buildSprout(world);
    sprout.g.setAttribute('transform', 'translate(' + f1(T.C[0]) + ' ' + f1(T.C[1]) + ')');

    var tan = ln(world, 0, 0, 0, 0, 'co-tan');
    var tanLabel = txt(world, 'f′(x)', 0, 0, 18, 'co-f', 'middle');

    /* 발판과 라쿤 */
    var ledge = S('g', { 'class': 'co-ledge' }, world);
    ln(ledge, RX - 78, LEDGE, RX + 78, LEDGE, 'co-ledge-top');
    var hd = '', hx;
    for (hx = RX - 70; hx <= RX + 70; hx += 14) hd += 'M' + hx + ' ' + (LEDGE + 2) + 'l-9 11';
    S('path', { d: hd, 'class': 'co-ln' }, ledge);
    var rcWrap = S('g', {}, world);
    var rc = buildRaccoon(rcWrap);

    var ball = S('g', { 'class': 'co-ball' }, world);
    var ballC = S('circle', { cx: 0, cy: 0, r: 12, 'class': 'co-ball-c' }, ball);
    var ballH = S('circle', { cx: -4, cy: -4, r: 3.4, 'class': 'co-ball-h' }, ball);

    /* 접근성용 목록 */
    if (list) {
      for (i = 0; i < N; i++) {
        var li = document.createElement('li');
        li.textContent = LAYERS[i].name + ' — ' + LAYERS[i].sub;
        list.appendChild(li);
      }
    }

    /* 오른쪽 점: 층으로 건너뛰기 */
    var dotBtns = [];
    if (dotsBox && !reduce) {
      for (i = 0; i < N; i++) {
        (function (idx) {
          var li2 = document.createElement('li');
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', pad2(idx + 1) + ' ' + LAYERS[idx].name + ' 로 이동');
          b.addEventListener('click', function () { scrollToLayer(idx); });
          li2.appendChild(b); dotsBox.appendChild(li2);
          dotBtns.push(b);
        })(i);
      }
    }

    /* --- 크기 --- */
    var view = { vx: 0, vw: 1000, vh: 600, sc: 1, k: 1 };
    var lastP = 0, lastIdx = -1, lastEnd = null;

    function resize() {
      var r = stage.getBoundingClientRect(), W = r.width || 1000, Hh = r.height || 600, f, vw, vh, asp;
      if (reduce) { f = clamp((W - 360) / 540, 0, 1); vw = 750 + 250 * f; vh = H; }
      else { asp = W / Hh; f = clamp((asp - 0.55) / 0.95, 0, 1); vw = 750 + 250 * f; vh = vw / asp; }
      view.vw = vw; view.vh = vh; view.vx = 150 - 150 * f; view.sc = W / vw;
      view.k = clamp(0.9 / view.sc, 1, 1.55);
      svg.setAttribute('viewBox', f1(view.vx) + ' 0 ' + f1(vw) + ' ' + f1(vh));
      var u = 1 / view.sc;
      rail.setAttribute('stroke-width', f1(3 * u));
      trav.setAttribute('stroke-width', f1(3.4 * u));
      ties.setAttribute('stroke-width', f1(10 * u));
      ties.setAttribute('stroke-dasharray', f1(1.8 * u) + ' ' + f1(11 * u));
      ballC.setAttribute('stroke-width', f1(2 * u));
      rcWrap.setAttribute('transform', 'translate(' + RX + ' ' + LEDGE + ') scale(' + f1(view.k) + ')');
      draw(lastP);
    }

    /* --- 한 장면 그리기 --- */
    function at(kf) {
      var k0 = Math.min(M - 2, Math.max(0, Math.floor(kf))), fr = clamp(kf - k0, 0, 1);
      return [lerp(T.xs[k0], T.xs[k0 + 1], fr), lerp(T.ys[k0], T.ys[k0 + 1], fr), lerp(T.fy[k0], T.fy[k0 + 1], fr), k0, fr];
    }
    function kOf(piece, u) {
      var lo = T.pk[piece], hi = T.pk[piece + 1], mid, fr, d;
      while (hi - lo > 1) { mid = (lo + hi) >> 1; if (T.tc[mid] < u) lo = mid; else hi = mid; }
      d = T.tc[hi] - T.tc[lo];
      fr = d > 1e-9 ? (u - T.tc[lo]) / d : 0;
      return lo + clamp(fr, 0, 1);
    }

    function draw(p) {
      lastP = p;
      var kk = view.k, tau, a, pos, kf, ref, ballR = 12 * kk, shrink = 1, idx, g, bx, by, tp, tx, ty2, s;
      var tgt = [T.xs[0], T.ys[0]], rel = pawPos(ARM.rel, kk, 38), fl, lift, near;

      if (p < PT) {
        tau = p / PT; a = armAt(tau); kf = 0;
        if (tau < REL_AT) pos = pawPos(a, kk, 38);
        else {
          fl = seg(tau, REL_AT, 1);
          lift = 70 + 0.3 * Math.abs(tgt[0] - rel[0]);
          pos = [lerp(rel[0], tgt[0], fl), lerp(rel[1], tgt[1], fl) - 4 * lift * fl * (1 - fl)];
        }
        ref = lerp(250, T.fy[0], ease(tau));
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

      /* 새싹: PE 이후 스크롤로 자란다 */
      g = ease(seg(p, PE, 1));
      var ks = Math.max(1.5, view.k * 1.2), sl = ease(seg(g, 0.55, 1));
      sprout.g.setAttribute('transform', 'translate(' + f1(T.C[0]) + ' ' + f1(T.C[1]) + ') scale(' + f1(ks) + ')');
      sprout.stem.setAttribute('stroke-dasharray', '100');
      sprout.stem.setAttribute('stroke-dashoffset', f1(100 * (1 - seg(g, 0, 0.7))));
      sprout.l.setAttribute('transform', 'translate(2 -66) rotate(20) scale(' + f1(-sl) + ' ' + f1(sl) + ')');
      sprout.r.setAttribute('transform', 'translate(2 -66) rotate(-20) scale(' + f1(sl) + ' ' + f1(sl) + ')');
      sprout.bud.setAttribute('r', f1(3.4 * seg(g, 0.6, 0.8) * (1 - sl)));
      sprout.g.setAttribute('opacity', g > 0.001 ? 1 : 0);
      ringG.setAttribute('opacity', f1(1 - 0.65 * g));

      /* 공 */
      ball.setAttribute('transform', 'translate(' + f1(bx) + ' ' + f1(by) + ')');
      ballC.setAttribute('r', f1(ballR * shrink));
      ballH.setAttribute('r', f1(ballR * shrink * 0.28));
      ballH.setAttribute('cx', f1(-ballR * shrink * 0.34));
      ballH.setAttribute('cy', f1(-ballR * shrink * 0.34));
      ball.setAttribute('opacity', g > 0.08 ? 0 : 1);

      /* 지나온 길만 파랗게 */
      if (p < PT) trav.setAttribute('stroke-dasharray', '0 ' + f1(T.L + 100));
      else trav.setAttribute('stroke-dasharray', f1(kf * DS) + ' ' + f1(T.L + 100));

      /* 미적분 층: 공이 있는 곳의 접선 */
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
      rc.arm.setAttribute('transform', 'translate(22 -52) rotate(' + f1(a) + ')');
      var hdx = bx - RX, hdy = by - (LEDGE - 76 * kk), hl = Math.sqrt(hdx * hdx + hdy * hdy) || 1, amt = Math.min(1, hl / 120) * 2.2;
      rc.pl.setAttribute('cx', f1(-12 + hdx / hl * amt)); rc.pl.setAttribute('cy', f1(-77 + hdy / hl * amt));
      rc.pr.setAttribute('cx', f1(12 + hdx / hl * amt));  rc.pr.setAttribute('cy', f1(-77 + hdy / hl * amt));

      /* 카메라 */
      var phi = lerp(0.6, 0.42, ease(seg(p, PT, PT + 0.1)));
      var cam = reduce ? 0 : clamp(ref - phi * view.vh, 0, Math.max(0, H - view.vh));
      world.setAttribute('transform', 'translate(0 ' + f1(-cam) + ')');
      for (i = 0; i < N; i++) {
        bands[i].g.setAttribute('display', (bands[i].bot < cam - 80 || bands[i].top > cam + view.vh + 80) ? 'none' : 'inline');
      }

      /* 카드·점 */
      if (!reduce) {
        idx = p < PT ? 0 : (p >= PE ? N - 1 : Math.min(N - 1, Math.floor((p - PT) / (PE - PT) * N)));
        if (idx !== lastIdx) {
          lastIdx = idx;
          if (elNo) elNo.textContent = pad2(idx + 1) + ' / ' + pad2(N);
          if (elName) elName.textContent = LAYERS[idx].name;
          if (elSub) elSub.textContent = LAYERS[idx].sub;
          if (elOp) elOp.textContent = LAYERS[idx].op;
          dotBtns.forEach(function (b, n2) {
            if (n2 === idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
          });
        }
        var isEnd = p >= PE + 0.02;
        if (isEnd !== lastEnd) { lastEnd = isEnd; if (card) card.classList.toggle('is-end', isEnd); }
        if (hint) hint.style.opacity = f1(1 - seg(p, 0, 0.03));
      }
    }

    /* --- 스크롤 → 진행도 --- */
    function progress() {
      var r = track.getBoundingClientRect(), total = track.offsetHeight - stage.offsetHeight;
      if (total <= 0) return 0;
      return clamp((STICKY_TOP - r.top) / total, 0, 1);
    }
    function scrollToLayer(n) {
      var r = track.getBoundingClientRect(), total = track.offsetHeight - stage.offsetHeight;
      var target = PT + (n + 0.04) / N * (PE - PT);
      var y = window.pageYOffset + r.top - STICKY_TOP + target * total;
      var smooth = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        var r = track.getBoundingClientRect();
        if (r.bottom < -300 || r.top > window.innerHeight + 300) return;
        draw(progress());
      });
    }

    root.classList.toggle('is-static', reduce);
    root.hidden = false;
    resize();
    if (reduce) {
      draw(1);                                       // 끝까지 간 모습 한 장
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
      draw(progress());
    }
    var rz = null;
    window.addEventListener('resize', function () {
      if (rz) window.cancelAnimationFrame(rz);
      rz = window.requestAnimationFrame(function () { rz = null; resize(); if (!reduce) draw(progress()); });
    });
    window.addEventListener('load', function () { resize(); if (!reduce) draw(progress()); });

    return {
      draw: draw, resize: resize, track: T, view: view, layers: LAYERS,
      PT: PT, PE: PE
    };
  }

  window.AboutArt = { init: init };
})();
