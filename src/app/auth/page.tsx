'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function changerMode(m: 'connexion' | 'inscription') {
    setMode(m)
    setErreur('')
    setEmail('')
    setPassword('')
    setNom('')
    setPrenom('')
  }

  async function handleConnexion() {
    if (!email || !password) { setErreur('Email et mot de passe requis'); return }
    setLoading(true); setErreur('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErreur('Email ou mot de passe incorrect')
    else router.push('/dashboard')
    setLoading(false)
  }

  async function handleInscription() {
    setErreur('')
    if (!prenom.trim() || !nom.trim()) { setErreur('Prénom et nom requis'); return }
    if (!email) { setErreur('Email requis'); return }
    if (password.length < 8) { setErreur('Mot de passe : minimum 8 caractères'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setErreur(error.message); setLoading(false); return }
    if (data.user) {
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) setErreur('Erreur Google: ' + error.message)
  }

  const features = [
    'Zéro oubli sur les échéances OTR',
    'Relances automatiques par IA',
    'Tableau de bord décisionnel en temps réel',
    'Données cloisonnées par collaborateur',
  ]

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#0f2318' }}>

      {/* Panneau gauche — fond image */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative p-14">
        {/* Image de fond */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1400&q=90"
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(0.35)' }}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, rgba(10,31,18,0.7) 0%, rgba(26,60,46,0.4) 100%)'
          }} />
        </div>

        {/* Contenu gauche */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #e8a317, #f5c842)' }}>
              <span className="text-white text-lg font-black">F</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">FiscAl</p>
              <p className="text-green-400 text-xs mt-0.5">Experts Afrique Conseils</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-black text-white leading-tight mb-8">
            Votre tour de<br />contrôle{' '}
            <span style={{ color: '#e8a317' }}>fiscal<br />au Togo</span>
          </motion.h1>

          <div className="space-y-4">
            {features.map((text, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(232,163,23,0.2)', border: '1px solid #e8a317' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#e8a317' }} />
                </div>
                <span className="text-white/80 text-sm font-medium">{text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-xs">© 2026 Experts Afrique Conseils — Tous droits réservés</p>
        </div>
      </div>

      {/* Panneau droit */}
      <div className="flex-1 flex items-center justify-center p-6 relative"
        style={{ background: '#f8fafb' }}>

        {/* Déco cercles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: '#2d6a4f', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-5"
          style={{ background: '#2d6a4f', transform: 'translate(-30%, 30%)' }} />

        <div className="w-full max-w-md relative z-10">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #e8a317, #f5c842)' }}>
              <span className="text-white font-black">F</span>
            </div>
            <div>
              <p className="font-bold text-gray-800">FiscAl</p>
              <p className="text-xs text-gray-400">Experts Afrique Conseils</p>
            </div>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">

            {/* Onglets */}
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-7 relative">
              {/* Slider animé */}
              <motion.div
                className="absolute top-1 bottom-1 rounded-xl shadow-sm"
                style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)', width: 'calc(50% - 4px)' }}
                animate={{ left: mode === 'connexion' ? '4px' : 'calc(50%)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
              {(['connexion', 'inscription'] as const).map(m => (
                <button key={m} onClick={() => changerMode(m)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold relative z-10 transition-colors duration-200"
                  style={{ color: mode === m ? 'white' : '#6b7280' }}>
                  {m === 'connexion' ? 'Connexion' : 'Inscription'}
                </button>
              ))}
            </div>

            {/* Titre animé */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {mode === 'connexion' ? 'Bon retour 👋' : 'Créer un compte'}
                </h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  {mode === 'connexion'
                    ? 'Connectez-vous à votre espace FiscAl'
                    : 'Rejoignez le cabinet sur FiscAl'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Champs animés */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === 'inscription' ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'inscription' ? -30 : 30 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="space-y-4">

                {mode === 'inscription' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Prénom</label>
                      <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)}
                        placeholder="Kofi"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                        style={{ '--tw-ring-color': '#2d6a4f' } as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Nom</label>
                      <input type="text" value={nom} onChange={e => setNom(e.target.value)}
                        placeholder="Mensah"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                        style={{ '--tw-ring-color': '#2d6a4f' } as any} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      onKeyDown={e => e.key === 'Enter' && (mode === 'connexion' ? handleConnexion() : handleInscription())}
                      className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': '#2d6a4f' } as any} />
                    <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      onKeyDown={e => e.key === 'Enter' && (mode === 'connexion' ? handleConnexion() : handleInscription())}
                      className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': '#2d6a4f' } as any} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                      {showPassword
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      }
                    </button>
                  </div>
                  {mode === 'inscription' && password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden bg-gray-100">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: password.length < 8 ? '#dc2626' : '#2d6a4f' }}
                          animate={{ width: `${Math.min((password.length / 12) * 100, 100)}%` }}
                          transition={{ duration: 0.3 }} />
                      </div>
                      <span className="text-xs font-medium flex-shrink-0"
                        style={{ color: password.length < 8 ? '#dc2626' : '#2d6a4f' }}>
                        {password.length < 8 ? `${password.length}/8` : '✓ OK'}
                      </span>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {erreur && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                      {erreur}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={mode === 'connexion' ? handleConnexion : handleInscription}
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-50 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Chargement...
                      </span>
                    : mode === 'connexion' ? 'Se connecter' : "S'inscrire"}
                </motion.button>

              </motion.div>
            </AnimatePresence>

            {/* Séparateur */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">ou</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Google */}
            <motion.button
              onClick={handleGoogle}
              whileHover={{ scale: 1.01, boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3.5 rounded-xl text-sm font-semibold border border-gray-200 flex items-center justify-center gap-3 text-gray-700 bg-white transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuer avec Google
            </motion.button>

          </motion.div>
        </div>
      </div>
    </div>
  )
}
