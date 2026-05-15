import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

// Ícones SVG Simples
const PlusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
const MinusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>

export default function Financeiro() {
  const navigate = useNavigate()
  
  const [carregando, setCarregando] = useState(true)
  const [turnos, setTurnos] = useState([])
  const [vendas, setVendas] = useState([])
  const [estoqueFinanceiro, setEstoqueFinanceiro] = useState([])
  
  // Controle de qual venda está expandida (para ver os itens)
  const [vendaExpandida, setVendaExpandida] = useState(null)

  useEffect(() => {
    async function carregarDadosFinanceiros() {
      setCarregando(true)
      try {
        // 1. BUSCAR ÚLTIMOS TURNOS/CAIXAS (Últimos 10 para não pesar a tela)
        const { data: caixas } = await supabase
          .from('caixa_sessoes')
          .select('*')
          .order('aberto_em', { ascending: false })
          .limit(10)

        // 2. BUSCAR VENDAS DESSES TURNOS (Com os itens que saíram)
        const caixaIds = caixas?.map(c => c.id) || []
        let vendasData = []
        if (caixaIds.length > 0) {
          const { data } = await supabase
            .from('vendas')
            .select('*, vendas_itens(*)')
            .in('sessao_id', caixaIds)
            .order('criado_em', { ascending: false })
          vendasData = data || []
        }

        // 3. BUSCAR DADOS PARA O VALUATION DO ESTOQUE
        const [resProd, resMarcas, resSetores] = await Promise.all([
          supabase.from('produtos').select('estoque, preco_custo, preco_venda, marca_id').gt('estoque', 0),
          supabase.from('marcas').select('id, setor_id'),
          supabase.from('setores').select('id, nome')
        ])

        // 4. PROCESSAR VALUATION POR SETOR
        const valuation = []
        if (!resSetores.error && !resMarcas.error && !resProd.error) {
          resSetores.data.forEach(setor => {
            // Acha as marcas desse setor
            const marcasDoSetor = resMarcas.data.filter(m => m.setor_id === setor.id).map(m => m.id)
            // Acha os produtos dessas marcas
            const produtosDoSetor = resProd.data.filter(p => marcasDoSetor.includes(p.marca_id))
            
            if (produtosDoSetor.length > 0) {
              const custo = produtosDoSetor.reduce((acc, p) => acc + (p.preco_custo * p.estoque), 0)
              const venda = produtosDoSetor.reduce((acc, p) => acc + (p.preco_venda * p.estoque), 0)
              const lucro = venda - custo

              valuation.push({
                setor: setor.nome,
                custoTotal: custo,
                lucroProjetado: lucro
              })
            }
          })
        }

        setEstoqueFinanceiro(valuation)
        setTurnos(caixas || [])
        setVendas(vendasData)

      } catch (error) {
        console.error("Erro ao carregar financeiro:", error)
      } finally {
        setCarregando(false)
      }
    }

    carregarDadosFinanceiros()
  }, [])

  // Funções Auxiliares de Formatação
  const formatarDataHora = (isoString) => {
    if (!isoString) return 'Agora'
    const date = new Date(isoString)
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`
  }

  const toggleExpandir = (vendaId) => {
    if (vendaExpandida === vendaId) setVendaExpandida(null)
    else setVendaExpandida(vendaId)
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in">
      
      <header className="mb-8">
        <button onClick={() => navigate('/admin-home')} className="text-blue-600 font-bold mb-2">← Voltar ao Painel</button>
        <h1 className="text-3xl font-bold text-gray-800">Visão Financeira</h1>
        <p className="text-gray-500">Gestão de capital em estoque e fechamento de turnos.</p>
      </header>

      {carregando ? (
        <div className="text-center py-20 text-gray-500 font-bold">Calculando valores...</div>
      ) : (
        <div className="space-y-10">
          
          {/* ==========================================
              SESSÃO 1: VALUATION DO ESTOQUE
              ========================================== */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              📦 Capital no Estoque
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {estoqueFinanceiro.map((val, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <h3 className="font-bold text-gray-700 uppercase tracking-wide text-sm mb-4">{val.setor}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end border-b border-gray-50 pb-2">
                      <span className="text-gray-500 text-sm">Custo Pago</span>
                      <span className="font-bold text-gray-800">R$ {val.custoTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-end pt-1">
                      <span className="text-gray-500 text-sm">Lucro ao Vender</span>
                      <span className="font-bold text-blue-600 text-lg">R$ {val.lucroProjetado.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {estoqueFinanceiro.length === 0 && (
                <p className="text-gray-400 p-4 border-2 border-dashed rounded-xl col-span-3">Nenhum produto com estoque e valor cadastrado.</p>
              )}
            </div>
          </section>

          {/* ==========================================
              SESSÃO 2: RESUMO DOS TURNOS (CAIXAS)
              ========================================== */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🔒 Fechamento de Caixas (Turnos)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {turnos.map(turno => {
                // Filtra as vendas apenas deste turno
                const vendasDoTurno = vendas.filter(v => v.sessao_id === turno.id)
                const total = vendasDoTurno.reduce((acc, v) => acc + Number(v.total), 0)
                
                return (
                  <div key={turno.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    {/* Barra indicadora de status */}
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${turno.status === 'aberto' ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                    
                    <div className="pl-4">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">
                        Caixa da {turno.operador} {turno.status === 'aberto' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-2 align-middle">Em andamento</span>}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Aberto dia {formatarDataHora(turno.aberto_em)}
                        <br/>
                        Fechado {turno.status === 'aberto' ? 'ainda não' : formatarDataHora(turno.fechado_em)}
                      </p>

                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-gray-600 font-medium">Total vendido:</span>
                        <span className="text-2xl font-bold text-green-600">R$ {total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {turnos.length === 0 && <p className="text-gray-400 col-span-2">Nenhum turno registrado recentemente.</p>}
            </div>
          </section>

          {/* ==========================================
              SESSÃO 3: EXTRATO DE VENDAS
              ========================================== */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🧾 Extrato Detalhado
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {vendas.length === 0 ? (
                <p className="p-8 text-center text-gray-500">Nenhuma venda nas sessões recentes.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {vendas.map(venda => {
                    // Encontra quem era o operador
                    const turnoDaVenda = turnos.find(t => t.id === venda.sessao_id)
                    const nomeOperador = turnoDaVenda ? turnoDaVenda.operador : 'Desconhecido'
                    
                    // Formata a tag de pagamento
                    const isPix = venda.metodo_pagamento === 'pix'
                    const isDin = venda.metodo_pagamento === 'dinheiro'
                    
                    return (
                      <div key={venda.id} className="flex flex-col">
                        {/* CABEÇALHO DA VENDA (LINHA CLICÁVEL) */}
                        <div 
                          onClick={() => toggleExpandir(venda.id)}
                          className="flex justify-between items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <button className="text-gray-400 hover:text-blue-600 bg-gray-100 p-1.5 rounded-lg">
                              {vendaExpandida === venda.id ? <MinusIcon /> : <PlusIcon />}
                            </button>
                            <div>
                              <p className="font-bold text-gray-800">R$ {Number(venda.total).toFixed(2)}</p>
                              <p className="text-xs text-gray-500">
                                Por {nomeOperador} · {new Date(venda.criado_em).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider ${isPix ? 'bg-purple-100 text-purple-700' : isDin ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {venda.metodo_pagamento}
                            </span>
                          </div>
                        </div>

                        {/* ITENS DA VENDA (EXPANSÍVEL) */}
                        {vendaExpandida === venda.id && (
                          <div className="bg-gray-50 p-4 pl-14 border-t border-dashed border-gray-200 animate-in slide-in-from-top-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Itens da Sacola</h4>
                            <ul className="space-y-2">
                              {venda.vendas_itens && venda.vendas_itens.map(item => (
                                <li key={item.id} className="flex justify-between text-sm">
                                  <span className="text-gray-700">{item.quantidade}x {item.nome}</span>
                                  <span className="font-medium text-gray-800">R$ {(item.quantidade * item.preco_venda).toFixed(2)}</span>
                                </li>
                              ))}
                              {(!venda.vendas_itens || venda.vendas_itens.length === 0) && (
                                <li className="text-sm text-gray-400 italic">Itens não registrados.</li>
                              )}
                            </ul>
                            {isDin && Number(venda.troco) > 0 && (
                              <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                                <span>Valor Recebido: R$ {Number(venda.valor_recebido).toFixed(2)}</span>
                                <span>Troco Devolvido: R$ {Number(venda.troco).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

        </div>
      )}
    </div>
  )
}