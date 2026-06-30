// assets/js/modules/admin.js
import { isAdmin, listarTodasEmpresasAdmin, listarLixeira, restaurarDaLixeira, eliminarDaLixeiraDefinitivo, entrarNaEmpresa, getTaxasIva, setTaxasIva, TAXAS_IVA_PADRAO } from './tenant.js';
import { initTabs, showToast, fmtDate } from './ui-utils.js';

let _todasEmpresas = [];

export function render() {
    return `
    <div class="page-shell">
    <div class="page-shell-wide">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
            <div class="adm-logo" style="display:flex;align-items:center;gap:14px">
                <div style="width:48px;height:48px;background:var(--navy);border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:24px;color:var(--gold);flex-shrink:0">⚙</div>
                <div>
                    <h1 style="font-family:'DM Serif Display',serif;font-size:26px;color:var(--navy);line-height:1.1;margin:0">Administração</h1>
                    <p style="font-size:12px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0">Visão global — todos os utilizadores</p>
                </div>
            </div>
            <div style="display:flex;gap:8px">
                <a href="#" onclick="window.router.navigate('empresas');return false;" class="btn btn-outline btn-sm">← Voltar às Minhas Empresas</a>
                <button class="btn btn-outline btn-sm" onclick="window._adminSair()">⎋ Sair</button>
            </div>
        </div>

        <div class="stats-grid" id="adm-stats" style="margin-bottom:28px"></div>

        <div class="tabs" id="adm-tabs">
            <button class="tab-btn" data-tab="tab-todas-empresas">Todas as Empresas</button>
            <button class="tab-btn" data-tab="tab-lixeira">Lixeira (Backups)</button>
            <button class="tab-btn" data-tab="tab-taxas-iva">Taxas de IVA</button>
        </div>

        <div class="tab-panel" data-panel="tab-todas-empresas">
            <div class="card" style="margin-bottom:20px">
                <div class="card-body" style="padding:16px 20px">
                    <input type="text" class="form-input" id="filtro-busca" placeholder="Pesquisar por nome, NIF ou email do utilizador…"/>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><div><h2>Empresas de Todos os Utilizadores</h2><p id="adm-count-label">— empresas</p></div></div>
                <table class="data-table" id="tbl-adm-empresas">
                    <thead><tr><th>Empresa</th><th>NIF</th><th>Exercício</th><th>Dono (uid)</th><th>Criada em</th><th></th></tr></thead>
                    <tbody id="tbody-adm-empresas"></tbody>
                </table>
                <div id="sem-adm-empresas" hidden style="padding:24px;font-size:13px;color:var(--muted);text-align:center">Sem empresas registadas.</div>
            </div>
        </div>

        <div class="tab-panel" data-panel="tab-lixeira" hidden>
            <div class="alert alert-gold" style="margin-bottom:20px">
                <span class="alert-icon">⚠</span>
                <div>Empresas eliminadas ficam guardadas aqui antes de serem apagadas em definitivo. Pode restaurá-las para o utilizador original, ou eliminá-las de forma permanente.</div>
            </div>
            <div class="card">
                <div class="card-header"><div><h2>Empresas Eliminadas</h2><p id="lix-count-label">— na lixeira</p></div></div>
                <table class="data-table" id="tbl-lixeira">
                    <thead><tr><th>Empresa</th><th>NIF</th><th>Dono original</th><th>Eliminada em</th><th></th></tr></thead>
                    <tbody id="tbody-lixeira"></tbody>
                </table>
                <div id="sem-lixeira" hidden style="padding:24px;font-size:13px;color:var(--muted);text-align:center">Lixeira vazia.</div>
            </div>
        </div>

        <div class="tab-panel" data-panel="tab-taxas-iva" hidden>
            <div class="alert alert-gold" style="margin-bottom:20px">
                <span class="alert-icon">ℹ</span>
                <div>Estas taxas são usadas na faturação de todas as empresas. Altere apenas quando o Governo publicar novos valores em Diário da República.</div>
            </div>
            <div class="card">
                <div class="card-header">
                    <div><h2>Taxas de IVA em Vigor</h2><p>Portaria 302/2016 — valores em percentagem (%)</p></div>
                    <button class="btn btn-gold btn-sm" onclick="window._adminSalvarTaxas()">Guardar Taxas</button>
                </div>
                <div style="overflow-x:auto">
                    <table class="data-table" id="tbl-taxas-iva">
                        <thead>
                            <tr>
                                <th style="width:160px">Taxa</th>
                                <th>Continente</th>
                                <th>Madeira</th>
                                <th>Açores</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-taxas-iva"></tbody>
                    </table>
                </div>
                <div style="padding:12px 20px;font-size:12px;color:var(--muted)">
                    <strong>Taxas padrão:</strong>
                    Continente 23/13/6% · Madeira 22/12/5% · Açores 16/9/4%
                    &nbsp;—&nbsp;
                    <a href="#" onclick="window._adminRestaurarTaxas();return false;" style="color:var(--gold)">Restaurar valores padrão</a>
                </div>
            </div>
        </div>

    </div>
    </div>

    <div id="sem-acesso" class="sem-acesso hidden" style="text-align:center;padding:60px 20px">
        <h1 style="font-family:'DM Serif Display',serif;font-size:24px;color:var(--danger);margin-bottom:10px">Acesso Restrito</h1>
        <p style="color:var(--muted);margin-bottom:20px">Esta área é exclusiva a administradores.</p>
        <a href="#" onclick="window.router.navigate('empresas');return false;" class="btn btn-gold">← Voltar</a>
    </div>
    `;
}

async function renderStatsGlobais() {
    const [empresas, lixeira] = await Promise.all([listarTodasEmpresasAdmin(), listarLixeira()]);
    _todasEmpresas = empresas;
    const utilizadores = new Set(empresas.map(e => e.donoUid)).size;

    document.getElementById('adm-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total de Empresas</div><div class="stat-value">${empresas.length}</div><div class="stat-sub">ativas</div></div>
    <div class="stat-card slate"><div class="stat-label">Utilizadores com Empresas</div><div class="stat-value">${utilizadores}</div><div class="stat-sub">distintos</div></div>
    <div class="stat-card danger"><div class="stat-label">Na Lixeira</div><div class="stat-value">${lixeira.length}</div><div class="stat-sub">backups disponíveis</div></div>
  `;
}

window._adminFiltrar = function() {
    const filtro = (document.getElementById('filtro-busca').value || '').toLowerCase().trim();
    let lista = _todasEmpresas;
    if (filtro) {
        lista = lista.filter(e =>
            (e.nome || '').toLowerCase().includes(filtro) ||
            (e.nif || '').toLowerCase().includes(filtro) ||
            (e.donoUid || '').toLowerCase().includes(filtro)
        );
    }

    document.getElementById('adm-count-label').textContent = `${lista.length} de ${_todasEmpresas.length} empresas`;
    const tbody = document.getElementById('tbody-adm-empresas');
    const semEl = document.getElementById('sem-adm-empresas');

    if (lista.length === 0) { tbody.innerHTML = ''; semEl.hidden = false; return; }
    semEl.hidden = true;

    tbody.innerHTML = lista.map(e => `
    <tr>
      <td style="font-weight:600">${e.nome}</td>
      <td class="mono" style="font-size:12px">${e.nif || '—'}</td>
      <td>${e.exercicio || '—'}</td>
      <td class="mono" style="font-size:11px;color:var(--muted)" title="${e.donoUid}">${e.donoUid.slice(0, 12)}…</td>
      <td>${fmtDate(e.criadaEm)}</td>
      <td>
        <button class="btn btn-gold btn-sm" onclick="window._adminEntrarNaEmpresa('${e.id}','${e.donoUid}')">Entrar →</button>
      </td>
    </tr>`).join('');
};

window._adminEntrarNaEmpresa = function(empresaId, donoUid) {
    entrarNaEmpresa(empresaId, donoUid);
    showToast('A entrar na empresa…', 'info');
    setTimeout(() => { window.router.navigate('painel'); }, 400);
};

async function renderLixeira() {
    const lixeira = await listarLixeira();
    document.getElementById('lix-count-label').textContent = `${lixeira.length} na lixeira`;
    const tbody = document.getElementById('tbody-lixeira');
    const semEl = document.getElementById('sem-lixeira');

    if (lixeira.length === 0) { tbody.innerHTML = ''; semEl.hidden = false; return; }
    semEl.hidden = true;

    tbody.innerHTML = lixeira.map(item => `
    <tr>
      <td style="font-weight:600">${item.empresa.nome}</td>
      <td class="mono" style="font-size:12px">${item.empresa.nif || '—'}</td>
      <td class="mono" style="font-size:11px;color:var(--muted)" title="${item.donoUid}">${item.donoUid.slice(0, 12)}…</td>
      <td>${fmtDate(item.eliminadaEm)}</td>
      <td style="display:flex;gap:6px;justify-content:flex-end">
        <button class="btn btn-outline btn-sm" onclick="window._adminRestaurar('${item.id}')">↺ Restaurar</button>
        <button class="btn btn-sm" style="background:rgba(176,58,46,0.1);color:var(--danger);border:1px solid rgba(176,58,46,0.2)" onclick="window._adminApagarDefinitivo('${item.id}')">✕ Apagar definitivo</button>
      </td>
    </tr>`).join('');
}

window._adminRestaurar = async function(empresaId) {
    if (!confirm('Restaurar esta empresa para o utilizador original?')) return;
    const resultado = await restaurarDaLixeira(empresaId);
    if (resultado) {
        showToast(`Empresa "${resultado.nome}" restaurada com sucesso`, 'success');
        await renderStatsGlobais();
        window._adminFiltrar();
        await renderLixeira();
    } else {
        showToast('Não foi possível restaurar — backup não encontrado', 'danger');
    }
};

window._adminApagarDefinitivo = async function(empresaId) {
    if (!confirm('Apagar este backup PERMANENTEMENTE? Esta ação não pode ser revertida.')) return;
    await eliminarDaLixeiraDefinitivo(empresaId);
    showToast('Backup apagado em definitivo', 'warning');
    await renderStatsGlobais();
    await renderLixeira();
};

async function renderTaxasIva() {
    const taxas = await getTaxasIva();
    const regioes = ['continente', 'madeira', 'acores'];
    const linhas = [
        { chave: 'normal',     label: 'Taxa Normal' },
        { chave: 'intermedia', label: 'Taxa Intermédia' },
        { chave: 'reduzida',   label: 'Taxa Reduzida' },
    ];
    document.getElementById('tbody-taxas-iva').innerHTML = linhas.map(l => `
    <tr>
      <td style="font-weight:600">${l.label}</td>
      ${regioes.map(r => {
          const val = (taxas[r] || {})[l.chave] ?? (TAXAS_IVA_PADRAO[r] || {})[l.chave] ?? '';
          return `<td><input type="number" class="form-input" id="taxa-${r}-${l.chave}" value="${val}" min="0" max="99" step="0.01" style="width:90px;text-align:right;font-family:monospace"/> %</td>`;
      }).join('')}
    </tr>`).join('');
}

window._adminSalvarTaxas = async function() {
    const regioes = ['continente', 'madeira', 'acores'];
    const linhas = ['normal', 'intermedia', 'reduzida'];
    const dados = {};
    for (const r of regioes) {
        dados[r] = {};
        for (const l of linhas) {
            const el = document.getElementById(`taxa-${r}-${l}`);
            dados[r][l] = parseFloat(el ? el.value : 0) || 0;
        }
    }
    try {
        await setTaxasIva(dados);
        showToast('Taxas de IVA guardadas com sucesso', 'success');
    } catch (e) {
        showToast('Erro ao guardar taxas: ' + e.message, 'danger');
    }
};

window._adminRestaurarTaxas = async function() {
    if (!confirm('Repor as taxas de IVA para os valores padrão?')) return;
    await setTaxasIva({ ...TAXAS_IVA_PADRAO });
    await renderTaxasIva();
    showToast('Taxas de IVA repostas para os valores padrão', 'info');
};

window._adminSair = async function() {
    if (!confirm('Terminar sessão?')) return;
    const { auth } = await import('../app.js');
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const { limparEmpresaAtiva } = await import('./tenant.js');
    limparEmpresaAtiva();
    await signOut(auth);
};

export async function init() {
    const admin = await isAdmin();
    if (!admin) {
        document.getElementById('sem-acesso').classList.remove('hidden');
        return;
    }

    initTabs();
    document.getElementById('filtro-busca').addEventListener('input', window._adminFiltrar);

    await renderStatsGlobais();
    window._adminFiltrar();
    await renderLixeira();
    await renderTaxasIva();
}
