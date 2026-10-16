// Chase cards d'une série : versions alternatives (illustrations _p1, _p2…) d'après la base OPTCG API,
// prix EN/FR d'après Cardmarket (extension occidentale), prix TCGplayer (EN, USD) en repli.
import { fetchJson, pool } from './http.js';
import { usdToEur } from './rates.js';

const TTL_MS = 12 * 60 * 60 * 1000;
const CODE_RE = /^(OP|EB|ST|PRB|P)\d{0,2}-\d{3}$/i;

// Identifiants de série chez OPTCG API (« OP-16 », combinés « OP14-EB04 »…).
export function optcgSetIds(seriesId) {
  const m = String(seriesId).toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return [];
  const ids = [`${m[1]}-${m[2]}`];
  if (['OP14', 'OP15'].includes(seriesId.toUpperCase())) ids.push(`${seriesId.toUpperCase()}-EB04`);
  return ids;
}

const listOf = (json) => [].concat(json?.data || json?.cards || json || []).filter((c) => c && typeof c === 'object');
const codeOf = (c) => String(c.card_set_id || c.card_id || c.id || '').toUpperCase();

// Numéro de version d'après l'identifiant d'image officiel : « OP16-065 » → 1, « OP16-065_p1 » → 2.
export function variantOf(imageId) {
  const m = String(imageId || '').match(/_p(\d+)$/i);
  return m ? parseInt(m[1], 10) + 1 : 1;
}

function toNumber(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Versions d'une carte (réponse de /api/sets/card/<code>/) triées : base, _p1, _p2…
export function versionsFrom(json, code) {
  return listOf(json)
    .filter((c) => !code || codeOf(c) === code || String(c.card_image_id || '').toUpperCase().startsWith(code))
    .map((c) => ({
      code: code || codeOf(c),
      imageId: c.card_image_id || null,
      variant: variantOf(c.card_image_id),
      name: c.card_name || c.name || '',
      rarity: c.rarity || null,
      image: c.card_image || null,
      usd: toNumber(c.market_price ?? c.inventory_price),
    }))
    .filter((v, i, all) => all.findIndex((x) => x.variant === v.variant) === i)
    .sort((a, b) => a.variant - b.variant);
}

// Prix Cardmarket d'une version : les fiches d'une carte dans l'extension occidentale, classées par
// ordre de création (idProduct), suivent l'ordre des versions. On n'associe que si les deux sources
// comptent le même nombre de versions.
export function cardmarketPrice(cmProducts, versions, variant) {
  if (!cmProducts?.length || cmProducts.length !== versions.length) return null;
  const index = versions.findIndex((v) => v.variant === variant);
  const p = cmProducts[index];
  return p ? { eur: p.avg7 ?? p.trend ?? null, avg7: p.avg7 ?? null, trend: p.trend ?? null, idProduct: p.idProduct } : null;
}

export function createChaseService({ cardmarket }) {
  const cache = new Map(); // seriesId -> { data, at }
  const versionCache = new Map(); // code -> { versions, at }

  async function setList(seriesId) {
    for (const id of optcgSetIds(seriesId)) {
      try {
        const { json } = await fetchJson(`https://optcgapi.com/api/sets/${id}/`, { timeoutMs: 15000 });
        const list = listOf(json);
        if (list.length) return list;
      } catch {
        /* identifiant suivant */
      }
    }
    return [];
  }

  async function cardVersions(code) {
    const hit = versionCache.get(code);
    if (hit && Date.now() - hit.at < 7 * 24 * 3600 * 1000) return hit.versions;
    let versions = [];
    try {
      const kind = /^ST/i.test(code) ? 'decks' : 'sets';
      const { json } = await fetchJson(`https://optcgapi.com/api/${kind}/card/${code}/`, { timeoutMs: 10000 });
      versions = versionsFrom(json, code);
    } catch {
      /* carte absente de la base */
    }
    versionCache.set(code, { versions, at: Date.now() });
    return versions;
  }

  async function build(seriesId) {
    const cm = await cardmarket.westernByCode(seriesId);
    const rate = await usdToEur();
    const list = await setList(seriesId);
    let source = 'optcg';
    // Codes à examiner : liste OPTCG de la série ; à défaut, cartes à plusieurs fiches chez Cardmarket.
    let codes = [...new Set(list.map(codeOf).filter((c) => CODE_RE.test(c)))];
    const fromList = new Map();
    for (const c of list) {
      const code = codeOf(c);
      if (!CODE_RE.test(code) || !c.card_image_id) continue;
      if (!fromList.has(code)) fromList.set(code, []);
      fromList.get(code).push(c);
    }
    if (!codes.length) {
      source = 'cardmarket';
      codes = [...(cm.byCode?.entries() || [])].filter(([, ps]) => ps.length > 1).map(([code]) => code);
    }
    // Si la liste contient déjà les identifiants d'image, inutile d'interroger carte par carte.
    const versionsByCode = new Map();
    const toFetch = [];
    for (const code of codes) {
      if (fromList.has(code)) versionsByCode.set(code, versionsFrom(fromList.get(code), code));
      else toFetch.push(code);
    }
    // Sans identifiants d'image dans la liste : on n'interroge que les cartes probablement déclinées
    // (plusieurs entrées dans la liste ou plusieurs fiches Cardmarket), sinon toutes (plafond 160).
    const counts = new Map();
    for (const c of list) counts.set(codeOf(c), (counts.get(codeOf(c)) || 0) + 1);
    const likely = toFetch.filter((code) => (counts.get(code) || 0) > 1 || (cm.byCode?.get(code)?.length || 0) > 1);
    const fetchList = (likely.length ? likely : toFetch).slice(0, 160);
    const fetched = await pool(fetchList, 6, (code) => cardVersions(code));
    fetchList.forEach((code, i) => versionsByCode.set(code, fetched[i]));

    const cards = [];
    for (const [code, versions] of versionsByCode) {
      const cmProducts = cm.byCode?.get(code) || [];
      // Repli Cardmarket sans données OPTCG : versions = fiches classées par création.
      const vs = versions.length ? versions : cmProducts.map((p, i) => ({ code, variant: i + 1, name: p.name, rarity: null, usd: null }));
      for (const v of vs.filter((x) => x.variant >= 2)) {
        const cmPrice = versions.length ? cardmarketPrice(cmProducts, versions, v.variant) : cmProducts[v.variant - 1] ? { eur: cmProducts[v.variant - 1].avg7 ?? cmProducts[v.variant - 1].trend, avg7: cmProducts[v.variant - 1].avg7, trend: cmProducts[v.variant - 1].trend } : null;
        const name = (v.name || cmProducts[0]?.name || code).replace(/\s*\([^)]*\)\s*/g, ' ').trim();
        cards.push({
          id: `${code}_v${v.variant}`,
          idProduct: `${code}_v${v.variant}`, // clé de la case « Je l'ai »
          code,
          variant: v.variant,
          name,
          rarity: v.rarity,
          // Prix en euros : moyenne 7 j Cardmarket (EN/FR), sinon prix TCGplayer converti au taux BCE.
          eur: cmPrice?.eur ?? (v.usd ? Math.round(v.usd * rate.usdEur * 100) / 100 : null),
          avg7: cmPrice?.avg7 ?? null,
          trend: cmPrice?.trend ?? null,
          usd: cmPrice?.eur ? null : v.usd,
          priceSource: cmPrice?.eur ? 'cardmarket' : v.usd ? 'tcgplayer' : null,
          price: cmPrice?.eur ?? (v.usd ? Math.round(v.usd * rate.usdEur * 100) / 100 : null),
          images: [`/api/card-image?code=${encodeURIComponent(code)}&v=${v.variant}`],
          url: `https://www.cardmarket.com/fr/OnePiece/Products/Search?searchString=${encodeURIComponent(`${name} ${code}`)}`,
        });
      }
    }
    cards.sort((a, b) => (b.eur ?? -1) - (a.eur ?? -1) || a.code.localeCompare(b.code) || a.variant - b.variant);
    return {
      available: true,
      lang: 'EN/FR',
      source,
      updatedAt: cm.updatedAt || new Date().toISOString(),
      cardmarket: { western: cm.western, method: cm.method, candidates: cm.expansions, error: cm.error || null },
      stats: { optcgCards: list.length, codesChecked: versionsByCode.size, chase: cards.length },
      rate: { usdEur: rate.usdEur, date: rate.date, source: rate.source },
      cards,
    };
  }

  async function getChase(seriesId) {
    const hit = cache.get(seriesId);
    if (hit && Date.now() - hit.at < TTL_MS && hit.data.cards.length) return hit.data;
    const data = await build(seriesId);
    cache.set(seriesId, { data, at: Date.now() });
    return data;
  }

  return { getChase };
}
