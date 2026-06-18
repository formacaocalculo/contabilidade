// _sidebar.js — sidebar dinâmica com toggle de tema
function renderSidebar(paginaActiva) {
  const emp = DB.empresaActiva();
  const nomeEmp   = emp ? emp.nome    : '—';
  const exercicio = emp ? emp.exercicio : '—';

  const navItems = [
    { href:'index.html',        icon:'grid',   label:'Painel de Controlo' },
    { href:'plano-contas.html', icon:'list',   label:'Plano de Contas'    },
    { href:'diarios.html',      icon:'folder', label:'Diários'             },
    { href:'lancamentos.html',  icon:'edit',   label:'Lançamentos'         },
    { href:'faturacao.html',    icon:'invoice',label:'Faturação'           },
    { href:'iva.html',          icon:'coin',   label:'Processamento IVA'   },
  ];

  const svgs = {
    grid:   '<path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h6a1 1 0 010 2H4a1 1 0 01-1-1z"/>',
    list:   '<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 002 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>',
    folder: '<path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>',
    edit:   '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd"/>',
    invoice:'<path fill-rule="evenodd" d="M4 2a1 1 0 00-1 1v14a1 1 0 001.4.914L6 16.987l1.6.927a1 1 0 001 0L10 16.987l1.6.927a1 1 0 001 0l1.6-.927 1.6.927A1 1 0 0017 17V3a1 1 0 00-1-1H4zm2 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7zm0 4a1 1 0 100 2h3a1 1 0 100-2H7z" clip-rule="evenodd"/>',
    coin:   '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/>',
  };

  const navHTML = navItems.map(n => `
    <a href="${n.href}" class="nav-item${n.href === paginaActiva ? ' active' : ''}">
      <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">${svgs[n.icon]}</svg>
      ${n.label}
    </a>`).join('');

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const isDark = currentTheme === 'dark';

  document.getElementById('sidebar-mount').innerHTML = `
    <div class="sidebar-logo">
      <a href="index.html" class="logo-mark">
        <div class="logo-icon">Σ</div>
        <div class="logo-text">ContaSNC<span>Sistema de Contabilidade</span></div>
      </a>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">Principal</div>
      ${navHTML}
    </nav>

    <div style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08)">
      <button
        class="theme-toggle theme-toggle-btn"
        onclick="toggleTheme()"
        aria-pressed="${isDark}"
        title="Alternar modo claro/escuro"
      >
        <div class="toggle-track"></div>
        <span class="theme-toggle-label">${isDark ? 'Modo Escuro' : 'Modo Claro'}</span>
        <span style="margin-left:auto;font-size:14px">${isDark ? '🌙' : '☀️'}</span>
      </button>
    </div>

    <div class="sidebar-footer">
      <div style="color:rgba(255,255,255,0.45);font-size:11px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${nomeEmp}">${nomeEmp}</div>
      Exercício <strong style="color:rgba(255,255,255,0.85)">${exercicio}</strong>
      &nbsp;·&nbsp;
      <a href="empresas.html" style="color:var(--gold);font-size:11px;text-decoration:none">trocar</a>
    </div>
  `;
}
