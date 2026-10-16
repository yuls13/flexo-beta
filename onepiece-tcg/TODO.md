# Berry Radar — reste à faire

## À vérifier
- [ ] **Version PC** : relire l'affichage sur ordinateur après la refonte (affiches WANTED, liste d'offres, tri, fond).

## Réglages (facultatifs)
- [ ] Avis Google : clé Google Places dans `GOOGLE_PLACES_API_KEY` sur Render (voir README).

## Pistes
- [ ] Tableau compact et triable des offres sur ordinateur.
- [ ] Prix Cardmarket des chase cards.
- [ ] Nom de domaine + pages légales (mentions légales, confidentialité).
- [ ] Affiliation avec les boutiques.
- [ ] Publication Play Store (PWABuilder, 25 $, 12 testeurs pendant 14 jours).

## Fait
- [x] Cron relevé des prix toutes les 6 h (`0,5 */6 * * *`).
- [x] Cron `/api/ping` toutes les 10 min (serveur éveillé).
- [x] Règles Firestore à jour (`shopReviews`).
