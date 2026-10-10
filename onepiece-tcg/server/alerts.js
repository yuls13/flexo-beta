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

  async function evaluate(seriesId, priceData) {
    if (!db || !push?.available || !priceData?.offers) return { sent: 0 };
    let sent = 0;
    for (const { id: uid, data } of await users()) {
      const alerts = (data.alerts || []).filter((a) => a && a.active !== false && a.series === seriesId);
      const subs = (data.pushSubscriptions || []).filter(validSubscription);
      if (!alerts.length || !subs.length) continue;
      const state = (await db.get(`alertState/${uid}`)) || {};
      const updates = {};
      const gone = new Set();
      for (const alert of alerts) {
        const offer = matchAlert(alert, priceData.offers);
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

  return { evaluate };
}
