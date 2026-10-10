// Illustration du booster de chaque série : image de la pochette trouvée sur la page produit officielle
// (sites One Piece Card Game EN, Asie, JP), servie par le serveur et mise en cache 7 jours.
// Ordre : image fixée dans series.json (coverUrl) → page produit officielle → repli carte n°001.
import { fetchText, fetchBinary } from './http.js';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FAIL_TTL_MS = 6 * 60 * 60 * 1000;
const HOSTS = ['https://en.onepiece-cardgame.com', 'https://asia-en.onepiece-cardgame.com', 'https://www.onepiece-cardgame.com'];

// Pages produit possibles pour une série (« op16 », « eb03 », « prb02 »).
export function productPages(seriesId) {
  const id = String(seriesId).toLowerCase();
  const folders = /^eb/.test(id) ? ['boosters', 'extra_boosters', 'extraboosters'] : /^prb/.test(id) ? ['boosters', 'premium_boosters', 'premiumboosters'] : ['boosters'];
  const paths = [`/products/${id}.html`, `/products/${id}.php`, ...folders.flatMap((f) => [`/products/${f}/${id}.php`, `/products/${f}/${id}.html`])];
  return HOSTS.flatMap((h) => paths.map((p) => h + p));
}

// Images candidates d'une page produit, de la plus probable (pochette du booster) à la moins probable.
export function coverCandidates(html, pageUrl, seriesId) {
  const id = String(seriesId).toLowerCase();
  const found = [];
  const add = (src, score) => {
    try {
      found.push({ url: new URL(src.replace(/&amp;/g, '&'), pageUrl).href, score });
    } catch {
      /* adresse invalide */
    }
  };
  for (const m of html.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const src = m[1];
    if (!/\.(png|jpe?g|webp)(\?|$)/i.test(src) || /logo|icon|banner|btn|button|arrow|sns|twitter|x_|youtube/i.test(src)) continue;
    let score = 0;
    if (src.toLowerCase().includes(id)) score += 10;
    if (/\/products?\//i.test(src)) score += 3;
    if (/pack|package|booster|item|main|pkg|img_product/i.test(src)) score += 4;
    if (/card|cardlist/i.test(src)) score -= 6;
    if (score > 0) add(src, score);
  }
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  if (og) add(og, og.toLowerCase().includes(id) ? 9 : 1);
  return [...new Map(found.sort((a, b) => b.score - a.score).map((f) => [f.url, f])).values()].map((f) => f.url);
}

export function createSeriesCoverService({ series }) {
  const cache = new Map(); // seriesId -> { buf, type, source, at } | { fail, tried, at }
  const inflight = new Map();

  async function resolve(s) {
    const tried = [];
    const tryImage = async (url) => {
      try {
        const img = await fetchBinary(url, { timeoutMs: 10000, maxBytes: 3 * 1024 * 1024 });
        if (/^image\//.test(img.type) && img.buf.length > 2000) return { buf: img.buf, type: img.type, source: url };
        tried.push(`${url} → pas une image`);
      } catch (err) {
        tried.push(`${url} → ${err.message}`);
      }
      return null;
    };
    if (s.coverUrl) {
      const img = await tryImage(s.coverUrl);
      if (img) return img;
    }
    for (const page of productPages(s.id)) {
      let html;
      try {
        ({ text: html } = await fetchText(page, { timeoutMs: 8000 }));
      } catch (err) {
        tried.push(`${page} → ${err.message}`);
        continue;
      }
      for (const url of coverCandidates(html, page, s.id).slice(0, 4)) {
        const img = await tryImage(url);
        if (img) return { ...img, page };
      }
      tried.push(`${page} → aucune image de booster reconnue`);
    }
    return { fail: true, tried };
  }

  async function get(seriesId) {
    const s = series.find((x) => x.id === seriesId);
    if (!s) return { fail: true, tried: ['série inconnue'] };
    const hit = cache.get(s.id);
    if (hit && Date.now() - hit.at < (hit.fail ? FAIL_TTL_MS : TTL_MS)) return hit;
    if (inflight.has(s.id)) return inflight.get(s.id);
    const p = resolve(s)
      .then((r) => {
        const entry = { ...r, at: Date.now() };
        cache.set(s.id, entry);
        return entry;
      })
      .finally(() => inflight.delete(s.id));
    inflight.set(s.id, p);
    return p;
  }

  return { get };
}
