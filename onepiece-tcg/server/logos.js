// Logos des boutiques : icône déclarée par le site (apple-touch-icon, icône la plus grande…),
// mise en cache en mémoire ; à défaut, redirection vers le service d'icônes de Google.
import { fetchText, fetchBinary } from './http.js';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FAIL_TTL_MS = 6 * 60 * 60 * 1000;
const IMAGE_TYPES = /^image\/(png|jpe?g|gif|webp|avif|svg\+xml|x-icon|vnd\.microsoft\.icon|ico)$/;

export const googleFavicon = (domain) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(2).find((v) => v != null) ?? null;
}

// Liste des icônes candidates, de la plus adaptée à la moins adaptée.
export function parseIcons(html, baseUrl) {
  const found = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (attr(tag, 'rel') || '').toLowerCase();
    const href = attr(tag, 'href');
    if (!href || !/icon/.test(rel) || /mask-icon/.test(rel)) continue;
    const sizes = attr(tag, 'sizes') || '';
    const size = Math.max(0, ...sizes.split(/\s+/).map((s) => parseInt(s, 10) || 0));
    const apple = /apple-touch-icon/.test(rel);
    let url;
    try {
      url = new URL(href.replace(/&amp;/g, '&'), baseUrl).href;
    } catch {
      continue;
    }
    // Score : apple-touch-icon (≈180 px) puis taille déclarée.
    found.push({ url, score: (apple ? 1000 : 0) + (size || (apple ? 180 : 16)) });
  }
  found.sort((a, b) => b.score - a.score);
  const urls = found.map((f) => f.url);
  for (const p of ['/apple-touch-icon.png', '/favicon.ico']) urls.push(new URL(p, baseUrl).href);
  return [...new Set(urls)];
}

export function createLogoService() {
  const cache = new Map(); // domaine -> { buf, type, at } | { fail: true, at }
  const inflight = new Map();

  async function discover(domain) {
    const { text, url } = await fetchText(`https://${domain}/`, { timeoutMs: 8000 });
    for (const candidate of parseIcons(text, url).slice(0, 5)) {
      try {
        const img = await fetchBinary(candidate);
        const type = IMAGE_TYPES.test(img.type) ? img.type : /\.ico(\?|$)/i.test(candidate) ? 'image/x-icon' : null;
        if (type && img.buf.length > 100) return { buf: img.buf, type };
      } catch {
        /* candidate suivante */
      }
    }
    throw new Error('aucune icône exploitable');
  }

  async function get(domain) {
    const hit = cache.get(domain);
    if (hit && Date.now() - hit.at < (hit.fail ? FAIL_TTL_MS : TTL_MS)) return hit;
    if (inflight.has(domain)) return inflight.get(domain);
    const p = discover(domain)
      .then((r) => ({ ...r, at: Date.now() }))
      .catch(() => ({ fail: true, at: Date.now() }))
      .then((entry) => {
        cache.set(domain, entry);
        if (cache.size > 500) cache.delete(cache.keys().next().value);
        return entry;
      })
      .finally(() => inflight.delete(domain));
    inflight.set(domain, p);
    return p;
  }

  return { get };
}
