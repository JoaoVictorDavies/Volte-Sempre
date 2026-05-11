import { useState } from 'react'

export default function CadastroProduto() {
  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState({
    setor: '',
    marca: '',
    tipo: '',
    nome: '',
    precoCusto: '',
    precoVenda: '',
    estoque: '',
    codigoBarras: ''
  })

  // Simulando dados por enquanto (depois virão do Supabase)
  const setores = ['Perfumaria', 'Alimentos', 'Novidades']
  const marcas = {
    'Perfumaria': ['Avon', 'Jequiti', 'O Boticário'],
    'Alimentos': ['Cacau Show', 'Nestlé'],
    'Novidades': ['Acessórios', 'Decoração']
  }

  const avancar = () => setEtapa(etapa + 1)
  const voltar = () => setEtapa(etapa - 1)

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-2xl mt-10">
      {/* Barra de Progresso Simples */}
      <div className="flex justify-between mb-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
        <span className={etapa >= 1 ? 'text-blue-600' : ''}>Setor</span>
        <span className={etapa >= 2 ? 'text-blue-600' : ''}>Marca</span>
        <span className={etapa >= 3 ? 'text-blue-600' : ''}>Tipo</span>
        <span className={etapa >= 4 ? 'text-blue-600' : ''}>Detalhes</span>
      </div>

      {/* ETAPA 1: SETOR */}
      {etapa === 1 && (
        <div className="animate-in fade-in duration-300">
          <h2 className="text-xl font-bold mb-4">Em qual setor o produto se encaixa?</h2>
          <div className="grid grid-cols-1 gap-3">
            {setores.map(s => (
              <button 
                key={s}
                onClick={() => { setDados({...dados, setor: s}); avancar(); }}
                className="p-4 border-2 border-gray-100 hover:border-blue-500 rounded-xl text-left font-medium hover:bg-blue-50 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ETAPA 2: MARCA */}
      {etapa === 2 && (
        <div className="animate-in slide-in-from-right duration-300">
          <h2 className="text-xl font-bold mb-4">Qual a marca de {dados.setor}?</h2>
          <div className="grid grid-cols-1 gap-3">
            {marcas[dados.setor]?.map(m => (
              <button 
                key={m}
                onClick={() => { setDados({...dados, marca: m}); avancar(); }}
                className="p-4 border-2 border-gray-100 hover:border-blue-500 rounded-xl text-left font-medium hover:bg-blue-50 transition-all"
              >
                {m}
              </button>
            ))}
            <button onClick={voltar} className="mt-4 text-gray-400 text-sm">← Voltar para Setores</button>
          </div>
        </div>
      )}

      {/* ETAPA 3: TIPO DE PRODUTO */}
      {etapa === 3 && (
        <div className="animate-in slide-in-from-right duration-300">
          <h2 className="text-xl font-bold mb-4">Como esse item é vendido?</h2>
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => { setDados({...dados, tipo: 'solo'}); avancar(); }}
              className="p-5 border-2 border-gray-200 rounded-xl text-left hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="font-bold">Produto Solo</div>
              <div className="text-sm text-gray-500">Item individual com código de barras próprio.</div>
            </button>

            <button 
              onClick={() => { setDados({...dados, tipo: 'kit_fixo'}); avancar(); }}
              className="p-5 border-2 border-gray-200 rounded-xl text-left hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="font-bold">Kit Fixo (Fechado)</div>
              <div className="text-sm text-gray-500">Um conjunto que já vem pronto da marca.</div>
            </button>

            <button 
              onClick={() => { setDados({...dados, tipo: 'kit_dinamico'}); avancar(); }}
              className="p-5 border-2 border-gray-200 rounded-xl text-left hover:border-purple-500 hover:bg-purple-50"
            >
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
            <input 
              placeholder="Nome do Produto/Kit"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={dados.nome}
              onChange={e => setDados({...dados, nome: e.target.value})}
            />

            <div className="grid grid-cols-2 gap-4">
              <input 
                type="number"
                placeholder="Preço Compra (R$)"
                className="border p-3 rounded-lg outline-none"
                value={dados.precoCusto}
                onChange={e => setDados({...dados, precoCusto: e.target.value})}
              />
              <input 
                type="number"
                placeholder="Preço Venda (R$)"
                className="border p-3 rounded-lg outline-none border-blue-200 bg-blue-50"
                value={dados.precoVenda}
                onChange={e => setDados({...dados, precoVenda: e.target.value})}
              />
            </div>

            {dados.tipo === 'solo' && (
              <input 
                placeholder="Código de Barras (Bipe agora)"
                className="w-full border p-3 rounded-lg bg-gray-50 italic"
                value={dados.codigoBarras}
                onChange={e => setDados({...dados, codigoBarras: e.target.value})}
              />
            )}

            <input 
              type="number"
              placeholder="Estoque Inicial"
              className="w-full border p-3 rounded-lg"
              value={dados.estoque}
              onChange={e => setDados({...dados, estoque: e.target.value})}
            />

            <button className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg transition-all">
              Finalizar Cadastro
            </button>
            <button onClick={voltar} className="w-full text-gray-400 text-sm mt-2">← Voltar para Tipo</button>
          </div>
        </div>
      )}
    </div>
  )
}