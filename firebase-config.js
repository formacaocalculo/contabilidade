// ============================================================
//  firebase-config.js
//  ⚠️ ÚNICO FICHEIRO QUE PRECISAS DE EDITAR ⚠️
//
//  1. Vai a https://console.firebase.google.com/
//  2. Cria um projeto → Build → Authentication → ativa "Email/Password"
//  3. Build → Firestore Database → Create database (modo produção)
//  4. Project settings (engrenagem) → Your apps → "</>" Web → Register app
//  5. Copia o objecto firebaseConfig que aparece e substitui abaixo
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyCs5lLQB3kpYqrIVv3v85w7aiiUBfeSutw",
  authDomain:        "contasnc-f2252.firebaseapp.com",
  projectId:         "contasnc-f2252",
  storageBucket:     "contasnc-f2252.firebasestorage.app",
  messagingSenderId: "187270253946",
  appId:             "1:187270253946:web:ad5e74913fc8303acd1ac3",
};

// Inicialização (usa Firebase v9 compat para simplicidade — funciona com <script> simples, sem build tools)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();
