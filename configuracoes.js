import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAVGiLrKadXgMtt9h54hDIrV0mwrRxBTv0",
  authDomain: "ascra-sistema.firebaseapp.com",
  projectId: "ascra-sistema",
  storageBucket: "ascra-sistema.firebasestorage.app",
  messagingSenderId: "217858974774",
  appId: "1:217858974774:web:677b27add30eb58fa66497"
};

// Reutiliza app já inicializada por painel-admin.js, se existir
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);

const REF_CONFIG = doc(db, "configuracoes", "geral");

const cfgGerarAlertasDefeito = document.getElementById("cfgGerarAlertasDefeito");
const cfgDiasAlertaDefeito = document.getElementById("cfgDiasAlertaDefeito");
const cfgRequisicoesValidacao = document.getElementById("cfgRequisicoesValidacao");
const mensagemConfiguracoes = document.getElementById("mensagemConfiguracoes");
const guardarConfiguracoes = document.getElementById("guardarConfiguracoes");

// =========================
// VALORES POR DEFEITO
// =========================
const VALORES_DEFEITO = {
  gerarAlertasDefeito: true,
  diasAlertaDefeito: 30,
  requisicoesNecessitamValidacao: true
};

// =========================
// CARREGAR CONFIGURAÇÕES
// =========================
async function carregarConfiguracoes() {

  if (!cfgGerarAlertasDefeito) return;

  try {

    const snap = await getDoc(REF_CONFIG);

    const dados = snap.exists() ? snap.data() : VALORES_DEFEITO;

    cfgGerarAlertasDefeito.checked = dados.gerarAlertasDefeito ?? true;
    cfgDiasAlertaDefeito.value = dados.diasAlertaDefeito ?? 30;
    cfgRequisicoesValidacao.checked = dados.requisicoesNecessitamValidacao ?? true;

    if (!snap.exists()) {

      // Cria o documento com valores por defeito na primeira vez
      await setDoc(REF_CONFIG, VALORES_DEFEITO);

    }

  }

  catch (error) {

    console.error(error);

  }

}

// =========================
// GUARDAR CONFIGURAÇÕES
// =========================
if (guardarConfiguracoes) {

  guardarConfiguracoes.onclick = async () => {

    mensagemConfiguracoes.textContent = "";

    const diasAlertaDefeito = parseInt(cfgDiasAlertaDefeito.value);

    if (!diasAlertaDefeito || diasAlertaDefeito < 1) {

      mensagemConfiguracoes.textContent = "Indica um número de dias válido.";
      return;

    }

    try {

      await setDoc(REF_CONFIG, {

        gerarAlertasDefeito: cfgGerarAlertasDefeito.checked,
        diasAlertaDefeito,
        requisicoesNecessitamValidacao: cfgRequisicoesValidacao.checked

      });

      mensagemConfiguracoes.style.color = "green";
      mensagemConfiguracoes.textContent = "Configurações guardadas com sucesso!";

    }

    catch (error) {

      console.error(error);

      mensagemConfiguracoes.style.color = "red";
      mensagemConfiguracoes.textContent = "Erro ao guardar configurações.";

    }

  };

}

// =========================
// FUNÇÃO AUXILIAR EXPORTADA (para outros ficheiros usarem se precisarem)
// =========================
export async function obterConfiguracoes() {

  try {

    const snap = await getDoc(REF_CONFIG);

    return snap.exists() ? snap.data() : VALORES_DEFEITO;

  }

  catch (error) {

    console.error(error);
    return VALORES_DEFEITO;

  }

}

carregarConfiguracoes();