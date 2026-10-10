// Suivi des prix : graphique d'historique (SVG) et abonnement aux notifications push.

const NS = 'http://www.w3.org/2000/svg';
const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const fullFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const priceFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const priceFmt0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const toDate = (t) => new Date(`${t}Z`);

// Graduations « rondes » de l'axe des prix (3 à 5 lignes).
export function niceTicks(min, max, count = 4) {
  if (!(max > min)) {
    const pad = Math.max(1, Math.abs(min) * 0.05);
    return niceTicks(min - pad, max + pad, count);
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

export function summarize(points) {
  if (!points.length) return null;
  const last = points[points.length - 1];
  let low = points[0];
  let high = points[0];
  for (const p of points) {
    if (p.tot < low.tot) low = p;
    if (p.tot > high.tot) high = p;
  }
  return { last, low, high, first: points[0], change: last.tot - points[0].tot };
}

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

// Courbe du meilleur prix (port compris) dans le temps, avec réticule et infobulle au survol.
export function drawHistoryChart(host, points, { shopName = (id) => id } = {}) {
  host.innerHTML = '';
  const width = Math.max(260, Math.round(host.clientWidth || 520));
  const height = width < 420 ? 200 : 230;
  const m = { top: 12, right: 14, bottom: 26, left: 52 };
  const w = width - m.left - m.right;
  const h = height - m.top - m.bottom;

  const times = points.map((p) => toDate(p.t).getTime());
  const vals = points.map((p) => p.tot);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const t0 = times[0];
  const t1 = Math.max(times[times.length - 1], t0 + 3600e3);
  const x = (t) => m.left + ((t - t0) / (t1 - t0)) * w;
  const y = (v) => m.top + h - ((v - y0) / (y1 - y0)) * h;

  const svg = el('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'hist-svg', role: 'img', 'aria-label': 'Évolution du meilleur prix, port compris' }, host);

  // Grille horizontale discrète + étiquettes de prix.
  for (const v of ticks) {
    el('line', { x1: m.left, x2: width - m.right, y1: y(v), y2: y(v), class: 'hist-grid' }, svg);
    el('text', { x: m.left - 8, y: y(v) + 4, class: 'hist-axis', 'text-anchor': 'end' }, svg).textContent = priceFmt0.format(v);
  }
  // Dates (3 à 5 repères).
  const n = width < 420 ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const t = t0 + ((t1 - t0) * i) / (n - 1);
    el('text', { x: x(t), y: height - 6, class: 'hist-axis', 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle' }, svg).textContent = dayFmt.format(new Date(t));
  }

  // Le prix reste constant jusqu'au relevé suivant : tracé en escalier.
  let d = '';
  points.forEach((p, i) => {
    const px = x(times[i]);
    const py = y(p.tot);
    d += i === 0 ? `M${px},${py}` : `H${px}V${py}`;
  });
  const lastX = x(times[times.length - 1]);
  el('path', { d: `${d}V${m.top + h}H${x(times[0])}Z`, class: 'hist-area' }, svg);
  el('path', { d, class: 'hist-line' }, svg);

  // Point du plus bas prix et point actuel.
  const s = summarize(points);
  const lowIdx = points.indexOf(s.low);
  el('circle', { cx: x(times[lowIdx]), cy: y(s.low.tot), r: 4, class: 'hist-dot low' }, svg);
  el('circle', { cx: lastX, cy: y(s.last.tot), r: 4, class: 'hist-dot' }, svg);

  // Réticule + infobulle.
  const cross = el('line', { y1: m.top, y2: m.top + h, class: 'hist-cross', visibility: 'hidden' }, svg);
  const dot = el('circle', { r: 5, class: 'hist-dot hover', visibility: 'hidden' }, svg);
  const tip = document.createElement('div');
  tip.className = 'hist-tip';
  tip.hidden = true;
  host.appendChild(tip);
  const hit = el('rect', { x: m.left, y: m.top, width: w, height: h, fill: 'transparent' }, svg);

  function show(clientX) {
    const box = svg.getBoundingClientRect();
    const t = t0 + ((clientX - box.left - m.left) / w) * (t1 - t0);
    // Dernier relevé avant la position (le prix valable à cet instant).
    let i = times.findIndex((tt) => tt > t) - 1;
    if (i < 0) i = times[0] > t ? 0 : times.length - 1;
    const p = points[i];
    const px = Math.min(Math.max(x(Math.min(Math.max(t, t0), t1)), m.left), m.left + w);
    cross.setAttribute('x1', px);
    cross.setAttribute('x2', px);
    cross.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', px);
    dot.setAttribute('cy', y(p.tot));
    dot.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${priceFmt.format(p.tot)}</b><span>${priceFmt.format(p.p)} + port</span><span>${escapeHtml(shopName(p.s))}</span><small>${fullFmt.format(toDate(p.t))}</small>`;
    tip.hidden = false;
    const left = Math.min(Math.max(px - tip.offsetWidth / 2, 0), width - tip.offsetWidth);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(0, y(p.tot) - tip.offsetHeight - 12)}px`;
  }
  function hide() {
    cross.setAttribute('visibility', 'hidden');
    dot.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  }
  hit.addEventListener('pointermove', (e) => show(e.clientX));
  hit.addEventListener('pointerdown', (e) => show(e.clientX));
  hit.addEventListener('pointerleave', hide);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ---------- Notifications push ----------

function keyBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return {
      ok: false,
      reason: ios
        ? 'Sur iPhone/iPad, ajoutez d’abord Berry Radar à l’écran d’accueil (Partager → « Sur l’écran d’accueil »), puis ouvrez l’app depuis l’icône pour activer les notifications.'
        : 'Ce navigateur ne gère pas les notifications push.',
    };
  }
  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'Les notifications sont bloquées pour ce site : autorisez-les dans les réglages du navigateur, puis réessayez.' };
  }
  return { ok: true };
}

export async function currentSubscription() {
  if (!pushSupport().ok) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

function deviceName() {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Appareil';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return `${os}${nav ? ` · ${nav}` : ''}`;
}

// Demande l'autorisation puis abonne cet appareil. Renvoie l'abonnement à enregistrer dans le compte.
export async function subscribePush(publicKey) {
  const support = pushSupport();
  if (!support.ok) throw new Error(support.reason);
  if (!publicKey) throw new Error('Les notifications ne sont pas configurées sur ce serveur.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Autorisation refusée : les notifications restent désactivées sur cet appareil.');
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('sw.js'));
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  const json = sub.toJSON();
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, device: deviceName(), at: new Date().toISOString() };
}
