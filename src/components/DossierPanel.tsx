'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import DossierCommentaires from '@/components/DossierCommentaires'
import HistoriqueStatuts from '@/components/HistoriqueStatuts'
import DossierFacturation from '@/components/DossierFacturation'
import AuditTab from '@/components/AuditTab'
import { STATUT_LABELS, formatPeriode } from '@/lib/types'
import emailjs from '@emailjs/browser'

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

type Dossier = any
type AuditLog = any
type Relance = any

type Props = {
  dossier: Dossier
  auditLogs: AuditLog[]
  relancesOnglet: Relance[]
  modeles: any[]
  canalRelance: string; setCanalRelance: (v: string) => void
  messageRelance: string; setMessageRelance: (v: string) => void
  sendingRelance: boolean
  onClose: () => void
  onUpdate: () => void
  onSendRelance: () => void
  onGenererRelance: () => void
  generatingRelance: boolean
  onStatutChange: (id: string, statut: string) => void
}

export default function DossierPanel({ dossier, auditLogs, relancesOnglet, modeles, canalRelance, setCanalRelance, messageRelance, setMessageRelance, sendingRelance, onClose, onUpdate, onSendRelance, onGenererRelance, generatingRelance, onStatutChange }: Props) {
  const supabase = createClient()
  const { toast } = useToast()
  const [onglet, setOnglet] = useState<'relance' | 'commentaires' | 'historique' | 'facturation'>('relance')
  const [documents, setDocuments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const STATUT_COULEURS: Record<string, string> = {
    en_attente: 'bg-yellow-100 text-yellow-800',
    recu: 'bg-blue-100 text-blue-800',
    valide: 'bg-green-100 text-green-700',
    televerse_otr: 'bg-purple-100 text-purple-800',
  }

  async function chargerDocs() {
    const { data } = await supabase.from('documents').select('*').eq('dossier_id', dossier.id).order('created_at', { ascending: false })
    setDocuments(data || [])
  }

  useState(() => { chargerDocs() })

  async function uploadFichiers(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const path = `${dossier.id}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('documents-fiscaux').upload(path, file)
      if (upErr) { toast(`Erreur upload : ${file.name}`, 'error'); continue }
      const { data: { publicUrl } } = supabase.storage.from('documents-fiscaux').getPublicUrl(path)
      await supabase.from('documents').insert({ dossier_id: dossier.id, nom_fichier: file.name, url_stockage: publicUrl, type_document: 'document' })
    }
    toast('Documents uploadés', 'success')
    chargerDocs()
    setUploading(false)
  }

  async function supprimerDoc(doc: any) {
    await supabase.storage.from('documents-fiscaux').remove([doc.url_stockage.split('/documents-fiscaux/')[1]])
    await supabase.from('documents').delete().eq('id', doc.id)
    chargerDocs()
  }

  const onglets = [
    { key: 'relance', label: 'Relance & Documents' },
    { key: 'commentaires', label: 'Commentaires' },
    { key: 'historique', label: 'Historique statuts' },
    { key: 'facturation', label: 'Facturation' },
  ] as const

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

      {/* En-tête panel */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between"
        style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold text-sm">{dossier.clients?.raison_sociale}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUT_COULEURS[dossier.statut]}`}>
              {STATUT_LABELS[dossier.statut as keyof typeof STATUT_LABELS]}
            </span>
          </div>
          <p className="text-green-300 text-xs">{dossier.type_impot} — {formatPeriode(dossier.type_impot, dossier.periode_mois, dossier.periode_annee)}</p>
          {dossier.date_echeance && (
            <p className="text-xs mt-0.5" style={{ color: new Date(dossier.date_echeance) < new Date() ? '#fca5a5' : 'rgba(255,255,255,0.5)' }}>
              Échéance : {new Date(dossier.date_echeance).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white text-lg ml-2">✕</button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto">
        {onglets.map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
            style={onglet === o.key
              ? { background: '#1a3c2e', color: '#fff' }
              : { background: '#f4f7f4', color: '#4a7c5e' }}>
            {o.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Onglet Relance & Documents */}
        {onglet === 'relance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Documents</h4>
              <div
                onDrop={e => { e.preventDefault(); setDragging(false); uploadFichiers(e.dataTransfer.files) }}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
                style={{ borderColor: dragging ? '#2d6a4f' : '#d1fae5', background: dragging ? '#f0fdf4' : '#fafffe' }}>
                <input ref={fileRef} type="file" multiple accept=".pdf" className="hidden" onChange={e => uploadFichiers(e.target.files)} />
                <p className="text-sm text-gray-500">{uploading ? 'Upload en cours...' : 'Glisser-déposer ou cliquer'}</p>
                <p className="text-xs text-gray-400 mt-1">PDF uniquement</p>
              </div>
              <div className="mt-3 space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
                    <span className="text-xs text-gray-600 flex-1 truncate">{doc.nom_fichier}</span>
                    <a href={doc.url_stockage} target="_blank" rel="noreferrer" className="text-xs text-blue-500">Voir</a>
                    <button onClick={() => supprimerDoc(doc)} className="text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Relance IA */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Relance IA</h4>
              <div className="flex gap-2 mb-3">
                {(['email', 'whatsapp'] as const).map(c => (
                  <button key={c} onClick={() => setCanalRelance(c)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium border transition-all"
                    style={canalRelance === c
                      ? { background: '#1a3c2e', color: '#fff', border: 'none' }
                      : { background: '#fff', color: '#4a7c5e', borderColor: '#d1fae5' }}>
                    {c === 'email' ? '✉ Email' : '💬 WhatsApp'}
                  </button>
                ))}
              </div>
              <textarea value={messageRelance} onChange={e => setMessageRelance(e.target.value)} rows={5}
                placeholder="Cliquez sur Générer pour créer un message..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 mb-3" />
              <div className="flex gap-2">
                <button onClick={onGenererRelance} disabled={generatingRelance}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                  {generatingRelance ? 'Génération...' : 'Générer IA'}
                </button>
                <button onClick={onSendRelance} disabled={sendingRelance || !messageRelance}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #e8a317, #f5c842)' }}>
                  {sendingRelance ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {onglet === 'commentaires' && <DossierCommentaires dossierId={dossier.id} />}
        {onglet === 'historique' && <HistoriqueStatuts dossierId={dossier.id} />}
        {onglet === 'facturation' && <DossierFacturation dossier={dossier} onUpdate={onUpdate} />}
      </div>
    </motion.div>
  )
}
