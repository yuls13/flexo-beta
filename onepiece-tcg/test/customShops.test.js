import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCustomParam, guessName } from '../server/customShops.js';

const opts = { knownDomains: new Set(['philibertnet.com']), blacklist: [{ domain: 'boutique-one-piece.fr' }] };

test('parseCustomParam : filtre plateformes, doublons, liste blanche/noire, adresses internes', async () => {
  const param = [
    'example.com|shopify|Ma%20boutique',
    'www.example.com|woocommerce|Doublon',
    'philibertnet.com|prestashop|Déjà suivie',
    'boutique-one-piece.fr|shopify|Arnaque',
    '127.0.0.1|shopify|Interne',
    'example.org|link|Lien',
  ].join(',');
  const shops = await parseCustomParam(param, opts);
  assert.equal(shops.length, 1);
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
