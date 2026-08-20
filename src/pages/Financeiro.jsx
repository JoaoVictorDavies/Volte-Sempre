import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { dispararNotificacao } from '../services/notificacoes'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Wallet, Lock, Unlock, Clock, Calendar, 
  TrendingUp, X, Receipt, ShoppingBag, Search, Filter, 
  ArrowRight, Package, BarChart3, ChevronRight, AlertCircle, NotepadText
} from 'lucide-react'

export default function Financeiro() {
  const navigate = useNavigate()
  
  // Controle de Telas (Navegação interna)
  // 'main' | 'estoque' | 'mensal' | 'extratos'
  const [view, setView] = useState('main')

  // Estados Base
  const [caixas, setCaixas] = useState({ abertos: [], fechados: [] })
  const [carregando, setCarregando] = useState(true)
  
  // Estados do Modal "Raio-X do Caixa"
  const [caixaSelecionado, setCaixaSelecionado] = useState(null)
  const [detalhesCaixa, setDetalhesCaixa] = useState(null)
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false)

  // Estados dos Relatórios
  const [dadosEstoque, setDadosEstoque] = useState(null)
  const [dadosMensal, setDadosMensal] = useState(null)
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false)

  // Filtros de Extratos
  const [filtroOperador, setFiltroOperador] = useState('')
  const [filtroData, setFiltroData] = useState('')

  // Regra de Negócio: Dia 1
  const hoje = new Date()
  const isDiaUm = hoje.getDate() === 1

  // ==========================================
  // 1. CARGA INICIAL E NOTIFICAÇÃO DO DIA 1
  // ==========================================
  useEffect(() => {
    carregarCaixas()

    // Sistema automático de notificação no dia 1
    if (isDiaUm) {
      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
      const flagRelatorio = `relatorio_gerado_${hoje.getFullYear()}_${hoje.getMonth()}`
      
      if (!localStorage.getItem(flagRelatorio)) {
        dispararNotificacao(
          "📊 Fechamento Mensal Gerado!", 
          `O relatório financeiro de ${mesPassado.toUpperCase()} já está disponível no painel.`
        ).catch(err => console.error(err))
        
        localStorage.setItem(flagRelatorio, 'true')
      }
    }
  }, [])

  const carregarCaixas = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase.from('caixa_sessoes').select('*').order('aberto_em', { ascending: false })
      if (error) throw error

      setCaixas({ 
        abertos: data.filter(c => c.status === 'aberto'), 
        fechados: data.filter(c => c.status === 'fechado') 
      })
    } catch (error) {
      console.error("Erro ao carregar caixas:", error)
    } finally {
      setCarregando(false)
    }
  }

  // ==========================================
  // 2. LÓGICA DO RELATÓRIO DE ESTOQUE
  // ==========================================
  const abrirRelatorioEstoque = async () => {
    setView('estoque')
    setCarregandoRelatorio(true)
    try {
      const { data: produtos, error } = await supabase.from('produtos').select('preco_venda, estoque_lotes(quantidade_atual, preco_custo)')
      if (error) throw error

      let totalCusto = 0
      let totalVenda = 0

      produtos.forEach(prod => {
        (prod.estoque_lotes || []).forEach(lote => {
          if (lote.quantidade_atual > 0) {
            totalCusto += (lote.quantidade_atual * Number(lote.preco_custo))
            totalVenda += (lote.quantidade_atual * Number(prod.preco_venda))
          }
        })
      })

      setDadosEstoque({ custo: totalCusto, venda: totalVenda, lucro: totalVenda - totalCusto })
    } catch (err) {
      alert("Erro ao calcular estoque.")
    } finally {
      setCarregandoRelatorio(false)
    }
  }

  // ==========================================
  // 3. LÓGICA DO RELATÓRIO MENSAL (DIA 1)
  // ==========================================
  const abrirRelatorioMensal = async () => {
    if (!isDiaUm) return // Trava de segurança
    
    setView('mensal')
    setCarregandoRelatorio(true)
    try {
      // Busca dados do mês ANTERIOR
      const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59) // Último dia do mês passado
      const nomeMes = dataInicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

      const { data: vendas, error } = await supabase
        .from('vendas')
        .select('*')
        .gte('criado_em', dataInicio.toISOString())
        .lte('criado_em', dataFim.toISOString())

      if (error) throw error

      let totalFaturado = 0
      let totalFiado = 0

      ;(vendas || []).forEach(v => {
        const valorVenda = Number(v.total)
        totalFaturado += valorVenda
        // Se a string de pagamento contiver ficha, separamos o valor
        if (v.metodo_pagamento && v.metodo_pagamento.toLowerCase().includes('ficha')) {
          totalFiado += valorVenda
        }
      })

      setDadosMensal({
        mesNome: nomeMes,
        totalFaturado,
        totalRecebido: totalFaturado - totalFiado,
        totalFiado,
        qtdVendas: vendas?.length || 0
      })

    } catch (err) {
      alert("Erro ao gerar relatório mensal.")
    } finally {
      setCarregandoRelatorio(false)
    }
  }

  // ==========================================
  // 4. LÓGICA DO RAIO-X DO CAIXA
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

      let totalDinheiro = 0, totalPix = 0, totalCartao = 0, totalFiado = 0
      let faturamentoTotal = 0, custoTotal = 0

      const vendasProcessadas = vendas || []

      vendasProcessadas.forEach(venda => {
        faturamentoTotal += Number(venda.total)
        const metodos = venda.metodo_pagamento.toLowerCase()
        
        // Separação de valores simplificada (baseada nos métodos da venda)
        if (metodos.includes('dinheiro')) totalDinheiro += Number(venda.valor_recebido || venda.total)
        if (metodos.includes('pix')) totalPix += Number(venda.total)
        if (metodos.includes('credito') || metodos.includes('debito')) totalCartao += Number(venda.total)
        if (metodos.includes('ficha')) totalFiado += Number(venda.total)

        venda.vendas_itens.forEach(item => {
          custoTotal += (Number(item.preco_custo) * item.quantidade)
        })
      })

      setDetalhesCaixa({
        vendas: vendasProcessadas,
        resumo: { faturamentoTotal, custoTotal, lucroBruto: faturamentoTotal - custoTotal, totalDinheiro, totalPix, totalCartao, totalFiado, qtdVendas: vendasProcessadas.length }
      })

    } catch (error) {
      alert("Erro ao buscar detalhes do caixa.")
    } finally {
      setCarregandoDetalhes(false)
    }
  }

  // Helpers de formatação
  const formatarDataComDia = (dataIso) => {
    if (!dataIso) return '--/--/----'
    const data = new Date(dataIso)
    const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'long' })
    const dataFormatada = data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    return `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, ${dataFormatada}`
  }

  // Filtros de Extratos de Caixa
  const doisDiasAtras = new Date()
  doisDiasAtras.setDate(doisDiasAtras.getDate() - 2)
  doisDiasAtras.setHours(0, 0, 0, 0)

  const caixasFechadosFiltrados = caixas.fechados.filter(caixa => {
    const dataAbertura = new Date(caixa.aberto_em)
    const matchOperador = caixa.operador?.toLowerCase().includes(filtroOperador.toLowerCase())
    const matchData = filtroData ? dataAbertura.toISOString().split('T')[0] === filtroData : true

    if (filtroOperador || filtroData) return matchOperador && matchData
    return dataAbertura >= doisDiasAtras
  })

  // ==========================================
  // COMPONENTES REUTILIZÁVEIS
  // ==========================================
  const CaixaCard = ({ caixa, tipo }) => {
    const isAberto = tipo === 'aberto'
    return (
      <motion.button 
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={() => abrirDetalhes(caixa)}
        className="group w-full bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left flex flex-col justify-between h-full relative overflow-hidden"
      >
        {isAberto && <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>}
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-inner ${isAberto ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                {isAberto ? <Unlock size={24} /> : <Lock size={24} />}
              </div>
              <div>
                <h3 className="font-black text-gray-800 text-lg leading-tight truncate">{caixa.operador}</h3>
                <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 mt-1 tracking-wider">
                  <Calendar size={12} /> {formatarDataComDia(caixa.aberto_em).split(',')[0]}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-xl flex flex-col text-xs gap-1 border border-gray-100">
            <div className="flex justify-between items-center text-gray-500">
              <span className="font-bold uppercase">Abertura</span>
              <span>{new Date(caixa.aberto_em).toLocaleTimeString('pt-BR')}</span>
            </div>
            {!isAberto && (
              <div className="flex justify-between items-center text-gray-800 font-bold">
                <span className="uppercase">Fechamento</span>
                <span>{new Date(caixa.fechado_em).toLocaleTimeString('pt-BR')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-blue-600 font-bold text-sm transition-colors group-hover:text-blue-700">
          <span className="flex items-center gap-1.5"><Wallet size={16} /> Ver Resumo</span>
          <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
        </div>
      </motion.button>
    )
  }

  // ==========================================
  // RENDERIZAÇÃO DAS TELAS (VIEWS)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* VIEW 1: PAINEL PRINCIPAL */}
        <AnimatePresence mode="wait">
          {view === 'main' && (
            <motion.div key="main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              
              <header>
                <button onClick={() => navigate('/admin-home')} className="text-gray-400 hover:text-gray-800 font-bold mb-4 flex items-center gap-1 transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm w-fit border border-gray-200">
                  <ArrowLeft size={16} /> Voltar ao Painel
                </button>
                <h1 className="text-3xl font-black text-gray-800 tracking-tight">Financeiro</h1>
                <p className="text-gray-500 font-medium text-sm mt-1">Acompanhe seus caixas abertos, estoque e resumos de vendas.</p>
              </header>

              {carregando ? (
                <div className="text-center py-20 text-gray-400 font-bold animate-pulse">Carregando dados financeiros...</div>
              ) : (
                <>
                  {/* CAIXAS ABERTOS SEMPRE NO TOPO */}
                  <section>
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Unlock size={16} className="text-green-500" /> Caixas Operando Agora
                    </h2>
                    {caixas.abertos.length === 0 ? (
                      <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-400 text-sm font-bold shadow-sm">
                        Nenhum caixa aberto neste momento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {caixas.abertos.map(caixa => <CaixaCard key={caixa.id} caixa={caixa} tipo="aberto" />)}
                      </div>
                    )}
                  </section>

                  {/* BOTÕES DE AÇÃO (RELATÓRIOS E EXTRATOS) */}
                  <section className="space-y-4 pt-4 border-t border-gray-200">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Relatórios e Consultas</h2>
                    
                    {/* Botão: Estoque */}
                    <button onClick={abrirRelatorioEstoque} className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.99]">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-50 text-blue-600 p-4 rounded-xl shadow-inner group-hover:scale-110 transition-transform"><Package size={28}/></div>
                        <div className="text-left">
                          <h3 className="font-black text-gray-800 text-lg">Quantos reais eu tenho em estoque?</h3>
                          <p className="text-sm text-gray-500 font-medium">Veja o custo, o valor de venda e seu lucro presumido geral.</p>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" size={24} />
                    </button>

                    {/* Botão: Vendas do Mês (TRAVADO SE NÃO FOR DIA 1) */}
                    <button 
                      onClick={abrirRelatorioMensal} 
                      disabled={!isDiaUm}
                      className={`w-full p-5 rounded-2xl shadow-sm border transition-all flex items-center justify-between group ${isDiaUm ? 'bg-white border-gray-200 hover:border-green-400 hover:shadow-md active:scale-[0.99] cursor-pointer' : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-80'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`${isDiaUm ? 'bg-green-50 text-green-600 shadow-inner group-hover:scale-110' : 'bg-gray-200 text-gray-400'} p-4 rounded-xl transition-transform`}>
                          {isDiaUm ? <BarChart3 size={28}/> : <Lock size={28} />}
                        </div>
                        <div className="text-left">
                          <h3 className={`font-black text-lg ${isDiaUm ? 'text-gray-800' : 'text-gray-500'}`}>Quanto eu vendi nesse mês?</h3>
                          <p className="text-sm text-gray-500 font-medium">
                            {isDiaUm ? "Relatório mensal gerado! Clique para ver o fechamento do mês passado." : "Este relatório é gerado automaticamente e liberado apenas no dia 1º de cada mês."}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`${isDiaUm ? 'text-gray-300 group-hover:text-green-500' : 'text-gray-300'} transition-colors`} size={24} />
                    </button>

                    {/* Botão: Extrato de Caixas Fechados */}
                    <button onClick={() => setView('extratos')} className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.99]">
                      <div className="flex items-center gap-4">
                        <div className="bg-gray-100 text-gray-600 p-4 rounded-xl shadow-inner group-hover:scale-110 transition-transform"><ArchiveBoxIcon /></div>
                        <div className="text-left">
                          <h3 className="font-black text-gray-800 text-lg">Extrato de Caixas Fechados</h3>
                          <p className="text-sm text-gray-500 font-medium">Pesquise e visualize o histórico de caixas anteriores.</p>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-gray-600 transition-colors" size={24} />
                    </button>
                  </section>
                </>
              )}
            </motion.div>
          )}

          {/* VIEW 2: ESTOQUE */}
          {view === 'estoque' && (
            <motion.div key="estoque" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
              <header className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-4">
                <button onClick={() => setView('main')} className="bg-white p-2 rounded-xl shadow-sm hover:bg-gray-50 text-gray-600"><ArrowLeft size={24}/></button>
                <div>
                  <h1 className="text-2xl font-black text-gray-800">Capital em Estoque</h1>
                  <p className="text-gray-500 text-sm">Cálculo em tempo real baseado nos produtos ativos.</p>
                </div>
              </header>

              {carregandoRelatorio ? (
                 <div className="text-center py-20 text-gray-400 font-bold animate-pulse flex flex-col items-center gap-2"><Package size={40}/> Calculando inventário...</div>
              ) : dadosEstoque && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Valor de Custo (Imobilizado)</p>
                    <p className="text-4xl font-black text-red-500">R$ {dadosEstoque.custo.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-4">Quanto você pagou por tudo que está na loja.</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Valor Bruto de Venda</p>
                    <p className="text-4xl font-black text-blue-600">R$ {dadosEstoque.venda.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-4">Se vender todo o estoque hoje, este é o faturamento.</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 p-8 rounded-3xl shadow-xl text-center text-white transform md:-translate-y-4">
                    <p className="text-sm font-bold text-green-100 uppercase tracking-widest mb-2">Lucro Presumido Geral</p>
                    <p className="text-4xl font-black">R$ {dadosEstoque.lucro.toFixed(2)}</p>
                    <p className="text-xs text-green-200 mt-4">A diferença limpa entre a venda e o custo.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* VIEW 3: RELATÓRIO MENSAL */}
          {view === 'mensal' && (
            <motion.div key="mensal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
              <header className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-4">
                <button onClick={() => setView('main')} className="bg-white p-2 rounded-xl shadow-sm hover:bg-gray-50 text-gray-600"><ArrowLeft size={24}/></button>
                <div>
                  <h1 className="text-2xl font-black text-gray-800 capitalize">Fechamento: {dadosMensal?.mesNome}</h1>
                  <p className="text-gray-500 text-sm">Resumo de tudo que foi vendido no mês passado.</p>
                </div>
              </header>

              {carregandoRelatorio ? (
                 <div className="text-center py-20 text-gray-400 font-bold animate-pulse flex flex-col items-center gap-2"><BarChart3 size={40}/> Gerando relatório...</div>
              ) : dadosMensal && (
                <div className="max-w-3xl mx-auto space-y-6">
                  
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Faturamento Bruto do Mês</p>
                    <p className="text-5xl font-black text-gray-800">R$ {dadosMensal.totalFaturado.toFixed(2)}</p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-gray-50 text-gray-500 px-4 py-2 rounded-full text-sm font-bold border border-gray-200">
                      <Receipt size={16}/> Total de {dadosMensal.qtdVendas} vendas registradas
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 p-6 rounded-3xl border border-green-100 flex flex-col justify-center items-center text-center">
                       <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1 flex items-center gap-1"><Wallet size={14}/> Entrou no Caixa (Pagos)</p>
                       <p className="text-3xl font-black text-green-700">R$ {dadosMensal.totalRecebido.toFixed(2)}</p>
                       <p className="text-xs text-green-600/70 mt-2">Valor real gerado (Dinheiro, Pix, Cartões)</p>
                    </div>
                    
                    <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex flex-col justify-center items-center text-center relative overflow-hidden">
                       <div className="absolute top-0 w-full h-1 bg-orange-400"></div>
                       <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1 flex items-center gap-1"><NotepadText size={14}/> Vendido na Ficha (Fiado)</p>
                       <p className="text-3xl font-black text-orange-700">R$ {dadosMensal.totalFiado.toFixed(2)}</p>
                       <p className="text-xs text-orange-600/70 mt-2">Valor pendente aguardando recebimento</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 text-blue-700 text-sm font-medium">
                     <AlertCircle size={20} className="shrink-0 mt-0.5" />
                     <p>Este relatório é salvo automaticamente. O valor na Ficha representa compras que passaram pelo PDV marcadas como Fiado e devem ser cobradas posteriormente na aba respectiva.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* VIEW 4: EXTRATOS DE CAIXA FECHADOS */}
          {view === 'extratos' && (
            <motion.div key="extratos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
              <header className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('main')} className="bg-white p-2 rounded-xl shadow-sm hover:bg-gray-50 text-gray-600"><ArrowLeft size={24}/></button>
                  <div>
                    <h1 className="text-2xl font-black text-gray-800">Extratos Anteriores</h1>
                    <p className="text-gray-500 text-sm">Pesquise por caixas já fechados no sistema.</p>
                  </div>
                </div>
              </header>

              {/* FILTROS */}
              <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" placeholder="Buscar por nome do operador..." 
                    value={filtroOperador} onChange={(e) => setFiltroOperador(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:border-blue-500 outline-none font-bold text-gray-700"
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 focus:border-blue-500 outline-none font-bold uppercase"
                  />
                </div>
                {(filtroOperador || filtroData) && (
                  <button onClick={() => { setFiltroOperador(''); setFiltroData('') }} className="px-5 py-3 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors font-bold shrink-0 shadow-sm">
                    Limpar
                  </button>
                )}
              </div>

              {!filtroOperador && !filtroData && (
                <p className="text-xs text-gray-400 font-bold bg-gray-200/50 w-fit px-4 py-2 rounded-full border border-gray-200">
                  Por padrão, mostrando apenas caixas dos últimos 2 dias. Use os filtros acima para ver mais antigos.
                </p>
              )}

              {caixasFechadosFiltrados.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-400 text-sm font-bold shadow-sm">
                  Nenhum caixa fechado encontrado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                  {caixasFechadosFiltrados.map(caixa => <CaixaCard key={caixa.id} caixa={caixa} tipo="fechado" />)}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==========================================
          MODAL GLOBAL: RAIO-X DO CAIXA SELECIONADO
          ========================================== */}
      <AnimatePresence>
        {caixaSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCaixaSelecionado(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              
              <header className="bg-gray-50 border-b border-gray-200 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-gray-800">Raio-X do Caixa</h2>
                  <p className="text-sm text-gray-500 font-medium mt-1">Operador: <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{caixaSelecionado.operador}</span></p>
                </div>
                <button onClick={() => setCaixaSelecionado(null)} className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors shadow-sm"><X size={24} /></button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 bg-[#F5F5F7]">
                {carregandoDetalhes ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <div className="animate-spin mb-4"><Wallet size={32} /></div>
                    <p className="font-bold">Contando as moedas...</p>
                  </div>
                ) : detalhesCaixa && (
                  <div className="space-y-6">
                    
                    {/* DRE DO CAIXA */}
                    <div className="bg-[#1D1D1F] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                      
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">
                        <TrendingUp size={16} /> Resumo Financeiro da Sessão
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <div>
                          <p className="text-gray-400 text-xs font-bold mb-1 uppercase tracking-wider">Entradas</p>
                          <p className="font-black text-xl">R$ {detalhesCaixa.resumo.faturamentoTotal.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs font-bold mb-1 uppercase tracking-wider">Custos</p>
                          <p className="font-black text-xl text-red-400">- R$ {detalhesCaixa.resumo.custoTotal.toFixed(2)}</p>
                        </div>
                        <div className="col-span-2 bg-white/10 rounded-2xl p-4 border border-white/10 shadow-inner">
                          <p className="text-gray-300 text-xs font-bold mb-1 uppercase tracking-wider">Lucro Bruto Caixa</p>
                          <p className="font-black text-3xl text-green-400">R$ {detalhesCaixa.resumo.lucroBruto.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 pt-6 border-t border-white/10 text-center">
                        <div className="bg-white/5 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Dinheiro</p>
                          <p className="font-black text-sm text-white">R$ {detalhesCaixa.resumo.totalDinheiro.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Pix</p>
                          <p className="font-black text-sm text-white">R$ {detalhesCaixa.resumo.totalPix.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Cartões</p>
                          <p className="font-black text-sm text-white">R$ {detalhesCaixa.resumo.totalCartao.toFixed(2)}</p>
                        </div>
                        <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-3">
                          <p className="text-[10px] text-orange-300 font-bold uppercase tracking-wider mb-1">Fiado</p>
                          <p className="font-black text-sm text-orange-400">R$ {detalhesCaixa.resumo.totalFiado.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* EXTRATO DE VENDAS DESSE CAIXA */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                      <h3 className="font-black text-gray-800 flex items-center gap-2 mb-4">
                        <Receipt size={20} className="text-blue-500" /> Histórico de Vendas ({detalhesCaixa.resumo.qtdVendas})
                      </h3>
                      
                      {detalhesCaixa.vendas.length === 0 ? (
                        <p className="text-gray-400 text-sm font-bold text-center py-6 bg-gray-50 rounded-2xl">Nenhuma venda registrada.</p>
                      ) : (
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                          {detalhesCaixa.vendas.map((venda) => (
                            <div key={venda.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                              <div className="flex justify-between items-center mb-4">
                                <span className="text-xs text-gray-500 font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                                  {new Date(venda.criado_em).toLocaleTimeString('pt-BR')}
                                </span>
                                <div className="text-right">
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                    Pago via {venda.metodo_pagamento}
                                  </span>
                                  <span className="font-black text-lg text-gray-800">R$ {Number(venda.total).toFixed(2)}</span>
                                </div>
                              </div>
                              
                              <div className="border-t border-dashed border-gray-300 pt-3 space-y-2">
                                {venda.vendas_itens.map(item => (
                                  <div key={item.id} className="flex justify-between text-sm text-gray-600 font-medium">
                                    <span className="flex items-center gap-2 truncate">
                                      <ShoppingBag size={14} className="text-blue-400 shrink-0" />
                                      {item.quantidade}x {item.nome}
                                    </span>
                                    <span className="shrink-0 text-gray-400 text-xs font-bold bg-white px-2 py-0.5 rounded border border-gray-100">
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

// Icone Helper
function ArchiveBoxIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="8" x="2" y="3" rx="2" />
      <path d="M4 11v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9" />
      <path d="M10 8h4" />
    </svg>
  )
}