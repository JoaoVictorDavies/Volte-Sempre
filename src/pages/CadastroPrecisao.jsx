import { useState } from 'react'
import { supabase } from '../services/supabase' // Importando a conexão com o Supabase

export default function CadastroPrecisao() {
  const [loading, setLoading] = useState(false)
  const [dados, setDados] = useState({
    setor: '',
    marca: '',
    tipo: 'solo',
    nome: '',
    precoCusto: '',
    precoVenda: '',
    estoque: '',
    codigoBarras: ''
  })

  // Dados simulados para os "Dropdowns" (Listas de seleção)
  const setores = ['Perfumaria', 'Alimentos', 'Novidades']
  const marcas = {
    'Perfumaria': ['Avon', 'Jequiti', 'O Boticário'],
    'Alimentos': ['Cacau Show', 'Nestlé'],
    'Novidades': ['Acessórios', 'Decoração']
  }

  // Atualiza um campo específico no estado
  const handleChange = (e) => {
    const { name, value } = e.target
    setDados(prev => ({ ...prev, [name]: value }))
  }

  // Função para salvar no Supabase
  const salvarProduto = async () => {
    // Validação simples
    if (!dados.nome || !dados.precoVenda || !dados.setor || !dados.marca) {
      alert("Por favor, preencha todos os campos obrigatórios (*).")
      return
    }

    setLoading(true)

    try {
      // Ajuste: Inserindo na tabela 'produtos'
      const { data, error } = await supabase
        .from('produtos')
        .insert([
          {
            nome: dados.nome,
            tipo: dados.tipo,
            preco_custo: parseFloat(dados.precoCusto) || 0,
            preco_venda: parseFloat(dados.precoVenda) || 0,
            estoque: parseInt(dados.estoque) || 0,
            codigo_barras: dados.tipo === 'solo' ? dados.codigoBarras : null,
            // NOTA: Como ainda não temos o fluxo de loja e marca vinculado no banco real,
            // estamos salvando os textos temporariamente ou você precisará ajustar o banco
            // para aceitar texto ou buscar o ID real da marca/setor.
          }
        ])

      if (error) {
        console.error("Erro do Supabase:", error.message)
        alert("Erro ao salvar: " + error.message)
      } else {
        alert("Produto cadastrado com sucesso!")
        // Limpa o formulário após salvar
        setDados({
          setor: '',
          marca: '',
          tipo: 'solo',
          nome: '',
          precoCusto: '',
          precoVenda: '',
          estoque: '',
          codigoBarras: ''
        })
      }
    } catch (err) {
      console.error("Erro inesperado:", err)
      alert("Ocorreu um erro inesperado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 mt-6">
      <div className="bg-white shadow-md rounded-2xl p-6 md:p-10 border border-gray-100">
        
        <div className="mb-8 border-b pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Cadastro com Precisão</h1>
          <p className="text-gray-500 mt-1">Preencha todos os dados do produto em uma única tela.</p>
        </div>

        <form className="space-y-8">
          
          {/* SESSÃO 1: CLASSIFICAÇÃO */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              📂 1. Classificação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor *</label>
                <select 
                  name="setor" 
                  value={dados.setor} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione um setor...</option>
                  {setores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                <select 
                  name="marca" 
                  value={dados.marca} 
                  onChange={handleChange}
                  disabled={!dados.setor} // Trava se não escolher o setor antes
                  className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione a marca...</option>
                  {dados.setor && marcas[dados.setor]?.map(m => <option key={m} value={m}>{m}</option>)}
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
                  <option value="kit_dinamico">Kit Dinâmico (Avulsos)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SESSÃO 2: DETALHES DO PRODUTO */}
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

              {/* Só mostra código de barras se não for Kit */}
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

          {/* SESSÃO 3: FINANCEIRO E ESTOQUE */}
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

          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-col md:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
            <button 
              type="button" 
              onClick={() => {
                // Opcional: botão para limpar o formulário
                setDados({setor: '', marca: '', tipo: 'solo', nome: '', precoCusto: '', precoVenda: '', estoque: '', codigoBarras: ''})
              }}
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