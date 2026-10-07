// Agrégation des offres d'une série : interrogation des boutiques, classement, port, alertes de prix.
import { ADAPTERS } from './adapters/index.js';
import { classify, PRODUCT_TYPES } from './classify.js';
import { pool } from './http.js';

const CACHE_TTL_MS = 10 * 60 * 1000; // résultats réutilisés 10 min
const MIN_FORCE_INTERVAL_MS = 45 * 1000; // « Actualiser » ne relance pas plus d'une fois / 45 s
const SHOP_BUDGET_MS = 30 * 1000;

// Prix plancher en dessous desquels une offre neuve est très improbable (€).
const FLOOR = {
  display: { FR: 85, EN: 85, JP: 45, null: 45 },
  booster: { FR: 3, EN: 3, JP: 1.8, null: 1.8 },
  duo: { FR: 8, EN: 8, JP: 6, null: 6 },
  starter: { FR: 8, EN: 8, JP: 6, null: 6 },
  coffret: { FR: 15, EN: 15, JP: 10, null: 10 },
};

export function createPriceService({ shops, shippingDefaults, blacklist, series, searchImpl }) {
  const cache = new Map(); // seriesId -> { data, at }
  const inflight = new Map();
  const blocked = new Set(blacklist.map((b) => b.domain.replace(/^www\./, '')));
  const scrapable = shops.filter(
    (s) => ADAPTERS[s.platform] && !blocked.has(s.domain.replace(/^www\./, ''))
  );

  async function searchShop(shop, s) {
    const adapter = ADAPTERS[shop.platform];
    const queries = adapter.queries(s.queries, s);
    const started = Date.now();
    const items = [];
    const errors = [];
    for (const q of queries) {
      if (Date.now() - started > SHOP_BUDGET_MS) {
        errors.push('temps total dépassé');
        break;
      }
      try {
        const found = await (searchImpl ? searchImpl(shop, q, s) : adapter.search(shop, q));
        items.push(...found);
      } catch (err) {
        errors.push(err.message);
        // Un blocage (403/429) ou une boutique injoignable ne s'améliorera pas sur les requêtes suivantes.
        if ([0, 403, 404, 429, 503].includes(err.status)) break;
      }
    }
    return { items, errors, ms: Date.now() - started };
  }

  async function run(s) {
    const startedAt = Date.now();
    const perShop = await pool(scrapable, 8, (shop) => searchShop(shop, s));
    const offers = [];
    const shopStatus = [];
    perShop.forEach(({ items, errors, ms }, i) => {
      const shop = scrapable[i];
      const seen = new Set();
      let matched = 0;
      for (const item of items) {
        if (!item?.url || !item.title || item.price == null || item.price <= 0) continue;
        const key = item.url.replace(/[?#].*$/, '').replace(/\/$/, '');
        if (seen.has(key)) continue;
        seen.add(key);
        const cls = classify(item.title, s);
        if (!cls) continue;
        matched++;
        offers.push(buildOffer(shop, item, cls, shippingDefaults));
      }
      shopStatus.push({
        id: shop.id,
        name: shop.name,
        status: matched ? 'ok' : items.length ? 'empty' : errors.length ? 'error' : 'empty',
        found: items.length,
        matched,
        error: items.length ? null : errors[0] || null,
        ms,
      });
    });
    flagPrices(offers);
    offers.sort(compareOffers);
    return {
      series: s.id,
      fetchedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      offers,
      shops: shopStatus,
      best: bestOffers(offers),
    };
  }

  async function getSeries(seriesId, { force = false } = {}) {
    const s = series.find((x) => x.id === seriesId);
    if (!s) return null;
    const cached = cache.get(seriesId);
    const age = cached ? Date.now() - cached.at : Infinity;
    if (cached && (age < (force ? MIN_FORCE_INTERVAL_MS : CACHE_TTL_MS))) {
      return { ...cached.data, cached: true };
    }
    if (inflight.has(seriesId)) return inflight.get(seriesId);
    const p = run(s)
      .then((data) => {
        cache.set(seriesId, { data, at: Date.now() });
        return { ...data, cached: false };
      })
      .finally(() => inflight.delete(seriesId));
    inflight.set(seriesId, p);
    return p;
  }

  return { getSeries, scrapable };
}

export function shippingFor(shop, type, price, defaults) {
  const size = PRODUCT_TYPES[type].size;
  const region = defaults[shop.country] ? shop.country : 'FR';
  const ship = shop.shipping || {};
  if (ship.freeFrom != null && price >= ship.freeFrom) return 0;
  return ship[size] ?? defaults[region][size];
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function buildOffer(shop, item, cls, shippingDefaults) {
  const shipping = shippingFor(shop, cls.type, item.price, shippingDefaults);
  const total = round2(item.price + shipping);
  const boosters = PRODUCT_TYPES[cls.type].boosters * (cls.quantity || 1);
  return {
    shopId: shop.id,
    shopName: shop.name,
    country: shop.country,
    title: item.title,
    url: item.url,
    image: item.image || null,
    type: cls.type,
    lang: cls.lang,
    quantity: cls.quantity || 1,
    price: round2(item.price),
    shipping,
    total,
    perBooster: boosters ? round2(item.price / boosters) : null,
    available: item.available,
    preorder: !!item.preorder,
    flags: [],
  };
}

function median(values) {
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Alerte « prix suspect » : trop bas par rapport à la médiane du même produit ou au prix plancher.
export function flagPrices(offers) {
  const groups = new Map();
  for (const o of offers) {
    const k = `${o.type}|${o.lang}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o);
  }
  for (const group of groups.values()) {
    const unit = (o) => o.price / o.quantity;
    const med = group.length >= 3 ? median(group.map(unit)) : null;
    for (const o of group) {
      o.median = med != null ? round2(med * o.quantity) : null;
      const floor = (FLOOR[o.type][o.lang] ?? FLOOR[o.type].null) * o.quantity;
      if (o.price < floor) {
        o.flags.push({ kind: 'suspect', text: `Prix anormalement bas (< ${floor.toFixed(0)} €) : méfiance` });
      } else if (med != null && unit(o) < 0.6 * med) {
        o.flags.push({
          kind: 'suspect',
          text: `${Math.round((1 - unit(o) / med) * 100)} % sous le prix médian : vérifier la boutique et l'état du produit`,
        });
      } else if (med != null && unit(o) > 1.8 * med) {
        o.flags.push({ kind: 'high', text: 'Nettement au-dessus du prix médian' });
      }
    }
  }
}

function stockRank(o) {
  if (o.available === true && !o.preorder) return 0;
  if (o.preorder) return 1;
  if (o.available == null) return 2;
  return 3;
}

const isSuspect = (o) => o.flags.some((f) => f.kind === 'suspect');

export function compareOffers(a, b) {
  return (
    stockRank(a) - stockRank(b) ||
    isSuspect(a) - isSuspect(b) ||
    (a.perBooster != null && b.perBooster != null && a.type === 'booster' && b.type === 'booster'
      ? a.perBooster - b.perBooster
      : 0) ||
    a.total - b.total
  );
}

// Meilleure offre disponible (hors prix suspects) par type × langue.
export function bestOffers(offers) {
  const best = {};
  for (const o of offers) {
    if (o.available === false) continue;
    if (isSuspect(o)) continue;
    const k = `${o.type}|${o.lang || '?'}`;
    const cur = best[k];
    const better =
      !cur ||
      (o.type === 'booster' ? o.perBooster + o.shipping / o.quantity < cur.perBooster + cur.shipping / cur.quantity : o.total < cur.total);
    if (better) best[k] = o;
  }
  return Object.values(best);
}
