/* ═════════════════════════════════════
   ADITYA UNIYAL — Portfolio 3.0 · JS
═════════════════════════════════════ */

/* ── CUSTOM CURSOR ── */
const cursor = document.querySelector('.cursor');
const ring   = document.querySelector('.cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  if (cursor) { cursor.style.left = mx + 'px'; cursor.style.top = my + 'px'; }
});

function animRing() {
  if (ring) {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
  }
  requestAnimationFrame(animRing);
}
animRing();

/* ── NAV SCROLL ── */
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('stuck', window.scrollY > 10);
}, { passive: true });

/* ── HAMBURGER / MOBILE NAV ── */
const ham    = document.getElementById('hamburger');
const mNav   = document.getElementById('mobileNav');

ham?.addEventListener('click', () => {
  const open = mNav.classList.toggle('open');
  ham.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});

document.querySelectorAll('.mobile-nav a').forEach(a => {
  a.addEventListener('click', () => {
    mNav?.classList.remove('open');
    ham?.classList.remove('open');
    document.body.style.overflow = '';
  });
});

/* ── HIRE MODAL ── */
const modal = document.getElementById('hireModal');

function openModal() {
  modal?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modal?.classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-hire]').forEach(el => el.addEventListener('click', openModal));
document.getElementById('modalClose')?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); mNav?.classList.remove('open'); ham?.classList.remove('open'); document.body.style.overflow = ''; }
});

/* ── HERO TYPEWRITER ── */
const typedEl = document.getElementById('typed-text');
const phrases = [
  'building scalable systems',
  'crafting Discord bots',
  'shipping web platforms',
  'writing clean architecture',
  'solving hard problems',
];
let pi = 0, ci = 0, deleting = false;

function typewrite() {
  if (!typedEl) return;
  const word = phrases[pi];
  if (!deleting) {
    typedEl.textContent = word.slice(0, ++ci);
    if (ci === word.length) { deleting = true; setTimeout(typewrite, 2000); return; }
    setTimeout(typewrite, 55);
  } else {
    typedEl.textContent = word.slice(0, --ci);
    if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; setTimeout(typewrite, 300); return; }
    setTimeout(typewrite, 28);
  }
}
typewrite();

/* ── SCROLL REVEALS ── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ── YEAR ── */
const yr = document.getElementById('yr');
if (yr) yr.textContent = new Date().getFullYear();

/* ── CONTACT FORM ── */
const form = document.getElementById('cf');
const formWrap = document.getElementById('formWrap');
const formOk = document.getElementById('formOk');
form?.addEventListener('submit', e => {
  e.preventDefault();
  const btn = form.querySelector('button[type=submit]');
  btn.textContent = 'Sending…';
  btn.disabled = true;
  setTimeout(() => {
    formWrap.style.display = 'none';
    formOk.style.display = 'flex';
  }, 1200);
});

/* ── PROJECT ROW HOVER cursor ── */
document.querySelectorAll('.project-row').forEach(row => {
  row.addEventListener('mouseenter', () => {
    if (cursor) { cursor.style.width = '22px'; cursor.style.height = '22px'; }
  });
  row.addEventListener('mouseleave', () => {
    if (cursor) { cursor.style.width = ''; cursor.style.height = ''; }
  });
});
