import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../services/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, profile, isLoading, profileError } = useAuth()
  const [callbackSession, setCallbackSession] = useState(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [sessionError, setSessionError] = useState(null)
  const hashCleaned = useRef(false)

  useEffect(() => {
    let active = true
    const acceptSession = (session) => {
      if (!active) return
      if (session) {
        setCallbackSession(session)
        if (!hashCleaned.current && window.location.hash) {
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}`,
          )
          hashCleaned.current = true
        }
      }
      setSessionChecked(true)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) acceptSession(session)
    })

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setSessionError(error)
          setSessionChecked(true)
          return
        }
        acceptSession(data.session)
      })
      .catch((error) => {
        if (!active) return
        setSessionError(error)
        setSessionChecked(true)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessionChecked) return
    if (!callbackSession) {
      if (!sessionError) navigate('/login', { replace: true })
      return
    }
    if (user?.id !== callbackSession.user.id || isLoading) return
    if (profileError) return

    navigate(profile?.ativo ? '/admin-home' : '/onboarding', { replace: true })
  }, [
    callbackSession,
    isLoading,
    navigate,
    profile,
    profileError,
    sessionChecked,
    sessionError,
    user,
  ])

  if (sessionError || profileError) {
    const message = sessionError?.message ?? profileError.message
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#11100e] px-5 text-[#f8f6ef]">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-xl font-semibold">Não foi possível concluir seu acesso</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">{message}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-6 rounded-full bg-[#ffd60a] px-5 py-3 text-sm font-semibold text-[#17140a]"
          >
            Voltar para o login
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#11100e] text-[#f8f6ef]">
      <p role="status" className="text-sm text-white/65">Concluindo seu acesso seguro...</p>
    </main>
  )
}
