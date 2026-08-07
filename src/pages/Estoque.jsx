import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { ChevronDown, ChevronUp, Calendar, DollarSign, Package, Edit2, Check, X } from 'lucide-react'

// Mini-componente para gerenciar a "gaveta" de lotes e a exibição de cada produto
function ProdutoItem({ produto }) {
  const [expandido, setExpandido] = useState(false)
  
  // Estados para a edição do nome do produto
  const [displayNome, setDisplayNome] = useState(produto.nome)
  const [isEditing, setIsEditing] = useState(false)
  const [editNome, setEditNome] = useState(produto.nome)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveNome = async (e) => {
    e.stopPropagation() // Evita que a gaveta abra/feche ao salvar
    if (!editNome.trim()) {
      setIsEditing(false)
      return
    }
    
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ nome: editNome })
        .eq('id', produto.id)

      if (error) throw error
      
      setDisplayNome(editNome)
      setIsEditing(false)
    } catch (error) {
      alert("Erro ao atualizar o nome do produto: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const cancelarEdicao = (e) => {
    e.stopPropagation()
    setEditNome(displayNome)
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden mb-3 shadow-sm transition-all hover:shadow-md">
      {/* LINHA PRINCIPAL DO PRODUTO (Clicável) */}
      <div 
        onClick={() => !isEditing && setExpandido(!expandido)}
        className={`flex justify-between items-center p-4 transition-colors ${!isEditing ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      >
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-1 text-gray-400">
            {expandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          <div className="flex-1">
            
            {/* MODO EDIÇÃO VS MODO VISUALIZAÇÃO */}
            {isEditing ? (
              <div className="flex items-center gap-2 mb-1" onClick={e => e.stopPropagation()}>
                <input 
                  type="text" 
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="border-2 border-blue-200 rounded-lg px-2 py-1 text-sm w-full max-w-xs focus:outline-none focus:border-blue-500 font-bold text-gray-800"
                  autoFocus
                />
                <button onClick={handleSaveNome} disabled={isSaving} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50">
                  <Check size={16} />
                </button>
                <button onClick={cancelarEdicao} disabled={isSaving} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-bold text-lg ${produto.estoqueReal === 0 ? 'text-gray-500' : 'text-gray-800'}`}>
                  {displayNome}
                </span>
                
                {/* Botão de Editar Nome */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsEditing(true)
                  }} 
                  className="text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                  title="Editar Nome do Produto"
                >
                  <Edit2 size={14} />
                </button>

                {/* Badge de Esgotado */}
                {produto.estoqueReal === 0 && (
                  <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-md uppercase tracking-wider ml-1">
                    Esgotado
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                Cód: {produto.codigo_barras || 'Sem código'}
              </span>
              <span className="text-xs text-gray-400">
                {produto.lotesValidos.length} {produto.lotesValidos.length === 1 ? 'lote ativo' : 'lotes ativos'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Preço de Venda</p>
            <p className="font-bold text-green-600">R$ {Number(produto.preco_venda).toFixed(2)}</p>
          </div>
          <div className={`text-white px-4 py-2 rounded-xl font-bold text-lg min-w-[50px] text-center shadow-sm ${produto.estoqueReal === 0 ? 'bg-red-500' : 'bg-blue-600'}`}>
            {produto.estoqueReal}
          </div>
        </div>
      </div>

      {/* GAVETA DE LOTES (Expansível) */}
      {expandido && (
        <div className="bg-[#F9F9FB] border-t border-gray-100 p-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Package size={14} /> Detalhamento de Lotes (Fila)
          </h4>
          
          {produto.lotesValidos.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Nenhum lote com saldo disponível no momento.</p>
          ) : (
            <div className="space-y-2">
              {produto.lotesValidos.map((lote, index) => (
                <div key={lote.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-8 rounded-full ${lote.status === 'ativo' ? 'bg-green-400' : 'bg-orange-400'}`} title={`Status: ${lote.status}`}></div>
                    <div>
                      <p className="text-sm font-bold text-gray-700">Lote {index + 1} <span className="text-xs font-normal text-gray-400 ml-1">({lote.status})</span></p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Calendar size={12} /> {new Date(lote.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Custo Un.</p>
                      <p className="text-sm font-bold text-red-500 flex items-center gap-1">
                        <DollarSign size={12} /> {Number(lote.preco_custo).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center bg-gray-100 px-3 py-1 rounded-md">
                      <p className="text-xs text-gray-400">Restam</p>
                      <p className="text-sm font-bold text-gray-800">{lote.quantidade_atual} un.</p>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Estoque() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [dadosAgrupados, setDadosAgrupados] = useState({})

  useEffect(() => {
    async function carregarEstoque() {
      setCarregando(true)
      try {
        const [resSetores, resMarcas, resProdutos] = await Promise.all([
          supabase.from('setores').select('*').order('nome'),
          supabase.from('marcas').select('*').order('nome'),
          supabase.from('produtos').select('*, estoque_lotes(*)').order('nome')
        ])

        if (resSetores.error) throw resSetores.error
        if (resMarcas.error) throw resMarcas.error
        if (resProdutos.error) throw resProdutos.error

        const estrutura = {}

        resSetores.data.forEach(setor => {
          const dictMarcas = {}
          
          const marcasDoSetor = resMarcas.data.filter(m => m.setor_id === setor.id)
          marcasDoSetor.forEach(marca => {
            
            const produtosDaMarca = resProdutos.data.filter(p => p.marca_id === marca.id)
            
            const produtosValidos = produtosDaMarca.map(p => {
              const lotesValidos = (p.estoque_lotes || []).filter(l => l.quantidade_atual > 0)
              
              lotesValidos.sort((a, b) => {
                if (a.status === 'ativo' && b.status !== 'ativo') return -1;
                if (a.status !== 'ativo' && b.status === 'ativo') return 1;
                return new Date(a.criado_em) - new Date(b.criado_em);
              });

              const estoqueReal = lotesValidos.reduce((acc, lote) => acc + lote.quantidade_atual, 0)
              
              return { ...p, lotesValidos, estoqueReal }
            })
            // Foi removido o .filter(p => p.estoqueReal > 0) para exibir os zerados

            // Se houver qualquer produto cadastrado na marca, ela será mostrada
            if (produtosValidos.length > 0) {
              dictMarcas[marca.nome] = produtosValidos
            }
          })

          if (Object.keys(dictMarcas).length > 0) {
            estrutura[setor.nome] = dictMarcas
          }
        })

        setDadosAgrupados(estrutura)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setCarregando(false)
      }
    }

    carregarEstoque()
  }, [])

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-300">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <button onClick={() => navigate('/admin-home')} className="text-blue-600 font-bold mb-2 flex items-center gap-1 hover:underline focus:outline-none">
            ← Voltar ao Painel
          </button>
          <h1 className="text-3xl font-bold text-gray-800" style={{ letterSpacing: '-0.02em' }}>
            Visão de Estoque
          </h1>
          <p className="text-[#86868B] mt-1 text-sm">Controle detalhado de remessas e capital.</p>
        </div>
      </header>

      {carregando ? (
        <div className="text-center py-20 text-gray-500 font-bold animate-pulse">Sincronizando com o banco de dados...</div>
      ) : Object.keys(dadosAgrupados).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3 opacity-50">📦</div>
          <p className="text-gray-500 font-medium">Nenhum produto cadastrado no sistema.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(dadosAgrupados).map(([setorNome, marcas]) => (
            <div key={setorNome} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              
              <div className="bg-[#1D1D1F] p-5">
                <h2 className="text-white font-bold text-xl uppercase tracking-widest">{setorNome}</h2>
              </div>

              <div className="p-5 md:p-8 space-y-8">
                {Object.entries(marcas).map(([marcaNome, produtos]) => (
                  <div key={marcaNome} className="relative">
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                      <h3 className="text-blue-600 font-bold text-xl tracking-tight">{marcaNome}</h3>
                    </div>
                    
                    <div className="pl-0 md:pl-4">
                      {produtos.map(p => (
                        <ProdutoItem key={p.id} produto={p} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}