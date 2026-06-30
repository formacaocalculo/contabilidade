// assets/js/modules/lancamentos.js
import { getLancamentos, addLancamento, editLancamento, deleteLancamento, getDiarios, getContas, empresaAtivaId, today } from './tenant.js';
import { renderLayout, initLayout } from './layout.js';
import { openModal, closeModal, initModais, initTableSearch, showToast, fmtEUR, fmtDate } from './ui-utils.js';

let S = { empresaId: null, todosLancs: [] };

export function render() {
    const conteudo = `
    <div class="page-hero">
      <h1>Lançamentos Contabilísticos</h1>
      <p>Registe movimentos com cálculo automático de IVA e retenções na fonte.</p>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-body" style="padding:16px 20px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="margin:0;flex:1;min-width:160px">
            <label class="form-label">Pesquisar</label>
            <input type="text" class="form-input" data-search="tbl-lanc" placeholder="Descrição, documento…"/>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Diário</label>
            <select class="form-select" id="filtro-diario">
              <option value="">Todos</option>
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Estado</label>
            <select class="form-select" id="filtro-estado">
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="conferido">Conferido</option>
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">De</label>
            <input type="date" class="form-input" id="filtro-de"/>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Até</label>
            <input type="date" class="form-input" id="filtro-ate"/>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div><h2>Diário de Lançamentos</h2><p id="lanc-count-label">— lançamentos</p></div>
      </div>
      <table class="data-table" id="tbl-lanc">
        <thead>
          <tr><th>Data</th><th>Diário</th><th>Documento</th><th>Descrição</th><th>Déb.</th><th>Créd.</th><th class="amount">Base</th><th>IVA</th><th class="amount">Total</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody id="tbody-lanc"></tbody>
      </table>
      <div id="sem-lanc" hidden style="padding:24px;font-size:13px;color:var(--muted);text-align:center">
        Sem lançamentos registados para os filtros selecionados.
      </div>
    </div>

    <div id="modal-lancamento" class="modal" hidden style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center">
      <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>
      <div style="position:relative;background:var(--white);border-radius:12px;padding:32px;width:580px;max-width:96vw;max-height:92vh;overflow-y:auto;box-shadow:var(--shadow-lg)">
        <h2 id="modal-lanc-title" style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--navy);margin-bottom:4px">Novo Lançamento</h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:20px">IVA e total calculados automaticamente.</p>
        <input type="hidden" id="edit-lanc-id"/>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data *</label>
            <input type="date" class="form-input" id="nl-data"/>
          </div>
          <div class="form-group">
            <label class="form-label">Diário *</label>
            <select class="form-select" id="nl-diario"></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">N.º Documento</label>
            <input class="form-input" id="nl-doc" placeholder="FT2026/001"/>
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-select" id="nl-estado">
              <option value="pendente">Pendente</option>
              <option value="conferido">Conferido</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descrição *</label>
          <input class="form-input" id="nl-desc" placeholder="Descrição do movimento"/>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Conta a Débito</label>
            <input class="form-input" id="nl-debito" placeholder="Ex: 211" list="lista-contas"/>
          </div>
          <div class="form-group">
            <label class="form-label">Conta a Crédito</label>
            <input class="form-input" id="nl-credito" placeholder="Ex: 721" list="lista-contas"/>
          </div>
        </div>
        <datalist id="lista-contas"></datalist>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Valor Base (€) *</label>
            <input type="number" class="form-input" id="nl-base" placeholder="0.00" step="0.01" min="0"/>
          </div>
          <div class="form-group">
            <label class="form-label">Taxa IVA</label>
            <select class="form-select" id="nl-iva">
              <option value="0">Isento / 0%</option>
              <option value="6">Reduzida 6%</option>
              <option value="13">Intermédia 13%</option>
              <option value="23" selected>Normal 23%</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Retenção na Fonte (%)</label>
            <input type="number" class="form-input" id="nl-retencao" placeholder="0" min="0" max="25" step="0.5"/>
          </div>
        </div>
        <div id="calc-preview" style="background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-bottom:18px;display:none">
          <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Resumo Calculado</div>
          <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:13px">
            <div><div style="color:var(--muted);font-size:11px">Base</div><div id="p-base" style="font-weight:600">—</div></div>
            <div><div style="color:var(--muted);font-size:11px">IVA</div><div id="p-iva" style="font-weight:600;color:var(--danger)">—</div></div>
            <div><div style="color:var(--muted);font-size:11px">Retenção</div><div id="p-ret" style="font-weight:600;color:var(--slate)">—</div></div>
            <div><div style="color:var(--muted);font-size:11px">Total a Pagar/Receber</div><div id="p-total" style="font-weight:700;color:var(--navy);font-size:16px">—</div></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline" onclick="window._lancFechar()">Cancelar</button>
          <button class="btn btn-gold" onclick="window._lancGuardar()">Registar</button>
        </div>
      </div>
    </div>
    `;

    return renderLayout({
        rotaAtiva: 'lancamentos',
        breadcrumb: 'Lançamentos',
        acoesTopbar: `<button class="btn btn-gold btn-sm" onclick="window._lancAbrirNovo()">+ Novo Lançamento</button>`,
        conteudo,
    });
}

async function renderLancamentos() {
    S.todosLancs = await getLancamentos(S.empresaId);
    const fDiario = document.getElementById('filtro-diario').value;
    const fEstado = document.getElementById('filtro-estado').value;
    const fDe = document.getElementById('filtro-de').value;
    const fAte = document.getElementById('filtro-ate').value;

    let lista = S.todosLancs;
    if (fDiario) lista = lista.filter((l) => l.diario === fDiario);
    if (fEstado) lista = lista.filter((l) => l.estado === fEstado);
    if (fDe) lista = lista.filter((l) => l.data >= fDe);
    if (fAte) lista = lista.filter((l) => l.data <= fAte);

    document.getElementById('lanc-count-label').textContent = `${lista.length} lançamentos`;
    const tbody = document.getElementById('tbody-lanc');
    const semEl = document.getElementById('sem-lanc');

    if (lista.length === 0) { tbody.innerHTML = ''; semEl.hidden = false; return; }
    semEl.hidden = true;
    tbody.innerHTML = lista.map((l) => `
    <tr>
      <td>${fmtDate(l.data)}</td>
      <td><span class="badge badge-slate">${l.diario}</span></td>
      <td class="mono" style="font-size:12px">${l.documento || '—'}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${l.descricao}">${l.descricao || '—'}</td>
      <td><span class="account-code" style="font-size:11px">${l.contaDebito || '—'}</span></td>
      <td><span class="account-code" style="font-size:11px">${l.contaCredito || '—'}</span></td>
      <td class="amount">${fmtEUR(l.valorBase)}</td>
      <td>${l.taxaIva > 0 ? `<span class="badge badge-muted">${l.taxaIva}%</span>` : '—'}</td>
      <td class="amount" style="font-weight:700">${fmtEUR(l.valorTotal || l.valorBase)}</td>
      <td><span class="badge ${l.estado === 'conferido' ? 'badge-green' : 'badge-gold'}">${l.estado === 'conferido' ? 'Conf.' : 'Pend.'}</span></td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-outline btn-sm" onclick="window._lancEditar('${l.id}')">✏</button>
        <button class="btn btn-sm" style="background:rgba(176,58,46,0.1);color:var(--danger);border:1px solid rgba(176,58,46,0.2)" onclick="window._lancApagar('${l.id}')">✕</button>
      </td>
    </tr>`).join('');
}

window._lancFechar = function() { closeModal('modal-lancamento'); };

window._lancAbrirNovo = function() {
    document.getElementById('modal-lanc-title').textContent = 'Novo Lançamento';
    document.getElementById('edit-lanc-id').value = '';
    document.getElementById('nl-data').value = today();
    document.getElementById('nl-doc').value = '';
    document.getElementById('nl-desc').value = '';
    document.getElementById('nl-debito').value = '';
    document.getElementById('nl-credito').value = '';
    document.getElementById('nl-base').value = '';
    document.getElementById('nl-iva').value = '23';
    document.getElementById('nl-retencao').value = '';
    document.getElementById('nl-estado').value = 'pendente';
    document.getElementById('calc-preview').style.display = 'none';
    openModal('modal-lancamento');
};

window._lancEditar = function(id) {
    const l = S.todosLancs.find((x) => x.id === id);
    if (!l) return;
    document.getElementById('modal-lanc-title').textContent = 'Editar Lançamento';
    document.getElementById('edit-lanc-id').value = id;
    document.getElementById('nl-data').value = l.data;
    document.getElementById('nl-diario').value = l.diario;
    document.getElementById('nl-doc').value = l.documento || '';
    document.getElementById('nl-desc').value = l.descricao || '';
    document.getElementById('nl-debito').value = l.contaDebito || '';
    document.getElementById('nl-credito').value = l.contaCredito || '';
    document.getElementById('nl-base').value = l.valorBase || '';
    document.getElementById('nl-iva').value = l.taxaIva || 0;
    document.getElementById('nl-retencao').value = l.retencao || '';
    document.getElementById('nl-estado').value = l.estado || 'pendente';
    _calcIVALive();
    openModal('modal-lancamento');
};

function _calcIVALive() {
    const base = parseFloat(document.getElementById('nl-base').value) || 0;
    const taxa = parseFloat(document.getElementById('nl-iva').value) || 0;
    const ret = parseFloat(document.getElementById('nl-retencao').value) || 0;
    const prev = document.getElementById('calc-preview');
    if (base > 0) {
        const iva = base * taxa / 100;
        const retVal = base * ret / 100;
        const total = base + iva - retVal;
        document.getElementById('p-base').textContent = fmtEUR(base);
        document.getElementById('p-iva').textContent = fmtEUR(iva);
        document.getElementById('p-ret').textContent = ret > 0 ? `-${fmtEUR(retVal)}` : '—';
        document.getElementById('p-total').textContent = fmtEUR(total);
        prev.style.display = 'block';
    } else {
        prev.style.display = 'none';
    }
}

window._lancGuardar = async function() {
    const desc = document.getElementById('nl-desc').value.trim();
    const base = parseFloat(document.getElementById('nl-base').value) || 0;
    if (!desc) { showToast('A descrição é obrigatória', 'danger'); return; }
    if (base <= 0) { showToast('O valor base deve ser maior que 0', 'danger'); return; }
    const taxa = parseFloat(document.getElementById('nl-iva').value) || 0;
    const ret = parseFloat(document.getElementById('nl-retencao').value) || 0;
    const iva = base * taxa / 100;
    const retVal = base * ret / 100;
    const dados = {
        data: document.getElementById('nl-data').value,
        diario: document.getElementById('nl-diario').value,
        documento: document.getElementById('nl-doc').value.trim(),
        descricao: desc,
        contaDebito: document.getElementById('nl-debito').value.trim(),
        contaCredito: document.getElementById('nl-credito').value.trim(),
        valorBase: base,
        taxaIva: taxa,
        valorIva: iva,
        retencao: ret,
        valorTotal: base + iva - retVal,
        estado: document.getElementById('nl-estado').value,
    };
    const editId = document.getElementById('edit-lanc-id').value;
    if (editId) {
        await editLancamento(S.empresaId, editId, dados);
        showToast('Lançamento atualizado', 'success');
    } else {
        await addLancamento(S.empresaId, dados);
        showToast('Lançamento registado', 'success');
    }
    closeModal('modal-lancamento');
    await renderLancamentos();
};

window._lancApagar = async function(id) {
    if (!confirm('Apagar este lançamento? Não pode ser revertido.')) return;
    await deleteLancamento(S.empresaId, id);
    showToast('Lançamento apagado', 'warning');
    await renderLancamentos();
};

export async function init() {
    S.empresaId = empresaAtivaId();
    const emp = await initLayout();
    if (!emp) { window.router.navigate('empresas'); return; }

    initModais();
    initTableSearch();

    document.getElementById('nl-data').value = today();

    const diarios = await getDiarios(S.empresaId);
    const selDiario = document.getElementById('nl-diario');
    const filtDiario = document.getElementById('filtro-diario');
    diarios.forEach((d) => {
        selDiario.innerHTML += `<option value="${d.codigo}">${d.nome} (${d.codigo})</option>`;
        filtDiario.innerHTML += `<option value="${d.codigo}">${d.nome}</option>`;
    });

    const dl = document.getElementById('lista-contas');
    const contas = await getContas(S.empresaId);
    contas.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.codigo;
        opt.label = c.designacao;
        dl.appendChild(opt);
    });

    const params = window.router.paramsAtuais();
    if (params && params.diario) filtDiario.value = params.diario;

    ['filtro-diario', 'filtro-estado', 'filtro-de', 'filtro-ate'].forEach((id) => {
        document.getElementById(id).addEventListener('change', renderLancamentos);
    });
    document.getElementById('nl-base').addEventListener('input', _calcIVALive);
    document.getElementById('nl-iva').addEventListener('change', _calcIVALive);
    document.getElementById('nl-retencao').addEventListener('input', _calcIVALive);

    await renderLancamentos();
}
