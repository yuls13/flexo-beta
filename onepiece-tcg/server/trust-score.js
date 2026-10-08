// Score de confiance d'une boutique (fonction pure, utilisable aussi dans le navigateur).

// Calcul du score (fonction pure, testée). Chaque critère rapporte ou retire des points.
export function computeScore({ whitelisted, flags = {}, blacklisted, age, tp, site }) {
  const checks = [];
  const add = (label, ok, points, detail) => checks.push({ label, ok, points: ok == null ? 0 : points, detail });

  if (blacklisted) {
    checks.push({ label: 'Signalée comme arnaque', ok: false, points: -100, detail: blacklisted.reason, source: blacklisted.source });
    return { score: 0, level: 'danger', checks };
  }
  add('Liste blanche vérifiée', whitelisted, whitelisted ? 30 : 0, whitelisted ? 'Boutique sélectionnée et suivie' : 'Hors liste blanche');

  if (site) {
    add('Connexion sécurisée (HTTPS)', site.https, site.https ? 10 : -20);
    add('Mentions légales / CGV', site.legal, site.legal ? 10 : -15);
    add('Identifiant société (SIRET, RCS, TVA…)', site.companyId, site.companyId ? 10 : 0, site.companyId ? null : 'Non trouvé automatiquement');
  } else {
    add('Site joignable', null, 0, 'Vérification impossible pour le moment');
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

  if (flags.physicalStore) add('Magasin physique', true, 5);
  if (flags.establishedRetailer) add('Enseigne reconnue', true, 10);
  if (flags.pokescamVerified) add('Référencée fiable par Pokescam', true, 5);
  if (flags.buyerProtection) add('Protection acheteur', true, 5);

  const score = Math.max(0, Math.min(100, checks.reduce((s, c) => s + c.points, 0)));
  // Aucune vérification en direct n'a abouti : on ne conclut pas (ni « fiable » ni « risqué »).
  const unverified = !site && !age && !tp;
  const level = unverified ? 'unknown' : score >= 75 ? 'high' : score >= 55 ? 'good' : score >= 35 ? 'medium' : 'low';
  return { score, level, checks, unverified };
}

export const LEVEL_LABELS = { high: 'Très fiable', good: 'Fiable', medium: 'Prudence', low: 'Risqué', danger: 'Arnaque signalée', unknown: 'Non vérifiable' };

