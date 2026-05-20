import { useState } from 'react'
import { Check, X, ShoppingBag, ArrowLeft } from 'lucide-react'
import LeitorCamera from './LeitorCamera'

export default function LeitorInterativo({ catalogo, aoConfirmar, aoFechar }) {
  const [produtoDetectado, setProdutoDetectado] = useState(null)
  
  // Usamos isso para forçar a câmera a remontar fresquinha após um OK
  const [chaveCamera, setChaveCamera] = useState(0) 

  const handleCodigoEscaneado = (codigo) => {
    const produtoAchado = catalogo.find(p => p.codigo_barras === codigo)
    if (produtoAchado) {
      setProdutoDetectado(produtoAchado)
    } else {
      alert(`Código ${codigo} não localizado no catálogo.`)
      // Força a câmera a reabrir do zero se não achar o código
      setChaveCamera(prev => prev + 1)
    }
  }

  const confirmar = () => {
    aoConfirmar(produtoDetectado)
    setProdutoDetectado(null) 
    setChaveCamera(prev => prev + 1) // Reinicia a câmera para o próximo produto
  }

  const ignorar = () => {
    setProdutoDetectado(null)
    setChaveCamera(prev => prev + 1) // Reinicia a câmera sem adicionar nada
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black/40 flex flex-col justify-between">
      
      {!produtoDetectado ? (
        <LeitorCamera 
          key={chaveCamera} // A mágica que reinicia a câmera zerada
          onSucesso={handleCodigoEscaneado} 
          onFechar={aoFechar} 
        />
      ) : (
        <div className="fixed inset-0 z-[600] bg-black/80 flex flex-col justify-center items-center p-6 animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center border border-gray-100">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-4">
              <ShoppingBag size={28} />
            </div>
            
            <h3 className="font-mono text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Produto Detectado</h3>
            <h2 className="font-bold text-gray-800 text-xl leading-snug mb-1 px-2 line-clamp-2">{produtoDetectado.nome}</h2>
            <p className="text-2xl font-extrabold text-green-600 mb-6">R$ {Number(produtoDetectado.preco_venda).toFixed(2)}</p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmar} 
                className="w-full py-4 font-bold text-white bg-green-500 rounded-xl hover:bg-green-600 shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Check size={18} /> Confirmar e Adicionar
              </button>
              
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button 
                  onClick={ignorar} 
                  className="py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <X size={18} /> Ignorar
                </button>
                <button 
                  onClick={aoFechar} 
                  className="py-3 font-bold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={18} /> Voltar ao Caixa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}