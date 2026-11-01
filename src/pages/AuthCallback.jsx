import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../services/supabase'
import { LEGAL_VERSION } from '../constants/legal'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, profile, isLoading, profileError, retryProfile } = useAuth()
  const [callbackSession, setCallbackSession] = useState(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [sessionError, setSessionError] = useState(null)
  const [inviteError, setInviteError] = useState(null)
  const [legalError, setLegalError] = useState(null)
  const hashCleaned = useRef(false)
  const inviteHandled = useRef(false)
  const legalHandled = useRef(false)
  const [legalConsentSaved, setLegalConsentSaved] = useState(false)
  const [savingLegalConsent, setSavingLegalConsent] = useState(false)
  const [acceptingInvite, setAcceptingInvite] = useState(false)

  const inviteToken = new URLSearchParams(window.location.search).get('convite')
    || window.sessionStorage.getItem('volte_convite_pendente')

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
    if (profileError || sessionError || inviteError || legalError) return

    const pendingLegalConsent = window.sessionStorage.getItem('volte_aceite_legal_pendente')
    if (pendingLegalConsent && !legalConsentSaved) {
      if (legalHandled.current) return
      legalHandled.current = true
      setSavingLegalConsent(true)
      void (async () => {
        try {
          const consent = JSON.parse(pendingLegalConsent)
          if (consent.versao !== LEGAL_VERSION) {
            throw new Error('A versão aceita dos documentos legais não é válida.')
          }
          const { error } = await supabase.rpc('registrar_aceite_legal', {
            p_termos_versao: consent.versao,
            p_privacidade_versao: consent.versao,
          })
          if (error) throw error
          window.sessionStorage.removeItem('volte_aceite_legal_pendente')
          setLegalConsentSaved(true)
        } catch (error) {
          console.error('Erro ao registrar aceite legal:', error)
          setLegalError(error)
        } finally {
          setSavingLegalConsent(false)
        }
      })()
      return
    }

    if (profile?.ativo) {
      window.sessionStorage.removeItem('volte_convite_pendente')
      navigate('/boas-vindas', { replace: true })
      return
    }

    if (!inviteToken) {
      navigate('/onboarding', { replace: true })
      return
    }

    if (inviteHandled.current) return
    inviteHandled.current = true
    setAcceptingInvite(true)
    supabase.rpc('aceitar_convite', { p_token: inviteToken })
      .then(async ({ error }) => {
        if (error) throw error
        const nextProfile = await retryProfile()
        if (!nextProfile?.ativo) {
          throw new Error('O convite foi aceito, mas o perfil da loja ainda não foi carregado.')
        }
        window.sessionStorage.removeItem('volte_convite_pendente')
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname,
        )
        navigate('/boas-vindas', { replace: true })
      })
      .catch((error) => {
        console.error('Erro ao aceitar convite:', error)
        setInviteError(error)
      })
      .finally(() => setAcceptingInvite(false))
  }, [
    callbackSession,
    inviteError,
    inviteToken,
    isLoading,
    legalConsentSaved,
    legalError,
    navigate,
    profile,
    profileError,
    retryProfile,
    sessionChecked,
    sessionError,
    user,
  ])

  if (sessionError || profileError || inviteError || legalError) {
    const message = sessionError?.message ?? profileError?.message ?? inviteError?.message ?? legalError?.message
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#11100e] px-5 text-[#f8f6ef]">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-xl font-semibold">Não foi possível concluir seu acesso</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">{message}</p>
          <button
            type="button"
            onClick={() => (inviteError || legalError) ? window.location.reload() : navigate('/login', { replace: true })}
            className="mt-6 rounded-full bg-[#ffd60a] px-5 py-3 text-sm font-semibold text-[#17140a]"
          >
            {(inviteError || legalError) ? 'Tentar novamente' : 'Voltar para o login'}
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#11100e] text-[#f8f6ef]">
      <p role="status" className="text-sm text-white/65">
        {savingLegalConsent
          ? 'Registrando seu aceite...'
          : acceptingInvite
            ? 'Confirmando seu convite...'
            : 'Concluindo seu acesso seguro...'}
      </p>
    </main>
  )
}
