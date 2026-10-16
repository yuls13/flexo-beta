// Score de confiance d'une boutique : vérifications en direct (ancienneté du domaine via RDAP,
// note Trustpilot, avis Google, HTTPS, mentions légales, SIREN vérifié au registre, moyens de paiement).
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

// Moyens de paiement mentionnés (icônes du pied de page, CGV…).
const PAY_CARD = /\b(visa|master ?card|carte bancaire|cartes bancaires|carte de cr[ée]dit|american express|amex|apple ?pay|google ?pay|shopify payments|stripe|payplug|stancer|monetico|systempay|paybox|up2pay|lyra|sumup|mollie|adyen|alma)\b/i;
const PAY_PAYPAL = /pay ?pal/i;
const PAY_TRANSFER = /\bvirement/i;
export function detectPayments(text) {
  return { card: PAY_CARD.test(text), paypal: PAY_PAYPAL.test(text), transfer: PAY_TRANSFER.test(text) };
}

// SIREN valide : 9 chiffres, clé de Luhn correcte.
export function validSiren(siren) {
  if (!/^\d{9}$/.test(siren)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(siren[8 - i]);
    if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return sum % 10 === 0;
}

// Numéro SIREN affiché sur le site (SIRET, SIREN, RCS ou TVA intracommunautaire française).
export function extractSiren(text) {
  const plain = String(text || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ');
  const patterns = [
    /\bsiret\b[^\d]{0,25}(\d{3})[\s.]?(\d{3})[\s.]?(\d{3})[\s.]?\d{5}\b/i,
    /\b(?:siren|r\.?c\.?s\.?(?:\s+[a-zà-ÿ' -]{2,30})?)\b[^\d]{0,25}(\d{3})[\s.]?(\d{3})[\s.]?(\d{3})\b/i,
    /\bFR[\s-]?[0-9A-Z]{2}[\s-]?(\d{3})[\s.]?(\d{3})[\s.]?(\d{3})\b/,
  ];
  let invalid = null;
  for (const re of patterns) {
    const m = plain.match(re);
    if (!m) continue;
    const siren = m[1] + m[2] + m[3];
    if (validSiren(siren)) return { siren, valid: true };
    invalid ||= { siren, valid: false };
  }
  return invalid;
}

// Annuaire officiel des entreprises (API publique et gratuite de l'État).
export async function companyRegistry(siren) {
  const { json } = await fetchJson(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}&page=1&per_page=1`);
  const r = (json.results || []).find((x) => x.siren === siren);
  if (!r) return { siren, status: 'unknown' };
  return {
    siren,
    status: r.etat_administratif === 'C' ? 'closed' : 'active',
    name: r.nom_complet || r.nom_raison_sociale || null,
    created: r.date_creation || null,
    closed: r.date_fermeture || null,
  };
}

// Avis Google via l'API Google Places (clé GOOGLE_PLACES_API_KEY facultative).
export async function googleReviews(domain, apiKey) {
  if (!apiKey) return null;
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.websiteUri',
    },
    body: JSON.stringify({ textQuery: rootDomain(domain), languageCode: 'fr', maxResultCount: 5 }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Google Places ${res.status}`);
  const { places = [] } = await res.json();
  // Seule une fiche dont le site web est bien ce domaine est retenue.
  const place = places.find((p) => {
    try {
      return rootDomain(new URL(p.websiteUri).hostname) === rootDomain(domain);
    } catch {
      return false;
    }
  });
  return place?.rating ? { rating: place.rating, reviews: place.userRatingCount ?? null, name: place.displayName?.text || null } : null;
}

export async function siteChecks(domain) {
  const { text, url } = await fetchText(`https://${domain}/`);
  const https = url.startsWith('https://');
  const legalHref = text.match(LEGAL_LINK)?.[1];
  let legal = !!legalHref || /mentions l[ée]gales|impressum/i.test(text);
  let companyId = COMPANY_ID.test(text);
  let pages = text;
  if (legalHref) {
    try {
      const page = await fetchText(new URL(legalHref, url).href);
      companyId ||= COMPANY_ID.test(page.text);
      pages += ` ${page.text}`;
      legal = true;
    } catch {
      /* page légale injoignable : on garde le résultat de la page d'accueil */
    }
  }
  return { https, legal, companyId, payments: detectPayments(pages), siren: extractSiren(pages) };
}

export { computeScore, LEVEL_LABELS } from './trust-score.js';
import { computeScore, LEVEL_LABELS } from './trust-score.js';

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
    const [age, tp, site, google] = blacklisted
      ? [null, null, null, null]
      : await Promise.all([
          settle(domainAge(root)),
          settle(trustpilot(root)),
          settle(siteChecks(shop?.domain || domain)),
          settle(googleReviews(root, process.env.GOOGLE_PLACES_API_KEY)),
        ]);
    let registry = null;
    if (site?.siren) {
      registry = site.siren.valid ? (await settle(companyRegistry(site.siren.siren))) : { siren: site.siren.siren, status: 'invalid' };
    }
    const result = computeScore({ flags: shop?.flags, blacklisted, age, tp, site, registry, google });
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
