// assets/js/modules/empresas.js
import {
    listarEmpresas, criarEmpresa, editarEmpresa, eliminarEmpresa, statsEmpresa,
    definirEmpresaAtiva, isAdmin, exportEmpresa, importEmpresa
} from './tenant.js';

let S = { empresas: [], souAdmin: false };

export function render() {
    return `
    <div class="page-shell">
    <div class="page-shell-narrow">

        <div class="emp-logo" style="display:flex;align-items:center;gap:14px;margin-bottom:40px;">
            <div style="width:48px;height:48px;background:var(--navy);border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:24px;color:var(--gold);flex-shrink:0;">S</div>
            <div>
                <h1 style="font-family:'DM Serif Display',serif;font-size:28px;color:var(--navy);line-height:1.1;margin:0;">ContaSNC</h1>
                <p style="font-size:12px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0;">Sistema de Contabilidade</p>
            </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px">
            <div>
                <h2 style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--navy);margin:0">Selecione uma Empresa</h2>
                <p id="utilizador-label" style="font-size:13px;color:var(--muted);margin-top:3px">Ou crie uma nova para começar.</p>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
                <a id="btn-admin" href="#" onclick="window.router.navigate('admin');return false;" class="btn btn-outline btn-sm" hidden style="border-color:var(--gold);color:var(--gold)">⚙ Administração</a>
                <button class="btn btn-outline btn-sm" onclick="window._empresasImportar()">⬆ Importar</button>
                <input type="file" id="import-input" accept=".json" hidden onchange="window._empresasHandleImport(event)"/>
                <button class="btn btn-outline btn-sm" onclick="window._empresasSair()" title="Terminar sessão">⎋ Sair</button>
            </div>
        </div>

        <div class="emp-grid" id="emp-grid"></div>
        <p id="sem-empresas" hidden style="text-align:center;font-size:13px;color:var(--muted);margin-top:8px">
            Sem empresas criadas. Clique em "Nova Empresa" para começar.
        </p>
        <p id="a-carregar" style="text-align:center;font-size:13px;color:var(--muted);margin-top:8px">A carregar empresas…</p>
    </div>
    </div>

    <div id="ov-empresa" class="overlay hidden" onclick="window._empresasOvClickFora(event,'ov-empresa')">
        <div class="overlay-box" style="max-width:500px">
            <h2 id="ov-emp-titulo" style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--navy);margin-bottom:4px">Nova Empresa</h2>
            <p style="font-size:13px;color:var(--muted);margin-bottom:22px">Preencha os dados. O Plano de Contas SNC é adicionado automaticamente.</p>
            <input type="hidden" id="emp-edit-id"/>
            <div class="form-group">
                <label class="form-label">Nome da Empresa *</label>
                <input class="form-input" id="emp-nome" placeholder="Ex: Empresa ABC, Lda." autocomplete="off"/>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">NIF</label>
                    <input class="form-input" id="emp-nif" placeholder="500 000 000" autocomplete="off"/>
                </div>
                <div class="form-group">
                    <label class="form-label">Exercício</label>
                    <input type="number" class="form-input" id="emp-exercicio" value="2026"/>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Morada</label>
                <input class="form-input" id="emp-morada" placeholder="Rua, n.º, Localidade" autocomplete="off"/>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Regime de IVA</label>
                    <select class="form-select" id="emp-regime">
                        <option value="mensal">Mensal</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="isento">Isento de IVA</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Região Fiscal</label>
                    <select class="form-select" id="emp-regiao">
                        <option value="continente">Continente</option>
                        <option value="madeira">Madeira</option>
                        <option value="acores">Açores</option>
                    </select>
                </div>
            </div>
            <div style="border-top:1px solid var(--border);margin:18px 0 16px"></div>
            <p style="font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">ATCUD — Códigos de Validação AT</p>
            <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Obtenha estes códigos no Portal das Finanças em <em>e-Fatura → Séries de Documentos</em>. Deixe em branco enquanto não os tiver — a faturação continua a funcionar normalmente.</p>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Código AT — Faturas (FT)</label>
                    <input class="form-input" id="emp-cvat-ft" placeholder="Ex: CSDF7T5H" autocomplete="off" style="font-family:monospace"/>
                </div>
                <div class="form-group">
                    <label class="form-label">Código AT — Notas de Crédito (NC)</label>
                    <input class="form-input" id="emp-cvat-nc" placeholder="Ex: ABCD1234" autocomplete="off" style="font-family:monospace"/>
                </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
                <button class="btn btn-outline" onclick="window._empresasFecharOv('ov-empresa')">Cancelar</button>
                <button class="btn btn-gold" id="btn-guardar-empresa" onclick="window._empresasGuardar()">Guardar</button>
            </div>
        </div>
    </div>

    <div id="ov-eliminar" class="overlay hidden" onclick="window._empresasOvClickFora(event,'ov-eliminar')">
        <div class="overlay-box" style="max-width:420px">
            <h2 style="font-family:'DM Serif Display',serif;font-size:20px;color:var(--danger);margin-bottom:10px">Eliminar Empresa</h2>
            <p style="font-size:14px;color:var(--text);margin-bottom:6px">
                Tem a certeza que pretende eliminar <strong id="eliminar-nome-texto"></strong>?
            </p>
            <p style="font-size:13px;color:var(--danger);margin-bottom:24px">
                Todos os lançamentos, diários e configurações serão apagados permanentemente.
            </p>
            <input type="hidden" id="eliminar-id"/>
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button class="btn btn-outline" onclick="window._empresasFecharOv('ov-eliminar')">Cancelar</button>
                <button class="btn" style="background:var(--danger);color:#fff;border:none" id="btn-confirmar-eliminar" onclick="window._empresasConfirmarEliminar()">Eliminar</button>
            </div>
        </div>
    </div>

    <div id="toasts" style="position:fixed;bottom:24px;right:24px;z-index:999;display:flex;flex-direction:column;gap:10px;pointer-events:none"></div>
    `;
}

function fmtEUR(v) {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v || 0);
}

function toast(msg, tipo) {
    const cores = { success: '#2D7A4F', info: '#2E4066', warning: '#C9A84C', danger: '#B03A2E' };
    const icons = { success: '✓', info: 'ℹ', warning: '!', danger: '✕' };
    const el = document.createElement('div');
    el.style.cssText = `background:${cores[tipo] || cores.success};color:#fff;padding:12px 18px;border-radius:8px;font-family:Inter,sans-serif;font-size:13.5px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,0.18);pointer-events:all;display:flex;align-items:center;gap:10px;min-width:220px`;
    el.innerHTML = `<span>${icons[tipo] || '✓'}</span>${msg}`;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

window._empresasOvClickFora = function(e, id) {
    if (e.target === document.getElementById(id)) window._empresasFecharOv(id);
};
window._empresasFecharOv = function(id) { document.getElementById(id).classList.add('hidden'); };
function abrirOv(id) { document.getElementById(id).classList.remove('hidden'); }

async function renderEmpresas() {
    const grid = document.getElementById('emp-grid');
    const semEl = document.getElementById('sem-empresas');
    const carregandoEl = document.getElementById('a-carregar');

    S.empresas = await listarEmpresas();
    carregandoEl.hidden = true;
    semEl.hidden = S.empresas.length > 0;

    const statsPorEmpresa = await Promise.all(S.empresas.map(e => statsEmpresa(e.id)));

    const cards = S.empresas.map((emp, idx) => {
        const stats = statsPorEmpresa[idx];
        const nomeEsc = (emp.nome || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `
      <div class="emp-card">
        <div class="emp-card-nome">${emp.nome}</div>
        <div class="emp-card-sub">${emp.nif || 'Sem NIF'} &nbsp;.&nbsp; ${emp.exercicio}</div>
        <div style="display:flex;gap:14px;font-size:12px;color:var(--muted);margin-bottom:4px">
          <span>${stats.totalLanc} lançamentos</span>
          <span>IVA est.: ${fmtEUR(stats.ivaEntregar)}</span>
        </div>
        <div class="emp-card-actions">
          <button class="btn btn-gold btn-sm" style="flex:1" onclick="window._empresasEntrar('${emp.id}')">Entrar</button>
          <button class="btn btn-outline btn-sm" title="Editar" onclick="window._empresasAbrirEditar('${emp.id}')">✏</button>
          <button class="btn btn-outline btn-sm" title="Exportar backup" onclick="window._empresasExportar('${emp.id}')">⬇</button>
          <button class="btn btn-sm" style="background:rgba(176,58,46,0.10);color:var(--danger);border:1.5px solid rgba(176,58,46,0.25)" title="Eliminar" onclick="window._empresasPedirEliminar('${emp.id}','${nomeEsc}')">✕</button>
        </div>
      </div>`;
    }).join('');

    grid.innerHTML = cards + `
    <div class="emp-card emp-add" onclick="window._empresasAbrirNova()" role="button" tabindex="0">
      <div style="font-size:30px;color:var(--border)">+</div>
      <div style="font-size:13px;font-weight:600;color:var(--muted)">Nova Empresa</div>
    </div>`;
}

window._empresasEntrar = function(id) {
    definirEmpresaAtiva(id);
    window.router.navigate('painel');
};

window._empresasAbrirNova = function() {
    document.getElementById('ov-emp-titulo').textContent = 'Nova Empresa';
    document.getElementById('emp-edit-id').value = '';
    document.getElementById('emp-nome').value = '';
    document.getElementById('emp-nif').value = '';
    document.getElementById('emp-exercicio').value = new Date().getFullYear();
    document.getElementById('emp-morada').value = '';
    document.getElementById('emp-regime').value = 'mensal';
    document.getElementById('emp-regiao').value = 'continente';
    document.getElementById('emp-cvat-ft').value = '';
    document.getElementById('emp-cvat-nc').value = '';
    abrirOv('ov-empresa');
    setTimeout(() => document.getElementById('emp-nome').focus(), 50);
};

window._empresasAbrirEditar = function(id) {
    const emp = S.empresas.find(e => e.id === id);
    if (!emp) return;
    document.getElementById('ov-emp-titulo').textContent = 'Editar Empresa';
    document.getElementById('emp-edit-id').value = id;
    document.getElementById('emp-nome').value = emp.nome;
    document.getElementById('emp-nif').value = emp.nif || '';
    document.getElementById('emp-exercicio').value = emp.exercicio || new Date().getFullYear();
    document.getElementById('emp-morada').value = emp.morada || '';
    document.getElementById('emp-regime').value = emp.regime || 'mensal';
    document.getElementById('emp-regiao').value = emp.regiao || 'continente';
    document.getElementById('emp-cvat-ft').value = emp.codigoValidacaoFT || '';
    document.getElementById('emp-cvat-nc').value = emp.codigoValidacaoNC || '';
    abrirOv('ov-empresa');
    setTimeout(() => document.getElementById('emp-nome').focus(), 50);
};

window._empresasGuardar = async function() {
    const nome = document.getElementById('emp-nome').value.trim();
    if (!nome) {
        toast('O nome da empresa é obrigatório', 'danger');
        document.getElementById('emp-nome').focus();
        return;
    }
    const dados = {
        nome,
        nif: document.getElementById('emp-nif').value.trim(),
        exercicio: parseInt(document.getElementById('emp-exercicio').value) || new Date().getFullYear(),
        morada: document.getElementById('emp-morada').value.trim(),
        regime: document.getElementById('emp-regime').value,
        regiao: document.getElementById('emp-regiao').value,
        codigoValidacaoFT: document.getElementById('emp-cvat-ft').value.trim().toUpperCase(),
        codigoValidacaoNC: document.getElementById('emp-cvat-nc').value.trim().toUpperCase(),
    };
    const id = document.getElementById('emp-edit-id').value;
    const btn = document.getElementById('btn-guardar-empresa');
    btn.disabled = true;
    try {
        if (id) {
            await editarEmpresa(id, dados);
            window._empresasFecharOv('ov-empresa');
            toast('Empresa atualizada com sucesso', 'success');
            await renderEmpresas();
        } else {
            const nova = await criarEmpresa(dados);
            definirEmpresaAtiva(nova.id);
            window._empresasFecharOv('ov-empresa');
            toast('Empresa criada! A entrar…', 'success');
            setTimeout(() => { window.router.navigate('painel'); }, 700);
        }
    } catch (e) {
        toast('Erro ao guardar: ' + e.message, 'danger');
    } finally {
        btn.disabled = false;
    }
};

window._empresasPedirEliminar = function(id, nome) {
    document.getElementById('eliminar-id').value = id;
    document.getElementById('eliminar-nome-texto').textContent = nome;
    abrirOv('ov-eliminar');
};

window._empresasConfirmarEliminar = async function() {
    const id = document.getElementById('eliminar-id').value;
    const btn = document.getElementById('btn-confirmar-eliminar');
    btn.disabled = true;
    try {
        await eliminarEmpresa(id);
        window._empresasFecharOv('ov-eliminar');
        toast('Empresa eliminada', 'warning');
        await renderEmpresas();
    } catch (e) {
        toast('Erro ao eliminar: ' + e.message, 'danger');
    } finally {
        btn.disabled = false;
    }
};

window._empresasExportar = async function(id) {
    await exportEmpresa(id);
    toast('Backup exportado', 'info');
};

window._empresasImportar = function() {
    document.getElementById('import-input').click();
};

window._empresasHandleImport = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const emp = await importEmpresa(ev.target.result);
        if (emp) {
            toast(`"${emp.nome}" importada com sucesso`, 'success');
            await renderEmpresas();
        } else {
            toast('Ficheiro inválido ou corrompido', 'danger');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
};

window._empresasSair = async function() {
    if (!confirm('Terminar sessão?')) return;
    const { auth } = await import('../app.js');
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const { limparEmpresaAtiva } = await import('./tenant.js');
    limparEmpresaAtiva();
    await signOut(auth);
};

export async function init() {
    const { auth } = await import('../app.js');
    const label = document.getElementById('utilizador-label');
    if (label) label.textContent = `Sessão: ${auth.currentUser?.email || ''}`;

    await renderEmpresas();

    S.souAdmin = await isAdmin();
    const btnAdmin = document.getElementById('btn-admin');
    if (btnAdmin) btnAdmin.hidden = !S.souAdmin;
}
