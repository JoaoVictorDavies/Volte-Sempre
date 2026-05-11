import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Cabeçalho Fixo */}
      <header className="bg-white shadow-md py-4 px-8 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-600">VOLTE Perfumaria</Link>
        <nav>
          <Link to="/login" className="text-gray-600 hover:text-blue-600 font-medium">Entrar</Link>
        </nav>
      </header>

      {/* Conteúdo Dinâmico (Aqui entram a Home, o Login, etc) */}
      <main className="flex-grow flex flex-col">
        <Outlet /> 
      </main>

      {/* Rodapé Fixo */}
      <footer className="bg-gray-800 text-white text-center py-4 mt-auto">
        <p>&copy; 2026 VOLTE Perfumaria. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}