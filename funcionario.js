import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  addDoc
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

const loginFuncionario = document.getElementById("loginFuncionario");
const areaFuncionario = document.getElementById("areaFuncionario");
const funcionarioInfo = document.getElementById("funcionarioInfo");

const selectVeiculo = document.getElementById("selectVeiculo");
const selectCondutor = document.getElementById("selectCondutor");
const dataRequisicao = document.getElementById("dataRequisicao");
const observacaoRequisicao = document.getElementById("observacaoRequisicao");
const mensagemRequisicao = document.getElementById("mensagemRequisicao");

let utilizadorAtual = null;

function mostrarMensagem(texto, cor = "red") {

  mensagem.textContent = texto;
  mensagem.style.color = cor;

}

function mostrarMensagemRequisicao(texto, cor = "red") {

  mensagemRequisicao.textContent = texto;
  mensagemRequisicao.style.color = cor;

}

window.onload = () => {

  email.value = "";
  password.value = "";

  mostrarMensagem("");

  loginFuncionario.style.display = "flex";

  areaFuncionario.style.display = "none";

};

// =========================
// CARREGAR VEÍCULOS
// =========================
async function carregarVeiculos() {

  selectVeiculo.innerHTML =
    `<option value="">Selecionar veículo</option>`;

  const querySnapshot =
    await getDocs(collection(db, "veiculos"));

  querySnapshot.forEach((documento) => {

    const veiculo = documento.data();

    if (veiculo.estado === "ativo") {

      const nomeVeiculo =
        `${veiculo.marca || "Sem marca"} ${veiculo.modelo || ""}`.trim();

      const matricula =
        veiculo.matricula || "Sem matrícula";

      selectVeiculo.innerHTML += `
        <option value="${documento.id}">
          ${nomeVeiculo} - ${matricula}
        </option>
      `;

    }

  });

}

// =========================
// CARREGAR CONDUTORES
// =========================
async function carregarCondutores() {

  selectCondutor.innerHTML =
    `<option value="">Selecionar condutor</option>`;

  const querySnapshot =
    await getDocs(collection(db, "condutores"));

  querySnapshot.forEach((documento) => {

    const condutor = documento.data();

    if (condutor.estado === "ativo") {

      selectCondutor.innerHTML += `
        <option value="${documento.id}">
          ${condutor.nome || "Sem nome"}
        </option>
      `;

    }

  });

}

// =========================
// MOSTRAR ÁREA FUNCIONÁRIO
// =========================
async function abrirAreaFuncionario(user) {

  utilizadorAtual = user;

  // ESCONDER LOGIN
  loginFuncionario.style.display = "none";

  // MOSTRAR ÁREA FLEX
  areaFuncionario.style.display = "flex";

  funcionarioInfo.textContent =
    `Funcionário autenticado: ${user.email}`;

  await carregarVeiculos();

  await carregarCondutores();

}

// =========================
// CRIAR CONTA
// =========================
document.getElementById("criar").onclick = async () => {

  const emailValor = email.value.trim();

  const passwordValor = password.value.trim();

  if (!emailValor || !passwordValor) {

    mostrarMensagem(
      "Preenche o email e a palavra-passe."
    );

    return;

  }

  if (emailValor === ADMIN_EMAIL) {

    mostrarMensagem(
      "Este email pertence ao administrador."
    );

    return;

  }

  if (passwordValor.length < 6) {

    mostrarMensagem(
      "A palavra-passe deve ter pelo menos 6 caracteres."
    );

    return;

  }

  try {

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        emailValor,
        passwordValor
      );

    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {

      email: emailValor,
      tipo: "funcionario"

    });

    mostrarMensagem(
      "Conta criada com sucesso!",
      "green"
    );

    await abrirAreaFuncionario(user);

  }

  catch (error) {

    console.error(error);

    if (error.code === "auth/email-already-in-use") {

      mostrarMensagem(
        "Este email já está registado."
      );

    }

    else if (error.code === "auth/invalid-email") {

      mostrarMensagem("Email inválido.");

    }

    else {

      mostrarMensagem("Erro ao criar conta.");

    }

  }

};

// =========================
// LOGIN
// =========================
document.getElementById("entrar").onclick = async () => {

  const emailValor = email.value.trim();

  const passwordValor = password.value.trim();

  if (!emailValor || !passwordValor) {

    mostrarMensagem(
      "Preenche o email e a palavra-passe."
    );

    return;

  }

  try {

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        emailValor,
        passwordValor
      );

    const user = userCredential.user;

    const userRef =
      doc(db, "users", user.uid);

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {

      await signOut(auth);

      mostrarMensagem(
        "Conta sem perfil definido."
      );

      return;

    }

    const dados = userSnap.data();

    if (dados.tipo === "admin") {

      await signOut(auth);

      mostrarMensagem(
        "Esta conta é de administrador."
      );

      return;

    }

    if (dados.tipo !== "funcionario") {

      await signOut(auth);

      mostrarMensagem(
        "Conta sem acesso."
      );

      return;

    }

    mostrarMensagem(
      "Login feito com sucesso!",
      "green"
    );

    await abrirAreaFuncionario(user);

  }

  catch (error) {

    console.error(error);

    if (error.code === "auth/invalid-email") {

      mostrarMensagem("Email inválido.");

    }

    else if (

      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-credential"

    ) {

      mostrarMensagem(
        "Email ou palavra-passe incorretos."
      );

    }

    else {

      mostrarMensagem(
        "Erro ao fazer login."
      );

    }

  }

};

// =========================
// SAIR LOGIN
// =========================
document.getElementById("sair").onclick = async () => {

  try {

    await signOut(auth);

    email.value = "";
    password.value = "";

    mostrarMensagem(
      "Sessão terminada.",
      "green"
    );

  }

  catch (error) {

    console.error(error);

    mostrarMensagem(
      "Erro ao terminar sessão."
    );

  }

};

// =========================
// SAIR ÁREA FUNCIONÁRIO
// =========================
document.getElementById("sairAreaFuncionario").onclick = async () => {

  try {

    await signOut(auth);

    utilizadorAtual = null;

    // ESCONDER ÁREA
    areaFuncionario.style.display = "none";

    // MOSTRAR LOGIN FLEX
    loginFuncionario.style.display = "flex";

    email.value = "";
    password.value = "";

    mostrarMensagem(
      "Sessão terminada.",
      "green"
    );

  }

  catch (error) {

    console.error(error);

    mostrarMensagemRequisicao(
      "Erro ao terminar sessão."
    );

  }

};

// =========================
// RESET PASSWORD
// =========================
document.getElementById("reset").onclick = async () => {

  const emailValor = email.value.trim();

  if (!emailValor) {

    mostrarMensagem(
      "Digite o email primeiro."
    );

    return;

  }

  try {

    await sendPasswordResetEmail(
      auth,
      emailValor
    );

    mostrarMensagem(
      "Email enviado com sucesso!",
      "green"
    );

  }

  catch (error) {

    console.error(error);

    mostrarMensagem(
      "Erro ao enviar email."
    );

  }

};

// =========================
// ENVIAR REQUISIÇÃO
// =========================
document.getElementById("enviarRequisicao").onclick = async () => {

  const veiculoId = selectVeiculo.value;

  const condutorId = selectCondutor.value;

  const data = dataRequisicao.value;

  const observacao =
    observacaoRequisicao.value.trim();

  mostrarMensagemRequisicao("");

  if (!utilizadorAtual) {

    mostrarMensagemRequisicao(
      "Tens de iniciar sessão."
    );

    return;

  }

  if (!veiculoId) {

    mostrarMensagemRequisicao(
      "Seleciona um veículo."
    );

    return;

  }

  if (!condutorId) {

    mostrarMensagemRequisicao(
      "Seleciona um condutor."
    );

    return;

  }

  if (!data) {

    mostrarMensagemRequisicao(
      "Seleciona a data."
    );

    return;

  }

  if (!observacao) {

    mostrarMensagemRequisicao(
      "Escreve uma observação."
    );

    return;

  }

  const veiculoSelecionado =
    selectVeiculo.options[
      selectVeiculo.selectedIndex
    ];

  const condutorSelecionado =
    selectCondutor.options[
      selectCondutor.selectedIndex
    ];

  try {

    await addDoc(
      collection(db, "requisicoes"),
      {

        funcionarioId: utilizadorAtual.uid,

        funcionarioEmail:
          utilizadorAtual.email,

        veiculoId,

        veiculoNome:
          veiculoSelecionado.textContent.trim(),

        condutorId,

        condutorNome:
          condutorSelecionado.textContent.trim(),

        data,

        observacao,

        estado: "pendente",

        criadoEm: new Date().toISOString()

      }
    );

    selectVeiculo.value = "";
    selectCondutor.value = "";
    dataRequisicao.value = "";
    observacaoRequisicao.value = "";

    mostrarMensagemRequisicao(
      "Requisição enviada com sucesso!",
      "green"
    );

  }

  catch (error) {

    console.error(error);

    mostrarMensagemRequisicao(
      "Erro ao enviar requisição."
    );

  }

};