import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [telaAtual, setTelaAtual] = useState('selecao')
  const [mostrarAviso, setMostrarAviso] = useState(false)
  const navigate = useNavigate()

  // --- TELA 1: SELEÇÃO DE PERFIL ---
  if (telaAtual === 'selecao') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Identifique-se</h2>
        
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button 
            onClick={() => setTelaAtual('funcionario')}
            className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 font-bold py-6 rounded-xl shadow-sm transition-all"
          >
            Entrar como: Volte-VENDEDOR
          </button>

          <button 
            onClick={() => navigate('/admin-home')} 
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 font-bold py-6 rounded-xl shadow-sm transition-all"
          >
            Entrar como: Volte-ADMINISTRADOR
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

  // --- TELA 2: LOGIN DO VENDEDOR ---
  if (telaAtual === 'funcionario') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-2xl font-bold text-blue-700 mb-6">Acesso do Caixa</h2>
        
        <form className="flex flex-col gap-4 w-full max-w-sm bg-white p-8 rounded-xl shadow-md border border-gray-200">
          <input 
            type="text" 
            placeholder="Seu Login" 
            className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="password" 
            placeholder="Sua Senha" 
            className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* BOTÃO QUE DIRECIONA O VENDEDOR PARA A TELA DELE */}
          <button 
            type="button" 
            onClick={() => navigate('/funcionario-home')}
            className="bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors mt-2"
          >
            Acessar PDV
          </button>

          {/* Botão de aviso */}
          <button 
            type="button" 
            onClick={() => setMostrarAviso(true)}
            className="text-sm text-gray-500 hover:text-gray-700 mt-4 underline"
          >
            Criar perfil de funcionário
          </button>

          {/* O Aviso que aparece */}
          {mostrarAviso && (
            <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-800 rounded-r-md">
              <span className="font-bold">Olá Trabalhador,</span> em nosso sistema, apenas o responsável pela loja tem autorização para criar perfis.
            </div>
          )}
        </form>

        <button onClick={() => setTelaAtual('selecao')} className="mt-8 text-gray-500 hover:text-gray-800 font-medium">
          ← Voltar para seleção
        </button>
      </div>
    )
  }

  // --- TELA 3: CRIAR SISTEMA (ESPAÇO RESERVADO) ---
  if (telaAtual === 'dono_cadastro') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Crie seu Sistema</h2>
        <p className="text-gray-600 mb-8">Esta tela será conectada ao Supabase em breve.</p>
        <button onClick={() => setTelaAtual('selecao')} className="text-blue-600 hover:text-blue-800 font-bold">
          ← Voltar
        </button>
      </div>
    )
  }

  return null;
}