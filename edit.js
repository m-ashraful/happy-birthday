(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BN = '০১২৩৪৫৬৭৮৯', bn = n => String(n).replace(/\d/g, d => BN[d]);
const clone = o => JSON.parse(JSON.stringify(o));

let C = null, SAMPLE = null, scene = 'envelope', frameReady = false;
const form = $('#form'), frame = $('#frame');

/* ---------- ব্রাউজারের ভেতরে সংরক্ষণ (ছবিসহ) ---------- */
const DB = {
  open() { return this._p || (this._p = new Promise((res, rej) => { const r = indexedDB.open('tania-bday', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async get(k) { const db = await this.open(); return new Promise(res => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); },
  async set(k, v) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
};

const getP = p => p.split('.').reduce((o, k) => (o == null ? o : o[k]), C);
const setP = (p, v) => { const ks = p.split('.'); let o = C; ks.slice(0, -1).forEach(k => { if (typeof o[k] !== 'object' || o[k] == null) o[k] = {}; o = o[k]; }); o[ks.at(-1)] = v; };

/* ---------- কোন অংশে কী ---------- */
const SECTIONS = [
  { title: 'মূল তথ্য', scene: 'envelope', fields: [
    { p: 'name', label: 'তাঁর নাম: খামের কার্ডে আর শেষের আতশবাজিতে (টানা হাতের লেখায়)' },
    { p: 'nick', label: 'যে নামে ডাকেন (প্রথম পাতায় বড় করে)' },
    { p: 'from', label: 'আপনার নাম (চিঠি আর শেষ পাতার নিচে)' },
    { p: 'since', label: 'একসঙ্গে পথচলা শুরুর তারিখ (বাগানে দিনের হিসাব)', type: 'date' },
    { p: 'sinceLabel', label: 'দিনের হিসাবের উপরের লেখা' },
    { p: 'birthday', label: 'জন্মদিন কখন শুরু', type: 'datetime-local' },
    { p: 'lock', label: 'এই সময়ের আগে খোলা যাবে না, শুধু উল্টো-গণনার ঘড়ি দেখাবে', type: 'check' }
  ] },
  { title: 'গোপন প্রশ্ন', scene: 'gate', hide: 'gate', note: 'লিংক খুললে প্রথমে এই প্রশ্ন আসবে। ঠিক উত্তর দিলে তবেই ভেতরে ঢোকা যাবে। ছোট-বড় হাতের অক্ষর আর ফাঁকা জায়গা ধরা হয় না। প্রশ্ন বা উত্তর খালি রাখলে কোনো তালা থাকবে না।', fields: [
    { p: 'gate.question', label: 'প্রশ্ন' },
    { p: 'gate.answers', label: 'সঠিক উত্তর (কয়েকভাবে লেখা চললে কমা দিয়ে আলাদা করুন)', type: 'csv' },
    { p: 'gate.hint', label: 'দুবার ভুল হলে যে ইঙ্গিত দেখাবে' }
  ] },
  { title: 'তারার আকাশ', scene: 'stars', hide: 'stars', note: 'রাতের আকাশে হাজারো তারার কণা মিলে এই নামটা লিখবে। আঙুল বোলালে কণাগুলো সরে যায়, আবার ফিরে আসে। মাঝে মাঝে তারা খসে, ধরতে পারলে আলো ঝরে।', fields: [{ p: 'stars.name', label: 'আকাশে তারায় লেখা নাম (খামের নাম থেকে আলাদা; খালি রাখলে খামের নামটাই আসবে; ছোট নাম সবচেয়ে সুন্দর দেখায়)' }, { p: 'stars.line', label: 'নামের নিচের লেখা', type: 'area' }] },
  { title: 'খাম', scene: 'envelope', hide: 'envelope', fields: [{ p: 'envelope.line', label: 'খাম খোলার পর নিচের লেখা', type: 'area' }] },
  { title: 'ফুলের বাগান', scene: 'garden', hide: 'garden', fields: [{ p: 'garden.title', label: 'শিরোনাম' }, { p: 'garden.sub', label: 'নিচের লেখা', type: 'area' }, { p: 'hideCounter', label: '"একসঙ্গে কেটে গেল … দিন" হিসাবটা লুকাও', type: 'check' }] },
  { title: 'স্মৃতির ছবি', scene: 'memories', hide: 'memories', note: 'ছবিগুলো আলোর মালায় ক্লিপে ঝুলবে, হাওয়ায় দুলবে। পাশাপাশি সরিয়ে দেখা যাবে, ছুঁলে বড় হয়ে খুলবে।', fields: [{ p: 'memoriesTitle', label: 'শিরোনাম' }], list: 'memories' },
  { title: 'চিঠি', scene: 'letter', hide: 'letter', fields: [{ p: 'letter.greeting', label: 'সম্বোধন' }, { p: 'letter.body', label: 'চিঠি (নতুন লাইনে গেলে চিঠিতেও নতুন লাইন হবে)', type: 'area', rows: 12 }, { p: 'letter.closing', label: 'শেষের লাইন (তার নিচে আপনার নাম বসবে)' }] },
  { title: 'ভালোবাসার বয়াম', scene: 'reasons', hide: 'reasons', list: 'reasons', note: 'কাচের বয়ামে ভাঁজ করা কাগজের হৃদয় থাকবে, প্রতিটার ভেতরে একটা কারণ। বয়াম ছুঁলে একটা হৃদয় উড়ে এসে খুলে যায়। ১৬টা পর্যন্ত দেওয়া যায়।' },
  { title: 'কেক', scene: 'cake', hide: 'cake', fields: [{ p: 'cake.candles', label: 'মোমবাতির সংখ্যা (১ থেকে ৯)', type: 'number' }, { p: 'cake.wish', label: 'মোমবাতি নেভানোর পর লেখা', type: 'area' }] },
  { title: 'উপহার', scene: 'gift', hide: 'gift', note: 'বাক্স খুললে সোনালি পরতের কার্ড আসবে, আঙুলে ঘষে তুললে নিচের লেখা বেরোবে। কুপন ছুঁলে তাতে "গৃহীত" সিল পড়ে।', fields: [{ p: 'gift.title', label: 'শিরোনাম' }, { p: 'gift.message', label: 'ঘষে তোলার পর যে লেখা বেরোবে (উপহার কোথায় আছে)', type: 'area', rows: 4 }], list: 'gift.coupons' },
  { title: 'আতশবাজি (শেষ দৃশ্য)', scene: 'finale', hide: 'finale', note: 'আকাশে আতশবাজি ফাটবে, ছুঁলেও ফাটবে। তারপর আতশবাজির কণা মিলে লেখা হবে "Happy Birthday" আর তাঁর নাম। শেষে আপনার নাম আর আবার দেখার বোতাম।', fields: [{ p: 'finale.line', label: 'শেষের লেখা', type: 'area' }] },
  { title: 'লুকানো হৃদয়', scene: 'stars', list: 'secrets', note: 'তারার আকাশ, বাগান, ছবি, চিঠি, কেক আর উপহার: এই ছয় দৃশ্যে এই ক্রমে একটা করে ছোট হৃদয় লুকানো থাকবে। ছুঁলে আপনার একটা গোপন কথা বেরোবে, আর উপরের কোণে ছোট হৃদয়গুলো একটা একটা করে ভরে উঠবে।', fields: [{ p: 'secretsAll', label: 'সবগুলো খুঁজে পেলে শেষ দৃশ্যে যে কথা দেখাবে', type: 'area' }] },
  { title: 'গান', scene: 'envelope', music: true }
];

/* ---------- লুকানো-দেখানো ---------- */
const EYE = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 5C6.5 5 2.7 9.4 1.5 12c1.2 2.6 5 7 10.5 7s9.3-4.4 10.5-7C21.3 9.4 17.5 5 12 5zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3.3 2 2 3.3l3.2 3.2C3.5 7.9 2.2 9.8 1.5 12c1.2 2.6 5 7 10.5 7 1.9 0 3.6-.5 5-1.3l3.7 3.7 1.3-1.3L3.3 2zM12 16.5A4.5 4.5 0 0 1 7.5 12c0-.8.2-1.5.6-2.2l1.5 1.5a2.5 2.5 0 0 0 3.1 3.1l1.5 1.5c-.7.4-1.4.6-2.2.6zM12 5c-1.3 0-2.5.2-3.6.6l2 2c.5-.1 1-.1 1.6-.1a4.5 4.5 0 0 1 4.5 4.5c0 .5-.1 1.1-.2 1.6l3 3c1.5-1.3 2.6-2.8 3.2-4.1C21.3 9.4 17.5 5 12 5z"/></svg>';
const itemHidden = x => !!(x && typeof x === 'object' && x.hide);
const itemText = x => (x && typeof x === 'object' ? (x.text ?? x.caption ?? '') : x ?? '');
const secHidden = n => (C.hidden || []).includes(n);
function toggleSection(n) {
  const h = new Set(C.hidden || []); h.has(n) ? h.delete(n) : h.add(n); C.hidden = [...h];
}

/* ---------- ফর্ম আঁকা ---------- */
function fieldHTML(f) {
  const v = getP(f.p);
  if (f.type === 'check') return `<label class="chk"><input type="checkbox" data-p="${f.p}" data-t="check" ${v ? 'checked' : ''}><span>${esc(f.label)}</span></label>`;
  if (f.type === 'area') return `<div class="f"><label>${esc(f.label)}</label><textarea data-p="${f.p}" rows="${f.rows || 3}">${esc(v)}</textarea></div>`;
  if (f.type === 'csv') return `<div class="f"><label>${esc(f.label)}</label><input type="text" data-p="${f.p}" data-t="csv" value="${esc((v || []).join(', '))}"></div>`;
  if (f.type === 'number') return `<div class="f"><label>${esc(f.label)}</label><input type="number" min="1" max="9" data-p="${f.p}" data-t="num" value="${esc(v)}"></div>`;
  return `<div class="f"><label>${esc(f.label)}</label><input type="${f.type || 'text'}" data-p="${f.p}" value="${esc(v)}"></div>`;
}
function listHTML(path) {
  const arr = getP(path) || [];
  const ctl = i => `<div class="ctl"><button class="b ic sm eye-i ${itemHidden(arr[i]) ? 'off' : ''}" type="button" data-act="hide" data-i="${i}" title="${itemHidden(arr[i]) ? 'লুকানো আছে, চাপলে দেখাবে' : 'দেখাচ্ছে, চাপলে লুকাবে'}">${itemHidden(arr[i]) ? EYE_OFF : EYE}</button><button class="b ic sm" type="button" data-act="up" data-i="${i}" title="উপরে">↑</button><button class="b ic sm" type="button" data-act="down" data-i="${i}" title="নিচে">↓</button><button class="b ic sm danger" type="button" data-act="del" data-i="${i}" title="মুছে ফেলো">✕</button></div>`;
  if (path === 'memories') return `<div class="list" data-list="memories">${arr.map((m, i) => `
    <div class="item ${m.hide ? 'off' : ''}"><label class="thumb ${m.photo ? 'has' : ''}" style="${m.photo ? `background-image:url('${m.photo}')` : ''}">${m.photo ? '' : 'ছবি দিন'}<input type="file" accept="image/*" hidden data-photo="${i}"></label>
      <div class="grow"><input type="text" data-li="${i}" data-k="date" placeholder="উপরের ছোট লেখা (যেমন: বিয়ের দিন, ২০১৮)" value="${esc(m.date)}"><textarea data-li="${i}" data-k="caption" placeholder="ছবির নিচের কথা">${esc(m.caption)}</textarea></div>${ctl(i)}</div>`).join('')}
    <label class="b add">＋ ছবি যোগ করো (একসঙ্গে অনেকগুলো বাছা যায়)<input type="file" accept="image/*" multiple hidden id="addPhotos"></label></div>`;
  const ph = { reasons: 'একটা কারণ লিখুন…', secrets: 'একটা গোপন কথা লিখুন…' }[path] || 'যেমন: আজ রাতের রান্না আমার';
  const head = { 'gift.coupons': 'ভালোবাসার কুপন (না চাইলে সব মুছে দিন)', secrets: 'গোপন কথাগুলো (প্রথম ছয়টা ব্যবহার হবে)' }[path];
  const headHTML = head ? `<div class="f"><label>${head}</label></div>` : '';
  return `${headHTML}<div class="list" data-list="${path}">${arr.map((t, i) => `<div class="item ${itemHidden(t) ? 'off' : ''}"><div class="grow"><textarea data-li="${i}" placeholder="${ph}">${esc(itemText(t))}</textarea></div>${ctl(i)}</div>`).join('')}
    <button class="b add" type="button" data-act="add">＋ আরেকটা যোগ করো</button></div>`;
}
function musicHTML() {
  return `<div class="note">${C.music ? `এখন বাজবে: <b>${esc(C.musicName || 'আপনার গান')}</b>` : 'এখন বাজবে: এই পাতার নিজস্ব মিউজিক বক্সের সুর। কেকের মোমবাতি নেভালে "হ্যাপি বার্থডে" সুর বাজে।'}</div>
    <label class="b add">🎵 নিজের গান দিন (এমপিথ্রি, ৮ এমবির কম)<input type="file" accept="audio/*" hidden id="music"></label>
    ${C.music ? '<button class="b danger" type="button" id="noMusic">নিজের গান সরিয়ে মিউজিক বক্সে ফেরো</button>' : ''}`;
}
function render(openIdx) {
  const opened = openIdx ?? [...form.querySelectorAll('details')].findIndex(d => d.open);
  form.innerHTML = SECTIONS.map((s, i) => `
    <details data-i="${i}" data-scene="${s.scene}" class="${s.hide && secHidden(s.hide) ? 'sec-off' : ''}" ${i === opened ? 'open' : ''}>
      <summary><span class="n">${bn(i + 1)}</span><span class="st">${esc(s.title)}</span>${s.hide ? `<button type="button" class="eye ${secHidden(s.hide) ? 'off' : ''}" data-hide="${s.hide}" data-scene="${s.scene}" title="চাপলে বদলাবে">${secHidden(s.hide) ? EYE_OFF + 'লুকানো' : EYE + 'দেখাবে'}</button>` : ''}<span class="ar">›</span></summary>
      <div class="body">${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}${(s.fields || []).map(fieldHTML).join('')}${s.list ? listHTML(s.list) : ''}${s.music ? musicHTML() : ''}</div>
    </details>`).join('') + `<p class="size" id="size"></p>`;
  sizeNote();
}

/* ---------- পরিবর্তন ধরা ---------- */
let saveT, pushT;
function changed(soft) {
  $('#saved').textContent = 'সংরক্ষণ হচ্ছে…'; $('#saved').classList.add('busy');
  clearTimeout(saveT); saveT = setTimeout(async () => {
    try { await DB.set('content', C); $('#saved').textContent = 'সংরক্ষিত ✓'; } catch (e) { $('#saved').textContent = 'সংরক্ষণ হলো না!'; }
    $('#saved').classList.remove('busy'); sizeNote();
  }, 500);
  clearTimeout(pushT); pushT = setTimeout(push, soft ? 600 : 50);
}
function push() { if (frameReady) frame.contentWindow.postMessage({ type: 'content', content: C, scene }, '*'); }
function sizeNote() { const el = $('#size'); if (el) el.textContent = `মোট আকার: প্রায় ${bn((JSON.stringify(C).length / 1048576).toFixed(1))} এমবি (ছবি ছোট করে রাখা হয়)`; }

form.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.p) {
    let v = t.value;
    if (t.dataset.t === 'check') v = t.checked;
    else if (t.dataset.t === 'csv') v = v.split(/[,،]/).map(s => s.trim()).filter(Boolean);
    else if (t.dataset.t === 'num') v = Math.max(1, Math.min(9, +v || 1));
    setP(t.dataset.p, v); changed(true);
  } else if (t.dataset.li != null) {
    const path = t.closest('[data-list]').dataset.list, arr = getP(path), i = +t.dataset.li;
    if (t.dataset.k) arr[i][t.dataset.k] = t.value;
    else if (arr[i] && typeof arr[i] === 'object') arr[i].text = t.value;
    else arr[i] = t.value;
    changed(true);
  }
});
form.addEventListener('click', e => {
  const h = e.target.closest('[data-hide]'); if (!h) return;
  e.preventDefault(); e.stopPropagation();
  toggleSection(h.dataset.hide); scene = h.dataset.scene;
  render(); changed();
  toast(secHidden(h.dataset.hide) ? 'এই অংশ লুকানো হলো, তানিয়া এটা দেখবেন না' : 'এই অংশ আবার দেখাবে ✓');
});
form.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const listEl = b.closest('[data-list]'), path = listEl.dataset.list, arr = getP(path), i = +b.dataset.i;
  if (b.dataset.act === 'add') arr.push('');
  if (b.dataset.act === 'hide') {
    const x = arr[i];
    if (path === 'memories') x.hide = !x.hide;
    else arr[i] = itemHidden(x) ? itemText(x) : { text: itemText(x), hide: true };
  }
  if (b.dataset.act === 'del') { if (!confirm('এটা মুছে ফেলবেন?')) return; arr.splice(i, 1); }
  if (b.dataset.act === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
  if (b.dataset.act === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
  render(); changed();
});
form.addEventListener('toggle', e => {
  const d = e.target; if (!d.open) return;
  form.querySelectorAll('details[open]').forEach(x => { if (x !== d) x.open = false; });
  scene = d.dataset.scene; push();
}, true);

form.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.photo != null && t.files[0]) {
    toast('ছবি বসানো হচ্ছে…'); C.memories[+t.dataset.photo].photo = await resizeImage(t.files[0]); render(); changed(); toast('ছবি বসেছে ✓');
  } else if (t.id === 'addPhotos' && t.files.length) {
    toast(`${bn(t.files.length)}টা ছবি বসানো হচ্ছে…`);
    for (const f of t.files) C.memories.push({ photo: await resizeImage(f), date: '', caption: '' });
    render(); changed(); toast('ছবি যোগ হয়েছে ✓ এবার প্রতিটার নিচে কথা লিখে দিন');
  } else if (t.id === 'music' && t.files[0]) {
    const f = t.files[0];
    if (f.size > 8 * 1048576) { toast('গানটা ৮ এমবির বেশি, ছোট একটা দিন'); return; }
    C.music = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
    C.musicName = f.name; render(); changed(); toast('গান বসেছে ✓');
  }
});
form.addEventListener('click', e => { if (e.target.id === 'noMusic') { C.music = ''; C.musicName = ''; render(); changed(); } });

function resizeImage(file, max = 1280, q = .82) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('এই ছবিটা খোলা গেল না'); rej(); };
    img.src = url;
  });
}

/* ---------- উপরের বোতাম ---------- */
$('#full').onclick = async () => { await DB.set('content', C); window.open('index.html?draft=1', '_blank'); };
$('#exp').onclick = () => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(C, null, 1)], { type: 'application/json' }));
  a.download = 'tania-birthday.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
$('#imp').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { C = JSON.parse(await f.text()); render(0); changed(); toast('ফাইল খোলা হয়েছে ✓'); } catch (err) { toast('ফাইলটা পড়া গেল না'); }
  e.target.value = '';
};
$('#reset').onclick = () => { if (!confirm('সব লেখা আর ছবি মুছে নমুনায় ফিরবেন? আগে চাইলে "ফাইল নামাও" দিয়ে রেখে দিন।')) return; C = clone(SAMPLE); render(0); changed(); };

/* ---------- লাইভ করা (গিটহাবে তালাবদ্ধ লেখা পাঠানো) ---------- */
const GH = { owner: 'm-ashraful', repo: 'happy-birthday', branch: 'main', file: 'content.enc.json' };
const API = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${GH.file}`;
const tok = () => { try { return localStorage.getItem('hb-gh-token') || ''; } catch (e) { return ''; } };
const ghH = t => ({ Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' });
const isLocal = /^(localhost|127\.)/.test(location.hostname);
const answersOf = () => (C.gate && C.gate.answers || []).map(a => typeof a === 'object' ? a.text : a).filter(Boolean);

async function publish() {
  if (isLocal) { toast('এটা কম্পিউটারের পরীক্ষার পাতা। লাইভ করতে আসল সম্পাদনার পাতা খুলুন: m-ashraful.github.io/happy-birthday/edit.html'); return; }
  const t = tok(); if (!t) { openTok(); return; }
  const gateOn = answersOf().length && C.gate && C.gate.question && !(C.hidden || []).includes('gate');
  if (!gateOn && !confirm('গোপন প্রশ্ন বন্ধ বা খালি। এভাবে লাইভ করলে লিংক পাওয়া যে কেউ সব ছবি আর লেখা দেখতে পারবে। তবুও লাইভ করবেন?')) return;
  const btn = $('#pub'); btn.disabled = true; btn.textContent = 'লাইভ হচ্ছে…';
  try {
    const box = gateOn ? await Crypt.seal(C, answersOf(), { nick: C.nick || C.name || '', question: C.gate.question, hint: C.gate.hint || '' }) : { v: 1, open: true, content: C };
    let sha;
    const r0 = await fetch(`${API}?ref=${GH.branch}&t=${Date.now()}`, { headers: ghH(t), cache: 'no-store' });
    if (r0.status === 401 || r0.status === 403) { try { localStorage.removeItem('hb-gh-token'); } catch (e) { } toast('চাবিটা কাজ করছে না, নতুন একটা দিন'); openTok(); return; }
    if (r0.ok) sha = (await r0.json()).sha;
    const r = await fetch(API, { method: 'PUT', headers: ghH(t), body: JSON.stringify({ message: 'জন্মদিনের পাতা হালনাগাদ', content: Crypt.utf8b64(JSON.stringify(box)), branch: GH.branch, sha }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(r.status + ' ' + (j.message || '')); }
    toast(gateOn ? 'লাইভ হয়েছে ✓ (তালাবদ্ধ) এক-দুই মিনিটের মধ্যে লিংকে দেখা যাবে' : 'লাইভ হয়েছে ✓ এক-দুই মিনিটের মধ্যে লিংকে দেখা যাবে');
  } catch (e) { toast('লাইভ হলো না: ' + e.message); }
  finally { btn.disabled = false; btn.textContent = '🚀 লাইভ করো'; }
}
function openTok() { $('#tokMsg').textContent = ''; $('#tokIn').value = ''; $('#tokDlg').showModal(); }
$('#tokSave').onclick = async e => {
  e.preventDefault();
  const t = $('#tokIn').value.trim(); if (!t) { $('#tokMsg').textContent = 'চাবিটা বসান'; return; }
  $('#tokMsg').textContent = 'চাবি যাচাই হচ্ছে…';
  const r = await fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}`, { headers: ghH(t) }).catch(() => null);
  if (!r || !r.ok) { $('#tokMsg').textContent = 'চাবিটা কাজ করছে না। happy-birthday বাছা হয়েছে আর Contents "Read and write" দেওয়া হয়েছে কিনা দেখুন।'; return; }
  try { localStorage.setItem('hb-gh-token', t); } catch (err) { }
  $('#tokDlg').close(); publish();
};
$('#pub').onclick = publish;

// লাইভ পাতার লেখা ও ছবি এখানে আনা (অন্য ফোন/কম্পিউটারে কাজ করতে)
async function loadLive(silent) {
  const box = await fetch(`${GH.file}?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!box) { if (!silent) toast('এখনও কিছু লাইভ করা হয়নি'); return false; }
  let data = box.open ? box.content : null;
  if (!data) {
    const ans = prompt('লাইভ পাতার লেখা ও ছবি আনতে গোপন প্রশ্নের উত্তর লিখুন:\n' + ((box.meta && box.meta.question) || ''));
    if (ans == null) return false;
    data = await Crypt.open(box, ans);
    if (!data) { toast('উত্তর মেলেনি'); return false; }
  }
  if (!silent && !confirm('এখানকার লেখা আর ছবি সরিয়ে লাইভ পাতার লেখা আর ছবি আনবেন?')) return false;
  C = data; fillMissing(); render(0); changed(); toast('লাইভ পাতার লেখা আনা হয়েছে ✓'); return true;
}
$('#live').onclick = () => loadLive(false);

let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

/* ---------- ফোনের মাপ ও মোবাইলের ট্যাব ---------- */
function fit() { const pv = $('#pv'), s = Math.min(1, (pv.clientHeight - 50) / 864, (pv.clientWidth - 30) / 410); $('#phone').style.transform = `scale(${Math.max(.3, s)})`; }
addEventListener('resize', fit);
document.querySelectorAll('.mtabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.mtabs button').forEach(x => x.classList.toggle('on', x === b));
  document.body.classList.toggle('show-pv', b.dataset.t === 'pv'); fit(); push();
});

addEventListener('message', e => { if (e.source === frame.contentWindow && e.data && e.data.type === 'ready') { frameReady = true; push(); } });

// পুরনো খসড়ায় নতুন অংশগুলো না থাকলে নমুনা থেকে বসিয়ে দাও
function fillMissing() { (function fill(t, s) { for (const k in s) { if (t[k] === undefined) t[k] = clone(s[k]); else if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object') fill(t[k], s[k]); } })(C, SAMPLE); }

/* ---------- শুরু ---------- */
(async () => {
  SAMPLE = await fetch('content.json', { cache: 'no-store' }).then(r => r.json());
  const draft = await DB.get('content');
  C = draft || clone(SAMPLE);
  fillMissing();
  render(0); fit(); push();
  // এই ব্রাউজারে কোনো খসড়া না থাকলে লাইভ পাতার লেখা আনার সুযোগ
  if (!draft && !isLocal) setTimeout(() => loadLive(true), 600);
})();
})();
