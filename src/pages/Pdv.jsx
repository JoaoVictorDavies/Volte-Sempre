import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Pdv() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  
  // Simulando um carrinho de compras para visualizarmos o layout
  const [carrinho, setCarrinho] = useState([
    { id: 1, nome: 'Malbec Tradicional', qtd: 1, preco: 189.90 },
    { id: 2, nome: 'Caixa de Bombom Nestlé', qtd: 2, preco: 15.00 }
  ])

  // Cálculo rápido do total
  const total = carrinho.reduce((acc, item) => acc + (item.qtd * item.preco), 0)

  return (
    // h-screen garante que ocupe a tela toda. md:flex-row é a mágica da rotação (lado a lado em telas mais largas)
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 font-sans">
      
      {/* =========================================
          LADO ESQUERDO: BUSCA E LISTA DE PRODUTOS
          ========================================= */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-full">
        
        {/* Cabeçalho do Caixa */}
        <header className="bg-white p-4 shadow-sm flex items-center gap-4 z-10">
          <button 
            onClick={() => navigate('/funcionario-home')}
            className="text-gray-500 hover:text-gray-800 font-bold px-3 py-2 bg-gray-100 rounded-lg"
          >
            ← Sair
          </button>
          <div>
            <h1 className="text-xl font-bold text-blue-700">Caixa Aberto</h1>
            <p className="text-xs text-gray-500">Operador: Volte-VENDEDOR</p>
          </div>
        </header>

        {/* Barra de Busca / Bipe */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 z-10">
          <div className="relative">
            <input 
              type="text"
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Bipe o código ou digite o nome do produto..."
              className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:ring-0 outline-none text-lg shadow-inner"
            />
            <span className="absolute left-4 top-4 text-2xl">🔍</span>
          </div>
        </div>

        {/* Lista do Carrinho (Com rolagem independente) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {carrinho.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">{item.nome}</h3>
                <p className="text-sm text-gray-500">{item.qtd}x de R$ {item.preco.toFixed(2)}</p>
              </div>
              <div className="font-bold text-lg text-gray-700">
                R$ {(item.qtd * item.preco).toFixed(2)}
              </div>
            </div>
          ))}
          
          {carrinho.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-2">🛒</span>
              <p>O carrinho está vazio</p>
            </div>
          )}
        </div>
      </div>

      {/* =========================================
          LADO DIREITO (OU RODAPÉ NO CELULAR): TOTAL E PAGAMENTO
          ========================================= */}
      <div className="w-full md:w-96 bg-white shadow-2xl flex flex-col border-t-4 border-blue-500 md:border-t-0 md:border-l border-gray-200 h-[40vh] md:h-full z-20">
        
        {/* Resumo dos Valores */}
        <div className="p-6 flex-1 flex flex-col justify-center">
          <div className="flex justify-between text-gray-500 mb-2">
            <span>Subtotal</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500 mb-2">
            <span>Descontos</span>
            <span>R$ 0.00</span>
          </div>
          <div className="flex justify-between items-end border-t border-dashed border-gray-300 pt-4 mt-2">
            <span className="text-xl font-bold text-gray-700">Total</span>
            <span className="text-4xl font-bold text-green-600">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Botão de Cobrar */}
        <div className="p-6 bg-gray-50">
          <button className="w-full bg-green-500 hover:bg-green-600 text-white text-2xl font-bold py-6 rounded-2xl shadow-lg transition-transform transform hover:scale-105">
            Cobrar
          </button>
        </div>
      </div>

    </div>
  )
}