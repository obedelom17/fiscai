'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

type Props = {
  titre: string
  sousTitre: string
  imageUrl: string
  bouton?: React.ReactNode
}

export default function PageHeader({ titre, sousTitre, imageUrl, bouton }: Props) {
  return (
    <div className="relative h-48 overflow-hidden flex-shrink-0">
      <img
        src={imageUrl}
        alt=""
        className="w-full h-full object-cover object-center"
        loading="eager"
        fetchPriority="low"
        decoding="async"
      />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(10,31,18,0.80) 0%, rgba(26,60,46,0.65) 60%, rgba(45,106,79,0.4) 100%)' }} />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, #f0f4f1 100%)' }} />
      <div className="absolute inset-0 flex items-end justify-between px-8 pb-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-2xl font-bold text-white drop-shadow-lg">
            {titre}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="text-green-200 text-sm mt-0.5 drop-shadow">
            {sousTitre}
          </motion.p>
        </div>
        {bouton && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}>
            {bouton}
          </motion.div>
        )}
      </div>
    </div>
  )
}
