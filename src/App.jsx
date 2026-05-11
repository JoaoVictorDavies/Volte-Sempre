// No topo do App.jsx adicione o import:
import CadastroProduto from './pages/CadastroProduto'
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import runOneSignal from './services/onesignal'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'

export default function App() {
  
  useEffect(() => {
    runOneSignal();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* O Layout envolve todas as rotas que estão dentro dele */}
        <Route path="/cadastro-produto" element={<CadastroProduto />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}