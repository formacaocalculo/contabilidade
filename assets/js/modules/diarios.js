// assets/js/modules/diarios.js
import { getDiarios, addDiario, editDiario, getLancamentos, empresaAtivaId } from './tenant.js';
import { renderLayout, initLayout } from './layout.js';
import { openModal, closeModal, initModais, showToast, fmtEUR, fmtDate } from './ui-utils.js';

let S = { empresaId: null, diarios: [] };
const DIARIO_EMOJIS = { Compras: '🛒', Vendas: '🏷️', Bancos: '🏦', Caixa: '💰', 'Operações Diversas': '📝', Salários: '👥', Outro: '📋' };

export function render() {
    const conteudo = `
    <div class="page-hero">
      <h1>Gestão de Diários</h1>
      <p>Organize os lançamentos por tipo de operação. Cada diário agrupa movimentos homogéneos.</p>
    </div>
    <div id="diarios-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:28px"></div>

    <div class="card">
      <div class="card-header">
        <div><h2>Últimos Movimentos</h2><p>Lançamentos mais recentes em todos os diários</p></div>
        <a href="#" onclick="window.router.navigate('lancamentos');return false;" class="btn btn-outline btn-sm">Ver todos →</a>
      </div>
      <table class="data-table" id="tbl-ultimos">
        <thead><tr><th>Data</th><th>Diário</th><th>Documento</th><th>Descrição</th><th class="amount">Valor</th><th>Estado</th></tr></thead>
        <tbody id="tbody-ultimos"></tbody>
      </table>
      <div id="sem-lancamentos" hidden style="padding:20px 24px;font-size:13px;color:var(--muted)">
        Sem lançamentos registados. <a href="#" onclick="window.router.navigate('lancamentos');return false;">Registar o primeiro →</a>
      </div>
    </div>

    <div id="modal-diario" class="modal" hidden style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center">
      <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>
      <div style="position:relative;background:var(--white);border-radius:12px;padding:32px;width:440px;max-width:96vw;box-shadow:var(--shadow-lg)">
        <h2 id="modal-diario-title" style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--navy);margin-bottom:4px">Novo Diário</h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:22px">Configure um novo diário contabilístico.</p>
        <input type="hidden" id="edit-diario-codigo"/>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Código *</label>
            <input class="form-input" id="nd-codigo" placeholder="Ex: PS" maxlength="5"/>
          </div>
          <div class="form-group">
            <label class="form-label">Nome *</label>
            <input class="form-input" id="nd-nome" placeholder="Ex: Prestações de Serviços"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="nd-tipo">
            <option>Compras</option><option>Vendas</option><option>Bancos</option>
            <option>Caixa</option><option>Operações Diversas</option><option>Salários</option><option>Outro</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
          <button class="btn btn-outline" onclick="window._diariosFechar()">Cancelar</button>
          <button class="btn btn-gold" onclick="window._diariosGuardar()">Guardar</button>
        </div>
      </div>
    </div>
    `;

    return renderLayout({
        rotaAtiva: 'diarios',
        breadcrumb: 'Diários',
        acoesTopbar: `<button class="btn btn-gold btn-sm" onclick="window._diariosAbrirNovo()">+ Novo Diário</button>`,
        conteudo,
    });
}

async function renderDiarios() {
    const [diarios, lancs] = await Promise.all([getDiarios(S.empresaId), getLancamentos(S.empresaId)]);
    S.diarios = diarios;
    const grid = document.getElementById('diarios-grid');

    const cards = diarios.map((d) => {
        const dLancs = lancs.filter((l) => l.diario === d.codigo);
        const ultimo = dLancs[0];
        const total = dLancs.reduce((s, l) => s + (l.valorTotal || l.valorBase || 0), 0);
        const emoji = DIARIO_EMOJIS[d.tipo] || '📋';
        return `
      <div class="card" style="margin-bottom:0">
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div style="width:44px;height:44px;background:var(--cream);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">${emoji}</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:15px;color:var(--navy)">${d.nome}</div>
              <div style="font-size:11px;color:var(--muted)">Diário ${d.codigo}</div>
            </div>
            <span class="badge ${d.ativo ? 'badge-green' : 'badge-muted'}">${d.ativo ? 'Aberto' : 'Fechado'}</span>
          </div>
          <div style="display:flex;gap:16px;margin-bottom:12px;font-size:13px">
            <div><div style="font-size:11px;color:var(--muted)">Lançamentos</div><div style="font-weight:700">${dLancs.length}</div></div>
            <div><div style="font-size:11px;color:var(--muted)">Último</div><div>${ultimo ? fmtDate(ultimo.data) : '—'}</div></div>
            <div><div style="font-size:11px;color:var(--muted)">Volume</div><div style="font-weight:600">${fmtEUR(total)}</div></div>
          </div>
          <div style="display:flex;gap:6px">
            <a href="#" onclick="window._diariosVerLancamentos('${d.codigo}');return false;" class="btn btn-outline btn-sm" style="flex:1;justify-content:center">Ver Lançamentos</a>
            <button class="btn btn-outline btn-sm" onclick="window._diariosEditar('${d.codigo}')">✏</button>
          </div>
        </div>
      </div>`;
    }).join('');

    grid.innerHTML = cards + `
    <div class="card" style="margin-bottom:0;border-style:dashed;box-shadow:none;background:rgba(247,245,240,0.5)">
      <div class="card-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:150px;gap:8px">
        <div style="font-size:28px;color:var(--border)">+</div>
        <div style="font-weight:600;font-size:13px;color:var(--muted)">Novo diário</div>
        <button class="btn btn-outline btn-sm" onclick="window._diariosAbrirNovo()">Adicionar</button>
      </div>
    </div>`;
}

async function renderUltimos() {
    const lancs = (await getLancamentos(S.empresaId)).slice(0, 8);
    const tbody = document.getElementById('tbody-ultimos');
    const semEl = document.getElementById('sem-lancamentos');
    if (lancs.length === 0) { tbody.innerHTML = ''; semEl.hidden = false; return; }
    semEl.hidden = true;
    tbody.innerHTML = lancs.map((l) => `
    <tr>
      <td>${fmtDate(l.data)}</td>
      <td><span class="badge badge-slate">${l.diario}</span></td>
      <td class="mono">${l.documento || '—'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.descricao || '—'}</td>
      <td class="amount">${fmtEUR(l.valorTotal || l.valorBase)}</td>
      <td><span class="badge ${l.estado === 'conferido' ? 'badge-green' : 'badge-gold'}">${l.estado === 'conferido' ? 'Conf.' : 'Pend.'}</span></td>
    </tr>`).join('');
}

window._diariosVerLancamentos = function(codigo) {
    window.router.navigate('lancamentos', { diario: codigo });
};

window._diariosAbrirNovo = function() {
    document.getElementById('modal-diario-title').textContent = 'Novo Diário';
    document.getElementById('edit-diario-codigo').value = '';
    document.getElementById('nd-codigo').value = '';
    document.getElementById('nd-nome').value = '';
    document.getElementById('nd-tipo').value = 'Compras';
    openModal('modal-diario');
};
window._diariosFechar = function() { closeModal('modal-diario'); };

window._diariosEditar = function(codigo) {
    const d = S.diarios.find((x) => x.codigo === codigo);
    if (!d) return;
    document.getElementById('modal-diario-title').textContent = 'Editar Diário';
    document.getElementById('edit-diario-codigo').value = codigo;
    document.getElementById('nd-codigo').value = d.codigo;
    document.getElementById('nd-nome').value = d.nome;
    document.getElementById('nd-tipo').value = d.tipo;
    openModal('modal-diario');
};

window._diariosGuardar = async function() {
    const editCod = document.getElementById('edit-diario-codigo').value;
    const codigo = document.getElementById('nd-codigo').value.trim().toUpperCase();
    const nome = document.getElementById('nd-nome').value.trim();
    if (!codigo || !nome) { showToast('Código e nome são obrigatórios', 'danger'); return; }
    const dados = { codigo, nome, tipo: document.getElementById('nd-tipo').value, ativo: true };
    if (editCod) {
        await editDiario(S.empresaId, editCod, dados);
        showToast('Diário atualizado', 'success');
    } else {
        const ok = await addDiario(S.empresaId, dados);
        if (ok === false) { showToast('Código de diário já existe', 'danger'); return; }
        showToast(`Diário ${nome} criado`, 'success');
    }
    document.getElementById('edit-diario-codigo').value = '';
    closeModal('modal-diario');
    await renderDiarios();
};

export async function init() {
    S.empresaId = empresaAtivaId();
    const emp = await initLayout();
    if (!emp) { window.router.navigate('empresas'); return; }

    initModais();
    await renderDiarios();
    await renderUltimos();
}
