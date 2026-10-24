'use client'

import { motion } from 'framer-motion'

type Props = {
  titre: string
  sousTitre: string
  imageUrl: string
  bouton?: React.ReactNode
}

export default function PageHeader({ titre, sousTitre, imageUrl, bouton }: Props) {
  return (
    <div className="relative overflow-hidden flex-shrink-0" style={{ height: 'clamp(120px, 22vw, 192px)' }}>
      <img
        src={imageUrl}
        alt=""
        className="w-full h-full object-cover object-center"
        loading="eager"
        fetchPriority="low"
        decoding="async"
      />
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
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="text-green-200 drop-shadow mt-0.5 leading-snug"
            style={{ fontSize: 'clamp(11px, 2.5vw, 14px)' }}>
            {sousTitre}
          </motion.p>
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
