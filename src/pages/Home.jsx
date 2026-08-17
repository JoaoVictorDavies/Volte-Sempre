import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Layers, ShieldCheck, ArrowRight } from 'lucide-react'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay },
})

const features = [
  { icon: Layers, label: 'Sistema Para Todos' },
  { icon: ShieldCheck, label: 'Seguro e Protegido' },
  { icon: Sparkles, label: 'Experiência Fácil' },
]

const dailyPalettes = [
  // Domingo — solar
  ['#FBBF24', '#FB7185', '#F97316'],
  // Segunda — índigo e violeta
  ['#6366F1', '#8B5CF6', '#A855F7'],
  // Terça — esmeralda e teal
  ['#10B981', '#14B8A6', '#34D399'],
  // Quarta — oceano
  ['#0EA5E9', '#2563EB', '#38BDF8'],
  // Quinta — rosa e roxo
  ['#EC4899', '#A855F7', '#F472B6'],
  // Sexta — âmbar e sunset
  ['#F59E0B', '#F97316', '#EF4444'],
  // Sábado — ciano e azul profundo
  ['#22D3EE', '#3B82F6', '#1E40AF'],
]

const blobTransition = (duration, delay = 0) => ({
  duration,
  delay,
  repeat: Infinity,
  ease: 'easeInOut',
})

export default function Home() {
  const palette = dailyPalettes[new Date().getDay()]

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center overflow-hidden bg-[#F5F5F7]">
      {/* Daily Animated Mesh Gradient */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-50"
          style={{ backgroundColor: palette[0], willChange: 'transform' }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={blobTransition(18)}
        />

        <motion.div
          className="absolute top-[20%] -right-40 w-[38rem] h-[38rem] rounded-full blur-3xl opacity-50"
          style={{ backgroundColor: palette[1], willChange: 'transform' }}
          animate={{
            x: [0, -45, 25, 0],
            y: [0, 35, -30, 0],
            scale: [1, 0.92, 1.08, 1],
          }}
          transition={blobTransition(22, 1)}
        />

        <motion.div
          className="absolute -bottom-48 left-[18%] w-[36rem] h-[36rem] rounded-full blur-3xl opacity-50"
          style={{ backgroundColor: palette[2], willChange: 'transform' }}
          animate={{
            x: [0, 40, -35, 0],
            y: [0, -25, 35, 0],
            scale: [1, 1.08, 0.94, 1],
          }}
          transition={blobTransition(20, 2)}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        {/* Eyebrow pill */}
        <motion.div {...fadeUp(0)}>
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-white/70 backdrop-blur-md text-[#86868B] shadow-sm border border-white/60">
            <Sparkles className="text-indigo-400" size={12} strokeWidth={1.8} />
            Sistema Completo
          </span>
        </motion.div>

        {/* Logo / Título */}
        <motion.h1
          {...fadeUp(0.1)}
          className="mt-6 font-bold text-[#1D1D1F]"
          style={{
            fontSize: 'clamp(2.4rem, 6vw, 3.8rem)',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
          }}
        >
          VOLTE
          <span className="text-[#86868B] font-light"> | Sempre </span>
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          {...fadeUp(0.2)}
          className="mt-4 text-[#1D1D1F] font-semibold"
          style={{
            fontSize: 'clamp(1.1rem, 3vw, 1.35rem)',
            letterSpacing: '-0.01em',
          }}
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
              <Icon className="text-indigo-400" size={15} strokeWidth={1.6} />
              {label}
            </div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div {...fadeUp(0.45)} className="mt-10 w-full max-w-xs">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Link
              to="/login"
              aria-label="Entrar no sistema VOLTE"
              className="group flex items-center justify-center gap-3 w-full px-8 py-4 rounded-2xl bg-[#1D1D1F] text-white font-semibold text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              style={{
                letterSpacing: '-0.01em',
                boxShadow: '0 0 2px rgba(0,0,0,0.10), 0 8px 32px rgba(99,102,241,0.22)',
              }}
            >
              Entrar no sistema
              <ArrowRight
                className="transition-transform duration-300 group-hover:translate-x-1"
                size={18}
                strokeWidth={2}
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