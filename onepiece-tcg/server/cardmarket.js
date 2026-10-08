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

// Visuel servi par le serveur de l'app (voir cardImages.js) ; id + extension pour la photo Cardmarket.
export function cardImages(code, variant, idProduct, exp) {
  if (!code) return [];
  const extra = idProduct && exp ? `&id=${encodeURIComponent(idProduct)}&exp=${encodeURIComponent(exp)}` : '';
  return [`/api/card-image?code=${encodeURIComponent(code)}&v=${variant || 1}${extra}`];
}

// Préfixe de code majoritaire de chaque extension Cardmarket (ex. OP16), utilisé dans l'adresse des photos.
export function expansionPrefixes(products) {
  const counts = new Map(); // idExpansion -> Map(prefix -> n)
  for (const p of products) {
    const code = parseCardName(p.name || '').code;
    if (!code) continue;
    const prefix = code.split('-')[0];
    const m = counts.get(p.idExpansion) || new Map();
    m.set(prefix, (m.get(prefix) || 0) + 1);
    counts.set(p.idExpansion, m);
  }
  const out = new Map();
  for (const [exp, m] of counts) out.set(exp, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  return out;
}

// Extension occidentale (EN/FR) d'une série. Cardmarket publie chaque série deux fois : version
// occidentale et version japonaise (« -JP »). Le japonais sort toujours en premier : parmi les extensions
// de la série, la plus récemment ajoutée est l'occidentale. Sans dates, on retient la plus chère
// (les cartes EN/FR se vendent généralement plus cher que les japonaises).
export function westernExpansion(products, guides, prefix, prefixes = expansionPrefixes(products)) {
  const byId = new Map(guides.map((g) => [g.idProduct, g]));
  const stats = new Map();
  for (const p of products) {
    if (prefixes.get(p.idExpansion) !== prefix) continue;
    const st = stats.get(p.idExpansion) || { idExpansion: p.idExpansion, count: 0, firstAdded: null, prices: [] };
    st.count++;
    const t = Date.parse(String(p.dateAdded || '').replace(' ', 'T'));
    if (Number.isFinite(t) && (st.firstAdded == null || t < st.firstAdded)) st.firstAdded = t;
    const price = byId.get(p.idProduct)?.avg7 ?? byId.get(p.idProduct)?.trend;
    if (price > 0) st.prices.push(price);
    stats.set(p.idExpansion, st);
  }
  const list = [...stats.values()].filter((st) => st.count >= 10);
  if (!list.length) return { western: null, expansions: [] };
  const median = (a) => {
    const v = [...a].sort((x, y) => x - y);
    return v.length ? v[Math.floor(v.length / 2)] : 0;
  };
  const summary = list.map((st) => ({
    idExpansion: st.idExpansion,
    cards: st.count,
    firstAdded: st.firstAdded ? new Date(st.firstAdded).toISOString().slice(0, 10) : null,
    medianPrice: Math.round(median(st.prices) * 100) / 100,
  }));
  if (list.length === 1) return { western: list[0].idExpansion, method: 'unique', expansions: summary };
  const dated = list.every((st) => st.firstAdded != null) && new Set(list.map((st) => st.firstAdded)).size === list.length;
  const sorted = dated
    ? [...list].sort((a, b) => b.firstAdded - a.firstAdded)
    : [...list].sort((a, b) => median(b.prices) - median(a.prices));
  return { western: sorted[0].idExpansion, method: dated ? 'date' : 'prix', expansions: summary };
}

// Chase cards : toutes les versions alternatives (V.2, V.3…) de l'extension occidentale de la série.
export function chaseCards(products, guides, westernId) {
  if (westernId == null) return [];
  const byId = new Map(guides.map((g) => [g.idProduct, g]));
  return products
    .filter((p) => p.idExpansion === westernId)
    .map((p) => ({ p, ...parseCardName(p.name || '') }))
    .filter((c) => c.code && c.variant >= 2)
    .map(({ p, code, variant, base }) => {
      const g = byId.get(p.idProduct) || {};
      const price = g.avg7 ?? g.trend ?? null;
      return {
        idProduct: p.idProduct,
        name: base,
        fullName: p.name,
        code,
        variant,
        avg7: g.avg7 ?? null,
        trend: g.trend ?? null,
        low: g.low ?? null,
        price: price > 0 ? price : null,
        images: cardImages(code, variant),
        url: `https://www.cardmarket.com/fr/OnePiece/Products/Search?searchString=${encodeURIComponent(`${base} ${code}`)}`,
      };
    })
    .sort((a, b) => (b.price ?? -1) - (a.price ?? -1) || a.code.localeCompare(b.code) || a.variant - b.variant);
}

// Ancien top 5 (conservé pour les tests et la compatibilité).
// Sélection des cartes d'une série (ancien top 5) : code de carte de la série + toutes les cartes de
// l'extension Cardmarket majoritaire (utile pour les rééditions PRB qui gardent leurs anciens codes).
export function topCards(products, guides, seriesId, limit = 5, prefixes = expansionPrefixes(products)) {
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
      const exp = prefixes.get(p.idExpansion) || code?.split('-')[0] || null;
      return {
        idProduct: p.idProduct,
        idExpansion: p.idExpansion,
        expansion: exp,
        name: base,
        fullName: p.name,
        code,
        variant,
        avg7: g.avg7 ?? null,
        trend: g.trend ?? null,
        low: g.low ?? null,
        price,
        images: cardImages(code, variant, p.idProduct, exp),
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
    data = { products, guides: arrayIn(json, 'priceGuides'), createdAt: json?.createdAt || null, at: Date.now(), gameId: id, prefixes: expansionPrefixes(products) };
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

  async function getChase(seriesId) {
    await ensure();
    if (!data) return { available: false, error: lastError || 'données Cardmarket indisponibles', cards: [] };
    const { western, method, expansions } = westernExpansion(data.products, data.guides, seriesId.toUpperCase(), data.prefixes);
    return {
      available: true,
      source: 'cardmarket',
      lang: 'EN/FR',
      updatedAt: data.createdAt,
      expansion: { western, method, candidates: expansions },
      cards: chaseCards(data.products, data.guides, western),
    };
  }

  return { getChase, gameId: () => data?.gameId || null };
}
