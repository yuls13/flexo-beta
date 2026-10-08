import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCardName, topCards, looksLikeOnePiece, cardImages } from '../server/cardmarket.js';

test('parseCardName', () => {
  assert.deepEqual(parseCardName('Shanks (OP17-022) (V.2)'), { code: 'OP17-022', variant: 2, base: 'Shanks' });
  assert.deepEqual(parseCardName('Monkey.D.Luffy (OP16-118)'), { code: 'OP16-118', variant: 1, base: 'Monkey.D.Luffy' });
});

test('cardImages : version alternative puis image de base', () => {
  const imgs = cardImages('OP16-118', 2);
  assert.match(imgs[0], /OP16-118_p1\.png$/);
  assert.ok(imgs.some((u) => u.endsWith('/OP16-118.png')));
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
