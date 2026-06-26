import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy
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

async function requisicoesPrecisamValidacao() {
  try {
    const snap = await getDoc(doc(db, "configuracoes", "geral"));
    if (!snap.exists()) return true;
    return snap.data().requisicoesNecessitamValidacao ?? true;
  } catch (error) {
    console.error(error);
    return true;
  }
}

const condutorInfo = document.getElementById("condutorInfo");

const modoFiltro = document.getElementById("modoFiltro");
const dataInicioRequisicao = document.getElementById("dataInicioRequisicao");
const dataFimRequisicao = document.getElementById("dataFimRequisicao");
const verDisponibilidade = document.getElementById("verDisponibilidade");

const selectVeiculo = document.getElementById("selectVeiculo");
const selectCondutor = document.getElementById("selectCondutor");
const observacaoRequisicao = document.getElementById("observacaoRequisicao");
const mensagemRequisicao = document.getElementById("mensagemRequisicao");
const listaMinhasRequisicoes = document.getElementById("listaMinhasRequisicoes");

const modalCancelamento = document.getElementById("modalCancelamento");
const motivoCancelamento = document.getElementById("motivoCancelamento");
const mensagemCancelamento = document.getElementById("mensagemCancelamento");

let utilizadorAtual = null;
let todosVeiculos = [];
let todasRequisicoesAtivas = [];
let requisicaoParaCancelar = null;

function mostrarMensagemRequisicao(texto, cor = "red") {
  mensagemRequisicao.textContent = texto;
  mensagemRequisicao.style.color = cor;
}

function listarDias(inicio, fim) {
  const dias = [];
  let atual = new Date(inicio + "T00:00:00");
  const ultimo = new Date(fim + "T00:00:00");
  while (atual <= ultimo) {
    dias.push(atual.toISOString().split("T")[0]);
    atual.setDate(atual.getDate() + 1);
  }
  return dias;
}

function veiculoTemConflito(veiculoId, diasPedidos) {
  return todasRequisicoesAtivas.some((r) => {
    if (r.veiculoId !== veiculoId) return false;
    const diasOcupados = r.dias || (r.data ? [r.data] : []);
    return diasOcupados.some((d) => diasPedidos.includes(d));
  });
}

async function carregarRequisicoesAtivas() {
  const snap = await getDocs(collection(db, "requisicoes"));
  todasRequisicoesAtivas = [];
  snap.forEach((d) => {
    const r = d.data();
    if (r.estado !== "cancelada") {
      todasRequisicoesAtivas.push(r);
    }
  });
}

async function carregarVeiculos() {
  const querySnapshot = await getDocs(collection(db, "veiculos"));
  todosVeiculos = [];
  querySnapshot.forEach((documento) => {
    const veiculo = documento.data();
    if (veiculo.estado === "ativo") {
      todosVeiculos.push({ id: documento.id, ...veiculo });
    }
  });
  preencherSelectVeiculo(todosVeiculos);
}

function preencherSelectVeiculo(lista) {
  if (lista.length === 0) {
    selectVeiculo.innerHTML = `<option value="">Nenhum veículo disponível nas datas escolhidas</option>`;
    return;
  }
  selectVeiculo.innerHTML = `<option value="">Selecionar veículo</option>`;
  lista.forEach((veiculo) => {
    const nomeVeiculo = `${veiculo.marca || "Sem marca"} ${veiculo.modelo || ""}`.trim();
    const matricula = veiculo.matricula || "Sem matrícula";
    selectVeiculo.innerHTML += `
      <option value="${veiculo.id}">
        ${nomeVeiculo} - ${matricula}
      </option>
    `;
  });
}

verDisponibilidade.onclick = async () => {
  mostrarMensagemRequisicao("");

  const inicio = dataInicioRequisicao.value;
  const fim = dataFimRequisicao.value || inicio;

  if (!inicio) {
    mostrarMensagemRequisicao("Seleciona pelo menos a data de início.");
    return;
  }

  if (fim < inicio) {
    mostrarMensagemRequisicao("A data de fim não pode ser antes da data de início.");
    return;
  }

  await carregarRequisicoesAtivas();

  const diasPedidos = listarDias(inicio, fim);

  if (modoFiltro.value === "data") {
    const disponiveis = todosVeiculos.filter(
      (v) => !veiculoTemConflito(v.id, diasPedidos)
    );
    preencherSelectVeiculo(disponiveis);
    mostrarMensagemRequisicao(
      `${disponiveis.length} veículo(s) disponível(eis) nas datas escolhidas.`,
      "green"
    );
  } else {
    preencherSelectVeiculo(todosVeiculos);
    mostrarMensagemRequisicao(
      "Seleciona um veículo para veres se está livre nas datas escolhidas.",
      "green"
    );
  }
};

selectVeiculo.addEventListener("change", () => {
  if (modoFiltro.value !== "veiculo") return;

  const inicio = dataInicioRequisicao.value;
  const fim = dataFimRequisicao.value || inicio;

  if (!inicio || !selectVeiculo.value) return;

  const diasPedidos = listarDias(inicio, fim);

  if (veiculoTemConflito(selectVeiculo.value, diasPedidos)) {
    mostrarMensagemRequisicao(
      "⚠ Este veículo já está requisitado numa das datas escolhidas.",
      "red"
    );
  } else {
    mostrarMensagemRequisicao(
      "Veículo disponível nas datas escolhidas!",
      "green"
    );
  }
});

async function carregarCondutores() {
  selectCondutor.innerHTML = `<option value="">Selecionar condutor</option>`;
  const querySnapshot = await getDocs(collection(db, "condutores"));
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

async function carregarMinhasRequisicoes() {
  if (!utilizadorAtual) return;

  listaMinhasRequisicoes.innerHTML = "A carregar...";

  try {
    const q = query(
      collection(db, "requisicoes"),
      where("funcionarioId", "==", utilizadorAtual.uid),
      orderBy("criadoEm", "desc")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      listaMinhasRequisicoes.innerHTML = "<p>Ainda não tens requisições.</p>";
      return;
    }

    listaMinhasRequisicoes.innerHTML = "";

    snap.forEach((docSnap) => {
      const r = docSnap.data();
      const id = docSnap.id;

      let badgeClass = "badge-manutencao";
      if (r.estado === "confirmada") badgeClass = "badge-confirmada";
      if (r.estado === "cancelada") badgeClass = "badge-cancelada";

      const periodoTexto =
        r.dataInicio && r.dataFim && r.dataInicio !== r.dataFim
          ? `${r.dataInicio} a ${r.dataFim}`
          : (r.dataInicio || r.data || "—");

      const podeCancel = r.estado !== "cancelada";

      listaMinhasRequisicoes.innerHTML += `
        <div class="item-lista">
          <div class="item-topo">
            <strong>${r.veiculoNome || "Veículo"}</strong>
            <span class="badge ${badgeClass}">
              ${r.estado || "pendente"}
            </span>
          </div>
          <div class="detalhes-item">
            Condutor: ${r.condutorNome || "—"}<br>
            Período: ${periodoTexto}<br>
            Observação: ${r.observacao || "—"}
            ${
              r.estado === "cancelada" && r.motivoCancelamento
                ? `<br>Motivo do cancelamento: ${r.motivoCancelamento}`
                : ""
            }
          </div>
          ${
            podeCancel
              ? `<button class="btn-cancelar-requisicao btn-vermelho" data-id="${id}">Cancelar</button>`
              : ""
          }
        </div>
      `;
    });
  } catch (error) {
    console.error(error);
    listaMinhasRequisicoes.innerHTML = "<p>Erro ao carregar requisições.</p>";
  }
}

document.getElementById("enviarRequisicao").onclick = async () => {
  const veiculoId = selectVeiculo.value;
  const condutorId = selectCondutor.value;
  const inicio = dataInicioRequisicao.value;
  const fim = dataFimRequisicao.value || inicio;
  const observacao = observacaoRequisicao.value.trim();

  mostrarMensagemRequisicao("");

  if (!utilizadorAtual) {
    mostrarMensagemRequisicao("Tens de iniciar sessão.");
    return;
  }
  if (!inicio) {
    mostrarMensagemRequisicao("Seleciona a data de início.");
    return;
  }
  if (fim < inicio) {
    mostrarMensagemRequisicao("A data de fim não pode ser antes da data de início.");
    return;
  }
  if (!veiculoId) {
    mostrarMensagemRequisicao("Seleciona um veículo.");
    return;
  }
  if (!condutorId) {
    mostrarMensagemRequisicao("Seleciona um condutor.");
    return;
  }
  if (!observacao) {
    mostrarMensagemRequisicao("Escreve uma observação.");
    return;
  }

  const diasPedidos = listarDias(inicio, fim);

  await carregarRequisicoesAtivas();

  if (veiculoTemConflito(veiculoId, diasPedidos)) {
    mostrarMensagemRequisicao(
      "Este veículo já está requisitado numa das datas escolhidas. Escolhe outras datas ou outro veículo."
    );
    return;
  }

  const veiculoSelecionado = selectVeiculo.options[selectVeiculo.selectedIndex];
  const condutorSelecionado = selectCondutor.options[selectCondutor.selectedIndex];

  try {
    const precisaValidacao = await requisicoesPrecisamValidacao();

    await addDoc(collection(db, "requisicoes"), {
      funcionarioId: utilizadorAtual.uid,
      funcionarioEmail: utilizadorAtual.email,
      criadoPor: "condutor",
      veiculoId,
      veiculoNome: veiculoSelecionado.textContent.trim(),
      condutorId,
      condutorNome: condutorSelecionado.textContent.trim(),
      dataInicio: inicio,
      dataFim: fim,
      dias: diasPedidos,
      data: inicio,
      observacao,
      estado: precisaValidacao ? "pendente" : "confirmada",
      criadoEm: new Date().toISOString()
    });

    selectVeiculo.value = "";
    selectCondutor.value = "";
    dataInicioRequisicao.value = "";
    dataFimRequisicao.value = "";
    observacaoRequisicao.value = "";

    mostrarMensagemRequisicao("Requisição enviada com sucesso!", "green");

    await carregarMinhasRequisicoes();
  } catch (error) {
    console.error(error);
    mostrarMensagemRequisicao("Erro ao enviar requisição.");
  }
};

listaMinhasRequisicoes.addEventListener("click", (e) => {
  const botaoCancelar = e.target.closest(".btn-cancelar-requisicao");
  if (!botaoCancelar) return;

  requisicaoParaCancelar = botaoCancelar.dataset.id;

  motivoCancelamento.value = "";
  mensagemCancelamento.textContent = "";

  modalCancelamento.style.display = "flex";
});

document.getElementById("fecharModalCancelamento").onclick = () => {
  modalCancelamento.style.display = "none";
  requisicaoParaCancelar = null;
};

document.getElementById("confirmarCancelamento").onclick = async () => {
  const motivo = motivoCancelamento.value.trim();

  mensagemCancelamento.textContent = "";

  if (!motivo) {
    mensagemCancelamento.textContent = "Indica o motivo do cancelamento.";
    return;
  }

  if (!requisicaoParaCancelar) return;

  try {
    const refRequisicao = doc(db, "requisicoes", requisicaoParaCancelar);
    const snap = await getDoc(refRequisicao);

    if (!snap.exists()) {
      mensagemCancelamento.textContent = "Requisição não encontrada.";
      return;
    }

    const dadosRequisicao = snap.data();

    await updateDoc(refRequisicao, {
      estado: "cancelada",
      motivoCancelamento: motivo,
      canceladoEm: new Date().toISOString()
    });

    if (window.enviarEmailCancelamento) {
      await window.enviarEmailCancelamento({
        paraEmail: dadosRequisicao.funcionarioEmail,
        veiculoNome: dadosRequisicao.veiculoNome,
        periodo:
          dadosRequisicao.dataInicio && dadosRequisicao.dataFim
            ? `${dadosRequisicao.dataInicio} a ${dadosRequisicao.dataFim}`
            : (dadosRequisicao.data || ""),
        motivo
      });
    }

    modalCancelamento.style.display = "none";
    requisicaoParaCancelar = null;

    await carregarMinhasRequisicoes();
  } catch (error) {
    console.error(error);
    mensagemCancelamento.textContent = "Erro ao cancelar requisição.";
  }
};

document.getElementById("sairAreaCondutor").onclick = async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error(error);
    mostrarMensagemRequisicao("Erro ao terminar sessão.");
  }
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    await signOut(auth);
    window.location.href = "index.html";
    return;
  }

  const dados = snap.data();

  if (dados.tipo !== "condutor") {
    window.location.href = "index.html";
    return;
  }

  utilizadorAtual = user;

  condutorInfo.textContent = `Condutor autenticado: ${dados.email || user.email}`;

  await carregarVeiculos();
  await carregarCondutores();
  await carregarMinhasRequisicoes();
});
