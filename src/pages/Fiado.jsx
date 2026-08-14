import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { 
  UserPlus, Search, DollarSign, PlusCircle, CreditCard, 
  ArrowLeft, Phone, Calendar, CheckCircle2, History, X, User 
} from 'lucide-react'

export default function Fiado() {
  const navigate = useNavigate()

  // Estados dos Dados
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [extratoContas, setExtratoContas] = useState([])
  const [extratoPagamentos, setExtratoPagamentos] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)

  // Modais
  const [modalNovoCliente, setModalNovoCliente] = useState(false)
  const [modalNovoDebito, setModalNovoDebito] = useState(false)
  const [modalPagamento, setModalPagamento] = useState(false)

  // Formulário Novo Cliente
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', limite_credito: '', observacoes: '' })

  // Formulário Novo Débito (Compra no Fiado)
  const [novoDebito, setNovoDebito] = useState({ valor_total: '', descricao: '', valor_pago_inicial: '' })

  // Formulário Novo Pagamento (Abatimento)
  const [novoPagamento, setNovoPagamento] = useState({ valor: '', metodo_pagamento: 'pix', observacao: '' })

  useEffect(() => {
    carregarClientes()
  }, [])

  useEffect(() => {
    if (clienteSelecionado) {
      carregarFichaCliente(clienteSelecionado.id)
    }
  }, [clienteSelecionado])

  // ==========================================
  // 1. CARREGAR CLIENTES E SOMA DOS SALDOS
  // ==========================================
  const carregarClientes = async () => {
    setCarregando(true)
    try {
      const { data: listaClientes, error: errC } = await supabase
        .from('clientes')
        .select('*')
        .order('nome')

      if (errC) throw errC

      const { data: contas, error: errConta } = await supabase
        .from('fiado_contas')
        .select('*')
        .neq('status', 'pago')

      if (errConta) throw errConta

      // Calcula o saldo devedor total de cada cliente
      const clientesComSaldo = (listaClientes || []).map(cli => {
        const contasDoCli = (contas || []).filter(c => c.cliente_id === cli.id)
        const saldoDevido = contasDoCli.reduce((acc, c) => acc + (Number(c.valor_total) - Number(c.valor_pago)), 0)
        return { ...cli, saldoDevido }
      })

      setClientes(clientesComSaldo)

      // Atualiza o cliente selecionado na tela se já houver um aberto
      if (clienteSelecionado) {
        const atualizado = clientesComSaldo.find(c => c.id === clienteSelecionado.id)
        if (atualizado) setClienteSelecionado(atualizado)
      }
    } catch (err) {
      console.error("Erro ao carregar clientes:", err)
    } finally {
      setCarregando(false)
    }
  }

  // ==========================================
  // 2. CARREGAR EXTRATO / FICHA DO DEVEDOR
  // ==========================================
  const carregarFichaCliente = async (clienteId) => {
    try {
      const [resContas, resPagamentos] = await Promise.all([
        supabase.from('fiado_contas').select('*').eq('cliente_id', clienteId).order('criado_em', { ascending: false }),
        supabase.from('fiado_pagamentos').select('*').eq('cliente_id', clienteId).order('criado_em', { ascending: false })
      ])

      setExtratoContas(resContas.data || [])
      setExtratoPagamentos(resPagamentos.data || [])
    } catch (err) {
      console.error("Erro ao carregar ficha do cliente:", err)
    }
  }

  // ==========================================
  // 3. CADASTRAR NOVO CLIENTE
  // ==========================================
  const salvarCliente = async () => {
    if (!novoCliente.nome.trim()) {
      alert("Por favor, digite o nome do cliente.")
      return
    }

    try {
      const { data, error } = await supabase.from('clientes').insert([{
        nome: novoCliente.nome,
        telefone: novoCliente.telefone,
        limite_credito: parseFloat(novoCliente.limite_credito) || 0,
        observacoes: novoCliente.observacoes
      }]).select().single()

      if (error) throw error

      alert("Cliente cadastrado com sucesso!")
      setModalNovoCliente(false)
      setNovoCliente({ nome: '', telefone: '', limite_credito: '', observacoes: '' })
      await carregarClientes()
      setClienteSelecionado(data)
    } catch (err) {
      alert("Erro ao cadastrar cliente: " + err.message)
    }
  }

  // ==========================================
  // 4. LANÇAR NOVO DÉBITO (COMPRA A PRAZO)
  // ==========================================
  const salvarDebito = async () => {
    const valor = parseFloat(novoDebito.valor_total)
    if (!valor || valor <= 0) {
      alert("Informe um valor válido para a compra.")
      return
    }

    const entrada = parseFloat(novoDebito.valor_pago_inicial) || 0
    const statusInicial = entrada >= valor ? 'pago' : entrada > 0 ? 'parcial' : 'pendente'

    try {
      const { data: contaCriada, error: errC } = await supabase.from('fiado_contas').insert([{
        cliente_id: clienteSelecionado.id,
        valor_total: valor,
        valor_pago: entrada,
        status: statusInicial,
        descricao: novoDebito.descricao || 'Compra sem descrição'
      }]).select().single()

      if (errC) throw errC

      // Se deu algum valor de entrada na hora da compra, lança no histórico de pagamentos
      if (entrada > 0) {
        await supabase.from('fiado_pagamentos').insert([{
          cliente_id: clienteSelecionado.id,
          fiado_conta_id: contaCriada.id,
          valor: entrada,
          metodo_pagamento: 'dinheiro',
          observacao: 'Entrada no momento da compra'
        }])
      }

      alert("Débito lançado na ficha do cliente!")
      setModalNovoDebito(false)
      setNovoDebito({ valor_total: '', descricao: '', valor_pago_inicial: '' })
      carregarClientes()
      carregarFichaCliente(clienteSelecionado.id)
    } catch (err) {
      alert("Erro ao lançar débito: " + err.message)
    }
  }

  // ==========================================
  // 5. REGISTRAR PAGAMENTO / ABATIMENTO
  // ==========================================
  const salvarPagamento = async () => {
    let valorAbater = parseFloat(novoPagamento.valor)
    if (!valorAbater || valorAbater <= 0) {
      alert("Informe um valor válido de pagamento.")
      return
    }

    try {
      // Registrar no histórico de pagamentos
      const { error: errP } = await supabase.from('fiado_pagamentos').insert([{
        cliente_id: clienteSelecionado.id,
        valor: valorAbater,
        metodo_pagamento: novoPagamento.metodo_pagamento,
        observacao: novoPagamento.observacao
      }])

      if (errP) throw errP

      // Abater das contas pendentes (da mais antiga para a mais recente)
      const contasPendentes = extratoContas
        .filter(c => c.status !== 'pago')
        .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))

      for (const conta of contasPendentes) {
        if (valorAbater <= 0) break

        const saldoConta = Number(conta.valor_total) - Number(conta.valor_pago)
        const abatimento = Math.min(valorAbater, saldoConta)
        const novoValorPago = Number(conta.valor_pago) + abatimento
        const novoStatus = novoValorPago >= Number(conta.valor_total) ? 'pago' : 'parcial'

        await supabase.from('fiado_contas')
          .update({ valor_pago: novoValorPago, status: novoStatus })
          .eq('id', conta.id)

        valorAbater -= abatimento
      }

      alert("Pagamento registrado com sucesso!")
      setModalPagamento(false)
      setNovoPagamento({ valor: '', metodo_pagamento: 'pix', observacao: '' })
      carregarClientes()
      carregarFichaCliente(clienteSelecionado.id)
    } catch (err) {
      alert("Erro ao registrar pagamento: " + err.message)
    }
  }

  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (c.telefone && c.telefone.includes(busca))
  )

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 font-sans">
      
      {/* =========================================
          LADO ESQUERDO: LISTA DE CLIENTES
          ========================================= */}
      <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col h-1/2 md:h-full">
        <header className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin-home')} className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-200">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-gray-800 text-lg">Fiado / Clientes</h1>
          </div>
          <button 
            onClick={() => setModalNovoCliente(true)}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm font-bold text-xs"
          >
            <UserPlus size={16} /> Novo
          </button>
        </header>

        {/* Busca */}
        <div className="p-3 bg-gray-50 border-b border-gray-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..." 
              value={busca} 
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Lista de Devedores */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {clientesFiltrados.map(cli => (
            <button
              key={cli.id}
              onClick={() => setClienteSelecionado(cli)}
              className={`w-full text-left p-4 hover:bg-blue-50 transition-colors flex justify-between items-center ${clienteSelecionado?.id === cli.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
            >
              <div>
                <h3 className="font-bold text-gray-800 text-base">{cli.nome}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone size={12} /> {cli.telefone || 'Sem telefone'}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-extrabold block ${cli.saldoDevido > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  R$ {cli.saldoDevido.toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-400 uppercase font-bold">
                  {cli.saldoDevido > 0 ? 'Devendo' : 'Em dia'}
                </span>
              </div>
            </button>
          ))}

          {clientesFiltrados.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">Nenhum cliente encontrado.</div>
          )}
        </div>
      </div>

      {/* =========================================
          LADO DIREITO: FICHA DO DEVEDOR (EXTRATO)
          ========================================= */}
      <div className="flex-1 bg-gray-50 flex flex-col h-1/2 md:h-full overflow-y-auto">
        {clienteSelecionado ? (
          <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
            
            {/* CABEÇALHO DO CLIENTE */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
                  <User size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800">{clienteSelecionado.nome}</h2>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <span>📞 {clienteSelecionado.telefone || 'Não informado'}</span>
                    {clienteSelecionado.limite_credito > 0 && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600 font-medium">
                        Limite: R$ {Number(clienteSelecionado.limite_credito).toFixed(2)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* CARD SALDO DEVEDOR */}
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl w-full md:w-auto text-right shrink-0">
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider block">Saldo Devedor Total</span>
                <span className="text-3xl font-black text-red-600">R$ {clienteSelecionado.saldoDevido.toFixed(2)}</span>
              </div>
            </div>

            {/* BOTOES DE AÇÃO */}
            <div className="flex gap-3">
              <button
                onClick={() => setModalNovoDebito(true)}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 text-base"
              >
                <PlusCircle size={20} /> Lançar Nova Compra (Débito)
              </button>

              <button
                disabled={clienteSelecionado.saldoDevido <= 0}
                onClick={() => setModalPagamento(true)}
                className={`flex-1 py-4 font-bold text-white rounded-2xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 text-base ${clienteSelecionado.saldoDevido <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                <DollarSign size={20} /> Registrar Pagamento / Abatimento
              </button>
            </div>

            {/* TABELA DE COMPRAS / DEBITOS */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <header className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-sm flex items-center gap-2">
                <History size={18} className="text-blue-600" /> Histórico de Compras no Fiado
              </header>

              <div className="divide-y divide-gray-100">
                {extratoContas.map(c => {
                  const saldoFalta = Number(c.valor_total) - Number(c.valor_pago)
                  return (
                    <div key={c.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${c.status === 'pago' ? 'bg-green-100 text-green-700' : c.status === 'parcial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'}`}>
                            {c.status}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar size={12} /> {new Date(c.criado_em).toLocaleDateString('pt-BR')} às {new Date(c.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-bold text-gray-800 text-sm">{c.descricao}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-700">Total: R$ {Number(c.valor_total).toFixed(2)}</div>
                        {saldoFalta > 0 ? (
                          <div className="text-xs font-bold text-red-600">Resta: R$ {saldoFalta.toFixed(2)}</div>
                        ) : (
                          <div className="text-xs font-bold text-green-600 flex items-center justify-end gap-1">
                            <CheckCircle2 size={12} /> Quitado
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {extratoContas.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">Nenhum débito registrado para este cliente.</div>
                )}
              </div>
            </div>

            {/* HISTÓRICO DE PAGAMENTOS / ABATIMENTOS */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <header className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-sm flex items-center gap-2">
                <CreditCard size={18} className="text-green-600" /> Histórico de Pagamentos Efetuados
              </header>

              <div className="divide-y divide-gray-100">
                {extratoPagamentos.map(p => (
                  <div key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-sm capitalize">Pagamento via {p.metodo_pagamento}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {p.observacao && <p className="text-xs text-gray-500 mt-0.5">{p.observacao}</p>}
                    </div>
                    <div className="font-black text-green-600 text-base">
                      + R$ {Number(p.valor).toFixed(2)}
                    </div>
                  </div>
                ))}

                {extratoPagamentos.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">Nenhum pagamento efetuado ainda.</div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <User size={64} className="mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-600 mb-1">Nenhum cliente selecionado</h3>
            <p className="text-sm max-w-sm">Selecione um cliente na lista ao lado para ver a ficha completa de devedor ou cadastre um novo cliente.</p>
          </div>
        )}
      </div>

      {/* =========================================
          MODAL: NOVO CLIENTE
          ========================================= */}
      {modalNovoCliente && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <header className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus size={20} /> Cadastrar Cliente</h3>
              <button onClick={() => setModalNovoCliente(false)} className="text-blue-200 hover:text-white"><X size={24} /></button>
            </header>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo *</label>
                <input type="text" value={novoCliente.nome} onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl font-medium outline-none focus:bg-white focus:border-blue-500" placeholder="Ex: Maria da Silva" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Telefone / WhatsApp</label>
                <input type="text" value={novoCliente.telefone} onChange={e => setNovoCliente({...novoCliente, telefone: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl font-medium outline-none focus:bg-white focus:border-blue-500" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Limite de Crédito (R$)</label>
                <input type="number" value={novoCliente.limite_credito} onChange={e => setNovoCliente({...novoCliente, limite_credito: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl font-medium outline-none focus:bg-white focus:border-blue-500" placeholder="0,00" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Observações</label>
                <textarea value={novoCliente.observacoes} onChange={e => setNovoCliente({...novoCliente, observacoes: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl font-medium outline-none focus:bg-white focus:border-blue-500" placeholder="Ex: Paga todo dia 10" rows={2} />
              </div>
              <button onClick={salvarCliente} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg">Salvar Cliente</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: NOVO DÉBITO (COMPRA A PRAZO)
          ========================================= */}
      {modalNovoDebito && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <header className="bg-red-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><PlusCircle size={20} /> Lançar Compra no Fiado</h3>
              <button onClick={() => setModalNovoDebito(false)} className="text-red-200 hover:text-white"><X size={24} /></button>
            </header>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Valor Total da Compra (R$) *</label>
                <input type="number" autoFocus value={novoDebito.valor_total} onChange={e => setNovoDebito({...novoDebito, valor_total: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl font-bold text-xl outline-none focus:bg-white focus:border-red-500 text-red-600" placeholder="0,00" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Resumo dos Itens</label>
                <textarea value={novoDebito.descricao} onChange={e => setNovoDebito({...novoDebito, descricao: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl font-medium outline-none focus:bg-white focus:border-red-500" placeholder="Ex: 2x Perfume Malbec, 1x Batom Eudora" rows={3} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Deu Algum Valor de Entrada? (R$)</label>
                <input type="number" value={novoDebito.valor_pago_inicial} onChange={e => setNovoDebito({...novoDebito, valor_pago_inicial: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl font-medium outline-none focus:bg-white focus:border-red-500" placeholder="0,00" />
              </div>
              <button onClick={salvarDebito} className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg">Confirmar Lançamento</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: REGISTRAR PAGAMENTO / ABATIMENTO
          ========================================= */}
      {modalPagamento && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <header className="bg-green-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><DollarSign size={20} /> Receber Pagamento</h3>
              <button onClick={() => setModalPagamento(false)} className="text-green-200 hover:text-white"><X size={24} /></button>
            </header>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Valor Pago pelo Cliente (R$) *</label>
                <input type="number" autoFocus value={novoPagamento.valor} onChange={e => setNovoPagamento({...novoPagamento, valor: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl font-bold text-2xl outline-none focus:bg-white focus:border-green-500 text-green-600" placeholder="0,00" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Forma de Pagamento</label>
                <select value={novoPagamento.metodo_pagamento} onChange={e => setNovoPagamento({...novoPagamento, metodo_pagamento: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl font-medium outline-none focus:bg-white focus:border-green-500">
                  <option value="pix">💠 Pix</option>
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="credito">💳 Cartão de Crédito</option>
                  <option value="debito">💳 Cartão de Débito</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Observação</label>
                <input type="text" value={novoPagamento.observacao} onChange={e => setNovoPagamento({...novoPagamento, observacao: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl font-medium outline-none focus:bg-white focus:border-green-500" placeholder="Ex: Abatimento referente à semana" />
              </div>
              <button onClick={salvarPagamento} className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 shadow-lg">Confirmar Recebimento</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}