// Serveur HTTP sans dépendance : fichiers statiques (public/) + API JSON.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSeries, PRODUCT_TYPES } from './classify.js';
import { createPriceService } from './prices.js';
import { createTrustService, computeScore, sanitizeDomain, rootDomain, LEVEL_LABELS } from './trust.js';
import { demoSearch, demoTrust, demoCards } from './demo.js';
import { inspectShop, parseCustomParam, customShopId, MAX_CUSTOM_SHOPS } from './customShops.js';
import { createCardmarketService } from './cardmarket.js';
import { createLogoService, googleFavicon } from './logos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;
const DEMO = process.env.DEMO === '1';

// Connexion Google (Firebase). La configuration web Firebase n'est pas secrète : elle identifie
// le projet ; la sécurité repose sur les règles Firestore (firestore.rules).
const FIREBASE = process.env.FIREBASE_API_KEY
  ? {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID,
      appId: process.env.FIREBASE_APP_ID,
    }
  : null;
const AUTH = DEMO ? { provider: 'demo' } : FIREBASE ? { provider: 'firebase', firebase: FIREBASE } : null;

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

const cardService = DEMO ? { getTop: async (id) => demoCards(rawSeries.find((s) => s.id === id)) } : createCardmarketService();
const knownDomains = new Set(shops.map((s) => rootDomain(s.domain)));
const logoService = createLogoService();
const isBlacklisted = (domain) => blacklist.find((b) => rootDomain(b.domain) === rootDomain(domain)) || null;

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
      auth: AUTH,
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
    const extraShops = await parseCustomParam(url.searchParams.get('custom'), { knownDomains, blacklist });
    const data = await priceService.getSeries(id, { force: url.searchParams.get('refresh') === '1', extraShops });
    return sendJson(res, 200, { ...data, demo: DEMO });
  }

  if (url.pathname === '/api/trust') {
    const results = await Promise.all(shops.map((s) => trustService.evaluate(s.domain)));
    // Boutiques personnelles : domaines séparés par des virgules.
    const custom = (url.searchParams.get('custom') || '').split(',').filter(Boolean).slice(0, MAX_CUSTOM_SHOPS);
    for (const d of custom) {
      const clean = await sanitizeDomain(d);
      if (!clean || clean.unresolved || knownDomains.has(rootDomain(clean.host))) continue;
      results.push({ ...(await trustService.evaluate(clean.host)), shopId: customShopId(clean.host) });
    }
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

  if (url.pathname === '/api/shop/inspect') {
    const input = url.searchParams.get('url');
    const pre = await sanitizeDomain(input);
    if (pre && knownDomains.has(rootDomain(pre.host))) {
      return sendJson(res, 409, { error: 'Cette boutique fait déjà partie de la liste surveillée.' });
    }
    const info = DEMO
      ? pre
        ? { domain: pre.host, base: `https://${pre.host}`, name: rootDomain(pre.host).split('.')[0], platform: 'shopify' }
        : { error: 'Adresse de site invalide' }
      : await inspectShop(input);
    if (info.error) return sendJson(res, 400, { error: info.error });
    const trust = { ...(await trustService.evaluate(info.domain)), shopId: customShopId(info.domain) };
    const black = isBlacklisted(info.domain);
    return sendJson(res, 200, {
      ...info,
      id: customShopId(info.domain),
      trust,
      blocked: black ? `Site signalé comme arnaque : ${black.reason}` : null,
    });
  }

  if (url.pathname === '/api/logo') {
    // Domaine d'une boutique suivie, ou domaine public validé (boutiques personnelles).
    const raw = String(url.searchParams.get('domain') || '').toLowerCase();
    const known = shops.find((s) => s.domain === raw || rootDomain(s.domain) === rootDomain(raw));
    const clean = known ? { host: known.domain } : await sanitizeDomain(raw);
    if (!clean || clean.unresolved) return sendJson(res, 400, { error: 'Domaine invalide' });
    const logo = DEMO ? { fail: true } : await logoService.get(clean.host);
    if (logo.buf) {
      res.writeHead(200, {
        'Content-Type': logo.type,
        'Cache-Control': 'public, max-age=604800',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      });
      return res.end(logo.buf);
    }
    res.writeHead(302, { Location: googleFavicon(rootDomain(clean.host)), 'Cache-Control': 'public, max-age=86400' });
    return res.end();
  }

  if (url.pathname === '/api/cards') {
    const s = rawSeries.find((x) => x.id === url.searchParams.get('series'));
    if (!s) return sendJson(res, 404, { error: 'Série inconnue' });
    if (s.special) return sendJson(res, 200, { available: false, cards: [], error: 'Pas de top cartes pour cet onglet' });
    return sendJson(res, 200, { ...(await cardService.getTop(s.id)), demo: DEMO });
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
  console.log(`Berry Radar → http://localhost:${PORT}${DEMO ? '  (MODE DÉMO : données fictives)' : ''}`);
});
