// Agrégation des offres d'une série : interrogation des boutiques, classement, port, alertes de prix.
import { PLATFORMS, STRATEGIES, searchShop as readShop, queriesFor } from './adapters/index.js';
import { classify, explain, PRODUCT_TYPES } from './classify.js';
import { pool, withTrace } from './http.js';

const CACHE_TTL_MS = 10 * 60 * 1000; // résultats réutilisés 10 min
const MIN_FORCE_INTERVAL_MS = 45 * 1000; // « Actualiser » ne relance pas plus d'une fois / 45 s
const SHOP_BUDGET_MS = 30 * 1000;
const PROTECTED_TTL_MS = 24 * 60 * 60 * 1000; // site anti-robots : on réessaie une fois par jour
const ANTI_BOT = /anti-robots|Cloudflare|DataDome|Sucuri|Wordfence/i;

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
    (s) => PLATFORMS.includes(s.platform) && !blocked.has(s.domain.replace(/^www\./, ''))
  );

  const protectedUntil = new Map(); // domaine -> { until, reason }

  async function searchShop(shop, s, { ignoreProtection = false } = {}) {
    const prot = protectedUntil.get(shop.domain);
    if (!ignoreProtection && prot && prot.until > Date.now()) {
      return { items: [], errors: [prot.reason], ms: 0, strategies: [], protected: true };
    }
    const queries = queriesFor(shop.platform, s);
    const started = Date.now();
    const items = [];
    const errors = [];
    const strategies = new Set();
    for (const q of queries) {
      if (Date.now() - started > SHOP_BUDGET_MS) {
        errors.push('temps total dépassé');
        break;
      }
      try {
        if (searchImpl) {
          items.push(...(await searchImpl(shop, q, s)));
        } else {
          const { items: found, strategy } = await readShop(shop, q);
          items.push(...found);
          if (strategy) strategies.add(strategy);
        }
      } catch (err) {
        errors.push(err.message);
        if (ANTI_BOT.test(err.message)) {
          protectedUntil.set(shop.domain, { until: Date.now() + PROTECTED_TTL_MS, reason: err.message.replace(/^HTTP \d+ – /, '') });
          return { items, errors, ms: Date.now() - started, strategies: [...strategies], protected: true };
        }
        // Un blocage (403/429) ou une boutique injoignable ne s'améliorera pas sur les requêtes suivantes.
        if ([0, 401, 403, 404, 429, 503].includes(err.status)) break;
      }
    }
    return { items, errors, ms: Date.now() - started, strategies: [...strategies] };
  }

  // Diagnostic d'une boutique : requêtes envoyées, réponses, produits lus et verdict pour chacun.
  async function diagnose(shop, seriesId) {
    const s = series.find((x) => x.id === seriesId);
    if (!s) return null;
    const { result, trace } = await withTrace(() => searchShop(shop, s, { ignoreProtection: true }));
    if (result.error) throw result.error;
    const seen = new Set();
    const products = [];
    for (const item of result.items) {
      if (!item?.url || seen.has(item.url)) continue;
      seen.add(item.url);
      products.push({ title: item.title, price: item.price, available: item.available, url: item.url, verdict: explain(item.title, s, item.price) });
    }
    return {
      shop: { id: shop.id, name: shop.name, domain: shop.domain, platform: shop.platform },
      series: s.id,
      queries: queriesFor(shop.platform, s),
      strategies: result.strategies.map((n) => STRATEGIES[n]?.label || n),
      errors: result.errors,
      ms: result.ms,
      requests: trace,
      products,
    };
  }

  async function run(s, extraShops) {
    const startedAt = Date.now();
    const targets = [...scrapable, ...extraShops.filter((x) => !blocked.has(x.domain.replace(/^www\./, '')))];
    const perShop = await pool(targets, 8, (shop) => searchShop(shop, s));
    const offers = [];
    const shopStatus = [];
    perShop.forEach(({ items, errors, ms, strategies, protected: isProtected }, i) => {
      const shop = targets[i];
      const seen = new Set();
      let matched = 0;
      for (const item of items) {
        if (!item?.url || !item.title || item.price == null || item.price <= 0) continue;
        const key = item.url.replace(/[?#].*$/, '').replace(/\/$/, '');
        if (seen.has(key)) continue;
        seen.add(key);
        const cls = classify(item.title, s, item.price);
        if (!cls) continue;
        matched++;
        offers.push(buildOffer(shop, item, cls, shippingDefaults, s));
      }
      shopStatus.push({
        id: shop.id,
        name: shop.name,
        custom: !!shop.custom,
        status: matched ? 'ok' : isProtected ? 'protected' : items.length ? 'empty' : errors.length ? 'error' : 'empty',
        platform: shop.platform,
        found: items.length,
        matched,
        error: items.length ? null : errors[0] || null,
        method: strategies?.[0] ? STRATEGIES[strategies[0]]?.label : null,
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

  // extraShops : boutiques ajoutées par l'utilisateur (déjà validées), incluses dans la clé de cache.
  async function getSeries(seriesId, { force = false, extraShops = [] } = {}) {
    const s = series.find((x) => x.id === seriesId);
    if (!s) return null;
    const key = [seriesId, ...extraShops.map((x) => `${x.platform}:${x.domain}`).sort()].join('|');
    const cached = cache.get(key);
    const age = cached ? Date.now() - cached.at : Infinity;
    if (cached && (age < (force ? MIN_FORCE_INTERVAL_MS : CACHE_TTL_MS))) {
      return { ...cached.data, cached: true };
    }
    if (inflight.has(key)) return inflight.get(key);
    const p = run(s, extraShops)
      .then((data) => {
        cache.set(key, { data, at: Date.now() });
        if (cache.size > 200) cache.delete(cache.keys().next().value);
        return { ...data, cached: false };
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }

  return { getSeries, scrapable, diagnose };
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

export const PREORDER_RE = /pr[ée][- ]?commande|pre-?order|pr[ée]-?vente|disponible le|sortie (le|pr[ée]vue)|available on/i;

// Date de sortie applicable à une offre : celle de sa langue ; une version FR sans date
// prend la date EN (sorties FR/EN simultanées depuis OP-15) ; langue inconnue → première date.
export function releaseFor(s, lang) {
  const r = s?.release || {};
  const l = lang?.toLowerCase();
  if (l && r[l]) return r[l];
  if (l === 'fr' && r.en) return r.en;
  const dates = Object.values(r).sort();
  return l ? null : dates[0] || null;
}

export function buildOffer(shop, item, cls, shippingDefaults, s, today = new Date().toISOString().slice(0, 10)) {
  const shipping = shippingFor(shop, cls.type, item.price, shippingDefaults);
  const total = round2(item.price + shipping);
  const boosters = PRODUCT_TYPES[cls.type].boosters * (cls.quantity || 1);
  const release = releaseFor(s, cls.lang);
  const upcoming = !!release && release > today;
  // Précommande : signalée par la boutique, écrite dans le titre, ou produit commandable
  // (en stock / sur commande) d'une série pas encore sortie dans cette langue.
  const preorder =
    !!item.preorder || PREORDER_RE.test(item.title) || (upcoming && (item.available !== false || !!item.backorder));
  return {
    shopId: shop.id,
    shopName: shop.name,
    custom: !!shop.custom,
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
    available: item.backorder && item.available === false ? null : item.available,
    preorder,
    upcoming,
    releaseDate: upcoming ? release : null,
    inferred: !!cls.inferred,
    flags: cls.inferred
      ? [{ kind: 'info', text: 'Type déduit du prix : le titre ne précise pas « display » ou « booster », vérifiez sur la fiche' }]
      : [],
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
