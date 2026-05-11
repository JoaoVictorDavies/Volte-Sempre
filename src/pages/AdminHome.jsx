import { Link } from 'react-router-dom'

export default function AdminHome() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800">Painel do Administrador</h1>
        <p className="text-gray-500">Gestão geral da sua unidade VOLTE</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Cadastro */}
        <Link to="/cadastro-produto" className="p-8 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:border-blue-500 transition-all group">
          <h3 className="text-xl font-bold text-gray-700 group-hover:text-blue-600">📦 Cadastrar Produtos</h3>
          <p className="text-gray-500 mt-2">Adicione novos itens ao estoque de forma facilitada</p>
        </Link>

        {/* Card Funcionários (Exemplo de funcionalidade futura) */}
        <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl opacity-60">
          <h3 className="text-xl font-bold text-gray-400">👥 Gerenciar Funcionários</h3>
          <p className="text-gray-400 mt-2">Em breve: Controle quem acessa o seu caixa.</p>
        </div>
      </div>
    </div>
  )
}
