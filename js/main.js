/* main.js — consolidated, robust, single-theme-toggle (PNG) + UI logic */
(() => {
    "use strict";

    const THEME_KEY = "site-theme";
    const SUN_ICON = "/assets/icons/sun.png";
    const MOON_ICON = "/assets/icons/moon.png";

    /* ---------- Helpers ---------- */
    const el = (sel) => document.querySelector(sel);
    const els = (sel) => Array.from(document.querySelectorAll(sel));

    function safeAddEvent(target, evt, fn, opts) {
        if (!target) return;
        target.addEventListener(evt, fn, opts);
    }

    /* ---------- Theme (single icon, PNG) ---------- */
    function initThemeToggle() {
        const root = document.documentElement;
        const btn = document.getElementById("theme-toggle");
        const iconImg = document.getElementById("theme-icon");
        const iconSun = document.getElementById("icon-sun");   // fallback
        const iconMoon = document.getElementById("icon-moon"); // fallback

        function showFallbackIcons(useDark) {
            if (iconSun && iconMoon) {
                iconSun.style.display = useDark ? "none" : "inline";
                iconMoon.style.display = useDark ? "inline" : "none";
            }
        }

        function applyTheme(theme) {
            const isDark = theme === "dark";
            if (isDark) root.setAttribute("data-theme", "dark");
            else root.removeAttribute("data-theme");

            // primary behaviour: single png icon if present
            if (iconImg) {
                iconImg.src = isDark ? MOON_ICON : SUN_ICON;
                iconImg.alt = isDark ? "Moon (dark theme active)" : "Sun (light theme active)";
            } else {
                // fallback: show/hide separate sun/moon elements if available
                showFallbackIcons(!isDark);
            }

            if (btn) {
                btn.setAttribute("aria-pressed", isDark ? "true" : "false");
                btn.title = isDark ? "Switch to light theme" : "Switch to dark theme";
            }
        }

        // Determine initial theme: saved > media query > light
        let saved = null;
        try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }

        if (saved === "dark" || saved === "light") {
            applyTheme(saved);
        } else {
            const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
            applyTheme(prefersDark ? "dark" : "light");
        }

        if (!btn) return;

        btn.addEventListener("click", () => {
            const curDark = document.documentElement.getAttribute("data-theme") === "dark";
            const next = curDark ? "light" : "dark";
            applyTheme(next);
            try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
        });

        // sync across tabs
        window.addEventListener("storage", (ev) => {
            if (ev.key === THEME_KEY) {
                applyTheme(ev.newValue || "light");
            }
        });
    }

    /* ---------- Year replacement ---------- */
    function initYear() {
        const yearEl = document.getElementById("year");
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    }

    /* ---------- Desktop nav toggle (non-mobile) ---------- */
    function initNavToggle() {
        const nav = document.querySelector(".main-nav");
        const toggle = document.getElementById("nav-toggle");
        if (!toggle || !nav) return;
        toggle.addEventListener("click", () => nav.classList.toggle("open"));
    }

    /* ---------- Mobile menu logic ---------- */
    function initMobileNav() {
        const mobileToggle = document.getElementById("mobile-menu-toggle");
        const mobileNav = document.getElementById("mobileNav");
        const mobileClose = document.getElementById("mobileNavClose");

        if (!mobileToggle || !mobileNav) return;

        function openMobileNav() {
            mobileNav.setAttribute("aria-hidden", "false");
            mobileToggle.classList.add("open");
            mobileToggle.setAttribute("aria-expanded", "true");
            const first = mobileNav.querySelector('a, button');
            if (first) first.focus();
            document.documentElement.style.overflow = "hidden";
        }

        function closeMobileNav() {
            mobileNav.setAttribute("aria-hidden", "true");
            mobileToggle.classList.remove("open");
            mobileToggle.setAttribute("aria-expanded", "false");
            document.documentElement.style.overflow = "";
            mobileToggle.focus();
        }

        mobileToggle.addEventListener("click", () => {
            if (mobileNav.getAttribute("aria-hidden") === "false") closeMobileNav();
            else openMobileNav();
        });

        if (mobileClose) safeAddEvent(mobileClose, "click", closeMobileNav);

        mobileNav.addEventListener("click", (ev) => {
            if (ev.target === mobileNav || ev.target.dataset.close === "true") closeMobileNav();
        });

        window.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape" && mobileNav.getAttribute("aria-hidden") === "false") closeMobileNav();
        });
    }

    /* ---------- Generic modal logic ---------- */
    function makeModal(modalId, contentId, closeId) {
        const modal = document.getElementById(modalId);
        if (!modal) return null;
        const content = contentId ? document.getElementById(contentId) : null;
        const closeBtn = closeId ? document.getElementById(closeId) : null;
        function open(html) {
            if (content) content.innerHTML = html;
            modal.setAttribute("aria-hidden", "false");
        }
        function close() {
            modal.setAttribute("aria-hidden", "true");
            if (content) content.innerHTML = "";
        }
        if (closeBtn) safeAddEvent(closeBtn, "click", close);
        // escape to close
        window.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && modal.getAttribute("aria-hidden") === "false") close(); });
        // click outside to close
        modal.addEventListener("click", (ev) => { if (ev.target === modal) close(); });
        return { open, close, modal, content };
    }

    /* ---------- Project case modal wiring ---------- */
    function initCaseModals() {
        const caseModal = makeModal("modal", "modal-content", "modal-close");
        // If there are .open-case buttons, attach their handlers
        els(".open-case").forEach(btn => {
            safeAddEvent(btn, "click", (ev) => {
                const slug = ev.currentTarget.getAttribute("data-slug");
                const cases = {
                    'numexa': `<h2>Numexa — Discord Scientific Calculator</h2>
                    <p><strong>Stack:</strong> Python, discord.py.</p>
                    <ul><li>Complex math parsing</li><li>Command architecture</li></ul>`,
                    'raftarfun': `<h2>RaftarFun — Interactive Web Experiments</h2>
                        <p><strong>Stack:</strong> JS, HTML5 Canvas.</p>`,
                    'quiz': `<h2>Multiplayer Quiz — Real-time Gameplay</h2><p><strong>Stack:</strong> WebSockets, Firebase/Socket.io</p>`,
                    'aichat': `<h2>AI Chatbot</h2><p><strong>Stack:</strong> Node/Python + LLM integration</p>`
                };
                if (caseModal) caseModal.open(cases[slug] || "<p>Case study not found.</p>");
            });
        });
        // demo buttons
        els(".try-demo").forEach(btn => {
            safeAddEvent(btn, "click", (ev) => {
                ev.preventDefault();
                const demo = ev.currentTarget.getAttribute("data-demo") || "Demo";
                if (caseModal) caseModal.open(`<h2>Demo: ${demo}</h2><p>Interactive demo placeholder — replace with an embed or iframe.</p>`);
            });
        });
    }

    /* ---------- Feedback form ---------- */
    function initFeedbackForm() {
        const form = document.getElementById("feedback-form");
        if (!form) return;

        safeAddEvent(form, "submit", async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const msgEl = document.getElementById("form-msg");

            const payload = {
                name: document.getElementById('name') ? document.getElementById('name').value || 'Anonymous' : 'Anonymous',
                email: document.getElementById('email') ? document.getElementById('email').value || '' : '',
                rating: document.getElementById('rating') ? document.getElementById('rating').value || '' : '',
                message: document.getElementById('message') ? document.getElementById('message').value || '' : '',
                project: document.getElementById('project') ? document.getElementById('project').value || '' : ''
            };

            if (btn) btn.disabled = true;
            if (msgEl) msgEl.textContent = "Sending...";

            try {
                const res = await fetch('/.netlify/functions/sendFeedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    if (msgEl) msgEl.textContent = "Thanks — feedback sent.";
                    form.reset();
                } else {
                    if (msgEl) msgEl.textContent = data.error || "Failed to send. Check console.";
                    console.error("sendFeedback error", data);
                }
            } catch (err) {
                console.error(err);
                if (msgEl) msgEl.textContent = "Network error — please try later.";
            } finally {
                if (btn) btn.disabled = false;
            }
        });
    }

    /* ---------- UPI modal & helper ---------- */
    function initUPI() {
        const modal = document.getElementById("upiModal");
        const upiRedirectBtn = document.getElementById("upiRedirectBtn");
        const upiQRBtn = document.getElementById("upiQRBtn");
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (upiRedirectBtn && isMobile) upiQRBtn && (upiQRBtn.style.display = "none");
        if (upiQRBtn && !isMobile) upiRedirectBtn && (upiRedirectBtn.style.display = "none");

        window.payUPI = function () {
            window.location.href = "upi://pay?pa=7078311859@fam&pn=Aditya%20Uniyal&cu=INR";
        };
        window.openUPIModal = function () { if (modal) modal.classList.add("active"); };
        window.closeUPIModal = function () { if (modal) modal.classList.remove("active"); };

        if (modal) {
            modal.addEventListener("click", function (e) {
                if (e.target === modal) modal.classList.remove("active");
            });
        }
    }

    /* ---------- Hire modal (accessible) ---------- */
    function initHireModal() {
        const hireBtn = document.getElementById('hireBtn');
        const hireModal = document.getElementById('hireModal');
        const hireClose = document.getElementById('hireClose');
        if (!hireModal) return;

        function openHire() {
            hireModal.setAttribute('aria-hidden', 'false');
            const first = hireModal.querySelector('a, button');
            if (first) first.focus();
            document.body.style.overflow = 'hidden';
        }
        function closeHire() {
            hireModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (hireBtn) hireBtn.focus();
        }

        if (hireBtn) safeAddEvent(hireBtn, 'click', (e) => { e.preventDefault(); openHire(); });
        if (hireClose) safeAddEvent(hireClose, 'click', closeHire);

        hireModal.addEventListener('click', (e) => { if (e.target === hireModal || e.target.dataset.close === "true") closeHire(); });
        window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && hireModal.getAttribute('aria-hidden') === 'false') closeHire(); });

        // very small focus-trap
        hireModal.addEventListener('keydown', function (ev) {
            if (ev.key !== 'Tab') return;
            const focusables = hireModal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
            if (!focusables.length) return;
            const first = focusables[0], last = focusables[focusables.length - 1];
            if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
            else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
        });
    }

    /* ---------- Intersection reveal & card reveals ---------- */
    function initRevealObserver() {
        const revealEls = Array.from(document.querySelectorAll('.card, section, .reveal-on-scroll'));
        if (!revealEls.length) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.1 });

        revealEls.forEach(el => {
            if (!el.classList.contains('reveal')) el.classList.add('reveal');
            observer.observe(el);
        });
    }

    /* ---------- Skill bar animation ---------- */
    function initSkillBars() {
        const bars = Array.from(document.querySelectorAll('.bar div'));
        if (!bars.length) return;

        bars.forEach((b) => {
            // capture target width from inline style or data attribute
            let target = "";
            const inline = b.getAttribute("style");
            if (inline && /width\s*:\s*\d+%/.test(inline)) {
                // keep inline width but animate from 0
                const match = inline.match(/width\s*:\s*(\d+%)/);
                target = match ? match[1] : "";
                b.style.width = "0%";
            } else if (b.dataset && b.dataset.width) {
                target = b.dataset.width;
                b.style.width = "0%";
            } else {
                // fallback: read computed width percentage (rare)
                target = b.style.width || b.getAttribute('data-width') || "";
                if (!target) target = "80%";
                b.style.width = "0%";
            }

            // delay a tiny random amount for stagger effect
            const delay = Math.random() * 300 + 120;
            setTimeout(() => {
                b.style.transition = "width .9s cubic-bezier(.2,.9,.28,1)";
                b.style.width = target;
            }, delay);
        });
    }

    /* ---------- Small UI polish: smooth hover for cards and sections ---------- */
    function addHoverSmoothing() {
        // This is just a JS helper to add a class; main work is CSS — see CSS snippet below.
        const hoverables = document.querySelectorAll('.card, .card .card-actions, .mini-contact .glass, .btn, .btn-outline');
        hoverables.forEach(elm => elm.classList.add('hover-smooth'));
    }

    /* ---------- Attach page-level behaviors ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        initYear();
        initNavToggle();
        initMobileNav();
        initThemeToggle();
        initCaseModals();
        initFeedbackForm();
        initUPI();
        initHireModal();
        initRevealObserver();
        initSkillBars();
        addHoverSmoothing();
    });

})();