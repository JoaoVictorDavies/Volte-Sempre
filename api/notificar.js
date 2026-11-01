import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const authorization = req.headers.authorization
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return res.status(401).json({ error: 'Autenticação obrigatória.' })

  const appId = globalThis.process.env.VITE_ONESIGNAL_APP_ID
  const restApiKey = globalThis.process.env.ONESIGNAL_REST_API_KEY
  const supabaseUrl = globalThis.process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = globalThis.process.env.VITE_SUPABASE_ANON_KEY
  if (!appId || !restApiKey || !supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Configuração de notificações incompleta.' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' })
    }

    const { data: profile, error: profileError } = await supabase
      .from('usuarios')
      .select('loja_id, ativo')
      .eq('id', authData.user.id)
      .maybeSingle()
    if (profileError) throw profileError
    if (!profile?.ativo) {
      return res.status(403).json({ error: 'Perfil ativo da loja não encontrado.' })
    }

    if (req.body?.loja_id && req.body.loja_id !== profile.loja_id) {
      return res.status(403).json({ error: 'A loja informada não corresponde ao seu perfil.' })
    }

    const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : ''
    const mensagem = typeof req.body?.mensagem === 'string' ? req.body.mensagem.trim() : ''
    if (!titulo || !mensagem || titulo.length > 120 || mensagem.length > 1000) {
      return res.status(400).json({ error: 'Título ou mensagem inválidos.' })
    }

    const { data: devices, error: devicesError } = await supabase
      .from('onesignal_dispositivos')
      .select('external_id')
      .eq('loja_id', profile.loja_id)
      .eq('ativo', true)
    if (devicesError) throw devicesError

    const externalIds = [...new Set((devices || []).map((device) => device.external_id))]
    if (externalIds.length === 0) {
      return res.status(200).json({ success: true, sent: 0 })
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_external_user_ids: externalIds,
        channel_for_external_user_ids: ['push'],
        headings: { en: titulo, pt: titulo },
        contents: { en: mensagem, pt: mensagem },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('OneSignal notification rejected:', data)
      return res.status(502).json({ error: 'O provedor de notificações rejeitou o envio.' })
    }

    return res.status(200).json({ success: true, sent: externalIds.length })
  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    return res.status(500).json({ error: 'Não foi possível enviar a notificação.' })
  }
}
