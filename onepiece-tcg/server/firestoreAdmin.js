// Accès serveur à Firestore (API REST) avec un compte de service Firebase, sans dépendance :
// jeton OAuth obtenu par JWT signé (RS256), puis lecture/écriture de documents.
// Le compte de service contourne les règles de sécurité : utilisé seulement côté serveur.
import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/datastore';

// FIREBASE_SERVICE_ACCOUNT : contenu JSON de la clé (brut ou encodé en base64).
export function parseServiceAccount(raw) {
  if (!raw) return null;
  let text = String(raw).trim();
  if (!text.startsWith('{')) {
    try {
      text = Buffer.from(text, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
  try {
    const sa = JSON.parse(text);
    if (!sa.client_email || !sa.private_key || !sa.project_id) return null;
    return { ...sa, private_key: sa.private_key.replace(/\\n/g, '\n') };
  } catch {
    return null;
  }
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export function signedAssertion(sa, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })
  );
  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key);
  return `${header}.${claims}.${b64url(signature)}`;
}

// ---- Conversion valeurs JS <-> format Firestore REST ----
export function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, toValue(x)])) } };
}

export function fromValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return null;
}

export const fromFields = (fields) => Object.fromEntries(Object.entries(fields || {}).map(([k, x]) => [k, fromValue(x)]));

export function createFirestoreAdmin(serviceAccount, { fetchImpl = (...a) => fetch(...a) } = {}) {
  if (!serviceAccount) return null;
  const base = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents`;
  let token = null;

  async function accessToken() {
    if (token && token.exp - 60_000 > Date.now()) return token.value;
    const res = await fetchImpl(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signedAssertion(serviceAccount) }),
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) throw new Error(`authentification Firebase refusée (${body.error_description || body.error || res.status})`);
    token = { value: body.access_token, exp: Date.now() + (body.expires_in || 3600) * 1000 };
    return token.value;
  }

  async function call(method, path, body) {
    const res = await fetchImpl(`${base}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 404) return null;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Firestore ${method} ${path} : ${json.error?.message || res.status}`);
    return json;
  }

  return {
    projectId: serviceAccount.project_id,
    async get(path) {
      const doc = await call('GET', path);
      return doc ? fromFields(doc.fields) : null;
    },
    // Écrit les champs donnés (les autres champs du document sont conservés).
    async set(path, data) {
      const fields = toValue(data).mapValue.fields;
      // Noms de champs simples (lettres, chiffres, _) : utilisables tels quels dans le masque.
      const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
      await call('PATCH', `${path}?${mask}`, { fields });
    },
    async list(collection, pageSize = 300) {
      const out = [];
      let pageToken = '';
      do {
        const json = await call('GET', `${collection}?pageSize=${pageSize}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
        for (const d of json?.documents || []) out.push({ id: d.name.split('/').pop(), data: fromFields(d.fields) });
        pageToken = json?.nextPageToken || '';
      } while (pageToken && out.length < 5000);
      return out;
    },
  };
}
