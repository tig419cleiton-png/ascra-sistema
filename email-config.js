// =========================================================
// CONFIGURAÇÃO DO EMAILJS — notificação de cancelamento
// =========================================================
//
// PASSOS PARA ATIVAR (uma única vez, é gratuito):
//
// 1. Cria conta em https://www.emailjs.com
// 2. "Email Services" → liga o Gmail da ASCRA → copia o "Service ID"
// 3. "Email Templates" → cria template com variáveis:
//      {{para_email}}  {{veiculo_nome}}  {{periodo}}  {{motivo}}
//    → copia o "Template ID"
// 4. "Account" → "General" → copia a "Public Key"
// 5. Substitui os 3 valores abaixo
//
// Enquanto não preencheres, o cancelamento continua a funcionar
// normalmente, só não envia o email (fica registado na consola).
// =========================================================

const EMAILJS_SERVICE_ID = "SERVICE_ID_AQUI";
const EMAILJS_TEMPLATE_ID = "TEMPLATE_ID_AQUI";
const EMAILJS_PUBLIC_KEY = "PUBLIC_KEY_AQUI";

const emailjsConfigurado =
  EMAILJS_SERVICE_ID !== "SERVICE_ID_AQUI" &&
  EMAILJS_TEMPLATE_ID !== "TEMPLATE_ID_AQUI" &&
  EMAILJS_PUBLIC_KEY !== "PUBLIC_KEY_AQUI";

if (window.emailjs && emailjsConfigurado) {
  window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

window.enviarEmailCancelamento = async function ({ paraEmail, veiculoNome, periodo, motivo }) {

  if (!emailjsConfigurado) {
    console.warn("EmailJS não está configurado ainda. Email de cancelamento não foi enviado (ver email-config.js).");
    return;
  }

  if (!window.emailjs) {
    console.warn("EmailJS não carregou corretamente.");
    return;
  }

  if (!paraEmail) {
    console.warn("Sem email do requisitante, não foi possível enviar a notificação.");
    return;
  }

  try {

    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      para_email: paraEmail,
      veiculo_nome: veiculoNome || "Veículo",
      periodo: periodo || "—",
      motivo: motivo || "—"
    });

  } catch (error) {

    console.error("Erro ao enviar email de cancelamento:", error);

  }

};
