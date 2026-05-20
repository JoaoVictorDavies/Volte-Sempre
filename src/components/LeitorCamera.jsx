import { useEffect, useState, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, Zap } from 'lucide-react'

export default function LeitorCamera({ onSucesso, onFechar }) {
  const [iniciando, setIniciando] = useState(true)
  const [erro, setErro] = useState(null)
  
  const scannerRef = useRef(null)
  const travaRef = useRef(false) // ← A NOSSA TRAVA DE GATILHO
  
  const divId = "leitor-camera-volte"

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(divId)
    scannerRef.current = html5QrCode

    const iniciarCamera = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10, // Baixamos para 10 para poupar bateria sem perder a mágica
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
            disableFlip: false
          },
          (codigoDecodificado) => {
            // SE A TRAVA ESTIVER BAIXADA, IGNORA COMPLETAMENTE AS OUTRAS LEITURAS
            if (travaRef.current) return;
            travaRef.current = true; // Baixa a trava na primeira leitura bem-sucedida!

            if (navigator.vibrate) navigator.vibrate(100)
            
            pararCamera()
            onSucesso(codigoDecodificado)
          },
          () => {
            // Ignora silenciosamente os frames que não contém códigos
          }
        )
        setIniciando(false)
      } catch (err) {
        setErro("Não foi possível acessar a câmera. Verifique as permissões.")
        setIniciando(false)
      }
    }

    iniciarCamera()

    return () => {
      pararCamera()
    }
  }, [])

  const pararCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(console.error)
    }
  }

  const handleFechar = () => {
    pararCamera()
    onFechar()
  }

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <header className="p-6 flex justify-between items-center text-white relative z-10">
        <div className="flex items-center gap-2">
          <Camera size={24} className="text-blue-400" />
          <h2 className="font-bold text-lg tracking-wide">Escaneamento Rápido</h2>
        </div>
        <button onClick={handleFechar} className="p-2 bg-white/10 hover:bg-red-500/80 rounded-full transition-colors">
          <X size={24} />
        </button>
      </header>

      <div className="flex-1 flex flex-col justify-center items-center p-4 relative">
        {iniciando && !erro && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white animate-pulse">
            <Zap size={40} className="text-yellow-400 mb-4" />
            <p className="font-bold">Aquecendo o laser...</p>
          </div>
        )}

        {erro ? (
          <div className="bg-red-500/20 border border-red-500 p-6 rounded-2xl text-white text-center max-w-sm">
            <p className="font-bold mb-2">Erro na Câmera</p>
            <p className="text-sm opacity-80">{erro}</p>
          </div>
        ) : (
          <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-3xl shadow-2xl border-4 border-white/10 bg-black">
            <div id={divId} className="w-full min-h-[300px]"></div>
          </div>
        )}

        <div className="mt-8 text-center text-white/70 max-w-xs mx-auto">
          <p>Aponte a câmera para o código de barras.</p>
          <p className="text-xs mt-2 opacity-50">O sistema fará a leitura automaticamente.</p>
        </div>
      </div>
    </div>
  )
}