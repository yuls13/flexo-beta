import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classify, compileSeries, parsePrice, detectLang } from '../server/classify.js';

const { series: raw } = JSON.parse(fs.readFileSync(new URL('../server/config/series.json', import.meta.url)));
const S = Object.fromEntries(compileSeries(raw).map((s) => [s.id, s]));

test('display FR OP16', () => {
  assert.deepEqual(classify("Display 24 boosters OP16 - L'heure de la Bataille Décisive (FR)", S.OP16), { type: 'display', lang: 'FR', quantity: 1, inferred: false });
  assert.deepEqual(classify("Boite 24 boosters L'Heure de la Bataille Décisive OP16 (FR)", S.OP16)?.type, 'display');
});

test('booster box EN et display JP', () => {
  assert.deepEqual(classify('One Piece Card Game OP-17 Booster Box - English', S.OP17), { type: 'display', lang: 'EN', quantity: 1, inferred: false });
  assert.equal(classify('Display One Piece Japonais OP-17 - The World’s Strongest Warrior', S.OP17).lang, 'JP');
});

test('double pack et booster', () => {
  assert.equal(classify('One Piece Card Game - The Time Of Battle - Double Pack Set 11', S.OP16).type, 'duo');
  assert.equal(classify('Booster OP16 Français', S.OP16).type, 'booster');
  assert.equal(classify('Lot de 6 boosters OP16 FR', S.OP16).quantity, 6);
});

test('le mot « en » minuscule ne signifie pas anglais', () => {
  assert.equal(detectLang('Booster OP16 disponible en précommande'), null);
  assert.equal(detectLang('Display OP16 en français'), 'FR');
  assert.equal(detectLang('Display OP16 EN'), 'EN');
});

test('exclusions : cartes à l’unité, accessoires, autres jeux, autre série', () => {
  assert.equal(classify('OP16-118 Monkey D. Luffy SEC OP16', S.OP16), null);
  assert.equal(classify('Sleeves One Piece OP16 Luffy', S.OP16), null);
  assert.equal(classify('Case 12 displays OP16 FR', S.OP16), null);
  assert.equal(classify('Display Pokémon Évolutions', S.OP16), null);
  assert.equal(classify('Display OP15 FR', S.OP16), null);
});

test('EB04 ne capture pas les produits OP14-EB04', () => {
  assert.equal(classify('Display OP14-EB04 The Azure Sea’s Seven EN', S.EB04), null);
  assert.equal(classify('Display EB-04 Egghead Crisis Japonais', S.EB04).type, 'display');
  assert.equal(classify('Display OP14-EB04 The Azure Sea’s Seven EN', S.OP14).type, 'display');
});

test('onglet Starters : seulement starters et coffrets', () => {
  assert.equal(classify('One Piece Card Game Starter Deck ST-29 (FR)', S.STARTERS).type, 'starter');
  assert.equal(classify('One Piece Premium Card Collection Best Selection', S.STARTERS).type, 'coffret');
  assert.equal(classify('Display OP16 FR', S.STARTERS), null);
});

test('parsePrice', () => {
  assert.equal(parsePrice('129,90 €'), 129.9);
  assert.equal(parsePrice('1 299,90 €'), 1299.9);
  assert.equal(parsePrice('1.299,90'), 1299.9);
  assert.equal(parsePrice('1,299.90'), 1299.9);
  assert.equal(parsePrice('139.90'), 139.9);
  assert.equal(parsePrice(12), 12);
  assert.equal(parsePrice(''), null);
});

test('type déduit du prix quand le titre ne le précise pas', async () => {
  const { inferType } = await import('../server/classify.js');
  const t = "One Piece - The World’s Strongest Warriors - OP17 - en japonais";
  assert.deepEqual(classify(t, S.OP17, 199.99), { type: 'display', lang: 'JP', quantity: 1, inferred: true });
  assert.equal(classify(t, S.OP17, 3.5).type, 'booster');
  assert.equal(classify(t, S.OP17, 25), null); // prix ambigu : pas de déduction
  assert.equal(classify(t, S.OP17), null); // sans prix : pas de déduction
  assert.equal(classify('Display OP17 FR', S.OP17, 140).inferred, false);
  assert.equal(inferType(60, 'FR'), null);
  assert.equal(inferType(60, 'JP'), 'display');
});

test('Autres jeux écartés, même sans le mot « Pokémon » (codes EB des extensions Épée et Bouclier)', () => {
  // Cas réel : Hikaru Distribution, extension Pokémon EB05 « Styles de Combat ».
  assert.equal(classify('Display - Style de Combat - EB05 - Français', S.EB05, 559.9), null);
  assert.equal(classify('Display EB04 Voltage Éclatant', S.EB04, 150), null);
  assert.equal(classify('Pokémon EB05 Booster', S.EB05, 5), null);
  assert.equal(classify('Booster Box Disney Lorcana', S.OP13, 140), null);
  // Code EB seul : il faut « One Piece », le nom de la série ou une adresse de fiche One Piece.
  assert.equal(classify('Display EB05 Français', S.EB05, 150), null);
  assert.equal(classify('Display EB05 Français', S.EB05, 150, 'https://shop.fr/products/display-one-piece-eb05-fr')?.type, 'display');
  assert.equal(classify('Display EB05 Français', S.EB05, 150, 'https://shop.fr/products/display-pokemon-eb05-fr'), null);
  assert.equal(classify('Display - EB05 - FR', S.EB05, 150, 'https://shop.fr/fr/pokemon/123-display-eb05.html'), null);
  // Vrais produits One Piece : toujours reconnus.
  assert.equal(classify('One Piece Card Game EB-05 Heroines Edition Vol.2 Display (EN)', S.EB05)?.type, 'display');
  assert.equal(classify('Display Heroines Edition vol.2 EB05 FR', S.EB05)?.lang, 'FR');
  assert.equal(classify('Display One Piece EB-04 Egghead Crisis FR', S.EB04)?.type, 'display');
  assert.equal(classify('Booster OP16 Français', S.OP16)?.type, 'booster');
  assert.equal(classify('Booster PRB02 The Best Vol.2', S.PRB02)?.type, 'booster');
});

test('EB05 : « Heroine Edition » au singulier reconnu (titre Parkage)', () => {
  const t = 'One Piece Card Game - Display x24 Extra Booster Packs EB-05 Heroine Edition Vol.2';
  assert.equal(classify(t, S.EB05, 150)?.type, 'display');
  assert.equal(classify(t, S.EB03, 150), null);
  assert.equal(classify('Display Heroine Edition Vol.2 (EN) - One Piece', S.EB05, 150)?.lang, 'EN');
});
