// assets/js/modules/faturacao.js
import {
    getFaturas, addFatura, editFatura, deleteFatura, emitirFatura, marcarFaturaPaga, proximoNumeroFatura,
    getClientes, addCliente, editCliente, deleteCliente,
    getNotasCredito, addNotaCredito, anularNotaCredito, proximoNumeroCredito,
    getAplicacoesPorCredito, getAplicacoesPorFatura, aplicarCreditoEmFatura, removerAplicacaoCredito,
    empresaAtiva, empresaAtivaId, today,
    getTaxasPorRegiao, gerarSAFT, proximoNumeroFaturaSimplificada,
} from './tenant.js';
import { renderLayout, initLayout } from './layout.js';
import { openModal, closeModal, initModais, initTabs, initTableSearch, showToast, fmtEUR, fmtDate } from './ui-utils.js';

let empresaId, linhaSeq = 0;
let _linhasAtuais = [];
let _linhasCreditoAtuais = [];
let _faturasParaOrigem = [];
let _taxasRegiao = { normal: 23, intermedia: 13, reduzida: 6 };

const MOTIVOS_ISENCAO = [
    { code: 'M01', label: 'M01 — Art. 16.º n.º 6 do CIVA (não sujeição)' },
    { code: 'M04', label: 'M04 — Isento Art. 13.º do CIVA (exportações)' },
    { code: 'M05', label: 'M05 — Isento Art. 14.º do CIVA' },
    { code: 'M06', label: 'M06 — Isento Art. 15.º do CIVA' },
    { code: 'M07', label: 'M07 — Isento Art. 9.º do CIVA' },
    { code: 'M10', label: 'M10 — Regime de isenção Art. 53.º do CIVA' },
    { code: 'M16', label: 'M16 — Isento Art. 14.º do RITI' },
    { code: 'M19', label: 'M19 — Outras isenções temporárias' },
    { code: 'M40', label: 'M40 — Autoliquidação Art. 6.º n.º 6 al. a) do CIVA' },
    { code: 'M99', label: 'M99 — Não sujeito / não tributado' },
];

function motivoIsencaoSelect(idLinha, valorAtual, fnUpdate) {
    return `<select class="form-select" style="font-size:12px" onchange="window.${fnUpdate}('${idLinha}','motivoIsencao',this.value)">
        <option value="">— Selecione o motivo (obrigatório por lei) —</option>
        ${MOTIVOS_ISENCAO.map(m => `<option value="${m.code}" ${valorAtual === m.code ? 'selected' : ''}>${m.label}</option>`).join('')}
    </select>`;
}

function computeIvaDetalheFromLinhas(linhas) {
    const map = {};
    (linhas || []).forEach(l => {
        const taxa = parseFloat(l.taxaIva) || 0;
        const sub = (parseFloat(l.quantidade) || 0) * (parseFloat(l.precoUnit) || 0);
        if (!map[taxa]) map[taxa] = { taxa, base: 0, iva: 0 };
        map[taxa].base += sub;
        map[taxa].iva += sub * taxa / 100;
    });
    return Object.values(map).sort((a, b) => a.taxa - b.taxa);
}

function buildQrCodeString(f, nifEmp, nifCli) {
    const nif = (nifEmp || '').replace(/\s/g, '');
    const nifAdq = ((nifCli || '').replace(/\s/g, '')) || '999999990';
    const data = (f.data || '').replace(/-/g, '');
    const atcud = f.atcud || '0';
    const detalhe = f.ivaDetalhe || computeIvaDetalheFromLinhas(f.linhas || []);

    const parts = [
        `A:${nif}`, `B:${nifAdq}`, `C:PT`,
        `D:${f.tipoDocumento || 'FT'}`, `E:N`,
        `F:${data}`, `G:${f.numero}`, `H:${atcud}`, `I1:PT`,
    ];

    const isenta    = detalhe.find(d => d.taxa === 0);
    const reduzida  = detalhe.find(d => d.taxa === _taxasRegiao.reduzida);
    const intermedia = detalhe.find(d => d.taxa === _taxasRegiao.intermedia);
    const normal    = detalhe.find(d => d.taxa === _taxasRegiao.normal);

    if (isenta    && isenta.base    > 0.005) parts.push(`I2:${isenta.base.toFixed(2)}`);
    if (reduzida  && reduzida.base  > 0.005) { parts.push(`I3:${reduzida.base.toFixed(2)}`);   parts.push(`I4:${reduzida.iva.toFixed(2)}`); }
    if (intermedia && intermedia.base > 0.005) { parts.push(`I5:${intermedia.base.toFixed(2)}`); parts.push(`I6:${intermedia.iva.toFixed(2)}`); }
    if (normal    && normal.base    > 0.005) { parts.push(`I7:${normal.base.toFixed(2)}`);     parts.push(`I8:${normal.iva.toFixed(2)}`); }

    parts.push(`N:${(f.valorIva || 0).toFixed(2)}`);
    parts.push(`O:${(f.valorTotal || 0).toFixed(2)}`);
    parts.push(`Q:0`);

    return parts.join('*') + '*';
}

export function render() {
    const conteudo = `
    <div class="page-hero">
      <h1>Faturação — Gestão Comercial</h1>
      <p>Emita faturas de venda, acompanhe pagamentos e gere o lançamento contabilístico automaticamente no diário de Vendas.</p>
    </div>

    <div class="stats-grid" id="fat-stats"></div>

    <div class="tabs" id="fat-tabs">
      <button class="tab-btn" data-tab="tab-faturas">Faturas</button>
      <button class="tab-btn" data-tab="tab-clientes">Clientes</button>
      <button class="tab-btn" data-tab="tab-creditos">Notas de Crédito</button>
    </div>

    <div class="tab-panel" data-panel="tab-faturas">
      <div class="card" style="margin-bottom:20px">
        <div class="card-body" style="padding:16px 20px">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
            <div class="form-group" style="margin:0;flex:1;min-width:160px">
              <label class="form-label">Pesquisar</label>
              <input type="text" class="form-input" data-search="tbl-faturas" placeholder="Número, cliente…"/>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Estado</label>
              <select class="form-select" id="filtro-fat-estado">
                <option value="">Todos</option>
                <option value="rascunho">Rascunho</option>
                <option value="emitida">Emitida</option>
                <option value="paga">Paga</option>
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">De</label>
              <input type="date" class="form-input" id="filtro-fat-de"/>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Até</label>
              <input type="date" class="form-input" id="filtro-fat-ate"/>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div><h2>Faturas Emitidas</h2><p id="fat-count-label">— faturas</p></div>
        </div>
        <table class="data-table" id="tbl-faturas">
          <thead>
            <tr><th>Número</th><th>Data</th><th>Cliente</th><th>Vencimento</th><th class="amount">Total</th><th class="amount">Abatido</th><th class="amount">Saldo</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody id="tbody-faturas"></tbody>
        </table>
        <div id="sem-faturas" hidden style="padding:24px;font-size:13px;color:var(--muted);text-align:center">
          Sem faturas para os filtros selecionados. <a href="#" onclick="window._fatAbrirNova();return false">Criar a primeira →</a>
        </div>
      </div>
    </div>

    <div class="tab-panel" data-panel="tab-clientes" hidden>
      <div class="card">
        <div class="card-header">
          <div><h2>Clientes</h2><p id="cli-count-label">— clientes</p></div>
          <button class="btn btn-outline btn-sm" onclick="window._fatAbrirNovoCliente()">+ Novo Cliente</button>
        </div>
        <table class="data-table" id="tbl-clientes">
          <thead><tr><th>Nome</th><th>NIF</th><th>Email</th><th>Telefone</th><th class="amount">Faturado</th><th></th></tr></thead>
          <tbody id="tbody-clientes"></tbody>
        </table>
        <div id="sem-clientes" hidden style="padding:24px;font-size:13px;color:var(--muted);text-align:center">
          Sem clientes registados. <a href="#" onclick="window._fatAbrirNovoCliente();return false">Adicionar o primeiro →</a>
        </div>
      </div>
    </div>

    <div class="tab-panel" data-panel="tab-creditos" hidden>
      <div class="alert alert-info" style="margin-bottom:20px">
        <span class="alert-icon">ℹ</span>
        <div>Uma nota de crédito pode ser aplicada (abatida) em várias faturas do mesmo cliente. Crie a partir de uma fatura emitida e depois aplique o saldo onde for necessário.</div>
      </div>
      <div class="card">
        <div class="card-header">
          <div><h2>Notas de Crédito</h2><p id="cred-count-label">— notas</p></div>
        </div>
        <table class="data-table" id="tbl-creditos">
          <thead><tr><th>Número</th><th>Data</th><th>Cliente</th><th>Motivo</th><th class="amount">Total</th><th class="amount">Aplicado</th><th class="amount">Disponível</th><th>Estado</th><th></th></tr></thead>
          <tbody id="tbody-creditos"></tbody>
        </table>
        <div id="sem-creditos" hidden style="padding:24px;font-size:13px;color:var(--muted);text-align:center">
          Sem notas de crédito emitidas. <a href="#" onclick="window._fatAbrirNovaNotaCredito();return false">Criar a primeira →</a>
        </div>
      </div>
    </div>

    <div id="modal-fatura" class="modal" hidden style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center">
      <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>
      <div style="position:relative;background:var(--white);border-radius:12px;padding:32px;width:720px;max-width:96vw;max-height:92vh;overflow-y:auto;box-shadow:var(--shadow-lg)">
        <h2 id="modal-fat-title" style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--navy);margin-bottom:4px">Nova Fatura</h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:20px">IVA e totais calculados automaticamente por linha.</p>
        <input type="hidden" id="edit-fat-id"/>
        <div class="form-row">
          <div class="form-group" style="flex:0 0 160px">
            <label class="form-label">Tipo Documento</label>
            <select class="form-select" id="nf-tipo" onchange="window._fatAtualizarTipoDocumento()">
              <option value="FT">FT — Fatura</option>
              <option value="FS">FS — Faturа Simplificada</option>
            </select>
          </div>
          <div class="form-group" style="flex:0 0 140px">
            <label class="form-label">N.º Documento</label>
            <input class="form-input" id="nf-numero" disabled style="opacity:0.7"/>
          </div>
          <div class="form-group">
            <label class="form-label">Cliente *</label>
            <div style="display:flex;gap:6px">
              <select class="form-select" id="nf-cliente"></select>
              <button class="btn btn-outline btn-sm" type="button" title="Novo cliente" onclick="window._fatAbrirNovoCliente(true)">+</button>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data *</label>
            <input type="date" class="form-input" id="nf-data"/>
          </div>
          <div class="form-group">
            <label class="form-label">Data de Vencimento</label>
            <input type="date" class="form-input" id="nf-vencimento"/>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin:18px 0 8px">
          <label class="form-label" style="margin:0">Linhas da Fatura</label>
          <button class="btn btn-outline btn-sm" type="button" onclick="window._fatAdicionarLinha()">+ Linha</button>
        </div>
        <div id="linhas-fatura" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px"></div>
        <div id="ft-totais-box" style="background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin:16px 0 18px;display:flex;justify-content:flex-end;gap:28px;font-size:13px;flex-wrap:wrap">
          <div><div style="color:var(--muted);font-size:11px">Total</div><div style="font-weight:700;color:var(--navy);font-size:16px">—</div></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline" onclick="window._closeModal('modal-fatura')">Cancelar</button>
          <button class="btn btn-outline" id="btn-guardar-rascunho" onclick="window._fatGuardar('rascunho')">Guardar Rascunho</button>
          <button class="btn btn-gold" onclick="window._fatGuardar('emitida')">Guardar e Emitir</button>
        </div>
      </div>
    </div>

    <div id="modal-ver-fatura" class="modal" hidden style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center">
      <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>
      <div style="position:relative;background:var(--white);border-radius:12px;padding:36px;width:600px;max-width:96vw;max-height:92vh;overflow-y:auto;box-shadow:var(--shadow-lg)" id="ver-fatura-box"></div>
    </div>

    <div id="modal-cliente" class="modal" hidden style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center">
      <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>
      <div style="position:relative;background:var(--white);border-radius:12px;padding:32px;width:480px;max-width:96vw;box-shadow:var(--shadow-lg)">
        <h2 id="modal-cli-title" style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--navy);margin-bottom:4px">Novo Cliente</h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:22px">Dados usados na faturação.</p>
        <input type="hidden" id="edit-cli-id"/>
        <input type="hidden" id="cli-volta-fatura"/>
        <div class="form-group">
          <label class="form-label">Nome / Designação *</label>
          <input class="form-input" id="nc2-nome" placeholder="Ex: Cliente ABC, Lda"/>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">NIF</label>
            <input class="form-input" id="nc2-nif" placeholder="500 000 000"/>
          </div>
          <div class="form-group">
            <label class="form-label">Telefone</label>
            <input class="form-input" id="nc2-telefone" placeholder="+351 ..."/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Morada</label>
          <input class="form-input" id="nc2-morada" placeholder="Rua, n.º, Localidade"/>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="nc2-email" placeholder="email@cliente.pt"/>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
          <button class="btn btn-outline" onclick="window._closeModal('modal-cliente')">Cancelar</button>
          <button class="btn btn-gold" onclick="window._fatGuardarCliente()">Guardar</button>
        </div>
      </div>
    </div>

    <div id="modal-credito" class="modal" hidden style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center">
      <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>
      <div style="position:relative;background:var(--white);border-radius:12px;padding:32px;width:680px;max-width:96vw;max-height:92vh;overflow-y:auto;box-shadow:var(--shadow-lg)">
        <h2 style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--navy);margin-bottom:4px">Nova Nota de Crédito</h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:20px">Escolha a fatura de origem — as linhas são pré-preenchidas e podem ser ajustadas para devoluções parciais.</p>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Fatura de Origem *</label>
            <select class="form-select" id="ncr-fatura-origem" onchange="window._fatAoEscolherFaturaOrigem()"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Data *</label>
            <input type="date" class="form-input" id="ncr-data"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Motivo *</label>
          <input class="form-input" id="ncr-motivo" placeholder="Ex: Devolução de mercadoria, erro de faturação…"/>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin:18px 0 8px">
          <label class="form-label" style="margin:0">Linhas a Devolver</label>
        </div>
        <div id="linhas-credito" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px"></div>
        <p style="font-size:12px;color:var(--muted);margin-top:4px">Ajuste a quantidade ou preço para uma devolução parcial. Remova linhas que não fazem parte da devolução.</p>
        <div id="nc-totais-box" style="background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin:16px 0 18px;display:flex;justify-content:flex-end;gap:28px;font-size:13px;flex-wrap:wrap">
          <div><div style="color:var(--muted);font-size:11px">Total</div><div style="font-weight:700;color:var(--navy);font-size:16px">—</div></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline" onclick="window._closeModal('modal-credito')">Cancelar</button>
          <button class="btn btn-gold" onclick="window._fatGuardarNotaCredito()">Criar Nota de Crédito</button>
        </div>
      </div>
    </div>

    <div id="modal-aplicar-credito" class="modal" hidden style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center">
      <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>
      <div style="position:relative;background:var(--white);border-radius:12px;padding:32px;width:680px;max-width:96vw;max-height:92vh;overflow-y:auto;box-shadow:var(--shadow-lg)">
        <h2 style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--navy);margin-bottom:4px">Aplicar Nota de Crédito <span id="apl-cred-numero"></span></h2>
        <p style="font-size:13px;color:var(--muted);margin-bottom:4px">Cliente: <strong id="apl-cred-cliente"></strong></p>
        <input type="hidden" id="apl-cred-id"/>
        <div style="display:flex;gap:24px;margin:16px 0 20px;font-size:13px;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:14px 18px">
          <div><div style="color:var(--muted);font-size:11px">Total da Nota</div><div id="apl-cred-total" style="font-weight:600">—</div></div>
          <div><div style="color:var(--muted);font-size:11px">Já Aplicado</div><div id="apl-cred-aplicado" style="font-weight:600">—</div></div>
          <div><div style="color:var(--muted);font-size:11px">Disponível</div><div id="apl-cred-disponivel" style="font-weight:700;color:var(--success);font-size:16px">—</div></div>
        </div>
        <h3 style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px">Faturas Abertas do Cliente</h3>
        <div id="lista-faturas-abertas" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px"></div>
        <p id="sem-faturas-abertas" hidden style="font-size:13px;color:var(--muted);text-align:center;padding:16px">Este cliente não tem faturas com saldo em dívida.</p>
        <h3 style="font-size:13px;font-weight:700;color:var(--navy);margin:20px 0 8px">Histórico de Aplicações desta Nota</h3>
        <div id="historico-aplicacoes" style="display:flex;flex-direction:column;gap:6px"></div>
        <p id="sem-aplicacoes" hidden style="font-size:13px;color:var(--muted);text-align:center;padding:12px">Ainda não foi aplicada em nenhuma fatura.</p>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
          <button class="btn btn-outline" onclick="window._closeModal('modal-aplicar-credito')">Fechar</button>
        </div>
      </div>
    </div>
    `;

    return renderLayout({
        rotaAtiva: 'faturacao',
        breadcrumb: 'Faturação',
        acoesTopbar: `
            <button class="btn btn-outline btn-sm" onclick="window._fatExportarSAFT()" title="Exportar SAF-T(PT)">SAF-T ⬇</button>
            <button class="btn btn-outline btn-sm" onclick="window._fatAbrirNovoCliente()">+ Cliente</button>
            <button class="btn btn-outline btn-sm" onclick="window._fatAbrirNovaNotaCredito()">+ Nota de Crédito</button>
            <button class="btn btn-gold btn-sm" onclick="window._fatAbrirNova()">+ Nova Fatura</button>
        `,
        conteudo,
    });
}

window._openModal = openModal;
window._closeModal = closeModal;

/* ══════════ Stats ══════════ */
async function renderStats() {
    const [faturas, clientes, notasCredito] = await Promise.all([getFaturas(empresaId), getClientes(empresaId), getNotasCredito(empresaId)]);
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);

    const faturadoMes = faturas.filter(f => f.estado !== 'rascunho' && (f.data || '').startsWith(mesAtual)).reduce((s, f) => s + f.valorTotal, 0);
    const pendente = faturas.filter(f => f.estado === 'emitida').reduce((s, f) => s + Math.max(0, (f.valorTotal || 0) - (f.valorAbatido || 0)), 0);
    const rascunhos = faturas.filter(f => f.estado === 'rascunho').length;
    const creditoDisponivel = notasCredito.filter(n => n.estado !== 'anulada').reduce((s, n) => s + Math.max(0, (n.valorTotal || 0) - (n.valorAplicado || 0)), 0);

    document.getElementById('fat-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Faturado este Mês</div><div class="stat-value">${fmtEUR(faturadoMes)}</div><div class="stat-sub">${mesAtual}</div></div>
    <div class="stat-card danger"><div class="stat-label">Pendente de Pagamento</div><div class="stat-value">${fmtEUR(pendente)}</div><div class="stat-sub">saldo líquido</div></div>
    <div class="stat-card"><div class="stat-label">Crédito Disponível</div><div class="stat-value">${fmtEUR(creditoDisponivel)}</div><div class="stat-sub">notas por aplicar</div></div>
    <div class="stat-card slate"><div class="stat-label">Rascunhos</div><div class="stat-value">${rascunhos}</div><div class="stat-sub">por emitir</div></div>
    <div class="stat-card green"><div class="stat-label">Clientes</div><div class="stat-value">${clientes.length}</div><div class="stat-sub">registados</div></div>
  `;
}

/* ══════════ Faturas ══════════ */
async function renderFaturas() {
    const fEstado = document.getElementById('filtro-fat-estado').value;
    const fDe = document.getElementById('filtro-fat-de').value;
    const fAte = document.getElementById('filtro-fat-ate').value;

    let lista = await getFaturas(empresaId);
    if (fEstado) lista = lista.filter(f => f.estado === fEstado);
    if (fDe) lista = lista.filter(f => f.data >= fDe);
    if (fAte) lista = lista.filter(f => f.data <= fAte);

    document.getElementById('fat-count-label').textContent = `${lista.length} faturas`;
    const tbody = document.getElementById('tbody-faturas');
    const semEl = document.getElementById('sem-faturas');

    if (lista.length === 0) { tbody.innerHTML = ''; semEl.hidden = false; return; }
    semEl.hidden = true;

    const clientes = await getClientes(empresaId);
    const estadoBadge = { rascunho: 'badge-muted', emitida: 'badge-gold', paga: 'badge-green' };
    const estadoLabel = { rascunho: 'Rascunho', emitida: 'Emitida', paga: 'Paga' };

    tbody.innerHTML = lista.map(f => {
        const cli = clientes.find(c => c.id === f.clienteId);
        const abatido = f.valorAbatido || 0;
        const saldo = Math.max(0, (f.valorTotal || 0) - abatido);
        return `
    <tr>
      <td class="mono" style="font-size:12px">${f.numero}</td>
      <td>${fmtDate(f.data)}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cli ? cli.nome : '<span style="color:var(--muted)">—</span>'}</td>
      <td>${f.dataVencimento ? fmtDate(f.dataVencimento) : '—'}</td>
      <td class="amount" style="font-weight:700">${fmtEUR(f.valorTotal)}</td>
      <td class="amount" style="${abatido > 0 ? 'color:var(--danger)' : 'color:var(--muted)'}">${abatido > 0 ? '−' + fmtEUR(abatido) : '—'}</td>
      <td class="amount" style="font-weight:700">${fmtEUR(saldo)}</td>
      <td><span class="badge ${estadoBadge[f.estado]}">${estadoLabel[f.estado]}</span></td>
      <td style="display:flex;gap:4px;justify-content:flex-end">
        <button class="btn btn-outline btn-sm" title="Ver" onclick="window._fatVer('${f.id}')">👁</button>
        ${f.estado === 'rascunho' ? `<button class="btn btn-outline btn-sm" title="Editar" onclick="window._fatEditar('${f.id}')">✏</button>` : ''}
        ${f.estado === 'emitida' ? `<button class="btn btn-sm" style="background:rgba(45,122,79,0.12);color:var(--success);border:1px solid rgba(45,122,79,0.25)" title="Marcar como paga" onclick="window._fatPagar('${f.id}')">✓ Paga</button>` : ''}
        ${f.estado === 'rascunho' ? `<button class="btn btn-sm" style="background:rgba(176,58,46,0.1);color:var(--danger);border:1px solid rgba(176,58,46,0.2)" title="Apagar" onclick="window._fatApagar('${f.id}')">✕</button>` : ''}
      </td>
    </tr>`;
    }).join('');
}

function novaLinhaObj() {
    linhaSeq++;
    return { _id: 'l' + linhaSeq, descricao: '', quantidade: 1, precoUnit: 0, taxaIva: _taxasRegiao.normal, motivoIsencao: '' };
}

function renderLinhas() {
    const wrap = document.getElementById('linhas-fatura');
    wrap.innerHTML = _linhasAtuais.map(l => `
    <div data-linha="${l._id}">
      <div style="display:grid;grid-template-columns:1fr 70px 100px 90px 100px 32px;gap:8px;align-items:center">
        <input class="form-input" placeholder="Descrição do serviço/produto" value="${(l.descricao || '').replace(/"/g, '&quot;')}" oninput="window._fatAtualizarLinha('${l._id}','descricao',this.value)"/>
        <input class="form-input" type="number" min="0" step="1" value="${l.quantidade}" oninput="window._fatAtualizarLinha('${l._id}','quantidade',this.value)" title="Quantidade"/>
        <input class="form-input" type="number" min="0" step="0.01" value="${l.precoUnit}" oninput="window._fatAtualizarLinha('${l._id}','precoUnit',this.value)" title="Preço unitário (€)"/>
        <select class="form-select" onchange="window._fatAtualizarLinha('${l._id}','taxaIva',this.value)" title="Taxa IVA">
          <option value="0" ${l.taxaIva == 0 ? 'selected' : ''}>Isento</option>
          <option value="${_taxasRegiao.reduzida}" ${l.taxaIva == _taxasRegiao.reduzida ? 'selected' : ''}>${_taxasRegiao.reduzida}%</option>
          <option value="${_taxasRegiao.intermedia}" ${l.taxaIva == _taxasRegiao.intermedia ? 'selected' : ''}>${_taxasRegiao.intermedia}%</option>
          <option value="${_taxasRegiao.normal}" ${l.taxaIva == _taxasRegiao.normal ? 'selected' : ''}>${_taxasRegiao.normal}%</option>
        </select>
        <div style="font-size:13px;font-weight:600;text-align:right;padding-right:4px">${fmtEUR((parseFloat(l.quantidade) || 0) * (parseFloat(l.precoUnit) || 0) * (1 + (parseFloat(l.taxaIva) || 0) / 100))}</div>
        <button class="btn btn-sm" style="background:rgba(176,58,46,0.1);color:var(--danger);border:1px solid rgba(176,58,46,0.2);padding:6px 8px" onclick="window._fatRemoverLinha('${l._id}')" title="Remover linha">✕</button>
      </div>
      ${l.taxaIva == 0 ? `
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px;padding:5px 8px;background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.25);border-radius:6px">
        <span style="font-size:12px;color:var(--muted);white-space:nowrap;flex-shrink:0">Motivo isenção *</span>
        ${motivoIsencaoSelect(l._id, l.motivoIsencao, '_fatAtualizarLinha')}
      </div>` : ''}
    </div>
  `).join('') || '<p style="font-size:13px;color:var(--muted);text-align:center;padding:12px">Sem linhas. Adicione um produto ou serviço.</p>';
    atualizarTotaisPreview();
}

window._fatAdicionarLinha = function() { _linhasAtuais.push(novaLinhaObj()); renderLinhas(); };
window._fatRemoverLinha = function(id) { _linhasAtuais = _linhasAtuais.filter(l => l._id !== id); renderLinhas(); };
window._fatAtualizarLinha = function(id, campo, valor) {
    const l = _linhasAtuais.find(x => x._id === id);
    if (!l) return;
    if (campo === 'descricao' || campo === 'motivoIsencao') {
        l[campo] = valor;
    } else {
        l[campo] = parseFloat(valor) || 0;
        if (campo === 'taxaIva' && (parseFloat(valor) || 0) !== 0) l.motivoIsencao = '';
    }
    renderLinhas();
};

function atualizarTotaisPreview() {
    let base = 0, iva = 0;
    const detalheMap = {};
    _linhasAtuais.forEach(l => {
        const sub = (parseFloat(l.quantidade) || 0) * (parseFloat(l.precoUnit) || 0);
        const taxa = parseFloat(l.taxaIva) || 0;
        base += sub; iva += sub * taxa / 100;
        if (!detalheMap[taxa]) detalheMap[taxa] = { taxa, base: 0, iva: 0 };
        detalheMap[taxa].base += sub;
        detalheMap[taxa].iva += sub * taxa / 100;
    });
    const detalhe = Object.values(detalheMap).sort((a, b) => a.taxa - b.taxa);
    const taxaNome = t => t === 0 ? 'Isento' : `${t}%`;
    const box = document.getElementById('ft-totais-box');
    if (!box) return;
    let html = '';
    if (detalhe.length > 1) {
        html += detalhe.map(d => `
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:1px">
                <div style="color:var(--muted);font-size:11px">Base ${taxaNome(d.taxa)}</div>
                <div style="font-weight:600;font-size:12px">${fmtEUR(d.base)}</div>
                ${d.taxa > 0 ? `<div style="font-size:11px;color:var(--danger)">IVA ${fmtEUR(d.iva)}</div>` : ''}
            </div>`).join('');
    } else {
        html += `<div><div style="color:var(--muted);font-size:11px">Base</div><div style="font-weight:600">${fmtEUR(base)}</div></div>
                 <div><div style="color:var(--muted);font-size:11px">IVA</div><div style="font-weight:600;color:var(--danger)">${fmtEUR(iva)}</div></div>`;
    }
    html += `<div><div style="color:var(--muted);font-size:11px">Total</div><div style="font-weight:700;color:var(--navy);font-size:16px">${fmtEUR(base + iva)}</div></div>`;
    box.innerHTML = html;
}

async function popularSelectClientes(selecionado) {
    const sel = document.getElementById('nf-cliente');
    const clientes = await getClientes(empresaId);
    sel.innerHTML = clientes.length
        ? clientes.map(c => `<option value="${c.id}" ${c.id === selecionado ? 'selected' : ''}>${c.nome}${c.nif ? ' — ' + c.nif : ''}</option>`).join('')
        : `<option value="">Sem clientes — clique em "+" para criar</option>`;
}

window._fatAbrirNova = async function() {
    const emp = await empresaAtiva();
    _taxasRegiao = await getTaxasPorRegiao(emp ? emp.regiao : 'continente');
    document.getElementById('modal-fat-title').textContent = 'Nova Fatura';
    document.getElementById('edit-fat-id').value = '';
    document.getElementById('nf-tipo').value = 'FT';
    document.getElementById('nf-numero').value = await proximoNumeroFatura(empresaId);
    document.getElementById('nf-data').value = today();
    document.getElementById('nf-vencimento').value = '';
    await popularSelectClientes('');
    _linhasAtuais = [novaLinhaObj()];
    renderLinhas();
    document.getElementById('btn-guardar-rascunho').style.display = '';
    openModal('modal-fatura');
};

window._fatEditar = async function(id) {
    const [emp, faturas] = await Promise.all([empresaAtiva(), getFaturas(empresaId)]);
    _taxasRegiao = await getTaxasPorRegiao(emp ? emp.regiao : 'continente');
    const f = faturas.find(x => x.id === id);
    if (!f) return;
    document.getElementById('modal-fat-title').textContent = 'Editar Fatura (Rascunho)';
    document.getElementById('edit-fat-id').value = id;
    document.getElementById('nf-tipo').value = f.tipoDocumento || 'FT';
    document.getElementById('nf-numero').value = f.numero;
    document.getElementById('nf-data').value = f.data;
    document.getElementById('nf-vencimento').value = f.dataVencimento || '';
    await popularSelectClientes(f.clienteId);
    _linhasAtuais = (f.linhas || []).map(l => ({ ...l, _id: 'l' + (++linhaSeq) }));
    if (_linhasAtuais.length === 0) _linhasAtuais = [novaLinhaObj()];
    renderLinhas();
    document.getElementById('btn-guardar-rascunho').style.display = '';
    openModal('modal-fatura');
};

window._fatAtualizarTipoDocumento = async function() {
    const tipo = document.getElementById('nf-tipo').value;
    const editId = document.getElementById('edit-fat-id').value;
    if (!editId) {
        document.getElementById('nf-numero').value = tipo === 'FS'
            ? await proximoNumeroFaturaSimplificada(empresaId)
            : await proximoNumeroFatura(empresaId);
    }
};

window._fatGuardar = async function(estadoDestino) {
    const clienteId = document.getElementById('nf-cliente').value;
    if (!clienteId) { showToast('Selecione um cliente', 'danger'); return; }
    const linhasValidas = _linhasAtuais.filter(l => l.descricao && l.descricao.trim() && (parseFloat(l.precoUnit) || 0) >= 0 && (parseFloat(l.quantidade) || 0) > 0);
    if (linhasValidas.length === 0) { showToast('Adicione pelo menos uma linha com descrição, quantidade e preço', 'danger'); return; }
    if (estadoDestino === 'emitida') {
        const isentoSemMotivo = linhasValidas.filter(l => (parseFloat(l.taxaIva) || 0) === 0 && !l.motivoIsencao);
        if (isentoSemMotivo.length > 0) { showToast('Selecione o motivo de isenção de IVA em todas as linhas com taxa 0% (obrigatório por lei)', 'danger'); return; }
    }

    const dados = {
        data: document.getElementById('nf-data').value || today(),
        dataVencimento: document.getElementById('nf-vencimento').value,
        clienteId,
        tipoDocumento: document.getElementById('nf-tipo').value || 'FT',
        linhas: linhasValidas.map(({ _id, ...rest }) => rest),
    };

    const editId = document.getElementById('edit-fat-id').value;
    let faturaId = editId;

    if (editId) {
        await editFatura(empresaId, editId, dados);
        showToast('Fatura atualizada', 'success');
    } else {
        const nova = await addFatura(empresaId, dados);
        faturaId = nova.id;
        showToast('Fatura guardada como rascunho', 'success');
    }

    if (estadoDestino === 'emitida') {
        const resultado = await emitirFatura(empresaId, faturaId);
        if (resultado) showToast(`Fatura ${resultado.numero} emitida — lançamento gerado no diário de Vendas`, 'success');
    }

    closeModal('modal-fatura');
    await renderStats();
    await renderFaturas();
    await renderClientes();
};

window._fatPagar = async function(id) {
    const f = await marcarFaturaPaga(empresaId, id);
    if (f) showToast(`Fatura ${f.numero} marcada como paga`, 'success');
    await renderStats();
    await renderFaturas();
};

window._fatApagar = async function(id) {
    if (!confirm('Apagar este rascunho de fatura? Esta ação não pode ser revertida.')) return;
    const ok = await deleteFatura(empresaId, id);
    if (ok === false) { showToast('Só é possível apagar faturas em rascunho', 'danger'); return; }
    showToast('Rascunho apagado', 'warning');
    await renderStats();
    await renderFaturas();
};

window._fatVer = async function(id) {
    const [faturas, clientes, emp, aplicacoes, notasCredito] = await Promise.all([
        getFaturas(empresaId), getClientes(empresaId), empresaAtiva(),
        getAplicacoesPorFatura(empresaId, id), getNotasCredito(empresaId),
    ]);
    const f = faturas.find(x => x.id === id);
    if (!f) return;
    const cli = clientes.find(c => c.id === f.clienteId);
    const estadoBadge = { rascunho: 'badge-muted', emitida: 'badge-gold', paga: 'badge-green' };
    const estadoLabel = { rascunho: 'Rascunho', emitida: 'Emitida', paga: 'Paga' };
    const saldo = Math.max(0, (f.valorTotal || 0) - (f.valorAbatido || 0));

    const empSnap = f.empresaSnapshot || {};
    const cliSnap = f.clienteSnapshot || {};
    const nomeEmp = empSnap.nome || (emp ? emp.nome : '');
    const nifEmp = empSnap.nif || (emp ? emp.nif : '') || '';
    const moradaEmp = empSnap.morada || (emp ? emp.morada : '') || '';
    const nomeCli = cliSnap.nome || (cli ? cli.nome : '');
    const nifCli = cliSnap.nif || (cli ? cli.nif : '') || '';
    const moradaCli = cliSnap.morada || (cli ? cli.morada : '') || '';

    const ivaDetalhe = f.ivaDetalhe || computeIvaDetalheFromLinhas(f.linhas || []);
    const taxaNome = t => t === 0 ? 'Isento' : `${t}%`;
    const motivoAbrev = { M01:'Art. 16.º n.º 6 CIVA', M04:'Art. 13.º CIVA', M05:'Art. 14.º CIVA', M06:'Art. 15.º CIVA', M07:'Art. 9.º CIVA', M10:'Art. 53.º CIVA', M16:'Art. 14.º RITI', M19:'Outras isenções', M40:'Art. 6.º n.º 6 al. a) CIVA', M99:'Não sujeito' };

    document.getElementById('ver-fatura-box').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:24px;color:var(--navy)">${f.numero}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${nomeEmp}${nifEmp ? ' — NIF ' + nifEmp : ''}${moradaEmp ? ' — ' + moradaEmp : ''}</div>
        ${f.atcud ? `<div style="font-size:11px;font-family:monospace;color:var(--muted);margin-top:4px;letter-spacing:.04em">ATCUD: <strong style="color:var(--navy)">${f.atcud}</strong></div>` : ''}
      </div>
      <span class="badge ${estadoBadge[f.estado]}" style="font-size:12px">${estadoLabel[f.estado]}</span>
    </div>
    <div style="display:flex;gap:32px;margin-bottom:20px;font-size:13px">
      <div>
        <div style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em">Cliente</div>
        <div style="font-weight:600;margin-top:2px">${nomeCli || '—'}</div>
        ${nifCli ? `<div style="color:var(--muted);font-size:12px">NIF ${nifCli}</div>` : ''}
        ${moradaCli ? `<div style="color:var(--muted);font-size:12px">${moradaCli}</div>` : ''}
      </div>
      <div><div style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em">Data</div><div style="font-weight:600;margin-top:2px">${fmtDate(f.data)}</div></div>
      <div><div style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em">Vencimento</div><div style="font-weight:600;margin-top:2px">${f.dataVencimento ? fmtDate(f.dataVencimento) : '—'}</div></div>
    </div>
    <table class="data-table" style="margin-bottom:16px">
      <thead><tr><th>Descrição</th><th>Qtd.</th><th class="amount">Preço Unit.</th><th>IVA</th><th class="amount">Subtotal</th></tr></thead>
      <tbody>
        ${(f.linhas || []).map(l => `
          <tr>
            <td>${l.descricao}</td>
            <td>${l.quantidade}</td>
            <td class="amount">${fmtEUR(l.precoUnit)}</td>
            <td>${l.taxaIva == 0
              ? `Isento${l.motivoIsencao ? `<br><span style="font-size:10px;color:var(--muted)">${l.motivoIsencao}${motivoAbrev[l.motivoIsencao] ? ' — ' + motivoAbrev[l.motivoIsencao] : ''}</span>` : ''}`
              : l.taxaIva + '%'}</td>
            <td class="amount">${fmtEUR((l.quantidade || 0) * (l.precoUnit || 0))}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;font-size:13px;margin-bottom:${aplicacoes.length ? 12 : 24}px">
      ${ivaDetalhe.length > 1 ? ivaDetalhe.map(d => `
        <div style="display:flex;gap:16px"><span style="color:var(--muted)">Base ${taxaNome(d.taxa)}</span><strong style="min-width:90px;text-align:right">${fmtEUR(d.base)}</strong></div>
        ${d.taxa > 0 ? `<div style="display:flex;gap:16px"><span style="color:var(--muted)">IVA ${taxaNome(d.taxa)}</span><strong style="min-width:90px;text-align:right;color:var(--danger)">${fmtEUR(d.iva)}</strong></div>` : ''}
      `).join('') : `
        <div style="display:flex;gap:16px"><span style="color:var(--muted)">Base</span><strong style="min-width:90px;text-align:right">${fmtEUR(f.valorBase)}</strong></div>
        <div style="display:flex;gap:16px"><span style="color:var(--muted)">IVA</span><strong style="min-width:90px;text-align:right;color:var(--danger)">${fmtEUR(f.valorIva)}</strong></div>
      `}
      <div style="display:flex;gap:16px;font-size:18px"><span style="color:var(--muted);font-size:13px;align-self:center">Total</span><strong style="min-width:90px;text-align:right;font-family:'DM Serif Display',serif">${fmtEUR(f.valorTotal)}</strong></div>
    </div>
    ${aplicacoes.length ? `
    <div style="margin-bottom:24px">
      <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Abatimentos por Notas de Crédito</div>
      ${aplicacoes.map(a => {
        const nc = notasCredito.find(n => n.id === a.notaCreditoId);
        return `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0">
          <span>${nc ? nc.numero : '—'} <span style="color:var(--muted);font-size:11px">— ${fmtDate(a.criadaEm)}</span></span>
          <strong style="color:var(--danger)">−${fmtEUR(a.valorAbatido)}</strong>
        </div>`;
    }).join('')}
      <div style="display:flex;justify-content:flex-end;gap:16px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
        <span style="color:var(--muted);font-size:13px;align-self:center">Saldo em Dívida</span>
        <strong style="font-family:'DM Serif Display',serif;font-size:18px">${fmtEUR(saldo)}</strong>
      </div>
    </div>` : ''}
    ${f.lancamentoId ? `<div class="alert alert-info" style="margin-bottom:16px"><span class="alert-icon">📒</span><div>Lançamento gerado no diário de Vendas (documento ${f.numero}).</div></div>` : ''}
    ${f.estado !== 'rascunho' ? `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap">
      <div>
        <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">QR Code AT (Portaria 195/2020)</div>
        <div id="fat-qrcode"></div>
      </div>
      <div style="flex:1;min-width:200px">
        <div style="font-size:9px;color:var(--muted);font-family:monospace;word-break:break-all;margin-top:20px" id="fat-qrcode-str"></div>
        ${f.hash ? `<div style="margin-top:10px;font-size:10px;color:var(--muted)">Hash SHA-256: <span style="font-family:monospace;word-break:break-all">${f.hash.slice(0,16)}…</span></div>` : ''}
      </div>
    </div>` : ''}
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-outline" onclick="window._closeModal('modal-ver-fatura')">Fechar</button>
      <button class="btn btn-primary" onclick="window.print()">🖨 Imprimir</button>
    </div>
  `;

    if (f.estado !== 'rascunho') {
        const qrStr = buildQrCodeString(f, nifEmp, nifCli);
        const qrStrEl = document.getElementById('fat-qrcode-str');
        if (qrStrEl) qrStrEl.textContent = qrStr;
        const qrEl = document.getElementById('fat-qrcode');
        if (qrEl && window.QRCode) {
            new window.QRCode(qrEl, { text: qrStr, width: 100, height: 100, colorDark: '#2E4066', colorLight: '#ffffff' });
        }
    }

    openModal('modal-ver-fatura');
};

/* ══════════ Clientes ══════════ */
async function renderClientes() {
    const [clientes, faturas] = await Promise.all([getClientes(empresaId), getFaturas(empresaId)]);
    document.getElementById('cli-count-label').textContent = `${clientes.length} clientes`;
    const tbody = document.getElementById('tbody-clientes');
    const semEl = document.getElementById('sem-clientes');

    if (clientes.length === 0) { tbody.innerHTML = ''; semEl.hidden = false; return; }
    semEl.hidden = true;

    tbody.innerHTML = clientes.map(c => {
        const faturado = faturas.filter(f => f.clienteId === c.id && f.estado !== 'rascunho').reduce((s, f) => s + f.valorTotal, 0);
        return `
    <tr>
      <td style="font-weight:600">${c.nome}</td>
      <td class="mono" style="font-size:12px">${c.nif || '—'}</td>
      <td style="font-size:13px">${c.email || '—'}</td>
      <td style="font-size:13px">${c.telefone || '—'}</td>
      <td class="amount">${fmtEUR(faturado)}</td>
      <td style="display:flex;gap:4px;justify-content:flex-end">
        <button class="btn btn-outline btn-sm" onclick="window._fatEditarCliente('${c.id}')">✏</button>
        <button class="btn btn-sm" style="background:rgba(176,58,46,0.1);color:var(--danger);border:1px solid rgba(176,58,46,0.2)" onclick="window._fatApagarCliente('${c.id}')">✕</button>
      </td>
    </tr>`;
    }).join('');
}

window._fatAbrirNovoCliente = function(voltarParaFatura) {
    document.getElementById('modal-cli-title').textContent = 'Novo Cliente';
    document.getElementById('edit-cli-id').value = '';
    document.getElementById('cli-volta-fatura').value = voltarParaFatura ? '1' : '';
    document.getElementById('nc2-nome').value = '';
    document.getElementById('nc2-nif').value = '';
    document.getElementById('nc2-telefone').value = '';
    document.getElementById('nc2-morada').value = '';
    document.getElementById('nc2-email').value = '';
    openModal('modal-cliente');
};

window._fatEditarCliente = async function(id) {
    const clientes = await getClientes(empresaId);
    const c = clientes.find(x => x.id === id);
    if (!c) return;
    document.getElementById('modal-cli-title').textContent = 'Editar Cliente';
    document.getElementById('edit-cli-id').value = id;
    document.getElementById('cli-volta-fatura').value = '';
    document.getElementById('nc2-nome').value = c.nome || '';
    document.getElementById('nc2-nif').value = c.nif || '';
    document.getElementById('nc2-telefone').value = c.telefone || '';
    document.getElementById('nc2-morada').value = c.morada || '';
    document.getElementById('nc2-email').value = c.email || '';
    openModal('modal-cliente');
};

window._fatGuardarCliente = async function() {
    const nome = document.getElementById('nc2-nome').value.trim();
    if (!nome) { showToast('O nome do cliente é obrigatório', 'danger'); return; }
    const dados = {
        nome,
        nif: document.getElementById('nc2-nif').value.trim(),
        telefone: document.getElementById('nc2-telefone').value.trim(),
        morada: document.getElementById('nc2-morada').value.trim(),
        email: document.getElementById('nc2-email').value.trim(),
    };
    const editId = document.getElementById('edit-cli-id').value;
    const voltaFatura = document.getElementById('cli-volta-fatura').value === '1';
    let cliente;
    if (editId) {
        await editCliente(empresaId, editId, dados);
        showToast('Cliente atualizado', 'success');
        cliente = { id: editId };
    } else {
        cliente = await addCliente(empresaId, dados);
        showToast('Cliente criado', 'success');
    }
    closeModal('modal-cliente');
    await renderClientes();
    await renderStats();

    if (voltaFatura && cliente) {
        await popularSelectClientes(cliente.id);
        openModal('modal-fatura');
    }
};

window._fatApagarCliente = async function(id) {
    if (!confirm('Apagar este cliente?')) return;
    const ok = await deleteCliente(empresaId, id);
    if (ok === false) { showToast('Não é possível apagar: cliente tem faturas associadas', 'danger'); return; }
    showToast('Cliente apagado', 'warning');
    await renderClientes();
    await renderStats();
};

/* ══════════ Notas de Crédito ══════════ */
async function renderNotasCredito() {
    const [notas, clientes] = await Promise.all([getNotasCredito(empresaId), getClientes(empresaId)]);
    document.getElementById('cred-count-label').textContent = `${notas.length} notas`;
    const tbody = document.getElementById('tbody-creditos');
    const semEl = document.getElementById('sem-creditos');

    if (notas.length === 0) { tbody.innerHTML = ''; semEl.hidden = false; return; }
    semEl.hidden = true;

    const estadoBadge = { aberta: 'badge-gold', aplicada: 'badge-green', anulada: 'badge-muted' };
    const estadoLabel = { aberta: 'Aberta', aplicada: 'Aplicada', anulada: 'Anulada' };

    tbody.innerHTML = notas.map(n => {
        const cli = clientes.find(c => c.id === n.clienteId);
        const disponivel = Math.max(0, (n.valorTotal || 0) - (n.valorAplicado || 0));
        return `
    <tr>
      <td class="mono" style="font-size:12px">${n.numero}</td>
      <td>${fmtDate(n.data)}</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cli ? cli.nome : '—'}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:var(--muted)" title="${n.motivo}">${n.motivo || '—'}</td>
      <td class="amount" style="font-weight:700">${fmtEUR(n.valorTotal)}</td>
      <td class="amount">${n.valorAplicado > 0 ? fmtEUR(n.valorAplicado) : '—'}</td>
      <td class="amount" style="${disponivel > 0 && n.estado !== 'anulada' ? 'font-weight:700;color:var(--success)' : 'color:var(--muted)'}">${n.estado === 'anulada' ? '—' : fmtEUR(disponivel)}</td>
      <td><span class="badge ${estadoBadge[n.estado]}">${estadoLabel[n.estado]}</span></td>
      <td style="display:flex;gap:4px;justify-content:flex-end">
        <button class="btn btn-outline btn-sm" title="Ver" onclick="window._fatVerCredito('${n.id}')">👁</button>
        ${n.estado !== 'anulada' ? `<button class="btn btn-gold btn-sm" onclick="window._fatAbrirAplicarCredito('${n.id}')">Aplicar →</button>` : ''}
        ${n.valorAplicado === 0 ? `<button class="btn btn-sm" style="background:rgba(176,58,46,0.1);color:var(--danger);border:1px solid rgba(176,58,46,0.2)" title="Anular" onclick="window._fatAnularCredito('${n.id}')">✕</button>` : ''}
      </td>
    </tr>`;
    }).join('');
}

window._fatAbrirNovaNotaCredito = async function() {
    document.getElementById('ncr-data').value = today();
    document.getElementById('ncr-motivo').value = '';

    const faturas = await getFaturas(empresaId);
    _faturasParaOrigem = faturas.filter(f => f.estado !== 'rascunho');

    const sel = document.getElementById('ncr-fatura-origem');
    if (_faturasParaOrigem.length === 0) {
        sel.innerHTML = `<option value="">Sem faturas emitidas disponíveis</option>`;
        showToast('Precisa de ter pelo menos uma fatura emitida para criar uma nota de crédito', 'danger');
        return;
    }
    const clientes = await getClientes(empresaId);
    sel.innerHTML = _faturasParaOrigem.map(f => {
        const cli = clientes.find(c => c.id === f.clienteId);
        return `<option value="${f.id}">${f.numero} — ${cli ? cli.nome : 'Cliente'} (${fmtEUR(f.valorTotal)})</option>`;
    }).join('');

    window._fatAoEscolherFaturaOrigem();
    openModal('modal-credito');
};

window._fatAoEscolherFaturaOrigem = function() {
    const faturaId = document.getElementById('ncr-fatura-origem').value;
    const fat = _faturasParaOrigem.find(f => f.id === faturaId);
    if (!fat) { _linhasCreditoAtuais = []; renderLinhasCredito(); return; }
    _linhasCreditoAtuais = (fat.linhas || []).map((l, idx) => ({ ...l, _id: 'lc' + idx + '_' + Date.now() }));
    renderLinhasCredito();
};

function renderLinhasCredito() {
    const wrap = document.getElementById('linhas-credito');
    wrap.innerHTML = _linhasCreditoAtuais.map(l => `
    <div data-linha="${l._id}">
      <div style="display:grid;grid-template-columns:1fr 70px 100px 90px 100px 32px;gap:8px;align-items:center">
        <input class="form-input" value="${(l.descricao || '').replace(/"/g, '&quot;')}" oninput="window._fatAtualizarLinhaCredito('${l._id}','descricao',this.value)"/>
        <input class="form-input" type="number" min="0" step="1" value="${l.quantidade}" oninput="window._fatAtualizarLinhaCredito('${l._id}','quantidade',this.value)" title="Quantidade"/>
        <input class="form-input" type="number" min="0" step="0.01" value="${l.precoUnit}" oninput="window._fatAtualizarLinhaCredito('${l._id}','precoUnit',this.value)" title="Preço unitário (€)"/>
        <select class="form-select" onchange="window._fatAtualizarLinhaCredito('${l._id}','taxaIva',this.value)">
          <option value="0" ${l.taxaIva == 0 ? 'selected' : ''}>Isento</option>
          <option value="${_taxasRegiao.reduzida}" ${l.taxaIva == _taxasRegiao.reduzida ? 'selected' : ''}>${_taxasRegiao.reduzida}%</option>
          <option value="${_taxasRegiao.intermedia}" ${l.taxaIva == _taxasRegiao.intermedia ? 'selected' : ''}>${_taxasRegiao.intermedia}%</option>
          <option value="${_taxasRegiao.normal}" ${l.taxaIva == _taxasRegiao.normal ? 'selected' : ''}>${_taxasRegiao.normal}%</option>
        </select>
        <div style="font-size:13px;font-weight:600;text-align:right;padding-right:4px">${fmtEUR((parseFloat(l.quantidade) || 0) * (parseFloat(l.precoUnit) || 0) * (1 + (parseFloat(l.taxaIva) || 0) / 100))}</div>
        <button class="btn btn-sm" style="background:rgba(176,58,46,0.1);color:var(--danger);border:1px solid rgba(176,58,46,0.2);padding:6px 8px" onclick="window._fatRemoverLinhaCredito('${l._id}')" title="Remover linha">✕</button>
      </div>
      ${l.taxaIva == 0 ? `
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px;padding:5px 8px;background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.25);border-radius:6px">
        <span style="font-size:12px;color:var(--muted);white-space:nowrap;flex-shrink:0">Motivo isenção *</span>
        ${motivoIsencaoSelect(l._id, l.motivoIsencao, '_fatAtualizarLinhaCredito')}
      </div>` : ''}
    </div>
  `).join('') || '<p style="font-size:13px;color:var(--muted);text-align:center;padding:12px">Sem linhas. Escolha uma fatura de origem.</p>';
    atualizarTotaisCreditoPreview();
}

window._fatRemoverLinhaCredito = function(id) { _linhasCreditoAtuais = _linhasCreditoAtuais.filter(l => l._id !== id); renderLinhasCredito(); };
window._fatAtualizarLinhaCredito = function(id, campo, valor) {
    const l = _linhasCreditoAtuais.find(x => x._id === id);
    if (!l) return;
    if (campo === 'descricao' || campo === 'motivoIsencao') {
        l[campo] = valor;
    } else {
        l[campo] = parseFloat(valor) || 0;
        if (campo === 'taxaIva' && (parseFloat(valor) || 0) !== 0) l.motivoIsencao = '';
    }
    renderLinhasCredito();
};

function atualizarTotaisCreditoPreview() {
    let base = 0, iva = 0;
    const detalheMap = {};
    _linhasCreditoAtuais.forEach(l => {
        const sub = (parseFloat(l.quantidade) || 0) * (parseFloat(l.precoUnit) || 0);
        const taxa = parseFloat(l.taxaIva) || 0;
        base += sub; iva += sub * taxa / 100;
        if (!detalheMap[taxa]) detalheMap[taxa] = { taxa, base: 0, iva: 0 };
        detalheMap[taxa].base += sub;
        detalheMap[taxa].iva += sub * taxa / 100;
    });
    const detalhe = Object.values(detalheMap).sort((a, b) => a.taxa - b.taxa);
    const taxaNome = t => t === 0 ? 'Isento' : `${t}%`;
    const box = document.getElementById('nc-totais-box');
    if (!box) return;
    let html = '';
    if (detalhe.length > 1) {
        html += detalhe.map(d => `
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:1px">
                <div style="color:var(--muted);font-size:11px">Base ${taxaNome(d.taxa)}</div>
                <div style="font-weight:600;font-size:12px">${fmtEUR(d.base)}</div>
                ${d.taxa > 0 ? `<div style="font-size:11px;color:var(--danger)">IVA ${fmtEUR(d.iva)}</div>` : ''}
            </div>`).join('');
    } else {
        html += `<div><div style="color:var(--muted);font-size:11px">Base</div><div style="font-weight:600">${fmtEUR(base)}</div></div>
                 <div><div style="color:var(--muted);font-size:11px">IVA</div><div style="font-weight:600;color:var(--danger)">${fmtEUR(iva)}</div></div>`;
    }
    html += `<div><div style="color:var(--muted);font-size:11px">Total</div><div style="font-weight:700;color:var(--navy);font-size:16px">${fmtEUR(base + iva)}</div></div>`;
    box.innerHTML = html;
}

window._fatGuardarNotaCredito = async function() {
    const faturaId = document.getElementById('ncr-fatura-origem').value;
    const fat = _faturasParaOrigem.find(f => f.id === faturaId);
    if (!fat) { showToast('Selecione a fatura de origem', 'danger'); return; }
    const motivo = document.getElementById('ncr-motivo').value.trim();
    if (!motivo) { showToast('Indique o motivo da nota de crédito', 'danger'); return; }
    const linhasValidas = _linhasCreditoAtuais.filter(l => l.descricao && l.descricao.trim() && (parseFloat(l.quantidade) || 0) > 0);
    if (linhasValidas.length === 0) { showToast('Adicione pelo menos uma linha a devolver', 'danger'); return; }
    const isentoSemMotivo = linhasValidas.filter(l => (parseFloat(l.taxaIva) || 0) === 0 && !l.motivoIsencao);
    if (isentoSemMotivo.length > 0) { showToast('Selecione o motivo de isenção de IVA em todas as linhas com taxa 0% (obrigatório por lei)', 'danger'); return; }

    const nova = await addNotaCredito(empresaId, {
        clienteId: fat.clienteId,
        faturaOrigemId: fat.id,
        data: document.getElementById('ncr-data').value || today(),
        motivo,
        linhas: linhasValidas.map(({ _id, ...rest }) => rest),
    });

    closeModal('modal-credito');
    showToast(`Nota de crédito ${nova.numero} criada`, 'success');
    await renderNotasCredito();
    await renderStats();
};

window._fatVerCredito = async function(id) {
    const [notas, clientes, faturas, emp] = await Promise.all([
        getNotasCredito(empresaId), getClientes(empresaId), getFaturas(empresaId), empresaAtiva(),
    ]);
    const n = notas.find(x => x.id === id);
    if (!n) return;
    const cli = clientes.find(c => c.id === n.clienteId);
    const fatOrig = faturas.find(f => f.id === n.faturaOrigemId);

    const empSnap = n.empresaSnapshot || {};
    const cliSnap = n.clienteSnapshot || {};
    const nomeEmp = empSnap.nome || (emp ? emp.nome : '');
    const nifEmp  = empSnap.nif  || (emp ? emp.nif  : '') || '';
    const nomeCli = cliSnap.nome || (cli ? cli.nome : '');
    const nifCli  = cliSnap.nif  || (cli ? cli.nif  : '') || '';
    const moradaCli = cliSnap.morada || (cli ? cli.morada : '') || '';

    const ivaDetalhe = n.ivaDetalhe || computeIvaDetalheFromLinhas(n.linhas || []);
    const taxaNome = t => t === 0 ? 'Isento' : `${t}%`;
    const motivoAbrev = { M01:'Art. 16.º n.º 6 CIVA', M04:'Art. 13.º CIVA', M05:'Art. 14.º CIVA', M06:'Art. 15.º CIVA', M07:'Art. 9.º CIVA', M10:'Art. 53.º CIVA', M16:'Art. 14.º RITI', M19:'Outras isenções', M40:'Art. 6.º n.º 6 al. a) CIVA', M99:'Não sujeito' };

    const estadoBadge = { aberta: 'badge-gold', aplicada: 'badge-green', anulada: 'badge-muted' };
    const estadoLabel = { aberta: 'Aberta', aplicada: 'Aplicada', anulada: 'Anulada' };

    const fakeDocParaQr = { ...n, tipoDocumento: n.tipoDocumento || 'NC', numero: n.numero, atcud: n.atcud || '0' };

    document.getElementById('ver-fatura-box').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:24px;color:var(--navy)">${n.numero}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${nomeEmp}${nifEmp ? ' — NIF ' + nifEmp : ''}</div>
        ${n.atcud ? `<div style="font-size:11px;font-family:monospace;color:var(--muted);margin-top:4px">ATCUD: <strong style="color:var(--navy)">${n.atcud}</strong></div>` : ''}
        ${fatOrig ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">Ref. fatura: ${fatOrig.numero}</div>` : ''}
      </div>
      <span class="badge ${estadoBadge[n.estado] || 'badge-muted'}" style="font-size:12px">${estadoLabel[n.estado] || n.estado}</span>
    </div>
    <div style="display:flex;gap:32px;margin-bottom:20px;font-size:13px">
      <div>
        <div style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em">Cliente</div>
        <div style="font-weight:600;margin-top:2px">${nomeCli || '—'}</div>
        ${nifCli ? `<div style="color:var(--muted);font-size:12px">NIF ${nifCli}</div>` : ''}
        ${moradaCli ? `<div style="color:var(--muted);font-size:12px">${moradaCli}</div>` : ''}
      </div>
      <div><div style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em">Data</div><div style="font-weight:600;margin-top:2px">${fmtDate(n.data)}</div></div>
      <div><div style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em">Motivo</div><div style="font-weight:600;margin-top:2px;font-size:12px">${n.motivo || '—'}</div></div>
    </div>
    <table class="data-table" style="margin-bottom:16px">
      <thead><tr><th>Descrição</th><th>Qtd.</th><th class="amount">Preço Unit.</th><th>IVA</th><th class="amount">Subtotal</th></tr></thead>
      <tbody>
        ${(n.linhas || []).map(l => `
          <tr>
            <td>${l.descricao}</td>
            <td>${l.quantidade}</td>
            <td class="amount">${fmtEUR(l.precoUnit)}</td>
            <td>${l.taxaIva == 0
              ? `Isento${l.motivoIsencao ? `<br><span style="font-size:10px;color:var(--muted)">${l.motivoIsencao}${motivoAbrev[l.motivoIsencao] ? ' — ' + motivoAbrev[l.motivoIsencao] : ''}</span>` : ''}`
              : l.taxaIva + '%'}</td>
            <td class="amount">${fmtEUR((l.quantidade || 0) * (l.precoUnit || 0))}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;font-size:13px;margin-bottom:24px">
      ${ivaDetalhe.length > 1 ? ivaDetalhe.map(d => `
        <div style="display:flex;gap:16px"><span style="color:var(--muted)">Base ${taxaNome(d.taxa)}</span><strong style="min-width:90px;text-align:right">${fmtEUR(d.base)}</strong></div>
        ${d.taxa > 0 ? `<div style="display:flex;gap:16px"><span style="color:var(--muted)">IVA ${taxaNome(d.taxa)}</span><strong style="min-width:90px;text-align:right;color:var(--danger)">${fmtEUR(d.iva)}</strong></div>` : ''}
      `).join('') : `
        <div style="display:flex;gap:16px"><span style="color:var(--muted)">Base</span><strong style="min-width:90px;text-align:right">${fmtEUR(n.valorBase)}</strong></div>
        <div style="display:flex;gap:16px"><span style="color:var(--muted)">IVA</span><strong style="min-width:90px;text-align:right;color:var(--danger)">${fmtEUR(n.valorIva)}</strong></div>
      `}
      <div style="display:flex;gap:16px;font-size:18px"><span style="color:var(--muted);font-size:13px;align-self:center">Total NC</span><strong style="min-width:90px;text-align:right;font-family:'DM Serif Display',serif">${fmtEUR(n.valorTotal)}</strong></div>
    </div>
    ${n.estado !== 'anulada' ? `
    <div style="padding-top:16px;border-top:1px solid var(--border);display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap">
      <div>
        <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">QR Code AT (Portaria 195/2020)</div>
        <div id="fat-qrcode"></div>
      </div>
      <div style="flex:1;min-width:200px">
        <div style="font-size:9px;color:var(--muted);font-family:monospace;word-break:break-all;margin-top:20px" id="fat-qrcode-str"></div>
      </div>
    </div>` : ''}
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-outline" onclick="window._closeModal('modal-ver-fatura')">Fechar</button>
      <button class="btn btn-primary" onclick="window.print()">🖨 Imprimir</button>
    </div>
  `;

    if (n.estado !== 'anulada') {
        const qrStr = buildQrCodeString(fakeDocParaQr, nifEmp, nifCli);
        const qrStrEl = document.getElementById('fat-qrcode-str');
        if (qrStrEl) qrStrEl.textContent = qrStr;
        const qrEl = document.getElementById('fat-qrcode');
        if (qrEl && window.QRCode) {
            new window.QRCode(qrEl, { text: qrStr, width: 100, height: 100, colorDark: '#2E4066', colorLight: '#ffffff' });
        }
    }

    openModal('modal-ver-fatura');
};

window._fatExportarSAFT = async function() {
    try {
        showToast('A gerar ficheiro SAF-T…', 'info');
        const ok = await gerarSAFT(empresaId);
        if (ok) showToast('Ficheiro SAF-T(PT) exportado com sucesso', 'success');
        else showToast('Não foi possível gerar o SAF-T — verifique os dados da empresa', 'danger');
    } catch (e) {
        showToast('Erro ao gerar SAF-T: ' + e.message, 'danger');
    }
};

window._fatAnularCredito = async function(id) {
    if (!confirm('Anular esta nota de crédito? Só é possível se ainda não tiver sido aplicada em nenhuma fatura.')) return;
    const ok = await anularNotaCredito(empresaId, id);
    if (ok === false) { showToast('Não é possível anular: já tem aplicações. Remova-as primeiro.', 'danger'); return; }
    showToast('Nota de crédito anulada', 'warning');
    await renderNotasCredito();
};

window._fatAbrirAplicarCredito = async function(notaCreditoId) {
    document.getElementById('apl-cred-id').value = notaCreditoId;
    await renderModalAplicarCredito();
    openModal('modal-aplicar-credito');
};

async function renderModalAplicarCredito() {
    const notaCreditoId = document.getElementById('apl-cred-id').value;
    const [notas, faturas, clientes, aplicacoes] = await Promise.all([
        getNotasCredito(empresaId), getFaturas(empresaId), getClientes(empresaId),
        getAplicacoesPorCredito(empresaId, notaCreditoId),
    ]);
    const nc = notas.find(n => n.id === notaCreditoId);
    if (!nc) return;
    const cli = clientes.find(c => c.id === nc.clienteId);
    const disponivel = Math.max(0, (nc.valorTotal || 0) - (nc.valorAplicado || 0));

    document.getElementById('apl-cred-numero').textContent = `— ${nc.numero}`;
    document.getElementById('apl-cred-cliente').textContent = cli ? cli.nome : '—';
    document.getElementById('apl-cred-total').textContent = fmtEUR(nc.valorTotal);
    document.getElementById('apl-cred-aplicado').textContent = fmtEUR(nc.valorAplicado || 0);
    document.getElementById('apl-cred-disponivel').textContent = fmtEUR(disponivel);

    const faturasAbertas = faturas.filter(f => f.clienteId === nc.clienteId && f.estado !== 'rascunho' && ((f.valorTotal || 0) - (f.valorAbatido || 0)) > 0.005);
    const listaEl = document.getElementById('lista-faturas-abertas');
    const semEl = document.getElementById('sem-faturas-abertas');

    if (faturasAbertas.length === 0 || disponivel <= 0.005) {
        listaEl.innerHTML = '';
        semEl.hidden = false;
    } else {
        semEl.hidden = true;
        listaEl.innerHTML = faturasAbertas.map(f => {
            const saldo = Math.max(0, (f.valorTotal || 0) - (f.valorAbatido || 0));
            const sugestao = Math.min(saldo, disponivel);
            return `
      <div style="display:grid;grid-template-columns:1fr 90px 130px auto;gap:8px;align-items:center;padding:8px 10px;border:1px solid var(--border);border-radius:8px">
        <div>
          <div style="font-size:13px;font-weight:600">${f.numero}</div>
          <div style="font-size:11px;color:var(--muted)">Saldo em dívida: ${fmtEUR(saldo)}</div>
        </div>
        <div style="font-size:11px;color:var(--muted)">€</div>
        <input class="form-input" type="number" min="0" step="0.01" max="${Math.min(saldo, disponivel).toFixed(2)}" value="${sugestao.toFixed(2)}" id="valor-aplicar-${f.id}" style="text-align:right"/>
        <button class="btn btn-gold btn-sm" onclick="window._fatConfirmarAplicarCredito('${f.id}')">Aplicar</button>
      </div>`;
        }).join('');
    }

    const histEl = document.getElementById('historico-aplicacoes');
    const semHistEl = document.getElementById('sem-aplicacoes');
    if (aplicacoes.length === 0) {
        histEl.innerHTML = '';
        semHistEl.hidden = false;
    } else {
        semHistEl.hidden = true;
        histEl.innerHTML = aplicacoes.map(a => {
            const fat = faturas.find(f => f.id === a.faturaId);
            return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--cream);border-radius:6px;font-size:13px">
        <span>${fat ? fat.numero : '(fatura removida)'} <span style="color:var(--muted);font-size:11px">— ${fmtDate(a.criadaEm)}</span></span>
        <span style="display:flex;align-items:center;gap:10px">
          <strong>${fmtEUR(a.valorAbatido)}</strong>
          <button class="btn btn-sm" style="background:rgba(176,58,46,0.1);color:var(--danger);border:1px solid rgba(176,58,46,0.2);padding:3px 8px" title="Remover aplicação" onclick="window._fatRemoverAplicacao('${a.id}')">✕</button>
        </span>
      </div>`;
        }).join('');
    }
}

window._fatConfirmarAplicarCredito = async function(faturaId) {
    const notaCreditoId = document.getElementById('apl-cred-id').value;
    const valor = parseFloat(document.getElementById(`valor-aplicar-${faturaId}`).value) || 0;
    if (valor <= 0) { showToast('Indique um valor superior a 0', 'danger'); return; }
    try {
        await aplicarCreditoEmFatura(empresaId, notaCreditoId, faturaId, valor);
        showToast('Crédito aplicado com sucesso', 'success');
        await renderModalAplicarCredito();
        await renderNotasCredito();
        await renderFaturas();
        await renderStats();
    } catch (e) {
        showToast(e.message, 'danger');
    }
};

window._fatRemoverAplicacao = async function(aplicacaoId) {
    if (!confirm('Remover esta aplicação? O valor volta a ficar disponível na nota de crédito e a dívida da fatura é reposta.')) return;
    await removerAplicacaoCredito(empresaId, aplicacaoId);
    showToast('Aplicação removida', 'warning');
    await renderModalAplicarCredito();
    await renderNotasCredito();
    await renderFaturas();
    await renderStats();
};

export async function init() {
    empresaId = empresaAtivaId();
    const emp = await initLayout();
    if (!emp) { window.router.navigate('empresas'); return; }

    _taxasRegiao = await getTaxasPorRegiao(emp.regiao || 'continente');

    initModais();
    initTabs();
    initTableSearch();

    ['filtro-fat-estado', 'filtro-fat-de', 'filtro-fat-ate'].forEach(id => {
        document.getElementById(id).addEventListener('change', renderFaturas);
    });

    await renderStats();
    await renderFaturas();
    await renderClientes();
    await renderNotasCredito();
}
