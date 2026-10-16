import test from 'node:test';
import assert from 'node:assert/strict';
import { optcgSetIds, variantOf, versionsFrom, cardmarketPrice, createChaseService } from '../server/chase.js';

test('identifiants de série OPTCG', () => {
  assert.deepEqual(optcgSetIds('OP16'), ['OP-16']);
  assert.deepEqual(optcgSetIds('OP14'), ['OP-14', 'OP14-EB04']);
  assert.deepEqual(optcgSetIds('PRB02'), ['PRB-02']);
});

test('versions d’une carte : base, _p1, _p2 triées et dédoublonnées', () => {
  assert.equal(variantOf('OP16-065'), 1);
  assert.equal(variantOf('OP16-065_p2'), 3);
  const json = [
    { card_set_id: 'OP16-065', card_image_id: 'OP16-065_p1', card_name: 'Sakazuki (Parallel)', rarity: 'SR', card_image: 'u1', market_price: '120.5' },
    { card_set_id: 'OP16-065', card_image_id: 'OP16-065', card_name: 'Sakazuki', rarity: 'SR', card_image: 'u0', market_price: 2 },
    { card_set_id: 'OP16-065', card_image_id: 'OP16-065_p1', card_name: 'Sakazuki (Parallel)', rarity: 'SR', card_image: 'u1' },
  ];
  const v = versionsFrom(json, 'OP16-065');
  assert.deepEqual(v.map((x) => [x.variant, x.usd]), [[1, 2], [2, 120.5]]);
});

test('prix Cardmarket associé seulement si le nombre de versions concorde', () => {
  const versions = [{ variant: 1 }, { variant: 2 }, { variant: 3 }];
  const cm = [{ idProduct: 10, avg7: 1 }, { idProduct: 11, avg7: 40 }, { idProduct: 12, avg7: 900 }];
  assert.equal(cardmarketPrice(cm, versions, 3).eur, 900);
  assert.equal(cardmarketPrice(cm.slice(0, 2), versions, 3), null);
});

test('chase cards : versions alternatives, prix EUR sinon USD, repli Cardmarket sans OPTCG', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.endsWith('/api/sets/OP-16/')) {
      return Response.json([
        { card_set_id: 'OP16-065', card_name: 'Sakazuki', rarity: 'SR' },
        { card_set_id: 'OP16-065', card_name: 'Sakazuki (Parallel)', rarity: 'SR' },
        { card_set_id: 'OP16-001', card_name: 'Luffy', rarity: 'L' },
      ]);
    }
    if (u.endsWith('/api/sets/card/OP16-065/')) {
      return Response.json([
        { card_set_id: 'OP16-065', card_image_id: 'OP16-065', card_name: 'Sakazuki', card_image: 'a' },
        { card_set_id: 'OP16-065', card_image_id: 'OP16-065_p1', card_name: 'Sakazuki (Parallel)', card_image: 'b', market_price: 300 },
      ]);
    }
    return new Response('not found', { status: 404 });
  };
  try {
    const byCode = new Map([['OP16-065', [{ idProduct: 5, name: 'Sakazuki', avg7: 3 }, { idProduct: 9, name: 'Sakazuki', avg7: 1294 }]]]);
    const svc = createChaseService({ cardmarket: { westernByCode: async () => ({ byCode, western: 81, method: 'date', expansions: [] }) } });
    const r = await svc.getChase('OP16');
    assert.equal(r.cards.length, 1);
    assert.deepEqual([r.cards[0].code, r.cards[0].variant, r.cards[0].eur, r.cards[0].priceSource], ['OP16-065', 2, 1294, 'cardmarket']);
    assert.equal(r.cards[0].images[0], '/api/card-image?code=OP16-065&v=2');

    // OPTCG indisponible pour la série : repli sur les cartes à plusieurs fiches Cardmarket.
    const svc2 = createChaseService({ cardmarket: { westernByCode: async () => ({ byCode, western: 81 }) } });
    const r2 = await svc2.getChase('OP99');
    assert.equal(r2.source, 'cardmarket');
    assert.deepEqual(r2.cards.map((c) => [c.code, c.variant, c.eur]), [['OP16-065', 2, 1294]]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('taux BCE : 1 $ en euros, et conversion des prix TCGplayer', async () => {
  const { parseEcbUsd } = await import('../server/rates.js');
  const xml = "<Cube time='2026-10-09'><Cube currency='USD' rate='1.0850'/><Cube currency='JPY' rate='160.2'/></Cube>";
  assert.deepEqual(parseEcbUsd(xml), { usdEur: 0.9217, date: '2026-10-09' });
  assert.equal(parseEcbUsd('<xml/>'), null);

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('ecb.europa.eu')) return new Response(xml, { status: 200, headers: { 'content-type': 'text/xml' } });
    if (u.endsWith('/api/sets/OP-16/')) return Response.json([{ card_set_id: 'OP16-065' }, { card_set_id: 'OP16-065' }]);
    if (u.endsWith('/api/sets/card/OP16-065/')) {
      return Response.json([
        { card_set_id: 'OP16-065', card_image_id: 'OP16-065', card_image: 'a' },
        { card_set_id: 'OP16-065', card_image_id: 'OP16-065_p1', card_image: 'b', market_price: 1000 },
      ]);
    }
    return new Response('x', { status: 404 });
  };
  try {
    const svc = createChaseService({ cardmarket: { westernByCode: async () => ({ byCode: new Map() }) } });
    const r = await svc.getChase('OP16');
    assert.deepEqual([r.cards[0].priceSource, r.cards[0].usd, r.cards[0].eur], ['tcgplayer', 1000, 921.7]);
    assert.equal(r.rate.source, 'BCE');
  } finally {
    globalThis.fetch = realFetch;
  }
});
