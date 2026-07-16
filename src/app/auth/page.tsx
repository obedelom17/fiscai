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
    if (error) {
      setErreur('Email ou mot de passe incorrect')
    } else {
      router.push('/dashboard/clients')
    }
    setLoading(false)
  }

  async function handleInscription() {
  setLoading(true)
  setErreur('')
  
  const { data, error } = await supabase.auth.signUp({ email, password })
  
  console.log('data:', data)
  console.log('error:', error)
  
  if (error) {
    setErreur(error.message)
    setLoading(false)
    return
  }
  
  if (data.user) {
    const { error: insertError } = await supabase.from('collaborateurs').insert({
      id: data.user.id,
      nom,
      prenom,
      email,
      role: 'collaborateur'
    })
    
    console.log('insertError:', insertError)
    
    if (insertError) {
      setErreur('Erreur création profil: ' + insertError.message)
      setLoading(false)
      return
    }
    
    router.push('/dashboard/clients')
  }
  
  setLoading(false)
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">FiscAl</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion fiscale — Experts Afrique Conseils</p>
        </div>

        {/* Onglets */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setMode('connexion')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'connexion' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode('inscription')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'inscription' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
            }`}
          >
            Inscription
          </button>
        </div>

        {/* Formulaire */}
        <div className="space-y-4">
          {mode === 'inscription' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  placeholder="Votre prénom"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {erreur && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {erreur}
            </div>
          )}

          <button
            onClick={mode === 'connexion' ? handleConnexion : handleInscription}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Chargement...' : mode === 'connexion' ? 'Se connecter' : "S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  )
}