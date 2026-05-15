import { Link } from 'react-router-dom'

const CartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
)

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
)

export default function FuncionarioHome() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] px-4 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <header className="mb-12 px-2">
          <p className="text-xs font-semibold tracking-widest text-[#86868B] uppercase mb-2">
            VOLTE · Caixa
          </p>
          <h1
            className="text-4xl font-bold text-[#1D1D1F] leading-tight"
            style={{ letterSpacing: '-0.02em' }}
          >
            Painel do Caixa
          </h1>
          <p className="text-[#86868B] mt-2 text-base">
            Área de vendas e consulta rápida.
          </p>
        </header>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Card — Começar a Vender */}
          <Link
            to="/pdv"
            className="group flex flex-col justify-between bg-white rounded-3xl p-8 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
            aria-label="Ir para o PDV — Começar a Vender"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 mb-5 transition-colors duration-300 group-hover:bg-green-100">
                <CartIcon />
              </div>
              <h3
                className="text-lg font-semibold text-[#1D1D1F] leading-snug"
                style={{ letterSpacing: '-0.01em' }}
              >
                Começar a Vender
              </h3>
              <p className="text-[#86868B] mt-2 text-sm leading-relaxed">
                Abra o caixa. Bipe produtos, busque por nome e finalize a compra do cliente.
              </p>
            </div>
            <div className="mt-6 flex items-center text-green-500 text-sm font-medium gap-1 transition-all duration-300 group-hover:gap-2">
              Abrir caixa <ChevronRightIcon />
            </div>
          </Link>

          {/* Card — Checar Estoque */}
          <Link
            to="/estoque"
            className="group flex flex-col justify-between bg-white rounded-3xl p-8 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
            aria-label="Ir para consulta de estoque"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mb-5 transition-colors duration-300 group-hover:bg-blue-100">
                <SearchIcon />
              </div>
              <h3
                className="text-lg font-semibold text-[#1D1D1F] leading-snug"
                style={{ letterSpacing: '-0.01em' }}
              >
                Checar Estoque
              </h3>
              <p className="text-[#86868B] mt-2 text-sm leading-relaxed">
                Consulte preços, veja quantidades na prateleira ou faça uma busca avançada por setor.
              </p>
            </div>
            <div className="mt-6 flex items-center text-blue-500 text-sm font-medium gap-1 transition-all duration-300 group-hover:gap-2">
              Consultar <ChevronRightIcon />
            </div>
          </Link>

        </div>
      </div>
    </div>
  )
}