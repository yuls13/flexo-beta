// Serveur HTTP sans dépendance : fichiers statiques (public/) + API JSON.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSeries, PRODUCT_TYPES } from './classify.js';
import { createPriceService } from './prices.js';
import { createTrustService, computeScore, sanitizeDomain, rootDomain, LEVEL_LABELS } from './trust.js';
import { demoSearch, demoTrust } from './demo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;
const DEMO = process.env.DEMO === '1';

const readJson = async (f) => JSON.parse(await fs.readFile(path.join(__dirname, 'config', f), 'utf8'));
const { series: rawSeries } = await readJson('series.json');
const { shops, shippingDefaults } = await readJson('shops.json');
const { domains: blacklist } = await readJson('blacklist.json');
const series = compileSeries(rawSeries);

const priceService = createPriceService({
  shops,
  shippingDefaults,
  blacklist,
  series,
  searchImpl: DEMO ? demoSearch : null,
});

const trustService = DEMO
  ? {
      evaluate: async (domain) => {
        const shop = shops.find((s) => rootDomain(s.domain) === rootDomain(domain));
        const blacklisted = blacklist.find((b) => rootDomain(b.domain) === rootDomain(domain)) || null;
        const r = computeScore({ whitelisted: !!shop, flags: shop?.flags, blacklisted, ...demoTrust(shop || { domain }) });
        return { domain: rootDomain(domain), shopId: shop?.id || null, ...r, label: LEVEL_LABELS[r.level], checkedAt: new Date().toISOString() };
      },
    }
  : createTrustService({ shops, blacklist });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function publicShop(s) {
  return {
    id: s.id,
    name: s.name,
    domain: s.domain,
    platform: s.platform,
    country: s.country,
    notes: s.notes || null,
    searchUrl: s.searchUrl || null,
    refs: s.refs || [],
  };
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/config') {
    return sendJson(res, 200, {
      demo: DEMO,
      series: rawSeries.map(({ id, code, names, release, special }) => ({ id, code, names, release, special: !!special })),
      shops: shops.map(publicShop),
      productTypes: PRODUCT_TYPES,
      blacklist,
    });
  }

  if (url.pathname === '/api/prices') {
    const id = url.searchParams.get('series');
    const s = series.find((x) => x.id === id);
    if (!s) return sendJson(res, 404, { error: 'Série inconnue' });
    const data = await priceService.getSeries(id, { force: url.searchParams.get('refresh') === '1' });
    return sendJson(res, 200, { ...data, demo: DEMO });
  }

  if (url.pathname === '/api/trust') {
    const results = await Promise.all(shops.map((s) => trustService.evaluate(s.domain)));
    return sendJson(res, 200, { demo: DEMO, shops: results });
  }

  if (url.pathname === '/api/check') {
    const clean = await sanitizeDomain(url.searchParams.get('domain'));
    if (!clean) return sendJson(res, 400, { error: 'Adresse de site invalide' });
    if (clean.unresolved && !blacklist.some((b) => rootDomain(b.domain) === rootDomain(clean.host))) {
      return sendJson(res, 200, {
        domain: clean.host,
        score: 0,
        level: 'low',
        label: LEVEL_LABELS.low,
        checks: [{ label: 'Le domaine n’existe pas ou ne répond pas', ok: false, points: 0 }],
      });
    }
    return sendJson(res, 200, await trustService.evaluate(clean.host));
  }

  return sendJson(res, 404, { error: 'Route inconnue' });
}

async function serveStatic(res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await fs.readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else await serveStatic(res, url);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Erreur interne' });
  }
});

server.listen(PORT, () => {
  console.log(`OP TCG Prix → http://localhost:${PORT}${DEMO ? '  (MODE DÉMO : données fictives)' : ''}`);
});
