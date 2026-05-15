import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Layers, ShieldCheck, ArrowRight } from 'lucide-react'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay },
})

const features = [
  { icon: Layers,      label: 'Sistema Para Todos'      },
  { icon: ShieldCheck, label: 'Seguro e Protegido' },
  { icon: Sparkles,    label: 'Experiência Fácil'},
]

export default function Home() {
  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #e8eaf0 0%, #F5F5F7 60%, #ededf0 100%)',
      }}
    >
      {/* Orb decorativo de fundo — apenas transform/opacity, zero layout cost */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">

        {/* Eyebrow pill */}
        <motion.div {...fadeUp(0)}>
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-white/70 backdrop-blur-md text-[#86868B] shadow-sm border border-white/60">
            <Sparkles size={12} strokeWidth={1.8} className="text-indigo-400" />
            Sistema Completo
          </span>
        </motion.div>

        {/* Logo / Título */}
        <motion.h1
          {...fadeUp(0.1)}
          className="mt-6 font-bold text-[#1D1D1F]"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 3.8rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}
        >
          VOLTE
          <span className="text-[#86868B] font-light"> | Sempre </span>
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          {...fadeUp(0.2)}
          className="mt-4 text-[#1D1D1F] font-semibold"
          style={{ fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', letterSpacing: '-0.01em' }}
        >
          Bem-vindo ao sistema VOLTE
        </motion.p>

        <motion.p
          {...fadeUp(0.25)}
          className="mt-2 text-[#86868B] text-base leading-relaxed max-w-sm"
        >
          O coração da sua operação, integração de processos e experiência premium — tudo em um só lugar.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          {...fadeUp(0.35)}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/70 backdrop-blur-md shadow-sm border border-white/60 text-sm text-[#1D1D1F] font-medium"
            >
              <Icon size={15} strokeWidth={1.6} className="text-indigo-400" />
              {label}
            </div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          {...fadeUp(0.45)}
          className="mt-10 w-full max-w-xs"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Link
              to="/login"
              className="group flex items-center justify-center gap-3 w-full px-8 py-4 rounded-2xl bg-[#1D1D1F] text-white font-semibold text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              style={{
                boxShadow: '0 8px 32px rgba(99,102,241,0.22), 0 2px 8px rgba(0,0,0,0.10)',
                letterSpacing: '-0.01em',
              }}
              aria-label="Entrar no sistema VOLTE"
            >
              Entrar no sistema
              <ArrowRight
                size={18}
                strokeWidth={2}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </motion.div>
        </motion.div>

        {/* Bênção — toque humano */}
        <motion.p
          {...fadeUp(0.55)}
          className="mt-10 text-sm text-[#86868B]/60 italic"
          style={{ letterSpacing: '0.01em' }}
        >
          "Deus abençoe a sua jornada de trabalho"
        </motion.p>

      </div>
    </div>
  )
}
