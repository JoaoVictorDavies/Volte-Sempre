import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import runOneSignal from './services/onesignal'

// Importação das suas páginas e componentes
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import AdminHome from './pages/AdminHome'
import CadastroProduto from './pages/CadastroProduto'
import CadastroPrecisao from './pages/CadastroPrecisao'

export default function App() {
  
  useEffect(() => {
    runOneSignal();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* O Layout envolve todas as rotas para garantir que o Cabeçalho e Rodapé apareçam */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-home" element={<AdminHome />} />
          <Route path="/cadastro-produto" element={<CadastroProduto />} />
          <Route path="/cadastro-precisao" element={<CadastroPrecisao />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}