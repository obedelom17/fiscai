'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

type Commentaire = {
  id: string
  contenu: string
  created_at: string
  collaborateurs: { nom: string; prenom: string; avatar_url: string | null } | null
}

export default function DossierCommentaires({ dossierId }: { dossierId: string }) {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([])
  const [contenu, setContenu] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    charger()
    const channel = supabase
      .channel(`commentaires-${dossierId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commentaires_dossiers', filter: `dossier_id=eq.${dossierId}` }, () => charger())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [dossierId])

  async function charger() {
    const { data } = await supabase
      .from('commentaires_dossiers')
      .select('*, collaborateurs(nom, prenom, avatar_url)')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: true })
    setCommentaires(data || [])
  }

  async function ajouter() {
    if (!contenu.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('commentaires_dossiers').insert({
      dossier_id: dossierId,
      collaborateur_id: user?.id,
      contenu: contenu.trim(),
    })
    // Log audit
    await supabase.from('audit_logs').insert({
      collaborateur_id: user?.id,
      action: 'COMMENTAIRE',
      details: `Commentaire ajouté : ${contenu.trim().substring(0, 60)}${contenu.length > 60 ? '...' : ''}`,
    })
    setContenu('')
    setSaving(false)
    charger()
  }

  async function supprimer(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('commentaires_dossiers').delete().eq('id', id)
    await supabase.from('audit_logs').insert({
      collaborateur_id: user?.id,
      action: 'SUPPRESSION_COMMENTAIRE',
      details: 'Commentaire supprimé',
    })
    charger()
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        Commentaires internes ({commentaires.length})
      </h3>

      {/* Liste */}
      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
        <AnimatePresence>
          {commentaires.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">Aucun commentaire. Soyez le premier.</p>
          ) : (
            commentaires.map(c => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{ background: '#f8fafc' }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}
                >
                  {c.collaborateurs ? `${c.collaborateurs.prenom[0]}${c.collaborateurs.nom[0]}` : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-gray-700">
                      {c.collaborateurs ? `${c.collaborateurs.prenom} ${c.collaborateurs.nom}` : 'Utilisateur'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 break-words">{c.contenu}</p>
                </div>
                <button
                  onClick={() => supprimer(c.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-xs mt-0.5"
                  title="Supprimer"
                >✕</button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Nouveau commentaire */}
      <div className="flex gap-2">
        <input
          type="text"
          value={contenu}
          onChange={e => setContenu(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ajouter() } }}
          placeholder="Ajouter une note interne... (Entrée pour envoyer)"
          className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={ajouter}
          disabled={saving || !contenu.trim()}
          className="px-3 py-2.5 rounded-xl text-white text-xs font-medium disabled:opacity-40 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}
        >
          {saving ? '...' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}
