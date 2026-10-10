import test from 'node:test';
import assert from 'node:assert/strict';
import { productPages, coverCandidates } from '../server/seriesCovers.js';

test('pages produit officielles candidates', () => {
  const pages = productPages('OP16');
  assert.ok(pages.includes('https://en.onepiece-cardgame.com/products/op16.html'));
  assert.ok(pages.includes('https://asia-en.onepiece-cardgame.com/products/boosters/op16.php'));
  assert.ok(productPages('EB03').some((p) => p.includes('/extra_boosters/eb03.php')));
});

test('image de pochette privilégiée sur une page produit', () => {
  const html = `
    <meta property="og:image" content="https://en.onepiece-cardgame.com/images/common/ogp.png">
    <img src="/images/common/logo.png">
    <img src="/images/products/boosters/op16/img_card01.png">
    <img src="/images/products/boosters/op16/img_pack.png">
    <img src="/images/products/boosters/op16/bg_main.jpg">`;
  const urls = coverCandidates(html, 'https://en.onepiece-cardgame.com/products/op16.html', 'OP16');
  assert.equal(urls[0], 'https://en.onepiece-cardgame.com/images/products/boosters/op16/img_pack.png');
  assert.ok(!urls.some((u) => u.includes('logo')));
  assert.equal(urls.at(-1), 'https://en.onepiece-cardgame.com/images/common/ogp.png');
});
