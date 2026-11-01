import { useState } from 'react'
import { ArrowDownRight, ArrowRight, BarChart3, CreditCard, PackageCheck, ShieldCheck, Sparkles, Store } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import AppByVolte from '../components/AppByVolte'
import { useAuth } from '../context/useAuth'

const modules = [
  {
    icon: Store,
    number: '01',
    title: 'Ponto de Venda Rápido',
    description: 'Um caixa simples e ágil para atender melhor, registrar cada venda e manter a operação fluindo.',
  },
  {
    icon: CreditCard,
    number: '02',
    title: 'Fiado Digital',
    description: 'Contas, pagamentos e histórico de clientes organizados em um só lugar, sem perder nenhum detalhe.',
  },
  {
    icon: PackageCheck,
    number: '03',
    title: 'Estoque Inteligente',
    description: 'Acompanhe produtos e lotes com clareza para saber o que vende e o que precisa de reposição.',
  },
]

export default function Home() {
  const { signInWithGoogle } = useAuth()
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  const entrarComGoogle = async () => {
    setErro('')
    setEntrando(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Erro ao iniciar login com Google:', error)
      setErro('Não foi possível iniciar o login. Tente novamente em instantes.')
      setEntrando(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#11100e] text-[#f8f6ef]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" className="flex items-center gap-3" aria-label="Volte!Sempre, início">
          <BrandLogo className="h-10 w-10" />
          <span className="text-sm font-semibold tracking-tight sm:text-base">Volte!Sempre</span>
        </a>
        <button
          type="button"
          onClick={entrarComGoogle}
          disabled={entrando}
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/75 transition hover:border-[#ffd60a]/60 hover:text-white disabled:opacity-50 sm:px-5 sm:text-sm"
        >
          {entrando ? 'Conectando...' : 'Fazer login'}
        </button>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100svh-80px)] w-full max-w-7xl items-center gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-8 lg:pb-28 lg:pt-4">
        <div className="pointer-events-none absolute -right-36 top-8 h-[32rem] w-[32rem] rounded-full bg-[#ffb800]/[0.09] blur-[120px]" />
        <div className="relative z-10 max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#ffd60a]/20 bg-[#ffd60a]/[0.07] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffdb4d]">
            <Sparkles size={14} /> Gestão leve. Decisões melhores.
          </p>
          <h1 className="mt-7 max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            Sua loja em
            <span className="block text-[#ffd60a]">outro ritmo.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
            O essencial para vender, acompanhar o estoque e cuidar das contas da sua loja — com tudo conectado em uma experiência simples.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={entrarComGoogle}
              disabled={entrando}
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#ffd60a] px-6 py-4 text-sm font-semibold text-[#17140a] shadow-[0_12px_42px_rgba(255,214,10,0.12)] transition hover:bg-[#ffe45c] disabled:cursor-wait disabled:opacity-60"
            >
              {entrando ? 'Conectando com Google...' : 'Fazer Login / Criar Minha Loja'}
              {!entrando && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
            </button>
            <a href="#modulos" className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm text-white/60 transition hover:text-white">
              Conhecer os módulos <ArrowDownRight size={16} />
            </a>
          </div>
          {erro && <p role="alert" className="mt-4 text-sm text-rose-300">{erro}</p>}

          <div className="mt-11 flex items-center gap-3 text-xs text-white/45">
            <ShieldCheck size={16} className="text-[#ffd60a]" />
            Acesso seguro com sua conta Google
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:ml-auto">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-[#ffd60a]/15 via-transparent to-[#ff9f0a]/5 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#1a1916] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
              <div>
                <p className="text-xs text-white/45">Visão da operação</p>
                <p className="mt-1 text-sm font-medium">Tudo no seu lugar</p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[11px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Em movimento
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#24221d] p-4">
                <div className="flex items-center justify-between text-white/45">
                  <span className="text-xs">Vendas</span><BarChart3 size={15} />
                </div>
                <p className="mt-5 text-2xl font-semibold tracking-tight">No ritmo</p>
                <p className="mt-1 text-[11px] text-white/40">Acompanhe seu caixa</p>
              </div>
              <div className="rounded-2xl bg-[#24221d] p-4">
                <div className="flex items-center justify-between text-white/45">
                  <span className="text-xs">Estoque</span><PackageCheck size={15} />
                </div>
                <p className="mt-5 text-2xl font-semibold tracking-tight">Em dia</p>
                <p className="mt-1 text-[11px] text-white/40">Produtos e lotes claros</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 rounded-2xl border border-[#ffd60a]/15 bg-[#ffd60a]/[0.06] p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ffd60a] text-[#17140a]">
                <CreditCard size={19} />
              </div>
              <div>
                <p className="text-sm font-medium">Fiado sem papelada</p>
                <p className="mt-1 text-xs text-white/45">Histórico organizado para você e seus clientes.</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/30">
              <span>Vender · Organizar · Crescer</span><span>V!S</span>
            </div>
          </div>
        </div>
      </section>

      <section id="modulos" className="border-t border-white/[0.08] bg-[#f7f5ee] text-[#191813]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7410]">Feito para o dia a dia</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Menos complicação.
              <span className="block text-[#8b6a0a]">Mais loja acontecendo.</span>
            </h2>
          </div>
          <div className="mt-11 grid gap-4 md:grid-cols-3">
            {modules.map(({ icon: Icon, number, title, description }) => (
              <article key={number} className="rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4c2] text-[#8b6a0a]">
                    <Icon size={20} />
                  </span>
                  <span className="text-xs font-medium tracking-[0.15em] text-black/30">{number}</span>
                </div>
                <h3 className="mt-8 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/55">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-3xl bg-[#171612] p-7 text-white sm:flex-row sm:p-9">
            <div>
              <p className="text-xl font-semibold tracking-tight">Pronto para organizar sua operação?</p>
              <p className="mt-2 text-sm text-white/55">Entre com Google e conheça o Volte!Sempre.</p>
            </div>
            <button
              type="button"
              onClick={entrarComGoogle}
              disabled={entrando}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#ffd60a] px-5 py-3 text-sm font-semibold text-[#17140a] transition hover:bg-[#ffe45c] disabled:opacity-60"
            >
              {entrando ? 'Conectando...' : 'Fazer Login / Criar Minha Loja'}
              {!entrando && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-white/40 sm:flex-row sm:px-8">
        <span>© {new Date().getFullYear()} Volte!Sempre</span>
        <span className="[&_span]:text-white/50 [&_svg]:h-5 [&_svg]:w-5"><AppByVolte /></span>
      </footer>
    </main>
  )
}
