import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, ShieldCheck, User, UserRoundX, Users } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/useAuth'

export default function Equipe() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [equipe, setEquipe] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [convites, setConvites] = useState([])
  const [emailConvite, setEmailConvite] = useState('')
  const [linkConvite, setLinkConvite] = useState('')
  const [criandoConvite, setCriandoConvite] = useState(false)

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

  const buscarConvites = useCallback(async () => {
    if (!profile) return []
    const { data, error } = await supabase
      .from('convites_loja')
      .select('id, token, email, criado_em, expira_em')
      .eq('loja_id', profile.loja_id)
      .is('aceito_em', null)
      .is('revogado_em', null)
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data || []
  }, [profile])

  useEffect(() => {
    let active = true
    Promise.all([buscarEquipe(), buscarConvites()])
      .then(([members, pendingInvites]) => {
        if (!active) return
        setEquipe(members)
        setConvites(pendingInvites)
      })
      .catch((error) => {
        console.error('Erro ao carregar equipe:', error)
        if (active) setErro('Não foi possível carregar os membros da loja.')
      })
      .finally(() => {
        if (active) setCarregando(false)
      })
    return () => { active = false }
  }, [buscarConvites, buscarEquipe])

  const criarConvite = async (event) => {
    event.preventDefault()
    setErro('')
    setCriandoConvite(true)
    try {
      const { data: token, error } = await supabase.rpc('criar_convite', {
        p_email: emailConvite.trim() || null,
      })
      if (error) throw error

      const link = new URL('/', window.location.origin)
      link.searchParams.set('convite', token)
      setLinkConvite(link.toString())
      setEmailConvite('')
      setConvites(await buscarConvites())
    } catch (error) {
      console.error('Erro ao criar convite:', error)
      setErro(error.message || 'Não foi possível gerar o convite.')
    } finally {
      setCriandoConvite(false)
    }
  }

  const copiarConvite = async (link = linkConvite) => {
    try {
      await navigator.clipboard.writeText(link)
    } catch (error) {
      console.error('Erro ao copiar convite:', error)
      setErro('Não foi possível copiar o link. Selecione e copie o endereço manualmente.')
    }
  }

  const revogarConvite = async (convite) => {
    if (!window.confirm('Revogar este convite? O link deixará de funcionar.')) return
    try {
      const { error } = await supabase
        .from('convites_loja')
        .update({ revogado_em: new Date().toISOString() })
        .eq('id', convite.id)
        .eq('loja_id', profile.loja_id)
      if (error) throw error
      setConvites(await buscarConvites())
      if (convite.token === new URL(window.location.href).searchParams.get('convite')) {
        setLinkConvite('')
      }
    } catch (error) {
      console.error('Erro ao revogar convite:', error)
      setErro('Não foi possível revogar o convite.')
    }
  }

  const desativarMembro = async (membro) => {
    if (membro.role === 'dono') return
    if (!window.confirm(`Desativar o acesso de ${membro.nome}?`)) return

    setCarregando(true)
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ ativo: false })
        .eq('id', membro.id)
        .eq('loja_id', profile.loja_id)
      if (error) throw error

      setEquipe(await buscarEquipe())
    } catch (error) {
      console.error('Erro ao desativar membro:', error)
      setErro('Não foi possível desativar esse acesso.')
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

      {erro && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{erro}</p>}

      <section className="mt-7 rounded-3xl border border-black/[0.07] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#191813]">Convidar funcionário</h2>
        <p className="mt-1 text-sm text-black/55">
          Gere um link para a pessoa entrar com a conta Google e acessar o caixa.
        </p>
        <form onSubmit={criarConvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={emailConvite}
            onChange={(event) => setEmailConvite(event.target.value)}
            placeholder="E-mail (opcional)"
            className="min-w-0 flex-1 rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#c39b18]"
          />
          <button
            type="submit"
            disabled={criandoConvite}
            className="rounded-xl bg-[#ffd60a] px-5 py-3 text-sm font-semibold text-[#17140a] disabled:opacity-50"
          >
            {criandoConvite ? 'Gerando...' : 'Gerar convite'}
          </button>
        </form>
        {linkConvite && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Link do convite criado"
              readOnly
              value={linkConvite}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => copiarConvite()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 text-sm font-medium"
            >
              <Copy size={16} /> Copiar link
            </button>
          </div>
        )}
        {convites.length > 0 && (
          <ul className="mt-5 divide-y divide-black/[0.06]">
            {convites.map((convite) => {
              const link = new URL('/', window.location.origin)
              link.searchParams.set('convite', convite.token)
              return (
                <li key={convite.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{convite.email || 'Convite sem e-mail definido'}</p>
                    <p className="mt-1 text-xs text-black/45">
                      Expira em {new Date(convite.expira_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => copiarConvite(link.toString())}
                      className="rounded-lg border border-black/10 px-3 py-2 text-xs font-medium"
                    >
                      Copiar link
                    </button>
                    <button
                      type="button"
                      onClick={() => revogarConvite(convite)}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700"
                    >
                      Revogar
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

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
