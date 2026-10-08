import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCustomParam, guessName } from '../server/customShops.js';

// Résolveur factice : pas de dépendance au DNS pendant les tests.
const fakeResolve = async (input) => {
  const host = String(input).toLowerCase();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || !host.includes('.')) return null;
  return { host };
};
const opts = { knownDomains: new Set(['philibertnet.com']), blacklist: [{ domain: 'boutique-one-piece.fr' }], resolve: fakeResolve };

test('parseCustomParam : filtre plateformes, doublons, liste blanche/noire, adresses internes', async () => {
  const param = [
    'example.com|shopify|Ma%20boutique',
    'www.example.com|woocommerce|Doublon',
    'philibertnet.com|prestashop|Déjà suivie',
    'boutique-one-piece.fr|shopify|Arnaque',
    '127.0.0.1|shopify|Interne',
    'example.org|link|Lien',
  ].join(',');
  const { shops, rejected } = await parseCustomParam(param, opts);
  assert.equal(shops.length, 2); // example.com + example.org (ancienne plateforme « link » → détection automatique)
  assert.equal(shops[1].platform, 'auto');
  assert.deepEqual(rejected.map((r) => r.error), ['site signalé comme arnaque', 'adresse invalide ou interne']);
  assert.deepEqual(
    { id: shops[0].id, name: shops[0].name, base: shops[0].base, platform: shops[0].platform, custom: shops[0].custom },
    { id: 'custom:example.com', name: 'Ma boutique', base: 'https://example.com', platform: 'shopify', custom: true }
  );
});

test('guessName', () => {
  assert.equal(guessName('<meta property="og:site_name" content="Super TCG">', 'x.fr'), 'Super TCG');
  assert.equal(guessName('<title>Cartes One Piece | Super TCG</title>', 'x.fr'), 'Cartes One Piece');
  assert.equal(guessName('', 'x.fr'), 'x.fr');
});
