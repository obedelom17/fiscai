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

  async function handleGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  })
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

          <div className="flex items-center gap-3 my-2">
  <div className="flex-1 h-px bg-gray-200" />
  <span className="text-xs text-gray-400">ou</span>
  <div className="flex-1 h-px bg-gray-200" />
</div>

<button onClick={handleGoogle}
  className="w-full py-3 rounded-xl text-sm font-medium border border-gray-200 flex items-center justify-center gap-3 hover:bg-gray-50 transition-all">
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Continuer avec Google
</button>
        </div>
      </div>
    </div>
  )
}

