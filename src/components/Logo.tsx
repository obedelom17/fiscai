/**
 * Logo unique de FiscAI. À utiliser partout (sidebar, connexion, en-têtes…).
 * Ne jamais redessiner ni recolorer : le fichier public/logo.svg et les icônes
 * (favicon, PWA) sont générés à partir de la même géométrie.
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
      <rect width="48" height="48" rx="11" fill="#1a3c2e" />
      <rect x="14" y="11" width="6.5" height="26" rx="1.2" fill="#fff" />
      <rect x="14" y="11" width="21" height="6.5" rx="1.2" fill="#fff" />
      <rect x="14" y="22" width="14" height="6" rx="1.2" fill="#fff" />
      <rect x="30.5" y="22" width="6" height="6" rx="1.2" fill="#e8a317" />
    </svg>
  )
}

/** Logo + nom. `onDark` : texte clair pour fond vert foncé. */
export default function Logo({ size = 36, onDark = false, showName = true }: { size?: number; onDark?: boolean; showName?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span
        className="flex-shrink-0 rounded-[11px]"
        style={onDark ? { boxShadow: '0 0 0 1px rgba(255,255,255,0.18)' } : undefined}
      >
        <LogoMark size={size} />
      </span>
      {showName && (
        <span
          className="font-semibold tracking-tight leading-none"
          style={{ fontSize: size * 0.5, color: onDark ? '#ffffff' : '#1a3c2e' }}
        >
          FiscAI
        </span>
      )}
    </div>
  )
}
