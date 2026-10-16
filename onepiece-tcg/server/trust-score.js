// Score de confiance d'une boutique (fonction pure, utilisable aussi dans le navigateur).

// Calcul du score (fonction pure, testée). Chaque critère rapporte ou retire des points.
// Toutes les boutiques sont jugées sur les mêmes critères, qu'elles soient suivies par l'app
// ou ajoutées par l'utilisateur (le critère « liste blanche » a été retiré).
export function computeScore({ flags = {}, blacklisted, age, tp, site, registry, google }) {
  const checks = [];
  const add = (label, ok, points, detail) => checks.push({ label, ok, points: ok == null ? 0 : points, detail });

  if (blacklisted) {
    checks.push({ label: 'Signalée comme arnaque', ok: false, points: -100, detail: blacklisted.reason, source: blacklisted.source });
    return { score: 0, level: 'danger', checks };
  }

  if (site) {
    add('Connexion sécurisée (HTTPS)', site.https, site.https ? 10 : -20);
    add('Mentions légales / CGV', site.legal, site.legal ? 10 : -15);
    add('Identifiant société (SIRET, RCS, TVA…)', site.companyId, site.companyId ? 10 : 0, site.companyId ? null : 'Non trouvé automatiquement');
    const pay = site.payments;
    if (pay?.card || pay?.paypal) {
      add('Paiement sécurisé (CB / PayPal)', true, 10, [pay.card && 'carte bancaire', pay.paypal && 'PayPal'].filter(Boolean).join(' et ') + ' mentionnés sur le site');
    } else if (pay?.transfer) {
      add('Paiement sécurisé (CB / PayPal)', false, -25, 'Seul le virement bancaire est mentionné : aucun recours en cas de problème');
    } else {
      add('Paiement sécurisé (CB / PayPal)', null, 0, 'Moyens de paiement non trouvés sur la page d’accueil');
    }
  } else {
    add('Site joignable', null, 0, 'Vérification impossible pour le moment');
  }

  // Registre officiel des entreprises (France) : la société du SIREN affiché existe-t-elle et est-elle active ?
  if (registry) {
    if (registry.status === 'active') {
      add('Société active au registre officiel', true, 10, `${registry.name || `SIREN ${registry.siren}`}${registry.created ? `, créée en ${registry.created.slice(0, 4)}` : ''}`);
    } else if (registry.status === 'closed') {
      add('Société active au registre officiel', false, -30, `${registry.name || `SIREN ${registry.siren}`} : société fermée${registry.closed ? ` depuis ${registry.closed.slice(0, 4)}` : ''}`);
    } else if (registry.status === 'invalid') {
      // Numéro mal recopié ou mal lu automatiquement : signalé sans pénalité.
      add('Société active au registre officiel', null, 0, `Le numéro lu sur le site (${registry.siren}) n’est pas un SIREN valide`);
    } else {
      add('Société active au registre officiel', null, 0, `SIREN ${registry.siren} introuvable dans l’annuaire des entreprises`);
    }
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

  // Avis Google (si une clé Google Places est configurée sur le serveur).
  if (google) {
    const weight = google.reviews != null && google.reviews < 20 ? 0.5 : 1;
    const base = google.rating >= 4.5 ? 15 : google.rating >= 4 ? 10 : google.rating >= 3.5 ? 5 : google.rating >= 3 ? -5 : -15;
    add('Avis Google', google.rating >= 3.5, Math.round(base * weight), `${google.rating.toFixed(1)}/5${google.reviews != null ? ` sur ${google.reviews} avis` : ''}`);
  }

  if (flags.physicalStore) add('Magasin physique', true, 5);
  if (flags.establishedRetailer) add('Enseigne reconnue', true, 10);
  if (flags.pokescamVerified) add('Référencée fiable par Pokescam', true, 5);
  if (flags.buyerProtection) add('Protection acheteur', true, 5);

  const score = clampScore(checks.reduce((s, c) => s + c.points, 0));
  // Aucune vérification en direct n'a abouti : on ne conclut pas (ni « fiable » ni « risqué »).
  const unverified = !site && !age && !tp && !google;
  const level = unverified ? 'unknown' : levelFor(score);
  return { score, level, checks, unverified };
}

export const clampScore = (n) => Math.max(0, Math.min(100, n));
export const levelFor = (score) => (score >= 75 ? 'high' : score >= 55 ? 'good' : score >= 35 ? 'medium' : 'low');

// Expérience personnelle de l'utilisateur (« j'ai déjà commandé ici ») : +10 / −10 sur SON score.
export function withExperience(trust, experience) {
  if (!trust || trust.level === 'danger' || !['good', 'bad'].includes(experience)) return trust;
  const points = experience === 'good' ? 10 : -10;
  const score = clampScore(trust.score + points);
  const check = { label: 'Mon expérience', ok: experience === 'good', points, detail: experience === 'good' ? 'Commande bien passée' : 'Commande mal passée', personal: true };
  // Boutique non vérifiable : l'avis personnel est affiché, mais ne suffit pas à conclure.
  const level = trust.unverified ? 'unknown' : levelFor(score);
  return { ...trust, score, level, label: LEVEL_LABELS[level], checks: [...trust.checks, check], personal: experience };
}

export const LEVEL_LABELS = { high: 'Très fiable', good: 'Fiable', medium: 'Prudence', low: 'Risqué', danger: 'Arnaque signalée', unknown: 'Non vérifiable' };

