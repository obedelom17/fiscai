'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleConnexion() {
    setLoading(true)
    setErreur('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErreur('Email ou mot de passe incorrect')
    else router.push('/dashboard')
    setLoading(false)
  }

  async function handleInscription() {
    setLoading(true)
    setErreur('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setErreur(error.message); setLoading(false); return }
    if (data.user) {
      // Premier inscrit → admin, les suivants → collaborateur
      const { count } = await supabase.from('collaborateurs').select('*', { count: 'exact', head: true })
      const role = (count === 0 || count === null) ? 'admin' : 'collaborateur'
      const { error: insertError } = await supabase.from('collaborateurs').insert({
        id: data.user.id, nom, prenom, email, role
      })
      if (insertError) { setErreur('Erreur création profil: ' + insertError.message); setLoading(false); return }
      router.push('/dashboard')
    }
    setLoading(false)
  }

  

  return (
    <div className="min-h-screen flex" style={{ 
  backgroundImage: 'url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80)',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}}>

  <div className="absolute inset-0" 
  style={{ background: 'linear-gradient(135deg, rgba(10,31,18,0.90) 0%, rgba(26,60,46,0.80) 60%, rgba(45,106,79,0.70) 100%)' }} />

      {/* Panneau gauche */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #e8a317, #f5c842)' }}>
            <span className="text-white text-xl font-black">F</span>
          </div>
          <div>
            <span className="text-white text-xl font-bold">FiscAl</span>
            <p className="text-green-300 text-xs">Experts Afrique Conseils</p>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Votre tour de contrôle<br />
            <span style={{ color: '#e8a317' }}>fiscal au Togo</span>
          </h1>
          <div className="space-y-4">
            {[
              'Zéro oubli sur les échéances OTR',
              'Relances automatiques par IA',
              'Tableau de bord décisionnel en temps réel',
              'Données cloisonnées par collaborateur',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#e8a317' }}></div>
                <span className="text-green-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-green-400 text-xs">
          © 2026 Experts Afrique Conseils — Tous droits réservés
        </p>
      </div>

      {/* Panneau droit */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
              <span className="text-white text-2xl font-black">F</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              {mode === 'connexion' ? 'Bon retour !' : 'Créer un compte'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {mode === 'connexion' ? 'Connectez-vous à votre espace FiscAl' : 'Rejoignez FiscAl'}
            </p>
          </div>

          {/* Onglets */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['connexion', 'inscription'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={mode === m ? { background: '#2d6a4f', color: 'white' } : { color: '#6b7280' }}>
                {m === 'connexion' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === 'inscription' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Prénom</label>
                  <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)}
                    placeholder="Votre prénom"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nom</label>
                  <input type="text" value={nom} onChange={e => setNom(e.target.value)}
                    placeholder="Votre nom"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                onKeyDown={e => e.key === 'Enter' && (mode === 'connexion' ? handleConnexion() : handleInscription())}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && (mode === 'connexion' ? handleConnexion() : handleInscription())}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            {erreur && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {erreur}
              </div>
            )}

            <button
              onClick={mode === 'connexion' ? handleConnexion : handleInscription}
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
              {loading ? 'Chargement...' : mode === 'connexion' ? 'Se connecter' : "S'inscrire"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

