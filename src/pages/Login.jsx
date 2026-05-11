import { useState } from 'react'

export default function Login() {
  // A "memória" da tela: começa na seleção ('selecao'), 
  // mas pode mudar para 'funcionario', 'dono_login' ou 'dono_cadastro'
  const [telaAtual, setTelaAtual] = useState('selecao')
  
  // Memória para mostrar o aviso do trabalhador
  const [mostrarAviso, setMostrarAviso] = useState(false)

  // --- TELA 1: OS QUADRADOS DE SELEÇÃO ---
  if (telaAtual === 'selecao') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Bem-vindo ao Sistema</h2>
        
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {/* Quadrado 1: Funcionário */}
          <button 
            onClick={() => setTelaAtual('funcionario')}
            className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 font-bold py-6 rounded-xl shadow-sm transition-all transform hover:scale-105"
          >
            Entrar como Funcionário
          </button>

          {/* Quadrado 2: Dono */}
          <button 
            onClick={() => setTelaAtual('dono_login')}
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 font-bold py-6 rounded-xl shadow-sm transition-all transform hover:scale-105"
          >
            Já tenho sistema, entrar como dono
          </button>

          {/* Quadrado 3: Criar Sistema (Menor e mais discreto) */}
          <button 
            onClick={() => setTelaAtual('dono_cadastro')}
            className="mt-4 text-gray-500 hover:text-blue-600 font-medium text-sm underline underline-offset-4 transition-colors"
          >
            Não tenho sistema, criar meu sistema
          </button>
        </div>
      </div>
    )
  }

  // --- TELA 2: LOGIN DO FUNCIONÁRIO ---
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
          
          <button type="button" className="bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors mt-2">
            Acessar PDV
          </button>

          {/* Botão de criar perfil que gera o aviso */}
          <button 
            type="button" 
            onClick={() => setMostrarAviso(true)}
            className="text-sm text-gray-500 hover:text-gray-700 mt-4 underline"
          >
            Criar perfil de funcionário
          </button>

          {/* O Aviso que aparece apenas se ele clicar no botão acima */}
          {mostrarAviso && (
            <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-800 rounded-r-md">
              <span className="font-bold">Olá Trabalhador,</span> em nosso sistema, apenas o responsável pela loja tem autorização para criar perfis.
            </div>
          )}
        </form>

        <button onClick={() => setTelaAtual('selecao')} className="mt-8 text-gray-500 hover:text-gray-800 font-medium">
          ← Voltar para o início
        </button>
      </div>
    )
  }

  // --- TELA 3 e 4: ESPAÇOS PARA O DONO (Faremos depois) ---
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        {telaAtual === 'dono_login' ? 'Acesso do Administrador' : 'Crie seu Sistema'}
      </h2>
      <p className="text-gray-600 mb-8">Esta tela será conectada ao Supabase em breve.</p>
      <button onClick={() => setTelaAtual('selecao')} className="text-blue-600 hover:text-blue-800 font-bold">
        ← Voltar
      </button>
    </div>
  )
}