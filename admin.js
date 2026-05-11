import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAVGiLrKadXgMtt9h54hDIrV0mwrRxBTv0",
  authDomain: "ascra-sistema.firebaseapp.com",
  projectId: "ascra-sistema",
  storageBucket: "ascra-sistema.firebasestorage.app",
  messagingSenderId: "217858974774",
  appId: "1:217858974774:web:677b27add30eb58fa66497"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const email = document.getElementById("email");

const password = document.getElementById("password");

const entrar = document.getElementById("entrar");

const mensagemErro = document.getElementById("mensagemErro");

// LIMPAR PASSWORD AO ABRIR
window.onload = () => {

  password.value = "";

};

function mostrarErro(texto) {

  mensagemErro.textContent = texto;

}

entrar.addEventListener("click", async () => {

  mensagemErro.textContent = "";

  const emailValor = email.value.trim();

  const passwordValor = password.value.trim();

  // VALIDAÇÕES

  if (!emailValor || !passwordValor) {

    mostrarErro("Preencha todos os campos.");

    return;
  }

  if (!emailValor.includes("@")) {

    mostrarErro("Email inválido.");

    return;
  }

  if (passwordValor.length < 6) {

    mostrarErro("A palavra-passe deve ter pelo menos 6 caracteres.");

    return;
  }

  try {

    // LOGIN FIREBASE

    const userCredential = await signInWithEmailAndPassword(
      auth,
      emailValor,
      passwordValor
    );

    const user = userCredential.user;

    // BUSCAR DADOS

    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {

      mostrarErro("Conta não encontrada.");

      return;
    }

    const dados = snap.data();

    // VERIFICAR ADMIN

    if (dados.tipo !== "admin") {

      mostrarErro("Acesso negado.");

      return;
    }

    // LOGIN CERTO

    window.location.href = "painel-admin.html";

  }

  catch (error) {

    console.log(error);

    if (
      error.code === "auth/wrong-password" ||
      error.code === "auth/invalid-credential"
    ) {

      mostrarErro("Palavra-passe incorreta.");

    }

    else if (error.code === "auth/user-not-found") {

      mostrarErro("Administrador não encontrado.");

    }

    else if (error.code === "auth/invalid-email") {

      mostrarErro("Email inválido.");

    }

    else {

      mostrarErro("Erro ao entrar.");

    }

  }

});