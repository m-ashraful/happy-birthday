(() => {
'use strict';
const qs = new URLSearchParams(location.search);
const PREVIEW = qs.has('preview');   // সম্পাদনার পাতার ভেতরে
const DRAFT = qs.has('draft');       // সম্পাদনার খসড়া পুরো পর্দায়
const AUTO = qs.has('auto');         // ছবি তোলার জন্য নিজে নিজে খোলে
const START = qs.get('scene');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const BN = '০১২৩৪৫৬৭৮৯';
const bn = n => String(n).replace(/\d/g, d => BN[d]);
const bnNum = n => bn(Math.round(n).toLocaleString('en-IN'));
const HEART = (s = 24, c = 'currentColor') => `<svg class="heart" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path fill="${c}" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

let C = {};
let BOX = null;   // লাইভ পাতায় তালাবদ্ধ লেখা (উত্তর দিলে খোলে)
// তালিকার প্রতিটা জিনিস লেখা হতে পারে, অথবা {text, hide}; লুকানো আর খালিগুলো বাদ
const shownItems = arr => (arr || []).filter(x => x && !(typeof x === 'object' && x.hide)).map(x => typeof x === 'object' ? x.text || '' : x).filter(Boolean);
const g = (p, d = '') => { const v = p.split('.').reduce((o, k) => (o == null ? o : o[k]), C); return v == null || v === '' ? d : v; };
const vib = ms => { try { if (!PREVIEW && navigator.vibrate) navigator.vibrate(ms); } catch (e) { } };
function deepFill(t, s) { for (const k in s) { if (t[k] === undefined) t[k] = JSON.parse(JSON.stringify(s[k])); else if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object') deepFill(t[k], s[k]); } return t; }

const stage = $('#stage'), nextBtn = $('#next'), dotsEl = $('#dots'), topEl = $('#top'), muteBtn = $('#mute'), trackEl = $('#secrets');
let scenes = [], cur = -1, timers = [], cleanups = [], lastTap = null;
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };

/* ================= আলো, পাপড়ি, রঙিন কাগজ ================= */
const FX = (() => {
  const cv = $('#fx'), ctx = cv.getContext('2d');
  let W = 0, H = 0, petalOn = false;
  const bokeh = [], petals = [], bits = [];
  const PC = ['#ff8a3d', '#f26b21', '#ffb27a', '#ffd0a8', '#e0452b', '#ff9a52', '#c81d3a'];
  const CC = ['#ff8a3d', '#f26b21', '#ffe3a8', '#f2c879', '#ffffff', '#ffb27a', '#e0452b'];
  function size() { const D = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * D; cv.height = H * D; ctx.setTransform(D, 0, 0, D, 0, 0); }
  addEventListener('resize', size); size();
  const nb = any => ({ x: Math.random() * W, y: any ? Math.random() * H : H + 20, r: 2 + Math.random() * 5, vy: .1 + Math.random() * .3, a: .12 + Math.random() * .35, ph: Math.random() * 6.28 });
  const np = () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .9, s: 6 + Math.random() * 7, vy: .5 + Math.random() * 1, vx: -.3 + Math.random() * .6, rot: Math.random() * 6.28, vr: -.03 + Math.random() * .06, ph: Math.random() * 6.28, c: PC[Math.random() * PC.length | 0] });
  for (let i = 0; i < (RM ? 8 : 22); i++) bokeh.push(nb(true));
  // ভাসমান আলোর বিন্দুর ছবি একবারই আঁকা হয়
  const bk = document.createElement('canvas'); bk.width = bk.height = 64;
  { const x = bk.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(1, 'rgba(255,214,150,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
  function heart(s) { ctx.beginPath(); ctx.moveTo(0, s * .3); ctx.bezierCurveTo(0, 0, -s * .5, 0, -s * .5, s * .3); ctx.bezierCurveTo(-s * .5, s * .6, 0, s * .8, 0, s); ctx.bezierCurveTo(0, s * .8, s * .5, s * .6, s * .5, s * .3); ctx.bezierCurveTo(s * .5, 0, 0, 0, 0, s * .3); ctx.fill(); }
  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const b of bokeh) {
      b.y -= b.vy; b.ph += .01; if (b.y < -20) Object.assign(b, nb(false));
      const x = b.x + Math.sin(b.ph) * 12, rr = b.r * 3;
      ctx.globalAlpha = b.a; ctx.drawImage(bk, x - rr, b.y - rr, rr * 2, rr * 2);
    }
    ctx.globalAlpha = 1;
    const want = petalOn ? (RM ? 6 : W < 600 ? 18 : 30) : 0;
    while (petals.length < want) petals.push(np());
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i]; p.y += p.vy; p.ph += .03; p.x += p.vx + Math.sin(p.ph) * .6; p.rot += p.vr;
      if (p.y > H + 20) { if (petals.length > want) petals.splice(i, 1); else Object.assign(p, np(), { y: -20 }); continue; }
      if (p.y < -20) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, .55 + .45 * Math.sin(p.ph));
      const s = p.s; ctx.beginPath(); ctx.moveTo(0, -s); ctx.bezierCurveTo(s * .9, -s * .8, s * .8, s * .6, 0, s); ctx.bezierCurveTo(-s * .8, s * .6, -s * .9, -s * .8, 0, -s);
      ctx.globalAlpha = .85; ctx.fillStyle = p.c; ctx.fill(); ctx.restore();
    }
    for (let i = bits.length - 1; i >= 0; i--) {
      const q = bits[i]; q.vy += .13; q.vx *= .99; q.x += q.vx; q.y += q.vy; q.rot += q.vr; q.life--;
      if (q.life <= 0 || q.y > H + 30) { bits.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.min(1, q.life / 40); ctx.fillStyle = q.c; ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      if (q.h) { ctx.translate(0, -q.s / 2); heart(q.s); } else ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2);
      ctx.restore();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return {
    petals(v) { petalOn = v; },
    burst(x = W / 2, y = H / 2, n = 100) {
      if (RM) n = Math.min(n, 30);
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 3 + Math.random() * 8; bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, s: 7 + Math.random() * 9, rot: Math.random() * 6, vr: -.2 + Math.random() * .4, life: 100 + Math.random() * 70, c: CC[Math.random() * CC.length | 0], h: Math.random() < .5 }); }
    }
  };
})();

/* ================= সুর ও ছোট শব্দ ================= */
const AU = (() => {
  let ctx, master, wet, timer, nextT = 0, step = 0, el = null, muted = false, playing = false, wanted = false, src = '', restart, noise;
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (PREVIEW) return;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : .6; master.connect(ctx.destination);
      const d = ctx.createDelay(); d.delayTime.value = .33; const fb = ctx.createGain(); fb.gain.value = .3;
      const lp = ctx.createBiquadFilter(); lp.frequency.value = 2400; wet = ctx.createGain(); wet.gain.value = .35;
      wet.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  const ok = () => { init(); return !!ctx; };
  function note(m, t, dur = 1.8, vol = .16) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), gn = ctx.createGain(), g2 = ctx.createGain();
    o.type = 'sine'; o.frequency.value = mf(m); o2.type = 'sine'; o2.frequency.value = mf(m) * 4.01; g2.gain.value = .1;
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + .008); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(gn); o2.connect(g2); g2.connect(gn); gn.connect(master); gn.connect(wet);
    o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
  }
  const nbuf = () => { if (noise) return noise; const n = ctx.sampleRate * 1.2 | 0; noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noise; };
  const CH = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], PAT = [0, 1, 2, 3, 2, 1, 2, 1], STEP = .38;
  function sched() {
    while (nextT < ctx.currentTime + .6) {
      const c = CH[Math.floor(step / PAT.length) % CH.length], k = step % PAT.length;
      note(c[PAT[k]] + 12, nextT, 2.2, .075); if (k === 0) note(c[0] - 12, nextT, 3.4, .06);
      nextT += STEP; step++;
    }
  }
  function ambient(s) {
    if (PREVIEW) return;
    if (s !== undefined) src = s;
    wanted = true; if (!ok() || playing) return; playing = true; muteBtn.hidden = false;
    if (src) { if (!el) { el = new Audio(src); el.loop = true; } el.volume = .8; el.muted = muted; el.play().catch(() => { playing = false; }); return; }
    nextT = ctx.currentTime + .1; timer = setInterval(sched, 150); sched();
  }
  function stop() { playing = false; clearInterval(timer); clearTimeout(restart); if (el) el.pause(); }
  const HB = [[67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2], [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
    [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2], [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 3]];
  function birthday() {
    if (PREVIEW || !ok()) return; stop();
    const B = .44; let t = ctx.currentTime + .25;
    for (const [m, d] of HB) { note(m, t, 1.6 + d * B, .2); note(m + 12, t, 1.2, .05); t += d * B; }
    restart = setTimeout(() => ambient(), (t - ctx.currentTime + 1.5) * 1000);
  }
  function chime() { if (PREVIEW || !ok()) return; const t = ctx.currentTime, P = [72, 74, 76, 79, 81, 84], m = P[Math.random() * P.length | 0]; note(m + 12, t, 1.5, .09); note(m + 19, t + .08, 1.3, .06); }
  function pop() {
    if (PREVIEW || !ok()) return; const t = ctx.currentTime, o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(720, t); o.frequency.exponentialRampToValueAtTime(220, t + .16);
    gn.gain.setValueAtTime(.16, t); gn.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(gn); gn.connect(master); o.start(t); o.stop(t + .22);
  }
  function noiseHit(f0, f1, dur, vol, type) {
    if (PREVIEW || !ok()) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = nbuf();
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = type === 'bandpass' ? 1.2 : .7; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(.0001, t); gn.gain.linearRampToValueAtTime(vol, t + .02); gn.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(gn); gn.connect(master); s.start(t); s.stop(t + dur + .05);
  }
  const boom = () => noiseHit(900, 110, 1.1, .3, 'lowpass');
  const whoosh = () => noiseHit(300, 1800, .55, .06, 'bandpass');
  function kick() { if (PREVIEW) return; if (ctx && ctx.state === 'suspended') ctx.resume(); if (wanted && !playing) ambient(); }
  function toggle() { muted = !muted; if (master) master.gain.value = muted ? 0 : .6; if (el) el.muted = muted; return muted; }
  return { init, ambient, birthday, chime, pop, boom, whoosh, kick, toggle, stop };
})();
muteBtn.onclick = () => muteBtn.classList.toggle('off', AU.toggle());

/* ছোঁয়ার জায়গা মনে রাখা, আঙুলের আলো, আটকে থাকা শব্দ চালু করা */
document.addEventListener('pointerdown', e => { lastTap = { x: e.clientX, y: e.clientY }; AU.kick(); if (window.Magic) Magic.Trail.add(e.clientX, e.clientY, 8); }, true);
document.addEventListener('pointermove', e => { if (window.Magic && (e.pointerType === 'mouse' || e.buttons || e.pressure)) Magic.Trail.add(e.clientX, e.clientY, e.pointerType === 'mouse' ? 1 : 2); }, { passive: true });

/* ================= লুকানো হৃদয় ================= */
const SECRET_ORDER = ['stars', 'garden', 'memories', 'letter', 'cake', 'gift'];
let secretMap = {}, secretTotal = 0;
const found = new Set();
function planSecrets() {
  const list = shownItems(g('secrets', [])), order = SECRET_ORDER.filter(s => scenes.includes(s));
  secretMap = {}; list.slice(0, order.length).forEach((txt, i) => { secretMap[order[i]] = { i, txt }; });
  secretTotal = Object.keys(secretMap).length;
  [...found].forEach(i => { if (i >= secretTotal) found.delete(i); });
  drawTracker();
}
function drawTracker() {
  trackEl.innerHTML = Array.from({ length: secretTotal }, (_, i) => `<i class="${found.has(i) ? 'on' : ''}">${HEART(14)}</i>`).join('');
}
function placeSecret(el, name) {
  const s = secretMap[name]; if (!s || found.has(s.i)) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'secret s-' + name; b.setAttribute('aria-label', 'লুকানো হৃদয়'); b.innerHTML = HEART(18);
  const host = name === 'letter' ? $('.paper', el) : name === 'cake' ? $('.cake-wrap', el) : el;
  if (!host) return; host.appendChild(b);
  b.onclick = e => {
    e.stopPropagation(); found.add(s.i); drawTracker(); AU.chime(); vib(25);
    const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; FX.burst(cx, cy, 40); b.remove();
    const bub = document.createElement('div'); bub.className = 'secret-bubble'; bub.innerHTML = `${HEART(16, '#ff9a52')}<p>${nl(s.txt)}</p>`;
    document.body.appendChild(bub);
    const bw = Math.min(300, innerWidth - 32); bub.style.width = bw + 'px';
    bub.style.left = Math.max(16, Math.min(innerWidth - bw - 16, cx - bw / 2)) + 'px';
    bub.style.top = (cy > innerHeight * .6 ? cy - 20 : cy + 20) + 'px'; if (cy > innerHeight * .6) bub.classList.add('up');
    const close = () => { bub.classList.add('bye'); setTimeout(() => bub.remove(), 500); };
    bub.onclick = close; setTimeout(close, 6500);
    const t = trackEl.children[s.i]; if (t) { t.classList.add('pulse'); }
  };
}

/* ================= দৃশ্যগুলো ================= */
const hasGate = () => shownItems(g('gate.answers', [])).length > 0 && g('gate.question');
const locked = () => !PREVIEW && g('lock', false) && Date.now() < Date.parse(g('birthday'));
const NEXT = { stars: 'চলো', envelope: 'চলো, এগোই', garden: 'আমাদের গল্প দেখো', memories: 'তোমার জন্য একটা চিঠি', letter: 'আরও কিছু বলার আছে', reasons: 'কেকটা এসে গেছে', cake: 'উপহার', gift: 'শেষ চমক' };
const ALL = ['stars', 'envelope', 'garden', 'memories', 'letter', 'reasons', 'cake', 'gift', 'finale'];
const nameText = () => g('name', 'Tania');
const skyName = () => g('stars.name', nameText());   // তারার আকাশে আলাদা নাম (খালি থাকলে মূল নাম)
const envName = () => g('envelope.name', nameText()); // খামের কার্ডের নাম
const SCRIPT = '"Great Vibes", Galada';               // ইংরেজি টানা হাতের লেখা, বাংলা হলে গালাদা

const T = {
  gate: () => `
    <div class="glass gate">
      <div class="g-heart">${HEART(66, '#ff9a52')}</div>
      <p class="kicker">${esc(g('gate.kicker', 'শুধু তোমার জন্য'))}</p>
      <h1 class="g-name">${esc(g('gate.name', g('nick', g('name'))))}</h1>
      <p class="g-q">${nl(g('gate.question'))}</p>
      <form class="g-form" autocomplete="off">
        <input class="g-in" aria-label="উত্তর">
        <button class="btn g-go" type="submit" aria-label="খোলো">${HEART(22, '#fff')}</button>
      </form>
      <p class="g-msg" aria-live="polite"></p>
    </div>`,
  countdown: () => `
    <p class="kicker">আর একটু অপেক্ষা…</p>
    <h2>তোমার দিনটা আসছে</h2>
    <div class="cd"><div><b data-k="d">০</b><small>দিন</small></div><div><b data-k="h">০</b><small>ঘণ্টা</small></div><div><b data-k="m">০</b><small>মিনিট</small></div><div><b data-k="s">০</b><small>সেকেন্ড</small></div></div>`,
  stars: () => `
    <canvas class="sky-cv" aria-label="${esc(skyName())}"></canvas>
    <div class="moon"></div>
    <p class="sky-line">${nl(g('stars.line'))}</p>`,
  envelope: () => `
    <button class="env" type="button" aria-label="খাম">
      <span class="env-back"></span>
      <span class="env-card"><span class="script">${esc(g('envelope.title', 'Happy Birthday'))}</span><span class="nm">${esc(envName())}</span><span class="tiny">${HEART(12, '#f26b21')}${HEART(16, '#c81d3a')}${HEART(12, '#f26b21')}</span></span>
      <span class="env-front"></span>
      <span class="env-flap"></span>
      <span class="seal">${esc(g('envelope.seal', ([...envName()][0] || 'T').toUpperCase()))}</span>
    </button>
    <p class="env-line">${nl(g('envelope.line'))}</p>`,
  garden: () => {
    const days = Math.floor((Date.now() - Date.parse(g('since'))) / 864e5);
    return `<p class="kicker">ফুলের বাগান</p><h2>${esc(g('garden.title'))}</h2><p class="sub">${nl(g('garden.sub'))}</p>
      ${days > 0 && !g('hideCounter', false) ? `<div class="counter"><small>${esc(g('sinceLabel', 'একসঙ্গে'))}</small><b data-to="${days}">০</b><span>দিন</span>
        <div class="hms"><i data-k="h">০</i> ঘণ্টা <i data-k="m">০</i> মিনিট <i data-k="s">০</i> সেকেন্ড</div></div>` : ''}
      <div class="garden-glow"></div><div class="garden-rays"></div><canvas class="garden-cv" aria-label="গোলাপবাগান"></canvas>`;
  },
  memories: () => {
    const list = (g('memories', []) || []).filter(m => m && !m.hide);
    return `<p class="kicker">স্মৃতির মালা</p><h2>${esc(g('memoriesTitle', 'আমাদের গল্প'))}</h2>
      <div class="lights"><div class="track">
        <svg class="string" aria-hidden="true"></svg>
        ${list.map((m, i) => `
          <figure class="hang" data-i="${i}" style="--r:${[-2, 1.5, -1, 2, -1.5, 1][i % 6]}deg;--d:${(-i * .7).toFixed(1)}s;--drop:${[18, 34, 24, 40, 20, 30][i % 6]}px">
            <span class="peg"></span>
            <span class="pol">${m.photo ? `<img src="${esc(m.photo)}" alt="" draggable="false">` : `<span class="ph-empty">${HEART(38, '#e07a3f')}${PREVIEW ? '<span>এখানে আপনার ছবি বসবে</span>' : ''}</span>`}
              <span class="cap">${m.date ? `<b>${esc(m.date)}</b>` : ''}${nl(m.caption)}</span></span>
          </figure>`).join('')}
      </div></div>
      <div class="lightbox" hidden><figure><span class="lb-img"></span><figcaption></figcaption></figure></div>`;
  },
  letter: () => `
    <div class="paper">
      <p class="l-greet">${esc(g('letter.greeting', 'প্রিয়,'))}</p>
      <div class="l-body"><span class="txt"></span><span class="caret"></span></div>
      <p class="l-close">${esc(g('letter.closing'))}</p>
      <p class="l-sign">${esc(g('letter.sign', g('from')))}</p>
    </div>`,
  reasons: () => {
    const r = shownItems(g('reasons', [])), HC = ['#ff8a3d', '#ffb27a', '#ffd9b8', '#f26b21', '#ff6f4f', '#fff1e2', '#e8560f', '#ffc078'];
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const hearts = r.map((_, i) => `<span class="ph" style="left:${(8 + (i % 4) * 21 + rnd() * 6).toFixed(1)}%;bottom:${(5 + Math.floor(i / 4) * 15 + rnd() * 5).toFixed(1)}%;--rot:${(rnd() * 60 - 30).toFixed(0)}deg">${HEART(34, HC[i % HC.length])}</span>`).join('');
    return `<p class="kicker">ভালোবাসার বয়াম</p><h2>তোমাকে কেন এত ভালোবাসি</h2>
      <button class="jar" type="button" aria-label="ভালোবাসার বয়াম"><span class="jar-lid"></span><span class="jar-body">${hearts}</span></button>
      <div class="jar-dots">${r.map(() => `<i>${HEART(12)}</i>`).join('')}</div>
      <div class="note-pop" hidden><div class="note">${HEART(26, '#f26b21')}<small></small><p></p></div></div>`;
  },
  cake: () => {
    const n = Math.max(1, Math.min(9, +g('cake.candles', 5) || 5));
    return `<div class="cake-wrap">
        <div class="tier t2"><div class="candles">${Array.from({ length: n }, (_, i) => `<button class="candle" type="button" aria-label="মোমবাতি ${bn(i + 1)}"><span class="flame" style="animation-delay:-${(i * .07).toFixed(2)}s"></span><span class="wick"></span><span class="body"></span></button>`).join('')}</div><span class="pearls"></span></div>
        <div class="tier t1"><span class="pearls"></span></div>
        <div class="plate"></div>
        <svg class="smoke-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </div>
      <div class="wish" hidden><div class="script">${esc(g('cake.title', 'Happy Birthday'))}</div><p class="sub" style="margin:8px auto 0">${nl(g('cake.wish'))}</p></div>`;
  },
  gift: () => {
    const cps = shownItems(g('gift.coupons', []));
    return `<h2>${esc(g('gift.title', 'তোমার উপহার'))}</h2>
      <button class="giftbox" type="button" aria-label="উপহারের বাক্স"><span class="glow"></span><span class="box"></span><span class="lid"><span class="bow"></span></span></button>
      <div class="gift-card" hidden>
        <div class="scratch"><p class="gift-msg">${esc(g('gift.message'))}</p><canvas class="foil"></canvas><span class="coin"></span></div>
        ${cps.length ? `<div class="coupons" hidden>${cps.map(c => `<button class="coupon" type="button">${HEART(18, '#f26b21')}<span>${esc(c)}</span><b class="stamp">গৃহীত</b></button>`).join('')}</div>` : ''}
      </div>`;
  },
  finale: () => `
    <canvas class="fw-cv" aria-label="আতশবাজি"></canvas>
    <div class="fin" hidden>
      <p class="fin-line">${nl(g('finale.line'))}</p>
      <p class="final-sign">${esc(g('finale.love', 'ভালোবাসি, অনেক।'))}<br>${esc(g('finale.sign', g('from')))}</p>
      <p class="fin-secret"></p>
      <button class="again" type="button" aria-label="আবার শুরু থেকে"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/></svg></button>
    </div>`
};

/* প্রতিটা দৃশ্যে ঢোকার পর কী হবে */
const B = {
  gate(el) {
    const form = $('.g-form', el), inp = $('.g-in', el), msg = $('.g-msg', el), card = $('.glass', el); let tries = 0;
    const norm = s => String(s).toLowerCase().normalize('NFC').replace(/[\s.,!?।'"-]/g, '');
    const ok = shownItems(g('gate.answers', [])).map(norm).filter(Boolean);
    const btn = $('.g-go', el); let busy = false;
    if (!PREVIEW) later(() => inp.focus(), 900);
    form.onsubmit = async e => {
      e.preventDefault(); AU.init(); if (busy) return;
      let right = false, unlocked = false;
      if (BOX) {   // লাইভ পাতা: উত্তর দিয়েই তালা খোলে
        busy = true; btn.disabled = true; card.classList.add('opening');
        const full = await Crypt.open(BOX, inp.value).catch(() => null);
        busy = false; btn.disabled = false; card.classList.remove('opening');
        if (full) { right = unlocked = true; BOX = null; C = full; }
      } else right = ok.includes(norm(inp.value));
      if (right) {
        msg.textContent = 'ঠিক ধরেছ 🧡'; card.classList.add('ok'); inp.blur(); vib([20, 40, 20]);
        const r = $('.g-heart', el).getBoundingClientRect();
        later(() => { FX.burst(r.left + r.width / 2, r.top + r.height / 2, 90); AU.chime(); }, 450);
        later(() => {
          if (unlocked) { build('gate'); if (window.Garden && scenes.includes('garden')) Garden.prepare(); }   // আসল লেখা দিয়ে দৃশ্যগুলো নতুন করে সাজানো
          go(scenes.indexOf('gate') + 1);
        }, 1300);
      } else {
        tries++; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); vib(60);
        msg.textContent = tries >= 2 && g('gate.hint') ? g('gate.hint') : 'উঁহু, আরেকবার ভাবো 🙂';
      }
    };
  },
  countdown(el) {
    const end = Date.parse(g('birthday'));
    const upd = () => {
      const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      if (s <= 0) { go(cur + 1); return; }
      const v = { d: s / 86400 | 0, h: s % 86400 / 3600 | 0, m: s % 3600 / 60 | 0, s: s % 60 };
      for (const k in v) $(`[data-k="${k}"]`, el).textContent = bn(v[k]);
    };
    upd(); every(upd, 1000);
  },
  stars(el) {
    AU.ambient(g('music', ''));
    cleanups.push(Magic.ParticleText($('.sky-cv', el), {
      lines: (W, H) => [{ text: skyName(), size: Math.min(W * .3, H * .2, 190), family: SCRIPT, x: W / 2, y: H * .4 }],
      onShoot: (x, y) => { FX.burst(x, y, 50); AU.chime(); vib(30); }
    }));
    later(() => $('.sky-line', el).classList.add('show'), 2600);
    showNext(5000);
  },
  envelope(el) {
    const env = $('.env', el);
    const open = () => {
      if (env.classList.contains('open')) return;
      AU.ambient(g('music', '')); AU.pop(); vib(15); env.classList.add('open');
      later(() => { const r = env.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top, 60); AU.chime(); }, 1500);
      later(() => $('.env-line', el).classList.add('show'), 2100);
      showNext(3200);
    };
    env.onclick = open;
    if (AUTO || PREVIEW) later(open, 500);
  },
  garden(el) {
    FX.petals(true);
    if (window.Garden) cleanups.push(Garden.mount($('.garden-cv', el), { rm: RM, onTap: (x, y) => { FX.burst(x, y, 18); AU.chime(); vib(12); } }));
    const b = $('.counter b', el);
    if (b) {
      const to = +b.dataset.to, t0 = performance.now() + 900, dur = 2600, since = Date.parse(g('since'));
      const step = now => { const p = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - p, 3); b.textContent = bnNum(to * e); if (p < 1 && el.classList.contains('on')) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      const hms = () => { const ms = Date.now() - since, s = Math.floor(ms / 1000); const v = { h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 }; for (const k in v) { const n = $(`.hms [data-k="${k}"]`, el); if (n) n.textContent = bn(v[k]); } };
      hms(); every(hms, 1000);
    }
    showNext(4200);
  },
  memories(el) {
    const sc = $('.lights', el), track = $('.track', el), svg = $('.string', el), hangs = $$('.hang', el), lb = $('.lightbox', el);
    // আলোর মালার সুতো ও বাতি
    const drawString = () => {
      const w = track.scrollWidth, pegs = hangs.map(h => h.offsetLeft + h.offsetWidth / 2);
      if (!pegs.length) return;
      const y0 = 18, sag = 34; let d = `M0 ${y0}`, bulbs = '';
      const pts = [0, ...pegs, w];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b2 = pts[i], mx = (a + b2) / 2; d += ` Q${mx} ${y0 + sag * 2} ${b2} ${y0}`;
        for (const f of [.25, .5, .75]) { const x = (1 - f) * (1 - f) * a + 2 * (1 - f) * f * mx + f * f * b2, y = (1 - f) * (1 - f) * y0 + 2 * (1 - f) * f * (y0 + sag * 2) + f * f * y0; bulbs += `<g class="bulb" style="--bd:${(Math.random() * 3).toFixed(2)}s"><circle cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="9" class="halo"/><circle cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="3.6" class="core"/></g>`; }
      }
      svg.setAttribute('width', w); svg.setAttribute('height', 120); svg.setAttribute('viewBox', `0 0 ${w} 120`);
      svg.innerHTML = `<path d="${d}" fill="none" stroke="#3a2a1c" stroke-width="2"/>${bulbs}`;
    };
    requestAnimationFrame(drawString); later(drawString, 600);
    const onR = () => drawString(); addEventListener('resize', onR); cleanups.push(() => removeEventListener('resize', onR));
    // মাউসের চাকা ও টেনে সরানো
    sc.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { sc.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    let drag = null, moved = 0;
    sc.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { drag = { x: e.clientX, s: sc.scrollLeft }; moved = 0; } });
    const onDrag = e => { if (drag) { moved = Math.abs(e.clientX - drag.x); sc.scrollLeft = drag.s - (e.clientX - drag.x); } };
    const endDrag = () => { drag = null; };
    addEventListener('pointermove', onDrag); addEventListener('pointerup', endDrag);
    cleanups.push(() => { removeEventListener('pointermove', onDrag); removeEventListener('pointerup', endDrag); });
    hangs.forEach(h => h.onclick = () => {
      if (moved > 8) return;
      const pol = $('.pol', h), img = $('img', h);
      $('.lb-img', lb).innerHTML = img ? `<img src="${img.src}" alt="">` : $('.ph-empty', h).outerHTML;
      $('figcaption', lb).innerHTML = $('.cap', h).innerHTML;
      lb.hidden = false; requestAnimationFrame(() => lb.classList.add('show')); AU.chime(); vib(10);
    });
    lb.onclick = () => { lb.classList.remove('show'); setTimeout(() => lb.hidden = true, 400); };
    showNext(3000);
  },
  letter(el) {
    const paper = $('.paper', el), txt = $('.txt', el), body = g('letter.body');
    const parts = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('bn', { granularity: 'grapheme' }).segment(body)].map(s => s.segment) : [...body];
    let i = 0, t, done = false;
    const finish = () => { if (done) return; done = true; clearInterval(t); txt.textContent = body; paper.classList.add('done'); showNext(1400); };
    later(() => { if (done) return; t = every(() => { if (i >= parts.length) return finish(); txt.textContent += parts[i++]; }, PREVIEW ? 14 : 42); }, 900);
    paper.addEventListener('click', e => { if (!e.target.closest('.secret')) finish(); });
    if (AUTO) later(finish, 400);
  },
  reasons(el) {
    const r = shownItems(g('reasons', [])), jar = $('.jar', el), pop = $('.note-pop', el), dots = $$('.jar-dots i', el);
    let idx = 0, busy = false;
    const take = () => {
      if (busy || idx >= r.length) return;
      const hs = $$('.ph', jar), h = hs[hs.length - 1]; if (!h) return;
      busy = true; AU.pop(); vib(12);
      jar.classList.remove('shake'); void jar.offsetWidth; jar.classList.add('shake');
      const rc = h.getBoundingClientRect(), fly = h.cloneNode(true); fly.className = 'ph-fly';
      Object.assign(fly.style, { left: rc.left + 'px', top: rc.top + 'px', width: rc.width + 'px', height: rc.height + 'px' });
      document.body.appendChild(fly); h.remove();
      const tx = innerWidth / 2 - rc.left - rc.width / 2, ty = innerHeight * .42 - rc.top - rc.height / 2;
      const anim = fly.animate([{ transform: 'translate(0,0) scale(1) rotate(0)' }, { transform: `translate(${tx * .5}px,${ty - 80}px) scale(2) rotate(200deg)`, offset: .55 }, { transform: `translate(${tx}px,${ty}px) scale(3.2) rotate(360deg)`, opacity: 0 }], { duration: RM ? 200 : 800, easing: 'cubic-bezier(.3,.7,.3,1)' });
      anim.onfinish = () => {
        fly.remove();
        $('small', pop).textContent = `কারণ ${bn(idx + 1)}`; $('p', pop).textContent = r[idx];
        pop.hidden = false; requestAnimationFrame(() => pop.classList.add('show')); AU.chime();
      };
    };
    const dismiss = () => {
      if (pop.hidden) return;
      pop.classList.remove('show'); setTimeout(() => { pop.hidden = true; busy = false; }, 350);
      if (dots[idx]) dots[idx].classList.add('on'); idx++;
      if (idx >= r.length) { jar.classList.add('empty'); const rc = jar.getBoundingClientRect(); later(() => { FX.burst(rc.left + rc.width / 2, rc.top + 40, 80); AU.chime(); }, 300); showNext(900); }
    };
    jar.onclick = take; pop.onclick = dismiss;
    if (!r.length) showNext(500); else showNext(25000);
    if (AUTO) { later(take, 300); }
  },
  cake(el) {
    const candles = $$('.candle', el), wrap = $('.cake-wrap', el); let done = false;
    const check = () => {
      if (done || candles.some(c => !c.classList.contains('out'))) return;
      done = true; wrap.classList.add('dark'); vib([30, 60, 30]);
      later(() => wrap.classList.add('heart-up'), 300);
      later(() => { FX.burst(innerWidth * .3, innerHeight * .4, 70); FX.burst(innerWidth * .7, innerHeight * .4, 70); AU.birthday(); }, 700);
      later(() => { const w = $('.wish', el); w.hidden = false; w.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 1100);
      later(() => FX.burst(innerWidth / 2, innerHeight * .3, 90), 1800);
      showNext(4500);
    };
    const blow = c => { if (c && !c.classList.contains('out')) { c.classList.add('out'); AU.pop(); vib(10); check(); } };
    // শিখা ছুঁলে সেটা নেভে; কেকের যেকোনো জায়গায় ছুঁলে পরের জ্বলন্তটা নেভে
    wrap.onclick = e => { if (e.target.closest('.secret')) return; const c = e.target.closest('.candle'); blow(c || candles.find(x => !x.classList.contains('out'))); };
    if (AUTO) candles.forEach((c, i) => later(() => blow(c), 400 + i * 150));
  },
  gift(el) {
    const box = $('.giftbox', el), card = $('.gift-card', el), cps = $('.coupons', el);
    const reveal = () => {
      const coin = $('.coin', el); if (coin) coin.remove();
      AU.chime(); vib([20, 40, 20]);
      const r = $('.scratch', el).getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 90);
      if (cps) { cps.hidden = false; }
      showNext(1600);
    };
    const open = () => {
      if (box.classList.contains('opened')) return;
      box.classList.add('opened'); AU.pop(); vib(20);
      const r = box.getBoundingClientRect(); later(() => { FX.burst(r.left + r.width / 2, r.top + 40, 120); AU.chime(); }, 300);
      later(() => {
        card.hidden = false; card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const coin = $('.coin', el);
        const sc = Magic.Scratch($('.foil', el), { onStart: () => coin && coin.remove(), onDone: reveal });
        if (AUTO) later(() => sc.reveal(), 500);
      }, 1100);
    };
    box.onclick = open;
    $$('.coupon', el).forEach(c => c.onclick = () => { if (c.classList.contains('used')) return; c.classList.add('used'); AU.chime(); vib(15); const r = c.getBoundingClientRect(); FX.burst(r.right - 40, r.top + r.height / 2, 24); });
    if (AUTO) later(open, 400);
  },
  finale(el) {
    FX.petals(false);
    const fin = $('.fin', el);
    cleanups.push(Magic.Fireworks($('.fw-cv', el), {
      textDelay: 2.6,
      lines: (W, H) => {
        const f1 = Math.min(W * .17, 100), f2 = Math.min(W * .24, 150), y = H * (W < 600 ? .19 : .22), nm = g('finale.name', nameText());
        const L = [{ text: g('finale.title', 'Happy Birthday'), size: f1, family: SCRIPT, x: W / 2, y }];
        if (nm) L.push({ text: nm, size: f2, family: SCRIPT, x: W / 2, y: y + Math.min(f1, W * .13) * 1.75 });
        return L;
      },
      onBoom: () => { AU.boom(); },
      onText: () => { vib([30, 50, 30]); later(() => { fin.hidden = false; requestAnimationFrame(() => fin.classList.add('show')); }, 2600); }
    }));
    const fs = $('.fin-secret', el);
    if (secretTotal) {
      fs.innerHTML = found.size >= secretTotal ? nl(g('secretsAll'))
        : found.size ? `তুমি ${bn(found.size)}টা লুকানো হৃদয় খুঁজে পেয়েছ।<br>আরও ${bn(secretTotal - found.size)}টা কোথাও লুকিয়ে আছে…`
        : `এই পাতার কোথাও ${bn(secretTotal)}টা ছোট্ট হৃদয় লুকিয়ে আছে…`;
    }
    $('.again', el).onclick = e => { e.stopPropagation(); go(scenes.findIndex(s => s !== 'gate' && s !== 'countdown')); };
  }
};

function showNext(ms) {
  const lab = NEXT[scenes[cur]]; if (!lab || cur >= scenes.length - 1) return;
  later(() => { nextBtn.setAttribute('aria-label', lab); nextBtn.classList.add('show'); }, ms);
}
nextBtn.onclick = () => go(cur + 1);

const isHidden = n => (g('hidden', []) || []).includes(n);
function build(want) {
  scenes = [];
  // সম্পাদনার ফোনে লুকানো অংশও দেখা যায় (বদলানোর জন্য), তানিয়ার পাতায় নয়
  const vis = n => PREVIEW || !isHidden(n);
  if (hasGate() && vis('gate') && (!PREVIEW || want === 'gate')) scenes.push('gate');
  if (locked()) scenes.push('countdown');
  scenes.push(...ALL.filter(vis));
  if (!scenes.some(s => s !== 'gate' && s !== 'countdown')) scenes.push('envelope');
  stage.innerHTML = scenes.map(n => `<section class="scene s-${n}" data-s="${n}"></section>`).join('');
  const shown = scenes.filter(s => s !== 'gate' && s !== 'countdown');
  dotsEl.innerHTML = shown.map(() => '<i></i>').join('');
  cur = -1; planSecrets();
}

function go(i) {
  if (i < 0 || i >= scenes.length) return;
  timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = [];
  cleanups.forEach(f => { try { f(); } catch (e) { } }); cleanups = [];
  $$('.secret-bubble, .ph-fly').forEach(n => n.remove());
  nextBtn.classList.remove('show');
  const prev = $('.scene.on'); if (prev) { prev.classList.remove('on'); setTimeout(() => { if (!prev.classList.contains('on')) prev.innerHTML = ''; }, 950); }
  cur = i; const name = scenes[i], el = $(`[data-s="${name}"]`, stage);
  el.innerHTML = `<div class="wrap">${T[name]()}</div>` + (PREVIEW && isHidden(name) ? '<div class="hid-badge">লুকানো অংশ: তানিয়া এটা দেখবেন না</div>' : ''); el.scrollTop = 0;
  FX.petals(['garden', 'memories', 'letter', 'reasons', 'cake', 'gift'].includes(name));
  const shown = scenes.filter(s => s !== 'gate' && s !== 'countdown'), k = shown.indexOf(name);
  topEl.classList.toggle('hide', k < 0);
  trackEl.hidden = k < 0 || !secretTotal;
  [...dotsEl.children].forEach((d, j) => { d.className = j < k ? 'done' : j === k ? 'cur' : ''; });
  // ছোঁয়ার জায়গা থেকে গোল হয়ে নতুন দৃশ্য খোলে
  if (prev && lastTap && !RM && el.animate) {
    const R = Math.hypot(Math.max(lastTap.x, innerWidth - lastTap.x), Math.max(lastTap.y, innerHeight - lastTap.y));
    el.animate([{ clipPath: `circle(0px at ${lastTap.x}px ${lastTap.y}px)` }, { clipPath: `circle(${R}px at ${lastTap.x}px ${lastTap.y}px)` }], { duration: 1000, easing: 'cubic-bezier(.6,0,.2,1)' });
    AU.whoosh();
  }
  lastTap = null;
  requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('on'); B[name](el); placeSecret(el, name); }));
}

function start(content, sceneName) {
  const want = BOX ? 'gate' : sceneName || START;
  C = content || {}; build(want);
  const idx = want && scenes.includes(want) ? scenes.indexOf(want) : 0;
  go(idx);
  $('#load').classList.add('gone');
  // বাগানের গোলাপগুলো পেছনে আগে থেকেই বানিয়ে রাখা, যাতে বাগানে গিয়ে পাতা না আটকায়
  if (window.Garden && scenes.includes('garden') && scenes[idx] !== 'garden') setTimeout(() => Garden.prepare(), 1200);
}

/* ================= লেখা কোথা থেকে আসবে ================= */
if (PREVIEW) {
  addEventListener('message', e => {
    if (e.source !== parent || !e.data || e.data.type !== 'content') return;
    const prevName = scenes[cur];
    const want = e.data.scene || prevName || 'envelope';
    C = e.data.content; build(want);
    go(Math.max(0, scenes.indexOf(want)));
    $('#load').classList.add('gone');
  });
  parent.postMessage({ type: 'ready' }, '*');
} else if (DRAFT) {
  const sample = fetch('content.json').then(x => x.json()).catch(() => ({}));
  const rq = indexedDB.open('tania-bday', 1);
  rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
  rq.onsuccess = () => {
    const r = rq.result.transaction('kv').objectStore('kv').get('content');
    r.onsuccess = async () => { const s = await sample; start(r.result ? deepFill(r.result, s) : s); };
  };
} else {
  // লাইভ সাইটে: content.enc.json (তালাবদ্ধ) থাকলে সেটা, না থাকলে নমুনা content.json
  (async () => {
    const box = await fetch('content.enc.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
    if (box && box.open) return start(box.content);
    if (box && box.locks) {
      BOX = box; const m = box.meta || {};
      return start({ nick: m.nick, name: m.nick, gate: { question: m.question, hint: m.hint, answers: ['🔒'], name: m.gname, kicker: m.kicker } });
    }
    const c = await fetch('content.json', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
    start(c);
  })();
}
})();
