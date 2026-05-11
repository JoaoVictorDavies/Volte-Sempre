import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <h1 className="text-4xl font-bold text-blue-600 mb-2">VOLTE | Perfumaria</h1>
      <h2 className="text-2xl font-semibold text-gray-800">Bem-vindo ao sistema VOLTE</h2>
      
      <p className="mt-6 text-lg text-gray-600 italic">
        "Deus abençoe a sua jornada de trabalho"
      </p>

      <Link 
        to="/login" 
        className="mt-10 px-10 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105"
      >
        Entrar no sistema
      </Link>
    </div>
  )
}