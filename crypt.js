/* তালা: সব লেখা ও ছবি গোপন প্রশ্নের উত্তর দিয়ে বন্ধ থাকে (AES-GCM, উত্তর থেকে PBKDF2 চাবি)।
   একাধিক সঠিক উত্তর → প্রতিটা উত্তরের জন্য আলাদা "তালা", যেকোনোটা দিয়ে খোলে।
   উত্তরগুলো নিজে কোথাও খোলা অবস্থায় রাখা হয় না। */
window.Crypt = (() => {
'use strict';
const enc = new TextEncoder(), dec = new TextDecoder();
const norm = s => String(s).toLowerCase().normalize('NFC').replace(/[\s.,!?।'"-]/g, '');
function b64(buf) { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const rand = n => crypto.getRandomValues(new Uint8Array(n));
async function kdf(answer, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(norm(answer)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(obj, answers, meta) {
  const list = [...new Set(answers.map(norm).filter(Boolean))];
  const salt = rand(16), ck = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', ck), locks = [];
  for (const a of list) { const k = await kdf(a, salt), iv = rand(12); locks.push({ iv: b64(iv), k: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, raw)) }); }
  const iv = rand(12), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, ck, enc.encode(JSON.stringify(obj)));
  return { v: 1, meta, salt: b64(salt), locks, iv: b64(iv), data: b64(ct) };
}
async function open(box, answer) {
  if (!norm(answer)) return null;
  const k = await kdf(answer, unb64(box.salt));
  for (const l of box.locks) {
    try {
      const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(l.iv) }, k, unb64(l.k));
      const ck = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, ck, unb64(box.data))));
    } catch (e) { }
  }
  return null;
}
const utf8b64 = str => b64(enc.encode(str));
return { seal, open, norm, utf8b64 };
})();
