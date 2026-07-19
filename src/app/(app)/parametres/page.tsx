'use client'

import PageHeader from '@/components/PageHeader'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'


export default function ParametresPage() {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfil, setSavingProfil] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [msgProfil, setMsgProfil] = useState('')
  const [msgEmail, setMsgEmail] = useState('')
  const [msgPassword, setMsgPassword] = useState('')
  const supabase = createClient()

  useEffect(() => { charger() }, [])

  async function charger() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('collaborateurs').select('*').eq('id', user.id).single()
    if (data) {
      setPrenom(data.prenom)
      setNom(data.nom)
      setEmail(data.email)
    }
    setLoading(false)
  }

  async function sauvegarderProfil() {
    setSavingProfil(true)
    setMsgProfil('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('collaborateurs')
      .update({ prenom, nom })
      .eq('id', user.id)
    setMsgProfil(error ? 'Erreur : ' + error.message : 'Profil mis à jour avec succès')
    setSavingProfil(false)
  }

  async function changerEmail() {
    setSavingEmail(true)
    setMsgEmail('')
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setMsgEmail(error ? 'Erreur : ' + error.message : 'Email mis à jour. Vérifiez votre boîte mail.')
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('collaborateurs').update({ email: newEmail }).eq('id', user.id)
      setNewEmail('')
    }
    setSavingEmail(false)
  }

  async function changerMotDePasse() {
    setMsgPassword('')
    if (newPassword !== confirmPassword) {
      setMsgPassword('Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 6) {
      setMsgPassword('Minimum 6 caractères')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setMsgPassword(error ? 'Erreur : ' + error.message : 'Mot de passe mis à jour avec succès')
    if (!error) { setNewPassword(''); setConfirmPassword('') }
    setSavingPassword(false)
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#f0f4f1' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-2"
        style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f1' }}>

      <PageHeader
  titre="Paramètres"
  sousTitre="Gérez votre profil et vos informations de connexion"
  imageUrl="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"
/>

      <div className="max-w-2xl mx-auto px-8 py-8 space-y-6">

        {/* Profil */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"
            style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
            <h2 className="font-bold text-white">Informations personnelles</h2>
            <p className="text-green-300 text-xs mt-0.5">Votre nom affiché dans l'application</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                {prenom?.[0]}{nom?.[0]}
              </div>
              <div>
                <p className="font-bold text-gray-800">{prenom} {nom}</p>
                <p className="text-sm text-gray-400">{email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Prénom</label>
                <input value={prenom} onChange={e => setPrenom(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nom</label>
                <input value={nom} onChange={e => setNom(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            {msgProfil && (
              <p className={`text-sm px-4 py-3 rounded-xl ${msgProfil.includes('Erreur') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {msgProfil}
              </p>
            )}
            <motion.button onClick={sauvegarderProfil} disabled={savingProfil}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
              {savingProfil ? 'Enregistrement...' : 'Sauvegarder'}
            </motion.button>
          </div>
        </motion.div>

        {/* Changer email */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"
            style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
            <h2 className="font-bold text-white">Adresse email</h2>
            <p className="text-green-300 text-xs mt-0.5">Email actuel : {email}</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nouvel email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="nouveau@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {msgEmail && (
              <p className={`text-sm px-4 py-3 rounded-xl ${msgEmail.includes('Erreur') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {msgEmail}
              </p>
            )}
            <motion.button onClick={changerEmail} disabled={savingEmail || !newEmail}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
              {savingEmail ? 'Mise à jour...' : "Changer l'email"}
            </motion.button>
          </div>
        </motion.div>

        {/* Changer mot de passe */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"
            style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
            <h2 className="font-bold text-white">Mot de passe</h2>
            <p className="text-green-300 text-xs mt-0.5">Minimum 6 caractères</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nouveau mot de passe</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Confirmer le mot de passe</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {msgPassword && (
              <p className={`text-sm px-4 py-3 rounded-xl ${msgPassword.includes('Erreur') || msgPassword.includes('correspondent') || msgPassword.includes('caractères') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {msgPassword}
              </p>
            )}
            <motion.button onClick={changerMotDePasse} disabled={savingPassword || !newPassword}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
              {savingPassword ? 'Mise à jour...' : 'Changer le mot de passe'}
            </motion.button>
          </div>
        </motion.div>

        {/* Danger zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50">
            <h2 className="font-bold text-red-700">Zone de danger</h2>
            <p className="text-red-400 text-xs mt-0.5">Actions irréversibles</p>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">
              La suppression de votre compte est définitive. Toutes vos données seront perdues.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => alert('Contactez un administrateur pour supprimer votre compte.')}
              className="px-6 py-2.5 rounded-xl text-sm font-medium border-2 border-red-300 text-red-600 hover:bg-red-50 transition-all">
              Supprimer mon compte
            </motion.button>
          </div>
        </motion.div>

      </div>
    </div>
  )
}