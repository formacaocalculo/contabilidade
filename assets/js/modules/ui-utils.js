// assets/js/modules/ui-utils.js
let _toastContainer = null;

export function initToasts() {
    if (_toastContainer && document.body.contains(_toastContainer)) return;
    _toastContainer = document.createElement('div');
    _toastContainer.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
    document.body.appendChild(_toastContainer);
}

export function showToast(message, type = 'success') {
    if (!_toastContainer || !document.body.contains(_toastContainer)) initToasts();
    const colors = {
        success: { bg: '#2D7A4F', icon: '✓' },
        info:    { bg: '#2E4066', icon: 'ℹ' },
        warning: { bg: '#9A7A20', icon: '!' },
        danger:  { bg: '#B03A2E', icon: '✕' },
    };
    const c = colors[type] || colors.success;
    const t = document.createElement('div');
    t.style.cssText = `background:${c.bg};color:#fff;padding:12px 18px;border-radius:8px;font-family:Inter,sans-serif;font-size:13.5px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,0.25);pointer-events:all;display:flex;align-items:center;gap:10px;min-width:240px;`;
    t.innerHTML = `<span>${c.icon}</span>${message}`;
    _toastContainer.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0'; t.style.transition = 'opacity .3s';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

export function openModal(id) { const m = document.getElementById(id); if (m) m.hidden = false; }
export function closeModal(id) { const m = document.getElementById(id); if (m) m.hidden = true; }

export function initModais() {
    if (window._uiUtilsModaisAtivos) return;
    window._uiUtilsModaisAtivos = true;
    document.addEventListener('click', (e) => {
        if (e.target.matches('.modal-backdrop')) {
            const modal = e.target.closest('.modal');
            if (modal) modal.hidden = true;
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not([hidden])').forEach(m => { m.hidden = true; });
        }
    });
}

export function initTabs() {
    document.querySelectorAll('.tabs').forEach((tabGroup) => {
        const buttons = tabGroup.querySelectorAll('.tab-btn');
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
                buttons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.dataset.tab;
                document.querySelectorAll('.tab-panel').forEach((p) => {
                    p.hidden = p.dataset.panel !== target;
                });
            });
        });
        if (buttons.length && !tabGroup.querySelector('.tab-btn.active')) buttons[0].click();
    });
}

export function initTableSearch() {
    document.querySelectorAll('[data-search]').forEach((input) => {
        const table = document.getElementById(input.dataset.search);
        if (!table) return;
        input.addEventListener('input', () => {
            const q = input.value.toLowerCase().trim();
            table.querySelectorAll('tbody tr').forEach((row) => {
                row.hidden = q && !row.textContent.toLowerCase().includes(q);
            });
        });
    });
}

export function fmtEUR(v) {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v || 0);
}

export function fmtDate(d) {
    if (!d) return '—';
    return new Intl.DateTimeFormat('pt-PT').format(new Date(d + 'T00:00:00'));
}

export function iniciaisAvatar(nome) {
    return (nome || '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
