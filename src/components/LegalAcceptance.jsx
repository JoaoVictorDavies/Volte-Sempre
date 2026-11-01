import { Link } from 'react-router-dom'

export default function LegalAcceptance({ checked, onChange, className = '', light = false }) {
  const textColor = light ? 'text-black/55' : 'text-white/55'
  const linkColor = light ? 'text-[#795b12]' : 'text-[#ffdb4d]'

  return (
    <label className={`flex items-start gap-3 text-left text-xs leading-5 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[#ffd60a]"
      />
      <span className={textColor}>
        Li e concordo com os{' '}
        <Link
          to="/politicas?aba=termos"
          target="_blank"
          rel="noreferrer"
          className={`font-semibold underline underline-offset-2 ${linkColor}`}
        >
          Termos de Uso
        </Link>{' '}
        e a{' '}
        <Link
          to="/politicas?aba=privacidade"
          target="_blank"
          rel="noreferrer"
          className={`font-semibold underline underline-offset-2 ${linkColor}`}
        >
          Política de Privacidade
        </Link>
        .
      </span>
    </label>
  )
}
