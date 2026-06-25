import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut as signOutSecundario
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAVGiLrKadXgMtt9h54hDIrV0mwrRxBTv0",
  authDomain: "ascra-sistema.firebaseapp.com",
  projectId: "ascra-sistema",
  storageBucket: "ascra-sistema.firebasestorage.app",
  messagingSenderId: "217858974774",
  appId: "1:217858974774:web:677b27add30eb58fa66497"
};

const appPrincipal = initializeApp(firebaseConfig, "principal-utilizadores");
const dbPrincipal = getFirestore(appPrincipal);

const abrirFormUtilizador = document.getElementById("abrirFormUtilizador");
const formUtilizador = document.getElementById("formUtilizador");
const guardarUtilizador = document.getElementById("guardarUtilizador");
const listaUtilizadores = document.getElementById("listaUtilizadores");
const mensagemUtilizador = document.getElementById("mensagemUtilizador");

if (abrirFormUtilizador) {

  abrirFormUtilizador.onclick = () => {

    formUtilizador.style.display =
      formUtilizador.style.display === "none" ? "block" : "none";

  };

}

// =========================
// CRIAR CONTA (SEM DESLOGAR O ADMIN)
// =========================
if (guardarUtilizador) {

  guardarUtilizador.onclick = async () => {

    const email = document.getElementById("emailUtilizador").value.trim();
    const password = document.getElementById("passwordUtilizador").value.trim();
    const tipo = document.getElementById("tipoUtilizador").value;

    mensagemUtilizador.textContent = "";

    if (!email || !email.includes("@")) {

      mensagemUtilizador.textContent = "Email inválido.";
      return;

    }

    if (password.length < 6) {

      mensagemUtilizador.textContent = "A palavra-passe deve ter pelo menos 6 caracteres.";
      return;

    }

    if (!tipo) {

      mensagemUtilizador.textContent = "Seleciona o tipo de conta.";
      return;

    }

    guardarUtilizador.disabled = true;
    guardarUtilizador.textContent = "A criar...";

    const appSecundario = initializeApp(firebaseConfig, "secundario-" + Date.now());
    const authSecundario = getAuth(appSecundario);

    try {

      const userCredential = await createUserWithEmailAndPassword(
        authSecundario,
        email,
        password
      );

      const novoUser = userCredential.user;

      await setDoc(doc(dbPrincipal, "users", novoUser.uid), {
        email,
        tipo
      });

      await signOutSecundario(authSecundario);

      mensagemUtilizador.style.color = "green";
      mensagemUtilizador.textContent = "Conta criada com sucesso!";

      document.getElementById("emailUtilizador").value = "";
      document.getElementById("passwordUtilizador").value = "";
      document.getElementById("tipoUtilizador").value = "";

      await carregarUtilizadores();

    }

    catch (error) {

      console.error(error);

      mensagemUtilizador.style.color = "red";

      if (error.code === "auth/email-already-in-use") {

        mensagemUtilizador.textContent = "Este email já tem conta.";

      }

      else if (error.code === "auth/invalid-email") {

        mensagemUtilizador.textContent = "Email inválido.";

      }

      else {

        mensagemUtilizador.textContent = "Erro ao criar conta.";

      }

    }

    finally {

      await deleteApp(appSecundario);

      guardarUtilizador.disabled = false;
      guardarUtilizador.textContent = "Criar conta";

    }

  };

}

// =========================
// LISTAR UTILIZADORES
// =========================
async function carregarUtilizadores() {

  if (!listaUtilizadores) return;

  listaUtilizadores.innerHTML = "A carregar utilizadores...";

  try {

    const snap = await getDocs(collection(dbPrincipal, "users"));

    if (snap.empty) {

      listaUtilizadores.innerHTML = "<p>Nenhum utilizador registado.</p>";
      return;

    }

    listaUtilizadores.innerHTML = "";

    snap.forEach((docSnap) => {

      const u = docSnap.data();
      const id = docSnap.id;

      let nomeTipo = "Desconhecido";

      if (u.tipo === "admin") nomeTipo = "Administrador";
      if (u.tipo === "motorista") nomeTipo = "Motorista";
      if (u.tipo === "condutor") nomeTipo = "Condutor geral";

      listaUtilizadores.innerHTML += `
        <div class="item-lista">

          <div class="item-topo">
            <strong>${u.email || "Sem email"}</strong>

            <div>
              <span class="badge badge-ativo">
                ${nomeTipo}
              </span>

              ${
                u.tipo !== "admin"
                  ? `<button class="btn-eliminar-utilizador" data-id="${id}">🗑</button>`
                  : ""
              }
            </div>
          </div>

        </div>
      `;

    });

  }

  catch (error) {

    console.error(error);

    listaUtilizadores.innerHTML = "<p>Erro ao carregar utilizadores.</p>";

  }

}

document.addEventListener("click", async (e) => {

  const delU = e.target.closest(".btn-eliminar-utilizador");

  if (!delU) return;

  e.stopPropagation();

  if (!confirm("Eliminar este utilizador da lista de perfis? (A conta de acesso pode continuar a existir na Autenticação Firebase, apenas o perfil é removido.)")) {

    return;

  }

  await deleteDoc(doc(dbPrincipal, "users", delU.dataset.id));

  await carregarUtilizadores();

});

carregarUtilizadores();