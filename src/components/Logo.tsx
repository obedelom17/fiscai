/**
 * Logo FiscAI : un F en trait arrondi, accompagné d'une étincelle dorée (IA).
 * Même géométrie que public/logo.svg, src/app/icon.svg et les icônes PWA.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="FiscAI"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="fiscai-fg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2d6a4f" />
          <stop offset="1" stopColor="#0f2a1e" />
        </linearGradient>
        <linearGradient id="fiscai-fs" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6c453" />
          <stop offset="1" stopColor="#e8a317" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#fiscai-fg)" />
      <path d="M0 14C0 6.27 6.27 0 14 0h20c7.73 0 14 6.27 14 14v1C34 17 14 11 0 24z" fill="#fff" fillOpacity=".07" />
      <path d="M17 36V18.5C17 14.9 19.9 12 23.5 12H33" fill="none" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 24H26" fill="none" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M35 24c.9 5 2.3 6.4 7 7.2-4.7.8-6.1 2.2-7 7.2-.9-5-2.3-6.4-7-7.2 4.7-.8 6.1-2.2 7-7.2z" fill="url(#fiscai-fs)" />
    </svg>
  )
}

/** Logo + nom. `onDark` : texte clair pour fond vert foncé. */
export default function Logo({ size = 36, onDark = false, showName = true, subtitle }: { size?: number; onDark?: boolean; showName?: boolean; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span
        className="flex-shrink-0 rounded-[13px]"
        style={onDark ? { boxShadow: '0 0 0 1px rgba(255,255,255,0.14), 0 6px 18px rgba(0,0,0,0.25)' } : { boxShadow: '0 4px 12px rgba(26,60,46,0.22)' }}
      >
        <LogoMark size={size} />
      </span>
      {showName && (
        <div className="min-w-0">
          <span
            className="block font-bold tracking-tight leading-none"
            style={{ fontSize: size * 0.5, color: onDark ? '#ffffff' : '#1a3c2e' }}
          >
            Fisc<span style={{ color: '#e8a317' }}>AI</span>
          </span>
          {subtitle && (
            <span className="block mt-1 text-[11px] leading-none truncate" style={{ color: onDark ? '#6ee7b7' : '#2d6a4f' }}>{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
