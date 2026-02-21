(() => {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // nav toggle
    const nav = document.querySelector('.main-nav');
    const toggle = document.getElementById('nav-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => nav.classList.toggle('open'));
    }

    // modal logic
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const modalClose = document.getElementById('modal-close');

    function openModal(html) {
        if (!modal) return;
        modalContent.innerHTML = html;
        modal.setAttribute('aria-hidden', 'false');
    }
    function closeModal() {
        if (!modal) return;
        modal.setAttribute('aria-hidden', 'true');
        if (modalContent) modalContent.innerHTML = '';
    }
    if (modalClose) modalClose.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    document.querySelectorAll('.open-case').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            const slug = ev.currentTarget.getAttribute('data-slug');
            const cases = {
                'numexa': `<h2>Numexa — Discord Scientific Calculator</h2>
                   <p><strong>Stack:</strong> Python, discord.py.</p>
                   <ul><li>Complex math parsing</li><li>Command architecture</li></ul>`,
                'raftarfun': `<h2>RaftarFun — Interactive Web Experiments</h2>
                   <p><strong>Stack:</strong> JS, HTML5 Canvas.</p>`,
                'quiz': `<h2>Multiplayer Quiz — Real-time Gameplay</h2><p><strong>Stack:</strong> WebSockets, Firebase/Socket.io</p>`,
                'aichat': `<h2>AI Chatbot</h2><p><strong>Stack:</strong> Node/Python + LLM integration</p>`
            };
            openModal(cases[slug] || '<p>Case study not found.</p>');
        });
    });

    document.querySelectorAll('.try-demo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const demo = e.currentTarget.getAttribute('data-demo');
            openModal(`<h2>Demo: ${demo}</h2><p>Interactive demo placeholder — replace this with an embed or iframe.</p>`);
        });
    });

    // Feedback form posting left unchanged - function posts to serverless function
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = feedbackForm.querySelector('button[type="submit"]');
            const msgEl = document.getElementById('form-msg');
            const payload = {
                name: document.getElementById('name') ? document.getElementById('name').value || 'Anonymous' : 'Anonymous',
                email: document.getElementById('email') ? document.getElementById('email').value || '' : '',
                rating: document.getElementById('rating') ? document.getElementById('rating').value || '' : '',
                message: document.getElementById('message') ? document.getElementById('message').value || '' : '',
                project: document.getElementById('project') ? document.getElementById('project').value || '' : ''
            };

            if (btn) btn.disabled = true;
            if (msgEl) msgEl.textContent = 'Sending...';

            try {
                const res = await fetch('/.netlify/functions/sendFeedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    if (msgEl) msgEl.textContent = 'Thanks — feedback sent.';
                    feedbackForm.reset();
                } else {
                    if (msgEl) msgEl.textContent = data.error || 'Failed to send. Check console.';
                    console.error('sendFeedback error', data);
                }
            } catch (err) {
                console.error(err);
                if (msgEl) msgEl.textContent = 'Network error — please try later.';
            } finally {
                if (btn) btn.disabled = false;
            }
        });
    }
})();
const reveals = document.querySelectorAll('.card, section');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.1 });

reveals.forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
});
(function () {

    const toggle = document.getElementById("theme-toggle");
    const THEME_KEY = "site-theme";

    if (!toggle) return;

    function applyTheme(theme) {
        if (theme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
            toggle.setAttribute("aria-pressed", "true");
        } else {
            document.documentElement.removeAttribute("data-theme");
            toggle.setAttribute("aria-pressed", "false");
        }
    }

    function getSystemTheme() {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }

    const savedTheme = localStorage.getItem(THEME_KEY);
    applyTheme(savedTheme || getSystemTheme());

    toggle.addEventListener("click", () => {
        const isDark = document.documentElement.hasAttribute("data-theme");
        const newTheme = isDark ? "light" : "dark";
        localStorage.setItem(THEME_KEY, newTheme);
        applyTheme(newTheme);
    });

})();

// THEME TOGGLE (place at end of js/main.js)
(function () {
    const KEY = 'site-theme'; // 'light' or 'dark'
    const html = document.documentElement;
    const btn = document.getElementById('theme-toggle');

    if (!btn) return; // no toggle present

    // Helpers
    function applyTheme(theme) {
        if (theme === 'dark') {
            html.classList.add('dark');
            btn.setAttribute('aria-pressed', 'true');
            btn.title = 'Switch to light theme';
        } else {
            html.classList.remove('dark');
            btn.setAttribute('aria-pressed', 'false');
            btn.title = 'Switch to dark theme';
        }
    }

    function getSaved() {
        try {
            return localStorage.getItem(KEY);
        } catch (e) {
            return null;
        }
    }

    function save(theme) {
        try { localStorage.setItem(KEY, theme); } catch (e) { }
    }

    // Initialize: saved preference > OS preference > default 'light'
    const saved = getSaved();
    if (saved) {
        applyTheme(saved);
    } else {
        const osPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(osPrefersDark ? 'dark' : 'light');
    }

    // Toggle handler
    btn.addEventListener('click', () => {
        const nowIsDark = html.classList.contains('dark');
        const newTheme = nowIsDark ? 'light' : 'dark';
        applyTheme(newTheme);
        save(newTheme);
    });

    // Sync across tabs/windows
    window.addEventListener('storage', (ev) => {
        if (ev.key === KEY) {
            applyTheme(ev.newValue || 'light');
        }
    });

    // Optional: keep toggle state if nav is re-rendered
    // (ensures aria-pressed matches current theme)
    // run once more to sync aria label
    (function syncButtonAria() {
        const isDark = html.classList.contains('dark');
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    })();

})();
document.addEventListener("DOMContentLoaded", function () {

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const btn = document.querySelector(".bmc-btn");

    if (!isMobile && btn) {
        btn.style.display = "none"; // hides button on desktop
    }

});
function handleUPIPayment() {

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
        window.location.href = "upi://pay?pa=yourupiid@bank&pn=Aditya%20Uniyal&cu=INR";
    } else {
        document.getElementById("upiModal").style.display = "flex";
    }
}

function closeUPIModal() {
    document.getElementById("upiModal").style.display = "none";
}
function payUPI() {
    window.location.href = "upi://pay?pa=7078311859@fam&pn=Aditya%20Uniyal&cu=INR";
}

function openUPIModal() {
    document.getElementById("upiModal").classList.add("active");
}

function closeUPIModal() {
    document.getElementById("upiModal").classList.remove("active");
}
// Device detection
document.addEventListener("DOMContentLoaded", function () {

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const redirectBtn = document.getElementById("upiRedirectBtn");
    const qrBtn = document.getElementById("upiQRBtn");

    if (isMobile) {
        // On mobile → show redirect button only
        qrBtn.style.display = "none";
    } else {
        // On desktop → show QR button only
        redirectBtn.style.display = "none";
    }
});
document.getElementById("upiModal").addEventListener("click", function (e) {
    if (e.target === this) {
        closeUPIModal();
    }
});