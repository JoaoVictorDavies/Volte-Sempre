import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function Estoque() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [dadosAgrupados, setDadosAgrupados] = useState({})

  useEffect(() => {
    async function carregarEstoque() {
      setCarregando(true)
      try {
        // 1. Puxamos tudo do banco
        const { data: setores } = await supabase.from('setores').select('*').order('nome')
        const { data: marcas } = await supabase.from('marcas').select('*').order('nome')
        const { data: produtos } = await supabase.from('produtos')
          .select('*')
          .gt('estoque', 0) // REGRA: Só traz o que tem estoque maior que zero
          .order('nome')

        // 2. Organizamos a hierarquia: Setor -> Marca -> Produtos
        const estrutura = {}

        setores.forEach(setor => {
          estrutura[setor.nome] = {}
          
          const marcasDoSetor = marcas.filter(m => m.setor_id === setor.id)
          marcasDoSetor.forEach(marca => {
            const produtosDaMarca = produtos.filter(p => p.marca_id === marca.id)
            
            // Só adiciona a marca se ela tiver produtos com estoque
            if (produtosDaMarca.length > 0) {
              estrutura[setor.nome][marca.nome] = produtosDaMarca
            }
          })

          // Se o setor não tiver nenhuma marca com produto, removemos o setor da visualização
          if (Object.keys(estrutura[setor.nome]).length === 0) {
            delete estrutura[setor.nome]
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
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <button onClick={() => navigate('/admin-home')} className="text-blue-600 font-bold mb-2">← Voltar</button>
          <h1 className="text-3xl font-bold text-gray-800">Meus Itens em Estoque</h1>
        </div>
      </header>

      {carregando ? (
        <div className="text-center py-10 text-gray-500 font-bold">Sincronizando com o banco...</div>
      ) : Object.keys(dadosAgrupados).length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed">
          <p className="text-gray-400">Nenhum produto com estoque disponível.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(dadosAgrupados).map(([setorNome, marcas]) => (
            <div key={setorNome} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* CABEÇALHO DO SETOR */}
              <div className="bg-gray-800 p-4">
                <h2 className="text-white font-bold text-xl uppercase tracking-wider">{setorNome}</h2>
              </div>

              <div className="p-4 space-y-6">
                {Object.entries(marcas).map(([marcaNome, produtos]) => (
                  <div key={marcaNome} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-blue-600 font-bold text-lg mb-3">{marcaNome}</h3>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {produtos.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div>
                            <span className="font-bold text-gray-700">{p.nome}</span>
                            <p className="text-xs text-gray-400">Cód: {p.codigo_barras || 'N/A'}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Preço Venda</p>
                              <p className="font-bold text-green-600">R$ {Number(p.preco_venda).toFixed(2)}</p>
                            </div>
                            <div className="bg-blue-600 text-white px-3 py-1 rounded-md font-bold text-sm min-w-[40px] text-center">
                              {p.estoque}
                            </div>
                          </div>
                        </div>
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