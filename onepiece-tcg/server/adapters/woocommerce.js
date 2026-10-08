// Boutiques WooCommerce : API publique « Store API » (/wp-json/wc/store/v1/products).
import { fetchJson } from '../http.js';

export function parseWoo(json) {
  if (!Array.isArray(json)) return [];
  return json.map((p) => {
    const minor = p.prices?.currency_minor_unit ?? 2;
    const raw = p.prices?.price;
    const price = raw != null && raw !== '' ? Number(raw) / 10 ** minor : null;
    return {
      title: decodeEntities(p.name || ''),
      price: Number.isFinite(price) && price > 0 ? price : null,
      url: p.permalink,
      available: typeof p.is_in_stock === 'boolean' ? p.is_in_stock : null,
      preorder: /pr[ée]-?commande|pre-?order/i.test(`${p.name} ${p.stock_availability?.text || ''}`) || undefined,
      backorder: p.is_on_backorder || undefined,
      image: p.images?.[0]?.thumbnail || p.images?.[0]?.src || null,
    };
  });
}

const NAMED_ENTITIES = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', euro: '€', eacute: 'é', egrave: 'è', ecirc: 'ê',
  agrave: 'à', acirc: 'â', ccedil: 'ç', icirc: 'î', iuml: 'ï', ocirc: 'ô', ugrave: 'ù', ucirc: 'û', Eacute: 'É', times: '×',
};

export function decodeEntities(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n] ?? m);
}

export async function searchWoo(shop, query) {
  const u = new URL('/wp-json/wc/store/v1/products', shop.base);
  u.searchParams.set('search', query);
  u.searchParams.set('per_page', '50');
  const { json } = await fetchJson(u.href);
  return parseWoo(json);
}
