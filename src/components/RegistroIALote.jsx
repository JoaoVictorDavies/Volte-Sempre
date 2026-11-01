import { useState, useRef, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import imageCompression from 'browser-image-compression'
import { motion } from 'framer-motion'
import { Camera, FileText, Image as ImageIcon, Trash2, CheckCircle, PackagePlus, Loader2, Sparkles, DollarSign, Hash, Layers, Barcode } from 'lucide-react'
import LeitorCamera from './LeitorCamera' // Importando o leitor de código
import { useAuth } from '../context/useAuth'
import { callIdempotentRpc } from '../services/idempotentRpc'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY 
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

const parseNumber = (value) => {
  if (!value) return 0
  const stringValue = String(value).replace(',', '.')
  return parseFloat(stringValue) || 0
}

const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : ''

export default function RegistroIALote({ onVoltar }) {
  const { profile, user } = useAuth()
  const [setoresDoBanco, setSetoresDoBanco] = useState([])
  const [marcasDoBanco, setMarcasDoBanco] = useState([])

  const [etapa, setEtapa] = useState(1) 
  const [carregando, setCarregando] = useState(false)
  const [statusIA, setStatusIA] = useState('') 

  // Referências
  const cameraFotoRef = useRef(null)
  const galeriaFotoRef = useRef(null)

  // Estados para o fluxo Bip -> Foto
  const [cameraBarcodeAtiva, setCameraBarcodeAtiva] = useState(false)
  const [codigoPendente, setCodigoPendente] = useState(null) // Guarda o código provisoriamente até a foto ser tirada

  // Fila e Revisão
  const [filaFotos, setFilaFotos] = useState([]) 
  const [produtosLote, setProdutosLote] = useState([]) 

  useEffect(() => {
    if (!profile) return
    async function carregarEstrutura() {
      try {
        const [resSetores, resMarcas] = await Promise.all([
          supabase.from('setores').select('*').eq('loja_id', profile.loja_id),
          supabase.from('marcas').select('*').eq('loja_id', profile.loja_id)
        ])
        if (resSetores.data) setSetoresDoBanco(resSetores.data)
        if (resMarcas.data) setMarcasDoBanco(resMarcas.data)
      } catch (error) {
        console.error("Erro ao carregar banco:", error)
      }
    }
    carregarEstrutura()
  }, [profile])

  // === PASSO 1.A: SUCESSO NO BIP (Gatilho para a Câmera) ===
  const handleBarcodeSucesso = async (codigo) => {
    setCameraBarcodeAtiva(false)
    setCarregando(true)
    setStatusIA('Verificando código...')

    try {
      // Evita bipar algo que já existe
      const { data: produtoExistente, error } = await supabase.from('produtos')
        .select('nome')
        .eq('loja_id', profile.loja_id)
        .eq('codigo_barras', codigo)
        .maybeSingle()
      if (error) throw error
      if (produtoExistente) {
        alert(`O produto "${produtoExistente.nome}" já está cadastrado!`)
        setCarregando(false)
        return
      }

      // Guarda o código e abre a câmera automaticamente!
      setCodigoPendente(codigo)
      if (cameraFotoRef.current) cameraFotoRef.current.click()
      
    } catch (error) {
      console.error(error)
    } finally {
      setCarregando(false)
      setStatusIA('')
    }
  }

  // === PASSO 1.B: ADICIONAR FOTO OU PDF (Com ou Sem Código) ===
  const handleAdicionarFotos = async (event) => {
    const files = Array.from(event.target.files)
    if (!files.length) {
      setCodigoPendente(null) // Cancela o código se ele abriu a câmera e desistiu
      return
    }

    setCarregando(true)
    setStatusIA('Preparando imagem...')

    try {
      const novasFotos = []
      for (const file of files) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        if (!isPdf && !file.type.startsWith('image/')) {
          throw new Error(`O arquivo "${file.name}" não é uma imagem ou PDF compatível.`)
        }
        if (isPdf && file.size > 15 * 1024 * 1024) {
          throw new Error(`O PDF "${file.name}" excede o limite de 15 MB.`)
        }
        const processedFile = isPdf
          ? file
          : await imageCompression(file, {
            maxSizeMB: 0.2,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            fileType: 'image/jpeg',
          })
        
        novasFotos.push({
          id: crypto.randomUUID(),
          file: processedFile,
          isPdf,
          mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
          previewUrl: isPdf ? null : URL.createObjectURL(processedFile),
          codigoBarras: codigoPendente // Associa o código bipado à foto (ou null se foi direto na foto)
        })
      }
      
      setFilaFotos(prev => [...prev, ...novasFotos])
    } catch (error) {
      alert("Erro ao preparar o arquivo: " + error.message)
    } finally {
      setCarregando(false)
      setStatusIA('')
      setCodigoPendente(null) // Limpa para a próxima leitura
      if (cameraFotoRef.current) cameraFotoRef.current.value = ''
      if (galeriaFotoRef.current) galeriaFotoRef.current.value = ''
    }
  }

  const removerFotoFila = (idParaRemover) => {
    setFilaFotos(prev => prev.filter(foto => foto.id !== idParaRemover))
  }

  // === PASSO 2: PROCESSAR LOTE NA I.A. ===
  const processarLoteIA = async () => {
    if (filaFotos.length === 0) return
    if (!apiKey) {
      alert("Chave VITE_GEMINI_API_KEY não encontrada.")
      return
    }

    setCarregando(true)
    const resultadosProcessados = []

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

      for (let i = 0; i < filaFotos.length; i++) {
        const fotoAtual = filaFotos[i]
        setStatusIA(`Lendo embalagem ${i + 1} de ${filaFotos.length}...`)

        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(fotoAtual.file)
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo selecionado.'))
        })
        const imagePart = { inlineData: { data: base64Data, mimeType: fotoAtual.mimeType } }

        const prompt = `
          Você é um assistente de perfumaria experiente. Analise esta imagem ou este PDF de produto.
          Extraia as informações e retorne APENAS um objeto JSON válido.
          O JSON deve conter exatamente estas 3 chaves:
          "nome": o nome completo do produto com volume (ex: Malbec Black Desodorante Colônia 100ml).
          "marca": a marca principal do produto (ex: O Boticário, Natura, Eudora).
          "setor": sugira o setor (ex: Perfumaria, Corpo e Banho, Maquiagem).
        `

        let jsonIA = { nome: '', marca: '', setor: '' }
        try {
          const result = await model.generateContent([prompt, imagePart])
          const responseText = result.response.text()
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (jsonMatch) jsonIA = JSON.parse(jsonMatch[0])
        } catch (iaError) {
          console.error(`Erro na leitura da foto ${i+1}:`, iaError)
        }

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

        resultadosProcessados.push({
          idUnico: fotoAtual.id,
          arquivoOriginal: fotoAtual.file,
          isPdf: fotoAtual.isPdf,
          fileName: fotoAtual.file.name,
          previewUrl: fotoAtual.previewUrl,
          codigoBarras: fotoAtual.codigoBarras, // Repassa o código para a revisão!
          nome: jsonIA.nome || '',
          setorId: matchedSetorId,
          marcaId: matchedMarcaId,
          estoque: '',
          precoCusto: '',
          precoVenda: ''
        })
      }

      setProdutosLote(resultadosProcessados)
      setEtapa(2)

    } catch (error) {
      alert("Houve um erro grave no processamento: " + error.message)
    } finally {
      setCarregando(false)
      setStatusIA('')
    }
  }

  // === PASSO 3: GERENCIAR O FORMULÁRIO EM LOTE ===
  const atualizarProduto = (idUnico, campo, valor) => {
    setProdutosLote(prev => prev.map(prod => 
      prod.idUnico === idUnico ? { ...prod, [campo]: valor } : prod
    ))
  }

  const removerProdutoDaRevisao = (idUnico) => {
    setProdutosLote(prev => prev.filter(prod => prod.idUnico !== idUnico))
    if (produtosLote.length <= 1) {
      setFilaFotos([])
      setEtapa(1)
    }
  }

  // === PASSO 4: SALVAMENTO EM MASSA NO BANCO ===
  const salvarLoteFinal = async () => {
    for (const prod of produtosLote) {
      if (!prod.nome || prod.estoque === '' || prod.precoVenda === '' || !prod.setorId || !prod.marcaId) {
        alert(`Atenção! Verifique se todos os campos do produto "${prod.nome || 'Sem Nome'}" estão preenchidos.`)
        return
      }
    }

    setCarregando(true)
    const totalInicial = produtosLote.length
    let concluidos = 0
    
    try {
      for (let i = 0; i < produtosLote.length; i++) {
        const prod = produtosLote[i]
        setStatusIA(`Salvando item ${i + 1} de ${produtosLote.length}...`)
        
        let imageUrlFinal = null
        if (prod.arquivoOriginal && !prod.isPdf) {
          const fileName = `ia_lote_${user.id}_${prod.idUnico}.jpg`
          const { error: uploadError } = await supabase.storage.from('produtos').upload(fileName, prod.arquivoOriginal, { upsert: true })
          if (uploadError) throw uploadError
          const { data: publicData } = supabase.storage.from('produtos').getPublicUrl(fileName)
          imageUrlFinal = publicData.publicUrl
        }

        await callIdempotentRpc({
          userId: user.id,
          operation: `registro_ia_${prod.idUnico}`,
          functionName: 'registrar_entrada_estoque',
          payload: {
            name: prod.nome,
            codigo_barras: prod.codigoBarras || null,
            marca_id: prod.marcaId,
            unit_price: parseNumber(prod.precoVenda),
            unit_cost: parseNumber(prod.precoCusto),
            quantity: parseInt(prod.estoque, 10) || 0,
            imagem_url: imageUrlFinal,
            tipo: 'solo',
          },
        })
        setProdutosLote((pendentes) => pendentes.filter((item) => item.idUnico !== prod.idUnico))
        concluidos += 1
      }

      setEtapa(3) 
    } catch (error) {
      alert(
        `${concluidos} de ${totalInicial} produtos foram confirmados. Os itens restantes permanecem na lista; tente novamente para repetir a operação pendente sem duplicar registros. ${error.message}`,
      )
    } finally {
      setCarregando(false)
      setStatusIA('')
    }
  }


  // ================= RENDERIZAÇÕES CONDICIONAIS =================

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-xs w-full text-center">
          <Sparkles size={40} className="text-blue-500 mb-6 animate-pulse" />
          <Loader2 size={32} className="text-gray-200 animate-spin absolute" />
          <h3 className="font-bold text-gray-800 text-lg mb-2 mt-4">Processando...</h3>
          <p className="text-sm text-gray-500 font-medium animate-pulse">{statusIA}</p>
        </motion.div>
      </div>
    )
  }

  if (etapa === 3) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm bg-white rounded-3xl p-10 text-center shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={34} className="text-green-500" />
            </div>
          </div>
          <h2 className="font-bold text-[#1D1D1F] text-2xl mb-2">Lote Registrado!</h2>
          <p className="text-[#86868B] text-sm mb-10">Os {produtosLote.length} produtos foram cadastrados no sistema com sucesso.</p>
          <div className="flex flex-col gap-3">
            <button onClick={onVoltar} className="w-full py-4 bg-[#1D1D1F] text-white font-bold rounded-2xl shadow-lg hover:bg-black transition-colors">
              Voltar ao Menu
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (etapa === 1) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4 shadow-inner">
            <Layers size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastro em Lote</h2>
          <p className="text-gray-500 text-sm mb-6">Cadastre múltiplos itens. O fluxo ideal é Bipar o código e fotografar na sequência.</p>
          
          <input type="file" accept="image/*" capture="environment" ref={cameraFotoRef} onChange={handleAdicionarFotos} className="hidden" />
          <input type="file" accept="image/*,application/pdf,.pdf" multiple ref={galeriaFotoRef} onChange={handleAdicionarFotos} className="hidden" />

          {/* NOVOS BOTÕES OTIMIZADOS */}
          <div className="flex flex-col gap-3 mb-6">
            <button onClick={() => setCameraBarcodeAtiva(true)} className="w-full py-5 font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg">
              <Barcode size={24} /> Bipar e Fotografar
            </button>
            
            <div className="flex gap-3 mt-2">
              <button onClick={() => { setCodigoPendente(null); cameraFotoRef.current?.click(); }} className="flex-1 py-3 font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 border border-gray-200">
                <Camera size={18} /> Só Foto
              </button>
              <button onClick={() => { setCodigoPendente(null); galeriaFotoRef.current?.click(); }} className="flex-1 py-3 font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 border border-gray-200">
                <ImageIcon size={18} /> Galeria
              </button>
            </div>
          </div>

          {/* LISTA DA FILA */}
          {filaFotos.length > 0 ? (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Fila de Processamento ({filaFotos.length})</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {filaFotos.map((foto, index) => (
                  <div key={foto.id} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-gray-200 group">
                    {foto.isPdf ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 bg-rose-50 text-rose-600">
                        <FileText size={28} />
                        <span className="max-w-[90%] truncate text-[9px] font-semibold">{foto.file.name}</span>
                      </div>
                    ) : (
                      <img src={foto.previewUrl} alt={`Arquivo ${index + 1}`} className="w-full h-full object-cover" />
                    )}
                    
                    {/* Indicador Visual se tem Código de Barras */}
                    {foto.codigoBarras && (
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white p-1 rounded backdrop-blur-sm" title={`Código: ${foto.codigoBarras}`}>
                        <Barcode size={12} />
                      </div>
                    )}
                    
                    <button onClick={() => removerFotoFila(foto.id)} className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-lg backdrop-blur-sm hover:bg-red-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              
              <button onClick={processarLoteIA} className="w-full mt-4 py-4 font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                <Sparkles size={20} /> Processar {filaFotos.length} Produtos
              </button>
            </div>
          ) : (
            <div className="py-6 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-400 text-sm font-medium">
              A fila está vazia. Comece a bipar e fotografar.
            </div>
          )}
        </div>

        {cameraBarcodeAtiva && (
          <div className="fixed inset-0 z-[100] bg-black">
            <LeitorCamera onSucesso={handleBarcodeSucesso} onFechar={() => setCameraBarcodeAtiva(false)} />
          </div>
        )}
      </motion.div>
    )
  }

  if (etapa === 2) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-lg mx-auto pb-20">
        
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Revisão do Lote</h2>
            <p className="text-gray-500 text-sm mt-1">Preencha os valores para os {produtosLote.length} itens capturados.</p>
          </div>
        </div>

        <div className="space-y-6">
          {produtosLote.map((produto, index) => {
            const marcasDisponiveisCard = marcasDoBanco.filter(m => m.setor_id === produto.setorId)

            return (
              <div key={produto.idUnico} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200 relative overflow-hidden">
                
                {/* Etiqueta de Código de Barras (Visual) */}
                {produto.codigoBarras && (
                  <div className="absolute top-0 right-0 bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-blue-100 flex items-center gap-1">
                    <Barcode size={10} /> {produto.codigoBarras}
                  </div>
                )}

                <div className="flex gap-4 mb-5 mt-2">
                  <div className="w-20 h-20 shrink-0">
                    {produto.isPdf ? (
                      <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-center text-rose-600">
                        <FileText size={28} />
                        <span className="max-w-full break-all text-[10px] font-semibold">{produto.fileName}</span>
                      </div>
                    ) : (
                      <img src={produto.previewUrl} alt="Prévia do produto" className="w-full h-full rounded-xl border border-gray-100 object-cover shadow-sm" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center relative pr-8">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Produto {index + 1}</p>
                    <input 
                      type="text" 
                      placeholder="Nome do Produto"
                      value={produto.nome} 
                      onChange={e => atualizarProduto(produto.idUnico, 'nome', e.target.value)}
                      className="w-full font-bold text-gray-800 text-sm bg-transparent border-b-2 border-gray-100 focus:border-blue-400 outline-none pb-1"
                    />
                    <button 
                      onClick={() => removerProdutoDaRevisao(produto.idUnico)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors p-2"
                      title="Remover deste lote"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <select 
                    value={produto.setorId} 
                    onChange={e => {
                      atualizarProduto(produto.idUnico, 'setorId', e.target.value)
                      atualizarProduto(produto.idUnico, 'marcaId', '') 
                    }} 
                    className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 px-3 font-semibold text-xs outline-none focus:bg-white focus:border-blue-400"
                  >
                    <option value="">Setor...</option>
                    {setoresDoBanco.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>

                  <select 
                    value={produto.marcaId} 
                    onChange={e => atualizarProduto(produto.idUnico, 'marcaId', e.target.value)}
                    disabled={!produto.setorId}
                    className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 px-3 font-semibold text-xs outline-none focus:bg-white focus:border-blue-400 disabled:opacity-50"
                  >
                    <option value="">Marca...</option>
                    {marcasDisponiveisCard.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"><Hash size={12} /></div>
                    <input type="number" inputMode="numeric" placeholder="Qtd" value={produto.estoque} onChange={e => atualizarProduto(produto.idUnico, 'estoque', e.target.value)}
                      className="w-full h-10 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 pl-6 pr-1 font-bold text-xs outline-none focus:bg-white focus:border-blue-400"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"><DollarSign size={12} /></div>
                    <input type="text" inputMode="decimal" placeholder="Custo" value={produto.precoCusto} onChange={e => atualizarProduto(produto.idUnico, 'precoCusto', e.target.value)}
                      className="w-full h-10 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 pl-6 pr-1 font-bold text-xs outline-none focus:bg-white focus:border-blue-400"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-green-500"><DollarSign size={12} /></div>
                    <input type="text" inputMode="decimal" placeholder="Venda" value={produto.precoVenda} onChange={e => atualizarProduto(produto.idUnico, 'precoVenda', e.target.value)}
                      className="w-full h-10 bg-green-50 border border-green-200 rounded-lg text-gray-800 pl-6 pr-1 font-bold text-xs outline-none focus:bg-white focus:border-green-400"
                    />
                  </div>
                </div>

              </div>
            )
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 z-50">
          <div className="max-w-lg mx-auto flex gap-3">
            <button onClick={() => setEtapa(1)} className="px-5 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">
              Adicionar Mais
            </button>
            <button onClick={salvarLoteFinal} className="flex-1 py-4 font-bold text-white bg-[#1D1D1F] rounded-2xl shadow-xl hover:bg-black transition-transform active:scale-95 flex items-center justify-center gap-2">
              <PackagePlus size={20} /> Salvar Tudo ({produtosLote.length})
            </button>
          </div>
        </div>

      </motion.div>
    )
  }

  return null
}