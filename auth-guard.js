// ============================================================
//  auth-guard.js — protege páginas que exigem login
//  Incluir DEPOIS de firebase-config.js e ANTES de db.js
//  em todas as páginas exceto login.html
// ============================================================

// Promessa que resolve quando soubermos se há (ou não) utilizador autenticado.
// Outros scripts (db.js, páginas) podem `await window.authReady` antes de
// fazer qualquer pedido ao Firestore, garantindo que auth.currentUser já está definido.
window.authReady = new Promise((resolve) => {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // não autenticado → redireciona para login, guardando a página de destino
      const destino = location.pathname.split('/').pop() || 'index.html';
      if (destino !== 'login.html') {
        sessionStorage.setItem('snc_redirect_apos_login', destino + location.search);
      }
      location.href = 'login.html';
      resolve(null); // a navegação vai ocorrer; isto só evita travar scripts pendentes
    } else {
      resolve(user);
    }
  });
});

async function logout() {
  await auth.signOut();
  location.href = 'login.html';
}
