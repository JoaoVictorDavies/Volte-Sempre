import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { ChevronDown, ChevronUp, Calendar, DollarSign, Package, Edit2, Check, X, Trash2, Camera, AlertCircle } from 'lucide-react'
import LeitorCamera from '../components/LeitorCamera' 

// Mini-componente para gerenciar a "gaveta" de lotes e a exibição de cada produto
function ProdutoItem({ produto, onAtualizar, produtoDestacadoId }) {
  const [expandido, setExpandido] = useState(false)
  
  // Estados para a edição do nome do produto
  const [displayNome, setDisplayNome] = useState(produto.nome)
  const [isEditing, setIsEditing] = useState(false)
  const [editNome, setEditNome] = useState(produto.nome)
  const [isSaving, setIsSaving] = useState(false)

  // Verifica se o ID deste produto é o que foi encontrado pela câmera
  const isDestacado = produtoDestacadoId && produtoDestacadoId === produto.id

  useEffect(() => {
    if (isDestacado) {
      setExpandido(true)
      // Um pequeno delay para dar tempo da gaveta da Marca abrir antes de rolar a tela
      setTimeout(() => {
        document.getElementById(`produto-${produto.id}`)?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }, 300)
    }
  }, [isDestacado, produto.id])

  const handleSaveNome = async (e) => {
    e.stopPropagation() 
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

  const handleExcluir = async (e) => {
    e.stopPropagation()

    // Regra de Negócio: Se tem estoque, avisa. Se é zero, exclui direto.
    if (produto.estoqueReal > 0) {
      const confirma = window.confirm(`ATENÇÃO! Esse produto tem ${produto.estoqueReal} itens no estoque. Excluir mesmo assim?`)
      if (!confirma) return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', produto.id)
      if (error) throw error
      
      onAtualizar() // Recarrega a tela para o produto sumir
    } catch (error) {
      alert("Erro ao excluir o produto: " + error.message)
      setIsSaving(false)
    }
  }

  return (
    <div 
      id={`produto-${produto.id}`}
      className={`flex flex-col rounded-xl border overflow-hidden mb-3 transition-all duration-500 ${isDestacado ? 'border-blue-400 ring-4 ring-blue-500/20 bg-blue-50/30 shadow-lg' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'}`}
    >
      {/* LINHA PRINCIPAL DO PRODUTO (Clicável) */}
      <div 
        onClick={() => !isEditing && setExpandido(!expandido)}
        className={`flex justify-between items-center p-4 transition-colors ${!isEditing ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      >
        <div className="flex items-start gap-3 flex-1">
          <div className={`mt-1 ${isDestacado ? 'text-blue-500' : 'text-gray-400'}`}>
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
                
                <div className="flex items-center gap-1">
                  {/* Botão de Editar Nome */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsEditing(true)
                    }} 
                    className="text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                    title="Editar Nome"
                  >
                    <Edit2 size={14} />
                  </button>

                  {/* Botão de Excluir Produto */}
                  <button 
                    onClick={handleExcluir} 
                    disabled={isSaving}
                    className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                    title="Excluir Produto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

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
                      <p className="text-xs text-gray-400">Valor Venda</p>
                      <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                        <DollarSign size={12} /> {Number(produto.preco_venda).toFixed(2)}
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

// Mini-componente para gerenciar a "gaveta" das MARCAS (Recolhido por Padrão)
function MarcaItem({ marcaNome, produtos, onAtualizar, produtoDestacadoId }) {
  const [expandido, setExpandido] = useState(false)

  // Se a câmera leu um produto que pertence a esta marca, força a gaveta da marca a abrir
  useEffect(() => {
    if (produtoDestacadoId && produtos.some(p => p.id === produtoDestacadoId)) {
      setExpandido(true)
    }
  }, [produtoDestacadoId, produtos])

  return (
    <div className="relative border-b border-gray-100 last:border-0 pb-4 mb-4 last:mb-0 last:pb-0">
      {/* INDICADOR DE MARCA (Clicável) */}
      <div 
        onClick={() => setExpandido(!expandido)}
        className="flex items-center gap-3 mb-2 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-xl transition-colors select-none"
      >
        <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
        <h3 className="text-blue-600 font-bold text-xl tracking-tight">{marcaNome}</h3>
        <div className="text-blue-500 flex items-center gap-2">
          {expandido ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>
        
        {/* Pílula informativa mostrando a quantidade de itens na marca (só aparece se estiver fechado) */}
        {!expandido && (
          <span className="text-xs font-bold text-blue-400 bg-blue-50 px-2 py-1 rounded-lg ml-2">
            {produtos.length} {produtos.length === 1 ? 'item' : 'itens'}
          </span>
        )}
      </div>
      
      {/* LISTA DE PRODUTOS DA MARCA (Expansível) */}
      {expandido && (
        <div className="pl-0 md:pl-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {produtos.map(p => (
            <ProdutoItem 
              key={p.id} 
              produto={p} 
              onAtualizar={onAtualizar} 
              produtoDestacadoId={produtoDestacadoId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Estoque() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [dadosAgrupados, setDadosAgrupados] = useState({})
  
  // Estados para o Leitor de Câmera
  const [cameraAtiva, setCameraAtiva] = useState(false)
  const [produtoDestacadoId, setProdutoDestacadoId] = useState(null)
  
  // Estado para quando a câmera lê um código inexistente
  const [codigoNaoEncontrado, setCodigoNaoEncontrado] = useState(null)

  const carregarEstoque = async () => {
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

  useEffect(() => {
    carregarEstoque()
  }, [])

  // Função disparada quando o componente sniper (LeitorCamera) finaliza a leitura
  const handleCameraSucesso = (codigo) => {
    setCameraAtiva(false)
    
    // Busca o ID único do produto lido para evitar conflitos de "null" ou repetidos
    let idEncontrado = null
    Object.values(dadosAgrupados).forEach(marcas => {
      Object.values(marcas).forEach(produtos => {
        if (!idEncontrado) {
          const p = produtos.find(p => p.codigo_barras && p.codigo_barras === codigo)
          if (p) idEncontrado = p.id
        }
      })
    })

    if (idEncontrado) {
      setProdutoDestacadoId(idEncontrado)
      // Limpa o destaque após 5 segundos para não ficar azul para sempre
      setTimeout(() => setProdutoDestacadoId(null), 5000)
    } else {
      // Abre o modal de produto não encontrado
      setCodigoNaoEncontrado(codigo)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-300">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin-home')} className="text-blue-600 font-bold mb-2 flex items-center gap-1 hover:underline focus:outline-none">
            ← Voltar ao Painel
          </button>
          <h1 className="text-3xl font-bold text-gray-800" style={{ letterSpacing: '-0.02em' }}>
            Visão de Estoque
          </h1>
          <p className="text-[#86868B] mt-1 text-sm">Controle detalhado de remessas e capital.</p>
        </div>
        
        {/* Botão que aciona a Câmera */}
        <button 
          onClick={() => setCameraAtiva(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
        >
          <Camera size={20} />
          <span>Localizar Produto</span>
        </button>
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

              <div className="p-5 md:p-8 space-y-2">
                {Object.entries(marcas).map(([marcaNome, produtos]) => (
                  <MarcaItem 
                    key={marcaNome} 
                    marcaNome={marcaNome} 
                    produtos={produtos} 
                    onAtualizar={carregarEstoque} 
                    produtoDestacadoId={produtoDestacadoId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DO LEITOR DE CÂMERA SNIPER */}
      {cameraAtiva && (
        <div className="fixed inset-0 z-[100] bg-black">
          <LeitorCamera 
            onSucesso={handleCameraSucesso}
            onFechar={() => setCameraAtiva(false)}
          />
        </div>
      )}

      {/* MODAL: PRODUTO NÃO ENCONTRADO */}
      {codigoNaoEncontrado && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-500">
              <AlertCircle size={32} />
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2">Produto não localizado</h3>
            <p className="text-gray-500 text-sm mb-4">
              O código <strong className="text-gray-800 font-mono text-base ml-1">{codigoNaoEncontrado}</strong> não foi encontrado.
            </p>
            <p className="text-gray-600 font-medium mb-8">Deseja registrar este produto em sua loja agora?</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navigate('/cadastro-produto')}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors active:scale-95"
              >
                Sim, Cadastrar Produto
              </button>
              <button 
                onClick={() => setCodigoNaoEncontrado(null)}
                className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}