import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText, LockKeyhole, ShieldCheck } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import { LEGAL_VERSION } from '../constants/legal'

const privacySections = [
  {
    title: '1. Dados que usamos',
    text: 'Para autenticar seu acesso, recebemos identificadores básicos da conta Google, como nome, e-mail e ID da conta. No uso do sistema, são armazenados os dados da loja, equipe, produtos, lotes, vendas, caixa e clientes que você cadastrar.',
  },
  {
    title: '2. Para que usamos os dados',
    text: 'Usamos essas informações para oferecer o PDV, manter o histórico e o estoque, associar operações ao usuário responsável, proteger os limites entre lojas, processar convites e enviar notificações solicitadas.',
  },
  {
    title: '3. Serviços integrados',
    text: 'A autenticação utiliza Supabase e Google. A infraestrutura de banco e armazenamento utiliza Supabase. Recursos de sugestão por inteligência artificial podem transmitir a foto ou o PDF enviado e os dados necessários à API configurada para esse recurso. Notificações push podem usar OneSignal. Consulte também as políticas desses provedores.',
  },
  {
    title: '4. Separação e segurança',
    text: 'O acesso é protegido por autenticação, permissões por função e políticas de segurança em nível de linha no banco de dados (RLS). Nenhuma proteção elimina todos os riscos; mantenha sua conta Google protegida e não compartilhe links de convite.',
  },
  {
    title: '5. Compartilhamento',
    text: 'Não comercializamos dados pessoais. Dados são tratados pelos provedores técnicos necessários para a operação do serviço e podem ser divulgados quando exigido por lei ou para proteger a segurança e os direitos dos usuários.',
  },
  {
    title: '6. Retenção e controle',
    text: 'Os dados são mantidos enquanto necessários para operar a loja e preservar seus registros. O proprietário deve manter os cadastros corretos e solicitar correções ou exclusões pelo canal de suporte. A exclusão de registros pode estar limitada por vínculos com histórico de vendas ou obrigações legais.',
  },
  {
    title: '7. Notificações e dispositivos',
    text: 'Se você autorizar notificações, identificadores técnicos de assinatura podem ser associados à sua conta e à loja para direcionar alertas somente aos dispositivos cadastrados daquele tenant. Você pode revogar a permissão nas configurações do dispositivo ou navegador.',
  },
  {
    title: '8. Seus direitos e contato',
    text: 'Você pode solicitar acesso, correção ou exclusão de dados pessoais conforme a legislação aplicável, por meio do suporte Volte!Sempre. Esta página não substitui os avisos de privacidade dos provedores integrados.',
  },
]

const termsSections = [
  {
    title: '1. Sobre o serviço',
    text: 'O Volte!Sempre oferece ferramentas digitais para apoiar vendas, controle de estoque, caixa, equipe e gestão de vendas a prazo. Recursos podem evoluir e sua disponibilidade depende de conexão, dispositivos e serviços integrados.',
  },
  {
    title: '2. Conta e acesso',
    text: 'O acesso é feito por conta Google. Você é responsável por proteger essa conta, manter seus dados atualizados e comunicar qualquer uso não autorizado. Cada pessoa deve usar sua própria conta; convites de equipe são pessoais e não devem ser compartilhados.',
  },
  {
    title: '3. Responsabilidades do proprietário',
    text: 'O proprietário administra membros, permissões e dados da loja. Deve convidar somente pessoas autorizadas, revisar os acessos e garantir que os dados cadastrados tenham base legítima e sejam tratados conforme a legislação.',
  },
  {
    title: '4. Uso responsável',
    text: 'Use o serviço de forma lícita e não tente acessar dados de outra loja, interferir no sistema, automatizar acessos indevidos ou inserir conteúdo que não tenha autorização para usar.',
  },
  {
    title: '5. Precisão das operações',
    text: 'Confira preços, quantidades, pagamentos e sugestões da IA antes de concluir. O sistema registra operações digitais, mas não substitui conferência de caixa, inventário, documentos fiscais ou orientação contábil.',
  },
  {
    title: '6. Conexão e disponibilidade',
    text: 'O uso requer conexão com a internet. O serviço depende de provedores externos e pode passar por manutenção ou indisponibilidade. Não confirme uma venda se o sistema indicar que ela não foi registrada.',
  },
  {
    title: '7. Recursos não incluídos',
    text: 'O registro de uma venda não equivale à emissão de documento fiscal ou liquidação de pagamento. Integrações com TEF, emissão fiscal e funcionamento offline não estão incluídas, salvo quando expressamente disponibilizadas em atualização futura.',
  },
  {
    title: '8. Conteúdo e sugestões automáticas',
    text: 'Você mantém responsabilidade pelos dados e imagens enviados. Sugestões de IA podem conter erros e devem ser revisadas antes do cadastro. Não envie documentos ou imagens sem direito de uso.',
  },
  {
    title: '9. Encerramento e alterações',
    text: 'Podemos atualizar estes termos para refletir mudanças no serviço ou na legislação. A versão e a data desta página indicam a revisão vigente. O uso continuado após aviso de atualização representa ciência das mudanças, observadas as exigências legais.',
  },
  {
    title: '10. Suporte',
    text: 'Para dúvidas sobre estes termos, privacidade ou funcionamento da conta, use o canal de suporte disponibilizado pelo Volte!Sempre.',
  },
]

export default function Politicas() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [aba, setAba] = useState(searchParams.get('aba') === 'termos' ? 'termos' : 'privacidade')
  const sections = aba === 'privacidade' ? privacySections : termsSections

  const selecionarAba = (nextTab) => {
    setAba(nextTab)
    setSearchParams({ aba: nextTab }, { replace: true })
  }

  return (
    <main className="min-h-screen bg-[#11100e] px-5 py-8 text-[#f8f6ef] sm:px-8 sm:py-12">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10" />
          <span className="text-sm font-semibold">Volte!Sempre</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-white/55 transition hover:text-white">
          <ArrowLeft size={14} /> Voltar ao site
        </Link>
      </header>

      <section className="mx-auto mt-12 max-w-4xl pb-12 sm:mt-16">
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#ffdb4d]">Transparência e confiança</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Informações legais</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55">
          Leia como funciona o serviço, quais dados são utilizados e quais são as responsabilidades de cada pessoa.
        </p>

        <div role="tablist" aria-label="Documentos legais" className="mt-9 flex gap-2 border-b border-white/10">
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'privacidade'}
            onClick={() => selecionarAba('privacidade')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${aba === 'privacidade' ? 'border-[#ffd60a] text-[#ffdb4d]' : 'border-transparent text-white/45 hover:text-white/80'}`}
          >
            <ShieldCheck size={16} /> Política de Privacidade
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'termos'}
            onClick={() => selecionarAba('termos')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${aba === 'termos' ? 'border-[#ffd60a] text-[#ffdb4d]' : 'border-transparent text-white/45 hover:text-white/80'}`}
          >
            <FileText size={16} /> Termos de Uso
          </button>
        </div>

        <article className="mt-6 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-8">
          <div className="flex items-center gap-3 border-b border-white/10 pb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffd60a]/10 text-[#ffdb4d]">
              {aba === 'privacidade' ? <LockKeyhole size={19} /> : <FileText size={19} />}
            </span>
            <div>
              <h2 className="text-lg font-semibold">{aba === 'privacidade' ? 'Política de Privacidade' : 'Termos de Uso'}</h2>
              <p className="mt-1 text-[10px] text-white/40">Versão {LEGAL_VERSION} · Revisado em 1 de novembro de 2026</p>
            </div>
          </div>
          <div className="divide-y divide-white/[.07]">
            {sections.map(({ title, text }) => (
              <section key={title} className="py-5 first:pt-6 last:pb-1">
                <h3 className="text-sm font-semibold text-white/85">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{text}</p>
              </section>
            ))}
          </div>
        </article>
        <p className="mt-5 text-xs leading-5 text-white/35">
          Este conteúdo apresenta as condições gerais do Volte!Sempre. Em caso de dúvida sobre uma situação específica, procure orientação profissional adequada.
        </p>
      </section>
    </main>
  )
}
