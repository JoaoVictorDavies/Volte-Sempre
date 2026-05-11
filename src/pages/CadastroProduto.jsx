import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function CadastroProduto() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState(1)
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  
  // Estados para dados vindos do banco
  const [setoresDoBanco, setSetoresDoBanco] = useState([])
  const [marcasDoBanco, setMarcasDoBanco] = useState([])

  const [dados, setDados] = useState({
    setorId: '',
    setorNome: '',
    marcaId: '',
    marcaNome: '',
    tipo: '',
    nome: '',
    precoCusto: '',
    precoVenda: '',
    estoque: '',
    codigoBarras: ''
  })

  // 1. Buscar SETORES ao carregar a página
  useEffect(() => {
    async function buscarSetores() {
      const { data, error } = await supabase.from('setores').select('*').order('nome')
      if (!error) setSetoresDoBanco(data)
    }
    buscarSetores()
  }, [])

  // 2. Buscar MARCAS quando um setor for selecionado
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
    }
  }, [dados.setorId])

  const avancar = () => setEtapa(etapa + 1)
  const voltar = () => setEtapa(etapa - 1)

  // 3. Função para SALVAR no Supabase
  async function finalizarCadastro() {
    setCarregando(true)
    try {
      const { error } = await supabase.from('produtos').insert([
        {
          nome: dados.nome,
          tipo: dados.tipo,
          preco_custo: parseFloat(dados.precoCusto) || 0,
          preco_venda: parseFloat(dados.precoVenda) || 0,
          estoque: parseInt(dados.estoque) || 0,
          codigo_barras: dados.tipo === 'solo' ? dados.codigoBarras : null,
          marca_id: dados.marcaId,
          // loja_id: 'se precisar fixar, mas como tiramos RLS ele aceita nulo se não houver campo obrigatório'
        }
      ])

      if (error) throw error
      setSucesso(true)
    } catch (error) {
      alert("Erro ao cadastrar: " + error.message)
    } finally {
      setCarregando(false)
    }
  }

  const reiniciarFormulario = () => {
    setDados({
      setorId: '', setorNome: '', marcaId: '', marcaNome: '',
      tipo: '', nome: '', precoCusto: '', precoVenda: '',
      estoque: '', codigoBarras: ''
    })
    setSucesso(false)
    setEtapa(1)
  }

  // TELA DE SUCESSO
  if (sucesso) {
    return (
      <div className="max-w-2xl mx-auto p-10 bg-white shadow-lg rounded-2xl mt-10 text-center animate-in zoom-in duration-300">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Produto cadastrado com sucesso!</h2>
        <div className="flex flex-col gap-4">
          <button 
            onClick={reiniciarFormulario}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-md transition-all"
          >
            Cadastrar outro produto
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
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-2xl mt-10">
      {/* Barra de Progresso */}
      <div className="flex justify-between mb-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
        <span className={etapa >= 1 ? 'text-blue-600' : ''}>Setor</span>
        <span className={etapa >= 2 ? 'text-blue-600' : ''}>Marca</span>
        <span className={etapa >= 3 ? 'text-blue-600' : ''}>Tipo</span>
        <span className={etapa >= 4 ? 'text-blue-600' : ''}>Detalhes</span>
      </div>

      {/* ETAPA 1: SETOR (Dinâmico) */}
      {etapa === 1 && (
        <div className="animate-in fade-in duration-300">
          <h2 className="text-xl font-bold mb-4">Em qual setor o produto se encaixa?</h2>
          <div className="grid grid-cols-1 gap-3">
            {setoresDoBanco.map(s => (
              <button 
                key={s.id}
                onClick={() => { setDados({...dados, setorId: s.id, setorNome: s.nome}); avancar(); }}
                className="p-4 border-2 border-gray-100 hover:border-blue-500 rounded-xl text-left font-medium hover:bg-blue-50 transition-all"
              >
                {s.nome}
              </button>
            ))}
            {setoresDoBanco.length === 0 && <p className="text-gray-500 italic">Buscando setores no banco...</p>}
          </div>
        </div>
      )}

      {/* ETAPA 2: MARCA (Dinâmico) */}
      {etapa === 2 && (
        <div className="animate-in slide-in-from-right duration-300">
          <h2 className="text-xl font-bold mb-4">Qual a marca de {dados.setorNome}?</h2>
          <div className="grid grid-cols-1 gap-3">
            {marcasDoBanco.map(m => (
              <button 
                key={m.id}
                onClick={() => { setDados({...dados, marcaId: m.id, marcaNome: m.nome}); avancar(); }}
                className="p-4 border-2 border-gray-100 hover:border-blue-500 rounded-xl text-left font-medium hover:bg-blue-50 transition-all"
              >
                {m.nome}
              </button>
            ))}
            {marcasDoBanco.length === 0 && <p className="text-gray-500 italic">Nenhuma marca encontrada para este setor.</p>}
            <button onClick={voltar} className="mt-4 text-gray-400 text-sm">← Voltar para Setores</button>
          </div>
        </div>
      )}

      {/* ETAPA 3: TIPO DE PRODUTO */}
      {etapa === 3 && (
        <div className="animate-in slide-in-from-right duration-300">
          <h2 className="text-xl font-bold mb-4">Como esse item é vendido?</h2>
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => { setDados({...dados, tipo: 'solo'}); avancar(); }} className="p-5 border-2 border-gray-200 rounded-xl text-left hover:border-blue-500">
              <div className="font-bold">Produto Solo</div>
              <div className="text-sm text-gray-500">Item individual com código de barras próprio.</div>
            </button>
            <button onClick={() => { setDados({...dados, tipo: 'kit_fixo'}); avancar(); }} className="p-5 border-2 border-gray-200 rounded-xl text-left hover:border-blue-500">
              <div className="font-bold">Kit Fixo (Fechado)</div>
              <div className="text-sm text-gray-500">Um conjunto que já vem pronto da marca.</div>
            </button>
            <button onClick={() => { setDados({...dados, tipo: 'kit_dinamico'}); avancar(); }} className="p-5 border-2 border-gray-200 rounded-xl text-left hover:border-purple-500">
              <div className="font-bold text-purple-700">Criar Kit (Juntando Avulsos)</div>
              <div className="text-sm text-gray-500">Você monta o presente usando itens diferentes do estoque.</div>
            </button>
            <button onClick={voltar} className="mt-2 text-gray-400 text-sm">← Voltar para Marcas</button>
          </div>
        </div>
      )}

      {/* ETAPA 4: DETALHES FINAIS */}
      {etapa === 4 && (
        <div className="animate-in zoom-in duration-300">
          <h2 className="text-xl font-bold mb-6">Informações do Produto</h2>
          <div className="space-y-4">
            <input placeholder="Nome do Produto/Kit" className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={dados.nome} onChange={e => setDados({...dados, nome: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Preço Compra" className="border p-3 rounded-lg outline-none" value={dados.precoCusto} onChange={e => setDados({...dados, precoCusto: e.target.value})} />
              <input type="number" placeholder="Preço Venda" className="border p-3 rounded-lg outline-none bg-blue-50" value={dados.precoVenda} onChange={e => setDados({...dados, precoVenda: e.target.value})} />
            </div>
            {dados.tipo === 'solo' && (
              <input placeholder="Código de Barras" className="w-full border p-3 rounded-lg bg-gray-50 italic" value={dados.codigoBarras} onChange={e => setDados({...dados, codigoBarras: e.target.value})} />
            )}
            <input type="number" placeholder="Estoque Inicial" className="w-full border p-3 rounded-lg" value={dados.estoque} onChange={e => setDados({...dados, estoque: e.target.value})} />

            <button 
              onClick={finalizarCadastro}
              disabled={carregando}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg transition-all"
            >
              {carregando ? 'Salvando...' : 'Finalizar Cadastro'}
            </button>
            <button onClick={voltar} className="w-full text-gray-400 text-sm mt-2">← Voltar para Tipo</button>
          </div>
        </div>
      )}
    </div>
  )
}