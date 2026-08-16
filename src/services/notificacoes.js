// Arquivo: src/services/notificacoes.js
export const dispararNotificacao = async (titulo, mensagem, url = '') => {
  try {
    await fetch('/api/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, mensagem, url })
    });
  } catch (error) {
    console.error("Erro ao tentar enviar notificação:", error);
  }
};