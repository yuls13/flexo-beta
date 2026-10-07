// Score de confiance d'une boutique : liste blanche + vérifications en direct
// (ancienneté du domaine via RDAP, note Trustpilot, HTTPS, mentions légales / SIRET).
import dns from 'node:dns/promises';
import net from 'node:net';
import { fetchJson, fetchText } from './http.js';

const TTL_MS = 24 * 60 * 60 * 1000;
const RETRY_TTL_MS = 10 * 60 * 1000; // vérification échouée : on réessaie plus tôt

export function rootDomain(domain) {
  return domain.toLowerCase().replace(/^www\./, '');
}

export async function domainAge(domain) {
  const { json } = await fetchJson(`https://rdap.org/domain/${rootDomain(domain)}`, {
    headers: { Accept: 'application/rdap+json, application/json' },
  });
  const ev = (json.events || []).find((e) => /registration/i.test(e.eventAction));
  if (!ev) return null;
  const created = new Date(ev.eventDate);
  return Number.isNaN(+created) ? null : { created: created.toISOString().slice(0, 10), years: (Date.now() - created) / 3.156e10 };
}

export function parseTrustpilot(html) {
  const score = html.match(/"trustScore"\s*:\s*([\d.]+)/) || html.match(/"ratingValue"\s*:\s*"?([\d.]+)/);
  const count = html.match(/"numberOfReviews"\s*:\s*(\d+)/) || html.match(/"reviewCount"\s*:\s*"?(\d+)/);
  if (!score) return null;
  return { rating: parseFloat(score[1]), reviews: count ? parseInt(count[1], 10) : null };
}

export async function trustpilot(domain) {
  for (const d of [rootDomain(domain), `www.${rootDomain(domain)}`]) {
    try {
      const { text } = await fetchText(`https://www.trustpilot.com/review/${d}`);
      const tp = parseTrustpilot(text);
      if (tp) return { ...tp, url: `https://www.trustpilot.com/review/${d}` };
    } catch (err) {
      if (err.status !== 404) throw err;
    }
  }
  return null;
}

const LEGAL_LINK = /href="([^"]*(?:mentions[-_]?l[ée]gales|legal[-_]?notice|impressum|imprint|informations?-legales|cgv|conditions-generales)[^"]*)"/i;
const COMPANY_ID = /\b(siret|siren|rcs|n° ?tva|tva intra|num[ée]ro de tva|ust-?id|handelsregister|hrb ?\d|kvk|vat (number|no))\b/i;

export async function siteChecks(domain) {
  const { text, url } = await fetchText(`https://${domain}/`);
  const https = url.startsWith('https://');
  const legalHref = text.match(LEGAL_LINK)?.[1];
  let legal = !!legalHref || /mentions l[ée]gales|impressum/i.test(text);
  let companyId = COMPANY_ID.test(text);
  if (legalHref && !companyId) {
    try {
      const page = await fetchText(new URL(legalHref, url).href);
      companyId = COMPANY_ID.test(page.text);
      legal = true;
    } catch {
      /* page légale injoignable : on garde le résultat de la page d'accueil */
    }
  }
  return { https, legal, companyId };
}

// Calcul du score (fonction pure, testée). Chaque critère rapporte ou retire des points.
export function computeScore({ whitelisted, flags = {}, blacklisted, age, tp, site }) {
  const checks = [];
  const add = (label, ok, points, detail) => checks.push({ label, ok, points: ok == null ? 0 : points, detail });

  if (blacklisted) {
    checks.push({ label: 'Signalée comme arnaque', ok: false, points: -100, detail: blacklisted.reason, source: blacklisted.source });
    return { score: 0, level: 'danger', checks };
  }
  add('Liste blanche vérifiée', whitelisted, whitelisted ? 30 : 0, whitelisted ? 'Boutique sélectionnée et suivie' : 'Hors liste blanche');

  if (site) {
    add('Connexion sécurisée (HTTPS)', site.https, site.https ? 10 : -20);
    add('Mentions légales / CGV', site.legal, site.legal ? 10 : -15);
    add('Identifiant société (SIRET, RCS, TVA…)', site.companyId, site.companyId ? 10 : 0, site.companyId ? null : 'Non trouvé automatiquement');
  } else {
    add('Site joignable', null, 0, 'Vérification impossible pour le moment');
  }

  if (age) {
    const y = age.years;
    const pts = y >= 5 ? 20 : y >= 2 ? 15 : y >= 1 ? 5 : y >= 0.5 ? -10 : -30;
    add('Ancienneté du domaine', y >= 1, pts, `Créé le ${age.created} (${y >= 1 ? `${Math.floor(y)} an${y >= 2 ? 's' : ''}` : `${Math.round(y * 12)} mois`})`);
  } else {
    add('Ancienneté du domaine', null, 0, 'Inconnue');
  }

  if (tp) {
    const weight = tp.reviews != null && tp.reviews < 20 ? 0.5 : 1;
    const base = tp.rating >= 4.5 ? 20 : tp.rating >= 4 ? 15 : tp.rating >= 3.5 ? 5 : tp.rating >= 3 ? -5 : -20;
    add('Avis Trustpilot', tp.rating >= 3.5, Math.round(base * weight), `${tp.rating.toFixed(1)}/5${tp.reviews != null ? ` sur ${tp.reviews} avis` : ''}`);
  } else {
    add('Avis Trustpilot', null, 0, 'Aucune page d’avis trouvée');
  }

  if (flags.physicalStore) add('Magasin physique', true, 5);
  if (flags.establishedRetailer) add('Enseigne reconnue', true, 10);
  if (flags.pokescamVerified) add('Référencée fiable par Pokescam', true, 5);
  if (flags.buyerProtection) add('Protection acheteur', true, 5);

  const score = Math.max(0, Math.min(100, checks.reduce((s, c) => s + c.points, 0)));
  // Aucune vérification en direct n'a abouti : on ne conclut pas (ni « fiable » ni « risqué »).
  const unverified = !site && !age && !tp;
  const level = unverified ? 'unknown' : score >= 75 ? 'high' : score >= 55 ? 'good' : score >= 35 ? 'medium' : 'low';
  return { score, level, checks, unverified };
}

export const LEVEL_LABELS = { high: 'Très fiable', good: 'Fiable', medium: 'Prudence', low: 'Risqué', danger: 'Arnaque signalée', unknown: 'Non vérifiable' };

async function settle(p) {
  try {
    return await p;
  } catch {
    return null;
  }
}

export function createTrustService({ shops, blacklist }) {
  const cache = new Map();
  const byDomain = new Map(shops.map((s) => [rootDomain(s.domain), s]));
  const black = new Map(blacklist.map((b) => [rootDomain(b.domain), b]));

  async function evaluate(domain) {
    const root = rootDomain(domain);
    const cached = cache.get(root);
    if (cached && Date.now() - cached.at < (cached.data.unverified ? RETRY_TTL_MS : TTL_MS)) return cached.data;
    const shop = byDomain.get(root);
    const blacklisted = black.get(root) || null;
    const [age, tp, site] = blacklisted
      ? [null, null, null]
      : await Promise.all([settle(domainAge(root)), settle(trustpilot(root)), settle(siteChecks(shop?.domain || domain))]);
    const result = computeScore({ whitelisted: !!shop, flags: shop?.flags, blacklisted, age, tp, site });
    const data = {
      domain: root,
      shopId: shop?.id || null,
      ...result,
      label: LEVEL_LABELS[result.level],
      trustpilotUrl: tp?.url || null,
      checkedAt: new Date().toISOString(),
    };
    cache.set(root, { data, at: Date.now() });
    return data;
  }

  return { evaluate };
}

// Protection SSRF pour « Vérifier un site » : nom de domaine public uniquement.
export async function sanitizeDomain(input) {
  let host = String(input || '').trim().toLowerCase();
  if (!host) return null;
  try {
    host = new URL(host.includes('://') ? host : `https://${host}`).hostname;
  } catch {
    return null;
  }
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || net.isIP(host)) return null;
  try {
    const addrs = await dns.lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivate(a.address))) return null;
  } catch {
    return { host, unresolved: true };
  }
  return { host };
}

function isPrivate(ip) {
  if (net.isIPv6(ip)) return /^(::1|fc|fd|fe80|::ffff:(10|127|192\.168|169\.254|172\.(1[6-9]|2\d|3[01]))\.)/i.test(ip) || ip === '::';
  return /^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01])|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7]))\./.test(ip);
}
