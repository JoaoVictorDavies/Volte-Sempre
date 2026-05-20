import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Layers, Tags, Plus, Trash2, Info, ChevronRight, Package } from 'lucide-react'

export default function OrganizacaoCatalogo() {
  const navigate = useNavigate()

  const [setores, setSetores] = useState([])
  const [setorSelecionado, setSetorSelecionado] = useState(null)
  const [marcas, setMarcas] = useState([])

  const [novoSetor, setNovoSetor] = useState('')
  const [novaMarca, setNovaMarca] = useState('')
  const [carregando, setCarregando] = useState(true)

  // ==========================================
  // 1. BUSCAR DADOS
  // ==========================================
  useEffect(() => {
    carregarSetores()
  }, [])

  useEffect(() => {
    if (setorSelecionado) {
      carregarMarcas(setorSelecionado.id)
    } else {
      setMarcas([])
    }
  }, [setorSelecionado])

  const carregarSetores = async () => {
    setCarregando(true)
    try {
      const { data, error } = await supabase.from('setores').select('*').order('nome')
      if (error) throw error
      setSetores(data || [])
      
      // Atualiza o setor selecionado caso o nome tenha mudado
      if (setorSelecionado) {
        const atualizado = data.find(s => s.id === setorSelecionado.id)
        if (!atualizado) setSetorSelecionado(null)
      }
    } catch (error) {
      console.error("Erro ao carregar setores:", error)
    } finally {
      setCarregando(false)
    }
  }

  const carregarMarcas = async (setorId) => {
    try {
      const { data, error } = await supabase.from('marcas').select('*').eq('setor_id', setorId).order('nome')
      if (error) throw error
      setMarcas(data || [])
    } catch (error) {
      console.error("Erro ao carregar marcas:", error)
    }
  }

  // ==========================================
  // 2. CRUD SETORES
  // ==========================================
  const adicionarSetor = async (e) => {
    e.preventDefault()
    if (!novoSetor.trim()) return

    try {
      const { data, error } = await supabase.from('setores').insert([{ nome: novoSetor.trim() }]).select().single()
      if (error) throw error
      
      setNovoSetor('')
      setSetores([...setores, data].sort((a, b) => a.nome.localeCompare(b.nome)))
      setSetorSelecionado(data) // Já seleciona para facilitar
    } catch (error) {
      alert("Erro ao adicionar setor: " + error.message)
    }
  }

  const excluirSetor = async (id, nome) => {
    if (!confirm(`ATENÇÃO! Excluir o setor "${nome}" apagará TODAS as marcas e produtos atrelados a ele. Confirma?`)) return
    
    try {
      const { error } = await supabase.from('setores').delete().eq('id', id)
      if (error) throw error
      
      if (setorSelecionado?.id === id) setSetorSelecionado(null)
      setSetores(setores.filter(s => s.id !== id))
    } catch (error) {
      alert("Erro ao excluir setor: " + error.message)
    }
  }

  // ==========================================
  // 3. CRUD MARCAS
  // ==========================================
  const adicionarMarca = async (e) => {
    e.preventDefault()
    if (!novaMarca.trim() || !setorSelecionado) return

    try {
      const { data, error } = await supabase.from('marcas').insert([{ 
        nome: novaMarca.trim(),
        setor_id: setorSelecionado.id
      }]).select().single()
      
      if (error) throw error
      
      setNovaMarca('')
      setMarcas([...marcas, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    } catch (error) {
      alert("Erro ao adicionar marca: " + error.message)
    }
  }

  const excluirMarca = async (id, nome) => {
    if (!confirm(`Excluir a marca "${nome}" apagará TODOS os produtos atrelados a ela. Confirma?`)) return
    
    try {
      const { error } = await supabase.from('marcas').delete().eq('id', id)
      if (error) throw error
      
      setMarcas(marcas.filter(m => m.id !== id))
    } catch (error) {
      alert("Erro ao excluir marca: " + error.message)
    }
  }

  // Define os exemplos dinâmicos pro diagrama (puxa o primeiro que achar, ou usa genérico)
  const exSetor = setores.length > 0 ? setores[0].nome : 'Alimentação'
  const exMarca = marcas.length > 0 ? marcas[0].nome : (setores.length > 0 ? 'Marca X' : 'Nestlé')

  return (
    <div className="min-h-screen bg-[#F5F5F7] px-4 py-10 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-10">
          <button onClick={() => navigate('/admin-home')} className="text-blue-600 font-bold mb-4 flex items-center gap-1 hover:underline focus:outline-none">
            <ArrowLeft size={16} /> Voltar ao Painel
          </button>
          <h1 className="text-3xl font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
            Estrutura do Catálogo
          </h1>
          <p className="text-[#86868B] mt-1 text-sm">Crie as categorias (Setores) e as linhas (Marcas) da sua loja.</p>
        </header>

        {/* ÁREA PRINCIPAL: DUAS COLUNAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          {/* COLUNA 1: SETORES */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-[500px]">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-[#1D1D1F]">1. Setores</h2>
                <p className="text-xs text-[#86868B]">A categoria geral do produto.</p>
              </div>
            </div>

            <form onSubmit={adicionarSetor} className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="Ex: Perfumaria, Infantil..."
                value={novoSetor}
                onChange={e => setNovoSetor(e.target.value)}
                className="flex-1 bg-[#F5F5F7] border border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
              />
              <button type="submit" disabled={!novoSetor.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl px-4 flex items-center justify-center transition-colors">
                <Plus size={20} />
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {carregando ? <p className="text-center text-sm text-gray-400 mt-10">Carregando...</p> : null}
              {setores.map(setor => (
                <div 
                  key={setor.id} 
                  onClick={() => setSetorSelecionado(setor)}
                  className={`group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border-2 ${setorSelecionado?.id === setor.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-100 hover:border-blue-200'}`}
                >
                  <span className={`font-bold ${setorSelecionado?.id === setor.id ? 'text-blue-700' : 'text-gray-700'}`}>
                    {setor.nome}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); excluirSetor(setor.id, setor.nome); }}
                      className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className={setorSelecionado?.id === setor.id ? 'text-blue-500' : 'text-gray-300'} />
                  </div>
                </div>
              ))}
              {!carregando && setores.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-xl text-gray-400 text-sm">Nenhum setor criado.</div>
              )}
            </div>
          </div>

          {/* COLUNA 2: MARCAS */}
          <div className={`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-[500px] transition-opacity duration-300 ${!setorSelecionado ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Tags size={20} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-[#1D1D1F]">2. Marcas</h2>
                <p className="text-xs text-[#86868B]">
                  {setorSelecionado ? `Pertencentes a: ${setorSelecionado.nome}` : 'Selecione um setor primeiro.'}
                </p>
              </div>
            </div>

            <form onSubmit={adicionarMarca} className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="Ex: O Boticário, Natura..."
                value={novaMarca}
                onChange={e => setNovaMarca(e.target.value)}
                disabled={!setorSelecionado}
                className="flex-1 bg-[#F5F5F7] border border-transparent focus:border-purple-500 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
              />
              <button type="submit" disabled={!novaMarca.trim() || !setorSelecionado} className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-xl px-4 flex items-center justify-center transition-colors">
                <Plus size={20} />
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {setorSelecionado && marcas.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-xl text-gray-400 text-sm mt-4">Nenhuma marca em {setorSelecionado.nome}.</div>
              )}
              <AnimatePresence>
                {marcas.map(marca => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    key={marca.id} 
                    className="group flex items-center justify-between p-4 rounded-xl bg-[#F9F9FB] hover:bg-purple-50 border border-transparent hover:border-purple-100 transition-colors"
                  >
                    <span className="font-bold text-gray-700">{marca.nome}</span>
                    <button 
                      onClick={() => excluirMarca(marca.id, marca.nome)}
                      className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* SEÇÃO: DIAGRAMA EXPLICATIVO */}
        <div className="bg-[#1D1D1F] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          
          <div className="flex items-start gap-4 relative z-10">
            <div className="bg-white/10 p-3 rounded-2xl shrink-0">
              <Info size={24} className="text-blue-400" />
            </div>
            <div className="w-full">
              <h3 className="text-xl font-bold mb-2">Como organizar sua loja? (O Padrão VOLTE)</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-3xl">
                Para o sistema financeiro e de estoque funcionar com precisão, tudo precisa de uma "gaveta" correta. 
                Imagine a loja como um grande armário. O <strong className="text-white">Setor</strong> é a porta do armário, 
                a <strong className="text-white">Marca</strong> é a prateleira lá dentro, e o <strong className="text-white">Produto</strong> é o que fica em cima da prateleira.
              </p>

              {/* O DIAGRAMA EM CSS */}
              <div className="bg-black/30 rounded-2xl p-6 border border-white/10 overflow-x-auto">
                <div className="min-w-[600px] flex items-center justify-between relative">
                  
                  {/* Linha conectora de fundo */}
                  <div className="absolute top-1/2 left-8 right-8 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 -translate-y-1/2 opacity-30"></div>

                  {/* Nó 1: Setor */}
                  <div className="relative z-10 flex flex-col items-center w-1/3">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/50 mb-4 border-2 border-blue-400">
                      <Layers size={28} className="text-white" />
                    </div>
                    <span className="text-xs text-blue-400 font-bold tracking-widest uppercase mb-1">Setor</span>
                    <span className="font-bold text-lg text-center px-4">Ex: {exSetor}</span>
                  </div>

                  {/* Seta animada */}
                  <div className="relative z-10 animate-pulse text-gray-500"><ChevronRight size={24} /></div>

                  {/* Nó 2: Marca */}
                  <div className="relative z-10 flex flex-col items-center w-1/3">
                    <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/50 mb-4 border-2 border-purple-400">
                      <Tags size={28} className="text-white" />
                    </div>
                    <span className="text-xs text-purple-400 font-bold tracking-widest uppercase mb-1">Marca</span>
                    <span className="font-bold text-lg text-center px-4">Ex: {exMarca}</span>
                  </div>

                  {/* Seta animada */}
                  <div className="relative z-10 animate-pulse text-gray-500"><ChevronRight size={24} /></div>

                  {/* Nó 3: Produto */}
                  <div className="relative z-10 flex flex-col items-center w-1/3">
                    <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-900/50 mb-4 border-2 border-green-400">
                      <Package size={28} className="text-white" />
                    </div>
                    <span className="text-xs text-green-400 font-bold tracking-widest uppercase mb-1">Produto Final</span>
                    <span className="font-bold text-lg text-center px-4 text-gray-300">Cadastrado no Caixa</span>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
