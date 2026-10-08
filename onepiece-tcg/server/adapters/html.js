// Lecture de pages HTML quand l'API d'une boutique n'est pas accessible :
// données structurées JSON-LD (Product / ItemList), vignettes WooCommerce, liens produits Shopify.
import { parsePrice } from '../classify.js';
import { decodeEntities } from './woocommerce.js';

const clean = (s) => decodeEntities(String(s || '')).replace(/\s+/g, ' ').trim();

function availabilityOf(value) {
  const v = String(value || '').toLowerCase();
  if (/preorder|presale/.test(v)) return { available: true, preorder: true };
  if (/backorder/.test(v)) return { available: true, preorder: true };
  if (/instock|limitedavailability|onlineonly/.test(v)) return { available: true };
  if (/outofstock|soldout|discontinued/.test(v)) return { available: false };
  return { available: null };
}

// Produits décrits en JSON-LD (fiches produit, listes de résultats).
export function parseJsonLd(html, baseUrl) {
  const out = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    const type = [].concat(node['@type'] || []).join(' ');
    if (/\bProduct\b/.test(type) && node.name) {
      const offers = [].concat(node.offers || []).flatMap((o) => (o?.offers ? [].concat(o.offers) : [o]));
      const offer = offers.find((o) => o && (o.price != null || o.lowPrice != null)) || {};
      const price = parsePrice(String(offer.price ?? offer.lowPrice ?? ''));
      let url = node.url || offer.url || null;
      try {
        url = url ? new URL(url, baseUrl).href : null;
      } catch {
        url = null;
      }
      out.push({
        title: clean(node.name),
        price,
        url: url || baseUrl,
        ...availabilityOf(offer.availability),
        image: (() => {
          const img = [].concat(node.image || [])[0];
          return typeof img === 'string' ? img : img?.url || null;
        })(),
      });
    }
    for (const key of ['@graph', 'itemListElement', 'item', 'mainEntity']) if (node[key]) visit(node[key]);
  };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(m[1].trim()));
    } catch {
      /* bloc JSON-LD invalide : ignoré */
    }
  }
  return out.filter((p) => p.title);
}

// Résultats de recherche WooCommerce (?s=…&post_type=product).
export function parseWooHtml(html, baseUrl) {
  const out = [];
  const blocks = html.split(/<li[^>]+class="[^"]*\bproduct\b[^"]*"/i).slice(1);
  const classes = [...html.matchAll(/<li[^>]+class="([^"]*\bproduct\b[^"]*)"/gi)].map((m) => m[1]);
  blocks.forEach((block, i) => {
    const chunk = block.slice(0, 8000);
    const title = chunk.match(/class="[^"]*(?:woocommerce-loop-product__title|product-title|product_title)[^"]*"[^>]*>([\s\S]*?)<\/(?:h\d|a|p|div|span)>/i)?.[1];
    const href = chunk.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*woocommerce-LoopProduct-link/i)?.[1] || chunk.match(/<a[^>]+href="([^"]+)"/i)?.[1];
    if (!title || !href) return;
    // Prix : zone .price ; si promotion, le montant barré est dans <del> et le prix réel dans <ins>.
    const zoneStart = chunk.search(/class="[^"]*\bprice\b/i);
    const zone = zoneStart >= 0 ? chunk.slice(zoneStart, zoneStart + 1500) : '';
    const target = zone.match(/<ins[^>]*>([\s\S]*?)<\/ins>/i)?.[1] || zone.replace(/<del[^>]*>[\s\S]*?<\/del>/gi, '');
    const amountAt = target.indexOf('woocommerce-Price-amount');
    const amount = amountAt >= 0 ? clean(target.slice(amountAt, amountAt + 250).replace(/^[^>]*>/, '')).split(/\s{2,}|€\s/)[0] : null;
    const cls = classes[i] || '';
    out.push({
      title: clean(title),
      price: amount ? parsePrice(clean(amount)) : null,
      url: new URL(href, baseUrl).href,
      available: /\boutofstock\b/.test(cls) ? false : /\binstock\b|\bonbackorder\b/.test(cls) ? true : null,
      preorder: /\bonbackorder\b/.test(cls) || /pr[ée]-?commande/i.test(chunk) || undefined,
      image: chunk.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i)?.[1] || null,
    });
  });
  return out;
}

// Liens vers des fiches produit Shopify trouvés dans une page de recherche.
export function shopifyHandles(html, limit = 12) {
  const handles = [];
  for (const m of html.matchAll(/href="(?:https?:\/\/[^"/]+)?(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/products\/([a-z0-9][a-z0-9\-_%.]*)/gi)) {
    const h = m[1].split(/[?#]/)[0];
    if (!handles.includes(h)) handles.push(h);
    if (handles.length >= limit) break;
  }
  return handles;
}

// Fiche produit Shopify au format JSON (/products/<handle>.js) : prix en centimes.
export function parseShopifyProductJs(json, base) {
  if (!json?.title) return null;
  return {
    title: json.title,
    price: typeof json.price === 'number' ? json.price / 100 : parsePrice(String(json.price ?? '')),
    url: new URL(json.url || `/products/${json.handle}`, base).href,
    available: typeof json.available === 'boolean' ? json.available : null,
    image: json.featured_image ? new URL(json.featured_image, base).href : null,
  };
}
