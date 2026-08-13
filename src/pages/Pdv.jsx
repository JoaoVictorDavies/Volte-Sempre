import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Camera, MinusCircle, AlertCircle, ShoppingBag } from 'lucide-react'
import LeitorInterativo from '../components/LeitorInterativo'

export default function Pdv() {
  const navigate = useNavigate()
  
  // Estados do Estoque e Carrinho
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState([])
  const [estoqueCompleto, setEstoqueCompleto] = useState([])
  const [resultadosBusca, setResultadosBusca] = useState([])
  
  // Novo Estado: Último Produto Bipado (Para exibição no painel direito)
  const [ultimoProduto, setUltimoProduto] = useState(null)

  // Novo Estado: Modo Remoção (Acionado pela barra de Espaço)
  const [modoRemocao, setModoRemocao] = useState(false)

  // Novo Estado: Detecção se é Mobile/Tablet (para exibir botão da câmera)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Estados da Calculadora
  const [calcAberto, setCalcAberto] = useState(false)
  const [calcDisplay, setCalcDisplay] = useState('')

  // Estados do Pagamento (Modal)
  const [modalAberto, setModalAberto] = useState(false)
  const [metodo, setMetodo] = useState('pix') 
  const [valorRecebido, setValorRecebido] = useState('')
  const [processandoVenda, setProcessandoVenda] = useState(false)

  // Estado da Sessão Logada
  const [sessaoAtiva, setSessaoAtiva] = useState(null)

  // Estado do Acionador do Modo Câmera
  const [cameraAtiva, setCameraAtiva] = useState(false)

  // Referência para Leitor Global USB
  const bufferLeitor = useRef('')
  const ultimoTempoDigitação = useRef(Date.now())

  const total = carrinho.reduce((acc, item) => acc + (item.qtd * item.preco_venda), 0)
  const troco = metodo === 'dinheiro' && valorRecebido ? parseFloat(valorRecebido) - total : 0

  // Detecta se a tela é mobile/notebook em tempo real
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ==========================================
  // 1. VERIFICAÇÃO DE SEGURANÇA DA SESSÃO
  // ==========================================
  useEffect(() => {
    const sessaoSalva = localStorage.getItem('volte_sessao_caixa')
    if (!sessaoSalva) {
      alert("Acesso negado! Por favor, insira seu PIN para abrir ou retomar um caixa.")
      navigate('/caixa')
      return
    }
    
    const sessaoObjeto = JSON.parse(sessaoSalva)
    setSessaoAtiva(sessaoObjeto)
    carregarEstoque()
  }, [navigate])

  // ==========================================
  // 2. CARREGAR ESTOQUE (VIA FILA DE LOTES)
  // ==========================================
  const carregarEstoque = async () => {
    try {
      const { data, error } = await supabase.from('produtos').select('*, estoque_lotes(*)')
      if (error) throw error

      const estoqueProcessado = (data || []).map(p => {
        const lotesValidos = (p.estoque_lotes || []).filter(l => l.quantidade_atual > 0)
        const estoqueTotal = lotesValidos.reduce((acc, l) => acc + l.quantidade_atual, 0)
        return { ...p, estoqueTotal }
      }).filter(p => p.estoqueTotal > 0)

      setEstoqueCompleto(estoqueProcessado)
    } catch (error) {
      console.error("Erro ao carregar estoque:", error)
    }
  }

  // ==========================================
  // 3. BUSCA EM TEMPO REAL (INPUT MANUAL)
  // ==========================================
  useEffect(() => {
    if (busca.trim() === '') {
      setResultadosBusca([])
      return
    }
    const termo = busca.toLowerCase()
    const filtrados = estoqueCompleto.filter(p => 
      (p.nome.toLowerCase().includes(termo) || (p.codigo_barras && p.codigo_barras.includes(termo)))
    )
    setResultadosBusca(filtrados)
  }, [busca, estoqueCompleto])

  // ==========================================
  // 4. LÓGICA DE ADICIONAR E REMOVER PRODUTO
  // ==========================================
  const processarBipProduto = (produto, forcarRemocao = false) => {
    // Atualiza o card visual do "Último Produto Bipado"
    setUltimoProduto(produto)

    const estaEmModoRemocao = forcarRemocao || modoRemocao

    if (estaEmModoRemocao) {
      // MODO REMOÇÃO: Subtrai 1 unidade ou remove se chegar a zero
      setCarrinho(prev => {
        const itemExistente = prev.find(item => item.id === produto.id)
        if (!itemExistente) return prev // Se não está no carrinho, não faz nada
        
        if (itemExistente.qtd > 1) {
          return prev.map(item => item.id === produto.id ? { ...item, qtd: item.qtd - 1 } : item)
        } else {
          return prev.filter(item => item.id !== produto.id)
        }
      })
      // Desativa o modo remoção após estornar o item
      setModoRemocao(false)
    } else {
      // MODO ADIÇÃO: Soma 1 unidade
      setCarrinho(prev => {
        const itemExistente = prev.find(item => item.id === produto.id)
        if (itemExistente) {
          if (itemExistente.qtd < produto.estoqueTotal) {
            return prev.map(item => item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item)
          } else {
            alert(`Atenção: Limite máximo em estoque (${produto.estoqueTotal} un) atingido!`)
            return prev
          }
        } else {
          return [...prev, { ...produto, qtd: 1 }]
        }
      })
    }
    setBusca('')
  }

  const adicionarAoCarrinho = (produto) => {
    processarBipProduto(produto, false)
  }

  const alterarQuantidade = (id, delta) => {
    setCarrinho(prev => prev.map(item => {
      if (item.id === id) {
        const novaQtd = item.qtd + delta
        if (novaQtd > 0 && novaQtd <= item.estoqueTotal) {
          return { ...item, qtd: novaQtd }
        }
      }
      return item
    }))
  }

  const removerDoCarrinho = (id) => {
    setCarrinho(prev => prev.filter(item => item.id !== id))
  }

  // ==========================================
  // 5. OUVINTE GLOBAL DO LEITOR DE CÓDIGO & TECLA ESPAÇO
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Não interfere se o operador estiver digitando nos inputs dos Modals
      if (modalAberto || calcAberto) return

      // TECLA ESPAÇO: Alterna para o MODO REMOÇÃO
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault()
        setModoRemocao(prev => !prev)
        return
      }

      // LEITOR DE CÓDIGO USB/BLUETOOTH (Captura em Milissegundos)
      const agora = Date.now()
      if (agora - ultimoTempoDigitação.current > 100) {
        bufferLeitor.current = '' // Limpa o buffer se a digitação for lenta (humana)
      }
      ultimoTempoDigitação.current = agora

      if (e.key === 'Enter') {
        const codigoFormatado = bufferLeitor.current.trim()
        if (codigoFormatado.length > 2) {
          e.preventDefault()
          const produtoEncontrado = estoqueCompleto.find(p => p.codigo_barras === codigoFormatado)
          if (produtoEncontrado) {
            processarBipProduto(produtoEncontrado)
          } else {
            alert(`Produto com código "${codigoFormatado}" não encontrado no estoque!`)
          }
          bufferLeitor.current = ''
        }
      } else if (e.key.length === 1) {
        bufferLeitor.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [estoqueCompleto, modoRemocao, modalAberto, calcAberto, carrinho])

  // ==========================================
  // 6. LÓGICA DA CALCULADORA
  // ==========================================
  const calcular = (expressao) => {
    try {
      const expressaoLimpa = expressao.replace(/[^-()\d/*+.]/g, '')
      if (!expressaoLimpa) return
      const resultado = new Function('return ' + expressaoLimpa)()
      setCalcDisplay(Number.isInteger(resultado) ? String(resultado) : resultado.toFixed(2))
    } catch (e) {
      setCalcDisplay('Erro')
    }
  }

  // ==========================================
  // 7. FINALIZAR A VENDA (MOTOR DE DEDUÇÃO PEPS)
  // ==========================================
  const finalizarCompra = async () => {
    if (metodo === 'dinheiro' && (valorRecebido === '' || parseFloat(valorRecebido) < total)) {
      alert("O valor recebido é menor que o total da compra!")
      return
    }

    setProcessandoVenda(true)

    try {
      const { data: vendaCadastrada, error: erroVenda } = await supabase
        .from('vendas')
        .insert([{ 
          total: total, 
          metodo_pagamento: metodo, 
          valor_recebido: metodo === 'dinheiro' ? parseFloat(valorRecebido) : total,
          troco: troco > 0 ? troco : 0,
          sessao_id: sessaoAtiva ? sessaoAtiva.id : null,
          loja_id: sessaoAtiva ? sessaoAtiva.loja_id : null
        }])
        .select()
        .single()

      if (erroVenda) throw erroVenda

      for (const item of carrinho) {
        let qtdRestanteParaBaixar = item.qtd

        const { data: lotes } = await supabase
          .from('estoque_lotes')
          .select('*')
          .eq('produto_id', item.id)
          .gt('quantidade_atual', 0)

        const lotesOrdenados = (lotes || []).sort((a, b) => {
          if (a.status === 'ativo' && b.status !== 'ativo') return -1;
          if (a.status !== 'ativo' && b.status === 'ativo') return 1;
          return new Date(a.criado_em) - new Date(b.criado_em);
        });

        for (const lote of lotesOrdenados) {
          if (qtdRestanteParaBaixar <= 0) break;

          const qtdDeducao = Math.min(qtdRestanteParaBaixar, lote.quantidade_atual)
          const novaQtdLote = lote.quantidade_atual - qtdDeducao
          const novoStatus = novaQtdLote === 0 ? 'esgotado' : 'ativo'

          await supabase.from('estoque_lotes')
            .update({ quantidade_atual: novaQtdLote, status: novoStatus })
            .eq('id', lote.id)

          await supabase.from('vendas_itens').insert([{
            venda_id: vendaCadastrada.id,
            produto_id: item.id,
            nome: item.nome,
            quantidade: qtdDeducao,
            preco_custo: lote.preco_custo, 
            preco_venda: item.preco_venda,
            loja_id: sessaoAtiva ? sessaoAtiva.loja_id : null
          }])

          qtdRestanteParaBaixar -= qtdDeducao
        }
      }

      alert("✅ Venda finalizada com sucesso!")
      setCarrinho([])
      setUltimoProduto(null)
      setModalAberto(false)
      setValorRecebido('')
      setMetodo('pix')
      carregarEstoque()

    } catch (error) {
      alert("Erro ao finalizar venda: " + error.message)
    } finally {
      setProcessandoVenda(false)
    }
  }

  return (
    <div className={`flex flex-col md:flex-row h-screen bg-gray-100 font-sans relative transition-all duration-300 ${modoRemocao ? 'ring-8 ring-red-500 inset-0' : ''}`}>
      
      {/* ALERTA DE MODO REMOÇÃO ATIVO */}
      {modoRemocao && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white font-bold py-2 px-4 text-center z-50 flex items-center justify-center gap-2 shadow-lg animate-pulse">
          <MinusCircle size={20} />
          <span>MODO REMOÇÃO ATIVO! O próximo bipe ou clique irá subtrair 1 unidade do carrinho. (Aperte ESPAÇO para cancelar)</span>
        </div>
      )}

      {/* =========================================
          LADO ESQUERDO: BUSCA E LISTA DE PRODUTOS
          ========================================= */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-full relative pt-2">
        
        {/* CABEÇALHO */}
        <header className="bg-white p-4 shadow-sm flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/caixa')} className="text-gray-500 hover:text-gray-800 font-bold px-3 py-2 bg-gray-100 rounded-lg">← Painel</button>
            <h1 className="text-xl font-bold text-blue-700">Caixa: {sessaoAtiva?.operador || 'Carregando...'}</h1>
          </div>
          
          <button 
            onClick={() => setCalcAberto(true)} 
            className="text-white font-bold px-5 py-2 bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            🧮 Calculadora
          </button>
        </header>

        {/* BARRA DE BUSCA E CÂMERA (Câmera visível apenas em Mobile) */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 z-20 relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Bipe o código ou digite o nome..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none text-lg shadow-inner"
              />
              <span className="absolute left-4 top-4 text-2xl">🔍</span>
            </div>
            
            {/* BOTÃO DA CÂMERA - APENAS EM CELULAR/TABLET */}
            {isMobile && (
              <button 
                onClick={() => setCameraAtiva(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl shadow-md flex items-center justify-center transition-transform active:scale-95"
                title="Ativar Modo Câmera"
              >
                <Camera size={24} />
              </button>
            )}
          </div>

          {resultadosBusca.length > 0 && (
            <div className="absolute left-4 right-4 top-[80px] bg-white border border-gray-200 shadow-2xl rounded-xl max-h-64 overflow-y-auto z-50">
              {resultadosBusca.map(p => (
                <button key={p.id} onClick={() => adicionarAoCarrinho(p)} className="w-full text-left p-4 hover:bg-blue-50 border-b border-gray-100 flex justify-between items-center transition-colors">
                  <div>
                    <div className="font-bold text-gray-800">{p.nome}</div>
                    <div className="text-sm text-gray-500">Estoque: {p.estoqueTotal} | Cód: {p.codigo_barras || 'N/A'}</div>
                  </div>
                  <div className="font-bold text-green-600">R$ {Number(p.preco_venda).toFixed(2)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LISTA DO CARRINHO */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10" onClick={() => setBusca('')}>
          {carrinho.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{item.nome}</h3>
                <p className="text-sm text-gray-500">R$ {Number(item.preco_venda).toFixed(2)} /unidade</p>
              </div>
              
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
          LADO DIREITO: ÚLTIMO PRODUTO + TOTAL + COBRAR
          ========================================= */}
      <div className="w-full md:w-96 bg-white shadow-2xl flex flex-col border-t-4 border-blue-500 md:border-t-0 md:border-l border-gray-200 h-auto md:h-full z-20">
        
        {/* CARD DO ÚLTIMO PRODUTO BIPADO */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Último Item Bipado</p>
          {ultimoProduto ? (
            <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in">
              <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                {ultimoProduto.imagem_url ? (
                  <img src={ultimoProduto.imagem_url} alt={ultimoProduto.nome} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag size={32} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 text-sm truncate">{ultimoProduto.nome}</h4>
                <p className="text-xs text-gray-400 mt-0.5">Cód: {ultimoProduto.codigo_barras || 'N/A'}</p>
                <p className="text-green-600 font-bold text-lg mt-1">R$ {Number(ultimoProduto.preco_venda).toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <div className="h-24 bg-white rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs font-medium">
              Aguardando bipagem...
            </div>
          )}
        </div>

        {/* VALORES DO SUBTOTAL E TOTAL */}
        <div className="p-6 flex-1 flex flex-col justify-center">
          <div className="flex justify-between text-gray-500 mb-2"><span>Subtotal</span><span>R$ {total.toFixed(2)}</span></div>
          <div className="flex justify-between items-end border-t border-dashed border-gray-300 pt-4 mt-2">
            <span className="text-xl font-bold text-gray-700">Total</span>
            <span className="text-4xl font-bold text-green-600">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* BOTÃO COBRAR */}
        <div className="p-6 bg-gray-50 border-t border-gray-100">
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
          LEITOR INTERATIVO TURBO (MOBILE)
          ========================================= */}
      {cameraAtiva && (
        <LeitorInterativo 
          catalogo={estoqueCompleto} 
          aoConfirmar={(produto) => adicionarAoCarrinho(produto)}
          aoFechar={() => setCameraAtiva(false)}
        />
      )}

      {/* =========================================
          MODALS DE COBRANÇA E CALCULADORA
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
                    key={tipo} onClick={() => { setMetodo(tipo); setValorRecebido(''); }}
                    className={`p-4 rounded-xl font-bold border-2 capitalize transition-all ${metodo === tipo ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {tipo === 'pix' ? '💠 Pix' : tipo === 'credito' ? '💳 Crédito' : tipo === 'debito' ? '💳 Débito' : '💵 Dinheiro'}
                  </button>
                ))}
              </div>
              {metodo === 'dinheiro' && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 animate-in slide-in-from-bottom-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Valor Recebido (R$)</label>
                  <input 
                    type="number" autoFocus value={valorRecebido} onChange={(e) => setValorRecebido(e.target.value)}
                    placeholder="Ex: 50.00"
                    className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-blue-500 text-xl text-center outline-none"
                  />
                  {valorRecebido && parseFloat(valorRecebido) >= total && (
                    <div className="mt-4 flex justify-between items-center bg-green-100 p-4 rounded-lg border border-green-200">
                      <span className="font-bold text-green-800">Troco a devolver:</span>
                      <span className="text-2xl font-bold text-green-700">R$ {troco.toFixed(2)}</span>
                    </div>
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

      {calcAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <header className="bg-gray-800 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">🧮 Calculadora</h2>
              <button onClick={() => setCalcAberto(false)} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
            </header>

            <div className="p-6">
               <div className="bg-gray-100 p-4 rounded-xl text-right text-3xl font-mono mb-6 overflow-x-auto text-gray-800 min-h-[72px] flex items-center justify-end border-2 border-gray-200 shadow-inner">
                  {calcDisplay || '0'}
               </div>
               
               <div className="grid grid-cols-2 gap-3 mb-4">
                 <button onClick={() => calcular(calcDisplay + '/2')} className="bg-purple-100 text-purple-700 font-bold py-3 rounded-xl hover:bg-purple-200 transition-colors shadow-sm">Dividir por 2</button>
                 <button onClick={() => calcular(calcDisplay + '/3')} className="bg-purple-100 text-purple-700 font-bold py-3 rounded-xl hover:bg-purple-200 transition-colors shadow-sm">Dividir por 3</button>
               </div>
               
               <div className="grid grid-cols-4 gap-3">
                  {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','.','+'].map(btn => (
                    <button 
                      key={btn} 
                      onClick={() => {
                        if(btn === 'C') setCalcDisplay('')
                        else setCalcDisplay(prev => prev === 'Erro' ? btn : prev + btn)
                      }} 
                      className={`p-4 rounded-xl font-bold text-xl transition-colors shadow-sm ${btn === 'C' ? 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200' : 'bg-gray-50 hover:bg-gray-200 text-gray-800 border border-gray-200'}`}
                    >
                      {btn}
                    </button>
                  ))}
                  <button onClick={() => calcular(calcDisplay)} className="col-span-4 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 mt-2 shadow-md text-xl">=</button>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}