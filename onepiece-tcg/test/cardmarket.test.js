import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCardName, topCards, looksLikeOnePiece, cardImages } from '../server/cardmarket.js';

test('parseCardName', () => {
  assert.deepEqual(parseCardName('Shanks (OP17-022) (V.2)'), { code: 'OP17-022', variant: 2, base: 'Shanks' });
  assert.deepEqual(parseCardName('Monkey.D.Luffy (OP16-118)'), { code: 'OP16-118', variant: 1, base: 'Monkey.D.Luffy' });
});

test('cardImages : visuel servi par le serveur de l’app', () => {
  assert.deepEqual(cardImages('OP16-118', 2), ['/api/card-image?code=OP16-118&v=2']);
  assert.deepEqual(cardImages(null, 1), []);
});

test('imageIds et pickOptcgImage : version alternative puis version de base', async () => {
  const { imageIds, pickOptcgImage, validCode } = await import('../server/cardImages.js');
  assert.deepEqual(imageIds('OP17-118', 3), ['OP17-118_p2', 'OP17-118']);
  assert.deepEqual(imageIds('OP17-118', 1), ['OP17-118']);
  const json = [
    { card_image_id: 'OP17-118', card_image: 'https://img/OP17-118.jpg' },
    { card_image_id: 'OP17-118_p1', card_image: 'https://img/OP17-118_p1.jpg' },
  ];
  assert.deepEqual(pickOptcgImage(json, imageIds('OP17-118', 2)), { url: 'https://img/OP17-118_p1.jpg', exact: true });
  // Version 5 absente : la version alternative la plus proche, pas la version de base.
  assert.deepEqual(pickOptcgImage(json, imageIds('OP17-118', 5)), { url: 'https://img/OP17-118_p1.jpg', exact: false });
  assert.deepEqual(pickOptcgImage(json, imageIds('OP17-118', 1)), { url: 'https://img/OP17-118.jpg', exact: true });
  assert.equal(pickOptcgImage({ data: [] }, ['X']), null);
  assert.equal(validCode('EB04-061'), true);
  assert.equal(validCode('../etc'), false);
});

test('topCards : top 5 par moyenne 7 jours, extension majoritaire incluse, autres séries exclues', () => {
  const products = [
    { idProduct: 1, name: 'Luffy (OP16-118) (V.2)', idExpansion: 50 },
    { idProduct: 2, name: 'Zoro (OP16-050)', idExpansion: 50 },
    { idProduct: 3, name: 'Nami (OP16-001)', idExpansion: 50 },
    { idProduct: 4, name: 'Ace (OP13-119)', idExpansion: 49 }, // autre série
    { idProduct: 5, name: 'Shanks (ST01-001) (V.3)', idExpansion: 50 }, // réédition dans l'extension OP16
    { idProduct: 6, name: 'Law (OP16-060)', idExpansion: 50 }, // sans prix
    { idProduct: 7, name: 'Yamato (OP16-070)', idExpansion: 50 },
    { idProduct: 8, name: 'Hancock (OP16-080)', idExpansion: 50 },
  ];
  const guides = [
    { idProduct: 1, avg7: 950, trend: 900 },
    { idProduct: 2, avg7: 12.5 },
    { idProduct: 3, avg7: null, trend: 40 },
    { idProduct: 4, avg7: 2000 },
    { idProduct: 5, avg7: 300 },
    { idProduct: 7, avg7: 20 },
    { idProduct: 8, avg7: 5 },
  ];
  const top = topCards(products, guides, 'OP16');
  assert.deepEqual(top.map((c) => c.idProduct), [1, 5, 3, 7, 2]);
  assert.equal(top[0].avg7, 950);
  assert.equal(top[2].price, 40); // repli sur la tendance si pas de moyenne 7 j
  assert.deepEqual(topCards(products, guides, 'OP18'), []);
});

test('looksLikeOnePiece', () => {
  const op = Array.from({ length: 120 }, (_, i) => ({ name: `Carte (OP01-${String(i).padStart(3, '0')})` }));
  assert.equal(looksLikeOnePiece(op), true);
  assert.equal(looksLikeOnePiece([{ name: 'Pikachu' }]), false);
});

test('photo Cardmarket : adresses (extension -JP puis standard) et langue déduite', async () => {
  const { cardmarketImageUrls, languageFromSource } = await import('../server/cardImages.js');
  const urls = cardmarketImageUrls(18, 'OP16', 812345);
  assert.equal(urls[0], 'https://product-images.s3.cardmarket.com/18/OP16-JP/812345/812345.jpg');
  assert.ok(urls.includes('https://product-images.s3.cardmarket.com/18/OP16/812345/812345.jpg'));
  assert.deepEqual(cardmarketImageUrls(null, 'OP16', 1), []);
  assert.equal(languageFromSource(urls[0], 'OP16'), 'JP');
  assert.equal(languageFromSource('https://product-images.s3.cardmarket.com/18/OP16/1/1.jpg', 'OP16'), 'EN');
  assert.equal(languageFromSource('https://optcgapi.com/img/OP16-065.jpg', 'OP16'), null);
});

test('expansionPrefixes et topCards : extension et lien d’image avec id', async () => {
  const { expansionPrefixes } = await import('../server/cardmarket.js');
  const products = [
    { idProduct: 1, name: 'Sakazuki (OP16-065) (V.1)', idExpansion: 70 },
    { idProduct: 2, name: 'Sakazuki (OP16-065) (V.1)', idExpansion: 71 },
    { idProduct: 3, name: 'Luffy (EB04-061)', idExpansion: 70 },
    { idProduct: 4, name: 'Kuzan (OP16-063)', idExpansion: 70 },
  ];
  const pre = expansionPrefixes(products);
  assert.equal(pre.get(70), 'OP16');
  const top = topCards(products, [{ idProduct: 1, avg7: 900 }, { idProduct: 2, avg7: 1300 }, { idProduct: 3, avg7: 50 }], 'OP16', 5, pre);
  assert.deepEqual(top.map((c) => c.idProduct), [2, 1, 3]);
  assert.equal(top[2].expansion, 'OP16'); // EB04-061 imprimée dans l'extension OP16
  assert.equal(top[0].images[0], '/api/card-image?code=OP16-065&v=1&id=2&exp=OP16');
});

test('westernExpansion : extension EN/FR = la plus récente (le japonais sort avant), sinon la plus chère', async () => {
  const { westernExpansion, chaseCards } = await import('../server/cardmarket.js');
  const mk = (exp, date, n0 = 0) =>
    Array.from({ length: 12 }, (_, i) => ({ idProduct: exp * 100 + i, name: `Carte (OP16-${String(i + 1).padStart(3, '0')})${i % 4 === 3 ? ' (V.2)' : ''}`, idExpansion: exp, dateAdded: date }));
  const jp = mk(80, '2026-05-20 10:00:00');
  const en = mk(81, '2026-06-05 09:00:00');
  const guides = [...jp.map((p) => ({ idProduct: p.idProduct, avg7: 5 })), ...en.map((p) => ({ idProduct: p.idProduct, avg7: 9 }))];
  const r = westernExpansion([...jp, ...en], guides, 'OP16');
  assert.equal(r.western, 81);
  assert.equal(r.method, 'date');
  // Sans dates : la plus chère.
  const strip = (l) => l.map(({ dateAdded, ...p }) => p);
  assert.equal(westernExpansion([...strip(jp), ...strip(en)], guides, 'OP16').western, 81);
  // Chase cards : uniquement les versions alternatives de l'extension EN/FR, triées par prix.
  guides.find((g) => g.idProduct === 8107).avg7 = 250;
  const chase = chaseCards([...jp, ...en], guides, 81);
  assert.deepEqual(chase.map((c) => c.idProduct), [8107, 8103, 8111]);
  assert.ok(chase.every((c) => c.variant >= 2));
  assert.equal(chase[0].images[0], '/api/card-image?code=OP16-008&v=2');
});
