// assets/js/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let _resolverAuthReady;
export const authReady = new Promise((resolve) => { _resolverAuthReady = resolve; });

onAuthStateChanged(auth, async (user) => {
    if (_resolverAuthReady) { _resolverAuthReady(user); _resolverAuthReady = null; }

    if (window._suprimirRedirecionoAuth) return;

    if (user) {
        import('./modules/tenant.js')
            .then(m => m.guardarPerfilProprio())
            .catch(() => {});

        window.router.navigateAposLogin();
    } else {
        const { reset } = await import('./modules/tenant.js');
        reset();
        window.router.navigate('login');
    }
});
