import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function Pdv() {
  const navigate = useNavigate()
  
  // Estados do Estoque e Carrinho
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState([])
  const [estoqueCompleto, setEstoqueCompleto] = useState([])
  const [resultadosBusca, setResultadosBusca] = useState([])
  const [carregando, setCarregando] = useState(true)

  // Estados do Pagamento (Modal)
  const [modalAberto, setModalAberto] = useState(false)
  const [metodo, setMetodo] = useState('pix') // pix, credito, debito, dinheiro
  const [valorRecebido, setValorRecebido] = useState('')
  const [processandoVenda, setProcessandoVenda] = useState(false)

  const total = carrinho.reduce((acc, item) => acc + (item.qtd * item.preco_venda), 0)
  const troco = metodo === 'dinheiro' && valorRecebido ? parseFloat(valorRecebido) - total : 0

  // 1. CARREGAR ESTOQUE
  const carregarEstoque = async () => {
    try {
      const { data, error } = await supabase.from('produtos').select('*')
      if (!error) setEstoqueCompleto(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarEstoque()
  }, [])

  // 2. BUSCA EM TEMPO REAL
  useEffect(() => {
    if (busca.trim() === '') {
      setResultadosBusca([])
      return
    }
    const termo = busca.toLowerCase()
    const filtrados = estoqueCompleto.filter(p => 
      (p.nome.toLowerCase().includes(termo) || (p.codigo_barras && p.codigo_barras.includes(termo))) &&
      p.estoque > 0 // Só mostra na busca se tiver em estoque
    )
    setResultadosBusca(filtrados)
  }, [busca, estoqueCompleto])

  // 3. CONTROLE DO CARRINHO (Adicionar, +, -, Remover)
  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.id === produto.id)
    if (itemExistente) {
      // Trava para não vender mais do que tem no estoque
      if (itemExistente.qtd < produto.estoque) {
        setCarrinho(carrinho.map(item => item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item))
      } else {
        alert('Quantidade máxima em estoque atingida!')
      }
    } else {
      setCarrinho([...carrinho, { ...produto, qtd: 1 }])
    }
    setBusca('')
  }

  const alterarQuantidade = (id, delta) => {
    setCarrinho(carrinho.map(item => {
      if (item.id === id) {
        const novaQtd = item.qtd + delta
        if (novaQtd > 0 && novaQtd <= item.estoque) {
          return { ...item, qtd: novaQtd }
        }
      }
      return item
    }))
  }

  const removerDoCarrinho = (id) => {
    setCarrinho(carrinho.filter(item => item.id !== id))
  }

  // 4. FINALIZAR A VENDA (O coração do sistema)
  const finalizarCompra = async () => {
    if (metodo === 'dinheiro' && (valorRecebido === '' || parseFloat(valorRecebido) < total)) {
      alert("O valor recebido é menor que o total da compra!")
      return
    }

    setProcessandoVenda(true)

    try {
      // A. Registrar o "Recibo" na tabela VENDAS
      const { data: vendaCadastrada, error: erroVenda } = await supabase
        .from('vendas')
        .insert([{ 
          total: total, 
          metodo_pagamento: metodo, 
          valor_recebido: metodo === 'dinheiro' ? parseFloat(valorRecebido) : total,
          troco: troco > 0 ? troco : 0
        }])
        .select()
        .single()

      if (erroVenda) throw erroVenda

      // B. Registrar os Itens e dar baixa no estoque
      for (const item of carrinho) {
        // Salva o histórico do item
        await supabase.from('vendas_itens').insert([{
          venda_id: vendaCadastrada.id,
          produto_id: item.id,
          nome: item.nome,
          quantidade: item.qtd,
          preco_custo: item.preco_custo,
          preco_venda: item.preco_venda
        }])

        // Desconta do estoque real
        const novoEstoque = item.estoque - item.qtd
        await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', item.id)
      }

      // Sucesso! Limpa tudo para o próximo cliente.
      alert("✅ Venda finalizada com sucesso!")
      setCarrinho([])
      setModalAberto(false)
      setValorRecebido('')
      setMetodo('pix')
      carregarEstoque() // Atualiza o estoque na tela imediatamente

    } catch (error) {
      alert("Erro ao finalizar venda: " + error.message)
    } finally {
      setProcessandoVenda(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 font-sans relative">
      
      {/* =========================================
          LADO ESQUERDO: BUSCA E LISTA DE PRODUTOS
          ========================================= */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-full relative">
        <header className="bg-white p-4 shadow-sm flex items-center gap-4 z-10">
          <button onClick={() => navigate('/funcionario-home')} className="text-gray-500 hover:text-gray-800 font-bold px-3 py-2 bg-gray-100 rounded-lg">← Sair</button>
          <div>
            <h1 className="text-xl font-bold text-blue-700">Caixa Aberto</h1>
            <p className="text-xs text-gray-500">{carregando ? 'Atualizando estoque...' : `${estoqueCompleto.length} produtos em estoque`}</p>
          </div>
        </header>

        <div className="p-4 bg-gray-50 border-b border-gray-200 z-20 relative">
          <div className="relative">
            <input 
              type="text" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Bipe o código ou digite o nome..."
              className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none text-lg shadow-inner"
            />
            <span className="absolute left-4 top-4 text-2xl">🔍</span>
          </div>

          {resultadosBusca.length > 0 && (
            <div className="absolute left-4 right-4 top-[80px] bg-white border border-gray-200 shadow-2xl rounded-xl max-h-64 overflow-y-auto z-50">
              {resultadosBusca.map(p => (
                <button key={p.id} onClick={() => adicionarAoCarrinho(p)} className="w-full text-left p-4 hover:bg-blue-50 border-b border-gray-100 flex justify-between items-center transition-colors">
                  <div>
                    <div className="font-bold text-gray-800">{p.nome}</div>
                    <div className="text-sm text-gray-500">Estoque: {p.estoque} | Cód: {p.codigo_barras || 'N/A'}</div>
                  </div>
                  <div className="font-bold text-green-600">R$ {Number(p.preco_venda).toFixed(2)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LISTA DO CARRINHO (Com os novos controles) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10" onClick={() => setBusca('')}>
          {carrinho.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{item.nome}</h3>
                <p className="text-sm text-gray-500">R$ {Number(item.preco_venda).toFixed(2)} /unidade</p>
              </div>
              
              {/* Controles: Lixeira, Menos, Quantidade, Mais */}
              <div className="flex items-center gap-3">
                <button onClick={() => removerDoCarrinho(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remover item">🗑️</button>
                <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <button onClick={() => alterarQuantidade(item.id, -1)} className="px-3 py-1 hover:bg-gray-200 font-bold text-gray-600">-</button>
                  <span className="px-4 py-1 font-bold bg-white">{item.qtd}</span>
                  <button onClick={() => alterarQuantidade(item.id, 1)} className="px-3 py-1 hover:bg-gray-200 font-bold text-gray-600">+</button>
                </div>
                <div className="font-bold text-lg text-gray-800 w-24 text-right">
                  R$ {(item.qtd * item.preco_venda).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
          
          {carrinho.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-2">🛒</span><p>O carrinho está vazio</p>
            </div>
          )}
        </div>
      </div>

      {/* =========================================
          LADO DIREITO: TOTAL E PAGAMENTO
          ========================================= */}
      <div className="w-full md:w-96 bg-white shadow-2xl flex flex-col border-t-4 border-blue-500 md:border-t-0 md:border-l border-gray-200 h-[40vh] md:h-full z-20">
        <div className="p-6 flex-1 flex flex-col justify-center">
          <div className="flex justify-between text-gray-500 mb-2"><span>Subtotal</span><span>R$ {total.toFixed(2)}</span></div>
          <div className="flex justify-between items-end border-t border-dashed border-gray-300 pt-4 mt-2">
            <span className="text-xl font-bold text-gray-700">Total</span>
            <span className="text-4xl font-bold text-green-600">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          <button 
            disabled={carrinho.length === 0}
            onClick={() => setModalAberto(true)}
            className={`w-full text-white text-2xl font-bold py-6 rounded-2xl shadow-lg transition-transform ${carrinho.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 transform hover:scale-105'}`}
          >
            Cobrar
          </button>
        </div>
      </div>

      {/* =========================================
          MODAL DE COBRANÇA (SOBREPÕE A TELA)
          ========================================= */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <header className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Finalizar Venda</h2>
              <button onClick={() => setModalAberto(false)} className="text-blue-200 hover:text-white text-2xl font-bold">&times;</button>
            </header>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="text-center mb-6">
                <p className="text-gray-500 font-medium">Total a Pagar</p>
                <p className="text-5xl font-bold text-green-600">R$ {total.toFixed(2)}</p>
              </div>

              <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Forma de Pagamento</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['pix', 'credito', 'debito', 'dinheiro'].map(tipo => (
                  <button 
                    key={tipo}
                    onClick={() => { setMetodo(tipo); setValorRecebido(''); }}
                    className={`p-4 rounded-xl font-bold border-2 capitalize transition-all ${metodo === tipo ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {tipo === 'pix' ? '💠 Pix' : tipo === 'credito' ? '💳 Crédito' : tipo === 'debito' ? '💳 Débito' : '💵 Dinheiro'}
                  </button>
                ))}
              </div>

              {/* Lógica especial se for DINHEIRO (Troco) */}
              {metodo === 'dinheiro' && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 animate-in slide-in-from-bottom-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Valor Recebido do Cliente (R$)</label>
                  <input 
                    type="number" autoFocus
                    value={valorRecebido} onChange={(e) => setValorRecebido(e.target.value)}
                    placeholder="Ex: 50.00"
                    className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-blue-500 text-xl text-center outline-none"
                  />
                  
                  {valorRecebido && parseFloat(valorRecebido) >= total && (
                    <div className="mt-4 flex justify-between items-center bg-green-100 p-4 rounded-lg border border-green-200">
                      <span className="font-bold text-green-800">Troco a devolver:</span>
                      <span className="text-2xl font-bold text-green-700">R$ {troco.toFixed(2)}</span>
                    </div>
                  )}
                  {valorRecebido && parseFloat(valorRecebido) < total && (
                    <p className="mt-2 text-red-500 text-sm font-bold text-center">Valor insuficiente.</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-100 border-t flex gap-3">
              <button onClick={() => setModalAberto(false)} className="flex-1 py-4 font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50">Cancelar</button>
              <button 
                onClick={finalizarCompra}
                disabled={processandoVenda || (metodo === 'dinheiro' && (!valorRecebido || parseFloat(valorRecebido) < total))}
                className={`flex-1 py-4 font-bold text-white rounded-xl shadow-lg transition-all ${processandoVenda || (metodo === 'dinheiro' && (!valorRecebido || parseFloat(valorRecebido) < total)) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {processandoVenda ? 'Registrando...' : 'Confirmar Venda'}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  )
}