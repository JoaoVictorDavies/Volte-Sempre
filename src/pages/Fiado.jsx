import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { dispararNotificacao } from '../services/notificacoes' // Importando a notificação
import { useAuth } from '../context/useAuth'
import { 
  UserPlus, Search, DollarSign, PlusCircle, CreditCard, 
  ArrowLeft, Calendar, CheckCircle2, History, X, User, Edit3, Trash2, ShoppingBag, AlertCircle
} from 'lucide-react'

export default function Fiado() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  // Estados dos Dados
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [extratoContas, setExtratoContas] = useState([])
  const [extratoPagamentos, setExtratoPagamentos] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  // Modais
  const [modalCliente, setModalCliente] = useState({ aberto: false, modo: 'novo', dados: {} })
  const [modalNovoDebito, setModalNovoDebito] = useState(false)
  const [modalPagamento, setModalPagamento] = useState(false)
  const [modalVincularVenda, setModalVincularVenda] = useState(false)

  // Vendas do PDV
  const [vendasPdv, setVendasPdv] = useState([])
  const [carregandoVendas, setCarregandoVendas] = useState(false)

  // Formulários
  const [novoDebito, setNovoDebito] = useState({ valor_total: '', descricao: '', valor_pago_inicial: '' })
  const [novoPagamento, setNovoPagamento] = useState({ valor: '', metodo_pagamento: 'pix', observacao: '' })

  // ==========================================
  // 1. CARREGAR CLIENTES E SOMA DOS SALDOS
  // ==========================================
  const buscarClientes = useCallback(async () => {
    const { data: listaClientes, error: erroClientes } = await supabase
      .from('clientes')
      .select('*')
      .order('nome')
    if (erroClientes) throw erroClientes

    const { data: contas, error: erroContas } = await supabase
      .from('fiado_contas')
      .select('*')
      .neq('status', 'paga')
    if (erroContas) throw erroContas

    return (listaClientes || []).map((cliente) => {
      const contasDoCliente = (contas || []).filter(conta => conta.cliente_id === cliente.id)
      const saldoDevido = contasDoCliente.reduce(
        (total, conta) => total + (Number(conta.valor_total) - Number(conta.valor_pago)),
        0
      )
      return { ...cliente, saldoDevido }
    })
  }, [])

  const carregarClientes = useCallback(async () => {
    setCarregando(true)
    try {
      const clientesCarregados = await buscarClientes()
      setClientes(clientesCarregados)
      setClienteSelecionado((atual) => (
        atual ? clientesCarregados.find(cliente => cliente.id === atual.id) || atual : atual
      ))
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      alert('Erro ao carregar clientes: ' + error.message)
    } finally {
      setCarregando(false)
    }
  }, [buscarClientes])

  // ==========================================
  // 2. CARREGAR EXTRATO DA FICHA
  // ==========================================
  const buscarFichaCliente = useCallback(async (clienteId) => {
    const [resContas, resPagamentos] = await Promise.all([
      supabase.from('fiado_contas').select('*').eq('cliente_id', clienteId).order('criado_em', { ascending: false }),
      supabase.from('fiado_pagamentos').select('*').eq('cliente_id', clienteId).order('criado_em', { ascending: false })
    ])
    if (resContas.error) throw resContas.error
    if (resPagamentos.error) throw resPagamentos.error
    return {
      contas: resContas.data || [],
      pagamentos: resPagamentos.data || [],
    }
  }, [])

  const carregarFichaCliente = useCallback(async (clienteId) => {
    try {
      const ficha = await buscarFichaCliente(clienteId)
      setExtratoContas(ficha.contas)
      setExtratoPagamentos(ficha.pagamentos)
    } catch (error) {
      console.error('Erro ao carregar ficha do cliente:', error)
      alert('Erro ao carregar ficha: ' + error.message)
    }
  }, [buscarFichaCliente])

  useEffect(() => {
    let active = true
    buscarClientes()
      .then((clientesCarregados) => {
        if (!active) return
        setClientes(clientesCarregados)
        setClienteSelecionado((atual) => (
          atual ? clientesCarregados.find(cliente => cliente.id === atual.id) || atual : atual
        ))
      })
      .catch((error) => {
        console.error('Erro ao carregar clientes:', error)
      })
      .finally(() => {
        if (active) setCarregando(false)
      })
    return () => { active = false }
  }, [buscarClientes])

  useEffect(() => {
    if (!clienteSelecionado) return undefined
    let active = true
    buscarFichaCliente(clienteSelecionado.id)
      .then((ficha) => {
        if (!active) return
        setExtratoContas(ficha.contas)
        setExtratoPagamentos(ficha.pagamentos)
      })
      .catch((error) => {
        console.error('Erro ao carregar ficha do cliente:', error)
      })
    return () => { active = false }
  }, [buscarFichaCliente, clienteSelecionado])

  // ==========================================
  // 3. CRUD: SALVAR (NOVO/EDITAR) E EXCLUIR CLIENTE
  // ==========================================
  const salvarCliente = async () => {
    const dados = modalCliente.dados
    if (!dados.nome || dados.nome.trim() === '') return alert("Por favor, digite o nome do cliente.")

    try {
      const payload = {
        nome: dados.nome.trim(),
        telefone: dados.telefone || '',
        limite_credito: parseFloat(dados.limite_credito) || 0,
        observacoes: dados.observacoes || '',
        loja_id: profile.loja_id,
      }

      let dataCli;
      if (modalCliente.modo === 'novo') {
        const { data, error } = await supabase.from('clientes').insert([payload]).select().single()
        if (error) throw error
        dataCli = data
        alert("Cliente cadastrado com sucesso!")
      } else {
        const { data, error } = await supabase.from('clientes').update(payload).eq('id', dados.id).select().single()
        if (error) throw error
        dataCli = data
        alert("Ficha atualizada com sucesso!")
      }

      // CORREÇÃO: Limpa o estado corretamente e força atualização do cliente com saldo zerado temporário
      setModalCliente({ aberto: false, modo: 'novo', dados: {} })
      
      // Se for novo, garante que ele não dê erro de null pointer no saldoDevido
      const clienteAtualizadoSeguro = { ...dataCli, saldoDevido: dataCli.saldoDevido || 0 }
      
      setClienteSelecionado(clienteAtualizadoSeguro)
      await carregarClientes()

    } catch (err) {
      alert("Erro ao salvar cliente: " + err.message)
    }
  }

  const excluirCliente = async (cliente) => {
    if (cliente.saldoDevido > 0) {
      alert(`Não é possível excluir! O cliente possui uma dívida pendente de R$ ${cliente.saldoDevido.toFixed(2)}`)
      return
    }

    if (!window.confirm(`Tem certeza que deseja excluir a ficha de ${cliente.nome}?`)) return

    try {
      await supabase.from('clientes').delete().eq('id', cliente.id)
      alert("Ficha excluída com sucesso!")
      setClienteSelecionado(null)
      carregarClientes()
    } catch (err) {
      console.error("Erro ao excluir cliente:", err)
      alert("Erro ao excluir cliente: " + err.message)
    }
  }

  // ==========================================
  // 4. VINCULAR VENDA DO PDV (Apenas Fichas)
  // ==========================================
  const abrirModalVincular = async () => {
    setCarregandoVendas(true)
    setModalVincularVenda(true)
    try {
      // MODIFICAÇÃO: Busca apenas vendas que contém 'ficha' no método de pagamento
      const { data: vendas, error: errVendas } = await supabase
        .from('vendas')
        .select('id, total, criado_em, metodo_pagamento, vendas_itens(nome, quantidade)')
        .ilike('metodo_pagamento', '%ficha%') 
        .order('criado_em', { ascending: false })
        .limit(50)

      if (errVendas) throw errVendas

      // Busca quais vendas já foram vinculadas ao fiado (para não duplicar)
      const { data: jaVinculadas } = await supabase.from('fiado_contas').select('venda_id').not('venda_id', 'is', null)
      const idsVinculados = jaVinculadas.map(v => v.venda_id)

      // Filtra mostrando apenas vendas marcadas como ficha que AINDA NÃO FORAM vinculadas
      const disponiveis = (vendas || []).filter(v => !idsVinculados.includes(v.id))
      setVendasPdv(disponiveis)
    } catch (err) {
      console.error("Erro ao buscar vendas do PDV:", err)
      alert("Erro ao buscar vendas do PDV: " + err.message)
    } finally {
      setCarregandoVendas(false)
    }
  }

  const confirmarVinculoVenda = async (venda) => {
    if (!window.confirm(`Lançar esta compra de R$ ${venda.total.toFixed(2)} para ${clienteSelecionado.nome}?`)) return

    const itensDesc = venda.vendas_itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ')

    try {
      const { error: erroConta } = await supabase.from('fiado_contas').insert([{
        loja_id: profile.loja_id,
        usuario_id: user.id,
        cliente_id: clienteSelecionado.id,
        venda_id: venda.id,
        valor_total: venda.total,
        valor_pago: 0,
        status: 'aberta',
        descricao: `Ficha PDV: ${itensDesc}`
      }])
      if (erroConta) throw erroConta

      // Dispara a notificação de nova dívida
      await dispararNotificacao(
        "📝 Nova Ficha Vinculada!", 
        `Uma compra do caixa (R$ ${venda.total.toFixed(2)}) foi vinculada à ficha de ${clienteSelecionado.nome}.`
      ).catch(err => console.error("Erro notificação:", err))

      alert("Compra vinculada com sucesso!")
      setModalVincularVenda(false)
      carregarClientes()
      carregarFichaCliente(clienteSelecionado.id)
    } catch (err) {
      console.error("Erro ao vincular venda:", err)
      alert("Erro ao vincular venda: " + err.message)
    }
  }

  // ==========================================
  // 5. LANÇAR DÉBITO MANUAL
  // ==========================================
  const salvarDebitoManual = async () => {
    const valor = parseFloat(novoDebito.valor_total)
    if (!valor || valor <= 0) return alert("Informe um valor válido.")

    const entrada = parseFloat(novoDebito.valor_pago_inicial) || 0
    const statusInicial = entrada >= valor ? 'paga' : 'aberta'

    try {
      const { data: contaCriada, error: erroConta } = await supabase.from('fiado_contas').insert([{
        loja_id: profile.loja_id,
        usuario_id: user.id,
        cliente_id: clienteSelecionado.id,
        valor_total: valor,
        valor_pago: entrada,
        status: statusInicial,
        descricao: novoDebito.descricao || 'Compra manual sem descrição'
      }]).select().single()
      if (erroConta) throw erroConta

      if (entrada > 0) {
        const { error: erroPagamento } = await supabase.from('fiado_pagamentos').insert([{
          loja_id: profile.loja_id,
          usuario_id: user.id,
          cliente_id: clienteSelecionado.id,
          fiado_conta_id: contaCriada.id,
          valor: entrada,
          metodo_pagamento: 'dinheiro',
          observacao: 'Entrada na hora da compra'
        }])
        if (erroPagamento) throw erroPagamento
      }

      // Dispara a notificação
      await dispararNotificacao(
        "📝 Nova Dívida Adicionada", 
        `Uma compra de R$ ${valor.toFixed(2)} foi adicionada à ficha de ${clienteSelecionado.nome}.`
      ).catch(err => console.error("Erro notificação:", err))

      alert("Débito manual lançado!")
      setModalNovoDebito(false)
      setNovoDebito({ valor_total: '', descricao: '', valor_pago_inicial: '' })
      carregarClientes()
      carregarFichaCliente(clienteSelecionado.id)
    } catch (err) {
      console.error("Erro ao lançar débito:", err)
      alert("Erro ao lançar débito: " + err.message)
    }
  }

  // ==========================================
  // 6. REGISTRAR PAGAMENTO / ABATIMENTO
  // ==========================================
  const salvarPagamento = async () => {
    let valorAbater = parseFloat(novoPagamento.valor)
    if (!valorAbater || valorAbater <= 0) return alert("Informe um valor válido.")
    
    if (valorAbater > clienteSelecionado.saldoDevido) {
      alert(`Você não pode abater mais do que o cliente deve (Máx: R$ ${clienteSelecionado.saldoDevido.toFixed(2)})`)
      return
    }

    try {
      const { error: erroPagamento } = await supabase.from('fiado_pagamentos').insert([{
        loja_id: profile.loja_id,
        usuario_id: user.id,
        cliente_id: clienteSelecionado.id,
        valor: valorAbater,
        metodo_pagamento: novoPagamento.metodo_pagamento,
        observacao: novoPagamento.observacao || 'Abatimento de dívida'
      }])
      if (erroPagamento) throw erroPagamento

      // Abate em cascata
      const contasPendentes = extratoContas
        .filter(c => c.status !== 'paga')
        .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))

      for (const conta of contasPendentes) {
        if (valorAbater <= 0) break

        const saldoConta = Number(conta.valor_total) - Number(conta.valor_pago)
        const abatimento = Math.min(valorAbater, saldoConta)
        const novoValorPago = Number(conta.valor_pago) + abatimento
        const novoStatus = novoValorPago >= Number(conta.valor_total) ? 'paga' : 'aberta'

        const { error: erroAtualizacao } = await supabase.from('fiado_contas')
          .update({ valor_pago: novoValorPago, status: novoStatus, usuario_id: user.id })
          .eq('id', conta.id)
          .eq('loja_id', profile.loja_id)
        if (erroAtualizacao) throw erroAtualizacao

        valorAbater -= abatimento
      }

      // Notificação de Abatimento
      await dispararNotificacao(
        "💵 Pagamento Recebido!", 
        `${clienteSelecionado.nome} abateu R$ ${Number(novoPagamento.valor).toFixed(2)} da sua dívida.`
      ).catch(err => console.error("Erro notificação:", err))

      alert("Pagamento registrado com sucesso!")
      setModalPagamento(false)
      setNovoPagamento({ valor: '', metodo_pagamento: 'pix', observacao: '' })
      carregarClientes()
      carregarFichaCliente(clienteSelecionado.id)
    } catch (err) {
      console.error("Erro ao registrar pagamento:", err)
      alert("Erro ao registrar pagamento: " + err.message)
    }
  }

  // Filtros de busca e separação por devedores e em dia
  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (c.telefone && c.telefone.includes(busca))
  )

  const devedores = clientesFiltrados.filter(c => c.saldoDevido > 0).sort((a, b) => b.saldoDevido - a.saldoDevido)
  const emDia = clientesFiltrados.filter(c => c.saldoDevido <= 0).sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    /* CONTAINER PRINCIPAL CORRIGIDO: h-screen sem dividir no meio, overflow-hidden para travar a rolagem geral */
    <div className="flex h-screen bg-[#F5F5F7] font-sans overflow-hidden">
      
      {/* =========================================
          LADO ESQUERDO: LISTA DE CLIENTES
          NO MOBILE: Esconde se tiver cliente selecionado, vira tela cheia.
          ========================================= */}
      <div className={`bg-white border-r border-gray-200 flex-col h-full z-10 shadow-sm shrink-0 transition-all ${clienteSelecionado ? 'hidden md:flex md:w-[400px]' : 'flex w-full md:w-[400px]'}`}>
        <header className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/caixa')} className="p-2 text-gray-400 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-black text-gray-800 text-lg tracking-tight">Fiados</h1>
          </div>
          <button 
            onClick={() => setModalCliente({ aberto: true, modo: 'novo', dados: {} })}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-transform active:scale-95 shadow-md flex items-center justify-center"
          >
            <UserPlus size={20} />
          </button>
        </header>

        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={busca} 
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pb-20">
          
          {/* SEÇÃO DE DEVEDORES */}
          {devedores.length > 0 && (
            <div>
              <div className="bg-red-50 text-red-700 text-xs font-bold uppercase tracking-widest py-2 px-4 sticky top-0 flex items-center gap-2">
                <AlertCircle size={14} /> Em Aberto ({devedores.length})
              </div>
              {devedores.map(cli => (
                <button
                  key={cli.id}
                  onClick={() => setClienteSelecionado(cli)}
                  className={`w-full text-left p-4 hover:bg-blue-50 transition-colors flex justify-between items-center group ${clienteSelecionado?.id === cli.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}
                >
                  <div>
                    <h3 className="font-bold text-gray-800">{cli.nome}</h3>
                    <p className="text-xs text-gray-400 mt-1">{cli.telefone || 'Sem telefone'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black block text-red-600">
                      R$ {cli.saldoDevido.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider">
                      Pendente
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* SEÇÃO EM DIA */}
          {emDia.length > 0 && (
            <div>
              <div className="bg-green-50 text-green-700 text-xs font-bold uppercase tracking-widest py-2 px-4 sticky top-0 flex items-center gap-2 border-t border-gray-200">
                <CheckCircle2 size={14} /> Em Dia ({emDia.length})
              </div>
              {emDia.map(cli => (
                <button
                  key={cli.id}
                  onClick={() => setClienteSelecionado(cli)}
                  className={`w-full text-left p-4 hover:bg-blue-50 transition-colors flex justify-between items-center group ${clienteSelecionado?.id === cli.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}
                >
                  <div>
                    <h3 className="font-bold text-gray-800">{cli.nome}</h3>
                    <p className="text-xs text-gray-400 mt-1">{cli.telefone || 'Sem telefone'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black block text-green-600">
                      R$ 0.00
                    </span>
                    <span className="text-[10px] text-green-500 uppercase font-bold tracking-wider">
                      Limpo
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {clientesFiltrados.length === 0 && !carregando && (
            <div className="p-8 text-center text-gray-400 text-sm font-medium">Nenhum cliente encontrado.</div>
          )}
        </div>
      </div>

      {/* =========================================
          LADO DIREITO: FICHA DO DEVEDOR
          NO MOBILE: Esconde se NÃO tiver cliente selecionado. Vira tela cheia quando selecionado.
          ========================================= */}
      <div className={`flex-1 flex-col h-full overflow-y-auto bg-[#F5F5F7] relative w-full ${!clienteSelecionado ? 'hidden md:flex' : 'flex'}`}>
        {clienteSelecionado ? (
          <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 animate-in slide-in-from-right-4 pb-20">
            
            {/* CABEÇALHO DA FICHA */}
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-3 md:gap-5">
                
                {/* NOVO: Botão de voltar exclusivo para celular */}
                <button 
                  onClick={() => setClienteSelecionado(null)}
                  className="md:hidden p-3 text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors shrink-0"
                >
                  <ArrowLeft size={24} />
                </button>
                
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                  <User size={28} className="md:w-8 md:h-8" />
                </div>
                
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-gray-800 line-clamp-1">{clienteSelecionado.nome}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={() => setModalCliente({ aberto: true, modo: 'editar', dados: clienteSelecionado })} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <Edit3 size={14} /> Editar
                    </button>
                    <button onClick={() => excluirCliente(clienteSelecionado)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <Trash2 size={14} /> Excluir
                    </button>
                  </div>
                </div>
              </div>

              <div className={`${clienteSelecionado.saldoDevido > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'} border p-5 rounded-2xl w-full md:w-auto text-right shadow-inner`}>
                <span className={`text-xs font-bold uppercase tracking-widest block mb-1 ${clienteSelecionado.saldoDevido > 0 ? 'text-red-400' : 'text-green-500'}`}>
                  {clienteSelecionado.saldoDevido > 0 ? 'Dívida Total' : 'Tudo Certo'}
                </span>
                <span className={`text-3xl md:text-4xl font-black ${clienteSelecionado.saldoDevido > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  R$ {clienteSelecionado.saldoDevido.toFixed(2)}
                </span>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={abrirModalVincular}
                className="py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-transform active:scale-95 flex flex-col items-center justify-center gap-1"
              >
                <ShoppingBag size={24} /> <span>Puxar do PDV</span>
              </button>

              <button
                onClick={() => setModalNovoDebito(true)}
                className="py-4 bg-white border-2 border-red-100 hover:bg-red-50 text-red-600 font-bold rounded-2xl shadow-sm transition-transform active:scale-95 flex flex-col items-center justify-center gap-1"
              >
                <PlusCircle size={24} /> <span>Lançamento Manual</span>
              </button>

              <button
                disabled={clienteSelecionado.saldoDevido <= 0}
                onClick={() => setModalPagamento(true)}
                className={`py-4 font-bold text-white rounded-2xl shadow-lg transition-transform active:scale-95 flex flex-col items-center justify-center gap-1 ${clienteSelecionado.saldoDevido <= 0 ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-green-500 hover:bg-green-600 shadow-green-500/30'}`}
              >
                <DollarSign size={24} /> <span>Abater Dívida</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* TABELA DE COMPRAS */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <header className="p-5 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
                  <History size={18} className="text-blue-500" /> Extrato de Compras
                </header>
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {extratoContas.map(c => {
                    const saldoFalta = Number(c.valor_total) - Number(c.valor_pago)
                    return (
                      <div key={c.id} className="p-5 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${c.status === 'paga' ? 'bg-green-100 text-green-700' : Number(c.valor_pago) > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'}`}>
                            {c.status}
                          </span>
                          <span className="text-xs font-bold text-gray-400">
                            {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="font-bold text-gray-800 text-sm mb-3">{c.descricao}</p>
                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <div className="text-xs font-bold text-gray-500">Total: R$ {Number(c.valor_total).toFixed(2)}</div>
                          {saldoFalta > 0 ? (
                            <div className="text-sm font-black text-red-600">Falta: R$ {saldoFalta.toFixed(2)}</div>
                          ) : (
                            <div className="text-sm font-black text-green-600 flex items-center gap-1">
                              <CheckCircle2 size={16} /> Quitado
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {extratoContas.length === 0 && (
                    <div className="p-10 text-center text-gray-400 text-sm font-medium">Nenhum débito registrado.</div>
                  )}
                </div>
              </div>

              {/* HISTÓRICO DE PAGAMENTOS */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <header className="p-5 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
                  <CreditCard size={18} className="text-green-500" /> Pagamentos Realizados
                </header>
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {extratoPagamentos.map(p => (
                    <div key={p.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="font-bold text-gray-800 text-sm capitalize mb-1">Via {p.metodo_pagamento}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={12} /> {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                        </div>
                        {p.observacao && <p className="text-xs text-gray-500 mt-2 bg-white px-2 py-1 rounded border border-gray-100">{p.observacao}</p>}
                      </div>
                      <div className="font-black text-green-600 text-xl bg-green-50 px-3 py-1 rounded-xl">
                        + R$ {Number(p.valor).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  {extratoPagamentos.length === 0 && (
                    <div className="p-10 text-center text-gray-400 text-sm font-medium">Nenhum pagamento registrado.</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center animate-in fade-in">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 mb-6">
              <User size={40} className="text-gray-300" />
            </div>
            <h3 className="text-2xl font-black text-gray-600 mb-2">Selecione um Cliente</h3>
            <p className="text-gray-500 max-w-sm">Escolha uma ficha na lista ao lado para ver extratos, vincular compras do caixa ou abater dívidas.</p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAIS (Lógica inalterada, mesmo funcionamento)           */}
      {/* ========================================================= */}
      {modalCliente.aberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <header className="bg-gray-50 border-b p-5 flex justify-between items-center">
              <h3 className="font-black text-xl text-gray-800">{modalCliente.modo === 'novo' ? 'Novo Cliente' : 'Editar Ficha'}</h3>
              <button onClick={() => setModalCliente({ aberto: false, dados: {} })} className="text-gray-400 hover:text-gray-800 bg-gray-100 p-2 rounded-xl"><X size={20} /></button>
            </header>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nome Completo</label>
                <input type="text" autoFocus value={modalCliente.dados.nome || ''} onChange={e => setModalCliente(p => ({...p, dados: {...p.dados, nome: e.target.value}}))} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500" placeholder="Nome do cliente..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Telefone</label>
                  <input type="text" value={modalCliente.dados.telefone || ''} onChange={e => setModalCliente(p => ({...p, dados: {...p.dados, telefone: e.target.value}}))} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-medium outline-none focus:bg-white focus:border-blue-500" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Limite (R$)</label>
                  <input type="number" value={modalCliente.dados.limite_credito || ''} onChange={e => setModalCliente(p => ({...p, dados: {...p.dados, limite_credito: e.target.value}}))} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-black text-blue-600 outline-none focus:bg-white focus:border-blue-500" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Observações</label>
                <textarea value={modalCliente.dados.observacoes || ''} onChange={e => setModalCliente(p => ({...p, dados: {...p.dados, observacoes: e.target.value}}))} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-medium outline-none focus:bg-white focus:border-blue-500" rows={2} />
              </div>
              <button onClick={salvarCliente} className="w-full mt-4 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 active:scale-95 transition-transform shadow-lg shadow-blue-500/30">Salvar Cadastro</button>
            </div>
          </div>
        </div>
      )}

      {modalVincularVenda && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <header className="bg-blue-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-xl">Vincular Compra via Ficha</h3>
                <p className="text-blue-200 text-sm mt-1">Selecione a venda do PDV para lançar na ficha de {clienteSelecionado?.nome}</p>
              </div>
              <button onClick={() => setModalVincularVenda(false)} className="text-blue-200 hover:text-white bg-blue-700/50 p-2 rounded-xl"><X size={24} /></button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
              {carregandoVendas ? (
                <p className="text-center py-10 font-bold text-gray-400 animate-pulse">Buscando vendas na ficha no caixa...</p>
              ) : vendasPdv.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="font-bold text-lg">Nenhuma ficha pendente.</p>
                  <p className="text-sm">Não há vendas finalizadas como "Ficha" esperando vínculo.</p>
                </div>
              ) : (
                vendasPdv.map(v => (
                  <div key={v.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-blue-300 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-white bg-gray-400 px-2 py-1 rounded inline-block">
                          {new Date(v.criado_em).toLocaleTimeString('pt-BR')}
                        </span>
                        <span className="text-[10px] font-black text-orange-600 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded uppercase tracking-wider">
                          Venda Ficha
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-700 line-clamp-2">
                        {v.vendas_itens?.map(i => `${i.quantidade}x ${i.nome}`).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t border-dashed md:border-0 border-gray-200">
                      <span className="text-2xl font-black text-gray-800">R$ {v.total.toFixed(2)}</span>
                      <button onClick={() => confirmarVinculoVenda(v)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl active:scale-95 transition-transform shadow-md">
                        Vincular a {clienteSelecionado?.nome.split(' ')[0]}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {modalNovoDebito && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <header className="bg-red-50 border-b border-red-100 p-5 flex justify-between items-center">
              <h3 className="font-black text-xl text-red-600">Compra Avulsa</h3>
              <button onClick={() => setModalNovoDebito(false)} className="text-red-400 hover:text-red-600 bg-red-100 p-2 rounded-xl"><X size={20} /></button>
            </header>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Valor da Compra (R$) *</label>
                <input type="number" autoFocus value={novoDebito.valor_total} onChange={e => setNovoDebito({...novoDebito, valor_total: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-black text-2xl text-red-600 outline-none focus:bg-white focus:border-red-400" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Descrição da Compra</label>
                <textarea value={novoDebito.descricao} onChange={e => setNovoDebito({...novoDebito, descricao: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-medium outline-none focus:bg-white focus:border-red-400" placeholder="Ex: Cerveja, Carvão e Carne..." rows={2} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Entrada Inicial (R$)</label>
                <input type="number" value={novoDebito.valor_pago_inicial} onChange={e => setNovoDebito({...novoDebito, valor_pago_inicial: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-bold text-gray-700 outline-none focus:bg-white focus:border-red-400" placeholder="Se ele pagou algo na hora..." />
              </div>
              <button onClick={salvarDebitoManual} className="w-full mt-2 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg shadow-red-500/30 active:scale-95 transition-transform">Lançar Dívida</button>
            </div>
          </div>
        </div>
      )}

      {modalPagamento && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <header className="bg-green-50 border-b border-green-100 p-6 text-center relative">
              <button onClick={() => setModalPagamento(false)} className="absolute right-4 top-4 text-green-600 hover:text-green-800 bg-green-200/50 p-2 rounded-xl"><X size={20} /></button>
              <h3 className="font-black text-xl text-green-700 mb-1">Receber Pagamento</h3>
              <p className="text-sm font-bold text-gray-500">Dívida de R$ {clienteSelecionado?.saldoDevido.toFixed(2)}</p>
            </header>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Valor Recebido (R$) *</label>
                <input type="number" autoFocus value={novoPagamento.valor} onChange={e => setNovoPagamento({...novoPagamento, valor: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-black text-3xl text-center text-green-600 outline-none focus:bg-white focus:border-green-400" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setNovoPagamento({...novoPagamento, metodo_pagamento: 'dinheiro'})} className={`py-3 rounded-xl font-bold border-2 transition-colors ${novoPagamento.metodo_pagamento === 'dinheiro' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 bg-white'}`}>💵 Dinheiro</button>
                <button onClick={() => setNovoPagamento({...novoPagamento, metodo_pagamento: 'pix'})} className={`py-3 rounded-xl font-bold border-2 transition-colors ${novoPagamento.metodo_pagamento === 'pix' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 bg-white'}`}>💠 Pix</button>
                <button onClick={() => setNovoPagamento({...novoPagamento, metodo_pagamento: 'credito'})} className={`py-3 rounded-xl font-bold border-2 transition-colors ${novoPagamento.metodo_pagamento === 'credito' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 bg-white'}`}>💳 Crédito</button>
                <button onClick={() => setNovoPagamento({...novoPagamento, metodo_pagamento: 'debito'})} className={`py-3 rounded-xl font-bold border-2 transition-colors ${novoPagamento.metodo_pagamento === 'debito' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 bg-white'}`}>💳 Débito</button>
              </div>
              <button onClick={salvarPagamento} className="w-full mt-4 py-4 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 shadow-lg shadow-green-500/30 active:scale-95 transition-transform">Confirmar Abatimento</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}