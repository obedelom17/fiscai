// Indicateur de chargement réutilisable (anneau rotatif).

export function Spinner({ className = 'w-8 h-8', color = '#2d6a4f' }: { className?: string; color?: string }) {
  return (
    <div
      className={`rounded-full border-2 animate-spin ${className}`}
      style={{ borderColor: color, borderTopColor: 'transparent' }}
    />
  )
}

// Écran de chargement pleine hauteur, centré sur le fond de l'app.
export function PageLoader({
  className = 'h-screen',
  spinnerClassName = 'w-8 h-8',
}: {
  className?: string
  spinnerClassName?: string
}) {
  return (
    <div className={`${className} flex items-center justify-center`} style={{ background: '#f0f4f1' }}>
      <Spinner className={spinnerClassName} />
    </div>
  )
}
