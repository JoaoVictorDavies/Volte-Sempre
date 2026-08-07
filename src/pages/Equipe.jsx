import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Users, Plus, Trash2, ShieldAlert, User, X, CheckCircle } from 'lucide-react'

export default function Equipe() {
  const navigate = useNavigate()
  
  const [equipe, setEquipe] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [processando, setProcessando] = useState(false)

  // Form de novo membro
  const [novoMembro, setNovoMembro] = useState({
    nome: '',
    pin: '',
    cargo: 'funcionario'
  })

  useEffect(() => {
    carregarEquipe()
  }, [])

  const carregarEquipe = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .order('cargo', { ascending: true }) // Admins primeiro
        .order('nome', { ascending: true })

      if (error) throw error
      setEquipe(data || [])
    } catch (error) {
      console.error("Erro ao carregar equipe:", error)
    } finally {
      setCarregando(false)
    }
  }

  const handleSalvarMembro = async (e) => {
    e.preventDefault()
    
    if (!novoMembro.nome || !novoMembro.pin) {
      alert("Preencha o nome e o PIN.")
      return
    }

    if (novoMembro.pin.length < 4) {
      alert("O PIN deve ter pelo menos 4 dígitos.")
      return
    }

    setProcessando(true)
    try {
      // Pega o ID da loja (temporário até termos o login multi-tenant isolado)
      const { data: loja } = await supabase.from('lojas').select('id').limit(1).single()

      const { error } = await supabase.from('perfis').insert([{
        loja_id: loja.id,
        nome: novoMembro.nome,
        pin: novoMembro.pin,
        cargo: novoMembro.cargo
      }])

      if (error) {
        if (error.code === '23505') {
          throw new Error("Este PIN já está sendo usado por outro funcionário nesta loja.")
        }
        throw error
      }

      // Sucesso
      setModalAberto(false)
      setNovoMembro({ nome: '', pin: '', cargo: 'funcionario' })
      carregarEquipe()
      
    } catch (error) {
      alert("Erro ao adicionar membro: " + error.message)
    } finally {
      setProcessando(false)
    }
  }

  const handleExcluirMembro = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja excluir o acesso de ${nome}?`)) return

    try {
      const { error } = await supabase.from('perfis').delete().eq('id', id)
      if (error) throw error
      
      // Atualiza a tela localmente sem precisar recarregar o banco
      setEquipe(equipe.filter(membro => membro.id !== id))
    } catch (error) {
      alert("Erro ao excluir membro: " + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] px-4 py-12 animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto">

        {/* ==========================================
            CABEÇALHO
            ========================================== */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <button onClick={() => navigate('/admin-home')} className="text-indigo-600 font-bold mb-2 flex items-center gap-1 hover:underline focus:outline-none">
              ← Voltar ao Painel
            </button>
            <h1 className="text-3xl font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
              Gerenciar Equipe
            </h1>
            <p className="text-[#86868B] mt-1 text-sm">Controle de acessos e PINs do caixa.</p>
          </div>
          
          <button 
            onClick={() => setModalAberto(true)}
            className="bg-[#1D1D1F] hover:bg-black text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Plus size={18} /> Adicionar Membro
          </button>
        </header>

        {/* ==========================================
            LISTA DE EQUIPE
            ========================================== */}
        {carregando ? (
          <div className="text-center py-20 text-gray-500 font-bold animate-pulse">Carregando acessos...</div>
        ) : equipe.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Nenhum membro cadastrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipe.map(membro => (
              <div key={membro.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between group transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${membro.cargo === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {membro.nome.charAt(0).toUpperCase()}
                  </div>
                  <button 
                    onClick={() => handleExcluirMembro(membro.id, membro.nome)}
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Excluir acesso"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div>
                  <h3 className="font-bold text-[#1D1D1F] text-lg truncate">{membro.nome}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-md tracking-widest border border-gray-200">
                      PIN: {membro.pin}
                    </span>
                    {membro.cargo === 'admin' ? (
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-md flex items-center gap-1">
                        <ShieldAlert size={12} /> Admin
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1">
                        <User size={12} /> Vendedor
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ==========================================
          MODAL: NOVO MEMBRO
          ========================================== */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <header className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-[#1D1D1F] text-xl">Novo Acesso</h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-800 bg-white rounded-full p-1 shadow-sm border border-gray-200">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSalvarMembro} className="p-6 flex flex-col gap-5">
              
              <div>
                <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wide mb-1.5 ml-1">Nome do Funcionário</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Ex: Ana Silva"
                  value={novoMembro.nome}
                  onChange={e => setNovoMembro({...novoMembro, nome: e.target.value})}
                  className="w-full bg-[#F5F5F7] border border-transparent focus:border-indigo-500 focus:bg-white rounded-xl p-4 text-[#1D1D1F] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wide mb-1.5 ml-1">Senha (PIN)</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="Ex: 1234"
                  maxLength={6}
                  value={novoMembro.pin}
                  onChange={e => setNovoMembro({...novoMembro, pin: e.target.value.replace(/\D/g, '')})} // Força apenas números
                  className="w-full bg-[#F5F5F7] border border-transparent focus:border-indigo-500 focus:bg-white rounded-xl p-4 text-[#1D1D1F] outline-none transition-all font-mono tracking-widest text-lg"
                />
                <p className="text-xs text-gray-400 mt-1 ml-1">Apenas números (mínimo 4 dígitos).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wide mb-1.5 ml-1">Nível de Acesso</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setNovoMembro({...novoMembro, cargo: 'funcionario'})}
                    className={`p-3 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${novoMembro.cargo === 'funcionario' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-transparent bg-[#F5F5F7] text-gray-500 hover:bg-gray-200'}`}
                  >
                    Vendedor
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNovoMembro({...novoMembro, cargo: 'admin'})}
                    className={`p-3 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${novoMembro.cargo === 'admin' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-transparent bg-[#F5F5F7] text-gray-500 hover:bg-gray-200'}`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button 
                  type="submit" 
                  disabled={processando}
                  className={`w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all ${processando ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'}`}
                >
                  {processando ? 'Salvando...' : <><CheckCircle size={18} /> Cadastrar</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}