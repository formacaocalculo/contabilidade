// assets/js/modules/tenant.js
// ============================================================
//  Motor de multi-empresa (multi-tenant) do ContaSNC.
//
//  Estrutura no Firestore:
//    users/{uid}/empresas/{empresaId}
//    users/{uid}/empresas/{empresaId}/planoContas/{contaId}
//    users/{uid}/empresas/{empresaId}/diarios/{diarioId}
//    users/{uid}/empresas/{empresaId}/lancamentos/{lancId}
//    users/{uid}/empresas/{empresaId}/clientes/{clienteId}
//    users/{uid}/empresas/{empresaId}/faturas/{faturaId}
//    users/{uid}/empresas/{empresaId}/notasCredito/{creditoId}
//    users/{uid}/empresas/{empresaId}/aplicacoesCredito/{aplicacaoId}
//    users/{uid}/empresas/{empresaId}/ivaPeriodos/{periodoId}
//
//  admins/{uid}    -> só leitura pelo próprio; escrita sempre bloqueada via
//                      app (atribuído manualmente na consola Firebase)
//  lixeira/{id}    -> backups de empresas inteiras eliminadas; só admins
// ============================================================

import { auth, db } from '../app.js';
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, collectionGroup,
    getDocs, query, where, orderBy, limit, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const ACTIVE_KEY   = 'snc_empresa_activa';
const ACTIVE_OWNER = 'snc_empresa_activa_dono';

export const TAXAS_IVA_PADRAO = {
    continente: { normal: 23, intermedia: 13, reduzida: 6 },
    madeira:    { normal: 22, intermedia: 12, reduzida: 5 },
    acores:     { normal: 16, intermedia: 9,  reduzida: 4 },
};

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
    { codigo:'C',  nome:'Compras',            tipo:'Compras',           ativo:true },
    { codigo:'V',  nome:'Vendas',             tipo:'Vendas',            ativo:true },
    { codigo:'B',  nome:'Bancos',             tipo:'Bancos',            ativo:true },
    { codigo:'CX', nome:'Caixa',              tipo:'Caixa',             ativo:true },
    { codigo:'OD', nome:'Operações Diversas', tipo:'Operações Diversas',ativo:true },
    { codigo:'S',  nome:'Salários',           tipo:'Salários',          ativo:true },
];

const SUBCOLECOES_EMPRESA = ['planoContas','diarios','lancamentos','clientes','faturas','notasCredito','aplicacoesCredito','ivaPeriodos'];

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function today() {
    return new Date().toISOString().slice(0, 10);
}

function uidProprio() {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilizador não autenticado.');
    return user.uid;
}

function uidUtilizador() {
    const dono = localStorage.getItem(ACTIVE_OWNER);
    return dono || uidProprio();
}

export function donoEmpresaAtiva() {
    return localStorage.getItem(ACTIVE_OWNER) || null;
}

let _isAdminCache = null;
export async function isAdmin() {
    if (_isAdminCache !== null) return _isAdminCache;
    try {
        const uidP = uidProprio();
        const snap = await getDoc(doc(db, 'admins', uidP));
        _isAdminCache = snap.exists();
    } catch (e) {
        _isAdminCache = false;
    }
    return _isAdminCache;
}
function invalidarCacheAdmin() { _isAdminCache = null; }

export async function confirmarAdminAtual() {
    const u = auth.currentUser;
    if (!u) return false;
    try {
        const snap = await getDoc(doc(db, 'admins', u.uid));
        return snap.exists();
    } catch (e) {
        return false;
    }
}

export async function listarTodasEmpresasAdmin() {
    const snap = await getDocs(collectionGroup(db, 'empresas'));
    const lista = [];
    snap.forEach(d => {
        const partes = d.ref.path.split('/');
        const donoUid = partes[1];
        lista.push({ id: d.id, donoUid, ...d.data() });
    });
    return lista;
}

function empresasCol(uidAlvo) {
    const u = uidAlvo || uidUtilizador();
    return collection(db, 'users', u, 'empresas');
}
function empresaDoc(empresaId, uidAlvo) {
    const u = uidAlvo || uidUtilizador();
    return doc(db, 'users', u, 'empresas', empresaId);
}

export function colDeEmpresa(empresaId, donoUid, nomeColecao) {
    return collection(empresaDoc(empresaId, donoUid), nomeColecao);
}
export function docDeEmpresa(empresaId, donoUid, nomeColecao, docId) {
    return doc(empresaDoc(empresaId, donoUid), nomeColecao, docId);
}

function colEmpresa(nomeColecao, empresaIdParam) {
    const empresaId = empresaIdParam || empresaAtivaId();
    if (!empresaId) throw new Error('Nenhuma empresa ativa selecionada.');
    return collection(empresaDoc(empresaId), nomeColecao);
}
function docEmpresa(nomeColecao, docId, empresaIdParam) {
    const empresaId = empresaIdParam || empresaAtivaId();
    if (!empresaId) throw new Error('Nenhuma empresa ativa selecionada.');
    return doc(empresaDoc(empresaId), nomeColecao, docId);
}

async function getAllDocs(colRef, campoOrdem, desc) {
    const q = campoOrdem ? query(colRef, orderBy(campoOrdem, desc ? 'desc' : 'asc')) : colRef;
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listarEmpresas() {
    const uidP = uidProprio();
    return getAllDocs(empresasCol(uidP), 'criadaEm');
}

export function empresaAtivaId() {
    return localStorage.getItem(ACTIVE_KEY);
}

export function definirEmpresaAtiva(empresaId, donoUid) {
    localStorage.setItem(ACTIVE_KEY, empresaId);
    if (donoUid) localStorage.setItem(ACTIVE_OWNER, donoUid);
    else localStorage.removeItem(ACTIVE_OWNER);
    invalidarCacheEmpresaAtiva();
}

export function limparEmpresaAtiva() {
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(ACTIVE_OWNER);
    invalidarCacheEmpresaAtiva();
}

let _empresaAtivaCache = null;
export async function empresaAtiva() {
    const id = empresaAtivaId();
    if (!id) return null;
    if (_empresaAtivaCache && _empresaAtivaCache.id === id) return _empresaAtivaCache;
    const snap = await getDoc(empresaDoc(id));
    if (!snap.exists()) return null;
    _empresaAtivaCache = { id: snap.id, ...snap.data() };
    return _empresaAtivaCache;
}
function invalidarCacheEmpresaAtiva() { _empresaAtivaCache = null; }

async function empresaPorId(empresaId, uidAlvo) {
    const snap = await getDoc(empresaDoc(empresaId, uidAlvo));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function criarEmpresa(dados) {
    const uidP = uidProprio();
    const col = empresasCol(uidP);
    const novaRef = doc(col);
    const nova = {
        nome:      dados.nome,
        nif:       dados.nif || '',
        morada:    dados.morada || '',
        exercicio: dados.exercicio || new Date().getFullYear(),
        regime:    dados.regime || 'mensal',
        criadaEm:  today(),
    };
    await setDoc(novaRef, nova);

    const batch = writeBatch(db);
    PLANO_PADRAO.forEach(c => batch.set(doc(novaRef, 'planoContas', c.codigo), c));
    DIARIOS_PADRAO.forEach(d => batch.set(doc(novaRef, 'diarios', d.codigo), d));
    await batch.commit();

    return { id: novaRef.id, ...nova };
}

export async function editarEmpresa(id, dados) {
    const ref = empresaDoc(id);
    await updateDoc(ref, dados);
    invalidarCacheEmpresaAtiva();
    const snap = await getDoc(ref);
    return { id: snap.id, ...snap.data() };
}

export async function eliminarEmpresa(empresaId, uidAlvo) {
    const uidDono = uidAlvo || uidUtilizador();
    const ref = empresaDoc(empresaId, uidDono);
    const snapEmpresa = await getDoc(ref);
    if (!snapEmpresa.exists()) return null;
    const dadosEmpresa = snapEmpresa.data();

    const dump = {};
    for (const nome of SUBCOLECOES_EMPRESA) {
        const subSnap = await getDocs(collection(ref, nome));
        dump[nome] = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    await setDoc(doc(db, 'lixeira', empresaId), {
        donoUid: uidDono,
        empresa: { id: empresaId, ...dadosEmpresa },
        ...dump,
        eliminadaEm: today(),
        eliminadaPor: auth.currentUser?.email || 'desconhecido',
    });

    for (const nome of SUBCOLECOES_EMPRESA) {
        const subSnap = await getDocs(collection(ref, nome));
        for (const d of subSnap.docs) await deleteDoc(d.ref);
    }
    await deleteDoc(ref);

    if (empresaAtivaId() === empresaId) limparEmpresaAtiva();
    return dadosEmpresa;
}

export async function moverEmpresa(empresaId, uidOrigem, uidDestino) {
    if (!uidOrigem || !uidDestino) throw new Error('Utilizador de origem ou destino em falta.');
    if (uidOrigem === uidDestino) throw new Error('A empresa já pertence a esse utilizador.');

    const refOrigem = empresaDoc(empresaId, uidOrigem);
    const snapEmpresa = await getDoc(refOrigem);
    if (!snapEmpresa.exists()) throw new Error('Empresa não encontrada na origem.');
    const dadosEmpresa = snapEmpresa.data();

    const dump = {};
    for (const nome of SUBCOLECOES_EMPRESA) {
        const subSnap = await getDocs(collection(refOrigem, nome));
        dump[nome] = subSnap.docs.map(d => ({ id: d.id, data: d.data() }));
    }

    const refDestino = empresaDoc(empresaId, uidDestino);
    await setDoc(refDestino, dadosEmpresa);
    for (const nome of SUBCOLECOES_EMPRESA) {
        for (const item of dump[nome]) await setDoc(doc(refDestino, nome, item.id), item.data);
    }

    for (const nome of SUBCOLECOES_EMPRESA) {
        const subSnap = await getDocs(collection(refOrigem, nome));
        for (const d of subSnap.docs) await deleteDoc(d.ref);
    }
    await deleteDoc(refOrigem);

    if (empresaAtivaId() === empresaId) limparEmpresaAtiva();
    return dadosEmpresa;
}

export async function guardarPerfilProprio() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, 'perfis', user.uid), { email: user.email || '', atualizadoEm: new Date() }, { merge: true });
    } catch (e) {
        console.warn('[perfil] não foi possível guardar o perfil do utilizador:', e);
    }
}

export async function obterPerfis(uids) {
    const unicos = [...new Set((uids || []).filter(Boolean))];
    const mapa = {};
    await Promise.all(unicos.map(async (uidAlvo) => {
        try {
            const snap = await getDoc(doc(db, 'perfis', uidAlvo));
            if (snap.exists()) mapa[uidAlvo] = snap.data();
        } catch (e) { /* silencioso */ }
    }));
    return mapa;
}

export async function listarLixeira() {
    return getAllDocs(collection(db, 'lixeira'), 'eliminadaEm', true);
}

export async function restaurarDaLixeira(empresaId) {
    const snap = await getDoc(doc(db, 'lixeira', empresaId));
    if (!snap.exists()) return null;
    const backup = snap.data();
    const uidDono = backup.donoUid;

    const ref = empresaDoc(empresaId, uidDono);
    const { id, ...dadosEmpresa } = backup.empresa;
    await setDoc(ref, dadosEmpresa);

    const batch = writeBatch(db);
    SUBCOLECOES_EMPRESA.forEach(nome => {
        (backup[nome] || []).forEach(item => {
            const { id: itemId, ...rest } = item;
            batch.set(doc(ref, nome, itemId), rest);
        });
    });
    await batch.commit();

    await deleteDoc(doc(db, 'lixeira', empresaId));
    return { id: empresaId, donoUid: uidDono, ...dadosEmpresa };
}

export async function eliminarDaLixeiraDefinitivo(empresaId) {
    await deleteDoc(doc(db, 'lixeira', empresaId));
}

export function entrarNaEmpresa(empresaId, donoUid) {
    definirEmpresaAtiva(empresaId, donoUid);
}

export async function getContas(empresaId) {
    const docs = await getAllDocs(colEmpresa('planoContas', empresaId));
    return docs.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
}

export async function addConta(empresaId, conta) {
    const ref = docEmpresa('planoContas', conta.codigo, empresaId);
    const existente = await getDoc(ref);
    if (existente.exists()) return false;
    await setDoc(ref, { ...conta, criadaEm: today(), personalizada: true });
    return true;
}

export async function editConta(empresaId, codigo, dados) {
    await updateDoc(docEmpresa('planoContas', codigo, empresaId), dados);
}

export async function deleteConta(empresaId, codigo) {
    const ref = docEmpresa('planoContas', codigo, empresaId);
    const snap = await getDoc(ref);
    if (!snap.exists() || !snap.data().personalizada) return false;
    await deleteDoc(ref);
    return true;
}

async function garantirConta717(empresaId) {
    const ref = docEmpresa('planoContas', '717', empresaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, { codigo:'717', designacao:'Devoluções de Vendas', nivel:3, tipo:'Subconta', natureza:'Rendimento', movimentos:true });
    }
}

export async function getDiarios(empresaId) {
    return getAllDocs(colEmpresa('diarios', empresaId));
}

export async function addDiario(empresaId, diario) {
    const ref = docEmpresa('diarios', diario.codigo, empresaId);
    const existente = await getDoc(ref);
    if (existente.exists()) return false;
    await setDoc(ref, { ...diario, criadoEm: today() });
    return true;
}

export async function editDiario(empresaId, codigo, dados) {
    await updateDoc(docEmpresa('diarios', codigo, empresaId), dados);
}

export async function getLancamentos(empresaId) {
    return getAllDocs(colEmpresa('lancamentos', empresaId), 'data', true);
}

export async function addLancamento(empresaId, lanc) {
    const col = colEmpresa('lancamentos', empresaId);
    const novo = {
        data:         lanc.data        || today(),
        diario:       lanc.diario      || '',
        documento:    lanc.documento   || '',
        descricao:    lanc.descricao   || '',
        contaDebito:  lanc.contaDebito || '',
        contaCredito: lanc.contaCredito|| '',
        valorBase:    parseFloat(lanc.valorBase)  || 0,
        taxaIva:      parseFloat(lanc.taxaIva)    || 0,
        valorIva:     parseFloat(lanc.valorIva)   || 0,
        valorTotal:   parseFloat(lanc.valorTotal) || 0,
        retencao:     parseFloat(lanc.retencao)   || 0,
        estado:       lanc.estado || 'pendente',
        criadoEm:     today(),
    };
    const ref = await addDoc(col, novo);
    return { id: ref.id, ...novo };
}

export async function editLancamento(empresaId, id, dados) {
    await updateDoc(docEmpresa('lancamentos', id, empresaId), dados);
}

export async function deleteLancamento(empresaId, id) {
    await deleteDoc(docEmpresa('lancamentos', id, empresaId));
}

export async function getClientes(empresaId) {
    return getAllDocs(colEmpresa('clientes', empresaId), 'criadoEm');
}

export async function addCliente(empresaId, cliente) {
    const novo = {
        nome:     cliente.nome || '',
        nif:      cliente.nif || '',
        morada:   cliente.morada || '',
        email:    cliente.email || '',
        telefone: cliente.telefone || '',
        criadoEm: today(),
    };
    const ref = await addDoc(colEmpresa('clientes', empresaId), novo);
    return { id: ref.id, ...novo };
}

export async function editCliente(empresaId, id, dados) {
    await updateDoc(docEmpresa('clientes', id, empresaId), dados);
}

export async function deleteCliente(empresaId, id) {
    const snapFat = await getDocs(query(colEmpresa('faturas', empresaId), where('clienteId', '==', id), limit(1)));
    if (!snapFat.empty) return false;
    await deleteDoc(docEmpresa('clientes', id, empresaId));
    return true;
}

function calcularTotaisFatura(linhas) {
    let base = 0, iva = 0;
    const detalheMap = {};
    (linhas || []).forEach(l => {
        const qtd = parseFloat(l.quantidade) || 0;
        const preco = parseFloat(l.precoUnit) || 0;
        const taxa = parseFloat(l.taxaIva) || 0;
        const subtotal = qtd * preco;
        base += subtotal;
        iva += subtotal * taxa / 100;
        if (!detalheMap[taxa]) detalheMap[taxa] = { taxa, base: 0, iva: 0 };
        detalheMap[taxa].base += subtotal;
        detalheMap[taxa].iva += subtotal * taxa / 100;
    });
    const ivaDetalhe = Object.values(detalheMap).sort((a, b) => a.taxa - b.taxa);
    return { base, iva, total: base + iva, ivaDetalhe };
}

export async function getFaturas(empresaId) {
    return getAllDocs(colEmpresa('faturas', empresaId), 'criadaEm', true);
}

export async function proximoNumeroFatura(empresaId) {
    const emp = await empresaPorId(empresaId, uidUtilizador());
    const ano = (emp && emp.exercicio) || new Date().getFullYear();
    const prefixo = `FT ${ano}/`;
    const snap = await getDocs(query(colEmpresa('faturas', empresaId), where('numero', '>=', prefixo), where('numero', '<', prefixo + '\uf8ff')));
    return `${prefixo}${String(snap.size + 1).padStart(4, '0')}`;
}

export async function addFatura(empresaId, dados) {
    const totais = calcularTotaisFatura(dados.linhas);
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
        ivaDetalhe:     totais.ivaDetalhe,
        valorAbatido:   0,
        estado:         dados.estado || 'rascunho',
        lancamentoId:   null,
        criadaEm:       today(),
    };
    const ref = await addDoc(colEmpresa('faturas', empresaId), nova);
    return { id: ref.id, ...nova };
}

export async function editFatura(empresaId, id, dados) {
    const ref = docEmpresa('faturas', id, empresaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const atual = snap.data();
    const linhas = dados.linhas || atual.linhas;
    const totais = calcularTotaisFatura(linhas);
    await updateDoc(ref, { ...dados, linhas, valorBase: totais.base, valorIva: totais.iva, valorTotal: totais.total, ivaDetalhe: totais.ivaDetalhe });
}

export async function deleteFatura(empresaId, id) {
    const ref = docEmpresa('faturas', id, empresaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    if (snap.data().estado !== 'rascunho') return false;
    await deleteDoc(ref);
    return true;
}

export async function emitirFatura(empresaId, id) {
    const ref = docEmpresa('faturas', id, empresaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const fat = snap.data();
    if (fat.estado !== 'rascunho') return null;

    const [clientes, emp] = await Promise.all([getClientes(empresaId), empresaAtiva()]);
    const cliente = clientes.find(c => c.id === fat.clienteId);
    const taxaPredominante = (fat.linhas || []).reduce((max, l) => Math.max(max, parseFloat(l.taxaIva) || 0), 0);

    const lancNovo = await addLancamento(empresaId, {
        data: fat.data, diario: 'V', documento: fat.numero,
        descricao: `Venda — ${cliente ? cliente.nome : 'Cliente'} (${fat.numero})`,
        contaDebito: '211', contaCredito: '72',
        valorBase: fat.valorBase, taxaIva: taxaPredominante, valorIva: fat.valorIva,
        valorTotal: fat.valorTotal, retencao: 0, estado: 'pendente',
    });

    const sequencial = parseInt((fat.numero || '').split('/')[1], 10) || 0;
    const tipoDoc = fat.tipoDocumento || 'FT';
    const codigoValidacao = emp && (tipoDoc === 'FS' ? (emp.codigoValidacaoFS || emp.codigoValidacaoFT) : emp.codigoValidacaoFT);
    const atcud = codigoValidacao ? `${codigoValidacao}-${sequencial}` : null;

    const atualizacao = {
        estado: 'emitida',
        lancamentoId: lancNovo.id,
        emitidaEm: today(),
        tipoDocumento: tipoDoc,
        ...(atcud ? { atcud } : {}),
        empresaSnapshot: {
            nome: emp ? emp.nome : '',
            nif: emp ? emp.nif || '' : '',
            morada: emp ? emp.morada || '' : '',
        },
        clienteSnapshot: {
            nome: cliente ? cliente.nome : '',
            nif: cliente ? cliente.nif || '' : '',
            morada: cliente ? cliente.morada || '' : '',
        },
    };
    await updateDoc(ref, atualizacao);
    return { id, ...fat, ...atualizacao };
}

export async function marcarFaturaPaga(empresaId, id) {
    const ref = docEmpresa('faturas', id, empresaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const fat = snap.data();
    if (fat.estado !== 'emitida') return null;

    const atualizacao = { estado: 'paga', pagaEm: today() };
    await updateDoc(ref, atualizacao);
    if (fat.lancamentoId) await editLancamento(empresaId, fat.lancamentoId, { estado: 'conferido' });
    return { id, ...fat, ...atualizacao };
}

function saldoPendenteFatura(fat) {
    return Math.max(0, (fat.valorTotal || 0) - (fat.valorAbatido || 0));
}

export async function getNotasCredito(empresaId) {
    return getAllDocs(colEmpresa('notasCredito', empresaId), 'criadaEm', true);
}

export async function proximoNumeroCredito(empresaId) {
    const emp = await empresaPorId(empresaId, uidUtilizador());
    const ano = (emp && emp.exercicio) || new Date().getFullYear();
    const prefixo = `NC ${ano}/`;
    const snap = await getDocs(query(colEmpresa('notasCredito', empresaId), where('numero', '>=', prefixo), where('numero', '<', prefixo + '\uf8ff')));
    return `${prefixo}${String(snap.size + 1).padStart(4, '0')}`;
}

export async function addNotaCredito(empresaId, dados) {
    const totais = calcularTotaisFatura(dados.linhas);
    const numero = dados.numero || await proximoNumeroCredito(empresaId);

    const [clientes, emp] = await Promise.all([getClientes(empresaId), empresaAtiva()]);
    const cliente = clientes.find(c => c.id === dados.clienteId);

    const sequencial = parseInt((numero || '').split('/')[1], 10) || 0;
    const codigoValidacao = emp && emp.codigoValidacaoNC;
    const atcud = codigoValidacao ? `${codigoValidacao}-${sequencial}` : null;

    const nova = {
        numero,
        data:           dados.data || today(),
        clienteId:      dados.clienteId || '',
        faturaOrigemId: dados.faturaOrigemId || '',
        motivo:         dados.motivo || '',
        linhas:         dados.linhas || [],
        valorBase:      totais.base,
        valorIva:       totais.iva,
        valorTotal:     totais.total,
        ivaDetalhe:     totais.ivaDetalhe,
        valorAplicado:  0,
        estado:         'aberta',
        tipoDocumento:  'NC',
        criadaEm:       today(),
        ...(atcud ? { atcud } : {}),
        empresaSnapshot: {
            nome: emp ? emp.nome : '',
            nif: emp ? emp.nif || '' : '',
            morada: emp ? emp.morada || '' : '',
        },
        clienteSnapshot: {
            nome: cliente ? cliente.nome : '',
            nif: cliente ? cliente.nif || '' : '',
            morada: cliente ? cliente.morada || '' : '',
        },
    };
    const ref = await addDoc(colEmpresa('notasCredito', empresaId), nova);
    return { id: ref.id, ...nova };
}

export async function deleteNotaCredito(empresaId, id) {
    const ref = docEmpresa('notasCredito', id, empresaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    if ((snap.data().valorAplicado || 0) > 0) return false;
    await deleteDoc(ref);
    return true;
}

export async function getAplicacoesPorCredito(empresaId, notaCreditoId) {
    const snap = await getDocs(query(colEmpresa('aplicacoesCredito', empresaId), where('notaCreditoId', '==', notaCreditoId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAplicacoesPorFatura(empresaId, faturaId) {
    const snap = await getDocs(query(colEmpresa('aplicacoesCredito', empresaId), where('faturaId', '==', faturaId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function aplicarCreditoEmFatura(empresaId, notaCreditoId, faturaId, valorAbatido) {
    valorAbatido = parseFloat(valorAbatido) || 0;
    if (valorAbatido <= 0) throw new Error('O valor a abater deve ser superior a 0.');

    const refCred = docEmpresa('notasCredito', notaCreditoId, empresaId);
    const refFat  = docEmpresa('faturas', faturaId, empresaId);
    const [snapCred, snapFat] = await Promise.all([getDoc(refCred), getDoc(refFat)]);
    if (!snapCred.exists()) throw new Error('Nota de crédito não encontrada.');
    if (!snapFat.exists())  throw new Error('Fatura não encontrada.');

    const cred = snapCred.data();
    const fat  = snapFat.data();
    if (cred.estado === 'anulada') throw new Error('Esta nota de crédito está anulada.');

    const disponivelNaNota = (cred.valorTotal || 0) - (cred.valorAplicado || 0);
    if (valorAbatido > disponivelNaNota + 0.005) {
        throw new Error(`Valor excede o saldo disponível da nota de crédito (${disponivelNaNota.toFixed(2)}€ disponíveis).`);
    }
    const saldoFatura = saldoPendenteFatura(fat);
    if (valorAbatido > saldoFatura + 0.005) {
        throw new Error(`Valor excede o saldo em dívida da fatura (${saldoFatura.toFixed(2)}€ em dívida).`);
    }

    const aplicacao = { notaCreditoId, faturaId, valorAbatido, criadaEm: today() };
    const refApl = await addDoc(colEmpresa('aplicacoesCredito', empresaId), aplicacao);

    const novoAplicadoCred = (cred.valorAplicado || 0) + valorAbatido;
    await updateDoc(refCred, {
        valorAplicado: novoAplicadoCred,
        estado: novoAplicadoCred >= (cred.valorTotal || 0) - 0.005 ? 'aplicada' : 'aberta',
    });

    const novoAbatidoFat = (fat.valorAbatido || 0) + valorAbatido;
    await updateDoc(refFat, { valorAbatido: novoAbatidoFat });

    await garantirConta717(empresaId);
    const clientes = await getClientes(empresaId);
    const cliente = clientes.find(c => c.id === cred.clienteId);
    await addLancamento(empresaId, {
        data: today(), diario: 'V', documento: `${cred.numero} → ${fat.numero}`,
        descricao: `Aplicação de nota de crédito ${cred.numero} na fatura ${fat.numero} — ${cliente ? cliente.nome : 'Cliente'}`,
        contaDebito: '717', contaCredito: '211',
        valorBase: valorAbatido, taxaIva: 0, valorIva: 0, valorTotal: valorAbatido, estado: 'conferido',
    });

    return { id: refApl.id, ...aplicacao };
}

export async function removerAplicacaoCredito(empresaId, aplicacaoId) {
    const refApl = docEmpresa('aplicacoesCredito', aplicacaoId, empresaId);
    const snapApl = await getDoc(refApl);
    if (!snapApl.exists()) return false;
    const apl = snapApl.data();

    const refCred = docEmpresa('notasCredito', apl.notaCreditoId, empresaId);
    const refFat  = docEmpresa('faturas', apl.faturaId, empresaId);
    const [snapCred, snapFat] = await Promise.all([getDoc(refCred), getDoc(refFat)]);

    if (snapCred.exists()) {
        const cred = snapCred.data();
        const novoAplicado = Math.max(0, (cred.valorAplicado || 0) - apl.valorAbatido);
        await updateDoc(refCred, { valorAplicado: novoAplicado, estado: 'aberta' });
    }
    if (snapFat.exists()) {
        const fat = snapFat.data();
        const novoAbatido = Math.max(0, (fat.valorAbatido || 0) - apl.valorAbatido);
        await updateDoc(refFat, { valorAbatido: novoAbatido });

        await addLancamento(empresaId, {
            data: today(), diario: 'V', documento: 'Estorno aplicação',
            descricao: `Estorno de abatimento de nota de crédito na fatura ${fat.numero}`,
            contaDebito: '211', contaCredito: '717',
            valorBase: apl.valorAbatido, taxaIva: 0, valorIva: 0, valorTotal: apl.valorAbatido, estado: 'conferido',
        });
    }

    await deleteDoc(refApl);
    return true;
}

export async function anularNotaCredito(empresaId, id) {
    const ref = docEmpresa('notasCredito', id, empresaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    if ((snap.data().valorAplicado || 0) > 0) return false;
    await updateDoc(ref, { estado: 'anulada' });
    return true;
}

export async function getIvaPeriodos(empresaId) {
    return getAllDocs(colEmpresa('ivaPeriodos', empresaId), 'criadoEm', true);
}

export async function addIvaPeriodo(empresaId, periodo) {
    const novo = { criadoEm: today(), estado: 'apurado', ...periodo };
    const ref = await addDoc(colEmpresa('ivaPeriodos', empresaId), novo);
    return { id: ref.id, ...novo };
}

export async function marcarIvaPeriodoSubmetido(empresaId, periodoId) {
    await updateDoc(docEmpresa('ivaPeriodos', periodoId, empresaId), { estado: 'submetido' });
}

export async function statsEmpresa(empresaId) {
    const lancs = await getLancamentos(empresaId);
    const totalLanc = lancs.length;
    const ivaLiquidado = lancs.reduce((s, l) => s + (l.taxaIva > 0 && l.diario === 'V' ? l.valorIva : 0), 0);
    const ivaDedutivel = lancs.reduce((s, l) => s + (l.taxaIva > 0 && l.diario === 'C' ? l.valorIva : 0), 0);
    const ivaEntregar = Math.max(0, ivaLiquidado - ivaDedutivel);
    return { totalLanc, ivaLiquidado, ivaDedutivel, ivaEntregar };
}

export async function exportEmpresa(empresaId) {
    const emp = await empresaPorId(empresaId, uidUtilizador());
    if (!emp) return;
    const [planoContas, diarios, lancamentos, clientes, faturas, ivaPeriodos, notasCredito, aplicacoesCredito] = await Promise.all([
        getContas(empresaId), getDiarios(empresaId), getLancamentos(empresaId),
        getClientes(empresaId), getFaturas(empresaId), getIvaPeriodos(empresaId),
        getNotasCredito(empresaId), getAllDocs(colEmpresa('aplicacoesCredito', empresaId)),
    ]);
    const pacote = { ...emp, planoContas, diarios, lancamentos, clientes, faturas, ivaPeriodos, notasCredito, aplicacoesCredito };
    const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `snc_${emp.nome.replace(/\s+/g, '_')}_backup.json`;
    a.click();
}

export async function importEmpresa(jsonStr) {
    try {
        const dados = JSON.parse(jsonStr);
        if (!dados.nome || !dados.planoContas) throw new Error('Ficheiro inválido');

        const uidP = uidProprio();
        const ref = doc(empresasCol(uidP));
        const base = {
            nome: dados.nome, nif: dados.nif || '', morada: dados.morada || '',
            exercicio: dados.exercicio || new Date().getFullYear(),
            regime: dados.regime || 'mensal', criadaEm: today(),
        };
        await setDoc(ref, base);

        const batch = writeBatch(db);
        (dados.planoContas || []).forEach(c => batch.set(doc(ref, 'planoContas', c.codigo || uid()), c));
        (dados.diarios || []).forEach(d => batch.set(doc(ref, 'diarios', d.codigo || uid()), d));
        (dados.clientes || []).forEach(c => batch.set(doc(ref, 'clientes', uid()), c));
        (dados.lancamentos || []).forEach(l => batch.set(doc(ref, 'lancamentos', uid()), l));
        (dados.faturas || []).forEach(f => batch.set(doc(ref, 'faturas', uid()), f));
        (dados.ivaPeriodos || []).forEach(p => batch.set(doc(ref, 'ivaPeriodos', uid()), p));
        (dados.notasCredito || []).forEach(c => batch.set(doc(ref, 'notasCredito', uid()), c));
        (dados.aplicacoesCredito || []).forEach(a => batch.set(doc(ref, 'aplicacoesCredito', uid()), a));
        await batch.commit();

        return { id: ref.id, ...base };
    } catch (e) {
        console.error('Erro ao importar empresa:', e);
        return null;
    }
}

export function reset() {
    invalidarCacheAdmin();
    invalidarCacheEmpresaAtiva();
}

/* ══════════ Taxas de IVA globais ══════════ */
export async function getTaxasIva() {
    try {
        const snap = await getDoc(doc(db, 'config', 'taxasIva'));
        if (snap.exists()) return snap.data();
    } catch (e) { /* sem permissão ou offline — usa padrão */ }
    return { ...TAXAS_IVA_PADRAO };
}

export async function setTaxasIva(dados) {
    await setDoc(doc(db, 'config', 'taxasIva'), {
        ...dados,
        atualizadoEm: today(),
        atualizadoPor: auth.currentUser?.email || '',
    });
}

export async function getTaxasPorRegiao(regiao) {
    const todas = await getTaxasIva();
    const chave = (regiao || 'continente').toLowerCase();
    return todas[chave] || TAXAS_IVA_PADRAO.continente;
}

/* ══════════ Assinatura SHA-256 (hash) ══════════ */
export async function computarHash(data, valorTotal, numero, hashAnterior) {
    const texto = `${data};${data};${parseFloat(valorTotal).toFixed(2)};${hashAnterior || ''};${numero}`;
    const buffer = new TextEncoder().encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getHashDocAnterior(colNome, empresaId, prefixo, sequencial) {
    if (sequencial <= 1) return '';
    const numAnterior = `${prefixo}${String(sequencial - 1).padStart(4, '0')}`;
    const snap = await getDocs(query(colEmpresa(colNome, empresaId), where('numero', '==', numAnterior)));
    if (snap.empty) return '';
    return snap.docs[0].data().hash || '';
}

/* ══════════ Fatura Simplificada ══════════ */
export async function proximoNumeroFaturaSimplificada(empresaId) {
    const emp = await empresaPorId(empresaId, uidUtilizador());
    const ano = (emp && emp.exercicio) || new Date().getFullYear();
    const prefixo = `FS ${ano}/`;
    const snap = await getDocs(query(colEmpresa('faturas', empresaId), where('numero', '>=', prefixo), where('numero', '<', prefixo + '')));
    return `${prefixo}${String(snap.size + 1).padStart(4, '0')}`;
}

/* ══════════ SAF-T(PT) ══════════ */
function escXML(s) {
    return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function gerarSAFT(empresaId) {
    const [emp, clientes, faturas, notasCredito, contas, lancamentos, taxasIva] = await Promise.all([
        empresaPorId(empresaId, uidUtilizador()),
        getClientes(empresaId),
        getFaturas(empresaId),
        getNotasCredito(empresaId),
        getContas(empresaId),
        getLancamentos(empresaId),
        getTaxasIva(),
    ]);
    if (!emp) return null;

    const ano = emp.exercicio || new Date().getFullYear();
    const regiao = emp.regiao || 'continente';
    const taxas = taxasIva[regiao] || TAXAS_IVA_PADRAO.continente;
    const hoje = today();

    // ── Header ──────────────────────────────────────────────────
    const header = `
  <Header>
    <AuditFileVersion>1.04_01</AuditFileVersion>
    <CompanyID>${escXML(emp.nif)}</CompanyID>
    <TaxRegistrationNumber>${escXML(emp.nif)}</TaxRegistrationNumber>
    <TaxAccountingBasis>I</TaxAccountingBasis>
    <CompanyName>${escXML(emp.nome)}</CompanyName>
    <BusinessName>${escXML(emp.nome)}</BusinessName>
    <CompanyAddress>
      <AddressDetail>${escXML(emp.morada)}</AddressDetail>
      <City></City>
      <PostalCode></PostalCode>
      <Country>PT</Country>
    </CompanyAddress>
    <FiscalYear>${ano}</FiscalYear>
    <StartDate>${ano}-01-01</StartDate>
    <EndDate>${ano}-12-31</EndDate>
    <CurrencyCode>EUR</CurrencyCode>
    <DateCreated>${hoje}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductCompanyTaxID>${escXML(emp.nif)}</ProductCompanyTaxID>
    <SoftwareCertificateNumber>0</SoftwareCertificateNumber>
    <ProductID>ContaSNC</ProductID>
    <ProductVersion>1.0</ProductVersion>
  </Header>`;

    // ── MasterFiles → Clientes ───────────────────────────────────
    const xmlClientes = clientes.map(c => `
    <Customer>
      <CustomerID>${escXML(c.id)}</CustomerID>
      <AccountID>211</AccountID>
      <CustomerTaxID>${escXML(c.nif) || '999999990'}</CustomerTaxID>
      <CompanyName>${escXML(c.nome)}</CompanyName>
      <BillingAddress>
        <AddressDetail>${escXML(c.morada)}</AddressDetail>
        <City></City>
        <PostalCode></PostalCode>
        <Country>PT</Country>
      </BillingAddress>
      <Telephone>${escXML(c.telefone)}</Telephone>
      <Email>${escXML(c.email)}</Email>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>`).join('');

    // ── MasterFiles → TaxTable ───────────────────────────────────
    const entradasTaxa = [
        { descricao: 'Isento', taxa: 0, exempcao: 'M99' },
        { descricao: 'Reduzida', taxa: taxas.reduzida },
        { descricao: 'Intermédia', taxa: taxas.intermedia },
        { descricao: 'Normal', taxa: taxas.normal },
    ];
    const xmlTaxTable = entradasTaxa.map(t => `
    <TaxTableEntry>
      <TaxType>IVA</TaxType>
      <TaxCountryRegion>PT</TaxCountryRegion>
      <TaxCode>${t.taxa === 0 ? 'ISE' : t.taxa === taxas.reduzida ? 'RED' : t.taxa === taxas.intermedia ? 'INT' : 'NOR'}</TaxCode>
      <Description>${t.descricao}</Description>
      ${t.taxa > 0 ? `<TaxPercentage>${t.taxa}</TaxPercentage>` : `<TaxAmount>0</TaxAmount>`}
    </TaxTableEntry>`).join('');

    // ── MasterFiles → Contas ─────────────────────────────────────
    const xmlContas = contas.filter(c => c.movimentos).map(c => `
    <Account>
      <AccountID>${escXML(c.codigo)}</AccountID>
      <AccountDescription>${escXML(c.designacao)}</AccountDescription>
      <OpeningDebitBalance>0.00</OpeningDebitBalance>
      <OpeningCreditBalance>0.00</OpeningCreditBalance>
      <ClosingDebitBalance>0.00</ClosingDebitBalance>
      <ClosingCreditBalance>0.00</ClosingCreditBalance>
      <GroupingCategory>${c.tipo === 'Classe' ? 'GR' : c.tipo === 'Conta' ? 'GA' : 'AA'}</GroupingCategory>
      <GroupingCode>${escXML(c.codigo)}</GroupingCode>
    </Account>`).join('');

    // ── SourceDocuments → SalesInvoices ─────────────────────────
    const docsFaturacao = [
        ...faturas.filter(f => f.estado !== 'rascunho').map(f => ({ ...f, _tipo: 'FT' })),
        ...notasCredito.filter(n => n.estado !== 'anulada').map(n => ({ ...n, _tipo: 'NC', valorTotal: -(n.valorTotal || 0), valorBase: -(n.valorBase || 0), valorIva: -(n.valorIva || 0) })),
    ].sort((a, b) => (a.data || '') < (b.data || '') ? -1 : 1);

    const totalCredito = faturas.filter(f => f.estado !== 'rascunho').reduce((s, f) => s + (f.valorTotal || 0), 0);
    const totalDebito  = notasCredito.filter(n => n.estado !== 'anulada').reduce((s, n) => s + (n.valorTotal || 0), 0);

    const xmlInvoices = docsFaturacao.map(f => {
        const cli = clientes.find(c => c.id === f.clienteId);
        const cliSnap = f.clienteSnapshot || {};
        const nifCli = cliSnap.nif || (cli ? cli.nif : '') || '999999990';
        const nomeCli = cliSnap.nome || (cli ? cli.nome : '') || 'Consumidor Final';
        const detalhe = f.ivaDetalhe || [];

        const xmlLinhas = (f.linhas || []).map((l, idx) => {
            const qtd = parseFloat(l.quantidade) || 0;
            const preco = parseFloat(l.precoUnit) || 0;
            const taxa = parseFloat(l.taxaIva) || 0;
            const base = qtd * preco * (f._tipo === 'NC' ? -1 : 1);
            const ivaValor = base * taxa / 100;
            return `
      <Line>
        <LineNumber>${idx + 1}</LineNumber>
        <ProductDescription>${escXML(l.descricao)}</ProductDescription>
        <Quantity>${qtd}</Quantity>
        <UnitOfMeasure>UN</UnitOfMeasure>
        <UnitPrice>${preco.toFixed(4)}</UnitPrice>
        <TaxPointDate>${f.data}</TaxPointDate>
        <Description>${escXML(l.descricao)}</Description>
        <CreditAmount>${Math.abs(base).toFixed(2)}</CreditAmount>
        <Tax>
          <TaxType>IVA</TaxType>
          <TaxCountryRegion>PT</TaxCountryRegion>
          <TaxCode>${taxa === 0 ? 'ISE' : taxa === taxas.reduzida ? 'RED' : taxa === taxas.intermedia ? 'INT' : 'NOR'}</TaxCode>
          <TaxPercentage>${taxa}</TaxPercentage>
          ${l.motivoIsencao ? `<TaxExemptionReason>${escXML(l.motivoIsencao)}</TaxExemptionReason><TaxExemptionCode>${escXML(l.motivoIsencao)}</TaxExemptionCode>` : ''}
        </Tax>
      </Line>`;
        }).join('');

        return `
    <Invoice>
      <InvoiceNo>${escXML(f.numero)}</InvoiceNo>
      ${f.atcud ? `<ATCUD>${escXML(f.atcud)}</ATCUD>` : '<ATCUD>0</ATCUD>'}
      <DocumentStatus>
        <InvoiceStatus>N</InvoiceStatus>
        <InvoiceStatusDate>${f.emitidaEm || f.criadaEm || hoje}</InvoiceStatusDate>
        <SourceID>${escXML(emp.nif)}</SourceID>
        <SourceBilling>P</SourceBilling>
      </DocumentStatus>
      <Hash>${escXML(f.hash) || '0'}</Hash>
      <HashControl>1</HashControl>
      <Period>${(f.data || '').slice(5, 7) || '01'}</Period>
      <InvoiceDate>${f.data}</InvoiceDate>
      <InvoiceType>${f.tipoDocumento || f._tipo || 'FT'}</InvoiceType>
      <SpecialRegimes>
        <SelfBillingIndicator>0</SelfBillingIndicator>
        <CashVATSchemeIndicator>0</CashVATSchemeIndicator>
        <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>
      </SpecialRegimes>
      <SourceID>${escXML(emp.nif)}</SourceID>
      <SystemEntryDate>${f.emitidaEm || f.criadaEm || hoje}T00:00:00</SystemEntryDate>
      <CustomerID>${escXML(f.clienteId)}</CustomerID>
      ${xmlLinhas}
      <DocumentTotals>
        <TaxPayable>${Math.abs(f.valorIva || 0).toFixed(2)}</TaxPayable>
        <NetTotal>${Math.abs(f.valorBase || 0).toFixed(2)}</NetTotal>
        <GrossTotal>${Math.abs(f.valorTotal || 0).toFixed(2)}</GrossTotal>
      </DocumentTotals>
    </Invoice>`;
    }).join('');

    // ── GeneralLedgerEntries ─────────────────────────────────────
    const lancsAno = lancamentos.filter(l => (l.data || '').startsWith(String(ano)));
    const totalDebLanc = lancsAno.reduce((s, l) => s + (l.valorTotal || 0), 0);
    const xmlJornais = Object.values(lancsAno.reduce((acc, l) => {
        if (!acc[l.diario]) acc[l.diario] = { diario: l.diario, lancs: [] };
        acc[l.diario].lancs.push(l);
        return acc;
    }, {})).map((j, ji) => `
    <Journal>
      <JournalID>${String(ji + 1).padStart(3, '0')}</JournalID>
      <Description>${escXML(j.diario)}</Description>
      ${j.lancs.map((l, li) => `
      <Transaction>
        <TransactionID>${l.data}_${j.diario}_${String(li + 1).padStart(4, '0')}</TransactionID>
        <Period>${(l.data || '').slice(5, 7) || '01'}</Period>
        <TransactionDate>${l.data}</TransactionDate>
        <SourceID>${escXML(emp.nif)}</SourceID>
        <Description>${escXML(l.descricao)}</Description>
        <DocArchivalNumber>${escXML(l.documento)}</DocArchivalNumber>
        <TransactionType>N</TransactionType>
        <GLPostingDate>${l.data}</GLPostingDate>
        <SystemEntryDate>${l.criadoEm || l.data}T00:00:00</SystemEntryDate>
        <Lines>
          <DebitLine>
            <RecordID>${String(li + 1).padStart(4, '0')}_D</RecordID>
            <AccountID>${escXML(l.contaDebito)}</AccountID>
            <SourceDocumentID>${escXML(l.documento)}</SourceDocumentID>
            <SystemEntryDate>${l.criadoEm || l.data}T00:00:00</SystemEntryDate>
            <Description>${escXML(l.descricao)}</Description>
            <DebitAmount>${(l.valorTotal || 0).toFixed(2)}</DebitAmount>
          </DebitLine>
          <CreditLine>
            <RecordID>${String(li + 1).padStart(4, '0')}_C</RecordID>
            <AccountID>${escXML(l.contaCredito)}</AccountID>
            <SourceDocumentID>${escXML(l.documento)}</SourceDocumentID>
            <SystemEntryDate>${l.criadoEm || l.data}T00:00:00</SystemEntryDate>
            <Description>${escXML(l.descricao)}</Description>
            <CreditAmount>${(l.valorTotal || 0).toFixed(2)}</CreditAmount>
          </CreditLine>
        </Lines>
      </Transaction>`).join('')}
    </Journal>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
${header}
  <MasterFiles>
    <GeneralLedgerAccounts>
      <NumberOfEntries>${contas.filter(c => c.movimentos).length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>0.00</TotalCredit>
      ${xmlContas}
    </GeneralLedgerAccounts>
    ${xmlClientes}
    <TaxTable>
      ${xmlTaxTable}
    </TaxTable>
  </MasterFiles>
  <GeneralLedgerEntries>
    <NumberOfEntries>${lancsAno.length}</NumberOfEntries>
    <TotalDebit>${totalDebLanc.toFixed(2)}</TotalDebit>
    <TotalCredit>${totalDebLanc.toFixed(2)}</TotalCredit>
    ${xmlJornais}
  </GeneralLedgerEntries>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${docsFaturacao.length}</NumberOfEntries>
      <TotalDebit>${totalDebito.toFixed(2)}</TotalDebit>
      <TotalCredit>${totalCredito.toFixed(2)}</TotalCredit>
      ${xmlInvoices}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SAFT_${(emp.nif || emp.nome).replace(/\s+/g, '_')}_${ano}.xml`;
    a.click();
    return true;
}

export { uid, today };
