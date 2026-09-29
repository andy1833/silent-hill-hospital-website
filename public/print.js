/* Renders the printable A5 landscape voucher and booking ticket */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kind = document.body.dataset.kind;
const params = new URLSearchParams(location.search);
const ref = (params.get('code') || params.get('ref') || '').trim();
const fmt = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '';
const out = document.getElementById('out');
document.getElementById('pr').onclick = () => window.print();
const dl = document.getElementById('dl');
if (dl) dl.href = '/api/voucher-pdf/' + encodeURIComponent(ref);

const head = (S, title, sub) => `<div class="hd"><img src="${esc(S.logo || '/logo.svg')}" alt="${esc(S.name)}"><div class="kind"><b>${title}</b><span>${sub}</span></div></div>`;
const foot = S => `${S.motto ? `<i>${esc(S.motto)}</i><br>` : ''}📞 ${esc(S.phone)} · 💬 WhatsApp ${esc(S.whatsapp)} · ✉ ${esc(S.email)}<br>${esc(S.address).replace(/\n/g, ', ')}`;

const money = (n, cur) => `${cur || 'KES'} ${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
function voucher(S, c) {
  const exp = c.expires ? fmt(c.expires) : 'No expiry date';
  return `<div class="sheet a4"><div class="inner"><img class="wm" src="${esc(S.logo || '/logo.svg')}" alt=""><div class="frame"></div>
  <div class="content">${head(S, 'Maternity Discount Voucher', esc(c.voucherTitle))}
    <div class="main">
      <div><div class="lbl">Issued to</div><div class="name">${esc(c.name)}</div></div>
      <div class="row3">
        <div><div class="lbl">Discount</div><div class="big">${esc(c.discountLabel || c.amount || c.value)}</div>${Number(c.price) > 0 ? `<div class="terms">Regular price ${money(c.price, c.currency)}<br><b style="font-size:4mm;color:var(--deep)">You pay ${money(c.finalPrice, c.currency)}</b></div>` : ''}</div>
        <div><div class="lbl">Valid</div>${c.opensAt ? `<div class="terms">From ${fmt(c.opensAt)}</div>` : ''}<div class="val">${c.expires ? 'Until ' + esc(exp) : esc(exp)}</div></div>
        <div><div class="lbl">Voucher code</div><div class="code">${esc(c.code)}</div></div>
      </div>
      <div class="terms">${esc(c.terms || 'Present this voucher at reception.')} Valid for maternity clients only. Not exchangeable for cash.</div>
    </div>
    <div class="ft"><div>${foot(S)}</div><div class="sign">Authorised by</div></div>
  </div></div></div>`;
}

function ticket(S, b) {
  const when = `${fmt(b.date)}${b.time ? ' at ' + esc(b.time) : ''}`;
  return `<div class="sheet ticket"><img class="wm" src="${esc(S.logo || '/logo.svg')}" alt=""><div class="frame"></div>
  <div class="content"><div class="left">${head(S, 'Booking Ticket', 'Appointment request')}
    <div class="main"><div class="grid2">
      <div><div class="lbl">Patient</div><div class="val">${esc(b.name)}</div></div>
      <div><div class="lbl">Phone</div><div class="val">${esc(b.phone)}</div></div>
      <div style="grid-column:1/3"><div class="lbl">Service</div><div class="big" style="font-size:6.2mm">${esc(b.service)}</div></div>
      <div style="grid-column:1/3"><div class="lbl">Preferred date &amp; time</div><div class="val">${when}</div></div>
    </div>
    <div class="terms">Please arrive 15 minutes early and show this ticket at reception. Our team will confirm your appointment by phone or message. ${b.notes ? '<br>Notes: ' + esc(b.notes) : ''}</div></div>
    <div class="ft"><div>${foot(S)}</div></div></div>
    <div class="stub"><div class="lbl">Booking ref</div><div class="code" style="font-size:4.6mm;padding:1.4mm 2mm">${esc(b.ref)}</div>
      <div><span class="status ${esc(b.status)}">${esc(b.status)}</span></div>
      <div class="terms"><b>${esc(b.name)}</b><br>${when}</div></div>
  </div></div>`;
}

(async () => {
  try {
    if (!ref) throw new Error('No reference given.');
    const [S, rec] = await Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch(`/api/lookup/${kind === 'voucher' ? 'claims' : 'bookings'}/${encodeURIComponent(ref)}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; })
    ]);
    out.innerHTML = kind === 'voucher' ? voucher(S, rec) : ticket(S, rec);
    document.title = (kind === 'voucher' ? 'Voucher ' : 'Ticket ') + ref;
    if (params.get('print')) {
      await Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
      setTimeout(() => window.print(), 300);
    }
  } catch (e) {
    out.innerHTML = `<div class="err">${esc(e.message)}</div>`;
  }
})();
