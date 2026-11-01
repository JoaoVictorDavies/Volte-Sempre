import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../services/supabase'
import { LEGAL_VERSION } from '../constants/legal'

export default function RequireLegalAcceptance() {
  const { user } = useAuth()
  const [accepted, setAccepted] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const checkAcceptance = useCallback(async () => {
    if (!user) return
    setAccepted(null)
    setError(null)
    const { data, error: queryError } = await supabase
      .from('aceites_legais')
      .select('termos_versao, privacidade_versao')
      .eq('usuario_id', user.id)
      .order('aceito_em', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (queryError) {
      setError(queryError)
      return
    }
    setAccepted(
      data?.termos_versao === LEGAL_VERSION
      && data?.privacidade_versao === LEGAL_VERSION,
    )
  }, [user])

  useEffect(() => {
    void Promise.resolve().then(checkAcceptance)
  }, [attempt, checkAcceptance])

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#11100e] px-5 text-[#f8f6ef]">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.04] p-8 text-center">
          <h1 className="text-xl font-semibold">Não foi possível verificar seu aceite</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">{error.message}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-6 rounded-full bg-[#ffd60a] px-5 py-3 text-sm font-semibold text-[#17140a]"
          >
            Tentar novamente
          </button>
        </section>
      </main>
    )
  }

  if (accepted === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#11100e] text-[#f8f6ef]">
        <p role="status" className="text-sm text-white/60">Verificando informações legais...</p>
      </main>
    )
  }

  if (!accepted) return <Navigate to="/boas-vindas" replace />
  return <Outlet />
}
