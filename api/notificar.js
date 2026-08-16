// Arquivo: api/notificar.js
export default async function handler(req, res) {
  // Apenas aceita requisições do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { titulo, mensagem, url } = req.body;
  const appId = process.env.VITE_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  // Proteção: avisa se faltar as chaves no Vercel
  if (!appId || !restApiKey) {
    return res.status(500).json({ error: 'As chaves do OneSignal não foram encontradas no Vercel.' });
  }

  const payload = {
    app_id: appId,
    // Em contas novas, o grupo padrão se chama "Subscribed Users" ou "Active Users"
    included_segments: ['Subscribed Users', 'Active Users'], 
    headings: { en: titulo, pt: titulo },
    contents: { en: mensagem, pt: mensagem },
    url: url || '',
  };

  try {
    const resposta = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // <--- ISSO RESOLVE O ERRO 406
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await resposta.json();

    // Se o OneSignal recusar por algum outro motivo, repassa o erro para nós vermos
    if (!resposta.ok) {
      return res.status(resposta.status).json({ error: 'Falha no OneSignal', detalhes: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}