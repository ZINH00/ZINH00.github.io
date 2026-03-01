/**
 * main.js
 * 공통 기능: 다크모드, 네비게이션, 로고 전환
 */

const LOGO_LIGHT = 'logo/jjh_logo_02.png';
const LOGO_DARK  = 'logo/jjh_logo_03.png';

/* ─────────────────────────────────────
   Dark Mode
───────────────────────────────────── */
function getStoredTheme() {
  return localStorage.getItem('theme') || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateLogo(theme);
  updateThemeIcon(theme);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function updateLogo(theme) {
  const logos = document.querySelectorAll('.logo-img');
  logos.forEach(img => {
    img.src = theme === 'dark' ? LOGO_DARK : LOGO_LIGHT;
  });
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`;

  const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`;

  btn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
}

/* ─────────────────────────────────────
   Navigation: Active Link
───────────────────────────────────── */
function setActiveNavLink() {
  const path = window.location.pathname;
  const filename = path.split('/').pop() || 'index.html';

  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    const isActive =
      href === filename ||
      (filename === '' && href === 'index.html') ||
      (href === 'index.html' && (filename === '' || filename === 'index.html'));
    link.classList.toggle('active', isActive);
  });
}

/* ─────────────────────────────────────
   Mobile Menu
───────────────────────────────────── */
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (!btn || !mobileNav) return;

  btn.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
  });

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !mobileNav.contains(e.target)) {
      mobileNav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  mobileNav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
    });
  });
}

/* ─────────────────────────────────────
   Toast
───────────────────────────────────── */
let toastTimer;
function showToast(message, duration = 2800) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ─────────────────────────────────────
   Modal Helpers
───────────────────────────────────── */
function openModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function initModalClose(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlayId);
  });

  overlay.querySelector('.modal-close')?.addEventListener('click', () => {
    closeModal(overlayId);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal(overlayId);
  });
}

/* ─────────────────────────────────────
   Init
───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getStoredTheme());

  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('click', toggleTheme);

  setActiveNavLink();
  initMobileMenu();
});
