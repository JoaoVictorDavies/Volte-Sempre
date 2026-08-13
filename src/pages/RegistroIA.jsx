import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import imageCompression from 'browser-image-compression'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Barcode, Camera, CheckCircle, PackagePlus, Loader2, Sparkles, DollarSign, Hash, Package, Boxes, Globe } from 'lucide-react'
import LeitorCamera from '../components/LeitorCamera'
import RegistroIALote from '../components/RegistroIALote'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY 
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

const parseNumber = (value) => {
  if (!value) return 0
  const stringValue = String(value).replace(',', '.')
  return parseFloat(stringValue) || 0
}

const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : ''

// ==========================================
// CONSULTA NA BASE MUNDIAL DE COSMÉTICOS
// ==========================================
const buscarProdutoNaInternet = async (codigo) => {
  try {
    const res = await fetch(`https://br.openbeautyfacts.org/api/v0/product/${codigo}.json`)
    const data = await res.json()
    if (data.status === 1 && data.product) {
      return {
        nome: data.product.product_name,
        marca: data.product.brands,
        fotoUrl: data.product.image_url
      }
    }
  } catch (error) {
    console.error("Erro ao buscar na internet:", error)
  }
  return null
}

export default function RegistroIA() {
  const navigate = useNavigate()

  const [modo, setModo] = useState(null) 
  const [setoresDoBanco, setSetoresDoBanco] = useState([])
  const [marcasDoBanco, setMarcasDoBanco] = useState([])

  const [etapa, setEtapa] = useState(1) 
  const [carregando, setCarregando] = useState(false)
  const [statusIA, setStatusIA] = useState('') 
  const [sucesso, setSucesso] = useState(false)

  const [cameraBarcodeAtiva, setCameraBarcodeAtiva] = useState(false)
  const cameraFotoRef = useRef(null)

  const [dados, setDados] = useState({
    codigoBarras: '',
    nome: '',
    setorId: '',
    marcaId: '',
    precoCusto: '',
    precoVenda: '',
    estoque: '',
    arquivoFotoOriginal: null,
    fotoPreview: null,
    fotoUrlExterna: null // Novo estado para guardar foto da internet
  })

  useEffect(() => {
    async function carregarEstrutura() {
      try {
        const [resSetores, resMarcas] = await Promise.all([
          supabase.from('setores').select('*'),
          supabase.from('marcas').select('*')
        ])
        if (!resSetores.error) setSetoresDoBanco(resSetores.data || [])
        if (!resMarcas.error) setMarcasDoBanco(resMarcas.data || [])
      } catch (error) {
        console.error("Erro ao carregar dados do banco:", error)
      }
    }
    carregarEstrutura()
  }, [])

  // === PASSO 1: LER O CÓDIGO DE BARRAS E BUSCAR NA INTERNET ===
  const handleBarcodeSucesso = async (codigo) => {
    setDados(prev => ({ ...prev, codigoBarras: codigo }))
    setCameraBarcodeAtiva(false)
    
    setCarregando(true)
    setStatusIA('Procurando produto na base global...')

    // Tenta buscar na internet primeiro!
    const produtoExterno = await buscarProdutoNaInternet(codigo)

    if (produtoExterno && produtoExterno.nome) {
      // Achou! Vamos tentar casar a marca dele com o seu banco de dados
      let matchedMarcaId = ''
      let matchedSetorId = ''
      const apiMarca = normalize(produtoExterno.marca)

      if (apiMarca) {
        const marcaEncontrada = marcasDoBanco.find(m => normalize(m.nome).includes(apiMarca) || apiMarca.includes(normalize(m.nome)))
        if (marcaEncontrada) {
          matchedMarcaId = marcaEncontrada.id
          matchedSetorId = marcaEncontrada.setor_id
        }
      }

      setDados(prev => ({
        ...prev,
        nome: produtoExterno.nome || '',
        marcaId: matchedMarcaId,
        setorId: matchedSetorId,
        fotoUrlExterna: produtoExterno.fotoUrl,
        fotoPreview: produtoExterno.fotoUrl
      }))
      
      setCarregando(false)
      setStatusIA('')
      setEtapa(3) // Pula a foto e a I.A. direto pra revisão!
    } else {
      // Não achou na internet, vai pro fluxo normal da I.A. do Google (Foto)
      setCarregando(false)
      setStatusIA('')
      setEtapa(2)
    }
  }

  // === PASSO 2: TIRAR A FOTO E MANDAR PRA I.A. (FALLBACK) ===
  const handleCapturarFoto = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setCarregando(true)

    try {
      if (!apiKey || apiKey === 'undefined') throw new Error("Sem API Key")

      setStatusIA('Comprimindo imagem...')
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/jpeg' }
      const compressedFile = await imageCompression(file, options)
      
      setDados(prev => ({ 
        ...prev, 
        arquivoFotoOriginal: compressedFile,
        fotoPreview: URL.createObjectURL(compressedFile),
        fotoUrlExterna: null // Limpa URL externa se estiver tirando foto nova
      }))

      setStatusIA('Convertendo imagem para a IA...')
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(compressedFile)
        reader.onloadend = () => resolve(reader.result.split(',')[1])
        reader.onerror = (error) => reject(error)
      })

      const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" }) 
      
      setStatusIA('Enviando para a Inteligência Artificial...')
      const prompt = `
        Você é um assistente de perfumaria experiente. Analise a imagem desta embalagem.
        Extraia as informações e retorne APENAS um objeto JSON válido.
        O JSON deve conter exatamente estas 3 chaves:
        "nome": o nome completo do produto com volume (ex: Malbec Black Desodorante Colônia 100ml).
        "marca": a marca principal do produto (ex: O Boticário, Natura, Eudora).
        "setor": sugira o setor (ex: Perfumaria, Corpo e Banho, Maquiagem).
      `

      const result = await model.generateContent([prompt, imagePart])
      setStatusIA('Lendo resposta...')
      const responseText = result.response.text()
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        const jsonIA = JSON.parse(jsonMatch[0])
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
      } else {
        throw new Error("Formato de resposta da IA inválido.")
      }
    } catch (error) {
      alert("Erro no reconhecimento: " + error.message)
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
      // Se veio da internet, usa a URL externa direto. Se não, tem que subir a foto pro Supabase.
      let imageUrlFinal = dados.fotoUrlExterna || null 
      let fileName = null

      if (dados.arquivoFotoOriginal) {
        setStatusIA('Enviando foto para a nuvem...')
        fileName = `ia_${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage.from('produtos').upload(fileName, dados.arquivoFotoOriginal)
        if (uploadError) throw uploadError
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

      if (erroProd) throw erroProd

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
        throw erroLote
      }

      setSucesso(true)
    } catch (error) {
      alert('Erro ao cadastrar: ' + error.message)
    } finally {
      setCarregando(false)
      setStatusIA('')
    }
  }

  const marcasDisponiveis = marcasDoBanco.filter(m => m.setor_id === dados.setorId)

  // =========================================================
  // RENDERIZAÇÕES 
  // =========================================================
  if (modo === 'lote') return <RegistroIALote onVoltar={() => setModo(null)} />

  if (modo === null) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center px-4 py-10 relative">
        <div className="w-full max-w-md mb-8 flex justify-between items-center px-2">
          <button onClick={() => navigate('/admin-home')} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-purple-600 flex items-center gap-1.5">
            <Sparkles size={16} /> Registro Inteligente
          </span>
          <div className="w-9" />
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mt-4">
          <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2 tracking-tight px-2">Como deseja cadastrar?</h2>
          <p className="text-[#86868B] text-sm mb-8 px-2">Escolha o formato ideal para a sua necessidade no momento.</p>

          <div className="flex flex-col gap-4">
            <button onClick={() => setModo('individual')} className="group flex items-start gap-4 p-6 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-fuchsia-200 transition-all text-left">
              <div className="w-14 h-14 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600 shrink-0 group-hover:scale-110 transition-transform">
                <Globe size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Produto Único (Auto-Busca)</h3>
                <p className="text-sm text-gray-500 leading-relaxed">Bipe o código. Buscamos a foto e o nome na internet ou via I.A. automaticamente.</p>
              </div>
            </button>

            <button onClick={() => setModo('lote')} className="group flex items-start gap-4 p-6 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all text-left">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0 group-hover:scale-110 transition-transform">
                <Boxes size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Caixa / Lote</h3>
                <p className="text-sm text-gray-500 leading-relaxed">Tire várias fotos em sequência e a IA lerá todos os produtos de uma vez.</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

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
            <button onClick={() => { setSucesso(false); setEtapa(1); setDados({codigoBarras:'', nome:'', setorId:'', marcaId:'', precoCusto:'', precoVenda:'', estoque:'', fotoPreview: null, arquivoFotoOriginal: null, fotoUrlExterna: null}) }} className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors">
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
        <button onClick={() => setModo(null)} disabled={carregando} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-purple-600 flex items-center gap-1.5">
          <Sparkles size={16} /> Registro Inteligente (Único)
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
              <p className="text-gray-500 text-sm mb-8">Não encontramos este código na base global. Tire uma foto nítida da frente do produto para nossa IA ler.</p>

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
                <Sparkles size={20} className="text-fuchsia-600" /> Revisão
              </h2>

              <div className="flex gap-4 mb-6 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                {dados.fotoPreview ? (
                  <img src={dados.fotoPreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl shadow-sm bg-white" />
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