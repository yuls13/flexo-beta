// Petits utilitaires réseau : fetch avec délai maximum, détection des protections anti-robots,
// journal des requêtes (pour le diagnostic d'une boutique) et limiteur de parallélisme.
import { AsyncLocalStorage } from 'node:async_hooks';

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const BROWSER_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

const DEFAULT_TIMEOUT_MS = 12000;

export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Journal des requêtes : actif seulement à l'intérieur de withTrace().
const traceStore = new AsyncLocalStorage();
export function withTrace(fn) {
  const trace = [];
  return traceStore.run(trace, async () => ({ result: await fn().catch((err) => ({ error: err })), trace }));
}
function record(entry) {
  const trace = traceStore.getStore();
  if (trace && trace.length < 80) trace.push(entry);
}

// Reconnaît les pages de blocage des principaux pare-feu anti-robots.
export function detectBlock(status, headers, body = '') {
  const server = (headers?.get?.('server') || '').toLowerCase();
  if (headers?.get?.('cf-mitigated') || /just a moment|cf-chl|challenge-platform|attention required! \| cloudflare/i.test(body)) {
    return 'protection anti-robots Cloudflare';
  }
  if (server.includes('cloudflare') && [403, 429, 503].includes(status)) return 'bloqué par Cloudflare';
  if (headers?.get?.('x-sucuri-id') || /sucuri website firewall/i.test(body)) return 'bloqué par le pare-feu Sucuri';
  if (headers?.get?.('x-datadome') || /datadome/i.test(body.slice(0, 5000))) return 'protection anti-robots DataDome';
  if (/wordfence/i.test(body.slice(0, 20000))) return 'bloqué par le pare-feu Wordfence';
  if (server.includes('o2switch') && [403, 429, 503].includes(status)) return 'protection anti-robots de l’hébergeur o2switch';
  // Pages génériques « vérification du navigateur » qui exigent JavaScript.
  if (/security check|test de s[ée]curit[ée]|checking your browser|v[ée]rification de (votre )?navigateur|(enable|activer|activez) javascript|please turn javascript on/i.test(body.slice(0, 20000)) && [403, 429, 503].includes(status)) {
    return 'protection anti-robots (test JavaScript)';
  }
  if (status === 401 && /rest_(cannot_access|not_logged_in|forbidden)|rest api/i.test(body)) return 'API WordPress désactivée pour le public';
  if (status === 429) return 'trop de requêtes (limite atteinte)';
  return null;
}

// Indices sur une page HTML (pour le diagnostic) : titre, moteur de recherche externe, liens produits.
const SEARCH_ENGINES = [
  ['Doofinder', /doofinder/i],
  ['Algolia', /algolia/i],
  ['Klevu', /klevu/i],
  ['Searchanise', /searchanise/i],
  ['Luigi’s Box', /luigisbox/i],
  ['Empathy', /empathy\.co|empathybroker/i],
  ['Sooqr', /sooqr/i],
  ['Clerk.io', /clerk\.io/i],
  ['Boost Commerce', /boost-?commerce|boostsd/i],
  ['Elasticsearch (module)', /elasticsuite|ambjolisearch|ps_elasticsearch/i],
  ['Hawksearch / AddSearch', /hawksearch|addsearch/i],
];
export function htmlHints(html) {
  const hints = [];
  const title = html.match(/<title[^>]*>([^<]{1,120})/i)?.[1]?.replace(/\s+/g, ' ').trim();
  if (title) hints.push(`titre « ${title} »`);
  const engines = SEARCH_ENGINES.filter(([, re]) => re.test(html)).map(([n]) => n);
  if (engines.length) hints.push(`moteur de recherche externe : ${engines.join(', ')} (résultats chargés en JavaScript)`);
  const jsonLd = (html.match(/application\/ld\+json/gi) || []).length;
  if (jsonLd) hints.push(`${jsonLd} bloc(s) JSON-LD`);
  const miniatures = (html.match(/product-miniature|ajax_block_product|product-container|type-product|product-card|product-item/gi) || []).length;
  hints.push(`${miniatures} vignette(s) produit repérée(s)`);
  if (/<noscript>[^<]*javascript/i.test(html) || html.length < 3000) hints.push('page quasi vide sans JavaScript');
  return hints;
}

function snippet(text) {
  return text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

export async function fetchText(url, { headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
  } catch (err) {
    const msg = err.name === 'TimeoutError' ? 'délai dépassé' : `connexion impossible (${err.cause?.code || err.message})`;
    record({ url, status: 0, ms: Date.now() - started, note: msg });
    throw new HttpError(msg, 0);
  }
  const text = await res.text();
  const block = res.ok ? null : detectBlock(res.status, res.headers, text);
  const type = (res.headers.get('content-type') || '').split(';')[0];
  const extra = {};
  if (traceStore.getStore()) {
    if (!res.ok) {
      extra.server = res.headers.get('server') || undefined;
      extra.snippet = snippet(text) || undefined;
    } else if (/html/.test(type)) {
      extra.hints = htmlHints(text);
    }
  }
  record({
    ...extra,
    url,
    finalUrl: res.url && res.url !== url ? res.url : undefined,
    status: res.status,
    ms: Date.now() - started,
    type,
    bytes: text.length,
    note: block || undefined,
  });
  if (!res.ok) throw new HttpError(block ? `HTTP ${res.status} – ${block}` : `HTTP ${res.status}`, res.status);
  return { text, url: res.url || url, status: res.status, headers: res.headers };
}

export async function fetchJson(url, opts = {}) {
  const { text, ...rest } = await fetchText(url, {
    ...opts,
    headers: { Accept: 'application/json, text/javascript, */*; q=0.01', ...(opts.headers || {}) },
  });
  try {
    return { json: JSON.parse(text), ...rest };
  } catch {
    const block = detectBlock(rest.status, rest.headers, text);
    const msg = block || 'réponse non JSON (page HTML au lieu des données)';
    const trace = traceStore.getStore();
    if (trace?.length) trace[trace.length - 1].note = msg;
    throw new HttpError(msg, rest.status);
  }
}

// Exécute des tâches asynchrones avec au plus `limit` en parallèle.
export async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

// Téléchargement binaire (images) avec taille maximale.
export async function fetchBinary(url, { timeoutMs = 8000, maxBytes = 400 * 1024 } = {}) {
  let res;
  try {
    res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, Accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
  } catch (err) {
    throw new HttpError(err.name === 'TimeoutError' ? 'délai dépassé' : 'connexion impossible', 0);
  }
  if (!res.ok) throw new HttpError(`HTTP ${res.status}`, res.status);
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new HttpError('fichier trop lourd', res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new HttpError('fichier trop lourd', res.status);
  return { buf, type: (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase(), url: res.url || url };
}
