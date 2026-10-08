// Cartes les plus chères d'une série, d'après les fichiers publics de Cardmarket
// (catalogue des cartes + « price guide » recalculé chaque nuit : avg7 = prix de vente moyen sur 7 jours).
import { fetchJson } from './http.js';

const BASE = 'https://downloads.s3.cardmarket.com/productCatalog';
const TTL_MS = 12 * 60 * 60 * 1000;
// Identifiant du jeu One Piece chez Cardmarket : 18 par défaut, sinon détection automatique
// (on évite Magic=1, Yu-Gi-Oh=3, Pokémon=6, dont les fichiers sont très lourds).
const CANDIDATE_GAME_IDS = [18, 19, 17, 20, 21, 22, 23, 24, 16, 15, 13, 25, 26, 27, 28, 29, 30, 2, 4, 5, 7, 8, 9, 10, 11, 12, 14];
const CARD_CODE = /\(((?:OP|EB|ST|PRB|P)\d{0,2}-\d{3})\)/i;

const productsUrl = (id) => `${BASE}/productList/products_singles_${id}.json`;
const guideUrl = (id) => `${BASE}/priceGuide/price_guide_${id}.json`;

// Les fichiers ont la forme { version, createdAt, products: [...] } / { ..., priceGuides: [...] } ;
// on reste tolérant sur le nom de la clé.
function arrayIn(json, preferred) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.[preferred])) return json[preferred];
  return Object.values(json || {}).find(Array.isArray) || [];
}

export function looksLikeOnePiece(products) {
  let n = 0;
  for (const p of products) if (CARD_CODE.test(p.name || '')) if (++n >= 100) return true;
  return false;
}

export function parseCardName(name) {
  const code = name.match(CARD_CODE)?.[1]?.toUpperCase() || null;
  const variant = parseInt(name.match(/\(V\.(\d+)\)/i)?.[1] || '1', 10);
  const base = name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return { code, variant, base };
}

export function cardImages(code, variant) {
  if (!code) return [];
  const suffix = variant > 1 ? `_p${variant - 1}` : '';
  const hosts = ['https://en.onepiece-cardgame.com', 'https://asia-en.onepiece-cardgame.com', 'https://www.onepiece-cardgame.com'];
  const files = suffix ? [`${code}${suffix}.png`, `${code}.png`] : [`${code}.png`];
  return files.flatMap((f) => hosts.map((h) => `${h}/images/cardlist/card/${f}`));
}

// Sélection des cartes d'une série : code de carte de la série + toutes les cartes de
// l'extension Cardmarket majoritaire (utile pour les rééditions PRB qui gardent leurs anciens codes).
export function topCards(products, guides, seriesId, limit = 5) {
  const prefix = seriesId.toUpperCase();
  const byId = new Map(guides.map((g) => [g.idProduct, g]));
  const matched = products.filter((p) => parseCardName(p.name || '').code?.startsWith(`${prefix}-`));
  if (!matched.length) return [];
  const counts = new Map();
  for (const p of matched) counts.set(p.idExpansion, (counts.get(p.idExpansion) || 0) + 1);
  const mainExpansion = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const pool = new Map(matched.map((p) => [p.idProduct, p]));
  if (mainExpansion != null) for (const p of products) if (p.idExpansion === mainExpansion) pool.set(p.idProduct, p);

  return [...pool.values()]
    .map((p) => {
      const g = byId.get(p.idProduct) || {};
      const price = g.avg7 ?? g.trend ?? null;
      const { code, variant, base } = parseCardName(p.name);
      return {
        idProduct: p.idProduct,
        name: base,
        fullName: p.name,
        code,
        variant,
        avg7: g.avg7 ?? null,
        trend: g.trend ?? null,
        low: g.low ?? null,
        price,
        images: cardImages(code, variant),
        url: `https://www.cardmarket.com/fr/OnePiece/Products/Search?searchString=${encodeURIComponent(`${base} ${code || ''}`.trim())}`,
      };
    })
    .filter((c) => c.price != null && c.price > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, limit);
}

export function createCardmarketService({ gameId = process.env.CARDMARKET_GAME_ID } = {}) {
  let data = null; // { products, guides, createdAt, at, gameId }
  let loading = null;
  let lastError = null;

  async function detectGameId() {
    const ids = gameId ? [Number(gameId)] : CANDIDATE_GAME_IDS;
    for (const id of ids) {
      try {
        const { json } = await fetchJson(productsUrl(id), { timeoutMs: 30000 });
        const products = arrayIn(json, 'products');
        if (looksLikeOnePiece(products)) return { id, products };
      } catch {
        /* fichier absent ou inaccessible : identifiant suivant */
      }
    }
    throw new Error('catalogue One Piece introuvable chez Cardmarket');
  }

  async function load() {
    const { id, products } = data?.gameId ? await reloadProducts(data.gameId) : await detectGameId();
    const { json } = await fetchJson(guideUrl(id), { timeoutMs: 30000 });
    data = { products, guides: arrayIn(json, 'priceGuides'), createdAt: json?.createdAt || null, at: Date.now(), gameId: id };
    lastError = null;
  }

  async function reloadProducts(id) {
    const { json } = await fetchJson(productsUrl(id), { timeoutMs: 30000 });
    return { id, products: arrayIn(json, 'products') };
  }

  async function ensure() {
    if (data && Date.now() - data.at < TTL_MS) return;
    if (!loading) {
      loading = load()
        .catch((err) => {
          lastError = err.message;
          if (data) data.at = Date.now() - TTL_MS + 30 * 60 * 1000; // on garde l'ancien, nouvel essai dans 30 min
        })
        .finally(() => (loading = null));
    }
    await loading;
  }

  async function getTop(seriesId) {
    await ensure();
    if (!data) return { available: false, error: lastError || 'données Cardmarket indisponibles', cards: [] };
    return { available: true, source: 'cardmarket', updatedAt: data.createdAt, cards: topCards(data.products, data.guides, seriesId) };
  }

  return { getTop };
}
