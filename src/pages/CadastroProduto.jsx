import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle, Tag, FileText, Barcode, DollarSign, Hash, ChevronRight, AlertCircle } from 'lucide-react'

let slideDirection = 1

const stepVariants = {
  initial: (dir) => ({ x: dir * 50, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    (dir) => ({ x: dir * -50, opacity: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } }),
}

const TOTAL_ETAPAS = 4

function StepDots({ etapa, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width:           i + 1 === etapa ? 24 : 8,
            opacity:         i + 1 <= etapa ? 1 : 0.25,
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
        background:    disabled ? '#C7C7CC' : '#1D1D1F',
        boxShadow:     disabled ? 'none' : '0 8px 24px rgba(0,0,0,0.14)',
        cursor:        disabled ? 'not-allowed' : 'pointer',
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
  const [etapa, setEtapa] = useState(1)
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [setoresDoBanco, setSetoresDoBanco] = useState([])
  const [marcasDoBanco, setMarcasDoBanco] = useState([])

  // Estado para Produto Existente (Fila de Lotes)
  const [produtoExistente, setProdutoExistente] = useState(null)
  const debounceRef = useRef(null)

  const [dados, setDados] = useState({
    setorId: '', setorNome: '', marcaId: '', marcaNome: '',
    tipo: '', nome: '', precoCusto: '', precoVenda: '',
    estoque: '', codigoBarras: ''
  })

  useEffect(() => {
    async function buscarSetores() {
      const { data, error } = await supabase.from('setores').select('*').order('nome')
      if (!error) setSetoresDoBanco(data)
    }
    buscarSetores()
  }, [])

  useEffect(() => {
    if (dados.setorId) {
      async function buscarMarcas() {
        const { data, error } = await supabase
          .from('marcas').select('*').eq('setor_id', dados.setorId).order('nome')
        if (!error) setMarcasDoBanco(data)
      }
      buscarMarcas()
    }
  }, [dados.setorId])

  const avancar = () => { slideDirection = 1;  setEtapa(e => e + 1) }
  const voltar  = () => { slideDirection = -1; setEtapa(e => e - 1) }

  // Função para verificar se o código de barras já existe no banco
  const handleCodigoBarrasChange = (e) => {
    const codigo = e.target.value
    setDados(prev => ({ ...prev, codigoBarras: codigo }))

    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    if (codigo.length >= 4) {
      debounceRef.current = setTimeout(async () => {
        const { data } = await supabase.from('produtos').select('*').eq('codigo_barras', codigo).single()
        if (data) {
          setProdutoExistente(data)
          setDados(prev => ({ ...prev, nome: data.nome, precoVenda: data.preco_venda }))
        } else {
          setProdutoExistente(null)
        }
      }, 500) // Aguarda meio segundo após parar de digitar para não flodar o banco
    } else {
      setProdutoExistente(null)
    }
  }

  async function finalizarCadastro() {
    setCarregando(true)
    try {
      let produtoId = null;

      if (produtoExistente) {
        // PRODUTO JÁ EXISTE NO CATÁLOGO - Vamos apenas atualizar o preço universal e pegar o ID
        produtoId = produtoExistente.id;
        
        await supabase.from('produtos')
          .update({ preco_venda: parseFloat(dados.precoVenda) || 0 })
          .eq('id', produtoId);

      } else {
        // PRODUTO NOVO - Cadastra no catálogo principal
        const { data: novoProduto, error: erroProd } = await supabase.from('produtos').insert([{
          nome:          dados.nome,
          tipo:          dados.tipo,
          preco_venda:   parseFloat(dados.precoVenda) || 0,
          codigo_barras: dados.tipo === 'solo' ? dados.codigoBarras : null,
          marca_id:      dados.marcaId
        }]).select().single()

        // Se der erro de constraint (caso a busca em tempo real falhou mas o BD pegou na hora de salvar)
        if (erroProd) {
            if (erroProd.code === '23505') { // Erro padrão do Postgres para UNIQUE CONSTRAINT
                 throw new Error("Este código de barras já foi cadastrado em outro produto. Volte e verifique.")
            }
            throw erroProd
        }
        
        produtoId = novoProduto.id;
      }

      // CRIA O LOTE DE ESTOQUE - Fila Elegante
      // Verifica se já existe um lote ativo para esse produto
      const { data: loteAtivo } = await supabase.from('estoque_lotes')
        .select('id').eq('produto_id', produtoId).eq('status', 'ativo').limit(1)

      const statusDoLote = loteAtivo && loteAtivo.length > 0 ? 'espera' : 'ativo';

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
    setDados({ setorId: '', setorNome: '', marcaId: '', marcaNome: '',
      tipo: '', nome: '', precoCusto: '', precoVenda: '', estoque: '', codigoBarras: '' })
    setProdutoExistente(null)
    setSucesso(false)
    setEtapa(1)
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm bg-white rounded-3xl p-10 text-center"
          style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.08)' }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={34} strokeWidth={1.5} className="text-green-500" />
            </div>
          </div>
          <h2 className="font-bold text-[#1D1D1F] text-2xl mb-2" style={{ letterSpacing: '-0.02em' }}>
            {produtoExistente ? 'Lote adicionado!' : 'Produto salvo!'}
          </h2>
          <p className="text-[#86868B] text-sm mb-10">
            {produtoExistente 
              ? 'Uma nova remessa foi adicionada à fila de estoque deste produto.' 
              : 'O produto foi cadastrado com sucesso no sistema.'}
          </p>
          <div className="flex flex-col gap-3">
            <PrimaryButton onClick={reiniciarFormulario} icon={null}>
              Cadastrar outro produto
            </PrimaryButton>
            <button
              onClick={() => navigate('/admin-home')}
              className="h-14 w-full rounded-2xl bg-[#F5F5F7] text-[#1D1D1F] font-semibold text-base hover:bg-[#EBEBED] transition-colors focus:outline-none"
            >
              Finalizar
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center px-4 py-10">

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm mb-4 px-1"
      >
        <p className="text-xs font-semibold tracking-widest text-[#86868B] uppercase">
          Cadastro Rápido · Caixa
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-sm bg-white rounded-3xl px-7 pt-8 pb-7 relative overflow-hidden"
        style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.08)' }}
      >
        
        {/* Aviso sutil na Etapa 4 se o produto existir */}
        {etapa === 4 && produtoExistente && (
            <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-[11px] font-bold uppercase tracking-wider py-1.5 text-center flex justify-center items-center gap-1.5 z-10">
                <AlertCircle size={12} />
                Lote novo para produto existente
            </div>
        )}

        <div className={etapa === 4 && produtoExistente ? 'mt-4' : ''}>
           <StepDots etapa={etapa} total={TOTAL_ETAPAS} />
        </div>

        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={slideDirection}>

            {etapa === 1 && (
              <motion.div key="etapa1" custom={slideDirection} variants={stepVariants}
                initial="initial" animate="animate" exit="exit"
              >
                <StepLabel>Em qual setor o produto se encaixa?</StepLabel>
                <div className="flex flex-col gap-3">
                  {setoresDoBanco.map(s => (
                    <SelectButton
                      key={s.id}
                      onClick={() => { setDados({ ...dados, setorId: s.id, setorNome: s.nome }); avancar() }}
                    >
                      {s.nome}
                    </SelectButton>
                  ))}
                  {setoresDoBanco.length === 0 && (
                    <p className="text-[#86868B] text-sm italic text-center py-4">Buscando setores…</p>
                  )}
                </div>
              </motion.div>
            )}

            {etapa === 2 && (
              <motion.div key="etapa2" custom={slideDirection} variants={stepVariants}
                initial="initial" animate="animate" exit="exit"
              >
                <StepLabel>Qual a marca de {dados.setorNome}?</StepLabel>
                <div className="flex flex-col gap-3">
                  {marcasDoBanco.map(m => (
                    <SelectButton
                      key={m.id}
                      onClick={() => { setDados({ ...dados, marcaId: m.id, marcaNome: m.nome }); avancar() }}
                    >
                      {m.nome}
                    </SelectButton>
                  ))}
                  {marcasDoBanco.length === 0 && (
                    <p className="text-[#86868B] text-sm italic text-center py-4">
                      Nenhuma marca encontrada para este setor.
                    </p>
                  )}
                </div>
                <div className="mt-6"><BackButton onClick={voltar} label="Voltar para Setores" /></div>
              </motion.div>
            )}

            {etapa === 3 && (
              <motion.div key="etapa3" custom={slideDirection} variants={stepVariants}
                initial="initial" animate="animate" exit="exit"
              >
                <StepLabel>Como esse item é vendido?</StepLabel>
                <div className="flex flex-col gap-3">
                  <SelectButton
                    onClick={() => { setDados({ ...dados, tipo: 'solo' }); avancar() }}
                    subtitle="Item individual com código de barras próprio."
                  >
                    Produto Solo
                  </SelectButton>
                  <SelectButton
                    onClick={() => { setDados({ ...dados, tipo: 'kit_fixo' }); avancar() }}
                    subtitle="Um conjunto que já vem pronto da marca."
                  >
                    Kit Fixo (Fechado)
                  </SelectButton>
                </div>
                <div className="mt-6"><BackButton onClick={voltar} label="Voltar para Marcas" /></div>
              </motion.div>
            )}

            {etapa === 4 && (
              <motion.div key="etapa4" custom={slideDirection} variants={stepVariants}
                initial="initial" animate="animate" exit="exit"
              >
                <StepLabel>Informações do Produto</StepLabel>

                <div className="flex flex-col gap-4">

                  {dados.tipo === 'solo' && (
                    <StyledInput
                      icon={Barcode}
                      label="Código de Barras (Bipe 1º)"
                      placeholder="Bipe com o leitor..."
                      value={dados.codigoBarras}
                      onChange={handleCodigoBarrasChange}
                      inputMode="numeric"
                    />
                  )}

                  <StyledInput
                    icon={FileText}
                    label="Nome do Produto / Kit"
                    placeholder="Ex: Perfume Importado 100ml"
                    value={dados.nome}
                    disabled={!!produtoExistente}
                    onChange={e => setDados({ ...dados, nome: e.target.value })}
                  />

                  <StyledInput
                    icon={DollarSign}
                    label="Preço de Compra (Lote Atual)"
                    type="number"
                    placeholder="0,00"
                    inputMode="decimal"
                    value={dados.precoCusto}
                    onChange={e => setDados({ ...dados, precoCusto: e.target.value })}
                  />

                  <StyledInput
                    icon={Tag}
                    label="Preço de Venda (Universal)"
                    type="number"
                    placeholder="0,00"
                    inputMode="decimal"
                    value={dados.precoVenda}
                    onChange={e => setDados({ ...dados, precoVenda: e.target.value })}
                  />

                  <StyledInput
                    icon={Hash}
                    label="Quantidade (Qtd Entrando)"
                    type="number"
                    placeholder="0"
                    inputMode="numeric"
                    value={dados.estoque}
                    onChange={e => setDados({ ...dados, estoque: e.target.value })}
                  />

                  <div className="mt-2">
                    <PrimaryButton
                      onClick={finalizarCadastro}
                      disabled={carregando}
                      icon={carregando ? null : CheckCircle}
                    >
                      {carregando ? 'Salvando…' : (produtoExistente ? 'Salvar Novo Lote' : 'Finalizar Cadastro')}
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