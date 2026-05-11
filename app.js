import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
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

const ADMIN_EMAIL = "ascraadmin@gmail.com";

const email = document.getElementById("email");
const password = document.getElementById("password");
const mensagem = document.getElementById("mensagem");

window.onload = () => {
  email.value = "";
  password.value = "";
};

function mostrarMensagem(texto, cor = "black") {
  mensagem.innerText = texto;
  mensagem.style.color = cor;
}

document.getElementById("criar").onclick = async () => {
  const emailValor = email.value.trim();
  const passwordValor = password.value.trim();

  if (!emailValor || !passwordValor) {
    mostrarMensagem("Preenche todos os campos.", "red");
    return;
  }

  if (passwordValor.length < 6) {
    mostrarMensagem("A palavra-passe deve ter pelo menos 6 caracteres.", "red");
    return;
  }

  // impedir criar admin pela interface
  if (emailValor === ADMIN_EMAIL) {
    mostrarMensagem("A conta de administrador já existe e não pode ser criada novamente aqui.", "red");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, emailValor, passwordValor);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      email: emailValor,
      tipo: "funcionario"
    });

    mostrarMensagem("Conta de funcionário criada com sucesso!", "green");
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      mostrarMensagem("Este email já tem conta.", "red");
    } else if (error.code === "auth/invalid-email") {
      mostrarMensagem("Email inválido.", "red");
    } else {
      mostrarMensagem("Erro ao criar conta.", "red");
    }
  }
};

document.getElementById("entrar").onclick = async () => {
  const emailValor = email.value.trim();
  const passwordValor = password.value.trim();

  if (!emailValor || !passwordValor) {
    mostrarMensagem("Preenche o email e a palavra-passe.", "red");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, emailValor, passwordValor);
    const user = userCredential.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      mostrarMensagem("Utilizador autenticado, mas sem perfil definido.", "red");
      return;
    }

    const dados = userSnap.data();

    if (dados.tipo === "admin") {
      mostrarMensagem("Bem-vindo ADMIN 🔥", "green");
    } else if (dados.tipo === "funcionario") {
      mostrarMensagem("Bem-vindo Funcionário 👤", "green");
    } else {
      mostrarMensagem("Tipo de utilizador desconhecido.", "red");
    }

  } catch (error) {
    if (error.code === "auth/invalid-email") {
      mostrarMensagem("Email inválido.", "red");
    } else if (error.code === "auth/invalid-credential") {
      mostrarMensagem("Email ou palavra-passe incorretos.", "red");
    } else {
      mostrarMensagem("Erro ao fazer login.", "red");
    }
  }
};

document.getElementById("sair").onclick = async () => {
  try {
    await signOut(auth);
    mostrarMensagem("Sessão terminada.", "green");
    email.value = "";
    password.value = "";
  } catch (error) {
    mostrarMensagem("Erro ao terminar sessão.", "red");
  }
};

document.getElementById("reset").onclick = async () => {
  const emailValor = email.value.trim();

  if (!emailValor) {
    mostrarMensagem("Digite o email para recuperar a palavra-passe.", "red");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, emailValor);
    mostrarMensagem("Email de recuperação enviado!", "green");
  } catch (error) {
    if (error.code === "auth/invalid-email") {
      mostrarMensagem("Email inválido.", "red");
    } else if (error.code === "auth/user-not-found") {
      mostrarMensagem("Email não encontrado.", "red");
    } else {
      mostrarMensagem("Erro ao enviar email.", "red");
    }
  }
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const dados = userSnap.data();
      console.log("Utilizador ativo:", user.email, "| tipo:", dados.tipo);
    } else {
      console.log("Utilizador ativo sem perfil:", user.email);
    }
  } else {
    console.log("Nenhum utilizador autenticado.");
  }
});