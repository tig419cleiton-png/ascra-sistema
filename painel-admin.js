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

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { obterConfiguracoes } from "./configuracoes.js";

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
const storage = getStorage(app);

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
  window.location.href = "index.html";
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

function criarAlerta(proximaData, gerarAlertas = true, diasAlerta = 30) {
  const dias = diasAte(proximaData);

  if (dias === null) return "";

  if (!gerarAlertas) {
    return `<span class="alerta-manutencao alerta-verde">Alertas desativados</span>`;
  }

  if (dias < 0) {
    return `<span class="alerta-manutencao alerta-vermelho">⚠ Em atraso</span>`;
  }

  if (dias <= diasAlerta) {
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
let ultimasManutencoes = [];

async function atualizarPainelAlertas() {
  const box = document.getElementById("alertasDashboard");

  if (!box) return;

  box.innerHTML = "";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const itensAlerta = [];

  // 1) MANUTENÇÕES / INSPEÇÕES DOS VEÍCULOS
  ultimasManutencoes.forEach(m => {
    if (!m.proximaData) return;
    if (m.gerarAlertas === false) return;

    const proxima = new Date(m.proximaData);
    proxima.setHours(0, 0, 0, 0);

    const diff = Math.ceil((proxima - hoje) / (1000 * 60 * 60 * 24));
    const limiteAlerta = m.diasAlerta || 30;

    if (diff < 0) {
      itensAlerta.push({
        urgencia: 2,
        classe: "alerta-danger",
        texto: `⚠ ${m.tipo} expirado no veículo ${m.veiculoNome}`,
        secao: "veiculos"
      });
    } else if (diff <= limiteAlerta) {
      itensAlerta.push({
        urgencia: 1,
        classe: "alerta-warning",
        texto: `⚠ ${m.tipo} do veículo ${m.veiculoNome} expira em ${diff} dias`,
        secao: "veiculos"
      });
    }
  });

  // 2) CARTAS DE CONDUÇÃO A EXPIRAR
  try {
    const snapCondutores = await getDocs(collection(db, "condutores"));

    snapCondutores.forEach(docSnap => {
      const c = docSnap.data();

      if (!c.validade || c.estado !== "ativo") return;

      const validade = new Date(c.validade);
      validade.setHours(0, 0, 0, 0);

      const diff = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));

      if (diff < 0) {
        itensAlerta.push({
          urgencia: 2,
          classe: "alerta-danger",
          texto: `⚠ Carta de condução de ${c.nome || "condutor"} expirada`,
          secao: "condutores"
        });
      } else if (diff <= 30) {
        itensAlerta.push({
          urgencia: 1,
          classe: "alerta-warning",
          texto: `⚠ Carta de condução de ${c.nome || "condutor"} expira em ${diff} dias`,
          secao: "condutores"
        });
      }
    });
  } catch (error) {
    console.error(error);
  }

  // 3) REQUISIÇÕES PENDENTES
  try {
    const snapRequisicoes = await getDocs(collection(db, "requisicoes"));

    let totalPendentes = 0;

    snapRequisicoes.forEach(docSnap => {
      if ((docSnap.data().estado || "pendente") === "pendente") totalPendentes++;
    });

    if (totalPendentes > 0) {
      itensAlerta.push({
        urgencia: 1,
        classe: "alerta-warning",
        texto: `📋 ${totalPendentes} requisição(ões) por validar`,
        secao: "requisicoes"
      });
    }
  } catch (error) {
    console.error(error);
  }

  // ORDENAR: mais urgentes primeiro
  itensAlerta.sort((a, b) => b.urgencia - a.urgencia);

  if (itensAlerta.length === 0) {
    box.innerHTML = `
      <div class="alerta-card alerta-ok">
        Nenhum alerta encontrado.
      </div>
    `;
    return;
  }

  itensAlerta.forEach(item => {
    box.innerHTML += `
      <div class="alerta-card ${item.classe} alerta-clicavel" data-secao="${item.secao}">
        ${item.texto}
      </div>
    `;
  });
}

// Clicar num alerta navega para a secção correspondente
document.getElementById("alertasDashboard")?.addEventListener("click", (e) => {
  const cartaoAlerta = e.target.closest(".alerta-clicavel");
  if (!cartaoAlerta) return;

  const secao = cartaoAlerta.dataset.secao;
  const botaoMenu = document.querySelector(`.menu-btn[data-section="${secao}"]`);

  if (botaoMenu) botaoMenu.click();
});

// Clicar num card do dashboard navega para a secção correspondente
document.querySelectorAll(".card-clicavel").forEach(card => {
  card.addEventListener("click", () => {
    const secao = card.dataset.secao;
    const botaoMenu = document.querySelector(`.menu-btn[data-section="${secao}"]`);

    if (botaoMenu) botaoMenu.click();
  });
});

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
    ultimasManutencoes = [];
    await atualizarPainelAlertas();
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
          veiculoNome,
          gerarAlertas: v.gerarAlertas !== false,
          diasAlerta: v.diasAlerta || 30
        });

        manutencoesHTML += `
          <div class="manutencao-item">
            <strong>${m.tipo || "Serviço"}</strong>
            ${criarAlerta(m.proximaData, v.gerarAlertas !== false, v.diasAlerta || 30)}
            <br>
            Data efetuada: ${m.dataServico || "—"}<br>
            Próxima data: ${m.proximaData || "—"}<br>
            Observações: ${m.observacoes || "—"}<br>
            ${
              m.documentos && m.documentos.length > 0
                ? `Documentos: ` + m.documentos.map((docUrl, i) =>
                    `<a href="${docUrl}" target="_blank" rel="noopener">Anexo ${i + 1}</a>`
                  ).join(" | ")
                : "Sem documentos anexados."
            }
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
          Estado: ${v.estado || "ativo"}<br>
          Alertas: ${v.gerarAlertas === false ? "Desativados" : `Ativos (aviso ${v.diasAlerta || 30} dias antes)`}<br><br>

          <strong>Quilometragem</strong><br>
          Atual: <span id="kmAtual-${id}">${(v.quilometragem || 0).toLocaleString("pt-PT")}</span> km

          <div class="form-manutencao" style="margin-top:10px;">

            <label>Atualizar quilometragem (km)</label>

            <input
              type="number"
              id="novaQuilometragem-${id}"
              min="${v.quilometragem || 0}"
              placeholder="Nova leitura do conta-quilómetros"
            >

            <button class="btn-atualizar-km" data-id="${id}">
              Atualizar km
            </button>

          </div>

          <br>

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

            <label>Documentos (fatura, comprovativo, etc.)</label>

            <input
              type="file"
              id="documentosManutencao-${id}"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
            >

            <button class="btn-guardar-manutencao" data-id="${id}">
              Guardar manutenção
            </button>

          </div>
        </div>

      </div>
    `;
  });

  ultimasManutencoes = listaManutencoes;
  await atualizarPainelAlertas();
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
          Categoria: ${c.categoria || "—"}<br>
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
let todosVeiculosRequisicaoAdmin = [];
let todasRequisicoesAtivasAdmin = [];

async function carregarSelectsRequisicaoAdmin() {
  const selectVeiculo = document.getElementById("veiculoRequisicaoAdmin");
  const selectCondutor = document.getElementById("condutorRequisicaoAdmin");

  if (!selectVeiculo || !selectCondutor) return;

  selectCondutor.innerHTML = `<option value="">Selecionar condutor</option>`;

  const veiculosSnap = await getDocs(collection(db, "veiculos"));
  const condutoresSnap = await getDocs(collection(db, "condutores"));

  todosVeiculosRequisicaoAdmin = [];

  veiculosSnap.forEach(docSnap => {
    const v = docSnap.data();

    if (v.estado === "ativo") {
      todosVeiculosRequisicaoAdmin.push({ id: docSnap.id, ...v });
    }
  });

  preencherSelectVeiculoAdmin(todosVeiculosRequisicaoAdmin);

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

function preencherSelectVeiculoAdmin(lista) {
  const selectVeiculo = document.getElementById("veiculoRequisicaoAdmin");

  if (lista.length === 0) {
    selectVeiculo.innerHTML = `<option value="">Nenhum veículo disponível nas datas escolhidas</option>`;
    return;
  }

  selectVeiculo.innerHTML = `<option value="">Selecionar veículo</option>`;

  lista.forEach(v => {
    const nome = `${v.marca || "Sem marca"} ${v.modelo || ""}`.trim();
    const matricula = v.matricula || "Sem matrícula";

    selectVeiculo.innerHTML += `
      <option value="${v.id}">
        ${nome} - ${matricula}
      </option>
    `;
  });
}

function listarDiasAdmin(inicio, fim) {
  const dias = [];

  let atual = new Date(inicio + "T00:00:00");
  const ultimo = new Date(fim + "T00:00:00");

  while (atual <= ultimo) {
    dias.push(atual.toISOString().split("T")[0]);
    atual.setDate(atual.getDate() + 1);
  }

  return dias;
}

function veiculoTemConflitoAdmin(veiculoId, diasPedidos) {
  return todasRequisicoesAtivasAdmin.some(r => {
    if (r.veiculoId !== veiculoId) return false;

    const diasOcupados = r.dias || (r.data ? [r.data] : []);

    return diasOcupados.some(d => diasPedidos.includes(d));
  });
}

async function carregarRequisicoesAtivasAdmin() {
  const snap = await getDocs(collection(db, "requisicoes"));

  todasRequisicoesAtivasAdmin = [];

  snap.forEach(d => {
    const r = d.data();

    if (r.estado !== "cancelada") {
      todasRequisicoesAtivasAdmin.push(r);
    }
  });
}

document.getElementById("verDisponibilidadeAdmin")?.addEventListener("click", async () => {

  const mensagem = document.getElementById("mensagemRequisicaoAdmin");
  const modoFiltro = document.getElementById("modoFiltroAdmin").value;
  const inicio = document.getElementById("dataInicioRequisicaoAdmin").value;
  const fim = document.getElementById("dataFimRequisicaoAdmin").value || inicio;

  mensagem.textContent = "";

  if (!inicio) {
    mensagem.textContent = "Seleciona pelo menos a data de início.";
    return;
  }

  if (fim < inicio) {
    mensagem.textContent = "A data de fim não pode ser antes da data de início.";
    return;
  }

  await carregarRequisicoesAtivasAdmin();

  const diasPedidos = listarDiasAdmin(inicio, fim);

  if (modoFiltro === "data") {

    const disponiveis = todosVeiculosRequisicaoAdmin.filter(
      v => !veiculoTemConflitoAdmin(v.id, diasPedidos)
    );

    preencherSelectVeiculoAdmin(disponiveis);

    mensagem.style.color = "green";
    mensagem.textContent = `${disponiveis.length} veículo(s) disponível(eis) nas datas escolhidas.`;

  } else {

    preencherSelectVeiculoAdmin(todosVeiculosRequisicaoAdmin);

    mensagem.style.color = "green";
    mensagem.textContent = "Seleciona um veículo para veres se está livre nas datas escolhidas.";

  }

});

document.getElementById("veiculoRequisicaoAdmin")?.addEventListener("change", () => {

  const modoFiltro = document.getElementById("modoFiltroAdmin").value;

  if (modoFiltro !== "veiculo") return;

  const mensagem = document.getElementById("mensagemRequisicaoAdmin");
  const inicio = document.getElementById("dataInicioRequisicaoAdmin").value;
  const fim = document.getElementById("dataFimRequisicaoAdmin").value || inicio;
  const veiculoId = document.getElementById("veiculoRequisicaoAdmin").value;

  if (!inicio || !veiculoId) return;

  const diasPedidos = listarDiasAdmin(inicio, fim);

  if (veiculoTemConflitoAdmin(veiculoId, diasPedidos)) {
    mensagem.style.color = "red";
    mensagem.textContent = "⚠ Este veículo já está requisitado numa das datas escolhidas.";
  } else {
    mensagem.style.color = "green";
    mensagem.textContent = "Veículo disponível nas datas escolhidas!";
  }

});

// =========================
// FORM VEÍCULO
// =========================
document.getElementById("abrirFormVeiculo").onclick = async () => {
  const form = document.getElementById("formVeiculo");
  const vaiAbrir = form.style.display === "none";

  form.style.display = vaiAbrir ? "block" : "none";

  if (vaiAbrir) {

    const cfg = await obterConfiguracoes();

    document.getElementById("gerarAlertasVeiculo").checked = cfg.gerarAlertasDefeito ?? true;
    document.getElementById("diasAlertaVeiculo").value = cfg.diasAlertaDefeito ?? 30;

  }
};

document.getElementById("guardarVeiculo").onclick = async () => {
  const marca = document.getElementById("marcaVeiculo").value.trim();
  const modelo = document.getElementById("modeloVeiculo").value.trim();
  const matricula = document.getElementById("matriculaVeiculo").value.trim().toUpperCase();
  const dataMatricula = document.getElementById("dataMatriculaVeiculo")?.value || "";
  const quilometragem = parseInt(document.getElementById("quilometragemVeiculo")?.value) || 0;
  const gerarAlertas = document.getElementById("gerarAlertasVeiculo")?.checked ?? true;
  const diasAlerta = parseInt(document.getElementById("diasAlertaVeiculo")?.value) || 30;
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
    quilometragem,
    gerarAlertas,
    diasAlerta,
    estado: "ativo"
  });

  document.getElementById("marcaVeiculo").value = "";
  document.getElementById("modeloVeiculo").value = "";
  document.getElementById("matriculaVeiculo").value = "";
  document.getElementById("quilometragemVeiculo").value = "";
  document.getElementById("diasAlertaVeiculo").value = "30";
  document.getElementById("gerarAlertasVeiculo").checked = true;

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
  const categoria = document.getElementById("categoriaCondutor").value;
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

  if (!categoria) {
    mensagem.textContent = "Seleciona a categoria da carta.";
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
    categoria,
    telefone,
    estado: "ativo"
  });

  document.getElementById("nomeCondutor").value = "";
  document.getElementById("cartaCondutor").value = "";
  document.getElementById("validadeCondutor").value = "";
  document.getElementById("categoriaCondutor").value = "";
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
    const inicio = document.getElementById("dataInicioRequisicaoAdmin").value;
    const fim = document.getElementById("dataFimRequisicaoAdmin").value || inicio;
    const observacao = document.getElementById("observacaoRequisicaoAdmin").value.trim();
    const mensagem = document.getElementById("mensagemRequisicaoAdmin");

    mensagem.textContent = "";

    const veiculoId = veiculoSelect.value;
    const condutorId = condutorSelect.value;

    if (!inicio) {
      mensagem.textContent = "Seleciona a data de início.";
      return;
    }

    if (fim < inicio) {
      mensagem.textContent = "A data de fim não pode ser antes da data de início.";
      return;
    }

    if (!veiculoId) {
      mensagem.textContent = "Seleciona um veículo.";
      return;
    }

    if (!condutorId) {
      mensagem.textContent = "Seleciona um condutor.";
      return;
    }

    if (!observacao) {
      mensagem.textContent = "Escreve uma observação.";
      return;
    }

    const diasPedidos = listarDiasAdmin(inicio, fim);

    await carregarRequisicoesAtivasAdmin();

    if (veiculoTemConflitoAdmin(veiculoId, diasPedidos)) {
      mensagem.textContent = "Este veículo já está requisitado numa das datas escolhidas. Escolhe outras datas ou outro veículo.";
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
      dataInicio: inicio,
      dataFim: fim,
      dias: diasPedidos,
      data: inicio,
      observacao,
      estado: "confirmada",
      criadoEm: new Date().toISOString()
    });

    veiculoSelect.value = "";
    condutorSelect.value = "";
    document.getElementById("dataInicioRequisicaoAdmin").value = "";
    document.getElementById("dataFimRequisicaoAdmin").value = "";
    document.getElementById("observacaoRequisicaoAdmin").value = "";
    mensagem.style.color = "";
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
            Período: ${
              r.dataInicio && r.dataFim && r.dataInicio !== r.dataFim
                ? `${r.dataInicio} a ${r.dataFim}`
                : (r.dataInicio || r.data || "—")
            }<br>
            Observação: ${r.observacao || "—"}
            ${
              r.estado === "cancelada" && r.motivoCancelamento
                ? `<br>Motivo do cancelamento: ${r.motivoCancelamento}`
                : ""
            }
          </div>

        </div>
      `;
    });

    document.getElementById("requisicoesPendentes").textContent = pendentes;

    atualizarGrafico(pendentes, confirmadas, canceladas);

    atualizarPainelAlertas();
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

    const motivo = prompt("Indica o motivo do cancelamento (obrigatório). O requisitante vai receber um email com esta informação:");

    if (motivo === null) {
      return;
    }

    if (!motivo.trim()) {
      alert("É obrigatório indicar um motivo para cancelar a requisição.");
      return;
    }

    try {

      const refRequisicao = doc(db, "requisicoes", cancelar.dataset.id);
      const snap = await getDoc(refRequisicao);
      const dadosRequisicao = snap.exists() ? snap.data() : {};

      await updateDoc(refRequisicao, {
        estado: "cancelada",
        motivoCancelamento: motivo.trim(),
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
          motivo: motivo.trim()
        });

      }

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

  const atualizarKm = e.target.closest(".btn-atualizar-km");

  if (atualizarKm) {
    e.stopPropagation();

    const veiculoId = atualizarKm.dataset.id;
    const inputKm = document.getElementById(`novaQuilometragem-${veiculoId}`);
    const novoValor = parseInt(inputKm.value);

    if (!novoValor || novoValor < 0) {
      alert("Indica uma quilometragem válida.");
      return;
    }

    try {

      await updateDoc(doc(db, "veiculos", veiculoId), {
        quilometragem: novoValor
      });

      await carregarVeiculos();

    }

    catch (error) {

      console.error(error);
      alert("Erro ao atualizar quilometragem.");

    }

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
    const inputDocumentos = document.getElementById(`documentosManutencao-${veiculoId}`);

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

    guardarManutencao.disabled = true;
    guardarManutencao.textContent = "A guardar...";

    try {

      const documentosUrls = [];

      if (inputDocumentos && inputDocumentos.files.length > 0) {

        for (const ficheiro of inputDocumentos.files) {

          const caminho = `manutencoes/${veiculoId}/${Date.now()}-${ficheiro.name}`;
          const storageRef = ref(storage, caminho);

          await uploadBytes(storageRef, ficheiro);

          const url = await getDownloadURL(storageRef);

          documentosUrls.push(url);

        }

      }

      await addDoc(collection(db, "manutencoes"), {
        veiculoId,
        tipo,
        dataServico,
        proximaData,
        observacoes,
        documentos: documentosUrls,
        criadoEm: new Date().toISOString()
      });

      await carregarVeiculos();

    }

    catch (error) {

      console.error(error);
      alert("Erro ao guardar manutenção ou anexar documentos.");

    }

    finally {

      guardarManutencao.disabled = false;
      guardarManutencao.textContent = "Guardar manutenção";

    }

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
    window.location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists() || (snap.data().tipo !== "admin" && snap.data().tipo !== "motorista")) {
    await signOut(auth);
    window.location.href = "index.html";
    return;
  }

  const dados = snap.data();
  const tipoUtilizador = dados.tipo;

  // ESCONDER ÁREAS RESTRITAS A ADMIN QUANDO É MOTORISTA
  if (tipoUtilizador === "motorista") {

    document.querySelectorAll(".admin-only").forEach(el => {
      el.style.display = "none";
    });

    document.getElementById("tituloPainel").textContent = "Painel do Motorista";

  } else {

    document.getElementById("tituloPainel").textContent = "Painel do Administrador";

  }

  const nomeTipo = tipoUtilizador === "admin" ? "Administrador" : "Motorista";

  adminInfo.textContent = `${nomeTipo}: ${dados.email}`;

  await carregarVeiculos();
  await carregarCondutores();
  await carregarSelectsRequisicaoAdmin();
  await atualizarDashboard();
  await carregarFiltrosRelatorio();

  ouvirRequisicoes();
});
// =========================
// RELATÓRIOS
// =========================
async function carregarFiltrosRelatorio() {

  const selectVeiculo = document.getElementById("relatorioVeiculo");
  const selectCondutor = document.getElementById("relatorioCondutor");
  const selectTipoRelatorio = document.getElementById("relatorioTipo");

  if (!selectVeiculo || !selectCondutor) return;

  selectVeiculo.innerHTML = `<option value="">Todos os veículos</option>`;
  selectCondutor.innerHTML = `<option value="">Todos os condutores</option>`;

  const veiculosSnap = await getDocs(collection(db, "veiculos"));

  veiculosSnap.forEach(docSnap => {
    const v = docSnap.data();
    const nome = `${v.marca || ""} ${v.modelo || ""} - ${v.matricula || ""}`.trim();

    selectVeiculo.innerHTML += `<option value="${docSnap.id}">${nome}</option>`;
  });

  const condutoresSnap = await getDocs(collection(db, "condutores"));

  condutoresSnap.forEach(docSnap => {
    const c = docSnap.data();

    selectCondutor.innerHTML += `<option value="${docSnap.id}">${c.nome || "Sem nome"}</option>`;
  });

  function ajustarCamposVisiveis() {

    const ehManutencao = selectTipoRelatorio.value === "manutencoes";

    document.getElementById("filtroCondutorWrapper").style.display = ehManutencao ? "none" : "block";
    document.getElementById("filtroServicoWrapper").style.display = ehManutencao ? "block" : "none";

  }

  selectTipoRelatorio?.addEventListener("change", ajustarCamposVisiveis);

  ajustarCamposVisiveis();

}

document.getElementById("gerarRelatorio")?.addEventListener("click", async () => {

  const dataInicio = document.getElementById("relatorioDataInicio").value;
  const dataFim = document.getElementById("relatorioDataFim").value;
  const veiculoId = document.getElementById("relatorioVeiculo").value;
  const condutorId = document.getElementById("relatorioCondutor").value;
  const tipoServico = document.getElementById("relatorioServico").value;
  const tipoRelatorio = document.getElementById("relatorioTipo").value;

  const resumo = document.getElementById("resumoRelatorio");
  const lista = document.getElementById("listaRelatorio");
  const botaoExportar = document.getElementById("exportarRelatorioPDF");

  resumo.textContent = "A gerar relatório...";
  lista.innerHTML = "";
  botaoExportar.style.display = "none";

  ultimoRelatorioFiltros = { dataInicio, dataFim, veiculoId, condutorId, tipoServico, tipoRelatorio };
  ultimoRelatorioResultados = [];
  ultimoRelatorioVeiculosMap = {};

  try {

    if (tipoRelatorio === "requisicoes") {

      const snap = await getDocs(collection(db, "requisicoes"));

      const resultados = [];

      snap.forEach(docSnap => {

        const r = docSnap.data();

        const dataRef = r.dataInicio || r.data || "";

        if (dataInicio && dataRef < dataInicio) return;
        if (dataFim && dataRef > dataFim) return;
        if (veiculoId && r.veiculoId !== veiculoId) return;
        if (condutorId && r.condutorId !== condutorId) return;

        resultados.push(r);

      });

      resumo.textContent = `${resultados.length} requisição(ões) encontrada(s).`;

      if (resultados.length === 0) {
        lista.innerHTML = "<p>Nenhum resultado para os filtros escolhidos.</p>";
        return;
      }

      resultados.sort((a, b) => (b.dataInicio || b.data || "").localeCompare(a.dataInicio || a.data || ""));

      ultimoRelatorioResultados = resultados;

      resultados.forEach(r => {

          const periodo =
            r.dataInicio && r.dataFim && r.dataInicio !== r.dataFim
              ? `${r.dataInicio} a ${r.dataFim}`
              : (r.dataInicio || r.data || "—");

          let badgeClass = "badge-manutencao";
          if (r.estado === "confirmada") badgeClass = "badge-confirmada";
          if (r.estado === "cancelada") badgeClass = "badge-cancelada";

          lista.innerHTML += `
            <div class="item-lista">
              <div class="item-topo">
                <strong>${r.veiculoNome || "Veículo"}</strong>
                <span class="badge ${badgeClass}">${r.estado || "pendente"}</span>
              </div>
              <div class="detalhes-item">
                Condutor: ${r.condutorNome || "—"}<br>
                Período: ${periodo}<br>
                Requisitado por: ${r.funcionarioEmail || "—"}<br>
                Observação: ${r.observacao || "—"}
              </div>
            </div>
          `;

        });

      botaoExportar.style.display = "inline-flex";

    } else {

      // RELATÓRIO DE MANUTENÇÕES
      const snap = await getDocs(collection(db, "manutencoes"));

      const veiculosSnap = await getDocs(collection(db, "veiculos"));
      const veiculosMap = {};

      veiculosSnap.forEach(docSnap => {
        const v = docSnap.data();
        veiculosMap[docSnap.id] = `${v.marca || ""} ${v.modelo || ""} - ${v.matricula || ""}`.trim();
      });

      ultimoRelatorioVeiculosMap = veiculosMap;

      const resultados = [];

      snap.forEach(docSnap => {

        const m = docSnap.data();
        const dataRef = m.dataServico || "";

        if (dataInicio && dataRef < dataInicio) return;
        if (dataFim && dataRef > dataFim) return;
        if (veiculoId && m.veiculoId !== veiculoId) return;
        if (tipoServico && m.tipo !== tipoServico) return;

        resultados.push(m);

      });

      resumo.textContent = `${resultados.length} registo(s) de manutenção encontrado(s).`;

      if (resultados.length === 0) {
        lista.innerHTML = "<p>Nenhum resultado para os filtros escolhidos.</p>";
        return;
      }

      resultados.sort((a, b) => (b.dataServico || "").localeCompare(a.dataServico || ""));

      ultimoRelatorioResultados = resultados;

      resultados.forEach(m => {

          lista.innerHTML += `
            <div class="item-lista">
              <div class="item-topo">
                <strong>${m.tipo || "Serviço"}</strong>
              </div>
              <div class="detalhes-item">
                Veículo: ${veiculosMap[m.veiculoId] || m.veiculoId || "—"}<br>
                Data efetuada: ${m.dataServico || "—"}<br>
                Próxima data: ${m.proximaData || "—"}<br>
                Observações: ${m.observacoes || "—"}
              </div>
            </div>
          `;

        });

      botaoExportar.style.display = "inline-flex";

    }

  } catch (error) {

    console.error(error);
    resumo.textContent = "Erro ao gerar relatório.";

  }

});

let ultimoRelatorioFiltros = {};
let ultimoRelatorioResultados = [];
let ultimoRelatorioVeiculosMap = {};

document.getElementById("exportarRelatorioPDF")?.addEventListener("click", () => {

  if (!window.jspdf || ultimoRelatorioResultados.length === 0) {
    alert("Gera primeiro o relatório antes de exportar.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const margemEsquerda = 15;
  let y = 20;

  pdf.setFontSize(18);
  pdf.setFont(undefined, "bold");
  pdf.text("ASCRA Apúlia - Relatório", margemEsquerda, y);

  y += 8;
  pdf.setFontSize(11);
  pdf.setFont(undefined, "normal");

  const tipoTexto = ultimoRelatorioFiltros.tipoRelatorio === "manutencoes" ? "Manutenções" : "Requisições (Utilização)";
  pdf.text(`Tipo: ${tipoTexto}`, margemEsquerda, y);

  y += 6;

  const periodoFiltro =
    (ultimoRelatorioFiltros.dataInicio || "—") + " a " + (ultimoRelatorioFiltros.dataFim || "—");

  pdf.text(`Período filtrado: ${periodoFiltro}`, margemEsquerda, y);

  y += 6;
  pdf.text(`Gerado em: ${new Date().toLocaleString("pt-PT")}`, margemEsquerda, y);

  y += 4;
  pdf.setDrawColor(180);
  pdf.line(margemEsquerda, y, 195, y);
  y += 8;

  pdf.setFontSize(12);
  pdf.setFont(undefined, "bold");
  pdf.text(`Total de registos: ${ultimoRelatorioResultados.length}`, margemEsquerda, y);
  y += 10;

  pdf.setFontSize(10);

  ultimoRelatorioResultados.forEach((item, index) => {

    if (y > 270) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont(undefined, "bold");

    if (ultimoRelatorioFiltros.tipoRelatorio === "manutencoes") {

      pdf.text(`${index + 1}. ${item.tipo || "Serviço"}`, margemEsquerda, y);
      y += 5;

      pdf.setFont(undefined, "normal");
      pdf.text(`   Veículo: ${ultimoRelatorioVeiculosMap[item.veiculoId] || item.veiculoId || "—"}`, margemEsquerda, y);
      y += 5;
      pdf.text(`   Data efetuada: ${item.dataServico || "—"}    Próxima data: ${item.proximaData || "—"}`, margemEsquerda, y);
      y += 5;
      pdf.text(`   Observações: ${(item.observacoes || "—").substring(0, 80)}`, margemEsquerda, y);
      y += 8;

    } else {

      const periodo =
        item.dataInicio && item.dataFim && item.dataInicio !== item.dataFim
          ? `${item.dataInicio} a ${item.dataFim}`
          : (item.dataInicio || item.data || "—");

      pdf.text(`${index + 1}. ${item.veiculoNome || "Veículo"} — ${item.estado || "pendente"}`, margemEsquerda, y);
      y += 5;

      pdf.setFont(undefined, "normal");
      pdf.text(`   Condutor: ${item.condutorNome || "—"}    Período: ${periodo}`, margemEsquerda, y);
      y += 5;
      pdf.text(`   Requisitado por: ${item.funcionarioEmail || "—"}`, margemEsquerda, y);
      y += 5;
      pdf.text(`   Observação: ${(item.observacao || "—").substring(0, 80)}`, margemEsquerda, y);
      y += 8;

    }

  });

  const nomeFicheiro = `relatorio-ascra-${tipoTexto.toLowerCase().replace(/[^a-z]/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

  pdf.save(nomeFicheiro);

});

// =========================
// AJUDA / MANUAL - TROCA DE SEPARADORES
// =========================
document.querySelectorAll(".ajuda-tab-btn").forEach(botao => {

  botao.addEventListener("click", () => {

    document.querySelectorAll(".ajuda-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".ajuda-conteudo").forEach(c => c.classList.remove("active"));

    botao.classList.add("active");

    const conteudo = document.getElementById(`ajuda-${botao.dataset.ajuda}`);

    if (conteudo) conteudo.classList.add("active");

  });

});