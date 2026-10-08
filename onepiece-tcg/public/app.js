// Grand Line Prix — interface (vanilla JS, sans build).
import { createAccount, mergePrefs } from './account.js';

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
  stock: 'buyable', // buyable = en stock + précommandes | preorder | all
  loading: false,
  customShops: [], // boutiques ajoutées par l'utilisateur (conservées dans ce navigateur)
  cards: {}, // seriesId -> réponse /api/cards
  owned: {}, // idProduct -> { name, code, at } : cartes cochées « je l'ai »
  account: null, // module de connexion (Firebase ou démo)
  user: null, // { uid, name, email, photo } une fois connecté
  favSeries: [], // séries préférées (compte)
  favShops: [], // boutiques préférées (compte)
  favOnly: false, // filtre « boutiques préférées seulement »
  firstAuth: true,
};

const PLATFORM_NAMES = { shopify: 'Shopify', woocommerce: 'WooCommerce', prestashop: 'PrestaShop', link: 'lien seulement' };

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
  state.customShops = store.get('customShops', []);
  state.owned = store.get('owned', {});
  state.cards = store.get('cards', {});
  for (const c of state.customShops) if (c.trust) state.trust[c.id] = c.trust;
  renderMyShops();
  const prefs = store.get('prefs', {});
  Object.assign(state, { lang: prefs.lang || 'all', type: prefs.type || 'all', stock: ['buyable', 'preorder', 'all'].includes(prefs.stock) ? prefs.stock : 'buyable' });

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
  setupAccount(!fromHash);
}

async function loadTrust() {
  try {
    const domains = state.customShops.map((c) => c.domain).join(',');
    const { shops } = await api(`/api/trust${domains ? `?custom=${encodeURIComponent(domains)}` : ''}`);
    for (const t of shops) if (t.shopId) state.trust[t.shopId] = t;
    render();
    renderLinks();
    renderMyShops();
  } catch {
    /* les badges restent « vérification… » */
  }
}

function selectSeries(id) {
  state.series = state.config.series.find((s) => s.id === id);
  try {
    history.replaceState(null, '', `#${id}`);
  } catch {
    /* navigation intégrée : sans importance */
  }
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.id === id));
  document.querySelector(`.tab[data-id="${id}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  renderTypeFilter();
  renderHead();
  renderLinks();
  render();
  const cached = state.data[id];
  const stale = !cached || Date.now() - new Date(cached.fetchedAt) > 10 * 60 * 1000;
  if (stale) load(false);
  loadCards();
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
    const custom = customParam();
    const data = await api(
      `/api/prices?series=${encodeURIComponent(id)}${refresh ? '&refresh=1' : ''}${custom ? `&custom=${encodeURIComponent(custom)}` : ''}`
    );
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
  // Séries préférées en premier, marquées d'une étoile.
  const fav = (s) => state.favSeries.includes(s.id);
  const list = [...state.config.series].sort((a, b) => fav(b) - fav(a));
  $('#tabs').innerHTML = list
    .map((s) => {
      const sub = s.special ? 'ST · coffrets' : s.names.fr || s.names.en || '';
      return `<button class="tab ${state.series?.id === s.id ? 'on' : ''} ${fav(s) ? 'fav' : ''}" data-id="${esc(s.id)}" type="button">
        <b>${fav(s) ? '<span class="tab-star" aria-label="Série préférée">★</span>' : ''}${esc(s.special ? 'Starters' : s.id)}${isUpcoming(s) ? '<span class="soon">bientôt</span>' : ''}</b>
        <small>${esc(sub.length > 26 ? sub.slice(0, 25) + '…' : sub)}</small></button>`;
    })
    .join('');  $('#tabs .tab.on')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
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
  document.querySelectorAll('#stockFilter button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.stock));
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
  const future = Object.entries(s.release || {}).filter(([, d]) => d > today());
  const banner = future.length
    ? `<div class="preo-banner">🗓️ ${
        isUpcoming(s) ? 'Série pas encore sortie' : `Pas encore sortie en ${future.map(([l]) => l.toUpperCase()).join(', ')}`
      } : les offres commandables sont des <b>précommandes</b>. Préférez les boutiques bien notées, payez par CB/PayPal et méfiez-vous des précommandes sans date ni délai.</div>`
    : '';
  const isFav = state.favSeries.includes(s.id);
  const favBtn = `<button class="fav-btn ${isFav ? 'on' : ''}" type="button" data-fav-series="${esc(s.id)}" aria-pressed="${isFav}">
    ${isFav ? '★ Série suivie' : '☆ Ajouter à mes séries'}</button>`;
  $('#seriesHead').innerHTML = `<div><div class="title-row"><h2>${esc(s.special ? 'Starter decks & coffrets' : s.code)}</h2>${favBtn}</div>
    <p class="names">${esc(names.join(' · '))}</p></div><div class="dates">${dates}</div>${banner}`;
}

function trustBadge(shopId) {
  const t = state.trust[shopId];
  if (!t) return `<button class="trust" data-trust="${esc(shopId)}" type="button" title="Vérification en cours">🛡 …</button>`;
  const txt = t.level === 'unknown' ? esc(t.label) : `${t.score}/100 · ${esc(t.label)}`;
  return `<button class="trust ${t.level}" data-trust="${esc(shopId)}" type="button" title="Score de confiance : cliquer pour le détail">🛡 ${txt}</button>`;
}

function shortDate(d) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(d));
}

function stockTag(o) {
  const when = o.releaseDate ? ` · sortie ${shortDate(o.releaseDate)}` : '';
  if (o.preorder && o.available === false) return `<span class="tag out">Précommandes complètes${when}</span>`;
  if (o.preorder) return `<span class="tag pre">🗓️ Précommande${when}</span>`;
  if (o.available === true) return '<span class="tag in">En stock</span>';
  if (o.available === false && o.upcoming) return `<span class="tag out">Pas encore en vente${when}</span>`;
  if (o.available === false) return '<span class="tag out">Rupture</span>';
  return '<span class="tag">Stock ?</span>';
}

function filtered(offers) {
  return offers.filter(
    (o) =>
      (state.lang === 'all' || o.lang === state.lang) &&
      (state.type === 'all' || o.type === state.type) &&
      (state.stock === 'all' ||
        (state.stock === 'buyable' && o.available !== false) ||
        (state.stock === 'preorder' && o.preorder && o.available !== false)) &&
      (!state.favOnly || state.favShops.includes(o.shopId))
  );
}

// Étoile « boutique préférée » (un clic hors connexion propose de se connecter).
function favStar(shopId) {
  const on = state.favShops.includes(shopId);
  return `<button class="star ${on ? 'on' : ''}" type="button" data-fav-shop="${esc(shopId)}" aria-pressed="${on}"
    title="${on ? 'Retirer de mes boutiques préférées' : 'Ajouter à mes boutiques préférées'}">${on ? '★' : '☆'}</button>`;
}

// Meilleure offre disponible (hors prix suspects) par type × langue, parmi les offres filtrées.
function bestOf(offers) {
  const best = {};
  const cost = (o) => (o.type === 'booster' ? (o.price + o.shipping) / o.quantity : o.total);
  for (const o of offers) {
    if (o.available === false || o.flags.some((f) => f.kind === 'suspect')) continue;
    const k = `${o.type}|${o.lang || '?'}`;
    if (!best[k] || cost(o) < cost(best[k])) best[k] = o;
  }
  return Object.values(best);
}

function productLabel(o) {
  const pt = state.config.productTypes[o.type].label.replace(' (24 boosters)', '');
  return o.type === 'booster' && o.quantity > 1 ? `Lot de ${o.quantity} boosters` : pt;
}

function renderBest(data) {
  const best = bestOf(filtered(data.offers))
    .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || (a.lang || 'Z').localeCompare(b.lang || 'Z'));
  $('#best').innerHTML = best
    .map(
      (o) => `<a class="wanted" href="${esc(safeUrl(o.url))}" target="_blank" rel="noopener noreferrer">
        <span class="pin"></span>
        <div class="w-title">WANTED</div>
        <div class="w-sub">${o.preorder ? 'Meilleure préco' : 'Meilleur prix'}</div>
        <div class="w-product">${esc(productLabel(o))} ${o.lang ? LANG_FLAGS[o.lang] : ''}</div>
        <div class="w-price">${esc(eur.format(o.total).replace(/\s?€/, ''))}<small> €</small></div>
        <div class="w-detail">${esc(eur.format(o.price))} + port ~${esc(eur.format(o.shipping))}${o.perBooster ? ` · ${esc(eur.format(o.perBooster))}/booster` : ''}</div>
        <div class="w-shop">chez ${esc(o.shopName)}</div>
        ${o.preorder ? `<div class="w-detail">Précommande${o.releaseDate ? ` · sortie ${esc(shortDate(o.releaseDate))}` : ''}</div>` : ''}
      </a>`
    )
    .join('');
}

function offerRow(o, isTop) {
  const suspect = o.flags.some((f) => f.kind === 'suspect');
  const flags = o.flags.map((f) => `<span class="tag ${f.kind}" title="${esc(f.text)}">${f.kind === 'suspect' ? '⚠ Prix suspect' : '▲ Prix élevé'}</span>`).join('');
  return `<article class="offer ${o.available === false ? 'out' : ''} ${suspect ? 'suspect' : ''} ${isTop ? 'top1' : ''}">
    <div class="offer-main">
      <div class="offer-shop">${favStar(o.shopId)}${isTop ? '👑 ' : ''}${esc(o.shopName)} ${o.custom ? '<span class="tag mine">⭐ Ma boutique</span>' : ''} ${trustBadge(o.shopId)}</div>
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
    $('#status').innerHTML = `Mis à jour ${esc(ago(data.fetchedAt))} · ${data.offers.length} offre${data.offers.length > 1 ? 's' : ''}${(() => {
      const n = data.offers.filter((o) => o.preorder && o.available !== false).length;
      return n ? ` dont ${n} précommande${n > 1 ? 's' : ''}` : '';
    })()} dans ${okShops} boutique${okShops > 1 ? 's' : ''}${data.cached ? ' (résultat récent réutilisé)' : ''}${data.demo ? ' · <b>données fictives (démo)</b>' : ''}`;
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
    : `<div class="empty">Aucune offre trouvée avec ces filtres.${state.stock !== 'all' ? ' Essayez le filtre « Tout » (inclut les ruptures).' : ''}<br>Pensez aussi aux liens « Vérifier aussi sur » ci-dessous.</div>`;

  const st = { ok: '✔ offres trouvées', empty: '○ rien pour cette série', error: '✖ injoignable' };
  $('#shopList').innerHTML = data.shops
    .map(
      (s) => `<div class="shop-row"><div>${favStar(s.id)}<b>${esc(s.name)}</b><br>${trustBadge(s.id)}</div>
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
  $('#links').innerHTML =
    state.config.shops
      .filter((s) => s.platform === 'link' && s.searchUrl)
      .map((s) => `<a class="chip" href="${esc(safeUrl(s.searchUrl.replace('{q}', encodeURIComponent(q))))}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a> ${trustBadge(s.id)}`)
      .join('') +
    state.customShops
      .filter((c) => c.platform === 'link')
      .map((c) => `<a class="chip" href="${esc(safeUrl(c.base))}" target="_blank" rel="noopener noreferrer">⭐ ${esc(c.name)} ↗</a> ${trustBadge(c.id)}`)
      .join('');
}

// ---------- Mes boutiques ----------

function customParam() {
  return state.customShops
    .filter((c) => c.platform !== 'link')
    .map((c) => [c.domain, c.platform, c.name].map(encodeURIComponent).join('|'))
    .join(',');
}

function saveCustomShops() {
  store.set('customShops', state.customShops);
  syncAccount();
  // Les résultats en cache ne contiennent pas la nouvelle liste : on relance la recherche.
  state.data = {};
  store.set('prices', {});
  renderMyShops();
  renderLinks();
  load(false);
}

function renderMyShops() {
  const list = $('#myShops');
  if (!list) return;
  list.innerHTML = state.customShops.length
    ? state.customShops
        .map(
          (c) => `<div class="shop-row"><div>${favStar(c.id)}<b>${esc(c.name)}</b> <span class="muted">${esc(c.domain)}</span><br>
          <span class="tag">${esc(PLATFORM_NAMES[c.platform] || c.platform)}</span> ${trustBadge(c.id)}</div>
          <button class="icon-btn" type="button" data-remove-shop="${esc(c.id)}" title="Retirer" aria-label="Retirer ${esc(c.name)}">🗑</button></div>`
        )
        .join('')
    : '<p class="muted">Aucune boutique ajoutée. Ajoutez une boutique que vous connaissez : elle sera vérifiée puis interrogée à chaque actualisation.</p>';
}

function showAddShop() {
  openDialog(`<h2>Ajouter une boutique</h2>
    <p class="muted">Collez l’adresse du site. L’app vérifie sa fiabilité et détecte si ses prix peuvent être lus automatiquement (Shopify, WooCommerce, PrestaShop).</p>
    <form class="check-form" id="addForm"><input id="addInput" placeholder="ex. www.ma-boutique-tcg.fr" autocomplete="off" inputmode="url" required />
    <button class="btn btn-red" type="submit">Analyser</button></form>
    <div id="addResult"></div>`);
  $('#addInput').focus();
  $('#addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = $('#addResult');
    out.innerHTML = '<p class="muted">⚓ Analyse de la boutique (plateforme, fiabilité)…</p>';
    let info;
    try {
      info = await api(`/api/shop/inspect?url=${encodeURIComponent($('#addInput').value)}`);
    } catch (err) {
      out.innerHTML = `<p style="color:var(--bad)"><b>${esc(err.message)}</b></p>`;
      return;
    }
    if (state.customShops.some((c) => c.id === info.id)) {
      out.innerHTML = '<p class="muted">Cette boutique est déjà dans « Mes boutiques ».</p>';
      return;
    }
    const risky = info.trust.level === 'low' || info.trust.level === 'danger';
    const platformTxt = info.platform
      ? `✅ Plateforme <b>${esc(PLATFORM_NAMES[info.platform])}</b> détectée : les prix seront lus automatiquement.`
      : '⚠️ Plateforme non reconnue : les prix ne peuvent pas être lus automatiquement. La boutique sera ajoutée comme lien dans « Vérifier aussi sur ».';
    out.innerHTML = `${scoreHtml(info.trust)}
      <p>${platformTxt}</p>
      ${
        info.blocked
          ? `<p style="color:var(--bad)"><b>⛔ ${esc(info.blocked)}. Ajout refusé.</b></p>`
          : `<label class="field">Nom affiché <input id="addName" value="${esc(info.name)}" maxlength="40" /></label>
             ${risky ? '<p style="color:var(--bad)"><b>⚠️ Score de confiance faible : risque d’arnaque. Ajoutez-la seulement si vous la connaissez.</b></p>' : ''}
             <button class="btn ${risky ? 'btn-ghost-dark' : 'btn-red'}" id="addConfirm" type="button">${risky ? 'Ajouter quand même' : '➕ Ajouter à mes boutiques'}</button>`
      }`;
    $('#addConfirm')?.addEventListener('click', () => {
      state.trust[info.id] = info.trust;
      state.customShops.push({
        id: info.id,
        domain: info.domain,
        base: info.base,
        name: ($('#addName').value || info.name).trim().slice(0, 40),
        platform: info.platform || 'link',
        trust: info.trust,
        addedAt: new Date().toISOString(),
      });
      $('#dlg').close();
      saveCustomShops();
    });
  });
}

// ---------- Top cartes (Cardmarket) ----------

async function loadCards() {
  const s = state.series;
  if (!s || s.special) return renderCards();
  const cached = state.cards[s.id];
  renderCards();
  if (cached && cached.fetchedAt && Date.now() - new Date(cached.fetchedAt) < 6 * 60 * 60 * 1000) return;
  try {
    const data = await api(`/api/cards?series=${encodeURIComponent(s.id)}`);
    state.cards[s.id] = { ...data, fetchedAt: new Date().toISOString() };
    if (data.available) store.set('cards', state.cards);
  } catch (err) {
    state.cards[s.id] = { available: false, error: err.message, cards: [] };
  }
  if (state.series.id === s.id) renderCards();
}

function renderCards() {
  const box = $('#cards');
  const s = state.series;
  if (!s || s.special) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const data = state.cards[s.id];
  const head = `<div class="cards-head"><h2>🏆 Top 5 des cartes ${esc(s.id)}</h2>
    <span class="muted">Prix moyen de vente sur 7 jours · Cardmarket${data?.updatedAt ? ` · données du ${esc(dateFmt.format(new Date(data.updatedAt)))}` : ''}</span></div>`;
  if (!data) {
    box.innerHTML = `${head}<p class="muted">⚓ Chargement des prix Cardmarket…</p>`;
    return;
  }
  if (!data.available || !data.cards.length) {
    const msg = isUpcoming(s)
      ? 'Série pas encore sortie : les prix des cartes apparaîtront après la sortie.'
      : data.available
        ? 'Aucune carte trouvée pour cette série dans les données Cardmarket.'
        : `Prix Cardmarket indisponibles pour le moment (${esc(data.error || 'erreur')}).`;
    box.innerHTML = `${head}<p class="muted">${msg}</p>`;
    return;
  }
  const owned = data.cards.filter((c) => state.owned[c.idProduct]);
  const value = owned.reduce((sum, c) => sum + c.price, 0);
  box.innerHTML = `${head}
    <div class="card-grid">${data.cards
      .map((c, i) => {
        const have = !!state.owned[c.idProduct];
        const [first, ...rest] = c.images || [];
        return `<figure class="tcg ${have ? 'have' : ''}">
          <span class="rank">#${i + 1}</span>
          <a href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener noreferrer" class="tcg-img">
            ${
              first
                ? `<img src="${esc(first)}" data-fallbacks="${esc(rest.join(' '))}" alt="${esc(c.name)} ${esc(c.code || '')}" loading="lazy" referrerpolicy="no-referrer" />`
                : ''
            }
            <span class="tcg-ph" ${first ? 'hidden' : ''}>${esc(c.code || '?')}</span>
          </a>
          <figcaption>
            <b>${esc(c.name)}</b>
            <span class="muted">${esc(c.code || '')}${c.variant > 1 ? ` · version ${c.variant} (alt.)` : ''}</span>
            <span class="tcg-price">${c.avg7 != null ? esc(eur.format(c.avg7)) : '—'}<small> moy. 7 j</small></span>
            ${c.trend != null ? `<span class="muted">Tendance ${esc(eur.format(c.trend))}</span>` : ''}
            <label class="have-box"><input type="checkbox" data-own="${esc(c.idProduct)}" ${have ? 'checked' : ''} /> Je l’ai</label>
          </figcaption>
        </figure>`;
      })
      .join('')}</div>
    <p class="muted">${owned.length ? `✅ Vous en possédez ${owned.length}/${data.cards.length} · valeur estimée ≈ <b>${esc(eur.format(value))}</b>` : state.user ? 'Cochez « Je l’ai » pour suivre votre collection (synchronisé avec votre compte).' : 'Cochez « Je l’ai » pour suivre votre collection (enregistré sur cet appareil ; connectez-vous pour le retrouver partout).'} · Prix Cardmarket toutes langues confondues.</p>`;
}

// Image officielle introuvable : on essaie les adresses suivantes, puis on affiche le code de la carte.
document.addEventListener(
  'error',
  (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fallbacks === undefined) return;
    const list = img.dataset.fallbacks.split(' ').filter(Boolean);
    if (list.length) {
      img.dataset.fallbacks = list.slice(1).join(' ');
      img.src = list[0];
    } else {
      img.hidden = true;
      img.nextElementSibling.hidden = false;
    }
  },
  true
);

// ---------- Compte ----------

async function setupAccount(pickFavorite) {
  state.account = await createAccount(state.config.auth);
  renderAccountBtn();
  if (!state.account.available) return;
  state.account.onChange(async (user) => {
    state.user = user;
    if (user) {
      try {
        const remote = await state.account.load(user.uid);
        const before = state.customShops.map((c) => c.id).join();
        const merged = mergePrefs(remote, { customShops: state.customShops, owned: state.owned });
        state.favSeries = merged.favoriteSeries;
        state.favShops = merged.favoriteShops;
        state.customShops = merged.customShops;
        state.owned = merged.owned;
        for (const c of state.customShops) if (c.trust) state.trust[c.id] = c.trust;
        store.set('owned', state.owned);
        if (state.customShops.map((c) => c.id).join() !== before) saveCustomShops();
        if (JSON.stringify(remote) !== JSON.stringify(accountPrefs())) syncAccount(0);
        if (state.firstAuth && pickFavorite && state.favSeries.length && !state.favSeries.includes(state.series.id)) {
          selectSeries(state.favSeries[0]);
        }
      } catch (err) {
        toast(`Impossible de charger votre compte : ${err.message}`);
      }
    } else {
      state.favSeries = [];
      state.favShops = [];
      state.favOnly = false;
    }
    state.firstAuth = false;
    if (user && $('#googleSignIn')) {
      $('#dlg').close();
      toast(`Connecté : ${user.name || user.email}`);
    }
    renderAccountBtn();
    renderTabs();
    renderHead();
    syncFavToggle();
    render();
    renderMyShops();
    renderCards();
  });
}

function accountPrefs() {
  return { favoriteSeries: state.favSeries, favoriteShops: state.favShops, customShops: state.customShops, owned: state.owned };
}

let saveTimer = null;
function syncAccount(delay = 600) {
  if (!state.user || !state.account?.available) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    state.account.save(state.user.uid, accountPrefs()).catch((err) => toast(`Enregistrement impossible : ${err.message}`));
  }, delay);
}

function renderAccountBtn() {
  const btn = $('#accountBtn');
  const u = state.user;
  if (u) {
    const initial = esc((u.name || u.email || '?').trim()[0].toUpperCase());
    btn.innerHTML = `${u.photo ? `<img class="avatar" src="${esc(safeUrl(u.photo))}" alt="" referrerpolicy="no-referrer" />` : `<span class="avatar">${initial}</span>`}<span>Mon compte</span>`;
    btn.title = `Connecté : ${u.email || u.name}`;
  } else {
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z"/></svg><span>Se connecter</span>`;
    btn.title = 'Se connecter avec Google';
  }
}

function syncFavToggle() {
  const t = $('#favShopsToggle');
  t.hidden = !state.user || !state.favShops.length;
  if (t.hidden) state.favOnly = false;
  t.classList.toggle('on', state.favOnly);
  t.setAttribute('aria-pressed', String(state.favOnly));
  t.textContent = `★ Mes boutiques préférées (${state.favShops.length})`;
}

const GOOGLE_G = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

function showAccount(reason) {
  const acc = state.account;
  if (!acc) return openDialog('<h2>Mon compte</h2><p class="muted">Chargement…</p>');
  if (!acc.available) {
    return openDialog(`<h2>Mon compte</h2><p>${esc(acc.reason)}</p>`);
  }
  const u = state.user;
  if (!u) {
    return openDialog(`<h2>Créer mon compte</h2>
      ${reason ? `<p class="notice">${esc(reason)}</p>` : ''}
      <p class="muted">Avec un compte, retrouvez sur tous vos appareils :</p>
      <ul class="perks">
        <li>★ <b>vos séries préférées</b>, affichées en premier ;</li>
        <li>★ <b>vos boutiques préférées</b>, avec un filtre pour ne voir qu’elles ;</li>
        <li>vos boutiques ajoutées et les cartes cochées « Je l’ai ».</li>
      </ul>
      <button class="btn-google" id="googleSignIn" type="button">${GOOGLE_G}<span>Continuer avec Google</span></button>
      <p class="muted small">Le compte est créé à la première connexion. Seuls votre nom, votre e-mail et vos préférences sont enregistrés. Vous pouvez tout supprimer à tout moment.</p>
      ${acc.demo ? '<p class="notice">Version démo : la connexion est simulée, aucun compte Google n’est utilisé.</p>' : ''}
      <p id="signInError" class="err-msg" hidden></p>`);
  }
  const seriesName = (id) => {
    const s = state.config.series.find((x) => x.id === id);
    return s ? (s.special ? 'Starters & coffrets' : `${s.id}${s.names.fr || s.names.en ? ` · ${s.names.fr || s.names.en}` : ''}`) : id;
  };
  const shopName = (id) => state.config.shops.find((x) => x.id === id)?.name || state.customShops.find((x) => x.id === id)?.name || id;
  const chips = (ids, kind, label) =>
    ids.length
      ? `<div class="chips">${ids.map((id) => `<span class="chip">${esc(label(id))}<button type="button" class="chip-x" data-unfav-${kind}="${esc(id)}" aria-label="Retirer">✕</button></span>`).join('')}</div>`
      : `<p class="muted small">Aucune pour l’instant : utilisez l’étoile ☆ ${kind === 'series' ? 'à côté du nom de la série' : 'à côté du nom d’une boutique'}.</p>`;
  openDialog(`<h2>Mon compte</h2>
    <div class="profile">${u.photo ? `<img class="avatar lg" src="${esc(safeUrl(u.photo))}" alt="" referrerpolicy="no-referrer" />` : `<span class="avatar lg">${esc((u.name || '?')[0].toUpperCase())}</span>`}
      <div><b>${esc(u.name || '')}</b><br><span class="muted">${esc(u.email || '')}</span></div></div>
    ${acc.demo ? '<p class="notice">Compte de démonstration (connexion simulée).</p>' : ''}
    <h3 class="sub-h">★ Mes séries préférées</h3>${chips(state.favSeries, 'series', seriesName)}
    <h3 class="sub-h">★ Mes boutiques préférées</h3>${chips(state.favShops, 'shop', shopName)}
    <p class="muted small">${state.customShops.length} boutique${state.customShops.length > 1 ? 's' : ''} ajoutée${state.customShops.length > 1 ? 's' : ''} · ${Object.keys(state.owned).length} carte${Object.keys(state.owned).length > 1 ? 's' : ''} cochée${Object.keys(state.owned).length > 1 ? 's' : ''} « Je l’ai » · synchronisé avec votre compte</p>
    <div class="account-actions">
      <button class="btn btn-ghost-dark" id="signOutBtn" type="button">Se déconnecter</button>
      <button class="btn btn-danger" id="deleteDataBtn" type="button">Supprimer mes données</button>
    </div>`);
}

function requireAccount(reason) {
  if (state.user) return true;
  showAccount(reason);
  return false;
}

function toggleFavSeries(id) {
  if (!requireAccount('Connectez-vous pour enregistrer vos séries préférées.')) return;
  const on = state.favSeries.includes(id);
  state.favSeries = on ? state.favSeries.filter((x) => x !== id) : [...state.favSeries, id];
  syncAccount();
  renderTabs();
  renderHead();
  toast(on ? 'Série retirée de vos séries' : 'Série ajoutée à vos séries ★');
}

function toggleFavShop(id) {
  if (!requireAccount('Connectez-vous pour enregistrer vos boutiques préférées.')) return;
  const on = state.favShops.includes(id);
  state.favShops = on ? state.favShops.filter((x) => x !== id) : [...state.favShops, id];
  syncAccount();
  syncFavToggle();
  render();
  renderMyShops();
  toast(on ? 'Boutique retirée de vos préférées' : 'Boutique ajoutée à vos préférées ★');
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3200);
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
  const shop = state.config.shops.find((s) => s.id === shopId) || state.customShops.find((c) => c.id === shopId);
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
$('#tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) selectSeries(tab.dataset.id);
});
$('#accountBtn').addEventListener('click', () => showAccount());
$('#favShopsToggle').addEventListener('click', () => {
  state.favOnly = !state.favOnly;
  syncFavToggle();
  render();
});
document.addEventListener('click', async (e) => {
  const t = e.target;
  const favSeries = t.closest('[data-fav-series]');
  if (favSeries) return toggleFavSeries(favSeries.dataset.favSeries);
  const favShop = t.closest('[data-fav-shop]');
  if (favShop) {
    e.preventDefault();
    return toggleFavShop(favShop.dataset.favShop);
  }
  const unS = t.closest('[data-unfav-series]');
  if (unS) {
    toggleFavSeries(unS.dataset.unfavSeries);
    return showAccount();
  }
  const unB = t.closest('[data-unfav-shop]');
  if (unB) {
    toggleFavShop(unB.dataset.unfavShop);
    return showAccount();
  }
  if (t.closest('#googleSignIn')) {
    const err = $('#signInError');
    try {
      await state.account.signIn();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
    return;
  }
  if (t.closest('#signOutBtn')) {
    await state.account.signOut();
    $('#dlg').close();
    return toast('Vous êtes déconnecté.');
  }
  const del = t.closest('#deleteDataBtn');
  if (del) {
    if (del.dataset.armed !== '1') {
      del.dataset.armed = '1';
      del.textContent = 'Confirmer la suppression';
      return;
    }
    try {
      clearTimeout(saveTimer);
      await state.account.remove(state.user.uid);
      await state.account.signOut();
      $('#dlg').close();
      toast('Vos données de compte ont été supprimées.');
    } catch (ex) {
      toast(`Suppression impossible : ${ex.message}`);
    }
  }
});
$('#checkBtn').addEventListener('click', showChecker);
$('#addShopBtn').addEventListener('click', showAddShop);
document.addEventListener('click', (e) => {
  const rm = e.target.closest('[data-remove-shop]');
  if (!rm) return;
  const shop = state.customShops.find((c) => c.id === rm.dataset.removeShop);
  if (!shop) return;
  // Confirmation en deux clics (les boîtes confirm() sont bloquées dans certains navigateurs intégrés).
  if (rm.dataset.armed !== '1') {
    rm.dataset.armed = '1';
    rm.textContent = 'Retirer ?';
    rm.classList.add('armed');
    setTimeout(() => {
      if (rm.isConnected) {
        rm.dataset.armed = '';
        rm.textContent = '🗑';
        rm.classList.remove('armed');
      }
    }, 4000);
    return;
  }
  state.customShops = state.customShops.filter((c) => c.id !== shop.id);
  saveCustomShops();
});
document.addEventListener('change', (e) => {
  const box = e.target.closest('[data-own]');
  if (!box) return;
  const card = state.cards[state.series.id]?.cards.find((c) => String(c.idProduct) === box.dataset.own);
  if (box.checked) state.owned[box.dataset.own] = { name: card?.name, code: card?.code, at: new Date().toISOString() };
  else delete state.owned[box.dataset.own];
  store.set('owned', state.owned);
  syncAccount();
  renderCards();
});
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
$('#stockFilter').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.stock = b.dataset.v;
  savePrefs();
  syncFilters();
  render();
});
$('#dlg').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.close();
});

function savePrefs() {
  store.set('prefs', { lang: state.lang, type: state.type, stock: state.stock });
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
init();
