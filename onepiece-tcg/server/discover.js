// Découverte de nouvelles boutiques par l'IA : Claude cherche sur le web des boutiques en ligne qui
// vendent la série, puis le serveur vérifie chaque proposition (domaine, liste noire, plateforme,
// score de confiance) avant de la montrer. Rien n'est ajouté sans l'accord de l'utilisateur.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';
const CACHE_MS = 24 * 60 * 60 * 1000; // une recherche par série et par jour, partagée
const MAX_RESULTS = 10;

// Marketplaces, réseaux sociaux et sites déjà couverts autrement : exclus de la recherche.
const BLOCKED = [
  'amazon.fr', 'amazon.com', 'amazon.de', 'ebay.fr', 'ebay.com', 'ebay.de', 'vinted.fr', 'leboncoin.fr',
  'cardmarket.com', 'aliexpress.com', 'temu.com', 'wish.com', 'rakuten.com', 'cdiscount.com',
  'facebook.com', 'instagram.com', 'tiktok.com', 'youtube.com', 'reddit.com', 'x.com', 'twitter.com',
];

// Dernier bloc JSON de la réponse (```json … ``` ou tableau brut).
export function extractJson(text) {
  const fenced = [...String(text).matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]);
  const candidates = fenced.length ? fenced.reverse() : [String(text).slice(String(text).indexOf('['), String(text).lastIndexOf(']') + 1)];
  for (const c of candidates) {
    try {
      const v = JSON.parse(c.trim());
      if (Array.isArray(v)) return v;
      if (Array.isArray(v?.shops)) return v.shops;
    } catch {
      /* bloc suivant */
    }
  }
  return [];
}

// Nettoie une proposition de l'IA (données non fiables : tout est revérifié ensuite).
export function cleanCandidate(c) {
  if (!c || typeof c !== 'object') return null;
  let url = null;
  let host = null;
  try {
    const u = new URL(String(c.url || (c.domain ? `https://${c.domain}` : '')));
    if (!/^https?:$/.test(u.protocol)) return null;
    url = u.href;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  const price = Number(String(c.price ?? '').replace(',', '.'));
  return {
    host,
    name: String(c.name || host).replace(/[<>]/g, '').slice(0, 40),
    url,
    product: String(c.product || '').replace(/[<>]/g, '').slice(0, 140),
    price: Number.isFinite(price) && price > 0 && price < 5000 ? Math.round(price * 100) / 100 : null,
    availability: ['stock', 'preorder', 'unknown'].includes(c.availability) ? c.availability : 'unknown',
  };
}

function prompt(series, exclude) {
  const name = [series.names?.fr, series.names?.en].filter(Boolean).join(' / ');
  return `Trouve des boutiques en ligne (de préférence françaises, sinon européennes livrant en France) qui vendent des produits scellés du jeu de cartes **One Piece Card Game**, série **${series.code}**${name ? ` (« ${name} »)` : ''} : display de 24 boosters, boosters, double packs, en stock ou en précommande.

Règles :
- Uniquement des boutiques indépendantes ou enseignes avec leur propre site. Pas de marketplace (Amazon, eBay, Vinted, Leboncoin, Cardmarket…), pas de réseaux sociaux, pas d'articles de presse.
- Attention aux autres jeux : « EB-xx » existe aussi chez Pokémon. Le produit doit être One Piece Card Game, série ${series.code}.
- Ignore ces domaines, déjà suivis : ${exclude.join(', ') || 'aucun'}.
- Ne donne que des boutiques dont tu as vu une vraie page produit dans les résultats de recherche. N'invente jamais d'adresse.
- Au plus ${MAX_RESULTS} boutiques.

Termine ta réponse par un bloc \`\`\`json contenant un tableau d'objets :
{"name": "nom de la boutique", "domain": "exemple.fr", "url": "adresse de la page produit", "product": "titre du produit", "price": 149.9 ou null, "availability": "stock" | "preorder" | "unknown"}`;
}

export function createDiscoveryService({ apiKey, validate }) {
  if (!apiKey) return { available: false };
  const client = new Anthropic({ apiKey });
  const cache = new Map(); // seriesId -> { at, data }
  const inflight = new Map();

  async function search(series, exclude) {
    const tools = [
      {
        type: 'web_search_20260209',
        name: 'web_search',
        max_uses: 8,
        blocked_domains: BLOCKED,
        user_location: { type: 'approximate', country: 'FR' },
      },
    ];
    let messages = [{ role: 'user', content: prompt(series, exclude) }];
    let response;
    // Le serveur peut suspendre un tour long (pause_turn) : on le relance, au plus 4 fois.
    for (let i = 0; i < 5; i++) {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: 'medium' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        tools,
        messages,
      });
      if (response.stop_reason !== 'pause_turn') break;
      messages = [messages[0], { role: 'assistant', content: response.content }];
    }
    if (response.stop_reason === 'refusal') throw new Error('recherche refusée par le modèle');
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const searches = response.usage?.server_tool_use?.web_search_requests ?? null;
    return { raw: extractJson(text), searches };
  }

  async function discover(series, { exclude = [] } = {}) {
    const hit = cache.get(series.id);
    if (hit && Date.now() - hit.at < CACHE_MS) return { ...hit.data, cached: true };
    if (inflight.has(series.id)) return inflight.get(series.id);
    const p = (async () => {
      const { raw, searches } = await search(series, exclude);
      const seen = new Set();
      const candidates = [];
      for (const c of raw.map(cleanCandidate).filter(Boolean)) {
        const root = c.host.replace(/^www\./, '');
        if (seen.has(root) || BLOCKED.some((b) => root === b || root.endsWith(`.${b}`))) continue;
        seen.add(root);
        // Vérification par le serveur : domaine réel et public, hors liste noire et hors boutiques
        // déjà suivies, plateforme lisible, score de confiance.
        const checked = await validate(c).catch(() => null);
        if (checked) candidates.push(checked);
        if (candidates.length >= MAX_RESULTS) break;
      }
      const data = { series: series.id, at: new Date().toISOString(), searches, candidates };
      cache.set(series.id, { at: Date.now(), data });
      return { ...data, cached: false };
    })().finally(() => inflight.delete(series.id));
    inflight.set(series.id, p);
    return p;
  }

  return { available: true, discover };
}
