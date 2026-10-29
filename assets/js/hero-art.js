/* hero-art.js
   히어로 배경 애니메이션: 고전 암호 → RSA → 타원곡선 → 격자.
   SVG 로 그리고 requestAnimationFrame 으로 움직입니다. 외부 라이브러리 없음.
   - 모든 수치는 화면용 그림이 아니라 실제로 계산한 값입니다. (암호문, 모듈러 거듭제곱, 점 덧셈, 가우스 기저 축소)
   - prefers-reduced-motion 이면 자동 전환 없이 정지 화면만 보여 줍니다.
   - 화면 밖이면 멈추고, 일시정지 버튼과 장면 선택 버튼이 있습니다. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var PI = Math.PI;
  var VW = 1200, VH = 700;          // viewBox. 가로 1200 은 본문 폭과 같음
  var CY = 372;                     // 장면 중심의 세로 위치
  var FADE = 0.7;                   // 장면 앞뒤 페이드(초)
  /* 넓은 화면에서는 오른쪽 카드 뒤에, 좁은 화면에서는 가운데에 놓음 */
  function centerX(w) { return w >= 900 ? 770 : VW / 2; }

  /* ---------- 작은 도구들 ---------- */
  function S(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }       // [a,b] 구간의 진행도 0..1
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function text(parent, str, x, y, cls, anchor) {
    var e = S('text', { x: x, y: y, 'class': cls || 'a-txt', 'text-anchor': anchor || 'middle' }, parent);
    e.textContent = str;
    return e;
  }
  function circle(parent, x, y, r, cls) { return S('circle', { cx: x, cy: y, r: r, 'class': cls }, parent); }
  function line(parent, cls) { return S('line', { x1: 0, y1: 0, x2: 0, y2: 0, 'class': cls || 'a-line' }, parent); }
  function setLine(e, x1, y1, x2, y2) {
    e.setAttribute('x1', x1); e.setAttribute('y1', y1); e.setAttribute('x2', x2); e.setAttribute('y2', y2);
  }
  function op(e, v) { e.setAttribute('opacity', v); }
  function norm2(v) { return v[0] * v[0] + v[1] * v[1]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }

  /* 화살표: 선 + 작은 삼각형 */
  function arrow(parent, cls) {
    return { l: line(parent, cls), h: S('path', { 'class': 'a-head' }, parent) };
  }
  function setArrow(ar, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len, s = 9;
    setLine(ar.l, x1, y1, x2 - ux * s * 0.8, y2 - uy * s * 0.8);
    ar.h.setAttribute('d', 'M' + x2 + ' ' + y2 +
      'L' + (x2 - ux * s - uy * s * 0.45) + ' ' + (y2 - uy * s + ux * s * 0.45) +
      'L' + (x2 - ux * s + uy * s * 0.45) + ' ' + (y2 - uy * s - ux * s * 0.45) + 'Z');
  }

  /* ======================================================================
     장면 1. 고전 암호: 카이사르 → 비제네르
     바깥 원은 평문 알파벳, 안쪽 원은 암호 알파벳. 안쪽 원을 key 만큼 돌려 글자를 바꿉니다.
     ====================================================================== */
  function sceneClassical(g) {
    var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', STEP = 360 / 26;
    var Ro = 190, Ri = 152, i;
    function ang(k) { return (-90 + k * STEP) * PI / 180; }

    S('circle', { r: 212, 'class': 'a-line a-faint' }, g);
    S('circle', { r: 171, 'class': 'a-line' }, g);
    S('circle', { r: 132, 'class': 'a-line a-faint' }, g);
    var inner = S('g', {}, g);
    for (i = 0; i < 26; i++) {
      text(g, A.charAt(i), Math.cos(ang(i)) * Ro, Math.sin(ang(i)) * Ro + 5, 'a-txt');
      text(inner, A.charAt(i), Math.cos(ang(i)) * Ri, Math.sin(ang(i)) * Ri + 5, 'a-txt a-dim');
    }
    var hl = line(g, 'a-line a-strong');
    var ho = circle(g, 0, 0, 13, 'a-line a-strong');
    var hi = circle(g, 0, 0, 13, 'a-line a-strong');

    /* 단계 계산: 글자 하나당 (링 회전 → 강조) */
    var plans = [{ word: 'HELLO', key: 'D' }, { word: 'CRYPTO', key: 'KEY' }];
    var steps = [], T = 0.8, prev = 0, ph, j, n, p, k, d, rot, st, phStart = [];
    for (ph = 0; ph < plans.length; ph++) {
      phStart.push(T);
      n = plans[ph].word.length;
      for (j = 0; j < n; j++) {
        p = A.indexOf(plans[ph].word.charAt(j));
        k = A.indexOf(plans[ph].key.charAt(j % plans[ph].key.length));
        d = ((k - prev + 39) % 26) - 13;                 // 가장 짧은 회전량
        rot = d === 0 ? 0 : (ph === 0 ? 0.8 : 0.5);
        st = { ph: ph, j: j, p: p, k: k, c: (p + k) % 26, from: prev, d: d, start: T, rot: rot, end: T + rot + 0.5 };
        steps.push(st);
        T = st.end; prev = k;
      }
      T += 0.9;
    }
    var lastEnd = steps[steps.length - 1].end;

    /* 아래쪽 글자 줄: PLAIN / KEY / CIPHER */
    var rowY = [252, 276, 300], names = ['PLAIN', 'KEY', 'CIPHER'], rows = [];
    for (ph = 0; ph < plans.length; ph++) {
      n = plans[ph].word.length;
      var gp = S('g', {}, g), r = { g: gp, cells: [] };
      for (i = 0; i < 3; i++) text(gp, names[i], -((n - 1) / 2) * 30 - 26, rowY[i], 'a-txt a-small a-dim', 'end');
      for (j = 0; j < n; j++) {
        var x = (j - (n - 1) / 2) * 30;
        var stp = null, q;
        for (q = 0; q < steps.length; q++) { if (steps[q].ph === ph && steps[q].j === j) stp = steps[q]; }
        r.cells.push({
          step: stp,
          plain: text(gp, plans[ph].word.charAt(j), x, rowY[0], 'a-txt'),
          key: text(gp, plans[ph].key.charAt(j % plans[ph].key.length), x, rowY[1], 'a-txt a-dim'),
          cipher: text(gp, A.charAt(stp.c), x, rowY[2], 'a-txt a-bold')
        });
      }
      rows.push(r);
    }

    function draw(t) {
      var cur = null, s, i2, shift = 0;
      for (i2 = 0; i2 < steps.length; i2++) { if (t >= steps[i2].start) cur = steps[i2]; }
      if (cur) shift = cur.from + cur.d * (cur.rot ? ease(seg(t, cur.start, cur.start + cur.rot)) : 1);
      inner.setAttribute('transform', 'rotate(' + (-shift * STEP) + ')');

      var on = cur && t >= cur.start + cur.rot && t < cur.end + 0.25;
      if (on) {
        var a = ang(cur.p), cs = Math.cos(a), sn = Math.sin(a);
        setLine(hl, cs * 132, sn * 132, cs * 212, sn * 212);
        ho.setAttribute('cx', cs * Ro); ho.setAttribute('cy', sn * Ro);
        hi.setAttribute('cx', cs * Ri); hi.setAttribute('cy', sn * Ri);
        var o = 1 - seg(t, cur.end - 0.1, cur.end + 0.25) * 0.6;
        op(hl, o); op(ho, o); op(hi, o);
      } else { op(hl, 0); op(ho, 0); op(hi, 0); }

      for (i2 = 0; i2 < rows.length; i2++) {
        var fade = i2 === 0 ? 1 - seg(t, phStart[1] - 0.6, phStart[1] - 0.1) : 1;
        op(rows[i2].g, fade);
        for (j = 0; j < rows[i2].cells.length; j++) {
          s = rows[i2].cells[j];
          op(s.plain, seg(t, s.step.start, s.step.start + 0.25));
          op(s.key, seg(t, s.step.start, s.step.start + 0.25));
          op(s.cipher, seg(t, s.step.start + s.step.rot, s.step.start + s.step.rot + 0.25));
        }
      }
    }
    return { dur: lastEnd + 1.6, draw: draw };
  }

  /* ======================================================================
     장면 2. RSA: 모듈러 거듭제곱이 원 위에서 어떻게 보이는가
     N = 3 x 11 = 33, e = 3, d = 7. m = 4 를 암호화(4^3 mod 33 = 31)하고 복호화(31^7 mod 33 = 4).
     ====================================================================== */
  function sceneRSA(g) {
    var N = 33, R = 205, i, P = [], an;
    S('circle', { r: R, 'class': 'a-line a-faint' }, g);
    for (i = 0; i < N; i++) {
      an = (-90 + i * 360 / N) * PI / 180;
      P.push([Math.cos(an) * R, Math.sin(an) * R]);
      circle(g, P[i][0], P[i][1], 2.2, 'a-dotf');
    }
    function chain(base, n) { var x = 1, out = [1], q; for (q = 0; q < n; q++) { x = (x * base) % N; out.push(x); } return out; }
    var m = 4, e = 3, d = 7;
    var A = chain(m, e), c = A[e];            // 1, 4, 16, 31
    var B = chain(c, d);                      // 1, 31, 4, 25, 16, 1, 31, 4  → 마지막 값이 m
    var seen = {}, labels = A.concat(B);
    for (i = 0; i < labels.length; i++) {
      var v = labels[i];
      if (seen[v]) continue;
      seen[v] = 1;
      an = (-90 + v * 360 / N) * PI / 180;
      text(g, v, Math.cos(an) * (R + 24), Math.sin(an) * (R + 24) + 5, 'a-txt a-small');
    }

    var tA0 = 1.0, hopA = 0.8, tB0 = 4.4, hopB = 0.62, k;
    var linesA = [], linesB = [], dotsA = [], dotsB = [];
    for (k = 0; k < A.length - 1; k++) { linesA.push(line(g, 'a-line a-strong')); dotsA.push(circle(g, P[A[k + 1]][0], P[A[k + 1]][1], 4.5, 'a-dot')); }
    for (k = 0; k < B.length - 1; k++) { linesB.push(line(g, 'a-line a-dash')); dotsB.push(circle(g, P[B[k + 1]][0], P[B[k + 1]][1], 3.4, 'a-dot')); }
    var l1 = text(g, 'N = 3 × 11 = 33', 0, 268, 'a-txt');
    var l2 = text(g, 'Encrypt   ' + m + '³ mod 33 = ' + c, 0, 292, 'a-txt');
    var l3 = text(g, 'Decrypt   ' + c + '⁷ mod 33 = ' + B[d], 0, 316, 'a-txt');

    function draw(t) {
      var q, pr, a, b;
      for (q = 0; q < linesA.length; q++) {
        pr = ease(seg(t, tA0 + q * hopA, tA0 + q * hopA + hopA - 0.1));
        a = P[A[q]]; b = P[A[q + 1]];
        op(linesA[q], pr > 0 ? 1 : 0); setLine(linesA[q], a[0], a[1], lerp(a[0], b[0], pr), lerp(a[1], b[1], pr));
        op(dotsA[q], pr >= 1 ? 1 : 0);
      }
      for (q = 0; q < linesB.length; q++) {
        pr = ease(seg(t, tB0 + q * hopB, tB0 + q * hopB + hopB - 0.08));
        a = P[B[q]]; b = P[B[q + 1]];
        op(linesB[q], pr > 0 ? 1 : 0); setLine(linesB[q], a[0], a[1], lerp(a[0], b[0], pr), lerp(a[1], b[1], pr));
        op(dotsB[q], pr >= 1 ? 1 : 0);
      }
      op(l1, seg(t, 0.2, 0.7));
      op(l2, seg(t, tA0, tA0 + 0.5));
      op(l3, seg(t, tB0, tB0 + 0.5));
    }
    return { dur: tB0 + (B.length - 1) * hopB + 2.4, draw: draw };
  }

  /* ======================================================================
     장면 3. 타원곡선: y² = x³ − 2x + 4 위에서 P → 2P → 4P → 8P
     접선을 긋고, 곡선과 다시 만나는 점을 x축에 대칭시키면 2P.
     ====================================================================== */
  function sceneECC(g) {
    var a = -2, b = 4, sc = 70, ox = 0.6, xr = -2, xmax = 2.3;
    function X(x) { return (x - ox) * sc; }
    function Y(y) { return -y * sc; }
    function f(x) { return x * x * x + a * x + b; }

    var clipId = 'a-clip-ecc';
    var defs = S('defs', {}, g);
    var cp = S('clipPath', { id: clipId }, defs);
    S('rect', { x: -300, y: -245, width: 600, height: 490 }, cp);
    var lg = S('g', { 'clip-path': 'url(#' + clipId + ')' }, g);

    /* 축 */
    var ax = line(lg, 'a-line a-faint'); setLine(ax, X(-2.6), Y(0), X(2.7), Y(0));
    var ay = line(lg, 'a-line a-faint'); setLine(ay, X(0), -245, X(0), 245);

    /* 곡선: 위쪽 가지 → 꼭짓점(−2, 0) → 아래쪽 가지 */
    var pts = [], n = 90, u, x, d = '';
    for (u = n; u >= 0; u--) { x = xr + Math.pow(u / n, 2) * (xmax - xr); pts.push([x, Math.sqrt(Math.max(0, f(x)))]); }
    for (u = 1; u <= n; u++) { x = xr + Math.pow(u / n, 2) * (xmax - xr); pts.push([x, -Math.sqrt(Math.max(0, f(x)))]); }
    for (u = 0; u < pts.length; u++) d += (u ? 'L' : 'M') + X(pts[u][0]).toFixed(1) + ' ' + Y(pts[u][1]).toFixed(1);
    var curve = S('path', { d: d, 'class': 'a-line a-curve' }, lg);
    var len = 1200;
    try { len = curve.getTotalLength(); } catch (err) { /* 일부 환경에서는 길이를 못 구함 */ }
    curve.setAttribute('stroke-dasharray', len);

    /* 점 덧셈(접선): P → 2P, 실제 계산 */
    var P0 = [2, Math.sqrt(f(2))];                    // (2, 2√2)
    var steps = [], P = P0, i, lam, x3, yR, Q;
    for (i = 0; i < 3; i++) {
      lam = (3 * P[0] * P[0] + a) / (2 * P[1]);
      x3 = lam * lam - 2 * P[0];
      yR = P[1] + lam * (x3 - P[0]);                  // 접선이 곡선과 다시 만나는 점 R
      Q = [x3, -yR];                                  // R 을 x축에 대칭 → 2P
      steps.push({ P: P, R: [x3, yR], Q: Q, name: ['2P', '4P', '8P'][i] });
      P = Q;
    }

    var els = [], t0 = 1.4, per = 2.8;
    var pLabel = text(g, 'P', X(P0[0]) + 12, Y(P0[1]) - 10, 'a-txt a-bold', 'start');
    var pDot = circle(g, X(P0[0]), Y(P0[1]), 5, 'a-dot');
    for (i = 0; i < steps.length; i++) {
      var s = steps[i];
      var ox1 = s.P[0] - (s.R[0] - s.P[0]) * 0.1, oy1 = s.P[1] - (s.R[1] - s.P[1]) * 0.1;
      var ox2 = s.R[0] + (s.R[0] - s.P[0]) * 0.1, oy2 = s.R[1] + (s.R[1] - s.P[1]) * 0.1;
      els.push({
        s: s, i: i, start: t0 + i * per,
        tan: line(lg, 'a-line a-strong'), ax: ox1, ay: oy1, bx: ox2, by: oy2,
        rDot: circle(g, X(s.R[0]), Y(s.R[1]), 5, 'a-line a-hollow'),
        vert: line(lg, 'a-line a-dash'),
        qDot: circle(g, X(s.Q[0]), Y(s.Q[1]), 5, 'a-dot'),
        qLab: text(g, s.name, X(s.Q[0]) + 12, Y(s.Q[1]) + (s.Q[1] > 0 ? -10 : 20), 'a-txt a-bold', 'start')
      });
    }

    function draw(t) {
      curve.setAttribute('stroke-dashoffset', len * (1 - ease(seg(t, 0.1, 1.5))));
      op(pDot, seg(t, 0.9, 1.4)); op(pLabel, seg(t, 0.9, 1.4));
      var k, e, pr, nextStart;
      for (k = 0; k < els.length; k++) {
        e = els[k];
        pr = ease(seg(t, e.start, e.start + 1.0));
        op(e.tan, pr > 0 ? 1 - 0.7 * seg(t, e.start + per, e.start + per + 0.5) : 0);
        setLine(e.tan, X(e.ax), Y(e.ay), lerp(X(e.ax), X(e.bx), pr), lerp(Y(e.ay), Y(e.by), pr));
        op(e.rDot, seg(t, e.start + 1.0, e.start + 1.25));
        pr = ease(seg(t, e.start + 1.3, e.start + 1.85));
        op(e.vert, pr > 0 ? 1 : 0);
        setLine(e.vert, X(e.s.R[0]), Y(e.s.R[1]), X(e.s.R[0]), lerp(Y(e.s.R[1]), Y(e.s.Q[1]), pr));
        op(e.qDot, seg(t, e.start + 1.85, e.start + 2.1));
        op(e.qLab, seg(t, e.start + 1.85, e.start + 2.2));
      }
    }
    return { dur: t0 + els.length * per + 2.6, draw: draw };
  }

  /* ======================================================================
     장면 4. 격자: 나쁜 기저 → 가우스 기저 축소 → 가장 가까운 격자점(CVP)
     같은 격자를 길고 휜 기저로도, 짧은 기저로도 만들 수 있다. 짧은 기저가 있으면 가까운 점을 쉽게 찾는다.
     ====================================================================== */
  function sceneLattice(g) {
    var u1 = [80, 16], u2 = [-24, 72];                // 좋은 기저로 만든 격자 (점 찍기용)
    var i, j, px, py, cl;
    /* 격자의 틀: 기저 방향으로 아주 옅은 줄을 깔아 규칙이 보이게 함 */
    var defs = S('defs', {}, g), cp = S('clipPath', { id: 'a-clip-lat' }, defs);
    S('rect', { x: -380, y: -250, width: 760, height: 500 }, cp);
    var gl = S('g', { 'clip-path': 'url(#a-clip-lat)' }, g);
    for (i = -12; i <= 12; i++) {
      cl = line(gl, 'a-line a-grid');
      setLine(cl, -12 * u1[0] + i * u2[0], -12 * u1[1] + i * u2[1], 12 * u1[0] + i * u2[0], 12 * u1[1] + i * u2[1]);
      cl = line(gl, 'a-line a-grid');
      setLine(cl, i * u1[0] - 12 * u2[0], i * u1[1] - 12 * u2[1], i * u1[0] + 12 * u2[0], i * u1[1] + 12 * u2[1]);
    }
    for (i = -9; i <= 9; i++) {
      for (j = -9; j <= 9; j++) {
        px = i * u1[0] + j * u2[0]; py = i * u1[1] + j * u2[1];
        if (Math.abs(px) <= 380 && Math.abs(py) <= 250) circle(g, px, py, 3.2, 'a-dotf');
      }
    }
    circle(g, 0, 0, 5, 'a-dot');

    /* 나쁜 기저: b1 = 3u1 + 2u2, b2 = 4u1 + 3u2 (행렬식 1이라 같은 격자) */
    var b1 = [-(3 * u1[0] + 2 * u2[0]), -(3 * u1[1] + 2 * u2[1])];
    var b2 = [-(4 * u1[0] + 3 * u2[0]), -(4 * u1[1] + 3 * u2[1])];
    var states = [{ a: b1.slice(), b: b2.slice(), txt: 'Long, nearly parallel basis' }];
    (function gauss(a, b) {
      var mu, tmp;
      for (;;) {
        if (norm2(a) > norm2(b)) { tmp = a; a = b; b = tmp; states.push({ a: a.slice(), b: b.slice(), txt: 'Swap b₁ ↔ b₂' }); }
        mu = Math.round(dot(a, b) / norm2(a));
        if (mu === 0) break;
        b = [b[0] - mu * a[0], b[1] - mu * a[1]];
        states.push({ a: a.slice(), b: b.slice(), txt: 'b₂ ← b₂ − (' + mu + ')·b₁' });
      }
    })(b1, b2);
    var fin = states[states.length - 1];

    /* CVP: 격자점 + 작은 오차 → 짧은 기저로 반올림(Babai) */
    var Lp = [u2[0] - u1[0], u2[1] - u1[1]];          // 목표 근처의 격자점
    var tgt = [Lp[0] + 13, Lp[1] - 17];               // 격자점 + 작은 오차
    var det = fin.a[0] * fin.b[1] - fin.a[1] * fin.b[0];
    var al = Math.round((tgt[0] * fin.b[1] - tgt[1] * fin.b[0]) / det);
    var be = Math.round((fin.a[0] * tgt[1] - fin.a[1] * tgt[0]) / det);
    var near = [al * fin.a[0] + be * fin.b[0], al * fin.a[1] + be * fin.b[1]];

    var cell = S('path', { 'class': 'a-fill' }, g);
    var A1 = arrow(g, 'a-line a-strong'), A2 = arrow(g, 'a-line a-strong');
    var t1 = text(g, 'b₁', 0, 0, 'a-txt a-bold'), t2 = text(g, 'b₂', 0, 0, 'a-txt a-bold');
    var msg = text(g, '', 0, 262, 'a-txt');
    var tD = S('path', { 'class': 'a-line a-hollow', d: 'M' + tgt[0] + ' ' + (tgt[1] - 6) + 'L' + (tgt[0] + 6) + ' ' + tgt[1] + 'L' + tgt[0] + ' ' + (tgt[1] + 6) + 'L' + (tgt[0] - 6) + ' ' + tgt[1] + 'Z' }, g);
    var tL = text(g, 't', tgt[0] + 12, tgt[1] - 8, 'a-txt a-bold', 'start');
    var eL = line(g, 'a-line a-dash');
    var nR = circle(g, near[0], near[1], 10, 'a-line a-strong');
    var nL = text(g, 'Closest lattice point', near[0] + 16, near[1] + 32, 'a-txt a-small', 'start');

    var h0 = 1.0, per = 1.55, cvp0 = h0 + (states.length - 1) * per + 0.8;

    function draw(t) {
      var idx = clamp((t - h0) / per, 0, states.length - 1);
      var lo = Math.floor(idx), hi = Math.min(lo + 1, states.length - 1), pr = ease(idx - lo);
      var sa = states[lo], sb = states[hi];
      var va = [lerp(sa.a[0], sb.a[0], pr), lerp(sa.a[1], sb.a[1], pr)];
      var vb = [lerp(sa.b[0], sb.b[0], pr), lerp(sa.b[1], sb.b[1], pr)];
      setArrow(A1, 0, 0, va[0], va[1]);
      setArrow(A2, 0, 0, vb[0], vb[1]);
      t1.setAttribute('x', va[0] + (va[0] >= 0 ? 14 : -14)); t1.setAttribute('y', va[1] + 5);
      t2.setAttribute('x', vb[0] + (vb[0] >= 0 ? 14 : -14)); t2.setAttribute('y', vb[1] + 5);
      var doneP = seg(t, h0 + (states.length - 1) * per - 0.2, h0 + (states.length - 1) * per + 0.5);
      cell.setAttribute('d', 'M0 0L' + va[0] + ' ' + va[1] + 'L' + (va[0] + vb[0]) + ' ' + (va[1] + vb[1]) + 'L' + vb[0] + ' ' + vb[1] + 'Z');
      op(cell, doneP);
      msg.textContent = t < cvp0 ? (hi > lo && pr > 0.5 ? sb.txt : sa.txt) : 'Round in the short basis → closest lattice point';
      op(msg, seg(t, 0.3, 0.8));

      var c = seg(t, cvp0, cvp0 + 0.6);
      op(tD, c); op(tL, c);
      var lp = ease(seg(t, cvp0 + 0.7, cvp0 + 1.4));
      op(eL, lp > 0 ? 1 : 0); setLine(eL, tgt[0], tgt[1], lerp(tgt[0], near[0], lp), lerp(tgt[1], near[1], lp));
      op(nR, seg(t, cvp0 + 1.4, cvp0 + 1.8)); op(nL, seg(t, cvp0 + 1.5, cvp0 + 2.0));
    }
    return { dur: cvp0 + 4.6, draw: draw };
  }

  /* ======================================================================
     컨트롤러: 장면 전환, 캡션, 점 버튼, 일시정지, 화면 밖 정지, 움직임 줄이기
     ====================================================================== */
  var SCENES = [
    { id: 'classical', title: 'Classical', sub: 'Caesar → Vigenère', build: sceneClassical },
    { id: 'rsa', title: 'RSA', sub: 'Modular exponentiation', build: sceneRSA },
    { id: 'ecc', title: 'Elliptic curve', sub: 'Tangent → 2P → 4P → 8P', build: sceneECC },
    { id: 'lattice', title: 'Lattice', sub: 'Basis reduction → closest vector', build: sceneLattice }
  ];

  function init(root) {
    var host = root.querySelector('[data-art-svg]');
    if (!host || host.getAttribute('data-ready')) return null;
    host.setAttribute('data-ready', '1');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var svg = S('svg', { viewBox: '0 0 ' + VW + ' ' + VH, preserveAspectRatio: 'xMidYMax slice', focusable: 'false', 'aria-hidden': 'true' }, host);
    var built = SCENES.map(function (sc) {
      var g = S('g', { opacity: 0 }, svg);
      var r = sc.build(g);
      return { g: g, dur: r.dur, draw: r.draw, meta: sc };
    });
    function place() {
      var tf = 'translate(' + centerX(host.clientWidth || window.innerWidth) + ' ' + CY + ')';
      built.forEach(function (b) { b.g.setAttribute('transform', tf); });
    }
    place();
    window.addEventListener('resize', place);

    var caption = root.querySelector('[data-art-caption]');
    var dots = [].slice.call(root.querySelectorAll('[data-art-dot]'));
    var toggle = root.querySelector('[data-art-toggle]');

    var cur = 0, t = 0, last = 0, raf = 0, paused = reduce, visible = true;

    function label() {
      var m = built[cur].meta;
      if (caption) caption.textContent = '0' + (cur + 1) + ' / 0' + built.length + '  ' + m.title + ' · ' + m.sub;
      dots.forEach(function (d, i) { d.setAttribute('aria-pressed', i === cur ? 'true' : 'false'); });
      if (toggle) {
        toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
        toggle.setAttribute('aria-label', paused ? '배경 애니메이션 재생' : '배경 애니메이션 일시정지');
        toggle.setAttribute('data-state', paused ? 'paused' : 'playing');
      }
    }
    function render() {
      built.forEach(function (b, i) {
        if (i !== cur) { op(b.g, 0); return; }
        var o = reduce ? 1 : Math.min(seg(t, 0, FADE), 1 - seg(t, b.dur - FADE, b.dur));
        op(b.g, o);
        b.draw(clamp(t, 0, b.dur));
      });
    }
    function setScene(i, time) {
      cur = (i + built.length) % built.length;
      t = reduce ? built[cur].dur - FADE - 0.2 : (time || 0);
      label(); render();
    }
    function frame(now) {
      raf = 0;
      if (paused || !visible) return;
      var dt = Math.min((now - last) / 1000, 0.1);
      last = now; t += dt;
      if (t >= built[cur].dur) setScene(cur + 1, 0); else render();
      raf = requestAnimationFrame(frame);
    }
    function play() {
      if (raf || paused || !visible || reduce) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { setScene(i, 0); if (!reduce) play(); });
    });
    if (toggle) {
      if (reduce) { toggle.hidden = true; }
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

    setScene(0, 0);
    play();
    return {
      show: function (i, time) { pause(); paused = true; setScene(i, time); },   // 테스트·캡처용
      scenes: built
    };
  }

  window.HeroArt = { init: init, scenes: SCENES };
})();
