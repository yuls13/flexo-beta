// Méthodes de lecture des boutiques. Chaque plateforme a plusieurs méthodes, essayées dans l'ordre
// (API officielle, puis page de recherche HTML, puis données structurées). La méthode qui
// fonctionne est mémorisée par boutique pour les requêtes suivantes.
import { searchShopify } from './shopify.js';
import { searchWoo } from './woocommerce.js';
import { prestaAjax, prestaHtml } from './prestashop.js';
import { parseJsonLd, parseWooHtml, shopifyHandles, parseShopifyProductJs, parseProductCards } from './html.js';
import { fetchJson, fetchText, pool } from '../http.js';

async function wooHtml(shop, query) {
  const u = new URL('/', shop.base);
  u.searchParams.set('s', query);
  u.searchParams.set('post_type', 'product');
  const { text, url } = await fetchText(u.href);
  // Un seul résultat : WooCommerce redirige directement vers la fiche produit (JSON-LD).
  for (const parse of [parseWooHtml, parseJsonLd, parseProductCards]) {
    const items = parse(text, url);
    if (items.length) return items;
  }
  return [];
}

async function shopifyHtml(shop, query) {
  const u = new URL('/search', shop.base);
  u.searchParams.set('q', query);
  u.searchParams.set('type', 'product');
  u.searchParams.set('options[prefix]', 'last');
  const { text } = await fetchText(u.href);
  const handles = shopifyHandles(text, 10);
  const found = await pool(handles, 4, async (h) => {
    try {
      const { json } = await fetchJson(new URL(`/products/${h}.js`, shop.base).href, { timeoutMs: 8000 });
      return parseShopifyProductJs(json, shop.base);
    } catch {
      return null;
    }
  });
  return found.filter(Boolean);
}

async function genericSearch(shop, query) {
  for (const path of [`/search?q=${encodeURIComponent(query)}`, `/recherche?s=${encodeURIComponent(query)}`]) {
    try {
      const { text, url } = await fetchText(new URL(path, shop.base).href);
      for (const parse of [parseJsonLd, parseProductCards]) {
        const items = parse(text, url);
        if (items.length) return items;
      }
    } catch {
      /* chemin suivant */
    }
  }
  return [];
}

// api: true → une réponse valide (même vide) fait foi ; sinon une page vide est jugée non concluante.
export const STRATEGIES = {
  shopifySuggest: { label: 'Shopify (API de recherche)', run: searchShopify, api: true },
  shopifyHtml: { label: 'Shopify (page de recherche + fiches produit)', run: shopifyHtml },
  wooApi: { label: 'WooCommerce (API Store)', run: searchWoo, api: true },
  wooHtml: { label: 'WooCommerce (page de recherche)', run: wooHtml },
  prestaAjax: { label: 'PrestaShop (recherche JSON)', run: prestaAjax, api: true },
  prestaHtml: { label: 'PrestaShop (page de recherche)', run: prestaHtml },
  genericSearch: { label: 'Page de recherche (données structurées)', run: genericSearch },
};

export const PLATFORM_STRATEGIES = {
  shopify: ['shopifySuggest', 'shopifyHtml'],
  woocommerce: ['wooApi', 'wooHtml'],
  prestashop: ['prestaAjax', 'prestaHtml'],
  auto: ['shopifySuggest', 'wooApi', 'prestaAjax', 'wooHtml', 'prestaHtml', 'shopifyHtml', 'genericSearch'],
};

export const PLATFORMS = Object.keys(PLATFORM_STRATEGIES);

const memo = new Map(); // domaine -> méthode qui a fonctionné

export async function searchShop(shop, query) {
  const names = PLATFORM_STRATEGIES[shop.platform] || [];
  const preferred = memo.get(shop.domain);
  const order = preferred && names.includes(preferred) ? [preferred, ...names.filter((n) => n !== preferred)] : names;
  const errors = [];
  let answered = false;
  for (const name of order) {
    const strategy = STRATEGIES[name];
    try {
      const items = await strategy.run(shop, query);
      answered = true;
      if (strategy.api || items.length) {
        memo.set(shop.domain, name);
        return { items, strategy: name };
      }
    } catch (err) {
      errors.push(err);
    }
  }
  if (answered) return { items: [], strategy: null };
  // Toutes les méthodes ont échoué : on remonte l'erreur la plus parlante (blocage identifié).
  throw errors.find((e) => / – /.test(e.message)) || errors[0] || new Error('aucune méthode de lecture disponible');
}

const CODE_RE = /^[A-Z]{2,3}-?\d{2}$/i;

// Requêtes envoyées à une boutique pour une série. La recherche Shopify ne renvoie que 10 produits :
// on la précise par type de produit pour éviter d'être noyé sous les cartes à l'unité.
export function queriesFor(platform, series) {
  const base = series.queries || [];
  if (series.special || !['shopify', 'auto'].includes(platform)) return base;
  const out = [];
  for (const q of base) {
    if (CODE_RE.test(q) && platform === 'shopify') out.push(...['display', 'booster box', 'booster', 'double pack'].map((s) => `${q} ${s}`));
    else out.push(q);
  }
  return [...new Set(out)];
}
