// assets/js/router.js

let _currentModule = null;
let _paramsAtuais = {};

// Módulos que não dependem de sessão (login) ou de uma empresa ativa
// selecionada (empresas, admin). Todos os outros são "operacionais": só
// fazem sentido depois de saber a que empresa os dados pertencem.
const MODULOS_PUBLICOS = new Set(['login']);
const MODULOS_SEM_EMPRESA = new Set(['login', 'empresas', 'admin']);

// Devolve os parâmetros passados na navegação mais recente (ex.: { diario: 'V' }
// quando se navega de Diários para Lançamentos filtrados por um diário
// específico). Os módulos leem isto dentro do seu init().
export function paramsAtuais() {
    return _paramsAtuais;
}

export async function navigate(moduleName, params = {}) {
    const appContainer = document.getElementById('app');
    try {
        if (!MODULOS_PUBLICOS.has(moduleName)) {
            const { auth, authReady } = await import('./app.js');
            await authReady;
            if (!auth.currentUser) {
                if (moduleName !== 'login') { await navigate('login'); return; }
            } else if (!MODULOS_SEM_EMPRESA.has(moduleName)) {
                const tenant = await import('./modules/tenant.js');
                if (!tenant.empresaAtivaId()) {
                    await navigate('empresas');
                    return;
                }
            }
        }

        _paramsAtuais = params || {};
        const module = await import(`./modules/${moduleName}.js`);
        _currentModule = moduleName;
        appContainer.innerHTML = module.render();
        if (typeof module.init === 'function') {
            await module.init();
        }
    } catch (error) {
        console.error("Erro ao carregar o módulo:", error);
        appContainer.innerHTML = `<div style="padding:40px;font-family:Arial,sans-serif;color:#B03A2E;">
            <h2>Página não encontrada</h2>
            <button onclick="window.router.navigate('painel')" style="margin-top:16px;padding:10px 20px;background:#1B2B4B;color:#fff;border:none;border-radius:6px;cursor:pointer;">
                ← Voltar ao Painel
            </button>
        </div>`;
    }
}

// Chamado a partir de app.js sempre que o estado de autenticação confirma um
// utilizador válido (login feito ou sessão restaurada). Decide entre ir para
// a escolha de empresa ou diretamente para o painel, sem duplicar esta
// lógica também dentro de cada módulo.
export async function navigateAposLogin() {
    const tenant = await import('./modules/tenant.js');

    const ativaId = tenant.empresaAtivaId();
    const donoAtivo = tenant.donoEmpresaAtiva();   // ACTIVE_OWNER: admin "dentro" de empresa de outro

    // Se estava dentro de uma empresa de outro utilizador (Modo Admin), manter
    // ao recarregar a página — não o expulsar para a Administração.
    if (ativaId && donoAtivo) {
        await navigate('painel');
        return;
    }

    let empresas = [];
    try {
        empresas = await tenant.listarEmpresas();
    } catch (e) {
        console.warn('[router] não foi possível listar empresas:', e);
    }

    // Limpa uma empresa "ativa" que já não pertence a este utilizador (sobra de
    // outra sessão/conta no mesmo browser).
    const ativaValida = !!ativaId && empresas.some(e => e.id === ativaId);
    if (ativaId && !ativaValida && !donoAtivo) tenant.limparEmpresaAtiva();

    // Recarregar mantém o utilizador na empresa onde estava.
    if (ativaValida) {
        await navigate('painel');
        return;
    }

    // Sem empresa ativa: o ADMINISTRADOR vai direto para a Administração (a sua
    // visão global de todas as empresas), porque à partida não tem empresas
    // próprias — gere todas a partir daí.
    try {
        if (await tenant.isAdmin()) {
            await navigate('admin');
            return;
        }
    } catch (e) {
        console.warn('[router] verificação de admin falhou:', e);
    }

    if (empresas.length === 1) {
        // Uma única empresa: entra logo, sem obrigar a escolher.
        tenant.definirEmpresaAtiva(empresas[0].id);
        await navigate('painel');
    } else {
        // Nenhuma (para criar a primeira) OU várias (para escolher qual usar).
        await navigate('empresas');
    }
}

// Volta sempre ao painel
export function goBack() {
    navigate('painel');
}

window.router = { navigate, goBack, navigateAposLogin, paramsAtuais };
