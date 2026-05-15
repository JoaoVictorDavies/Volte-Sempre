import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import runOneSignal from './services/onesignal'
import Estoque from './pages/Estoque'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import AdminHome from './pages/AdminHome'
import CadastroProduto from './pages/CadastroProduto'
import CadastroPrecisao from './pages/CadastroPrecisao'
import FuncionarioHome from './pages/FuncionarioHome'
import Pdv from './pages/Pdv'
import Financeiro from './pages/Financeiro'
import TesteImpressora from './pages/TesteImpressora'
export default function App() {
  // Verifica na memória do celular/PC se a pessoa já colocou a senha global antes
  const [acessoGlobal, setAcessoGlobal] = useState(
    localStorage.getItem('acesso_global_volte') === 'liberado'
  )
  
  const [senhaInput, setSenhaInput] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    runOneSignal();
  }, []);

  // Função da catraca global (BLINDADA CONTRA ERROS DO VERCEL E ESPAÇOS)
  const liberarAcesso = (e) => {
    e.preventDefault()
    
    // Força a variável do .env a ser uma string, tira qualquer aspa perdida e remove espaços
    const senhaCorreta = String(import.meta.env.VITE_SENHA_GLOBAL || '').replace(/["']/g, '').trim()
    const senhaDigitada = senhaInput.trim() // Tira espaços caso você tenha digitado sem querer

    // Se a senha do .env não foi encontrada pelo Vite, avisa no erro
    if (!senhaCorreta || senhaCorreta === 'undefined') {
      setErro('Erro do servidor: Senha global não configurada no Vercel.')
      return
    }

    if (senhaDigitada === senhaCorreta) {
      localStorage.setItem('acesso_global_volte', 'liberado') // Salva na memória
      setAcessoGlobal(true)
    } else {
      setErro('Senha global incorreta.')
    }
  }

  // SE NÃO TEM ACESSO, MOSTRA APENAS A TELA DE BLOQUEIO (Não carrega as rotas)
  if (!acessoGlobal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
        <h1 className="text-3xl font-bold text-blue-600 mb-2">VOLTE | Perfumaria</h1>
        <p className="text-gray-500 mb-8">Sistema restrito. Insira a chave de acesso.</p>
        
        <form onSubmit={liberarAcesso} className="flex flex-col gap-4 w-full max-w-sm bg-white p-8 rounded-xl shadow-md border border-gray-200">
          <input 
            type="password" 
            placeholder="Senha Global" 
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg"
            autoFocus
          />
          {erro && <p className="text-red-500 text-sm text-center font-bold">{erro}</p>}
          <button 
            type="submit" 
            className="bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors mt-2 shadow-sm"
          >
            Desbloquear Sistema
          </button>
        </form>
      </div>
    )
  }

  // SE TEM ACESSO, CARREGA O SISTEMA NORMALMENTE
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          {/* Rotas do Admin */}
<Route path="/admin-home" element={<AdminHome />} />
<Route path="/cadastro-produto" element={<CadastroProduto />} />
<Route path="/cadastro-precisao" element={<CadastroPrecisao />} />
<Route path="/estoque" element={<Estoque />} />
<Route path="/financeiro" element={<Financeiro />} />
<Route path="/teste-impressora" element={<TesteImpressora />} />
          {/* Rotas do Funcionário */}
          <Route path="/funcionario-home" element={<FuncionarioHome />} />
        </Route>
        
        {/* PDV (Fora do layout para usar a tela cheia e girar no celular) */}
        <Route path="/pdv" element={<Pdv />} />
        
        {/* Se digitar uma rota que não existe, manda de volta pra Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}