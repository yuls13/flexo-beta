// Historique des prix : à chaque relevé, meilleur prix disponible de chaque produit (type × langue)
// d'une série, enregistré dans Firestore (document history/<série>). Un point par heure au plus, un an gardé.

const MIN_INTERVAL_MS = 50 * 60 * 1000;
const KEEP_MS = 366 * 24 * 60 * 60 * 1000;
const MAX_POINTS = 900;
const DAY = 24 * 60 * 60 * 1000;

export const historyKey = (type, lang) => `${type}_${lang || 'XX'}`;

// Meilleure offre disponible (hors prix suspects, hors lots de boosters) par type × langue.
export function snapshotFromOffers(offers) {
  const best = {};
  for (const o of offers || []) {
    if (o.available === false || (o.quantity || 1) > 1) continue;
    if ((o.flags || []).some((f) => f.kind === 'suspect')) continue;
    const k = historyKey(o.type, o.lang);
    if (!best[k] || o.total < best[k].tot) best[k] = { p: o.price, tot: o.total, s: o.shopId };
  }
  return best;
}

// Points récents gardés tels quels ; au-delà de 14 jours, le plus bas prix par tranche de 6 h,
// au-delà de 60 jours, le plus bas prix du jour (le document Firestore reste sous 1 Mo).
export function compactPoints(points, now = Date.now()) {
  const buckets = new Map();
  const out = [];
  for (const pt of points) {
    const time = Date.parse(`${pt.t}Z`);
    const age = now - time;
    if (age > KEEP_MS) continue;
    if (age <= 14 * DAY) {
      out.push(pt);
      continue;
    }
    const size = age <= 60 * DAY ? DAY / 4 : DAY;
    const key = `${size}:${Math.floor(time / size)}`;
    const idx = buckets.get(key);
    if (idx === undefined) {
      buckets.set(key, out.length);
      out.push(pt);
    } else if (pt.tot < out[idx].tot) {
      out[idx] = { ...pt, t: out[idx].t };
    }
  }
  return out.slice(-MAX_POINTS);
}

export function appendPoints(existing, snapshot, at = new Date()) {
  const t = at.toISOString().slice(0, 16);
  const out = { ...(existing || {}) };
  for (const [k, v] of Object.entries(snapshot)) out[k] = [...(out[k] || []), { t, ...v }];
  for (const k of Object.keys(out)) {
    out[k] = compactPoints(out[k], at.getTime());
    if (!out[k].length) delete out[k];
  }
  return out;
}

export function createHistoryService({ db }) {
  const lastWrite = new Map(); // série -> date du dernier point
  const cache = new Map(); // série -> { data, at }

  async function record(seriesId, priceData) {
    if (!db || !priceData?.offers) return false;
    if (Date.now() - (lastWrite.get(seriesId) || 0) < MIN_INTERVAL_MS) return false;
    const snapshot = snapshotFromOffers(priceData.offers);
    if (!Object.keys(snapshot).length) return false;
    lastWrite.set(seriesId, Date.now());
    const doc = (await db.get(`history/${seriesId}`)) || {};
    const data = appendPoints(doc.data, snapshot);
    await db.set(`history/${seriesId}`, { data, updatedAt: new Date().toISOString() });
    cache.set(seriesId, { data, at: Date.now() });
    return true;
  }

  async function get(seriesId) {
    if (!db) return { available: false, reason: 'historique non configuré', data: {} };
    const hit = cache.get(seriesId);
    if (hit && Date.now() - hit.at < 5 * 60 * 1000) return { available: true, data: hit.data };
    const doc = await db.get(`history/${seriesId}`);
    const data = doc?.data || {};
    cache.set(seriesId, { data, at: Date.now() });
    return { available: true, data };
  }

  return { record, get };
}
