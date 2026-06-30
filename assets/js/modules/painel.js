// assets/js/modules/painel.js
import { empresaAtiva, statsEmpresa, getLancamentos, getDiarios, getContas } from './tenant.js';
import { renderLayout, initLayout } from './layout.js';
import { fmtEUR, fmtDate } from './ui-utils.js';

export function render() {
    const conteudo = `
    <div class="page-hero">
      <h1 id="painel-titulo">Painel de Controlo</h1>
      <p id="painel-sub">Visão geral do exercício contabilístico.</p>
    </div>

    <div class="stats-grid" id="stats-grid"></div>

    <div class="two-col">
      <div class="card">
        <div class="card-header">
          <div><h2>Módulos</h2><p>Acesso rápido a todos os módulos</p></div>
        </div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:10px" id="modulos-list"></div>
        </div>
      </div>

      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header">
            <div><h2>Últimos Lançamentos</h2><p>Os 5 mais recentes</p></div>
            <a href="#" onclick="window.router.navigate('lancamentos');return false;" class="btn btn-outline btn-sm">Ver todos →</a>
          </div>
          <div id="ultimos-lanc" style="padding:0 0 4px"></div>
        </div>

        <div class="card">
          <div class="card-header">
            <div><h2>Calendário Fiscal</h2><p id="regime-label"></p></div>
          </div>
          <div class="card-body" id="calendario-fiscal"></div>
        </div>
      </div>
    </div>
    `;

    return renderLayout({ rotaAtiva: 'painel', breadcrumb: '', conteudo });
}

export async function init() {
    const emp = await initLayout();
    if (!emp) { window.router.navigate('empresas'); return; }

    document.getElementById('painel-titulo').textContent = emp.nome;
    document.getElementById('painel-sub').textContent = `Exercício ${emp.exercicio} · NIF ${emp.nif || '—'} · Regime ${emp.regime}`;

    const [stats, lancs, diarios, contas] = await Promise.all([
        statsEmpresa(emp.id),
        getLancamentos(emp.id),
        getDiarios(emp.id),
        getContas(emp.id),
    ]);

    document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-label">Plano de Contas</div><div class="stat-value">${contas.length}</div><div class="stat-sub">contas SNC</div></div>
    <div class="stat-card green"><div class="stat-label">Lançamentos ${emp.exercicio}</div><div class="stat-value">${stats.totalLanc}</div><div class="stat-sub">registados</div></div>
    <div class="stat-card slate"><div class="stat-label">Diários Activos</div><div class="stat-value">${diarios.filter(d => d.ativo).length}</div><div class="stat-sub">configurados</div></div>
    <div class="stat-card danger"><div class="stat-label">IVA a Entregar</div><div class="stat-value">${fmtEUR(stats.ivaEntregar)}</div><div class="stat-sub">estimativa</div></div>
  `;

    const modulos = [
        { rota: 'plano-contas', emoji: '📋', titulo: 'Plano de Contas (SNC)', sub: 'Pré-configurado. Subcontas personalizáveis.' },
        { rota: 'diarios',      emoji: '📁', titulo: 'Gestão de Diários',     sub: 'Compras, Vendas, Bancos, OD e mais.' },
        { rota: 'lancamentos',  emoji: '✏️', titulo: 'Lançamentos',           sub: 'Manual com automatismos IVA e retenções.' },
        { rota: 'faturacao',    emoji: '🧮', titulo: 'Faturação',             sub: 'Faturas de venda, clientes e lançamento automático.' },
        { rota: 'iva',          emoji: '🧾', titulo: 'Processamento de IVA',  sub: 'Apuramento, SAF-T(PT) e Declaração.' },
    ];
    document.getElementById('modulos-list').innerHTML = modulos.map(m => `
    <a href="#" onclick="window.router.navigate('${m.rota}');return false;" style="text-decoration:none">
      <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius);background:var(--cream);transition:border-color .15s" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="width:38px;height:38px;background:var(--navy);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">${m.emoji}</div>
        <div><div style="font-weight:600;font-size:13px;color:var(--navy)">${m.titulo}</div><div style="font-size:11px;color:var(--muted);margin-top:1px">${m.sub}</div></div>
        <div style="margin-left:auto;color:var(--muted)">›</div>
      </div>
    </a>
  `).join('');

    const ultimos = lancs.slice(0, 5);
    if (ultimos.length === 0) {
        document.getElementById('ultimos-lanc').innerHTML = '<p style="padding:16px 24px;font-size:13px;color:var(--muted)">Sem lançamentos. <a href="#" onclick="window.router.navigate(\'lancamentos\');return false;">Registar o primeiro →</a></p>';
    } else {
        document.getElementById('ultimos-lanc').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Data</th><th>Diário</th><th>Descrição</th><th class="amount">Valor</th></tr></thead>
        <tbody>
          ${ultimos.map(l => `
            <tr>
              <td>${fmtDate(l.data)}</td>
              <td><span class="badge badge-slate">${l.diario}</span></td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.descricao || '—'}</td>
              <td class="amount">${fmtEUR(l.valorTotal || l.valorBase)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    }

    const regimeLabel = { mensal: 'Regime Mensal', trimestral: 'Regime Trimestral', isento: 'Isento de IVA' }[emp.regime] || emp.regime;
    document.getElementById('regime-label').textContent = regimeLabel;
    document.getElementById('calendario-fiscal').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <div><div style="font-size:13px;font-weight:600">Declaração Periódica IVA</div><div style="font-size:11px;color:var(--muted)">Período actual</div></div>
        <span class="badge badge-danger">15 do mês</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <div><div style="font-size:13px;font-weight:600">Pagamento IVA</div><div style="font-size:11px;color:var(--muted)">Após declaração</div></div>
        <span class="badge badge-danger">20 do mês</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0">
        <div><div style="font-size:13px;font-weight:600">Gerar SAF-T(PT)</div><div style="font-size:11px;color:var(--muted)">Obrigação mensal</div></div>
        <a href="#" onclick="window.router.navigate('iva');return false;" class="btn btn-outline btn-sm">Gerar</a>
      </div>
    </div>
  `;
}
