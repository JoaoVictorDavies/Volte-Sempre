import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [telaAtual, setTelaAtual] = useState('selecao')
  const [mostrarAviso, setMostrarAviso] = useState(false)
  const navigate = useNavigate() // Ferramenta para mudar de página

  if (telaAtual === 'selecao') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Identifique-se</h2>
        
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button 
            onClick={() => setTelaAtual('funcionario')}
            className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 font-bold py-6 rounded-xl shadow-sm transition-all"
          >
            Entrar como: VOLTE-Vendedor
          </button>

          <button 
            onClick={() => navigate('/admin-home')} // Direciona para a nova Home
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 font-bold py-6 rounded-xl shadow-sm transition-all"
          >
            Entrar como VOLTE-Administrador
          </button>

          <button 
            onClick={() => setTelaAtual('dono_cadastro')}
            className="mt-4 text-gray-500 hover:text-blue-600 font-medium text-sm underline"
          >
            Não tenho sistema, criar meu sistema
          </button>
        </div>
      </div>
    )
  }

  // ... (mantenha o restante do código da tela de funcionário igual ao anterior)
  return (
    <div className="flex flex-col items-center justify-center py-20">
       <button onClick={() => setTelaAtual('selecao')} className="text-blue-600 underline">Voltar</button>
    </div>
  )
}