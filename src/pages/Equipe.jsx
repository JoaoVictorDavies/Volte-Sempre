import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, User, UserRoundX, Users } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/useAuth'

export default function Equipe() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [equipe, setEquipe] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const buscarEquipe = useCallback(async () => {
    if (!profile) return []
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, role, ativo, criado_em')
      .eq('loja_id', profile.loja_id)
      .order('criado_em', { ascending: true })

    if (error) throw error
    return data || []
  }, [profile])

  useEffect(() => {
    let active = true
    buscarEquipe()
      .then((members) => {
        if (active) setEquipe(members)
      })
      .catch((error) => {
        console.error('Erro ao carregar equipe:', error)
        if (active) setErro('Não foi possível carregar os membros da loja.')
      })
      .finally(() => {
        if (active) setCarregando(false)
      })
    return () => { active = false }
  }, [buscarEquipe])

  const desativarMembro = async (membro) => {
    if (membro.role === 'dono') return
    if (!window.confirm(`Desativar o acesso de ${membro.nome}?`)) return

    setCarregando(true)
    const { error } = await supabase
      .from('usuarios')
      .update({ ativo: false })
      .eq('id', membro.id)
      .eq('loja_id', profile.loja_id)
    if (error) {
      console.error('Erro ao desativar membro:', error)
      setErro('Não foi possível desativar esse acesso.')
      return
    }

    try {
      setEquipe(await buscarEquipe())
    } catch (error) {
      console.error('Erro ao atualizar equipe:', error)
      setErro('O acesso foi atualizado, mas não foi possível recarregar a equipe.')
    } finally {
      setCarregando(false)
    }
  }

  if (profile?.role !== 'dono') {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-12">
        <h1 className="text-2xl font-semibold text-[#191813]">Gestão da equipe</h1>
        <p className="mt-3 text-sm text-black/55">Esta área está disponível apenas para o proprietário da loja.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
      <button onClick={() => navigate('/admin-home')} className="mb-5 text-sm font-medium text-[#866600] hover:underline">
        ← Voltar ao painel
      </button>
      <header className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1b3] text-[#866600]">
          <Users size={22} />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#191813]">Equipe da loja</h1>
          <p className="mt-1 text-sm text-black/55">Acesso identificado pela conta Google de cada pessoa.</p>
        </div>
      </header>

      <aside className="mt-7 rounded-2xl border border-[#e7d89e] bg-[#fff9df] p-4 text-sm leading-6 text-[#645522]">
        A criação e o envio de convites de funcionários serão habilitados na etapa de onboarding. Não existe mais acesso por PIN.
      </aside>

      {erro && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{erro}</p>}

      <section className="mt-6 overflow-hidden rounded-3xl border border-black/[0.07] bg-white">
        {carregando ? (
          <p className="p-8 text-sm text-black/50">Carregando equipe...</p>
        ) : equipe.length === 0 ? (
          <p className="p-8 text-sm text-black/50">Nenhum perfil foi encontrado nesta loja.</p>
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {equipe.map((membro) => (
              <li key={membro.id} className="flex items-center justify-between gap-4 p-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f2f0e9] text-black/55">
                    {membro.role === 'dono' ? <ShieldCheck size={18} /> : <User size={18} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#191813]">{membro.nome}</p>
                    <p className="truncate text-sm text-black/50">{membro.email || 'E-mail não informado'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${membro.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-black/5 text-black/45'}`}>
                    {membro.role === 'dono' ? 'Proprietário' : membro.ativo ? 'Funcionário' : 'Desativado'}
                  </span>
                  {membro.role !== 'dono' && membro.ativo && (
                    <button
                      type="button"
                      onClick={() => desativarMembro(membro)}
                      title={`Desativar acesso de ${membro.nome}`}
                      className="rounded-full p-2 text-black/35 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <UserRoundX size={17} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
