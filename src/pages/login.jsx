export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Acesse sua conta</h2>
      
      <form className="flex flex-col gap-4 w-full max-w-sm bg-white p-8 rounded-lg shadow-md border border-gray-200">
        <input 
          type="email" 
          placeholder="Seu e-mail" 
          className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <input 
          type="password" 
          placeholder="Sua senha" 
          className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <button 
          type="button" 
          className="bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors mt-2"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}