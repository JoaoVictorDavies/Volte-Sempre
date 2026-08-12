import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import imageCompression from 'browser-image-compression'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Barcode, Camera, CheckCircle, PackagePlus, Loader2, Sparkles, DollarSign, Hash } from 'lucide-react'
import LeitorCamera from '../components/LeitorCamera'

// Inicializa a IA do Google
const apiKey = import.meta.env.VITE_GEMINI_API_KEY 
// Só inicializa o genAI se a chave existir para evitar quebrar logo de cara
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

// Função utilitária para converter textos/números com vírgula para formato de banco de dados (ex: "10,50" -> 10.50)
const parseNumber = (value) => {
  if (!value) return 0
  const stringValue = String(value).replace(',', '.')
  return parseFloat(stringValue) || 0
}

// Função utilitária para normalizar strings (tirar acentos, deixar minúsculo)
const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : ''

export default function CadastroIA() {
  const navigate = useNavigate()

  // Banco de Dados
  const [setoresDoBanco, setSetoresDoBanco] = useState([])
  const [marcasDoBanco, setMarcasDoBanco] = useState([])

  // Controle de Fluxo
  const [etapa, setEtapa] = useState(1) 
  const [carregando, setCarregando] = useState(false)
  const [statusIA, setStatusIA] = useState('') 
  const [sucesso, setSucesso] = useState(false)

  // Leitor
  const [cameraBarcodeAtiva, setCameraBarcodeAtiva] = useState(false)
  const cameraFotoRef = useRef(null)

  // Dados do Produto
  const [dados, setDados] = useState({
    codigoBarras: '',
    nome: '',
    setorId: '',
    marcaId: '',
    precoCusto: '',
    precoVenda: '',
    estoque: '',
    arquivoFotoOriginal: null,
    fotoPreview: null 
  })

  // Carrega Setores e Marcas
  useEffect(() => {
    async function carregarEstrutura() {
      try {
        const [resSetores, resMarcas] = await Promise.all([
          supabase.from('setores').select('*'),
          supabase.from('marcas').select('*')
        ])
        
        if (resSetores.error) {
            alert("ERRO SUPABASE (Setores): " + resSetores.error.message)
        } else {
            setSetoresDoBanco(resSetores.data || [])
        }

        if (resMarcas.error) {
            alert("ERRO SUPABASE (Marcas): " + resMarcas.error.message)
        } else {
            setMarcasDoBanco(resMarcas.data || [])
        }
      } catch (error) {
        alert("ERRO GERAL AO CARREGAR BANCO: " + error.message)
        console.error("Erro ao carregar dados do banco:", error)
      }
    }
    carregarEstrutura()
  }, [])

  // === PASSO 1: LER O CÓDIGO DE BARRAS ===
  const handleBarcodeSucesso = (codigo) => {
    setDados(prev => ({ ...prev, codigoBarras: codigo }))
    setCameraBarcodeAtiva(false)
    setEtapa(2)
  }

  // === PASSO 2: TIRAR A FOTO E MANDAR PRA I.A. ===
  const handleCapturarFoto = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setCarregando(true)

    try {
      if (!apiKey || apiKey === 'undefined') {
        alert("DIAGNÓSTICO 1 (FALHA): A chave VITE_GEMINI_API_KEY não foi encontrada.")
        throw new Error("Sem API Key")
      }

      setStatusIA('Comprimindo imagem...')
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/jpeg' }
      let compressedFile;
      
      try {
        compressedFile = await imageCompression(file, options)
      } catch (err) {
        alert("DIAGNÓSTICO 2 (FALHA): Erro ao tentar comprimir a imagem. Detalhe: " + err.message)
        throw err
      }
      
      setDados(prev => ({ 
        ...prev, 
        arquivoFotoOriginal: compressedFile,
        fotoPreview: URL.createObjectURL(compressedFile)
      }))

      setStatusIA('Convertendo imagem para a IA...')
      let base64Data;
      try {
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(compressedFile)
          reader.onloadend = () => resolve(reader.result.split(',')[1])
          reader.onerror = (error) => reject(error)
        })
      } catch (err) {
        alert("DIAGNÓSTICO 3 (FALHA): Erro ao converter a imagem para Base64. Detalhe: " + err.message)
        throw err
      }

      const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
      
      // MODELO ATUALIZADO AQUI
      console.log("Iniciando modelo <gemini-2></gemini-2>.5-flash...")
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
      
      setStatusIA('Enviando para a Inteligência Artificial...')
      const prompt = `
        Você é um assistente de perfumaria experiente. Analise a imagem desta embalagem.
        Extraia as informações e retorne APENAS um objeto JSON válido.
        O JSON deve conter exatamente estas 3 chaves:
        "nome": o nome completo do produto com volume (ex: Malbec Black Desodorante Colônia 100ml).
        "marca": a marca principal do produto (ex: O Boticário, Natura, Eudora).
        "setor": sugira o setor (ex: Perfumaria, Corpo e Banho, Maquiagem).
      `

      let result;
      try {
        console.log("Fazendo requisição para a API do Google...")
        result = await model.generateContent([prompt, imagePart])
      } catch (err) {
        alert("DIAGNÓSTICO 4 (FALHA NA API DO GOOGLE): Ocorreu um erro na requisição para o Gemini.\n\nMensagem do Google: " + err.message)
        console.error("Erro completo do Gemini:", err)
        throw err
      }
      
      setStatusIA('Lendo resposta...')
      const responseText = result.response.text()
      console.log("Resposta bruta da IA:", responseText)

      // Regex para garantir que só vamos pegar o JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        try {
          const jsonIA = JSON.parse(jsonMatch[0])

          // Auto-Match Inteligente
          let matchedSetorId = ''
          let matchedMarcaId = ''
          const iaSetor = normalize(jsonIA.setor)
          const iaMarca = normalize(jsonIA.marca)

          const setorEncontrado = setoresDoBanco.find(s => normalize(s.nome).includes(iaSetor) || iaSetor.includes(normalize(s.nome)))
          
          if (setorEncontrado) {
            matchedSetorId = setorEncontrado.id
            const marcaEncontrada = marcasDoBanco.find(m => m.setor_id === matchedSetorId && (normalize(m.nome).includes(iaMarca) || iaMarca.includes(normalize(m.nome))))
            if (marcaEncontrada) matchedMarcaId = marcaEncontrada.id
          }

          setDados(prev => ({
            ...prev,
            nome: jsonIA.nome || '',
            setorId: matchedSetorId,
            marcaId: matchedMarcaId
          }))
        } catch (err) {
          alert(`DIAGNÓSTICO 5 (JSON INVÁLIDO): A IA respondeu, mas falhou ao tentar transformar a resposta em JSON. Erro: ${err.message}`)
          throw err
        }
      } else {
        alert(`DIAGNÓSTICO 6 (SEM JSON): A IA não retornou um JSON.\n\nResposta: ${responseText}`)
        throw new Error("Formato de resposta da IA inválido.")
      }

    } catch (error) {
      console.error("Erro final capturado na IA:", error)
    } finally {
      setCarregando(false)
      setStatusIA('')
      setEtapa(3) 
      if (cameraFotoRef.current) cameraFotoRef.current.value = ''
    }
  }

  // === PASSO 3: FINALIZAR ===
  const finalizarCadastro = async () => {
    if (!dados.nome || dados.estoque === '' || dados.precoVenda === '' || !dados.setorId || !dados.marcaId) {
      alert("Atenção! Verifique se Nome, Setor, Marca, Estoque e Preço de Venda estão preenchidos.")
      return
    }

    setCarregando(true)
    setStatusIA('Salvando produto no sistema...')
    
    try {
      let imageUrlFinal = null
      let fileName = null

      if (dados.arquivoFotoOriginal) {
        setStatusIA('Enviando foto para a nuvem...')
        fileName = `ia_${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage.from('produtos').upload(fileName, dados.arquivoFotoOriginal)
        if (uploadError) {
            alert("ERRO SUPABASE (Upload Imagem): " + uploadError.message)
            throw uploadError
        }
        const { data: publicData } = supabase.storage.from('produtos').getPublicUrl(fileName)
        imageUrlFinal = publicData.publicUrl
      }

      setStatusIA('Registrando no banco de dados...')
      
      const { data: novoProduto, error: erroProd } = await supabase.from('produtos').insert([{
        nome: dados.nome,
        codigo_barras: dados.codigoBarras || null,
        marca_id: dados.marcaId,
        preco_venda: parseNumber(dados.precoVenda),
        preco_custo: parseNumber(dados.precoCusto),
        estoque: parseInt(dados.estoque, 10) || 0,
        imagem_url: imageUrlFinal,
        tipo: 'solo'
      }]).select().single()

      if (erroProd) {
        alert("ERRO SUPABASE (Insert Produto): " + erroProd.message)
        throw erroProd
      }

      const { error: erroLote } = await supabase.from('estoque_lotes').insert([{
        produto_id: novoProduto.id,
        quantidade_inicial: parseInt(dados.estoque, 10) || 0,
        quantidade_atual: parseInt(dados.estoque, 10) || 0,
        preco_custo: parseNumber(dados.precoCusto),
        status: 'ativo'
      }])

      if (erroLote) {
        await supabase.from('produtos').delete().match({ id: novoProduto.id });
        if (fileName) await supabase.storage.from('produtos').remove([fileName]);
        alert("ERRO SUPABASE (Insert Lote/Estoque): " + erroLote.message)
        throw erroLote
      }

      setSucesso(true)
    } catch (error) {
      console.error(error)
      alert('Resumo do Erro ao cadastrar: ' + error.message)
    } finally {
      setCarregando(false)
      setStatusIA('')
    }
  }

  const marcasDisponiveis = marcasDoBanco.filter(m => m.setor_id === dados.setorId)

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm bg-white rounded-3xl p-10 text-center shadow-xl">
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
            <button onClick={() => { setSucesso(false); setEtapa(1); setDados({codigoBarras:'', nome:'', setorId:'', marcaId:'', precoCusto:'', precoVenda:'', estoque:'', fotoPreview: null, arquivoFotoOriginal: null}) }} className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors">
              Cadastrar Outro
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-xs w-full text-center">
          <Sparkles size={40} className="text-fuchsia-500 mb-6 animate-pulse" />
          <Loader2 size={32} className="text-gray-200 animate-spin absolute" />
          <h3 className="font-bold text-gray-800 text-lg mb-2 mt-4">Processando...</h3>
          <p className="text-sm text-gray-500 font-medium animate-pulse">{statusIA}</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center px-4 py-10 relative">
      <div className="w-full max-w-md mb-8 flex justify-between items-center px-2">
        <button onClick={() => navigate('/admin-home')} disabled={carregando} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-purple-600 flex items-center gap-1.5">
          <Sparkles size={16} /> Registro I.A.
        </span>
        <div className="w-9" />
      </div>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">

          {/* ETAPA 1 */}
          {etapa === 1 && (
            <motion.div key="e1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6 shadow-inner">
                <Barcode size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 tracking-tight">Código do Produto</h2>
              <p className="text-gray-500 text-sm mb-8">Vamos começar vinculando o código de barras da embalagem.</p>
              
              <button onClick={() => setCameraBarcodeAtiva(true)} className="w-full py-5 font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg">
                <Camera size={24} /> Bipar Código
              </button>
              
              <button onClick={() => setEtapa(2)} className="mt-6 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors underline-offset-4 hover:underline">
                Pular esta etapa
              </button>
            </motion.div>
          )}

          {/* ETAPA 2 */}
          {etapa === 2 && (
            <motion.div key="e2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-600 mx-auto mb-6 shadow-inner">
                <Sparkles size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 tracking-tight">Ler Embalagem</h2>
              <p className="text-gray-500 text-sm mb-8">Tire uma foto nítida da frente do produto. A IA fará o resto.</p>

              <input type="file" accept="image/*" capture="environment" ref={cameraFotoRef} onChange={handleCapturarFoto} className="hidden" />
              
              <button onClick={() => cameraFotoRef.current?.click()} className="w-full py-5 font-bold text-white bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-2xl shadow-xl shadow-fuchsia-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg">
                <Camera size={24} /> Tirar Foto do Rótulo
              </button>

              <button onClick={() => setEtapa(1)} className="mt-6 text-sm text-gray-400 font-bold flex items-center justify-center gap-1 mx-auto hover:text-gray-600 transition-colors">
                <ArrowLeft size={16} /> Voltar
              </button>
            </motion.div>
          )}

          {/* ETAPA 3 */}
          {etapa === 3 && (
            <motion.div key="e3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 pb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-5 tracking-tight flex items-center gap-2">
                <Sparkles size={20} className="text-fuchsia-600" /> Revisão da IA
              </h2>

              {/* FOTO E NOME */}
              <div className="flex gap-4 mb-6 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                {dados.fotoPreview ? (
                  <img src={dados.fotoPreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl shadow-sm" />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400"><Camera size={24}/></div>
                )}
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-xs font-bold text-fuchsia-600 uppercase tracking-widest mb-0.5">Nome do Produto</p>
                  <input 
                    type="text" 
                    placeholder="Ex: Malbec 100ml"
                    value={dados.nome} 
                    onChange={e => setDados({...dados, nome: e.target.value})}
                    className="w-full font-bold text-gray-800 text-sm bg-transparent border-b-2 border-transparent focus:border-fuchsia-400 outline-none pb-1"
                  />
                </div>
              </div>

              <div className="space-y-4 mb-8">
                
                {/* SETOR E MARCA */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide pl-1">Setor</label>
                    <select 
                      value={dados.setorId} 
                      onChange={e => setDados({...dados, setorId: e.target.value, marcaId: ''})} 
                      className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 px-3 font-semibold text-sm outline-none focus:bg-white focus:border-blue-400 transition-colors"
                    >
                      <option value="">Selecione...</option>
                      {setoresDoBanco.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide pl-1">Marca</label>
                    <select 
                      value={dados.marcaId} 
                      onChange={e => setDados({...dados, marcaId: e.target.value})}
                      disabled={!dados.setorId}
                      className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 px-3 font-semibold text-sm outline-none focus:bg-white focus:border-blue-400 transition-colors disabled:opacity-50"
                    >
                      <option value="">Selecione...</option>
                      {marcasDisponiveis.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                  </div>
                </div>

                {/* VALORES */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide pl-1">Qtd</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Hash size={14} /></div>
                      <input type="number" inputMode="numeric" placeholder="0" value={dados.estoque} onChange={e => setDados({...dados, estoque: e.target.value})}
                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 pl-8 pr-2 font-bold text-sm outline-none focus:bg-white focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide pl-1">Custo</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><DollarSign size={14} /></div>
                      <input type="text" inputMode="decimal" placeholder="0,00" value={dados.precoCusto} onChange={e => setDados({...dados, precoCusto: e.target.value})}
                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 pl-8 pr-2 font-bold text-sm outline-none focus:bg-white focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide pl-1">Venda</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500"><DollarSign size={14} /></div>
                      <input type="text" inputMode="decimal" placeholder="0,00" value={dados.precoVenda} onChange={e => setDados({...dados, precoVenda: e.target.value})}
                        className="w-full h-12 bg-gray-50 border border-green-200 rounded-xl text-gray-800 pl-8 pr-2 font-bold text-sm outline-none focus:bg-green-50 focus:border-green-400"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <button 
                onClick={finalizarCadastro}
                disabled={carregando}
                className="w-full py-5 font-bold text-white bg-[#1D1D1F] rounded-2xl hover:bg-black shadow-xl shadow-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <PackagePlus size={22} /> Salvar Produto
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {cameraBarcodeAtiva && (
        <div className="fixed inset-0 z-[100] bg-black">
          <LeitorCamera onSucesso={handleBarcodeSucesso} onFechar={() => setCameraBarcodeAtiva(false)} />
        </div>
      )}
    </div>
  )
}