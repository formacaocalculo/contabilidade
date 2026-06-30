// assets/js/modules/login.js
import { auth } from '../app.js';
import {
    signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { confirmarAdminAtual } from './tenant.js';

export function render() {
    return `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--cream);padding:24px;">
        <div style="background:var(--white);border-radius:12px;box-shadow:var(--shadow-lg);border:1px solid var(--border);padding:36px;width:100%;max-width:400px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
                <div style="width:42px;height:42px;background:var(--navy);border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:21px;color:var(--gold);flex-shrink:0;">Σ</div>
                <div>
                    <h1 style="font-family:'DM Serif Display',serif;font-size:23px;color:var(--navy);line-height:1.1;margin:0;">ContaSNC</h1>
                    <p style="font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0;">Sistema de Contabilidade — SNC</p>
                </div>
            </div>

            <div style="display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:22px;">
                <button id="tab-entrar" onclick="window._loginMudarAba('entrar')" style="flex:1;padding:10px;text-align:center;font-size:13px;font-weight:600;color:var(--text);background:none;border:none;cursor:pointer;border-bottom:2px solid var(--gold);margin-bottom:-1px;">Entrar</button>
                <button id="tab-registar" onclick="window._loginMudarAba('registar')" style="flex:1;padding:10px;text-align:center;font-size:13px;font-weight:600;color:var(--muted);background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;">Criar Conta</button>
            </div>

            <div id="login-erro" style="display:none;background:rgba(176,58,46,0.1);border-left:3px solid var(--danger);color:var(--danger);font-size:13px;padding:10px 14px;border-radius:6px;margin-bottom:16px;"></div>
            <div id="login-loading" style="display:none;text-align:center;font-size:13px;color:var(--muted);padding:8px 0;">A processar…</div>

            <!-- Formulário: Entrar -->
            <form id="form-entrar" onsubmit="return window._loginSubmeterEntrar(event)">
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" id="entrar-email" autocomplete="email" required/>
                </div>
                <div class="form-group">
                    <label class="form-label">Palavra-passe</label>
                    <input type="password" class="form-input" id="entrar-pass" autocomplete="current-password" required/>
                </div>
                <button type="submit" class="btn btn-gold" style="width:100%;justify-content:center;margin-top:6px">Entrar</button>
                <button type="button" class="btn btn-outline" style="width:100%;justify-content:center;margin-top:10px;font-size:12.5px" onclick="window._loginRecuperarPassword()">Esqueci-me da palavra-passe</button>
            </form>

            <!-- Formulário: Criar Conta -->
            <form id="form-registar" onsubmit="return window._loginSubmeterRegisto(event)" hidden>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" id="registar-email" autocomplete="email" required/>
                </div>
                <div class="form-group">
                    <label class="form-label">Palavra-passe</label>
                    <input type="password" class="form-input" id="registar-pass" autocomplete="new-password" minlength="6" required/>
                    <div style="font-size:11px;color:var(--muted);margin-top:4px">Mínimo 6 caracteres.</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Confirmar Palavra-passe</label>
                    <input type="password" class="form-input" id="registar-pass2" autocomplete="new-password" minlength="6" required/>
                </div>
                <p style="font-size:11.5px;color:var(--muted);margin:4px 0 14px">
                    🔒 A criação de contas requer a autorização de um administrador, pedida a seguir.
                </p>
                <button type="submit" class="btn btn-gold" style="width:100%;justify-content:center;margin-top:6px">Criar Conta</button>
            </form>
        </div>

        <!-- Modal: Autorização do Administrador -->
        <div id="modal-admin" class="hidden" style="position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px">
            <div style="background:var(--white);border-radius:12px;padding:28px;width:100%;max-width:380px;box-shadow:var(--shadow-lg)">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
                    <div style="width:40px;height:40px;border-radius:9px;background:var(--navy);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔒</div>
                    <h3 style="font-family:'DM Serif Display',serif;font-size:18px;color:var(--navy);margin:0">Autorização do Administrador</h3>
                </div>
                <p style="font-size:12.5px;color:var(--muted);margin:10px 0 18px">
                    A criação de contas é reservada a administradores. Peça a um administrador para introduzir aqui as suas credenciais.
                </p>
                <div class="form-group">
                    <label class="form-label">Email do Administrador</label>
                    <input type="email" class="form-input" id="adm-cred-email" autocomplete="off"/>
                </div>
                <div class="form-group">
                    <label class="form-label">Palavra-passe do Administrador</label>
                    <input type="password" class="form-input" id="adm-cred-pass" autocomplete="off"/>
                </div>
                <div id="adm-cred-erro" style="display:none;background:rgba(176,58,46,0.1);border-left:3px solid var(--danger);color:var(--danger);font-size:12.5px;padding:8px 12px;border-radius:6px;margin-bottom:12px"></div>
                <div style="display:flex;gap:8px;margin-top:6px">
                    <button type="button" class="btn btn-outline" style="flex:1;justify-content:center" id="adm-cred-cancelar">Cancelar</button>
                    <button type="button" class="btn btn-gold" style="flex:1;justify-content:center" id="adm-cred-ok">Continuar</button>
                </div>
            </div>
        </div>
    </div>
    `;
}

window._loginMudarAba = function(aba) {
    document.getElementById('tab-entrar').style.color = aba === 'entrar' ? 'var(--text)' : 'var(--muted)';
    document.getElementById('tab-entrar').style.borderBottomColor = aba === 'entrar' ? 'var(--gold)' : 'transparent';
    document.getElementById('tab-registar').style.color = aba === 'registar' ? 'var(--text)' : 'var(--muted)';
    document.getElementById('tab-registar').style.borderBottomColor = aba === 'registar' ? 'var(--gold)' : 'transparent';
    document.getElementById('form-entrar').hidden = aba !== 'entrar';
    document.getElementById('form-registar').hidden = aba !== 'registar';
    _esconderErro();
};

function _mostrarErro(msg) {
    const el = document.getElementById('login-erro');
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = 'rgba(176,58,46,0.1)';
    el.style.borderLeftColor = 'var(--danger)';
    el.style.color = 'var(--danger)';
}
function _mostrarSucesso(msg) {
    const el = document.getElementById('login-erro');
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = 'rgba(45,122,79,0.1)';
    el.style.borderLeftColor = 'var(--success)';
    el.style.color = 'var(--success)';
}
function _esconderErro() {
    document.getElementById('login-erro').style.display = 'none';
}
function _setLoading(on) {
    document.getElementById('login-loading').style.display = on ? 'block' : 'none';
}

function _traduzErro(code) {
    const mapa = {
        'auth/invalid-email':          'Email inválido.',
        'auth/user-disabled':          'Esta conta foi desativada.',
        'auth/user-not-found':         'Não existe conta com este email.',
        'auth/wrong-password':         'Palavra-passe incorreta.',
        'auth/invalid-credential':     'Email ou palavra-passe incorretos.',
        'auth/email-already-in-use':   'Já existe uma conta com este email.',
        'auth/weak-password':          'Palavra-passe demasiado fraca (mínimo 6 caracteres).',
        'auth/network-request-failed': 'Falha de rede. Verifique a sua ligação.',
        'auth/too-many-requests':      'Demasiadas tentativas. Tente novamente mais tarde.',
    };
    return mapa[code] || 'Ocorreu um erro. Tente novamente.';
}

window._loginSubmeterEntrar = async function(e) {
    e.preventDefault();
    _esconderErro();
    const email = document.getElementById('entrar-email').value.trim();
    const pass  = document.getElementById('entrar-pass').value;
    _setLoading(true);
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // onAuthStateChanged em app.js trata do redireccionamento
    } catch (err) {
        _setLoading(false);
        _mostrarErro(_traduzErro(err.code));
    }
    return false;
};

window._loginRecuperarPassword = async function() {
    _esconderErro();
    const email = document.getElementById('entrar-email').value.trim();
    if (!email) { _mostrarErro('Indique o seu email no campo acima primeiro.'); return; }
    _setLoading(true);
    try {
        await sendPasswordResetEmail(auth, email);
        _setLoading(false);
        _mostrarSucesso('Email de recuperação enviado. Verifique a sua caixa de entrada.');
    } catch (err) {
        _setLoading(false);
        _mostrarErro(_traduzErro(err.code));
    }
};

window._loginSubmeterRegisto = async function(e) {
    e.preventDefault();
    _esconderErro();
    const email = document.getElementById('registar-email').value.trim();
    const pass  = document.getElementById('registar-pass').value;
    const pass2 = document.getElementById('registar-pass2').value;

    if (pass !== pass2) { _mostrarErro('As palavras-passe não coincidem.'); return false; }

    // A criação de contas é reservada a administradores. Pedimos as
    // credenciais de um admin (via modal) e só depois criamos a conta nova.
    const cred = await _pedirCredenciaisAdmin();
    if (!cred) return false; // cancelado pelo utilizador

    await _criarContaComoAdmin({ novoEmail: email, novaPass: pass, adminEmail: cred.email, adminPass: cred.password });
    return false;
};

// ─── Criação de contas reservada a administradores ──────────────────────────

function _pedirCredenciaisAdmin() {
    return new Promise((resolve) => {
        const modal      = document.getElementById('modal-admin');
        const campoEmail = document.getElementById('adm-cred-email');
        const campoPass  = document.getElementById('adm-cred-pass');
        const elErro     = document.getElementById('adm-cred-erro');
        const btnOk      = document.getElementById('adm-cred-ok');
        const btnCancelar= document.getElementById('adm-cred-cancelar');

        campoEmail.value = '';
        campoPass.value  = '';
        elErro.style.display = 'none';
        modal.classList.remove('hidden');
        setTimeout(() => campoEmail.focus(), 50);

        function limpar() {
            modal.classList.add('hidden');
            btnOk.removeEventListener('click', aoConfirmar);
            btnCancelar.removeEventListener('click', aoCancelar);
            modal.removeEventListener('click', aoClicarFora);
            campoPass.removeEventListener('keydown', aoTeclar);
        }
        function aoCancelar() { limpar(); resolve(null); }
        function aoClicarFora(ev) { if (ev.target === modal) aoCancelar(); }
        function aoTeclar(ev) { if (ev.key === 'Enter') aoConfirmar(); }
        function aoConfirmar() {
            const emailAdmin = campoEmail.value.trim();
            const passAdmin  = campoPass.value;
            if (!emailAdmin || !passAdmin) {
                elErro.textContent = 'Preencha email e palavra-passe do administrador.';
                elErro.style.display = 'block';
                return;
            }
            limpar();
            resolve({ email: emailAdmin, password: passAdmin });
        }

        btnOk.addEventListener('click', aoConfirmar);
        btnCancelar.addEventListener('click', aoCancelar);
        modal.addEventListener('click', aoClicarFora);
        campoPass.addEventListener('keydown', aoTeclar);
    });
}

// Valida as credenciais de admin e, se forem válidas, cria a conta nova.
// Nota técnica: no Firebase, criar um utilizador no cliente autentica logo
// como esse utilizador. Por isso trocamos de sessão várias vezes (admin →
// conta nova → sair) e suprimimos os redirecionamentos do onAuthStateChanged
// (window._suprimirRedirecionoAuth) para controlar o fluxo manualmente. No
// final, a sessão fica sempre terminada — mesmo que já houvesse alguém
// autenticado antes de iniciar este processo.
async function _criarContaComoAdmin({ novoEmail, novaPass, adminEmail, adminPass }) {
    window._suprimirRedirecionoAuth = true;
    _setLoading(true);
    try {
        await signInWithEmailAndPassword(auth, adminEmail, adminPass);
        const ehAdmin = await confirmarAdminAtual();
        if (!ehAdmin) {
            await signOut(auth);
            _setLoading(false);
            _mostrarErro('Estas credenciais não pertencem a um administrador. A criação de contas é reservada a administradores.');
            return;
        }

        await createUserWithEmailAndPassword(auth, novoEmail, novaPass);
        await signOut(auth);

        _setLoading(false);
        window._loginMudarAba('entrar');
        const emailEl = document.getElementById('entrar-email');
        if (emailEl) emailEl.value = novoEmail;
        _mostrarSucesso(`Conta "${novoEmail}" criada com sucesso. Pode agora iniciar sessão.`);
    } catch (err) {
        try { await signOut(auth); } catch (e) { /* ignorar */ }
        _setLoading(false);
        const msg = (err && err.code === 'auth/email-already-in-use')
            ? 'Já existe uma conta com esse email.'
            : (err && ['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(err.code))
                ? 'Credenciais de administrador inválidas.'
                : _traduzErro(err && err.code);
        _mostrarErro(msg);
    } finally {
        window._suprimirRedirecionoAuth = false;
    }
}

export function init() {
    document.getElementById('entrar-pass').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('form-entrar').requestSubmit();
    });
}
