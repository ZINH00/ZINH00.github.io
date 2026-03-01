/**
 * data.js
 * 데이터 관리: JSON + localStorage, 렌더링
 */

const STORAGE_KEYS = {
  projects : 'portfolio_projects',
  papers   : 'portfolio_papers',
  awards   : 'portfolio_awards',
  blog     : 'portfolio_blog',
};

/* ─────────────────────────────────────
   IndexedDB — PDF Storage
───────────────────────────────────── */
function _getDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('portfolio_files', 1);
    req.onupgradeneeded = (e) => {
      if (!e.target.result.objectStoreNames.contains('pdfs')) {
        e.target.result.createObjectStore('pdfs', { keyPath: 'id' });
      }
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

async function storePdf(id, file) {
  const db  = await _getDB();
  const buf = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').put({ id, data: buf, name: file.name });
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
}

async function getPdf(id) {
  const db = await _getDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('pdfs', 'readonly');
    const req = tx.objectStore('pdfs').get(id);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function deletePdf(id) {
  if (!id) return;
  const db = await _getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').delete(id);
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
}

window.openPdf = async function (id, name) {
  const record = await getPdf(id);
  if (!record) { alert('PDF 파일을 찾을 수 없습니다.'); return; }
  const blob = new Blob([record.data], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.target   = '_blank';
  a.rel      = 'noopener noreferrer';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/* ─────────────────────────────────────
   Data Load / Save
───────────────────────────────────── */

/** JSON 파일에서 committed 데이터 로드 */
async function fetchStaticData(page) {
  try {
    const res = await fetch(`data/${page}.json?v=${Date.now()}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/** localStorage에서 로컬 추가 항목 로드 */
function getLocalItems(page) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS[page])) || [];
  } catch {
    return [];
  }
}

/** 로컬 항목 저장 */
function saveLocalItems(page, items) {
  localStorage.setItem(STORAGE_KEYS[page], JSON.stringify(items));
}

/** 로컬 항목 추가 */
function addLocalItem(page, item) {
  const items = getLocalItems(page);
  item.id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  item.isLocal = true;
  items.unshift(item);
  saveLocalItems(page, items);
  return item;
}

/** 로컬 항목 삭제 */
function deleteLocalItem(page, id) {
  const items = getLocalItems(page).filter(i => i.id !== id);
  saveLocalItems(page, items);
}

/** static + local 병합 */
async function loadAllData(page) {
  const [staticData, localData] = await Promise.all([
    fetchStaticData(page),
    Promise.resolve(getLocalItems(page)),
  ]);
  return [...localData, ...staticData];
}

/* ─────────────────────────────────────
   Render: Gallery (Projects, Blog)
───────────────────────────────────── */

function renderGallery(containerId, items, page, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 9h6M9 13h4"/>
        </svg>
        <p class="empty-state-title">${emptyMessage || '아직 항목이 없습니다'}</p>
        <p class="empty-state-desc">위의 + 버튼을 눌러 첫 번째 항목을 추가해보세요.</p>
      </div>`;
    return;
  }

  container.innerHTML = items.map(item => buildGalleryCard(item, page)).join('');
  attachDeleteHandlers(containerId, page);
}

function buildGalleryCard(item, page) {
  const hasThumbnail = item.image || item.thumbnail;
  const thumbnailHtml = hasThumbnail
    ? `<img src="${escapeHtml(hasThumbnail)}" alt="${escapeHtml(item.title)}" loading="lazy">`
    : `<div class="card-thumbnail-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>`;

  const tags = item.tags
    ? (Array.isArray(item.tags) ? item.tags : item.tags.split(',').map(t => t.trim()))
        .filter(Boolean)
        .map(t => `<span class="tag">${escapeHtml(t)}</span>`)
        .join('')
    : '';

  const localBadge = item.isLocal
    ? `<span class="local-badge">Local</span>`
    : '';

  const deleteBtn = item.isLocal
    ? `<button class="card-action-btn delete" data-id="${item.id}" data-page="${page}" title="삭제">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>`
    : '';

  const linkHtml = item.link
    ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="card-link">
        View <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </a>`
    : '';

  return `
    <article class="gallery-card">
      <div class="card-thumbnail">${thumbnailHtml}</div>
      <div class="card-body">
        <span class="card-date">${escapeHtml(item.date || '')}</span>
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <p class="card-description">${escapeHtml(item.description || item.summary || '')}</p>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      </div>
      <div class="card-footer">
        <div style="display:flex;align-items:center;gap:8px">
          ${linkHtml}
          ${localBadge}
        </div>
        <div class="card-actions">${deleteBtn}</div>
      </div>
    </article>`;
}

/* ─────────────────────────────────────
   Render: List (Papers, Awards)
───────────────────────────────────── */

function renderList(containerId, items, page, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        <p class="empty-state-title">${emptyMessage || '아직 항목이 없습니다'}</p>
        <p class="empty-state-desc">위의 + 버튼을 눌러 첫 번째 항목을 추가해보세요.</p>
      </div>`;
    return;
  }

  const isAwards = page === 'awards';
  container.innerHTML = items.map((item, idx) =>
    isAwards ? buildAwardItem(item, idx, page) : buildPaperItem(item, idx, page)
  ).join('');

  attachDeleteHandlers(containerId, page);
}

function buildPaperItem(item, num, page) {
  const catLabels = { domestic: '국내', international: '해외', conference: '학술대회', journal: '저널' };
  const catClasses = { domestic: 'cat-domestic', international: 'cat-international', conference: 'cat-conference', journal: 'cat-journal' };

  const badges = (item.categories || [])
    .map(c => `<span class="type-badge ${catClasses[c] || ''}">${catLabels[c] || escapeHtml(c)}</span>`)
    .join('');

  const titleHtml = item.pdf
    ? `<a href="${escapeHtml(item.pdf)}" target="_blank" rel="noopener noreferrer"
        class="list-item-title-link">${escapeHtml(item.title)}</a>`
    : escapeHtml(item.title);

  const logoHtml = item.logo
    ? `<img src="${escapeHtml(item.logo)}" alt="로고" class="award-item-logo">`
    : '';

  return `
    <div class="list-item award-list-item">
      <div class="list-item-content">
        <div class="list-item-header">
          <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:0">
            ${badges ? `<div style="display:flex;gap:5px;flex-wrap:wrap">${badges}</div>` : ''}
            <h3 class="list-item-title">${titleHtml}</h3>
          </div>
          ${logoHtml}
        </div>
        <p class="list-item-meta" style="margin-top:4px">${escapeHtml(item.authors || '')}</p>
        <p class="list-item-meta">
          ${escapeHtml(item.venue || '')}${item.date ? ` · ${formatAwardDate(item.date)}` : ''}
        </p>
      </div>
    </div>`;
}

function buildAwardItem(item, num, page) {
  const typeClass = {
    award: 'type-award',
    certificate: 'type-certificate',
    patent: 'type-patent',
  }[item.type] || 'type-award';

  const typeLabel = {
    award: '수상',
    certificate: '자격증',
    patent: '특허',
  }[item.type] || item.type || '수상';

  // 제목: pdf 경로가 있으면 클릭 시 새 탭에서 열기
  const titleHtml = item.pdf
    ? `<a href="${escapeHtml(item.pdf)}" target="_blank" rel="noopener noreferrer"
        class="list-item-title-link">${escapeHtml(item.title)}</a>`
    : escapeHtml(item.title);

  // 우측 로고
  const logoHtml = item.logo
    ? `<img src="${escapeHtml(item.logo)}" alt="기관 로고" class="award-item-logo">`
    : '';

  return `
    <div class="list-item award-list-item">
      <div class="list-item-content">
        <div class="list-item-header">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:1;min-width:0">
            <span class="type-badge ${typeClass}">${escapeHtml(typeLabel)}</span>
            <h3 class="list-item-title">${titleHtml}</h3>
          </div>
          ${logoHtml}
        </div>
        <p class="list-item-meta">
          ${escapeHtml(item.issuer || '')}${item.date ? ` · ${formatAwardDate(item.date)}` : ''}
        </p>
        ${item.description ? `<p class="list-item-desc">${escapeHtml(item.description)}</p>` : ''}
      </div>
    </div>`;
}

/* ─────────────────────────────────────
   Delete Handler
───────────────────────────────────── */
function attachDeleteHandlers(containerId, page) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll('.delete[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 항목을 삭제할까요?')) return;
      const localItems = getLocalItems(page);
      const target = localItems.find(i => i.id === btn.dataset.id);
      if (target?.pdfId) await deletePdf(target.pdfId);
      deleteLocalItem(page, btn.dataset.id);
      showToast('항목이 삭제되었습니다.');
      const refreshed = await loadAllData(page);
      if (containerId === 'gallery-grid') renderGallery(containerId, refreshed, page);
      else renderList(containerId, refreshed, page);
    });
  });
}

/* ─────────────────────────────────────
   Search / Filter
───────────────────────────────────── */

/**
 * 키워드로 항목 필터링
 * @param {Array}  items  - 전체 항목 배열
 * @param {string} query  - 검색어
 * @param {string} page   - 페이지 종류 (projects|blog|papers|awards)
 */
function filterItems(items, query, page) {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter(item => {
    let fields;
    if (page === 'papers') {
      fields = [item.title, item.authors, item.venue, item.abstract, String(item.year || '')];
    } else if (page === 'awards') {
      fields = [item.title, item.issuer, item.description, item.type];
    } else {
      // projects, blog
      const tagStr = Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags || '');
      fields = [item.title, item.description, item.summary, tagStr];
    }
    return fields.some(f => f && String(f).toLowerCase().includes(q));
  });
}

/* ─────────────────────────────────────
   Utility
───────────────────────────────────── */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/** "YYYY.MM.DD" → "YYYY년 MM월 DD일", "YYYY.MM" → "YYYY년 MM월" */
function formatAwardDate(str) {
  if (!str) return '';
  const parts = str.split('.');
  if (parts.length === 3) return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
  if (parts.length === 2) return `${parts[0]}년 ${parts[1]}월`;
  return str;
}
