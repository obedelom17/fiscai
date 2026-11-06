import Link from 'next/link'
import { LogoMark } from '@/components/Logo'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--surface)' }}>
      <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 shadow-md border border-gray-100">
        <div className="flex justify-center mb-5"><LogoMark size={52} /></div>
        <p className="text-5xl font-bold" style={{ color: '#2d6a4f' }}>404</p>
        <h1 className="text-lg font-semibold text-gray-800 mt-2">Page introuvable</h1>
        <p className="text-sm text-gray-500 mt-2">Le lien est incorrect ou la page n'existe plus.</p>
        <Link href="/dashboard" className="inline-block mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#2d6a4f,#1a3c2e)' }}>Retour à l'accueil</Link>
      </div>
    </div>
  )
}
