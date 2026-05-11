import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase' // A nossa ponte com o banco

export default function Pdv() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState([])
  
  // Novos estados para guardar o estoque real que vem do banco
  const [estoqueCompleto, setEstoqueCompleto] = useState([])
  const [resultadosBusca, setResultadosBusca] = useState([])
  const [carregando, setCarregando] = useState(true)

  // 1. QUANDO A TELA ABRIR: BUSCAR OS PRODUTOS NO SUPABASE
  useEffect(() => {
    async function carregarEstoque() {
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('*') // Puxa todas as colunas
        
        if (error) throw error

        setEstoqueCompleto(data || [])
      } catch (error) {
        console.error("Erro ao carregar estoque:", error.message)
      } finally {
        setCarregando(false)
      }
    }

    carregarEstoque()
  }, [])

  // 2. EFEITO DE BUSCA EM TEMPO REAL
  useEffect(() => {
    if (busca.trim() === '') {
      setResultadosBusca([]) // Limpa se não tiver nada digitado
      return
    }

    const termo = busca.toLowerCase()
    const filtrados = estoqueCompleto.filter(produto => 
      produto.nome.toLowerCase().includes(termo) || 
      (produto.codigo_barras && produto.codigo_barras.includes(termo))
    )
    
    setResultadosBusca(filtrados)
  }, [busca, estoqueCompleto])

  // 3. ADICIONAR AO CARRINHO
  const adicionarAoCarrinho = (produto) => {
    // Verifica se já está no carrinho para apenas aumentar a quantidade
    const itemExistente = carrinho.find(item => item.id === produto.id)
    
    if (itemExistente) {
      setCarrinho(carrinho.map(item => 
        item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item
      ))
    } else {
      setCarrinho([...carrinho, { ...produto, qtd: 1 }])
    }
    
    setBusca('') // Limpa a barra para o próximo bipe
  }

  // CÁLCULO FINANCEIRO
  const total = carrinho.reduce((acc, item) => acc + (item.qtd * item.preco_venda), 0)

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 font-sans">
      
      {/* =========================================
          LADO ESQUERDO: BUSCA E LISTA DE PRODUTOS
          ========================================= */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-full">
        
        <header className="bg-white p-4 shadow-sm flex items-center gap-4 z-10">
          <button 
            onClick={() => navigate('/funcionario-home')}
            className="text-gray-500 hover:text-gray-800 font-bold px-3 py-2 bg-gray-100 rounded-lg"
          >
            ← Sair
          </button>
          <div>
            <h1 className="text-xl font-bold text-blue-700">Caixa Aberto</h1>
            <p className="text-xs text-gray-500">
              {carregando ? 'Sincronizando com o banco...' : `${estoqueCompleto.length} produtos em estoque`}
            </p>
          </div>
        </header>

        {/* BARRA DE BUSCA (A MÁGICA ACONTECE AQUI) */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 z-20 relative">
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

          {/* CAIXA SUSPENSA COM OS RESULTADOS DA BUSCA (ESTILO MERCADO LIVRE) */}
          {resultadosBusca.length > 0 && (
            <div className="absolute left-4 right-4 top-[80px] bg-white border border-gray-200 shadow-2xl rounded-xl max-h-64 overflow-y-auto z-50">
              {resultadosBusca.map(produto => (
                <button 
                  key={produto.id}
                  onClick={() => adicionarAoCarrinho(produto)}
                  className="w-full text-left p-4 hover:bg-blue-50 border-b border-gray-100 flex justify-between items-center transition-colors"
                >
                  <div>
                    <div className="font-bold text-gray-800">{produto.nome}</div>
                    <div className="text-sm text-gray-500 text-left">Estoque: {produto.estoque} | Cód: {produto.codigo_barras || 'N/A'}</div>
                  </div>
                  <div className="font-bold text-green-600">R$ {Number(produto.preco_venda).toFixed(2)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LISTA DO CARRINHO */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10" onClick={() => setBusca('')}>
          {carrinho.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">{item.nome}</h3>
                <p className="text-sm text-gray-500">{item.qtd}x de R$ {Number(item.preco_venda).toFixed(2)}</p>
              </div>
              <div className="font-bold text-lg text-gray-700">
                R$ {(item.qtd * item.preco_venda).toFixed(2)}
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
          LADO DIREITO: TOTAL E PAGAMENTO
          ========================================= */}
      <div className="w-full md:w-96 bg-white shadow-2xl flex flex-col border-t-4 border-blue-500 md:border-t-0 md:border-l border-gray-200 h-[40vh] md:h-full z-20">
        <div className="p-6 flex-1 flex flex-col justify-center">
          <div className="flex justify-between text-gray-500 mb-2">
            <span>Subtotal</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-end border-t border-dashed border-gray-300 pt-4 mt-2">
            <span className="text-xl font-bold text-gray-700">Total</span>
            <span className="text-4xl font-bold text-green-600">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          <button 
            disabled={carrinho.length === 0}
            className={`w-full text-white text-2xl font-bold py-6 rounded-2xl shadow-lg transition-transform ${carrinho.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 transform hover:scale-105'}`}
          >
            Cobrar
          </button>
        </div>
      </div>

    </div>
  )
}