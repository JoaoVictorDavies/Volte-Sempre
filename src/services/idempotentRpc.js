import { supabase } from './supabase'

export async function callIdempotentRpc({
  userId,
  operation,
  functionName,
  payload,
  rpcArguments,
}) {
  const storageKey = `volte_operacao_${userId}_${operation}`
  const serializedPayload = JSON.stringify(payload)
  let attempt

  try {
    const savedAttempt = localStorage.getItem(storageKey)
    if (savedAttempt) attempt = JSON.parse(savedAttempt)
  } catch (error) {
    throw new Error(`Não foi possível recuperar a tentativa pendente: ${error.message}`, { cause: error })
  }

  if (attempt && JSON.stringify(attempt.payload) !== serializedPayload) {
    throw new Error(
      'Existe uma operação anterior sem confirmação. Repita os mesmos dados para verificar se ela foi concluída.',
    )
  }

  if (!attempt) {
    attempt = { key: crypto.randomUUID(), payload }
    localStorage.setItem(storageKey, JSON.stringify(attempt))
  }

  const { data, error } = await supabase.rpc(functionName, {
    ...(rpcArguments || { p_payload: attempt.payload }),
    p_chave: attempt.key,
  })

  if (error) {
    if (error.code) localStorage.removeItem(storageKey)
    throw error
  }

  localStorage.removeItem(storageKey)
  return data
}
