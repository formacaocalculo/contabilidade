// ============================================================
//  db.js — Motor de dados Firestore
//  Substitui a versão anterior baseada em localStorage.
//  Todas as funções são agora ASSÍNCRONAS (retornam Promises).
//  Todas as páginas que usam DB.* precisam de "await".
//
//  Estrutura no Firestore:
//  users/{uid}/empresas/{empresaId}
//  users/{uid}/empresas/{empresaId}/planoContas/{contaId}
//  users/{uid}/empresas/{empresaId}/diarios/{diarioId}
//  users/{uid}/empresas/{empresaId}/lancamentos/{lancId}
//  users/{uid}/empresas/{empresaId}/clientes/{clienteId}
//  users/{uid}/empresas/{empresaId}/faturas/{faturaId}
//  users/{uid}/empresas/{empresaId}/ivaPeriodos/{periodoId}
//
//  Requer: firebase-config.js (expõe `auth` e `db`) e auth-guard.js
//  (expõe `window.authReady`) carregados ANTES deste ficheiro.
// ============================================================

const DB = (() => {
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
    { codigo:'717',  designacao:'Devoluções de Vendas',                nivel:3, tipo:'Subconta', natureza:'Rendimento',    movimentos:true  },
    { codigo:'718',  designacao:'Descontos e Abatimentos em Vendas',   nivel:3, tipo:'Subconta', natureza:'Rendimento',    movimentos:true  },
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

  const ACTIVE_KEY    = 'snc_empresa_activa';      // ID da empresa activa
  const ACTIVE_OWNER  = 'snc_empresa_activa_dono';  // uid do DONO da empresa activa (normalmente = uid próprio; pode ser outro se um admin "entrou" na empresa de outro utilizador)

  // ── Utilitários ──────────────────────────────────────────
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  async function _uidProprio() {
    await window.authReady;
    const user = auth.currentUser;
    if (!user) throw new Error('Utilizador não autenticado.');
    return user.uid;
  }

  // uid "dono" dos dados a usar nas leituras/escritas: normalmente o próprio utilizador,
  // mas se houver um dono activo gravado (definido por setEmpresaActiva quando um admin
  // entra na empresa de outra pessoa), usa esse.
  async function _uidUtilizador() {
    const dono = localStorage.getItem(ACTIVE_OWNER);
    if (dono) return dono;
    return _uidProprio();
  }

  // referências de coleção/documento
  async function _empresasCol(uidAlvo) {
    const u = uidAlvo || await _uidUtilizador();
    return db.collection('users').doc(u).collection('empresas');
  }
  async function _empresaDoc(empresaId, uidAlvo) {
    const col = await _empresasCol(uidAlvo);
    return col.doc(empresaId);
  }
  async function _subCol(empresaId, nome, uidAlvo) {
    const doc = await _empresaDoc(empresaId, uidAlvo);
    return doc.collection(nome);
  }

  async function _getAllDocs(colRef, orderField, desc) {
    let q = colRef;
    if (orderField) q = q.orderBy(orderField, desc ? 'desc' : 'asc');
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ── Administração ────────────────────────────────────────
  // Verifica se o utilizador autenticado está na coleção admins/{uid}.
  // A coleção é só de leitura pelo próprio (ver regras Firestore) — não pode ser
  // alterada via app, apenas manualmente na Firebase Console, por segurança.
  async function isAdmin() {
    const uid = await _uidProprio();
    try {
      const snap = await db.collection('admins').doc(uid).get();
      return snap.exists;
    } catch (e) {
      return false; // se as regras bloquearem, assume que não é admin
    }
  }

  // Lista TODAS as empresas de TODOS os utilizadores (collection-group query).
  // Só deve ser chamada depois de confirmar isAdmin() === true — as regras do
  // Firestore bloqueiam de qualquer forma para não-admins.
  async function getTodasEmpresasAdmin() {
    const snap = await db.collectionGroup('empresas').get();
    return snap.docs.map(d => {
      // path: users/{uid}/empresas/{empresaId}
      const partes = d.ref.path.split('/');
      const donoUid = partes[1];
      return { id: d.id, donoUid, ...d.data() };
    });
  }

  // ── Empresas ─────────────────────────────────────────────
  // Lista sempre as empresas do PRÓPRIO utilizador autenticado (não do "dono activo")
  async function getEmpresas() {
    const uidProprio = await _uidProprio();
    const col = await _empresasCol(uidProprio);
    return _getAllDocs(col, 'criadaEm');
  }

  function getEmpresaActiva() {
    // síncrono de propósito: é só o ID, guardado localmente para conveniência de navegação
    return localStorage.getItem(ACTIVE_KEY);
  }

  // donoUid é opcional: só é necessário passar quando um admin está a entrar
  // numa empresa que não é sua. Quando omitido, assume-se o próprio utilizador.
  async function setEmpresaActiva(id, donoUid) {
    localStorage.setItem(ACTIVE_KEY, id);
    if (donoUid) {
      localStorage.setItem(ACTIVE_OWNER, donoUid);
    } else {
      localStorage.removeItem(ACTIVE_OWNER); // assume-se o próprio
    }
  }

  function donoEmpresaActiva() {
    return localStorage.getItem(ACTIVE_OWNER) || null; // null = é o próprio utilizador
  }

  // Devolve o objecto completo da empresa activa (id + dados base). Não inclui subcoleções.
  async function empresaActiva() {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (!id) return null;
    const docRef = await _empresaDoc(id);
    const snap = await docRef.get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }

  // alias usado por algumas páginas (mesma coisa que empresaActiva)
  async function getEmpresaActivaObj() {
    return empresaActiva();
  }

  async function criarEmpresa(dados) {
    const uidProprio = await _uidProprio();
    const col = await _empresasCol(uidProprio);
    const novaRef = col.doc(); // gera ID
    const nova = {
      nome:       dados.nome,
      nif:        dados.nif    || '',
      morada:     dados.morada || '',
      exercicio:  dados.exercicio || new Date().getFullYear(),
      regime:     dados.regime || 'mensal',
      criadaEm:   today(),
    };
    await novaRef.set(nova);

    // popular plano de contas e diários padrão (em lote)
    const batch = db.batch();
    const planoCol  = novaRef.collection('planoContas');
    const diariosCol= novaRef.collection('diarios');
    PLANO_PADRAO.forEach(c => batch.set(planoCol.doc(c.codigo), c));
    DIARIOS_PADRAO.forEach(d => batch.set(diariosCol.doc(d.codigo), d));
    await batch.commit();

    return { id: novaRef.id, ...nova };
  }

  async function editarEmpresa(id, dados) {
    const docRef = await _empresaDoc(id);
    await docRef.update(dados);
    const snap = await docRef.get();
    return { id: snap.id, ...snap.data() };
  }

  // Elimina a empresa, mas só depois de fazer uma cópia completa (empresa + todas
  // as subcoleções) na coleção "lixeira" no topo da base de dados — permite restauro
  // posterior pelo admin. uidAlvo permite ao admin eliminar empresas de outros utilizadores.
  async function eliminarEmpresa(id, uidAlvo) {
    const uidDono = uidAlvo || await _uidUtilizador();
    const docRef = await _empresaDoc(id, uidDono);
    const snapEmpresa = await docRef.get();
    if (!snapEmpresa.exists) return;
    const dadosEmpresa = snapEmpresa.data();

    const subcolecoes = ['planoContas','diarios','lancamentos','clientes','faturas','ivaPeriodos','notasCredito','aplicacoesCredito'];
    const dump = {};
    for (const nome of subcolecoes) {
      const col = docRef.collection(nome);
      const snap = await col.get();
      dump[nome] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // gravar backup na lixeira ANTES de apagar
    await db.collection('lixeira').doc(id).set({
      donoUid: uidDono,
      empresa: { id, ...dadosEmpresa },
      ...dump,
      eliminadaEm: today(),
    });

    // agora apagar de facto
    for (const nome of subcolecoes) {
      const col = docRef.collection(nome);
      const snap = await col.get();
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      if (snap.docs.length) await batch.commit();
    }
    await docRef.delete();

    if (localStorage.getItem(ACTIVE_KEY) === id) {
      localStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(ACTIVE_OWNER);
    }
  }

  // ── Lixeira (backups de empresas eliminadas) — só admin ──
  async function getLixeira() {
    const snap = await db.collection('lixeira').orderBy('eliminadaEm','desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Repõe uma empresa a partir do backup na lixeira, devolvendo-a ao seu dono original.
  async function restaurarDaLixeira(empresaId) {
    const ref = db.collection('lixeira').doc(empresaId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const backup = snap.data();
    const uidDono = backup.donoUid;

    const novaRef = await _empresaDoc(empresaId, uidDono);
    const { id, ...dadosEmpresa } = backup.empresa;
    await novaRef.set(dadosEmpresa);

    const subcolecoes = ['planoContas','diarios','lancamentos','clientes','faturas','ivaPeriodos','notasCredito','aplicacoesCredito'];
    const batch = db.batch();
    subcolecoes.forEach(nome => {
      (backup[nome] || []).forEach(item => {
        const { id: itemId, ...rest } = item;
        batch.set(novaRef.collection(nome).doc(itemId), rest);
      });
    });
    await batch.commit();

    await ref.delete(); // remover da lixeira depois de restaurado
    return { id: empresaId, donoUid: uidDono, ...dadosEmpresa };
  }

  // Apaga definitivamente um backup da lixeira (sem possibilidade de restauro)
  async function eliminarDaLixeiraDefinitivo(empresaId) {
    await db.collection('lixeira').doc(empresaId).delete();
  }


  // ── Plano de Contas ──────────────────────────────────────
  async function getContas(empresaId) {
    const col = await _subCol(empresaId, 'planoContas');
    const docs = await _getAllDocs(col);
    return docs.sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric:true}));
  }

  async function addConta(empresaId, conta) {
    const col = await _subCol(empresaId, 'planoContas');
    const existente = await col.doc(conta.codigo).get();
    if (existente.exists) return false; // não duplicar código
    await col.doc(conta.codigo).set({ ...conta, criadaEm: today(), personalizada: true });
    return true;
  }

  async function editConta(empresaId, codigo, dados) {
    const col = await _subCol(empresaId, 'planoContas');
    await col.doc(codigo).update(dados);
  }

  async function deleteConta(empresaId, codigo) {
    const col = await _subCol(empresaId, 'planoContas');
    const snap = await col.doc(codigo).get();
    if (!snap.exists || !snap.data().personalizada) return false; // não apaga contas SNC base
    await col.doc(codigo).delete();
    return true;
  }

  // ── Diários ──────────────────────────────────────────────
  async function getDiarios(empresaId) {
    const col = await _subCol(empresaId, 'diarios');
    return _getAllDocs(col);
  }

  async function addDiario(empresaId, diario) {
    const col = await _subCol(empresaId, 'diarios');
    const existente = await col.doc(diario.codigo).get();
    if (existente.exists) return false;
    await col.doc(diario.codigo).set({ ...diario, criadoEm: today() });
    return true;
  }

  async function editDiario(empresaId, codigo, dados) {
    const col = await _subCol(empresaId, 'diarios');
    await col.doc(codigo).update(dados);
  }

  // ── Lançamentos ──────────────────────────────────────────
  async function getLancamentos(empresaId) {
    const col = await _subCol(empresaId, 'lancamentos');
    return _getAllDocs(col, 'data', true);
  }

  async function addLancamento(empresaId, lanc) {
    const col = await _subCol(empresaId, 'lancamentos');
    const novo = {
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
    const ref = await col.add(novo);
    return { id: ref.id, ...novo };
  }

  async function editLancamento(empresaId, id, dados) {
    const col = await _subCol(empresaId, 'lancamentos');
    await col.doc(id).update(dados);
  }

  async function deleteLancamento(empresaId, id) {
    const col = await _subCol(empresaId, 'lancamentos');
    await col.doc(id).delete();
  }

  // ── Clientes ─────────────────────────────────────────────
  async function getClientes(empresaId) {
    const col = await _subCol(empresaId, 'clientes');
    return _getAllDocs(col, 'criadoEm');
  }

  async function addCliente(empresaId, cliente) {
    const col = await _subCol(empresaId, 'clientes');
    const novo = {
      nome:      cliente.nome || '',
      nif:       cliente.nif || '',
      morada:    cliente.morada || '',
      email:     cliente.email || '',
      telefone:  cliente.telefone || '',
      criadoEm:  today(),
    };
    const ref = await col.add(novo);
    return { id: ref.id, ...novo };
  }

  async function editCliente(empresaId, id, dados) {
    const col = await _subCol(empresaId, 'clientes');
    await col.doc(id).update(dados);
  }

  async function deleteCliente(empresaId, id) {
    const colFat = await _subCol(empresaId, 'faturas');
    const snapFat = await colFat.where('clienteId', '==', id).limit(1).get();
    if (!snapFat.empty) return false; // não eliminar cliente com faturas associadas
    const col = await _subCol(empresaId, 'clientes');
    await col.doc(id).delete();
    return true;
  }

  // ── Faturação (Vendas) ───────────────────────────────────
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

  async function getFaturas(empresaId) {
    const col = await _subCol(empresaId, 'faturas');
    return _getAllDocs(col, 'criadaEm', true);
  }

  async function proximoNumeroFatura(empresaId) {
    const emp = await empresaActivaPorId(empresaId);
    const ano = (emp && emp.exercicio) || new Date().getFullYear();
    const col = await _subCol(empresaId, 'faturas');
    const prefixo = `FT ${ano}/`;
    const snap = await col.where('numero', '>=', prefixo).where('numero', '<', prefixo + '\uf8ff').get();
    const seq = snap.size + 1;
    return `${prefixo}${String(seq).padStart(4,'0')}`;
  }

  async function empresaActivaPorId(empresaId) {
    const docRef = await _empresaDoc(empresaId);
    const snap = await docRef.get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  async function addFatura(empresaId, dados) {
    const col = await _subCol(empresaId, 'faturas');
    const totais = _calcularTotaisFatura(dados.linhas);
    const numero = dados.numero || await proximoNumeroFatura(empresaId);
    const nova = {
      numero,
      data:           dados.data || today(),
      dataVencimento: dados.dataVencimento || '',
      clienteId:      dados.clienteId || '',
      linhas:         dados.linhas || [],
      valorBase:      totais.base,
      valorIva:       totais.iva,
      valorTotal:     totais.total,
      valorAbatido:   0,   // soma de notas de crédito já aplicadas a esta fatura
      estado:         dados.estado || 'rascunho',
      lancamentoId:   null,
      criadaEm:       today(),
    };
    const ref = await col.add(nova);
    return { id: ref.id, ...nova };
  }

  async function editFatura(empresaId, id, dados) {
    const col = await _subCol(empresaId, 'faturas');
    const snap = await col.doc(id).get();
    if (!snap.exists) return;
    const atual = snap.data();
    const linhas = dados.linhas || atual.linhas;
    const totais = _calcularTotaisFatura(linhas);
    await col.doc(id).update({
      ...dados,
      linhas,
      valorBase:  totais.base,
      valorIva:   totais.iva,
      valorTotal: totais.total,
    });
  }

  async function deleteFatura(empresaId, id) {
    const col = await _subCol(empresaId, 'faturas');
    const snap = await col.doc(id).get();
    if (!snap.exists) return false;
    if (snap.data().estado !== 'rascunho') return false; // só apaga rascunhos
    await col.doc(id).delete();
    return true;
  }

  // Emite a fatura (rascunho → emitida) e gera o lançamento contabilístico no diário de Vendas
  async function emitirFatura(empresaId, id) {
    const colFat = await _subCol(empresaId, 'faturas');
    const snap = await colFat.doc(id).get();
    if (!snap.exists) return null;
    const fat = snap.data();
    if (fat.estado !== 'rascunho') return null;

    const clientes = await getClientes(empresaId);
    const cliente = clientes.find(c => c.id === fat.clienteId);
    const taxaPredominante = (fat.linhas||[]).reduce((max,l)=> (parseFloat(l.taxaIva)||0) > max ? (parseFloat(l.taxaIva)||0) : max, 0);

    const lancNovo = await addLancamento(empresaId, {
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
    });

    const atualizacao = { estado: 'emitida', lancamentoId: lancNovo.id, emitidaEm: today() };
    await colFat.doc(id).update(atualizacao);
    return { id, ...fat, ...atualizacao };
  }

  async function marcarFaturaPaga(empresaId, id) {
    const colFat = await _subCol(empresaId, 'faturas');
    const snap = await colFat.doc(id).get();
    if (!snap.exists) return null;
    const fat = snap.data();
    if (fat.estado !== 'emitida') return null;

    const atualizacao = { estado: 'paga', pagaEm: today() };
    await colFat.doc(id).update(atualizacao);

    if (fat.lancamentoId) {
      await editLancamento(empresaId, fat.lancamentoId, { estado: 'conferido' });
    }
    return { id, ...fat, ...atualizacao };
  }

  // Saldo ainda em dívida de uma fatura: total emitido menos o que já foi abatido por notas de crédito.
  // (Não confundir com "paga"/"emitida" — uma fatura pode estar emitida mas já ter saldo parcialmente abatido.)
  function _saldoPendenteFatura(fat) {
    return Math.max(0, (fat.valorTotal||0) - (fat.valorAbatido||0));
  }

  // Empresas criadas antes desta funcionalidade existir não têm a conta 717 no plano —
  // cria-a silenciosamente na primeira vez que for necessária.
  async function _garantirConta717(empresaId) {
    const col = await _subCol(empresaId, 'planoContas');
    const snap = await col.doc('717').get();
    if (!snap.exists) {
      await col.doc('717').set({ codigo:'717', designacao:'Devoluções de Vendas', nivel:3, tipo:'Subconta', natureza:'Rendimento', movimentos:true });
    }
  }

  // ── Notas de Crédito ──────────────────────────────────────
  // Modelo N:N: uma nota de crédito pode abater valores em VÁRIAS faturas, e o
  // histórico de cada abatimento fica registado em "aplicacoesCredito" (tabela
  // relacional), o que permite reconstruir a qualquer momento quanto foi
  // deduzido de cada fatura e por qual nota de crédito.
  //
  // users/{uid}/empresas/{empresaId}/notasCredito/{creditoId}
  //   → numero, data, clienteId, motivo, linhas[], valorBase, valorIva, valorTotal,
  //     valorAplicado (soma já abatida em faturas), estado ('aberta'|'aplicada'|'anulada')
  // users/{uid}/empresas/{empresaId}/aplicacoesCredito/{aplicacaoId}
  //   → notaCreditoId, faturaId, valorAbatido, criadaEm

  async function getNotasCredito(empresaId) {
    const col = await _subCol(empresaId, 'notasCredito');
    return _getAllDocs(col, 'criadaEm', true);
  }

  async function proximoNumeroCredito(empresaId) {
    const emp = await empresaActivaPorId(empresaId);
    const ano = (emp && emp.exercicio) || new Date().getFullYear();
    const col = await _subCol(empresaId, 'notasCredito');
    const prefixo = `NC ${ano}/`;
    const snap = await col.where('numero', '>=', prefixo).where('numero', '<', prefixo + '\uf8ff').get();
    const seq = snap.size + 1;
    return `${prefixo}${String(seq).padStart(4,'0')}`;
  }

  // Cria a nota de crédito a partir das linhas escolhidas de UMA fatura de origem
  // (as linhas podem ser uma devolução parcial — quantidades/valores inferiores aos da fatura).
  async function addNotaCredito(empresaId, dados) {
    const col = await _subCol(empresaId, 'notasCredito');
    const totais = _calcularTotaisFatura(dados.linhas);
    const numero = dados.numero || await proximoNumeroCredito(empresaId);
    const nova = {
      numero,
      data:            dados.data || today(),
      clienteId:       dados.clienteId || '',
      faturaOrigemId:  dados.faturaOrigemId || '', // fatura que originou a nota (referência SAF-T)
      motivo:          dados.motivo || '',
      linhas:          dados.linhas || [],
      valorBase:       totais.base,
      valorIva:        totais.iva,
      valorTotal:      totais.total,
      valorAplicado:   0, // soma já distribuída por faturas via aplicacoesCredito
      estado:          'aberta', // aberta | aplicada (saldo=0) | anulada
      criadaEm:        today(),
    };
    const ref = await col.add(nova);
    return { id: ref.id, ...nova };
  }

  async function deleteNotaCredito(empresaId, id) {
    const col = await _subCol(empresaId, 'notasCredito');
    const snap = await col.doc(id).get();
    if (!snap.exists) return false;
    if ((snap.data().valorAplicado||0) > 0) return false; // não apagar se já tiver aplicações
    await col.doc(id).delete();
    return true;
  }

  // Lista as aplicações (abatimentos) já feitas com esta nota de crédito
  async function getAplicacoesPorCredito(empresaId, notaCreditoId) {
    const col = await _subCol(empresaId, 'aplicacoesCredito');
    const snap = await col.where('notaCreditoId', '==', notaCreditoId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Lista as aplicações (abatimentos) já recebidas por uma fatura, vindas de quaisquer notas de crédito
  async function getAplicacoesPorFatura(empresaId, faturaId) {
    const col = await _subCol(empresaId, 'aplicacoesCredito');
    const snap = await col.where('faturaId', '==', faturaId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Aplica manualmente um valor da nota de crédito a UMA fatura específica.
  // Valida: (1) a soma já aplicada da nota + este valor não excede o total da nota;
  //         (2) o valor não excede o saldo ainda em dívida dessa fatura.
  // Gera o lançamento contabilístico: Débito 717 (Devoluções de Vendas) / Crédito 211 (Clientes).
  async function aplicarCreditoEmFatura(empresaId, notaCreditoId, faturaId, valorAbatido) {
    valorAbatido = parseFloat(valorAbatido) || 0;
    if (valorAbatido <= 0) throw new Error('O valor a abater deve ser superior a 0.');

    const colCred = await _subCol(empresaId, 'notasCredito');
    const colFat  = await _subCol(empresaId, 'faturas');

    const [snapCred, snapFat] = await Promise.all([ colCred.doc(notaCreditoId).get(), colFat.doc(faturaId).get() ]);
    if (!snapCred.exists) throw new Error('Nota de crédito não encontrada.');
    if (!snapFat.exists)  throw new Error('Fatura não encontrada.');

    const cred = snapCred.data();
    const fat  = snapFat.data();

    if (cred.estado === 'anulada') throw new Error('Esta nota de crédito está anulada.');

    // validação 1: não exceder o valor disponível da nota de crédito
    const disponivelNaNota = (cred.valorTotal||0) - (cred.valorAplicado||0);
    if (valorAbatido > disponivelNaNota + 0.005) { // pequena tolerância para arredondamentos
      throw new Error(`Valor excede o saldo disponível da nota de crédito (${disponivelNaNota.toFixed(2)}€ disponíveis).`);
    }

    // validação 2: não exceder o saldo em dívida da fatura
    const saldoFatura = _saldoPendenteFatura(fat);
    if (valorAbatido > saldoFatura + 0.005) {
      throw new Error(`Valor excede o saldo em dívida da fatura (${saldoFatura.toFixed(2)}€ em dívida).`);
    }

    // registar a aplicação (tabela relacional N:N)
    const colApl = await _subCol(empresaId, 'aplicacoesCredito');
    const aplicacao = { notaCreditoId, faturaId, valorAbatido, criadaEm: today() };
    const refApl = await colApl.add(aplicacao);

    // atualizar saldo acumulado na nota de crédito
    const novoAplicadoCred = (cred.valorAplicado||0) + valorAbatido;
    await colCred.doc(notaCreditoId).update({
      valorAplicado: novoAplicadoCred,
      estado: novoAplicadoCred >= (cred.valorTotal||0) - 0.005 ? 'aplicada' : 'aberta',
    });

    // atualizar saldo acumulado na fatura
    const novoAbatidoFat = (fat.valorAbatido||0) + valorAbatido;
    await colFat.doc(faturaId).update({ valorAbatido: novoAbatidoFat });

    // lançamento contabilístico: Débito 717 (Devoluções de Vendas) / Crédito 211 (Clientes)
    await _garantirConta717(empresaId);
    const clientes = await getClientes(empresaId);
    const cliente = clientes.find(c => c.id === cred.clienteId);
    await addLancamento(empresaId, {
      data:         today(),
      diario:       'V',
      documento:    `${cred.numero} → ${fat.numero}`,
      descricao:    `Aplicação de nota de crédito ${cred.numero} na fatura ${fat.numero} — ${cliente?cliente.nome:'Cliente'}`,
      contaDebito:  '717',
      contaCredito: '211',
      valorBase:    valorAbatido,
      taxaIva:      0,
      valorIva:     0,
      valorTotal:   valorAbatido,
      estado:       'conferido',
    });

    return { id: refApl.id, ...aplicacao };
  }

  // Remove uma aplicação já feita (desfaz o abatimento), repondo os saldos na nota e na fatura.
  // Não remove o lançamento contabilístico histórico já gerado — apenas estorna via novo lançamento inverso,
  // mantendo o rasto de auditoria completo.
  async function removerAplicacaoCredito(empresaId, aplicacaoId) {
    const colApl = await _subCol(empresaId, 'aplicacoesCredito');
    const snapApl = await colApl.doc(aplicacaoId).get();
    if (!snapApl.exists) return false;
    const apl = snapApl.data();

    const colCred = await _subCol(empresaId, 'notasCredito');
    const colFat  = await _subCol(empresaId, 'faturas');
    const [snapCred, snapFat] = await Promise.all([ colCred.doc(apl.notaCreditoId).get(), colFat.doc(apl.faturaId).get() ]);

    if (snapCred.exists) {
      const cred = snapCred.data();
      const novoAplicado = Math.max(0, (cred.valorAplicado||0) - apl.valorAbatido);
      await colCred.doc(apl.notaCreditoId).update({ valorAplicado: novoAplicado, estado: 'aberta' });
    }
    if (snapFat.exists) {
      const fat = snapFat.data();
      const novoAbatido = Math.max(0, (fat.valorAbatido||0) - apl.valorAbatido);
      await colFat.doc(apl.faturaId).update({ valorAbatido: novoAbatido });

      // lançamento de estorno (inverte o débito/crédito original)
      await addLancamento(empresaId, {
        data:         today(),
        diario:       'V',
        documento:    `Estorno aplicação`,
        descricao:    `Estorno de abatimento de nota de crédito na fatura ${fat.numero}`,
        contaDebito:  '211',
        contaCredito: '717',
        valorBase:    apl.valorAbatido,
        taxaIva:      0,
        valorIva:     0,
        valorTotal:   apl.valorAbatido,
        estado:       'conferido',
      });
    }

    await colApl.doc(aplicacaoId).delete();
    return true;
  }

  // Anula a nota de crédito por completo (não pode ter aplicações activas)
  async function anularNotaCredito(empresaId, id) {
    const col = await _subCol(empresaId, 'notasCredito');
    const snap = await col.doc(id).get();
    if (!snap.exists) return false;
    if ((snap.data().valorAplicado||0) > 0) return false; // remover aplicações primeiro
    await col.doc(id).update({ estado: 'anulada' });
    return true;
  }

  // ── IVA Períodos ─────────────────────────────────────────
  async function getIvaPeriodos(empresaId) {
    const col = await _subCol(empresaId, 'ivaPeriodos');
    return _getAllDocs(col, 'criadoEm', true);
  }

  async function addIvaPeriodo(empresaId, periodo) {
    const col = await _subCol(empresaId, 'ivaPeriodos');
    const novo = { criadoEm: today(), estado: 'apurado', ...periodo };
    const ref = await col.add(novo);
    return { id: ref.id, ...novo };
  }

  async function marcarIvaPeriodoSubmetido(empresaId, periodoId) {
    const col = await _subCol(empresaId, 'ivaPeriodos');
    await col.doc(periodoId).update({ estado: 'submetido' });
  }

  // ── Estatísticas rápidas ─────────────────────────────────
  async function statsEmpresa(empresaId) {
    const lancs = await getLancamentos(empresaId);
    const totalLanc = lancs.length;
    const ivaLiquidado = lancs.reduce((s, l) => s + (l.taxaIva > 0 && l.diario === 'V' ? l.valorIva : 0), 0);
    const ivaDedutivel = lancs.reduce((s, l) => s + (l.taxaIva > 0 && l.diario === 'C' ? l.valorIva : 0), 0);
    const ivaEntregar  = Math.max(0, ivaLiquidado - ivaDedutivel);
    return { totalLanc, ivaLiquidado, ivaDedutivel, ivaEntregar };
  }

  // ── Export / Import JSON ─────────────────────────────────
  async function exportEmpresa(empresaId) {
    const emp = await empresaActivaPorId(empresaId);
    if (!emp) return;
    const [planoContas, diarios, lancamentos, clientes, faturas, ivaPeriodos, notasCredito, aplicacoesCredito] = await Promise.all([
      getContas(empresaId), getDiarios(empresaId), getLancamentos(empresaId),
      getClientes(empresaId), getFaturas(empresaId), getIvaPeriodos(empresaId),
      getNotasCredito(empresaId), (async () => { const col = await _subCol(empresaId, 'aplicacoesCredito'); return _getAllDocs(col); })(),
    ]);
    const pacote = { ...emp, planoContas, diarios, lancamentos, clientes, faturas, ivaPeriodos, notasCredito, aplicacoesCredito };
    const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `snc_${emp.nome.replace(/\s+/g,'_')}_backup.json`;
    a.click();
  }

  async function importEmpresa(jsonStr) {
    try {
      const dados = JSON.parse(jsonStr);
      if (!dados.nome || !dados.planoContas) throw new Error('Ficheiro inválido');

      const col = await _empresasCol();
      const ref = col.doc();
      const base = {
        nome: dados.nome, nif: dados.nif||'', morada: dados.morada||'',
        exercicio: dados.exercicio || new Date().getFullYear(),
        regime: dados.regime || 'mensal', criadaEm: today(),
      };
      await ref.set(base);

      const batch = db.batch();
      (dados.planoContas||[]).forEach(c => batch.set(ref.collection('planoContas').doc(c.codigo || uid()), c));
      (dados.diarios||[]).forEach(d => batch.set(ref.collection('diarios').doc(d.codigo || uid()), d));
      (dados.clientes||[]).forEach(c => batch.set(ref.collection('clientes').doc(uid()), c));
      (dados.lancamentos||[]).forEach(l => batch.set(ref.collection('lancamentos').doc(uid()), l));
      (dados.faturas||[]).forEach(f => batch.set(ref.collection('faturas').doc(uid()), f));
      (dados.ivaPeriodos||[]).forEach(p => batch.set(ref.collection('ivaPeriodos').doc(uid()), p));
      (dados.notasCredito||[]).forEach(c => batch.set(ref.collection('notasCredito').doc(uid()), c));
      (dados.aplicacoesCredito||[]).forEach(a => batch.set(ref.collection('aplicacoesCredito').doc(uid()), a));
      await batch.commit();

      return { id: ref.id, ...base };
    } catch(e) {
      console.error('Erro ao importar empresa:', e);
      return null;
    }
  }

  // ── API pública ──────────────────────────────────────────
  return {
    uid, today,
    // empresas
    getEmpresas, criarEmpresa, editarEmpresa, eliminarEmpresa,
    getEmpresaActiva, setEmpresaActiva, empresaActiva, donoEmpresaActiva,
    // administração
    isAdmin, getTodasEmpresasAdmin,
    // lixeira (backups de empresas eliminadas)
    getLixeira, restaurarDaLixeira, eliminarDaLixeiraDefinitivo,
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
    // notas de crédito
    getNotasCredito, addNotaCredito, deleteNotaCredito, anularNotaCredito, proximoNumeroCredito,
    getAplicacoesPorCredito, getAplicacoesPorFatura, aplicarCreditoEmFatura, removerAplicacaoCredito,
    // iva
    getIvaPeriodos, addIvaPeriodo, marcarIvaPeriodoSubmetido,
    // stats
    statsEmpresa,
    // import/export
    exportEmpresa, importEmpresa,
  };
})();
