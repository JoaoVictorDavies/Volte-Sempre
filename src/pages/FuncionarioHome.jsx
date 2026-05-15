import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function FuncionarioHome() {
  const navigate = useNavigate()
  
  // Verifica se já tem uma sessão salva no navegador
  const [sessao, setSessao] = useState(() => {
    const salva = localStorage.getItem('volte_sessao_caixa')
    return salva ? JSON.parse(salva) : null
  })

  const [nomeOperador, setNomeOperador] = useState('')
  const [carregando, setCarregando] = useState(false)
  
  // Estado para o Modal de Fechamento
  const [resumoFechamento, setResumoFechamento] = useState(null)

  // 1. ABRIR O CAIXA
  const abrirCaixa = async (e) => {
    e.preventDefault()
    if (!nomeOperador.trim()) {
      alert("Por favor, digite seu nome para abrir o caixa.")
      return
    }

    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('caixa_sessoes')
        .insert([{ operador: nomeOperador }])
        .select()
        .single()

      if (error) throw error

      // Salva na memória do navegador
      localStorage.setItem('volte_sessao_caixa', JSON.stringify(data))
      setSessao(data)
      navigate('/pdv') // Já joga direto pro caixa
      
    } catch (error) {
      alert("Erro ao abrir caixa: " + error.message)
    } finally {
      setCarregando(false)
    }
  }

  // 2. FECHAR O CAIXA
  const fecharCaixa = async () => {
    if (!confirm("Tem certeza que deseja fechar o caixa agora?")) return
    
    setCarregando(true)
    try {
      // A. Puxa todas as vendas atreladas a essa sessão
      const { data: vendas, error: erroVendas } = await supabase
        .from('vendas')
        .select('total, metodo_pagamento')
        .eq('sessao_id', sessao.id)

      if (erroVendas) throw erroVendas

      // B. Calcula os totais que o operador vendeu
      const totalDinheiro = vendas.filter(v => v.metodo_pagamento === 'dinheiro').reduce((acc, v) => acc + Number(v.total), 0)
      const totalPix = vendas.filter(v => v.metodo_pagamento === 'pix').reduce((acc, v) => acc + Number(v.total), 0)
      const totalCartao = vendas.filter(v => ['credito', 'debito'].includes(v.metodo_pagamento)).reduce((acc, v) => acc + Number(v.total), 0)
      const totalGeral = totalDinheiro + totalPix + totalCartao

      // C. Atualiza o status da sessão no banco para 'fechado'
      await supabase
        .from('caixa_sessoes')
        .update({ status: 'fechado', fechado_em: new Date().toISOString() })
        .eq('id', sessao.id)

      // Exibe o resumo na tela
      setResumoFechamento({
        operador: sessao.operador,
        dinheiro: totalDinheiro,
        pix: totalPix,
        cartao: totalCartao,
        geral: totalGeral,
        qtdVendas: vendas.length
      })

      // Limpa a memória
      localStorage.removeItem('volte_sessao_caixa')
      setSessao(null)

    } catch (error) {
      alert("Erro ao fechar caixa: " + error.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-in fade-in">
      
      {/* SE O CAIXA ESTÁ FECHADO, PEDE O NOME */}
      {!sessao && !resumoFechamento && (
        <>
          <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Abertura de Caixa</h2>
          <p className="text-gray-500 mb-8 text-center">Identifique-se para começar a vender.</p>
          
          <form onSubmit={abrirCaixa} className="flex flex-col gap-4 w-full max-w-sm bg-white p-8 rounded-2xl shadow-md border border-gray-100">
            <label className="text-sm font-bold text-gray-700">Seu Nome:</label>
            <input 
              type="text" 
              placeholder="Ex: João, Viviane..." 
              value={nomeOperador}
              onChange={(e) => setNomeOperador(e.target.value)}
              className="border border-gray-300 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={carregando}
              className={`font-bold py-4 rounded-xl transition-colors mt-2 text-white shadow-sm ${carregando ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {carregando ? 'Abrindo...' : 'Abrir Caixa e Vender'}
            </button>
          </form>
        </>
      )}

      {/* SE O CAIXA ESTÁ ABERTO, MOSTRA OS BOTÕES DE AÇÃO */}
      {sessao && !resumoFechamento && (
        <div className="flex flex-col items-center w-full max-w-sm">
          <div className="bg-green-50 border-2 border-green-200 text-green-800 px-6 py-3 rounded-full font-bold mb-8 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            Caixa Aberto: {sessao.operador}
          </div>

          <div className="flex flex-col gap-4 w-full">
            <button 
              onClick={() => navigate('/pdv')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-2xl shadow-md transition-all text-xl"
            >
              🛒 Ir para o PDV
            </button>
            
            <button 
              onClick={fecharCaixa}
              disabled={carregando}
              className="bg-white hover:bg-red-50 border-2 border-red-100 text-red-600 font-bold py-4 rounded-2xl transition-all"
            >
              {carregando ? 'Processando...' : '🔒 Fechar Caixa do Dia'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL/TELA DE RESUMO APÓS FECHAR O CAIXA */}
      {resumoFechamento && (
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-in zoom-in">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔒</div>
            <h2 className="text-2xl font-bold text-gray-800">Caixa Fechado!</h2>
            <p className="text-gray-500">Resumo da sessão de {resumoFechamento.operador}</p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-600 border-b pb-2">
              <span>Vendas Realizadas</span>
              <span className="font-bold">{resumoFechamento.qtdVendas}</span>
            </div>
            <div className="flex justify-between text-gray-600 border-b pb-2">
              <span>Dinheiro</span>
              <span className="font-bold text-gray-800">R$ {resumoFechamento.dinheiro.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 border-b pb-2">
              <span>Pix</span>
              <span className="font-bold text-gray-800">R$ {resumoFechamento.pix.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 border-b pb-2">
              <span>Cartões</span>
              <span className="font-bold text-gray-800">R$ {resumoFechamento.cartao.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl pt-2">
              <span className="font-bold text-gray-800">Total</span>
              <span className="font-bold text-green-600">R$ {resumoFechamento.geral.toFixed(2)}</span>
            </div>
          </div>

          <button 
            onClick={() => { setResumoFechamento(null); navigate('/login') }}
            className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl hover:bg-black transition-colors"
          >
            Sair do Sistema
          </button>
        </div>
      )}

    </div>
  )
}