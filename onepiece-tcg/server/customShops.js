// Boutiques ajoutées par l'utilisateur : détection de la plateforme et validation.
// La liste est conservée dans le navigateur et renvoyée au serveur à chaque recherche,
// pour fonctionner aussi sur un hébergeur sans disque persistant.
import { fetchJson, fetchText } from './http.js';
import { sanitizeDomain, rootDomain } from './trust.js';
import { decodeEntities } from './adapters/woocommerce.js';

import { PLATFORMS } from './adapters/index.js';

export const MAX_CUSTOM_SHOPS = 10;

// Empreintes de plateforme visibles dans le code de la page d'accueil.
export function fingerprint(html) {
  if (/cdn\.shopify\.com|Shopify\.theme|shopify-section/i.test(html)) return 'shopify';
  if (/woocommerce|wc-block|\/wp-content\/plugins\/woocommerce/i.test(html)) return 'woocommerce';
  if (/var prestashop\s*=|prestashop|\/modules\/ps_|\/themes\/[^"']+\/assets\/cache/i.test(html)) return 'prestashop';
  return null;
}

async function probe(fn) {
  try {
    return await fn();
  } catch {
    return false;
  }
}

// Essaie chaque plateforme connue sur le domaine ; renvoie la première qui répond au format attendu.
export async function detectPlatform(base) {
  const shopify = await probe(async () => {
    const u = new URL('/search/suggest.json', base);
    u.searchParams.set('q', 'one piece');
    u.searchParams.set('resources[type]', 'product');
    const { json } = await fetchJson(u.href, { timeoutMs: 8000 });
    return !!json?.resources?.results;
  });
  if (shopify) return 'shopify';

  const woo = await probe(async () => {
    const { json } = await fetchJson(new URL('/wp-json/wc/store/v1/products?per_page=1', base).href, { timeoutMs: 8000 });
    return Array.isArray(json);
  });
  if (woo) return 'woocommerce';

  const presta = await probe(async () => {
    const u = new URL('/index.php', base);
    u.searchParams.set('controller', 'search');
    u.searchParams.set('s', 'one piece');
    u.searchParams.set('ajax', '1');
    const { json } = await fetchJson(u.href, { timeoutMs: 8000, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    return Array.isArray(json?.products);
  });
  if (presta) return 'prestashop';
  return null;
}

export function guessName(html, domain) {
  const og = html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]{2,60})"/i)?.[1];
  const title = html.match(/<title[^>]*>([^<]{2,120})<\/title>/i)?.[1];
  const raw = og || (title ? title.split(/\s[|\-–—:]\s/)[0] : '') || domain;
  return decodeEntities(raw).trim().slice(0, 40);
}

export async function inspectShop(input) {
  const clean = await sanitizeDomain(input);
  if (!clean) return { error: 'Adresse de site invalide' };
  if (clean.unresolved) return { error: 'Ce site est introuvable (le nom de domaine ne répond pas)' };
  const base = `https://${clean.host}`;
  let name = rootDomain(clean.host);
  let print = null;
  try {
    const { text } = await fetchText(`${base}/`, { timeoutMs: 8000 });
    name = guessName(text, name);
    print = fingerprint(text);
  } catch {
    /* le nom par défaut suffit */
  }
  // Plateforme confirmée par son API, sinon empreinte de la page, sinon détection automatique
  // (toutes les méthodes de lecture seront essayées à chaque recherche).
  const platform = (await detectPlatform(base)) || print || 'auto';
  return { domain: clean.host, base, name, platform, confirmed: platform !== 'auto' };
}

export function customShopId(domain) {
  return `custom:${rootDomain(domain)}`;
}

// Paramètre `custom` de /api/prices : « domaine|plateforme|nom » séparés par des virgules.
// Renvoie les boutiques valides et celles écartées (avec la raison, affichée dans l'interface).
// `resolve` vérifie qu'un domaine est public (remplaçable dans les tests, sans réseau).
export async function parseCustomParam(param, { knownDomains, blacklist, resolve = sanitizeDomain }) {
  const shops = [];
  const rejected = [];
  if (!param) return { shops, rejected };
  const entries = String(param).split(',').slice(0, MAX_CUSTOM_SHOPS);
  const black = new Set(blacklist.map((b) => rootDomain(b.domain)));
  for (const entry of entries) {
    const [domainRaw, platformRaw, nameRaw] = entry.split('|').map((x) => decodeURIComponent(x || ''));
    const platform = platformRaw === 'link' ? 'auto' : platformRaw;
    const name = (nameRaw || domainRaw).replace(/[<>]/g, '').slice(0, 40);
    const reject = (reason) => rejected.push({ id: customShopId(domainRaw || '?'), name, custom: true, status: 'error', error: reason, found: 0, matched: 0 });
    if (!PLATFORMS.includes(platform)) {
      reject('plateforme inconnue');
      continue;
    }
    const clean = await resolve(domainRaw);
    if (!clean) {
      reject('adresse invalide ou interne');
      continue;
    }
    if (clean.unresolved) {
      reject('domaine introuvable (DNS)');
      continue;
    }
    const root = rootDomain(clean.host);
    if (black.has(root)) {
      reject('site signalé comme arnaque');
      continue;
    }
    if (knownDomains.has(root) || shops.some((s) => rootDomain(s.domain) === root)) continue;
    shops.push({
      id: customShopId(clean.host),
      name: name || root,
      domain: clean.host,
      base: `https://${clean.host}`,
      platform,
      country: 'FR',
      custom: true,
    });
  }
  return { shops, rejected };
}
