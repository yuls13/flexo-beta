// Analyse d'un titre de produit : série, type de produit, langue.

export const PRODUCT_TYPES = {
  display: { label: 'Display (24 boosters)', boosters: 24, size: 'large' },
  booster: { label: 'Booster', boosters: 1, size: 'small' },
  duo: { label: 'Double pack', boosters: 2, size: 'small' },
  starter: { label: 'Starter deck', boosters: 0, size: 'small' },
  coffret: { label: 'Coffret / collection', boosters: 0, size: 'large' },
};

// Produits hors périmètre : cartes à l'unité, accessoires, lots revendus, cases…
const EXCLUDE = [
  /\b(OP|EB|PRB|ST|P)-?\d{2}-\d{3}\b/i, // numéro de carte (ex. OP13-118)
  /\b(sleeves?|prot[èe]ge[- ]cartes?|playmat|tapis|classeur|binder|portfolio|deck ?box|toploader|figurine|peluche|t-shirt|poster)\b/i,
  /\b(psa|bgs|cgc|grad[ée]e?|carte [àa] l'unit[ée])\b/i,
  /\b(case|carton)\b/i,
  /\b([2-9]|\d{2}) ?displays\b/i,
  /\b(pok[ée]mon|lorcana|dragon ball|digimon|yu-?gi-?oh|magic|union arena)\b/i,
  /\bcarte(s)? promo\b|\bpromo card\b/i,
  /\b(vide|empty)\b/i,
];

const TYPE_RULES = [
  ['duo', /\b(double[- ]?pack|duo[- ]?pack|bi-?pack|dp-?\d{1,2}|2 boosters?)\b/i],
  ['display', /\b(display|booster ?box|bo[iî]te de (24 )?boosters?|bo[iî]te 24|box de 24|24 boosters?|pr[ée]sentoir|boite de boosters?)\b/i],
  ['starter', /\b(starter|deck de d[ée]marrage|st-?\d{2}|structure deck)\b/i],
  ['coffret', /\b(premium( card)? collection|gift collection|coffret|collection box|illustration box|anniversary set|special goods|tin|devil fruits? collection|card set)\b/i],
  ['booster', /\b(boosters?|packs?)\b/i],
];

const LANG_RULES = [
  ['JP', /\b(jp|jpn|jap|japonais|japanese|japon|japan|日本語)\b|\(jp\)|\[jp\]/i],
  ['FR', /\b(fr|vf|fran[çc]ais|french|francaise|fran[çc]aise)\b|\(fr\)|\[fr\]/i],
  ['EN', /\b(eng|anglais|english|anglaise)\b|\(en\)|\[en\]/i],
  ['EN', /\bEN\b|\bVA\b/], // sensible à la casse : « en » minuscule est un mot français
];

export function detectLang(title) {
  for (const [lang, re] of LANG_RULES) if (re.test(title)) return lang;
  return null;
}

export function detectType(title) {
  for (const [type, re] of TYPE_RULES) if (re.test(title)) return type;
  return null;
}

export function isExcluded(title) {
  return EXCLUDE.some((re) => re.test(title));
}

export function compileSeries(series) {
  return series.map((s) => ({
    ...s,
    matchRe: (s.match || []).map((m) => new RegExp(m, 'i')),
    excludeRe: (s.exclude || []).map((m) => new RegExp(m, 'i')),
  }));
}

export function matchesSeries(title, s) {
  if (s.excludeRe.some((re) => re.test(title))) return false;
  return s.matchRe.some((re) => re.test(title));
}

// Nombre de boosters dans un lot (« lot de 10 boosters », « x3 », « 6 boosters »).
export function detectQuantity(title) {
  const m = title.match(/\b(?:lot|pack|set) de (\d{1,2})\b|\bx ?(\d{1,2})\b|\b(\d{1,2}) ?x\b|\b(\d{1,2}) boosters\b/i);
  const n = m ? parseInt(m[1] || m[2] || m[3] || m[4], 10) : 1;
  return n > 1 && n < 24 ? n : 1;
}

// Renvoie { type, lang, quantity } si le titre correspond à la série et à un type suivi, sinon null.
export function classify(title, series) {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t || isExcluded(t)) return null;
  if (!matchesSeries(t, series)) return null;
  if (series.special && !/one ?piece|\bST-?\d{2}\b/i.test(t)) return null;
  const type = detectType(t);
  if (!type) return null;
  // Les starters et coffrets sont regroupés dans l'onglet dédié ; l'onglet dédié ne garde qu'eux.
  const allowed = series.types || ['display', 'booster', 'duo'];
  if (!allowed.includes(type)) return null;
  return { type, lang: detectLang(t), quantity: type === 'booster' ? detectQuantity(t) : 1 };
}

// Explication lisible du sort d'un produit (outil de diagnostic).
export function explain(title, series, price) {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) return { ok: false, reason: 'titre vide' };
  if (price == null || !(price > 0)) return { ok: false, reason: 'prix illisible' };
  if (EXCLUDE[0].test(t)) return { ok: false, reason: 'carte à l’unité' };
  if (isExcluded(t)) return { ok: false, reason: 'hors périmètre (accessoire, autre jeu, lot de displays…)' };
  if (!matchesSeries(t, series)) return { ok: false, reason: `pas la série ${series.id}` };
  const cls = classify(t, series);
  if (!cls) {
    const type = detectType(t);
    return { ok: false, reason: type ? `type « ${type} » affiché dans un autre onglet` : 'type de produit non reconnu' };
  }
  return { ok: true, reason: `${PRODUCT_TYPES[cls.type].label}${cls.lang ? ` · ${cls.lang}` : ' · langue ?'}` };
}

export function parsePrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  let s = value.replace(/[^\d.,]/g, '');
  if (!s) return null;
  // « 1.299,90 » ou « 1 299,90 » → 1299.90 ; « 1,299.90 » → 1299.90
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
