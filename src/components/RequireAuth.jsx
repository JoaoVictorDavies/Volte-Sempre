import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function RequireAuth() {
  const location = useLocation()
  const { user, profile, isLoading, profileError, retryProfile, signOut } = useAuth()

  const sair = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Erro ao sair da conta:', error)
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#11100e] text-[#f8f6ef]">
        <p role="status" className="text-sm text-white/65">Verificando seu acesso...</p>
      </main>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  if (profileError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#11100e] px-5 text-[#f8f6ef]">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-xl font-semibold">Não foi possível validar seu perfil</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">{profileError.message}</p>
          <button
            type="button"
            onClick={retryProfile}
            className="mt-6 rounded-full bg-[#ffd60a] px-5 py-3 text-sm font-semibold text-[#17140a]"
          >
            Tentar novamente
          </button>
        </section>
      </main>
    )
  }

  if (!profile || !profile.ativo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#11100e] px-5 text-[#f8f6ef]">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-xl font-semibold">Perfil de loja não encontrado</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Sua conta Google está autenticada, mas ainda não possui um perfil ativo vinculado a uma loja.
          </p>
          <button
            type="button"
            onClick={sair}
            className="mt-6 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold"
          >
            Sair da conta
          </button>
        </section>
      </main>
    )
  }

  return <Outlet />
}
