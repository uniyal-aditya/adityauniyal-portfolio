// main.js — UI interactions + feedback submission
(() => {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // nav toggle
    const nav = document.querySelector('.main-nav');
    const toggle = document.getElementById('nav-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => nav.classList.toggle('open'));
    }

    // basic modal logic for project case studies
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const modalClose = document.getElementById('modal-close');

    function openModal(html) {
        modalContent.innerHTML = html;
        modal.setAttribute('aria-hidden', 'false');
    }
    function closeModal() {
        modal.setAttribute('aria-hidden', 'true');
        modalContent.innerHTML = '';
    }
    if (modalClose) modalClose.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // attach open-case buttons
    document.querySelectorAll('.open-case').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            const slug = ev.currentTarget.getAttribute('data-slug');
            // switch by slug => static case studies (extendable)
            const cases = {
                'numexa': `<h2>Numexa — Discord Scientific Calculator</h2>
                   <p>Stack: Python, discord.py, math parsing.</p>
                   <h4>Highlights</h4><ul><li>Complex math</li><li>Command parsing</li></ul>`,
                'raftarfun': `<h2>RaftarFun — Interactive Web Experiments</h2>
                   <p>Stack: JS, HTML5 Canvas, Node (optional).</p>`,
                'quiz': `<h2>Multiplayer Quiz — Real-time Gameplay</h2><p>Stack: WebSockets, Firebase/Realtime or Socket.io with Node.</p>`,
                'aichat': `<h2>AI Chatbot</h2><p>Stack: Node/Python + LLM integration, Discord service.</p>`
            };
            openModal(cases[slug] || '<p>Case study not found.</p>');
        });
    });

    // "Try demo" (placeholder behaviour)
    document.querySelectorAll('.try-demo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const demo = btn.getAttribute('data-demo');
            openModal(`<h2>Demo: ${demo}</h2><p>Interactive demo placeholder — replace with embed or iframe (CodeSandbox / Repl.it) for live demo.</p>`);
        });
    });

    // Feedback form — posts JSON to Netlify function
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = feedbackForm.querySelector('button[type="submit"]');
            const msgEl = document.getElementById('form-msg');
            const payload = {
                name: document.getElementById('name').value || 'Anonymous',
                email: document.getElementById('email').value || '',
                rating: document.getElementById('rating').value || '',
                message: document.getElementById('message').value || '',
                project: document.getElementById('project').value || ''
            };

            btn.disabled = true;
            msgEl.textContent = 'Sending...';

            try {
                const res = await fetch('/.netlify/functions/sendFeedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    msgEl.textContent = 'Thanks — feedback sent.';
                    feedbackForm.reset();
                } else {
                    msgEl.textContent = data.error || 'Failed to send. Check console.';
                    console.error('sendFeedback error', data);
                }
            } catch (err) {
                console.error(err);
                msgEl.textContent = 'Network error — please try later.';
            } finally {
                btn.disabled = false;
            }
        });
    }

})();
