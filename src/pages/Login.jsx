import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import { useAuth } from '../context/useAuth'

export default function Login() {
  const { signInWithGoogle } = useAuth()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const entrarComGoogle = async () => {
    setErro('')
    setCarregando(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Erro ao iniciar login com Google:', error)
      setErro('Não foi possível iniciar o login. Tente novamente em instantes.')
      setCarregando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#11100e] px-5 py-12 text-[#f8f6ef]">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl sm:p-10">
        <BrandLogo className="mx-auto h-16 w-16" />
        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffdb4d]">Volte!Sempre</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Entre na sua loja</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Use sua conta Google para acessar o ponto de venda com segurança.
        </p>
        {erro && <p role="alert" className="mt-5 text-sm text-rose-300">{erro}</p>}
        <button
          type="button"
          onClick={entrarComGoogle}
          disabled={carregando}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#ffd60a] px-6 py-4 text-sm font-semibold text-[#17140a] transition hover:bg-[#ffe45c] disabled:cursor-wait disabled:opacity-60"
        >
          {carregando ? 'Conectando...' : 'Continuar com Google'}
          {!carregando && <ArrowRight size={17} />}
        </button>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white">
          <ArrowLeft size={15} /> Voltar ao início
        </Link>
      </section>
    </main>
  )
}
