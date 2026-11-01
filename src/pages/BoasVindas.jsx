import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LoaderCircle, Sparkles, Store } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import LegalAcceptance from '../components/LegalAcceptance'
import { useAuth } from '../context/useAuth'
import { supabase } from '../services/supabase'
import { LEGAL_VERSION } from '../constants/legal'
import { getDailyVerse, millisecondsUntilLocalMidnight } from '../utils/dailyVerse'

export default function BoasVindas() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [nomeLoja, setNomeLoja] = useState('')
  const [aceiteNecessario, setAceiteNecessario] = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')
  const [versiculo, setVersiculo] = useState(() => getDailyVerse(user?.id))

  useEffect(() => {
    const atualizarVersiculo = () => setVersiculo(getDailyVerse(user?.id))
    const timer = window.setTimeout(
      atualizarVersiculo,
      millisecondsUntilLocalMidnight() + 100,
    )
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') atualizarVersiculo()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user?.id, versiculo])

  const carregarDados = useCallback(async () => {
    if (!profile || !user) return
    setCarregando(true)
    setErro('')
    try {
      const [storeResult, acceptanceResult] = await Promise.all([
        supabase.from('lojas').select('nome').eq('id', profile.loja_id).single(),
        supabase.from('aceites_legais')
          .select('termos_versao, privacidade_versao')
          .eq('usuario_id', user.id)
          .order('aceito_em', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      if (storeResult.error) throw storeResult.error
      if (acceptanceResult.error) throw acceptanceResult.error
      setNomeLoja(storeResult.data.nome)
      const accepted = acceptanceResult.data?.termos_versao === LEGAL_VERSION
        && acceptanceResult.data?.privacidade_versao === LEGAL_VERSION
      setAceiteNecessario(!accepted)
    } catch (error) {
      console.error('Erro ao carregar as boas-vindas:', error)
      setErro(`Não foi possível carregar as informações da sua loja: ${error.message}`)
    } finally {
      setCarregando(false)
    }
  }, [profile, user])

  useEffect(() => {
    void Promise.resolve().then(carregarDados)
  }, [carregarDados])

  const entrarNoSistema = async () => {
    if (!profile) return
    if (aceiteNecessario && !aceitouTermos) {
      setErro('Leia e aceite os Termos de Uso e a Política de Privacidade para continuar.')
      return
    }

    setEntrando(true)
    setErro('')
    try {
      if (aceiteNecessario) {
        const { error } = await supabase.rpc('registrar_aceite_legal', {
          p_termos_versao: LEGAL_VERSION,
          p_privacidade_versao: LEGAL_VERSION,
        })
        if (error) throw error
      }
      navigate(profile.role === 'funcionario' ? '/caixa' : '/admin-home', { replace: true })
    } catch (error) {
      console.error('Erro ao registrar aceite legal:', error)
      setErro(`Não foi possível registrar seu aceite. Tente novamente. ${error.message}`)
    } finally {
      setEntrando(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#11100e] px-5 py-10 text-[#f8f6ef]">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[.04] p-7 shadow-2xl sm:p-10">
        <BrandLogo className="mx-auto h-14 w-14" />
        <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-[.22em] text-[#ffdb4d]">Volte!Sempre</p>
        {carregando ? (
          <div className="flex flex-col items-center py-12 text-white/55">
            <LoaderCircle size={25} className="animate-spin text-[#ffd60a]" />
            <p className="mt-4 text-sm">Preparando seu espaço...</p>
          </div>
        ) : (
          <>
            <h1 className="mt-3 text-center text-3xl font-semibold tracking-[-.045em]">
              Olá, {profile?.nome || user?.user_metadata?.name || 'boas-vindas'}
            </h1>
            <div className="mx-auto mt-4 flex w-fit max-w-full items-center gap-2 rounded-full border border-[#ffd60a]/20 bg-[#ffd60a]/[.07] px-4 py-2 text-sm text-[#ffdf70]">
              <Store size={15} className="shrink-0" />
              <span className="truncate">{nomeLoja || 'Sua loja'}</span>
            </div>
            <p className="mx-auto mt-5 max-w-sm text-center text-sm leading-6 text-white/55">
              Tudo pronto para acompanhar sua operação. Entre no sistema e siga no seu ritmo.
            </p>

            {aceiteNecessario && (
              <LegalAcceptance
                checked={aceitouTermos}
                onChange={setAceitouTermos}
                className="mt-7"
              />
            )}
            {erro && <p role="alert" className="mt-5 rounded-xl border border-rose-300/15 bg-rose-300/[.06] p-3 text-sm leading-5 text-rose-200">{erro}</p>}
            <button
              type="button"
              onClick={entrarNoSistema}
              disabled={entrando || carregando}
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-[#ffd60a] px-6 py-4 text-sm font-bold text-[#17140a] transition hover:bg-[#ffe45c] disabled:cursor-wait disabled:opacity-60"
            >
              {entrando ? 'Registrando seu acesso...' : 'Entrar no sistema'}
              {!entrando && <ArrowRight size={17} />}
            </button>
          </>
        )}
      </section>

      <figure className="mt-10 max-w-xl text-center">
        <Sparkles size={16} className="mx-auto mb-3 text-[#ffd60a]/70" />
        <blockquote className="font-serif text-base italic leading-7 text-white/60">
          “{versiculo.text}”
        </blockquote>
        <figcaption className="mt-2 text-[10px] font-medium uppercase tracking-[.18em] text-white/35">
          {versiculo.reference}
        </figcaption>
      </figure>
    </main>
  )
}
