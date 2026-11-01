import { Link, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import BrandLogo from './BrandLogo'
import AppByVolte from './AppByVolte'

export default function Layout() {
  const { profile, signOut } = useAuth()

  const sair = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Erro ao sair da conta:', error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f5ee]">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-black/[0.06] bg-[#f7f5ee]/90 px-5 backdrop-blur-md sm:px-8">
        <Link to="/admin-home" className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b88a00]">
          <BrandLogo className="h-9 w-9" />
          <span className="text-sm font-semibold tracking-tight text-[#191813]">Volte!Sempre</span>
        </Link>
        <div className="flex items-center gap-4">
          {profile?.nome && <span className="hidden text-sm text-black/50 sm:inline">{profile.nome}</span>}
          <button
            type="button"
            onClick={sair}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-xs font-medium text-black/65 transition hover:border-black/25 hover:text-black"
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      </header>
      <main className="flex flex-1 flex-col pt-2">
        <Outlet />
      </main>
      <footer className="border-t border-black/[0.06] py-5 text-center">
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <p className="text-xs tracking-wide text-black/40">© {new Date().getFullYear()} Volte!Sempre</p>
          <AppByVolte />
        </div>
      </footer>
    </div>
  )
}
