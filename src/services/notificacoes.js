// Arquivo: src/services/notificacoes.js
export const dispararNotificacao = async (titulo, mensagem, url = '') => {
  try {
    const resposta = await fetch('/api/notificar', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
      },
      body: JSON.stringify({ titulo, mensagem, url })
    });
    
    const data = await resposta.json();
    
    if (!resposta.ok) {
      console.error("❌ Erro ao enviar notificação (Vercel/OneSignal):", data);
    } else {
      console.log("✅ Notificação disparada com sucesso!", data);
    }
  } catch (error) {
    console.error("❌ Erro fatal ao tentar se comunicar com a API:", error);
  }
};