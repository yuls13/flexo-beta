import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { toValue, fromValue, signedAssertion, parseServiceAccount, createFirestoreAdmin } from '../server/firestoreAdmin.js';
import { snapshotFromOffers, appendPoints, compactPoints, createHistoryService } from '../server/history.js';
import { matchAlert, alertMessage, createAlertService } from '../server/alerts.js';
import { niceTicks, summarize } from '../public/tracking.js';
import { mergePrefs } from '../public/account.js';

const offer = (o) => ({ type: 'display', lang: 'FR', price: 120, shipping: 0, total: 120, quantity: 1, available: true, flags: [], shopId: 'a', shopName: 'A', url: 'https://a.fr/p', ...o });

test('Firestore : conversion des valeurs aller-retour', () => {
  const v = { a: 1, b: 2.5, c: 'x', d: true, e: null, f: [1, { g: 'h' }] };
  assert.deepEqual(fromValue(toValue(v)), v);
  assert.deepEqual(toValue(3), { integerValue: '3' });
});

test('Firestore : clé de compte de service (JSON ou base64) et assertion RS256 vérifiable', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sa = { client_email: 'bot@p.iam.gserviceaccount.com', project_id: 'p', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const raw = JSON.stringify({ ...sa, private_key: sa.private_key.replace(/\n/g, '\\n') });
  assert.equal(parseServiceAccount(raw).private_key, sa.private_key);
  assert.equal(parseServiceAccount(Buffer.from(raw).toString('base64')).project_id, 'p');
  assert.equal(parseServiceAccount('{"x":1}'), null);
  const jwt = signedAssertion(sa, 1000);
  const [h, c, sig] = jwt.split('.');
  const ok = crypto.createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(sig, 'base64url'));
  assert.ok(ok);
  assert.equal(JSON.parse(Buffer.from(c, 'base64url')).exp, 4600);
});

test('Firestore : set envoie un masque des champs écrits', async () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.includes('oauth2')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }));
    return new Response('{}');
  };
  const db = createFirestoreAdmin({ client_email: 'x', project_id: 'p', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }, { fetchImpl });
  await db.set('history/OP13', { data: {}, updatedAt: 'now' });
  const last = calls.at(-1);
  assert.equal(last.init.method, 'PATCH');
  assert.match(last.url, /documents\/history\/OP13\?updateMask\.fieldPaths=data&updateMask\.fieldPaths=updatedAt$/);
  assert.equal(last.init.headers.Authorization, 'Bearer t');
});

test('Historique : meilleur prix disponible par produit, hors suspects et lots', () => {
  const snap = snapshotFromOffers([
    offer({ total: 130, shopId: 'b' }),
    offer({ total: 110 }),
    offer({ total: 50, flags: [{ kind: 'suspect' }] }),
    offer({ total: 90, available: false }),
    offer({ type: 'booster', total: 40, quantity: 6 }),
    offer({ type: 'booster', lang: null, total: 6.5, price: 5 }),
  ]);
  assert.deepEqual(snap, { display_FR: { p: 120, tot: 110, s: 'a' }, booster_XX: { p: 5, tot: 6.5, s: 'a' } });
});

test('Historique : ajout de points et compactage des anciens relevés', () => {
  const now = Date.parse('2026-10-10T12:00:00Z');
  const old = [];
  for (let i = 400; i > 0; i--) old.push({ t: new Date(now - i * 3 * 3600e3).toISOString().slice(0, 16), p: 100 + (i % 5), tot: 100 + (i % 5), s: 'a' });
  const out = appendPoints({ display_FR: old, gone_FR: [{ t: '2024-01-01T00:00', p: 1, tot: 1, s: 'a' }] }, { display_FR: { p: 99, tot: 99, s: 'b' } }, new Date(now));
  assert.equal(out.gone_FR, undefined);
  const pts = out.display_FR;
  assert.deepEqual(pts.at(-1), { t: '2026-10-10T12:00', p: 99, tot: 99, s: 'b' });
  assert.ok(pts.length < old.length);
  // Au-delà de 14 jours : un point par tranche de 6 h, au plus bas prix de la tranche.
  const older = pts.filter((p) => now - Date.parse(`${p.t}Z`) > 15 * 864e5);
  const slots = new Set(older.map((p) => Math.floor(Date.parse(`${p.t}Z`) / (6 * 3600e3))));
  assert.equal(slots.size, older.length);
  // 2 relevés par tranche (i et i+1) : le plus bas des deux est gardé.
  assert.ok(older.every((p) => p.tot <= 103));
  assert.deepEqual(compactPoints([], now), []);
});

test('Historique : un point par heure au plus par série', async () => {
  const docs = {};
  const db = { get: async (p) => docs[p] || null, set: async (p, d) => (docs[p] = { ...(docs[p] || {}), ...d }) };
  const h = createHistoryService({ db });
  assert.equal(await h.record('OP13', { offers: [offer({})] }), true);
  assert.equal(await h.record('OP13', { offers: [offer({ total: 100 })] }), false);
  assert.equal(docs['history/OP13'].data.display_FR.length, 1);
  assert.equal((await h.get('OP13')).data.display_FR[0].tot, 120);
});

test('Alertes : offre la moins chère sous le seuil, bonne langue, en stock', () => {
  const offers = [offer({ total: 125 }), offer({ total: 118, url: 'https://b.fr' }), offer({ lang: 'EN', total: 100 }), offer({ total: 80, flags: [{ kind: 'suspect' }] })];
  assert.equal(matchAlert({ type: 'display', lang: 'FR', maxPrice: 120 }, offers).url, 'https://b.fr');
  assert.equal(matchAlert({ type: 'display', lang: 'any', maxPrice: 120 }, offers).lang, 'EN');
  assert.equal(matchAlert({ type: 'display', lang: 'FR', maxPrice: 110 }, offers), null);
  assert.equal(matchAlert({ type: 'booster', lang: 'FR', maxPrice: 999 }, offers), null);
  const msg = alertMessage({ id: 'x', series: 'OP13', type: 'display', maxPrice: 120 }, offer({ total: 118.9 }));
  assert.equal(msg.title, '🔔 OP13 · Display FR à 118,90 €');
  assert.match(msg.body, /Chez A, port compris/);
});

test('Alertes : notification envoyée une fois, appareils désinscrits retirés', async () => {
  const sub = (n) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: 'k', auth: 'a' } });
  const docs = {
    'users/u1': { alerts: [{ id: 'a1', series: 'OP13', type: 'display', lang: 'FR', maxPrice: 125 }], pushSubscriptions: [sub(1), sub(2)] },
    'users/u2': { alerts: [{ id: 'a2', series: 'OP13', type: 'display', lang: 'FR', maxPrice: 125, active: false }], pushSubscriptions: [sub(3)] },
  };
  const db = {
    get: async (p) => docs[p] || null,
    set: async (p, d) => (docs[p] = { ...(docs[p] || {}), ...d }),
    list: async (c) => Object.entries(docs).filter(([k]) => k.startsWith(`${c}/`)).map(([k, data]) => ({ id: k.split('/')[1], data })),
  };
  const sent = [];
  const push = { available: true, send: async (s, msg) => (sent.push([s.endpoint, msg.title]), s.endpoint.endsWith('/2') ? { ok: false, gone: true } : { ok: true }) };
  const alerts = createAlertService({ db, push });
  const data = { offers: [offer({})] };
  assert.equal((await alerts.evaluate('OP13', data)).sent, 1);
  assert.equal(sent.length, 2);
  assert.deepEqual(docs['users/u1'].pushSubscriptions.map((s) => s.endpoint), ['https://push.example/1']);
  assert.equal(docs['alertState/u1'].notified.a1.total, 120);
  // Même offre au même prix : pas de nouvelle notification.
  assert.equal((await alerts.evaluate('OP13', data)).sent, 0);
  assert.equal((await alerts.evaluate('OP14', data)).sent, 0);
});

test('Graphique : graduations rondes et résumé', () => {
  assert.deepEqual(niceTicks(103, 147), [100, 120, 140, 160]);
  assert.ok(niceTicks(120, 120).length >= 2);
  const s = summarize([{ t: 'a', tot: 130 }, { t: 'b', tot: 110 }, { t: 'c', tot: 120 }]);
  assert.equal(s.low.tot, 110);
  assert.equal(s.high.tot, 130);
  assert.equal(s.change, -10);
});

test('mergePrefs : alertes et appareils fusionnés sans doublon', () => {
  const m = mergePrefs({ alerts: [{ id: 'a' }], pushSubscriptions: [{ endpoint: 'e1' }] }, { alerts: [{ id: 'a' }, { id: 'b' }], pushSubscriptions: [{ endpoint: 'e1' }, { endpoint: 'e2' }] });
  assert.deepEqual(m.alerts.map((a) => a.id), ['a', 'b']);
  assert.deepEqual(m.pushSubscriptions.map((s) => s.endpoint), ['e1', 'e2']);
});
