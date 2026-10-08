import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIcons, googleFavicon } from '../server/logos.js';

test('parseIcons : apple-touch-icon, puis plus grande icône, puis replis', () => {
  const html = `
    <link rel="icon" type="image/png" href="//cdn.shopify.com/s/files/favicon_32x32.png?v=1" sizes="32x32">
    <link rel="mask-icon" href="/safari.svg">
    <link rel='icon' href='/icon-192.png' sizes='192x192'>
    <link href="/apple.png" rel="apple-touch-icon">
    <link rel="stylesheet" href="/style.css">`;
  const urls = parseIcons(html, 'https://shop.fr/');
  assert.deepEqual(urls, [
    'https://shop.fr/apple.png',
    'https://shop.fr/icon-192.png',
    'https://cdn.shopify.com/s/files/favicon_32x32.png?v=1',
    'https://shop.fr/apple-touch-icon.png',
    'https://shop.fr/favicon.ico',
  ]);
});

test('parseIcons sans balise : replis standards', () => {
  assert.deepEqual(parseIcons('<html></html>', 'https://www.x.fr/page'), ['https://www.x.fr/apple-touch-icon.png', 'https://www.x.fr/favicon.ico']);
});

test('googleFavicon', () => {
  assert.equal(googleFavicon('philibertnet.com'), 'https://www.google.com/s2/favicons?domain=philibertnet.com&sz=128');
});
