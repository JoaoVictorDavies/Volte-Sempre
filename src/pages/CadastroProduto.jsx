import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle, Tag, FileText, Barcode, DollarSign, Hash, ChevronRight, PackagePlus } from 'lucide-react'

let slideDirection = 1

const stepVariants = {
  initial: (dir) => ({ x: dir * 50, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: (dir) => ({ x: dir * -50, opacity: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } }),
}

function StepDots({ etapa, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i + 1 === etapa ? 24 : 8,
            opacity: i + 1 <= etapa ? 1 : 0.25,
            backgroundColor: i + 1 <= etapa ? '#1D1D1F' : '#86868B',
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="h-2 rounded-full"
        />
      ))}
    </div>
  )
}

function StepLabel({ children }) {
  return (
    <h2
      className="font-bold text-[#1D1D1F] mb-6 leading-snug"
      style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', letterSpacing: '-0.02em' }}
    >
      {children}
    </h2>
  )
}

function SelectButton({ onClick, children, subtitle }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group w-full flex items-center justify-between p-5 bg-[#F5F5F7] hover:bg-[#EBEBED] rounded-2xl text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div>
        <p className="font-semibold text-[#1D1D1F] text-base">{children}</p>
        {subtitle && <p className="text-[#86868B] text-sm mt-0.5">{subtitle}</p>}
      </div>
      <ChevronRight size={18} strokeWidth={1.8} className="text-[#86868B] shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
    </motion.button>
  )
}

function BackButton({ onClick, label = 'Voltar' }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-[#86868B] hover:text-[#1D1D1F] font-medium transition-colors focus:outline-none focus-visible:underline"
    >
      <ArrowLeft size={15} strokeWidth={2} />
      {label}
    </button>
  )
}

function PrimaryButton({ onClick, disabled, children, icon: Icon = ArrowRight }) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl font-semibold text-white text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-opacity"
      style={{
        background: disabled ? '#C7C7CC' : '#1D1D1F',
        boxShadow: disabled ? 'none' : '0 8px 24px rgba(0,0,0,0.14)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '-0.01em',
      }}
    >
      {children}
      {Icon && <Icon size={18} strokeWidth={2} />}
    </motion.button>
  )
}

function StyledInput({ icon: Icon, label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wide pl-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none">
            <Icon size={17} strokeWidth={1.6} />
          </div>
        )}
        <input
          {...props}
          className={`w-full h-14 bg-white border border-gray-200 rounded-2xl text-[#1D1D1F] placeholder-[#C7C7CC] text-base
            focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-all duration-200 disabled:opacity-50 disabled:bg-gray-50
            ${Icon ? 'pl-11 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  )
}

export default function CadastroProduto() {
  const navigate = useNavigate()

  // Controle de Fluxo
  const [etapa, setEtapa] = useState(1)
  const [isLoteMode, setIsLoteMode] = useState(false)
  const [totalEtapas, setTotalEtapas] = useState(5)

  // Estados de Interface
  const [carregando, setCarregando] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  // Dados do Banco
  const [setoresDoBanco, setSetoresDoBanco] = useState([])
  const [marcasDoBanco, setMarcasDoBanco] = useState([])
  const [produtoExistente, setProdutoExistente] = useState(null)

  const debounceRef = useRef(null)

  const [dados, setDados] = useState({
    setorId: '', setorNome: '', marcaId: '', marcaNome: '',
    tipo: 'solo', nome: '', precoCusto: '', precoVenda: '',
    estoque: '', codigoBarras: ''
  })

  useEffect(() => {
    async function buscarSetores() {
      const { data } = await supabase.from('setores').select('*').order('nome')
      if (data) setSetoresDoBanco(data)
    }
    buscarSetores()
  }, [])

  useEffect(() => {
    if (dados.setorId) {
      async function buscarMarcas() {
        const { data } = await supabase.from('marcas').select('*').eq('setor_id', dados.setorId).order('nome')
        if (data) setMarcasDoBanco(data)
      }
      buscarMarcas()
    }
  }, [dados.setorId])

  const avancar = () => { slideDirection = 1; setEtapa(e => e + 1) }
  const voltar = () => { slideDirection = -1; setEtapa(e => e - 1) }

  // 1. O OLHO DO LEITOR: Busca automaticamente enquanto digita/bipa
  const handleBarcodeChange = (e) => {
    const codigo = e.target.value
    setDados(prev => ({ ...prev, codigoBarras: codigo }))

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (codigo.length >= 4) {
      setBuscando(true)
      debounceRef.current = setTimeout(async () => {
        const { data } = await supabase.from('produtos').select('*').eq('codigo_barras', codigo).single()
        if (data) {
          setProdutoExistente(data)
          setDados(prev => ({ ...prev, nome: data.nome, precoVenda: data.preco_venda }))
        } else {
          setProdutoExistente(null)
        }
        setBuscando(false)
      }, 400) // Tempo de espera para o leitor terminar de bipar
    } else {
      setProdutoExistente(null)
      setBuscando(false)
    }
  }

  // Permite dar 'Enter' no leitor para agilizar
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && produtoExistente) {
      iniciarModoLote()
    } else if (e.key === 'Enter' && !produtoExistente && dados.codigoBarras.length >= 4) {
      iniciarModoManual()
    }
  }

  // 2. RAMIFICAÇÕES DO FLUXO
  const iniciarModoLote = () => {
    setIsLoteMode(true)
    setTotalEtapas(2) // Passos: 1(Barcode) -> 2(Add Lote)
    avancar()
  }

  const iniciarModoManual = () => {
    setIsLoteMode(false)
    setTotalEtapas(5) // Passos: 1(Barcode) -> 2(Setor) -> 3(Marca) -> 4(Tipo) -> 5(Info)
    avancar()
  }

  // 3. SALVAR NO BANCO
  async function finalizarCadastro() {
    setCarregando(true)
    try {
      let produtoId = null

      if (isLoteMode && produtoExistente) {
        // A. JÁ EXISTE: Atualiza o preço universal de venda
        produtoId = produtoExistente.id
        await supabase.from('produtos')
          .update({ preco_venda: parseFloat(dados.precoVenda) || 0 })
          .eq('id', produtoId)
      } else {
        // B. NOVO: Cria o produto no catálogo principal
        const { data: novoProduto, error: erroProd } = await supabase.from('produtos').insert([{
          nome: dados.nome,
          tipo: dados.tipo,
          preco_venda: parseFloat(dados.precoVenda) || 0,
          codigo_barras: dados.codigoBarras || null,
          marca_id: dados.marcaId,
          preco_custo: parseFloat(dados.precoCusto) || 0, // Adicionado para satisfazer a not-null constraint
          estoque: parseInt(dados.estoque) || 0       // Adicionado para satisfazer a not-null constraint
        }]).select().single()

        if (erroProd) throw erroProd
        produtoId = novoProduto.id
      }

      // C. CRIA A FILA (LOTE)
      // Verifica se já tem lote ativo
      const { data: loteAtivo } = await supabase.from('estoque_lotes')
        .select('id').eq('produto_id', produtoId).eq('status', 'ativo').limit(1)

      const statusDoLote = loteAtivo && loteAtivo.length > 0 ? 'espera' : 'ativo'

      const { error: erroLote } = await supabase.from('estoque_lotes').insert([{
        produto_id: produtoId,
        quantidade_inicial: parseInt(dados.estoque) || 0,
        quantidade_atual: parseInt(dados.estoque) || 0,
        preco_custo: parseFloat(dados.precoCusto) || 0,
        status: statusDoLote
      }])

      if (erroLote) throw erroLote

      setSucesso(true)
    } catch (error) {
      alert('Erro ao cadastrar: ' + error.message)
    } finally {
      setCarregando(false)
    }
  }

  const reiniciarFormulario = () => {
    setDados({
      setorId: '', setorNome: '', marcaId: '', marcaNome: '',
      tipo: 'solo', nome: '', precoCusto: '', precoVenda: '', estoque: '', codigoBarras: ''
    })
    setProdutoExistente(null)
    setIsLoteMode(false)
    setSucesso(false)
    setEtapa(1)
  }

  // ==========================================
  // TELA DE SUCESSO
  // ==========================================
  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }}
          className="w-full max-w-sm bg-white rounded-3xl p-10 text-center shadow-xl"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={34} strokeWidth={1.5} className="text-green-500" />
            </div>
          </div>
          <h2 className="font-bold text-[#1D1D1F] text-2xl mb-2 tracking-tight">
            {isLoteMode ? 'Lote adicionado!' : 'Produto salvo!'}
          </h2>
          <p className="text-[#86868B] text-sm mb-10">
            {isLoteMode ? 'As novas unidades já estão na fila do seu estoque.' : 'O produto foi cadastrado com sucesso.'}
          </p>
          <div className="flex flex-col gap-3">
            <PrimaryButton onClick={reiniciarFormulario} icon={null}>Cadastrar outro produto</PrimaryButton>
            <button onClick={() => navigate('/admin-home')} className="h-14 w-full rounded-2xl bg-[#F5F5F7] text-[#1D1D1F] font-semibold text-base hover:bg-[#EBEBED] transition-colors focus:outline-none">
              Voltar ao Painel
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center px-4 py-10">

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mb-4 px-1">
        <p className="text-xs font-semibold tracking-widest text-[#86868B] uppercase">Cadastro Inteligente</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="w-full max-w-sm bg-white rounded-3xl px-7 pt-8 pb-7" style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.08)' }}
      >
        <StepDots etapa={etapa} total={totalEtapas} />

        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={slideDirection}>

            {/* ETAPA 1: O PORTEIRO (CÓDIGO DE BARRAS) */}
            {etapa === 1 && (
              <motion.div key="etapa1" custom={slideDirection} variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <StepLabel>Identifique o Produto</StepLabel>

                <StyledInput
                  icon={Barcode}
                  placeholder="Bipe ou digite o código..."
                  value={dados.codigoBarras}
                  onChange={handleBarcodeChange}
                  onKeyDown={handleKeyDown}
                  inputMode="numeric"
                  autoFocus
                />

                <div className="mt-4 min-h-[120px]">
                  {buscando ? (
                    <div className="text-center py-6 text-blue-500 font-medium animate-pulse">Consultando acervo...</div>
                  ) : produtoExistente ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 p-5 rounded-2xl border border-green-200">
                      <div className="flex items-center gap-3 mb-3 text-green-700">
                        <CheckCircle size={20} /> <span className="font-bold">Produto Localizado!</span>
                      </div>
                      <p className="font-bold text-gray-800 text-lg leading-tight mb-1">{produtoExistente.nome}</p>
                      <p className="text-sm text-gray-500 mb-4">Atual: R$ {produtoExistente.preco_venda}</p>
                      <PrimaryButton onClick={iniciarModoLote} icon={PackagePlus}>Adicionar Estoque</PrimaryButton>
                    </motion.div>
                  ) : dados.codigoBarras.length >= 4 ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                      <p className="font-bold text-blue-800 mb-2">✨ Código Novo!</p>
                      <p className="text-sm text-blue-600 mb-4">Este produto ainda não existe no sistema.</p>
                      <PrimaryButton onClick={iniciarModoManual}>Cadastrar Produto</PrimaryButton>
                    </motion.div>
                  ) : null}
                </div>

                {!produtoExistente && (
                  <div className="mt-8 text-center">
                    <button onClick={() => { setDados({ ...dados, codigoBarras: '' }); iniciarModoManual(); }} className="text-[#86868B] text-sm font-medium hover:text-[#1D1D1F] transition-colors focus:outline-none">
                      Não possui código? Pular etapa
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ETAPA ESPECIAL: MODO LOTE (Se achou o código, vem pra cá e fim) */}
            {etapa === 2 && isLoteMode && (
              <motion.div key="etapaLote" custom={slideDirection} variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <StepLabel>Nova Remessa</StepLabel>

                <div className="bg-[#F5F5F7] p-4 rounded-xl mb-6 border border-gray-200">
                  <p className="text-xs text-[#86868B] uppercase tracking-wider font-bold mb-1">Produto</p>
                  <p className="font-bold text-[#1D1D1F]">{dados.nome}</p>
                </div>

                <div className="flex flex-col gap-4">
                  <StyledInput
                    icon={Hash} label="Unidades entrando" type="number" placeholder="0" inputMode="numeric"
                    value={dados.estoque} onChange={e => setDados({ ...dados, estoque: e.target.value })}
                  />
                  <StyledInput
                    icon={DollarSign} label="Custo Unitário (R$)" type="number" placeholder="0,00" inputMode="decimal"
                    value={dados.precoCusto} onChange={e => setDados({ ...dados, precoCusto: e.target.value })}
                  />
                  <StyledInput
                    icon={Tag} label="Atualizar Preço de Venda?" type="number" placeholder="0,00" inputMode="decimal"
                    value={dados.precoVenda} onChange={e => setDados({ ...dados, precoVenda: e.target.value })}
                  />

                  <div className="mt-4">
                    <PrimaryButton onClick={finalizarCadastro} disabled={carregando} icon={carregando ? null : CheckCircle}>
                      {carregando ? 'Salvando…' : 'Finalizar Adição'}
                    </PrimaryButton>
                  </div>
                </div>

                <div className="mt-5">
                  <BackButton onClick={() => { setProdutoExistente(null); voltar(); }} label="Voltar ao Leitor" />
                </div>
              </motion.div>
            )}

            {/* FLUXO MANUAL (Se não achou o código, segue o fluxo normal) */}
            {etapa === 2 && !isLoteMode && (
              <motion.div key="etapa2" custom={slideDirection} variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <StepLabel>Em qual setor se encaixa?</StepLabel>
                <div className="flex flex-col gap-3">
                  {setoresDoBanco.map(s => (
                    <SelectButton key={s.id} onClick={() => { setDados({ ...dados, setorId: s.id, setorNome: s.nome }); avancar() }}>
                      {s.nome}
                    </SelectButton>
                  ))}
                </div>
                <div className="mt-6"><BackButton onClick={voltar} label="Voltar" /></div>
              </motion.div>
            )}

            {etapa === 3 && !isLoteMode && (
              <motion.div key="etapa3" custom={slideDirection} variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <StepLabel>Qual a marca de {dados.setorNome}?</StepLabel>
                <div className="flex flex-col gap-3">
                  {marcasDoBanco.map(m => (
                    <SelectButton key={m.id} onClick={() => { setDados({ ...dados, marcaId: m.id, marcaNome: m.nome }); avancar() }}>
                      {m.nome}
                    </SelectButton>
                  ))}
                  {marcasDoBanco.length === 0 && <p className="text-[#86868B] text-sm text-center py-4">Nenhuma marca cadastrada.</p>}
                </div>
                <div className="mt-6"><BackButton onClick={voltar} label="Voltar para Setores" /></div>
              </motion.div>
            )}

            {etapa === 4 && !isLoteMode && (
              <motion.div key="etapa4" custom={slideDirection} variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <StepLabel>Como esse item é vendido?</StepLabel>
                <div className="flex flex-col gap-3">
                  <SelectButton onClick={() => { setDados({ ...dados, tipo: 'solo' }); avancar() }} subtitle="Item individual na prateleira.">
                    Produto Solo
                  </SelectButton>
                  <SelectButton onClick={() => { setDados({ ...dados, tipo: 'kit_fixo' }); avancar() }} subtitle="Conjunto pronto da marca.">
                    Kit Fixo
                  </SelectButton>
                </div>
                <div className="mt-6"><BackButton onClick={voltar} label="Voltar para Marcas" /></div>
              </motion.div>
            )}

            {etapa === 5 && !isLoteMode && (
              <motion.div key="etapa5" custom={slideDirection} variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <StepLabel>Informações Finais</StepLabel>

                <div className="flex flex-col gap-4">
                  <StyledInput icon={FileText} label="Nome do Produto" placeholder="Ex: Perfume Malbec" value={dados.nome} onChange={e => setDados({ ...dados, nome: e.target.value })} />
                  <StyledInput icon={Hash} label="Estoque Inicial" type="number" placeholder="0" inputMode="numeric" value={dados.estoque} onChange={e => setDados({ ...dados, estoque: e.target.value })} />
                  <StyledInput icon={DollarSign} label="Custo Unitário (R$)" type="number" placeholder="0,00" inputMode="decimal" value={dados.precoCusto} onChange={e => setDados({ ...dados, precoCusto: e.target.value })} />
                  <StyledInput icon={Tag} label="Preço de Venda (R$)" type="number" placeholder="0,00" inputMode="decimal" value={dados.precoVenda} onChange={e => setDados({ ...dados, precoVenda: e.target.value })} />

                  <div className="mt-2">
                    <PrimaryButton onClick={finalizarCadastro} disabled={carregando} icon={carregando ? null : CheckCircle}>
                      {carregando ? 'Salvando…' : 'Finalizar Cadastro'}
                    </PrimaryButton>
                  </div>
                </div>

                <div className="mt-5">
                  <BackButton onClick={voltar} label="Voltar para Tipo" />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
