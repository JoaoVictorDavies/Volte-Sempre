import { useState } from 'react'
import { Check, X, ShoppingBag } from 'lucide-react'
import LeitorCamera from './LeitorCamera'

export default function LeitorInterativo({ catalogo, aoConfirmar, aoFechar }) {
  const [produtoDetectado, setProdutoDetectado] = useState(null)

  // Intercepta o que a câmera leu e procura no catálogo
  const handleCodigoEscaneado = (codigo) => {
    const produtoAchado = catalogo.find(p => p.codigo_barras === codigo)
    if (produtoAchado) {
      setProdutoDetectado(produtoAchado)
    } else {
      alert(`Código ${codigo} não localizado.`)
      setProdutoDetectado(null)
    }
  }

  // Quando o usuário aperta "OK (Add)"
  const confirmar = () => {
    aoConfirmar(produtoDetectado)
    setProdutoDetectado(null) // Reseta e reabre a câmera
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black/40 flex flex-col justify-between">
      
      {/* Se não tem produto detectado, mostra a câmera */}
      {!produtoDetectado ? (
        <LeitorCamera 
          onSucesso={handleCodigoEscaneado} 
          onFechar={aoFechar} 
        />
      ) : (
        /* Se detectou, sobrepõe com a interface de confirmação */
        <div className="fixed inset-0 z-[600] bg-black/80 flex flex-col justify-center items-center p-6 animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center border border-gray-100">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-4">
              <ShoppingBag size={28} />
            </div>
            
            <h3 className="font-mono text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Produto Detectado</h3>
            <h2 className="font-bold text-gray-800 text-xl leading-snug mb-1 px-2 line-clamp-2">{produtoDetectado.nome}</h2>
            <p className="text-2xl font-extrabold text-green-600 mb-6">R$ {Number(produtoDetectado.preco_venda).toFixed(2)}</p>

            <div className="flex gap-3">
              <button 
                onClick={() => setProdutoDetectado(null)} 
                className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <X size={18} /> Pular
              </button>
              <button 
                onClick={confirmar} 
                className="flex-1 py-4 font-bold text-white bg-green-500 rounded-xl hover:bg-green-600 shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Check size={18} /> OK (Ação)
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Botão de segurança para abortar tudo */}
      <button 
        onClick={aoFechar}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold px-8 py-4 rounded-full z-[550] shadow-xl hover:bg-red-700 transition-all text-base tracking-wide"
      >
        Finalizar e Voltar
      </button>
    </div>
  )
}