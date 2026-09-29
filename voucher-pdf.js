// Draws the A4 landscape maternity discount voucher as a PDF (no external fonts or images needed).
const PDFDocument = require('pdfkit');
const fs = require('fs');

const RED = '#c8102e', DEEP = '#6f0819', GREY = '#6d5a5e', SOFT = '#fdecee', INK = '#2b1a1d';
// built-in PDF fonts only cover Latin text, so strip anything else instead of printing garbage
const safe = s => String(s ?? '').replace(/[^\x20-\x7E -ÿ–—‘’“”•€]/g, '').trim();
const dateText = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const money = (n, cur) => `${cur || 'KES'} ${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

// same artwork as public/logo.svg, drawn as vector paths
function drawDefaultLogo(doc, x, y, w, a = 1) {
  const k = w / 330;
  doc.save().translate(x, y).scale(k).lineCap('round').lineJoin('round').strokeColor(RED).strokeOpacity(a);
  doc.lineWidth(5).moveTo(28, 66).lineTo(88, 22).lineTo(112, 40).lineTo(138, 24).lineTo(204, 66).stroke();
  doc.save().strokeOpacity(0.55 * a).lineWidth(3).moveTo(62, 44).lineTo(88, 30).lineTo(104, 42).stroke().restore();
  doc.lineWidth(3).circle(244, 30, 8).stroke();
  for (const [a, b, c, d] of [[244, 12, 244, 18], [244, 42, 244, 48], [226, 30, 232, 30], [256, 30, 262, 30], [231, 17, 235, 21], [253, 39, 257, 43], [257, 17, 253, 21], [235, 39, 231, 43]]) doc.moveTo(a, b).lineTo(c, d).stroke();
  doc.restore();
  doc.save().fillOpacity(a).font('Times-BoldItalic').fontSize(32 * k).fillColor(RED).text('Silent Hill Hospital', x, y + 72 * k, { width: 330 * k, align: 'center', lineBreak: false }).restore();
}
function drawLogo(doc, x, y, w, logoFile, a = 1) {
  if (logoFile) {
    try { doc.save().opacity(a).image(logoFile, x, y, { fit: [w, w * 112 / 330], align: 'center', valign: 'center' }).restore(); return; } catch { /* unsupported image: fall back to the built-in artwork */ }
  }
  drawDefaultLogo(doc, x, y, w, a);
}

function renderVoucher(stream, c, settings, logoFile) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: 'Maternity Discount Voucher ' + c.code, Author: safe(settings.name) } });
  doc.pipe(stream);
  const W = doc.page.width, H = doc.page.height;

  // watermark logo
  drawLogo(doc, (W - 600) / 2, (H - 204) / 2 + 14, 600, logoFile, 0.07);

  // frame
  doc.lineWidth(4).strokeColor(RED).roundedRect(20, 20, W - 40, H - 40, 16).stroke();
  doc.lineWidth(1).strokeColor('#e9a5b0').roundedRect(28, 28, W - 56, H - 56, 12).stroke();

  // header
  drawLogo(doc, 52, 44, 200, logoFile);
  doc.font('Times-Bold').fontSize(24).fillColor(RED).text('MATERNITY DISCOUNT VOUCHER', 300, 56, { width: W - 352, align: 'right', lineBreak: false });
  doc.font('Helvetica').fontSize(11).fillColor(GREY).text(safe(c.voucherTitle).toUpperCase(), 300, 90, { width: W - 352, align: 'right', lineBreak: false, characterSpacing: 1.5 });
  doc.lineWidth(1.5).strokeColor(RED).moveTo(52, 126).lineTo(W - 52, 126).stroke();

  const label = (t, x, y) => doc.font('Helvetica-Bold').fontSize(9).fillColor(GREY).text(t, x, y, { characterSpacing: 1.6, lineBreak: false });

  // patient
  label('ISSUED TO', 60, 152);
  doc.font('Times-Bold').fontSize(38).fillColor(DEEP).text(safe(c.name), 60, 168, { width: W - 120, lineBreak: false, ellipsis: true });
  doc.save().dash(3, { space: 3 }).lineWidth(0.8).strokeColor('#c9a0a8').moveTo(60, 222).lineTo(W - 60, 222).stroke().restore();

  // discount + price
  label('DISCOUNT', 60, 252);
  doc.font('Times-Bold').fontSize(40).fillColor(RED).text(safe(c.discountLabel || c.amount || c.value || 'Maternity offer'), 60, 268, { width: 300, lineBreak: false, ellipsis: true });
  if (Number(c.price) > 0) {
    doc.font('Helvetica').fontSize(12).fillColor(GREY).text('Regular price: ' + money(c.price, c.currency), 60, 322, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(DEEP).text('You pay: ' + money(c.finalPrice, c.currency), 60, 340, { lineBreak: false });
  }

  // validity
  label('VALID', 390, 252);
  let vy = 270;
  if (c.opensAt) { doc.font('Helvetica').fontSize(12).fillColor(GREY).text('From ' + dateText(c.opensAt), 390, vy, { lineBreak: false }); vy += 20; }
  doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text(c.expires ? 'Until ' + dateText(c.expires) : 'No expiry date', 390, vy, { lineBreak: false });

  // code
  label('VOUCHER CODE', 610, 252);
  doc.save().dash(4, { space: 3 }).lineWidth(1.2).fillAndStroke(SOFT, RED);
  doc.roundedRect(610, 268, 190, 46, 6).fillAndStroke(SOFT, RED).restore();
  doc.font('Times-Bold').fontSize(21).fillColor(RED).text(c.code, 610, 281, { width: 190, align: 'center', lineBreak: false, characterSpacing: 1.5 });

  // terms
  const terms = safe(c.terms) || 'Present this voucher at reception.';
  doc.font('Helvetica').fontSize(10).fillColor(GREY).text(terms + ' Valid for maternity clients only. Not exchangeable for cash.', 60, 410, { width: W - 120, lineGap: 2 });

  // footer
  doc.lineWidth(0.8).strokeColor('#e9c3c9').moveTo(52, 502).lineTo(W - 52, 502).stroke();
  const contact = [settings.phone && 'Tel ' + settings.phone, settings.whatsapp && 'WhatsApp ' + settings.whatsapp, settings.email].filter(Boolean).map(safe).join('   |   ');
  doc.font('Helvetica').fontSize(9.5).fillColor(GREY).text(contact, 60, 514, { width: 520, lineBreak: false });
  doc.text(safe(String(settings.address ?? '').replace(/\s*\n\s*/g, ', ')), 60, 529, { width: 520, lineBreak: false, ellipsis: true });
  doc.lineWidth(0.8).strokeColor(INK).moveTo(610, 546).lineTo(790, 546).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(GREY).text('Authorised by', 610, 551, { width: 180, align: 'center', lineBreak: false });
  doc.end();
}

module.exports = { renderVoucher, fileExists: f => { try { return fs.statSync(f).isFile(); } catch { return false; } } };
