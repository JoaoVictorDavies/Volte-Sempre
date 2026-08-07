import { useState, useRef } from 'react'
import { Check, X, ShoppingBag, ArrowLeft } from 'lucide-react'
import LeitorCamera from './LeitorCamera'

export default function LeitorInterativo({ catalogo, aoConfirmar, aoFechar }) {
  const [produtoDetectado, setProdutoDetectado] = useState(null)
  
  // ESSE É O LEITOR PARA CAIXA. AQUI VAI FICAR O BIPADOR DE CODIGO DE BARRAS
  // A Trava do Gatilho! Se for true, a câmera ignora as leituras.
  const travaRef = useRef(false) 

  const handleCodigoEscaneado = (codigo) => {
    // Se a trava está ativa, ignora a leitura!
    if (travaRef.current) return;
    
    // Baixa a trava imediatamente!
    travaRef.current = true;

    const produtoAchado = catalogo.find(p => p.codigo_barras === codigo)
    
    if (produtoAchado) {
      setProdutoDetectado(produtoAchado)
    } else {
      alert(`Código ${codigo} não localizado.`)
      // Libera a trava depois de 1 segundo para tentar ler outro produto
      setTimeout(() => { travaRef.current = false }, 1000)
    }
  }

  const confirmar = () => {
    aoConfirmar(produtoDetectado)
    setProdutoDetectado(null) 
    // Libera a trava pra ler o próximo
    setTimeout(() => { travaRef.current = false }, 400) 
  }

  const ignorar = () => {
    setProdutoDetectado(null)
    // Libera a trava pra ler o próximo
    setTimeout(() => { travaRef.current = false }, 400) 
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black">
      
      {/* A CÂMERA FICA SEMPRE LIGADA NO FUNDO, NUNCA DESMONTA */}
      <LeitorCamera 
        onSucesso={handleCodigoEscaneado} 
        onFechar={aoFechar} 
      />
      
      {/* SE ACHOU O PRODUTO, DESCE O POP-UP POR CIMA DA CÂMERA */}
      {produtoDetectado && (
        <div className="absolute inset-0 z-[600] bg-black/85 backdrop-blur-sm flex flex-col justify-center items-center p-6 animate-in zoom-in-95 duration-150">
          
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center border border-gray-100 relative">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-5 shadow-inner">
              <ShoppingBag size={32} />
            </div>
            
            <h3 className="font-mono text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Produto Detectado</h3>
            <h2 className="font-bold text-gray-800 text-2xl leading-snug mb-2 px-2 line-clamp-2">{produtoDetectado.nome}</h2>
            <p className="text-3xl font-extrabold text-green-600 mb-8">R$ {Number(produtoDetectado.preco_venda).toFixed(2)}</p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmar} 
                className="w-full py-5 font-bold text-white bg-green-500 rounded-xl hover:bg-green-600 shadow-xl shadow-green-500/30 transition-all flex items-center justify-center gap-2 text-lg active:scale-95"
              >
                <Check size={24} /> Confirmar e Adicionar
              </button>
              
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button 
                  onClick={ignorar} 
                  className="py-4 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <X size={18} /> Ignorar
                </button>
                <button 
                  onClick={aoFechar} 
                  className="py-4 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <ArrowLeft size={18} /> Ver Caixa
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}