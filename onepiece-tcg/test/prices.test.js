import test from 'node:test';
import assert from 'node:assert/strict';
import { compileSeries } from '../server/classify.js';
import { createPriceService, flagPrices, shippingFor } from '../server/prices.js';

const defaults = { FR: { small: 4.9, large: 7.9 }, EU: { small: 9.9, large: 14.9 } };

test('port estimé et livraison offerte', () => {
  assert.equal(shippingFor({ country: 'FR' }, 'display', 120, defaults), 7.9);
  assert.equal(shippingFor({ country: 'EU' }, 'booster', 5, defaults), 9.9);
  assert.equal(shippingFor({ country: 'FR', shipping: { freeFrom: 100 } }, 'display', 120, defaults), 0);
});

test('alerte prix suspect sous la médiane et sous le plancher', () => {
  const mk = (price) => ({ type: 'display', lang: 'FR', price, quantity: 1, flags: [] });
  const offers = [mk(130), mk(135), mk(140), mk(150), mk(70)];
  flagPrices(offers);
  assert.equal(offers[4].flags[0].kind, 'suspect');
  assert.equal(offers[0].flags.length, 0);
  const lone = [mk(95), mk(100), mk(105), { ...mk(0), price: 40, flags: [] }];
  flagPrices(lone);
  assert.match(lone[3].flags[0].text, /anormalement bas/);
});

test('service : classement, déduplication, statut des boutiques, liste noire', async () => {
  const series = compileSeries([{ id: 'OP16', code: 'OP-16', names: {}, queries: ['OP16'], match: ['\\bOP-?16\\b'] }]);
  const shops = [
    { id: 'a', name: 'A', domain: 'a.fr', base: 'https://a.fr', platform: 'woocommerce', country: 'FR' },
    { id: 'b', name: 'B', domain: 'b.fr', base: 'https://b.fr', platform: 'woocommerce', country: 'FR' },
    { id: 'bad', name: 'Bad', domain: 'bad.fr', base: 'https://bad.fr', platform: 'woocommerce', country: 'FR' },
  ];
  const calls = [];
  const searchImpl = async (shop) => {
    calls.push(shop.id);
    if (shop.id === 'b') {
      const e = new Error('HTTP 403');
      e.status = 403;
      throw e;
    }
    return [
      { title: 'Display OP16 FR', price: 140, url: 'https://a.fr/p/1', available: true },
      { title: 'Display OP16 FR', price: 140, url: 'https://a.fr/p/1?ref=x', available: true },
      { title: 'Display OP16 FR (épuisé)', price: 120, url: 'https://a.fr/p/2', available: false },
      { title: 'Sleeves OP16', price: 10, url: 'https://a.fr/p/3', available: true },
    ];
  };
  const svc = createPriceService({ shops, shippingDefaults: defaults, blacklist: [{ domain: 'bad.fr' }], series, searchImpl });
  const data = await svc.getSeries('OP16');
  assert.ok(!calls.includes('bad'));
  assert.equal(data.offers.length, 2);
  assert.equal(data.offers[0].available, true); // en stock d'abord, même si plus cher
  assert.equal(data.offers[0].total, 147.9);
  assert.equal(data.shops.find((s) => s.id === 'b').status, 'error');
  assert.equal(data.best.length, 1);
  const again = await svc.getSeries('OP16', { force: true });
  assert.equal(again.cached, true); // « Actualiser » trop rapproché → cache
});

test('précommandes : série à venir, mention dans le titre, FR sans date → date EN', async () => {
  const { buildOffer, releaseFor } = await import('../server/prices.js');
  const s = { release: { en: '2026-11-20', jp: '2026-11-21' } };
  const shop = { id: 'x', name: 'X', country: 'FR' };
  const cls = (lang) => ({ type: 'display', lang, quantity: 1 });
  const today = '2026-10-07';

  assert.equal(releaseFor(s, 'FR'), '2026-11-20');
  assert.equal(releaseFor(s, null), '2026-11-20');

  const o = buildOffer(shop, { title: 'Display OP18 FR', price: 130, url: 'u', available: true }, cls('FR'), defaults, s, today);
  assert.equal(o.preorder, true);
  assert.equal(o.releaseDate, '2026-11-20');

  // Produit affiché mais pas encore commandable (liste d'attente) : pas une précommande.
  const wait = buildOffer(shop, { title: 'Display OP18 JP', price: 90, url: 'u', available: false }, cls('JP'), defaults, s, today);
  assert.equal(wait.preorder, false);
  assert.equal(wait.upcoming, true);

  // Sur commande (WooCommerce backorder) : précommande commandable.
  const back = buildOffer(shop, { title: 'Display OP18 EN', price: 130, url: 'u', available: false, backorder: true }, cls('EN'), defaults, s, today);
  assert.equal(back.preorder, true);
  assert.equal(back.available, null);

  // Série sortie, mais mention « précommande » dans le titre.
  const old = { release: { fr: '2026-06-12' } };
  const pre = buildOffer(shop, { title: '[Précommande] Display OP16 FR', price: 130, url: 'u', available: true }, cls('FR'), defaults, old, today);
  assert.equal(pre.preorder, true);
  const inStock = buildOffer(shop, { title: 'Display OP16 FR', price: 130, url: 'u', available: true }, cls('FR'), defaults, old, today);
  assert.equal(inStock.preorder, false);
});

test('site anti-robots : marqué « protégé » et plus interrogé pendant 24 h', async () => {
  const series = compileSeries([{ id: 'OP16', code: 'OP-16', names: {}, queries: ['OP16', 'OP-16'], match: ['\\bOP-?16\\b'] }]);
  const shops = [{ id: 'cf', name: 'CF', domain: 'cf.fr', base: 'https://cf.fr', platform: 'woocommerce', country: 'FR' }];
  let calls = 0;
  const searchImpl = async () => {
    calls++;
    const e = new Error('HTTP 403 – protection anti-robots Cloudflare');
    e.status = 403;
    throw e;
  };
  const svc = createPriceService({ shops, shippingDefaults: defaults, blacklist: [], series, searchImpl });
  const first = await svc.getSeries('OP16');
  assert.equal(first.shops[0].status, 'protected');
  assert.equal(calls, 1);
  const again = await svc.getSeries('OP16', { extraShops: [{ id: 'x', name: 'X', domain: 'x.fr', base: 'https://x.fr', platform: 'auto', country: 'FR' }] });
  assert.equal(again.shops.find((s) => s.id === 'cf').status, 'protected');
  assert.equal(calls, 2); // seule la nouvelle boutique a été interrogée
});
