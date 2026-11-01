import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function InstalacaoBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Previne o banner padrão automático do Chrome (se houver)
      e.preventDefault()
      // Guarda o evento para disparar quando o usuário clicar no nosso botão
      setDeferredPrompt(e)
      setVisivel(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Força a abertura da janela nativa de instalação do Android/PWA
    deferredPrompt.prompt()

    // Aguarda a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('Usuário aceitou a instalação do PWA')
    }
    
    // Limpa o prompt para não reutilizar
    setDeferredPrompt(null)
    setVisivel(false)
  }

  if (!visivel) return null

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[999] max-w-md mx-auto bg-[#1D1D1F] text-white p-5 rounded-3xl shadow-2xl border border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
          <Download size={22} />
        </div>
        <div>
          <h4 className="font-bold text-base leading-tight">Instalar Volte!Sempre</h4>
          <p className="text-xs text-gray-400 mt-0.5">Acesse em tela cheia sem barras de navegação.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95 shrink-0"
        >
          Instalar
        </button>
        <button
          onClick={() => setVisivel(false)}
          className="text-gray-400 hover:text-white p-2 rounded-xl"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}