# 🏴‍☠️ Grand Line Prix — comparateur One Piece Card Game

Application web (installable sur téléphone) qui compare en direct les prix des **displays, boosters, double packs, starter decks et coffrets** One Piece Card Game, série par série, parmi une **liste blanche de boutiques vérifiées**, avec un **score de confiance** pour chaque boutique et une **alerte sur les prix suspects**.

- Séries suivies : OP-13 à OP-18 (OP-18 et EB-05 à venir), EB-03, EB-04, PRB-02, plus un onglet *Starters & coffrets*.
- Langues : 🇫🇷 FR, 🇬🇧 EN, 🇯🇵 JP (détectées dans le titre du produit).
- **Précommandes** : pour une série (ou une langue) pas encore sortie, les offres commandables sont signalées 🗓️ *Précommande* avec la date de sortie. Elles sont aussi détectées partout via la mention « précommande / pre-order » ou le statut « sur commande ». Un filtre *En stock + précos / Précommandes / Tout* permet de les isoler. Une version FR sans date annoncée prend la date EN, car les sorties FR et EN sont simultanées depuis OP-15.
- Total = prix + **port estimé** vers la France, tri par total (et par prix au booster pour les boosters).
- Bouton **Actualiser** : relance la recherche à tout moment. Les résultats sont gardés 10 min côté serveur, et une nouvelle recherche est possible toutes les 45 s par série.

![Aperçu (mode démo, prix fictifs)](docs/apercu-demo.png)

## Lancer en local

Node.js 20 ou plus récent. **Aucune dépendance à installer.**

```bash
cd onepiece-tcg
npm start          # http://localhost:3000
npm run demo       # mode démo : prix FICTIFS, pour tester l'interface hors ligne
npm test           # tests unitaires
```

## Mettre en ligne gratuitement (Render)

1. Sur [render.com](https://render.com), choisir **New → Web Service** et connecter ce dépôt GitHub.
2. Remplir les champs suivants :
   - **Branch** : la branche contenant l'app.
   - **Root Directory** : `onepiece-tcg`
   - **Runtime** : Node
   - **Build Command** : `npm install` (aucune dépendance, cette étape est instantanée)
   - **Start Command** : `npm start`
   - **Instance type** : Free
3. Une fois déployé, ouvrir l'URL `https://….onrender.com` sur le téléphone, puis :
   - Android/Chrome : menu ⋮ → *Installer l'application*.
   - iPhone/Safari : bouton Partager → *Sur l'écran d'accueil*.

> La formule gratuite de Render met le serveur en veille après 15 min d'inactivité. La première ouverture prend alors environ 30 à 50 s, ensuite c'est instantané.

Toute autre plateforme Node fonctionne aussi (Railway, Fly.io, un VPS, un Raspberry Pi…), car le serveur écoute sur `PORT`.

## Comment ça marche

```
public/            interface (HTML/CSS/JS sans build, PWA)
server/index.js    serveur HTTP + API
server/adapters/   lecture des boutiques : shopify | woocommerce | prestashop
server/classify.js reconnaissance série / type de produit / langue, exclusions
server/prices.js   agrégation, port estimé, alertes de prix, cache
server/trust.js    score de confiance + outil « Vérifier un site »
server/config/     series.json, shops.json (liste blanche), blacklist.json
```

**Lecture des prix** : l'app n'utilise pas Google. Elle interroge directement le moteur de recherche de chaque boutique de la liste blanche, via les points d'accès publics standard :

| Plateforme | Point d'accès |
|---|---|
| Shopify | `/search/suggest.json` |
| WooCommerce | `/wp-json/wc/store/v1/products` |
| PrestaShop | page de recherche en JSON (`ajax=1`), avec repli sur le HTML |

Les sites protégés contre les robots (Cardmarket, Fnac, Cultura, Micromania, Play-In, Amazon) apparaissent sous forme de **liens de recherche directs**.

**Score de confiance (0 à 100)** :

| Critère | Points |
|---|---|
| Boutique sur la liste blanche | +30 |
| Connexion HTTPS | +10 / −20 |
| Mentions légales ou CGV | +10 / −15 |
| SIRET, RCS ou n° de TVA trouvé | +10 |
| Ancienneté du domaine (RDAP) : plus de 5 ans → moins de 6 mois | +20 → −30 |
| Note Trustpilot : 4,5 et plus → moins de 3 | +20 → −20 |
| Magasin physique, enseigne reconnue, référencement Pokescam, protection acheteur | bonus |

Paliers : Très fiable (75 et plus), Fiable (55 et plus), Prudence (35 et plus), Risqué. Si aucune vérification en direct n'aboutit, la boutique affiche « Non vérifiable » au lieu d'un score trompeur.

**Prix suspect** : un prix est signalé s'il est inférieur de 40 % ou plus au prix médian du même produit (même type, même langue), ou s'il passe sous un prix plancher réaliste (par exemple 85 € pour un display FR/EN). Les offres suspectes ne sont jamais mises en avant comme « meilleur prix ».

**Vérifier un site** : collez n'importe quelle adresse pour obtenir son score (liste noire, ancienneté, avis, HTTPS, mentions légales).

## Personnaliser

- **Ajouter une boutique** : ajouter une entrée dans `server/config/shops.json` avec `platform` = `shopify`, `woocommerce`, `prestashop` ou `link`. Pour connaître la plateforme d'un site, la forme de ses URL aide : `/products/…` pour Shopify, `/produit/…` ou `/product/…` pour WooCommerce, `/123-nom-produit.html` pour PrestaShop.
- **Frais de port réels** : ajouter par exemple `"shipping": { "small": 3.5, "large": 8.9, "freeFrom": 100 }` à une boutique. Sans ce champ, les estimations par défaut s'appliquent (France : 4,90 € / 7,90 € ; Europe : 9,90 € / 14,90 €).
- **Nouvelle série** (OP-19…) : ajouter un bloc dans `server/config/series.json` avec ses codes de recherche et ses noms.

## Limites connues

- Les prix proviennent des moteurs de recherche des boutiques. Un titre de produit mal rédigé (langue absente, par exemple) peut être classé en « Langue ? ».
- Une boutique peut changer de plateforme ou bloquer les requêtes automatiques. Elle apparaît alors « injoignable » dans *Boutiques interrogées* et les autres continuent de fonctionner.
- Le port affiché est une estimation. Le score de confiance est une aide à la décision, pas une garantie : payez toujours par CB ou PayPal.

*Outil personnel non affilié à Bandai, Toei Animation ni aux boutiques citées.*
