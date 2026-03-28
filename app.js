/* ── PulseFX — app.js ─────────────────────────────────────────────────────── */

const CRYPTO_URL  = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h';
const FIAT_URL    = 'https://open.er-api.com/v6/latest/USD';
const FIAT_CODES  = ['EUR','GBP','RWF','KES','NGN','ZAR','JPY','CNY','AED','INR','BRL','CAD','CHF','MXN','EGP'];

// State
let allAssets   = [];
let favorites   = JSON.parse(localStorage.getItem('pulsefx_favs') || '[]');
let activeFilter = 'all';
let prevPrices   = {};
let refreshTimer = null;

/* ── Fetch ───────────────────────────────────────────── */
async function fetchAll() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');

  let cryptoData = [], fiatData = {};
  let errors = [];

  // Fetch crypto
  try {
    const res = await fetch(CRYPTO_URL);
    if (!res.ok) throw new Error(`CoinGecko: ${res.status}`);
    cryptoData = await res.json();
  } catch(e) {
    errors.push('Crypto data unavailable (' + e.message + ')');
  }

  // Fetch fiat
  try {
    const res = await fetch(FIAT_URL);
    if (!res.ok) throw new Error(`ExchangeRate: ${res.status}`);
    const json = await res.json();
    if (json.result !== 'success') throw new Error('Invalid response');
    fiatData = json.rates;
  } catch(e) {
    errors.push('Fiat rates unavailable (' + e.message + ')');
  }

  // Handle total failure
  if (!cryptoData.length && !Object.keys(fiatData).length) {
    showError(errors.join(' · '));
    btn.classList.remove('spinning');
    return;
  }

  // Show partial error
  if (errors.length) {
    showError(errors.join(' · '));
  } else {
    hideError();
  }

  // Build asset list
  const newAssets = [];

  cryptoData.forEach(c => {
    newAssets.push({
      id:        c.id,
      symbol:    c.symbol.toUpperCase(),
      name:      c.name,
      type:      'crypto',
      price:     c.current_price,
      change24h: c.price_change_percentage_24h ?? null,
      extra:     formatMarketCap(c.market_cap),
      extraLabel:'Mkt Cap',
    });
  });

  FIAT_CODES.forEach(code => {
    if (!fiatData[code]) return;
    const rate = fiatData[code]; // units of this currency per 1 USD
    newAssets.push({
      id:        'fiat_' + code,
      symbol:    code,
      name:      currencyName(code),
      type:      'fiat',
      price:     1 / rate,      // price in USD
      change24h: null,           // ExchangeRate-API free tier doesn't provide change
      extra:     rate.toLocaleString('en-US', {maximumFractionDigits: 4}) + ' per USD',
      extraLabel:'Rate',
    });
  });

  // Flash on price change
  newAssets.forEach(a => {
    if (prevPrices[a.id] !== undefined && prevPrices[a.id] !== a.price) {
      a._flash = a.price > prevPrices[a.id] ? 'up' : 'down';
    }
    prevPrices[a.id] = a.price;
  });

  allAssets = newAssets;
  updateStats(cryptoData, fiatData);
  applyFilters();
  setLastUpdated();
  btn.classList.remove('spinning');

  // Auto-refresh every 60s
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(fetchAll, 60000);
}


function setFilter(f, el) {
  activeFilter = f;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  applyFilters();
}

function applyFilters() {
  const q     = document.getElementById('searchInput').value.trim().toLowerCase();
  const sort  = document.getElementById('sortSelect').value;

  let list = allAssets.filter(a => {
    if (activeFilter === 'crypto'    && a.type !== 'crypto')    return false;
    if (activeFilter === 'fiat'      && a.type !== 'fiat')      return false;
    if (activeFilter === 'favorites' && !favorites.includes(a.id)) return false;
    if (q && !a.name.toLowerCase().includes(q) && !a.symbol.toLowerCase().includes(q)) return false;
    return true;
  });

  // Sort
  list.sort((a, b) => {
    switch(sort) {
      case 'name_asc':    return a.name.localeCompare(b.name);
      case 'name_desc':   return b.name.localeCompare(a.name);
      case 'price_desc':  return (b.price||0) - (a.price||0);
      case 'price_asc':   return (a.price||0) - (b.price||0);
      case 'change_desc': return (b.change24h||0) - (a.change24h||0);
      case 'change_asc':  return (a.change24h||0) - (b.change24h||0);
      default:
        // Crypto first by market cap order, then fiat
        const ai = allAssets.indexOf(a), bi = allAssets.indexOf(b);
        return ai - bi;
    }
  });

  renderList(list);
}

/* ── Render ──────────────────────────────────────────── */
function renderList(list) {
  const container = document.getElementById('assetList');
  const empty     = document.getElementById('emptyState');

  if (!list.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  container.innerHTML = list.map((a, i) => {
    const isFav      = favorites.includes(a.id);
    const changeHtml = changeTag(a.change24h);
    const initials   = a.symbol.length <= 3 ? a.symbol : a.symbol.slice(0,2);
    const flashClass = a._flash ? ` flash-${a._flash}` : '';

    return `
    <div class="asset-row${flashClass}" style="animation-delay:${i * 30}ms">
      <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav('${a.id}', this)" title="${isFav ? 'Remove from saved' : 'Save asset'}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </button>
      <div class="asset-name-wrap">
        <div class="asset-icon ${a.type}">${initials}</div>
        <div>
          <div class="asset-name">${a.name}</div>
          <div class="asset-symbol">${a.symbol}</div>
        </div>
      </div>
      <div class="price-val">${formatPrice(a.price, a.type)}</div>
      <div>${changeHtml}</div>
      <div><span class="type-badge ${a.type}">${a.type}</span></div>
      <div class="extra-val">${a.extra}</div>
    </div>`;
  }).join('');
}

/* ── Favorites ───────────────────────────────────────── */
function toggleFav(id, btn) {
  const idx = favorites.indexOf(id);
  if (idx === -1) {
    favorites.push(id);
    btn.classList.add('active');
    btn.querySelector('path').setAttribute('fill', 'currentColor');
  } else {
    favorites.splice(idx, 1);
    btn.classList.remove('active');
    btn.querySelector('path').setAttribute('fill', 'none');
  }
  localStorage.setItem('pulsefx_favs', JSON.stringify(favorites));
  if (activeFilter === 'favorites') applyFilters();
}

/* ── Stats Bar ───────────────────────────────────────── */
function updateStats(cryptoData, fiatData) {
  const btc = cryptoData.find(c => c.id === 'bitcoin');
  const eth = cryptoData.find(c => c.id === 'ethereum');

  if (btc) document.getElementById('statBTC').textContent = '$' + btc.current_price.toLocaleString();
  if (eth) document.getElementById('statETH').textContent = '$' + eth.current_price.toLocaleString();

  if (fiatData.EUR) {
    const eur = (1 / fiatData.EUR).toFixed(4);
    document.getElementById('statEUR').textContent = eur;
  }
  if (fiatData.RWF) {
    const rwf = fiatData.RWF.toFixed(0);
    document.getElementById('statRWF').textContent = rwf + ' RWF';
  }

  const totalCrypto = cryptoData.length;
  const bullish = cryptoData.filter(c => (c.price_change_percentage_24h||0) > 0).length;
  const pct = totalCrypto ? Math.round((bullish / totalCrypto) * 100) : 0;
  document.getElementById('statMarket').textContent = pct + '% bullish';
}

/* ── Helpers ─────────────────────────────────────────── */
function formatPrice(price, type) {
  if (price === null || price === undefined) return '—';
  if (type === 'fiat') {
    // Show as USD value (e.g. 0.00086 for RWF)
    if (price < 0.001) return '$' + price.toFixed(6);
    if (price < 1)     return '$' + price.toFixed(4);
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // Crypto
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1)    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (price >= 0.01) return '$' + price.toFixed(4);
  return '$' + price.toFixed(8);
}

function formatMarketCap(n) {
  if (!n) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
  return '$' + n.toLocaleString();
}

function changeTag(val) {
  if (val === null || val === undefined)
    return `<span class="change-badge flat">— N/A</span>`;
  const sign = val >= 0 ? '+' : '';
  const cls  = val > 0 ? 'up' : val < 0 ? 'down' : 'flat';
  const arrow = val > 0 ? '▲' : val < 0 ? '▼' : '●';
  return `<span class="change-badge ${cls}">${arrow} ${sign}${val.toFixed(2)}%</span>`;
}

function setLastUpdated() {
  const now = new Date();
  document.getElementById('lastUpdate').textContent =
    'Updated ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function showError(msg) {
  const b = document.getElementById('errorBanner');
  document.getElementById('errorText').textContent = msg;
  b.style.display = 'flex';
}
function hideError() {
  document.getElementById('errorBanner').style.display = 'none';
}

function currencyName(code) {
  const names = {
    EUR:'Euro', GBP:'British Pound', RWF:'Rwandan Franc', KES:'Kenyan Shilling',
    NGN:'Nigerian Naira', ZAR:'South African Rand', JPY:'Japanese Yen',
    CNY:'Chinese Yuan', AED:'UAE Dirham', INR:'Indian Rupee',
    BRL:'Brazilian Real', CAD:'Canadian Dollar', CHF:'Swiss Franc',
    MXN:'Mexican Peso', EGP:'Egyptian Pound'
  };
  return names[code] || code;
}

/* ── Boot ────────────────────────────────────────────── */
fetchAll();