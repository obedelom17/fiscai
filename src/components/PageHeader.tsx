export type BannerName =
  | 'home' | 'dashboard' | 'dossiers' | 'clients' | 'calendrier'
  | 'assistant' | 'stats' | 'portefeuilles' | 'parametres'

type Props = {
  titre: string
  sousTitre?: string
  /** Illustration du bandeau (public/banners/<nom>.svg). */
  banner?: BannerName
  /** Conservé pour compatibilité. */
  imageUrl?: string
  bouton?: React.ReactNode
}

export default function PageHeader({ titre, sousTitre, banner = 'dashboard', bouton }: Props) {
  return (
    <div
      className="page-banner flex-shrink-0"
      style={{ backgroundImage: `url(/banners/${banner}.svg)` }}
    >
      <div className="flex items-end justify-between gap-4 px-4 sm:px-8 pt-10 sm:pt-12 pb-12 sm:pb-14">
        <div className="min-w-0">
          <h1
            className="font-bold tracking-tight leading-tight truncate text-white"
            style={{ fontSize: 'clamp(22px, 3.6vw, 32px)', textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
          >
            {titre}
          </h1>
          {sousTitre && (
            <p className="mt-1.5 leading-snug" style={{ fontSize: 'clamp(12px, 2.4vw, 14px)', color: '#a7e3c8' }}>
              {sousTitre}
            </p>
          )}
        </div>
        {bouton && <div className="flex-shrink-0 mb-1">{bouton}</div>}
      </div>
    </div>
  )
}
