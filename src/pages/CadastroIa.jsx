import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import imageCompression from 'browser-image-compression'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Barcode, Camera, CheckCircle, PackagePlus, Loader2, Sparkles, DollarSign, Hash } from 'lucide-react'
import LeitorCamera from '../components/LeitorCamera'

// Inicializa a IA do Google (Ajuste para import.meta.env se usar Vite, ou process.env se usar Create React App)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY 
const genAI = new GoogleGenerativeAI(apiKey)

export default function CadastroIA() {
  const navigate = useNavigate()

  // Controle de Fluxo
  const [etapa, setEtapa] = useState(1) // 1: Código de Barras | 2: Foto/IA | 3: Revisão
  const [carregando, setCarregando] = useState(false)
  const [statusIA, setStatusIA] = useState('') // Mensagens para animar a espera
  const [sucesso, setSucesso] = useState(false)

  // Leitor de Código de Barras
  const [cameraBarcodeAtiva, setCameraBarcodeAtiva] = useState(false)
  
  // Referência para o input invisível da câmera da embalagem
  const cameraFotoRef = useRef(null)

  // Dados do Produto
  const [dados, setDados] = useState({
    codigoBarras: '',
    nome: '',
    marcaSugerida: '',
    setorSugerido: '',
    precoVenda: '',
    estoque: '',
    arquivoFotoOriginal: null, // Guardamos o arquivo para subir pro Supabase só no final
    fotoPreview: null // Base64 para mostrar na tela
  })

  // === PASSO 1: LER O CÓDIGO DE BARRAS ===
  const handleBarcodeSucesso = (codigo) => {
    setDados(prev => ({ ...prev, codigoBarras: codigo }))
    setCameraBarcodeAtiva(false)
    setEtapa(2) // Avança para pedir a foto
  }

  // === PASSO 2: TIRAR A FOTO E MANDAR PRA I.A. ===
  const handleCapturarFoto = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setCarregando(true)
    setStatusIA('Comprimindo imagem...')

    try {
      // 1. Comprime a imagem para não gastar dados do celular
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/jpeg' }
      const compressedFile = await imageCompression(file, options)
      
      // Guarda no state para preview e para o upload final
      setDados(prev => ({ 
        ...prev, 
        arquivoFotoOriginal: compressedFile,
        fotoPreview: URL.createObjectURL(compressedFile)
      }))

      // 2. Prepara a imagem para a Inteligência Artificial (Base64)
      setStatusIA('Enviando para a Inteligência Artificial...')
      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.readAsDataURL(compressedFile)
        reader.onloadend = () => resolve(reader.result.split(',')[1])
      })

      const imagePart = {
        inlineData: { data: base64Data, mimeType: "image/jpeg" },
      }

      // 3. Chama o Gemini
      setStatusIA('Lendo rótulo e extraindo dados...')
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      
      const prompt = `
        Você é um assistente de perfumaria experiente. Analise a imagem desta embalagem.
        Extraia as informações principais e retorne APENAS um objeto JSON estrito (sem crases, sem formatação markdown, sem explicações extras).
        O JSON deve conter exatamente estas 3 chaves:
        "nome": o nome completo do produto junto com o volume (ex: Malbec Black Desodorante Colônia 100ml).
        "marca": a marca principal do produto (ex: O Boticário, Natura, Eudora).
        "setor": sugira um setor simples (ex: Perfumaria, Corpo e Banho, Maquiagem).
      `

      const result = await model.generateContent([prompt, imagePart])
      const responseText = result.response.text()

      // 4. Limpa a resposta da IA (Tira as crases ```json que ela as vezes coloca)
      const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
      const jsonIA = JSON.parse(cleanJsonText)

      setDados(prev => ({
        ...prev,
        nome: jsonIA.nome || '',
        marcaSugerida: jsonIA.marca || '',
        setorSugerido: jsonIA.setor || ''
      }))

      setEtapa(3) // Vai para a tela de revisão
    } catch (error) {
      console.error("Erro na IA:", error)
      alert("Não foi possível ler a imagem. Tire uma foto mais nítida ou com boa iluminação.")
    } finally {
      setCarregando(false)
      setStatusIA('')
      if (cameraFotoRef.current) cameraFotoRef.current.value = ''
    }
  }

  // === PASSO 3: FINALIZAR (Upload + Banco de Dados) ===
  const finalizarCadastro = async () => {
    if (!dados.nome || !dados.estoque || !dados.precoVenda) {
      alert("Preencha o Nome, Estoque e Preço de Venda!")
      return
    }

    setCarregando(true)
    setStatusIA('Salvando produto no sistema...')
    
    try {
      let imageUrlFinal = null

      // 1. Faz o Upload da foto para o Supabase Storage
      if (dados.arquivoFotoOriginal) {
        setStatusIA('Enviando foto para a nuvem...')
        const fileName = `ia_${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(fileName, dados.arquivoFotoOriginal)

        if (uploadError) throw uploadError

        const { data: publicData } = supabase.storage.from('produtos').getPublicUrl(fileName)
        imageUrlFinal = publicData.publicUrl
      }

      setStatusIA('Registrando no banco de dados...')
      
      // 2. Tenta achar ou criar o Setor e a Marca para relacionar certinho (Lógica Simplificada)
      // Nota: Num cenário real completo, poderíamos deixar o usuário selecionar do banco se a IA errar.
      // Aqui vamos salvar direto na tabela produtos, você pode adaptar para cruzar com seus IDs.

      const { data: novoProduto, error: erroProd } = await supabase.from('produtos').insert([{
        nome: dados.nome,
        codigo_barras: dados.codigoBarras || null,
        preco_venda: parseFloat(dados.precoVenda) || 0,
        estoque: parseInt(dados.estoque) || 0,
        imagem_url: imageUrlFinal,
        tipo: 'solo'
      }]).select().single()

      if (erroProd) throw erroProd

      // 3. Salva no estoque_lotes
      const { error: erroLote } = await supabase.from('estoque_lotes').insert([{
        produto_id: novoProduto.id,
        quantidade_inicial: parseInt(dados.estoque) || 0,
        quantidade_atual: parseInt(dados.estoque) || 0,
        preco_custo: 0, // Pode adicionar campo de custo se desejar
        status: 'ativo'
      }])

      if (erroLote) throw erroLote

      setSucesso(true)
    } catch (error) {
      alert('Erro ao cadastrar: ' + error.message)
    } finally {
      setCarregando(false)
      setStatusIA('')
    }
  }

  // TELA DE SUCESSO
  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} 
          className="w-full max-w-sm bg-white rounded-3xl p-10 text-center shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={34} className="text-green-500" />
            </div>
          </div>
          <h2 className="font-bold text-[#1D1D1F] text-2xl mb-2">Mágica Feita!</h2>
          <p className="text-[#86868B] text-sm mb-10">Produto cadastrado e foto vinculada com sucesso.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/estoque')} className="w-full py-4 bg-[#1D1D1F] text-white font-bold rounded-2xl shadow-lg hover:bg-black transition-colors">
              Ver no Estoque
            </button>
            <button onClick={() => { setSucesso(false); setEtapa(1); setDados({codigoBarras:'', nome:'', precoVenda:'', estoque:'', fotoPreview: null}) }} className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors">
              Cadastrar Outro
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // TELA DE CARREGAMENTO (Da IA ou do Upload)
  if (carregando) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-xs w-full text-center">
          <Sparkles size={40} className="text-blue-500 mb-6 animate-pulse" />
          <Loader2 size={32} className="text-gray-300 animate-spin absolute" />
          <h3 className="font-bold text-gray-800 text-lg mb-2 mt-4">Processando...</h3>
          <p className="text-sm text-gray-500 font-medium animate-pulse">{statusIA}</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center px-4 py-10 relative">
      
      {/* HEADER */}
      <div className="w-full max-w-md mb-8 flex justify-between items-center px-2">
        <button onClick={() => navigate('/admin-home')} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-1.5">
          <Sparkles size={16} /> Cadastro Inteligente
        </span>
        <div className="w-9" /> {/* Espaçador */}
      </div>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">

          {/* =======================================
              ETAPA 1: CÓDIGO DE BARRAS
              ======================================= */}
          {etapa === 1 && (
            <motion.div key="e1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6 shadow-inner">
                <Barcode size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 tracking-tight">Código do Produto</h2>
              <p className="text-gray-500 text-sm mb-8">Vamos começar vinculando o código de barras da embalagem.</p>
              
              <button 
                onClick={() => setCameraBarcodeAtiva(true)}
                className="w-full py-5 font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg"
              >
                <Camera size={24} /> Bipar Código
              </button>
              
              <button onClick={() => setEtapa(2)} className="mt-6 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors underline-offset-4 hover:underline">
                Pular esta etapa
              </button>
            </motion.div>
          )}

          {/* =======================================
              ETAPA 2: FOTO PARA A INTELIGÊNCIA ARTIFICIAL
              ======================================= */}
          {etapa === 2 && (
            <motion.div key="e2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mx-auto mb-6 shadow-inner">
                <Sparkles size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 tracking-tight">Ler Embalagem</h2>
              <p className="text-gray-500 text-sm mb-8">Tire uma foto nítida da frente do produto. A IA fará o resto.</p>

              {/* Input escondido da câmera */}
              <input 
                type="file" accept="image/*" capture="environment" 
                ref={cameraFotoRef} onChange={handleCapturarFoto} className="hidden" 
              />
              
              <button 
                onClick={() => cameraFotoRef.current?.click()}
                className="w-full py-5 font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl shadow-purple-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg"
              >
                <Camera size={24} /> Tirar Foto do Rótulo
              </button>

              <button onClick={() => setEtapa(1)} className="mt-6 text-sm text-gray-400 font-bold flex items-center justify-center gap-1 mx-auto hover:text-gray-600 transition-colors">
                <ArrowLeft size={16} /> Voltar
              </button>
            </motion.div>
          )}

          {/* =======================================
              ETAPA 3: REVISÃO E VALORES
              ======================================= */}
          {etapa === 3 && (
            <motion.div key="e3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-5 tracking-tight flex items-center gap-2">
                <Sparkles size={20} className="text-purple-600" /> Revisão da IA
              </h2>

              <div className="flex gap-4 mb-6 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <img src={dados.fotoPreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl shadow-sm" />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-0.5">Nome LIDO</p>
                  <input 
                    type="text" value={dados.nome} onChange={e => setDados({...dados, nome: e.target.value})}
                    className="w-full font-bold text-gray-800 text-sm bg-transparent border-b-2 border-transparent focus:border-purple-400 outline-none pb-1"
                  />
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md font-bold truncate">{dados.marcaSugerida || 'Sem Marca'}</span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md font-bold truncate">{dados.setorSugerido || 'Sem Setor'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {/* Quantidade */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wide pl-1">Estoque Inicial</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Hash size={18} /></div>
                    <input type="number" inputMode="numeric" placeholder="Ex: 5" value={dados.estoque} onChange={e => setDados({...dados, estoque: e.target.value})}
                      className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 pl-11 pr-4 font-bold text-lg outline-none focus:bg-white focus:border-blue-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Preço de Venda */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wide pl-1">Preço de Venda (R$)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><DollarSign size={18} /></div>
                    <input type="number" inputMode="decimal" placeholder="0,00" value={dados.precoVenda} onChange={e => setDados({...dados, precoVenda: e.target.value})}
                      className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 pl-11 pr-4 font-bold text-lg outline-none focus:bg-white focus:border-blue-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={finalizarCadastro}
                className="w-full py-5 font-bold text-white bg-[#1D1D1F] rounded-2xl hover:bg-black shadow-xl shadow-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg"
              >
                <PackagePlus size={22} /> Salvar Produto
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* MODAL DA CÂMERA DO CÓDIGO DE BARRAS */}
      {cameraBarcodeAtiva && (
        <div className="fixed inset-0 z-[100] bg-black">
          <LeitorCamera onSucesso={handleBarcodeSucesso} onFechar={() => setCameraBarcodeAtiva(false)} />
        </div>
      )}

    </div>
  )
}