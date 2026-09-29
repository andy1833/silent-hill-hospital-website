/* Silent Hill Hospital: public site (hash-routed single page) */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (u, o) => {
  const r = await fetch(u, o);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
  return d;
};
const post = (u, b) => api(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const paras = t => esc(t).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
const lines = t => esc(t).replace(/\n/g, '<br>');
const list = a => `<ul class="ticks">${(a || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
const fmtDate = d => d ? new Date(d + (d.length === 10 ? 'T00:00' : '')).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '';
const today = () => new Date().toISOString().slice(0, 10);
const CATS = { maternity: 'Maternity & Women’s Health', child: 'Child Health', general: 'General & Outpatient', diagnostics: 'Laboratory & Pharmacy', emergency: 'Emergency & Referral' };

let S = {};
const tel = n => 'tel:' + String(n || '').replace(/[^\d+]/g, '');
const wa = msg => `https://wa.me/${String(S.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg || 'Hello Silent Hill Hospital, I would like to ask about ')}`;
const ICONS = {
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-8h2.7l.5-3.2h-3.2V7.9c0-.9.4-1.6 1.7-1.6h1.6V3.5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H7.6V13h2.8v8h3.1z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 3c.3 2.4 1.7 3.9 4 4.1v3.1c-1.4.1-2.7-.3-4-1.1v6.1a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.2a2.5 2.5 0 1 0 1.6 2.3V3h3.1z"/></svg>'
};
const socials = (cls = '') => ['facebook', 'instagram', 'tiktok'].filter(k => S[k]).map(k => `<a class="soc ${cls}" href="${esc(S[k])}" target="_blank" rel="noopener" aria-label="${k[0].toUpperCase() + k.slice(1)}" title="${k[0].toUpperCase() + k.slice(1)}">${ICONS[k]}</a>`).join('');
const pic = (src, alt = '') => src ? `<img class="pic" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : `<div class="pic" role="img" aria-label="" style="display:grid;place-items:center;font-size:3rem;color:#e7a6b0">✚</div>`;

/* ---------- shell ---------- */
const NAV = [['#/', 'Home'], ['#/maternity', 'Maternity', 'hl'], ['#/services', 'Services'], ['#/clinic', 'Baby Clinic'], ['#/events', 'Events'], ['#/blog', 'Health Blog']];
const MORE = [['#/patient-rights', 'Patients’ Rights'], ['#/insurance', 'Insurance & SHA'], ['#/ambulance', 'Ambulance'], ['#/catalog', 'WhatsApp Catalog'], ['#/gallery', 'Gallery'], ['#/contact', 'Contact & Feedback']];

function shell() {
  document.title = `${S.name} | Maternity, Baby Clinic & ${S.level}`;
  $('#topbar').innerHTML = `<span>🚑 Ambulance: <a href="${tel(S.ambulancePhone)}">${esc(S.ambulancePhone)}</a><span class="sep">|</span>Call us: <a href="${tel(S.phone)}">${esc(S.phone)}</a></span><span>${accredited().length ? '<b class="sha-top">✓ SHA Accredited</b><span class="sep">|</span>' : ''}${esc(S.level)}</span>`;
  $('#nav').innerHTML = `
    <a class="brand" href="#/" aria-label="${esc(S.name)} home"><img src="${esc(S.logo || '/logo.svg')}" alt="${esc(S.name)}"></a>
    <button class="burger" data-act="menu" aria-label="Menu" aria-expanded="false">☰</button>
    <nav class="menu" id="menu" aria-label="Main">
      ${NAV.map(([h, l, c]) => `<a href="${h}" class="${c || ''}" data-nav>${l}</a>`).join('')}
      <details><summary>More ▾</summary><div class="drop">${MORE.map(([h, l]) => `<a href="${h}" data-nav>${l}</a>`).join('')}</div></details>
      <a class="btn book small" href="#/book" style="color:#fff">Book now</a>
    </nav>`;
  $('#fab').href = wa();
  $('#footer').innerHTML = `
    <div class="cols">
      <div><img src="${esc(S.logo || '/logo.svg')}" alt="${esc(S.name)}" style="height:56px;background:#fff;border-radius:12px;padding:6px 10px;margin-bottom:12px"><p><i>${esc(S.motto || S.tagline)}</i><br>${esc(S.level)}</p>${accredited().length ? '<a href="#/insurance" class="pill accredited" style="text-decoration:none">✓ SHA accredited</a>' : ''}</div>
      <div><h4>Explore</h4><ul>${[...NAV, ...MORE].slice(1).map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>
      <div><h4>Hours</h4><p>${lines(S.hours)}</p></div>
      <div><h4>Reach us</h4><ul>
        <li>📞 <a href="${tel(S.phone)}">${esc(S.phone)}</a></li>
        <li>🚑 <a href="${tel(S.ambulancePhone)}">${esc(S.ambulancePhone)}</a></li>
        <li>💬 <a href="${wa()}" target="_blank" rel="noopener">WhatsApp</a></li>
        <li>✉️ <a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li>
        <li>📍 ${lines(S.address)}</li>
      </ul>${socials() ? `<div class="soc-row">${socials()}</div>` : ''}</div>
    </div>
    <div class="fine"><span>© ${new Date().getFullYear()} ${esc(S.name)}. All rights reserved.</span><span>In an emergency call <a href="${tel(S.ambulancePhone)}">${esc(S.ambulancePhone)}</a></span></div>`;
}

/* ---------- reusable pieces ---------- */
const pageHead = (title, text, crumb) => `<div class="page-head"><div class="wrap">${crumb ? `<div class="crumb">${crumb}</div>` : ''}<h1>${esc(title)}</h1>${text ? `<p>${esc(text)}</p>` : ''}</div></div>`;
const secHead = (eyebrow, title, text) => `<div class="sec-head"><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}</div>`;
const empty = t => `<div class="empty">${t}</div>`;

const serviceCard = s => `<a class="card" href="#/service/${s.id}"><div class="ico">${esc(s.icon || '✚')}</div><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p><span class="more">Learn more →</span></a>`;
const journey = steps => `<ol class="journey">${steps.map(s => `<li><b>${esc(s.title)}</b><span>${esc(s.text)}</span></li>`).join('')}</ol>`;
const eventCard = e => {
  const d = new Date(e.date + 'T00:00');
  return `<div class="card event"><div class="date-badge"><b>${d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</b><span>${d.getDate()}</span></div>
    <div class="info"><span class="tag">${esc(e.type || 'Event')}</span><h3>${esc(e.title)}</h3>
    <div class="meta">${fmtDate(e.date)} · ${esc(e.time)}<br>📍 ${esc(e.venue)}</div><p>${esc(e.description)}</p>
    ${e.capacity ? `<div class="meta">${e.full ? 'Fully booked' : `${Math.max(0, e.capacity - e.registered)} places left`}</div>` : ''}
    <div><button class="btn small" data-act="register" data-id="${e.id}" ${e.full ? 'disabled' : ''}>${e.full ? 'Fully booked' : 'Register to attend'}</button></div></div></div>`;
};
const money = (n, c) => `${c || 'KES'} ${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const shortDate = d => new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const voucherCard = v => {
  const btn = v.state === 'upcoming' ? `<button class="btn small" disabled>Opens ${shortDate(v.opensAt)}</button>`
    : v.state === 'full' ? '<button class="btn small" disabled>Fully claimed</button>'
    : `<button class="btn small" data-act="claim" data-id="${v.id}">Claim voucher</button>`;
  const slots = v.slots > 0 ? (v.state === 'full' ? 'All slots taken' : `${v.slotsLeft} of ${v.slots} slots left`) : '';
  const when = v.state === 'upcoming' ? `Opens ${fmtDate(v.opensAt)}` : v.expires ? `Valid until ${fmtDate(v.expires)}` : '';
  return `<div class="voucher ${esc(v.state)}"><div class="vmain"><span class="tag">Maternity discount voucher</span><h3 style="margin:6px 0 2px">${esc(v.title)}</h3><div class="vval">${esc(v.discountLabel)}</div>
    ${v.price > 0 ? `<div class="vprice">Regular <s>${money(v.price, v.currency)}</s> &rarr; you pay <b>${money(v.finalPrice, v.currency)}</b></div>` : ''}
    <p style="margin:6px 0 0;color:var(--muted)">${esc(v.description)}</p>
    <div class="meta" style="margin-top:8px">${[slots, when].filter(Boolean).join(' · ')}${v.terms ? `<br>${esc(v.terms)}` : ''}</div></div>
    <div class="vside">${btn}</div></div>`;
};
const blogCard = b => `<a class="card img" href="#/blog/${b.id}">${pic(b.image, b.title)}<div class="body"><div class="meta">${fmtDate(b.created)}${b.author ? ' · ' + esc(b.author) : ''}</div><h3>${esc(b.title)}</h3><p>${esc(b.excerpt)}</p><span class="more">Read article →</span></div></a>`;
const feedbackCard = f => `<div class="card"><div class="stars" aria-label="${f.rating} out of 5">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</div><p class="quote">“${esc(f.message)}”</p><b>${esc(f.name)}</b></div>`;

let rateId = 0;
const rateInput = () => {
  const u = ++rateId;
  return `<div class="rate" role="radiogroup" aria-label="Star rating">${[5, 4, 3, 2, 1].map(n => `<input type="radio" name="rating" id="rt${n}-${u}" value="${n}" required><label for="rt${n}-${u}" title="${n} star${n > 1 ? 's' : ''}">★</label>`).join('')}</div>`;
};
function feedbackForm() {
  return `<form class="f" data-submit="/api/submit/feedback"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="lbl">How was your experience?<div>${rateInput()}</div></div>
    <label class="lbl">Your name<input name="name" required maxlength="100"></label>
    <label class="lbl">Your feedback<textarea name="message" required maxlength="1500" placeholder="Tell us what went well and what we can improve"></textarea></label>
    <div><button class="btn">Send feedback</button></div><div class="msg-slot"></div>
    <p class="meta" style="margin:0">Reviews appear on our website after our team approves them.</p></form>`;
}

/* sliders */
const slider = cards => `<div class="slider" data-slider><div class="track">${cards}</div><button class="sl prev" data-act="slide" data-d="-1" aria-label="Previous">‹</button><button class="sl next" data-act="slide" data-d="1" aria-label="Next">›</button></div>`;
function slide(track, d) {
  const w = track.firstElementChild.getBoundingClientRect().width + 18;
  const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  if (d > 0 && end) track.scrollTo({ left: 0, behavior: 'smooth' });
  else if (d < 0 && track.scrollLeft < 4) track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
  else track.scrollBy({ left: d * w, behavior: 'smooth' });
}
let timers = [];
function startSliders() {
  timers.forEach(clearInterval); timers = [];
  document.querySelectorAll('[data-slider]').forEach(el => {
    let pause = false;
    ['mouseenter', 'focusin', 'touchstart'].forEach(ev => el.addEventListener(ev, () => pause = true, { passive: true }));
    ['mouseleave', 'focusout'].forEach(ev => el.addEventListener(ev, () => pause = false));
    timers.push(setInterval(() => { const t = el.querySelector('.track'); if (!pause && t.scrollWidth > t.clientWidth + 8) slide(t, 1); }, 4500));
  });
}

/* insurance */
let INS = [];
const accredited = () => INS.filter(i => i.status === 'accredited');
const insurerCard = i => `<div class="ins ${i.status === 'coming' ? 'coming' : 'accepted'}"><div class="ins-logo">${i.logo ? `<img src="${esc(i.logo)}" alt="${esc(i.name)}">` : '<div class="ins-ph">🛡️</div>'}</div><b>${esc(i.name)}</b>${i.note ? `<span class="meta">${esc(i.note)}</span>` : ''}<span class="pill ${i.status === 'coming' ? '' : 'accredited'}">${i.status === 'accredited' ? '✓ Accredited' : i.status === 'coming' ? 'Coming soon' : '✓ Accepted'}</span></div>`;
const insRow = (list, cls) => {
  if (!list.length) return '';
  if (list.length < 4) return `<div class="ins-static">${list.map(insurerCard).join('')}</div>`;
  let half = [...list]; while (half.length < 6) half = half.concat(list);
  const cards = half.map(insurerCard).join('');
  return `<div class="marquee ${cls}" aria-label="Insurance covers"><div class="mtrack">${cards}${cards}</div></div>`;
};
function insuranceSection() {
  if (!INS.length) return '';
  const acc = accredited()[0], accepted = INS.filter(i => i.status !== 'coming'), soon = INS.filter(i => i.status === 'coming');
  return `<section class="block"><div class="wrap">${secHead('Insurance', 'Cashless care with the covers you trust', acc ? 'We are accredited by the Social Health Authority.' + (soon.length ? ' More insurers are joining soon.' : '') : 'The insurance covers we work with.')}
    ${acc ? `<div class="sha-badge"><div class="sha-logo"><img src="${esc(acc.logo || '/img/sha-logo.jpg')}" alt="${esc(acc.name)}"><span class="tick">✓</span></div><div><span class="pill accredited">✓ Accredited</span><h3>${esc(acc.name)}</h3><p>${esc(S.name)} is an accredited SHA facility. Bring your SHA details when you visit and our reception will guide you.</p></div></div>` : ''}
    ${accepted.length ? `<h3 class="ins-h">✓ Accepted insurance</h3>${insRow(accepted, '')}` : ''}
    ${soon.length ? `<h3 class="ins-h soon">Coming soon</h3>${insRow(soon, 'rev')}` : ''}</div></section>`;
}

const feedbackSection = fb => {
  const avg = fb.length ? (fb.reduce((n, f) => n + f.rating, 0) / fb.length).toFixed(1) : null;
  return `<section class="block tint" id="feedback"><div class="wrap">${secHead('Customer feedback', 'What our patients say', 'Rate your visit and tell us how we did.')}
    ${avg ? `<p style="text-align:center;margin-top:-18px"><span class="stars" style="font-size:1.3rem">★</span> <b>${avg}</b> / 5 <span class="meta">from ${fb.length} review${fb.length > 1 ? 's' : ''}</span></p>` : ''}
    ${fb.length ? slider(fb.map(feedbackCard).join('')) : empty('No reviews yet. Be the first to share your experience.')}
    <p style="text-align:center;margin-top:26px"><button class="btn" data-act="feedback">⭐ Leave your feedback</button></p></div></section>`;
};

/* ---------- pages ---------- */
const pages = {};

pages.home = async () => {
  const [services, events, vouchers, blogs, feedback, gallery] = await Promise.all(['services', 'events', 'vouchers', 'blogs', 'feedback', 'gallery'].map(x => api('/api/' + x)));
  const upcoming = events.filter(e => e.date >= today()).slice(0, 2);
  const mat = services.filter(s => s.category === 'maternity');
  const featured = services.filter(s => s.featured && s.category !== 'maternity').slice(0, 6);
  const journeySteps = (mat[0]?.steps || []).slice(0, 5);
  return `
  <section class="hero"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><svg class="ecg" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40 H360 L390 40 L410 8 L440 64 L466 22 L484 40 H760 L790 40 L810 8 L840 64 L866 22 L884 40 H1200"/></svg><div class="wrap">
    <div><span class="badge">${esc(S.level)} · Maternity care</span>${accredited().length ? ' <span class="badge sha-chip">✓ SHA Accredited</span>' : ''}<h1>${esc(S.heroTitle)}</h1><p class="lead">${esc(S.heroText)}</p>${S.motto ? `<p class="motto-line">“${esc(S.motto)}”</p>` : ''}
      <div class="cta"><a class="btn white pulse" href="#/book">Book a maternity visit</a><a class="btn outline-white" href="${wa('Hello, I would like to book a maternity visit.')}" target="_blank" rel="noopener">💬 Chat on WhatsApp</a></div>${accredited().length ? `<a class="sha-hero" href="#/insurance"><img src="${esc(accredited()[0].logo || '/img/sha-logo.jpg')}" alt="Social Health Authority (SHA)"><span><b>✓ SHA Accredited</b>We accept Social Health Authority cover</span></a>` : ''}</div>
    <div class="glass"><h3>${esc(S.maternityTitle)}</h3>${list(S.maternityHighlights)}</div>
  </div></section>
  <div class="wrap"><div class="strip">
    <div><span class="ico">🕒</span><div><b>Open hours</b><span>${lines(S.hours.split('\n')[0])}</span></div></div>
    <div><span class="ico">🚑</span><div><b>24-hour ambulance</b><span><a href="${tel(S.ambulancePhone)}">${esc(S.ambulancePhone)}</a></span></div></div>
    <div><span class="ico">👶</span><div><b>${esc(S.clinicTitle)}</b><span>${esc(S.clinicDay)}, ${esc(S.clinicTime)}</span></div></div>
  </div></div>

  <section class="block"><div class="wrap split">
    <div><span class="eyebrow">Maternity</span><h2>${esc(S.maternityTitle)}</h2><p>${esc(S.maternityText)}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="#/maternity">Explore maternity care</a><a class="btn ghost" href="#/events">Mother events</a></div></div>
    <div class="panel"><h3>How we walk with you</h3>${journeySteps.length ? journey(journeySteps) : ''}</div>
  </div></section>

  ${featured.length ? `<section class="block tint"><div class="wrap">${secHead('Our services', 'Care for the whole family', S.aboutText)}<div class="grid g3">${featured.map(serviceCard).join('')}</div><p style="text-align:center;margin-top:28px"><a class="btn ghost" href="#/services">See all services</a></p></div></section>` : ''}

  <section class="block dark"><div class="wrap split">
    <div><span class="eyebrow">Baby clinic</span><h2>${esc(S.clinicTitle)}</h2><p>${esc(S.clinicText)}</p><p><b>${esc(S.clinicDay)} · ${esc(S.clinicTime)}</b></p><a class="btn white" href="#/clinic">What the clinic covers</a></div>
    <div class="panel">${list(S.clinicCovers.slice(0, 6))}</div>
  </div></section>

  ${upcoming.length || vouchers.length ? `<section class="block"><div class="wrap">${secHead('Events & vouchers', 'Learn, celebrate and save', 'Baby showers, antenatal classes and maternity vouchers for expectant mothers.')}
    <div class="grid g2">${upcoming.map(eventCard).join('')}</div>
    ${vouchers.length ? `<div class="grid" style="margin-top:22px">${[vouchers.find(v => v.state === 'open') || vouchers[0]].map(voucherCard).join('')}</div>` : ''}
    <p style="text-align:center;margin-top:26px"><a class="btn ghost" href="#/events">All events</a></p></div></section>` : ''}

  <section class="block tint"><div class="wrap split">
    <div><span class="eyebrow">Emergency</span><h2>${esc(S.ambulanceTitle)}</h2><p>${esc(S.ambulanceText)}</p><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="${tel(S.ambulancePhone)}">🚑 Call ${esc(S.ambulancePhone)}</a><a class="btn ghost" href="#/ambulance">Details</a></div></div>
    <div class="panel">${list(S.ambulanceFeatures)}</div>
  </div></section>

  ${blogs.length ? `<section class="block"><div class="wrap">${secHead('Health blog', 'Advice from our team')}<div class="grid g3">${blogs.slice(0, 3).map(blogCard).join('')}</div></div></section>` : ''}

  ${insuranceSection()}
  ${feedbackSection(feedback)}

  ${gallery.length ? `<section class="block"><div class="wrap">${secHead('Gallery', 'Life at Silent Hill')}<div class="gallery">${gallery.slice(0, 6).map(g => `<figure data-act="zoom" data-src="${esc(g.image)}"><img src="${esc(g.image)}" alt="${esc(g.caption)}" loading="lazy"></figure>`).join('')}</div><p style="text-align:center"><a class="btn ghost" href="#/gallery">Full gallery</a></p></div></section>` : ''}

  <section class="block dark"><div class="wrap" style="text-align:center"><h2>Ready to see us?</h2><p>Book online, message us on WhatsApp or simply walk in.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a class="btn white" href="#/book">Book an appointment</a><a class="btn outline-white" href="#/contact">Ask a question</a></div></div></section>`;
};

pages.maternity = async () => {
  const [services, events, vouchers] = await Promise.all(['services', 'events', 'vouchers'].map(x => api('/api/' + x)));
  const mat = services.filter(s => s.category === 'maternity');
  const upcoming = events.filter(e => e.date >= today());
  return `${pageHead(S.maternityTitle, S.maternityText)}
  <section class="block"><div class="wrap split"><div><span class="eyebrow">Why mothers choose us</span><h2>Support from the first visit to the first vaccine</h2>${list(S.maternityHighlights)}<div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="#/book">Book a maternity visit</a><a class="btn wa" href="${wa('Hello, I am interested in maternity care.')}" target="_blank" rel="noopener">💬 WhatsApp a midwife</a></div></div>
  <div class="panel"><h3>The journey with us</h3>${journey([{ title: 'Antenatal care', text: 'Regular check-ups, tests and birth planning.' }, { title: 'Mother education', text: 'Classes and baby showers to prepare you.' }, { title: 'Labour & delivery', text: 'Skilled midwives and an ambulance on call 24 hours.' }, { title: 'Postnatal care', text: 'Recovery, feeding support and newborn checks.' }, { title: 'Saturday baby clinic', text: 'Vaccines and growth monitoring as baby grows.' }])}</div></div></section>
  <section class="block tint"><div class="wrap">${secHead('Maternity services', 'What we offer expectant and new mothers')}
    ${mat.length ? `<div class="grid g3">${mat.map(serviceCard).join('')}</div>` : empty('Maternity services are being updated.')}</div></section>
  <section class="block"><div class="wrap">${secHead('Mother events', 'Baby showers and antenatal education', 'Meet other mums, learn from our midwives and celebrate your baby.')}
    ${upcoming.length ? `<div class="grid g2">${upcoming.map(eventCard).join('')}</div>` : empty('No events scheduled right now. Check back soon or <a href="' + wa('Hello, when is the next mother event?') + '" target="_blank" rel="noopener">ask us on WhatsApp</a>.')}</div></section>
  <section class="block tint"><div class="wrap">${secHead('Vouchers', 'Maternity vouchers', 'Claim a voucher and show the code at reception.')}
    ${vouchers.length ? `<div class="grid">${vouchers.map(voucherCard).join('')}</div>` : empty('No vouchers are available at the moment.')}</div></section>
  <section class="block"><div class="wrap">${secHead('Baby clinic', S.clinicTitle, `${S.clinicDay} · ${S.clinicTime}`)}<p style="text-align:center"><a class="btn" href="#/clinic">See what the clinic covers</a></p></div></section>`;
};

pages.services = async () => {
  const services = await api('/api/services');
  const groups = Object.keys(CATS).map(k => [k, services.filter(s => s.category === k)]).filter(([, l]) => l.length);
  const other = services.filter(s => !CATS[s.category]);
  if (other.length) groups.push(['other', other]);
  return `${pageHead('Our services', `${S.level}: care for mothers, babies and the whole family under one roof.`)}
  ${groups.map(([k, l], i) => `<section class="block ${i % 2 ? 'tint' : ''}"><div class="wrap"><h2>${esc(CATS[k] || 'More services')}</h2><div class="grid g3">${l.map(serviceCard).join('')}</div></div></section>`).join('') || `<div class="wrap">${empty('Services are being updated.')}</div>`}`;
};

pages.service = async id => {
  const services = await api('/api/services');
  const s = services.find(x => x.id === id);
  if (!s) return pages.notfound();
  document.title = `${s.title} | ${S.name}`;
  return `${pageHead(s.title, s.summary, '<a href="#/services">Services</a> › ' + esc(CATS[s.category] || 'Service'))}
  <section class="block"><div class="wrap split" style="align-items:start">
    <div>${s.image ? `<img src="${esc(s.image)}" alt="${esc(s.title)}" style="border-radius:18px;margin-bottom:22px">` : ''}<h2>What it covers</h2>${list(s.covers)}
      <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="#/book/${s.id}">Book this service</a><a class="btn wa" href="${wa(`Hello, I would like to ask about ${s.title}.`)}" target="_blank" rel="noopener">💬 Ask on WhatsApp</a></div></div>
    ${s.steps.length ? `<div class="panel"><h3>Steps we walk with you</h3>${journey(s.steps)}</div>` : ''}
  </div></section>`;
};

pages.clinic = async () => `${pageHead(S.clinicTitle, `${S.clinicDay} · ${S.clinicTime}`)}
  <section class="block"><div class="wrap split" style="align-items:start"><div><span class="eyebrow">For babies and toddlers</span><h2>${esc(S.clinicTitle)}</h2><p>${esc(S.clinicText)}</p><p><b>Fees:</b> ${esc(S.clinicFee)}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="#/book">Book a clinic slot</a><a class="btn wa" href="${wa('Hello, I would like to bring my baby to the Saturday clinic.')}" target="_blank" rel="noopener">💬 Ask on WhatsApp</a></div></div>
    <div class="panel"><h3>What the clinic covers</h3>${list(S.clinicCovers)}</div></div></section>
  <section class="block tint"><div class="wrap"><div class="sec-head"><span class="eyebrow">Bring with you</span><h2>What to bring</h2></div><div class="grid g3">
    <div class="card"><div class="ico">📒</div><h3>Child health card</h3><p>We update it at every visit. We open one if you do not have it.</p></div>
    <div class="card"><div class="ico">🍼</div><h3>Feeding supplies</h3><p>Baby may need a feed while you wait. Feel free to feed at the clinic.</p></div>
    <div class="card"><div class="ico">❓</div><h3>Your questions</h3><p>Sleep, feeding, rashes or milestones. Our nurses are happy to help.</p></div></div></div></section>`;

pages.events = async () => {
  const [events, vouchers] = await Promise.all([api('/api/events'), api('/api/vouchers')]);
  const up = events.filter(e => e.date >= today());
  return `${pageHead('Events & baby showers', 'Antenatal education, baby showers and community health days.')}
  <section class="block"><div class="wrap">${up.length ? `<div class="grid g2">${up.map(eventCard).join('')}</div>` : empty('No upcoming events right now. Check back soon or <a href="#/contact">contact us</a>.')}</div></section>
  ${vouchers.length ? `<section class="block tint"><div class="wrap">${secHead('Event & maternity vouchers', 'Claim your voucher')}<div class="grid">${vouchers.map(voucherCard).join('')}</div></div></section>` : ''}`;
};

pages.gallery = async () => {
  const items = await api('/api/gallery');
  const cats = [...new Set(items.map(i => i.category).filter(Boolean))];
  const view = c => items.filter(i => !c || i.category === c).map(g => `<figure data-act="zoom" data-src="${esc(g.image)}"><img src="${esc(g.image)}" alt="${esc(g.caption)}" loading="lazy">${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}</figure>`).join('');
  pages.gallery.view = view;
  return `${pageHead('Gallery', 'A look at our facility, team and events.')}<section class="block"><div class="wrap">
    ${cats.length ? `<div class="filters"><button class="chip on" data-act="gfilter" data-c="">All</button>${cats.map(c => `<button class="chip" data-act="gfilter" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${items.length ? `<div class="gallery" id="gal">${view('')}</div>` : empty('Photos coming soon.')}</div></section>`;
};

pages.blog = async () => {
  const blogs = await api('/api/blogs');
  return `${pageHead('Health blog', 'Practical health advice from the Silent Hill team.')}<section class="block"><div class="wrap">${blogs.length ? `<div class="grid g3">${blogs.map(blogCard).join('')}</div>` : empty('Articles coming soon.')}</div></section>`;
};

pages.post = async id => {
  const b = (await api('/api/blogs')).find(x => x.id === id);
  if (!b) return pages.notfound();
  document.title = `${b.title} | ${S.name}`;
  return `${pageHead(b.title, '', '<a href="#/blog">Health blog</a>')}<section class="block"><div class="wrap"><article class="prose"><div class="meta" style="margin-bottom:16px">${fmtDate(b.created)}${b.author ? ' · ' + esc(b.author) : ''}</div>
    ${b.image ? `<img src="${esc(b.image)}" alt="" style="border-radius:16px;margin-bottom:22px">` : ''}${paras(b.body)}
    <hr style="border:0;border-top:1px solid var(--line);margin:30px 0"><p><a class="btn" href="#/book">Book an appointment</a> <a class="btn ghost" href="#/blog">← More articles</a></p></article></div></section>`;
};

pages.insurance = async () => {
  const acc = accredited().length;
  return `${pageHead('Insurance & SHA', acc ? 'We are an accredited Social Health Authority (SHA) facility. More insurance covers are coming soon.' : 'Insurance covers we work with.')}
  ${INS.length ? insuranceSection() : `<section class="block"><div class="wrap">${empty('Insurance details are being updated. Please call us on <a href="' + tel(S.phone) + '">' + esc(S.phone) + '</a>.')}</div></section>`}
  <section class="block tint"><div class="wrap">${secHead('Using your cover', 'What to bring when you visit')}<div class="grid g3">
    <div class="card"><div class="ico">🪪</div><h3>Your ID</h3><p>Bring your national ID or the ID of the patient.</p></div>
    <div class="card"><div class="ico">📇</div><h3>Your SHA details</h3><p>Have your SHA registration or member details ready at reception.</p></div>
    <div class="card"><div class="ico">💬</div><h3>Ask before you come</h3><p>Not sure what your cover includes? Ask us on WhatsApp or by phone.</p></div></div>
    <p style="text-align:center;margin-top:26px"><a class="btn wa" href="${wa('Hello, I would like to ask about insurance / SHA cover.')}" target="_blank" rel="noopener">💬 Ask about insurance</a> <a class="btn ghost" href="#/book">Book an appointment</a></p></div></section>`;
};

pages.rights = async () => `${pageHead('Patients’ Rights', S.rightsIntro || 'Every person, patient or client, has a:')}
  <section class="block"><div class="wrap">
    <div class="rights">${(S.patientRights || []).map((r, i) => `<div class="right"><span class="no">${i + 1}</span><p>${esc(r)}</p></div>`).join('')}</div>
    ${S.motto ? `<div class="motto-band">${esc(S.motto)}</div>` : ''}
    <div class="no-print" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:26px">
      <button class="btn" data-act="print">🖨 Print this page</button><a class="btn ghost" href="#/contact">Give feedback or raise a concern</a><a class="btn ghost" href="#/book">Book an appointment</a></div>
    <p class="meta no-print" style="text-align:center;margin-top:18px">These rights apply to every patient and client of ${esc(S.name)}. If you feel a right has not been respected, please tell our reception or use the feedback form.</p>
  </div></section>`;

pages.ambulance = async () => `${pageHead(S.ambulanceTitle, 'Fast, safe transport, 24 hours a day.')}
  <section class="block"><div class="wrap split" style="align-items:start"><div><h2>When to call</h2><p>${esc(S.ambulanceText)}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin:18px 0"><a class="btn" style="font-size:1.15rem" href="${tel(S.ambulancePhone)}">🚑 Call ${esc(S.ambulancePhone)}</a><a class="btn wa" href="${wa('EMERGENCY: I need an ambulance. My location is: ')}" target="_blank" rel="noopener">💬 WhatsApp location</a></div>
    <div class="msg err">Life-threatening emergency? Call now instead of booking online.</div></div>
    <div class="panel"><h3>Our ambulance service</h3>${list(S.ambulanceFeatures)}</div></div></section>
  <section class="block tint"><div class="wrap">${secHead('When you call', 'What to tell us')}<div class="grid g3">
    <div class="card"><div class="ico">📍</div><h3>Where you are</h3><p>Your location or a nearby landmark.</p></div>
    <div class="card"><div class="ico">🩺</div><h3>What happened</h3><p>The patient’s condition, age, and whether it is a mother in labour.</p></div>
    <div class="card"><div class="ico">📞</div><h3>Your number</h3><p>Stay reachable so the crew can find you.</p></div></div></div></section>`;

pages.catalog = async () => {
  const items = await api('/api/catalog');
  const cats = [...new Set(items.map(i => i.category).filter(Boolean))];
  const view = c => items.filter(i => !c || i.category === c).map(i => `<div class="card img">${pic(i.image, i.name)}<div class="body">${i.category ? `<span class="tag">${esc(i.category)}</span>` : ''}<h3>${esc(i.name)}</h3><p>${esc(i.description)}</p>${i.price ? `<div class="price">${esc(i.price)}</div>` : ''}<div style="margin-top:auto;padding-top:10px"><a class="btn wa small" target="_blank" rel="noopener" href="${wa(`Hello Silent Hill Hospital, I would like to order/ask about: ${i.name}${i.price ? ' (' + i.price + ')' : ''}`)}">💬 Order on WhatsApp</a></div></div></div>`).join('');
  pages.catalog.view = view;
  return `${pageHead(S.catalogTitle, S.catalogText)}<section class="block"><div class="wrap">
    <p style="text-align:center">${S.catalogUrl ? `<a class="btn wa" href="${esc(S.catalogUrl)}" target="_blank" rel="noopener">Open our full WhatsApp catalog</a> ` : ''}<a class="btn ghost" href="${wa('Hello, please send me your catalog.')}" target="_blank" rel="noopener">Ask for the catalog</a></p><br>
    ${cats.length ? `<div class="filters"><button class="chip on" data-act="cfilter" data-c="">All</button>${cats.map(c => `<button class="chip" data-act="cfilter" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${items.length ? `<div class="grid g3" id="cat">${view('')}</div>` : empty('Our catalog is being updated. Tap “Ask for the catalog” and we will send it on WhatsApp.')}</div></section>`;
};

pages.book = async id => {
  const services = await api('/api/services');
  const opts = services.map(s => `<option ${s.id === id ? 'selected' : ''}>${esc(s.title)}</option>`).join('') + '<option>Baby Clinic (Saturday)</option><option>Other / not sure</option>';
  return `${pageHead('Book an appointment', 'Choose a service and a preferred date. Our team will confirm by phone or message.')}
  <section class="block"><div class="wrap split" style="align-items:start"><div class="panel">
    <form class="f" data-submit="/api/submit/bookings"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="row"><label class="lbl">Full name<input name="name" required maxlength="100" autocomplete="name"></label><label class="lbl">Phone (WhatsApp if possible)<input name="phone" type="tel" required maxlength="30" autocomplete="tel"></label></div>
      <label class="lbl">Email <small>(optional)</small><input name="email" type="email" maxlength="120" autocomplete="email"></label>
      <label class="lbl">Service<select name="service" required>${opts}</select></label>
      <div class="row"><label class="lbl">Preferred date<input name="date" type="date" required min="${today()}"></label><label class="lbl">Preferred time<input name="time" type="time"></label></div>
      <label class="lbl">Anything we should know? <small>(optional)</small><textarea name="notes" maxlength="1000" placeholder="E.g. weeks pregnant, baby’s age…"></textarea></label>
      <div><button class="btn">Request booking</button></div><div class="msg-slot"></div></form></div>
    <div><h3>Prefer to talk?</h3><p>Call <a href="${tel(S.phone)}"><b>${esc(S.phone)}</b></a> or message us on WhatsApp.</p><p><a class="btn wa" href="${wa('Hello, I would like to book an appointment.')}" target="_blank" rel="noopener">💬 Book on WhatsApp</a></p>${accredited().length ? '<p><span class="pill accredited">✓ SHA accredited</span> Bring your SHA details to your visit. <a href="#/insurance">Insurance &amp; SHA</a></p>' : ''}<p class="meta">Booking requests are confirmed by our team. For emergencies please call the ambulance line: <a href="${tel(S.ambulancePhone)}">${esc(S.ambulancePhone)}</a>.</p></div></div></section>`;
};

pages.contact = async () => {
  const fb = await api('/api/feedback');
  return `${pageHead('Contact & feedback', 'Questions, compliments or concerns? We would love to hear from you.')}
  <section class="block"><div class="wrap split" style="align-items:start"><div class="panel"><h3>Send us a question</h3>
    <form class="f" data-submit="/api/submit/inquiries"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="row"><label class="lbl">Your name<input name="name" required maxlength="100"></label><label class="lbl">Phone<input name="phone" type="tel" maxlength="30"></label></div>
      <label class="lbl">Email<input name="email" type="email" maxlength="120"></label>
      <label class="lbl">Your question<textarea name="message" required maxlength="2000"></textarea></label>
      <div><button class="btn">Send message</button></div><div class="msg-slot"></div></form></div>
    <div><h3>Find us</h3><ul class="ticks" style="margin-bottom:22px"><li>📞 <a href="${tel(S.phone)}">${esc(S.phone)}</a></li><li>🚑 <a href="${tel(S.ambulancePhone)}">${esc(S.ambulancePhone)}</a></li><li>✉️ <a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li><li>📍 ${lines(S.address)}</li></ul>
    <h3>Hours</h3><p>${lines(S.hours)}</p><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn wa" href="${wa()}" target="_blank" rel="noopener">💬 Chat on WhatsApp</a><button class="btn ghost" data-act="chat">Live chat</button></div>${socials() ? `<h3 style="margin-top:24px">Follow us</h3><div class="soc-row">${socials('dark')}</div>` : ''}</div></div></section>
  <section class="block tint"><div class="wrap split" style="align-items:start"><div><span class="eyebrow">Your voice matters</span><h2>Share your experience</h2><p>Tell us how we did. Feedback helps us improve, and with your kind words others can trust us.</p>${fb.length ? `<div class="grid" style="margin-top:20px">${fb.slice(0, 3).map(feedbackCard).join('')}</div>` : ''}</div>
    <div class="panel"><h3>Leave feedback</h3>${feedbackForm()}</div></div></section>`;
};

pages.notfound = async () => `${pageHead('Page not found', 'That page does not exist.')}<section class="block"><div class="wrap" style="text-align:center"><a class="btn" href="#/">Go home</a></div></section>`;

/* ---------- anonymous visit counter (no cookies; the server keeps daily totals only) ---------- */
function track(path) {
  try { fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }), keepalive: true }).catch(() => {}); } catch { /* ignore */ }
}

/* ---------- scroll animation ---------- */
const REVEAL = '.sec-head, .card, .panel, .voucher, .sha-badge, .marquee, .strip, .journey li, .gallery figure, .slider, .split > div, .filters, .empty, .prose, .msg';
let revealObs;
function initReveal() {
  document.documentElement.classList.add('anim');
  revealObs?.disconnect();
  let alive = false;
  revealObs = new IntersectionObserver(entries => {
    alive = true;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target; revealObs.unobserve(el); el.classList.add('in');
      setTimeout(() => el.classList.remove('reveal', 'in'), 900 + (parseInt(el.style.getPropertyValue('--d')) || 0)); // hand hover transitions back
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  const seen = new Map();
  document.querySelectorAll('#app ' + REVEAL.split(', ').join(', #app ')).forEach(el => {
    if (el.closest('.hero, .track, .mtrack') || el.classList.contains('reveal')) return;
    const p = el.parentElement, i = seen.get(p) || 0; seen.set(p, i + 1);
    el.style.setProperty('--d', Math.min(i, 6) * 80 + 'ms');
    el.classList.add('reveal'); revealObs.observe(el);
  });
  // failsafe: if the browser never reports visibility (throttled or unsupported), show everything rather than leave content hidden
  setTimeout(() => { if (!alive) document.querySelectorAll('.reveal').forEach(el => el.classList.add('in')); }, 1200);
}

/* ---------- router ---------- */
const routes = [
  [/^\/?$/, () => pages.home()], [/^\/maternity$/, () => pages.maternity()], [/^\/services$/, () => pages.services()],
  [/^\/service\/(\w+)$/, id => pages.service(id)], [/^\/clinic$/, () => pages.clinic()], [/^\/events$/, () => pages.events()],
  [/^\/gallery$/, () => pages.gallery()], [/^\/blog$/, () => pages.blog()], [/^\/blog\/(\w+)$/, id => pages.post(id)],
  [/^\/patient-rights$/, () => pages.rights()], [/^\/insurance$/, () => pages.insurance()], [/^\/ambulance$/, () => pages.ambulance()], [/^\/catalog$/, () => pages.catalog()], [/^\/book(?:\/(\w+))?$/, id => pages.book(id)],
  [/^\/contact$/, () => pages.contact()]
];
async function route() {
  const path = location.hash.slice(1) || '/';
  const app = $('#app');
  $('#menu')?.classList.remove('open');
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + path));
  document.title = `${S.name} | Maternity, Baby Clinic & ${S.level}`;
  try {
    let html;
    for (const [re, fn] of routes) { const m = re.exec(path); if (m) { html = await fn(m[1]); break; } }
    app.innerHTML = html ?? await pages.notfound();
    startSliders();
    initReveal();
    track(path);
  } catch (e) {
    app.innerHTML = `<div class="wrap"><br><div class="msg err">Could not load this page. ${esc(e.message)}</div></div>`;
  }
  window.scrollTo(0, 0);
}

/* ---------- interactions ---------- */
const dlg = $('#dlg');
function openDialog(title, html) { $('#dlg-title').textContent = title; $('#dlg-body').innerHTML = html; dlg.showModal(); }
const hp = '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">';

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'menu') { const m = $('#menu'); const o = m.classList.toggle('open'); el.setAttribute('aria-expanded', o); }
  else if (act === 'close') dlg.close();
  else if (act === 'print') window.print();
  else if (act === 'chat') chatOpen();
  else if (act === 'chat-close') chatClose();
  else if (act === 'slide') slide(el.closest('[data-slider]').querySelector('.track'), Number(el.dataset.d));
  else if (act === 'feedback') openDialog('Share your feedback', feedbackForm());
  else if (act === 'zoom') { const lb = document.createElement('div'); lb.className = 'lb'; lb.innerHTML = `<img src="${esc(el.dataset.src)}" alt="">`; lb.onclick = () => lb.remove(); document.body.append(lb); }
  else if (act === 'gfilter') { document.querySelectorAll('[data-act=gfilter]').forEach(c => c.classList.toggle('on', c === el)); $('#gal').innerHTML = pages.gallery.view(el.dataset.c); }
  else if (act === 'cfilter') { document.querySelectorAll('[data-act=cfilter]').forEach(c => c.classList.toggle('on', c === el)); $('#cat').innerHTML = pages.catalog.view(el.dataset.c); }
  else if (act === 'register') {
    const ev = (await api('/api/events')).find(x => x.id === el.dataset.id); if (!ev) return;
    openDialog('Register: ' + ev.title, `<p class="meta">${fmtDate(ev.date)} · ${esc(ev.time)}<br>📍 ${esc(ev.venue)}</p>
      <form class="f" data-submit="/api/submit/registrations"><input type="hidden" name="eventId" value="${ev.id}">${hp}
      <label class="lbl">Full name<input name="name" required maxlength="100"></label>
      <div class="row"><label class="lbl">Phone<input name="phone" type="tel" required maxlength="30"></label><label class="lbl">Extra guests<select name="guests"><option>0</option><option>1</option><option>2</option><option>3</option></select></label></div>
      <label class="lbl">Email <small>(optional)</small><input name="email" type="email"></label>
      <label class="lbl">Notes <small>(optional, e.g. weeks pregnant)</small><input name="notes" maxlength="300"></label>
      <div><button class="btn">Confirm registration</button></div><div class="msg-slot"></div></form>`);
  } else if (act === 'claim') {
    const v = (await api('/api/vouchers')).find(x => x.id === el.dataset.id); if (!v) return;
    openDialog('Claim: ' + v.title, `<p><b>${esc(v.discountLabel)}</b>${v.price > 0 ? ` · you pay <b>${money(v.finalPrice, v.currency)}</b> instead of ${money(v.price, v.currency)}` : ''}<br>${esc(v.description)}</p>${v.slots > 0 ? `<p class="meta">${v.slotsLeft} of ${v.slots} slots left</p>` : ''}
      <form class="f" data-submit="/api/submit/claims" data-claim="1"><input type="hidden" name="voucherId" value="${v.id}">${hp}
      <label class="lbl">Full name<input name="name" required maxlength="100"></label>
      <div class="row"><label class="lbl">Phone<input name="phone" type="tel" required maxlength="30"></label><label class="lbl">Expected due date <small>(optional)</small><input name="edd" type="date"></label></div>
      <div><button class="btn">Claim &amp; download voucher</button></div><div class="msg-slot"></div></form>`);
  }
});
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-submit]');
  if (!f) return;
  e.preventDefault();
  const slot = f.querySelector('.msg-slot'), btn = f.querySelector('button:not([type])');
  btn.disabled = true; slot.innerHTML = '';
  try {
    const r = await post(f.dataset.submit, Object.fromEntries(new FormData(f)));
    if (r.ref) f.outerHTML = `<div class="msg ok">${esc(r.message)}</div><p>Your booking ticket:</p><div class="code">${esc(r.ref)}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn small" href="/ticket.html?ref=${encodeURIComponent(r.ref)}&print=1" target="_blank" rel="noopener">🖨 Print / save ticket</a><a class="btn ghost small" href="/ticket.html?ref=${encodeURIComponent(r.ref)}" target="_blank" rel="noopener">View ticket</a></div>
      <p class="meta">Keep this reference and show the ticket at reception. Use “Print” then choose “Save as PDF” to keep a copy on your phone.</p>`;
    else if (r.code) {
      const pdf = '/api/voucher-pdf/' + encodeURIComponent(r.code);
      f.outerHTML = `<div class="msg ok">Voucher claimed! Your A4 voucher is downloading now.</div><p>Your voucher code:</p><div class="code">${esc(r.code)}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn small" href="${pdf}" download>⬇ Download voucher (PDF)</a><a class="btn ghost small" href="/voucher.html?code=${encodeURIComponent(r.code)}&print=1" target="_blank" rel="noopener">🖨 Print</a></div>
        <p class="meta">Show the printed voucher or this code at reception. If the download did not start, tap “Download voucher”. Or <a href="${wa('Hello, my Silent Hill voucher code is ' + r.code)}" target="_blank" rel="noopener">send the code to us on WhatsApp</a>.</p>`;
      const a = document.createElement('a'); a.href = pdf; a.download = ''; document.body.append(a); a.click(); a.remove();
    }
    else f.outerHTML = `<div class="msg ok">${esc(r.message)}</div>`;
  } catch (err) {
    slot.innerHTML = `<div class="msg err">${esc(err.message)}</div>`; btn.disabled = false;
  }
});

/* ---------- live chat ---------- */
const store = { get: k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
const chat = { token: store.get('sh_chat'), name: store.get('sh_chat_name'), open: false, msgs: [], seen: Number(store.get('sh_chat_seen')) || 0, timer: null, err: '' };
const clock = d => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function chatDraw() {
  const b = $('#chat-b'); if (!b) return;
  const stick = b.scrollTop + b.clientHeight >= b.scrollHeight - 50;
  b.innerHTML = `<div class="cm staff"><span>Hello! 👋 Welcome to ${esc(S.name)}. How can we help? A team member will reply here shortly. In an emergency please call <a href="${tel(S.ambulancePhone)}">${esc(S.ambulancePhone)}</a>.</span></div>`
    + chat.msgs.map(m => `<div class="cm ${m.from}"><span>${esc(m.text)}</span><small>${m.from === 'staff' && m.by ? esc(m.by) + ' · ' : ''}${clock(m.at)}</small></div>`).join('')
    + (chat.err ? `<div class="cm err"><span>${esc(chat.err)}</span></div>` : '');
  if (stick) b.scrollTop = b.scrollHeight;
}
async function chatPoll() {
  if (!chat.token) return;
  try { chat.msgs = (await api('/api/chat/' + chat.token)).messages; }
  catch (e) { if (/not found/i.test(e.message)) { chat.token = ''; store.set('sh_chat', ''); chat.msgs = []; } return; }
  const staff = chat.msgs.filter(m => m.from === 'staff').length;
  if (chat.open) { chat.seen = staff; store.set('sh_chat_seen', String(staff)); chatDraw(); }
  $('#chat-fab')?.classList.toggle('has-new', !chat.open && staff > chat.seen);
}
const chatSchedule = () => { clearInterval(chat.timer); if (chat.token || chat.open) chat.timer = setInterval(chatPoll, chat.open ? 4000 : 20000); };
function chatOpen() {
  chat.open = true;
  let box = $('#chatbox');
  if (!box) {
    box = document.createElement('div'); box.id = 'chatbox'; box.className = 'chatbox';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Live chat');
    box.innerHTML = `<div class="chat-h"><div><b>Chat with ${esc(S.name)}</b><span>We usually reply within minutes</span></div><button type="button" data-act="chat-close" aria-label="Close chat">×</button></div>
      <div class="chat-b" id="chat-b" aria-live="polite"></div>
      <form class="chat-f" id="chat-f" autocomplete="off">${hp}${chat.name ? '' : '<input name="name" placeholder="Your name" maxlength="60" required>'}
        <div class="row2"><input name="text" placeholder="Type your message…" maxlength="1000" required><button class="btn small">Send</button></div></form>
      <a class="chat-wa" href="${wa('Hello, I would like to chat.')}" target="_blank" rel="noopener">💬 Prefer WhatsApp? Chat with us there</a>`;
    document.body.append(box);
  }
  box.hidden = false; $('#chat-fab').hidden = true; $('#chat-fab').classList.remove('has-new');
  chatDraw(); $('#chat-b').scrollTop = 1e6; chatPoll(); chatSchedule();
  (box.querySelector('[name=name]') || box.querySelector('[name=text]')).focus();
}
function chatClose() { chat.open = false; $('#chatbox').hidden = true; $('#chat-fab').hidden = false; chatSchedule(); }
document.addEventListener('submit', async e => {
  if (e.target.id !== 'chat-f') return;
  e.preventDefault();
  const f = e.target, el = f.elements, text = el.text.value.trim();
  if (!text) return;
  const name = (el.name?.value || '').trim() || chat.name;
  el.text.value = ''; chat.err = '';
  chat.msgs.push({ from: 'visitor', text, at: new Date().toISOString() }); chatDraw();
  try {
    const r = await post('/api/chat/send', { token: chat.token, name, text, website: el.website.value });
    chat.token = r.token; store.set('sh_chat', r.token);
    if (name) { chat.name = name; store.set('sh_chat_name', name); el.name?.remove(); }
    chat.msgs = r.messages; chatSchedule();
  } catch (err) { chat.msgs.pop(); chat.err = err.message; el.text.value = text; }
  chatDraw(); $('#chat-b').scrollTop = 1e6;
});

/* ---------- start ---------- */
(async () => {
  try { [S, INS] = await Promise.all([api('/api/settings'), api('/api/insurers').catch(() => [{ name: 'Social Health Authority (SHA)', status: 'accredited', note: 'Accredited facility', logo: '/img/sha-logo.jpg' }])]); } catch { S = { name: 'Silent Hill Hospital', level: 'Level 3', hours: '', maternityHighlights: [], clinicCovers: [], ambulanceFeatures: [] }; }
  shell();
  chatSchedule();
  addEventListener('hashchange', route);
  route();
})();
