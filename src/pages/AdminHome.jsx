import { Link } from 'react-router-dom'

export default function AdminHome() {
  return (
    <div className="p-6 max-w-5xl mx-auto mt-4">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800">Painel do Administrador</h1>
        <p className="text-gray-500 mt-2">Gestão geral da sua unidade VOLTE</p>
      </header>

      {/* Sessão de Estoque */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">📦 Estoque e Produtos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card Cadastro Rápido (Celular/Stepper) */}
          <Link to="/cadastro-produto" className="p-8 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:border-blue-500 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-400 transition-all group-hover:w-3"></div>
            <h3 className="text-xl font-bold text-gray-700 group-hover:text-blue-600">Cadastro Rápido (Caixa)</h3>
            <p className="text-gray-500 mt-2 text-sm">Passo a passo simplificado. Ideal para usar direto do celular enquanto organiza a prateleira.</p>
          </Link>

          {/* Card Cadastro Precisão (PC/Tela Única) */}
          <Link to="/cadastro-precisao" className="p-8 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:border-purple-500 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-purple-500 transition-all group-hover:w-3"></div>
            <h3 className="text-xl font-bold text-gray-700 group-hover:text-purple-600">Cadastro com Precisão</h3>
            <p className="text-gray-500 mt-2 text-sm">Tela única com todos os detalhes. Ideal para o computador e grandes volumes de cadastro.</p>
          </Link>

        </div>
      </div>

      {/* Sessão de Equipe */}
      <div>
        <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">👥 Equipe</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card Funcionários (Em breve) */}
          <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl opacity-60">
            <h3 className="text-xl font-bold text-gray-400">Gerenciar Funcionários</h3>
            <p className="text-gray-400 mt-2 text-sm">Em breve: Crie acessos rápidos (PIN) para os caixas da sua loja.</p>
          </div>

        </div>
      </div>

    </div>
  )
}
