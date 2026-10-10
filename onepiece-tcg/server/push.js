// Envoi des notifications push (Web Push, clés VAPID).
import webpush from 'web-push';

export function createPushService({ publicKey, privateKey, subject }) {
  if (!publicKey || !privateKey) return { available: false, publicKey: null, send: async () => ({ ok: false, gone: false }) };
  webpush.setVapidDetails(subject || 'mailto:contact@berry-radar.local', publicKey, privateKey);
  return {
    available: true,
    publicKey,
    // Renvoie gone: true si l'abonnement n'existe plus (appareil désinscrit) : il faut l'oublier.
    async send(subscription, payload) {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 24 * 3600, urgency: 'normal' });
        return { ok: true, gone: false };
      } catch (err) {
        return { ok: false, gone: [404, 410].includes(err.statusCode), error: err.statusCode || err.message };
      }
    },
  };
}

export function validSubscription(sub) {
  return (
    sub &&
    typeof sub.endpoint === 'string' &&
    /^https:\/\//.test(sub.endpoint) &&
    sub.endpoint.length < 1000 &&
    typeof sub.keys?.p256dh === 'string' &&
    typeof sub.keys?.auth === 'string'
  );
}
