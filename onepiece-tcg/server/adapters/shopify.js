// Boutiques Shopify : endpoint public de suggestions de recherche (/search/suggest.json).
// Il renvoie au plus 10 produits par requête (voir queriesFor dans adapters/index.js).
import { fetchJson } from '../http.js';
import { parsePrice } from '../classify.js';

export function parseShopify(json, base) {
  const products = json?.resources?.results?.products || [];
  return products.map((p) => ({
    title: p.title,
    price: parsePrice(p.price ?? p.price_min),
    url: new URL(p.url || `/products/${p.handle}`, base).href.split('?')[0],
    available: typeof p.available === 'boolean' ? p.available : null,
    image: p.image || p.featured_image?.url || null,
  }));
}

export async function searchShopify(shop, query) {
  const u = new URL('/search/suggest.json', shop.base);
  u.searchParams.set('q', query);
  u.searchParams.set('resources[type]', 'product');
  u.searchParams.set('resources[limit]', '10');
  u.searchParams.set('resources[options][unavailable_products]', 'last');
  u.searchParams.set('resources[options][fields]', 'title,product_type,variants.title,vendor,tag');
  const { json } = await fetchJson(u.href);
  return parseShopify(json, shop.base);
}
