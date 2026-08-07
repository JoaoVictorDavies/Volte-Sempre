import { useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import imageCompression from 'browser-image-compression'
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react'

export default function UploadFotoProduto({ produtoId, urlAtual, onUploadConcluido }) {
  const [carregando, setCarregando] = useState(false)
  const fileInputRef = useRef(null)

  const handleAbrirOpcoes = (e) => {
    e.stopPropagation() // Evita que a gaveta do estoque feche
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
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
      // Adicionamos a data para que, se ele trocar a foto, o link mude e o celular não puxe do cache antigo
      const fileName = `${produtoId}_${Date.now()}.jpg`

      // 3. UPLOAD PARA O SUPABASE (Bucket: produtos)
      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false // False pois o timestamp no nome já garante que é único
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
      // Reseta o input para permitir selecionar a mesma foto caso dê erro
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* INPUT INVISÍVEL QUE CHAMA A CÂMERA/GALERIA NATIVA DO CELULAR */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
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
        // ESTADO: COM FOTO
        <div 
          onClick={handleAbrirOpcoes}
          className="relative w-28 h-28 rounded-2xl overflow-hidden border border-gray-200 shadow-sm cursor-pointer group"
        >
          <img 
            src={urlAtual} 
            alt="Produto" 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={24} className="text-white drop-shadow-md" />
          </div>
        </div>
      ) : (
        // ESTADO: SEM FOTO (Vazio)
        <button
          onClick={handleAbrirOpcoes}
          className="w-28 h-28 bg-[#F5F5F7] hover:bg-gray-200 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors focus:outline-none"
        >
          <div className="flex -space-x-2 text-gray-400">
            <ImageIcon size={20} className="bg-[#F5F5F7] rounded-full ring-2 ring-[#F5F5F7]" />
            <Camera size={20} className="bg-[#F5F5F7] rounded-full ring-2 ring-[#F5F5F7]" />
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Adicionar<br/>Foto</span>
        </button>
      )}
    </div>
  )
}