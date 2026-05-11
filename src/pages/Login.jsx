import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function Login() {
  const navigate = useNavigate()
  
  // Etapas: 'selecao' -> 'admin'
  const [etapa, setEtapa] = useState('selecao') 
  const [senhaInput, setSenhaInput] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  // VALIDAÇÃO DO PIN DE ADMIN (SUPABASE)
  const verificarPinAdmin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('pin_admin')
        .limit(1)
        .single()

      if (error) throw error

      if (data && data.pin_admin === senhaInput) {
         navigate('/admin-home')
      } else {
         setErro('PIN incorreto.')
      }
    } catch (error) {
      console.error(error)
      setErro('Erro ao verificar PIN. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  // --- TELA 1: SELEÇÃO DE PERFIL ---
  if (etapa === 'selecao') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Identifique-se</h2>
        
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {/* Vai direto para a Home do Vendedor */}
          <button 
            onClick={() => navigate('/funcionario-home')}
            className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 font-bold py-6 rounded-xl shadow-sm transition-all"
          >
            Entrar como: Volte-VENDEDOR
          </button>

          {/* Vai para a catraca do PIN do Administrador */}
          <button 
            onClick={() => setEtapa('admin')} 
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 font-bold py-6 rounded-xl shadow-sm transition-all"
          >
            Entrar como: Volte-ADMINISTRADOR
          </button>
        </div>
      </div>
    )
  }

  // --- TELA 2: PIN DO ADMINISTRADOR ---
  if (etapa === 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
        <p className="text-gray-500 mb-8">Digite o PIN do Administrador.</p>
        
        <form onSubmit={verificarPinAdmin} className="flex flex-col gap-4 w-full max-w-sm bg-white p-8 rounded-xl shadow-md border border-gray-100">
          <input 
            type="password" 
            placeholder="PIN Numérico" 
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800 text-center text-2xl tracking-[0.5em]"
            maxLength={6}
            autoFocus
          />
          {erro && <p className="text-red-500 text-sm text-center font-bold">{erro}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className={`font-bold py-3 rounded-md transition-colors mt-2 text-white ${loading ? 'bg-gray-400' : 'bg-gray-800 hover:bg-black shadow-lg'}`}
          >
            {loading ? 'Verificando...' : 'Acessar Painel'}
          </button>
        </form>

        <button 
          onClick={() => {
            setEtapa('selecao')
            setSenhaInput('')
            setErro('')
          }} 
          className="mt-8 text-gray-500 hover:text-gray-800 font-medium"
        >
          ← Voltar para seleção
        </button>
      </div>
    )
  }

  return null;
}