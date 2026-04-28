const { useState, useEffect, useRef, useCallback } = React;

const DARK = {
  bg: "#0B1219", card: "#151F2B", cardL: "#1E2D3D",
  accent: "#00E676", accentDim: "rgba(0,230,118,0.12)", accentGlow: "rgba(0,230,118,0.25)",
  text: "#E4EEF2", dim: "#6B8FA8",
  orange: "#FF9100", orangeDim: "rgba(255,145,0,0.12)",
  red: "#FF5252", redDim: "rgba(255,82,82,0.1)",
  blue: "#448AFF", blueDim: "rgba(68,138,255,0.12)",
  purple: "#B388FF", purpleDim: "rgba(179,136,255,0.12)",
  gold: "#FFD700", goldDim: "rgba(255,215,0,0.1)", goldGlow: "rgba(255,215,0,0.2)",
};
const LIGHT = {
  bg: "#F2F4F7", card: "#FFFFFF", cardL: "#DDE1E8",
  accent: "#00C853", accentDim: "rgba(0,200,83,0.10)", accentGlow: "rgba(0,200,83,0.15)",
  text: "#1a1a2e", dim: "#5a6b7d",
  orange: "#E68200", orangeDim: "rgba(230,130,0,0.10)",
  red: "#D32F2F", redDim: "rgba(211,47,47,0.08)",
  blue: "#1565C0", blueDim: "rgba(21,101,192,0.10)",
  purple: "#7C4DFF", purpleDim: "rgba(124,77,255,0.10)",
  gold: "#F9A825", goldDim: "rgba(249,168,37,0.10)", goldGlow: "rgba(249,168,37,0.15)",
};
const C = { ...DARK };
const applyTheme = (t) => { const src = t === "light" ? LIGHT : DARK; Object.assign(C, src); };
const tC = { flash: C.orange, standard: C.blue, deep: C.purple, sos: C.red };
const tBg = { flash: C.orangeDim, standard: C.blueDim, deep: C.purpleDim, sos: C.redDim };
const tL = { flash: "Flash", standard: "Standard", deep: "Deep", sos: "SOS" };

// ─── DATA ─────────────────────────────────
const SECTORS = [
  { id: "bureau", icon: "💻", label: "Bureau / Écran", desc: "Développeur, comptable, designer…", zones: ["Nuque", "Poignets", "Yeux", "Dos"] },
  { id: "terrain", icon: "🏗️", label: "Terrain / Physique", desc: "Ouvrier, manutentionnaire…", zones: ["Dos", "Épaules", "Genoux"] },
  { id: "conduite", icon: "🚗", label: "Conduite / Transport", desc: "Chauffeur, livreur…", zones: ["Dos", "Nuque", "Jambes"] },
  { id: "commerce", icon: "🏪", label: "Commerce / Debout", desc: "Vendeur, coiffeur, serveur…", zones: ["Jambes", "Dos", "Épaules"] },
  { id: "sante", icon: "🏥", label: "Santé / Soin", desc: "Infirmier, aide-soignant…", zones: ["Dos", "Épaules", "Poignets"] },
  { id: "enseignement", icon: "🎓", label: "Enseignement", desc: "Professeur, formateur…", zones: ["Nuque", "Dos", "Yeux"] },
];
const JOBS = {
  bureau: [
    { id: "dev", icon: "👨‍💻", label: "Développeur·se" },
    { id: "comptable", icon: "📊", label: "Comptable" },
    { id: "designer", icon: "🎨", label: "Designer" },
    { id: "redacteur", icon: "📝", label: "Rédacteur·ice" },
    { id: "analyste", icon: "📈", label: "Analyste" },
    { id: "chef_projet", icon: "📋", label: "Chef de projet" },
    { id: "rh", icon: "🤝", label: "RH / Recruteur", pro: true },
    { id: "juriste", icon: "⚖️", label: "Juriste", pro: true },
    { id: "marketing", icon: "📣", label: "Marketing", pro: true },
    { id: "data_scientist", icon: "🧮", label: "Data Scientist", pro: true },
    { id: "product_manager", icon: "🎯", label: "Product Manager", pro: true },
    { id: "secretaire", icon: "📎", label: "Secrétaire", pro: true },
  ],
  terrain: [
    { id: "ouvrier", icon: "👷", label: "Ouvrier·ère" },
    { id: "manutention", icon: "📦", label: "Manutentionnaire" },
    { id: "technicien", icon: "🔧", label: "Technicien·ne" },
    { id: "electricien", icon: "⚡", label: "Électricien·ne" },
    { id: "plombier", icon: "🔩", label: "Plombier·ère", pro: true },
    { id: "peintre", icon: "🖌️", label: "Peintre bâtiment", pro: true },
    { id: "jardinier", icon: "🌿", label: "Jardinier·ère", pro: true },
    { id: "soudeur", icon: "🔥", label: "Soudeur·se", pro: true },
    { id: "mecanicien", icon: "🔧", label: "Mécanicien·ne", pro: true },
    { id: "couvreur", icon: "🏠", label: "Couvreur·se", pro: true },
  ],
  conduite: [
    { id: "chauffeur", icon: "🚛", label: "Chauffeur·se" },
    { id: "livreur", icon: "📦", label: "Livreur·se" },
    { id: "taxi", icon: "🚕", label: "Taxi / VTC" },
    { id: "routier", icon: "🛣️", label: "Routier·ère" },
    { id: "ambulancier", icon: "🚑", label: "Ambulancier·ère", pro: true },
    { id: "chauffeur_bus", icon: "🚌", label: "Chauffeur de bus", pro: true },
    { id: "conducteur_train", icon: "🚆", label: "Conducteur·ice train", pro: true },
    { id: "pilote", icon: "✈️", label: "Pilote", pro: true },
  ],
  commerce: [
    { id: "vendeur", icon: "🛍️", label: "Vendeur·se" },
    { id: "coiffeur", icon: "✂️", label: "Coiffeur·se" },
    { id: "serveur", icon: "🍽️", label: "Serveur·se" },
    { id: "caissier", icon: "🏪", label: "Caissier·ère" },
    { id: "boulanger", icon: "🥖", label: "Boulanger·ère", pro: true },
    { id: "fleuriste", icon: "💐", label: "Fleuriste", pro: true },
    { id: "boucher", icon: "🥩", label: "Boucher·ère", pro: true },
    { id: "barman", icon: "🍸", label: "Barman / Barmaid", pro: true },
    { id: "cuisinier", icon: "👨‍🍳", label: "Cuisinier·ère", pro: true },
    { id: "estheticienne", icon: "💅", label: "Esthéticien·ne", pro: true },
  ],
  sante: [
    { id: "infirmier", icon: "👩‍⚕️", label: "Infirmier·ère" },
    { id: "aide_soignant", icon: "🩺", label: "Aide-soignant·e" },
    { id: "kine", icon: "💆", label: "Kinésithérapeute" },
    { id: "medecin", icon: "⚕️", label: "Médecin" },
    { id: "dentiste", icon: "🦷", label: "Dentiste", pro: true },
    { id: "pharmacien", icon: "💊", label: "Pharmacien·ne", pro: true },
    { id: "sage_femme", icon: "👶", label: "Sage-femme", pro: true },
    { id: "ambulancier_s", icon: "🚑", label: "Ambulancier·ère", pro: true },
    { id: "psychologue", icon: "🧠", label: "Psychologue", pro: true },
    { id: "veterinaire", icon: "🐾", label: "Vétérinaire", pro: true },
  ],
  enseignement: [
    { id: "prof", icon: "👨‍🏫", label: "Professeur·e" },
    { id: "formateur", icon: "🎯", label: "Formateur·ice" },
    { id: "educateur", icon: "📚", label: "Éducateur·ice" },
    { id: "chercheur", icon: "🔬", label: "Chercheur·se" },
    { id: "animateur", icon: "🎪", label: "Animateur·ice", pro: true },
    { id: "bibliothecaire", icon: "📖", label: "Bibliothécaire", pro: true },
    { id: "directeur_ecole", icon: "🏫", label: "Directeur·ice école", pro: true },
    { id: "coach", icon: "🏅", label: "Coach sportif", pro: true },
  ],
};

// ════════════════════════════════════════════════════════════════
// EXERCISE DATABASE — designed by movement specialist logic
// Each exercise has: zone, position (assis/debout/sol), intensity,
// sectors where it's most relevant, and detailed instructions
// ════════════════════════════════════════════════════════════════
const EXERCISES = [
  // ─── NUQUE (8 exercices) ─────────────────
  { id: "n1", name: "Rotation cervicale lente", icon: "🔄", dur: 35, zone: "Nuque", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "enseignement"],
    inst: "Position : assis, dos droit, épaules basses et relâchées, mains sur les cuisses. Tournez lentement la tête vers la gauche en gardant le menton parallèle au sol. Maintenez 5s en fin de course. Revenez au centre. Tournez vers la droite 5s. Répétez 3 fois de chaque côté. Le mouvement doit être fluide et sans douleur.",
    breath: "Inspirez au centre, expirez en tournant" },
  { id: "n2", name: "Inclinaison latérale", icon: "↔️", dur: 25, zone: "Nuque", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "enseignement"],
    inst: "Position : assis, regard droit devant, bras relâchés. Inclinez l'oreille droite vers l'épaule droite sans lever l'épaule — c'est la tête qui descend, pas l'épaule qui monte. Maintenez 5s en sentant l'étirement du scalène et du trapèze supérieur gauche. Revenez au centre. Changez de côté. 3 répétitions par côté.",
    breath: "Expirez lentement pendant l'inclinaison" },
  { id: "n3", name: "Flexion-extension cervicale", icon: "⬇️", dur: 25, zone: "Nuque", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "sante"],
    inst: "Position : assis, dos calé, pieds à plat. Phase 1 : laissez tomber le menton vers la poitrine, sentez l'étirement des muscles sous-occipitaux et du trapèze. Maintenez 5s. Phase 2 : levez le menton vers le plafond en ouvrant la gorge, 5s. Alternez doucement 3 fois. Ne forcez jamais en extension.",
    breath: "Expirez en flexion, inspirez en extension" },
  { id: "n4", name: "Rétraction cervicale (double menton)", icon: "🎯", dur: 30, zone: "Nuque", xp: 12, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite"],
    inst: "Position : assis, dos droit. Rentrez le menton en le poussant vers l'arrière comme pour vous faire un double menton. Gardez le regard à l'horizontale. Vous devez sentir un étirement à la base du crâne. Maintenez 5s, relâchez. Répétez 5 fois. Cet exercice corrige la posture "tête en avant" typique du travail sur écran.",
    breath: "Expirez en rétractant, inspirez en relâchant" },
  { id: "n5", name: "Automassage sous-occipital", icon: "💆", dur: 40, zone: "Nuque", xp: 12, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "enseignement"],
    inst: "Position : assis, coudes sur le bureau. Placez vos deux pouces à la base du crâne, dans les creux de chaque côté de la colonne. Appuyez fermement et faites de petits cercles pendant 10s. Descendez d'un centimètre et recommencez. Couvrez toute la zone sous-occipitale. Terminez en appuyant 5s sans bouger sur le point le plus tendu.",
    breath: "Respirez lentement, relâchez les épaules" },

  // ─── DOS (8 exercices) ───────────────────
  { id: "d1", name: "Chat-vache assis", icon: "🐱", dur: 30, zone: "Dos", xp: 12, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "enseignement"],
    inst: "Position : assis au bord de la chaise, pieds écartés largeur des hanches, mains sur les genoux. Inspirez en creusant le dos depuis le bassin : le ventre avance, la poitrine s'ouvre, le regard monte (vache). Expirez en arrondissant : le bassin bascule, le dos se courbe, le menton rentre (chat). Alternez 5 fois. Le mouvement doit être lent et ondulatoire.",
    breath: "Inspirez en creusant, expirez en arrondissant" },
  { id: "d2", name: "Torsion vertébrale assise", icon: "🔄", dur: 30, zone: "Dos", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "sante", "enseignement"],
    inst: "Position : assis au milieu de la chaise, pieds à plat. Posez la main droite sur le genou gauche, la main gauche sur le dossier ou l'accoudoir. Pivotez le buste vers la gauche en gardant le bassin face à l'avant. Le regard suit la rotation. Maintenez 7s. Revenez et faites l'autre côté. 2 répétitions par côté. Excellent pour la mobilité thoracique.",
    breath: "Grandissez-vous à l'inspiration, pivotez à l'expiration" },
  { id: "d3", name: "Extension lombaire debout", icon: "⬆️", dur: 25, zone: "Dos", xp: 10, pos: "debout", intensity: 2,
    sectors: ["terrain", "conduite", "commerce", "sante"],
    inst: "Position : debout, pieds largeur des hanches. Placez les paumes dans le bas du dos, doigts vers le bas. Contractez légèrement les fessiers puis penchez-vous en arrière en poussant les hanches vers l'avant. Maintenez 5s. Revenez. Répétez 4 fois. Cet exercice décompresse les disques lombaires après une position assise ou penchée prolongée.",
    breath: "Inspirez en extension, expirez en revenant" },
  { id: "d4", name: "Étirement grand dorsal", icon: "🙆", dur: 30, zone: "Dos", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "terrain", "sante"],
    inst: "Position : assis, levez les deux bras au-dessus de la tête et attrapez le poignet droit avec la main gauche. Inclinez-vous vers la gauche en étirant tout le flanc droit. Sentez l'étirement du grand dorsal et des intercostaux. Maintenez 7s. Changez de côté. 2 répétitions par côté.",
    breath: "Inspirez bras en l'air, expirez en inclinant" },
  { id: "d5", name: "Décompression discale", icon: "🧘", dur: 35, zone: "Dos", xp: 14, pos: "assis", intensity: 1,
    sectors: ["conduite", "terrain", "sante"],
    inst: "Position : assis au bord de la chaise, pieds écartés. Laissez tomber le buste entre les genoux, tête lourde, bras pendants vers le sol. Laissez la gravité étirer toute la chaîne postérieure. Restez 15s. Remontez très lentement, vertèbre par vertèbre, la tête en dernier. Répétez 2 fois. Libère la pression des disques intervertébraux.",
    breath: "Respirez dans le bas du dos, sentez-le s'ouvrir" },
  { id: "d6", name: "Ouverture thoracique", icon: "🔓", dur: 30, zone: "Dos", xp: 12, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite"],
    inst: "Position : assis, mains derrière la nuque, coudes ouverts. Poussez la poitrine vers le plafond en ouvrant les coudes au maximum. Sentez l'ouverture entre les omoplates. Maintenez 5s. Relâchez en rapprochant les coudes devant le visage. Répétez 5 fois. Combat directement la posture voûtée du travail sur écran.",
    breath: "Inspirez en ouvrant, expirez en fermant" },

  // ─── ÉPAULES (6 exercices) ───────────────
  { id: "e1", name: "Roulement d'épaules", icon: "🔃", dur: 30, zone: "Épaules", xp: 8, pos: "assis", intensity: 1,
    sectors: ["bureau", "terrain", "sante", "commerce"],
    inst: "Position : assis ou debout, bras relâchés. Montez les épaules vers les oreilles, roulez-les vers l'arrière en serrant les omoplates, puis laissez-les retomber. Le mouvement est ample et contrôlé. 5 rotations vers l'arrière, puis 5 vers l'avant. Insistez sur la phase arrière pour ouvrir la poitrine.",
    breath: "Respirez naturellement, relâchez la mâchoire" },
  { id: "e2", name: "Étirement trapèze supérieur", icon: "↕️", dur: 35, zone: "Épaules", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "enseignement"],
    inst: "Position : assis, main droite sur le dessus de la tête. Tirez doucement l'oreille vers l'épaule droite. Le bras gauche pend le long du corps ou s'accroche sous la chaise pour augmenter l'étirement. Sentez l'étirement du trapèze supérieur gauche. Maintenez 8s. Changez. 2 répétitions par côté.",
    breath: "Expirez en étirant, relâchez sur l'inspiration" },
  { id: "e3", name: "Ouverture pectorale en cadre de porte", icon: "🚪", dur: 35, zone: "Épaules", xp: 12, pos: "debout", intensity: 2,
    sectors: ["bureau", "conduite"],
    inst: "Position : debout dans un cadre de porte, avant-bras posés de chaque côté à 90°. Avancez un pied et laissez le poids du corps ouvrir la poitrine. Sentez l'étirement des pectoraux et du deltoïde antérieur. Maintenez 10s. Reculez. Répétez 3 fois. Essentiel pour corriger les épaules enroulées.",
    breath: "Respirez profondément dans la poitrine ouverte" },
  { id: "e4", name: "Élévation scapulaire isométrique", icon: "💪", dur: 25, zone: "Épaules", xp: 10, pos: "assis", intensity: 2,
    sectors: ["terrain", "sante", "commerce"],
    inst: "Position : assis, bras le long du corps. Serrez les omoplates l'une vers l'autre comme si vous vouliez coincer un crayon entre elles. Maintenez la contraction 5s. Relâchez complètement. Répétez 6 fois. Renforce les muscles stabilisateurs de l'épaule et corrige la posture arrondie.",
    breath: "Inspirez en serrant, expirez en relâchant" },
  { id: "e5", name: "Pendulaire de l'épaule", icon: "🔔", dur: 30, zone: "Épaules", xp: 10, pos: "debout", intensity: 1,
    sectors: ["terrain", "sante", "commerce"],
    inst: "Position : debout, penché en avant, une main sur le bureau. Laissez le bras libre pendre. Faites des petits cercles avec le bras relâché : 10 dans un sens, 10 dans l'autre. Changez de bras. Le mouvement vient du corps, pas de l'épaule. Décompresse l'articulation et soulage les tensions de port de charge.",
    breath: "Respirez naturellement, relâchez tout le bras" },

  // ─── POIGNETS (5 exercices) ──────────────
  { id: "p1", name: "Extension fléchisseurs", icon: "🤲", dur: 28, zone: "Poignets", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "sante"],
    inst: "Position : assis ou debout. Tendez le bras droit, paume vers le haut. Avec la main gauche, tirez doucement les doigts vers vous jusqu'à sentir l'étirement à l'intérieur de l'avant-bras. Maintenez 8s. Changez. Puis paume vers le bas, tirez les doigts vers le bas : étire les extenseurs. 8s par position, chaque main.",
    breath: "Respirez calmement, ne bloquez pas" },
  { id: "p2", name: "Rotations articulaires", icon: "🔁", dur: 35, zone: "Poignets", xp: 8, pos: "assis", intensity: 1,
    sectors: ["bureau", "sante", "commerce"],
    inst: "Position : assis, coudes près du corps, avant-bras à l'horizontale. Fermez les poings. Faites des cercles amples et lents avec les poignets : 10 dans un sens, 10 dans l'autre. Puis ouvrez les doigts en éventail et refermez, 10 fois. Lubrifie les articulations et prévient le syndrome du canal carpien.",
    breath: "Respirez naturellement" },
  { id: "p3", name: "Pression paume contre paume", icon: "🙏", dur: 25, zone: "Poignets", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "sante"],
    inst: "Position : assis, paumes jointes devant la poitrine (position de prière). Descendez les mains vers le nombril en gardant les paumes collées. Sentez l'étirement des fléchisseurs. Maintenez 8s. Puis retournez : dos des mains joints, montez vers le menton. 8s. Répétez 3 fois chaque position.",
    breath: "Respirez profondément pendant les maintiens" },
  { id: "p4", name: "Étirement pouce et thénar", icon: "👍", dur: 25, zone: "Poignets", xp: 8, pos: "assis", intensity: 1,
    sectors: ["bureau", "sante"],
    inst: "Position : assis. Tendez le bras, pouce vers le haut. Avec l'autre main, tirez doucement le pouce vers l'arrière. Sentez l'étirement de l'éminence thénar (base du pouce). Maintenez 6s. Changez de main. Puis massez en cercles la zone charnue à la base de chaque pouce pendant 10s. Soulage les douleurs liées à la souris.",
    breath: "Respirez calmement" },

  // ─── YEUX (5 exercices) ──────────────────
  { id: "y1", name: "Règle 20-20-20", icon: "👀", dur: 25, zone: "Yeux", xp: 8, pos: "assis", intensity: 1,
    sectors: ["bureau", "enseignement"],
    inst: "Position : assis face à l'écran. Levez les yeux et fixez un point situé à au moins 6 mètres pendant 20s. Clignez lentement 5 fois. Puis fermez les yeux 5s. Cette technique rompt le spasme d'accommodation du cristallin causé par la vision de près prolongée. À faire toutes les 20 minutes idéalement.",
    breath: "Relâchez la mâchoire, desserrez les dents" },
  { id: "y2", name: "Palming oculaire", icon: "🙌", dur: 30, zone: "Yeux", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "enseignement"],
    inst: "Position : assis, coudes sur le bureau. Frottez vos paumes l'une contre l'autre vigoureusement pendant 5s pour les chauffer. Posez-les en coupole sur vos yeux fermés sans appuyer sur les globes. Restez dans le noir 20s. La chaleur détend les muscles ciliaires et oculomoteurs. L'obscurité permet à la rétine de se reposer.",
    breath: "Inspirez 4s par le nez, expirez 6s par la bouche" },
  { id: "y3", name: "Gymnastique oculaire", icon: "🎯", dur: 30, zone: "Yeux", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "enseignement"],
    inst: "Position : assis, tête immobile. Regardez le plus loin possible à droite 3s, puis à gauche 3s. Puis en haut 3s, en bas 3s. Faites un grand cercle des yeux dans un sens, puis dans l'autre. Terminez en fixant le bout de votre doigt à 20cm puis un objet au loin, alternez 5 fois. Entretient la mobilité des muscles oculomoteurs.",
    breath: "Respirez naturellement, mâchoire détendue" },

  // ─── JAMBES (6 exercices) ────────────────
  { id: "j1", name: "Pompage des mollets", icon: "🦵", dur: 45, zone: "Jambes", xp: 10, pos: "debout", intensity: 2,
    sectors: ["commerce", "conduite", "bureau"],
    inst: "Position : debout derrière la chaise, mains sur le dossier. Montez sur la pointe des pieds en contractant les mollets, maintenez 2s, redescendez lentement en 3s. Répétez 10 fois. Puis tenez la position haute 10s. Active la pompe veineuse du mollet et relance la circulation dans les jambes.",
    breath: "Expirez en montant, inspirez en descendant" },
  { id: "j2", name: "Étirement quadriceps debout", icon: "🦿", dur: 30, zone: "Jambes", xp: 10, pos: "debout", intensity: 2,
    sectors: ["commerce", "terrain", "conduite"],
    inst: "Position : debout, main gauche sur la chaise. Pliez le genou droit, attrapez le pied avec la main droite, talon vers la fesse. Gardez les genoux serrés, le bassin neutre (ne creusez pas le dos). Sentez l'étirement de la face avant de la cuisse. 10s par jambe, 2 répétitions.",
    breath: "Respirez profondément, gardez l'équilibre" },
  { id: "j3", name: "Étirement ischio-jambiers assis", icon: "🦵", dur: 30, zone: "Jambes", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite"],
    inst: "Position : assis au bord de la chaise. Tendez la jambe droite devant vous, talon au sol, pointe de pied tirée vers vous. Penchez le buste en avant en gardant le dos droit. Sentez l'étirement à l'arrière de la cuisse. Maintenez 10s. Changez de jambe. 2 répétitions. Les ischio-jambiers se raccourcissent en position assise prolongée.",
    breath: "Expirez en vous penchant, grandissez à l'inspiration" },
  { id: "j4", name: "Ouverture des hanches", icon: "🦋", dur: 30, zone: "Jambes", xp: 12, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite"],
    inst: "Position : assis, posez la cheville droite sur le genou gauche (figure en 4). Appuyez doucement sur le genou droit pour ouvrir la hanche. Penchez-vous légèrement en avant. Sentez l'étirement du piriforme et des rotateurs de la hanche. 10s par côté, 2 répétitions. Libère les tensions du bassin liées à la position assise.",
    breath: "Expirez en appuyant, relâchez sur l'inspiration" },
  { id: "j5", name: "Fente du psoas", icon: "🏃", dur: 35, zone: "Jambes", xp: 14, pos: "debout", intensity: 2,
    sectors: ["bureau", "conduite", "enseignement"],
    inst: "Position : debout, faites un grand pas en avant avec le pied droit. Fléchissez le genou avant à 90°, genou arrière descend vers le sol (sans toucher). Poussez les hanches vers l'avant. Sentez l'étirement profond du psoas-iliaque (devant de la hanche arrière). 10s par côté. Le psoas est LE muscle qui souffre le plus en position assise.",
    breath: "Inspirez pour vous grandir, expirez pour approfondir" },

  // ─── GENOUX (4 exercices) ────────────────
  { id: "g1", name: "Genou-poitrine assis", icon: "🧎", dur: 28, zone: "Genoux", xp: 10, pos: "assis", intensity: 1,
    sectors: ["terrain", "commerce", "conduite"],
    inst: "Position : assis au bord de la chaise, dos droit. Attrapez le genou droit avec les deux mains et ramenez-le vers la poitrine. Sentez l'étirement dans la hanche et le bas du dos. Maintenez 8s. Reposez. Changez de côté. 2 répétitions. Mobilise l'articulation du genou en douceur et étire le bas du dos.",
    breath: "Expirez en rapprochant le genou" },
  { id: "g2", name: "Extension du genou assis", icon: "🦵", dur: 30, zone: "Genoux", xp: 10, pos: "assis", intensity: 1,
    sectors: ["terrain", "commerce", "sante"],
    inst: "Position : assis, dos calé. Tendez la jambe droite à l'horizontale, pointe de pied vers vous. Contractez le quadriceps en verrouillant le genou pendant 5s. Redescendez lentement. 8 répétitions par jambe. Renforce le quadriceps qui protège et stabilise le genou. Essentiel pour les métiers avec port de charge.",
    breath: "Expirez en tendant, inspirez en redescendant" },
  { id: "g3", name: "Flexion-extension debout", icon: "🏋️", dur: 35, zone: "Genoux", xp: 12, pos: "debout", intensity: 2,
    sectors: ["terrain", "commerce"],
    inst: "Position : debout, pieds largeur des hanches, mains sur la chaise. Fléchissez les genoux comme pour vous asseoir, descendez sur 3s (ne dépassez pas 90°), remontez sur 3s. 8 répétitions. Le mouvement doit être contrôlé et indolore. Renforce toute la chaîne des membres inférieurs et protège les genoux.",
    breath: "Inspirez en descendant, expirez en remontant" },

  // ─── GLOBAL / RESPIRATION (4 exercices) ──
  { id: "r1", name: "Respiration 4-7-8", icon: "🫁", dur: 40, zone: "Global", xp: 12, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "sante", "enseignement", "terrain", "commerce"],
    inst: "Position : assis confortablement, dos droit, pieds au sol, mains sur les cuisses. Fermez les yeux. Inspirez par le nez en 4s, retenez l'air 7s, expirez lentement par la bouche en 8s en faisant un léger son. Répétez 2 cycles. Active le système nerveux parasympathique et fait baisser le cortisol en quelques minutes.",
    breath: "4s inspir — 7s blocage — 8s expir" },
  { id: "r2", name: "Respiration carrée", icon: "⬜", dur: 50, zone: "Global", xp: 10, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "sante", "enseignement", "terrain", "commerce"],
    inst: "Position : assis, dos droit, yeux fermés ou mi-clos. Inspirez 4s, retenez 4s, expirez 4s, retenez poumons vides 4s. Visualisez un carré : chaque côté est une phase. Répétez 3 cycles. Technique utilisée par les militaires et les athlètes pour retrouver le calme sous pression.",
    breath: "4 temps égaux — régulier et contrôlé" },
  { id: "r3", name: "Cohérence cardiaque 5-5", icon: "❤️", dur: 60, zone: "Global", xp: 14, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "sante", "enseignement", "terrain", "commerce"],
    inst: "Position : assis confortablement, une main sur le ventre. Inspirez par le nez en 5s en gonflant le ventre. Expirez par la bouche en 5s en laissant le ventre redescendre. Répétez pendant 1 minute sans pause (6 cycles). Synchronise le rythme cardiaque et respiratoire. Réduit l'anxiété et améliore la concentration.",
    breath: "5s inspir — 5s expir — sans pause" },
  { id: "r4", name: "Body scan express", icon: "🧠", dur: 45, zone: "Global", xp: 12, pos: "assis", intensity: 1,
    sectors: ["bureau", "conduite", "sante", "enseignement", "terrain", "commerce"],
    inst: "Position : assis, yeux fermés, mains sur les cuisses. Portez votre attention sur le sommet du crâne. Descendez mentalement en relâchant chaque zone : front, mâchoire (desserrez les dents), épaules (laissez-les tomber), bras, mains, ventre, cuisses, pieds. Chaque zone : 3s de conscience puis relâchement. Identifie et dénoue les tensions accumulées.",
    breath: "Respirez lentement et naturellement" },
];

const getEx = (id) => EXERCISES.find(e => e.id === id);

// ════════════════════════════════════════════════════════════════
// SMART PROGRAM BUILDER — builds personalized programs based on:
// sector, painZones, activity level, workspace constraints
// ════════════════════════════════════════════════════════════════

const buildDailyProgram = (zones, profile) => {
  const sectorId = profile?.sectorId || "bureau";
  const level = profile?.level || "Modéré";
  const space = profile?.space || "Debout possible";
  const painZones = profile?.painZones || [];

  // Filter exercises by workspace
  const posAllowed = space === "Assis seulement" ? ["assis"] : space === "Debout possible" ? ["assis", "debout"] : ["assis", "debout", "sol"];
  const maxIntensity = level === "Peu actif" ? 1 : level === "Actif" ? 3 : 2;

  const eligible = EXERCISES.filter(e =>
    posAllowed.includes(e.pos) && e.intensity <= maxIntensity
  );

  const byZone = {};
  eligible.forEach(e => { if (!byZone[e.zone]) byZone[e.zone] = []; byZone[e.zone].push(e); });

  // Score each exercise: higher = more relevant for this user
  const score = (ex) => {
    let s = 0;
    if (ex.sectors.includes(sectorId)) s += 10; // sector match
    if (painZones.includes(ex.zone)) s += 8; // user-selected pain zone
    if (zones.includes(ex.zone)) s += 5; // in risk zones
    s += Math.random() * 2; // slight randomization
    return s;
  };

  // Priority: pain zones first, then sector zones, then others
  const zonePriority = [
    ...painZones,
    ...zones.filter(z => !painZones.includes(z)),
  ].filter((z, i, a) => a.indexOf(z) === i); // deduplicate

  // Build blocks per zone, with best exercises first
  const blocks = zonePriority.map((z, i) => {
    const pool = (byZone[z] || []).sort((a, b) => score(b) - score(a));
    const exCount = z === painZones[0] ? 4 : 3; // more exercises for primary pain zone
    const selected = pool.slice(0, exCount);
    // Add a breathing exercise to longer blocks
    const globals = byZone["Global"] || [];
    const breathEx = globals.sort((a, b) => score(b) - score(a))[i % globals.length];
    const exercises = [...selected.map(e => e.id), breathEx?.id].filter(Boolean);

    return {
      id: "block_" + i,
      zone: z,
      name: z,
      exercises,
      xp: 35 + selected.length * 5 + (painZones.includes(z) ? 10 : 0),
      icon: { Nuque: "🔄", Dos: "🐱", Épaules: "🔃", Poignets: "🤲", Yeux: "👀", Jambes: "🦵", Genoux: "🧎" }[z] || "🧘",
    };
  });

  // Add "Décompression complète" block: 1 best exercise per zone + all globals
  const deepExercises = zonePriority
    .map(z => (byZone[z] || []).sort((a, b) => score(b) - score(a))[0]?.id)
    .filter(Boolean);
  const globalIds = (byZone["Global"] || []).map(e => e.id);

  blocks.push({
    id: "block_deep",
    zone: "Global",
    name: "Décompression complète",
    exercises: [...deepExercises, ...globalIds],
    xp: 80,
    icon: "🧘",
  });

  return blocks;
};

const buildSessions = (zones, profile) => {
  const sectorId = profile?.sectorId || "bureau";
  const level = profile?.level || "Modéré";
  const space = profile?.space || "Debout possible";
  const painZones = profile?.painZones || [];

  const posAllowed = space === "Assis seulement" ? ["assis"] : space === "Debout possible" ? ["assis", "debout"] : ["assis", "debout", "sol"];
  const maxIntensity = level === "Peu actif" ? 1 : level === "Actif" ? 3 : 2;

  const eligible = EXERCISES.filter(e =>
    posAllowed.includes(e.pos) && e.intensity <= maxIntensity
  );

  // Sector-relevant exercises
  const sectorExs = eligible.filter(e => e.sectors.includes(sectorId));
  // Zone-targeted exercises
  const zoneExs = (z) => eligible.filter(e => e.zone === z);

  const pickBest = (pool, n) => pool.sort(() => Math.random() - 0.3).slice(0, n).map(e => e.id);

  // Primary pain zone session
  const mainZone = painZones[0] || zones[0] || "Dos";
  const secondZone = painZones[1] || zones[1] || "Nuque";

  return [
    { id: "s1", name: "Focus " + mainZone, type: "standard", dur: 5,
      exercises: [...pickBest(zoneExs(mainZone), 3), ...pickBest(zoneExs("Global"), 1)],
      icon: { Nuque: "🔄", Dos: "🐱", Épaules: "🔃", Poignets: "🤲", Yeux: "👀", Jambes: "🦵", Genoux: "🧎" }[mainZone] || "🧘",
      xp: 50, desc: "Programme ciblé " + mainZone },
    { id: "s2", name: "SOS " + mainZone, type: "sos", dur: 3,
      exercises: pickBest(zoneExs(mainZone), 3),
      icon: "🆘", xp: 30, desc: "Soulagement rapide " + mainZone },
    { id: "s3", name: "Flash express", type: "flash", dur: 3,
      exercises: pickBest(sectorExs, 3),
      icon: "⚡", xp: 30, desc: "Déblocage adapté " + (profile?.sector || "votre métier") },
    { id: "s4", name: "Focus " + secondZone, type: "standard", dur: 5,
      exercises: [...pickBest(zoneExs(secondZone), 3), ...pickBest(zoneExs("Global"), 1)],
      icon: { Nuque: "🔄", Dos: "🐱", Épaules: "🔃", Poignets: "🤲", Yeux: "👀", Jambes: "🦵", Genoux: "🧎" }[secondZone] || "🧘",
      xp: 50, desc: "Programme ciblé " + secondZone },
    { id: "s5", name: "Repos oculaire", type: "flash", dur: 3,
      exercises: pickBest(zoneExs("Yeux"), 3),
      icon: "👀", xp: 30, desc: "Pause yeux" },
    { id: "s6", name: "Décompression totale", type: "deep", dur: 10,
      exercises: [...pickBest(sectorExs, 4), ...pickBest(zoneExs("Global"), 2)],
      icon: "🧘", xp: 80, desc: "Séance complète " + (profile?.sector || "") },
    { id: "s7", name: "Activation matinale", type: "standard", dur: 5,
      exercises: [...pickBest(eligible.filter(e => e.intensity <= 1), 3), ...pickBest(zoneExs("Global"), 1)],
      icon: "☀️", xp: 50, desc: "Réveil musculaire en douceur" },
    { id: "s8", name: "SOS Migraine", type: "sos", dur: 3,
      exercises: [...pickBest(zoneExs("Nuque"), 1), ...pickBest(zoneExs("Yeux"), 1), ...pickBest(zoneExs("Global"), 1)],
      icon: "🆘", xp: 30, desc: "Nuque + yeux + respiration" },
    { id: "s9", name: "Anti coup de barre", type: "flash", dur: 3,
      exercises: pickBest(eligible.filter(e => e.intensity >= 1 && e.zone !== "Yeux" && e.zone !== "Global"), 3),
      icon: "⚡", xp: 30, desc: "Relance énergétique" },
    { id: "s10", name: "Anti-stress", type: "standard", dur: 5,
      exercises: [...pickBest(zoneExs("Global"), 3), ...pickBest(zoneExs("Nuque"), 1)],
      icon: "🫁", xp: 50, desc: "Calme et recentrage" },
  ];
};

const Pill = ({ children, active, color = C.accent, onClick, s = {} }) => (
  <div onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: onClick ? "pointer" : "default", background: active ? color : C.card, color: active ? "#0a0f14" : C.dim, border: `1px solid ${active ? color : C.cardL}`, transition: "all 0.2s", whiteSpace: "nowrap", userSelect: "none", ...s }}>{children}</div>
);
const Bar = ({ value, max, color, h = 5 }) => (
  <div style={{ background: C.cardL, borderRadius: h / 2, height: h, flex: 1, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", background: color, borderRadius: h / 2, transition: "width 0.6s" }} />
  </div>
);
const Bdg = ({ small }) => (<span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: small ? "1px 6px" : "2px 8px", borderRadius: 6, background: `linear-gradient(135deg,${C.gold},${C.orange})`, fontSize: small ? 8 : 9, fontWeight: 800, color: "#1a1a1a" }}>👑 PRO</span>);
// SBar removed — real status bar used on mobile

// ─── FLEXO LOGO ───────────────────────────
const FlexoIcon = ({ size = 56, style: s = {} }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={s}>
    <rect x="0" y="0" width="100" height="100" rx="24" fill="#111B26" stroke="#448AFF" strokeWidth="2" opacity="0.5"/>
    <path d="M32 76 L32 28 Q32 22 38 22L68 22" fill="none" stroke="#448AFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M32 48 L60 48" fill="none" stroke="#00E676" strokeWidth="7" strokeLinecap="round"/>
    <circle cx="68" cy="22" r="5" fill="#448AFF"/>
    <circle cx="60" cy="48" r="5" fill="#00E676"/>
    <circle cx="32" cy="76" r="5" fill="#448AFF"/>
    <circle cx="60" cy="48" r="9" fill="none" stroke="#00E676" strokeWidth="0.8" opacity="0.25"/>
  </svg>
);

const FlexoLogo = ({ size = 140 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
    <FlexoIcon size={size} />
    <div style={{ textAlign: "center" }}>
      <div style={{ color: C.text, fontSize: Math.round(size * 0.32), fontWeight: 800, letterSpacing: -1.5, fontFamily: "inherit" }}>flexo</div>
    </div>
  </div>
);

const FlexoCompact = ({ dark = true }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <FlexoIcon size={28} />
    <span style={{ color: dark ? C.text : "#1a1a2e", fontSize: 15, fontWeight: 800, letterSpacing: -0.8 }}>flexo</span>
  </div>
);

// ─── PAYMENT SHEET (iOS-style) ────────────
const PaymentSheet = ({ plan, onConfirm, onCancel, userName }) => {
  const [step, setStep] = useState("confirm"); // confirm | processing | done
  const isAnnual = plan === "annual";
  const price = isAnnual ? "39,90 €" : "4,90 €";
  const period = isAnnual ? "an" : "mois";
  const savedPct = isAnnual ? "Économisez 32%" : null;

  const handleConfirm = () => {
    setStep("processing");
    setTimeout(() => setStep("done"), 1800);
    setTimeout(() => onConfirm(), 2800);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div onClick={onCancel} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

      {/* Sheet */}
      <div style={{
        position: "relative", background: "#1c1c1e", borderRadius: "20px 20px 0 0",
        overflow: "hidden", maxHeight: "75vh", display: "flex", flexDirection: "column",
        animation: "slideUp 0.35s ease-out",
        paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }`}</style>

        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#3a3a3c" }} />
        </div>

        {step === "confirm" && (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px 12px" }}>
              <div onClick={onCancel} style={{ color: "#0a84ff", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>Annuler</div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Confirmer l'abonnement</div>
              <div style={{ width: 55 }} />
            </div>

            {/* App info */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px 14px", borderBottom: "1px solid #2c2c2e" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#0B1219", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #2c2c2e" }}>
                <FlexoIcon size={36} />
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Flexo Premium</div>
                <div style={{ color: "#8e8e93", fontSize: 13 }}>Flexo Health SAS</div>
              </div>
            </div>

            {/* Pricing details */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #2c2c2e" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 500 }}>Essai gratuit</span>
                <span style={{ color: "#30d158", fontSize: 15, fontWeight: 600 }}>7 jours</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 500 }}>Puis</span>
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{price}/{period}</span>
              </div>
              {savedPct && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={{ color: "#30d158", fontSize: 12, fontWeight: 600, background: "rgba(48,209,88,0.12)", padding: "2px 8px", borderRadius: 6 }}>{savedPct}</span>
                </div>
              )}
            </div>

            {/* Terms */}
            <div style={{ padding: "10px 16px 14px" }}>
              <div style={{ color: "#8e8e93", fontSize: 11, lineHeight: 1.5 }}>
                L'abonnement se renouvelle automatiquement. Vous pouvez annuler à tout moment dans les réglages de votre compte Apple. L'essai gratuit se convertit automatiquement en abonnement payant.
              </div>
            </div>

            {/* Account */}
            <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: "#0a84ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{(userName || "A")[0].toUpperCase()}</span>
              </div>
              <div style={{ color: "#8e8e93", fontSize: 13 }}>{userName || "Compte"}</div>
            </div>

            {/* Subscribe button — iOS style */}
            <div style={{ padding: "0 16px" }}>
              <div onClick={handleConfirm} style={{
                padding: "16px 0", borderRadius: 14, textAlign: "center", cursor: "pointer",
                background: "#0a84ff", color: "#fff", fontSize: 17, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#fff" opacity="0.2"/>
                  <path d="M16 8.5c0-.828-.672-1.5-1.5-1.5-.494 0-.933.238-1.207.607a2.49 2.49 0 00-2.586 0A1.495 1.495 0 009.5 7C8.672 7 8 7.672 8 8.5c0 .53.276.997.693 1.263A4.5 4.5 0 008 12.5v.5c0 2.485 1.79 4.5 4 4.5s4-2.015 4-4.5v-.5a4.5 4.5 0 00-.693-2.737A1.494 1.494 0 0016 8.5z" fill="#fff"/>
                </svg>
                S'abonner avec Face ID
              </div>
            </div>
          </>
        )}

        {step === "processing" && (
          <div style={{ padding: "40px 16px 30px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, margin: "0 auto 16px", borderRadius: 24, border: "3px solid #2c2c2e", borderTopColor: "#0a84ff", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "#fff", fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Traitement en cours...</div>
            <div style={{ color: "#8e8e93", fontSize: 13 }}>Vérification avec Apple</div>
          </div>
        )}

        {step === "done" && (
          <div style={{ padding: "30px 16px 20px", textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, margin: "0 auto 14px", borderRadius: 28,
              background: "rgba(48,209,88,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
              animation: "scaleIn 0.3s ease-out",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ color: "#fff", fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Bienvenue dans Flexo Premium !</div>
            <div style={{ color: "#8e8e93", fontSize: 13, marginBottom: 2 }}>Votre essai gratuit de 7 jours commence maintenant</div>
            <div style={{ color: "#30d158", fontSize: 13, fontWeight: 600 }}>Premier prélèvement le {new Date(Date.now() + 7 * 86400000).toLocaleDateString("fr-FR")}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const Input = ({ placeholder, type = "text", value, onChange, icon }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, borderRadius: 12, padding: "11px 14px", border: `1px solid ${C.cardL}`, marginBottom: 8 }}>
    {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
    <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
      style={{ background: "none", border: "none", outline: "none", color: C.text, fontSize: 13, fontWeight: 500, flex: 1, fontFamily: "inherit" }} />
  </div>
);

// ─── SIGNUP ───────────────────────────────
const SignupScreen = ({ onComplete }) => {
  const [pseudo, setPseudo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const canSubmit = pseudo.length > 1 && firstName.length > 1 && lastName.length > 1 && email.includes("@") && email.includes(".");

  return (
    <div style={{ padding: "20px 20px 40px", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "calc(100vh - 40px)" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <FlexoLogo size={80} />
      </div>
      <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.5, marginBottom: 24, padding: "0 10px", textAlign: "center" }}>
        Des micro-séances adaptées à votre métier pour prendre soin de votre corps au travail
      </div>

      <div style={{ color: C.text, fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 14 }}>Créer un compte</div>

      <Input icon="🏷️" placeholder="Pseudo" value={pseudo} onChange={setPseudo} />
      <Input icon="👤" placeholder="Prénom" value={firstName} onChange={setFirstName} />
      <Input icon="👤" placeholder="Nom" value={lastName} onChange={setLastName} />
      <Input icon="📧" placeholder="Email" type="email" value={email} onChange={setEmail} />

      <div onClick={() => canSubmit && onComplete({ name: pseudo, firstName, lastName, fullName: firstName + " " + lastName, email, method: "email" })} style={{
        padding: "14px 0", borderRadius: 14, marginTop: 10, cursor: canSubmit ? "pointer" : "default",
        background: canSubmit ? C.accent : C.cardL, color: canSubmit ? "#0a0f14" : C.dim,
        fontSize: 15, fontWeight: 800, textAlign: "center", opacity: canSubmit ? 1 : 0.5, transition: "all 0.3s",
      }}>Créer mon compte</div>

      <div style={{ color: C.dim, fontSize: 10, marginTop: 16, lineHeight: 1.5, textAlign: "center" }}>
        En continuant, vous acceptez les Conditions d'utilisation et la Politique de confidentialité
      </div>
    </div>
  );
};

// ─── PLAN SELECTION ───────────────────────
const PlanScreen = ({ onSelect, userName, showPayment }) => {
  const [selected, setSelected] = useState("free");
  const [planType, setPlanType] = useState("monthly");

  const features = [
    { label: "Séances par jour", free: "2", premium: "Illimité" },
    { label: "Programme quotidien IA", free: "Basique", premium: "Complet + adaptatif" },
    { label: "Profils métiers", free: "1 profil", premium: "40+ profils" },
    { label: "Sync Google Agenda", free: "—", premium: "✓ Rappels IA" },
    { label: "Statistiques", free: "7 jours", premium: "Illimité + analyse IA" },
    { label: "Avatar & thèmes", free: "—", premium: "✓ Clair / Sombre" },
    { label: "Défis & classements", free: "—", premium: "Inclus" },
  ];

  return (
    <div style={{ padding: "10px 16px 40px" }}>
      <div style={{ textAlign: "center", padding: "16px 0 10px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><FlexoIcon size={44} /></div>
        <div style={{ color: C.dim, fontSize: 11 }}>Bienvenue {userName} 👋</div>
        <div style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Choisissez votre plan</div>
        <div style={{ color: C.dim, fontSize: 12 }}>Vous pouvez changer à tout moment</div>
      </div>

      {/* Plan cards */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {/* Free */}
        <div onClick={() => setSelected("free")} style={{
          flex: 1, borderRadius: 18, padding: "14px 10px", cursor: "pointer", textAlign: "center",
          background: selected === "free" ? C.accentDim : C.card,
          border: `2px solid ${selected === "free" ? C.accent : C.cardL}`, transition: "all 0.3s",
        }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🆓</div>
          <div style={{ color: C.text, fontSize: 15, fontWeight: 800 }}>Gratuit</div>
          <div style={{ color: C.accent, fontSize: 22, fontWeight: 900, margin: "4px 0" }}>0€</div>
          <div style={{ color: C.dim, fontSize: 10 }}>Pour découvrir</div>
          {selected === "free" && <div style={{ color: C.accent, fontSize: 18, marginTop: 6 }}>✓</div>}
        </div>
        {/* Premium */}
        <div onClick={() => setSelected("premium")} style={{
          flex: 1, borderRadius: 18, padding: "14px 10px", cursor: "pointer", textAlign: "center", position: "relative", overflow: "hidden",
          background: selected === "premium" ? C.goldDim : C.card,
          border: `2px solid ${selected === "premium" ? C.gold : C.cardL}`, transition: "all 0.3s",
        }}>
          <div style={{ position: "absolute", top: 0, right: 0, background: C.gold, color: "#1a1a1a", fontSize: 8, fontWeight: 800, padding: "2px 8px", borderRadius: "0 0 0 8px" }}>POPULAIRE</div>
          <div style={{ fontSize: 28, marginBottom: 4 }}>👑</div>
          <div style={{ color: C.text, fontSize: 15, fontWeight: 800 }}>Premium</div>
          <div style={{ color: C.gold, fontSize: 22, fontWeight: 900, margin: "4px 0" }}>4,90€<span style={{ fontSize: 11, fontWeight: 600 }}>/mois</span></div>
          <div style={{ color: C.dim, fontSize: 10 }}>Tout débloquer</div>
          {selected === "premium" && <div style={{ color: C.gold, fontSize: 18, marginTop: 6 }}>✓</div>}
        </div>
      </div>

      {/* Comparison */}
      <div style={{ background: C.card, borderRadius: 16, padding: "10px 0", marginBottom: 12, border: `1px solid ${C.cardL}`, overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "0 12px 8px", borderBottom: `1px solid ${C.cardL}` }}>
          <div style={{ flex: 2, color: C.dim, fontSize: 10, fontWeight: 700 }}>FONCTIONNALITÉ</div>
          <div style={{ flex: 1, color: C.accent, fontSize: 10, fontWeight: 700, textAlign: "center" }}>Gratuit</div>
          <div style={{ flex: 1, color: C.gold, fontSize: 10, fontWeight: 700, textAlign: "center" }}>Premium</div>
        </div>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: i < features.length - 1 ? `1px solid ${C.cardL}` : "none" }}>
            <div style={{ flex: 2, color: C.text, fontSize: 11, fontWeight: 600 }}>{f.label}</div>
            <div style={{ flex: 1, color: C.dim, fontSize: 10, textAlign: "center" }}>{f.free}</div>
            <div style={{ flex: 1, color: C.gold, fontSize: 10, fontWeight: 700, textAlign: "center" }}>{f.premium}</div>
          </div>
        ))}
      </div>

      {selected === "premium" && (
        <div style={{ background: C.goldDim, borderRadius: 12, padding: "8px 12px", marginBottom: 10, border: `1px solid ${C.gold}33`, textAlign: "center" }}>
          <div style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}>🎁 7 jours d'essai gratuit</div>
          <div style={{ color: C.dim, fontSize: 10 }}>Sans engagement · Annulation en 1 clic</div>
        </div>
      )}

      {/* Plan period toggle for premium */}
      {selected === "premium" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <div onClick={() => setPlanType("monthly")} style={{
            flex: 1, padding: "10px 8px", borderRadius: 12, textAlign: "center", cursor: "pointer",
            background: planType === "monthly" ? C.goldDim : C.card,
            border: `1.5px solid ${planType === "monthly" ? C.gold : C.cardL}`, transition: "all 0.2s",
          }}>
            <div style={{ color: planType === "monthly" ? C.gold : C.text, fontSize: 14, fontWeight: 800 }}>4,90€/mois</div>
            <div style={{ color: C.dim, fontSize: 10 }}>Mensuel</div>
          </div>
          <div onClick={() => setPlanType("annual")} style={{
            flex: 1, padding: "10px 8px", borderRadius: 12, textAlign: "center", cursor: "pointer", position: "relative",
            background: planType === "annual" ? C.goldDim : C.card,
            border: `1.5px solid ${planType === "annual" ? C.gold : C.cardL}`, transition: "all 0.2s",
          }}>
            {planType === "annual" && <div style={{ position: "absolute", top: -6, right: 8, background: "#30d158", color: "#fff", fontSize: 8, fontWeight: 800, padding: "1px 6px", borderRadius: 4 }}>-32%</div>}
            <div style={{ color: planType === "annual" ? C.gold : C.text, fontSize: 14, fontWeight: 800 }}>39,90€/an</div>
            <div style={{ color: C.dim, fontSize: 10 }}>3,33€/mois</div>
          </div>
        </div>
      )}

      <div onClick={() => selected === "premium" ? showPayment(planType, () => onSelect("premium")) : onSelect("free")} style={{
        padding: "14px 0", borderRadius: 14, textAlign: "center", cursor: "pointer",
        background: selected === "premium" ? `linear-gradient(135deg,${C.gold},${C.orange})` : C.accent,
        color: "#0a0f14", fontSize: 15, fontWeight: 800,
        boxShadow: selected === "premium" ? `0 4px 16px ${C.goldGlow}` : `0 4px 16px ${C.accentGlow}`,
      }}>
        {selected === "premium" ? "Démarrer l'essai gratuit →" : "Continuer gratuitement →"}
      </div>
    </div>
  );
};

// ─── ONBOARDING ───────────────────────────
const Onboarding = ({ onComplete, isPremium }) => {
  const [step, setStep] = useState(0);
  const [sectorId, setSectorId] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [painZones, setPainZones] = useState([]);
  const [level, setLevel] = useState(null);
  const [space, setSpace] = useState(null);
  const sector = SECTORS.find(s => s.id === sectorId);
  const allJobs = sectorId ? (JOBS[sectorId] || []) : [];
  const jobs = isPremium ? allJobs : allJobs.filter(j => !j.pro);
  const lockedJobs = isPremium ? [] : allJobs.filter(j => j.pro);
  const job = jobs.find(j => j.id === jobId);
  const togglePain = (z) => setPainZones(p => p.includes(z) ? p.filter(x => x !== z) : [...p, z]);
  const finish = () => onComplete({ sectorId, sector: sector?.label, sectorIcon: sector?.icon, jobId, job: job?.label, jobIcon: job?.icon, painZones, level, space, riskZones: [...new Set([...(sector?.zones || []), ...painZones])] });
  const dots = (<div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "10px 0" }}>{[0, 1, 2].map(i => (<div key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, background: i === step ? C.accent : C.cardL, transition: "all 0.3s" }} />))}</div>);

  if (step === 0) return (
    <div style={{ padding: "16px 18px 40px", textAlign: "center" }}>
      <div style={{ marginTop: 10, marginBottom: 6, display: "flex", justifyContent: "center" }}><FlexoIcon size={48} /></div>
      <div style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Votre <span style={{ color: C.accent }}>environnement</span></div>
      <div style={{ color: C.dim, fontSize: 12, marginBottom: 12 }}>On adapte tout à votre quotidien</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SECTORS.map(s => (
          <div key={s.id} onClick={() => { setSectorId(s.id); setJobId(null); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: sectorId === s.id ? C.accentDim : C.card, border: `1.5px solid ${sectorId === s.id ? C.accent : C.cardL}`, cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div style={{ flex: 1 }}><div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{s.label}</div><div style={{ color: C.dim, fontSize: 10 }}>{s.desc}</div></div>
            {sectorId === s.id && <span style={{ color: C.accent, fontSize: 16 }}>✓</span>}
          </div>
        ))}
      </div>
      {dots}
      <div onClick={() => sectorId && setStep(1)} style={{ padding: "12px 0", borderRadius: 14, marginTop: 4, cursor: sectorId ? "pointer" : "default", background: sectorId ? C.accent : C.cardL, color: sectorId ? "#0a0f14" : C.dim, fontSize: 14, fontWeight: 800, textAlign: "center", opacity: sectorId ? 1 : 0.5 }}>Suivant →</div>
    </div>
  );

  if (step === 1) return (
    <div style={{ padding: "16px 18px 40px", textAlign: "center" }}>
      <div style={{ fontSize: 44, marginTop: 14, marginBottom: 6 }}>💼</div>
      <div style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Votre <span style={{ color: C.accent }}>métier</span></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ color: C.accent, fontSize: 11 }}>{sector?.icon} {sector?.label}</span>
        <span style={{ color: C.dim, fontSize: 10 }}>·</span>
        <span style={{ color: isPremium ? C.gold : C.dim, fontSize: 10, fontWeight: 700 }}>{isPremium ? `${allJobs.length} métiers` : `${jobs.length} gratuits / ${allJobs.length} total`}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {jobs.map(j => (
          <div key={j.id} onClick={() => setJobId(j.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 8px", borderRadius: 14, background: jobId === j.id ? C.accentDim : C.card, border: `1.5px solid ${jobId === j.id ? C.accent : C.cardL}`, cursor: "pointer" }}>
            <span style={{ fontSize: 26 }}>{j.icon}</span>
            <span style={{ color: jobId === j.id ? C.accent : C.text, fontSize: 12, fontWeight: 600 }}>{j.label}</span>
          </div>
        ))}
        {lockedJobs.map(j => (
          <div key={j.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 8px", borderRadius: 14, background: C.card, border: `1.5px solid ${C.cardL}`, opacity: 0.35, cursor: "default" }}>
            <span style={{ fontSize: 26 }}>🔒</span>
            <span style={{ color: C.dim, fontSize: 11, fontWeight: 600 }}>{j.label}</span>
          </div>
        ))}
      </div>
      {lockedJobs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 8 }}>
          <span style={{ fontSize: 10 }}>👑</span>
          <span style={{ color: C.gold, fontSize: 10, fontWeight: 700 }}>+{lockedJobs.length} métiers avec Premium</span>
        </div>
      )}
      {dots}
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <div onClick={() => setStep(0)} style={{ flex: 1, padding: "12px 0", borderRadius: 14, background: C.card, color: C.dim, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center", border: `1px solid ${C.cardL}` }}>← Retour</div>
        <div onClick={() => jobId && setStep(2)} style={{ flex: 1, padding: "12px 0", borderRadius: 14, background: jobId ? C.accent : C.cardL, color: jobId ? "#0a0f14" : C.dim, fontSize: 13, fontWeight: 800, textAlign: "center", opacity: jobId ? 1 : 0.5, cursor: jobId ? "pointer" : "default" }}>Suivant →</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "16px 18px 40px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, marginTop: 14, marginBottom: 6 }}>🫀</div>
        <div style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Profil <span style={{ color: C.accent }}>santé</span></div>
        <div style={{ color: C.dim, fontSize: 11, marginBottom: 12 }}>{sector?.icon} {sector?.label} → {job?.icon} {job?.label}</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Zones sensibles</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{["Nuque", "Dos", "Poignets", "Épaules", "Genoux", "Yeux", "Jambes"].map(z => (<Pill key={z} active={painZones.includes(z)} onClick={() => togglePain(z)} color={C.orange}>{z}</Pill>))}</div>
        {sector && <div style={{ color: C.dim, fontSize: 10, marginTop: 5, fontStyle: "italic" }}>💡 Risques {sector.label.toLowerCase()} : {sector.zones.join(", ")}</div>}
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Niveau d'activité</div>
        <div style={{ display: "flex", gap: 5 }}>{["Peu actif", "Modéré", "Actif"].map(n => (<Pill key={n} active={level === n} onClick={() => setLevel(n)} color={C.accent}>{n}</Pill>))}</div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Espace au travail</div>
        <div style={{ display: "flex", gap: 5 }}>{["Assis seulement", "Debout possible", "Espace libre"].map(e => (<Pill key={e} active={space === e} onClick={() => setSpace(e)} color={C.blue}>{e}</Pill>))}</div>
      </div>
      {dots}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <div onClick={() => setStep(1)} style={{ flex: 1, padding: "12px 0", borderRadius: 14, background: C.card, color: C.dim, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center", border: `1px solid ${C.cardL}` }}>← Retour</div>
        <div onClick={() => (level && space) ? finish() : null} style={{ flex: 1, padding: "12px 0", borderRadius: 14, background: (level && space) ? `linear-gradient(135deg,${C.accent},${C.blue})` : C.cardL, color: (level && space) ? "#0a0f14" : C.dim, fontSize: 13, fontWeight: 800, textAlign: "center", opacity: (level && space) ? 1 : 0.5, cursor: (level && space) ? "pointer" : "default" }}>C'est parti ! 🚀</div>
      </div>
    </div>
  );
};

// ─── HOME ─────────────────────────────────
const Home = ({ goTo, profile, stats, dailyProgram, completedBlocks, isPremium, sessions }) => {
  const nextBlockIdx = completedBlocks.length;
  const nextBlock = dailyProgram[nextBlockIdx];
  const allDone = nextBlockIdx >= dailyProgram.length;
  const [showStreak, setShowStreak] = useState(false);

  return (
    <div style={{ padding: "10px 4vw 30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 6px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
            <span style={{ color: C.dim, fontSize: 11 }}>Bonjour {stats.userName} 👋</span>
            {isPremium && <Bdg small />}
          </div>
          <div style={{ color: C.text, fontSize: 17, fontWeight: 800 }}>{profile.jobIcon} {profile.job}</div>
          <div style={{ color: C.dim, fontSize: 10 }}>{profile.sectorIcon} {profile.sector} · {profile.level}</div>
        </div>
        <div style={{ position: "relative" }}>
          <div onClick={() => setShowStreak(!showStreak)} style={{ width: 40, height: 40, borderRadius: 13, background: isPremium ? C.goldDim : C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, border: `2px solid ${isPremium ? C.gold : C.accent}`, cursor: "pointer" }}>🔥</div>
          <div style={{ position: "absolute", top: -4, right: -4, background: isPremium ? `linear-gradient(135deg,${C.gold},${C.orange})` : C.accent, color: "#0a0f14", fontSize: 9, fontWeight: 800, borderRadius: 7, padding: "1px 5px" }}>{stats.streak}</div>
        </div>
      </div>

      {/* Streak popup */}
      {showStreak && (
        <div style={{ background: C.card, borderRadius: 16, padding: "14px 14px 12px", marginBottom: 8, border: `1px solid ${isPremium ? C.gold : C.accent}33`, position: "relative" }}>
          <div onClick={() => setShowStreak(false)} style={{ position: "absolute", top: 8, right: 10, color: C.dim, fontSize: 12, cursor: "pointer" }}>✕</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 32 }}>🔥</div>
            <div>
              <div style={{ color: isPremium ? C.gold : C.accent, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{stats.streak} jour{stats.streak > 1 ? "s" : ""}</div>
              <div style={{ color: C.dim, fontSize: 11 }}>consécutif{stats.streak > 1 ? "s" : ""} avec au moins 1 séance</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => {
              const active = i < Math.min(stats.streak % 7 || 7, 7);
              return (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: active ? C.accentDim : C.cardL, border: `2px solid ${active ? C.accent : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginBottom: 3, color: active ? C.accent : C.dim }}>{active ? "✓" : ""}</div>
                  <div style={{ fontSize: 9, color: C.dim, fontWeight: 600 }}>{d}</div>
                </div>
              );
            })}
          </div>
          <div style={{ background: C.cardL, borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
            <span style={{ color: C.dim, fontSize: 10 }}>Prochain palier : </span>
            <span style={{ color: isPremium ? C.gold : C.accent, fontSize: 10, fontWeight: 800 }}>{stats.streak < 7 ? "7 jours 🥉" : stats.streak < 15 ? "15 jours 🥈" : stats.streak < 30 ? "30 jours 🥇" : "60 jours 🏆"}</span>
          </div>
        </div>
      )}

      {/* Score */}
      <div style={{ background: `linear-gradient(135deg,${C.accent}12,${C.blue}12)`, borderRadius: 18, padding: 12, marginBottom: 8, border: `1px solid ${C.accent}33`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 70, height: 70, borderRadius: "50%", background: C.accentGlow, filter: "blur(25px)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 54, height: 54 }}>
            <svg width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r="23" fill="none" stroke={C.cardL} strokeWidth="4" /><circle cx="27" cy="27" r="23" fill="none" stroke={C.accent} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${144 * Math.min(1, stats.score / 100)} ${144}`} strokeDashoffset="36" /></svg>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: C.accent, fontSize: 15, fontWeight: 900 }}>{stats.score}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>Score Postural</div>
            <div style={{ color: C.dim, fontSize: 10, marginBottom: 4 }}>{stats.totalSessions} séances · {stats.xp} XP · Niv. {Math.floor(stats.xp / 500) + 1}</div>
          </div>
        </div>
      </div>

      {/* Daily program IA */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 14 }}>🧠</span>
          <span style={{ color: isPremium ? C.gold : C.accent, fontSize: 12, fontWeight: 700, flex: 1 }}>Programme du jour — {profile.job}</span>
          {isPremium && <Bdg small />}
        </div>

        {dailyProgram.map((block, i) => {
          const isDone = completedBlocks.includes(block.id);
          const isNext = i === nextBlockIdx;
          const isLocked = !isPremium && i > 1 && !isDone;

          return (
            <div key={block.id} onClick={() => !isLocked && goTo("session", block.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, marginBottom: 6,
              background: isNext ? (isPremium ? C.goldDim : C.accentDim) : isDone ? `${C.accent}08` : C.card,
              border: `1.5px solid ${isNext ? (isPremium ? C.gold : C.accent) : isDone ? `${C.accent}33` : C.cardL}`,
              cursor: isLocked ? "default" : "pointer", opacity: isLocked ? 0.4 : 1, transition: "all 0.2s",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: isDone ? C.accentDim : C.cardL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isDone ? 14 : 16 }}>
                {isDone ? "✅" : isLocked ? "🔒" : block.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: isDone ? C.accent : C.text, fontSize: 13, fontWeight: 700, textDecoration: isDone ? "line-through" : "none" }}>{block.name}</div>
                <div style={{ color: C.dim, fontSize: 10 }}>{block.exercises.length} exercices · +{block.xp} XP</div>
              </div>
              {isNext && !isDone && (
                <div style={{ padding: "4px 10px", borderRadius: 8, background: isPremium ? C.gold : C.accent, color: "#0a0f14", fontSize: 10, fontWeight: 800 }}>▶</div>
              )}
              {isDone && <span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>+{block.xp} XP</span>}
              {isLocked && <span style={{ color: C.dim, fontSize: 9 }}>Premium</span>}
            </div>
          );
        })}

        {allDone && (
          <div style={{ textAlign: "center", padding: "12px 0", background: C.accentDim, borderRadius: 14, border: `1px solid ${C.accent}33` }}>
            <div style={{ fontSize: 24 }}>🎉</div>
            <div style={{ color: C.accent, fontSize: 13, fontWeight: 800 }}>Programme du jour terminé !</div>
            <div style={{ color: C.dim, fontSize: 10 }}>Revenez demain pour de nouveaux exercices</div>
          </div>
        )}
      </div>

      {/* Quick access */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 4 }}>
        {[{ t: "flash", icon: "⚡", l: "Flash 3m", sub: "Pause rapide" }, { t: "sos", icon: "🆘", l: "SOS Urgent", sub: "Douleur soudaine" }].map((a, i) => {
          const s = sessions.find(x => x.type === a.t);
          return (<div key={i} onClick={() => s && goTo("session_free", s.id)} style={{ background: tBg[a.t], borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", border: `1px solid ${tC[a.t]}20` }}><span style={{ fontSize: 20 }}>{a.icon}</span><div><div style={{ color: tC[a.t], fontSize: 12, fontWeight: 700 }}>{a.l}</div><div style={{ color: C.dim, fontSize: 9 }}>{a.sub}</div></div></div>);
        })}
      </div>
      <div style={{ background: C.redDim, borderRadius: 10, padding: "6px 10px", marginBottom: 8, border: `1px solid ${C.red}15`, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12 }}>💡</span>
        <span style={{ color: C.dim, fontSize: 10, lineHeight: 1.4 }}>Utilisez <span style={{ color: C.red, fontWeight: 700 }}>SOS</span> en cas de douleur soudaine au dos, nuque ou tête. Exercices doux de soulagement immédiat.</span>
      </div>

      {/* Upgrade banner for free users */}
      {!isPremium && (
        <div onClick={() => goTo("upgrade")} style={{
          background: `linear-gradient(135deg,${C.gold}15,${C.orange}15)`, borderRadius: 16, padding: "12px 14px",
          border: `1px solid ${C.gold}33`, cursor: "pointer", marginBottom: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>👑</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.gold, fontSize: 13, fontWeight: 800 }}>Flexo Premium — 4,90€/mois</div>
              <div style={{ color: C.dim, fontSize: 10 }}>Programme complet, rappels IA, stats avancées</div>
            </div>
            <span style={{ color: C.gold, fontSize: 14 }}>→</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── SESSION ──────────────────────────────
const Session = ({ goTo, blockId, dailyProgram, sessions, onComplete, isFromLibrary }) => {
  const block = isFromLibrary ? sessions.find(s => s.id === blockId) : dailyProgram.find(b => b.id === blockId);
  if (!block) return <div style={{ padding: 20, color: C.dim, textAlign: "center" }}>Séance introuvable</div>;

  const exercises = block.exercises.map(getEx).filter(Boolean);
  const [step, setStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(exercises[0]?.dur || 15);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(new Set());
  const [finished, setFinished] = useState(false);
  const [breathPhase, setBreathPhase] = useState("Appuyez sur ▶");
  const timer = useRef(null);
  const breathRef = useRef(null);
  const audioCtx = useRef(null);
  const audioNodes = useRef([]);

  // Ambient chill audio
  const startAudio = () => {
    try {
      if (audioCtx.current) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.current = ctx;
      const master = ctx.createGain();
      master.gain.value = 0.12;
      master.connect(ctx.destination);
      // Warm pad — two detuned oscillators
      const freqs = [110, 164.81, 220, 329.63];
      freqs.forEach(f => {
        const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = 0.04;
        const flt = ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 400 + Math.random() * 200;
        osc.connect(flt); flt.connect(g); g.connect(master); osc.start();
        // Slow LFO on volume for movement
        const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.08 + Math.random() * 0.06;
        const lfoG = ctx.createGain(); lfoG.gain.value = 0.015;
        lfo.connect(lfoG); lfoG.connect(g.gain); lfo.start();
        audioNodes.current.push(osc, lfo);
      });
      // Soft noise layer
      const bufSize = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      const nFlt = ctx.createBiquadFilter(); nFlt.type = "lowpass"; nFlt.frequency.value = 250;
      const nG = ctx.createGain(); nG.gain.value = 0.025;
      noise.connect(nFlt); nFlt.connect(nG); nG.connect(master); noise.start();
      audioNodes.current.push(noise);
    } catch(e) { console.log("Audio not supported"); }
  };

  const stopAudio = () => {
    audioNodes.current.forEach(n => { try { n.stop(); } catch(e){} });
    audioNodes.current = [];
    if (audioCtx.current) { try { audioCtx.current.close(); } catch(e){} audioCtx.current = null; }
  };

  useEffect(() => { return () => stopAudio(); }, []);
  useEffect(() => { if (running) startAudio(); else stopAudio(); }, [running]);
  const cur = exercises[step];
  const progress = cur ? 1 - timeLeft / cur.dur : 0;
  const xp = block.xp || 50;
  const sessionType = block.type || "standard";
  const color = tC[sessionType] || C.accent;

  useEffect(() => {
    if (running && timeLeft > 0) { timer.current = setTimeout(() => setTimeLeft(t => t - 1), 1000); }
    else if (running && timeLeft <= 0) {
      setRunning(false); const nd = new Set(done); nd.add(step); setDone(nd);
      if (step < exercises.length - 1) setTimeout(() => { setStep(step + 1); setTimeLeft(exercises[step + 1]?.dur || 15); }, 600);
      else setTimeout(() => { setFinished(true); onComplete(xp, block.id); }, 400);
    }
    return () => clearTimeout(timer.current);
  }, [running, timeLeft]);

  useEffect(() => {
    if (running) { const p = ["Inspirez…", "Bloquez…", "Expirez…", "Relâchez…"]; let i = 0; setBreathPhase(p[0]); breathRef.current = setInterval(() => { i = (i + 1) % 4; setBreathPhase(p[i]); }, 3000); }
    else setBreathPhase(done.has(step) ? "Terminé ✓" : "Appuyez sur ▶");
    return () => clearInterval(breathRef.current);
  }, [running, step]);

  useEffect(() => { if (exercises[step]) { setTimeLeft(exercises[step].dur); setRunning(false); } }, [step]);

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const skip = () => { setRunning(false); const nd = new Set(done); nd.add(step); setDone(nd); if (step < exercises.length - 1) setStep(step + 1); else { setFinished(true); onComplete(xp, block.id); } };

  if (finished) return (
    <div style={{ padding: "20px 16px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100dvh - 120px)" }}>
      <div style={{ width: 90, height: 90, borderRadius: 45, background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, marginBottom: 14, border: `3px solid ${C.accent}`, boxShadow: `0 0 30px ${C.accentGlow}` }}>✅</div>
      <div style={{ color: C.text, fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Séance terminée !</div>
      <div style={{ color: C.dim, fontSize: 13, marginBottom: 6 }}>{block.name || block.zone}</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[{ v: `+${xp}`, l: "XP", c: C.gold, i: "⭐" }, { v: exercises.length, l: "Exercices", c: C.accent, i: "✅" }].map((s, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 14, padding: "12px 18px", textAlign: "center", border: `1px solid ${C.cardL}` }}><div style={{ fontSize: 16 }}>{s.i}</div><div style={{ color: s.c, fontSize: 20, fontWeight: 900 }}>{s.v}</div><div style={{ color: C.dim, fontSize: 10 }}>{s.l}</div></div>
        ))}
      </div>
      <div onClick={() => goTo("home")} style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: C.accent, color: "#0a0f14", fontSize: 15, fontWeight: 800, textAlign: "center", cursor: "pointer" }}>
        Retour au programme →
      </div>
    </div>
  );

  return (
    <div style={{ padding: "10px 4vw 30px", textAlign: "center" }}>
      <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span onClick={() => { setRunning(false); stopAudio(); goTo("home"); }} style={{ color: C.dim, fontSize: 12, cursor: "pointer" }}>✕ Quitter</span>
        <span style={{ color: C.dim, fontSize: 11 }}>{step + 1}/{exercises.length}</span>
        <span onClick={skip} style={{ color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Passer ⏭</span>
      </div>
      <div style={{ color: color, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{block.icon || "🧘"} {block.name || block.zone}{running ? " 🎵" : ""}</div>

      <div style={{ position: "relative", width: 155, height: 155, margin: "10px auto" }}>
        <svg width="155" height="155" viewBox="0 0 155 155">
          <circle cx="77.5" cy="77.5" r="70" fill="none" stroke={C.cardL} strokeWidth="5" />
          <circle cx="77.5" cy="77.5" r="70" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${440 * progress} ${440}`} transform="rotate(-90 77.5 77.5)" style={{ transition: "stroke-dasharray 0.3s" }} />
          {running && <circle cx="77.5" cy="77.5" r="60" fill="none" stroke={C.accent} strokeWidth="1.5" strokeDasharray="4 8" opacity="0.3"><animate attributeName="r" values="58;63;58" dur="4s" repeatCount="indefinite" /></circle>}
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
          <div style={{ fontSize: 34 }}>{cur?.icon}</div>
          <div style={{ color: C.text, fontSize: 24, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{fmt(timeLeft)}</div>
          <div style={{ color: running ? C.accent : C.dim, fontSize: 10 }}>{breathPhase}</div>
        </div>
      </div>

      <div style={{ color: C.text, fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{cur?.name}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 6 }}>
        <Pill active color={color} s={{ fontSize: 9, padding: "2px 8px" }}>{cur?.zone}</Pill>
        <Pill active color={C.accent} s={{ fontSize: 9, padding: "2px 8px" }}>+{cur?.xp} XP</Pill>
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: "10px 14px", marginBottom: 10, border: `1px solid ${C.cardL}`, textAlign: "left" }}>
        <div style={{ color: C.text, fontSize: 12, lineHeight: 1.5, marginBottom: 3 }}>{cur?.inst}</div>
        <div style={{ color: C.accent, fontSize: 10, fontStyle: "italic" }}>💨 {cur?.breath}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 14, alignItems: "center", marginBottom: 10 }}>
        <div onClick={() => step > 0 && (setStep(step - 1), setRunning(false))} style={{ width: 42, height: 42, borderRadius: 21, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, color: step > 0 ? C.dim : C.cardL, border: `1px solid ${C.cardL}` }}>⏮</div>
        <div onClick={() => setRunning(!running)} style={{ width: 56, height: 56, borderRadius: 28, background: running ? C.card : color, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 22, color: running ? color : "#0a0f14", border: running ? `2px solid ${color}` : "none", transition: "all 0.2s" }}>{running ? "⏸" : "▶"}</div>
        <div onClick={skip} style={{ width: 42, height: 42, borderRadius: 21, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, color: C.dim, border: `1px solid ${C.cardL}` }}>⏭</div>
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: 6, border: `1px solid ${C.cardL}` }}>
        {exercises.map((ex, i) => (
          <div key={i} onClick={() => { setStep(i); setRunning(false); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 10, cursor: "pointer", background: i === step ? `${color}15` : "transparent" }}>
            <span style={{ fontSize: 13 }}>{ex.icon}</span>
            <span style={{ color: i === step ? color : done.has(i) ? C.accent : C.text, fontSize: 11, fontWeight: i === step ? 700 : 500, flex: 1, textAlign: "left", textDecoration: done.has(i) && i !== step ? "line-through" : "none", opacity: done.has(i) && i !== step ? 0.5 : 1 }}>{ex.name}</span>
            <span style={{ color: C.dim, fontSize: 10 }}>{ex.dur}s</span>
            {done.has(i) && <span style={{ color: C.accent, fontSize: 10 }}>✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── LIBRARY ──────────────────────────────
const Library = ({ goTo, sessions, isPremium }) => {
  const [tf, setTf] = useState("all");
  const filtered = sessions.filter(s => tf === "all" || s.type === tf);
  const freeLimit = 4;
  return (
    <div style={{ padding: "10px 4vw 30px" }}>
      <div style={{ padding: "10px 0 6px", display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: C.text, fontSize: 18, fontWeight: 800, flex: 1 }}>Bibliothèque</span>{isPremium && <Bdg />}</div>
      <div style={{ display: "flex", gap: 5, marginBottom: 8, overflowX: "auto" }}>{[{ k: "all", l: "Toutes" }, { k: "flash", l: "⚡ Flash" }, { k: "standard", l: "🎯 Standard" }, { k: "deep", l: "🧘 Deep" }, { k: "sos", l: "🆘 SOS" }].map(f => (<Pill key={f.k} active={tf === f.k} onClick={() => setTf(f.k)} color={isPremium ? C.gold : C.accent}>{f.l}</Pill>))}</div>
      {tf === "sos" && (
        <div style={{ background: C.redDim, borderRadius: 12, padding: "8px 10px", marginBottom: 8, border: `1px solid ${C.red}15` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 14 }}>🆘</span>
            <span style={{ color: C.red, fontSize: 12, fontWeight: 800 }}>Séances SOS — Quand les utiliser ?</span>
          </div>
          <div style={{ color: C.dim, fontSize: 10, lineHeight: 1.5 }}>
            En cas de <span style={{ color: C.text, fontWeight: 600 }}>douleur soudaine</span> au dos, à la nuque ou de maux de tête liés aux tensions. Ces exercices doux et courts (3 min) apportent un soulagement immédiat. Ne remplacent pas un avis médical si la douleur persiste.
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map((s, idx) => {
          const locked = !isPremium && idx >= freeLimit;
          return (
            <div key={s.id} onClick={() => !locked && goTo("session_free", s.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 14, background: C.card, border: `1px solid ${C.cardL}`, cursor: locked ? "default" : "pointer", opacity: locked ? 0.4 : 1 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: locked ? C.cardL : tBg[s.type], display: "flex", alignItems: "center", justifyContent: "center", fontSize: locked ? 14 : 17, border: `1px solid ${locked ? C.cardL : tC[s.type]}33` }}>{locked ? "🔒" : s.icon}</div>
              <div style={{ flex: 1 }}><div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{s.name}</div><div style={{ color: C.dim, fontSize: 10, marginTop: 1 }}>{s.desc} · {s.dur} min</div></div>
              <div style={{ textAlign: "right" }}><div style={{ color: locked ? C.dim : tC[s.type], fontSize: 10, fontWeight: 700 }}>{locked ? "Premium" : tL[s.type]}</div><div style={{ color: C.accent, fontSize: 10, marginTop: 1 }}>+{s.xp} XP</div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── STATS ────────────────────────────────
const Stats = ({ stats, profile, isPremium }) => {
  const [period, setPeriod] = useState("7j");

  const motivations = [
    `Bravo ${stats.userName} ! Votre nuque s'améliore de jour en jour. Continuez les rotations, elles font la différence.`,
    `${stats.totalSessions} séances complétées ! Votre régularité est impressionnante, votre dos vous remercie.`,
    `Votre score postural progresse. En tant que ${profile.job}, vos poignets et votre nuque sont votre priorité — gardez le rythme !`,
    `Streak de ${stats.streak} jours ! Vous faites partie des 12% d'utilisateurs les plus assidus de votre métier.`,
  ];
  const motivation = motivations[stats.totalSessions % motivations.length];

  const multiplier = period === "7j" ? 1 : period === "30j" ? 3.5 : 10;

  return (
  <div style={{ padding: "10px 4vw 30px" }}>
    <div style={{ padding: "10px 0 6px", display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: C.text, fontSize: 18, fontWeight: 800, flex: 1 }}>Statistiques</span>{isPremium && <Bdg />}</div>

    {/* AI Motivation — Premium */}
    {isPremium && (
      <div style={{ background: `linear-gradient(135deg,${C.gold}10,${C.orange}10)`, borderRadius: 14, padding: "10px 12px", marginBottom: 10, border: `1px solid ${C.gold}25`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -10, right: -10, width: 40, height: 40, borderRadius: "50%", background: C.goldGlow, filter: "blur(18px)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <span style={{ fontSize: 14 }}>🧠</span>
          <span style={{ color: C.gold, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Analyse IA</span>
          <Bdg small />
        </div>
        <div style={{ color: C.text, fontSize: 12, lineHeight: 1.5, fontStyle: "italic" }}>"{motivation}"</div>
      </div>
    )}

    {/* Period selector — Premium unlocks 30j and all */}
    <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
      {[{ k: "7j", l: "7 derniers jours" }, { k: "30j", l: "30 jours" }, { k: "all", l: "Tout" }].map(p => {
        const locked = !isPremium && p.k !== "7j";
        return (
          <Pill key={p.k} active={period === p.k} onClick={() => !locked && setPeriod(p.k)} color={isPremium ? C.gold : C.accent}
            s={{ opacity: locked ? 0.4 : 1, cursor: locked ? "default" : "pointer" }}>
            {locked && "🔒 "}{p.l}
          </Pill>
        );
      })}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
      {[{ v: Math.round(stats.totalSessions * (period === "7j" ? 1 : multiplier)), u: "séances", l: "Complétées", c: C.accent }, { v: Math.round(stats.xp * (period === "7j" ? 1 : multiplier)), u: "XP", l: "Total", c: C.gold }, { v: `${stats.streak}j`, u: "", l: "Streak", c: C.orange }, { v: stats.score, u: "/100", l: "Score", c: C.blue }].map((s, i) => (
        <div key={i} style={{ background: C.card, borderRadius: 14, padding: "10px 12px", border: `1px solid ${C.cardL}` }}><div style={{ display: "flex", alignItems: "baseline", gap: 2 }}><span style={{ color: s.c, fontSize: 22, fontWeight: 900 }}>{s.v}</span><span style={{ color: C.dim, fontSize: 10 }}>{s.u}</span></div><div style={{ color: C.dim, fontSize: 10 }}>{s.l}</div></div>
      ))}
    </div>

    {/* Period info for free users */}
    {!isPremium && (
      <div style={{ background: C.card, borderRadius: 10, padding: "6px 10px", marginBottom: 10, border: `1px solid ${C.cardL}`, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11 }}>🔒</span>
        <span style={{ color: C.dim, fontSize: 10 }}>Passez à Flexo Premium pour voir vos stats sur 30 jours et au-delà, avec l'analyse IA personnalisée</span>
      </div>
    )}

    <div style={{ background: C.card, borderRadius: 16, padding: "12px 10px", marginBottom: 10, border: `1px solid ${C.cardL}` }}>
      <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Santé par zone — {profile.job}</div>
      {profile.riskZones.map((z, i) => { const v = Math.min(99, 55 + i * 7 + stats.totalSessions * 3); const colors = [C.orange, C.accent, C.blue, C.purple, C.accent]; return (<div key={z} style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ color: C.text, fontSize: 11, fontWeight: 600 }}>{z}</span><span style={{ color: colors[i % 5], fontSize: 12, fontWeight: 800 }}>{v}%</span></div><Bar value={v} max={100} color={colors[i % 5]} h={5} /></div>); })}
    </div>
    <div style={{ background: C.card, borderRadius: 16, padding: "12px 10px", border: `1px solid ${C.cardL}` }}>
      <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Niveau {Math.floor(stats.xp / 500) + 1}</div>
      <Bar value={stats.xp % 500} max={500} color={C.gold} h={6} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 10, color: C.dim }}><span>{stats.xp % 500}/500</span><span style={{ color: C.gold }}>→ Niv. {Math.floor(stats.xp / 500) + 2}</span></div>
    </div>
  </div>
  );
};

// ─── PROFILE ──────────────────────────────
const Profile = ({ profile, stats, isPremium, onReset, goTo, onToggleTheme, theme, onUnsubscribe, onUpdateProfile, onUpdateName }) => {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.jobIcon);
  const [calendarSync, setCalendarSync] = useState(false);
  const [reminderFreq, setReminderFreq] = useState(null); // "1h" | "2h" | "4h"
  const [editing, setEditing] = useState(null); // null | "name" | "sector" | "job" | "pain" | "level" | "space"
  const [editName, setEditName] = useState(stats.userName);
  const [editSector, setEditSector] = useState(profile.sectorId);
  const [editJob, setEditJob] = useState(profile.jobId);
  const [editPain, setEditPain] = useState([...profile.painZones]);
  const [editLevel, setEditLevel] = useState(profile.level);
  const [editSpace, setEditSpace] = useState(profile.space);
  const avatars = ["👨‍💻", "👩‍💻", "👨‍🔬", "👩‍🎨", "🧑‍🏫", "👷", "👩‍⚕️", "🧑‍🍳", "👨‍🚀", "🦸", "🧙", "🥷"];

  const sector = SECTORS.find(s => s.id === editSector);
  const allJobs = editSector ? (JOBS[editSector] || []) : [];
  const jobs = isPremium ? allJobs : allJobs.filter(j => !j.pro);

  const saveEdit = (type) => {
    if (type === "name" && editName.length > 1) { onUpdateName(editName); }
    else if (type === "sector" || type === "job") {
      const s = SECTORS.find(x => x.id === editSector);
      const j = (JOBS[editSector] || []).find(x => x.id === editJob);
      if (s && j) onUpdateProfile({ ...profile, sectorId: editSector, sector: s.label, sectorIcon: s.icon, jobId: editJob, job: j.label, jobIcon: j.icon, riskZones: [...new Set([...(s.zones || []), ...editPain])] });
    } else if (type === "pain") {
      const s = SECTORS.find(x => x.id === profile.sectorId);
      onUpdateProfile({ ...profile, painZones: editPain, riskZones: [...new Set([...(s?.zones || []), ...editPain])] });
    } else if (type === "level") { onUpdateProfile({ ...profile, level: editLevel }); }
    else if (type === "space") { onUpdateProfile({ ...profile, space: editSpace }); }
    setEditing(null);
  };

  // Edit modal overlay
  const EditModal = ({ title, children, onSave, type }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setEditing(null)}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: C.bg, borderRadius: "20px 20px 0 0", padding: "16px 16px 30px", maxHeight: "75vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: C.text, fontSize: 16, fontWeight: 800 }}>{title}</span>
          <span onClick={() => setEditing(null)} style={{ color: C.dim, fontSize: 14, cursor: "pointer", padding: "4px 8px" }}>✕</span>
        </div>
        {children}
        <div onClick={() => saveEdit(type)} style={{ marginTop: 12, padding: "13px 0", borderRadius: 14, background: C.accent, color: "#0a0f14", fontSize: 14, fontWeight: 800, textAlign: "center", cursor: "pointer" }}>
          Enregistrer
        </div>
      </div>
    </div>
  );

  return (
  <div style={{ padding: "10px 4vw 30px" }}>
    <div style={{ padding: "10px 0 8px", display: "flex", alignItems: "center", gap: 10 }}>
      <div onClick={() => isPremium && setAvatarOpen(!avatarOpen)} style={{
        width: 50, height: 50, borderRadius: 18, position: "relative",
        background: isPremium ? `linear-gradient(135deg,${C.gold}30,${C.orange}30)` : C.accentDim,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
        border: `2px solid ${isPremium ? C.gold : C.accent}55`,
        cursor: isPremium ? "pointer" : "default",
      }}>
        {selectedAvatar}
        {isPremium && (
          <div style={{ position: "absolute", bottom: -3, right: -3, width: 18, height: 18, borderRadius: 9, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, border: `2px solid ${C.bg}` }}>✏️</div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: C.text, fontSize: 16, fontWeight: 800 }}>{stats.userName}</span>
          {isPremium && <Bdg small />}
          <span onClick={() => { setEditName(stats.userName); setEditing("name"); }} style={{ color: C.dim, fontSize: 11, cursor: "pointer", marginLeft: 2 }}>✏️</span>
        </div>
        <div style={{ color: C.dim, fontSize: 11 }}>{profile.jobIcon} {profile.job} · Niv. {Math.floor(stats.xp / 500) + 1}</div>
      </div>
    </div>

    {/* Avatar picker */}
    {avatarOpen && isPremium && (
      <div style={{ background: C.card, borderRadius: 14, padding: 10, marginBottom: 10, border: `1px solid ${C.gold}33` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}>Choisissez votre avatar</span><Bdg small />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
          {avatars.map((a, i) => (
            <div key={i} onClick={() => { setSelectedAvatar(a); setAvatarOpen(false); }} style={{
              width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, cursor: "pointer", background: selectedAvatar === a ? C.goldDim : C.cardL,
              border: `2px solid ${selectedAvatar === a ? C.gold : "transparent"}`, transition: "all 0.2s",
            }}>{a}</div>
          ))}
        </div>
      </div>
    )}
    {!isPremium && (
      <div style={{ background: C.card, borderRadius: 10, padding: "6px 10px", marginBottom: 8, border: `1px solid ${C.cardL}`, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11 }}>🔒</span>
        <span style={{ color: C.dim, fontSize: 10 }}>Personnalisez votre avatar avec Premium</span>
      </div>
    )}

    {/* Plan */}
    {isPremium ? (
      <div style={{ background: `linear-gradient(135deg,${C.gold}18,${C.orange}18)`, borderRadius: 14, padding: "10px 12px", marginBottom: 10, border: `1px solid ${C.gold}40` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 18 }}>👑</span><div style={{ flex: 1 }}><div style={{ color: C.gold, fontSize: 12, fontWeight: 800 }}>Flexo Premium — 4,90€/mois</div><div style={{ color: C.dim, fontSize: 10 }}>{stats.xp} XP · {stats.totalSessions} séances</div></div></div>
        <div onClick={onUnsubscribe} style={{ padding: "8px 0", borderRadius: 10, background: "rgba(0,0,0,0.15)", textAlign: "center", cursor: "pointer" }}>
          <span style={{ color: C.dim, fontSize: 11, fontWeight: 600 }}>Se désabonner</span>
        </div>
      </div>
    ) : (
      <div onClick={() => goTo("upgrade")} style={{ background: C.card, borderRadius: 14, padding: "10px 12px", marginBottom: 10, border: `1px solid ${C.cardL}`, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>🆓</span><div style={{ flex: 1 }}><div style={{ color: C.text, fontSize: 12, fontWeight: 800 }}>Plan Gratuit</div><div style={{ color: C.dim, fontSize: 10 }}>2 séances/jour · Programme basique</div></div><span style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}>Flexo Premium →</span></div>
      </div>
    )}

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
      {[{ v: stats.totalSessions, l: "Séances", c: C.accent }, { v: stats.xp, l: "XP", c: C.gold }, { v: `${stats.streak}j`, l: "Streak", c: C.orange }].map((s, i) => (
        <div key={i} style={{ background: C.card, borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${C.cardL}` }}><div style={{ color: s.c, fontSize: 18, fontWeight: 900 }}>{s.v}</div><div style={{ color: C.dim, fontSize: 9 }}>{s.l}</div></div>
      ))}
    </div>

    {/* Professional profile — EDITABLE */}
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <span style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Profil professionnel</span>
        {isPremium && <span style={{ color: C.gold, fontSize: 9, fontWeight: 700 }}>40+ métiers</span>}
      </div>
      <div style={{ background: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.cardL}` }}>
        {[
          { i: profile.sectorIcon, l: "Secteur", v: profile.sector, edit: "sector" },
          { i: profile.jobIcon, l: "Métier", v: profile.job, edit: "job" },
          { i: "💪", l: "Niveau", v: profile.level, edit: "level" },
          { i: "🪑", l: "Espace", v: profile.space, edit: "space" },
        ].map((f, i) => (
          <div key={i} onClick={() => { setEditing(f.edit); if (f.edit === "sector") setEditSector(profile.sectorId); if (f.edit === "job") { setEditSector(profile.sectorId); setEditJob(profile.jobId); } }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderBottom: i < 3 ? `1px solid ${C.cardL}` : "none", cursor: "pointer" }}>
            <span style={{ fontSize: 13 }}>{f.i}</span>
            <span style={{ color: C.dim, fontSize: 10, fontWeight: 600, width: 50 }}>{f.l}</span>
            <span style={{ color: C.text, fontSize: 11, fontWeight: 600, flex: 1 }}>{f.v}</span>
            <span style={{ color: C.accent, fontSize: 10 }}>✏️</span>
          </div>
        ))}
      </div>
    </div>

    {/* Pain zones — user-selected only */}
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Zones sensibles (perso)</span>
        <span onClick={() => { setEditPain([...profile.painZones]); setEditing("pain"); }} style={{ color: C.accent, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Modifier ✏️</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {profile.painZones && profile.painZones.length > 0
          ? profile.painZones.map(z => <Pill key={z} active color={C.orange}>{z}</Pill>)
          : <span style={{ color: C.dim, fontSize: 11 }}>Aucune zone ajoutée</span>
        }
      </div>
      {(() => { const s = SECTORS.find(x => x.id === profile.sectorId); const sectorOnly = (s?.zones || []).filter(z => !(profile.painZones || []).includes(z)); return sectorOnly.length > 0 ? (
        <div style={{ marginTop: 6 }}>
          <span style={{ color: C.dim, fontSize: 9, fontWeight: 600 }}>Zones liées au métier :</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>{sectorOnly.map(z => <Pill key={z} active color={C.blue}>{z}</Pill>)}</div>
        </div>
      ) : null; })()}
    </div>

    {/* Settings */}
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>Réglages</div>
      <div style={{ background: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.cardL}` }}>
        {/* Google Calendar Sync */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderBottom: `1px solid ${C.cardL}` }}>
          <span style={{ fontSize: 13 }}>📅</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: C.text, fontSize: 11, fontWeight: 600 }}>Google Agenda</span>
              {!isPremium && <span style={{ fontSize: 8, color: C.dim }}>🔒</span>}
            </div>
            <span style={{ color: C.dim, fontSize: 9 }}>{!isPremium ? "Premium requis" : calendarSync ? ("Synchronisé" + (reminderFreq ? " · Rappel " + reminderFreq : "")) : "Non connecté"}</span>
          </div>
          <div onClick={() => { if (!isPremium) return; if (!calendarSync) setEditing("calendar_confirm"); else { setCalendarSync(false); setReminderFreq(null); } }} style={{
            width: 40, height: 22, borderRadius: 11, cursor: isPremium ? "pointer" : "default",
            background: calendarSync && isPremium ? C.accent : C.cardL,
            opacity: isPremium ? 1 : 0.4, transition: "all 0.3s", position: "relative",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 2, left: calendarSync && isPremium ? 20 : 2, transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
        </div>

        {/* Rappels — only visible if calendar synced */}
        {calendarSync && (
          <div onClick={() => setEditing("reminders")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderBottom: `1px solid ${C.cardL}`, cursor: "pointer" }}>
            <span style={{ fontSize: 13 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <span style={{ color: C.text, fontSize: 11, fontWeight: 600 }}>Rappels exercices</span>
              <div style={{ color: C.dim, fontSize: 9 }}>{reminderFreq ? "Toutes les " + reminderFreq + " · créneaux de 15 min" : "Non configuré — appuyez pour choisir"}</div>
            </div>
            <span style={{ color: C.accent, fontSize: 10 }}>✏️</span>
          </div>
        )}

        {/* Theme toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderBottom: `1px solid ${C.cardL}` }}>
          <span style={{ fontSize: 13 }}>{theme === "dark" ? "🌙" : "☀️"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: C.text, fontSize: 11, fontWeight: 600 }}>Thème {theme === "dark" ? "sombre" : "clair"}</span>
              {!isPremium && <span style={{ fontSize: 8, color: C.dim }}>🔒</span>}
            </div>
            <span style={{ color: C.dim, fontSize: 9 }}>{isPremium ? "Appuyez pour changer" : "Premium requis"}</span>
          </div>
          <div onClick={() => isPremium && onToggleTheme()} style={{
            width: 40, height: 22, borderRadius: 11, cursor: isPremium ? "pointer" : "default",
            background: theme === "light" ? C.accent : C.cardL,
            opacity: isPremium ? 1 : 0.4, transition: "all 0.3s", position: "relative",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 2, left: theme === "light" ? 20 : 2, transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
        </div>

        {/* Account */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px" }}>
          <span style={{ fontSize: 13 }}>📧</span>
          <span style={{ color: C.dim, fontSize: 10, fontWeight: 600, width: 50 }}>Compte</span>
          <span style={{ color: C.text, fontSize: 11, fontWeight: 600, flex: 1 }}>{stats.userEmail}</span>
        </div>
      </div>
    </div>

    {/* Feedback */}
    <div onClick={() => goTo("feedback")} style={{ padding: "12px 0", borderRadius: 14, background: `${C.accent}15`, color: C.accent, fontSize: 12, fontWeight: 700, textAlign: "center", cursor: "pointer", border: `1px solid ${C.accent}30`, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      💬 Donner mon avis (Beta)
    </div>
    <div onClick={onReset} style={{ padding: "12px 0", borderRadius: 14, background: C.redDim, color: C.red, fontSize: 12, fontWeight: 700, textAlign: "center", cursor: "pointer", border: `1px solid ${C.red}30`, marginBottom: 16 }}>🔄 Recommencer depuis le début</div>

    {/* ═══ EDIT MODALS ═══ */}
    {editing === "name" && (
      <EditModal title="Modifier le nom" type="name" onSave={() => saveEdit("name")}>
        <Input icon="👤" placeholder="Votre nom" value={editName} onChange={setEditName} />
      </EditModal>
    )}

    {editing === "sector" && (
      <EditModal title="Changer de secteur" type="sector">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {SECTORS.map(s => (
            <div key={s.id} onClick={() => { setEditSector(s.id); setEditJob(null); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: editSector === s.id ? C.accentDim : C.card, border: `1.5px solid ${editSector === s.id ? C.accent : C.cardL}`, cursor: "pointer" }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div style={{ flex: 1 }}><div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{s.label}</div><div style={{ color: C.dim, fontSize: 10 }}>{s.desc}</div></div>
              {editSector === s.id && <span style={{ color: C.accent }}>✓</span>}
            </div>
          ))}
        </div>
      </EditModal>
    )}

    {editing === "job" && (
      <EditModal title="Changer de métier" type="job">
        <div style={{ color: C.accent, fontSize: 11, marginBottom: 8 }}>{sector?.icon} {sector?.label}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {jobs.map(j => (
            <div key={j.id} onClick={() => setEditJob(j.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 8px", borderRadius: 14, background: editJob === j.id ? C.accentDim : C.card, border: `1.5px solid ${editJob === j.id ? C.accent : C.cardL}`, cursor: "pointer" }}>
              <span style={{ fontSize: 22 }}>{j.icon}</span>
              <span style={{ color: editJob === j.id ? C.accent : C.text, fontSize: 11, fontWeight: 600 }}>{j.label}</span>
            </div>
          ))}
        </div>
      </EditModal>
    )}

    {editing === "level" && (
      <EditModal title="Niveau d'activité" type="level">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {["Peu actif", "Modéré", "Actif"].map(n => (
            <div key={n} onClick={() => setEditLevel(n)} style={{ padding: "12px 14px", borderRadius: 14, background: editLevel === n ? C.accentDim : C.card, border: `1.5px solid ${editLevel === n ? C.accent : C.cardL}`, cursor: "pointer", color: editLevel === n ? C.accent : C.text, fontSize: 13, fontWeight: 600 }}>{n}</div>
          ))}
        </div>
      </EditModal>
    )}

    {editing === "space" && (
      <EditModal title="Espace au travail" type="space">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {["Assis seulement", "Debout possible", "Espace libre"].map(e => (
            <div key={e} onClick={() => setEditSpace(e)} style={{ padding: "12px 14px", borderRadius: 14, background: editSpace === e ? C.accentDim : C.card, border: `1.5px solid ${editSpace === e ? C.accent : C.cardL}`, cursor: "pointer", color: editSpace === e ? C.accent : C.text, fontSize: 13, fontWeight: 600 }}>{e}</div>
          ))}
        </div>
      </EditModal>
    )}

    {editing === "pain" && (
      <EditModal title="Zones sensibles" type="pain">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["Nuque", "Dos", "Poignets", "Épaules", "Genoux", "Yeux", "Jambes"].map(z => (
            <div key={z} onClick={() => setEditPain(p => p.includes(z) ? p.filter(x => x !== z) : [...p, z])} style={{ padding: "10px 16px", borderRadius: 12, cursor: "pointer", background: editPain.includes(z) ? C.orangeDim : C.card, border: `1.5px solid ${editPain.includes(z) ? C.orange : C.cardL}`, color: editPain.includes(z) ? C.orange : C.text, fontSize: 12, fontWeight: 600 }}>{z}</div>
          ))}
        </div>
      </EditModal>
    )}

    {/* Calendar confirmation modal */}
    {editing === "calendar_confirm" && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setEditing(null)}>
        <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: 20, padding: 20, maxWidth: 340, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
          <div style={{ color: C.text, fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Synchroniser Google Agenda ?</div>
          <div style={{ color: C.dim, fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
            Flexo ajoutera automatiquement des créneaux de 15 min sur votre agenda pour vos exercices. Vous pourrez configurer la fréquence des rappels ensuite.
          </div>
          <div onClick={() => { setCalendarSync(true); setEditing("reminders"); }} style={{
            padding: "13px 0", borderRadius: 14, background: C.accent, color: "#0a0f14",
            fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 8,
          }}>Oui, synchroniser</div>
          <div onClick={() => setEditing(null)} style={{
            padding: "13px 0", borderRadius: 14, background: C.cardL, color: C.dim,
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Annuler</div>
        </div>
      </div>
    )}

    {/* Reminders frequency modal */}
    {editing === "reminders" && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setEditing(null)}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: C.bg, borderRadius: "20px 20px 0 0", padding: "16px 16px 30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: C.text, fontSize: 16, fontWeight: 800 }}>Fréquence des rappels</span>
            <span onClick={() => setEditing(null)} style={{ color: C.dim, fontSize: 14, cursor: "pointer", padding: "4px 8px" }}>✕</span>
          </div>
          <div style={{ color: C.dim, fontSize: 11, marginBottom: 12, lineHeight: 1.4 }}>
            Un créneau de 15 min "Flexo - Exercices quotidien" sera ajouté à votre agenda à la fréquence choisie.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[{ id: "1h", label: "Toutes les heures", desc: "8 rappels/jour (9h-17h)" },
              { id: "2h", label: "Toutes les 2 heures", desc: "4 rappels/jour (9h-17h)" },
              { id: "4h", label: "Toutes les 4 heures", desc: "2 rappels/jour (9h-17h)" }
            ].map(opt => (
              <div key={opt.id} onClick={() => setReminderFreq(opt.id)} style={{
                padding: "12px 14px", borderRadius: 14, cursor: "pointer",
                background: reminderFreq === opt.id ? C.accentDim : C.card,
                border: `1.5px solid ${reminderFreq === opt.id ? C.accent : C.cardL}`,
              }}>
                <div style={{ color: reminderFreq === opt.id ? C.accent : C.text, fontSize: 13, fontWeight: 700 }}>{opt.label}</div>
                <div style={{ color: C.dim, fontSize: 10 }}>{opt.desc}</div>
              </div>
            ))}
          </div>
          <div onClick={() => { if (reminderFreq) { console.log("Calendar sync:", { freq: reminderFreq, title: "Flexo - Exercices quotidien", duration: 15 }); setEditing(null); } }} style={{
            marginTop: 12, padding: "13px 0", borderRadius: 14, textAlign: "center", cursor: reminderFreq ? "pointer" : "default",
            background: reminderFreq ? C.accent : C.cardL,
            color: reminderFreq ? "#0a0f14" : C.dim,
            fontSize: 14, fontWeight: 800, opacity: reminderFreq ? 1 : 0.5,
          }}>
            Activer les rappels
          </div>
        </div>
      </div>
    )}
  </div>
  );
};


// ─── FEEDBACK ─────────────────────────────
const Feedback = ({ goTo, stats, profile }) => {
  const [rating, setRating] = useState(0);
  const [frequency, setFrequency] = useState(null);
  const [useful, setUseful] = useState(null);
  const [ideas, setIdeas] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const freqOptions = ["Chaque jour", "3-4x/semaine", "1-2x/semaine", "Rarement"];
  const usefulOptions = ["Très utile", "Plutôt utile", "Moyennement", "Pas assez"];

  const handleSubmit = () => {
    const data = { rating, frequency, useful, ideas, user: stats.userName, job: profile?.job, date: new Date().toISOString() };
    console.log("Feedback:", JSON.stringify(data));
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ width: 80, height: 80, borderRadius: 40, background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 16, border: `3px solid ${C.accent}`, boxShadow: `0 0 30px ${C.accentGlow}` }}>💙</div>
      <div style={{ color: C.text, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Merci pour ton retour !</div>
      <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.5, marginBottom: 24, maxWidth: 280 }}>Ton avis nous aide à construire la meilleure app de bien-être au travail.</div>
      <div onClick={() => goTo("home")} style={{ width: "100%", maxWidth: 300, padding: "14px 0", borderRadius: 14, background: C.accent, color: "#0a0f14", fontSize: 15, fontWeight: 800, textAlign: "center", cursor: "pointer" }}>
        Retour à l'accueil
      </div>
    </div>
  );

  return (
    <div style={{ padding: "10px 4vw 40px" }}>
      <div style={{ padding: "10px 0 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span onClick={() => goTo("profile")} style={{ color: C.dim, fontSize: 12, cursor: "pointer" }}>← Retour</span>
        <span style={{ color: C.accent, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Beta Feedback</span>
        <span style={{ width: 50 }} />
      </div>

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>💬</div>
        <div style={{ color: C.text, fontSize: 17, fontWeight: 900 }}>Ton avis compte</div>
        <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>3 questions rapides + tes idées</div>
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: `1px solid ${C.cardL}` }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>1. Comment notes-tu Flexo ?</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {[1,2,3,4,5].map(n => (
            <div key={n} onClick={() => setRating(n)} style={{
              width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, cursor: "pointer", transition: "all 0.2s",
              background: rating >= n ? `${C.gold}25` : C.cardL,
              border: `2px solid ${rating >= n ? C.gold : "transparent"}`,
              transform: rating >= n ? "scale(1.1)" : "scale(1)",
            }}>
              {rating >= n ? "⭐" : "☆"}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: `1px solid ${C.cardL}` }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>2. À quelle fréquence utiliserais-tu Flexo ?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {freqOptions.map(opt => (
            <div key={opt} onClick={() => setFrequency(opt)} style={{
              padding: "10px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
              background: frequency === opt ? `${C.accent}20` : C.cardL,
              border: `1.5px solid ${frequency === opt ? C.accent : "transparent"}`,
              color: frequency === opt ? C.accent : C.dim, fontSize: 11, fontWeight: 600,
              transition: "all 0.2s",
            }}>{opt}</div>
          ))}
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: `1px solid ${C.cardL}` }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>3. Les exercices te semblent-ils adaptés à ton métier ?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {usefulOptions.map(opt => (
            <div key={opt} onClick={() => setUseful(opt)} style={{
              padding: "10px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
              background: useful === opt ? `${C.accent}20` : C.cardL,
              border: `1.5px solid ${useful === opt ? C.accent : "transparent"}`,
              color: useful === opt ? C.accent : C.dim, fontSize: 11, fontWeight: 600,
              transition: "all 0.2s",
            }}>{opt}</div>
          ))}
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 14, padding: "12px 14px", marginBottom: 16, border: `1px solid ${C.cardL}` }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>💡 Une idée d'amélioration ?</div>
        <textarea
          value={ideas} onChange={e => setIdeas(e.target.value)}
          placeholder="Ex : J'aimerais des séances plus courtes, un mode rappel…"
          rows={3}
          style={{
            width: "100%", background: C.cardL, border: "none", borderRadius: 10,
            padding: "10px 12px", color: C.text, fontSize: 12, fontFamily: "inherit",
            resize: "none", outline: "none", lineHeight: 1.5,
          }}
        />
      </div>

      <div onClick={() => (rating && frequency && useful) && handleSubmit()} style={{
        width: "100%", padding: "14px 0", borderRadius: 14, textAlign: "center", cursor: (rating && frequency && useful) ? "pointer" : "default",
        background: (rating && frequency && useful) ? C.accent : C.cardL,
        color: (rating && frequency && useful) ? "#0a0f14" : C.dim,
        fontSize: 15, fontWeight: 800, transition: "all 0.3s",
        opacity: (rating && frequency && useful) ? 1 : 0.5,
      }}>
        Envoyer mon avis 🚀
      </div>
    </div>
  );
};

// ─── UPGRADE SCREEN ───────────────────────
const UpgradeScreen = ({ goTo, onUpgrade, userName, showPayment }) => {
  const [planType, setPlanType] = useState("monthly");

  return (
  <div style={{ padding: "10px 16px 40px" }}>
    <div style={{ textAlign: "center", padding: "16px 0 10px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><FlexoIcon size={64} /></div>
      <div style={{ color: C.gold, fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Flexo Premium</div>
      <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>Débloquez tout le potentiel</div>
    </div>

    {/* Plan toggle */}
    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
      <div onClick={() => setPlanType("monthly")} style={{
        flex: 1, padding: "10px 8px", borderRadius: 12, textAlign: "center", cursor: "pointer",
        background: planType === "monthly" ? C.goldDim : C.card,
        border: `1.5px solid ${planType === "monthly" ? C.gold : C.cardL}`,
      }}>
        <div style={{ color: planType === "monthly" ? C.gold : C.text, fontSize: 16, fontWeight: 800 }}>4,90€</div>
        <div style={{ color: C.dim, fontSize: 10 }}>par mois</div>
      </div>
      <div onClick={() => setPlanType("annual")} style={{
        flex: 1, padding: "10px 8px", borderRadius: 12, textAlign: "center", cursor: "pointer", position: "relative",
        background: planType === "annual" ? C.goldDim : C.card,
        border: `1.5px solid ${planType === "annual" ? C.gold : C.cardL}`,
      }}>
        <div style={{ position: "absolute", top: -6, right: 8, background: "#30d158", color: "#fff", fontSize: 8, fontWeight: 800, padding: "1px 6px", borderRadius: 4 }}>-32%</div>
        <div style={{ color: planType === "annual" ? C.gold : C.text, fontSize: 16, fontWeight: 800 }}>39,90€</div>
        <div style={{ color: C.dim, fontSize: 10 }}>par an · 3,33€/mois</div>
      </div>
    </div>

    {[
      { icon: "♾️", title: "Séances illimitées", desc: "Tout le programme quotidien + bibliothèque complète" },
      { icon: "🧠", title: "Programme IA complet", desc: "Toutes les zones débloquées, adaptatif jour après jour" },
      { icon: "📅", title: "Sync Google Agenda", desc: "Rappels intelligents basés sur vos créneaux libres" },
      { icon: "📊", title: "Stats avancées + IA", desc: "Historique illimité, score postural, conseils personnalisés" },
      { icon: "💼", title: "40+ profils métiers", desc: "Accédez à tous les métiers et séances spécialisées" },
      { icon: "🎨", title: "Avatar & thèmes", desc: "Créez votre avatar, choisissez thème clair ou sombre" },
      { icon: "🏆", title: "Défis & classements", desc: "Compétition entre métiers, badges exclusifs" },
    ].map((f, i) => (
      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: i < 6 ? `1px solid ${C.cardL}` : "none" }}>
        <span style={{ fontSize: 20, marginTop: 2 }}>{f.icon}</span>
        <div><div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{f.title}</div><div style={{ color: C.dim, fontSize: 10 }}>{f.desc}</div></div>
      </div>
    ))}
    <div onClick={() => showPayment(planType, onUpgrade)} style={{ padding: "14px 0", borderRadius: 14, marginTop: 12, background: `linear-gradient(135deg,${C.gold},${C.orange})`, color: "#1a1a1a", fontSize: 15, fontWeight: 800, textAlign: "center", cursor: "pointer", boxShadow: `0 4px 16px ${C.goldGlow}` }}>Essai gratuit 7 jours →</div>
    <div style={{ textAlign: "center", fontSize: 10, color: C.dim, marginTop: 6, marginBottom: 12 }}>Sans engagement · Annulation en 1 clic</div>
    <div onClick={() => goTo("home")} style={{ textAlign: "center", color: C.dim, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>← Retour</div>
  </div>
  );
};

// ─── APP ──────────────────────────────────
function App() {
  const [screen, setScreen] = useState("signup");
  const [account, setAccount] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [profile, setProfile] = useState(null);
  const [sessionTarget, setSessionTarget] = useState(null);
  const [isFromLibrary, setIsFromLibrary] = useState(false);
  const [stats, setStats] = useState({ xp: 0, totalSessions: 0, streak: 1, score: 0, userName: "", userEmail: "" });
  const [sessions, setSessions] = useState([]);
  const [dailyProgram, setDailyProgram] = useState([]);
  const [completedBlocks, setCompletedBlocks] = useState([]);
  const [theme, setTheme] = useState("dark");
  const [paymentSheet, setPaymentSheet] = useState(null); // null | { plan, onConfirm }

  const goTo = useCallback((id, target) => {
    if (id === "session") { setSessionTarget(target); setIsFromLibrary(false); setScreen("session"); }
    else if (id === "session_free") { setSessionTarget(target); setIsFromLibrary(true); setScreen("session"); }
    else { setScreen(id); if (target) setSessionTarget(target); }
  }, []);

  const handleSignup = useCallback((acc) => { setAccount(acc); setStats(s => ({ ...s, userName: acc.name, userEmail: acc.email })); setScreen("plan"); }, []);
  const handlePlan = useCallback((plan) => { setIsPremium(plan === "premium"); setScreen("onboarding"); }, []);
  const handleOnboarding = useCallback((p) => { setProfile(p); setSessions(buildSessions(p.riskZones, p)); setDailyProgram(buildDailyProgram(p.riskZones, p)); setCompletedBlocks([]); setScreen("home"); }, []);
  const handleSessionComplete = useCallback((xp, blockId) => {
    setStats(prev => ({ ...prev, xp: prev.xp + xp, totalSessions: prev.totalSessions + 1, streak: prev.streak + ((prev.totalSessions + 1) % 3 === 0 ? 1 : 0), score: Math.min(99, prev.score + Math.floor(Math.random() * 3) + 1) }));
    if (blockId && !blockId.startsWith("s")) setCompletedBlocks(prev => prev.includes(blockId) ? prev : [...prev, blockId]);
  }, []);
  const handleUpgrade = useCallback(() => { setIsPremium(true); setPaymentSheet(null); setScreen("home"); }, []);
  const handleUnsubscribe = useCallback(() => { setIsPremium(false); setScreen("home"); }, []);
  const handleUpdateProfile = useCallback((newProfile) => { setProfile(newProfile); setSessions(buildSessions(newProfile.riskZones, newProfile)); setDailyProgram(buildDailyProgram(newProfile.riskZones, newProfile)); setCompletedBlocks([]); }, []);
  const handleUpdateName = useCallback((newName) => { setStats(s => ({ ...s, userName: newName })); }, []);
  const showPayment = useCallback((plan, onDone) => { setPaymentSheet({ plan, onDone }); }, []);
  const handleToggleTheme = useCallback(() => { setTheme(t => t === "dark" ? "light" : "dark"); }, []);
  const handleReset = useCallback(() => { setScreen("signup"); setAccount(null); setProfile(null); setIsPremium(false); setTheme("dark"); setStats({ xp: 0, totalSessions: 0, streak: 1, score: 0, userName: "", userEmail: "" }); setSessions([]); setDailyProgram([]); setCompletedBlocks([]); }, []);

  const navItems = [{ id: "home", icon: "🏠", l: "Accueil" }, { id: "library", icon: "📚", l: "Séances" }, { id: "stats", icon: "📊", l: "Stats" }, { id: "profile", icon: "👤", l: "Profil" }];
  const showNav = navItems.some(n => n.id === screen);

  // Theme-dependent colors


  applyTheme(theme);
  const render = () => {
    if (screen === "signup") return <SignupScreen onComplete={handleSignup} />;
    if (screen === "plan") return <PlanScreen onSelect={handlePlan} userName={account?.name} showPayment={showPayment} />;
    if (screen === "onboarding") return <Onboarding onComplete={handleOnboarding} isPremium={isPremium} />;
    if (screen === "feedback") return <Feedback goTo={goTo} stats={stats} profile={profile} />;
    if (screen === "upgrade") return <UpgradeScreen goTo={goTo} onUpgrade={handleUpgrade} userName={stats.userName} showPayment={showPayment} />;
    if (screen === "session") return <Session goTo={goTo} blockId={sessionTarget} dailyProgram={dailyProgram} sessions={sessions} onComplete={handleSessionComplete} isFromLibrary={isFromLibrary} />;
    if (screen === "library") return <Library goTo={goTo} sessions={sessions} isPremium={isPremium} />;
    if (screen === "stats") return <Stats stats={stats} profile={profile} isPremium={isPremium} />;
    if (screen === "profile") return <Profile profile={profile} stats={stats} isPremium={isPremium} onReset={handleReset} goTo={goTo} onToggleTheme={handleToggleTheme} theme={theme} onUnsubscribe={handleUnsubscribe} onUpdateProfile={handleUpdateProfile} onUpdateName={handleUpdateName} />;
    return <Home goTo={goTo} profile={profile} stats={stats} dailyProgram={dailyProgram} completedBlocks={completedBlocks} isPremium={isPremium} sessions={sessions} />;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: "100vh", background: C.bg, fontFamily: "'Manrope','SF Pro Display',-apple-system,sans-serif", position: "relative", transition: "background 0.3s", overflow: "hidden" }}>
      {/* Fixed top safe area spacer */}
      <div style={{ flexShrink: 0, height: "env(safe-area-inset-top, 0px)", background: C.bg, zIndex: 40 }} />
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 10, WebkitOverflowScrolling: "touch" }}>{render()}</div>
      {/* Fixed bottom nav */}
      {showNav && (
        <div style={{ flexShrink: 0, background: C.bg, borderTop: `1px solid ${C.cardL}`, display: "flex", justifyContent: "space-around", alignItems: "center", paddingTop: 8, paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))", zIndex: 50 }}>
          {navItems.map(n => (<div key={n.id} onClick={() => goTo(n.id)} style={{ textAlign: "center", cursor: "pointer", opacity: screen === n.id ? 1 : 0.5, transition: "all 0.2s", padding: "2px 16px", flex: 1 }}><div style={{ fontSize: 20, marginBottom: 4 }}>{n.icon}</div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: screen === n.id ? (isPremium ? C.gold : C.accent) : C.dim }}>{n.l}</div></div>))}
        </div>
      )}
      {paymentSheet && (
        <PaymentSheet
          plan={paymentSheet.plan}
          userName={stats.userName}
          onCancel={() => setPaymentSheet(null)}
          onConfirm={() => { const cb = paymentSheet.onDone; setPaymentSheet(null); if (cb) cb(); }}
        />
      )}
    </div>
  );
}
