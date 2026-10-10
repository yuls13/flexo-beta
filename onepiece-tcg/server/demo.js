// Mode démo (DEMO=1) : données FICTIVES pour tester l'interface sans accès réseau aux boutiques.
// Toutes les réponses portent demo: true et l'interface affiche un bandeau d'avertissement.

function rand(seed) {
  let x = 0;
  for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

const TEMPLATES = [
  { t: 'Display 24 boosters {code} {name} (FR)', base: 135, spread: 60 },
  { t: 'One Piece Card Game {code} Booster Box - English', base: 140, spread: 70 },
  { t: 'Display One Piece {code} japonais - 24 boosters', base: 95, spread: 40 },
  { t: 'Booster {code} {name} - Français', base: 5.5, spread: 2 },
  { t: 'Booster Pack {code} English', base: 6, spread: 2 },
  { t: 'Double Pack {code} {name} FR', base: 17, spread: 6 },
  { t: 'Double Pack Set {code} - EN', base: 16, spread: 6 },
];

const STARTER_TEMPLATES = [
  { t: 'Starter Deck ST-29 One Piece (FR)', base: 13, spread: 4 },
  { t: 'One Piece Card Game Starter Deck ST-30 English', base: 14, spread: 5 },
  { t: 'One Piece Premium Card Collection - FR', base: 32, spread: 12 },
  { t: 'Coffret One Piece Gift Collection 2026 (FR)', base: 45, spread: 15 },
];

export function demoSearch(shop, query, series) {
  const r = rand(shop.id + series.id + query);
  if (r() < 0.25) return [];
  const templates = series.special ? STARTER_TEMPLATES : TEMPLATES;
  const name = series.names.fr || series.names.en || '';
  return templates
    .filter(() => r() < 0.45)
    .map((tpl, i) => {
      const suspicious = r() < 0.04;
      const price = suspicious ? tpl.base * 0.4 : tpl.base + (r() - 0.35) * tpl.spread;
      return {
        title: tpl.t.replace('{code}', series.id.replace(/(\D+)(\d+)/, '$1$2')).replace('{name}', name),
        price: Math.round(price * 100) / 100 - 0.1,
        url: `${shop.base || 'https://' + shop.domain}/demo/${series.id.toLowerCase()}-${i}-${query.length}`,
        available: r() > 0.25,
        preorder: r() < 0.1,
        image: null,
      };
    });
}

export function demoTrust(shop) {
  const r = rand(shop.domain);
  return {
    age: (() => {
      const created = `20${10 + Math.floor(r() * 14)}-0${1 + Math.floor(r() * 8)}-15`;
      return { created, years: (Date.now() - new Date(created)) / 3.156e10 };
    })(),
    tp: r() < 0.8 ? { rating: 3 + r() * 2, reviews: Math.floor(10 + r() * 2000) } : null,
    site: { https: true, legal: r() > 0.1, companyId: r() > 0.3 },
  };
}

// Chase cards FICTIVES pour le mode démo (noms de personnages, prix inventés, pas de visuel).
export function demoCards(series) {
  if (!series || Object.values(series.release || {}).every((d) => d > new Date().toISOString().slice(0, 10))) {
    return { available: true, demo: true, lang: 'EN/FR', updatedAt: null, cards: [] };
  }
  const r = rand(series.id + 'chase');
  const names = ['Monkey D. Luffy', 'Roronoa Zoro', 'Nami', 'Shanks', 'Boa Hancock', 'Trafalgar Law', 'Yamato', 'Portgas D. Ace', 'Sanji', 'Nico Robin', 'Kaido', 'Charlotte Katakuri', 'Sabo', 'Uta'];
  const cards = names
    .map((name, i) => {
      const variant = 2 + (i % 3);
      const price = Math.round((8 + r() ** 2 * 900) * 100) / 100;
      const code = `${series.id}-${String(20 + i * 7).padStart(3, '0')}`;
      return { idProduct: `demo-${series.id}-${i}`, name, code, variant, eur: price, priceSource: i % 3 ? 'tcgplayer' : 'cardmarket', usd: i % 3 ? Math.round(price / 0.92) : null, avg7: i % 3 ? null : price, price, images: [], url: '#' };
    })
    .sort((a, b) => b.price - a.price);
  return { available: true, demo: true, lang: 'EN/FR', updatedAt: new Date().toISOString(), cards };
}
