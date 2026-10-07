import test from 'node:test';
import assert from 'node:assert/strict';
import { parseShopify, shopifyQueries } from '../server/adapters/shopify.js';
import { parseWoo } from '../server/adapters/woocommerce.js';
import { parsePresta, parsePrestaHtml } from '../server/adapters/prestashop.js';

test('Shopify suggest.json', () => {
  const json = {
    resources: {
      results: {
        products: [
          { title: 'Display One Piece OP-17 japonais - 24 boosters', price: '139.90', url: '/products/display-op17-jp?_pos=1', available: false, image: 'https://cdn/x.jpg' },
        ],
      },
    },
  };
  const [p] = parseShopify(json, 'https://vcollect.fr');
  assert.equal(p.price, 139.9);
  assert.equal(p.url, 'https://vcollect.fr/products/display-op17-jp');
  assert.equal(p.available, false);
  assert.deepEqual(shopifyQueries(['OP17'], {}), ['OP17 display', 'OP17 booster', 'OP17 double pack']);
});

test('WooCommerce Store API', () => {
  const json = [
    {
      name: 'Display OP16 &#8211; L&rsquo;heure de la Bataille Décisive &#8211; FR',
      permalink: 'https://ecardstore.fr/product/display-op16/',
      prices: { price: '16990', currency_minor_unit: 2 },
      is_in_stock: true,
      images: [{ src: 'https://ecardstore.fr/a.jpg' }],
    },
  ];
  const [p] = parseWoo(json);
  assert.equal(p.price, 169.9);
  assert.equal(p.available, true);
  assert.match(p.title, /Display OP16 – L/);
});

test('PrestaShop JSON (ajax=1)', () => {
  const json = {
    products: [
      { name: 'Display One Piece OP16 FR', price: '209,90 €', price_amount: 209.9, url: 'https://www.variantes.com/x.html', availability: 'unavailable' },
      { name: 'Booster OP16 FR', price: '5,99 €', url: 'https://www.variantes.com/y.html', availability: 'available', availability_message: 'Précommande - disponible le 12/06' },
    ],
  };
  const [a, b] = parsePresta(json);
  assert.equal(a.price, 209.9);
  assert.equal(a.available, false);
  assert.equal(b.price, 5.99);
  assert.equal(b.preorder, true);
});

test('PrestaShop HTML (repli)', () => {
  const html = `
    <article class="product-miniature js-product-miniature" data-id-product="1">
      <img src="/img/1.jpg"><h3 class="h3 product-title"><a href="/one-piece/1-display-op16-fr.html">Display OP16 FR</a></h3>
      <span class="price" aria-label="Prix">129,90&nbsp;€</span>
    </article>
    <article class="product-miniature js-product-miniature" data-id-product="2">
      <h3 class="h3 product-title"><a href="https://shop.fr/2-booster.html">Booster OP16 FR</a></h3>
      <span class="price">5,50 €</span><span class="product-flag out_of_stock">Rupture</span>
    </article>`;
  const [a, b] = parsePrestaHtml(html, 'https://shop.fr/recherche?s=OP16');
  assert.equal(a.title, 'Display OP16 FR');
  assert.equal(a.price, 129.9);
  assert.equal(a.url, 'https://shop.fr/one-piece/1-display-op16-fr.html');
  assert.equal(b.available, false);
});
