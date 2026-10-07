// Grand Line Prix — interface (vanilla JS, sans build).

const $ = (sel) => document.querySelector(sel);
const LANG_FLAGS = { FR: '🇫🇷', EN: '🇬🇧', JP: '🇯🇵' };
const LANG_NAMES = { FR: 'Français', EN: 'Anglais', JP: 'Japonais' };
const TYPE_ORDER = ['display', 'booster', 'duo', 'starter', 'coffret'];
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const state = {
  config: null,
  trust: {}, // shopId -> résultat du score
  series: null,
  data: {}, // seriesId -> réponse /api/prices
  lang: 'all',
  type: 'all',
  stockOnly: true,
  loading: false,
};

const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* stockage indisponible : sans importance */
    }
  },
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function safeUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '#';
  } catch {
    return '#';
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isUpcoming(s) {
  const dates = Object.values(s.release || {});
  return dates.length > 0 && dates.every((d) => d > today());
}

function ago(iso) {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `il y a ${h} h` : `le ${dateFmt.format(new Date(iso))}`;
}

// ---------- Chargement ----------

async function api(path) {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
  return body;
}

async function init() {
  try {
    state.config = await api('/api/config');
  } catch (err) {
    $('#status').innerHTML = `<span class="err">Serveur injoignable : ${esc(err.message)}</span>`;
    return;
  }
  $('#demoBanner').hidden = !state.config.demo;
  state.data = store.get('prices', {});
  const prefs = store.get('prefs', {});
  Object.assign(state, { lang: prefs.lang || 'all', type: prefs.type || 'all', stockOnly: prefs.stockOnly ?? true });

  renderTabs();
  renderTypeFilter();
  syncFilters();

  const fromHash = decodeURIComponent(location.hash.slice(1));
  const first =
    state.config.series.find((s) => s.id === fromHash) ||
    state.config.series.find((s) => !s.special && !isUpcoming(s)) ||
    state.config.series[0];
  selectSeries(first.id);
  loadTrust();
}

async function loadTrust() {
  try {
    const { shops } = await api('/api/trust');
    for (const t of shops) if (t.shopId) state.trust[t.shopId] = t;
    render();
    renderLinks();
  } catch {
    /* les badges restent « vérification… » */
  }
}

function selectSeries(id) {
  state.series = state.config.series.find((s) => s.id === id);
  history.replaceState(null, '', `#${id}`);
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.id === id));
  document.querySelector(`.tab[data-id="${id}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  renderTypeFilter();
  renderHead();
  renderLinks();
  render();
  const cached = state.data[id];
  const stale = !cached || Date.now() - new Date(cached.fetchedAt) > 10 * 60 * 1000;
  if (stale) load(false);
}

async function load(refresh) {
  if (state.loading) return;
  const id = state.series.id;
  state.loading = true;
  const btn = $('#refreshBtn');
  btn.disabled = true;
  btn.classList.add('loading');
  $('#status').textContent = `⚓ Recherche des prix ${state.series.code} dans ${state.config.shops.filter((s) => s.platform !== 'link').length} boutiques…`;
  try {
    const data = await api(`/api/prices?series=${encodeURIComponent(id)}${refresh ? '&refresh=1' : ''}`);
    state.data[id] = data;
    store.set('prices', state.data);
  } catch (err) {
    $('#status').innerHTML = `<span class="err">Échec de la recherche : ${esc(err.message)}</span>`;
  } finally {
    state.loading = false;
    btn.disabled = false;
    btn.classList.remove('loading');
    if (state.series.id === id) render();
  }
}

// ---------- Rendu ----------

function renderTabs() {
  $('#tabs').innerHTML = state.config.series
    .map((s) => {
      const sub = s.special ? 'ST · coffrets' : s.names.fr || s.names.en || '';
      return `<button class="tab" data-id="${esc(s.id)}" type="button">
        <b>${esc(s.special ? 'Starters' : s.id)}${isUpcoming(s) ? '<span class="soon">bientôt</span>' : ''}</b>
        <small>${esc(sub.length > 26 ? sub.slice(0, 25) + '…' : sub)}</small></button>`;
    })
    .join('');
  $('#tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) selectSeries(tab.dataset.id);
  });
}

function renderTypeFilter() {
  const types = state.series?.special ? ['starter', 'coffret'] : ['display', 'booster', 'duo'];
  if (state.type !== 'all' && !types.includes(state.type)) state.type = 'all';
  const pt = state.config.productTypes;
  $('#typeFilter').innerHTML =
    `<button data-v="all" class="${state.type === 'all' ? 'on' : ''}">Tous</button>` +
    types.map((t) => `<button data-v="${t}" class="${state.type === t ? 'on' : ''}">${esc(pt[t].label.replace(' (24 boosters)', ''))}</button>`).join('');
}

function syncFilters() {
  document.querySelectorAll('#langFilter button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.lang));
  $('#stockOnly').checked = state.stockOnly;
}

function renderHead() {
  const s = state.series;
  const names = [s.names.fr, s.names.en, s.names.jp].filter(Boolean);
  const dates = Object.entries(s.release || {})
    .map(([l, d]) => {
      const L = l.toUpperCase();
      return `<span class="date ${d > today() ? 'future' : ''}">${LANG_FLAGS[L] || ''} ${L} · ${d > today() ? 'sortie ' : ''}${dateFmt.format(new Date(d))}</span>`;
    })
    .join('');
  $('#seriesHead').innerHTML = `<div><h2>${esc(s.special ? 'Starter decks & coffrets' : s.code)}</h2>
    <p class="names">${esc(names.join(' · '))}</p></div><div class="dates">${dates}</div>`;
}

function trustBadge(shopId) {
  const t = state.trust[shopId];
  if (!t) return `<button class="trust" data-trust="${esc(shopId)}" type="button" title="Vérification en cours">🛡 …</button>`;
  const txt = t.level === 'unknown' ? esc(t.label) : `${t.score}/100 · ${esc(t.label)}`;
  return `<button class="trust ${t.level}" data-trust="${esc(shopId)}" type="button" title="Score de confiance : cliquer pour le détail">🛡 ${txt}</button>`;
}

function stockTag(o) {
  if (o.preorder) return '<span class="tag pre">Précommande</span>';
  if (o.available === true) return '<span class="tag in">En stock</span>';
  if (o.available === false) return '<span class="tag out">Rupture</span>';
  return '<span class="tag">Stock ?</span>';
}

function filtered(offers) {
  return offers.filter(
    (o) =>
      (state.lang === 'all' || o.lang === state.lang) &&
      (state.type === 'all' || o.type === state.type) &&
      (!state.stockOnly || o.available !== false)
  );
}

function productLabel(o) {
  const pt = state.config.productTypes[o.type].label.replace(' (24 boosters)', '');
  return o.type === 'booster' && o.quantity > 1 ? `Lot de ${o.quantity} boosters` : pt;
}

function renderBest(data) {
  const best = filtered(data.best || [])
    .filter((o) => o.available !== false)
    .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || (a.lang || 'Z').localeCompare(b.lang || 'Z'));
  $('#best').innerHTML = best
    .map(
      (o) => `<a class="wanted" href="${esc(safeUrl(o.url))}" target="_blank" rel="noopener noreferrer">
        <span class="pin"></span>
        <div class="w-title">WANTED</div>
        <div class="w-sub">Meilleur prix</div>
        <div class="w-product">${esc(productLabel(o))} ${o.lang ? LANG_FLAGS[o.lang] : ''}</div>
        <div class="w-price">${esc(eur.format(o.total).replace(/\s?€/, ''))}<small> €</small></div>
        <div class="w-detail">${esc(eur.format(o.price))} + port ~${esc(eur.format(o.shipping))}${o.perBooster ? ` · ${esc(eur.format(o.perBooster))}/booster` : ''}</div>
        <div class="w-shop">chez ${esc(o.shopName)}</div>
      </a>`
    )
    .join('');
}

function offerRow(o, isTop) {
  const suspect = o.flags.some((f) => f.kind === 'suspect');
  const flags = o.flags.map((f) => `<span class="tag ${f.kind}" title="${esc(f.text)}">${f.kind === 'suspect' ? '⚠ Prix suspect' : '▲ Prix élevé'}</span>`).join('');
  return `<article class="offer ${o.available === false ? 'out' : ''} ${suspect ? 'suspect' : ''} ${isTop ? 'top1' : ''}">
    <div class="offer-main">
      <div class="offer-shop">${isTop ? '👑 ' : ''}${esc(o.shopName)} ${trustBadge(o.shopId)}</div>
      <p class="offer-title">${esc(o.title)}</p>
      <div class="tags">
        <span class="tag">${o.lang ? `${LANG_FLAGS[o.lang]} ${LANG_NAMES[o.lang]}` : 'Langue ?'}</span>
        ${stockTag(o)}${flags}
      </div>
      ${o.flags.map((f) => `<p class="muted" style="margin:4px 0 0">${f.kind === 'suspect' ? '⚠️' : 'ℹ️'} ${esc(f.text)}</p>`).join('')}
    </div>
    <div class="offer-price">
      <div>
        <div class="total">${esc(eur.format(o.total))}</div>
        <div class="sub">${esc(eur.format(o.price))} + port ~${esc(eur.format(o.shipping))}</div>
        ${o.perBooster ? `<div class="sub">${esc(eur.format(o.perBooster))} / booster</div>` : ''}
      </div>
      <a href="${esc(safeUrl(o.url))}" target="_blank" rel="noopener noreferrer">Voir l’offre →</a>
    </div>
  </article>`;
}

function render() {
  if (!state.series) return;
  const data = state.data[state.series.id];
  if (!data) {
    $('#best').innerHTML = '';
    $('#offers').innerHTML = state.loading ? '' : '<div class="empty">Cliquez sur « Actualiser » pour lancer la recherche.</div>';
    $('#shopList').innerHTML = '';
    $('#shopSummary').textContent = '';
    return;
  }
  if (!state.loading) {
    const okShops = data.shops.filter((s) => s.status === 'ok').length;
    $('#status').innerHTML = `Mis à jour ${esc(ago(data.fetchedAt))} · ${data.offers.length} offre${data.offers.length > 1 ? 's' : ''} dans ${okShops} boutique${okShops > 1 ? 's' : ''}${data.cached ? ' (résultat récent réutilisé)' : ''}${data.demo ? ' · <b>données fictives (démo)</b>' : ''}`;
  }
  renderBest(data);

  const offers = filtered(data.offers);
  const groups = TYPE_ORDER.map((t) => [t, offers.filter((o) => o.type === t)]).filter(([, list]) => list.length);
  $('#offers').innerHTML = groups.length
    ? groups
        .map(
          ([t, list]) => `<section class="group"><h3>${esc(state.config.productTypes[t].label)} <span class="count">${list.length} offre${list.length > 1 ? 's' : ''}</span></h3>
          ${list.map((o, i) => offerRow(o, i === 0 && o.available !== false && !o.flags.some((f) => f.kind === 'suspect'))).join('')}</section>`
        )
        .join('')
    : `<div class="empty">Aucune offre trouvée avec ces filtres.${state.stockOnly ? ' Essayez de décocher « En stock / précommande ».' : ''}<br>Pensez aussi aux liens « Vérifier aussi sur » ci-dessous.</div>`;

  const st = { ok: '✔ offres trouvées', empty: '○ rien pour cette série', error: '✖ injoignable' };
  $('#shopList').innerHTML = data.shops
    .map(
      (s) => `<div class="shop-row"><div><b>${esc(s.name)}</b><br>${trustBadge(s.id)}</div>
      <div class="st ${s.status}" title="${esc(s.error || '')}">${st[s.status]}${s.matched ? ` (${s.matched})` : ''}${s.error ? `<br><small>${esc(s.error)}</small>` : ''}</div></div>`
    )
    .join('');
  const ok = data.shops.filter((s) => s.status === 'ok').length;
  const err = data.shops.filter((s) => s.status === 'error').length;
  $('#shopSummary').textContent = `— ${ok} avec offres, ${err} injoignable${err > 1 ? 's' : ''}, ${data.shops.length - ok - err} sans résultat`;
}

function renderLinks() {
  if (!state.series) return;
  const q = state.series.special ? 'One Piece starter deck' : `One Piece ${state.series.id}`;
  $('#links').innerHTML = state.config.shops
    .filter((s) => s.platform === 'link' && s.searchUrl)
    .map((s) => `<a class="chip" href="${esc(safeUrl(s.searchUrl.replace('{q}', encodeURIComponent(q))))}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a> ${trustBadge(s.id)}`)
    .join('');
}

// ---------- Fenêtres ----------

function scoreHtml(t, shop) {
  const color = { high: 'var(--ok)', good: 'var(--sea)', medium: 'var(--warn)', low: 'var(--bad)', danger: 'var(--bad)', unknown: 'var(--muted)' }[t.level];
  const checks = t.checks
    .map((c) => {
      const icon = c.ok === true ? '✅' : c.ok === false ? '❌' : '❔';
      const pts = c.points ? `<span class="pts ${c.points < 0 ? 'neg' : 'pos'}">${c.points > 0 ? '+' : ''}${c.points}</span>` : '<span class="pts"></span>';
      return `<li><span>${icon}</span><span>${esc(c.label)}${c.detail ? `<small>${esc(c.detail)}</small>` : ''}${c.source ? `<small><a href="${esc(safeUrl(c.source))}" target="_blank" rel="noopener noreferrer">source</a></small>` : ''}</span>${pts}</li>`;
    })
    .join('');
  return `<div class="score"><div class="ring" style="--p:${t.score};--c:${color}">${t.score}</div>
      <div><b style="color:${color}">${esc(t.label)}</b><br><span class="muted">${esc(t.domain)}${t.checkedAt ? ` · vérifié ${esc(ago(t.checkedAt))}` : ''}</span></div></div>
    <ul class="checks">${checks}</ul>
    ${t.unverified ? '<p class="muted">⚠️ Les vérifications en direct (domaine, avis, site) n’ont pas abouti : le score ne reflète que la liste blanche. Nouvel essai automatique dans quelques minutes.</p>' : ''}
    ${shop?.notes ? `<p class="muted">📝 ${esc(shop.notes)}</p>` : ''}
    ${t.trustpilotUrl ? `<p class="muted"><a href="${esc(safeUrl(t.trustpilotUrl))}" target="_blank" rel="noopener noreferrer">Voir les avis Trustpilot ↗</a></p>` : ''}
    ${(shop?.refs || []).length ? `<p class="muted">Références : ${shop.refs.map((r) => `<a href="${esc(safeUrl(r))}" target="_blank" rel="noopener noreferrer">${esc(new URL(r).hostname)}</a>`).join(', ')}</p>` : ''}`;
}

function openDialog(html) {
  $('#dlgBody').innerHTML = html;
  $('#dlg').showModal();
}

function showTrust(shopId) {
  const shop = state.config.shops.find((s) => s.id === shopId);
  const t = state.trust[shopId];
  openDialog(`<h2>${esc(shop?.name || shopId)}</h2>${t ? scoreHtml(t, shop) : '<p>Vérification en cours, réessayez dans quelques secondes…</p>'}`);
}

function showChecker() {
  openDialog(`<h2>Vérifier un site</h2>
    <p class="muted">Collez l’adresse d’une boutique inconnue : ancienneté du domaine, avis Trustpilot, HTTPS, mentions légales, liste noire.</p>
    <form class="check-form" id="checkForm"><input id="checkInput" placeholder="ex. boutique-exemple.fr" autocomplete="off" inputmode="url" required />
    <button class="btn btn-red" type="submit">Vérifier</button></form>
    <div id="checkResult"></div>`);
  $('#checkInput').focus();
  $('#checkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = $('#checkResult');
    out.innerHTML = '<p class="muted">⚓ Analyse en cours…</p>';
    try {
      const t = await api(`/api/check?domain=${encodeURIComponent($('#checkInput').value)}`);
      const shop = state.config.shops.find((s) => s.id === t.shopId);
      out.innerHTML = scoreHtml(t, shop) + (t.level === 'low' || t.level === 'danger' ? '<p><b style="color:var(--bad)">⛔ À éviter : trop de signaux négatifs.</b></p>' : '');
    } catch (err) {
      out.innerHTML = `<p class="err" style="color:var(--bad)">${esc(err.message)}</p>`;
    }
  });
}

// ---------- Événements ----------

$('#refreshBtn').addEventListener('click', () => load(true));
$('#checkBtn').addEventListener('click', showChecker);
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-trust]');
  if (b) {
    e.preventDefault();
    showTrust(b.dataset.trust);
  }
});
$('#langFilter').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.lang = b.dataset.v;
  savePrefs();
  syncFilters();
  render();
});
$('#typeFilter').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.type = b.dataset.v;
  savePrefs();
  renderTypeFilter();
  render();
});
$('#stockOnly').addEventListener('change', (e) => {
  state.stockOnly = e.target.checked;
  savePrefs();
  render();
});
$('#dlg').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.close();
});

function savePrefs() {
  store.set('prefs', { lang: state.lang, type: state.type, stockOnly: state.stockOnly });
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
init();
