'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRole } from '@/lib/useRole'
import { useCabinet } from '@/lib/useCabinet'
import { useToast } from '@/components/Toast'

export default function CabinetCard() {
  const supabase = createClient()
  const { toast } = useToast()
  const { isAdmin } = useRole()
  const { cabinet, recharger } = useCabinet()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (cabinet) { setNom(cabinet.nom); setEmail(cabinet.email_contact ?? ''); setCode(cabinet.code_invitation) } }, [cabinet])
  if (!cabinet) return null

  async function enregistrer() {
    if (nom.trim().length < 2) { toast('Nom du cabinet requis', 'error'); return }
    setBusy(true)
    const { error } = await supabase.from('cabinets').update({ nom: nom.trim(), email_contact: email.trim() || null }).eq('id', cabinet!.id)
    setBusy(false)
    if (error) toast('Enregistrement impossible : ' + error.message, 'error')
    else { toast('Cabinet mis à jour', 'success'); recharger() }
  }

  async function regenerer() {
    if (!confirm('Générer un nouveau code ? L\'ancien ne fonctionnera plus pour de nouvelles inscriptions.')) return
    const { data, error } = await supabase.rpc('regenerer_code_cabinet')
    if (error) toast(error.message, 'error')
    else { setCode(data as string); toast('Nouveau code généré', 'success') }
  }

  async function copier() {
    try { await navigator.clipboard.writeText(code); toast('Code copié', 'success') } catch { toast('Copie impossible', 'error') }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-800">Cabinet</h2>
      {isAdmin ? (
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="cab-nom" className="block text-sm font-medium text-gray-700 mb-1">Nom du cabinet</label>
            <input id="cab-nom" value={nom} onChange={e => setNom(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            <p className="text-xs text-gray-500 mt-1">Affiché dans l'application, le portail client et la signature des e-mails.</p>
          </div>
          <div>
            <label htmlFor="cab-email" className="block text-sm font-medium text-gray-700 mb-1">E-mail de réponse (optionnel)</label>
            <input id="cab-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@votre-cabinet.tg" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            <p className="text-xs text-gray-500 mt-1">Quand un client répond à une relance, la réponse arrive à cette adresse.</p>
          </div>
          <button onClick={enregistrer} disabled={busy} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#2d6a4f,#1a3c2e)' }}>Enregistrer</button>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700">Code d'invitation</p>
            <p className="text-xs text-gray-500 mt-0.5">À transmettre à vos collaborateurs : ils le saisissent à leur première connexion.</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <code className="px-3 py-2 rounded-xl text-sm font-mono tracking-wider" style={{ background: '#f0f4f1', color: '#1a3c2e' }}>{code}</code>
              <button onClick={copier} className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>Copier</button>
              <button onClick={regenerer} className="px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600">Régénérer</button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 mt-2">Vous êtes membre de <strong>{cabinet.nom}</strong>.</p>
      )}
    </div>
  )
}
