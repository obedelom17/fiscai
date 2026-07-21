'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import { motion, AnimatePresence } from 'framer-motion'

export default function TwoFactorPage() {
  const [etape, setEtape] = useState<'setup' | 'verify'>('setup')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [dejaActif, setDejaActif] = useState(false)
  const [codeVerif, setCodeVerif] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { verifierStatut() }, [])

  async function verifierStatut() {
    const { data } = await supabase.auth.mfa.listFactors()
    const facteurTOTP = data?.totp?.find(f => f.status === 'verified')
    if (facteurTOTP) {
      setDejaActif(true)
      setFactorId(facteurTOTP.id)
    }
  }

  async function activerMFA() {
    setLoading(true)
    setErreur('')
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'FiscAl', friendlyName: 'FiscAl Authenticator' })
    if (error) { setErreur(error.message); setLoading(false); return }
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setFactorId(data.id)
    setEtape('verify')
    setLoading(false)
  }

  async function verifierCode() {
    setLoading(true)
    setErreur('')
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) { setErreur(challengeError.message); setLoading(false); return }

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code
    })
    if (error) { setErreur('Code incorrect. Réessayez.'); setLoading(false); return }
    router.push('/dashboard')
    setLoading(false)
  }

  async function desactiverMFA() {
    setLoading(true)
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
    if (!challenge) { setLoading(false); return }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: codeVerif
    })
    if (verifyError) { setErreur('Code incorrect'); setLoading(false); return }

    await supabase.auth.mfa.unenroll({ factorId })
    setDejaActif(false)
    setFactorId('')
    setCodeVerif('')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f2318 0%, #1a3c2e 50%, #2d6a4f 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Authentification à deux facteurs</h2>
          <p className="text-gray-400 text-sm mt-1">Sécurisez votre compte FiscAl</p>
        </div>

        {dejaActif ? (
          /* 2FA déjà activé */
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#f0f9f4' }}>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#2d6a4f' }} />
              <p className="text-sm font-medium" style={{ color: '#2d6a4f' }}>
                L'authentification à deux facteurs est active sur votre compte
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Code de désactivation
              </label>
              <input
                type="text"
                value={codeVerif}
                onChange={e => setCodeVerif(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">Entrez le code de votre application pour désactiver</p>
            </div>

            {erreur && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {erreur}
              </div>
            )}

            <div className="flex gap-3">
              <motion.button onClick={desactiverMFA} disabled={loading || codeVerif.length < 6}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border-2 border-red-300 text-red-600 disabled:opacity-50">
                {loading ? 'Désactivation...' : 'Désactiver le 2FA'}
              </motion.button>
              <motion.button onClick={() => router.push('/parametres')}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">
                Retour
              </motion.button>
            </div>
          </div>
        ) : etape === 'setup' ? (
          /* Étape 1 — Activer */
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-gray-100" style={{ background: '#f8fafb' }}>
              <p className="text-sm text-gray-600 leading-relaxed">
                Le 2FA ajoute une couche de sécurité supplémentaire. À chaque connexion, vous devrez entrer un code généré par votre application d'authentification.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Applications compatibles :</p>
              {['Google Authenticator', 'Microsoft Authenticator', 'Authy'].map((app, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#2d6a4f' }} />
                  <p className="text-sm text-gray-500">{app}</p>
                </div>
              ))}
            </div>

            {erreur && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {erreur}
              </div>
            )}

            <div className="flex gap-3">
              <motion.button onClick={activerMFA} disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                {loading ? 'Chargement...' : 'Activer le 2FA'}
              </motion.button>
              <motion.button onClick={() => router.push('/parametres')}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">
                Annuler
              </motion.button>
            </div>
          </div>
        ) : (
          /* Étape 2 — Scanner QR et vérifier */
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                1. Scannez ce QR code avec votre application
              </p>
              <div className="flex justify-center p-4 bg-white rounded-2xl border border-gray-200">
                {qrCode && <QRCode value={qrCode} size={180} />}
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ background: '#f8fafb' }}>
              <p className="text-xs text-gray-500 mb-1">Ou entrez ce code manuellement :</p>
              <p className="text-xs font-mono font-bold tracking-widest text-gray-700 break-all">{secret}</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                2. Entrez le code à 6 chiffres affiché
              </p>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                onKeyDown={e => e.key === 'Enter' && verifierCode()}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {erreur && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {erreur}
              </div>
            )}

            <motion.button onClick={verifierCode} disabled={loading || code.length < 6}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
              {loading ? 'Vérification...' : 'Confirmer et activer'}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  )
}