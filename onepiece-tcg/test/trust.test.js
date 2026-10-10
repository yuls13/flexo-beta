import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScore, parseTrustpilot, sanitizeDomain } from '../server/trust.js';

test('boutique établie et bien notée → très fiable', () => {
  const r = computeScore({
    whitelisted: true,
    flags: { physicalStore: true },
    age: { created: '2008-01-01', years: 18 },
    tp: { rating: 4.6, reviews: 1200 },
    site: { https: true, legal: true, companyId: true },
  });
  assert.equal(r.level, 'high');
  assert.equal(r.score, 100);
});

test('domaine récent, sans mentions légales, mal noté → risqué', () => {
  const r = computeScore({
    whitelisted: false,
    age: { created: '2026-09-01', years: 0.1 },
    tp: { rating: 1.8, reviews: 40 },
    site: { https: true, legal: false, companyId: false },
  });
  assert.equal(r.level, 'low');
  assert.equal(r.score, 0);
});

test('liste noire → 0', () => {
  const r = computeScore({ whitelisted: false, blacklisted: { reason: 'x', source: 'y' } });
  assert.equal(r.level, 'danger');
  assert.equal(r.score, 0);
});

test('aucune vérification possible → non vérifiable', () => {
  const r = computeScore({ whitelisted: true, flags: {}, age: null, tp: null, site: null });
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
