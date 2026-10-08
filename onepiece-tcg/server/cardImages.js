// Visuels des cartes : le serveur récupère l'image (base OPTCG API, puis sites officiels) et la sert
// lui-même, ce qui évite les blocages d'affichage depuis un autre site. Cache mémoire de 7 jours.
import { fetchJson, fetchBinary } from './http.js';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FAIL_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHED = 60;
const CODE_RE = /^(OP|EB|ST|PRB|P)\d{0,2}-\d{3}$/i;
const OFFICIAL_HOSTS = ['https://en.onepiece-cardgame.com', 'https://asia-en.onepiece-cardgame.com', 'https://www.onepiece-cardgame.com'];

export function validCode(code) {
  return CODE_RE.test(String(code || ''));
}

// Identifiant d'image officiel : « OP17-118 » (version 1), « OP17-118_p1 » (version 2)…
export function imageIds(code, variant) {
  const v = Math.max(1, Math.min(9, parseInt(variant, 10) || 1));
  return v > 1 ? [`${code}_p${v - 1}`, code] : [code];
}

// Réponse OPTCG API : liste des versions de la carte, chacune avec card_image_id et card_image.
export function pickOptcgImage(json, ids) {
  const list = [].concat(json?.data || json || []).filter((c) => c && typeof c === 'object');
  for (const id of ids) {
    const hit = list.find((c) => String(c.card_image_id || '').toUpperCase() === id.toUpperCase() && c.card_image);
    if (hit) return hit.card_image;
  }
  return list.find((c) => c.card_image)?.card_image || null;
}

export function createCardImageService() {
  const cache = new Map(); // clé -> { buf, type, source, at } | { fail, tried, at }
  const inflight = new Map();

  async function candidates(code, variant) {
    const ids = imageIds(code, variant);
    const urls = [];
    const kind = /^ST/i.test(code) ? 'decks' : 'sets';
    try {
      const { json } = await fetchJson(`https://optcgapi.com/api/${kind}/card/${code.toUpperCase()}/`, { timeoutMs: 8000 });
      const url = pickOptcgImage(json, ids);
      if (url) urls.push(url);
    } catch {
      /* base indisponible ou carte absente : sites officiels */
    }
    for (const id of ids) for (const host of OFFICIAL_HOSTS) urls.push(`${host}/images/cardlist/card/${id}.png`);
    return [...new Set(urls)];
  }

  async function resolve(code, variant) {
    const tried = [];
    for (const url of await candidates(code, variant)) {
      try {
        const img = await fetchBinary(url, { timeoutMs: 10000, maxBytes: 3 * 1024 * 1024 });
        if (/^image\//.test(img.type) && img.buf.length > 1000) return { buf: img.buf, type: img.type, source: url };
        tried.push(`${url} → pas une image (${img.type || 'type inconnu'})`);
      } catch (err) {
        tried.push(`${url} → ${err.message}`);
      }
    }
    return { fail: true, tried };
  }

  async function get(code, variant) {
    const key = `${code.toUpperCase()}|${variant}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < (hit.fail ? FAIL_TTL_MS : TTL_MS)) return hit;
    if (inflight.has(key)) return inflight.get(key);
    const p = resolve(code.toUpperCase(), variant)
      .then((r) => {
        const entry = { ...r, at: Date.now() };
        cache.delete(key);
        cache.set(key, entry);
        while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value);
        return entry;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }

  return { get };
}
