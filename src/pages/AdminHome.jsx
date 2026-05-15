import { Link } from 'react-router-dom'

// SVG Icon components — inline, sem dependências externas
const BoxIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </svg>
)

const SmartphoneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>
  </svg>
)

const MonitorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8m-4-4v4"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
)

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const DollarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
)

const ChartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"></path>
    <path d="M18 17V9"></path>
    <path d="M13 17V5"></path>
    <path d="M8 17v-3"></path>
  </svg>
)

export default function AdminHome() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] px-4 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <header className="mb-12 px-2">
          <p className="text-xs font-semibold tracking-widest text-[#86868B] uppercase mb-2">
            VOLTE · Administração
          </p>
          <h1
            className="text-4xl font-bold text-[#1D1D1F] leading-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            Painel do Administrador
          </h1>
          <p className="text-[#86868B] mt-2 text-base">
            Gestão geral da sua unidade VOLTE
          </p>
        </header>

        {/* ── Seção: Financeiro e Controle ── */}
        <section className="mb-10">
          <div className="flex items-center gap-2 px-2 mb-5">
            <span className="text-[#86868B]"><DollarIcon /></span>
            <h2 className="text-xs font-semibold tracking-widest text-[#86868B] uppercase">
              Controle Geral
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card — Fechamento Financeiro */}
            <Link
              to="/financeiro"
              className="group flex flex-col justify-between bg-white rounded-3xl p-8 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 mb-5">
                  <DollarIcon />
                </div>
                <h3 className="text-lg font-semibold text-[#1D1D1F] leading-snug" style={{ letterSpacing: '-0.01em' }}>
                  Fechamento do Caixa
                  <span className="ml-2 text-xs font-medium text-green-500 bg-green-50 px-2 py-0.5 rounded-full align-middle">
                    Diário
                  </span>
                </h3>
                <p className="text-[#86868B] mt-2 text-sm leading-relaxed">
                  Confira as vendas de hoje, totais por método de pagamento e verifique quem abriu os caixas.
                </p>
              </div>
              <div className="mt-6 flex items-center text-green-500 text-sm font-medium gap-1 transition-all duration-300 group-hover:gap-2">
                Acessar <ChevronRightIcon />
              </div>
            </Link>

            {/* Card — Visão de Estoque */}
            <Link
              to="/estoque"
              className="group flex flex-col justify-between bg-white rounded-3xl p-8 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 mb-5">
                  <ChartIcon />
                </div>
                <h3 className="text-lg font-semibold text-[#1D1D1F] leading-snug" style={{ letterSpacing: '-0.01em' }}>
                  Visão de Estoque
                </h3>
                <p className="text-[#86868B] mt-2 text-sm leading-relaxed">
                  Visualize todos os seus produtos organizados por Setor e Marca, e acompanhe o que tem na prateleira.
                </p>
              </div>
              <div className="mt-6 flex items-center text-orange-500 text-sm font-medium gap-1 transition-all duration-300 group-hover:gap-2">
                Acessar <ChevronRightIcon />
              </div>
            </Link>

          </div>
        </section>


        {/* ── Seção: Estoque e Produtos ── */}
        <section className="mb-10">
          <div className="flex items-center gap-2 px-2 mb-5">
            <span className="text-[#86868B]"><BoxIcon /></span>
            <h2
              className="text-xs font-semibold tracking-widest text-[#86868B] uppercase"
            >
              Cadastro de Produtos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card — Cadastro Rápido */}
            <Link
              to="/cadastro-produto"
              className="group flex flex-col justify-between bg-white rounded-3xl p-8 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
              aria-label="Ir para Cadastro Rápido (Caixa)"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mb-5">
                  <SmartphoneIcon />
                </div>
                <h3
                  className="text-lg font-semibold text-[#1D1D1F] leading-snug"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  Cadastro Rápido
                  <span className="ml-2 text-xs font-medium text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full align-middle">
                    Caixa
                  </span>
                </h3>
                <p className="text-[#86868B] mt-2 text-sm leading-relaxed">
                  Passo a passo simplificado. Ideal para usar direto do celular enquanto organiza a prateleira.
                </p>
              </div>
              <div className="mt-6 flex items-center text-blue-500 text-sm font-medium gap-1 transition-all duration-300 group-hover:gap-2">
                Acessar <ChevronRightIcon />
              </div>
            </Link>

            {/* Card — Cadastro com Precisão */}
            <Link
              to="/cadastro-precisao"
              className="group flex flex-col justify-between bg-white rounded-3xl p-8 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
              aria-label="Ir para Cadastro com Precisão"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 mb-5">
                  <MonitorIcon />
                </div>
                <h3
                  className="text-lg font-semibold text-[#1D1D1F] leading-snug"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  Cadastro com Precisão
                  <span className="ml-2 text-xs font-medium text-purple-400 bg-purple-50 px-2 py-0.5 rounded-full align-middle">
                    Computador
                  </span>
                </h3>
                <p className="text-[#86868B] mt-2 text-sm leading-relaxed">
                  Tela única com todos os detalhes. Ideal para o computador e grandes volumes de cadastro.
                </p>
              </div>
              <div className="mt-6 flex items-center text-purple-500 text-sm font-medium gap-1 transition-all duration-300 group-hover:gap-2">
                Acessar <ChevronRightIcon />
              </div>
            </Link>

          </div>
        </section>

        {/* ── Seção: Equipe ── */}
        <section>
          <div className="flex items-center gap-2 px-2 mb-5">
            <span className="text-[#86868B]"><UsersIcon /></span>
            <h2
              className="text-xs font-semibold tracking-widest text-[#86868B] uppercase"
            >
              Equipe
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card — Em breve */}
            <div
              className="flex flex-col justify-between bg-white/50 rounded-3xl p-8 opacity-50 cursor-not-allowed select-none"
              style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.04)' }}
              aria-disabled="true"
              title="Em breve disponível"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7] flex items-center justify-center text-[#86868B] mb-5">
                  <LockIcon />
                </div>
                <h3
                  className="text-lg font-semibold text-[#1D1D1F] leading-snug"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  Gerenciar Funcionários
                </h3>
                <p className="text-[#86868B] mt-2 text-sm leading-relaxed">
                  Em breve: Crie acessos rápidos (PIN) para os caixas da sua loja.
                </p>
              </div>
              <div className="mt-6">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#86868B] bg-[#F5F5F7] px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#86868B] inline-block" />
                  Em breve
                </span>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  )
}