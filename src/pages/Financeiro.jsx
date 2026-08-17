import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Wallet, Lock, Unlock, Clock, Calendar, TrendingUp, X, Receipt, ShoppingBag, Search, Filter, ArrowRight } from 'lucide-react'

export default function Financeiro() {
  const navigate = useNavigate()
  
  const [caixas, setCaixas] = useState({ abertos: [], fechados: [] })
  const [carregando, setCarregando] = useState(true)
  
  // Estados de Filtro
  const [filtroOperador, setFiltroOperador] = useState('')
  const [filtroData, setFiltroData] = useState('')
  
  // Estados do Modal "Raio-X do Caixa"
  const [caixaSelecionado, setCaixaSelecionado] = useState(null)
  const [detalhesCaixa, setDetalhesCaixa] = useState(null)
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false)

  // ==========================================
  // 1. CARREGAR TODOS OS CAIXAS
  // ==========================================
  useEffect(() => {
    carregarCaixas()
  }, [])

  const carregarCaixas = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('caixa_sessoes')
        .select('*')
        .order('aberto_em', { ascending: false })

      if (error) throw error

      const abertos = data.filter(c => c.status === 'aberto')
      const fechados = data.filter(c => c.status === 'fechado')

      setCaixas({ abertos, fechados })
    } catch (error) {
      console.error("Erro ao carregar caixas:", error)
    } finally {
      setCarregando(false)
    }
  }

  // ==========================================
  // 2. ABRIR CAIXINHA (BUSCAR EXTRATO)
  // ==========================================
  const abrirDetalhes = async (caixa) => {
    setCaixaSelecionado(caixa)
    setCarregandoDetalhes(true)
    
    try {
      const { data: vendas, error } = await supabase
        .from('vendas')
        .select('*, vendas_itens(*)')
        .eq('sessao_id', caixa.id)
        .order('criado_em', { ascending: false })

      if (error) throw error

      let totalDinheiro = 0, totalPix = 0, totalCartao = 0
      let faturamentoTotal = 0, custoTotal = 0

      const vendasProcessadas = vendas || []

      vendasProcessadas.forEach(venda => {
        faturamentoTotal += Number(venda.total)
        
        if (venda.metodo_pagamento === 'dinheiro') totalDinheiro += Number(venda.total)
        else if (venda.metodo_pagamento === 'pix') totalPix += Number(venda.total)
        else totalCartao += Number(venda.total)

        venda.vendas_itens.forEach(item => {
          custoTotal += (Number(item.preco_custo) * item.quantidade)
        })
      })

      const lucroBruto = faturamentoTotal - custoTotal

      setDetalhesCaixa({
        vendas: vendasProcessadas,
        resumo: { faturamentoTotal, custoTotal, lucroBruto, totalDinheiro, totalPix, totalCartao, qtdVendas: vendasProcessadas.length }
      })

    } catch (error) {
      alert("Erro ao buscar detalhes do caixa: " + error.message)
    } finally {
      setCarregandoDetalhes(false)
    }
  }

  // Formatação de data com Dia da Semana (Ex: Segunda-feira, 15/08/2026 às 14:30)
  const formatarDataComDia = (dataIso) => {
    if (!dataIso) return '--/--/----'
    const data = new Date(dataIso)
    
    const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'long' })
    const dataFormatada = data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    
    const diaCapitalized = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
    
    return `${diaCapitalized}, ${dataFormatada}`
  }

  // ==========================================
  // 3. LÓGICA DE FILTRAGEM DOS CAIXAS FECHADOS
  // ==========================================
  const doisDiasAtras = new Date()
  doisDiasAtras.setDate(doisDiasAtras.getDate() - 2)
  doisDiasAtras.setHours(0, 0, 0, 0)

  const caixasFechadosFiltrados = caixas.fechados.filter(caixa => {
    const dataAbertura = new Date(caixa.aberto_em)
    const matchOperador = caixa.operador?.toLowerCase().includes(filtroOperador.toLowerCase())
    const matchData = filtroData ? dataAbertura.toISOString().split('T')[0] === filtroData : true

    // Se o usuário estiver pesquisando ativamente, ignora a regra dos 2 dias
    if (filtroOperador || filtroData) {
      return matchOperador && matchData
    }

    // Por padrão (sem filtros), mostra apenas os últimos 2 dias para não poluir
    return dataAbertura >= doisDiasAtras
  })

  // ==========================================
  // COMPONENTES MENORES (UI)
  // ==========================================
  const CaixaCard = ({ caixa, tipo }) => {
    const isAberto = tipo === 'aberto'
    return (
      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => abrirDetalhes(caixa)}
        className="group w-full bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left flex flex-col justify-between h-full"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${isAberto ? 'bg-green-100 text-green-600 group-hover:bg-green-200' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                {isAberto ? <Unlock size={24} /> : <Lock size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-[#1D1D1F] text-lg leading-tight truncate">{caixa.operador}</h3>
                <p className="text-xs text-[#86868B] flex items-center gap-1 mt-0.5">
                  <Calendar size={12} /> Abertura: {formatarDataComDia(caixa.aberto_em)}
                </p>
              </div>
            </div>
            {isAberto && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Ativo
              </span>
            )}
          </div>
          
          <div className="bg-[#F5F5F7] p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2">
            <span className="text-[#86868B] font-medium flex items-center gap-1 shrink-0">
              <Clock size={14} /> Fechamento:
            </span>
            <span className="font-bold text-[#1D1D1F] text-right">
              {isAberto ? 'Em andamento...' : formatarDataComDia(caixa.fechado_em)}
            </span>
          </div>
        </div>

        {/* UX Melhorada: Call-to-action claro para ver o resumo */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-blue-600 font-medium text-sm transition-colors group-hover:text-blue-700">
          <span className="flex items-center gap-1.5">
            <Wallet size={16} /> Ver Resumo Financeiro
          </span>
          <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
        </div>
      </motion.button>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 animate-in fade-in duration-300 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* CABEÇALHO */}
        <header className="mb-10">
          <button onClick={() => navigate('/admin-home')} className="text-blue-600 font-bold mb-4 flex items-center gap-1 hover:underline focus:outline-none w-fit">
            <ArrowLeft size={16} /> Voltar ao Painel
          </button>
          <h1 className="text-3xl font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
            Extrato de Caixas
          </h1>
          <p className="text-[#86868B] mt-1 text-sm">Acompanhe as sessões de venda e resumos financeiros da sua loja.</p>
        </header>

        {carregando ? (
          <div className="text-center py-20 text-gray-500 font-bold animate-pulse">Buscando histórico financeiro...</div>
        ) : (
          <div className="space-y-12">
            
            {/* SEÇÃO 1: CAIXAS ABERTOS (Sempre visíveis) */}
            <section>
              <h2 className="text-sm font-bold text-[#86868B] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Unlock size={16} className="text-green-500" /> Caixas Operando Agora
              </h2>
              {caixas.abertos.length === 0 ? (
                <div className="bg-white/50 border border-dashed border-gray-300 rounded-2xl p-6 text-center text-gray-500 text-sm">
                  Nenhum caixa aberto neste momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {caixas.abertos.map(caixa => (
                    <CaixaCard key={caixa.id} caixa={caixa} tipo="aberto" />
                  ))}
                </div>
              )}
            </section>

            {/* SEÇÃO 2: HISTÓRICO DE FECHADOS COM FILTRO */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-sm font-bold text-[#86868B] uppercase tracking-widest flex items-center gap-2 shrink-0">
                  <Lock size={16} /> Histórico de Caixas Fechados
                </h2>

                {/* BARRA DE FILTROS */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Filtrar por funcionário..." 
                      value={filtroOperador}
                      onChange={(e) => setFiltroOperador(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                  </div>
                  <div className="relative flex-1 sm:w-48">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="date" 
                      value={filtroData}
                      onChange={(e) => setFiltroData(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                  </div>
                  {(filtroOperador || filtroData) && (
                    <button 
                      onClick={() => { setFiltroOperador(''); setFiltroData('') }}
                      className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium shrink-0"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {!filtroOperador && !filtroData && (
                <p className="text-xs text-gray-400 mb-4 bg-gray-100 w-fit px-3 py-1 rounded-full border border-gray-200">
                  Exibindo por padrão apenas os caixas dos últimos 2 dias. Use os filtros para ver anteriores.
                </p>
              )}

              {caixasFechadosFiltrados.length === 0 ? (
                <div className="bg-white/50 border border-dashed border-gray-300 rounded-2xl p-6 text-center text-gray-500 text-sm">
                  Nenhum caixa fechado encontrado com os filtros atuais.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {caixasFechadosFiltrados.map(caixa => (
                    <CaixaCard key={caixa.id} caixa={caixa} tipo="fechado" />
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </div>

      {/* ==========================================
          MODAL: A CAIXINHA ABERTA (RAIO-X)
          ========================================== */}
      <AnimatePresence>
        {caixaSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Fundo escuro clicável para fechar */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCaixaSelecionado(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* O Modal em si */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              
              {/* Header do Raio-X */}
              <header className="bg-gray-50 border-b border-gray-100 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-[#1D1D1F]">Raio-X do Caixa</h2>
                  <p className="text-sm text-[#86868B]">Operador: <span className="font-bold text-gray-700">{caixaSelecionado.operador}</span></p>
                </div>
                <button onClick={() => setCaixaSelecionado(null)} className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors">
                  <X size={20} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 bg-white">
                {carregandoDetalhes ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <div className="animate-spin mb-4"><Wallet size={32} /></div>
                    <p>Contando as moedas...</p>
                  </div>
                ) : detalhesCaixa && (
                  <div className="space-y-8">
                    
                    {/* BLOCO DE RESUMO FINANCEIRO (DRE DO CAIXA) */}
                    <div className="bg-[#1D1D1F] rounded-2xl p-6 text-white shadow-lg">
                      <div className="flex items-center gap-2 text-gray-400 text-sm font-bold uppercase tracking-widest mb-4">
                        <TrendingUp size={16} /> Resumo Financeiro
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Total Entradas</p>
                          <p className="font-bold text-xl">R$ {detalhesCaixa.resumo.faturamentoTotal.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Custo Produtos</p>
                          <p className="font-bold text-xl text-red-400">- R$ {detalhesCaixa.resumo.custoTotal.toFixed(2)}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-2 bg-white/10 rounded-xl p-3 border border-white/10">
                          <p className="text-gray-300 text-xs mb-1">Lucro Bruto Livre</p>
                          <p className="font-bold text-2xl text-green-400">R$ {detalhesCaixa.resumo.lucroBruto.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10 text-center">
                        <div className="bg-white/5 rounded-lg p-2">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Dinheiro</p>
                          <p className="font-bold text-sm">R$ {detalhesCaixa.resumo.totalDinheiro.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Pix</p>
                          <p className="font-bold text-sm">R$ {detalhesCaixa.resumo.totalPix.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Cartões</p>
                          <p className="font-bold text-sm">R$ {detalhesCaixa.resumo.totalCartao.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* BLOCO DE EXTRATO DE VENDAS */}
                    <div>
                      <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 border-b pb-2">
                        <Receipt size={18} className="text-blue-500" /> Extrato de Vendas ({detalhesCaixa.resumo.qtdVendas})
                      </h3>
                      
                      {detalhesCaixa.vendas.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">Nenhuma venda registrada neste caixa.</p>
                      ) : (
                        <div className="space-y-3">
                          {detalhesCaixa.vendas.map((venda) => (
                            <div key={venda.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-gray-500 font-mono bg-gray-200 px-2 py-1 rounded">
                                  {new Date(venda.criado_em).toLocaleTimeString('pt-BR')}
                                </span>
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    {venda.metodo_pagamento}
                                  </span>
                                  <span className="font-bold text-green-600">R$ {Number(venda.total).toFixed(2)}</span>
                                </div>
                              </div>
                              
                              {/* Itens da Venda */}
                              <div className="border-t border-dashed border-gray-200 pt-2 mt-2 space-y-1">
                                {venda.vendas_itens.map(item => (
                                  <div key={item.id} className="flex justify-between text-sm text-gray-600">
                                    <span className="flex items-center gap-1.5 truncate">
                                      <ShoppingBag size={12} className="text-gray-400 shrink-0" />
                                      {item.quantidade}x {item.nome}
                                    </span>
                                    <span className="shrink-0 text-gray-400 text-xs">
                                      Custo R$ {Number(item.preco_custo).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}