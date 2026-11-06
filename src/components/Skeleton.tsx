export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ background: 'rgba(26,60,46,0.10)', ...style }} aria-hidden="true" />
}

/** Squelette de page : bandeau, 4 KPI et deux cartes. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Chargement en cours" className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Skeleton className="!rounded-none h-36 md:h-44 w-full" />
      <div className="px-4 md:px-8 -mt-8 space-y-5 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-14" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <Skeleton className="h-4 w-40" />
              {[0, 1, 2, 3].map(j => <Skeleton key={j} className="h-12 w-full" />)}
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  )
}

export function EmptyState({ titre, description, action }: { titre: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#e8f0eb' }}>
        <svg className="w-7 h-7" fill="none" stroke="#2d6a4f" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m16 0h-4l-1.5 2h-5L8 13H4" />
        </svg>
      </div>
      <p className="font-semibold text-gray-800">{titre}</p>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
