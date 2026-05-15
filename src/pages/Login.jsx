import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, ShieldCheck, ArrowLeft, Lock } from 'lucide-react'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -12 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay },
})

export default function Login() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState('selecao')
  const [senhaInput, setSenhaInput] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const verificarPinAdmin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('pin_admin')
        .limit(1)
        .single()
      if (error) throw error
      if (data && data.pin_admin === senhaInput) {
        navigate('/admin-home')
      } else {
        setErro('PIN incorreto. Tente novamente.')
      }
    } catch (error) {
      console.error(error)
      setErro('Erro ao verificar PIN. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #e8eaf0 0%, #F5F5F7 60%, #ededf0 100%)',
      }}
    >
      {/* Orb decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">

        {/* Eyebrow */}
        <motion.div {...fadeUp(0)} className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-white/70 backdrop-blur-md text-[#86868B] shadow-sm border border-white/60">
            VOLTE · Sistemas
          </span>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── TELA 1: SELEÇÃO ── */}
          {etapa === 'selecao' && (
            <motion.div
              key="selecao"
              {...fadeUp(0.05)}
              className="flex flex-col items-center"
            >
              <h2
                className="font-bold text-[#1D1D1F] text-center mb-2"
                style={{ fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', letterSpacing: '-0.025em' }}
              >
                Operação
              </h2>
              <p className="text-[#86868B] text-base mb-10 text-center">
                Escolha como deseja acessar o sistema.
              </p>

              <div className="flex flex-col gap-4 w-full">

                {/* Vendedor */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  onClick={() => navigate('/funcionario-home')}
                  className="group flex items-center gap-4 w-full p-6 bg-white/70 backdrop-blur-md rounded-3xl border border-white/60 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
                  aria-label="Entrar como Vendedor"
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 transition-colors duration-300 group-hover:bg-blue-100">
                    <ShoppingBag size={20} strokeWidth={1.6} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1D1D1F] text-base" style={{ letterSpacing: '-0.01em' }}>
                      Gaveta do Caixa
                    </p>
                    <p className="text-[#86868B] text-sm mt-0.5">Abrir o Caixa, Checar Estoque e Vender</p>
                  </div>
                </motion.button>

                {/* Administrador */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  onClick={() => setEtapa('admin')}
                  className="group flex items-center gap-4 w-full p-6 bg-white/70 backdrop-blur-md rounded-3xl border border-white/60 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
                  aria-label="Entrar como Administrador"
                >
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0 transition-colors duration-300 group-hover:bg-indigo-100">
                    <ShieldCheck size={20} strokeWidth={1.6} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1D1D1F] text-base" style={{ letterSpacing: '-0.01em' }}>
                      Entrar como Administrador
                    </p>
                    <p className="text-[#86868B] text-sm mt-0.5">Requer PIN de acesso</p>
                  </div>
                </motion.button>

              </div>
            </motion.div>
          )}

          {/* ── TELA 2: PIN ADMIN ── */}
          {etapa === 'admin' && (
            <motion.div
              key="admin"
              {...fadeUp(0.05)}
              className="flex flex-col items-center"
            >
              <div className="w-14 h-14 rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 flex items-center justify-center text-indigo-500 mb-6"
                style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}
              >
                <Lock size={24} strokeWidth={1.5} />
              </div>

              <h2
                className="font-bold text-[#1D1D1F] text-center mb-1"
                style={{ fontSize: 'clamp(1.6rem, 4vw, 2rem)', letterSpacing: '-0.025em' }}
              >
                Acesso Restrito
              </h2>
              <p className="text-[#86868B] text-base mb-8 text-center">
                Digite o PIN do Administrador.
              </p>

              <form
                onSubmit={verificarPinAdmin}
                className="flex flex-col gap-4 w-full bg-white/70 backdrop-blur-md rounded-3xl p-8 border border-white/60"
                style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
              >
                <input
                  type="password"
                  placeholder="• • • • • •"
                  value={senhaInput}
                  onChange={(e) => setSenhaInput(e.target.value)}
                  className="w-full bg-[#F5F5F7] border-0 rounded-2xl px-5 py-4 text-center text-2xl tracking-[0.6em] text-[#1D1D1F] placeholder-[#C7C7CC] focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                  aria-label="PIN do Administrador"
                />

                <AnimatePresence>
                  {erro && (
                    <motion.p
                      key="erro"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-500 text-sm text-center font-medium"
                      role="alert"
                    >
                      {erro}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  style={{
                    background: loading ? '#C7C7CC' : '#1D1D1F',
                    boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.18)',
                    letterSpacing: '-0.01em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                  aria-busy={loading}
                >
                  {loading ? 'Verificando…' : 'Acessar Painel'}
                </motion.button>
              </form>

              <button
                onClick={() => { setEtapa('selecao'); setSenhaInput(''); setErro('') }}
                className="mt-7 flex items-center gap-1.5 text-sm text-[#86868B] hover:text-[#1D1D1F] font-medium transition-colors focus:outline-none focus-visible:underline"
                aria-label="Voltar para seleção de perfil"
              >
                <ArrowLeft size={15} strokeWidth={2} />
                Voltar para seleção
              </button>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Bênção */}
        <motion.p
          {...fadeUp(0.3)}
          className="mt-12 text-center text-sm italic text-[#86868B]/50"
          style={{ letterSpacing: '0.01em' }}
        >
          "Deus abençoe a sua jornada de trabalho"
        </motion.p>

      </div>
    </div>
  )
}