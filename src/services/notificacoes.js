import { supabase } from './supabase'

export const dispararNotificacao = async (titulo, mensagem, lojaId) => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session?.access_token) {
    throw new Error('É necessário estar autenticado para enviar notificações.')
  }

  const resposta = await fetch('/api/notificar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ titulo, mensagem, loja_id: lojaId }),
  })

  const resultado = await resposta.json()
  if (!resposta.ok) {
    throw new Error(resultado.error || 'Não foi possível enviar a notificação.')
  }

  return resultado
}
