// assets/js/modules/plano-contas.js
import { getContas, addConta, editConta, deleteConta, empresaAtivaId } from './tenant.js';
import { renderLayout, initLayout } from './layout.js';
import { openModal, closeModal, initModais, initTableSearch, showToast } from './ui-utils.js';

let S = { empresaId: null, contas: [] };

export function render() {
    const conteudo = `
    <div class="page-hero">
      <h1>Plano de Contas SNC</h1>
      <p>Pré-configurado com o Sistema de Normalização Contabilística em vigor. Adicione subcontas específicas.</p>
    </div>
    <div class="alert alert-gold">
      <span class="alert-icon">ℹ</span>
      <div>Contas SNC base não podem ser eliminadas. Pode criar subcontas personalizadas a partir do nível 3. As alterações são guardadas automaticamente.</div>
    </div>
    <div class="card">
      <div class="card-header">
        <div><h2>Contas do Plano</h2><p id="total-contas-label">— contas configuradas</p></div>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" class="form-input" style="width:200px" placeholder="Pesquisar…" data-search="tbl-contas"/>
          <select class="form-select" style="width:150px" id="filtro-classe">
            <option value="">Todas as classes</option>
            <option value="1">Classe 1 — Meios Financeiros</option>
            <option value="2">Classe 2 — Contas a Receber/Pagar</option>
            <option value="3">Classe 3 — Inventários</option>
            <option value="4">Classe 4 — Investimentos</option>
            <option value="5">Classe 5 — Capital Próprio</option>
            <option value="6">Classe 6 — Gastos</option>
            <option value="7">Classe 7 — Rendimentos</option>
            <option value="8">Classe 8 — Resultados</option>
          </select>
        </div>
      </div>
      <table class="data-table" id="tbl-contas">
        <thead><tr><th>Código</th><th>Designação</th><th>Tipo</th><th>Natureza</th><th>Origem</th><th></th></tr></thead>
        <tbody id="tbody-contas"></tbody>
      </table>
    </div>

    <div id="modal-conta" class="modal" hidden style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center">
      <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>
      <div style="position:relative;background:var(--white);border-radius:12px;padding:32px;width:480px;max-width:96vw;box-shadow:var(--shadow-lg)">
        <h2 id="modal-conta-title" style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--navy);margin-bottom:4px">Nova Conta</h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:22px">Adicione uma conta ou subconta ao plano.</p>
        <input type="hidden" id="edit-conta-codigo"/>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Código *</label>
            <input class="form-input" id="nc-codigo" placeholder="Ex: 2111"/>
          </div>
          <div class="form-group">
            <label class="form-label">Conta Mãe</label>
            <input class="form-input" id="nc-mae" placeholder="Ex: 211"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Designação *</label>
          <input class="form-input" id="nc-designacao" placeholder="Nome da conta"/>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-select" id="nc-tipo">
              <option value="Subconta">Subconta</option>
              <option value="Conta">Conta</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Natureza</label>
            <select class="form-select" id="nc-natureza">
              <option>Ativo</option><option>Passivo</option><option>Capital</option>
              <option>Gasto</option><option>Rendimento</option><option>Misto</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
          <button class="btn btn-outline" onclick="window._closeModal('modal-conta')">Cancelar</button>
          <button class="btn btn-gold" onclick="window._planoContasGuardar()">Guardar</button>
        </div>
      </div>
    </div>
    `;

    return renderLayout({
        rotaAtiva: 'plano-contas',
        breadcrumb: 'Plano de Contas',
        acoesTopbar: `<button class="btn btn-gold btn-sm" onclick="window._openModal('modal-conta')">+ Nova Conta</button>`,
        conteudo,
    });
}

async function renderContas(filtroClasse = '') {
    S.contas = await getContas(S.empresaId);
    const filtradas = filtroClasse ? S.contas.filter((c) => c.codigo.startsWith(filtroClasse)) : S.contas;
    document.getElementById('total-contas-label').textContent = `${S.contas.length} contas configuradas`;

    const naturezaCores = {
        Ativo: 'badge-green', Passivo: 'badge-danger', Capital: 'badge-slate',
        Gasto: 'badge-danger', Rendimento: 'badge-green', Misto: 'badge-gold',
    };

    document.getElementById('tbody-contas').innerHTML = filtradas.map((c) => {
        const indent = c.nivel > 1 ? `padding-left:${(c.nivel - 1) * 18}px` : '';
        const bold = c.nivel === 1 ? 'font-weight:700' : '';
        const cor = naturezaCores[c.natureza] || 'badge-muted';
        const podeApagar = c.personalizada;
        return `
      <tr>
        <td><span class="account-code">${c.codigo}</span></td>
        <td><span style="${indent};${bold}">${c.designacao}</span></td>
        <td><span class="badge badge-muted">${c.tipo}</span></td>
        <td><span class="badge ${cor}">${c.natureza}</span></td>
        <td>${c.personalizada ? '<span class="badge badge-gold">Personalizada</span>' : '<span style="font-size:11px;color:var(--muted)">SNC Base</span>'}</td>
        <td style="display:flex;gap:4px;justify-content:flex-end">
          <button class="btn btn-outline btn-sm" onclick="window._planoContasEditar('${c.codigo}')">✏</button>
          ${podeApagar ? `<button class="btn btn-sm" style="background:rgba(176,58,46,0.1);color:var(--danger);border:1px solid rgba(176,58,46,0.2)" onclick="window._planoContasApagar('${c.codigo}')">✕</button>` : ''}
        </td>
      </tr>`;
    }).join('');
}

window._openModal = openModal;
window._closeModal = closeModal;

window._planoContasEditar = function(codigo) {
    const c = S.contas.find((x) => x.codigo === codigo);
    if (!c) return;
    document.getElementById('modal-conta-title').textContent = 'Editar Conta';
    document.getElementById('edit-conta-codigo').value = codigo;
    document.getElementById('nc-codigo').value = c.codigo;
    document.getElementById('nc-mae').value = c.mae || '';
    document.getElementById('nc-designacao').value = c.designacao;
    document.getElementById('nc-tipo').value = c.tipo;
    document.getElementById('nc-natureza').value = c.natureza;
    openModal('modal-conta');
};

window._planoContasGuardar = async function() {
    const editCodigo = document.getElementById('edit-conta-codigo').value;
    const codigo = document.getElementById('nc-codigo').value.trim();
    const desig = document.getElementById('nc-designacao').value.trim();
    if (!codigo || !desig) { showToast('Código e designação são obrigatórios', 'danger'); return; }
    const dados = {
        codigo, designacao: desig,
        mae: document.getElementById('nc-mae').value.trim(),
        tipo: document.getElementById('nc-tipo').value,
        natureza: document.getElementById('nc-natureza').value,
        nivel: codigo.length,
        movimentos: true,
    };
    if (editCodigo) {
        await editConta(S.empresaId, editCodigo, dados);
        showToast('Conta atualizada', 'success');
    } else {
        const ok = await addConta(S.empresaId, dados);
        if (ok === false) { showToast('Código já existe', 'danger'); return; }
        showToast(`Conta ${codigo} criada`, 'success');
    }
    document.getElementById('edit-conta-codigo').value = '';
    document.getElementById('modal-conta-title').textContent = 'Nova Conta';
    closeModal('modal-conta');
    await renderContas(document.getElementById('filtro-classe').value);
};

window._planoContasApagar = async function(codigo) {
    if (!confirm(`Apagar conta ${codigo}? Esta ação não pode ser revertida.`)) return;
    const ok = await deleteConta(S.empresaId, codigo);
    if (ok === false) { showToast('Não é possível apagar contas SNC base', 'danger'); return; }
    showToast('Conta apagada', 'warning');
    await renderContas(document.getElementById('filtro-classe').value);
};

export async function init() {
    S.empresaId = empresaAtivaId();
    const emp = await initLayout();
    if (!emp) { window.router.navigate('empresas'); return; }

    initModais();
    initTableSearch();

    document.getElementById('filtro-classe').addEventListener('change', (e) => renderContas(e.target.value));

    await renderContas();
}
