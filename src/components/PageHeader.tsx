'use client'

import { motion } from 'framer-motion'

export type BannerName =
  | 'home' | 'dashboard' | 'dossiers' | 'clients' | 'calendrier'
  | 'assistant' | 'stats' | 'portefeuilles' | 'parametres'

/** Photos des bandeaux. Le SVG local (public/banners) sert de secours si la photo ne charge pas. */
export const BANNER_PHOTOS: Record<BannerName, string> = {
  home: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
  dashboard: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
  stats: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
  dossiers: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
  clients: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
  calendrier: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1200&q=80',
  assistant: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=80',
  portefeuilles: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80',
  parametres: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
}

type Props = {
  titre: string
  sousTitre?: string
  banner?: BannerName
  /** Conservé pour compatibilité. */
  imageUrl?: string
  bouton?: React.ReactNode
}

export function BannerImage({ banner, className = 'w-full h-full object-cover object-center' }: { banner: BannerName; className?: string }) {
  return (
    <img
      src={BANNER_PHOTOS[banner]}
      alt=""
      className={className}
      loading="eager"
      decoding="async"
      onError={(e) => { e.currentTarget.style.opacity = '0' }}
    />
  )
}

export default function PageHeader({ titre, sousTitre, banner = 'dashboard', bouton }: Props) {
  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{
        height: 'clamp(120px, 22vw, 192px)',
        backgroundColor: '#0b1f16',
        backgroundImage: `url(/banners/${banner}.svg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <BannerImage banner={banner} />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(10,31,18,0.82) 0%, rgba(26,60,46,0.68) 60%, rgba(45,106,79,0.4) 100%)' }} />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 30%, #f0f4f1 100%)' }} />
      <div className="absolute inset-0 flex items-end justify-between px-4 sm:px-8 pb-4 sm:pb-6">
        <div className="min-w-0 flex-1">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="font-bold text-white drop-shadow-lg leading-tight"
            style={{ fontSize: 'clamp(16px, 4vw, 24px)' }}>
            {titre}
          </motion.h1>
          {sousTitre && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className="text-green-200 drop-shadow mt-0.5 leading-snug"
              style={{ fontSize: 'clamp(11px, 2.5vw, 14px)' }}>
              {sousTitre}
            </motion.p>
          )}
        </div>
        {bouton && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
            className="ml-3 flex-shrink-0">
            {bouton}
          </motion.div>
        )}
      </div>
    </div>
  )
}
