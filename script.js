// ============================================================
//  script.js — UI partilhada
//  Requer db.js carregado antes
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();          // ← primeiro, para não haver flash
  const user = await window.authReady;
  if (!user) return;    // auth-guard já está a redirecionar para login
  await guardarEmpresaActiva();
  initNav();
  initTabs();
  initTableSearch();
  initToasts();
  await renderEmpresaSelector();
});

/* ══════════════════════════════════════════
   TEMA CLARO / ESCURO
   Guardado em localStorage como 'snc_theme'
   Aplicado em <html data-theme="dark|light">
   ══════════════════════════════════════════ */

function initTheme() {
  const saved = localStorage.getItem('snc_theme') || 'light';
  applyTheme(saved, false);
}

function applyTheme(theme, animate) {
  if (!animate) {
    // desliga transições temporariamente para evitar flash no carregamento
    document.documentElement.style.transition = 'none';
  }
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('snc_theme', theme);
  if (!animate) {
    // força reflow e religa transições
    void document.documentElement.offsetHeight;
    document.documentElement.style.transition = '';
  }
  // actualiza todos os botões de toggle presentes na página
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', theme === 'dark');
    const label = btn.querySelector('.theme-toggle-label');
    if (label) label.textContent = theme === 'dark' ? 'Modo Escuro' : 'Modo Claro';
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark', true);
}

/* ── Protecção: redirige para empresas se não há activa ── */
async function guardarEmpresaActiva() {
  const pagina = location.pathname.split('/').pop() || 'index.html';
  if (['empresas.html', ''].includes(pagina)) return;
  const emp = await DB.empresaActiva();
  if (!emp) location.href = 'empresas.html';
}

/* ── Selector de empresa no topbar ── */
async function renderEmpresaSelector() {
  const el = document.getElementById('empresa-selector');
  if (!el) return;
  const emp = await DB.empresaActiva();
  if (!emp) return;
  const empresas = await DB.getEmpresas();
  el.innerHTML = `
    <div style="position:relative;display:inline-block" id="emp-dropdown-wrap">
      <button onclick="toggleEmpDropdown()" style="
        display:flex;align-items:center;gap:8px;
        background:var(--bg-page);border:1px solid var(--border);
        border-radius:var(--radius);padding:6px 12px;
        font-size:13px;font-weight:500;color:var(--text);cursor:pointer;
        font-family:Inter,sans-serif;
      ">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--success);flex-shrink:0"></span>
        ${emp.nome}
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      </button>
      <div id="emp-dropdown" hidden style="
        position:absolute;top:calc(100% + 6px);right:0;
        background:var(--bg-card);border:1px solid var(--border);
        border-radius:var(--radius);box-shadow:var(--shadow-lg);
        min-width:220px;z-index:300;overflow:hidden;
      ">
        <div style="padding:8px 0">
          ${empresas.map(e => `
            <button onclick="mudarEmpresa('${e.id}')" style="
              display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;
              background:${e.id===emp.id?'var(--bg-page)':'transparent'};
              border:none;font-size:13px;color:var(--text);cursor:pointer;text-align:left;
              font-family:Inter,sans-serif;
            ">
              ${e.id===emp.id?'<span style="color:var(--success)">✓</span>':'<span style="width:14px;display:inline-block"></span>'}
              <span style="flex:1">${e.nome}</span>
              <span style="font-size:11px;color:var(--muted)">${e.nif||''}</span>
            </button>
          `).join('')}
        </div>
        <div style="border-top:1px solid var(--border);padding:6px 0">
          <a href="empresas.html" style="display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:12px;color:var(--muted);text-decoration:none">
            ⚙ Gerir empresas
          </a>
        </div>
      </div>
    </div>
  `;
}

function toggleEmpDropdown() {
  const d = document.getElementById('emp-dropdown');
  if (d) d.hidden = !d.hidden;
}

function mudarEmpresa(id) {
  DB.setEmpresaActiva(id);
  location.reload();
}

document.addEventListener('click', e => {
  const wrap = document.getElementById('emp-dropdown-wrap');
  if (wrap && !wrap.contains(e.target)) {
    const d = document.getElementById('emp-dropdown');
    if (d) d.hidden = true;
  }
});

/* ── Nav activo ── */
function initNav() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(link => {
    if (link.getAttribute('href') === current) link.classList.add('active');
  });
}

/* ── Tabs ── */
function initTabs() {
  document.querySelectorAll('.tabs').forEach(tabGroup => {
    const buttons = tabGroup.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(p => {
          p.hidden = p.dataset.panel !== target;
        });
      });
    });
    if (buttons.length) buttons[0].click();
  });
}

/* ── Pesquisa em tabelas ── */
function initTableSearch() {
  document.querySelectorAll('[data-search]').forEach(input => {
    const table = document.getElementById(input.dataset.search);
    if (!table) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      table.querySelectorAll('tbody tr').forEach(row => {
        row.hidden = q && !row.textContent.toLowerCase().includes(q);
      });
    });
  });
}

/* ── Toasts ── */
let _toastContainer;
function initToasts() {
  _toastContainer = document.createElement('div');
  _toastContainer.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
  document.body.appendChild(_toastContainer);
}

function showToast(message, type = 'success') {
  if (!_toastContainer) initToasts();
  const colors = {
    success:{ bg:'#2D7A4F', icon:'✓' },
    info:   { bg:'#2E4066', icon:'ℹ' },
    warning:{ bg:'#9A7A20', icon:'!' },
    danger: { bg:'#B03A2E', icon:'✕' },
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

/* ── Modais ── */
function openModal(id) { const m = document.getElementById(id); if (m) m.hidden = false; }
function closeModal(id) { const m = document.getElementById(id); if (m) m.hidden = true; }

document.addEventListener('click', e => {
  if (e.target.matches('.modal-backdrop')) {
    const modal = e.target.closest('.modal');
    if (modal) modal.hidden = true;
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    document.querySelectorAll('.modal:not([hidden])').forEach(m => m.hidden = true);
});

/* ── Formatação ── */
function fmtEUR(v) {
  return new Intl.NumberFormat('pt-PT', { style:'currency', currency:'EUR', minimumFractionDigits:2 }).format(v||0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('pt-PT').format(new Date(d + 'T00:00:00'));
}
