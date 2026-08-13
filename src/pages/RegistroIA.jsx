import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Barcode, Camera, CheckCircle, PackagePlus, Loader2, DollarSign, Hash, Package, Boxes, Zap, Globe } from 'lucide-react'
import LeitorCamera from '../components/LeitorCamera'
import RegistroIALote from '../components/RegistroIALote'

const parseNumber = (value) => {
  if (!value) return 0
  const stringValue = String(value).replace(',', '.')
  return parseFloat(stringValue) || 0
}

const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : ''

// ==========================================
// 🧠 CÉREBRO LOCAL: DICIONÁRIO DE PREFIXOS GS1
// ==========================================
const PREFIXOS_MARCAS = [
  { prefixo: '7891033', marca: 'O Boticário', setorSugerido: 'Perfumaria' },
  { prefixo: '7891060', marca: 'Natura', setorSugerido: 'Perfumaria' },
  { prefixo: '7891150', marca: 'Natura', setorSugerido: 'Perfumaria' },
  { prefixo: '7891017', marca: 'Avon', setorSugerido: 'Perfumaria' },
  { prefixo: '7891031', marca: 'Avon', setorSugerido: 'Maquiagem' },
  { prefixo: '7898084', marca: 'Eudora', setorSugerido: 'Perfumaria' },
  { prefixo: '7898275', marca: 'Eudora', setorSugerido: 'Perfumaria' },
  { prefixo: '7899035', marca: 'Jequiti', setorSugerido: 'Perfumaria' },
  { prefixo: '7898496', marca: 'Jequiti', setorSugerido: 'Perfumaria' },
  { prefixo: '088', marca: 'Mary Kay', setorSugerido: 'Maquiagem' } 
]

// ==========================================
// 🌐 TENTATIVA EXTERNA MULTI-API (FALLBACKS)
// ==========================================
const buscarProdutoNaInternet = async (codigo) => {
  // Tenta Open Beauty Facts
  try {
    const res = await fetch(`https://br.openbeautyfacts.org/api/v0/product/${codigo}.json`)
    const data = await res.json()
    if (data.status === 1 && data.product) {
      return { nome: data.product.product_name, marca: data.product.brands, fotoUrl: data.product.image_url }
    }
  } catch (e) { console.warn("OpenBeauty falhou") }

  // Tenta UPCItemDB (Gratuito, limite alto, base gigante)
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${codigo}`)
    const data = await res.json()
    if (data.items && data.items.length > 0) {
      return { nome: data.items[0].title, marca: data.items[0].brand, fotoUrl: data.items[0].images[0] }
    }
  } catch (e) { console.warn("UPCItemDB falhou") }

  return null
}

export default function RegistroRapido() {
  const navigate = useNavigate()

  const [modo, setModo] = useState(null) 
  const [setoresDoBanco, setSetoresDoBanco] = useState([])
  const [marcasDoBanco, setMarcasDoBanco] = useState([])

  const [etapa, setEtapa] = useState(1) 
  const [carregando, setCarregando] = useState(false)
  const [status, setStatus] = useState('') 
  const [sucesso, setSucesso] = useState(false)

  const [cameraBarcodeAtiva, setCameraBarcodeAtiva] = useState(false)

  const [dados, setDados] = useState({
    codigoBarras: '',
    nome: '',
    setorId: '',
    marcaId: '',
    precoCusto: '',
    precoVenda: '',
    estoque: '',
    fotoUrlExterna: null 
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
        console.error("Erro ao carregar dados:", error)
      }
    }
    carregarEstrutura()
  }, [])

  // === PASSO 1: LER O CÓDIGO E PROCESSAR INSTANTANEAMENTE ===
  const processarCodigo = async (codigo) => {
    setDados(prev => ({ ...prev, codigoBarras: codigo }))
    setCameraBarcodeAtiva(false)
    
    setCarregando(true)
    setStatus('Buscando na internet...')

    // 1. Tenta API Externa
    const produtoExterno = await buscarProdutoNaInternet(codigo)
    
    let matchedMarcaId = ''
    let matchedSetorId = ''
    let nomeSugerido = produtoExterno?.nome || ''
    let fotoSugerida = produtoExterno?.fotoUrl || null
    let marcaSugeridaTexto = produtoExterno?.marca || null

    // 2. Se a API falhou, usamos o nosso Dicionário Local (Ultra Rápido)
    if (!marcaSugeridaTexto) {
      setStatus('Procurando no dicionário offline...')
      const matchLocal = PREFIXOS_MARCAS.find(p => codigo.startsWith(p.prefixo))
      if (matchLocal) {
        marcaSugeridaTexto = matchLocal.marca
      }
    }

    // 3. Tenta casar a marca/setor detectada com o Banco de Dados do usuário
    if (marcaSugeridaTexto) {
      const marcaTextoNorm = normalize(marcaSugeridaTexto)
      const marcaEncontrada = marcasDoBanco.find(m => normalize(m.nome).includes(marcaTextoNorm) || marcaTextoNorm.includes(normalize(m.nome)))
      
      if (marcaEncontrada) {
        matchedMarcaId = marcaEncontrada.id
        matchedSetorId = marcaEncontrada.setor_id
      }
    }

    setDados(prev => ({
      ...prev,
      nome: nomeSugerido,
      marcaId: matchedMarcaId,
      setorId: matchedSetorId,
      fotoUrlExterna: fotoSugerida
    }))
    
    setCarregando(false)
    setStatus('')
    setEtapa(2) // Vai direto pra tela final
  }

  // === PASSO 2: FINALIZAR CADASTRO ===
  const finalizarCadastro = async () => {
    if (!dados.nome || dados.estoque === '' || dados.precoVenda === '' || !dados.setorId || !dados.marcaId) {
      alert("Atenção! Verifique se Nome, Setor, Marca, Estoque e Preço de Venda estão preenchidos.")
      return
    }

    setCarregando(true)
    setStatus('Salvando no sistema...')
    
    try {
      const { data: novoProduto, error: erroProd } = await supabase.from('produtos').insert([{
        nome: dados.nome,
        codigo_barras: dados.codigoBarras || null,
        marca_id: dados.marcaId,
        preco_venda: parseNumber(dados.precoVenda),
        preco_custo: parseNumber(dados.precoCusto),
        estoque: parseInt(dados.estoque, 10) || 0,
        imagem_url: dados.fotoUrlExterna, // Se a internet achou a foto, salva o link dela direto!
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
        throw erroLote
      }

      setSucesso(true)
    } catch (error) {
      alert('Erro ao cadastrar: ' + error.message)
    } finally {
      setCarregando(false)
      setStatus('')
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
          <span className="font-bold text-sm tracking-widest uppercase text-blue-600 flex items-center gap-1.5">
            <Zap size={16} /> Registro Rápido
          </span>
          <div className="w-9" />
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mt-4">
          <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2 tracking-tight px-2">Como deseja cadastrar?</h2>
          <p className="text-[#86868B] text-sm mb-8 px-2">Esqueça a I.A. lenta. Use o modo rápido por prefixos de código de barras.</p>

          <div className="flex flex-col gap-4">
            <button onClick={() => setModo('individual')} className="group flex items-start gap-4 p-6 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-left">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                <Globe size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Produto Único (Auto-Busca)</h3>
                <p className="text-sm text-gray-500 leading-relaxed">Bipe o código. O sistema descobre a marca instantaneamente via dicionário local ou internet.</p>
              </div>
            </button>

            <button onClick={() => setModo('lote')} className="group flex items-start gap-4 p-6 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all text-left">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0 group-hover:scale-110 transition-transform">
                <Boxes size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Caixa / Lote</h3>
                <p className="text-sm text-gray-500 leading-relaxed">Múltiplos produtos de uma vez.</p>
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
          <h2 className="font-bold text-[#1D1D1F] text-2xl mb-2">Cadastrado!</h2>
          <p className="text-[#86868B] text-sm mb-10">Produto adicionado ao seu estoque na velocidade da luz.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/estoque')} className="w-full py-4 bg-[#1D1D1F] text-white font-bold rounded-2xl shadow-lg hover:bg-black transition-colors">
              Ver no Estoque
            </button>
            <button onClick={() => { setSucesso(false); setEtapa(1); setDados({codigoBarras:'', nome:'', setorId:'', marcaId:'', precoCusto:'', precoVenda:'', estoque:'', fotoUrlExterna: null}) }} className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors">
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
          <Zap size={40} className="text-blue-500 mb-6 animate-pulse" />
          <Loader2 size={32} className="text-gray-200 animate-spin absolute" />
          <h3 className="font-bold text-gray-800 text-lg mb-2 mt-4">Processando...</h3>
          <p className="text-sm text-gray-500 font-medium animate-pulse">{status}</p>
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
        <span className="font-bold text-sm tracking-widest uppercase text-blue-600 flex items-center gap-1.5">
          <Zap size={16} /> Turbo Form
        </span>
        <div className="w-9" />
      </div>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          
          {/* ETAPA 1: APENAS LER CÓDIGO */}
          {etapa === 1 && (
            <motion.div key="e1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6 shadow-inner">
                <Barcode size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 tracking-tight">Código do Produto</h2>
              <p className="text-gray-500 text-sm mb-6">Bipe o código de barras. Vamos tentar deduzir a marca automaticamente.</p>
              
              <div className="flex flex-col gap-3">
                <button onClick={() => setCameraBarcodeAtiva(true)} className="w-full py-5 font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg">
                  <Camera size={24} /> Bipar Código
                </button>
                
                <div className="relative mt-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">ou digite manualmente</span></div>
                </div>

                <div className="flex gap-2">
                  <input type="number" inputMode="numeric" placeholder="Ex: 7891060..." value={dados.codigoBarras} onChange={e => setDados({...dados, codigoBarras: e.target.value})} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 font-bold text-gray-700 outline-none focus:border-blue-400" />
                  <button onClick={() => processarCodigo(dados.codigoBarras)} disabled={dados.codigoBarras.length < 5} className="px-5 bg-gray-800 text-white rounded-xl font-bold disabled:opacity-50">OK</button>
                </div>
              </div>
              
              <button onClick={() => setEtapa(2)} className="mt-8 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors underline-offset-4 hover:underline">
                Pular código de barras
              </button>
            </motion.div>
          )}

          {/* ETAPA 2: FORMULÁRIO FINAL DIRETO */}
          {etapa === 2 && (
            <motion.div key="e2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 pb-8">
              
              {/* ALERTA DE AUTO-DETECT */}
              {dados.marcaId ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5 flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-green-800">Marca Detectada!</p>
                    <p className="text-xs text-green-600">O sistema pré-preencheu o setor e a marca com base no código.</p>
                  </div>
                </div>
              ) : dados.codigoBarras && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-5">
                  <p className="text-sm font-bold text-yellow-800">Código não reconhecido.</p>
                  <p className="text-xs text-yellow-700">Por favor, selecione a marca e o setor manualmente.</p>
                </div>
              )}

              {/* NOME E FOTO */}
              <div className="flex gap-4 mb-6">
                {dados.fotoUrlExterna && (
                  <img src={dados.fotoUrlExterna} alt="Produto" className="w-16 h-16 object-cover rounded-xl shadow-sm bg-white border border-gray-100" />
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-0.5">Nome do Produto</p>
                  <input 
                    type="text" 
                    placeholder="Ex: Malbec 100ml"
                    value={dados.nome} 
                    onChange={e => setDados({...dados, nome: e.target.value})}
                    autoFocus={!dados.nome} // Foca automático se a internet não tiver achado o nome
                    className="w-full font-bold text-gray-800 text-sm bg-transparent border-b-2 border-gray-200 focus:border-blue-400 outline-none pb-1 transition-colors"
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

                {/* VALORES E ESTOQUE */}
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

              <div className="flex gap-3">
                <button onClick={() => setEtapa(1)} className="p-4 bg-gray-100 rounded-2xl text-gray-500 hover:bg-gray-200 transition-colors">
                  <ArrowLeft size={24} />
                </button>
                <button 
                  onClick={finalizarCadastro}
                  disabled={carregando}
                  className="flex-1 py-5 font-bold text-white bg-[#1D1D1F] rounded-2xl hover:bg-black shadow-xl shadow-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <PackagePlus size={22} /> Salvar Produto
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {cameraBarcodeAtiva && (
        <div className="fixed inset-0 z-[100] bg-black">
          <LeitorCamera onSucesso={processarCodigo} onFechar={() => setCameraBarcodeAtiva(false)} />
        </div>
      )}
    </div>
  )
}