import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown, ArrowRight, BellRing, Boxes, Check, ChevronDown, CircleHelp,
  MapPin, MessageCircle, PackageCheck, ScanBarcode, ShieldCheck,
  Smartphone, Sparkles, Truck,
} from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import LegalAcceptance from '../components/LegalAcceptance'
import AppByVolte from '../components/AppByVolte'
import { useAuth } from '../context/useAuth'
import { LEGAL_VERSION } from '../constants/legal'
import productMockup from '../assets/mock-product.svg'

const supportNumber = (import.meta.env.VITE_WHATSAPP_SUPPORT_NUMBER || '').replace(/\D/g, '')
const supportLink = (message) => `https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`

const features = [
  {
    icon: ScanBarcode,
    title: 'Leitor de código de barras',
    description: 'Use a câmera do próprio celular para localizar produtos e agilizar o atendimento.',
  },
  {
    icon: BellRing,
    title: 'Notificações que ajudam',
    description: 'Receba alertas de estoque baixo, vendas concluídas e movimentações do caixa.',
  },
  {
    icon: Truck,
    title: 'Gestão de vendas a prazo',
    description: 'Organize fichas de clientes, acompanhe pagamentos e consulte cada movimentação.',
  },
  {
    icon: Sparkles,
    title: 'Cadastro com inteligência artificial',
    description: 'Comece com uma foto ou PDF e deixe a IA sugerir as informações do produto para você revisar.',
  },
  {
    icon: Boxes,
    title: 'Estoque profissional',
    description: 'Controle lotes, validades, quantidades e histórico de vendas em um só lugar.',
  },
  {
    icon: MapPin,
    title: 'Sua loja, onde você estiver',
    description: 'Acompanhe a operação à distância e tome decisões sem precisar estar no balcão.',
  },
  {
    icon: Smartphone,
    title: 'Sem equipamento caro',
    description: 'Use o smartphone que você já tem. Sem depender de leitores ou computadores especiais.',
  },
  {
    icon: MessageCircle,
    title: 'Suporte pelo WhatsApp',
    description: 'Precisa de ajuda? Fale com a equipe pelo WhatsApp e volte logo à sua rotina.',
    href: supportLink('Olá, preciso de ajuda com o Volte!Sempre.'),
  },
]

const faqs = [
  {
    question: 'O Volte!Sempre funciona sem internet?',
    answer: 'É necessária uma conexão com a internet para entrar e sincronizar as operações com segurança. Se a conexão cair, aguarde a rede voltar antes de confirmar novas operações; não assumimos que uma venda offline foi registrada.',
  },
  {
    question: 'Meus dados ficam misturados com os de outras lojas?',
    answer: 'Não. Cada loja tem seu próprio espaço de dados, e as regras de acesso do banco limitam as consultas aos usuários autorizados daquele estabelecimento.',
  },
  {
    question: 'Preciso comprar computador ou leitor de código de barras?',
    answer: 'Não. O sistema foi pensado para funcionar no smartphone e pode usar a câmera do aparelho para ler códigos de barras. Equipamentos adicionais são opcionais.',
  },
  {
    question: 'Como eu entro no sistema?',
    answer: 'O acesso é feito com sua conta Google. Não é preciso criar ou memorizar uma senha específica para o Volte!Sempre.',
  },
  {
    question: 'Posso acompanhar minha loja de outra cidade?',
    answer: 'Sim. Com internet, o proprietário pode acessar os recursos de gestão de qualquer lugar, usando um dispositivo compatível.',
  },
  {
    question: 'O que é Gestão de Vendas a Prazo?',
    answer: 'É o espaço para organizar fichas de clientes, registrar valores pendentes e acompanhar pagamentos e histórico.',
  },
  {
    question: 'Como funciona o cadastro de produto com IA?',
    answer: 'Você pode enviar uma foto ou PDF para a IA sugerir nome, marca e setor. Confira e corrija os dados antes de salvar; a sugestão automática não substitui sua revisão.',
  },
  {
    question: 'A IA cadastra o produto sem eu conferir?',
    answer: 'Não. As sugestões aparecem para revisão. Você informa ou confirma preço e quantidade antes de concluir o cadastro.',
  },
  {
    question: 'Consigo controlar lotes e validade?',
    answer: 'Sim. O estoque é organizado por lotes, com quantidades e informações de entrada para ajudar no acompanhamento. Confira os detalhes de cada lote no painel.',
  },
  {
    question: 'Posso ver quem fez uma venda ou movimentação?',
    answer: 'As operações do sistema são associadas ao usuário autenticado. O histórico e os relatórios disponíveis ajudam o proprietário a acompanhar a atividade da equipe.',
  },
  {
    question: 'Como convido funcionários?',
    answer: 'O proprietário gera um link de convite na área Equipe. O funcionário abre o link e entra com a própria conta Google para ter acesso ao caixa da loja.',
  },
  {
    question: 'Funcionários podem ver configurações e dados de outras lojas?',
    answer: 'Não. Cada convite é vinculado a uma loja, e as permissões limitam o funcionário às funções operacionais autorizadas daquele tenant.',
  },
  {
    question: 'O sistema emite nota fiscal ou integra com TEF?',
    answer: 'No momento, o Volte!Sempre organiza as vendas e os registros do caixa. Emissão fiscal e integração com TEF não estão incluídas nesta apresentação; confirme a disponibilidade antes de contratar.',
  },
  {
    question: 'Como começo a usar?',
    answer: 'Toque em “Entrar ou criar minha loja”, entre com Google e siga as etapas para configurar sua loja e cadastrar os primeiros produtos.',
  },
  {
    question: 'Como consigo suporte?',
    answer: 'Use o botão de suporte desta página para abrir uma conversa no WhatsApp. Se o link não abrir automaticamente, acesse o WhatsApp e solicite ajuda à equipe Volte!Sempre.',
  },
]

function getOAuthErrorMessage(errorCode) {
  return errorCode === 'bad_oauth_state'
    ? 'Não foi possível validar esta tentativa de login. Tente novamente; se persistir, confira as URLs de autenticação no Supabase e use o mesmo endereço da aplicação durante todo o login.'
    : 'Não foi possível concluir o login com Google. Tente novamente.'
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <div className="absolute -inset-8 rounded-[3rem] bg-[#f2bd34]/20 blur-3xl" />
      <div className="relative rounded-[2.4rem] border border-white/10 bg-[#1a1916] p-3 shadow-[0_38px_100px_rgba(0,0,0,.4)] sm:p-5">
        <div className="overflow-hidden rounded-[1.8rem] bg-[#f6f5f0] text-[#171713]">
          <div className="flex items-center justify-between bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-9 w-9" />
              <div>
                <p className="text-sm font-bold">Estoque</p>
                <p className="text-[10px] text-black/45">Minha loja · 24 produtos</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700">
              Loja ativa
            </span>
          </div>
          <div className="border-y border-black/[0.06] bg-white px-5 py-3">
            <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-[#faf9f6] px-3 py-2.5 text-xs text-black/40">
              <ScanBarcode size={15} /> Buscar produto ou ler código
            </div>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9a7520]">Perfumaria</p>
                <h3 className="mt-1 text-sm font-bold">Mais vendidos</h3>
              </div>
              <span className="text-[10px] text-black/40">Ver estoque <ArrowRight className="ml-1 inline" size={12} /></span>
            </div>
            <article className="grid grid-cols-[112px_1fr] overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm sm:grid-cols-[150px_1fr]">
              <img src={productMockup} alt="Frasco ilustrativo de perfume floral" className="h-full min-h-[150px] w-full object-cover" />
              <div className="flex flex-col justify-between p-3 sm:p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[.15em] text-black/40">Essência da loja</p>
                      <h4 className="mt-1 text-sm font-bold leading-tight sm:text-base">Floral Elegance 100 ml</h4>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Ativo</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-black/45">
                    <span className="rounded-md bg-[#f6f3eb] px-2 py-1">Lote 08</span>
                    <span>Validade 09/2027</span>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-black/[0.06] pt-3">
                  <div>
                    <p className="text-[9px] text-black/40">Disponível</p>
                    <p className="mt-0.5 text-xs font-bold">12 unidades</p>
                  </div>
                  <p className="text-base font-extrabold tracking-tight sm:text-lg">R$ 89,90</p>
                </div>
              </div>
            </article>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white p-3"><p className="text-[9px] text-black/40">Itens no estoque</p><p className="mt-1 text-sm font-bold">248</p></div>
              <div className="rounded-xl bg-white p-3"><p className="text-[9px] text-black/40">Atenção</p><p className="mt-1 text-sm font-bold text-amber-700">03 itens</p></div>
              <div className="rounded-xl bg-white p-3"><p className="text-[9px] text-black/40">Vendas hoje</p><p className="mt-1 text-sm font-bold">18</p></div>
            </div>
          </div>
        </div>
        <div className="absolute -left-4 top-[36%] flex items-center gap-3 rounded-2xl border border-white/10 bg-[#24221d] px-4 py-3 text-white shadow-xl sm:-left-10">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffd60a] text-[#1b180d]"><PackageCheck size={18} /></span>
          <div><p className="text-[10px] text-white/45">Estoque atualizado</p><p className="text-xs font-semibold">Tudo sob controle</p></div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { user, profile, isLoading, profileError, signInWithGoogle } = useAuth()
  const [erro, setErro] = useState(() => {
    const url = new URL(window.location.href)
    return url.searchParams.has('error')
      ? getOAuthErrorMessage(url.searchParams.get('error_code'))
      : ''
  })
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    if (isLoading || !user || profileError) return
    if (!profile || !profile.ativo) {
      navigate('/onboarding', { replace: true })
      return
    }
    navigate('/boas-vindas', { replace: true })
  }, [isLoading, navigate, profile, profileError, user])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('error')) return
    url.searchParams.delete('error')
    url.searchParams.delete('error_code')
    url.searchParams.delete('error_description')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  const entrarComGoogle = async () => {
    setErro('')
    if (!aceitouTermos) {
      setErro('Para continuar, leia e aceite os Termos de Uso e a Política de Privacidade.')
      return
    }

    setEntrando(true)
    window.sessionStorage.setItem('volte_aceite_legal_pendente', JSON.stringify({
      versao: LEGAL_VERSION,
      aceitoEm: new Date().toISOString(),
    }))
    try {
      await signInWithGoogle()
    } catch (error) {
      window.sessionStorage.removeItem('volte_aceite_legal_pendente')
      console.error('Erro ao iniciar login com Google:', error)
      setErro('Não foi possível iniciar o login. Tente novamente em instantes.')
      setEntrando(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#11100e] text-[#f8f6ef]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" className="flex items-center gap-3" aria-label="Volte!Sempre, início">
          <BrandLogo className="h-10 w-10" />
          <span className="text-sm font-semibold tracking-tight sm:text-base">Volte!Sempre</span>
        </a>
        <nav className="hidden items-center gap-7 text-xs text-white/55 md:flex">
          <a className="transition hover:text-white" href="#recursos">Recursos</a>
          <a className="transition hover:text-white" href="#perguntas">Dúvidas frequentes</a>
          <a className="transition hover:text-white" href="/politicas?aba=privacidade">Privacidade</a>
        </nav>
        <button
          type="button"
          onClick={() => document.getElementById('acesso')?.scrollIntoView({ behavior: 'smooth' })}
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/75 transition hover:border-[#ffd60a]/60 hover:text-white sm:px-5 sm:text-sm"
        >
          Fazer login
        </button>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100svh-80px)] w-full max-w-7xl items-center gap-16 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[.95fr_1.05fr] lg:gap-8 lg:pb-28 lg:pt-4">
        <div className="pointer-events-none absolute -left-48 top-20 h-[30rem] w-[30rem] rounded-full bg-[#ffb800]/[0.09] blur-[120px]" />
        <div className="relative z-10 max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#ffd60a]/20 bg-[#ffd60a]/[0.07] px-4 py-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#ffdb4d]">
            <Sparkles size={14} /> Gestão leve para quem faz acontecer
          </p>
          <h1 className="mt-7 max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-.06em] sm:text-6xl lg:text-7xl">
            Sua loja
            <span className="block text-[#ffd60a]">na sua mão.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
            Vendas, estoque e equipe conectados em uma experiência simples — para você cuidar da loja de onde estiver.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-white/55">
            <span className="inline-flex items-center gap-2"><Check size={14} className="text-[#ffd60a]" /> Feito para smartphone</span>
            <span className="inline-flex items-center gap-2"><Check size={14} className="text-[#ffd60a]" /> Acesso seguro com Google</span>
          </div>

          <a href="#recursos" className="mt-9 inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white">
            Descubra o que simplifica sua rotina <ArrowDown size={16} />
          </a>
        </div>
        <ProductPreview />
      </section>

      <section id="recursos" className="scroll-mt-12 bg-[#f7f6f1] px-5 py-20 text-[#191813] sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#9b7413]">Tudo conectado à sua rotina</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] sm:text-5xl">Mais controle. Menos correria.</h2>
            <p className="mt-4 text-sm leading-6 text-black/55 sm:text-base">Ferramentas práticas para você dedicar energia ao que faz sua loja crescer.</p>
          </div>
          <div className="mt-11 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description, href }) => {
              const content = (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1b3] text-[#795b12]">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-6 text-base font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">{description}</p>
                  {href && <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#795b12]">Falar no WhatsApp <ArrowRight size={14} /></span>}
                </>
              )
              return href ? (
                <a key={title} href={href} target="_blank" rel="noreferrer" className="rounded-3xl border border-black/[.07] bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg sm:p-6">
                  {content}
                </a>
              ) : (
                <article key={title} className="rounded-3xl border border-black/[.07] bg-white p-5 sm:p-6">
                  {content}
                </article>
              )
            })}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-3xl bg-[#171612] p-7 text-white sm:flex-row sm:p-9">
            <div>
              <p className="text-xl font-semibold tracking-tight">Sua próxima venda começa com mais organização.</p>
              <p className="mt-2 text-sm text-white/55">Entre com Google e prepare sua loja para um novo ritmo.</p>
            </div>
            <a href="#acesso" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#ffd60a] px-5 py-3 text-sm font-semibold text-[#17140a] transition hover:bg-[#ffe45c]">
              Quero conhecer <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      <section id="perguntas" className="scroll-mt-12 bg-[#11100e] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#ffdb4d]"><CircleHelp size={15} /> Respostas claras</p>
            <h2 className="mt-4 max-w-md text-3xl font-semibold tracking-[-.045em] sm:text-5xl">Dúvidas? A gente explica.</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">Tudo o que você precisa saber para começar com confiança.</p>
            <a href={supportLink('Olá, tenho uma dúvida sobre o Volte!Sempre.')} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#ffdb4d]">
              Ainda tem dúvidas? Chame no WhatsApp <ArrowRight size={15} />
            </a>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {faqs.map(({ question, answer }, index) => (
              <details key={question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white/85 marker:hidden">
                  <span><span className="mr-3 font-mono text-[10px] text-[#ffdb4d]/55">{String(index + 1).padStart(2, '0')}</span>{question}</span>
                  <ChevronDown size={17} className="shrink-0 text-white/45 transition group-open:rotate-180" />
                </summary>
                <p className="max-w-2xl pl-8 pr-8 pt-3 text-sm leading-6 text-white/50">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="acesso" className="scroll-mt-8 bg-[#f7f6f1] px-5 py-16 text-[#191813] sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-10 rounded-[2rem] border border-black/[.06] bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,.08)] sm:p-10 md:grid-cols-[.9fr_1.1fr] md:items-center">
          <div>
            <BrandLogo className="h-12 w-12" />
            <h2 className="mt-5 text-3xl font-semibold tracking-[-.05em]">Sua loja na sua mão.</h2>
            <p className="mt-3 text-sm leading-6 text-black/55">Entre com Google para acessar sua loja ou dar o primeiro passo.</p>
          </div>
          <div>
            <LegalAcceptance checked={aceitouTermos} onChange={setAceitouTermos} light />
            {erro && <p role="alert" className="mt-3 text-sm text-rose-700">{erro}</p>}
            <button
              type="button"
              onClick={entrarComGoogle}
              disabled={entrando}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-full bg-[#ffd60a] px-6 py-4 text-sm font-bold text-[#17140a] transition hover:bg-[#ffe45c] disabled:cursor-wait disabled:opacity-60"
            >
              {entrando ? 'Conectando com Google...' : 'Entrar ou criar minha loja'}
              {!entrando && <ArrowRight size={17} />}
            </button>
            <p className="mt-3 flex items-center justify-center gap-2 text-[10px] text-black/40"><ShieldCheck size={13} /> Ao continuar, seu aceite será registrado com sua conta.</p>
          </div>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 bg-[#11100e] px-5 py-7 text-xs text-white/40 sm:flex-row sm:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span>© {new Date().getFullYear()} Volte!Sempre</span>
          <a href="/politicas?aba=privacidade" className="transition hover:text-white">Política de Privacidade</a>
          <a href="/politicas?aba=termos" className="transition hover:text-white">Termos de Uso</a>
        </div>
        <span className="[&_span]:text-white/50 [&_svg]:h-5 [&_svg]:w-5"><AppByVolte /></span>
      </footer>
    </main>
  )
}
