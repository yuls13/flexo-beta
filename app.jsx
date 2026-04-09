const { useState, useEffect, useRef, useCallback } = React;

const C = {
  bg: "#0B1219", card: "#151F2B", cardL: "#1E2D3D",
  accent: "#00E676", accentDim: "rgba(0,230,118,0.12)", accentGlow: "rgba(0,230,118,0.25)",
  text: "#E4EEF2", dim: "#6B8FA8",
  orange: "#FF9100", orangeDim: "rgba(255,145,0,0.12)",
  red: "#FF5252", redDim: "rgba(255,82,82,0.1)",
  blue: "#448AFF", blueDim: "rgba(68,138,255,0.12)",
  purple: "#B388FF", purpleDim: "rgba(179,136,255,0.12)",
  gold: "#FFD700", goldDim: "rgba(255,215,0,0.1)", goldGlow: "rgba(255,215,0,0.2)",
};
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

const EXERCISES = [
  { id: "n1", name: "Rotation lente nuque", icon: "🔄", dur: 15, zone: "Nuque", xp: 10, inst: "Tournez lentement la tête de gauche à droite. 5s à chaque extrémité.", breath: "Inspirez au centre, expirez en tournant" },
  { id: "n2", name: "Inclinaison latérale", icon: "↔️", dur: 12, zone: "Nuque", xp: 10, inst: "Oreille vers l'épaule, maintenez 5s. Changez.", breath: "Expirez en inclinant" },
  { id: "n3", name: "Flexion avant douce", icon: "⬇️", dur: 10, zone: "Nuque", xp: 8, inst: "Menton vers poitrine, étirement arrière du cou.", breath: "Respirez profondément" },
  { id: "d1", name: "Chat-vache assis", icon: "🐱", dur: 15, zone: "Dos", xp: 12, inst: "Alternez dos rond et dos creusé. Lent et fluide.", breath: "Inspirez creusé, expirez arrondi" },
  { id: "d2", name: "Torsion vertébrale", icon: "🔄", dur: 12, zone: "Dos", xp: 10, inst: "Pivotez le buste, hanches face avant. 5s par côté.", breath: "Expirez en pivotant" },
  { id: "d3", name: "Extension lombaire", icon: "⬆️", dur: 10, zone: "Dos", xp: 10, inst: "Mains sur lombaires, penchez en arrière doucement.", breath: "Inspirez en extension" },
  { id: "e1", name: "Roulement d'épaules", icon: "🔃", dur: 12, zone: "Épaules", xp: 8, inst: "Grands cercles : 5 avant, 5 arrière.", breath: "Respirez naturellement" },
  { id: "e2", name: "Étirement trapèzes", icon: "↕️", dur: 15, zone: "Épaules", xp: 10, inst: "Main sur tête, tirez vers la droite. 7s. Changez.", breath: "Expirez en étirant" },
  { id: "p1", name: "Extension poignets", icon: "🤲", dur: 12, zone: "Poignets", xp: 10, inst: "Bras tendu, tirez doigts vers vous. 6s par côté.", breath: "Respirez calmement" },
  { id: "p2", name: "Rotations poignets", icon: "🔁", dur: 10, zone: "Poignets", xp: 8, inst: "10 rotations par sens. Amples et lentes.", breath: "Respirez naturellement" },
  { id: "y1", name: "Règle 20-20-20", icon: "👀", dur: 10, zone: "Yeux", xp: 8, inst: "Regardez à 6m pendant 10s. Clignez doucement.", breath: "Relâchez la mâchoire" },
  { id: "y2", name: "Palming oculaire", icon: "🙌", dur: 15, zone: "Yeux", xp: 10, inst: "Paumes chaudes sur yeux fermés. 15s.", breath: "Inspirez 4s, expirez 6s" },
  { id: "r1", name: "Respiration 4-7-8", icon: "🫁", dur: 19, zone: "Global", xp: 12, inst: "Inspirez 4s, bloquez 7s, expirez 8s.", breath: "4s — 7s — 8s" },
  { id: "r2", name: "Respiration carrée", icon: "⬜", dur: 16, zone: "Global", xp: 10, inst: "Inspirez 4s, bloquez 4s, expirez 4s, bloquez 4s.", breath: "4 temps égaux" },
  { id: "j1", name: "Flexion mollets", icon: "🦵", dur: 12, zone: "Jambes", xp: 10, inst: "Debout, montez sur pointe 10 fois.", breath: "Expirez en montant" },
  { id: "j2", name: "Étirement quadriceps", icon: "🦿", dur: 15, zone: "Jambes", xp: 10, inst: "Pied vers fesse, 7s par jambe.", breath: "Respirez profondément" },
  { id: "g1", name: "Genoux poitrine", icon: "🧎", dur: 12, zone: "Genoux", xp: 10, inst: "Assis, genou vers poitrine. 6s par côté.", breath: "Expirez en rapprochant" },
];
const getEx = (id) => EXERCISES.find(e => e.id === id);

// Build daily program: ordered sequence of zone-focused blocks
const buildDailyProgram = (zones) => {
  const byZone = {};
  EXERCISES.forEach(e => { if (!byZone[e.zone]) byZone[e.zone] = []; byZone[e.zone].push(e.id); });
  const globals = byZone["Global"] || [];

  // Each zone gets its own block + a closing global block
  const blocks = zones.map((z, i) => ({
    id: `block_${i}`,
    zone: z,
    name: `${z}`,
    exercises: [...(byZone[z] || []).slice(0, 3), globals[i % globals.length]].filter(Boolean),
    xp: 40 + i * 5,
    icon: { Nuque: "🔄", Dos: "🐱", Épaules: "🔃", Poignets: "🤲", Yeux: "👀", Jambes: "🦵", Genoux: "🧎" }[z] || "🧘",
  }));

  // Add a final "global" deep block
  blocks.push({
    id: "block_deep",
    zone: "Global",
    name: "Décompression complète",
    exercises: [...zones.flatMap(z => (byZone[z] || []).slice(0, 1)), ...globals],
    xp: 80,
    icon: "🧘",
  });

  return blocks;
};

const buildSessions = (zones) => {
  const byZone = {};
  EXERCISES.forEach(e => { if (!byZone[e.zone]) byZone[e.zone] = []; byZone[e.zone].push(e.id); });
  const pool = [...new Set([...zones.flatMap(z => byZone[z] || []), ...(byZone["Global"] || [])])];
  const pick = (n) => [...pool].sort(() => Math.random() - 0.5).slice(0, n);
  return [
    { id: "s1", name: `Détente ${zones[0]}`, type: "standard", dur: 5, exercises: pick(4), icon: "🧘", xp: 50, desc: `Cible : ${zones.slice(0, 2).join(" & ")}` },
    { id: "s2", name: `SOS ${zones[0]}`, type: "sos", dur: 3, exercises: pick(3), icon: "🆘", xp: 30, desc: `Soulagement rapide` },
    { id: "s3", name: "Flash express", type: "flash", dur: 3, exercises: pick(3), icon: "⚡", xp: 30, desc: "Déblocage 3 min" },
    { id: "s4", name: "Repos oculaire", type: "flash", dur: 3, exercises: ["y1", "y2", "r2"], icon: "👀", xp: 30, desc: "Pause yeux" },
    { id: "s5", name: `Mobilité ${zones[1] || ""}`, type: "standard", dur: 5, exercises: pick(4), icon: "🤲", xp: 50, desc: `Focus ${zones[1] || "mobilité"}` },
    { id: "s6", name: "Décompression", type: "deep", dur: 10, exercises: pick(6), icon: "🧘", xp: 80, desc: "Séance complète" },
    { id: "s7", name: "Activation matinale", type: "standard", dur: 5, exercises: pick(4), icon: "☀️", xp: 50, desc: "Bien démarrer" },
    { id: "s8", name: "SOS Migraine", type: "sos", dur: 3, exercises: ["n2", "y2", "r1"], icon: "🆘", xp: 30, desc: "Maux de tête" },
    { id: "s9", name: "Anti coup de barre", type: "flash", dur: 3, exercises: pick(3), icon: "⚡", xp: 30, desc: "Relance 14h" },
    { id: "s10", name: "Anti-stress", type: "standard", dur: 5, exercises: ["r1", "r2", "y2", "n3"], icon: "🫁", xp: 50, desc: "Calme et recentrage" },
  ];
};

// ─── UI COMPONENTS ────────────────────────
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
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div onClick={onCancel} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

      {/* Sheet */}
      <div style={{
        position: "relative", background: "#1c1c1e", borderRadius: "20px 20px 0 0",
        padding: "0 0 20px", overflow: "hidden",
        animation: "slideUp 0.35s ease-out",
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
  const [mode, setMode] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [gLoading, setGLoading] = useState(false);
  const [gError, setGError] = useState(null);

  const handleGoogleSignIn = async () => {
    if (!window.firebase?.auth) { setGError("Firebase non configuré"); return; }
    setGLoading(true); setGError(null);
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      onComplete({ name: user.displayName || "Utilisateur", email: user.email, method: "google", photoURL: user.photoURL, uid: user.uid });
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.code === "auth/popup-closed-by-user") setGError("Connexion annulée");
      else if (err.code === "auth/unauthorized-domain") setGError("Domaine non autorisé dans Firebase");
      else setGError("Erreur de connexion : " + (err.message || "réessayez"));
      setGLoading(false);
    }
  };

  if (!mode) return (
    <div style={{ padding: "20px 20px 40px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ marginBottom: 6 }}><FlexoLogo size={90} /></div>
      <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.5, marginBottom: 28, padding: "0 10px" }}>
        Des micro-séances adaptées à votre métier pour prendre soin de votre corps au travail
      </div>

      <div onClick={handleGoogleSignIn} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 16px", borderRadius: 14,
        background: "#fff", cursor: gLoading ? "wait" : "pointer", marginBottom: 10, opacity: gLoading ? 0.7 : 1, transition: "opacity 0.2s",
      }}>
        {gLoading ? (
          <span style={{ color: "#333", fontSize: 14, fontWeight: 700 }}>Connexion en cours…</span>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span style={{ color: "#333", fontSize: 14, fontWeight: 700 }}>Continuer avec Google</span>
          </>
        )}
      </div>

      {gError && (
        <div style={{ background: C.redDim, borderRadius: 10, padding: "8px 12px", marginBottom: 8, border: `1px solid ${C.red}30` }}>
          <span style={{ color: C.red, fontSize: 11 }}>{gError}</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "6px 0 14px" }}>
        <div style={{ flex: 1, height: 1, background: C.cardL }} />
        <span style={{ color: C.dim, fontSize: 11 }}>ou</span>
        <div style={{ flex: 1, height: 1, background: C.cardL }} />
      </div>

      <div onClick={() => setMode("email")} style={{
        padding: "14px 16px", borderRadius: 14, background: C.card,
        border: `1px solid ${C.cardL}`, cursor: "pointer", textAlign: "center",
      }}>
        <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>📧 S'inscrire avec un email</span>
      </div>

      <div style={{ color: C.dim, fontSize: 10, marginTop: 16, lineHeight: 1.5 }}>
        En continuant, vous acceptez les Conditions d'utilisation et la Politique de confidentialité
      </div>
    </div>
  );

  // Email signup
  const canSubmit = name.length > 1 && email.includes("@") && pass.length >= 4;
  return (
    <div style={{ padding: "20px 20px 40px", textAlign: "center" }}>
      <div style={{ fontSize: 44, marginTop: 20, marginBottom: 8 }}>📧</div>
      <div style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Créer un compte</div>
      <div style={{ color: C.dim, fontSize: 12, marginBottom: 16 }}>Remplissez vos informations</div>

      <Input icon="👤" placeholder="Votre nom" value={name} onChange={setName} />
      <Input icon="📧" placeholder="Email" type="email" value={email} onChange={setEmail} />
      <Input icon="🔒" placeholder="Mot de passe" type="password" value={pass} onChange={setPass} />

      <div onClick={() => canSubmit && onComplete({ name, email, method: "email" })} style={{
        padding: "14px 0", borderRadius: 14, marginTop: 8, cursor: canSubmit ? "pointer" : "default",
        background: canSubmit ? C.accent : C.cardL, color: canSubmit ? "#0a0f14" : C.dim,
        fontSize: 14, fontWeight: 800, opacity: canSubmit ? 1 : 0.5, transition: "all 0.3s",
      }}>Créer mon compte</div>

      <div onClick={() => setMode(null)} style={{ color: C.dim, fontSize: 12, marginTop: 12, cursor: "pointer" }}>← Retour</div>
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
    <div style={{ padding: "10px 14px 30px" }}>
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
    <div style={{ padding: "20px 16px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
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
    <div style={{ padding: "10px 14px 30px", textAlign: "center" }}>
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
    <div style={{ padding: "10px 14px 30px" }}>
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
  <div style={{ padding: "10px 14px 30px" }}>
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
  <div style={{ padding: "10px 14px 30px" }}>
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

    {/* Pain zones — editable */}
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Zones à risque</span>
        <span onClick={() => { setEditPain([...profile.painZones]); setEditing("pain"); }} style={{ color: C.accent, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Modifier ✏️</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{profile.riskZones.map(z => <Pill key={z} active color={C.orange}>{z}</Pill>)}</div>
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
            <span style={{ color: C.dim, fontSize: 9 }}>{isPremium ? (calendarSync ? "Synchronisé" : "Non connecté") : "Premium requis"}</span>
          </div>
          <div onClick={() => isPremium && setCalendarSync(!calendarSync)} style={{
            width: 40, height: 22, borderRadius: 11, cursor: isPremium ? "pointer" : "default",
            background: calendarSync && isPremium ? C.accent : C.cardL,
            opacity: isPremium ? 1 : 0.4, transition: "all 0.3s", position: "relative",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 2, left: calendarSync && isPremium ? 20 : 2, transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
        </div>

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

        {/* Notifications */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderBottom: `1px solid ${C.cardL}` }}>
          <span style={{ fontSize: 13 }}>🔔</span>
          <span style={{ color: C.dim, fontSize: 10, fontWeight: 600, width: 50 }}>Rappels</span>
          <span style={{ color: C.text, fontSize: 11, fontWeight: 600, flex: 1 }}>{isPremium ? "IA + calendrier" : "Timer simple"}</span>
          <span style={{ color: C.dim, fontSize: 10 }}>›</span>
        </div>

        {/* Account */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px" }}>
          <span style={{ fontSize: 13 }}>📧</span>
          <span style={{ color: C.dim, fontSize: 10, fontWeight: 600, width: 50 }}>Compte</span>
          <span style={{ color: C.text, fontSize: 11, fontWeight: 600, flex: 1 }}>{stats.userEmail}</span>
          <span style={{ color: C.dim, fontSize: 10 }}>›</span>
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
  const handleOnboarding = useCallback((p) => { setProfile(p); setSessions(buildSessions(p.riskZones)); setDailyProgram(buildDailyProgram(p.riskZones)); setCompletedBlocks([]); setScreen("home"); }, []);
  const handleSessionComplete = useCallback((xp, blockId) => {
    setStats(prev => ({ ...prev, xp: prev.xp + xp, totalSessions: prev.totalSessions + 1, streak: prev.streak + ((prev.totalSessions + 1) % 3 === 0 ? 1 : 0), score: Math.min(99, prev.score + Math.floor(Math.random() * 3) + 1) }));
    if (blockId && !blockId.startsWith("s")) setCompletedBlocks(prev => prev.includes(blockId) ? prev : [...prev, blockId]);
  }, []);
  const handleUpgrade = useCallback(() => { setIsPremium(true); setPaymentSheet(null); setScreen("home"); }, []);
  const handleUnsubscribe = useCallback(() => { setIsPremium(false); setScreen("home"); }, []);
  const handleUpdateProfile = useCallback((newProfile) => { setProfile(newProfile); setSessions(buildSessions(newProfile.riskZones)); setDailyProgram(buildDailyProgram(newProfile.riskZones)); setCompletedBlocks([]); }, []);
  const handleUpdateName = useCallback((newName) => { setStats(s => ({ ...s, userName: newName })); }, []);
  const showPayment = useCallback((plan, onDone) => { setPaymentSheet({ plan, onDone }); }, []);
  const handleToggleTheme = useCallback(() => { setTheme(t => t === "dark" ? "light" : "dark"); }, []);
  const handleReset = useCallback(() => { setScreen("signup"); setAccount(null); setProfile(null); setIsPremium(false); setTheme("dark"); setStats({ xp: 0, totalSessions: 0, streak: 1, score: 0, userName: "", userEmail: "" }); setSessions([]); setDailyProgram([]); setCompletedBlocks([]); }, []);

  const navItems = [{ id: "home", icon: "🏠", l: "Accueil" }, { id: "library", icon: "📚", l: "Séances" }, { id: "stats", icon: "📊", l: "Stats" }, { id: "profile", icon: "👤", l: "Profil" }];
  const showNav = navItems.some(n => n.id === screen);

  // Theme-dependent colors
  const phoneBg = theme === "light" ? "#F2F4F7" : C.bg;
  const phoneText = theme === "light" ? "#1a1a2e" : C.text;
  const phoneDim = theme === "light" ? "#6b7b8d" : C.dim;

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: phoneBg, fontFamily: "'Manrope','SF Pro Display',-apple-system,sans-serif", position: "relative", transition: "background 0.3s", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingTop: "max(12px, env(safe-area-inset-top, 12px))", paddingBottom: showNav ? "calc(64px + max(16px, env(safe-area-inset-bottom, 16px)))" : 30, WebkitOverflowScrolling: "touch" }}>{render()}</div>
      {showNav && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `${phoneBg}ee`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: `1px solid ${theme === "light" ? "#d0d5dd" : C.cardL}`, display: "flex", justifyContent: "space-around", alignItems: "center", paddingTop: 8, paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))", zIndex: 50 }}>
          {navItems.map(n => (<div key={n.id} onClick={() => goTo(n.id)} style={{ textAlign: "center", cursor: "pointer", opacity: screen === n.id ? 1 : 0.45, transition: "all 0.2s", padding: "4px 14px" }}><div style={{ fontSize: 22, marginBottom: 2 }}>{n.icon}</div><div style={{ fontSize: 10, fontWeight: 700, color: screen === n.id ? (isPremium ? C.gold : C.accent) : C.dim }}>{n.l}</div></div>))}
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
