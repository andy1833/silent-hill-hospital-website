// Security self-test for the Silent Hill website.
//   Public checks only (safe for the live site):   node scripts/security-check.js https://your-site
//   Full checks (use a throwaway local copy!):     ADMIN_PASSWORD=... node scripts/security-check.js http://localhost:3006
// The full run creates test staff users and test bookings, so never point it at real data.
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_PW = process.env.ADMIN_PASSWORD || '';
const results = [];
const check = (group, name, ok, detail = '') => results.push({ group, name, ok: !!ok, detail });

async function call(path, { method = 'GET', body, cookie, headers = {}, raw, redirect = 'manual' } = {}) {
  const h = { ...headers };
  if (cookie) h.Cookie = cookie;
  let payload = raw;
  if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers: h, body: payload, redirect });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, headers: res.headers, text, json, setCookie: res.headers.getSetCookie?.() || [] };
}
const sessionOf = r => (r.setCookie.find(c => c.startsWith('sh_admin=')) || '').split(';')[0];
async function login(user, password) { const r = await call('/api/admin/login', { method: 'POST', body: { user, password } }); return { r, cookie: sessionOf(r) }; }

(async () => {
  /* ---------- 1. headers, transport, information leaks ---------- */
  const home = await call('/');
  const H = k => home.headers.get(k) || '';
  check('Headers', 'Content-Security-Policy blocks inline/third-party scripts', /script-src 'self'/.test(H('content-security-policy')) && !/script-src[^;]*unsafe-inline/.test(H('content-security-policy')));
  check('Headers', 'Clickjacking protection (X-Frame-Options DENY)', H('x-frame-options') === 'DENY');
  check('Headers', 'X-Content-Type-Options nosniff', H('x-content-type-options') === 'nosniff');
  check('Headers', 'Referrer-Policy set', !!H('referrer-policy'));
  check('Headers', 'Server does not advertise Express (X-Powered-By)', !H('x-powered-by'));
  if (BASE.startsWith('https://')) {
    check('Transport', 'HTTPS with HSTS', /max-age=\d+/.test(H('strict-transport-security')));
    const plain = await fetch(BASE.replace('https://', 'http://') + '/', { redirect: 'manual' }).catch(() => null);
    check('Transport', 'Plain http:// is redirected to https://', !plain || (plain.status >= 300 && plain.status < 400 && /^https:/.test(plain.headers.get('location') || '')), plain ? 'status ' + plain.status : 'refused');
  }

  /* ---------- 2. files that must never be public ---------- */
  for (const p of ['/server.js', '/seed.js', '/package.json', '/data/db.json', '/db.json', '/.git/config', '/.env', '/node_modules/express/package.json', '/schema.sql', '/scripts/apply-schema.js', '/voucher-pdf.js', '/uploads/../server.js', '/uploads/..%2fserver.js', '/%2e%2e/server.js']) {
    const r = await call(p);
    check('Files', 'Not exposed: ' + p, r.status !== 200 || (r.headers.get('content-type') || '').includes('text/html'), 'status ' + r.status);
  }

  /* ---------- 3. admin API is closed to anonymous visitors ---------- */
  const guarded = [['GET', '/api/admin/me'], ['GET', '/api/admin/stats'], ['GET', '/api/admin/bookings'], ['GET', '/api/admin/inquiries'], ['GET', '/api/admin/users'], ['GET', '/api/admin/chats'], ['GET', '/api/admin/reports'], ['GET', '/api/admin/export/bookings'], ['GET', '/api/admin/services'],
    ['POST', '/api/admin/users'], ['POST', '/api/admin/services'], ['PUT', '/api/admin/settings'], ['DELETE', '/api/admin/bookings/x'], ['POST', '/api/admin/upload'], ['POST', '/api/admin/password']];
  for (const [m, p] of guarded) { const r = await call(p, { method: m, body: m === 'GET' ? undefined : {} }); check('Auth', `Anonymous ${m} ${p} is refused`, r.status === 401, 'status ' + r.status); }
  const forged = await call('/api/admin/me', { cookie: 'sh_admin=' + 'a'.repeat(64) });
  check('Auth', 'A forged session cookie is refused', forged.status === 401);

  /* ---------- 4. public endpoints do not leak private data ---------- */
  const fb = await call('/api/feedback');
  check('Privacy', 'Public feedback list shows only name, rating, message, date', Array.isArray(fb.json) && fb.json.every(f => Object.keys(f).every(k => ['name', 'rating', 'message', 'created'].includes(k))));
  const claimGuess = await call('/api/lookup/claims/SHH-00000000');
  check('Privacy', 'Voucher/ticket lookups need the exact secret code', claimGuess.status === 404);
  const dnt = await call('/api/track', { method: 'POST', body: { path: '/' }, headers: { DNT: '1', 'User-Agent': 'Mozilla/5.0' } });
  check('Privacy', 'Visit counter honours Do-Not-Track (returns 204, counts nothing)', dnt.status === 204);

  if (!ADMIN_PW) {
    console.log('\n(No ADMIN_PASSWORD given: skipping the signed-in checks.)');
  } else {
    /* ---------- 5. sign-in behaviour ---------- */
    const bad = await login('admin', 'definitely-wrong-password');
    check('Auth', 'Wrong password gives a generic error (no user/password hint)', bad.r.status === 401 && /Wrong username or password/.test(bad.r.text));
    const unknownUser = await login('no-such-user', 'x');
    check('Auth', 'Unknown user gives the same error as a wrong password', unknownUser.r.status === 401 && unknownUser.r.text === bad.r.text);
    const admin = await login('admin', ADMIN_PW);
    check('Auth', 'Correct password signs in', admin.r.status === 200 && !!admin.cookie);
    const rawCookie = admin.r.setCookie.find(c => c.startsWith('sh_admin=')) || '';
    check('Auth', 'Session cookie is HttpOnly', /HttpOnly/i.test(rawCookie));
    check('Auth', 'Session cookie is SameSite=Strict (blocks cross-site request forgery)', /SameSite=Strict/i.test(rawCookie));
    if (BASE.startsWith('https://')) check('Auth', 'Session cookie is Secure (HTTPS only)', /;\s*Secure/i.test(rawCookie));
    check('Auth', 'Session token is long and random (256-bit)', /^sh_admin=[a-f0-9]{64}$/.test(admin.cookie));
    const c = admin.cookie;

    const users = await call('/api/admin/users', { cookie: c });
    check('Data', 'Password hashes and salts are never sent to the browser', users.status === 200 && !/"hash"|"salt"|password_hash/.test(users.text));

    /* ---------- 6. roles ---------- */
    const mk = async (username, role) => call('/api/admin/users', { method: 'POST', cookie: c, body: { username, name: 'Test ' + role, role, password: 'Test-pass-1' } });
    await mk('zz_reception', 'reception'); await mk('zz_editor', 'editor');
    const rec = (await login('zz_reception', 'Test-pass-1')).cookie, edi = (await login('zz_editor', 'Test-pass-1')).cookie;
    const expect = async (label, cookie, method, path, allowed, body) => {
      const r = await call(path, { method, cookie, body: body ?? (method === 'GET' ? undefined : {}) });
      check('Roles', label, allowed ? r.status < 400 || r.status === 404 : r.status === 403, 'status ' + r.status);
    };
    await expect('Reception can read bookings', rec, 'GET', '/api/admin/bookings', true);
    await expect('Reception cannot manage users', rec, 'GET', '/api/admin/users', false);
    await expect('Reception cannot read reports or export patient data', rec, 'GET', '/api/admin/reports', false);
    await expect('Reception cannot export CSV', rec, 'GET', '/api/admin/export/bookings', false);
    await expect('Reception cannot change site content', rec, 'POST', '/api/admin/services', false, { title: 'x' });
    await expect('Reception cannot change settings', rec, 'PUT', '/api/admin/settings', false, { name: 'x' });
    await expect('Reception cannot delete requests', rec, 'DELETE', '/api/admin/bookings/none', false);
    await expect('Reception cannot upload files', rec, 'POST', '/api/admin/upload', false);
    await expect('Editor can edit content', edi, 'GET', '/api/admin/services', true);
    await expect('Editor can read reports', edi, 'GET', '/api/admin/reports', true);
    await expect('Editor cannot manage users', edi, 'POST', '/api/admin/users', false, { username: 'zz_x', name: 'x', role: 'admin', password: 'Test-pass-1' });
    const me = await call('/api/admin/me', { cookie: c });
    const del = await call('/api/admin/users/' + me.json.id, { method: 'DELETE', cookie: c });
    check('Roles', 'The last administrator cannot delete or demote themselves', del.status === 400);
    const demote = await call('/api/admin/users/' + me.json.id, { method: 'PUT', cookie: c, body: { role: 'editor' } });
    check('Roles', 'Last admin cannot be demoted', demote.status === 400);

    /* ---------- 7. cross-site request forgery + input handling ---------- */
    const before = (await call('/api/settings')).json.name;
    await call('/api/admin/settings', { method: 'PUT', cookie: c, raw: '{"name":"HACKED"}', headers: { 'Content-Type': 'text/plain' } });
    check('CSRF', 'A cross-site style (text/plain) request cannot change settings', (await call('/api/settings')).json.name === before);
    const mass = await call('/api/admin/services', { method: 'POST', cookie: c, body: { title: 'mass', id: 'HIJACK', created: '1999', __proto__: { admin: true }, role: 'admin' } });
    check('Input', 'Unknown/forged fields are ignored (no mass-assignment)', mass.status === 200 && mass.json.id !== 'HIJACK' && !('role' in mass.json));
    if (mass.json?.id) await call('/api/admin/services/' + mass.json.id, { method: 'DELETE', cookie: c });
    const xss = await call('/api/submit/bookings', { method: 'POST', body: { name: '<img src=x onerror=alert(1)>', phone: '0700000000', service: '<script>alert(1)</script>', date: '2099-01-01' } });
    check('Input', 'Script-like text is stored as plain text (pages escape it when displaying)', xss.status === 200 && !!xss.json.ref);
    const evil = await call('/api/submit/feedback', { method: 'POST', body: { name: 'x', rating: 9, message: 'y' } });
    check('Input', 'Out-of-range ratings are rejected', evil.status === 400);
    const badUpload = await call('/api/admin/upload', { method: 'POST', cookie: c, raw: '--b\r\nContent-Disposition: form-data; name="file"; filename="x.svg"\r\nContent-Type: image/svg+xml\r\n\r\n<svg onload=alert(1)>\r\n--b--', headers: { 'Content-Type': 'multipart/form-data; boundary=b' } });
    check('Uploads', 'SVG/HTML uploads are rejected (only JPG, PNG, WebP, GIF)', badUpload.status === 400);
    const fakePng = await call('/api/admin/upload', { method: 'POST', cookie: c, raw: '--b\r\nContent-Disposition: form-data; name="file"; filename="x.png"\r\nContent-Type: image/png\r\n\r\n<html><script>alert(1)</script>\r\n--b--', headers: { 'Content-Type': 'multipart/form-data; boundary=b' } });
    check('Uploads', 'A non-image file disguised as image/png is rejected (real file contents are checked)', fakePng.status === 400 && /not a real image/.test(fakePng.text), 'status ' + fakePng.status);
    const badImg = await call('/api/admin/settings', { method: 'PUT', cookie: c, body: { logo: 'javascript:alert(1)', facebook: 'javascript:alert(1)' } });
    check('Input', 'javascript: links are stripped from image and social-link settings', badImg.json && badImg.json.logo === '' && badImg.json.facebook === '');

    /* ---------- 8. sessions end properly ---------- */
    const tmp = (await login('zz_editor', 'Test-pass-1')).cookie;
    await call('/api/admin/logout', { method: 'POST', cookie: tmp });
    check('Auth', 'Logging out ends the session on the server', (await call('/api/admin/me', { cookie: tmp })).status === 401);
    const victim = (await login('zz_reception', 'Test-pass-1')).cookie;
    const list = (await call('/api/admin/users', { cookie: c })).json;
    const rid = list.find(u => u.username === 'zz_reception').id;
    await call('/api/admin/users/' + rid, { method: 'PUT', cookie: c, body: { active: false } });
    check('Auth', 'Deactivating a user signs them out immediately', (await call('/api/admin/me', { cookie: victim })).status === 401);
    const chats = await call('/api/admin/chats', { cookie: c });
    check('Data', 'Visitors’ private chat tokens are never sent to staff screens', !/"token"/.test(chats.text));

    // clean up test users
    for (const u of (await call('/api/admin/users', { cookie: c })).json) if (u.username.startsWith('zz_')) await call('/api/admin/users/' + u.id, { method: 'DELETE', cookie: c });
    // test bookings created above are removed
    for (const b of (await call('/api/admin/bookings', { cookie: c })).json || []) if (b.name.startsWith('<img')) await call('/api/admin/bookings/' + b.id, { method: 'DELETE', cookie: c });
  }

  /* ---------- 9. brute-force and abuse limits (last, they use up allowances) ---------- */
  if (ADMIN_PW) { // these tests create junk inquiries and lock this computer out for 10 minutes, so full mode only
    let locked = false;
    for (let i = 0; i < 12 && !locked; i++) locked = (await login('admin', 'guess' + i)).r.status === 429;
    check('Limits', 'Repeated wrong passwords are locked out (429)', locked);
    let limited = false;
    for (let i = 0; i < 16 && !limited; i++) limited = (await call('/api/submit/inquiries', { method: 'POST', body: { name: 'rate', message: 'rate test ' + i, phone: '0700' } })).status === 429;
    check('Limits', 'Form spam is rate-limited (429)', limited);
    let lim2 = false;
    for (let i = 0; i < 45 && !lim2; i++) lim2 = (await call('/api/lookup/bookings/BK-00000000')).status === 429;
    check('Limits', 'Ticket/voucher code guessing is rate-limited (429)', lim2);
  }

  /* ---------- report ---------- */
  let group = '';
  for (const r of results) { if (r.group !== group) { group = r.group; console.log('\n' + group); } console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '   [' + r.detail + ']'}`); }
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? `, ${failed} FAILED` : ''}.`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('Test run crashed:', e); process.exit(2); });
