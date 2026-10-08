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
  if (status === 401 && /rest_(cannot_access|not_logged_in|forbidden)|rest api/i.test(body)) return 'API WordPress désactivée pour le public';
  if (status === 429) return 'trop de requêtes (limite atteinte)';
  return null;
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
  record({
    url,
    finalUrl: res.url && res.url !== url ? res.url : undefined,
    status: res.status,
    ms: Date.now() - started,
    type: (res.headers.get('content-type') || '').split(';')[0],
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
    throw new HttpError(block || 'réponse non JSON (page HTML au lieu des données)', rest.status);
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
