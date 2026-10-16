// Alertes de prix : après chaque relevé d'une série, compare la meilleure offre de chaque alerte
// (série, type, langue, prix maximum port inclus) et prévient l'utilisateur par notification push.
import { PRODUCT_TYPES } from './classify.js';
import { validSubscription } from './push.js';

const RENOTIFY_MS = 24 * 60 * 60 * 1000; // même offre au même prix : au plus une notification par jour
const LANG_NAMES = { FR: 'FR', EN: 'EN', JP: 'JP' };

export function matchAlert(alert, offers) {
  const max = Number(alert.maxPrice);
  if (!(max > 0)) return null;
  return (
    (offers || [])
      .filter(
        (o) =>
          o.type === alert.type &&
          (alert.lang === 'any' || !alert.lang || o.lang === alert.lang) &&
          o.available !== false &&
          (o.quantity || 1) === 1 &&
          !(o.flags || []).some((f) => f.kind === 'suspect') &&
          o.total <= max
      )
      .sort((a, b) => a.total - b.total)[0] || null
  );
}

// Alerte « ouverture des précommandes » : offres commandables de la série (en précommande ou
// déjà en stock), hors prix suspects, dans la langue voulue. La moins chère par boutique.
export function preorderOffers(alert, offers) {
  const byShop = new Map();
  for (const o of offers || []) {
    if (o.available === false || (!o.preorder && o.available !== true)) continue;
    if (alert.lang && alert.lang !== 'any' && o.lang !== alert.lang) continue;
    if ((o.flags || []).some((f) => f.kind === 'suspect')) continue;
    const cur = byShop.get(o.shopId);
    if (!cur || o.total < cur.total) byShop.set(o.shopId, o);
  }
  return [...byShop.values()].sort((a, b) => a.total - b.total);
}

export function preorderMessage(alert, newOffers, totalShops) {
  const euros = (n) => `${n.toFixed(2).replace('.', ',')} €`;
  const first = newOffers[0];
  const lang = alert.lang && alert.lang !== 'any' ? ` ${LANG_NAMES[alert.lang]}` : '';
  const others = newOffers.length - 1;
  return {
    title: `🗓️ ${alert.series}${lang} : précommandes ouvertes !`,
    body: `Chez ${first.shopName}${others > 0 ? ` et ${others} autre${others > 1 ? 's' : ''} boutique${others > 1 ? 's' : ''}` : ''}, dès ${euros(first.total)} port compris${
      totalShops > newOffers.length ? ` (${totalShops} boutiques au total)` : ''
    }`,
    url: first.url,
    tag: `preorder-${alert.id}`,
  };
}

export function alertMessage(alert, offer) {
  const type = PRODUCT_TYPES[alert.type]?.label.replace(' (24 boosters)', '') || alert.type;
  const lang = offer.lang ? ` ${LANG_NAMES[offer.lang]}` : '';
  const euros = (n) => `${n.toFixed(2).replace('.', ',')} €`;
  return {
    title: `🔔 ${alert.series} · ${type}${lang} à ${euros(offer.total)}`,
    body: `Chez ${offer.shopName}, port compris (votre seuil : ${euros(Number(alert.maxPrice))})${offer.preorder ? ' · précommande' : ''}`,
    url: offer.url,
    tag: `alert-${alert.id}`,
  };
}

export function createAlertService({ db, push }) {
  let usersCache = null;

  async function users() {
    if (usersCache && Date.now() - usersCache.at < 2 * 60 * 1000) return usersCache.list;
    const list = await db.list('users');
    usersCache = { list, at: Date.now() };
    return list;
  }

  // Utilisateurs ayant au moins une alerte active sur cette série et un appareil abonné.
  async function watchers(seriesId) {
    return (await users()).filter(
      ({ data }) => (data.alerts || []).some((a) => a && a.active !== false && a.series === seriesId) && (data.pushSubscriptions || []).some(validSubscription)
    );
  }

  // extraOffers(uid, data) : offres supplémentaires propres à l'utilisateur (ses boutiques ajoutées).
  async function evaluate(seriesId, priceData, { extraOffers = null } = {}) {
    if (!db || !push?.available || !priceData?.offers) return { sent: 0 };
    let sent = 0;
    for (const { id: uid, data } of await users()) {
      const alerts = (data.alerts || []).filter((a) => a && a.active !== false && a.series === seriesId);
      const subs = (data.pushSubscriptions || []).filter(validSubscription);
      if (!alerts.length || !subs.length) continue;
      const offers = extraOffers ? [...priceData.offers, ...(extraOffers(uid, data) || [])] : priceData.offers;
      const state = (await db.get(`alertState/${uid}`)) || {};
      const updates = {};
      const gone = new Set();
      for (const alert of alerts) {
        if (alert.kind === 'preorder') {
          // Prévenu à chaque nouvelle boutique qui ouvre les précommandes (une seule notification par relevé).
          const found = preorderOffers(alert, offers);
          const known = new Set(state.notified?.[alert.id]?.shops || []);
          const fresh = found.filter((o) => !known.has(o.shopId));
          if (!fresh.length) continue;
          let delivered = false;
          for (const sub of subs) {
            const r = await push.send(sub, preorderMessage(alert, fresh, found.length));
            if (r.ok) delivered = true;
            if (r.gone) gone.add(sub.endpoint);
          }
          if (delivered) {
            sent++;
            updates[alert.id] = { shops: [...known, ...fresh.map((o) => o.shopId)].slice(-100), at: new Date().toISOString() };
          }
          continue;
        }
        const offer = matchAlert(alert, offers);
        if (!offer) continue;
        const key = `${offer.url}|${offer.total}`;
        const prev = state.notified?.[alert.id];
        if (prev && prev.key === key && Date.now() - Date.parse(prev.at) < RENOTIFY_MS) continue;
        const message = alertMessage(alert, offer);
        let delivered = false;
        for (const sub of subs) {
          const r = await push.send(sub, message);
          if (r.ok) delivered = true;
          if (r.gone) gone.add(sub.endpoint);
        }
        if (delivered) {
          sent++;
          updates[alert.id] = { key, at: new Date().toISOString(), total: offer.total, shop: offer.shopName };
        }
      }
      if (Object.keys(updates).length) await db.set(`alertState/${uid}`, { notified: { ...(state.notified || {}), ...updates } });
      // Appareils désinscrits : retirés de la liste.
      if (gone.size) await db.set(`users/${uid}`, { pushSubscriptions: (data.pushSubscriptions || []).filter((s) => !gone.has(s.endpoint)) });
    }
    return { sent };
  }

  return { evaluate, watchers };
}
