// Boutiques PrestaShop 1.7+ : la page de recherche renvoie du JSON quand on ajoute ajax=1.
import { fetchJson, fetchText } from '../http.js';
import { parsePrice } from '../classify.js';
import { decodeEntities } from './woocommerce.js';
import { parseJsonLd } from './html.js';

export function parsePresta(json) {
  const products = json?.products || [];
  return products.map((p) => {
    const availability = p.availability || '';
    const msg = `${p.availability_message || ''} ${p.availability_date || ''}`;
    return {
      title: decodeEntities(p.name || ''),
      price: parsePrice(p.price_amount ?? p.price),
      url: p.url || p.link,
      available:
        availability === 'unavailable' ? false : availability ? true : p.quantity != null ? p.quantity > 0 : null,
      preorder: /pr[ée]-?commande|pre-?order|disponible le|sortie le/i.test(msg) || undefined,
      image: p.cover?.bySize?.home_default?.url || p.cover?.medium?.url || p.cover?.small?.url || null,
    };
  });
}

// Repli : lecture des vignettes produits dans le HTML de la page de recherche
// (thèmes PrestaShop 1.6 / 1.7 : article.product-miniature, .product-container…).
export function parsePrestaHtml(html, base) {
  const out = [];
  const blocks = html.split(/<(?:article|div|li)[^>]+class="[^"]*(?:product-miniature|product-container|ajax_block_product)[^"]*"/i).slice(1);
  for (const block of blocks) {
    const chunk = block.slice(0, 6000);
    const link =
      chunk.match(/class="[^"]*product-(?:title|name)[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ||
      chunk.match(/<a[^>]+class="[^"]*product-name[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ||
      chunk.match(/<a[^>]+href="([^"]+)"[^>]+class="[^"]*product-name[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const title = decodeEntities(link[2]).replace(/\s+/g, ' ').trim();
    const priceM =
      chunk.match(/itemprop="price"[^>]*content="([\d.,]+)"/i) ||
      chunk.match(/class="[^"]*\bprice\b[^"]*"[^>]*>\s*([^<]*\d[^<]*)</i);
    const unavailable = /out-of-stock|rupture|[ée]puis[ée]|indisponible|unavailable/i.test(chunk);
    out.push({
      title,
      price: priceM ? parsePrice(priceM[1]) : null,
      url: new URL(link[1], base).href,
      available: unavailable ? false : null,
      preorder: /pr[ée]-?commande/i.test(chunk) || undefined,
      image: (chunk.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i) || [])[1] || null,
    });
  }
  return out;
}

function searchUrl(shop, query, ajax) {
  const u = new URL(shop.base.replace(/\/$/, '') + (shop.searchPath || '/index.php'));
  if (!shop.searchPath) u.searchParams.set('controller', 'search');
  u.searchParams.set('s', query);
  u.searchParams.set('search_query', query); // PrestaShop 1.6
  u.searchParams.set('resultsPerPage', '48');
  if (ajax) u.searchParams.set('ajax', '1');
  return u.href;
}

// Méthode 1 : page de recherche en JSON (ajax=1).
export async function prestaAjax(shop, query) {
  const { json } = await fetchJson(searchUrl(shop, query, true), {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!Array.isArray(json?.products)) throw new Error('format PrestaShop inattendu');
  return parsePresta(json);
}

// Méthode 2 : page de recherche HTML (vignettes produits, sinon données JSON-LD).
export async function prestaHtml(shop, query) {
  const { text, url } = await fetchText(searchUrl(shop, query, false));
  const items = parsePrestaHtml(text, url);
  return items.length ? items : parseJsonLd(text, url);
}
