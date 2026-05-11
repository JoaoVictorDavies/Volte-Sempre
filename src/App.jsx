import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import runOneSignal from './services/onesignal'
import Pdv from './pages/Pdv'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import AdminHome from './pages/AdminHome'
import CadastroProduto from './pages/CadastroProduto'
import CadastroPrecisao from './pages/CadastroPrecisao'
import FuncionarioHome from './pages/FuncionarioHome'

export default function App() {
  
  useEffect(() => {
    runOneSignal();
  }, []);

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
          
          {/* Rotas do Funcionário */}
          <Route path="/funcionario-home" element={<FuncionarioHome />} />
          <Route path="/pdv" element={<Pdv />} />
          {/* Rotas Futuras (Vamos criar essas páginas em seguida) */}
          {/* <Route path="/pdv" element={<Pdv />} /> */}
          {/* <Route path="/estoque" element={<Estoque />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}