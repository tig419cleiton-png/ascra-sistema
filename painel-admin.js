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

// =========================
// NAVEGAÇÃO
// =========================
function mostrarSecao(id) {
  sections.forEach(sec => sec.classList.remove("active-section"));
  document.getElementById(id)?.classList.add("active-section");
}

menuButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    mostrarSecao(btn.dataset.section);
  });
});

// =========================
// LOGOUT
// =========================
logoutAdmin.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "admin.html";
});

// =========================
// FUNÇÕES AUXILIARES
// =========================
function diasAte(data) {
  if (!data) return null;

  const hoje = new Date();
  const alvo = new Date(data);

  hoje.setHours(0, 0, 0, 0);
  alvo.setHours(0, 0, 0, 0);

  const diff = alvo - hoje;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function criarAlerta(proximaData) {
  const dias = diasAte(proximaData);

  if (dias === null) return "";

  if (dias < 0) {
    return `<span class="alerta-manutencao alerta-vermelho">⚠ Em atraso</span>`;
  }

  if (dias <= 30) {
    return `<span class="alerta-manutencao alerta-amarelo">⚠ Faltam ${dias} dias</span>`;
  }

  return `<span class="alerta-manutencao alerta-verde">OK</span>`;
}

// =========================
// DASHBOARD
// =========================
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

// =========================
// ALERTAS DASHBOARD
// =========================
function atualizarAlertas(manutencoes) {
  const box = document.getElementById("alertasDashboard");

  if (!box) return;

  box.innerHTML = "";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let totalAlertas = 0;

  manutencoes.forEach(m => {
    if (!m.proximaData) return;

    const proxima = new Date(m.proximaData);
    proxima.setHours(0, 0, 0, 0);

    const diff = Math.ceil(
      (proxima - hoje) / (1000 * 60 * 60 * 24)
    );

    let classe = "";
    let texto = "";

    if (diff < 0) {
      classe = "alerta-danger";
      texto = `⚠ ${m.tipo} expirado no veículo ${m.veiculoNome}`;
    } else if (diff <= 30) {
      classe = "alerta-warning";
      texto = `⚠ ${m.tipo} do veículo ${m.veiculoNome} expira em ${diff} dias`;
    }

    if (classe) {
      totalAlertas++;

      box.innerHTML += `
        <div class="alerta-card ${classe}">
          ${texto}
        </div>
      `;
    }
  });

  if (totalAlertas === 0) {
    box.innerHTML = `
      <div class="alerta-card alerta-ok">
        Nenhum alerta encontrado.
      </div>
    `;
  }
}

// =========================
// VEÍCULOS
// =========================
async function carregarVeiculos() {
  const lista = document.getElementById("listaVeiculos");
  const veiculosSnap = await getDocs(collection(db, "veiculos"));
  const manutencoesSnap = await getDocs(collection(db, "manutencoes"));

  const listaManutencoes = [];

  lista.innerHTML = "";

  if (veiculosSnap.empty) {
    lista.innerHTML = "<p>Nenhum veículo.</p>";
    atualizarAlertas([]);
    return;
  }

  veiculosSnap.forEach(docSnap => {
    const v = docSnap.data();
    const id = docSnap.id;

    let manutencoesHTML = "";

    manutencoesSnap.forEach(manutencaoDoc => {
      const m = manutencaoDoc.data();

      if (m.veiculoId === id) {
        const veiculoNome = `${v.marca || ""} ${v.modelo || ""}`.trim();

        listaManutencoes.push({
          ...m,
          veiculoNome
        });

        manutencoesHTML += `
          <div class="manutencao-item">
            <strong>${m.tipo || "Serviço"}</strong>
            ${criarAlerta(m.proximaData)}
            <br>
            Data efetuada: ${m.dataServico || "—"}<br>
            Próxima data: ${m.proximaData || "—"}<br>
            Observações: ${m.observacoes || "—"}
          </div>
        `;
      }
    });

    if (!manutencoesHTML) {
      manutencoesHTML = "<p>Nenhuma manutenção registada.</p>";
    }

    lista.innerHTML += `
      <div class="item-lista">

        <div class="item-topo">
          <strong>${v.marca || "Sem marca"} ${v.modelo || ""}</strong>

          <div>
            <button class="btn-ver-detalhes" data-id="${id}">
              Ver detalhes
            </button>

            <button class="btn-eliminar-veiculo" data-id="${id}">
              🗑
            </button>
          </div>
        </div>

        <div class="detalhes-item">
          Matrícula: ${v.matricula || "Sem matrícula"}<br>
          Data da matrícula: ${v.dataMatricula || "—"}<br>
          Estado: ${v.estado || "ativo"}<br><br>

          <strong>Inspeções / Serviços / Manutenção</strong>

          <div class="lista-manutencoes">
            ${manutencoesHTML}
          </div>

          <div class="form-manutencao">

            <label>Tipo de serviço</label>

            <select id="tipoManutencao-${id}">
              <option value="">Selecionar tipo de serviço</option>
              <option value="Inspeção">Inspeção</option>
              <option value="Mudança de óleo">Mudança de óleo</option>
              <option value="Filtros">Filtros</option>
              <option value="Pneus">Pneus</option>
              <option value="Travões">Travões</option>
              <option value="Seguro">Seguro</option>
              <option value="IUC">IUC</option>
              <option value="Revisão">Revisão</option>
              <option value="Reparação">Reparação</option>
              <option value="Acidente / Avaria">Acidente / Avaria</option>
              <option value="Outro">Outro</option>
            </select>

            <label>Data efetuada</label>

            <input
              type="date"
              id="dataServico-${id}"
            >

            <label>Próxima data</label>

            <input
              type="date"
              id="proximaData-${id}"
            >

            <label>Observações</label>

            <textarea
              id="observacoesManutencao-${id}"
              placeholder="Descrição do serviço realizado"
            ></textarea>

            <button class="btn-guardar-manutencao" data-id="${id}">
              Guardar manutenção
            </button>

          </div>
        </div>

      </div>
    `;
  });

  atualizarAlertas(listaManutencoes);
}

// =========================
// CONDUTORES
// =========================
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

// =========================
// SELECTS DA REQUISIÇÃO ADMIN
// =========================
async function carregarSelectsRequisicaoAdmin() {
  const selectVeiculo = document.getElementById("veiculoRequisicaoAdmin");
  const selectCondutor = document.getElementById("condutorRequisicaoAdmin");

  if (!selectVeiculo || !selectCondutor) return;

  selectVeiculo.innerHTML = `<option value="">Selecionar veículo</option>`;
  selectCondutor.innerHTML = `<option value="">Selecionar condutor</option>`;

  const veiculosSnap = await getDocs(collection(db, "veiculos"));
  const condutoresSnap = await getDocs(collection(db, "condutores"));

  veiculosSnap.forEach(docSnap => {
    const v = docSnap.data();

    if (v.estado === "ativo") {
      const nome = `${v.marca || "Sem marca"} ${v.modelo || ""}`.trim();
      const matricula = v.matricula || "Sem matrícula";

      selectVeiculo.innerHTML += `
        <option value="${docSnap.id}">
          ${nome} - ${matricula}
        </option>
      `;
    }
  });

  condutoresSnap.forEach(docSnap => {
    const c = docSnap.data();

    if (c.estado === "ativo") {
      selectCondutor.innerHTML += `
        <option value="${docSnap.id}">
          ${c.nome || "Sem nome"}
        </option>
      `;
    }
  });
}

// =========================
// FORM VEÍCULO
// =========================
document.getElementById("abrirFormVeiculo").onclick = () => {
  const form = document.getElementById("formVeiculo");
  form.style.display = form.style.display === "none" ? "block" : "none";
};

document.getElementById("guardarVeiculo").onclick = async () => {
  const marca = document.getElementById("marcaVeiculo").value.trim();
  const modelo = document.getElementById("modeloVeiculo").value.trim();
  const matricula = document.getElementById("matriculaVeiculo").value.trim().toUpperCase();
  const dataMatricula = document.getElementById("dataMatriculaVeiculo")?.value || "";
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
    mensagem.textContent = "Matrícula inválida. Use o formato AA-00-BB.";
    return;
  }

  if (!dataMatricula) {
    mensagem.textContent = "Data da matrícula obrigatória.";
    return;
  }

  await addDoc(collection(db, "veiculos"), {
    marca,
    modelo,
    matricula,
    dataMatricula,
    estado: "ativo"
  });

  document.getElementById("marcaVeiculo").value = "";
  document.getElementById("modeloVeiculo").value = "";
  document.getElementById("matriculaVeiculo").value = "";

  if (document.getElementById("dataMatriculaVeiculo")) {
    document.getElementById("dataMatriculaVeiculo").value = "";
  }

  document.getElementById("formVeiculo").style.display = "none";

  await carregarVeiculos();
  await carregarSelectsRequisicaoAdmin();
  await atualizarDashboard();
};

// =========================
// FORM CONDUTOR
// =========================
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
  await carregarSelectsRequisicaoAdmin();
  await atualizarDashboard();
};

// =========================
// FORM REQUISIÇÃO ADMIN
// =========================
const abrirFormRequisicao = document.getElementById("abrirFormRequisicao");

if (abrirFormRequisicao) {
  abrirFormRequisicao.onclick = async () => {
    const form = document.getElementById("formRequisicaoAdmin");

    form.style.display =
      form.style.display === "none" ? "block" : "none";

    await carregarSelectsRequisicaoAdmin();
  };
}

const guardarRequisicaoAdmin = document.getElementById("guardarRequisicaoAdmin");

if (guardarRequisicaoAdmin) {
  guardarRequisicaoAdmin.onclick = async () => {
    const veiculoSelect = document.getElementById("veiculoRequisicaoAdmin");
    const condutorSelect = document.getElementById("condutorRequisicaoAdmin");
    const data = document.getElementById("dataRequisicaoAdmin").value;
    const observacao = document.getElementById("observacaoRequisicaoAdmin").value.trim();
    const mensagem = document.getElementById("mensagemRequisicaoAdmin");

    mensagem.textContent = "";

    const veiculoId = veiculoSelect.value;
    const condutorId = condutorSelect.value;

    if (!veiculoId) {
      mensagem.textContent = "Seleciona um veículo.";
      return;
    }

    if (!condutorId) {
      mensagem.textContent = "Seleciona um condutor.";
      return;
    }

    if (!data) {
      mensagem.textContent = "Seleciona a data da requisição.";
      return;
    }

    if (!observacao) {
      mensagem.textContent = "Escreve uma observação.";
      return;
    }

    const veiculoNome = veiculoSelect.options[veiculoSelect.selectedIndex].textContent.trim();
    const condutorNome = condutorSelect.options[condutorSelect.selectedIndex].textContent.trim();

    await addDoc(collection(db, "requisicoes"), {
      funcionarioId: "admin",
      funcionarioEmail: "Administrador",
      criadoPor: "admin",
      veiculoId,
      veiculoNome,
      condutorId,
      condutorNome,
      data,
      observacao,
      estado: "pendente",
      criadoEm: new Date().toISOString()
    });

    veiculoSelect.value = "";
    condutorSelect.value = "";
    document.getElementById("dataRequisicaoAdmin").value = "";
    document.getElementById("observacaoRequisicaoAdmin").value = "";
    mensagem.textContent = "";

    document.getElementById("formRequisicaoAdmin").style.display = "none";
  };
}

// =========================
// REQUISIÇÕES
// =========================
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
            Criado por: ${r.criadoPor || "funcionário"}<br>
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

// =========================
// GRÁFICO
// =========================
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

// =========================
// CLIQUES
// =========================
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
    await carregarSelectsRequisicaoAdmin();
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
    await carregarSelectsRequisicaoAdmin();
    await atualizarDashboard();

    return;
  }

  const guardarManutencao = e.target.closest(".btn-guardar-manutencao");

  if (guardarManutencao) {
    e.stopPropagation();

    const veiculoId = guardarManutencao.dataset.id;

    const tipo = document.getElementById(`tipoManutencao-${veiculoId}`).value;
    const dataServico = document.getElementById(`dataServico-${veiculoId}`).value;
    const proximaData = document.getElementById(`proximaData-${veiculoId}`).value;
    const observacoes = document.getElementById(`observacoesManutencao-${veiculoId}`).value.trim();

    if (!tipo) {
      alert("Indica o tipo de serviço.");
      return;
    }

    if (!dataServico) {
      alert("Indica a data em que o serviço foi efetuado.");
      return;
    }

    if (!proximaData) {
      alert("Indica a próxima data.");
      return;
    }

    await addDoc(collection(db, "manutencoes"), {
      veiculoId,
      tipo,
      dataServico,
      proximaData,
      observacoes,
      criadoEm: new Date().toISOString()
    });

    await carregarVeiculos();

    return;
  }

  const item = e.target.closest(".item-lista");

  if (
    item &&
    !e.target.closest("button") &&
    !e.target.closest("input") &&
    !e.target.closest("textarea") &&
    !e.target.closest("select")
  ) {
    item.classList.toggle("active");
  }
});

// =========================
// AUTH
// =========================
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
  await carregarSelectsRequisicaoAdmin();
  await atualizarDashboard();

  ouvirRequisicoes();
});