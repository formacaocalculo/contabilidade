// ============================================================
//  db.js — Motor de dados localStorage
//  Todas as páginas importam este ficheiro antes de script.js
// ============================================================

const DB = (() => {

  // ── Chaves base ──────────────────────────────────────────
  const EMPRESAS_KEY = 'snc_empresas';
  const ACTIVE_KEY   = 'snc_empresa_activa';

  // ── Plano de Contas SNC padrão ───────────────────────────
  const PLANO_PADRAO = [
    { codigo:'1',    designacao:'Meios Financeiros Líquidos',          nivel:1, tipo:'Classe',   natureza:'Ativo',         movimentos:false },
    { codigo:'11',   designacao:'Caixa',                               nivel:2, tipo:'Conta',    natureza:'Ativo',         movimentos:true  },
    { codigo:'111',  designacao:'Caixa Principal',                     nivel:3, tipo:'Subconta', natureza:'Ativo',         movimentos:true  },
    { codigo:'12',   designacao:'Depósitos à Ordem',                   nivel:2, tipo:'Conta',    natureza:'Ativo',         movimentos:true  },
    { codigo:'121',  designacao:'Depósitos à Ordem — Banco Principal', nivel:3, tipo:'Subconta', natureza:'Ativo',         movimentos:true  },
    { codigo:'13',   designacao:'Outros Depósitos Bancários',          nivel:2, tipo:'Conta',    natureza:'Ativo',         movimentos:true  },
    { codigo:'2',    designacao:'Contas a Receber e a Pagar',          nivel:1, tipo:'Classe',   natureza:'Misto',         movimentos:false },
    { codigo:'21',   designacao:'Clientes',                            nivel:2, tipo:'Conta',    natureza:'Ativo',         movimentos:true  },
    { codigo:'211',  designacao:'Clientes c/c',                        nivel:3, tipo:'Subconta', natureza:'Ativo',         movimentos:true  },
    { codigo:'212',  designacao:'Clientes — Títulos a Receber',        nivel:3, tipo:'Subconta', natureza:'Ativo',         movimentos:true  },
    { codigo:'22',   designacao:'Fornecedores',                        nivel:2, tipo:'Conta',    natureza:'Passivo',       movimentos:true  },
    { codigo:'221',  designacao:'Fornecedores c/c',                    nivel:3, tipo:'Subconta', natureza:'Passivo',       movimentos:true  },
    { codigo:'23',   designacao:'Pessoal',                             nivel:2, tipo:'Conta',    natureza:'Passivo',       movimentos:true  },
    { codigo:'231',  designacao:'Remunerações a Pagar',                nivel:3, tipo:'Subconta', natureza:'Passivo',       movimentos:true  },
    { codigo:'24',   designacao:'Estado e Outros Entes Públicos',      nivel:2, tipo:'Conta',    natureza:'Misto',         movimentos:true  },
    { codigo:'2432', designacao:'IVA — Dedutível',                     nivel:4, tipo:'Subconta', natureza:'Ativo',         movimentos:true  },
    { codigo:'2433', designacao:'IVA — Liquidado',                     nivel:4, tipo:'Subconta', natureza:'Passivo',       movimentos:true  },
    { codigo:'2435', designacao:'IVA — Apuramento',                    nivel:4, tipo:'Subconta', natureza:'Passivo',       movimentos:true  },
    { codigo:'2436', designacao:'IVA — A Pagar',                       nivel:4, tipo:'Subconta', natureza:'Passivo',       movimentos:true  },
    { codigo:'2437', designacao:'IVA — A Recuperar',                   nivel:4, tipo:'Subconta', natureza:'Ativo',         movimentos:true  },
    { codigo:'242',  designacao:'Retenção na Fonte — IRS',             nivel:3, tipo:'Subconta', natureza:'Passivo',       movimentos:true  },
    { codigo:'243',  designacao:'Retenção na Fonte — IRC',             nivel:3, tipo:'Subconta', natureza:'Passivo',       movimentos:true  },
    { codigo:'3',    designacao:'Inventários e Ativos Biológicos',     nivel:1, tipo:'Classe',   natureza:'Ativo',         movimentos:false },
    { codigo:'31',   designacao:'Mercadorias',                         nivel:2, tipo:'Conta',    natureza:'Ativo',         movimentos:true  },
    { codigo:'32',   designacao:'Matérias-Primas',                     nivel:2, tipo:'Conta',    natureza:'Ativo',         movimentos:true  },
    { codigo:'4',    designacao:'Investimentos',                       nivel:1, tipo:'Classe',   natureza:'Ativo',         movimentos:false },
    { codigo:'41',   designacao:'Investimentos Financeiros',           nivel:2, tipo:'Conta',    natureza:'Ativo',         movimentos:true  },
    { codigo:'43',   designacao:'Ativos Fixos Tangíveis',              nivel:2, tipo:'Conta',    natureza:'Ativo',         movimentos:true  },
    { codigo:'438',  designacao:'Amortizações Acumuladas — AFT',       nivel:3, tipo:'Subconta', natureza:'Ativo',         movimentos:true  },
    { codigo:'44',   designacao:'Ativos Intangíveis',                  nivel:2, tipo:'Conta',    natureza:'Ativo',         movimentos:true  },
    { codigo:'5',    designacao:'Capital Próprio',                     nivel:1, tipo:'Classe',   natureza:'Capital',       movimentos:false },
    { codigo:'51',   designacao:'Capital Realizado',                   nivel:2, tipo:'Conta',    natureza:'Capital',       movimentos:true  },
    { codigo:'55',   designacao:'Reservas',                            nivel:2, tipo:'Conta',    natureza:'Capital',       movimentos:true  },
    { codigo:'56',   designacao:'Resultados Transitados',              nivel:2, tipo:'Conta',    natureza:'Capital',       movimentos:true  },
    { codigo:'6',    designacao:'Gastos',                              nivel:1, tipo:'Classe',   natureza:'Gasto',         movimentos:false },
    { codigo:'61',   designacao:'Custo das Mercadorias Vendidas',      nivel:2, tipo:'Conta',    natureza:'Gasto',         movimentos:true  },
    { codigo:'62',   designacao:'Fornecimentos e Serviços Externos',   nivel:2, tipo:'Conta',    natureza:'Gasto',         movimentos:true  },
    { codigo:'621',  designacao:'Subcontratos',                        nivel:3, tipo:'Subconta', natureza:'Gasto',         movimentos:true  },
    { codigo:'622',  designacao:'Materiais',                           nivel:3, tipo:'Subconta', natureza:'Gasto',         movimentos:true  },
    { codigo:'623',  designacao:'Energia e Fluídos',                   nivel:3, tipo:'Subconta', natureza:'Gasto',         movimentos:true  },
    { codigo:'624',  designacao:'Comunicações',                        nivel:3, tipo:'Subconta', natureza:'Gasto',         movimentos:true  },
    { codigo:'625',  designacao:'Deslocações e Estadas',               nivel:3, tipo:'Subconta', natureza:'Gasto',         movimentos:true  },
    { codigo:'63',   designacao:'Gastos com o Pessoal',                nivel:2, tipo:'Conta',    natureza:'Gasto',         movimentos:true  },
    { codigo:'631',  designacao:'Remunerações dos Órgãos Sociais',     nivel:3, tipo:'Subconta', natureza:'Gasto',         movimentos:true  },
    { codigo:'632',  designacao:'Remunerações do Pessoal',             nivel:3, tipo:'Subconta', natureza:'Gasto',         movimentos:true  },
    { codigo:'635',  designacao:'Encargos sobre Remunerações',         nivel:3, tipo:'Subconta', natureza:'Gasto',         movimentos:true  },
    { codigo:'64',   designacao:'Gastos de Depreciação e Amortização', nivel:2, tipo:'Conta',    natureza:'Gasto',         movimentos:true  },
    { codigo:'643',  designacao:'Ativos Fixos Tangíveis',              nivel:3, tipo:'Subconta', natureza:'Gasto',         movimentos:true  },
    { codigo:'68',   designacao:'Outros Gastos e Perdas',              nivel:2, tipo:'Conta',    natureza:'Gasto',         movimentos:true  },
    { codigo:'7',    designacao:'Rendimentos',                         nivel:1, tipo:'Classe',   natureza:'Rendimento',    movimentos:false },
    { codigo:'71',   designacao:'Vendas',                              nivel:2, tipo:'Conta',    natureza:'Rendimento',    movimentos:true  },
    { codigo:'711',  designacao:'Mercadorias',                         nivel:3, tipo:'Subconta', natureza:'Rendimento',    movimentos:true  },
    { codigo:'712',  designacao:'Produtos Acabados',                   nivel:3, tipo:'Subconta', natureza:'Rendimento',    movimentos:true  },
    { codigo:'72',   designacao:'Prestações de Serviços',              nivel:2, tipo:'Conta',    natureza:'Rendimento',    movimentos:true  },
    { codigo:'721',  designacao:'Serviços Prestados — Mercado Nacional',nivel:3,tipo:'Subconta', natureza:'Rendimento',    movimentos:true  },
    { codigo:'78',   designacao:'Outros Rendimentos e Ganhos',         nivel:2, tipo:'Conta',    natureza:'Rendimento',    movimentos:true  },
    { codigo:'8',    designacao:'Resultados',                          nivel:1, tipo:'Classe',   natureza:'Capital',       movimentos:false },
    { codigo:'81',   designacao:'Resultado Líquido do Período',        nivel:2, tipo:'Conta',    natureza:'Capital',       movimentos:true  },
    { codigo:'811',  designacao:'Resultado antes de Imposto',          nivel:3, tipo:'Subconta', natureza:'Capital',       movimentos:true  },
    { codigo:'812',  designacao:'Imposto sobre o Rendimento',          nivel:3, tipo:'Subconta', natureza:'Capital',       movimentos:true  },
  ];

  const DIARIOS_PADRAO = [
    { codigo:'C',  nome:'Compras',            tipo:'Compras',           ativo:true  },
    { codigo:'V',  nome:'Vendas',             tipo:'Vendas',            ativo:true  },
    { codigo:'B',  nome:'Bancos',             tipo:'Bancos',            ativo:true  },
    { codigo:'CX', nome:'Caixa',              tipo:'Caixa',             ativo:true  },
    { codigo:'OD', nome:'Operações Diversas', tipo:'Operações Diversas',ativo:true  },
    { codigo:'S',  nome:'Salários',           tipo:'Salários',          ativo:true  },
  ];

  // ── Utilitários ──────────────────────────────────────────
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  // ── Empresas ─────────────────────────────────────────────
  function getEmpresas() {
    try { return JSON.parse(localStorage.getItem(EMPRESAS_KEY)) || []; }
    catch { return []; }
  }

  function saveEmpresas(list) {
    localStorage.setItem(EMPRESAS_KEY, JSON.stringify(list));
  }

  function getEmpresaActiva() {
    const id = localStorage.getItem(ACTIVE_KEY);
    return getEmpresas().find(e => e.id === id) || null;
  }

  function setEmpresaActiva(id) {
    localStorage.setItem(ACTIVE_KEY, id);
  }

  function criarEmpresa(dados) {
    const empresas = getEmpresas();
    const nova = {
      id:         uid(),
      nome:       dados.nome,
      nif:        dados.nif    || '',
      morada:     dados.morada || '',
      exercicio:  dados.exercicio || new Date().getFullYear(),
      regime:     dados.regime || 'mensal',
      criadaEm:   today(),
      planoContas: JSON.parse(JSON.stringify(PLANO_PADRAO)),
      diarios:     JSON.parse(JSON.stringify(DIARIOS_PADRAO)),
      lancamentos: [],
      ivaPeriodos: [],
      clientes:    [],
      faturas:     [],
    };
    empresas.push(nova);
    saveEmpresas(empresas);
    return nova;
  }

  function editarEmpresa(id, dados) {
    const empresas = getEmpresas();
    const idx = empresas.findIndex(e => e.id === id);
    if (idx === -1) return null;
    empresas[idx] = { ...empresas[idx], ...dados };
    saveEmpresas(empresas);
    return empresas[idx];
  }

  function eliminarEmpresa(id) {
    let empresas = getEmpresas().filter(e => e.id !== id);
    saveEmpresas(empresas);
    if (localStorage.getItem(ACTIVE_KEY) === id) {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }

  // ── Helpers para empresa activa ──────────────────────────
  function _getEmpresa(id) {
    const empresas = getEmpresas();
    const emp = empresas.find(e => e.id === id);
    if (emp) {
      if (!emp.clientes) emp.clientes = [];
      if (!emp.faturas)  emp.faturas  = [];
    }
    return emp;
  }

  function _saveEmpresa(empresa) {
    const empresas = getEmpresas();
    const idx = empresas.findIndex(e => e.id === empresa.id);
    if (idx !== -1) { empresas[idx] = empresa; saveEmpresas(empresas); }
  }

  function empresaActiva() {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (!id) return null;
    return _getEmpresa(id) || null;
  }

  // ── Plano de Contas ──────────────────────────────────────
  function getContas(empresaId) {
    return (_getEmpresa(empresaId) || {}).planoContas || [];
  }

  function addConta(empresaId, conta) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    // não duplicar código
    if (emp.planoContas.find(c => c.codigo === conta.codigo)) return false;
    emp.planoContas.push({ ...conta, criadaEm: today(), personalizada: true });
    emp.planoContas.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, {numeric:true}));
    _saveEmpresa(emp);
    return true;
  }

  function editConta(empresaId, codigo, dados) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    const idx = emp.planoContas.findIndex(c => c.codigo === codigo);
    if (idx !== -1) { emp.planoContas[idx] = { ...emp.planoContas[idx], ...dados }; _saveEmpresa(emp); }
  }

  function deleteConta(empresaId, codigo) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    const conta = emp.planoContas.find(c => c.codigo === codigo);
    if (!conta || !conta.personalizada) return false; // não apaga contas SNC base
    emp.planoContas = emp.planoContas.filter(c => c.codigo !== codigo);
    _saveEmpresa(emp);
    return true;
  }

  // ── Diários ──────────────────────────────────────────────
  function getDiarios(empresaId) {
    return (_getEmpresa(empresaId) || {}).diarios || [];
  }

  function addDiario(empresaId, diario) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    if (emp.diarios.find(d => d.codigo === diario.codigo)) return false;
    emp.diarios.push({ ...diario, criadoEm: today() });
    _saveEmpresa(emp);
    return true;
  }

  function editDiario(empresaId, codigo, dados) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    const idx = emp.diarios.findIndex(d => d.codigo === codigo);
    if (idx !== -1) { emp.diarios[idx] = { ...emp.diarios[idx], ...dados }; _saveEmpresa(emp); }
  }

  // ── Lançamentos ──────────────────────────────────────────
  function getLancamentos(empresaId) {
    return (_getEmpresa(empresaId) || {}).lancamentos || [];
  }

  function addLancamento(empresaId, lanc) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return null;
    const novo = {
      id:          uid(),
      data:        lanc.data        || today(),
      diario:      lanc.diario      || '',
      documento:   lanc.documento   || '',
      descricao:   lanc.descricao   || '',
      contaDebito: lanc.contaDebito || '',
      contaCredito:lanc.contaCredito|| '',
      valorBase:   parseFloat(lanc.valorBase)  || 0,
      taxaIva:     parseFloat(lanc.taxaIva)    || 0,
      valorIva:    parseFloat(lanc.valorIva)   || 0,
      valorTotal:  parseFloat(lanc.valorTotal) || 0,
      retencao:    parseFloat(lanc.retencao)   || 0,
      estado:      lanc.estado || 'pendente',
      criadoEm:    today(),
    };
    emp.lancamentos.unshift(novo);
    _saveEmpresa(emp);
    return novo;
  }

  function editLancamento(empresaId, id, dados) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    const idx = emp.lancamentos.findIndex(l => l.id === id);
    if (idx !== -1) { emp.lancamentos[idx] = { ...emp.lancamentos[idx], ...dados }; _saveEmpresa(emp); }
  }

  function deleteLancamento(empresaId, id) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    emp.lancamentos = emp.lancamentos.filter(l => l.id !== id);
    _saveEmpresa(emp);
  }

  // ── IVA Períodos ─────────────────────────────────────────
  function getIvaPeriodos(empresaId) {
    return (_getEmpresa(empresaId) || {}).ivaPeriodos || [];
  }

  function addIvaPeriodo(empresaId, periodo) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    emp.ivaPeriodos.unshift({ id: uid(), criadoEm: today(), ...periodo });
    _saveEmpresa(emp);
  }

  // ── Clientes ─────────────────────────────────────────────
  function getClientes(empresaId) {
    return (_getEmpresa(empresaId) || {}).clientes || [];
  }

  function addCliente(empresaId, cliente) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return null;
    if (!emp.clientes) emp.clientes = [];
    const novo = {
      id:        uid(),
      nome:      cliente.nome || '',
      nif:       cliente.nif || '',
      morada:    cliente.morada || '',
      email:     cliente.email || '',
      telefone:  cliente.telefone || '',
      criadoEm:  today(),
    };
    emp.clientes.push(novo);
    _saveEmpresa(emp);
    return novo;
  }

  function editCliente(empresaId, id, dados) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    const idx = (emp.clientes||[]).findIndex(c => c.id === id);
    if (idx !== -1) { emp.clientes[idx] = { ...emp.clientes[idx], ...dados }; _saveEmpresa(emp); }
  }

  function deleteCliente(empresaId, id) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return false;
    // não eliminar cliente com faturas associadas
    if ((emp.faturas||[]).some(f => f.clienteId === id)) return false;
    emp.clientes = (emp.clientes||[]).filter(c => c.id !== id);
    _saveEmpresa(emp);
    return true;
  }

  // ── Faturação (Vendas) ───────────────────────────────────
  function getFaturas(empresaId) {
    return (_getEmpresa(empresaId) || {}).faturas || [];
  }

  function _calcularTotaisFatura(linhas) {
    let base = 0, iva = 0;
    (linhas||[]).forEach(l => {
      const qtd   = parseFloat(l.quantidade) || 0;
      const preco = parseFloat(l.precoUnit)  || 0;
      const taxa  = parseFloat(l.taxaIva)    || 0;
      const subtotal = qtd * preco;
      base += subtotal;
      iva  += subtotal * taxa / 100;
    });
    return { base, iva, total: base + iva };
  }

  function proximoNumeroFatura(empresaId) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return null;
    const ano = emp.exercicio || new Date().getFullYear();
    const doAno = (emp.faturas||[]).filter(f => f.numero && f.numero.startsWith(`FT ${ano}/`));
    const seq = doAno.length + 1;
    return `FT ${ano}/${String(seq).padStart(4,'0')}`;
  }

  function addFatura(empresaId, dados) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return null;
    if (!emp.faturas) emp.faturas = [];
    const totais = _calcularTotaisFatura(dados.linhas);
    const nova = {
      id:             uid(),
      numero:         dados.numero || proximoNumeroFatura(empresaId),
      data:           dados.data || today(),
      dataVencimento: dados.dataVencimento || '',
      clienteId:      dados.clienteId || '',
      linhas:         dados.linhas || [],
      valorBase:      totais.base,
      valorIva:       totais.iva,
      valorTotal:     totais.total,
      estado:         dados.estado || 'rascunho',
      lancamentoId:   null,
      criadaEm:       today(),
    };
    emp.faturas.unshift(nova);
    _saveEmpresa(emp);
    return nova;
  }

  function editFatura(empresaId, id, dados) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    const idx = (emp.faturas||[]).findIndex(f => f.id === id);
    if (idx === -1) return;
    const atual = emp.faturas[idx];
    const linhas = dados.linhas || atual.linhas;
    const totais = _calcularTotaisFatura(linhas);
    emp.faturas[idx] = {
      ...atual, ...dados,
      linhas,
      valorBase:  totais.base,
      valorIva:   totais.iva,
      valorTotal: totais.total,
    };
    _saveEmpresa(emp);
  }

  function deleteFatura(empresaId, id) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return false;
    const fat = (emp.faturas||[]).find(f => f.id === id);
    if (!fat) return false;
    if (fat.estado !== 'rascunho') return false; // só apaga rascunhos
    emp.faturas = emp.faturas.filter(f => f.id !== id);
    _saveEmpresa(emp);
    return true;
  }

  // Emite a fatura (rascunho → emitida) e gera o lançamento contabilístico no diário de Vendas
  function emitirFatura(empresaId, id) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return null;
    const fat = (emp.faturas||[]).find(f => f.id === id);
    if (!fat || fat.estado !== 'rascunho') return null;

    const cliente = (emp.clientes||[]).find(c => c.id === fat.clienteId);
    const taxaPredominante = (fat.linhas||[]).reduce((max,l)=> (parseFloat(l.taxaIva)||0) > max ? (parseFloat(l.taxaIva)||0) : max, 0);

    const lanc = {
      id:           uid(),
      data:         fat.data,
      diario:       'V',
      documento:    fat.numero,
      descricao:    `Venda — ${cliente ? cliente.nome : 'Cliente'} (${fat.numero})`,
      contaDebito:  '211',
      contaCredito: '72',
      valorBase:    fat.valorBase,
      taxaIva:      taxaPredominante,
      valorIva:     fat.valorIva,
      valorTotal:   fat.valorTotal,
      retencao:     0,
      estado:       'pendente',
      criadoEm:     today(),
    };
    emp.lancamentos.unshift(lanc);

    fat.estado = 'emitida';
    fat.lancamentoId = lanc.id;
    fat.emitidaEm = today();
    _saveEmpresa(emp);
    return fat;
  }

  function marcarFaturaPaga(empresaId, id) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return null;
    const fat = (emp.faturas||[]).find(f => f.id === id);
    if (!fat || fat.estado !== 'emitida') return null;
    fat.estado = 'paga';
    fat.pagaEm = today();
    // marcar lançamento associado como conferido
    if (fat.lancamentoId) {
      const lanc = emp.lancamentos.find(l => l.id === fat.lancamentoId);
      if (lanc) lanc.estado = 'conferido';
    }
    _saveEmpresa(emp);
    return fat;
  }

  // ── Estatísticas rápidas ─────────────────────────────────
  function statsEmpresa(empresaId) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return {};
    const lancs = emp.lancamentos || [];
    const totalLanc = lancs.length;
    const ivaLiquidado = lancs.reduce((s, l) => s + (l.taxaIva > 0 && l.diario === 'V' ? l.valorIva : 0), 0);
    const ivaDedutivel = lancs.reduce((s, l) => s + (l.taxaIva > 0 && l.diario === 'C' ? l.valorIva : 0), 0);
    const ivaEntregar  = Math.max(0, ivaLiquidado - ivaDedutivel);
    return { totalLanc, ivaLiquidado, ivaDedutivel, ivaEntregar };
  }

  // ── Export / Import JSON ─────────────────────────────────
  function exportEmpresa(empresaId) {
    const emp = _getEmpresa(empresaId);
    if (!emp) return;
    const blob = new Blob([JSON.stringify(emp, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `snc_${emp.nome.replace(/\s+/g,'_')}_backup.json`;
    a.click();
  }

  function importEmpresa(jsonStr) {
    try {
      const emp = JSON.parse(jsonStr);
      if (!emp.nome || !emp.planoContas) throw new Error('Ficheiro inválido');
      emp.id = uid(); // novo id para evitar conflito
      const empresas = getEmpresas();
      empresas.push(emp);
      saveEmpresas(empresas);
      return emp;
    } catch(e) {
      return null;
    }
  }

  // ── API pública ──────────────────────────────────────────
  return {
    uid, today,
    // empresas
    getEmpresas, criarEmpresa, editarEmpresa, eliminarEmpresa,
    getEmpresaActiva, setEmpresaActiva, empresaActiva,
    // plano contas
    getContas, addConta, editConta, deleteConta,
    // diários
    getDiarios, addDiario, editDiario,
    // lançamentos
    getLancamentos, addLancamento, editLancamento, deleteLancamento,
    // clientes
    getClientes, addCliente, editCliente, deleteCliente,
    // faturação
    getFaturas, addFatura, editFatura, deleteFatura, emitirFatura, marcarFaturaPaga, proximoNumeroFatura,
    // iva
    getIvaPeriodos, addIvaPeriodo,
    // stats
    statsEmpresa,
    // import/export
    exportEmpresa, importEmpresa,
  };
})();
