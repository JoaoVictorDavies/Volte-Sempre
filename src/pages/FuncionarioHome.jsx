import { Link } from 'react-router-dom'

export default function FuncionarioHome() {
  return (
    <div className="p-6 max-w-5xl mx-auto mt-4">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800">Painel do Caixa</h1>
        <p className="text-gray-500 mt-2">Área de vendas e consulta rápida.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card: Começar a Vender (PDV) */}
        <Link to="/pdv" className="p-8 bg-white border-2 border-green-100 rounded-2xl shadow-sm hover:border-green-500 transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-green-500 transition-all group-hover:w-3"></div>
          <h3 className="text-2xl font-bold text-gray-700 group-hover:text-green-600 flex items-center gap-2">
            🛒 Começar a Vender
          </h3>
          <p className="text-gray-500 mt-2 text-sm">
            Abra o caixa. Bipe produtos, busque por nome e finalize a compra do cliente. 
          </p>
        </Link>

        {/* Card: Checar Estoque */}
        <Link to="/estoque" className="p-8 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:border-blue-500 transition-all group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-400 transition-all group-hover:w-3"></div>
          <h3 className="text-2xl font-bold text-gray-700 group-hover:text-blue-600 flex items-center gap-2">
            🔍 Checar Estoque
          </h3>
          <p className="text-gray-500 mt-2 text-sm">
            Consulte preços, veja quantidades na prateleira ou faça uma busca avançada por setor.
          </p>
        </Link>

      </div>
    </div>
  )
}