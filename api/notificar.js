// Arquivo: /api/notificar.js
export default async function handler(req, res) {
  // Apenas aceita requisições do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { titulo, mensagem, url } = req.body;
  const appId = process.env.VITE_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  const payload = {
    app_id: appId,
    included_segments: ['All'], // Envia para todos os dispositivos autorizados
    headings: { en: titulo, pt: titulo },
    contents: { en: mensagem, pt: mensagem },
    url: url || '', // Link que abre ao clicar na notificação (opcional)
  };

  try {
    const resposta = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await resposta.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}