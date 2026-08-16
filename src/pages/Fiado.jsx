import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { 
  Search, Plus, User, Edit3, Trash2, ArrowLeft, 
  DollarSign, FileText, CheckCircle, Clock, ShoppingBag
} from 'lucide-react'

export default function Fichas() {
  const navigate = useNavigate()

  // Estados Principais
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  // Estados de Ficha Aberta (Aba do Cliente)
  const [clienteAtivo, setClienteAtivo] = useState(null)
  const [transacoes, setTransacoes] = useState([])

  // Estados de Modais
  const [modalCliente, setModalCliente] = useState({ aberto: false, modo: 'novo', dados: {} })
  const [modalVendas, setModalVendas] = useState(false)
  const [modalPagamento, setModalPagamento] = useState(false)
  const [valorPagamento, setValorPagamento] = useState('')

  // Vendas do PDV
  const [vendasRecentes, setVendasRecentes] = useState([])

  // ==========================================
  // 1. CARREGAR CLIENTES E SALDOS
  // ==========================================
  const carregarClientes = async () => {
    setCarregando(true)
    try {
      const { data: clientesData, error: errCli } = await supabase
        .from('clientes')
        .select('*')
        .order('nome')

      const { data: transacoesData, error: errTrans } = await supabase
        .from('fiado_transacoes')
        .select('*')

      if (errCli || errTrans) throw new Error("Erro ao carregar dados")

      // Calcula o saldo de cada cliente
      const clientesComSaldo = clientesData.map(cliente => {
        const transDoCliente = transacoesData.filter(t => t.cliente_id === cliente.id)
        const totalDebitos = transDoCliente.filter(t => t.tipo === 'debito').reduce((acc, curr) => acc + Number(curr.valor), 0)
        const totalPagos = transDoCliente.filter(t => t.tipo === 'pagamento').reduce((acc, curr) => acc + Number(curr.valor), 0)
        return {
          ...cliente,
          saldoDevedor: totalDebitos - totalPagos
        }
      })

      setClientes(clientesComSaldo)
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar clientes.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  // ==========================================
  // 2. CRUD DE CLIENTES
  // ==========================================
  const salvarCliente = async () => {
    if (!modalCliente.dados.nome) return alert("O nome é obrigatório")

    try {
      const payload = {
        nome: modalCliente.dados.nome,
        telefone: modalCliente.dados.telefone || '',
        limite_credito: parseFloat(modalCliente.dados.limite_credito) || 0
      }

      if (modalCliente.modo === 'novo') {
        await supabase.from('clientes').insert([payload])
      } else {
        await supabase.from('clientes').update(payload).eq('id', modalCliente.dados.id)
      }
      
      setModalCliente({ aberto: false, modo: 'novo', dados: {} })
      carregarClientes()
      
      // Se estava com a ficha do cliente aberta, atualiza os dados visuais dele
      if (clienteAtivo && modalCliente.modo === 'editar') {
        setClienteAtivo({ ...clienteAtivo, ...payload })
      }
    } catch (error) {
      alert("Erro ao salvar cliente.")
    }
  }

  const excluirCliente = async (cliente) => {
    if (cliente.saldoDevedor > 0) {
      alert(`Não é possível excluir! O cliente possui uma dívida pendente de R$ ${cliente.saldoDevedor.toFixed(2)}`)
      return
    }

    if (!confirm(`Tem certeza que deseja excluir a ficha de ${cliente.nome}?`)) return

    try {
      await supabase.from('clientes').delete().eq('id', cliente.id)
      carregarClientes()
    } catch (error) {
      alert("Erro ao excluir cliente.")
    }
  }

  // ==========================================
  // 3. ABRIR FICHA DO CLIENTE
  // ==========================================
  const abrirFicha = async (cliente) => {
    setClienteAtivo(cliente)
    try {
      const { data } = await supabase
        .from('fiado_transacoes')
        .select('*, vendas(id)')
        .eq('cliente_id', cliente.id)
        .order('criado_em', { ascending: false })
      
      setTransacoes(data || [])
    } catch (error) {
      console.error(error)
    }
  }

  // ==========================================
  // 4. VINCULAR VENDA DO PDV AO FIADO
  // ==========================================
  const abrirModalVendas = async () => {
    setCarregando(true)
    setModalVendas(true)
    try {
      // Puxa as últimas 50 vendas e seus itens
      const { data: vendas, error: errVendas } = await supabase
        .from('vendas')
        .select('id, total, criado_em, vendas_itens(nome, quantidade)')
        .order('criado_em', { ascending: false })
        .limit(50)

      // Puxa transações já vinculadas para evitar duplicidade (Idempotência)
      const { data: transacoesFiado } = await supabase
        .from('fiado_transacoes')
        .select('venda_id')
        .not('venda_id', 'is', null)

      const vendasJaVinculadas = transacoesFiado.map(t => t.venda_id)

      // Filtra deixando apenas vendas que NÃO estão no fiado
      const vendasDisponiveis = vendas.filter(v => !vendasJaVinculadas.includes(v.id))
      setVendasRecentes(vendasDisponiveis)
    } catch (error) {
      alert("Erro ao carregar vendas recentes.")
    } finally {
      setCarregando(false)
    }
  }

  const confirmarVinculoVenda = async (venda) => {
    if (!confirm(`Deseja lançar a venda de R$ ${venda.total.toFixed(2)} na ficha de ${clienteAtivo.nome}?`)) return

    try {
      // Cria a descrição formatando os itens comprados
      const descItens = venda.vendas_itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ')

      await supabase.from('fiado_transacoes').insert([{
        cliente_id: clienteAtivo.id,
        venda_id: venda.id,
        tipo: 'debito',
        valor: venda.total,
        descricao: `Venda Vinculada: ${descItens}`
      }])

      alert("Débito lançado com sucesso!")
      setModalVendas(false)
      carregarClientes()
      abrirFicha(clienteAtivo) // Recarrega a ficha

    } catch (error) {
      alert("Erro ao vincular venda.")
    }
  }

  // ==========================================
  // 5. REGISTRAR PAGAMENTO
  // ==========================================
  const registrarPagamento = async () => {
    const valor = parseFloat(valorPagamento.replace(',', '.'))
    if (!valor || valor <= 0) return alert("Insira um valor válido.")

    try {
      await supabase.from('fiado_transacoes').insert([{
        cliente_id: clienteAtivo.id,
        tipo: 'pagamento',
        valor: valor,
        descricao: 'Pagamento Parcial/Total de Dívida'
      }])

      alert("Pagamento registrado com sucesso!")
      setValorPagamento('')
      setModalPagamento(false)
      
      // Atualiza os dados na tela
      carregarClientes()
      abrirFicha(clienteAtivo)
    } catch (error) {
      alert("Erro ao registrar pagamento.")
    }
  }

  // ==========================================
  // RENDERIZAÇÕES CONDICIONAIS
  // ==========================================

  // TELA DE FICHA ABERTA (Detalhes do Cliente)
  if (clienteAtivo) {
    const saldoAtual = transacoes.filter(t => t.tipo === 'debito').reduce((a, b) => a + Number(b.valor), 0) - 
                       transacoes.filter(t => t.tipo === 'pagamento').reduce((a, b) => a + Number(b.valor), 0)

    const limiteDisponivel = clienteAtivo.limite_credito - saldoAtual

    return (
      <div className="min-h-screen bg-[#F5F5F7] animate-in slide-in-from-right">
        {/* Cabeçalho da Ficha */}
        <header className="bg-white p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <button onClick={() => setClienteAtivo(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold bg-gray-100 px-4 py-2 rounded-xl transition-colors">
            <ArrowLeft size={20} /> Voltar
          </button>
          <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <User size={24} className="text-blue-500" /> Ficha de {clienteAtivo.nome}
          </h1>
          <div className="w-24"></div> {/* Espaçador */}
        </header>

        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Painel Financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-bold text-sm mb-1 uppercase tracking-wider">Saldo Devedor Atual</p>
              <h2 className={`text-4xl font-black ${saldoAtual > 0 ? 'text-red-500' : 'text-green-500'}`}>
                R$ {saldoAtual.toFixed(2)}
              </h2>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 font-bold">Limite de Crédito:</span>
                <span className="font-bold text-gray-800">R$ {clienteAtivo.limite_credito.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-dashed pt-2">
                <span className="text-gray-500 font-bold">Limite Disponível:</span>
                <span className={`font-bold ${limiteDisponivel < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                  R$ {limiteDisponivel.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4 mb-8">
            <button 
              onClick={abrirModalVendas}
              className="flex-1 bg-red-50 border-2 border-red-100 hover:bg-red-100 text-red-600 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <ShoppingBag size={24} /> Lançar Venda (Débito)
            </button>
            <button 
              onClick={() => setModalPagamento(true)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/30 active:scale-95"
            >
              <DollarSign size={24} /> Receber Pagamento
            </button>
          </div>

          {/* Histórico */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
              <Clock size={20} className="text-gray-400" /> Histórico de Movimentações
            </h3>

            {transacoes.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="space-y-4">
                {transacoes.map(t => (
                  <div key={t.id} className="flex flex-col md:flex-row justify-between md:items-center p-4 rounded-2xl border border-gray-100 bg-gray-50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${t.tipo === 'debito' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                          {t.tipo === 'debito' ? 'Compra' : 'Pagamento'}
                        </span>
                        <span className="text-gray-400 text-xs font-medium">
                          {new Date(t.criado_em).toLocaleDateString('pt-BR')} às {new Date(t.criado_em).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-gray-700 font-medium text-sm md:text-base pr-4">{t.descricao}</p>
                    </div>
                    <div className={`text-xl font-black shrink-0 mt-2 md:mt-0 ${t.tipo === 'debito' ? 'text-red-500' : 'text-green-600'}`}>
                      {t.tipo === 'debito' ? '-' : '+'} R$ {Number(t.valor).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* MODAL: SELECIONAR VENDA DO PDV PARA LANÇAR NO FIADO  */}
        {/* ==================================================== */}
        {modalVendas && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
              <header className="p-6 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-xl text-gray-800">Vincular Venda do PDV</h3>
                  <p className="text-gray-500 text-sm">Selecione uma venda recente para registrar como dívida.</p>
                </div>
                <button onClick={() => setModalVendas(false)} className="bg-gray-100 p-2 rounded-xl text-gray-500 hover:bg-gray-200"><X size={24} /></button>
              </header>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {carregando ? (
                  <p className="text-center text-gray-400 py-10 font-bold animate-pulse">Buscando vendas recentes...</p>
                ) : vendasRecentes.length === 0 ? (
                  <div className="text-center py-10">
                    <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Nenhuma venda recente disponível.<br/>Todas as vendas já foram vinculadas a clientes ou o caixa está vazio.</p>
                  </div>
                ) : (
                  vendasRecentes.map(v => (
                    <div key={v.id} className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            {new Date(v.criado_em).toLocaleTimeString('pt-BR')}
                          </span>
                          <span className="text-sm font-bold text-gray-600 truncate flex-1">
                            {v.vendas_itens?.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">Data: {new Date(v.criado_em).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <span className="text-xl font-black text-gray-800">R$ {v.total.toFixed(2)}</span>
                        <button 
                          onClick={() => confirmarVinculoVenda(v)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition-colors shrink-0 ml-auto"
                        >
                          Vincular
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: REGISTRAR PAGAMENTO (ABATER DÍVIDA)           */}
        {/* ==================================================== */}
        {modalPagamento && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
              <header className="p-6 border-b text-center">
                <h3 className="font-bold text-xl text-gray-800">Receber Pagamento</h3>
                <p className="text-gray-500 text-sm mt-1">Dívida Atual: <span className="font-bold text-red-500">R$ {saldoAtual.toFixed(2)}</span></p>
              </header>
              <div className="p-6">
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl">R$</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={valorPagamento}
                    onChange={(e) => setValorPagamento(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 text-2xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModalPagamento(false)} className="flex-1 py-4 bg-gray-100 font-bold text-gray-600 rounded-xl hover:bg-gray-200">Cancelar</button>
                  <button onClick={registrarPagamento} className="flex-1 py-4 bg-green-500 hover:bg-green-600 font-bold text-white rounded-xl shadow-lg shadow-green-500/30">Confirmar</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  // TELA INICIAL: LISTA DE CLIENTES E SALDOS
  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div>
            <button onClick={() => navigate('/caixa')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold mb-2 transition-colors">
              <ArrowLeft size={18} /> Voltar ao Caixa
            </button>
            <h1 className="text-3xl font-black text-[#1D1D1F] tracking-tight">Controle de Fiados</h1>
          </div>
          <button 
            onClick={() => setModalCliente({ aberto: true, modo: 'novo', dados: {} })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
          >
            <Plus size={20} /> Novo Cliente
          </button>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar cliente pelo nome..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl py-4 pl-12 pr-4 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {carregando ? (
          <p className="text-center text-gray-400 font-bold py-10 animate-pulse">Carregando carteira de clientes...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase())).map(cliente => (
              <div key={cliente.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-blue-200 transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                    <User size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModalCliente({ aberto: true, modo: 'editar', dados: cliente })} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Limite/Dados">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => excluirCliente(cliente)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors" title="Excluir Ficha">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-1 line-clamp-1">{cliente.nome}</h3>
                <p className="text-gray-500 text-sm mb-6">{cliente.telefone || 'Sem telefone'}</p>

                <div className="mt-auto pt-4 border-t border-dashed border-gray-200 flex justify-between items-end mb-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Dívida</p>
                    <p className={`text-xl font-black ${cliente.saldoDevedor > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      R$ {cliente.saldoDevedor.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Limite</p>
                    <p className="font-bold text-gray-700">R$ {cliente.limite_credito.toFixed(2)}</p>
                  </div>
                </div>

                <button 
                  onClick={() => abrirFicha(cliente)}
                  className="w-full bg-[#1D1D1F] hover:bg-black text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <FileText size={18} /> Abrir Ficha
                </button>
              </div>
            ))}

            {clientes.length === 0 && !carregando && (
              <div className="col-span-full text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-white">
                <User size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-bold text-gray-500">Nenhum cliente cadastrado no fiado.</p>
                <p className="text-sm">Clique em "Novo Cliente" para começar a gerenciar.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* MODAL: CRIAR / EDITAR CLIENTE DO FIADO               */}
      {/* ==================================================== */}
      {modalCliente.aberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <header className="p-6 border-b text-center bg-gray-50">
              <h3 className="font-bold text-xl text-gray-800">
                {modalCliente.modo === 'novo' ? 'Novo Cliente' : 'Editar Cliente'}
              </h3>
            </header>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Nome Completo</label>
                <input 
                  type="text" 
                  value={modalCliente.dados.nome || ''} 
                  onChange={e => setModalCliente(prev => ({...prev, dados: {...prev.dados, nome: e.target.value}}))}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Telefone (Opcional)</label>
                <input 
                  type="tel" 
                  value={modalCliente.dados.telefone || ''} 
                  onChange={e => setModalCliente(prev => ({...prev, dados: {...prev.dados, telefone: e.target.value}}))}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Limite de Crédito (R$)</label>
                <input 
                  type="number" 
                  value={modalCliente.dados.limite_credito || ''} 
                  onChange={e => setModalCliente(prev => ({...prev, dados: {...prev.dados, limite_credito: e.target.value}}))}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalCliente({ aberto: false, dados: {} })} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 rounded-xl">Cancelar</button>
                <button onClick={salvarCliente} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                  <CheckCircle size={20} /> Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}