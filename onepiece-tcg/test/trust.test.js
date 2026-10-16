import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScore, parseTrustpilot, sanitizeDomain, extractSiren, validSiren, detectPayments } from '../server/trust.js';
import { withExperience } from '../server/trust-score.js';

test('boutique établie et bien notée → très fiable', () => {
  const r = computeScore({
    flags: { physicalStore: true },
    age: { created: '2008-01-01', years: 18 },
    tp: { rating: 4.6, reviews: 1200 },
    site: { https: true, legal: true, companyId: true, payments: { card: true, paypal: true } },
    registry: { siren: '732829320', status: 'active', name: 'Boutique SAS', created: '2010-01-01' },
  });
  assert.equal(r.level, 'high');
  assert.equal(r.score, 100);
});

test('domaine récent, sans mentions légales, mal noté → risqué', () => {
  const r = computeScore({
    age: { created: '2026-09-01', years: 0.1 },
    tp: { rating: 1.8, reviews: 40 },
    site: { https: true, legal: false, companyId: false },
  });
  assert.equal(r.level, 'low');
  assert.equal(r.score, 0);
});

test('liste noire → 0', () => {
  const r = computeScore({ blacklisted: { reason: 'x', source: 'y' } });
  assert.equal(r.level, 'danger');
  assert.equal(r.score, 0);
});

test('aucune vérification possible → non vérifiable', () => {
  const r = computeScore({ flags: {}, age: null, tp: null, site: null });
  assert.equal(r.level, 'unknown');
  assert.equal(r.unverified, true);
});

test('parseTrustpilot', () => {
  assert.deepEqual(parseTrustpilot('{"trustScore":4.9,"stars":5,"numberOfReviews":123}'), { rating: 4.9, reviews: 123 });
  assert.deepEqual(parseTrustpilot('"aggregateRating":{"ratingValue":"3.2","reviewCount":"58"}'), { rating: 3.2, reviews: 58 });
  assert.equal(parseTrustpilot('<html></html>'), null);
});

test('sanitizeDomain refuse IP, localhost et URL invalides', async () => {
  assert.equal(await sanitizeDomain('127.0.0.1'), null);
  assert.equal(await sanitizeDomain('localhost'), null);
  assert.equal(await sanitizeDomain('http://169.254.169.254/latest'), null);
  assert.equal(await sanitizeDomain(''), null);
  const r = await sanitizeDomain('https://Exemple-Boutique-Inexistante-xyz.fr/page');
  assert.equal(r.host, 'exemple-boutique-inexistante-xyz.fr');
});

test('mêmes critères pour toutes les boutiques : plus de bonus « liste blanche »', () => {
  const input = { age: { created: '2015-01-01', years: 11 }, tp: null, site: { https: true, legal: true, companyId: true, payments: { card: true } } };
  const a = computeScore({ ...input, whitelisted: true });
  const b = computeScore({ ...input, whitelisted: false });
  assert.equal(a.score, b.score);
  assert.equal(a.score, 60);
  assert.ok(!a.checks.some((c) => /liste blanche/i.test(c.label)));
});

test('moyens de paiement : CB/PayPal +10, virement seul −25', () => {
  const base = { age: { created: '2015-01-01', years: 11 }, site: { https: true, legal: true, companyId: false } };
  const pts = (payments) => computeScore({ ...base, site: { ...base.site, payments } }).checks.find((c) => /Paiement/.test(c.label)).points;
  assert.equal(pts({ card: true, paypal: false, transfer: true }), 10);
  assert.equal(pts({ card: false, paypal: false, transfer: true }), -25);
  assert.equal(pts({ card: false, paypal: false, transfer: false }), 0);
  assert.deepEqual(detectPayments('<svg aria-labelledby="pi-visa"></svg><span>PayPal</span>'), { card: true, paypal: true, transfer: false });
});

test('registre des entreprises : société active +10, fermée −30', () => {
  const base = { age: { created: '2015-01-01', years: 11 }, site: { https: true, legal: true, companyId: true } };
  const pts = (registry) => computeScore({ ...base, registry }).checks.find((c) => /registre/.test(c.label)).points;
  assert.equal(pts({ siren: '732829320', status: 'active', name: 'X' }), 10);
  assert.equal(pts({ siren: '732829320', status: 'closed', name: 'X', closed: '2023-05-01' }), -30);
  assert.equal(pts({ siren: '732829321', status: 'invalid' }), 0);
  assert.equal(validSiren('732829320'), true);
  assert.equal(validSiren('732829321'), false);
  assert.deepEqual(extractSiren('SIRET : 732 829 320 00074'), { siren: '732829320', valid: true });
  assert.deepEqual(extractSiren('RCS Paris B 732 829 320'), { siren: '732829320', valid: true });
  assert.deepEqual(extractSiren('TVA intracommunautaire FR40732829320'), { siren: '732829320', valid: true });
  assert.equal(extractSiren('Tél. 01 23 45 67 89'), null);
});

test('avis Google pris en compte quand disponibles', () => {
  const r = computeScore({ age: { created: '2015-01-01', years: 11 }, google: { rating: 4.7, reviews: 300 } });
  assert.equal(r.checks.find((c) => c.label === 'Avis Google').points, 15);
});

test('expérience personnelle : +10 / −10 sur le score de l’utilisateur', () => {
  const t = { ...computeScore({ age: { created: '2015-01-01', years: 11 }, site: { https: true, legal: true, companyId: true } }), label: 'x' };
  assert.equal(withExperience(t, 'good').score, t.score + 10);
  assert.equal(withExperience(t, 'bad').score, t.score - 10);
  assert.equal(withExperience(t, null), t);
  const danger = computeScore({ blacklisted: { reason: 'x' } });
  assert.equal(withExperience(danger, 'good').score, 0);
});

test('magasin physique vérifié : fiable d’office (sauf société fermée), simple mention sur le site : +10', () => {
  const thin = { site: { https: true, legal: false, companyId: false } };
  const r = computeScore({ ...thin, flags: { physicalStore: true } });
  assert.ok(r.score >= 55);
  assert.equal(r.level, 'good');
  const closed = computeScore({ ...thin, flags: { physicalStore: true }, registry: { siren: '732829320', status: 'closed' } });
  assert.ok(closed.score < 55);
  const mention = computeScore({ site: { https: true, legal: true, companyId: true, physical: true } });
  assert.equal(mention.checks.find((c) => c.label === 'Magasin physique').points, 10);
});

test('fiche Google avec adresse = magasin physique (fiable d’office)', () => {
  const r = computeScore({ site: { https: true, legal: false, companyId: false }, google: { rating: null, physical: true, address: '1 rue du Port, 13300 Salon-de-Provence' } });
  assert.ok(r.score >= 55);
  assert.match(r.checks.find((c) => c.label === 'Magasin physique').detail, /Salon-de-Provence/);
  assert.ok(!r.checks.some((c) => c.label === 'Avis Google'));
});
