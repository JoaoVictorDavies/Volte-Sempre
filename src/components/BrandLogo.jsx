export default function BrandLogo({ className = '' }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      role="img"
      aria-label="Volte!Sempre"
    >
      <defs>
        <linearGradient id="volte-sempre-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD60A" />
          <stop offset="100%" stopColor="#FF9F0A" />
        </linearGradient>
        <filter id="volte-sempre-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#B45309" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect width="512" height="512" rx="115" fill="url(#volte-sempre-yellow)" />
      <g
        stroke="#FFFFFF"
        strokeWidth="44"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#volte-sempre-shadow)"
      >
        <path d="M 100 160 L 178 330 L 256 160 L 256 275" />
        <path d="M 256 345 L 256 345.01" />
        <path d="M 412 180 C 382 130, 312 170, 362 255 C 412 340, 342 380, 312 330" />
      </g>
    </svg>
  )
}
