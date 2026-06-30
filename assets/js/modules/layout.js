// assets/js/modules/layout.js
import { renderSidebarHTML, initSidebar } from './sidebar.js';

export function renderLayout({ rotaAtiva, breadcrumb, acoesTopbar = '', conteudo }) {
    return `
    <aside class="sidebar" id="sidebar-mount">${renderSidebarHTML(rotaAtiva)}</aside>
    <div class="main-wrap">
        <header class="topbar">
            <div class="topbar-breadcrumb">
                <a href="#" onclick="window.router.navigate('painel');return false;" style="color:var(--muted);text-decoration:none">Início</a>
                ${breadcrumb ? `<span class="sep">›</span><span class="crumb-current">${breadcrumb}</span>` : ''}
            </div>
            <div class="topbar-actions">
                <div id="empresa-selector"></div>
                ${acoesTopbar}
                <div class="avatar" id="avatar-initials">—</div>
            </div>
        </header>
        <main class="page-content">
            ${conteudo}
        </main>
    </div>`;
}

export async function initLayout() {
    await initSidebar();
    const { empresaAtiva } = await import('./tenant.js');
    const emp = await empresaAtiva();
    const avatarEl = document.getElementById('avatar-initials');
    if (avatarEl && emp) {
        avatarEl.textContent = (emp.nome || '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    }
    return emp;
}
