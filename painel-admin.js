import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc
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

const adminInfo = document.getElementById("adminInfo");
const logoutAdmin = document.getElementById("logoutAdmin");
const menuButtons = document.querySelectorAll(".menu-btn[data-section]");
const sections = document.querySelectorAll(".admin-section");

let grafico = null;

function mostrarSecao(id) {
  sections.forEach(sec => sec.classList.remove("active-section"));
  document.getElementById(id)?.classList.add("active-section");
}

menuButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    mostrarSecao(btn.dataset.section);
  });
});

logoutAdmin.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "admin.html";
});

async function atualizarDashboard() {
  const veiculosSnap = await getDocs(collection(db, "veiculos"));
  const condutoresSnap = await getDocs(collection(db, "condutores"));

  let totalVeiculos = 0;
  let veiculosAtivos = 0;

  veiculosSnap.forEach(docSnap => {
    totalVeiculos++;
    const v = docSnap.data();

    if (v.estado === "ativo") {
      veiculosAtivos++;
    }
  });

  document.getElementById("totalVeiculos").textContent = totalVeiculos;
  document.getElementById("veiculosAtivos").textContent = veiculosAtivos;
  document.getElementById("totalCondutores").textContent = condutoresSnap.size;
}

async function carregarVeiculos() {
  const lista = document.getElementById("listaVeiculos");
  const snap = await getDocs(collection(db, "veiculos"));

  lista.innerHTML = "";

  if (snap.empty) {
    lista.innerHTML = "<p>Nenhum veículo.</p>";
    return;
  }

  snap.forEach(docSnap => {
    const v = docSnap.data();
    const id = docSnap.id;

    lista.innerHTML += `
      <div class="item-lista">
        <div class="item-topo">
          <strong>${v.marca || "Sem marca"} ${v.modelo || ""}</strong>

          <button class="btn-eliminar-veiculo" data-id="${id}">
            🗑
          </button>
        </div>

        <div class="detalhes-item">
          Matrícula: ${v.matricula || "Sem matrícula"}<br>
          Estado: ${v.estado || "ativo"}
        </div>
      </div>
    `;
  });
}

async function carregarCondutores() {
  const lista = document.getElementById("listaCondutores");
  const snap = await getDocs(collection(db, "condutores"));

  lista.innerHTML = "";

  if (snap.empty) {
    lista.innerHTML = "<p>Nenhum condutor.</p>";
    return;
  }

  snap.forEach(docSnap => {
    const c = docSnap.data();
    const id = docSnap.id;

    lista.innerHTML += `
      <div class="item-lista">
        <div class="item-topo">
          <strong>${c.nome || "Sem nome"}</strong>

          <button class="btn-eliminar-condutor" data-id="${id}">
            🗑
          </button>
        </div>

        <div class="detalhes-item">
          Carta: ${c.carta || "—"}<br>
          Validade: ${c.validade || "—"}<br>
          Telefone: ${c.telefone || "—"}<br>
          Estado: ${c.estado || "ativo"}
        </div>
      </div>
    `;
  });
}

document.getElementById("abrirFormVeiculo").onclick = () => {
  const form = document.getElementById("formVeiculo");
  form.style.display = form.style.display === "none" ? "block" : "none";
};

document.getElementById("guardarVeiculo").onclick = async () => {
  const marca = document.getElementById("marcaVeiculo").value.trim();
  const modelo = document.getElementById("modeloVeiculo").value.trim();
  const matricula = document.getElementById("matriculaVeiculo").value.trim().toUpperCase();
  const mensagem = document.getElementById("mensagemVeiculo");

  mensagem.textContent = "";

  const matriculaValida = /^[A-Z]{2}-[0-9]{2}-[A-Z]{2}$/.test(matricula);

  if (!marca) {
    mensagem.textContent = "Marca obrigatória.";
    return;
  }

  if (!modelo) {
    mensagem.textContent = "Modelo obrigatório.";
    return;
  }

  if (!matriculaValida) {
    mensagem.textContent = "Matrícula inválida.";
    return;
  }

  await addDoc(collection(db, "veiculos"), {
    marca,
    modelo,
    matricula,
    estado: "ativo"
  });

  document.getElementById("marcaVeiculo").value = "";
  document.getElementById("modeloVeiculo").value = "";
  document.getElementById("matriculaVeiculo").value = "";

  document.getElementById("formVeiculo").style.display = "none";

  await carregarVeiculos();
  await atualizarDashboard();
};

document.getElementById("abrirFormCondutor").onclick = () => {
  const form = document.getElementById("formCondutor");
  form.style.display = form.style.display === "none" ? "block" : "none";
};

document.getElementById("guardarCondutor").onclick = async () => {
  const nome = document.getElementById("nomeCondutor").value.trim();
  const carta = document.getElementById("cartaCondutor").value.trim();
  const validade = document.getElementById("validadeCondutor").value;
  const telefone = document.getElementById("telefoneCondutor").value.trim();
  const mensagem = document.getElementById("mensagemCondutor");

  mensagem.textContent = "";

  if (!nome) {
    mensagem.textContent = "Nome obrigatório.";
    return;
  }

  if (!/^[0-9]{9}$/.test(carta)) {
    mensagem.textContent = "Carta inválida.";
    return;
  }

  if (!validade) {
    mensagem.textContent = "Validade obrigatória.";
    return;
  }

  if (!/^9[0-9]{8}$/.test(telefone)) {
    mensagem.textContent = "Telefone inválido.";
    return;
  }

  await addDoc(collection(db, "condutores"), {
    nome,
    carta,
    validade,
    telefone,
    estado: "ativo"
  });

  document.getElementById("nomeCondutor").value = "";
  document.getElementById("cartaCondutor").value = "";
  document.getElementById("validadeCondutor").value = "";
  document.getElementById("telefoneCondutor").value = "";

  document.getElementById("formCondutor").style.display = "none";

  await carregarCondutores();
  await atualizarDashboard();
};

function ouvirRequisicoes() {
  const lista = document.getElementById("listaRequisicoes");

  onSnapshot(collection(db, "requisicoes"), snapshot => {
    lista.innerHTML = "";

    let pendentes = 0;
    let confirmadas = 0;
    let canceladas = 0;

    if (snapshot.empty) {
      lista.innerHTML = "<p>Nenhuma requisição recebida.</p>";
      document.getElementById("requisicoesPendentes").textContent = "0";
      atualizarGrafico(0, 0, 0);
      return;
    }

    snapshot.forEach(docSnap => {
      const r = docSnap.data();
      const id = docSnap.id;
      const estado = r.estado || "pendente";

      if (estado === "pendente") pendentes++;
      if (estado === "confirmada") confirmadas++;
      if (estado === "cancelada") canceladas++;

      let badgeClass = "badge-manutencao";

      if (estado === "confirmada") {
        badgeClass = "badge-confirmada";
      }

      if (estado === "cancelada") {
        badgeClass = "badge-cancelada";
      }

      lista.innerHTML += `
        <div class="item-lista">
          <div class="item-topo">
            <strong>${r.funcionarioEmail || "Sem email"}</strong>

            <div class="acoes-requisicao">
              <span class="badge ${badgeClass}">
                ${estado}
              </span>

              ${
                estado === "pendente"
                  ? `
                    <button class="btn-confirmar" data-id="${id}">
                      ✔
                    </button>

                    <button class="btn-cancelar" data-id="${id}">
                      ✖
                    </button>
                  `
                  : ""
              }
            </div>
          </div>

          <div class="detalhes-item">
            Veículo: ${r.veiculoNome || r.veiculoId || "—"}<br>
            Condutor: ${r.condutorNome || r.condutorId || "—"}<br>
            Data: ${r.data || "—"}<br>
            Observação: ${r.observacao || "—"}
          </div>
        </div>
      `;
    });

    document.getElementById("requisicoesPendentes").textContent = pendentes;

    atualizarGrafico(pendentes, confirmadas, canceladas);
  });
}

function atualizarGrafico(pendentes, confirmadas, canceladas) {
  const ctx = document.getElementById("graficoRequisicoes");

  if (!ctx || typeof Chart === "undefined") {
    return;
  }

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(ctx, {
    type: "bar",

    data: {
      labels: ["Pendentes", "Confirmadas", "Canceladas"],

      datasets: [{
        label: "Requisições",

        data: [
          pendentes,
          confirmadas,
          canceladas
        ],

        backgroundColor: [
          "#facc15",
          "#22c55e",
          "#ef4444"
        ],

        borderColor: [
          "#eab308",
          "#16a34a",
          "#dc2626"
        ],

        borderWidth: 2,
        borderRadius: 10
      }]
    },

    options: {
      responsive: true,

      // ALTERADO PARA O GRÁFICO NÃO FICAR COMPRIDO
      maintainAspectRatio: true,
      aspectRatio: 2,

      plugins: {
        legend: {
          display: true,
          labels: {
            color: "#1e293b",
            font: {
              size: 15,
              weight: "bold"
            }
          }
        }
      },

      scales: {
        y: {
          beginAtZero: true,

          ticks: {
            stepSize: 1,
            color: "#475569"
          },

          grid: {
            color: "rgba(0,0,0,0.08)"
          }
        },

        x: {
          ticks: {
            color: "#475569",
            font: {
              size: 15,
              weight: "bold"
            }
          },

          grid: {
            display: false
          }
        }
      }
    }
  });
}

document.addEventListener("click", async (e) => {
  const confirmar = e.target.closest(".btn-confirmar");

  if (confirmar) {
    e.stopPropagation();

    try {
      await updateDoc(doc(db, "requisicoes", confirmar.dataset.id), {
        estado: "confirmada"
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao confirmar requisição.");
    }

    return;
  }

  const cancelar = e.target.closest(".btn-cancelar");

  if (cancelar) {
    e.stopPropagation();

    try {
      await updateDoc(doc(db, "requisicoes", cancelar.dataset.id), {
        estado: "cancelada"
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao cancelar requisição.");
    }

    return;
  }

  const delV = e.target.closest(".btn-eliminar-veiculo");

  if (delV) {
    e.stopPropagation();

    if (!confirm("Eliminar veículo?")) {
      return;
    }

    await deleteDoc(doc(db, "veiculos", delV.dataset.id));

    await carregarVeiculos();
    await atualizarDashboard();

    return;
  }

  const delC = e.target.closest(".btn-eliminar-condutor");

  if (delC) {
    e.stopPropagation();

    if (!confirm("Eliminar condutor?")) {
      return;
    }

    await deleteDoc(doc(db, "condutores", delC.dataset.id));

    await carregarCondutores();
    await atualizarDashboard();

    return;
  }

  const item = e.target.closest(".item-lista");

  if (item && !e.target.closest("button")) {
    item.classList.toggle("active");
  }
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "admin.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists() || snap.data().tipo !== "admin") {
    await signOut(auth);
    window.location.href = "admin.html";
    return;
  }

  adminInfo.textContent = `Administrador: ${snap.data().email}`;

  await carregarVeiculos();
  await carregarCondutores();
  await atualizarDashboard();

  ouvirRequisicoes();
});