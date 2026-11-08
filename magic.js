/* জাদুর প্রভাব: তারার কণায় নাম, আতশবাজি, আঙুলের আলো, ঘষে দেখার কার্ড */
window.Magic = (() => {
'use strict';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAL = ['#ff8a3d', '#ffb27a', '#ffd9a8', '#fff3e0', '#f26b21', '#ffe3a8'];
const FW = ['#ff8a3d', '#ffb347', '#ffd36e', '#ff5e3a', '#ff9fbd', '#fff1d6', '#f26b21'];

const sprites = {};
function glow(color, r = 8) {
  const k = color + r; if (sprites[k]) return sprites[k];
  const c = document.createElement('canvas'); c.width = c.height = r * 4;
  const x = c.getContext('2d'), gr = x.createRadialGradient(r * 2, r * 2, 0, r * 2, r * 2, r * 2);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(.18, color); gr.addColorStop(.5, color + '55'); gr.addColorStop(1, color + '00');
  x.fillStyle = gr; x.fillRect(0, 0, r * 4, r * 4); return (sprites[k] = c);
}
function fit(cv) {
  const dpr = Math.min(2, devicePixelRatio || 1), rc = cv.getBoundingClientRect();
  const W = Math.max(100, rc.width), H = Math.max(100, rc.height);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  return { ctx: cv.getContext('2d'), W, H, dpr };
}
// লাইন: {text, size, family, x, y} — পর্দায় না আঁটলে নিজে ছোট হয়
const fontOf = (L, s) => `${Math.round(s ?? L.size)}px ${L.family}`;
async function fontsReady(lines) {
  try { await document.fonts.ready; for (const L of lines) await document.fonts.load(fontOf(L), L.text); } catch (e) { }
}
function sample(lines, W, H, step) {
  const off = document.createElement('canvas'); off.width = Math.ceil(W); off.height = Math.ceil(H);
  const o = off.getContext('2d'); o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
  for (const L of lines) {
    o.font = fontOf(L); const w = o.measureText(L.text).width, max = W * .9;
    if (w > max) o.font = fontOf(L, L.size * max / w);
    o.fillText(L.text, L.x, L.y);
  }
  const w = off.width, d = o.getImageData(0, 0, w, off.height).data, pts = [];
  for (let y = 0; y < off.height; y += step) for (let x = 0; x < w; x += step) if (d[(y * w + x) * 4 + 3] > 120) pts.push([x + (Math.random() - .5) * step * .6, y + (Math.random() - .5) * step * .6]);
  return pts;
}
function makeParts(pts, max, from) {
  const stride = Math.max(1, Math.ceil(pts.length / max)), out = [];
  for (let i = 0; i < pts.length; i += stride) {
    const [tx, ty] = pts[i]; let x, y, vx = 0, vy = 0;
    if (from.random) { x = Math.random() * from.W; y = Math.random() * from.H; }
    else { const a = Math.random() * 6.283, sp = 3 + Math.random() * 12; x = from.x; y = from.y; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
    out.push({ x, y, tx, ty, vx, vy, c: PAL[Math.random() * PAL.length | 0], s: .8 + Math.random() * 1.1, ph: Math.random() * 6.28 });
  }
  return out;
}
function stepParts(ctx, parts, t, ptr, k, R = 80) {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    const dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy;
    if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (R - d) / R * 5; p.vx += dx / d * f; p.vy += dy / d * f; }
    p.vx = (p.vx + (p.tx - p.x) * k) * .86; p.vy = (p.vy + (p.ty - p.y) * k) * .86; p.x += p.vx; p.y += p.vy;
    ctx.globalAlpha = .55 + .45 * Math.sin(t * 3 + p.ph);
    const sz = p.s * 5; ctx.drawImage(glow(p.c, 4), p.x - sz / 2, p.y - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/* ---------- তারার আকাশে নাম ---------- */
function ParticleText(cv, o) {
  let ctx, W, H, dpr, parts = [], stars = [], shoots = [], raf, alive = true, t0 = performance.now();
  const ptr = { x: -1e4, y: -1e4 };
  (async () => {
    ({ ctx, W, H, dpr } = fit(cv));
    const lines = o.lines(W, H); await fontsReady(lines); if (!alive) return;
    parts = makeParts(sample(lines, W, H, W < 500 ? 3 : 4), W < 500 ? 1800 : 3000, { random: true, W, H });
    stars = Array.from({ length: Math.round(W * H / 2600) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .3, ph: Math.random() * 6.28, sp: .5 + Math.random() * 2 }));
    raf = requestAnimationFrame(frame);
  })();
  function frame(now) {
    if (!alive) return;
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff3e0';
    for (const s of stars) { ctx.globalAlpha = .2 + .8 * Math.abs(Math.sin(t * s.sp * .5 + s.ph)); ctx.fillRect(s.x, s.y, s.r, s.r); }
    ctx.globalAlpha = 1;
    if (!RM && Math.random() < .007 && shoots.length < 2) shoots.push({ x: W * (.25 + Math.random() * .75), y: H * Math.random() * .3, vx: -(5 + Math.random() * 4), vy: 2.5 + Math.random() * 2, life: 1 });
    for (let i = shoots.length - 1; i >= 0; i--) {
      const s = shoots[i]; s.x += s.vx; s.y += s.vy; s.life -= .01;
      if (s.life <= 0 || s.x < -60 || s.y > H + 60) { shoots.splice(i, 1); continue; }
      const gr = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 16, s.y - s.vy * 16);
      gr.addColorStop(0, `rgba(255,240,210,${s.life})`); gr.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.strokeStyle = gr; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 16, s.y - s.vy * 16); ctx.stroke();
      ctx.drawImage(glow('#ffe3a8', 7), s.x - 14, s.y - 14);
    }
    stepParts(ctx, parts, t, ptr, .012 + .035 * Math.min(1, t / 2.5));
    raf = requestAnimationFrame(frame);
  }
  const pos = e => { const rc = cv.getBoundingClientRect(); return [e.clientX - rc.left, e.clientY - rc.top]; };
  const mv = e => { [ptr.x, ptr.y] = pos(e); };
  const dn = e => {
    const [x, y] = pos(e); ptr.x = x; ptr.y = y;
    for (let i = 0; i < shoots.length; i++) { const s = shoots[i]; if (Math.hypot(s.x - x, s.y - y) < 60) { shoots.splice(i, 1); if (o.onShoot) o.onShoot(e.clientX, e.clientY); break; } }
  };
  const up = e => { if (e.pointerType !== 'mouse') { ptr.x = ptr.y = -1e4; } };
  cv.addEventListener('pointermove', mv); cv.addEventListener('pointerdown', dn); cv.addEventListener('pointerup', up); cv.addEventListener('pointerleave', up);
  return () => { alive = false; cancelAnimationFrame(raf); };
}

/* ---------- আতশবাজি ---------- */
function Fireworks(cv, o) {
  let { ctx, W, H, dpr } = fit(cv), rockets = [], sparks = [], text = [], raf, alive = true, t0 = performance.now(), nextAuto = .3, textAt = o.textDelay || 3;
  const ptr = { x: -1e4, y: -1e4 };
  const launch = (x, ty, kind) => { rockets.push({ x, y: H + 10, vx: (Math.random() - .5) * 1.2, vy: -Math.sqrt(2 * .12 * (H + 10 - ty)), kind, c: FW[Math.random() * FW.length | 0] }); };
  function explode(x, y, kind, c, scale = 1) {
    const n = RM ? 40 : kind === 'heart' ? 120 : 90, c2 = FW[Math.random() * FW.length | 0];
    for (let i = 0; i < n; i++) {
      let vx, vy;
      if (kind === 'heart') { const a = i / n * 6.283; vx = 16 * Math.pow(Math.sin(a), 3) * .3 * scale; vy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * .3 * scale; }
      else { const a = Math.random() * 6.283, sp = (1.5 + Math.random() * 4.5) * scale; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
      sparks.push({ x, y, vx, vy, c: i % 3 ? c : c2, life: 1, decay: .009 + Math.random() * .008, s: 1 + Math.random() * 1.4 });
    }
    if (o.onBoom) o.onBoom(kind);
  }
  async function startText() {
    const lines = o.lines(W, H); await fontsReady(lines); if (!alive) return;
    const cx = W / 2, cy = lines[0].y;
    explode(cx, cy, 'sphere', '#ffd36e', 1.6);
    text = makeParts(sample(lines, W, H, W < 500 ? 3 : 4), W < 500 ? 1700 : 2800, { x: cx, y: cy });
    if (o.onText) o.onText();
  }
  function frame(now) {
    if (!alive) return;
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(16,5,2,.24)'; ctx.fillRect(0, 0, W, H);
    if (t > nextAuto) {
      const txt = text.length > 0;
      launch(W * (.12 + Math.random() * .76), H * (txt ? (Math.random() < .5 ? .08 + Math.random() * .1 : .55 + Math.random() * .2) : .12 + Math.random() * .35), Math.random() < .35 ? 'heart' : 'sphere');
      nextAuto = t + (txt ? 1.1 : .55) + Math.random() * .7;
    }
    if (textAt && t > textAt) { textAt = 0; startText(); }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.vy += .12; r.x += r.vx; r.y += r.vy;
      ctx.drawImage(glow(r.c, 5), r.x - 8, r.y - 8, 16, 16);
      if (r.vy >= -.6) { rockets.splice(i, 1); explode(r.x, r.y, r.kind, r.c); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i]; p.vx *= .982; p.vy = p.vy * .982 + .045; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 1.4); const sz = p.s * 6; ctx.drawImage(glow(p.c, 4), p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (text.length) stepParts(ctx, text, t, ptr, .03);
    raf = requestAnimationFrame(frame);
  }
  ctx.fillStyle = '#100502'; ctx.fillRect(0, 0, cv.width, cv.height);
  raf = requestAnimationFrame(frame);
  const dn = e => { const rc = cv.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top; ptr.x = x; ptr.y = y; launch(x, y, 'heart'); };
  const mv = e => { const rc = cv.getBoundingClientRect(); ptr.x = e.clientX - rc.left; ptr.y = e.clientY - rc.top; };
  const up = e => { if (e.pointerType !== 'mouse') ptr.x = ptr.y = -1e4; };
  cv.addEventListener('pointerdown', dn); cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up);
  return () => { alive = false; cancelAnimationFrame(raf); };
}

/* ---------- আঙুলের পেছনে আলোর কণা ---------- */
const Trail = (() => {
  let cv, ctx, W, H, dpr, parts = [], raf = 0;
  function init() {
    cv = document.getElementById('trail'); if (!cv) return false;
    const rs = () => { ({ ctx, W, H, dpr } = fit(cv)); }; rs(); addEventListener('resize', rs); return true;
  }
  function frame() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += .03; p.life -= .025;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = p.life; const sz = p.s * 7 * (.5 + p.life * .5); ctx.drawImage(glow(p.c, 4), p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    raf = parts.length ? requestAnimationFrame(frame) : 0;
  }
  function add(x, y, n = 2) {
    if (RM || (!cv && !init())) return;
    for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 1.6, vy: (Math.random() - .5) * 1.6 - .4, life: 1, s: .8 + Math.random() * 1.2, c: PAL[Math.random() * PAL.length | 0] });
    if (parts.length > 260) parts.splice(0, parts.length - 260);
    if (!raf) raf = requestAnimationFrame(frame);
  }
  return { add };
})();

/* ---------- ঘষে দেখার কার্ড ---------- */
function Scratch(cv, o) {
  const { ctx, W, H, dpr } = fit(cv); ctx.scale(dpr, dpr);
  const gr = ctx.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, '#b8792a'); gr.addColorStop(.3, '#f6d27a'); gr.addColorStop(.5, '#fff0c0'); gr.addColorStop(.7, '#e9b55a'); gr.addColorStop(1, '#a8681e');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 18; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .35})`; ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
  ctx.fillStyle = 'rgba(150,80,20,.22)'; ctx.font = '16px serif'; ctx.textAlign = 'center';
  for (let y = 18; y < H; y += 30) for (let x = (y / 30 % 2) * 22 + 14; x < W; x += 44) ctx.fillText('♥', x, y);
  let down = false, last = null, moves = 0, done = false;
  ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 40;
  const pos = e => { const rc = cv.getBoundingClientRect(); return [e.clientX - rc.left, e.clientY - rc.top]; };
  const draw = (a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.beginPath(); ctx.arc(b[0], b[1], 20, 0, 6.283); ctx.fill(); };
  const check = () => {
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let clear = 0, tot = 0;
    for (let i = 3; i < d.length; i += 4 * 37) { tot++; if (d[i] < 40) clear++; }
    if (!done && clear / tot > .5) { done = true; cv.style.transition = 'opacity .8s'; cv.style.opacity = 0; setTimeout(() => cv.remove(), 900); if (o.onDone) o.onDone(); }
  };
  cv.addEventListener('pointerdown', e => { down = true; last = pos(e); cv.setPointerCapture(e.pointerId); draw(last, last); if (o.onStart) o.onStart(); });
  cv.addEventListener('pointermove', e => { if (!down) return; const p = pos(e); draw(last, p); last = p; if (++moves % 8 === 0) check(); });
  const end = () => { if (down) { down = false; check(); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  return { reveal() { if (!done) { done = true; cv.style.transition = 'opacity .8s'; cv.style.opacity = 0; if (o.onDone) o.onDone(); } } };
}

return { ParticleText, Fireworks, Trail, Scratch, glow };
})();
