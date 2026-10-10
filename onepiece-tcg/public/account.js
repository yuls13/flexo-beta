// Compte utilisateur : connexion Google (Firebase Authentication) et préférences
// enregistrées dans Firestore (document users/{uid}, lisible et modifiable par son seul propriétaire).
// En mode démo, un compte simulé est gardé dans le navigateur.

const FIREBASE_VERSION = '10.14.1';
export const EMPTY_PREFS = { favoriteSeries: [], favoriteShops: [], customShops: [], owned: {}, alerts: [], pushSubscriptions: [] };
export const MAX_ALERTS = 30;
export const MAX_DEVICES = 5;

// Fusion des préférences du compte avec celles déjà présentes sur l'appareil
// (boutiques ajoutées et cartes cochées avant la connexion ne sont pas perdues).
export function mergePrefs(remote, local) {
  const r = { ...EMPTY_PREFS, ...(remote || {}) };
  const l = { ...EMPTY_PREFS, ...(local || {}) };
  const shops = [...r.customShops];
  for (const s of l.customShops) if (!shops.some((x) => x.id === s.id)) shops.push(s);
  const alerts = [...r.alerts];
  for (const a of l.alerts) if (!alerts.some((x) => x.id === a.id)) alerts.push(a);
  const subs = [...r.pushSubscriptions];
  for (const s of l.pushSubscriptions) if (!subs.some((x) => x.endpoint === s.endpoint)) subs.push(s);
  return {
    favoriteSeries: [...new Set([...r.favoriteSeries, ...l.favoriteSeries])],
    favoriteShops: [...new Set([...r.favoriteShops, ...l.favoriteShops])],
    customShops: shops.slice(0, 10),
    owned: { ...l.owned, ...r.owned },
    alerts: alerts.slice(0, MAX_ALERTS),
    pushSubscriptions: subs.slice(-MAX_DEVICES),
  };
}

function demoBackend() {
  const read = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  };
  const write = (k, v) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* stockage indisponible */
    }
  };
  let listener = () => {};
  return {
    available: true,
    demo: true,
    onChange(cb) {
      listener = cb;
      cb(read('demoUser', null));
    },
    async signIn() {
      const user = { uid: 'demo', name: 'Capitaine Démo', email: 'compte-demo@exemple.fr', photo: null };
      write('demoUser', user);
      listener(user);
    },
    async signOut() {
      write('demoUser', null);
      listener(null);
    },
    async load() {
      return read('demoPrefs', null);
    },
    async save(_uid, prefs) {
      write('demoPrefs', prefs);
    },
    async remove() {
      write('demoPrefs', null);
    },
  };
}

async function firebaseBackend(config) {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [{ initializeApp }, authMod, fs] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);
  const app = initializeApp(config);
  const auth = authMod.getAuth(app);
  const db = fs.getFirestore(app);
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const toUser = (u) => (u ? { uid: u.uid, name: u.displayName || u.email, email: u.email, photo: u.photoURL } : null);
  const ref = (uid) => fs.doc(db, 'users', uid);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;

  // Retour d'une connexion par redirection (app installée sur l'écran d'accueil).
  authMod.getRedirectResult(auth).catch(() => {});

  return {
    available: true,
    demo: false,
    onChange(cb) {
      authMod.onAuthStateChanged(auth, (u) => cb(toUser(u)));
    },
    async signIn() {
      if (standalone) return authMod.signInWithRedirect(auth, provider);
      try {
        await authMod.signInWithPopup(auth, provider);
      } catch (err) {
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(err.code)) {
          return authMod.signInWithRedirect(auth, provider);
        }
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
        if (err.code === 'auth/unauthorized-domain') {
          throw new Error('Ce site n’est pas autorisé dans Firebase (Authentication → Paramètres → Domaines autorisés).');
        }
        throw err;
      }
    },
    signOut: () => authMod.signOut(auth),
    async load(uid) {
      const snap = await fs.getDoc(ref(uid));
      return snap.exists() ? snap.data() : null;
    },
    async save(uid, prefs) {
      // merge : les champs tenus par le serveur (appareils désinscrits retirés) ne sont pas écrasés à l'aveugle.
      await fs.setDoc(ref(uid), { ...prefs, updatedAt: fs.serverTimestamp() }, { merge: true });
    },
    async remove(uid) {
      await fs.deleteDoc(ref(uid));
    },
  };
}

// auth = { provider: 'firebase', firebase: {...} } | { provider: 'demo' } | null
export async function createAccount(auth) {
  if (auth?.provider === 'demo') return demoBackend();
  if (auth?.provider === 'firebase' && auth.firebase?.apiKey) {
    try {
      return await firebaseBackend(auth.firebase);
    } catch (err) {
      return { available: false, reason: `Connexion Google indisponible (${err.message}).` };
    }
  }
  return { available: false, reason: 'La connexion Google n’est pas encore configurée sur ce serveur (voir le README, section « Comptes »).' };
}
