import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import OneSignal from 'react-onesignal' 

import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import AdminHome from './pages/AdminHome'
import CadastroProduto from './pages/CadastroProduto'
import RegistroIA from './pages/RegistroIA'
import OrganizacaoCatalogo from './pages/OrganizacaoCatalogo'
import Estoque from './pages/Estoque'
import Financeiro from './pages/Financeiro'
import TesteImpressora from './pages/TesteImpressora'
import Equipe from './pages/Equipe'
import CaixaHome from './pages/CaixaHome'
import Pdv from './pages/Pdv'
import Fiado from './pages/Fiado'
import InstalacaoBanner from './components/InstalacaoBanner' 

export default function App() {
  // Verifica na memória do celular/PC se a pessoa já colocou a senha global antes
  const [acessoGlobal, setAcessoGlobal] = useState(
    localStorage.getItem('acesso_global_volte') === 'liberado'
  )
  
  const [senhaInput, setSenhaInput] = useState('')
  const [erro, setErro] = useState('')

  // ==========================================
  // INICIALIZAÇÃO DO ONESIGNAL VIA .ENV
  // ==========================================
  useEffect(() => {
    const iniciarOneSignal = async () => {
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      
      // Proteção: Se esquecer de colocar no .env, avisa no log e não quebra o app
      if (!appId || appId === 'undefined') {
        console.warn("⚠️ OneSignal App ID não encontrado no .env!");
        return;
      }

      try {
        await OneSignal.init({
          appId: String(appId).trim(), 
          allowLocalhostAsSecureOrigin: true, // Permite testar no localhost
          notifyButton: {
            enable: true, // Adiciona o sininho no canto da tela
          },
        });
        
        // Pede a permissão pro usuário assim que ele entra
        OneSignal.Slidedown.promptPush();
      } catch (error) {
        console.error("Erro ao iniciar OneSignal:", error);
      }
    };

    iniciarOneSignal();
  }, []);

  // Função da catraca global (BLINDADA CONTRA ERROS DO VERCEL E ESPAÇOS)
  const liberarAcesso = (e) => {
    e.preventDefault()
    
    const senhaCorreta = String(import.meta.env.VITE_SENHA_GLOBAL || '').replace(/["']/g, '').trim()
    const senhaDigitada = senhaInput.trim() 

    if (!senhaCorreta || senhaCorreta === 'undefined') {
      setErro('Erro do servidor: Senha global não configurada no Vercel.')
      return
    }

    if (senhaDigitada === senhaCorreta) {
      localStorage.setItem('acesso_global_volte', 'liberado') 
      setAcessoGlobal(true)
    } else {
      setErro('Senha global incorreta.')
    }
  }

  // SE NÃO TEM ACESSO, MOSTRA APENAS A TELA DE BLOQUEIO
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
      <InstalacaoBanner />

      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          {/* Rotas do Admin */}
          <Route path="/admin-home" element={<AdminHome />} />
          <Route path="/cadastro-produto" element={<CadastroProduto />} />
          <Route path="/registro-ia" element={<RegistroIA />} />
          <Route path="/organizacao-catalogo" element={<OrganizacaoCatalogo />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/teste-impressora" element={<TesteImpressora />} />
          <Route path="/equipe" element={<Equipe />} />
          
          {/* Rotas do Funcionário (Caixa) */}
          <Route path="/caixa" element={<CaixaHome />} />
        </Route>
        
        {/* Telas Fullscreen */}
        <Route path="/pdv" element={<Pdv />} />
        <Route path="/fiado" element={<Fiado />} /> 
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}