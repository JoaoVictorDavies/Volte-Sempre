import { useEffect, useRef } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import OneSignal from 'react-onesignal'

import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import AuthCallback from './pages/AuthCallback'
import Home from './pages/Home'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
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

function AppRoutes() {
  const { profile } = useAuth()
  const oneSignalStarted = useRef(false)

  useEffect(() => {
    if (!profile || oneSignalStarted.current) return

    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID
    if (!appId) {
      console.warn('OneSignal App ID não encontrado no .env.')
      return
    }

    oneSignalStarted.current = true
    const iniciarOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: String(appId).trim(),
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: true },
        })
        await OneSignal.Slidedown.promptPush()
      } catch (error) {
        console.error('Erro ao iniciar OneSignal:', error)
      }
    }

    iniciarOneSignal()
  }, [profile])

  return (
    <>
      {profile && <InstalacaoBanner />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={<Onboarding />} />

        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/admin-home" element={<AdminHome />} />
            <Route path="/cadastro-produto" element={<CadastroProduto />} />
            <Route path="/registro-ia" element={<RegistroIA />} />
            <Route path="/organizacao-catalogo" element={<OrganizacaoCatalogo />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/teste-impressora" element={<TesteImpressora />} />
            <Route path="/equipe" element={<Equipe />} />
            <Route path="/caixa" element={<CaixaHome />} />
          </Route>
          <Route path="/pdv" element={<Pdv />} />
          <Route path="/fiado" element={<Fiado />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
