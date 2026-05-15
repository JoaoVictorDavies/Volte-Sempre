import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { motion } from 'framer-motion'
import {
  FolderOpen, Tag, DollarSign, CheckCircle,
  LayoutGrid, Barcode, Hash, ChevronDown,
  PackageCheck, ListChecks, ArrowRight
} from 'lucide-react'

// ── Primitivos de UI ──────────────────────────────────────────

function SectionCard({ icon: Icon, number, title, children }) {
  return (
    <div className="bg-white rounded-2xl p-7" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center text-[#86868B] shrink-0">
          <Icon size={17} strokeWidth={1.7} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-[#86868B] uppercase tracking-widest">{number}.</span>
          <h3 className="font-semibold text-[#1D1D1F] text-base" style={{ letterSpacing: '-0.01em' }}>
            {title}
          </h3>
        </div>
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-[#86868B] uppercase tracking-wide mb-1.5">
      {children}
      {required && <span className="text-blue-500 ml-0.5">*</span>}
    </label>
  )
}

const inputBase = `
  w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-[#1D1D1F]
  text-sm placeholder-[#C7C7CC]
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent
  transition-all duration-200
`

const selectBase = `
  w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-[#1D1D1F]
  text-sm appearance-none cursor-pointer
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent
  transition-all duration-200
  disabled:opacity-40 disabled:cursor-not-allowed
`

function StyledSelect({ children, ...props }) {
  return (
    <div className="relative">
      <select {...props} className={selectBase}>
        {children}
      </select>
      <ChevronDown
        size={15}
        strokeWidth={2}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none"
      />
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export default function CadastroPrecisao() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [setoresDoBanco, setSetoresDoBanco] = useState([])
  const [marcasDoBanco, setMarcasDoBanco] = useState([])

  const [dados, setDados] = useState({
    setorId: '', marcaId: '', tipo: 'solo', nome: '',
    precoCusto: '', precoVenda: '', estoque: '', codigoBarras: ''
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
    } else {
      setMarcasDoBanco([])
    }
  }, [dados.setorId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setDados(prev => ({ ...prev, [name]: value }))
  }

  const salvarProduto = async () => {
    if (!dados.nome || !dados.precoVenda || !dados.setorId || !dados.marcaId) {
      alert('Por favor, preencha todos os campos obrigatórios (*).')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('produtos').insert([{
        nome:          dados.nome,
        tipo:          dados.tipo,
        preco_custo:   parseFloat(dados.precoCusto) || 0,
        preco_venda:   parseFloat(dados.precoVenda) || 0,
        estoque:       parseInt(dados.estoque) || 0,
        codigo_barras: dados.tipo === 'solo' ? dados.codigoBarras : null,
        marca_id:      dados.marcaId
      }])
      if (error) throw error
      setSucesso(true)
    } catch (err) {
      console.error('Erro inesperado:', err)
      alert('Ocorreu um erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetarFormulario = () => {
    setDados({
      setorId: '', marcaId: '', tipo: 'solo', nome: '',
      precoCusto: '', precoVenda: '', estoque: '', codigoBarras: ''
    })
    setSucesso(false)
  }

  // ── Tela de sucesso ──
  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md bg-white rounded-3xl p-12 text-center"
          style={{ boxShadow: '0 4px 48px rgba(0,0,0,0.09)' }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={38} strokeWidth={1.4} className="text-green-500" />
            </div>
          </div>
          <h2
            className="font-bold text-[#1D1D1F] text-2xl mb-2"
            style={{ letterSpacing: '-0.025em' }}
          >
            Produto cadastrado!
          </h2>
          <p className="text-[#86868B] text-sm mb-10 leading-relaxed">
            O produto foi salvo com sucesso no sistema.
          </p>

          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={resetarFormulario}
              className="w-full h-13 h-[52px] flex items-center justify-center gap-2 rounded-2xl font-semibold text-white text-sm"
              style={{ background: '#1D1D1F', boxShadow: '0 6px 20px rgba(0,0,0,0.13)', letterSpacing: '-0.01em' }}
            >
              Cadastrar outro produto
              <ArrowRight size={16} strokeWidth={2} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => navigate('/visao-estoque')}
              className="w-full h-[52px] flex items-center justify-center gap-2 rounded-2xl font-semibold text-sm bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            >
              <PackageCheck size={16} strokeWidth={1.8} />
              Ver produto no estoque
            </motion.button>

            <button
              onClick={() => navigate('/admin-home')}
              className="w-full h-[52px] rounded-2xl font-semibold text-sm text-[#86868B] hover:text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#EBEBED] transition-colors"
            >
              Finalizar
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Formulário principal ──
  return (
    <div className="min-h-screen bg-[#F5F5F7] px-4 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 px-1"
        >
          <p className="text-xs font-semibold tracking-widest text-[#86868B] uppercase mb-1">
            VOLTE · Estoque
          </p>
          <h1
            className="font-bold text-[#1D1D1F]"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '-0.025em' }}
          >
            Cadastro com Precisão
          </h1>
          <p className="text-[#86868B] text-sm mt-1">
            Preencha todos os dados do produto em uma única tela.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.05 }}
          className="flex flex-col gap-5"
        >

          {/* ── Card 1: Classificação ── */}
          <SectionCard icon={FolderOpen} number="1" title="Classificação">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <FieldLabel required>Setor</FieldLabel>
                <StyledSelect name="setorId" value={dados.setorId} onChange={handleChange}>
                  <option value="">Selecione um setor…</option>
                  {setoresDoBanco.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </StyledSelect>
              </div>

              <div>
                <FieldLabel required>Marca</FieldLabel>
                <StyledSelect
                  name="marcaId"
                  value={dados.marcaId}
                  onChange={handleChange}
                  disabled={!dados.setorId}
                >
                  <option value="">Selecione a marca…</option>
                  {marcasDoBanco.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </StyledSelect>
              </div>

              <div>
                <FieldLabel required>Tipo de Venda</FieldLabel>
                <StyledSelect name="tipo" value={dados.tipo} onChange={handleChange}>
                  <option value="solo">Produto Solo</option>
                  <option value="kit_fixo">Kit Fixo (Fechado)</option>
                </StyledSelect>
              </div>
            </div>
          </SectionCard>

          {/* ── Card 2: Detalhes do Produto ── */}
          <SectionCard icon={Tag} number="2" title="Detalhes do Produto">
            <div className="grid grid-cols-1 gap-5">
              <div>
                <FieldLabel required>Nome do Produto / Kit</FieldLabel>
                <input
                  type="text"
                  name="nome"
                  value={dados.nome}
                  onChange={handleChange}
                  placeholder="Ex: Kit Malbec Tradicional Dia dos Pais"
                  className={inputBase}
                />
              </div>

              {dados.tipo === 'solo' && (
                <div>
                  <FieldLabel>Código de Barras</FieldLabel>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none">
                      <Barcode size={16} strokeWidth={1.6} />
                    </div>
                    <input
                      type="text"
                      name="codigoBarras"
                      value={dados.codigoBarras}
                      onChange={handleChange}
                      placeholder="Bipe com o leitor ou digite o código…"
                      className={`${inputBase} pl-11`}
                    />
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── Card 3: Financeiro e Estoque ── */}
          <SectionCard icon={DollarSign} number="3" title="Financeiro e Estoque">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              <div>
                <FieldLabel>Preço de Custo (R$)</FieldLabel>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none">
                    <DollarSign size={15} strokeWidth={1.6} />
                  </div>
                  <input
                    type="number"
                    name="precoCusto"
                    value={dados.precoCusto}
                    onChange={handleChange}
                    placeholder="0,00"
                    inputMode="decimal"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

              {/* Preço de Venda — destaque sutil */}
              <div>
                <FieldLabel required>Preço de Venda (R$)</FieldLabel>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none">
                    <DollarSign size={15} strokeWidth={1.8} />
                  </div>
                  <input
                    type="number"
                    name="precoVenda"
                    value={dados.precoVenda}
                    onChange={handleChange}
                    placeholder="0,00"
                    inputMode="decimal"
                    className={`
                      w-full h-12 pl-10 pr-4 rounded-xl border border-green-200 bg-green-50
                      text-green-800 font-semibold text-sm placeholder-green-300
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white focus:border-transparent
                      transition-all duration-200
                    `}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Estoque Inicial</FieldLabel>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none">
                    <Hash size={15} strokeWidth={1.6} />
                  </div>
                  <input
                    type="number"
                    name="estoque"
                    value={dados.estoque}
                    onChange={handleChange}
                    placeholder="Qtd"
                    inputMode="numeric"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

            </div>
          </SectionCard>

          {/* ── Barra de ações ── */}
          <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-2 pb-8">
            <button
              type="button"
              onClick={resetarFormulario}
              className="h-12 px-7 rounded-2xl border border-gray-200 bg-white text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Cancelar
            </button>

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              type="button"
              onClick={salvarProduto}
              disabled={loading}
              className="h-12 px-10 rounded-2xl font-semibold text-white text-sm flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-opacity"
              style={{
                background:    loading ? '#C7C7CC' : '#1D1D1F',
                boxShadow:     loading ? 'none' : '0 6px 20px rgba(0,0,0,0.13)',
                cursor:        loading ? 'not-allowed' : 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? (
                'Salvando…'
              ) : (
                <>
                  <ListChecks size={16} strokeWidth={1.8} />
                  Salvar Produto
                </>
              )}
            </motion.button>
          </div>

        </motion.div>
      </div>
    </div>
  )
}