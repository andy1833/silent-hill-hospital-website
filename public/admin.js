/* Silent Hill Hospital: admin panel */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const root = $('#root');
let SET = {}, STATS = {}, ME = {}, current = 'dashboard', cache = {};

class AuthError extends Error {}
async function api(url, method = 'GET', body) {
  const opt = { method, headers: {} };
  if (body instanceof FormData) opt.body = body;
  else if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt);
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && !url.endsWith('/login')) { showLogin(); throw new AuthError(); }
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}
function toast(msg, err) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 2800);
}
const guard = fn => async (...a) => { try { await fn(...a); } catch (e) { if (!(e instanceof AuthError)) toast(e.message, true); } };

/* ---------- field definitions ---------- */
const CATS = { maternity: 'Maternity & Women’s Health', child: 'Child Health', general: 'General & Outpatient', diagnostics: 'Laboratory & Pharmacy', emergency: 'Emergency & Referral' };
const FIELDS = {
  services: [
    { k: 'title', l: 'Service name', t: 'text', req: 1 },
    { k: 'category', l: 'Category', t: 'select', o: CATS },
    { k: 'icon', l: 'Icon (an emoji, e.g. 🤰)', t: 'text' },
    { k: 'summary', l: 'Short description', t: 'textarea' },
    { k: 'covers', l: 'What it covers', t: 'lines', h: 'One item per line.' },
    { k: 'steps', l: 'Steps we walk with the patient', t: 'steps', h: 'One step per line, written as: Step title | short description' },
    { k: 'image', l: 'Photo (optional)', t: 'image' },
    { k: 'order', l: 'Display order', t: 'number', h: 'Smaller numbers appear first.' },
    { k: 'featured', l: 'Show on the home page', t: 'check' },
    { k: 'published', l: 'Published (visible on the website)', t: 'check' }
  ],
  blogs: [
    { k: 'title', l: 'Title', t: 'text', req: 1 }, { k: 'author', l: 'Author', t: 'text' },
    { k: 'excerpt', l: 'Short summary', t: 'textarea' },
    { k: 'body', l: 'Article', t: 'textarea', big: 1, h: 'Leave a blank line between paragraphs.' },
    { k: 'image', l: 'Cover photo', t: 'image' }, { k: 'published', l: 'Published', t: 'check' }
  ],
  events: [
    { k: 'title', l: 'Event name', t: 'text', req: 1 },
    { k: 'type', l: 'Type', t: 'text', h: 'E.g. Baby shower, Mother education, Health camp' },
    { k: 'date', l: 'Date', t: 'date', req: 1 }, { k: 'time', l: 'Time', t: 'text', h: 'E.g. 10:00 AM – 1:00 PM' },
    { k: 'venue', l: 'Venue', t: 'text' }, { k: 'description', l: 'Description', t: 'textarea' },
    { k: 'capacity', l: 'Places available (0 = unlimited)', t: 'number' },
    { k: 'image', l: 'Photo', t: 'image' }, { k: 'published', l: 'Published', t: 'check' }
  ],
  vouchers: [
    { k: 'title', l: 'Voucher name', t: 'text', req: 1, h: 'E.g. Delivery package discount' },
    { k: 'description', l: 'What the discount applies to', t: 'textarea', h: 'E.g. Normal delivery package.' },
    { k: 'currency', l: 'Currency', t: 'text', h: 'E.g. KES' },
    { k: 'price', l: 'Regular price', t: 'number', h: 'The normal price of the service. The voucher then shows what the mother pays. Leave 0 to show only the discount.' },
    { k: 'discountType', l: 'Discount type', t: 'select', o: { percent: 'Percentage off (%)', amount: 'Fixed amount off' } },
    { k: 'discountValue', l: 'Discount', t: 'number', h: 'For example 20 for 20% off, or 2000 for KES 2,000 off.' },
    { k: 'slots', l: 'Number of people allowed (slots)', t: 'number', h: 'How many mothers can claim it. 0 = unlimited. It closes automatically when full.' },
    { k: 'opensAt', l: 'Opens on', t: 'date', h: 'Claiming stays closed until this date. Leave empty to open straight away.' },
    { k: 'expires', l: 'Closes on', t: 'date', h: 'The last day the voucher can be used. Leave empty for no end date.' },
    { k: 'terms', l: 'Terms', t: 'textarea' },
    { k: 'value', l: 'Headline (only used when there is no discount above)', t: 'text' },
    { k: 'active', l: 'Active (visible on the website)', t: 'check' }
  ],
  insurers: [
    { k: 'name', l: 'Insurance name', t: 'text', req: 1 },
    { k: 'status', l: 'Status', t: 'select', o: { accredited: 'Accredited (shows the big accredited badge, e.g. SHA)', accepted: 'Accepted', coming: 'Coming soon' } },
    { k: 'note', l: 'Short note', t: 'text', h: 'E.g. Accredited facility, or Coming soon' },
    { k: 'logo', l: 'Logo', t: 'image' },
    { k: 'order', l: 'Display order', t: 'number', h: 'Smaller numbers appear first.' },
    { k: 'published', l: 'Show on the website', t: 'check' }
  ],
  gallery: [
    { k: 'image', l: 'Photo', t: 'image', req: 1 }, { k: 'caption', l: 'Caption', t: 'text' },
    { k: 'category', l: 'Album / category', t: 'text', h: 'E.g. Maternity, Events, Facility' }, { k: 'published', l: 'Published', t: 'check' }
  ],
  catalog: [
    { k: 'name', l: 'Item name', t: 'text', req: 1 }, { k: 'price', l: 'Price', t: 'text', h: 'E.g. KES 1,500' },
    { k: 'category', l: 'Category', t: 'text', h: 'E.g. Maternity kits, Baby care, Health packages' },
    { k: 'description', l: 'Description', t: 'textarea' }, { k: 'image', l: 'Photo', t: 'image' },
    { k: 'available', l: 'Available (shown on the website)', t: 'check' }
  ]
};
const CRUD = {
  services: { label: 'Services', one: 'service', ic: x => x.icon || '✚', title: x => x.title, sub: x => CATS[x.category] + (x.published ? '' : ' · Draft'), def: { published: true, category: 'general', order: 20, icon: '✚' } },
  blogs: { label: 'Blog posts', one: 'post', title: x => x.title, sub: x => new Date(x.created).toLocaleDateString() + (x.published ? '' : ' · Draft'), img: 1, def: { published: true } },
  events: { label: 'Events', one: 'event', ic: () => '🎉', title: x => x.title, sub: x => `${x.date} · ${x.type || 'Event'}${x.published ? '' : ' · Draft'}`, def: { published: true, capacity: 50, type: 'Baby shower' } },
  vouchers: { label: 'Vouchers', one: 'voucher', ic: () => '🎟️', title: x => x.title, sub: x => `${x.discountLabel} · ${x.slots > 0 ? x.claimed + ' of ' + x.slots + ' slots claimed' : x.claimed + ' claimed'} · ${x.state === 'upcoming' ? 'Opens ' + x.opensAt : x.state === 'full' ? 'Full' : 'Open'}${x.expires ? ' · until ' + x.expires : ''}${x.active ? '' : ' · Inactive'}`, def: { active: true, currency: 'KES', discountType: 'percent', discountValue: 10, slots: 20, price: 0 } },
  insurers: { label: 'Insurance partners', one: 'insurer', ic: x => x.status === 'coming' ? '⏳' : '✅', title: x => x.name, sub: x => (x.status === 'accredited' ? 'Accredited' : x.status === 'accepted' ? 'Accepted' : 'Coming soon') + (x.published ? '' : ' · Hidden'), img: 1, def: { published: true, status: 'coming', order: 10 } },
  gallery: { label: 'Gallery', one: 'photo', title: x => x.caption || 'Untitled photo', sub: x => (x.category || 'No album') + (x.published ? '' : ' · Hidden'), img: 1, def: { published: true } },
  catalog: { label: 'WhatsApp catalog', one: 'item', title: x => x.name, sub: x => (x.price || 'No price') + (x.available ? '' : ' · Hidden'), img: 1, def: { available: true } }
};
const SETTINGS = {
  site: {
    label: 'Site & contact', fields: [
      { k: 'name', l: 'Hospital name', t: 'text' }, { k: 'tagline', l: 'Tagline', t: 'text' }, { k: 'motto', l: 'Motto', t: 'text', h: 'Shown on the home page, footer, tickets and vouchers.' }, { k: 'level', l: 'Facility level label', t: 'text' },
      { k: 'phone', l: 'Main phone', t: 'text' }, { k: 'whatsapp', l: 'WhatsApp number', t: 'text', h: 'Used for every “Chat on WhatsApp” button. You can type 0711854476, it is saved as 254711854476.' },
      { k: 'email', l: 'Email', t: 'text' }, { k: 'address', l: 'Address', t: 'textarea' }, { k: 'hours', l: 'Opening hours', t: 'textarea', h: 'One line per row.' },
      { k: 'facebook', l: 'Facebook page link', t: 'text', h: 'Paste the full link to your page. Leave empty to hide the icon.' },
      { k: 'instagram', l: 'Instagram link', t: 'text', h: 'Paste your profile link.' },
      { k: 'tiktok', l: 'TikTok link', t: 'text', h: 'Paste your profile link.' },
      { k: 'logo', l: 'Logo (leave empty to use the default)', t: 'image' },
      { k: 'heroTitle', l: 'Home page headline', t: 'text' }, { k: 'heroText', l: 'Home page intro', t: 'textarea' }, { k: 'aboutText', l: 'About text (shown above services)', t: 'textarea' }
    ]
  },
  maternity: {
    label: 'Maternity page', fields: [
      { k: 'maternityTitle', l: 'Heading', t: 'text' }, { k: 'maternityText', l: 'Introduction', t: 'textarea' },
      { k: 'maternityHighlights', l: 'Highlights', t: 'lines', h: 'One per line. Shown on the home and maternity pages.' }
    ]
  },
  clinic: {
    label: 'Baby clinic', fields: [
      { k: 'clinicTitle', l: 'Clinic name', t: 'text' }, { k: 'clinicDay', l: 'Day', t: 'text' }, { k: 'clinicTime', l: 'Time', t: 'text' },
      { k: 'clinicText', l: 'Description', t: 'textarea' }, { k: 'clinicCovers', l: 'What the clinic covers', t: 'lines', h: 'One per line.' }, { k: 'clinicFee', l: 'Fees note', t: 'text' }
    ]
  },
  ambulance: {
    label: 'Ambulance', fields: [
      { k: 'ambulanceTitle', l: 'Heading', t: 'text' }, { k: 'ambulancePhone', l: 'Ambulance phone', t: 'text' },
      { k: 'ambulanceText', l: 'Description', t: 'textarea' }, { k: 'ambulanceFeatures', l: 'What the service includes', t: 'lines', h: 'One per line.' }
    ]
  },
  catalogpage: {
    label: 'Catalog page', fields: [
      { k: 'catalogTitle', l: 'Heading', t: 'text' }, { k: 'catalogText', l: 'Introduction', t: 'textarea' },
      { k: 'catalogUrl', l: 'Link to your WhatsApp Business catalog', t: 'text', h: 'In WhatsApp Business: Catalog → Share → Copy link. Optional.' }
    ]
  }
};
SETTINGS.rights = {
  label: 'Patients’ rights', fields: [
    { k: 'rightsIntro', l: 'Introduction line', t: 'text' },
    { k: 'patientRights', l: 'The rights', t: 'lines', h: 'One right per line, in order. They are numbered automatically on the public Patients’ Rights page.' }
  ]
};
const stepsToText = a => (a || []).map(s => s.title + (s.text ? ' | ' + s.text : '')).join('\n');
const textToSteps = t => t.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf('|'); return i < 0 ? { title: l, text: '' } : { title: l.slice(0, i).trim(), text: l.slice(i + 1).trim() }; });

/* ---------- generic form ---------- */
function fieldHtml(f, v) {
  const id = 'f_' + f.k, label = `${esc(f.l)}${f.h ? `<span class="hint">${esc(f.h)}</span>` : ''}`;
  switch (f.t) {
    case 'textarea': return `<label class="lbl">${label}<textarea name="${f.k}" ${f.big ? 'style="min-height:300px"' : ''}>${esc(v)}</textarea></label>`;
    case 'lines': return `<label class="lbl">${label}<textarea name="${f.k}" style="min-height:140px">${esc((v || []).join('\n'))}</textarea></label>`;
    case 'steps': return `<label class="lbl">${label}<textarea name="${f.k}" style="min-height:170px" placeholder="Book your first visit | Book online or on WhatsApp">${esc(stepsToText(v))}</textarea></label>`;
    case 'check': return `<label class="chk"><input type="checkbox" name="${f.k}" ${v ? 'checked' : ''}> ${esc(f.l)}</label>`;
    case 'select': return `<label class="lbl">${label}<select name="${f.k}">${Object.entries(f.o).map(([a, b]) => `<option value="${a}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`;
    case 'image': return `<div class="lbl">${label}<div class="imgf" data-img="${f.k}">${v ? `<img src="${esc(v)}" alt="">` : '<img alt="" style="display:none">'}<input type="hidden" name="${f.k}" value="${esc(v)}"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif"><button type="button" class="btn ghost tiny" data-clear>Remove</button></div></div>`;
    default: return `<label class="lbl">${label}<input id="${id}" name="${f.k}" type="${f.t === 'number' ? 'number' : f.t === 'date' ? 'date' : f.t === 'password' ? 'password' : 'text'}" value="${esc(v)}" ${f.req ? 'required' : ''}></label>`;
  }
}
function readForm(form, fields) {
  const o = {};
  for (const f of fields) {
    const el = form.elements[f.k];
    o[f.k] = f.t === 'check' ? el.checked : f.t === 'steps' ? textToSteps(el.value) : f.t === 'number' ? Number(el.value) || 0 : el.value;
  }
  return o;
}
async function uploadFile(file) {
  const fd = new FormData(); fd.append('file', file);
  return (await api('/api/admin/upload', 'POST', fd)).url;
}
document.addEventListener('change', guard(async e => {
  const inp = e.target;
  if (inp.type !== 'file' || !inp.closest('[data-img]') || !inp.files[0]) return;
  const box = inp.closest('[data-img]');
  const url = await uploadFile(inp.files[0]);
  box.querySelector('input[type=hidden]').value = url;
  const im = box.querySelector('img'); im.src = url; im.style.display = '';
  toast('Photo uploaded');
}));
document.addEventListener('click', e => {
  const b = e.target.closest('[data-clear]'); if (!b) return;
  const box = b.closest('[data-img]'); box.querySelector('input[type=hidden]').value = ''; box.querySelector('img').style.display = 'none';
});

/* ---------- layout ---------- */
const NAVS = [
  ['dashboard', 'Dashboard'], ['reports', 'Reports'],
  ['h', 'Requests'], ['chats', 'Live chat'], ['bookings', 'Bookings'], ['inquiries', 'Inquiries'], ['feedback', 'Customer feedback'], ['registrations', 'Event registrations'], ['claims', 'Voucher claims'],
  ['h', 'Content'], ['services', 'Services'], ['blogs', 'Blog posts'], ['events', 'Events'], ['vouchers', 'Vouchers'], ['insurers', 'Insurance partners'], ['gallery', 'Gallery'], ['catalog', 'WhatsApp catalog'],
  ['h', 'Pages & settings'], ['site', 'Site & contact'], ['maternity', 'Maternity page'], ['clinic', 'Baby clinic'], ['ambulance', 'Ambulance'], ['catalogpage', 'Catalog page'], ['rights', 'Patients’ rights'],
  ['h', 'Account'], ['users', 'Users & roles'], ['account', 'My password']
];
const ROLE_LABEL = { admin: 'Administrator', editor: 'Editor', reception: 'Reception' };
const REQUEST_PAGES = ['dashboard', 'chats', 'bookings', 'inquiries', 'feedback', 'registrations', 'claims', 'account'];
const allowed = id => ME.role === 'admin' || (ME.role === 'editor' ? id !== 'users' : REQUEST_PAGES.includes(id));
const BADGE = { chats: 'chats', bookings: 'bookings', inquiries: 'inquiries', feedback: 'feedback', registrations: 'registrations', claims: 'claims' };

function showLogin() {
  clearInterval(chatTimer);
  root.innerHTML = `<div class="login"><div class="box"><img src="/logo.svg" alt="Silent Hill Hospital"><h1>Admin sign in</h1>
    <form class="f" id="lf"><label class="lbl">Username<input name="user" autocomplete="username" required value="admin"></label>
    <label class="lbl">Password<input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn">Sign in</button><div id="le"></div></form></div></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    try { await api('/api/admin/login', 'POST', Object.fromEntries(new FormData(e.target))); start(); }
    catch (err) { $('#le').innerHTML = `<div class="msg err">${esc(err.message)}</div>`; }
  };
}

async function refreshStats() { STATS = await api('/api/admin/stats'); document.querySelectorAll('[data-badge]').forEach(n => { const c = STATS[n.dataset.badge] || 0; n.textContent = c; n.classList.toggle('zero', !c); }); }

function frame() {
  root.innerHTML = `<div class="mbar"><b>Silent Hill Admin</b><button id="mb" aria-label="Menu">☰</button></div>
  <div class="layout"><aside class="side" id="side"><div class="logo"><img src="${esc(SET.logo || '/logo.svg')}" alt=""></div>
    ${NAVS.map(([id, l], i) => { if (id === 'h') { const nx = NAVS.slice(i + 1).find(([n]) => n !== 'h'); return nx && allowed(nx[0]) ? `<h6>${l}</h6>` : ''; } return allowed(id) ? `<button class="nv" data-go="${id}">${l}${BADGE[id] ? `<span class="n zero" data-badge="${BADGE[id]}">0</span>` : ''}</button>` : ''; }).join('')}
    <h6>Signed in</h6><div style="padding:0 12px 8px;color:#ffe3e7;font-size:.9rem"><b>${esc(ME.name)}</b><br>${esc(ROLE_LABEL[ME.role])}</div><button class="nv" id="lo">Sign out</button></aside>
    <main class="main" id="main"></main></div>`;
  $('#mb').onclick = () => $('#side').classList.toggle('open');
  $('#lo').onclick = async () => { await api('/api/admin/logout', 'POST'); showLogin(); };
  $('#side').onclick = e => { const b = e.target.closest('[data-go]'); if (b) { go(b.dataset.go); $('#side').classList.remove('open'); } };
}

const go = guard(async id => {
  if (!allowed(id)) id = 'dashboard';
  clearInterval(chatTimer);
  current = id;
  document.querySelectorAll('[data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === id));
  const m = $('#main');
  m.innerHTML = '<p class="hint">Loading…</p>';
  await refreshStats();
  if (id === 'dashboard') return dashboard(m);
  if (CRUD[id]) return crudList(m, id);
  if (SETTINGS[id]) return settingsForm(m, id);
  if (INBOX[id]) return inbox(m, id);
  if (id === 'reports') return reportsPage(m);
  if (id === 'chats') return chatPage(m);
  if (id === 'users') return usersPage(m);
  if (id === 'account') return account(m);
  window.scrollTo(0, 0);
});

/* ---------- dashboard ---------- */
function dashboard(m) {
  const T = [...(allowed('reports') ? [['visitsToday', 'Page views today', 'reports']] : []), ['chats', 'Unread chats', 'chats'], ['bookings', 'Pending bookings', 'bookings'], ['inquiries', 'New inquiries', 'inquiries'], ['feedback', 'Feedback to review', 'feedback'], ['registrations', 'Event registrations', 'registrations'], ['claims', 'Vouchers issued', 'claims']];
  m.innerHTML = `<div class="top"><h1>Welcome, ${esc(ME.name.split(' ')[0])} 👋</h1><div class="acts"><a class="btn ghost small" href="/" target="_blank">View website ↗</a></div></div>
  <div class="stats">${T.map(([k, l, g]) => `<button class="stat" data-goto="${g}"><b>${STATS[k] || 0}</b><span>${l}</span></button>`).join('')}</div>
  <div class="box2"><h3>Quick actions</h3><div class="acts" style="display:flex;gap:10px;flex-wrap:wrap">
    ${[['blogs', '✍️ Write a blog post'], ['events', '🎉 Add an event'], ['gallery', '🖼️ Add photos'], ['vouchers', '🎟️ Create a voucher'], ['services', '🩺 Edit services'], ['clinic', '👶 Edit baby clinic'], ['catalog', '💬 Edit WhatsApp catalog']].filter(([g]) => allowed(g)).map(([g, l]) => `<button class="btn ghost small" data-goto="${g}">${l}</button>`).join('') || '<span class="hint">Use the Requests menu to manage bookings, questions and feedback.</span>'}</div></div>
  <div class="box2"><h3>Tips</h3><p class="hint" style="font-size:.95rem">Set your real phone, WhatsApp number and address under <b>Site & contact</b>. Everything on the public website can be changed from this panel.</p></div>`;
  m.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => go(b.dataset.goto));
}

/* ---------- CRUD lists ---------- */
const crudList = guard(async (m, id) => {
  const c = CRUD[id], rows = await api('/api/admin/' + id);
  m.innerHTML = `<div class="top"><h1>${c.label}</h1><div class="acts">
    ${id === 'gallery' ? '<label class="btn ghost small" style="cursor:pointer">📷 Upload photos<input type="file" id="multi" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden></label>' : ''}
    ${id === 'insurers' ? '<button class="btn ghost small" id="bulk">Add several at once</button>' : ''}<button class="btn small" id="add">+ Add ${c.one}</button></div></div>
    <div class="rows">${rows.length ? rows.map(r => `<div class="item"><div class="t">${c.img && (r.image || r.logo) ? `<img src="${esc(r.image || r.logo)}" alt="" style="object-fit:contain;background:#fff">` : c.ic ? `<span class="ic">${esc(c.ic(r))}</span>` : ''}<div><b>${esc(c.title(r))}</b><small>${esc(c.sub(r))}</small></div></div>
      <div class="b">${id === 'insurers' ? `<label class="chk" title="Tick when we accept this insurance"><input type="checkbox" data-accept="${r.id}" ${r.status !== 'coming' ? 'checked' : ''}> Accepted</label>` : ''}<button class="btn ghost tiny" data-edit="${r.id}">Edit</button><button class="btn danger tiny" data-del="${r.id}">Delete</button></div></div>`).join('') : '<div class="empty">Nothing here yet. Click “Add” to create the first one.</div>'}</div>`;
  $('#add').onclick = () => crudEdit(m, id, { ...c.def });
  m.onclick = guard(async e => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (ed) crudEdit(m, id, rows.find(r => r.id === ed.dataset.edit));
    if (del && confirm('Delete this ' + c.one + '? This cannot be undone.')) { await api(`/api/admin/${id}/${del.dataset.del}`, 'DELETE'); toast('Deleted'); crudList(m, id); }
  });
  if (id === 'insurers') {
    m.onchange = guard(async e => {
      const cb = e.target.closest('[data-accept]'); if (!cb) return;
      const row = rows.find(r => r.id === cb.dataset.accept);
      await api('/api/admin/insurers/' + row.id, 'PUT', { status: cb.checked ? (row.status === 'accredited' ? 'accredited' : 'accepted') : 'coming' });
      toast(cb.checked ? row.name + ' is now accepted' : row.name + ' moved to Coming soon'); crudList(m, id);
    });
    $('#bulk').onclick = () => {
      if ($('#bulkbox')) return;
      m.querySelector('.rows').insertAdjacentHTML('beforebegin', '<form class="box2 fgrid" id="bulkbox"><label class="lbl">Insurance names<span class="hint">One per line. They are added as “Coming soon”. Use Edit to upload each logo, and tick “Accepted” when we start accepting it.</span><textarea name="names" style="min-height:140px" required></textarea></label><div><button class="btn">Add</button></div></form>');
      $('#bulkbox').onsubmit = guard(async e => {
        e.preventDefault();
        const names = e.target.names.value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 40);
        for (const [i, n] of names.entries()) await api('/api/admin/insurers', 'POST', { name: n, status: 'coming', note: 'Coming soon', order: 20 + i, published: true });
        toast(names.length + ' added'); crudList(m, id);
      });
    };
  }
  const multi = $('#multi');
  if (multi) multi.onchange = guard(async () => {
    for (const f of multi.files) await api('/api/admin/gallery', 'POST', { image: await uploadFile(f), published: true, caption: '' });
    toast('Photos added. Click Edit to add captions.'); crudList(m, id);
  });
});
function crudEdit(m, id, row) {
  const c = CRUD[id], fields = FIELDS[id], isNew = !row.id;
  m.innerHTML = `<div class="top"><h1>${isNew ? 'Add' : 'Edit'} ${c.one}</h1><button class="btn ghost small" id="back">← Back</button></div>
    <form class="box2 fgrid" id="ef">${fields.map(f => fieldHtml(f, row[f.k])).join('')}<div style="display:flex;gap:10px"><button class="btn">Save</button><button type="button" class="btn ghost" id="cancel">Cancel</button></div></form>`;
  const back = () => crudList(m, id);
  $('#back').onclick = $('#cancel').onclick = back;
  $('#ef').onsubmit = guard(async e => {
    e.preventDefault();
    const data = readForm(e.target, fields);
    await api(isNew ? '/api/admin/' + id : `/api/admin/${id}/${row.id}`, isNew ? 'POST' : 'PUT', data);
    toast('Saved'); back();
  });
}

/* ---------- settings ---------- */
function settingsForm(m, id) {
  const s = SETTINGS[id];
  m.innerHTML = `<div class="top"><h1>${s.label}</h1><a class="btn ghost small" href="/" target="_blank">Preview site ↗</a></div>
    <form class="box2 fgrid" id="sf">${s.fields.map(f => fieldHtml(f, SET[f.k])).join('')}<div><button class="btn">Save changes</button></div></form>`;
  $('#sf').onsubmit = guard(async e => {
    e.preventDefault();
    SET = await api('/api/admin/settings', 'PUT', readForm(e.target, s.fields));
    toast('Saved. Refresh the website to see it.');
  });
}

/* ---------- inbox ---------- */
const waLink = (phone, msg) => {
  let d = String(phone || '').replace(/\D/g, '');
  const cc = String(SET.whatsapp || '').replace(/\D/g, '').slice(0, -9);
  if (d.startsWith('0') && cc) d = cc + d.slice(1);
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(msg)}` : '';
};
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const INBOX = {
  bookings: {
    label: 'Bookings', statuses: ['pending', 'confirmed', 'completed', 'cancelled'], title: x => x.name,
    print: x => x.ref && `/ticket.html?ref=${x.ref}&print=1`, printLabel: 'Print ticket',
    rows: x => [['Ticket ref', x.ref], ['Phone', x.phone], ['Email', x.email], ['Service', x.service], ['When', `${x.date} ${x.time || ''}`], ['Notes', x.notes], ['Note to self', x.adminNote]],
    wa: x => waLink(x.phone, `Hello ${x.name}, this is ${SET.name}. About your booking for ${x.service} on ${x.date}: `), note: 'adminNote'
  },
  inquiries: {
    label: 'Inquiries', statuses: ['new', 'answered'], title: x => x.name,
    rows: x => [['Phone', x.phone], ['Email', x.email], ['Question', x.message], ['Our reply', x.reply]],
    wa: x => waLink(x.phone, `Hello ${x.name}, this is ${SET.name}. Thank you for your question. ${x.reply || ''}`), reply: true
  },
  feedback: {
    label: 'Customer feedback', statuses: null, title: x => `${x.name}  ${stars(x.rating)}`, rows: x => [['Feedback', x.message]], approve: true
  },
  registrations: {
    label: 'Event registrations', statuses: ['registered', 'attended', 'cancelled'], title: x => x.name,
    rows: x => [['Event', x.eventTitle], ['Phone', x.phone], ['Email', x.email], ['Guests', x.guests], ['Notes', x.notes]], wa: x => waLink(x.phone, `Hello ${x.name}, this is ${SET.name} about ${x.eventTitle}: `)
  },
  claims: {
    label: 'Voucher claims', statuses: ['issued', 'redeemed'], title: x => `${x.name}  ·  ${x.code}`,
    print: x => `/api/voucher-pdf/${x.code}`, printLabel: 'Download voucher PDF',
    rows: x => [['Voucher', x.voucherTitle], ['Discount', x.discountLabel || x.amount || x.value], ['Price', Number(x.price) > 0 ? `${x.currency || 'KES'} ${Number(x.price).toLocaleString()} → ${x.currency || 'KES'} ${Number(x.finalPrice).toLocaleString()}` : ''], ['Valid', [x.opensAt && 'from ' + x.opensAt, x.expires && 'until ' + x.expires].filter(Boolean).join(' ')], ['Code', x.code], ['Phone', x.phone], ['Due date', x.edd]], wa: x => waLink(x.phone, `Hello ${x.name}, this is ${SET.name}. About your voucher ${x.code}: `)
  }
};
const inbox = guard(async (m, id, filter = '') => {
  const c = INBOX[id];
  let rows = await api('/api/admin/' + id);
  const status = x => c.approve ? (x.approved ? 'approved' : 'hidden') : x.status;
  const opts = c.statuses || ['approved', 'hidden'];
  const view = rows.filter(r => !filter || status(r) === filter);
  m.innerHTML = `<div class="top"><h1>${c.label}</h1><select id="flt" style="width:auto"><option value="">All (${rows.length})</option>${opts.map(s => `<option value="${s}" ${s === filter ? 'selected' : ''}>${s} (${rows.filter(r => status(r) === s).length})</option>`).join('')}</select></div>
    <div class="rows inbox">${view.length ? view.map(r => {
      const link = c.wa && c.wa(r);
      return `<div class="card" data-id="${r.id}"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(c.title(r))}</b><span><span class="badge ${status(r)}">${status(r)}</span> <small class="hint">${new Date(r.created).toLocaleString()}</small></span></div>
      <dl class="kv">${c.rows(r).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${c.reply ? `<label class="lbl" style="margin-top:8px">Your reply <span class="hint">Type it, save, then send it via WhatsApp or email below.</span><textarea data-reply>${esc(r.reply)}</textarea></label>` : ''}
      ${c.note ? `<label class="lbl" style="margin-top:8px">Private note<input data-note value="${esc(r.adminNote || '')}"></label>` : ''}
      <div class="actions">
        ${c.statuses ? `<select data-status>${c.statuses.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select>` : ''}
        ${c.approve ? `<button class="btn tiny" data-approve="${r.approved ? 0 : 1}">${r.approved ? 'Hide from website' : 'Publish on website'}</button>` : ''}
        ${c.reply || c.note ? '<button class="btn tiny" data-save>Save</button>' : ''}
        ${c.print && c.print(r) ? `<a class="btn tiny" target="_blank" rel="noopener" href="${esc(c.print(r))}">🖨 ${c.printLabel}</a>` : ''}
        ${link ? `<a class="btn wa tiny" target="_blank" rel="noopener" href="${esc(link)}">WhatsApp</a>` : ''}
        ${r.phone ? `<a class="btn ghost tiny" href="tel:${esc(r.phone)}">Call</a>` : ''}
        ${r.email ? `<a class="btn ghost tiny" href="mailto:${esc(r.email)}${c.reply ? '?subject=' + encodeURIComponent('Re: your question to ' + SET.name) + '&body=' + encodeURIComponent(r.reply || '') : ''}">Email</a>` : ''}
        <button class="btn danger tiny" data-del>Delete</button></div></div>`;
    }).join('') : '<div class="empty">Nothing here yet.</div>'}</div>`;
  $('#flt').onchange = e => inbox(m, id, e.target.value);
  const put = (rid, body) => api(`/api/admin/${id}/${rid}`, 'PUT', body);
  const rerender = () => inbox(m, id, filter);
  m.querySelector('.inbox').onclick = guard(async e => {
    const card = e.target.closest('.card'); if (!card) return; const rid = card.dataset.id;
    if (e.target.closest('[data-del]')) { if (confirm('Delete this entry permanently?')) { await api(`/api/admin/${id}/${rid}`, 'DELETE'); toast('Deleted'); rerender(); } }
    else if (e.target.closest('[data-approve]')) { await put(rid, { approved: e.target.closest('[data-approve]').dataset.approve === '1' }); rerender(); }
    else if (e.target.closest('[data-save]')) {
      const body = {}; const rp = card.querySelector('[data-reply]'), nt = card.querySelector('[data-note]');
      if (rp) body.reply = rp.value; if (nt) body.adminNote = nt.value;
      await put(rid, body); toast('Saved'); rerender();
    }
  });
  m.querySelector('.inbox').onchange = guard(async e => {
    if (e.target.matches('[data-status]')) { await put(e.target.closest('.card').dataset.id, { status: e.target.value }); toast('Status updated'); refreshStats(); rerender(); }
  });
});

/* ---------- account ---------- */
function account(m) {
  m.innerHTML = `<div class="top"><h1>My password</h1></div>
    <form class="box2 fgrid" id="pf"><p class="hint" style="font-size:.95rem">Signed in as <b>${esc(ME.name)}</b> (${esc(ME.username)}), ${esc(ROLE_LABEL[ME.role])}</p>
    <label class="lbl">Current password<input name="current" type="password" autocomplete="current-password" required></label>
    <label class="lbl">New password <span class="hint">At least 6 characters, no upper limit.</span><input name="next" type="password" autocomplete="new-password" minlength="6" required></label>
    <div><button class="btn">Change password</button></div></form>`;
  $('#pf').onsubmit = guard(async e => { e.preventDefault(); await api('/api/admin/password', 'POST', Object.fromEntries(new FormData(e.target))); e.target.reset(); toast('Password changed'); });
}

/* ---------- reports: visits, bookings, inquiries ---------- */
const reportsPage = guard(async (m, days = 30) => {
  const r = await api('/api/admin/reports?days=' + days), t = r.totals;
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
  const card = (n, l, sub = '') => `<div class="stat" style="cursor:default"><b>${n}</b><span>${l}</span>${sub ? `<small class="hint" style="display:block">${sub}</small>` : ''}</div>`;
  const chart = (key, label, color) => {
    const total = r.series.reduce((a, x) => a + x[key], 0), max = Math.max(1, ...r.series.map(x => x[key]));
    return `<div class="box2"><div class="ch-h"><b>${label}</b><span class="hint">total ${total}</span></div>
      <div class="bars">${r.series.map(x => `<i style="height:${Math.round(x[key] / max * 100)}%;background:${color}" title="${x.date}: ${x[key]}"></i>`).join('')}</div>
      <div class="axis"><span>${r.series[0].date}</span><span>${r.series[r.series.length - 1].date}</span></div></div>`;
  };
  const table = (title, rows, label = 'Count') => `<div class="box2"><h3 style="font-size:1.05rem">${title}</h3>${rows.length ? `<table class="rt"><tbody>${rows.map(x => `<tr><td>${esc(x.name)}</td><td>${x.count}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">No data in this period yet.</p>'}</div>`;
  m.innerHTML = `<div class="top"><h1>Reports</h1><div class="acts">${[7, 30, 90, 365].map(d => `<button class="chip ${d === days ? 'on' : ''}" data-days="${d}">${d === 365 ? '1 year' : 'Last ' + d + ' days'}</button>`).join('')}</div></div>
    <div class="stats">
      ${card(t.views, 'Page views', 'visits to the public site')}
      ${card(t.visitors, 'Daily unique visitors', 'summed per day; no cookies or IPs stored')}
      ${card(t.bookings, 'Bookings', t.visitors ? pct(t.bookings, t.visitors) + ' of visitors' : '')}
      ${card(t.inquiries, 'Inquiries', t.inquiries ? pct(t.answered, t.inquiries) + ' answered' : '')}
      ${card(t.avgRating ?? '–', 'Average rating', t.feedback + ' review' + (t.feedback === 1 ? '' : 's'))}
      ${card(t.claims + ' / ' + t.registrations, 'Vouchers claimed / event sign-ups')}
    </div>
    ${r.allTime.firstVisitDay ? `<p class="hint">Visit counting started on ${r.allTime.firstVisitDay}. Visitors with “Do Not Track” switched on, and search-engine robots, are not counted.</p>` : '<p class="hint">Visit counting has just started, so numbers will build up from today.</p>'}
    <div class="grid g2">${chart('views', 'Page views per day', '#c8102e')}${chart('bookings', 'Bookings per day', '#1d7a4a')}${chart('inquiries', 'Inquiries per day', '#c48a00')}${chart('visitors', 'Unique visitors per day', '#6f0819')}</div>
    <div class="grid g2">${table('Most viewed pages', r.topPages)}${table('Bookings by service', r.bookingsByService)}${table('Bookings by status', r.bookingsByStatus)}${table('Inquiries by status', r.inquiriesByStatus)}</div>
    <div class="box2"><h3 style="font-size:1.05rem">Download reports (CSV, opens in Excel)</h3><div class="acts" style="display:flex;gap:10px;flex-wrap:wrap">
      ${['bookings', 'inquiries', 'feedback', 'registrations', 'claims'].map(c => `<a class="btn ghost small" href="/api/admin/export/${c}?days=${days}">⬇ ${c[0].toUpperCase() + c.slice(1)}</a>`).join('')}</div>
      <p class="hint">Each file covers the selected period and contains patient details, so keep it private.</p></div>`;
  m.querySelector('.acts').onclick = e => { const b = e.target.closest('[data-days]'); if (b) reportsPage(m, Number(b.dataset.days)); };
});

/* ---------- live chat ---------- */
let chatTimer = null;
const chatPage = guard(async m => {
  let chats = [], sel = null, shown = -1;
  m.innerHTML = `<div class="top"><h1>Live chat</h1><span class="hint">Refreshes automatically. Visitors see your replies within a few seconds.</span></div>
    <div class="chatwrap"><div class="clist" id="cl"></div><div class="cthread" id="ct"><div class="empty">Select a conversation</div></div></div>`;
  const bubbles = c => c.messages.map(x => `<div class="cb ${x.from}"><span>${esc(x.text)}</span><small>${x.from === 'staff' && x.by ? esc(x.by) + ' · ' : ''}${new Date(x.at).toLocaleString()}</small></div>`).join('');
  const drawList = () => {
    $('#cl').innerHTML = chats.length ? chats.map(c => { const last = c.messages[c.messages.length - 1]; return `<button class="ci ${c.id === sel ? 'on' : ''}" data-c="${c.id}"><b>${esc(c.name)}</b>${c.unread ? `<span class="n">${c.unread}</span>` : ''}<small>${esc(last ? last.text.slice(0, 60) : '')}</small><small>${new Date(c.updated).toLocaleString()}${c.status === 'closed' ? ' · closed' : ''}</small></button>`; }).join('') : '<div class="empty">No chats yet. When a visitor uses “Live chat” on the website, it appears here.</div>';
  };
  const frame = c => {
    $('#ct').innerHTML = `<div class="chead"><b>${esc(c.name)}</b><span class="b"><button class="btn ghost tiny" data-close>${c.status === 'closed' ? 'Reopen' : 'Mark as done'}</button>${ME.role === 'reception' ? '' : '<button class="btn danger tiny" data-delete>Delete</button>'}</span></div>
      <div class="msgs" id="cm"></div>
      <form class="cform" id="cf"><textarea name="text" placeholder="Type your reply…" maxlength="1000" required></textarea><button class="btn">Send</button></form>`;
    shown = -1; drawThread();
    $('#cf').onsubmit = guard(async e => {
      e.preventDefault(); const t = e.target.text.value.trim(); if (!t) return;
      e.target.text.value = '';
      await api(`/api/admin/chats/${sel}/reply`, 'POST', { text: t }); load();
    });
    $('#cf').text.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#cf').requestSubmit(); } };
  };
  const drawThread = () => {
    const c = chats.find(x => x.id === sel); if (!c || c.messages.length === shown) return;
    const box = $('#cm'); if (!box) return;
    const stick = shown < 0 || box.scrollTop + box.clientHeight >= box.scrollHeight - 40;
    box.innerHTML = bubbles(c); shown = c.messages.length; if (stick) box.scrollTop = box.scrollHeight;
  };
  const load = guard(async () => {
    chats = await api('/api/admin/chats');
    const c = chats.find(x => x.id === sel);
    if (c && c.unread && document.hasFocus()) { await api('/api/admin/chats/' + sel, 'PUT', { read: true }); c.unread = 0; }
    drawList(); if (c) drawThread(); refreshStats();
  });
  $('#cl').onclick = guard(async e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    sel = b.dataset.c; await api('/api/admin/chats/' + sel, 'PUT', { read: true });
    await load(); frame(chats.find(x => x.id === sel)); drawList();
  });
  $('#ct').onclick = guard(async e => {
    if (e.target.closest('[data-close]')) { const c = chats.find(x => x.id === sel); await api('/api/admin/chats/' + sel, 'PUT', { status: c.status === 'closed' ? 'open' : 'closed' }); load(); }
    if (e.target.closest('[data-delete]') && confirm('Delete this conversation permanently?')) { await api('/api/admin/chats/' + sel, 'DELETE'); sel = null; $('#ct').innerHTML = '<div class="empty">Select a conversation</div>'; load(); }
  });
  await load();
  chatTimer = setInterval(load, 5000);
});

/* ---------- users ---------- */
const USER_FIELDS = isNew => [
  { k: 'name', l: 'Full name', t: 'text', req: 1 },
  ...(isNew ? [{ k: 'username', l: 'Username', t: 'text', req: 1, h: 'Used to sign in. Lowercase letters, numbers, dots, dashes.' }] : []),
  { k: 'role', l: 'Role', t: 'select', o: { reception: 'Reception: bookings, questions, feedback, registrations, vouchers (cannot delete)', editor: 'Editor: reception access plus website content, deleting and settings', admin: 'Administrator: everything, including users' } },
  { k: 'password', l: isNew ? 'Password' : 'New password', t: 'password', req: isNew, h: isNew ? 'At least 6 characters.' : 'Leave empty to keep the current password.' },
  ...(isNew ? [] : [{ k: 'active', l: 'Account is active (can sign in)', t: 'check' }])
];
const usersPage = guard(async m => {
  const rows = await api('/api/admin/users');
  m.innerHTML = `<div class="top"><h1>Users & roles</h1><button class="btn small" id="add">+ Add user</button></div>
    <div class="rows">${rows.map(u => `<div class="item"><div class="t"><span class="ic">${u.role === 'admin' ? '🛡️' : u.role === 'editor' ? '✏️' : '🛎️'}</span><div><b>${esc(u.name)}${u.id === ME.id ? ' (you)' : ''}</b><small>${esc(u.username)} · ${esc(ROLE_LABEL[u.role])}${u.active ? '' : ' · Deactivated'}${u.lastLogin ? ' · last sign-in ' + new Date(u.lastLogin).toLocaleString() : ''}</small></div></div>
      <div class="b"><button class="btn ghost tiny" data-edit="${u.id}">Edit</button>${u.id === ME.id ? '' : `<button class="btn danger tiny" data-del="${u.id}">Delete</button>`}</div></div>`).join('')}</div>`;
  const form = u => {
    const isNew = !u.id, fields = USER_FIELDS(isNew);
    m.innerHTML = `<div class="top"><h1>${isNew ? 'Add user' : 'Edit ' + esc(u.name)}</h1><button class="btn ghost small" id="back">← Back</button></div>
      <form class="box2 fgrid" id="uf" autocomplete="off">${fields.map(f => fieldHtml(f, f.k === 'password' ? '' : u[f.k])).join('')}<div style="display:flex;gap:10px"><button class="btn">Save</button><button type="button" class="btn ghost" id="cancel">Cancel</button></div></form>`;
    $('#back').onclick = $('#cancel').onclick = () => usersPage(m);
    $('#uf').onsubmit = guard(async e => {
      e.preventDefault();
      const d = {};
      for (const f of fields) d[f.k] = f.t === 'check' ? e.target.elements[f.k].checked : e.target.elements[f.k].value;
      if (!isNew && !d.password) delete d.password;
      await api(isNew ? '/api/admin/users' : '/api/admin/users/' + u.id, isNew ? 'POST' : 'PUT', d);
      toast('Saved'); usersPage(m);
    });
  };
  $('#add').onclick = () => form({ role: 'reception' });
  m.onclick = guard(async e => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (ed) form(rows.find(r => r.id === ed.dataset.edit));
    if (del && confirm('Delete this user? They will no longer be able to sign in.')) { await api('/api/admin/users/' + del.dataset.del, 'DELETE'); toast('User deleted'); usersPage(m); }
  });
});

/* ---------- start ---------- */
async function start() {
  try { ME = await api('/api/admin/me'); } catch { return; }
  SET = await fetch('/api/settings').then(r => r.json());
  frame();
  go('dashboard');
}
start().catch(() => {});
