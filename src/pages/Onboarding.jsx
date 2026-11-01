import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import { useAuth } from '../context/useAuth'
import { supabase } from '../services/supabase'

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, profile, isLoading, profileError, retryProfile, signOut } = useAuth()
  const [nomeLoja, setNomeLoja] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (profile?.ativo) navigate('/admin-home', { replace: true })
  }, [navigate, profile])

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#11100e] text-[#f8f6ef]">
        <p role="status" className="text-sm text-white/65">Preparando sua loja...</p>
      </main>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const criarLoja = async (event) => {
    event.preventDefault()
    const nome = nomeLoja.trim()
    if (!nome) {
      setErro('Informe o nome da sua loja.')
      return
    }

    setErro('')
    setSalvando(true)
    try {
      const { error } = await supabase.rpc('criar_loja', { p_nome: nome })
      if (error) throw error

      const refreshedProfile = await retryProfile()
      if (!refreshedProfile) {
        throw new Error('A loja foi criada, mas não foi possível carregar seu perfil. Tente atualizar o perfil.')
      }
      navigate('/admin-home', { replace: true })
    } catch (error) {
      console.error('Erro ao criar loja:', error)
      setErro(error.message || 'Não foi possível criar a loja. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const sair = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Erro ao sair da conta:', error)
      setErro('Não foi possível sair da conta. Tente novamente.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#11100e] px-5 py-12 text-[#f8f6ef]">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl sm:p-10">
        <BrandLogo className="mx-auto h-14 w-14" />
        <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#ffdb4d]">
          Volte!Sempre
        </p>
        <h1 className="mt-3 text-center text-2xl font-semibold tracking-tight">
          Vamos preparar sua loja
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-white/55">
          Sua conta Google está conectada. Dê um nome à loja para começar.
        </p>

        {profileError && (
          <div role="alert" className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/5 p-4 text-sm text-rose-200">
            <p>Não foi possível verificar seu perfil: {profileError.message}</p>
            <button type="button" onClick={retryProfile} className="mt-3 font-semibold underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!profileError && profile && !profile.ativo && (
          <div role="alert" className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">
            Seu perfil está desativado. Peça ao responsável pela loja para reativar seu acesso.
          </div>
        )}

        {!profile && !profileError && (
          <form onSubmit={criarLoja} className="mt-7">
            <label htmlFor="nome-loja" className="mb-2 block text-sm font-medium text-white/75">
              Nome da loja
            </label>
            <input
              id="nome-loja"
              type="text"
              value={nomeLoja}
              onChange={(event) => setNomeLoja(event.target.value)}
              maxLength={120}
              required
              autoComplete="organization"
              className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-[#ffd60a]/70"
              placeholder="Ex.: Minha Loja"
            />
            {erro && <p role="alert" className="mt-3 text-sm text-rose-300">{erro}</p>}
            <button
              type="submit"
              disabled={salvando}
              className="mt-5 w-full rounded-full bg-[#ffd60a] px-6 py-3.5 text-sm font-semibold text-[#17140a] transition hover:bg-[#ffe45c] disabled:cursor-wait disabled:opacity-60"
            >
              {salvando ? 'Criando sua loja...' : 'Criar minha loja'}
            </button>
          </form>
        )}

        {profileError && erro && <p role="alert" className="mt-4 text-sm text-rose-300">{erro}</p>}
        <button
          type="button"
          onClick={sair}
          className="mx-auto mt-6 block text-sm text-white/45 transition hover:text-white"
        >
          Sair da conta
        </button>
      </section>
    </main>
  )
}
