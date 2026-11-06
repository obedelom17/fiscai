'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LogoMark } from '@/components/Logo'

type Choix = 'creer' | 'rejoindre'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [choix, setChoix] = useState<Choix>('creer')
  const [nom, setNom] = useState('')
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState('')
  const [busy, setBusy] = useState(false)

  async function valider() {
    setErreur(''); setBusy(true)
    const { error } = choix === 'creer'
      ? await supabase.rpc('creer_cabinet', { p_nom: nom })
      : await supabase.rpc('rejoindre_cabinet', { p_code: code })
    if (error) { setErreur(error.message); setBusy(false); return }
    // le rôle et le cabinet ont changé : on recharge tout pour repartir d'un état propre
    try { Object.keys(localStorage).filter(k => k.startsWith('fiscai')).forEach(k => localStorage.removeItem(k)) } catch {}
    window.location.href = '/dashboard'
  }

  const pret = choix === 'creer' ? nom.trim().length >= 2 : code.trim().length >= 6

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'radial-gradient(80% 60% at 100% 0%, #e6efe9 0%, #f0f4f1 60%)' }}>
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 border border-gray-100" style={{ boxShadow: '0 24px 60px rgba(15,35,24,0.12)' }}>
        <div className="flex items-center gap-3 mb-6">
          <LogoMark size={44} />
          <div>
            <h1 className="text-xl font-bold text-gray-800">Bienvenue sur FiscAI</h1>
            <p className="text-sm text-gray-500">Rattachez votre compte à un cabinet pour commencer.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5" role="tablist" aria-label="Type de rattachement">
          {([['creer', 'Créer mon cabinet'], ['rejoindre', 'Rejoindre un cabinet']] as [Choix, string][]).map(([v, l]) => (
            <button key={v} role="tab" aria-selected={choix === v} onClick={() => { setChoix(v); setErreur('') }}
              className="py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={choix === v ? { background: '#1a3c2e', color: '#fff' } : { background: '#f0f4f1', color: '#2d6a4f' }}>{l}</button>
          ))}
        </div>

        {choix === 'creer' ? (
          <div>
            <label htmlFor="nom-cabinet" className="block text-sm font-medium text-gray-700 mb-1">Nom du cabinet</label>
            <input id="nom-cabinet" value={nom} onChange={e => setNom(e.target.value)} onKeyDown={e => e.key === 'Enter' && pret && valider()}
              placeholder="Ex. Cabinet Mensah & Associés" autoFocus className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
            <p className="text-xs text-gray-500 mt-2">Vous en serez l'administrateur. Vous pourrez ensuite inviter vos collaborateurs avec un code.</p>
          </div>
        ) : (
          <div>
            <label htmlFor="code-cabinet" className="block text-sm font-medium text-gray-700 mb-1">Code d'invitation</label>
            <input id="code-cabinet" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && pret && valider()}
              placeholder="XXXX-XXXX-XXXX" autoFocus className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-wider" />
            <p className="text-xs text-gray-500 mt-2">Demandez ce code à l'administrateur de votre cabinet (Paramètres &gt; Cabinet).</p>
          </div>
        )}

        {erreur && <div role="alert" className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{erreur}</div>}

        <button onClick={valider} disabled={busy || !pret}
          className="mt-5 w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#2d6a4f,#1a3c2e)' }}>
          {busy ? 'Un instant…' : choix === 'creer' ? 'Créer le cabinet' : 'Rejoindre'}
        </button>

        <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth') }} className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
