import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
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

const reset = document.getElementById("reset");

const mensagemErro = document.getElementById("mensagemErro");

// =========================
// REDIRECIONAMENTO POR TIPO
// =========================
function redirecionarPorTipo(tipo) {

  if (tipo === "admin") {
    window.location.href = "painel-admin.html";
    return;
  }

  if (tipo === "motorista") {
    window.location.href = "painel-admin.html";
    return;
  }

  if (tipo === "condutor") {
    window.location.href = "painel-condutor.html";
    return;
  }

  mostrarErro("Tipo de utilizador desconhecido. Contacte o administrador.");

}

// LIMPAR CAMPOS AO ABRIR
window.onload = () => {

  email.value = "";
  password.value = "";

};

function mostrarErro(texto) {

  mensagemErro.textContent = texto;

}

entrar.addEventListener("click", async () => {

  mensagemErro.textContent = "";

  const emailValor = email.value.trim();

  const passwordValor = password.value.trim();

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

    const userCredential = await signInWithEmailAndPassword(
      auth,
      emailValor,
      passwordValor
    );

    const user = userCredential.user;

    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {

      mostrarErro("Conta sem perfil definido. Contacte o administrador.");

      return;
    }

    const dados = snap.data();

    redirecionarPorTipo(dados.tipo);

  }

  catch (error) {

    console.log(error);

    if (
      error.code === "auth/wrong-password" ||
      error.code === "auth/invalid-credential"
    ) {

      mostrarErro("Email ou palavra-passe incorretos.");

    }

    else if (error.code === "auth/user-not-found") {

      mostrarErro("Utilizador não encontrado.");

    }

    else if (error.code === "auth/invalid-email") {

      mostrarErro("Email inválido.");

    }

    else if (error.code === "auth/too-many-requests") {

      mostrarErro("Demasiadas tentativas. Tente novamente mais tarde.");

    }

    else {

      mostrarErro("Erro ao entrar. Tente novamente.");

    }

  }

});

// =========================
// RECUPERAR PALAVRA-PASSE
// =========================
reset.addEventListener("click", async (e) => {

  e.preventDefault();

  mensagemErro.textContent = "";

  const emailValor = email.value.trim();

  if (!emailValor) {

    mostrarErro("Digite o seu email para recuperar a palavra-passe.");

    return;
  }

  try {

    await sendPasswordResetEmail(auth, emailValor);

    mostrarErro("");

    alert("Email de recuperação enviado! Verifique a sua caixa de entrada.");

  }

  catch (error) {

    if (error.code === "auth/invalid-email") {

      mostrarErro("Email inválido.");

    }

    else if (error.code === "auth/user-not-found") {

      mostrarErro("Email não encontrado.");

    }

    else {

      mostrarErro("Erro ao enviar email de recuperação.");

    }

  }

});

// =========================
// SE JÁ ESTIVER LOGADO, REDIRECIONA
// =========================
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (snap.exists()) {

    redirecionarPorTipo(snap.data().tipo);

  }

});