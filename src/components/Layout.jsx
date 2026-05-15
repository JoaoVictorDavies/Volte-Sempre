import { Outlet, Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-6 bg-white/70 backdrop-blur-md border-b border-black/[0.06]"
      >
        <Link
          to="/"
          className="flex items-baseline gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
          aria-label="VOLTE — Página inicial"
        >
          <span
            className="font-bold text-[#1D1D1F] tracking-tight"
            style={{ fontSize: '1.15rem', letterSpacing: '-0.03em' }}
          >
            VOLTE
          </span>
          <span
            className="text-[#86868B] font-normal italic"
            style={{ fontSize: '0.8rem', letterSpacing: '-0.01em' }}
          >
            Faça acontecer.
          </span>
        </Link>
      </motion.header>

      {/* ── Conteúdo principal ── */}
      <main className="flex-grow flex flex-col pt-14">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="py-5 flex items-center justify-center border-t border-black/[0.05]">
        <p className="text-[#86868B] text-xs" style={{ letterSpacing: '0.01em' }}>
          © {new Date().getFullYear()} VOLTE · Todos os direitos reservados.
        </p>
      </footer>

    </div>
  )
}