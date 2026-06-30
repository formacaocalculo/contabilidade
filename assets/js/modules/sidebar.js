// assets/js/modules/sidebar.js
// Sidebar dinâmica partilhada por todos os módulos operacionais do ContaSNC.

import { empresaAtiva, donoEmpresaAtiva, isAdmin, limparEmpresaAtiva } from './tenant.js';

const NAV_ITEMS = [
    { rota: 'painel',       icone: 'grid',    label: 'Painel de Controlo' },
    { rota: 'plano-contas', icone: 'list',    label: 'Plano de Contas'    },
    { rota: 'diarios',      icone: 'folder',  label: 'Diários'             },
    { rota: 'lancamentos',  icone: 'edit',    label: 'Lançamentos'         },
    { rota: 'faturacao',    icone: 'invoice', label: 'Faturação'           },
    { rota: 'iva',          icone: 'coin',    label: 'Processamento IVA'   },
];

const SVGS = {
    grid:   '<path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h6a1 1 0 010 2H4a1 1 0 01-1-1z"/>',
    list:   '<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 002 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>',
    folder: '<path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>',
    edit:   '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd"/>',
    invoice:'<path fill-rule="evenodd" d="M4 2a1 1 0 00-1 1v14a1 1 0 001.4.914L6 16.987l1.6.927a1 1 0 001 0L10 16.987l1.6.927a1 1 0 001 0l1.6-.927 1.6.927A1 1 0 0017 17V3a1 1 0 00-1-1H4zm2 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7zm0 4a1 1 0 100 2h3a1 1 0 100-2H7z" clip-rule="evenodd"/>',
    coin:   '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>',
    admin:  '<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>',
};

export function renderSidebarHTML(rotaAtiva) {
    const navHTML = NAV_ITEMS.map(n => `
        <a href="#" onclick="window.router.navigate('${n.rota}');return false;" class="nav-item${n.rota === rotaAtiva ? ' active' : ''}">
            <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">${SVGS[n.icone]}</svg>
            ${n.label}
        </a>`).join('');

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = currentTheme === 'dark';

    return `
    <div class="sidebar-logo">
        <a href="#" onclick="window.router.navigate('painel');return false;" class="logo-mark">
            <div class="logo-icon">Σ</div>
            <div class="logo-text">ContaSNC<span>Sistema de Contabilidade</span></div>
        </a>
    </div>

    <nav class="sidebar-nav">
        <div class="nav-section-label">Principal</div>
        ${navHTML}
    </nav>

    <div id="sidebar-aviso-admin" style="display:none;margin:0 14px 8px;padding:8px 10px;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);border-radius:6px;font-size:11px;color:var(--gold);text-align:center">
        ⚠ Modo Admin — a ver empresa de outro utilizador
    </div>

    <div style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08)">
        <button class="theme-toggle theme-toggle-btn" onclick="window._sidebarToggleTema()" aria-pressed="${isDark}" title="Alternar modo claro/escuro">
            <div class="toggle-track"></div>
            <span class="theme-toggle-label">${isDark ? 'Modo Escuro' : 'Modo Claro'}</span>
            <span style="margin-left:auto;font-size:14px">${isDark ? '🌙' : '☀️'}</span>
        </button>
    </div>

    <div class="sidebar-footer">
        <div id="sidebar-empresa-nome" style="color:rgba(255,255,255,0.45);font-size:11px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
        <span id="sidebar-empresa-exercicio"></span>
        &nbsp;·&nbsp;
        <a href="#" onclick="window.router.navigate('empresas');return false;" style="color:var(--gold);font-size:11px;text-decoration:none">trocar</a>
        &nbsp;·&nbsp;
        <a href="#" onclick="window._sidebarSair();return false;" style="color:rgba(255,255,255,0.45);font-size:11px;text-decoration:none">sair</a>
    </div>`;
}

export async function initSidebar() {
    try {
        const [emp, admin] = await Promise.all([empresaAtiva(), isAdmin()]);

        const nomeEl = document.getElementById('sidebar-empresa-nome');
        if (nomeEl) nomeEl.textContent = emp ? emp.nome : '—';
        const exercicioEl = document.getElementById('sidebar-empresa-exercicio');
        if (exercicioEl) exercicioEl.innerHTML = emp ? `Exercício <strong style="color:rgba(255,255,255,0.85)">${emp.exercicio}</strong>` : '';

        const avisoEl = document.getElementById('sidebar-aviso-admin');
        if (avisoEl) avisoEl.style.display = donoEmpresaAtiva() ? 'block' : 'none';

        if (admin) {
            const nav = document.querySelector('.sidebar-nav');
            if (nav && !document.getElementById('sidebar-link-admin')) {
                const link = document.createElement('a');
                link.id = 'sidebar-link-admin';
                link.href = '#';
                link.className = 'nav-item';
                link.style.color = 'var(--gold)';
                link.innerHTML = '<svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">' + SVGS.admin + '</svg> Administração';
                link.onclick = function(e) { e.preventDefault(); window.router.navigate('admin'); };
                nav.appendChild(link);
            }
        }
    } catch (e) {
        console.warn('Erro ao preencher sidebar:', e);
    }
}

window._sidebarToggleTema = function() {
    const atual = document.documentElement.getAttribute('data-theme') || 'light';
    const novo = atual === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', novo);
    localStorage.setItem('snc_theme', novo);
    const btn = document.querySelector('.theme-toggle-btn');
    if (btn) {
        btn.setAttribute('aria-pressed', novo === 'dark');
        const label = btn.querySelector('.theme-toggle-label');
        if (label) label.textContent = novo === 'dark' ? 'Modo Escuro' : 'Modo Claro';
    }
};

window._sidebarSair = async function() {
    if (!confirm('Terminar sessão?')) return;
    const appMod = await import('../app.js');
    const authMod = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    limparEmpresaAtiva();
    await authMod.signOut(appMod.auth);
};
