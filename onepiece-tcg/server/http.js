// Petits utilitaires réseau : fetch avec délai maximum et limiteur de parallélisme.

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 OPTCG-Prix/1.0';

const DEFAULT_TIMEOUT_MS = 12000;

export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function fetchText(url, { headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8', ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
  } catch (err) {
    if (err.name === 'TimeoutError') throw new HttpError('délai dépassé', 0);
    throw new HttpError(`connexion impossible (${err.cause?.code || err.message})`, 0);
  }
  const text = await res.text();
  if (!res.ok) throw new HttpError(`HTTP ${res.status}`, res.status);
  return { text, url: res.url, status: res.status, headers: res.headers };
}

export async function fetchJson(url, opts = {}) {
  const { text, ...rest } = await fetchText(url, {
    ...opts,
    headers: { Accept: 'application/json, text/javascript, */*; q=0.01', ...(opts.headers || {}) },
  });
  try {
    return { json: JSON.parse(text), ...rest };
  } catch {
    throw new HttpError('réponse non JSON (boutique protégée ou format inattendu)', rest.status);
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
