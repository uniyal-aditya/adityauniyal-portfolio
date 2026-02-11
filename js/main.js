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
