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
// Réponse OPTCG API : liste des versions de la carte, chacune avec card_image_id et card_image.
// Renvoie { url, exact } : version demandée si elle existe, sinon la version alternative la plus proche,
// sinon la version de base.
export function pickOptcgImage(json, ids) {
  const list = [].concat(json?.data || json || []).filter((c) => c && typeof c === 'object' && c.card_image);
  const idOf = (c) => String(c.card_image_id || '').toUpperCase();
  const exact = list.find((c) => idOf(c) === ids[0].toUpperCase());
  if (exact) return { url: exact.card_image, exact: true };
  const wanted = parseInt(ids[0].split('_p')[1], 10);
  if (wanted) {
    const parallels = list
      .map((c) => ({ c, n: parseInt(idOf(c).split('_P')[1], 10) }))
      .filter((x) => x.n)
      .sort((a, b) => Math.abs(a.n - wanted) - Math.abs(b.n - wanted));
    if (parallels.length) return { url: parallels[0].c.card_image, exact: false };
  }
  const base = list.find((c) => !idOf(c).includes('_P')) || list[0];
  return base ? { url: base.card_image, exact: !wanted } : null;
}

// Photo de la fiche Cardmarket : product-images.s3.cardmarket.com/<jeu>/<extension>/<id>/<id>.jpg.
// L'extension japonaise porte le suffixe « -JP » (ex. OP16-JP) : l'adresse qui répond donne la langue.
export function cardmarketImageUrls(gameId, exp, idProduct) {
  if (!gameId || !exp || !idProduct) return [];
  const base = 'https://product-images.s3.cardmarket.com';
  return [`${exp}-JP`, exp].flatMap((abbr) => [`${base}/${gameId}/${abbr}/${idProduct}/${idProduct}.jpg`, `${base}/${gameId}/${abbr}/${idProduct}/${idProduct}.png`]);
}

export function languageFromSource(source, exp) {
  if (!source || !/cardmarket\.com/.test(source)) return null;
  return new RegExp(`/${exp}-JP/`, 'i').test(source) ? 'JP' : 'EN';
}

export function createCardImageService() {
  const cache = new Map(); // clé -> { buf, type, source, lang, exact, at } | { fail, tried, at }
  const inflight = new Map();

  async function candidates({ code, variant, idProduct, exp, gameId }, exactUrls) {
    const urls = [...cardmarketImageUrls(gameId, exp, idProduct)];
    const ids = imageIds(code, variant);
    const kind = /^ST/i.test(code) ? 'decks' : 'sets';
    try {
      const { json } = await fetchJson(`https://optcgapi.com/api/${kind}/card/${code.toUpperCase()}/`, { timeoutMs: 8000 });
      const pick = pickOptcgImage(json, ids);
      if (pick) {
        urls.push(pick.url);
        exactUrls.add(pick.exact ? pick.url : '');
      }
    } catch {
      /* base indisponible ou carte absente : sites officiels */
    }
    for (const id of ids) for (const host of OFFICIAL_HOSTS) urls.push(`${host}/images/cardlist/card/${id}.png`);
    // Image officielle sous l'identifiant exact de la version : illustration exacte.
    for (const host of OFFICIAL_HOSTS) exactUrls.add(`${host}/images/cardlist/card/${ids[0]}.png`);
    return [...new Set(urls)];
  }

  async function resolve(params) {
    const tried = [];
    const exactUrls = new Set();
    for (const url of await candidates(params, exactUrls)) {
      try {
        const img = await fetchBinary(url, { timeoutMs: 10000, maxBytes: 3 * 1024 * 1024 });
        if (/^image\//.test(img.type) && img.buf.length > 1000) {
          const lang = languageFromSource(url, params.exp);
          // Photo Cardmarket = illustration exacte de la fiche ; sinon illustration indicative (version de base possible).
          return { buf: img.buf, type: img.type, source: url, lang, exact: !!lang || exactUrls.has(url), tried };
        }
        tried.push(`${url} → pas une image (${img.type || 'type inconnu'})`);
      } catch (err) {
        tried.push(`${url} → ${err.message}`);
      }
    }
    return { fail: true, tried };
  }

  // params : { code, variant, idProduct?, exp?, gameId? }
  async function get(params) {
    const code = String(params.code).toUpperCase();
    const key = params.idProduct ? `p${params.idProduct}` : `${code}|${params.variant}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < (hit.fail ? FAIL_TTL_MS : TTL_MS)) return hit;
    if (inflight.has(key)) return inflight.get(key);
    const p = resolve({ ...params, code })
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
