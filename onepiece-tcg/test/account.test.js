import test from 'node:test';
import assert from 'node:assert/strict';
import { mergePrefs } from '../public/account.js';

test('mergePrefs : le compte prime, les ajouts faits sur l’appareil sont conservés', () => {
  const remote = {
    favoriteSeries: ['OP16'],
    favoriteShops: ['philibert'],
    customShops: [{ id: 'custom:a.fr', name: 'A' }],
    owned: { 1: { name: 'Luffy' } },
  };
  const local = {
    customShops: [{ id: 'custom:a.fr', name: 'A (local)' }, { id: 'custom:b.fr', name: 'B' }],
    owned: { 2: { name: 'Zoro' } },
  };
  const m = mergePrefs(remote, local);
  assert.deepEqual(m.favoriteSeries, ['OP16']);
  assert.deepEqual(m.favoriteShops, ['philibert']);
  assert.deepEqual(m.customShops.map((s) => s.name), ['A', 'B']);
  assert.deepEqual(Object.keys(m.owned).sort(), ['1', '2']);
});

test('mergePrefs : premier compte (aucune donnée distante)', () => {
  const m = mergePrefs(null, { customShops: [], owned: {} });
  assert.deepEqual(m, { favoriteSeries: [], favoriteShops: [], customShops: [], owned: {} });
});
