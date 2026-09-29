const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const seed = require('./seed');
const { renderVoucher, fileExists } = require('./voucher-pdf');

const PORT = process.env.PORT || 3000;
// Where data lives: DATA_DIR / UPLOAD_DIR if set, else a Railway volume if attached, else next to the code.
const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH || '';
const DATA_DIR = process.env.DATA_DIR || (VOLUME ? path.join(VOLUME, 'data') : path.join(__dirname, 'data'));
const UPLOAD_DIR = process.env.UPLOAD_DIR || (VOLUME ? path.join(VOLUME, 'uploads') : path.join(__dirname, 'uploads'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- field cleaners ---------- */
const uid = () => crypto.randomBytes(6).toString('hex');
const T = {
  s: v => String(v ?? '').trim().slice(0, 300),
  t: v => String(v ?? '').trim().slice(0, 4000),
  l: v => String(v ?? '').trim().slice(0, 30000),
  n: v => Number(v) || 0,
  b: v => v === true || v === 'true' || v === 'on' || v === 1,
  a: v => (Array.isArray(v) ? v : String(v ?? '').split('\n')).map(x => String(x).trim().slice(0, 300)).filter(Boolean).slice(0, 50),
  steps: v => (Array.isArray(v) ? v : []).map(x => ({ title: String(x?.title ?? '').trim().slice(0, 150), text: String(x?.text ?? '').trim().slice(0, 600) })).filter(x => x.title).slice(0, 30),
  img: v => { v = String(v ?? '').trim(); return /^\/(uploads|img)\/[\w.-]+$/.test(v) || /^https?:\/\/[^\s"'<>]+$/.test(v) ? v.slice(0, 500) : ''; },
  // accepts "facebook.com/page" as well as full links
  url: v => { v = String(v ?? '').trim(); if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v.replace(/^\/+/, ''); return /^https?:\/\/[^\s"'<>]+\.[^\s"'<>]+$/i.test(v) ? v.slice(0, 500) : ''; },
  // WhatsApp number: digits only, international format (a local 07xx / 01xx number becomes 254...)
  wa: v => { let d = String(v ?? '').replace(/\D/g, ''); if (/^0\d{9}$/.test(d)) d = '254' + d.slice(1); return d.slice(0, 15); }
};
const clean = (schema, body, partial = false) => {
  const out = {};
  for (const [k, type] of Object.entries(schema)) {
    if (partial && !(k in body)) continue;
    out[k] = T[type](body[k]);
  }
  return out;
};

/* ---------- content collections (admin-managed) ---------- */
const COLLECTIONS = {
  services: {
    f: { title: 's', category: 's', icon: 's', summary: 't', covers: 'a', steps: 'steps', image: 'img', order: 'n', featured: 'b', published: 'b' },
    isPublic: x => x.published, sort: (a, b) => a.order - b.order
  },
  blogs: {
    f: { title: 's', excerpt: 't', body: 'l', author: 's', image: 'img', published: 'b' },
    isPublic: x => x.published, sort: (a, b) => b.created.localeCompare(a.created)
  },
  events: {
    f: { title: 's', type: 's', date: 's', time: 's', venue: 's', description: 't', image: 'img', capacity: 'n', published: 'b' },
    isPublic: x => x.published, sort: (a, b) => a.date.localeCompare(b.date)
  },
  vouchers: {
    f: { title: 's', value: 's', description: 't', terms: 't', currency: 's', price: 'n', discountType: 's', discountValue: 'n', slots: 'n', opensAt: 's', expires: 's', active: 'b' },
    isPublic: x => x.active && (!x.expires || x.expires >= today()), sort: (a, b) => b.created.localeCompare(a.created)
  },
  insurers: {
    f: { name: 's', status: 's', note: 's', logo: 'img', order: 'n', published: 'b' },
    isPublic: x => x.published, sort: (a, b) => a.order - b.order
  },
  gallery: {
    f: { caption: 's', category: 's', image: 'img', published: 'b' },
    isPublic: x => x.published && x.image, sort: (a, b) => b.created.localeCompare(a.created)
  },
  catalog: {
    f: { name: 's', price: 's', description: 't', category: 's', image: 'img', available: 'b' },
    isPublic: x => x.available, sort: (a, b) => a.name.localeCompare(b.name)
  }
};

/* ---------- public submissions (visitors send, admin manages) ---------- */
const SUBMISSIONS = {
  bookings: {
    f: { name: 's', phone: 's', email: 's', service: 's', date: 's', time: 's', notes: 't' },
    req: ['name', 'phone', 'service', 'date'], init: { status: 'pending' },
    admin: { status: 's', adminNote: 't' },
    ok: 'Thank you! Your booking request is in. We will call or message you to confirm.'
  },
  inquiries: {
    f: { name: 's', phone: 's', email: 's', message: 't' },
    req: ['name', 'message'], init: { status: 'new', reply: '' },
    admin: { status: 's', reply: 't' },
    ok: 'Thank you! We have received your message and will get back to you shortly.'
  },
  feedback: {
    f: { name: 's', rating: 'n', message: 't' },
    req: ['name', 'message'], init: { approved: false },
    admin: { approved: 'b' },
    ok: 'Thank you for your feedback! It helps us care better.'
  },
  registrations: {
    f: { eventId: 's', name: 's', phone: 's', email: 's', guests: 'n', notes: 't' },
    req: ['eventId', 'name', 'phone'], init: { status: 'registered' },
    admin: { status: 's' },
    ok: 'You are registered! We look forward to seeing you.'
  },
  claims: {
    f: { voucherId: 's', name: 's', phone: 's', edd: 's' },
    req: ['voucherId', 'name', 'phone'], init: { status: 'issued' },
    admin: { status: 's' },
    ok: 'Your voucher is ready.'
  }
};

/* ---------- settings ---------- */
const SETTINGS_SCHEMA = {
  name: 's', tagline: 's', motto: 's', level: 's', phone: 's', whatsapp: 'wa', email: 's', address: 't', hours: 't',
  facebook: 'url', instagram: 'url', tiktok: 'url', logo: 'img',
  heroTitle: 's', heroText: 't', aboutText: 't',
  maternityTitle: 's', maternityText: 't', maternityHighlights: 'a',
  clinicTitle: 's', clinicDay: 's', clinicTime: 's', clinicText: 't', clinicCovers: 'a', clinicFee: 's',
  ambulanceTitle: 's', ambulancePhone: 's', ambulanceText: 't', ambulanceFeatures: 'a',
  catalogTitle: 's', catalogText: 't', catalogUrl: 'url',
  rightsIntro: 's', patientRights: 'a'
};

/* ---------- database (single JSON file) ---------- */
function today() { return new Date().toISOString().slice(0, 10); }
function hashPw(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') };
}
function checkPw(pw, a) {
  const h = crypto.scryptSync(String(pw), a.salt, 64), b = Buffer.from(a.hash, 'hex');
  return h.length === b.length && crypto.timingSafeEqual(h, b);
}
let db;
function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
let saveTimer = null;
const saveSoon = () => { if (saveTimer) return; saveTimer = setTimeout(() => { saveTimer = null; save(); }, 5000); saveTimer.unref?.(); };
process.on('SIGTERM', () => { if (saveTimer) { clearTimeout(saveTimer); save(); } process.exit(0); });

function load() {
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } else {
    db = { settings: {}, users: [] };
    for (const name of ['services', 'blogs', 'events', 'vouchers']) {
      db[name] = seed[name].map(x => ({ id: uid(), created: new Date().toISOString(), ...x }));
    }
  }
  if (!db.insurers) db.insurers = seed.insurers.map(x => ({ id: uid(), created: new Date().toISOString(), ...x }));
  for (const name of [...Object.keys(COLLECTIONS), ...Object.keys(SUBMISSIONS), 'chats']) db[name] ||= [];
  db.analytics ||= { salt: crypto.randomBytes(16).toString('hex'), days: {} };
  if (db.settings.whatsapp === '254700000000') delete db.settings.whatsapp; // old placeholder → real number from seed
  db.settings = clean(SETTINGS_SCHEMA, { ...seed.settings, ...db.settings });
  // staff accounts (older installs had a single db.admin: migrate it)
  db.users ||= [];
  if (db.admin) {
    db.users.push({ id: uid(), username: db.admin.user, name: 'Administrator', role: 'admin', active: true, created: new Date().toISOString(), salt: db.admin.salt, hash: db.admin.hash });
    delete db.admin;
  }
  const envPw = process.env.ADMIN_PASSWORD;                   // resets the first admin's password on every start
  const initialPw = process.env.ADMIN_INITIAL_PASSWORD;       // only used when the very first admin is created
  const firstAdmin = db.users.find(u => u.role === 'admin');
  if (!firstAdmin) {
    const pw = initialPw || envPw || crypto.randomBytes(6).toString('base64url');
    db.users.push({ id: uid(), username: 'admin', name: 'Administrator', role: 'admin', active: true, created: new Date().toISOString(), ...hashPw(pw) });
    if (!initialPw && !envPw) {
      console.log('\n=====================================================');
      console.log(' First run: admin login created');
      console.log('   Username: admin');
      console.log('   Password: ' + pw);
      console.log(' Sign in at /admin and change it under Account.');
      console.log('=====================================================\n');
    }
  } else if (envPw) {
    Object.assign(firstAdmin, hashPw(envPw), { active: true });
  }
  save();
}
load();

/* ---------- vouchers: pricing, slots and opening date ---------- */
const money = (n, cur) => `${cur || 'KES'} ${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
function voucherView(v) {
  const price = Math.max(0, Number(v.price) || 0), dv = Math.max(0, Number(v.discountValue) || 0), cur = v.currency || 'KES';
  let label = '', saving = 0;
  if (dv > 0) {
    if (v.discountType === 'amount') { label = money(dv, cur) + ' OFF'; saving = dv; }
    else { label = Math.min(dv, 100) + '% OFF'; saving = price * Math.min(dv, 100) / 100; }
  }
  const claimed = db.claims.filter(c => c.voucherId === v.id).length;
  const slotsLeft = v.slots > 0 ? Math.max(0, v.slots - claimed) : null;
  const state = v.opensAt && v.opensAt > today() ? 'upcoming' : slotsLeft === 0 ? 'full' : 'open';
  return { ...v, discountLabel: label || v.value || 'Maternity offer', finalPrice: price ? Math.max(0, Math.round(price - saving)) : 0, claimed, slotsLeft, state };
}

/* ---------- small helpers ---------- */
const hits = new Map();
const limited = (req, key, max, windowMs) => {
  const k = key + ':' + req.ip, now = Date.now();
  const list = (hits.get(k) || []).filter(t => now - t < windowMs);
  list.push(now); hits.set(k, list);
  return list.length > max;
};
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 3600000)) hits.delete(k); }, 600000).unref();

const sessions = new Map();
const tokenOf = req => (/(?:^|;\s*)sh_admin=([a-f0-9]+)/.exec(req.headers.cookie || '') || [])[1];
// roles: admin = everything incl. users; editor = content + requests; reception = requests only (no deleting)
const CONTENT_ROLES = ['admin', 'editor'];
function requireAdmin(req, res, next) {
  const t = tokenOf(req), s = t && sessions.get(t);
  const user = s && s.exp > Date.now() && db.users.find(u => u.id === s.uid && u.active);
  if (!user) { sessions.delete(t); return res.status(401).json({ error: 'Please sign in' }); }
  req.token = t; req.user = user; next();
}
const role = (...allowed) => (req, res, next) => allowed.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have permission to do that.' });
const dropSessions = (uid, except) => { for (const [t, s] of sessions) if (s.uid === uid && t !== except) sessions.delete(t); };
const publicUser = ({ salt, hash, ...u }) => u;
const wrap = fn => (req, res) => { try { fn(req, res); } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); } };
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

/* ---------- app ---------- */
const app = express();
app.disable('x-powered-by');
if (process.env.RAILWAY_ENVIRONMENT || process.env.TRUST_PROXY) app.set('trust proxy', 1); // real visitor IPs behind the host's proxy (for rate limits)
app.get('/healthz', (req, res) => res.type('text').send('ok'));
app.use((req, res, next) => {
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=15552000');
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; frame-src https://www.google.com; base-uri 'self'; form-action 'self'"
  });
  next();
});
app.use(express.json({ limit: '200kb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.get('/admin', (req, res) => res.redirect('/admin.html'));
app.use(express.static(path.join(__dirname, 'public')));

/* ----- public reads ----- */
app.get('/api/settings', (req, res) => res.json(db.settings));

app.get('/api/feedback', (req, res) => {
  res.json(db.feedback.filter(f => f.approved).sort((a, b) => b.created.localeCompare(a.created))
    .map(({ name, rating, message, created }) => ({ name, rating, message, created })));
});

app.get('/api/:col', (req, res) => {
  const c = COLLECTIONS[req.params.col];
  if (!c) return bad(res, 'Not found', 404);
  let rows = db[req.params.col].filter(c.isPublic).sort(c.sort);
  if (req.params.col === 'events') {
    rows = rows.map(e => {
      const registered = db.registrations.filter(r => r.eventId === e.id && r.status !== 'cancelled').reduce((n, r) => n + 1 + Math.max(0, r.guests), 0);
      return { ...e, registered, full: e.capacity > 0 && registered >= e.capacity };
    });
  }
  if (req.params.col === 'vouchers') rows = rows.map(voucherView);
  res.json(rows);
});

/* ----- public submissions ----- */
app.post('/api/submit/:col', wrap((req, res) => {
  const c = SUBMISSIONS[req.params.col];
  if (!c) return bad(res, 'Not found', 404);
  if (limited(req, 'submit', 12, 600000)) return bad(res, 'Too many requests. Please try again in a few minutes.', 429);
  if (req.body.website) return res.json({ ok: true, message: c.ok }); // honeypot
  const data = clean(c.f, req.body);
  for (const k of c.req) if (!data[k]) return bad(res, 'Please fill in all required fields.');
  if (req.params.col === 'inquiries' && !data.phone && !data.email) return bad(res, 'Please give a phone number or email so we can reply.');
  if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return bad(res, 'That email address does not look right.');
  const extra = {};
  if (req.params.col === 'bookings' && data.date < today()) return bad(res, 'Please choose a date that is today or later.');
  if (req.params.col === 'bookings') extra.ref = 'BK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  if (req.params.col === 'feedback') { data.rating = Math.round(data.rating); if (data.rating < 1 || data.rating > 5) return bad(res, 'Please choose a star rating.'); }
  if (req.params.col === 'registrations') {
    const ev = db.events.find(e => e.id === data.eventId && e.published);
    if (!ev) return bad(res, 'That event is no longer available.');
    data.guests = Math.min(5, Math.max(0, Math.floor(data.guests)));
    const taken = db.registrations.filter(r => r.eventId === ev.id && r.status !== 'cancelled').reduce((n, r) => n + 1 + Math.max(0, r.guests), 0);
    if (ev.capacity > 0 && taken + 1 + data.guests > ev.capacity) return bad(res, 'Sorry, this event does not have enough places left.');
    extra.eventTitle = ev.title;
  }
  if (req.params.col === 'claims') {
    const raw = db.vouchers.find(x => x.id === data.voucherId && COLLECTIONS.vouchers.isPublic(x));
    if (!raw) return bad(res, 'That voucher is no longer available.');
    const v = voucherView(raw);
    if (v.state === 'upcoming') return bad(res, 'This voucher opens on ' + new Date(v.opensAt + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '.');
    if (v.state === 'full') return bad(res, 'Sorry, all slots for this voucher have been taken.');
    if (db.claims.some(x => x.voucherId === v.id && x.phone.replace(/\D/g, '') === data.phone.replace(/\D/g, ''))) return bad(res, 'This phone number has already claimed this voucher.');
    extra.code = 'SHH-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    Object.assign(extra, { voucherTitle: v.title, value: v.value, discountLabel: v.discountLabel, price: v.price || 0, finalPrice: v.finalPrice, currency: v.currency || 'KES', opensAt: v.opensAt || '', expires: v.expires || '', terms: v.terms || '' });
  }
  const row = { id: uid(), created: new Date().toISOString(), ...data, ...c.init, ...extra };
  db[req.params.col].push(row);
  save();
  res.json({ ok: true, message: c.ok, code: extra.code, ref: extra.ref });
}));

/* ----- visit counter: anonymous daily totals only ----- */
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|uptime|curl|wget|python|axios|node-fetch|go-http/i;
const PAGES = new Set(['', 'maternity', 'services', 'service', 'clinic', 'events', 'gallery', 'blog', 'ambulance', 'catalog', 'book', 'contact', 'insurance', 'patient-rights']);
app.post('/api/track', (req, res) => {
  res.status(204).end();
  try {
    const ua = String(req.headers['user-agent'] || '');
    if (req.headers.dnt === '1' || req.headers['sec-gpc'] === '1' || !ua || BOT.test(ua) || limited(req, 'track', 300, 600000)) return;
    const seg = String(req.body?.path ?? '/').split('?')[0].split('/')[1] || '';
    const page = '/' + (PAGES.has(seg) ? seg : 'other');
    const day = today(), days = db.analytics.days;
    const d = days[day] ||= { views: 0, uniques: 0, pages: {}, u: {} };
    d.views++; d.pages[page] = (d.pages[page] || 0) + 1;
    // a one-way daily hash lets us count unique visitors without storing IP addresses
    const h = crypto.createHash('sha256').update(db.analytics.salt + day + req.ip + ua).digest('hex').slice(0, 12);
    if (!d.u[h] && d.uniques < 50000) { d.u[h] = 1; d.uniques++; }
    const keys = Object.keys(days).sort();
    while (keys.length > 400) delete days[keys.shift()];
    saveSoon();
  } catch (e) { console.error('track', e.message); }
});

/* ----- live chat (visitor side; the visitor's token is the secret) ----- */
const chatMsgs = c => c.messages.map(({ from, text, at, by }) => ({ from, text, at, by }));
app.post('/api/chat/send', wrap((req, res) => {
  if (limited(req, 'chat', 40, 600000)) return bad(res, 'You are sending messages very quickly. Please wait a moment.', 429);
  if (req.body?.website) return res.json({ ok: true, messages: [] }); // honeypot
  const text = String(req.body?.text ?? '').trim().slice(0, 1000);
  if (!text) return bad(res, 'Please type a message.');
  const now = new Date().toISOString();
  let c = req.body?.token && db.chats.find(x => x.token === String(req.body.token));
  if (!c) {
    if (db.chats.length >= 2000) return bad(res, 'Chat is busy right now. Please use WhatsApp or call us.');
    c = { id: uid(), token: crypto.randomBytes(16).toString('hex'), name: T.s(req.body?.name) || 'Visitor', created: now, updated: now, status: 'open', unread: 0, messages: [] };
    db.chats.push(c);
  } else if (c.name === 'Visitor' && req.body?.name) c.name = T.s(req.body.name) || c.name;
  if (c.messages.length >= 300) return bad(res, 'This chat is full. Please use WhatsApp or call us.');
  c.messages.push({ from: 'visitor', text, at: now });
  Object.assign(c, { updated: now, unread: (c.unread || 0) + 1, status: 'open' });
  save();
  res.json({ ok: true, token: c.token, messages: chatMsgs(c) });
}));
app.get('/api/chat/:token', (req, res) => {
  if (limited(req, 'chatpoll', 600, 600000)) return bad(res, 'Too many requests.', 429);
  const c = db.chats.find(x => x.token === req.params.token);
  if (!c) return bad(res, 'Not found', 404);
  res.json({ messages: chatMsgs(c) });
});

/* ----- voucher PDF (A4 landscape, downloads automatically after a claim) ----- */
app.get('/api/voucher-pdf/:code', (req, res) => {
  if (limited(req, 'lookup', 40, 600000)) return bad(res, 'Too many requests. Please try again later.', 429);
  const c = db.claims.find(x => x.code === String(req.params.code).toUpperCase());
  if (!c) return bad(res, 'We could not find that voucher.', 404);
  const logo = String(db.settings.logo || '');
  const m = /^\/(uploads|img)\/([\w.-]+\.(?:jpe?g|png))$/i.exec(logo);
  const logoFile = m ? path.join(m[1] === 'uploads' ? UPLOAD_DIR : path.join(__dirname, 'public', 'img'), m[2]) : null;
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `${req.query.view ? 'inline' : 'attachment'}; filename="Silent-Hill-Voucher-${c.code}.pdf"`, 'Cache-Control': 'no-store' });
  renderVoucher(res, c, db.settings, logoFile && fileExists(logoFile) ? logoFile : null);
});

/* ----- ticket / voucher lookup (the reference is the secret) ----- */
app.get('/api/lookup/:col/:ref', (req, res) => {
  if (limited(req, 'lookup', 40, 600000)) return bad(res, 'Too many requests. Please try again later.', 429);
  const key = { bookings: 'ref', claims: 'code' }[req.params.col];
  if (!key) return bad(res, 'Not found', 404);
  const r = db[req.params.col].find(x => x[key] === String(req.params.ref).toUpperCase());
  if (!r) return bad(res, 'We could not find that reference.', 404);
  const { id, adminNote, ...safe } = r;
  res.json(safe);
});

/* ----- admin auth ----- */
app.post('/api/admin/login', wrap((req, res) => {
  if (limited(req, 'login', 8, 600000)) return bad(res, 'Too many attempts. Try again in 10 minutes.', 429);
  const { user, password } = req.body || {};
  const u = db.users.find(x => x.username === String(user || '').trim().toLowerCase());
  const ok = checkPw(password || '', u || { salt: 'x', hash: '00'.repeat(64) }); // same work whether or not the user exists
  if (!u || !u.active || !ok) return bad(res, 'Wrong username or password.', 401);
  const t = crypto.randomBytes(32).toString('hex');
  sessions.set(t, { uid: u.id, exp: Date.now() + 12 * 3600000 });
  u.lastLogin = new Date().toISOString(); save();
  res.set('Set-Cookie', `sh_admin=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${req.secure ? '; Secure' : ''}`);
  res.json({ ok: true });
}));
app.post('/api/admin/logout', (req, res) => {
  sessions.delete(tokenOf(req));
  res.set('Set-Cookie', `sh_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${req.secure ? '; Secure' : ''}`);
  res.json({ ok: true });
});
app.get('/api/admin/me', requireAdmin, (req, res) => res.json(publicUser(req.user)));
app.post('/api/admin/password', requireAdmin, wrap((req, res) => {
  const { current, next } = req.body || {};
  if (!checkPw(current || '', req.user)) return bad(res, 'Current password is wrong.');
  if (String(next || '').length < 6) return bad(res, 'New password must be at least 6 characters.');
  Object.assign(req.user, hashPw(String(next)));
  dropSessions(req.user.id, req.token);
  save();
  res.json({ ok: true });
}));

/* ----- live chat (staff side, all roles) ----- */
const chatOut = ({ token, ...c }) => c;
app.get('/api/admin/chats', requireAdmin, (req, res) => res.json([...db.chats].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 200).map(chatOut)));
app.post('/api/admin/chats/:id/reply', requireAdmin, wrap((req, res) => {
  const c = db.chats.find(x => x.id === req.params.id);
  if (!c) return bad(res, 'Not found', 404);
  const text = String(req.body?.text ?? '').trim().slice(0, 1000);
  if (!text) return bad(res, 'Please type a reply.');
  const now = new Date().toISOString();
  c.messages.push({ from: 'staff', text, at: now, by: req.user.name });
  Object.assign(c, { updated: now, unread: 0, status: 'open' });
  save(); res.json(chatOut(c));
}));
app.put('/api/admin/chats/:id', requireAdmin, wrap((req, res) => {
  const c = db.chats.find(x => x.id === req.params.id);
  if (!c) return bad(res, 'Not found', 404);
  if (req.body?.read) c.unread = 0;
  if (['open', 'closed'].includes(req.body?.status)) c.status = req.body.status;
  save(); res.json(chatOut(c));
}));
app.delete('/api/admin/chats/:id', requireAdmin, role(...CONTENT_ROLES), wrap((req, res) => {
  const i = db.chats.findIndex(x => x.id === req.params.id);
  if (i < 0) return bad(res, 'Not found', 404);
  db.chats.splice(i, 1); save(); res.json({ ok: true });
}));

/* ----- reports (admin/editor) ----- */
const dayList = n => { const out = [], t = new Date(); for (let i = n - 1; i >= 0; i--) { const d = new Date(t); d.setUTCDate(d.getUTCDate() - i); out.push(d.toISOString().slice(0, 10)); } return out; };
app.get('/api/admin/reports', requireAdmin, role(...CONTENT_ROLES), (req, res) => {
  const n = Math.min(365, Math.max(1, parseInt(req.query.days) || 30)), days = dayList(n), from = days[0];
  const inRange = r => String(r.created || '').slice(0, 10) >= from;
  const bk = db.bookings.filter(inRange), iq = db.inquiries.filter(inRange), fb = db.feedback.filter(inRange);
  const count = (arr, f) => { const m = {}; for (const x of arr) { const k = f(x) || 'Unknown'; m[k] = (m[k] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })); };
  const perDay = arr => { const m = {}; for (const x of arr) { const d = String(x.created).slice(0, 10); m[d] = (m[d] || 0) + 1; } return m; };
  const bd = perDay(bk), qd = perDay(iq), an = db.analytics.days;
  const series = days.map(d => ({ date: d, views: an[d]?.views || 0, visitors: an[d]?.uniques || 0, bookings: bd[d] || 0, inquiries: qd[d] || 0 }));
  const pages = {};
  for (const d of days) for (const [p, c] of Object.entries(an[d]?.pages || {})) pages[p] = (pages[p] || 0) + c;
  const sum = k => series.reduce((t, x) => t + x[k], 0);
  res.json({
    days: n, from, series,
    totals: {
      views: sum('views'), visitors: sum('visitors'), bookings: bk.length, inquiries: iq.length, answered: iq.filter(x => x.status === 'answered').length,
      feedback: fb.length, avgRating: fb.length ? +(fb.reduce((t, x) => t + x.rating, 0) / fb.length).toFixed(1) : null,
      claims: db.claims.filter(inRange).length, registrations: db.registrations.filter(inRange).length, chats: db.chats.filter(inRange).length
    },
    topPages: Object.entries(pages).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    bookingsByStatus: count(bk, x => x.status), bookingsByService: count(bk, x => x.service).slice(0, 8), inquiriesByStatus: count(iq, x => x.status),
    allTime: { bookings: db.bookings.length, inquiries: db.inquiries.length, firstVisitDay: Object.keys(an).sort()[0] || null }
  });
});

const EXPORTS = {
  bookings: ['created', 'ref', 'name', 'phone', 'email', 'service', 'date', 'time', 'status', 'notes'],
  inquiries: ['created', 'name', 'phone', 'email', 'message', 'status', 'reply'],
  feedback: ['created', 'name', 'rating', 'message', 'approved'],
  registrations: ['created', 'eventTitle', 'name', 'phone', 'email', 'guests', 'status'],
  claims: ['created', 'code', 'voucherTitle', 'name', 'phone', 'status']
};
const csvCell = v => { let t = String(v ?? '').replace(/\r?\n/g, ' '); if (/^[=+\-@\t]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; }; // quote, and defuse spreadsheet formulas
app.get('/api/admin/export/:col', requireAdmin, role(...CONTENT_ROLES), (req, res) => {
  const cols = EXPORTS[req.params.col];
  if (!cols) return bad(res, 'Not found', 404);
  const from = req.query.days ? dayList(Math.min(365, Math.max(1, parseInt(req.query.days) || 30)))[0] : '';
  const rows = db[req.params.col].filter(r => !from || String(r.created).slice(0, 10) >= from).sort((a, b) => b.created.localeCompare(a.created));
  const csv = '\ufeff' + [cols.join(','), ...rows.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\r\n');
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${req.params.col}-${today()}.csv"`, 'Cache-Control': 'no-store' }).send(csv);
});

/* ----- staff accounts (admin only) ----- */
const activeAdmins = () => db.users.filter(u => u.role === 'admin' && u.active);
const ROLES = ['admin', 'editor', 'reception'];
app.get('/api/admin/users', requireAdmin, role('admin'), (req, res) => res.json(db.users.map(publicUser)));
app.post('/api/admin/users', requireAdmin, role('admin'), wrap((req, res) => {
  const username = T.s(req.body?.username).toLowerCase(), name = T.s(req.body?.name), password = String(req.body?.password ?? '');
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return bad(res, 'Username must be 3–30 letters, numbers, dots, dashes or underscores.');
  if (!name) return bad(res, 'Please enter the person’s name.');
  if (!ROLES.includes(req.body?.role)) return bad(res, 'Please choose a role.');
  if (password.length < 6) return bad(res, 'Password must be at least 6 characters.');
  if (db.users.some(u => u.username === username)) return bad(res, 'That username is already taken.');
  const u = { id: uid(), username, name, role: req.body.role, active: true, created: new Date().toISOString(), ...hashPw(password) };
  db.users.push(u); save();
  res.json(publicUser(u));
}));
app.put('/api/admin/users/:id', requireAdmin, role('admin'), wrap((req, res) => {
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return bad(res, 'Not found', 404);
  const b = req.body || {};
  const next = { role: 'role' in b ? b.role : u.role, active: 'active' in b ? T.b(b.active) : u.active };
  if (!ROLES.includes(next.role)) return bad(res, 'Please choose a role.');
  if (u.role === 'admin' && u.active && (next.role !== 'admin' || !next.active) && activeAdmins().length < 2) return bad(res, 'There must be at least one active administrator.');
  if (u.id === req.user.id && !next.active) return bad(res, 'You cannot deactivate your own account.');
  if ('name' in b) { const n = T.s(b.name); if (!n) return bad(res, 'Please enter the person’s name.'); u.name = n; }
  if (b.password) { if (String(b.password).length < 6) return bad(res, 'Password must be at least 6 characters.'); Object.assign(u, hashPw(String(b.password))); }
  Object.assign(u, next);
  if (b.password || !u.active || next.role !== 'admin') dropSessions(u.id, u.id === req.user.id ? req.token : undefined);
  save();
  res.json(publicUser(u));
}));
app.delete('/api/admin/users/:id', requireAdmin, role('admin'), wrap((req, res) => {
  const i = db.users.findIndex(x => x.id === req.params.id), u = db.users[i];
  if (!u) return bad(res, 'Not found', 404);
  if (u.id === req.user.id) return bad(res, 'You cannot delete your own account.');
  if (u.role === 'admin' && u.active && activeAdmins().length < 2) return bad(res, 'There must be at least one active administrator.');
  db.users.splice(i, 1); dropSessions(u.id); save();
  res.json({ ok: true });
}));

/* ----- admin data ----- */
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  res.json({
    bookings: db.bookings.filter(x => x.status === 'pending').length,
    inquiries: db.inquiries.filter(x => x.status === 'new').length,
    feedback: db.feedback.filter(x => !x.approved).length,
    registrations: db.registrations.filter(x => x.status === 'registered').length,
    claims: db.claims.filter(x => x.status === 'issued').length,
    chats: db.chats.filter(x => x.unread > 0).length,
    visitsToday: db.analytics.days[today()]?.views || 0
  });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, uid() + uid() + { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[file.mimetype])
  }),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype))
});
app.post('/api/admin/upload', requireAdmin, role(...CONTENT_ROLES), (req, res) => {
  upload.single('file')(req, res, err => {
    if (err) return bad(res, err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 6 MB).' : 'Upload failed.');
    if (!req.file) return bad(res, 'Please choose a JPG, PNG, WebP or GIF image.');
    // don't trust the browser's claimed type: check the file's real first bytes match an image format
    const head = Buffer.alloc(12);
    try { const fd = fs.openSync(req.file.path, 'r'); fs.readSync(fd, head, 0, 12, 0); fs.closeSync(fd); } catch { /* unreadable: rejected below */ }
    const real = { '.jpg': head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF,
      '.png': head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])),
      '.gif': /^GIF8[79]a$/.test(head.subarray(0, 6).toString('latin1')),
      '.webp': head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP' }[path.extname(req.file.filename)];
    if (!real) { fs.unlink(req.file.path, () => {}); return bad(res, 'That file is not a real image.'); }
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

app.put('/api/admin/settings', requireAdmin, role(...CONTENT_ROLES), wrap((req, res) => {
  Object.assign(db.settings, clean(SETTINGS_SCHEMA, req.body || {}, true));
  save();
  res.json(db.settings);
}));

// requests (bookings, inquiries...) are open to all staff; content collections need admin/editor; deleting requests needs admin/editor
const colAllowed = (req, col, deleting) => SUBMISSIONS[col] ? (!deleting || CONTENT_ROLES.includes(req.user.role)) : CONTENT_ROLES.includes(req.user.role);
const noPerm = res => bad(res, 'You do not have permission to do that.', 403);

app.get('/api/admin/:col', requireAdmin, (req, res) => {
  const col = req.params.col;
  if (!COLLECTIONS[col] && !SUBMISSIONS[col]) return bad(res, 'Not found', 404);
  if (!colAllowed(req, col)) return noPerm(res);
  const sort = COLLECTIONS[col]?.sort || ((a, b) => b.created.localeCompare(a.created));
  let rows = [...db[col]].sort(sort);
  if (col === 'vouchers') rows = rows.map(voucherView);
  res.json(rows);
});

app.post('/api/admin/:col', requireAdmin, wrap((req, res) => {
  const c = COLLECTIONS[req.params.col];
  if (!c) return bad(res, 'Not found', 404);
  if (!colAllowed(req, req.params.col)) return noPerm(res);
  const data = clean(c.f, req.body || {});
  const row = { id: uid(), created: new Date().toISOString(), ...data };
  db[req.params.col].push(row);
  save();
  res.json(row);
}));

app.put('/api/admin/:col/:id', requireAdmin, wrap((req, res) => {
  const col = req.params.col;
  const schema = COLLECTIONS[col]?.f || SUBMISSIONS[col]?.admin;
  if (!schema) return bad(res, 'Not found', 404);
  if (!colAllowed(req, col)) return noPerm(res);
  const row = db[col].find(x => x.id === req.params.id);
  if (!row) return bad(res, 'Not found', 404);
  Object.assign(row, clean(schema, req.body || {}, true));
  if (col === 'inquiries' && row.reply && row.status === 'new') row.status = 'answered';
  row.updated = new Date().toISOString();
  save();
  res.json(row);
}));

app.delete('/api/admin/:col/:id', requireAdmin, wrap((req, res) => {
  const col = req.params.col;
  if (!COLLECTIONS[col] && !SUBMISSIONS[col]) return bad(res, 'Not found', 404);
  if (!colAllowed(req, col, true)) return noPerm(res);
  const i = db[col].findIndex(x => x.id === req.params.id);
  if (i < 0) return bad(res, 'Not found', 404);
  db[col].splice(i, 1);
  save();
  res.json({ ok: true });
}));

app.use('/api', (req, res) => bad(res, 'Not found', 404));

app.listen(PORT, () => {
  console.log(`Silent Hill Hospital website running:\n  Site:  http://localhost:${PORT}\n  Admin: http://localhost:${PORT}/admin`);
});
