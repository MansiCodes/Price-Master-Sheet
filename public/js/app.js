const API_RATES = '/api/v1/rates';
const API_REFRESH = '/api/v1/cache/refresh';
const AUTO_SYNC_MS = 60_000;

const ratesBody = document.getElementById('ratesBody');
const mobileList = document.getElementById('mobileList');
const searchInput = document.getElementById('search');
const pageSizeSelect = document.getElementById('pageSize');
const syncBtn = document.getElementById('syncBtn');
const exportBtn = document.getElementById('exportBtn');
const syncBtnMobile = document.getElementById('syncBtnMobile');
const exportBtnMobile = document.getElementById('exportBtnMobile');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageNumbers = document.getElementById('pageNumbers');
const syncButtons = [syncBtn, syncBtnMobile].filter(Boolean);

/** @type {Array<{sNo:number|null,name:string,specification?:string,specificationFull?:string,p10:number,p12:number,p15:number,p20:number}>} */
let rates = [];
/** @type {Array<{sNo:number|null,name:string,specification?:string,specificationFull?:string,p10:number,p12:number,p15:number,p20:number}>} */
let filtered = [];
let currentPage = 1;
let pageSize = Number(pageSizeSelect?.value) || 10;
let loading = false;

function formatPrice(value) {
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isMobileView() {
  return window.matchMedia('(max-width: 720px)').matches;
}

function readPageSize() {
  const value = Number(pageSizeSelect?.value);
  return [10, 20, 50, 100, 200].includes(value) ? value : 10;
}

function totalPages() {
  return Math.max(1, Math.ceil(filtered.length / pageSize));
}

function getPageItems() {
  const start = (currentPage - 1) * pageSize;
  return filtered.slice(start, start + pageSize);
}

function buildPageList(total) {
  const compact = isMobileView();
  if (compact) {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set([1, total, currentPage]);
    if (currentPage > 1) pages.add(currentPage - 1);
    if (currentPage < total) pages.add(currentPage + 1);
    return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  }

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set([1, total, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

function renderSkeleton(count = pageSize) {
  const rows = Math.max(6, count);
  ratesBody.innerHTML = Array.from({ length: rows }, () => `
    <tr class="skeleton-row">
      <td><span class="skeleton sk-sno"></span></td>
      <td><span class="skeleton sk-name"></span></td>
      <td><span class="skeleton sk-spec"></span></td>
      <td><span class="skeleton sk-price"></span></td>
      <td><span class="skeleton sk-price"></span></td>
      <td><span class="skeleton sk-price"></span></td>
      <td><span class="skeleton sk-price"></span></td>
    </tr>
  `).join('');

  const cards = 10;
  mobileList.innerHTML = Array.from({ length: cards }, () => `
    <article class="skeleton-card">
      <div class="sk-line sk-title"></div>
      <div class="sk-line sk-sub"></div>
      <div class="sk-prices">
        <div class="sk-chip"></div>
        <div class="sk-chip"></div>
        <div class="sk-chip"></div>
        <div class="sk-chip"></div>
      </div>
    </article>
  `).join('');
}

function renderPagination() {
  const total = totalPages();
  if (currentPage > total) currentPage = total;

  prevBtn.disabled = loading || currentPage <= 1 || filtered.length === 0;
  nextBtn.disabled = loading || currentPage >= total || filtered.length === 0;

  const pages = buildPageList(total);
  let html = '';
  let last = 0;

  for (const page of pages) {
    if (last && page - last > 1) {
      html += '<span class="page-ellipsis">…</span>';
    }
    html += `
      <button
        type="button"
        class="page-btn${page === currentPage ? ' is-active' : ''}"
        data-page="${page}"
        aria-label="Page ${page}"
        ${page === currentPage ? 'aria-current="page"' : ''}
        ${loading ? 'disabled' : ''}
      >${page}</button>
    `;
    last = page;
  }

  pageNumbers.innerHTML = filtered.length && !loading ? html : '';
}

function renderDesktop(list) {
  if (!list.length) {
    ratesBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">${rates.length ? 'No cables matched your search.' : 'No rates loaded.'}</td>
      </tr>
    `;
    return;
  }

  ratesBody.innerHTML = list
    .map((row) => {
      const shortSpec = row.specification || '—';
      const fullSpec = row.specificationFull || row.specification || '';
      return `
      <tr>
        <td class="sno">${row.sNo ?? '—'}</td>
        <td class="name" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</td>
        <td class="spec" title="${escapeHtml(fullSpec)}">${escapeHtml(shortSpec)}</td>
        <td class="price price-primary">${formatPrice(row.p10)}</td>
        <td class="price">${formatPrice(row.p12)}</td>
        <td class="price">${formatPrice(row.p15)}</td>
        <td class="price">${formatPrice(row.p20)}</td>
      </tr>
    `;
    })
    .join('');
}

function renderMobile(list) {
  if (!list.length) {
    mobileList.innerHTML = `
      <p class="mobile-empty">${rates.length ? 'No cables matched your search.' : 'No rates loaded.'}</p>
    `;
    return;
  }

  mobileList.innerHTML = list
    .map((row) => {
      const shortSpec = row.specification || '';
      const fullSpec = row.specificationFull || row.specification || '';
      const specBlock = shortSpec
        ? `<p class="rate-card-spec" title="${escapeHtml(fullSpec)}">${escapeHtml(shortSpec)}</p>`
        : '';
      return `
      <article class="rate-card">
        <div class="rate-card-top">
          <p class="rate-card-name" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</p>
          <span class="rate-card-sno">${row.sNo ?? '—'}</span>
        </div>
        ${specBlock}
        <div class="rate-card-prices">
          <div class="price-chip is-primary"><span>P=10%</span><strong>${formatPrice(row.p10)}</strong></div>
          <div class="price-chip"><span>P=12%</span><strong>${formatPrice(row.p12)}</strong></div>
          <div class="price-chip"><span>P=15%</span><strong>${formatPrice(row.p15)}</strong></div>
          <div class="price-chip"><span>P=20%</span><strong>${formatPrice(row.p20)}</strong></div>
        </div>
      </article>
    `;
    })
    .join('');
}

function render() {
  if (loading) {
    renderSkeleton(Math.min(pageSize, 12));
    renderPagination();
    return;
  }

  pageSize = readPageSize();
  const total = totalPages();
  if (currentPage > total) currentPage = total;

  const pageItems = getPageItems();
  renderDesktop(pageItems);
  renderMobile(pageItems);
  renderPagination();
}

function applyFilter({ resetPage = true } = {}) {
  const q = searchInput.value.trim().toLowerCase();
  filtered = !q
    ? [...rates]
    : rates.filter(
      (row) =>
        row.name.toLowerCase().includes(q)
        || String(row.sNo ?? '').includes(q)
        || String(row.specification || '').toLowerCase().includes(q)
        || String(row.specificationFull || '').toLowerCase().includes(q),
    );

  if (resetPage) currentPage = 1;
  render();
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function exportCsv() {
  if (!filtered.length) return;

  const header = ['S NO.', 'NAME OF CABLE', 'SPECIFICATION', 'P=10%', 'P=12%', 'P=15%', 'P=20%'];
  const lines = [
    header.join(','),
    ...filtered.map((row) =>
      [
        csvEscape(row.sNo ?? ''),
        csvEscape(row.name),
        csvEscape(row.specificationFull || row.specification || ''),
        csvEscape(row.p10),
        csvEscape(row.p12),
        csvEscape(row.p15),
        csvEscape(row.p20),
      ].join(',')),
  ];

  const blob = new Blob([`\uFEFF${lines.join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `cable-rates-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function fetchRates() {
  const response = await fetch(API_RATES);
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to load rates');
  }

  rates = Array.isArray(payload.data) ? payload.data : [];
  applyFilter({ resetPage: false });
  return rates;
}

function setSyncBusy(busy) {
  syncButtons.forEach((btn) => {
    btn.disabled = busy;
  });
}

async function syncFromSheet({ showSkeleton = false } = {}) {
  setSyncBusy(true);
  if (showSkeleton) {
    loading = true;
    render();
  }

  try {
    const refreshRes = await fetch(API_REFRESH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const refreshPayload = await refreshRes.json();

    if (!refreshRes.ok || !refreshPayload.success) {
      throw new Error(refreshPayload.message || 'Cache refresh failed');
    }

    await fetchRates();
  } catch {
    if (showSkeleton && !rates.length) {
      ratesBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="7">Could not load rates. Check API / sheet sharing.</td>
        </tr>
      `;
      mobileList.innerHTML = `
        <p class="mobile-empty">Could not load rates. Check API / sheet sharing.</p>
      `;
    }
  } finally {
    loading = false;
    setSyncBusy(false);
    render();
  }
}

async function initialLoad() {
  loading = true;
  pageSize = readPageSize();
  renderSkeleton(Math.min(pageSize, 12));
  renderPagination();

  try {
    await fetchRates();
  } catch {
    ratesBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">Could not load rates. Check API / sheet sharing.</td>
      </tr>
    `;
    mobileList.innerHTML = `
      <p class="mobile-empty">Could not load rates. Check API / sheet sharing.</p>
    `;
  } finally {
    loading = false;
    render();
  }
}

searchInput.addEventListener('input', () => applyFilter({ resetPage: true }));

pageSizeSelect?.addEventListener('change', () => {
  pageSize = readPageSize();
  currentPage = 1;
  render();
});

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    render();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages()) {
    currentPage += 1;
    render();
  }
});

pageNumbers.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-page]');
  if (!btn || btn.disabled) return;
  currentPage = Number(btn.dataset.page);
  render();
});

exportBtn.addEventListener('click', exportCsv);
exportBtnMobile?.addEventListener('click', exportCsv);
syncBtn.addEventListener('click', () => syncFromSheet({ showSkeleton: true }));
syncBtnMobile?.addEventListener('click', () => syncFromSheet({ showSkeleton: true }));

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderPagination();
  }, 120);
});

initialLoad();
setInterval(() => syncFromSheet({ showSkeleton: false }), AUTO_SYNC_MS);
