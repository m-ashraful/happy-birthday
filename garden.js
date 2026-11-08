/* জীবন্ত গোলাপবাগান: তিন সারি গোলাপ, বাতাস, প্রজাপতি, জোনাকি
   দ্রুত চলার জন্য: প্রতিটা গোলাপের ফোটার ৭টা ধাপ আগেই ছবি করে রাখা হয় (একটু একটু করে, যাতে পাতা না আটকায়),
   তারপর ফোটার সময় শুধু সেই ছবিগুলো মিলিয়ে দেখানো হয়। কোনো ভারী ছায়া বা ঝাপসা-ফিল্টার প্রতি মুহূর্তে চলে না। */
window.Garden = (() => {
'use strict';
const COLS = [
  { base: '#e85d10', light: '#ffab66', dark: '#7a2400' },  // কমলা
  { base: '#ff7a1f', light: '#ffc794', dark: '#9a3a06' },  // উজ্জ্বল কমলা
  { base: '#c94a12', light: '#f39255', dark: '#5e1c02' },  // পোড়া কমলা
  { base: '#ff9a66', light: '#ffe2cc', dark: '#b8532c' },  // পিচ
  { base: '#f57d2a', light: '#ffd98a', dark: '#9c3c05' },  // এপ্রিকট
  { base: '#c0122c', light: '#ff6a7c', dark: '#4e020e' },  // লাল
  { base: '#f0a81a', light: '#fff1a8', dark: '#985f00' },  // হলুদ
  { base: '#e0507e', light: '#ffc4d6', dark: '#7a1438' },  // গোলাপি
  { base: '#eadfd2', light: '#ffffff', dark: '#9a8270' },  // সাদা
  { base: '#f2603f', light: '#ffb8a4', dark: '#8a2410' }   // প্রবাল
];
const K = 6;                      // ফোটার ধাপ
const GROW = 1.4, BLOOM = 1.9;    // কাণ্ড বাড়া ও ফোটার সময় (সেকেন্ড)
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOut = p => 1 - Math.pow(1 - p, 3);

function petal(c, d0, d1, w) {
  const L = d1 - d0;
  c.beginPath();
  c.moveTo(-w * .22, -d0);
  c.bezierCurveTo(-w * 1.02, -d0 - L * .25, -w * .95, -d1 + L * .04, 0, -d1 - L * .05);
  c.bezierCurveTo(w * .95, -d1 + L * .04, w * 1.02, -d0 - L * .25, w * .22, -d0);
  c.closePath();
}

// গোলাপের মাথা (একবারই আঁকা হয়, ধাপের ছবিতে)
function drawHead(c, r, t) {
  const R = r.R, N = r.N, col = r.col;
  c.save(); c.rotate(r.lean);
  c.fillStyle = '#2e6a35';
  for (let k = 0; k < 5; k++) {
    c.save(); c.rotate(r.a0 + k * 1.2566); c.beginPath();
    c.moveTo(-R * .09, 0); c.quadraticCurveTo(-R * .07, R * .4, 0, R * (.35 + .3 * t)); c.quadraticCurveTo(R * .07, R * .4, R * .09, 0); c.fill(); c.restore();
  }
  c.scale(1, r.tilt);
  const gr = c.createRadialGradient(0, 0, R * .05, 0, 0, R * 1.05);
  gr.addColorStop(0, col.dark); gr.addColorStop(.38, col.base); gr.addColorStop(.82, col.light); gr.addColorStop(1, col.light);
  const sh = `rgba(35,6,0,.26)`, ox = R * .03, oy = R * .055;
  for (let i = N - 1; i >= 0; i--) {
    const f = i / (N - 1), p = clamp((t - (1 - f) * .5) / .5), e = easeOut(p);
    const s = .3 + .7 * e, d0 = R * (.02 + .2 * f) * s, d1 = R * (.22 + .8 * Math.pow(f, .85)) * s, w = R * (.17 + .42 * f) * (.6 + .4 * e);
    c.save(); c.translate(0, -R * .28 * (1 - f) * (.4 + .6 * e)); c.rotate(r.a0 + i * 2.39996 + r.jit[i]);
    // হালকা ছায়া: একই আকার একটু সরিয়ে গাঢ় রঙে (ঝাপসা ছাড়া)
    c.save(); c.translate(ox, oy); petal(c, d0, d1, w * 1.04); c.fillStyle = sh; c.fill(); c.restore();
    petal(c, d0, d1, w);
    c.fillStyle = gr; c.fill();
    if (f < .65) { c.fillStyle = `rgba(${r.dk},${((.65 - f) * .55).toFixed(3)})`; c.fill(); }
    c.globalAlpha = .5; c.strokeStyle = col.light; c.lineWidth = Math.max(.5, R * .02); c.stroke(); c.globalAlpha = 1;
    c.restore();
  }
  const cg = c.createRadialGradient(0, -R * .28, 0, 0, -R * .28, R * .16);
  cg.addColorStop(0, `rgba(${r.dk},.7)`); cg.addColorStop(1, `rgba(${r.dk},0)`);
  c.fillStyle = cg; c.beginPath(); c.arc(0, -R * .28, R * .16, 0, 6.283); c.fill();
  c.restore();
}

// সারির গভীরতা: ছোট মাপে আঁকা (নিজে থেকেই নরম/ঝাপসা) + গাঢ় পরত
function darken(x, w, h, a) { if (a > 0) { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(14,4,0,${a})`; x.fillRect(0, 0, w, h); x.restore(); } }

function leafSprite(k, v, dark) {
  const Wd = 72, Ht = 56, cv = document.createElement('canvas'); cv.width = Wd * k; cv.height = Ht * k;
  const x = cv.getContext('2d'); x.scale(k, k);
  x.translate(2, Ht / 2);
  x.strokeStyle = '#2c5a30'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(26, -3, 50, 0); x.stroke();
  const leaflet = (px, py, ang, len, wid) => {
    x.save(); x.translate(px, py); x.rotate(ang);
    const g = x.createLinearGradient(0, -wid, 0, wid); g.addColorStop(0, v.l); g.addColorStop(1, v.d); x.fillStyle = g;
    const edge = (a, j) => Math.pow(Math.sin(Math.PI * Math.pow(a, .8)), .9) * wid + (j % 2 && a > .25 && a < .92 ? wid * .06 : 0);
    x.beginPath(); const n = 26;
    for (let j = 0; j <= n; j++) { const a = j / n; j ? x.lineTo(a * len, -edge(a, j)) : x.moveTo(0, 0); }
    for (let j = n; j >= 0; j--) { const a = j / n; x.lineTo(a * len, edge(a, j)); }
    x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.ellipse(len * .45, -wid * .35, len * .3, wid * .25, 0, 0, 6.283); x.fill();
    x.strokeStyle = 'rgba(210,245,200,.35)'; x.lineWidth = .6; x.beginPath(); x.moveTo(0, 0); x.lineTo(len * .95, 0); x.stroke();
    for (let q = 1; q < 5; q++) { const qx = len * q / 5; x.beginPath(); x.moveTo(qx, 0); x.lineTo(qx + 3, -wid * .55); x.moveTo(qx, 0); x.lineTo(qx + 3, wid * .55); x.stroke(); }
    x.restore();
  };
  leaflet(16, 0, -.85, 18, 6); leaflet(16, 0, .85, 18, 6); leaflet(32, -1, -.65, 20, 6.8); leaflet(32, -1, .65, 20, 6.8); leaflet(47, 0, 0, 22, 7.6);
  darken(x, cv.width, cv.height, dark);
  return { c: cv, w: Wd, h: Ht };
}

function glowSprite(rgb) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(.3, `rgba(${rgb},.6)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 32, 32); return c;
}

/* ---------- বাগানের নকশা (ক্যানভাস ছাড়াই আগে থেকে বানানো যায়) ---------- */
let P = null, idleT = 0;
const keyOf = (W, H, dpr) => `${Math.round(W)}x${Math.round(H)}@${dpr}`;
function model(W, H, dpr) {
  const unit = H / 300;
  let layers, roses, jobs, grassBy, flies, bfs, fly;
  {
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    layers = [
      { scale: .5, base: .8, hmin: .22, hmax: .42, n: Math.max(6, Math.round(W / 34)), res: .45, dark: .42, sway: .6, d0: 0, dr: 1.6, stem: ['#16301a', '#24452a'] },
      { scale: .78, base: .93, hmin: .3, hmax: .55, n: Math.max(5, Math.round(W / 46)), res: .8, dark: .14, sway: .85, d0: .4, dr: 1.8, stem: ['#1c3a20', '#2f5e36'] },
      { scale: 1.08, base: 1.04, hmin: .3, hmax: .55, n: Math.max(3, Math.round(W / 85)), res: 1, dark: 0, sway: 1, d0: .9, dr: 1.8, stem: ['#1f4224', '#3a7342'] }
    ];
    const LV = [{ l: '#4f9446', d: '#1d4a22' }, { l: '#5ea24f', d: '#255a28' }];
    layers.forEach(L => { L.leaf = LV.map(v => leafSprite(Math.max(1, dpr * 1.5 * L.res), v, L.dark)); });
    roses = [];
    layers.forEach((L, li) => {
      L.roses = [];
      for (let i = 0; i < L.n; i++) {
        const N = 20 + (rnd() * 7 | 0);
        const r = {
          L, li, bx: (i + .5) * W / L.n + (rnd() - .5) * W / L.n * .7, by: H * L.base + rnd() * H * .03,
          h: H * (L.hmin + rnd() * (L.hmax - L.hmin)), R: (17 + rnd() * 9) * unit * L.scale,
          bend: (rnd() - .5) * 30 * unit * L.scale, lean0: (rnd() - .5) * 24 * unit * L.scale,
          col: rnd() < .5 ? COLS[rnd() * 5 | 0] : COLS[rnd() * COLS.length | 0],
          tilt: .55 + rnd() * .3, lean: (rnd() - .5) * .6, a0: rnd() * 6.28, N, jit: Array.from({ length: N }, () => (rnd() - .5) * .25),
          ph: rnd() * 6.28, gD: L.d0 + rnd() * L.dr, bD: .25 + rnd() * .35, jig: 0, frames: new Array(K),
          leaves: [{ u: .28 + rnd() * .1, side: 1, v: rnd() * 2 | 0 }, { u: .52 + rnd() * .12, side: -1, v: rnd() * 2 | 0 }],
          thorns: [.15, .38, .66].map((u, k) => ({ u: u + rnd() * .06, side: k % 2 ? 1 : -1 }))
        };
        r.dk = hexRGB(r.col.dark); r.tx = r.bx; r.ty = r.by - r.h; r.S = Math.ceil(r.R * 3);
        L.roses.push(r); roses.push(r);
      }
    });
    // ধাপের ছবি বানানোর সারি: যেটা আগে লাগবে সেটা আগে
    jobs = [];
    for (const r of roses) for (let k = 0; k < K; k++) jobs.push({ r, k, at: r.gD + 1.1 + r.bD + BLOOM * k / (K - 1) - (k === 0 ? 2 : 0) });
    jobs.sort((a, b) => a.at - b.at);
    // ঘাস: রং অনুযায়ী ভাগ করে একসঙ্গে আঁকা হয়
    const GC = ['#1f3d22', '#28502b', '#315f33', '#1a3320', '#3a6b3a'];
    grassBy = GC.map(c => ({ c, b: [] }));
    for (let x = -4; x < W + 4; x += 3.2) grassBy[rnd() * GC.length | 0].b.push({ x: x + rnd() * 2, h: (6 + rnd() * 20) * unit * .7, lean: (rnd() - .5) * 6 * unit, ph: rnd() * 6.28 });
    flies = Array.from({ length: Math.max(8, Math.round(W / 38)) }, () => ({ x: rnd() * W, y: H * (.3 + rnd() * .65), ph: rnd() * 6.28, s: .6 + rnd() * .6 }));
    fly = glowSprite('255,180,80');
    bfs = Array.from({ length: W > 700 ? 3 : 2 }, (_, i) => ({ x: rnd() * W, y: H * (.2 + rnd() * .4), vx: 0, vy: 0, tx: rnd() * W, ty: H * .4, ph: rnd() * 6, next: 0, s: (13 + rnd() * 4) * unit * .7, hue: i % 2 }));
  }
  return { key: keyOf(W, H, dpr), W, H, dpr, unit, layers, roses, jobs, grassBy, flies, bfs, fly };
}

function runJob(M, { r, k }) {
  if (r.frames[k]) return;
  const res = M.dpr * r.L.res, S = r.S, oc = document.createElement('canvas');
  oc.width = oc.height = Math.max(4, Math.ceil(S * res));
  const x = oc.getContext('2d'); x.scale(res, res); x.translate(S / 2, S / 2);
  drawHead(x, r, k / (K - 1));
  darken(x, oc.width, oc.height, r.L.dark);
  r.frames[k] = oc;
}
function work(M, ms) { const t0 = performance.now(); while (M.jobs.length && performance.now() - t0 < ms) runJob(M, M.jobs.shift()); }

// পাতা খোলার পরেই পেছনে চুপচাপ গোলাপের ছবি বানানো শুরু (বাগানে পৌঁছানোর আগেই তৈরি)
function prepare() {
  const dpr = Math.min(1.5, devicePixelRatio || 1), W = Math.max(200, innerWidth), H = Math.max(200, innerHeight * .64);
  if (!P || P.key !== keyOf(W, H, dpr)) P = model(W, H, dpr);
  clearTimeout(idleT);
  const tick = () => {
    if (!P.jobs.length || P.mounted) return;
    work(P, 8); idleT = setTimeout(tick, 30);
  };
  tick();
}

function mount(cv, opts = {}) {
  const ctx = cv.getContext('2d'), RM = !!opts.rm;
  let W, H, dpr, unit, layers, roses, grassBy, flies, bfs, fly, M, raf, T0, offY = 0, alive = true;
  const now = () => performance.now() / 1000;

  function build(instant) {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    const rc = cv.getBoundingClientRect(); W = Math.max(200, rc.width); H = Math.max(200, rc.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    // আগে বানানো নকশা প্রায় একই মাপের হলে সেটাই ব্যবহার (ফোনের ঠিকানা-বারের জন্য উচ্চতা একটু আলাদা হতে পারে)
    const near = P && P.dpr === dpr && Math.abs(P.W - W) < 4 && Math.abs(P.H - H) < H * .2;
    M = near ? P : (P = model(W, H, dpr));
    M.mounted = true; offY = H - M.H; W = M.W; H = M.H;
    ({ unit, layers, roses, grassBy, flies, bfs, fly } = M);
    T0 = now() - (instant ? 100 : 0);
    if (instant) work(M, 1e9);
  }
  const workJobs = () => work(M, 5);

  const qp = (b, c, t, u) => (1 - u) * (1 - u) * b + 2 * (1 - u) * u * c + u * u * t;
  const qd = (b, c, t, u) => 2 * (1 - u) * (c - b) + 2 * u * (t - c);

  function drawButterfly(b) {
    const s = b.s, flap = Math.abs(Math.sin(b.ph));
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.max(-.5, Math.min(.5, b.vx * .12)));
    for (const side of [-1, 1]) {
      ctx.save(); ctx.scale(side * (.18 + .82 * flap), 1);
      const g = ctx.createRadialGradient(s * .2, 0, 0, s * .2, 0, s * 1.3);
      g.addColorStop(0, b.hue ? '#ff6a00' : '#ff8a1f'); g.addColorStop(.7, b.hue ? '#ffa040' : '#ffb347'); g.addColorStop(1, '#3a1606');
      ctx.fillStyle = g; ctx.strokeStyle = '#2a1205'; ctx.lineWidth = s * .08;
      ctx.beginPath(); ctx.moveTo(0, -s * .1); ctx.bezierCurveTo(s * .6, -s * 1.1, s * 1.25, -s * .95, s * 1.05, -s * .1); ctx.quadraticCurveTo(s * .6, s * .05, 0, 0); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(s * .9, s * .05, s * .95, s * .75, s * .35, s * .8); ctx.quadraticCurveTo(s * .1, s * .5, 0, s * .1); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (const [dx, dy] of [[.95, -.55], [1.05, -.3], [.75, -.75], [.6, .6]]) { ctx.beginPath(); ctx.arc(s * dx, s * dy, s * .05, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
    ctx.fillStyle = '#1d0d05'; ctx.beginPath(); ctx.ellipse(0, s * .15, s * .09, s * .55, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#1d0d05'; ctx.lineWidth = s * .05; ctx.beginPath();
    ctx.moveTo(-s * .03, -s * .35); ctx.quadraticCurveTo(-s * .2, -s * .8, -s * .32, -s * .9); ctx.moveTo(s * .03, -s * .35); ctx.quadraticCurveTo(s * .2, -s * .8, s * .32, -s * .9); ctx.stroke();
    ctx.restore();
  }

  // ধাপের ছবি থেকে গোলাপ আঁকা (দুটো ধাপ মিলিয়ে মসৃণ)
  function drawRose(r, bt) {
    const f = bt * (K - 1), k0 = Math.floor(f), k1 = Math.min(K - 1, k0 + 1), fr = f - k0;
    let a = r.frames[k0], b = r.frames[k1];
    if (!a) { for (let k = k0; k >= 0; k--) if (r.frames[k]) { a = r.frames[k]; break; } b = null; }
    const S = r.S;
    if (!a) { ctx.fillStyle = r.col.base; ctx.beginPath(); ctx.ellipse(0, 0, r.R * .25, r.R * .3, 0, 0, 6.283); ctx.fill(); return; }
    ctx.drawImage(a, -S / 2, -S / 2, S, S);
    if (b && b !== a && fr > .02) { ctx.globalAlpha = fr; ctx.drawImage(b, -S / 2, -S / 2, S, S); ctx.globalAlpha = 1; }
  }

  function frame() {
    if (!alive) return;
    const T = now() - T0, t = now();
    workJobs(T);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, offY * dpr);
    const wind = RM ? 0 : (Math.sin(t * .55) * .5 + .5) * .6 + .45;

    for (const L of layers) {
      ctx.lineCap = 'round';
      for (const r of L.roses) {
        const g = easeOut(clamp((T - r.gD) / GROW));
        r.jig *= .965;
        const sway = (Math.sin(t * .9 + r.ph) * .03 + Math.sin(t * .43 + r.ph * 1.7) * .02) * wind * L.sway + r.jig * Math.sin(t * 10 + r.ph) * .14;
        const dx = Math.sin(sway) * r.h;
        const bx = r.bx, by = r.by, cx = bx + r.bend + dx * .35, cy = by - r.h * .55, tx = bx + r.lean0 + dx, ty = by - r.h * Math.cos(sway);
        r.sway = sway; r.g = g;
        if (g <= 0) { r.tx = bx; r.ty = by; continue; }
        const lw = Math.max(1.2, 3.4 * unit * L.scale * .6);
        for (const [col, w] of [[L.stem[0], lw + 1.4], [L.stem[1], lw]]) {
          ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(bx, by);
          if (g >= 1) ctx.quadraticCurveTo(cx, cy, tx, ty);
          else for (let k = 1; k <= 10; k++) { const u = g * k / 10; ctx.lineTo(qp(bx, cx, tx, u), qp(by, cy, ty, u)); }
          ctx.stroke();
        }
        ctx.fillStyle = '#7a4a2a';
        for (const th of r.thorns) {
          if (th.u > g) continue;
          const px = qp(bx, cx, tx, th.u), py = qp(by, cy, ty, th.u), a = Math.atan2(qd(by, cy, ty, th.u), qd(bx, cx, tx, th.u)), sz = 2.6 * unit * L.scale;
          ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-sz * .5, 0); ctx.lineTo(sz * .2, th.side * sz * 1.2); ctx.lineTo(sz * .6, 0); ctx.fill(); ctx.restore();
        }
        for (const lf of r.leaves) {
          if (lf.u > g) continue;
          const px = qp(bx, cx, tx, lf.u), py = qp(by, cy, ty, lf.u), a = Math.atan2(qd(by, cy, ty, lf.u), qd(bx, cx, tx, lf.u));
          const sp = L.leaf[lf.v], sc = unit * L.scale * .58 * Math.min(1, (g - lf.u) * 4);
          ctx.save(); ctx.translate(px, py); ctx.rotate(a + lf.side * 1.05 + Math.sin(t * 1.3 + r.ph + lf.u * 5) * .06 * wind);
          ctx.scale(sc, sc * lf.side); ctx.drawImage(sp.c, -2, -sp.h / 2, sp.w, sp.h); ctx.restore();
        }
        r.tx = qp(bx, cx, tx, g); r.ty = qp(by, cy, ty, g);
      }
      const heads = L.roses.filter(r => r.g > 0).sort((a, b) => a.ty - b.ty);
      for (const r of heads) {
        const bt = clamp((T - r.gD - 1.1 - r.bD) / BLOOM);
        r.open = bt >= 1;
        ctx.save(); ctx.translate(r.tx, r.ty); ctx.rotate(r.sway * 1.3);
        if (r.g < 1) { const hs = .35 + .65 * r.g; ctx.scale(hs, hs); }
        drawRose(r, bt);
        ctx.restore();
      }
    }

    // মাটি আর ঘাস (রং ধরে একসঙ্গে)
    const gg = ctx.createLinearGradient(0, H * .86, 0, H); gg.addColorStop(0, 'rgba(12,4,2,0)'); gg.addColorStop(1, 'rgba(12,4,2,.9)');
    ctx.fillStyle = gg; ctx.fillRect(0, H * .86, W, H * .14);
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (const grp of grassBy) {
      ctx.strokeStyle = grp.c; ctx.beginPath();
      for (const b of grp.b) { const sw = Math.sin(t * 1.3 + b.x * .02 + b.ph) * b.h * .16 * wind; ctx.moveTo(b.x, H + 2); ctx.quadraticCurveTo(b.x + b.lean * .3, H - b.h * .5, b.x + b.lean + sw, H - b.h); }
      ctx.stroke();
    }

    // জোনাকি (আগে-আঁকা আলোর ছবি)
    ctx.globalCompositeOperation = 'lighter';
    for (const f of flies) {
      f.x += Math.sin(t * .5 + f.ph) * .3; f.y += Math.cos(t * .4 + f.ph) * .22;
      if (f.x < -10) f.x = W + 10; if (f.x > W + 10) f.x = -10;
      const a = Math.max(0, Math.sin(t * 1.8 + f.ph * 3)) * .85; if (a < .02) continue;
      const rr = 7 * unit * .5 * f.s * 2; ctx.globalAlpha = a; ctx.drawImage(fly, f.x - rr / 2, f.y - rr / 2, rr, rr);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // প্রজাপতি
    for (const b of bfs) {
      if (t > b.next) {
        const open = roses.filter(r => r.li > 0 && r.open);
        if (open.length && Math.random() < .6) { b.rose = open[Math.random() * open.length | 0]; }
        else { b.tx = W * (.1 + Math.random() * .8); b.ty = H * (.1 + Math.random() * .45); b.rose = null; }
        b.next = t + 3 + Math.random() * 4;
      }
      if (b.rose) { b.tx = b.rose.tx; b.ty = b.rose.ty - b.rose.R * .6; }
      const d = Math.hypot(b.tx - b.x, b.ty - b.y), rest = d < 10;
      b.vx = (b.vx + (b.tx - b.x) * .0022) * .965; b.vy = (b.vy + (b.ty - b.y) * .0022) * .965 + (rest ? 0 : Math.sin(t * 3 + b.ph) * .06);
      const sp = Math.hypot(b.vx, b.vy), mx = 2.6 * unit; if (sp > mx) { b.vx *= mx / sp; b.vy *= mx / sp; }
      b.x += b.vx; b.y += b.vy; b.ph += rest ? .06 : .32;
      drawButterfly(b);
    }
    raf = requestAnimationFrame(frame);
  }

  const onTap = e => {
    const rc = cv.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top - offY;
    for (let li = layers.length - 1; li >= 0; li--) {
      let best = null, bd = 1e9;
      for (const r of layers[li].roses) { const d = Math.hypot(r.tx - x, r.ty - y); if (d < r.R * 1.3 && d < bd) { bd = d; best = r; } }
      if (best) { best.jig = 1; if (opts.onTap) opts.onTap(rc.left + best.tx, rc.top + offY + best.ty); return; }
    }
  };
  cv.addEventListener('pointerdown', onTap);
  let rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(() => build(true), 250); };
  addEventListener('resize', onResize);
  build(!!opts.instant); raf = requestAnimationFrame(frame);
  return () => { alive = false; if (M) M.mounted = false; cancelAnimationFrame(raf); removeEventListener('resize', onResize); cv.removeEventListener('pointerdown', onTap); };
}
return { mount, prepare };
})();
