import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Lock, Unlock, LogOut, ShieldAlert, ArrowRight } from 'lucide-react'

export default function FuncionarioHome() {
  const navigate = useNavigate()
  
  const [pin, setPin] = useState('')
  const [carregando, setCarregando] = useState(false)
  
  const [usuario, setUsuario] = useState(null)
  const [sessaoAtiva, setSessaoAtiva] = useState(null)
  const [sessoesAdmin, setSessoesAdmin] = useState([])
  const [resumoFechamento, setResumoFechamento] = useState(null)

  // Limpa o localStorage preventivamente ao montar a tela
  useEffect(() => {
    localStorage.removeItem('volte_sessao_caixa')
  }, [])

  // ==========================================
  // 1. AUTENTICAÇÃO VIA PIN
  // ==========================================
  const acessarComPin = async (e) => {
    e.preventDefault()
    if (!pin.trim()) return

    setCarregando(true)
    try {
      // Busca o usuário pelo PIN
      const { data: user, error: userError } = await supabase
        .from('perfis')
        .select('*')
        .eq('pin', pin)
        .single()

      if (userError || !user) {
        throw new Error("PIN incorreto ou não encontrado.")
      }

      setUsuario(user)

      if (user.cargo === 'admin') {
        // Se for ADMIN: Busca todos os caixas abertos na loja
        const { data: sessoesAbertas } = await supabase
          .from('caixa_sessoes')
          .select('*, perfis(nome)')
          .eq('status', 'aberto')
        
        setSessoesAdmin(sessoesAbertas || [])
      } else {
        // Se for FUNCIONÁRIO: Busca se ELE tem um caixa aberto
        const { data: sessao } = await supabase
          .from('caixa_sessoes')
          .select('*')
          .eq('perfil_id', user.id)
          .eq('status', 'aberto')
          .single()

        if (sessao) {
          setSessaoAtiva(sessao)
          // Recupera pro localStorage para o PDV funcionar normalmente
          localStorage.setItem('volte_sessao_caixa', JSON.stringify(sessao))
        }
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setCarregando(false)
      setPin('')
    }
  }

  // ==========================================
  // 2. ABRIR NOVO CAIXA
  // ==========================================
  const abrirCaixa = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('caixa_sessoes')
        .insert([{ 
          operador: usuario.nome,
          perfil_id: usuario.id,
          loja_id: usuario.loja_id
        }])
        .select()
        .single()

      if (error) throw error

      localStorage.setItem('volte_sessao_caixa', JSON.stringify(data))
      navigate('/pdv') 
    } catch (error) {
      alert("Erro ao abrir caixa: " + error.message)
    } finally {
      setCarregando(false)
    }
  }

  // ==========================================
  // 3. FECHAR CAIXA (Funcionário ou Admin)
  // ==========================================
  const fecharCaixa = async (sessaoParaFechar) => {
    if (!confirm("Tem certeza que deseja encerrar este caixa?")) return
    
    setCarregando(true)
    try {
      // Puxa vendas desta sessão
      const { data: vendas } = await supabase
        .from('vendas')
        .select('total, metodo_pagamento')
        .eq('sessao_id', sessaoParaFechar.id)

      const vendasProcessadas = vendas || []
      
      const totalDinheiro = vendasProcessadas.filter(v => v.metodo_pagamento === 'dinheiro').reduce((acc, v) => acc + Number(v.total), 0)
      const totalPix = vendasProcessadas.filter(v => v.metodo_pagamento === 'pix').reduce((acc, v) => acc + Number(v.total), 0)
      const totalCartao = vendasProcessadas.filter(v => ['credito', 'debito'].includes(v.metodo_pagamento)).reduce((acc, v) => acc + Number(v.total), 0)
      const totalGeral = totalDinheiro + totalPix + totalCartao

      // Atualiza o banco
      await supabase
        .from('caixa_sessoes')
        .update({ status: 'fechado', fechado_em: new Date().toISOString() })
        .eq('id', sessaoParaFechar.id)

      // Exibe resumo apenas para o funcionário que fechou o próprio caixa
      if (usuario.cargo !== 'admin') {
        setResumoFechamento({
          operador: sessaoParaFechar.operador,
          dinheiro: totalDinheiro, pix: totalPix, cartao: totalCartao, geral: totalGeral, qtdVendas: vendasProcessadas.length
        })
        localStorage.removeItem('volte_sessao_caixa')
        setSessaoAtiva(null)
      } else {
        // Se for admin, atualiza a lista de caixas e avisa
        alert(`Caixa de ${sessaoParaFechar.operador} encerrado com sucesso.`)
        setSessoesAdmin(prev => prev.filter(s => s.id !== sessaoParaFechar.id))
      }

    } catch (error) {
      alert("Erro ao fechar caixa: " + error.message)
    } finally {
      setCarregando(false)
    }
  }

  // ==========================================
  // RENDERIZAÇÃO CONDICIONAL
  // ==========================================
  
  // TELA 1: FECHAMENTO CONCLUÍDO
  if (resumoFechamento) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-in zoom-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-gray-800" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Caixa Fechado!</h2>
            <p className="text-gray-500 mt-1">Sessão de {resumoFechamento.operador}</p>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex justify-between text-gray-600 border-b pb-2">
              <span>Vendas Feitas</span>
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
              <span className="font-bold text-gray-800">Total Geral</span>
              <span className="font-bold text-green-600">R$ {resumoFechamento.geral.toFixed(2)}</span>
            </div>
          </div>

          <button 
            onClick={() => { setResumoFechamento(null); setUsuario(null); }}
            className="w-full bg-[#1D1D1F] text-white font-bold py-4 rounded-xl hover:bg-black transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  // TELA 2: VISÃO DO ADMINISTRADOR (Painel de Controle)
  if (usuario && usuario.cargo === 'admin') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center py-20 px-4 animate-in fade-in">
        <div className="w-full max-w-xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Painel de Supervisão</h2>
              <p className="text-gray-500">Logado como: {usuario.nome}</p>
            </div>
            <button onClick={() => setUsuario(null)} className="text-gray-500 hover:text-red-500 font-bold p-3 bg-white rounded-xl shadow-sm">
              <LogOut size={20} />
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
              <ShieldAlert className="text-blue-500" size={20} />
              Caixas Abertos Neste Momento
            </h3>

            {sessoesAdmin.length === 0 ? (
              <p className="text-center text-gray-400 py-10 border-2 border-dashed rounded-xl">Nenhum caixa aberto no momento.</p>
            ) : (
              <div className="space-y-4">
                {sessoesAdmin.map(sessao => (
                  <div key={sessao.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                    <div>
                      <p className="font-bold text-gray-800">{sessao.operador}</p>
                      <p className="text-xs text-gray-500">Aberto em: {new Date(sessao.aberto_em).toLocaleString('pt-BR')}</p>
                    </div>
                    <button 
                      onClick={() => fecharCaixa(sessao)}
                      disabled={carregando}
                      className="text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                    >
                      Forçar Fechamento
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // TELA 3: VISÃO DO FUNCIONÁRIO (Logado)
  if (usuario && usuario.cargo !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 animate-in fade-in">
        <div className="w-full max-w-sm flex flex-col items-center">
          
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl font-bold">{usuario.nome.charAt(0)}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Olá, {usuario.nome}</h2>
          
          {sessaoAtiva ? (
            <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-2 rounded-full font-bold mb-8 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              Caixa Aberto
            </div>
          ) : (
            <p className="text-gray-500 mb-8">Nenhum caixa aberto no momento.</p>
          )}

          <div className="flex flex-col gap-4 w-full">
            {sessaoAtiva ? (
              <>
                <button onClick={() => navigate('/pdv')} className="bg-[#1D1D1F] hover:bg-black text-white font-bold py-5 rounded-2xl shadow-xl transition-all text-lg flex justify-center items-center gap-2">
                  <Unlock size={20}/> Retomar Vendas
                </button>
                <button onClick={() => fecharCaixa(sessaoAtiva)} disabled={carregando} className="bg-white hover:bg-red-50 border border-red-100 text-red-600 font-bold py-5 rounded-2xl transition-all">
                  {carregando ? 'Processando...' : 'Fechar Meu Caixa'}
                </button>
              </>
            ) : (
              <button onClick={abrirCaixa} disabled={carregando} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-xl transition-all text-lg">
                {carregando ? 'Abrindo...' : 'Abrir Novo Caixa'}
              </button>
            )}
            
            <button onClick={() => setUsuario(null)} className="text-gray-500 font-bold py-3 mt-4 hover:text-gray-800">
              Sair
            </button>
          </div>
        </div>
      </div>
    )
  }

  // TELA 4: LOGIN INICIAL (Input do PIN)
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#1D1D1F] tracking-tight mb-2">Ponto de Venda</h1>
          <p className="text-[#86868B]">Insira seu PIN para acessar.</p>
        </div>
        
        <form onSubmit={acessarComPin} className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
          <div className="relative mb-6">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="password" 
              placeholder="Ex: 1111" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border-2 border-gray-100 bg-gray-50 p-4 pl-12 rounded-2xl focus:outline-none focus:bg-white focus:border-blue-500 text-2xl font-mono tracking-widest text-center transition-all"
              autoFocus
            />
          </div>
          <button 
            type="submit" 
            disabled={carregando}
            className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl transition-all text-white shadow-md ${carregando ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02]'}`}
          >
            {carregando ? 'Verificando...' : <>Acessar <ArrowRight size={18}/></>}
          </button>
        </form>
      </div>
    </div>
  )
}