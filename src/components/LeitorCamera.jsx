import { useEffect, useState, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, Zap } from 'lucide-react'

export default function LeitorCamera({ onSucesso, onFechar }) {
  const [iniciando, setIniciando] = useState(true)
  const [erro, setErro] = useState(null)
  const scannerRef = useRef(null)
  const divId = "leitor-camera-volte"

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(divId)
    scannerRef.current = html5QrCode

    const iniciarCamera = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Câmera traseira
          {
            fps: 10,
            // qrbox dinâmico: se adapta a qualquer tela de celular
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const width = Math.min(viewfinderWidth * 0.8, 300);
              return { width: width, height: 150 };
            },
            // Sem aspectRatio forçado para não esmagar a imagem no modo retrato
          },
          (codigoDecodificado) => {
            if (navigator.vibrate) navigator.vibrate(100)
            onSucesso(codigoDecodificado)
          },
          () => {} // Ignora erros de frame vazio
        )
        setIniciando(false)
      } catch (err) {
        setErro("Não foi possível acessar a câmera. Verifique as permissões.")
        setIniciando(false)
      }
    }

    iniciarCamera()

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [])

  return (
    <div className="absolute inset-0 bg-black flex flex-col overflow-hidden">
      
      {/* Força o vídeo do html5-qrcode a se comportar como um app nativo */}
      <style>{`
        #${divId} video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 0 !important;
        }
        #${divId} {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
        }
      `}</style>

      {/* CABEÇALHO FLUTUANTE */}
      <header className="absolute top-0 inset-x-0 p-6 flex justify-between items-center text-white z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <Camera size={24} className="text-blue-400" />
          <h2 className="font-bold text-lg tracking-wide shadow-black drop-shadow-md">Scanner</h2>
        </div>
        <button onClick={onFechar} className="p-2 bg-black/40 backdrop-blur-md hover:bg-red-500/80 rounded-full transition-colors">
          <X size={24} />
        </button>
      </header>

      {/* ÁREA DA CÂMERA */}
      <div className="flex-1 relative">
        {iniciando && !erro && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white bg-black">
            <Zap size={40} className="text-yellow-400 mb-4 animate-pulse" />
            <p className="font-bold animate-pulse">Ligando o laser...</p>
          </div>
        )}

        {erro ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black p-6">
            <div className="bg-red-500/20 border border-red-500 p-6 rounded-2xl text-white text-center max-w-sm">
              <p className="font-bold mb-2">Erro na Câmera</p>
              <p className="text-sm opacity-80">{erro}</p>
            </div>
          </div>
        ) : (
          <div id={divId} className="w-full h-full absolute inset-0"></div>
        )}
      </div>

      {/* RODAPÉ FLUTUANTE */}
      <div className="absolute bottom-10 inset-x-0 z-50 flex justify-center pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full text-white text-center border border-white/10">
          <p className="text-sm font-bold tracking-wider uppercase text-blue-400">Aponte para o Código</p>
        </div>
      </div>
    </div>
  )
}