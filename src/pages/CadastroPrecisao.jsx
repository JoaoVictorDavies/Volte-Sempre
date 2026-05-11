import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function CadastroPrecisao() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  
  const [setoresDoBanco, setSetoresDoBanco] = useState([])
  const [marcasDoBanco, setMarcasDoBanco] = useState([])

  const [dados, setDados] = useState({
    setorId: '',
    marcaId: '',
    tipo: 'solo',
    nome: '',
    precoCusto: '',
    precoVenda: '',
    estoque: '',
    codigoBarras: ''
  })

  useEffect(() => {
    async function buscarSetores() {
      const { data, error } = await supabase.from('setores').select('*').order('nome')
      if (!error) setSetoresDoBanco(data)
    }
    buscarSetores()
  }, [])

  useEffect(() => {
    if (dados.setorId) {
      async function buscarMarcas() {
        const { data, error } = await supabase
          .from('marcas')
          .select('*')
          .eq('setor_id', dados.setorId)
          .order('nome')
        if (!error) setMarcasDoBanco(data)
      }
      buscarMarcas()
    } else {
      setMarcasDoBanco([])
    }
  }, [dados.setorId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setDados(prev => ({ ...prev, [name]: value }))
  }

  const salvarProduto = async () => {
    if (!dados.nome || !dados.precoVenda || !dados.setorId || !dados.marcaId) {
      alert("Por favor, preencha todos os campos obrigatórios (*).")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('produtos')
        .insert([
          {
            nome: dados.nome,
            tipo: dados.tipo,
            preco_custo: parseFloat(dados.precoCusto) || 0,
            preco_venda: parseFloat(dados.precoVenda) || 0,
            estoque: parseInt(dados.estoque) || 0,
            codigo_barras: dados.tipo === 'solo' ? dados.codigoBarras : null,
            marca_id: dados.marcaId
          }
        ])

      if (error) throw error
      
      setSucesso(true)
      
    } catch (err) {
      console.error("Erro inesperado:", err)
      alert("Ocorreu um erro ao salvar: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetarFormulario = () => {
    setDados({
      setorId: '', marcaId: '', tipo: 'solo', nome: '', 
      precoCusto: '', precoVenda: '', estoque: '', codigoBarras: ''
    })
    setSucesso(false)
  }

  if (sucesso) {
    return (
      <div className="max-w-2xl mx-auto p-10 bg-white shadow-lg rounded-2xl mt-10 text-center animate-in zoom-in duration-300">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Produto cadastrado com sucesso!</h2>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={resetarFormulario}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-md transition-all"
          >
            Cadastrar outro produto
          </button>
          
          <button 
            onClick={() => navigate('/visao-estoque')}
            className="w-full bg-green-100 text-green-700 font-bold py-4 rounded-xl hover:bg-green-200 transition-all"
          >
            Ver produto no estoque
          </button>
          
          <button 
            onClick={() => navigate('/admin-home')}
            className="w-full bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-all"
          >
            Finalizar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 mt-6 animate-in fade-in duration-300">
      <div className="bg-white shadow-md rounded-2xl p-6 md:p-10 border border-gray-100">
        
        <div className="mb-8 border-b pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Cadastro com Precisão</h1>
          <p className="text-gray-500 mt-1">Preencha todos os dados do produto em uma única tela.</p>
        </div>

        <form className="space-y-8">
          
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              📂 1. Classificação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor *</label>
                <select 
                  name="setorId" 
                  value={dados.setorId} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione um setor...</option>
                  {setoresDoBanco.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                <select 
                  name="marcaId" 
                  value={dados.marcaId} 
                  onChange={handleChange}
                  disabled={!dados.setorId}
                  className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione a marca...</option>
                  {marcasDoBanco.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Venda *</label>
                <select 
                  name="tipo" 
                  value={dados.tipo} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="solo">Produto Solo</option>
                  <option value="kit_fixo">Kit Fixo (Fechado)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              🏷️ 2. Detalhes do Produto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto/Kit *</label>
                <input 
                  type="text"
                  name="nome"
                  value={dados.nome}
                  onChange={handleChange}
                  placeholder="Ex: Kit Malbec Tradicional Dia dos Pais"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {dados.tipo === 'solo' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
                  <input 
                    type="text"
                    name="codigoBarras"
                    value={dados.codigoBarras}
                    onChange={handleChange}
                    placeholder="Bipe com o leitor ou digite..."
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              💰 3. Financeiro e Estoque
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Custo (R$)</label>
                <input 
                  type="number"
                  name="precoCusto"
                  value={dados.precoCusto}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda (R$) *</label>
                <input 
                  type="number"
                  name="precoVenda"
                  value={dados.precoVenda}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full border border-green-300 bg-green-50 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold text-green-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Inicial</label>
                <input 
                  type="number"
                  name="estoque"
                  value={dados.estoque}
                  onChange={handleChange}
                  placeholder="Qtd"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
            <button 
              type="button" 
              onClick={resetarFormulario}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="button" 
              onClick={salvarProduto}
              disabled={loading}
              className={`px-8 py-3 text-white font-bold rounded-xl shadow-md transition-colors ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}