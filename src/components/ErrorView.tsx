'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { LogoMark } from './Logo'

export default function ErrorView({ error, reset, plein = false }: { error: Error & { digest?: string }; reset: () => void; plein?: boolean }) {
  useEffect(() => {
    // Journal interne (table error_logs, visible par les admins)
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message, digest: error.digest, stack: error.stack, url: typeof window !== 'undefined' ? window.location.href : '' }),
    }).catch(() => {})
  }, [error])

  return (
    <div className={`flex items-center justify-center px-6 ${plein ? 'min-h-screen' : 'min-h-[70vh]'}`} style={{ background: 'var(--surface, #f0f4f1)' }}>
      <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 shadow-md border border-gray-100">
        <div className="flex justify-center mb-5"><LogoMark size={52} /></div>
        <h1 className="text-xl font-bold text-gray-800">Une erreur est survenue</h1>
        <p className="text-sm text-gray-500 mt-2">Ce n'est pas de votre fait. L'incident a été enregistré. Vous pouvez réessayer ou revenir à l'accueil.</p>
        {error.digest && <p className="text-xs text-gray-400 mt-3 font-mono">Référence : {error.digest}</p>}
        <div className="flex gap-2 justify-center mt-6">
          <button onClick={reset} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#2d6a4f,#1a3c2e)' }}>Réessayer</button>
          <Link href="/dashboard" className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>Accueil</Link>
        </div>
      </div>
    </div>
  )
}
