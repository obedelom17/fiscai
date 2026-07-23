'use client'

export const dynamic = 'force-dynamic'

import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function TwoFactorPage() {
  const [etape, setEtape] = useState<'loading' | 'setup' | 'scan' | 'desactiver'>('loading')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [codeDesactiver, setCodeDesactiver] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [dejaActif, setDejaActif] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sessionOk, setSessionOk] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Vérifier la session d'abord, puis le statut MFA
    supabase.auth.getSession().then(({ data: sessionData }: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
      const session = sessionData.session
      if (!session) {
        router.push('/auth')
        return
      }
      setSessionOk(true)
      verifierStatut()
    })
  }, [])

  async function verifierStatut() {
    try {
      const { data } = await supabase.auth.mfa.listFactors()
      const facteur = data?.totp?.find((f: any) => f.status === 'verified')
      if (facteur) {
        setDejaActif(true)
        setFactorId(facteur.id)
      }
    } catch (e) {
      // Ignorer les erreurs MFA non critiques
    }
    setEtape('setup')
  }

  async function activerMFA() {
    setLoading(true)
    setErreur('')

    try {
      // Supprimer les facteurs non vérifiés existants
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const unverified = factors?.totp?.filter((f: any) => f.status === 'unverified') || []
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'FiscAl',
        friendlyName: 'FiscAl Authenticator'
      })
      if (error) { setErreur(error.message); setLoading(false); return }
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setFactorId(data.id)
      setEtape('scan')
    } catch (e: any) {
      setErreur(e.message || 'Erreur lors de l\'activation')
    }
    setLoading(false)
  }

  async function verifierCode() {
    if (code.length < 6) return
    setLoading(true)
    setErreur('')

    try {
      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId })
      if (ce) { setErreur(ce.message); setLoading(false); return }

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code
      })
      if (error) { setErreur('Code incorrect. Vérifiez votre application et réessayez.'); setLoading(false); return }

      await supabase.auth.refreshSession()
      router.push('/dashboard')
    } catch (e: any) {
      setErreur(e.message || 'Erreur de vérification')
    }
    setLoading(false)
  }

  async function desactiverMFA() {
    if (codeDesactiver.length < 6) return
    setLoading(true)
    setErreur('')

    try {
      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId })
      if (ce) { setErreur(ce.message); setLoading(false); return }

      const { error: ve } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: codeDesactiver
      })
      if (ve) { setErreur('Code incorrect'); setLoading(false); return }

      await supabase.auth.mfa.unenroll({ factorId })
      setDejaActif(false)
      setEtape('setup')
      setCodeDesactiver('')
      setFactorId('')
    } catch (e: any) {
      setErreur(e.message || 'Erreur lors de la désactivation')
    }
    setLoading(false)
  }

  function copierSecret() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Écran de chargement initial
  if (etape === 'loading') return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0f2318 0%, #1a3c2e 50%, #2d6a4f 100%)' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 rounded-full border-2"
        style={{ borderColor: '#e8a317', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f2318 0%, #1a3c2e 50%, #2d6a4f 100%)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Authentification à deux facteurs</h2>
          <p className="text-gray-400 text-sm mt-1">Sécurisez votre compte FiscAl</p>
        </div>

        {/* 2FA déjà actif */}
        {dejaActif && etape === 'setup' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#f0f9f4' }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#2d6a4f' }} />
              <p className="text-sm font-medium" style={{ color: '#2d6a4f' }}>
                Le 2FA est actif sur votre compte
              </p>
            </div>
            <div className="flex gap-3">
              <motion.button onClick={() => setEtape('desactiver')}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border-2 border-red-200 text-red-600 hover:bg-red-50">
                Désactiver le 2FA
              </motion.button>
              <motion.button onClick={() => router.push('/parametres')}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">
                Retour
              </motion.button>
            </div>
          </div>
        )}

        {/* Désactiver 2FA */}
        {etape === 'desactiver' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Entrez le code de votre application pour désactiver le 2FA.
            </p>
            <input type="text" value={codeDesactiver}
              onChange={e => setCodeDesactiver(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && desactiverMFA()}
              placeholder="000000" maxLength={6}
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
            {erreur && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{erreur}</p>}
            <div className="flex gap-3">
              <motion.button onClick={desactiverMFA} disabled={loading || codeDesactiver.length < 6}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white disabled:opacity-50">
                {loading ? 'Désactivation...' : 'Confirmer'}
              </motion.button>
              <motion.button onClick={() => { setEtape('setup'); setErreur('') }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">
                Annuler
              </motion.button>
            </div>
          </div>
        )}

        {/* Activer 2FA */}
        {!dejaActif && etape === 'setup' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-gray-100" style={{ background: '#f8fafb' }}>
              <p className="text-sm text-gray-600 leading-relaxed">
                Le 2FA ajoute une couche de sécurité. À chaque connexion vous devrez entrer un code de votre application d'authentification.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-700">Applications compatibles :</p>
              {['Google Authenticator', 'Microsoft Authenticator', 'Authy'].map((app, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#2d6a4f' }} />
                  <p className="text-sm text-gray-500">{app}</p>
                </div>
              ))}
            </div>
            {erreur && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{erreur}</p>}
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
        )}

        {/* Scanner QR */}
        {etape === 'scan' && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">
              1. Scannez ce QR code avec votre application
            </p>
            <div className="flex justify-center p-4 bg-white rounded-2xl border border-gray-200">
              {qrCode ? (
                <QRCodeSVG value={qrCode} size={180} />
              ) : (
                <div className="w-[180px] h-[180px] flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 rounded-full border-2" style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl flex items-center justify-between gap-3" style={{ background: '#f8fafb' }}>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-1">Code manuel :</p>
                <p className="text-xs font-mono font-bold tracking-widest text-gray-700 break-all">{secret}</p>
              </div>
              <button onClick={copierSecret}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={copied
                  ? { background: '#f0f9f4', color: '#2d6a4f', borderColor: '#2d6a4f' }
                  : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                {copied ? '✓ Copié' : 'Copier'}
              </button>
            </div>
            <p className="text-sm font-semibold text-gray-700">
              2. Entrez le code à 6 chiffres
            </p>
            <input type="text" value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && verifierCode()}
              placeholder="000000" maxLength={6}
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
            {erreur && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{erreur}</p>}
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
