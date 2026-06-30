// assets/js/modules/iva.js
import {
    empresaAtiva, empresaAtivaId, today, getLancamentos, getFaturas, getNotasCredito, getClientes,
    addIvaPeriodo, addLancamento, getIvaPeriodos, marcarIvaPeriodoSubmetido,
} from './tenant.js';
import { renderLayout, initLayout } from './layout.js';
import { showToast, fmtEUR, fmtDate } from './ui-utils.js';

let empresaId, _liquidado = 0, _dedutivel = 0;

export function render() {
    const conteudo = `
    <div class="card" style="margin-bottom:20px">
      <div class="card-body" style="padding:14px 20px">
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div class="form-group" style="margin:0">
            <label class="form-label">Período De</label>
            <input type="date" class="form-input" id="iva-de"/>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Até</label>
            <input type="date" class="form-input" id="iva-ate"/>
          </div>
          <button class="btn btn-primary" onclick="window._ivaCalcular()">Calcular Apuramento</button>
        </div>
      </div>
    </div>

    <div class="stats-grid" id="iva-stats"></div>

    <div class="two-col">
      <div>
        <div class="card">
          <div class="card-header"><div><h2>Detalhe do Apuramento</h2><p id="iva-periodo-label">Período seleccionado</p></div></div>
          <div class="card-body">
            <table class="data-table" style="font-size:13px">
              <thead><tr><th>Taxa</th><th>Base Tributável</th><th class="amount">IVA</th></tr></thead>
              <tbody id="tbody-liquidado"></tbody>
              <tfoot>
                <tr style="background:var(--cream)">
                  <td colspan="2"><strong>Total IVA Liquidado</strong></td>
                  <td class="amount" id="total-liquidado" style="font-weight:700;color:var(--danger)">—</td>
                </tr>
              </tfoot>
            </table>
            <div class="divider"></div>
            <table class="data-table" style="font-size:13px">
              <thead><tr><th>Dedutível</th><th>Base</th><th class="amount">IVA</th></tr></thead>
              <tbody id="tbody-dedutivel"></tbody>
              <tfoot>
                <tr style="background:var(--cream)">
                  <td colspan="2"><strong>Total IVA Dedutível</strong></td>
                  <td class="amount" id="total-dedutivel" style="font-weight:700;color:var(--success)">—</td>
                </tr>
              </tfoot>
            </table>
            <div id="box-entregar" style="background:rgba(176,58,46,0.06);border:1px solid rgba(176,58,46,0.2);border-radius:8px;padding:14px 16px;margin-top:16px;display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:12px;color:var(--muted);font-weight:600;letter-spacing:.06em;text-transform:uppercase">IVA a Entregar</div>
                <div id="valor-entregar" style="font-family:'DM Serif Display',serif;font-size:26px;color:var(--danger)">—</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--muted)">Conta 2435/2436</div>
                <button class="btn btn-primary btn-sm" style="margin-top:6px" onclick="window._ivaRegistarApuramento()">Gerar Lançamento</button>
              </div>
            </div>
            <div id="box-recuperar" style="background:rgba(45,122,79,0.06);border:1px solid rgba(45,122,79,0.2);border-radius:8px;padding:14px 16px;margin-top:16px;display:none;align-items:center;justify-content:space-between">
              <div>
                <div style="font-size:12px;color:var(--muted);font-weight:600;letter-spacing:.06em;text-transform:uppercase">IVA a Recuperar</div>
                <div id="valor-recuperar" style="font-family:'DM Serif Display',serif;font-size:26px;color:var(--success)">—</div>
              </div>
              <span class="badge badge-green">Crédito fiscal</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><div><h2>SAF-T(PT)</h2><p>Standard Audit File — Portugal</p></div></div>
          <div class="card-body">
            <div class="alert alert-info">
              <span class="alert-icon">📄</span>
              <div>O SAF-T(PT) exporta todos os dados contabilísticos em XML conforme o esquema XSD definido pela Autoridade Tributária.</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:0;margin-bottom:16px;font-size:13px">
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted)">Empresa</span><strong id="saft-empresa">—</strong></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted)">NIF</span><span id="saft-nif">—</span></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted)">Total Lançamentos</span><span id="saft-lancs">—</span></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:var(--muted)">Versão esquema</span><span>1.04_01</span></div>
            </div>
            <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="window._ivaGerarSAFT()">⬇ Gerar e Descarregar SAF-T(PT)</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div><h2>Declaração Periódica IVA</h2><p>Preparação para submissão à AT</p></div></div>
          <div class="card-body">
            <div class="alert alert-gold">
              <span class="alert-icon">⚠</span>
              <div>Após calcular o apuramento, pré-visualize e submeta a declaração à Autoridade Tributária.</div>
            </div>
            <div style="font-size:13px;display:flex;flex-direction:column;gap:0;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted)">Campo 06 — IVA Liquidado</span><strong id="dp-liq">—</strong></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted)">Campo 07 — IVA Dedutível</span><strong id="dp-ded">—</strong></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:var(--muted)">Campo 93 — A Pagar</span><strong id="dp-pagar" style="color:var(--danger)">—</strong></div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-outline" style="flex:1;justify-content:center" onclick="window._ivaPreviewDP()">👁 Pré-visualizar</button>
              <button class="btn btn-gold" style="flex:1;justify-content:center" onclick="window._ivaSubmeterDP()">✓ Submeter à AT</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div><h2>Histórico de Apuramentos</h2><p>Períodos registados</p></div></div>
      <table class="data-table" id="tbl-hist">
        <thead><tr><th>Período</th><th>IVA Liquidado</th><th>IVA Dedutível</th><th>A Pagar/Recuperar</th><th>Registado em</th><th>Estado</th></tr></thead>
        <tbody id="tbody-hist"></tbody>
      </table>
      <div id="sem-hist" hidden style="padding:20px 24px;font-size:13px;color:var(--muted)">Sem apuramentos registados.</div>
    </div>
    `;

    return renderLayout({
        rotaAtiva: 'iva',
        breadcrumb: 'Processamento de IVA',
        acoesTopbar: `<button class="btn btn-gold btn-sm" onclick="window._ivaApurar()">⚡ Apurar IVA</button>`,
        conteudo,
    });
}

window._ivaCalcular = async function() {
    const de = document.getElementById('iva-de').value;
    const ate = document.getElementById('iva-ate').value;
    const todosLancs = await getLancamentos(empresaId);
    const lancs = todosLancs.filter(l => {
        if (de && l.data < de) return false;
        if (ate && l.data > ate) return false;
        return l.taxaIva > 0;
    });

    document.getElementById('saft-lancs').textContent = todosLancs.length;
    document.getElementById('iva-periodo-label').textContent = de && ate ? `${fmtDate(de)} — ${fmtDate(ate)}` : 'Todos os períodos';

    const liqPorTaxa = {};
    lancs.filter(l => l.diario === 'V' || l.diario === 'PS').forEach(l => {
        if (!liqPorTaxa[l.taxaIva]) liqPorTaxa[l.taxaIva] = { base: 0, iva: 0 };
        liqPorTaxa[l.taxaIva].base += l.valorBase;
        liqPorTaxa[l.taxaIva].iva += l.valorIva;
    });
    _liquidado = Object.values(liqPorTaxa).reduce((s, x) => s + x.iva, 0);

    document.getElementById('tbody-liquidado').innerHTML = Object.entries(liqPorTaxa).length
        ? Object.entries(liqPorTaxa).map(([taxa, v]) => `
        <tr><td><span class="badge badge-muted">${taxa}%</span></td><td>${fmtEUR(v.base)}</td><td class="amount credit">${fmtEUR(v.iva)}</td></tr>
      `).join('')
        : '<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:12px">Sem IVA liquidado no período</td></tr>';

    const dedPorTipo = {};
    lancs.filter(l => l.diario === 'C').forEach(l => {
        const k = 'Compras/FSE';
        if (!dedPorTipo[k]) dedPorTipo[k] = { base: 0, iva: 0 };
        dedPorTipo[k].base += l.valorBase;
        dedPorTipo[k].iva += l.valorIva;
    });
    _dedutivel = Object.values(dedPorTipo).reduce((s, x) => s + x.iva, 0);

    document.getElementById('tbody-dedutivel').innerHTML = Object.entries(dedPorTipo).length
        ? Object.entries(dedPorTipo).map(([k, v]) => `
        <tr><td>${k}</td><td>${fmtEUR(v.base)}</td><td class="amount credit">${fmtEUR(v.iva)}</td></tr>
      `).join('')
        : '<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:12px">Sem IVA dedutível no período</td></tr>';

    document.getElementById('total-liquidado').textContent = fmtEUR(_liquidado);
    document.getElementById('total-dedutivel').textContent = fmtEUR(_dedutivel);

    const saldo = _liquidado - _dedutivel;
    document.getElementById('valor-entregar').textContent = fmtEUR(Math.abs(saldo));
    document.getElementById('valor-recuperar').textContent = fmtEUR(Math.abs(saldo));
    document.getElementById('box-entregar').style.display = saldo >= 0 ? 'flex' : 'none';
    document.getElementById('box-recuperar').style.display = saldo < 0 ? 'flex' : 'none';

    document.getElementById('dp-liq').textContent = fmtEUR(_liquidado);
    document.getElementById('dp-ded').textContent = fmtEUR(_dedutivel);
    document.getElementById('dp-pagar').textContent = fmtEUR(Math.max(0, saldo));

    document.getElementById('iva-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">IVA Liquidado</div><div class="stat-value">${fmtEUR(_liquidado)}</div><div class="stat-sub">Conta 2433</div></div>
    <div class="stat-card green"><div class="stat-label">IVA Dedutível</div><div class="stat-value">${fmtEUR(_dedutivel)}</div><div class="stat-sub">Conta 2432</div></div>
    <div class="stat-card ${saldo >= 0 ? 'danger' : 'green'}"><div class="stat-label">${saldo >= 0 ? 'A Entregar' : 'A Recuperar'}</div><div class="stat-value">${fmtEUR(Math.abs(saldo))}</div><div class="stat-sub">Conta ${saldo >= 0 ? '2436' : '2437'}</div></div>
    <div class="stat-card slate"><div class="stat-label">Lançamentos c/ IVA</div><div class="stat-value">${lancs.length}</div><div class="stat-sub">no período</div></div>
  `;
};

window._ivaApurar = async function() { await window._ivaCalcular(); showToast('Apuramento calculado com sucesso', 'success'); };

window._ivaRegistarApuramento = async function() {
    const de = document.getElementById('iva-de').value;
    const ate = document.getElementById('iva-ate').value;
    const saldo = _liquidado - _dedutivel;
    await addIvaPeriodo(empresaId, { de, ate, liquidado: _liquidado, dedutivel: _dedutivel, saldo, estado: 'apurado' });
    await addLancamento(empresaId, {
        data: today(), diario: 'OD', documento: `APU-${de?.slice(0, 7) || 'período'}`,
        descricao: `Apuramento IVA ${de || ''} a ${ate || ''}`,
        contaDebito: saldo >= 0 ? '2433' : '2435', contaCredito: saldo >= 0 ? '2435' : '2433',
        valorBase: Math.abs(saldo), taxaIva: 0, valorIva: 0, valorTotal: Math.abs(saldo), estado: 'conferido',
    });
    showToast('Lançamento de apuramento registado', 'success');
    await renderHistorico();
};

async function renderHistorico() {
    const periodos = await getIvaPeriodos(empresaId);
    const tbody = document.getElementById('tbody-hist');
    const semEl = document.getElementById('sem-hist');
    if (periodos.length === 0) { tbody.innerHTML = ''; semEl.hidden = false; return; }
    semEl.hidden = true;
    tbody.innerHTML = periodos.map(p => `
    <tr>
      <td>${fmtDate(p.de)} — ${fmtDate(p.ate)}</td>
      <td class="amount">${fmtEUR(p.liquidado)}</td>
      <td class="amount">${fmtEUR(p.dedutivel)}</td>
      <td class="amount ${p.saldo >= 0 ? 'debit' : 'credit'}" style="font-weight:600">${p.saldo >= 0 ? 'Pagar' : 'Recup.'} ${fmtEUR(Math.abs(p.saldo))}</td>
      <td>${fmtDate(p.criadoEm)}</td>
      <td><span class="badge ${p.estado === 'submetido' ? 'badge-green' : 'badge-gold'}">${p.estado === 'submetido' ? '✓ Submetido' : 'Apurado'}</span></td>
    </tr>`).join('');
}

window._ivaPreviewDP = function() {
    const saldo = _liquidado - _dedutivel;
    empresaAtiva().then(emp => {
        alert(`DECLARAÇÃO PERIÓDICA IVA\n\n` +
            `Empresa: ${emp.nome}\n` +
            `NIF: ${emp.nif || '—'}\n\n` +
            `Campo 06 — IVA Liquidado:  ${fmtEUR(_liquidado)}\n` +
            `Campo 07 — IVA Dedutível:  ${fmtEUR(_dedutivel)}\n` +
            `Campo 93 — ${saldo >= 0 ? 'A Pagar' : 'A Recuperar'}:   ${fmtEUR(Math.abs(saldo))}\n\n` +
            `(Exportação XML para o Portal AT não disponível nesta versão demo)`);
    });
};

window._ivaSubmeterDP = async function() {
    const periodos = await getIvaPeriodos(empresaId);
    if (periodos.length === 0) { showToast('Calcule e registe o apuramento primeiro', 'danger'); return; }
    await marcarIvaPeriodoSubmetido(empresaId, periodos[0].id);
    showToast('Declaração Periódica marcada como submetida', 'success');
    await renderHistorico();
};

window._ivaGerarSAFT = async function() {
    const emp = await empresaAtiva();
    const lancs = await getLancamentos(empresaId);
    const [faturas, notasCredito, clientes] = await Promise.all([
        getFaturas(empresaId), getNotasCredito(empresaId), getClientes(empresaId),
    ]);
    const hoje = today();
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const faturasValidas = faturas.filter(f => f.estado !== 'rascunho');
    const notasValidas = notasCredito.filter(n => n.estado !== 'anulada');

    const customerXml = clientes.map(c => `
    <Customer>
      <CustomerID>${esc(c.id)}</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>${esc(c.nif || '999999990')}</CustomerTaxID>
      <CompanyName>${esc(c.nome)}</CompanyName>
      <BillingAddress>
        <AddressDetail>${esc(c.morada || 'Desconhecido')}</AddressDetail>
        <City>Desconhecido</City>
        <PostalCode>0000-000</PostalCode>
        <Country>PT</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>`).join('');

    const invoiceXml = faturasValidas.map(f => `
    <Invoice>
      <InvoiceNo>${esc(f.numero)}</InvoiceNo>
      <DocumentStatus>
        <InvoiceStatus>N</InvoiceStatus>
        <InvoiceStatusDate>${f.criadaEm || hoje}T00:00:00</InvoiceStatusDate>
        <SourceID>ContaSNC</SourceID>
        <SourceBilling>P</SourceBilling>
      </DocumentStatus>
      <Hash>0</Hash>
      <HashControl>1</HashControl>
      <Period>${f.data?.slice(5, 7) || '01'}</Period>
      <InvoiceDate>${f.data || hoje}</InvoiceDate>
      <InvoiceType>FT</InvoiceType>
      <SpecialRegimes>
        <SelfBillingIndicator>0</SelfBillingIndicator>
        <CashVATSchemeIndicator>0</CashVATSchemeIndicator>
        <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>
      </SpecialRegimes>
      <SourceID>ContaSNC</SourceID>
      <SystemEntryDate>${f.criadaEm || hoje}T00:00:00</SystemEntryDate>
      <CustomerID>${esc(f.clienteId)}</CustomerID>
      ${(f.linhas || []).map((l, idx) => `
      <Line>
        <LineNumber>${idx + 1}</LineNumber>
        <ProductDescription>${esc(l.descricao)}</ProductDescription>
        <Quantity>${l.quantidade}</Quantity>
        <UnitOfMeasure>UN</UnitOfMeasure>
        <UnitPrice>${(parseFloat(l.precoUnit) || 0).toFixed(2)}</UnitPrice>
        <TaxPointDate>${f.data || hoje}</TaxPointDate>
        <Description>${esc(l.descricao)}</Description>
        <CreditAmount>${((parseFloat(l.quantidade) || 0) * (parseFloat(l.precoUnit) || 0)).toFixed(2)}</CreditAmount>
        <Tax>
          <TaxType>IVA</TaxType>
          <TaxCountryRegion>PT</TaxCountryRegion>
          <TaxCode>${l.taxaIva == 23 ? 'NOR' : l.taxaIva == 13 ? 'INT' : l.taxaIva == 6 ? 'RED' : 'ISE'}</TaxCode>
          <TaxPercentage>${l.taxaIva || 0}</TaxPercentage>
        </Tax>
      </Line>`).join('')}
      <DocumentTotals>
        <TaxPayable>${(f.valorIva || 0).toFixed(2)}</TaxPayable>
        <NetTotal>${(f.valorBase || 0).toFixed(2)}</NetTotal>
        <GrossTotal>${(f.valorTotal || 0).toFixed(2)}</GrossTotal>
      </DocumentTotals>
    </Invoice>`).join('');

    const creditNoteXml = notasValidas.map(n => `
    <Invoice>
      <InvoiceNo>${esc(n.numero)}</InvoiceNo>
      <DocumentStatus>
        <InvoiceStatus>N</InvoiceStatus>
        <InvoiceStatusDate>${n.criadaEm || hoje}T00:00:00</InvoiceStatusDate>
        <SourceID>ContaSNC</SourceID>
        <SourceBilling>P</SourceBilling>
      </DocumentStatus>
      <Hash>0</Hash>
      <HashControl>1</HashControl>
      <Period>${n.data?.slice(5, 7) || '01'}</Period>
      <InvoiceDate>${n.data || hoje}</InvoiceDate>
      <InvoiceType>NC</InvoiceType>
      <SpecialRegimes>
        <SelfBillingIndicator>0</SelfBillingIndicator>
        <CashVATSchemeIndicator>0</CashVATSchemeIndicator>
        <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>
      </SpecialRegimes>
      <SourceID>ContaSNC</SourceID>
      <SystemEntryDate>${n.criadaEm || hoje}T00:00:00</SystemEntryDate>
      <CustomerID>${esc(n.clienteId)}</CustomerID>
      ${n.faturaOrigemId ? (() => {
        const origem = faturasValidas.find(f => f.id === n.faturaOrigemId);
        return `<References>
        <Reference>${esc(origem ? origem.numero : n.faturaOrigemId)}</Reference>
        <Reason>${esc(n.motivo)}</Reason>
      </References>`;
    })() : ''}
      ${(n.linhas || []).map((l, idx) => `
      <Line>
        <LineNumber>${idx + 1}</LineNumber>
        <ProductDescription>${esc(l.descricao)}</ProductDescription>
        <Quantity>${l.quantidade}</Quantity>
        <UnitOfMeasure>UN</UnitOfMeasure>
        <UnitPrice>${(parseFloat(l.precoUnit) || 0).toFixed(2)}</UnitPrice>
        <TaxPointDate>${n.data || hoje}</TaxPointDate>
        <Description>${esc(l.descricao)}</Description>
        <DebitAmount>${((parseFloat(l.quantidade) || 0) * (parseFloat(l.precoUnit) || 0)).toFixed(2)}</DebitAmount>
        <Tax>
          <TaxType>IVA</TaxType>
          <TaxCountryRegion>PT</TaxCountryRegion>
          <TaxCode>${l.taxaIva == 23 ? 'NOR' : l.taxaIva == 13 ? 'INT' : l.taxaIva == 6 ? 'RED' : 'ISE'}</TaxCode>
          <TaxPercentage>${l.taxaIva || 0}</TaxPercentage>
        </Tax>
      </Line>`).join('')}
      <DocumentTotals>
        <TaxPayable>${(n.valorIva || 0).toFixed(2)}</TaxPayable>
        <NetTotal>${(n.valorBase || 0).toFixed(2)}</NetTotal>
        <GrossTotal>${(n.valorTotal || 0).toFixed(2)}</GrossTotal>
      </DocumentTotals>
    </Invoice>`).join('');

    const todosDocumentos = faturasValidas.length + notasValidas.length;
    const totalDebitoDocs = notasValidas.reduce((s, n) => s + (n.valorTotal || 0), 0);
    const totalCreditoDocs = faturasValidas.reduce((s, f) => s + (f.valorTotal || 0), 0);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01">
  <Header>
    <AuditFileVersion>1.04_01</AuditFileVersion>
    <CompanyID>${emp.nif || '000000000'}</CompanyID>
    <TaxRegistrationNumber>${emp.nif || '000000000'}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${esc(emp.nome)}</CompanyName>
    <BusinessName>${esc(emp.nome)}</BusinessName>
    <CompanyAddress><AddressDetail>${esc(emp.morada || 'Desconhecido')}</AddressDetail><City>Lisboa</City><PostalCode>1000-001</PostalCode><Country>PT</Country></CompanyAddress>
    <FiscalYear>${emp.exercicio}</FiscalYear>
    <StartDate>${emp.exercicio}-01-01</StartDate>
    <EndDate>${emp.exercicio}-12-31</EndDate>
    <CurrencyCode>EUR</CurrencyCode>
    <DateCreated>${hoje}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductCompanyTaxID>999999999</ProductCompanyTaxID>
    <SoftwareCertificateNumber>0</SoftwareCertificateNumber>
    <ProductID>ContaSNC</ProductID>
    <ProductVersion>1.0</ProductVersion>
  </Header>
  <MasterFiles>
    <Customer>${customerXml}</Customer>
  </MasterFiles>
  <GeneralLedgerEntries>
    <NumberOfEntries>${lancs.length}</NumberOfEntries>
    <TotalDebit>${lancs.reduce((s, l) => s + (l.valorTotal || l.valorBase || 0), 0).toFixed(2)}</TotalDebit>
    <TotalCredit>${lancs.reduce((s, l) => s + (l.valorTotal || l.valorBase || 0), 0).toFixed(2)}</TotalCredit>
    ${lancs.map(l => `
    <Journal>
      <JournalID>${l.diario}</JournalID>
      <Description>${esc(l.descricao)}</Description>
      <Transaction>
        <TransactionID>${hoje.replace(/-/g, '')} ${l.documento || l.id}</TransactionID>
        <Period>${l.data?.slice(5, 7) || '01'}</Period>
        <TransactionDate>${l.data || hoje}</TransactionDate>
        <SourceID>ContaSNC</SourceID>
        <Description>${esc(l.descricao)}</Description>
        <DocArchivalNumber>${esc(l.documento || l.id)}</DocArchivalNumber>
        <TransactionType>N</TransactionType>
        <GLPostingDate>${l.data || hoje}</GLPostingDate>
        <Lines>
          <DebitLine><RecordID>1</RecordID><AccountID>${l.contaDebito || '999'}</AccountID><SourceDocumentID>${esc(l.documento || '')}</SourceDocumentID><Description>${esc(l.descricao)}</Description><DebitAmount>${(l.valorTotal || l.valorBase || 0).toFixed(2)}</DebitAmount></DebitLine>
          <CreditLine><RecordID>2</RecordID><AccountID>${l.contaCredito || '999'}</AccountID><SourceDocumentID>${esc(l.documento || '')}</SourceDocumentID><Description>${esc(l.descricao)}</Description><CreditAmount>${(l.valorTotal || l.valorBase || 0).toFixed(2)}</CreditAmount></CreditLine>
        </Lines>
      </Transaction>
    </Journal>`).join('')}
  </GeneralLedgerEntries>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${todosDocumentos}</NumberOfEntries>
      <TotalDebit>${totalDebitoDocs.toFixed(2)}</TotalDebit>
      <TotalCredit>${totalCreditoDocs.toFixed(2)}</TotalCredit>
      ${invoiceXml}
      ${creditNoteXml}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

    const blob = new Blob([xml], { type: 'text/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SAF-T_${emp.nif || '000000000'}_${hoje.replace(/-/g, '')}.xml`;
    a.click();
    showToast('SAF-T(PT) gerado e descarregado (inclui faturas e notas de crédito)', 'success');
};

export async function init() {
    empresaId = empresaAtivaId();
    const emp = await initLayout();
    if (!emp) { window.router.navigate('empresas'); return; }

    document.getElementById('saft-empresa').textContent = emp.nome;
    document.getElementById('saft-nif').textContent = emp.nif || '—';

    const hoje = new Date();
    const y = hoje.getFullYear(), m = String(hoje.getMonth() + 1).padStart(2, '0');
    document.getElementById('iva-de').value = `${y}-${m}-01`;
    document.getElementById('iva-ate').value = new Date(y, hoje.getMonth() + 1, 0).toISOString().slice(0, 10);

    document.getElementById('iva-de').addEventListener('change', window._ivaCalcular);
    document.getElementById('iva-ate').addEventListener('change', window._ivaCalcular);

    await window._ivaCalcular();
    await renderHistorico();
}
