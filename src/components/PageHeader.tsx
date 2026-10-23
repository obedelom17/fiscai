type Props = {
  titre: string
  sousTitre?: string
  /** Conservé pour compatibilité : les photos de bannière ne sont plus affichées. */
  imageUrl?: string
  bouton?: React.ReactNode
}

export default function PageHeader({ titre, sousTitre, bouton }: Props) {
  return (
    <div className="bg-white border-b flex-shrink-0" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center justify-between gap-4 px-4 sm:px-8 py-5 sm:py-6">
        <div className="min-w-0">
          <h1 className="font-semibold tracking-tight leading-tight truncate" style={{ fontSize: 'clamp(18px, 3.2vw, 24px)', color: 'var(--green-900)' }}>
            {titre}
          </h1>
          {sousTitre && (
            <p className="text-gray-500 mt-1 leading-snug" style={{ fontSize: 'clamp(12px, 2.4vw, 14px)' }}>
              {sousTitre}
            </p>
          )}
        </div>
        {bouton && <div className="flex-shrink-0">{bouton}</div>}
      </div>
    </div>
  )
}
