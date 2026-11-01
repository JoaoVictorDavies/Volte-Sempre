import { useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import imageCompression from 'browser-image-compression'
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useAuth } from '../context/useAuth'

export default function UploadFotoProduto({ produtoId, urlAtual, onUploadConcluido }) {
  const { profile } = useAuth()
  const [carregando, setCarregando] = useState(false)
  const cameraInputRef = useRef(null)
  const galeriaInputRef = useRef(null)

  const processarArquivo = async (file) => {
    if (!file) return

    setCarregando(true)
    try {
      // 1. COMPRESSÃO EXTREMA (Padrão Apple de otimização)
      const options = {
        maxSizeMB: 0.15, // Máximo de 150kb
        maxWidthOrHeight: 800, // Corta para no máximo 800px
        useWebWorker: true,
        fileType: 'image/jpeg'
      }
      
      const compressedFile = await imageCompression(file, options)

      // 2. NOME ÚNICO E LIMPO
      const fileName = `${produtoId}_${Date.now()}.jpg`

      // 3. UPLOAD PARA O SUPABASE (Bucket: produtos)
      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // 4. PEGAR O LINK PÚBLICO
      const { data: publicData } = supabase.storage
        .from('produtos')
        .getPublicUrl(fileName)

      const publicUrl = publicData.publicUrl

      // 5. SALVAR NA TABELA DE PRODUTOS
      const { error: updateError } = await supabase
        .from('produtos')
        .update({ imagem_url: publicUrl })
        .eq('id', produtoId)
        .eq('loja_id', profile.loja_id)

      if (updateError) throw updateError

      // 6. SUCESSO! Avisa a tela pai
      if (onUploadConcluido) {
        onUploadConcluido(publicUrl)
      }

    } catch (error) {
      console.error("Erro no upload da foto:", error)
      alert("Falha ao salvar a foto. Tente novamente.")
    } finally {
      setCarregando(false)
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) processarArquivo(file)
    event.target.value = '' // Reseta para permitir reuso
  }

  return (
    <div className="flex flex-col items-center">
      {/* INPUT 1: Força a Câmera diretamente */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* INPUT 2: Abre a Galeria / Arquivos */}
      <input
        type="file"
        accept="image/*"
        ref={galeriaInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {carregando ? (
        // ESTADO: CARREGANDO
        <div className="w-28 h-28 bg-gray-100 rounded-2xl flex flex-col items-center justify-center border border-gray-200 shadow-inner">
          <Loader2 size={24} className="text-blue-500 animate-spin mb-2" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enviando...</span>
        </div>
      ) : urlAtual ? (
        // ESTADO: COM FOTO (Mostra a foto e botões compactos embaixo para alterar)
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <img 
              src={urlAtual} 
              alt="Produto" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-1.5 w-full">
            <button
              onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
              className="flex-1 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
              title="Tirar nova foto com a câmera"
            >
              <Camera size={13} /> Câmera
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); galeriaInputRef.current?.click(); }}
              className="flex-1 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
              title="Escolher da galeria"
            >
              <ImageIcon size={13} /> Galeria
            </button>
          </div>
        </div>
      ) : (
        // ESTADO: SEM FOTO (Dois botões claros: Câmera ou Galeria)
        <div className="flex flex-col gap-2 w-28">
          <button
            onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-sm transition-colors"
            title="Tirar foto com a câmera"
          >
            <Camera size={18} />
            <span className="text-[9px] font-bold tracking-wider uppercase">Câmera</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); galeriaInputRef.current?.click(); }}
            className="w-full h-9 bg-[#F5F5F7] hover:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center gap-1 transition-colors text-xs font-bold"
            title="Escolher da galeria"
          >
            <ImageIcon size={13} /> Galeria
          </button>
        </div>
      )}
    </div>
  )
}