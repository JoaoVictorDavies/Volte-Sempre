import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Camera, MinusCircle, ShoppingBag, X, Receipt } from 'lucide-react'
import LeitorInterativo from '../components/LeitorInterativo'

export default function Pdv() {
  const navigate = useNavigate()
  
  // Estados do Estoque e Carrinho
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState([])
  const [estoqueCompleto, setEstoqueCompleto] = useState([])
  const [resultadosBusca, setResultadosBusca] = useState([])
  
  // Estados do PDV e Telas
  const [ultimoProduto, setUltimoProduto] = useState(null)
  const [modoRemocao, setModoRemocao] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Estados dos Modals, Pagamentos e Extrato
  const [modalAberto, setModalAberto] = useState(false)
  const [pagamentos, setPagamentos] = useState([]) 
  const [processandoVenda, setProcessandoVenda] = useState(false)
  const [sessaoAtiva, setSessaoAtiva] = useState(null)
  const [cameraAtiva, setCameraAtiva] = useState(false)
  
  // NOVO: Estados do Extrato (Comprovante)
  const [ultimaVenda, setUltimaVenda] = useState(null)
  const [modalExtratoAberto, setModalExtratoAberto] = useState(false)

  // ==========================================
  // REF: MÁGICA DE SINCRONIZAÇÃO EM TEMPO REAL
  // ==========================================
  const clientId = useRef(Math.random().toString(36).substring(7)) 
  const channelRef = useRef(null) 
  const bloquearBroadcast = useRef(false) 
  const carrinhoRef = useRef(carrinho) 
  const ultimoProdutoRef = useRef(ultimoProduto)

  const bufferLeitor = useRef('')
  const ultimoTempoDigitação = useRef(Date.now())

  // Cálculos Financeiros Base
  const total = carrinho.reduce((acc, item) => acc + (item.qtd * item.preco_venda), 0)
  const totalRecebido = pagamentos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0)
  const faltaPagar = Math.max(0, total - totalRecebido)
  const troco = Math.max(0, totalRecebido - total)

  useEffect(() => { carrinhoRef.current = carrinho }, [carrinho])
  useEffect(() => { ultimoProdutoRef.current = ultimoProduto }, [ultimoProduto])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // CORREÇÃO DA ROLAGEM MOUSE/TOUCHPAD EM INPUTS NUMÉRICOS
  useEffect(() => {
    const disableWheelOnNumberInputs = (e) => {
      if (document.activeElement.type === 'number') {
        e.preventDefault()
      }
    }
    document.addEventListener('wheel', disableWheelOnNumberInputs, { passive: false })
    return () => document.removeEventListener('wheel', disableWheelOnNumberInputs)
  }, [])

  // ==========================================
  // 1. VERIFICAÇÃO DE SESSÃO E INÍCIO DA TELEPATIA (REALTIME)
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

    const carrinhoSalvo = localStorage.getItem('volte_pdv_carrinho')
    if (carrinhoSalvo) try { setCarrinho(JSON.parse(carrinhoSalvo)) } catch (e) {}

    const ultimoProdutoSalvo = localStorage.getItem('volte_pdv_ultimo')
    if (ultimoProdutoSalvo) try { setUltimoProduto(JSON.parse(ultimoProdutoSalvo)) } catch (e) {}

    const myChannel = supabase.channel(`pdv_sync_${sessaoObjeto.id}`)

    myChannel.on('broadcast', { event: 'sync_cart' }, (payload) => {
      if (payload.payload.clientId !== clientId.current) {
        bloquearBroadcast.current = true 
        setCarrinho(payload.payload.carrinho)
        setUltimoProduto(payload.payload.ultimoProduto)
      }
    })

    myChannel.on('broadcast', { event: 'request_sync' }, (payload) => {
      if (payload.payload.clientId !== clientId.current && carrinhoRef.current.length > 0) {
        myChannel.send({
          type: 'broadcast',
          event: 'sync_cart',
          payload: { clientId: clientId.current, carrinho: carrinhoRef.current, ultimoProduto: ultimoProdutoRef.current }
        })
      }
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        myChannel.send({ type: 'broadcast', event: 'request_sync', payload: { clientId: clientId.current } })
      }
    })

    channelRef.current = myChannel
    return () => { supabase.removeChannel(myChannel) }
  }, [navigate])

  useEffect(() => {
    localStorage.setItem('volte_pdv_carrinho', JSON.stringify(carrinho))
    if (ultimoProduto) localStorage.setItem('volte_pdv_ultimo', JSON.stringify(ultimoProduto))
    else localStorage.removeItem('volte_pdv_ultimo')

    if (bloquearBroadcast.current) {
      bloquearBroadcast.current = false
      return
    }

    if (channelRef.current && channelRef.current.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync_cart',
        payload: { clientId: clientId.current, carrinho, ultimoProduto }
      }).catch(err => console.error("Erro no broadcast:", err))
    }
  }, [carrinho, ultimoProduto])

  useEffect(() => {
    if (ultimoProduto && !carrinho.find(item => item.id === ultimoProduto.id)) {
      setUltimoProduto(null)
    }
  }, [carrinho, ultimoProduto])

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

  const processarBipProduto = (produto, forcarRemocao = false) => {
    setUltimoProduto(produto)
    const estaEmModoRemocao = forcarRemocao || modoRemocao

    if (estaEmModoRemocao) {
      setCarrinho(prev => {
        const itemExistente = prev.find(item => item.id === produto.id)
        if (!itemExistente) return prev 
        if (itemExistente.qtd > 1) {
          return prev.map(item => item.id === produto.id ? { ...item, qtd: item.qtd - 1 } : item)
        } else {
          return prev.filter(item => item.id !== produto.id)
        }
      })
      setModoRemocao(false)
    } else {
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

  const adicionarAoCarrinho = (produto) => processarBipProduto(produto, false)

  const alterarQuantidade = (id, delta) => {
    setCarrinho(prev => prev.map(item => {
      if (item.id === id) {
        const novaQtd = item.qtd + delta
        if (novaQtd > 0 && novaQtd <= item.estoqueTotal) return { ...item, qtd: novaQtd }
      }
      return item
    }))
  }

  const removerDoCarrinho = (id) => setCarrinho(prev => prev.filter(item => item.id !== id))

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Modificado para não acionar se o modal do Extrato também estiver aberto
      if (modalAberto || modalExtratoAberto) return

      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault()
        setModoRemocao(prev => !prev)
        return
      }

      const agora = Date.now()
      if (agora - ultimoTempoDigitação.current > 100) bufferLeitor.current = '' 
      ultimoTempoDigitação.current = agora

      if (e.key === 'Enter') {
        const codigoFormatado = bufferLeitor.current.trim()
        if (codigoFormatado.length > 2) {
          e.preventDefault()
          const produtoEncontrado = estoqueCompleto.find(p => p.codigo_barras === codigoFormatado)
          if (produtoEncontrado) processarBipProduto(produtoEncontrado)
          else alert(`Produto com código "${codigoFormatado}" não encontrado no estoque!`)
          bufferLeitor.current = ''
        }
      } else if (e.key.length === 1) {
        bufferLeitor.current += e.key
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [estoqueCompleto, modoRemocao, modalAberto, modalExtratoAberto, carrinho])

  const adicionarPagamento = (tipo) => {
    if (faltaPagar <= 0) return 
    setPagamentos([...pagamentos, { id: Date.now(), metodo: tipo, valor: faltaPagar.toFixed(2) }])
  }

  const atualizarValorPagamento = (id, novoValor) => {
    setPagamentos(pagamentos.map(p => p.id === id ? { ...p, valor: novoValor } : p))
  }

  const removerPagamento = (id) => setPagamentos(pagamentos.filter(p => p.id !== id))
  const abrirModalPagamento = () => { setPagamentos([]); setModalAberto(true) }

  const finalizarCompra = async () => {
    if (totalRecebido < total) {
      alert("O valor recebido ainda não cobre o total da compra!")
      return
    }

    setProcessandoVenda(true)

    try {
      const nomesMetodos = pagamentos.map(p => p.metodo).join(', ')

      const { data: vendaCadastrada, error: erroVenda } = await supabase
        .from('vendas')
        .insert([{ 
          total: total, 
          metodo_pagamento: nomesMetodos, 
          valor_recebido: totalRecebido,
          troco: troco > 0 ? troco : 0,
          sessao_id: sessaoAtiva ? sessaoAtiva.id : null,
          loja_id: sessaoAtiva ? sessaoAtiva.loja_id : null
        }]).select().single()

      if (erroVenda) throw erroVenda

      for (const item of carrinho) {
        let qtdRestanteParaBaixar = item.qtd

        const { data: lotes } = await supabase.from('estoque_lotes')
          .select('*').eq('produto_id', item.id).gt('quantidade_atual', 0)

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

          await supabase.from('estoque_lotes').update({ quantidade_atual: novaQtdLote, status: novoStatus }).eq('id', lote.id)
          await supabase.from('vendas_itens').insert([{
            venda_id: vendaCadastrada.id, produto_id: item.id, nome: item.nome,
            quantidade: qtdDeducao, preco_custo: lote.preco_custo, 
            preco_venda: item.preco_venda, loja_id: sessaoAtiva ? sessaoAtiva.loja_id : null
          }])
          qtdRestanteParaBaixar -= qtdDeducao
        }
      }

      // SALVA O EXTRATO DA VENDA PARA O MODAL DE COMPROVANTE
      setUltimaVenda({
        id: vendaCadastrada.id,
        total: total,
        valor_recebido: totalRecebido,
        troco: troco > 0 ? troco : 0,
        metodo_pagamento: nomesMetodos,
        itens: [...carrinho],
        data: new Date()
      })

      alert("✅ Venda finalizada com sucesso!")
      
      setCarrinho([])
      setUltimoProduto(null)
      localStorage.removeItem('volte_pdv_carrinho')
      localStorage.removeItem('volte_pdv_ultimo')
      setModalAberto(false)
      carregarEstoque()

    } catch (error) {
      alert("Erro ao finalizar venda: " + error.message)
    } finally {
      setProcessandoVenda(false)
    }
  }

  return (
    <div className={`flex flex-col md:flex-row h-screen bg-gray-100 font-sans relative transition-all duration-300 ${modoRemocao ? 'ring-8 ring-red-500 inset-0' : ''}`}>
      
      {modoRemocao && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white font-bold py-2 px-4 text-center z-50 flex items-center justify-center gap-2 shadow-lg animate-pulse">
          <MinusCircle size={20} />
          <span>MODO REMOÇÃO ATIVO! O próximo bipe ou clique irá subtrair 1 unidade do carrinho. (Aperte ESPAÇO para cancelar)</span>
        </div>
      )}

      {/* LADO ESQUERDO */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-full relative pt-2">
        <header className="bg-white p-4 shadow-sm flex justify-between items-center z-10 overflow-x-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/caixa')} className="text-gray-500 hover:text-gray-800 font-bold px-3 py-2 bg-gray-100 rounded-lg shrink-0">← Painel</button>
            <h1 className="text-xl font-bold text-blue-700 whitespace-nowrap hidden sm:block">Caixa: {sessaoAtiva?.operador || '...'}</h1>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if(window.confirm("Deseja realmente cancelar toda a venda atual?")) { setCarrinho([]); setUltimoProduto(null); }
              }} 
              className="text-red-500 hover:text-red-700 font-bold px-3 py-2 hover:bg-red-50 rounded-lg transition-colors border border-red-200 text-sm shrink-0"
            >Limpar</button>
            
            {/* NOVO BOTÃO DE EXTRATO (SUBSTITUIU A CALCULADORA) */}
            <button 
              onClick={() => setModalExtratoAberto(true)} 
              disabled={!ultimaVenda}
              className={`font-bold px-3 py-2 rounded-lg shadow-md transition-colors text-sm shrink-0 flex items-center gap-2 ${ultimaVenda ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              title={!ultimaVenda ? "Nenhuma venda finalizada nesta sessão ainda" : "Ver comprovante da última venda"}
            >
              <Receipt size={18} /> Extrato
            </button>
          </div>
        </header>

        <div className="p-4 bg-gray-50 border-b border-gray-200 z-20 relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="text" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Bipe o código ou digite o nome..." className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none text-lg shadow-inner" />
              <span className="absolute left-4 top-4 text-2xl">🔍</span>
            </div>
            {isMobile && (
              <button onClick={() => setCameraAtiva(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl shadow-md flex items-center justify-center transition-transform active:scale-95">
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
                <button onClick={() => removerDoCarrinho(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <button onClick={() => alterarQuantidade(item.id, -1)} className="px-3 py-1 hover:bg-gray-200 font-bold text-gray-600">-</button>
                  <span className="px-4 py-1 font-bold bg-white">{item.qtd}</span>
                  <button onClick={() => alterarQuantidade(item.id, 1)} className="px-3 py-1 hover:bg-gray-200 font-bold text-gray-600">+</button>
                </div>
                <div className="font-bold text-lg text-gray-800 w-24 text-right">R$ {(item.qtd * item.preco_venda).toFixed(2)}</div>
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

      {/* LADO DIREITO */}
      <div className="w-full md:w-[450px] bg-white shadow-2xl flex flex-col border-t-4 border-blue-500 md:border-t-0 md:border-l border-gray-200 h-auto md:h-full z-20">
        
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Último Item Bipado</p>
          {ultimoProduto ? (
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in">
              <div className="w-32 h-32 md:w-36 md:h-36 bg-gray-50 rounded-2xl overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center shadow-inner">
                {ultimoProduto.imagem_url ? (
                  <img src={ultimoProduto.imagem_url} alt={ultimoProduto.nome} className="w-full h-full object-cover" />
                ) : <ShoppingBag size={48} className="text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0 text-center md:text-left flex flex-col justify-center h-full">
                <h4 className="font-extrabold text-gray-800 text-lg md:text-xl leading-tight mb-2">{ultimoProduto.nome}</h4>
                <p className="text-sm text-gray-400 mb-2 font-mono bg-gray-100 self-center md:self-start px-2 py-1 rounded">{ultimoProduto.codigo_barras || 'SEM CÓDIGO'}</p>
                <p className="text-green-600 font-black text-3xl mt-auto">R$ {Number(ultimoProduto.preco_venda).toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <div className="h-40 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 text-sm font-medium gap-3">
              <ShoppingBag size={32} className="opacity-50" /><span>Aguardando produto na esteira...</span>
            </div>
          )}
        </div>

        <div className="p-6 flex-1 flex flex-col justify-end">
          <div className="flex justify-between text-gray-500 mb-2 text-lg"><span>Subtotal</span><span>R$ {total.toFixed(2)}</span></div>
          <div className="flex justify-between items-end border-t border-dashed border-gray-300 pt-4 mt-2">
            <span className="text-2xl font-bold text-gray-700">Total</span>
            <span className="text-5xl font-black text-green-600">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <button disabled={carrinho.length === 0} onClick={abrirModalPagamento} className={`w-full text-white text-2xl font-bold py-6 rounded-2xl shadow-lg transition-transform ${carrinho.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 transform hover:scale-105'}`}>
            Cobrar
          </button>
        </div>
      </div>

      {cameraAtiva && <LeitorInterativo catalogo={estoqueCompleto} aoConfirmar={(produto) => adicionarAoCarrinho(produto)} aoFechar={() => setCameraAtiva(false)} />}

      {/* MODAL DE PAGAMENTO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <header className="bg-blue-600 p-5 text-white flex justify-between items-center shadow-md z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">🛒 Finalizar Venda</h2>
              <button onClick={() => setModalAberto(false)} className="text-blue-200 hover:text-white transition-colors"><X size={28} /></button>
            </header>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mb-6 flex flex-col gap-2">
                <div className="flex justify-between items-center text-gray-600"><span className="font-medium">Total da Compra</span><span className="font-bold text-lg">R$ {total.toFixed(2)}</span></div>
                <div className="flex justify-between items-center text-blue-600"><span className="font-medium">Total Recebido</span><span className="font-bold text-lg">R$ {totalRecebido.toFixed(2)}</span></div>
                <div className="h-px bg-gray-200 my-1"></div>
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${faltaPagar > 0 ? 'text-red-500' : 'text-green-500'}`}>{faltaPagar > 0 ? 'Falta Pagar' : 'Troco a Devolver'}</span>
                  <span className={`text-3xl font-black ${faltaPagar > 0 ? 'text-red-600' : 'text-green-600'}`}>R$ {faltaPagar > 0 ? faltaPagar.toFixed(2) : troco.toFixed(2)}</span>
                </div>
              </div>

              {faltaPagar > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Selecione o(s) Pagamento(s)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {['pix', 'credito', 'debito', 'dinheiro'].map(tipo => (
                      <button key={tipo} onClick={() => adicionarPagamento(tipo)} className="p-4 rounded-xl font-bold border-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                        {tipo === 'pix' ? '💠 Pix' : tipo === 'credito' ? '💳 Crédito' : tipo === 'debito' ? '💳 Débito' : '💵 Dinheiro'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pagamentos.length > 0 && (
                <div className="animate-in slide-in-from-bottom-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Valores Inseridos</h3>
                  <div className="space-y-3">
                    {pagamentos.map((pag, index) => (
                      <div key={pag.id} className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-blue-100 shadow-sm">
                        <div className="bg-blue-50 text-blue-700 font-bold px-3 py-2 rounded-lg text-sm w-24 text-center capitalize">{pag.metodo}</div>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                          <input 
                            type="number" 
                            autoFocus={index === pagamentos.length - 1} 
                            value={pag.valor} 
                            onChange={(e) => atualizarValorPagamento(pag.id, e.target.value)} 
                            onKeyDown={(e) => {
                              // Se o usuário apertar Setas pra Cima/Baixo, bloqueia a mudança do número também
                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault()
                            }}
                            className="w-full bg-gray-50 border border-gray-200 p-3 pl-10 rounded-xl font-bold text-lg text-gray-800 outline-none focus:bg-white focus:border-blue-400 transition-colors" 
                          />
                        </div>
                        <button onClick={() => removerPagamento(pag.id)} className="w-12 h-12 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><X size={24} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-200 flex gap-3 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
              <button onClick={() => setModalAberto(false)} className="px-6 py-4 font-bold text-gray-600 bg-white border border-gray-300 rounded-2xl hover:bg-gray-100 active:scale-95 transition-transform">Voltar</button>
              <button disabled={processandoVenda || faltaPagar > 0} onClick={finalizarCompra} className={`flex-1 py-4 font-bold text-white rounded-2xl shadow-xl transition-all ${processandoVenda || faltaPagar > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}>
                {processandoVenda ? 'Registrando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO MODAL DE EXTRATO / COMPROVANTE */}
      {modalExtratoAberto && ultimaVenda && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative font-mono text-gray-800">
            {/* Efeito de serra no topo do cupom */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gray-800 flex justify-around">
               {[...Array(20)].map((_, i) => <div key={i} className="w-2 h-2 bg-white rounded-full -mt-1"></div>)}
            </div>
            
            <header className="pt-8 pb-4 text-center border-b border-dashed border-gray-300 mx-6">
              <h2 className="text-xl font-black uppercase tracking-widest mb-1">Volte</h2>
              <h3 className="text-sm font-bold text-gray-500 uppercase">Comprovante de Venda</h3>
              <p className="text-xs text-gray-400 mt-2">{ultimaVenda.data.toLocaleDateString('pt-BR')} às {ultimaVenda.data.toLocaleTimeString('pt-BR')}</p>
            </header>
            
            <div className="p-6 overflow-y-auto max-h-[50vh] scrollbar-thin">
              <div className="space-y-3 mb-6">
                {ultimaVenda.itens.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm">
                    <span className="flex-1 pr-2 truncate">{item.qtd}x {item.nome}</span>
                    <span className="font-bold">R$ {(item.qtd * item.preco_venda).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-300 pt-4 space-y-2">
                <div className="flex justify-between font-black text-lg">
                  <span>TOTAL</span>
                  <span>R$ {ultimaVenda.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span className="uppercase">PAGO VIA {ultimaVenda.metodo_pagamento}</span>
                  <span>R$ {ultimaVenda.valor_recebido.toFixed(2)}</span>
                </div>
                {ultimaVenda.troco > 0 && (
                  <div className="flex justify-between text-sm font-bold text-gray-600 pt-2 border-t border-dashed border-gray-200">
                    <span>TROCO DEVOLVIDO</span>
                    <span>R$ {ultimaVenda.troco.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Efeito de serra no rodapé do cupom */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 relative">
               <button onClick={() => setModalExtratoAberto(false)} className="w-full bg-blue-600 text-white font-bold font-sans py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md">
                 Fechar Comprovante
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}