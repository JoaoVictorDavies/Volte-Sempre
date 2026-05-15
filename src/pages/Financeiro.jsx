import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function Financeiro() {
  const navigate = useNavigate()
  const [vendasHoje, setVendasHoje] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarFinanceiro() {
      // Pega a data de hoje à meia-noite para filtrar
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      try {
        const { data, error } = await supabase
          .from('vendas')
          .select('*, caixa_sessoes(operador)')
          .gte('criado_em', hoje.toISOString())
          .order('criado_em', { ascending: false })

        if (!error) setVendasHoje(data || [])
      } catch (error) {
        console.error("Erro ao buscar vendas:", error)
      } finally {
        setCarregando(false)
      }
    }
    carregarFinanceiro()
  }, [])

  // Cálculos do dia
  const totalGeral = vendasHoje.reduce((acc, v) => acc + Number(v.total), 0)
  const totalPix = vendasHoje.filter(v => v.metodo_pagamento === 'pix').reduce((acc, v) => acc + Number(v.total), 0)
  const totalCartao = vendasHoje.filter(v => ['credito', 'debito'].includes(v.metodo_pagamento)).reduce((acc, v) => acc + Number(v.total), 0)
  const totalDinheiro = vendasHoje.filter(v => v.metodo_pagamento === 'dinheiro').reduce((acc, v) => acc + Number(v.total), 0)

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in">
      <header className="mb-8">
        <button onClick={() => navigate('/admin-home')} className="text-blue-600 font-bold mb-2">← Voltar ao Painel</button>
        <h1 className="text-3xl font-bold text-gray-800">Fechamento e Financeiro</h1>
        <p className="text-gray-500">Acompanhe as vendas do dia e os caixas abertos.</p>
      </header>

      {/* MÉTRICAS DO DIA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-bold uppercase">Total do Dia</p>
          <p className="text-3xl font-bold text-green-600">R$ {totalGeral.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-bold uppercase">Em Dinheiro</p>
          <p className="text-2xl font-bold text-gray-800">R$ {totalDinheiro.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-bold uppercase">No Pix</p>
          <p className="text-2xl font-bold text-gray-800">R$ {totalPix.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-bold uppercase">Cartões</p>
          <p className="text-2xl font-bold text-gray-800">R$ {totalCartao.toFixed(2)}</p>
        </div>
      </div>

      {/* LISTA DE VENDAS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">Extrato de Vendas de Hoje</h2>
        </div>
        
        {carregando ? (
          <p className="p-8 text-center text-gray-500">Carregando...</p>
        ) : vendasHoje.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Nenhuma venda registrada hoje.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-sm uppercase bg-white border-b">
                <th className="p-4">Hora</th>
                <th className="p-4">Operador</th>
                <th className="p-4">Método</th>
                <th className="p-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendasHoje.map(venda => (
                <tr key={venda.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-600">{new Date(venda.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="p-4 font-medium text-gray-800">{venda.caixa_sessoes?.operador || 'Sistema'}</td>
                  <td className="p-4 capitalize text-gray-600">{venda.metodo_pagamento}</td>
                  <td className="p-4 font-bold text-green-600 text-right">R$ {Number(venda.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}