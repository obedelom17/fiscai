'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { useToast } from '@/components/Toast'
import type { DossierFiscal, StatutPaiement } from '@/lib/types'
import { STATUT_PAIEMENT_LABELS, STATUT_PAIEMENT_COULEURS } from '@/lib/types'

type Props = {
  dossier: DossierFiscal
  onUpdate: () => void
}

export default function DossierFacturation({ dossier, onUpdate }: Props) {
  const supabase = createClient()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const [honoraires, setHonoraires] = useState(dossier.honoraires ?? 0)
  const [decaissements, setDecaissements] = useState(dossier.decaissements ?? 0)
  const [montantRecu, setMontantRecu] = useState(dossier.montant_recu ?? 0)
  const [statutPaiement, setStatutPaiement] = useState<StatutPaiement>(dossier.statut_paiement ?? 'non_facture')
  const [dateFacturation, setDateFacturation] = useState(dossier.date_facturation ?? '')
  const [datePaiement, setDatePaiement] = useState(dossier.date_paiement ?? '')
  const [notes, setNotes] = useState(dossier.notes_facturation ?? '')

  const totalFacture = Number(honoraires) + Number(decaissements)
  const solde = totalFacture - Number(montantRecu)

  // Calcul automatique statut paiement
  function calculerStatut(recu: number): StatutPaiement {
    const total = Number(honoraires) + Number(decaissements)
    if (total === 0) return 'non_facture'
    if (recu <= 0) return 'facture'
    if (recu >= total) return 'paye'
    return 'partiellement_paye'
  }

  async function sauvegarder() {
    setSaving(true)
    const statut = calculerStatut(Number(montantRecu))
    setStatutPaiement(statut)

    const { error } = await supabase
      .from('dossiers_fiscaux')
      .update({
        honoraires: Number(honoraires),
        decaissements: Number(decaissements),
        montant_recu: Number(montantRecu),
        statut_paiement: statut,
        date_facturation: dateFacturation || null,
        date_paiement: datePaiement || null,
        notes_facturation: notes || null,
      })
      .eq('id', dossier.id)

    if (error) {
      toast('Erreur lors de la sauvegarde', 'error')
    } else {
      toast('Facturation mise à jour', 'success')
      setEditing(false)
      onUpdate()
    }
    setSaving(false)
  }

  const badgeClass = STATUT_PAIEMENT_COULEURS[statutPaiement] ?? 'bg-gray-100 text-gray-600'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* En-tête */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
        style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
        <div>
          <h3 className="text-white font-semibold text-sm">Facturation</h3>
          <p className="text-green-300 text-xs mt-0.5">Honoraires et décaissements</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${badgeClass}`}>
            {STATUT_PAIEMENT_LABELS[statutPaiement]}
          </span>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ background: editing ? 'rgba(255,255,255,0.15)' : 'rgba(232,163,23,0.2)', color: editing ? '#fff' : '#e8a317' }}>
            {editing ? 'Annuler' : 'Modifier'}
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Résumé financier — toujours visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Honoraires', value: honoraires, color: '#1a3c2e' },
            { label: 'Décaissements', value: decaissements, color: '#2563eb' },
            { label: 'Total facturé', value: totalFacture, color: '#1a3c2e', bold: true },
            { label: 'Montant reçu', value: montantRecu, color: '#16a34a' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-3 border border-gray-100" style={{ background: '#fafffe' }}>
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className={`text-lg font-${item.bold ? 'bold' : 'semibold'}`} style={{ color: item.color }}>
                {Number(item.value).toLocaleString('fr-FR', { minimumFractionDigits: 0 })} FCFA
              </p>
            </div>
          ))}
        </div>

        {/* Solde */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl mb-5 ${solde > 0 ? 'bg-red-50 border border-red-100' : solde < 0 ? 'bg-yellow-50 border border-yellow-100' : 'bg-green-50 border border-green-100'}`}>
          <span className="text-sm font-medium text-gray-700">Solde restant dû</span>
          <span className={`text-lg font-bold ${solde > 0 ? 'text-red-600' : solde < 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {solde > 0 ? '+' : ''}{Number(solde).toLocaleString('fr-FR', { minimumFractionDigits: 0 })} FCFA
            {solde === 0 && <span className="text-xs ml-1">✓ Soldé</span>}
          </span>
        </div>

        {/* Formulaire d'édition */}
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 border-t border-gray-100 pt-4">

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Honoraires */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Honoraires (FCFA)
                </label>
                <input
                  type="number" min="0" step="500"
                  value={honoraires}
                  onChange={e => setHonoraires(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {/* Décaissements */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Décaissements (FCFA)
                </label>
                <input
                  type="number" min="0" step="500"
                  value={decaissements}
                  onChange={e => setDecaissements(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {/* Montant reçu */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Montant reçu (FCFA)
                </label>
                <input
                  type="number" min="0" step="500"
                  value={montantRecu}
                  onChange={e => setMontantRecu(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date facturation */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Date de facturation
                </label>
                <input
                  type="date"
                  value={dateFacturation}
                  onChange={e => setDateFacturation(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {/* Date paiement */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Date de paiement
                </label>
                <input
                  type="date"
                  value={datePaiement}
                  onChange={e => setDatePaiement(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Notes / Observations
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex : Acompte reçu le 15/07, solde attendu fin du mois..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>

            {/* Aperçu statut calculé */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 text-xs text-gray-500">
              <span>Statut calculé automatiquement :</span>
              <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUT_PAIEMENT_COULEURS[calculerStatut(Number(montantRecu))]}`}>
                {STATUT_PAIEMENT_LABELS[calculerStatut(Number(montantRecu))]}
              </span>
            </div>

            {/* Bouton sauvegarder */}
            <motion.button
              onClick={sauvegarder}
              disabled={saving}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer la facturation'}
            </motion.button>
          </motion.div>
        )}

        {/* Dates si pas en édition */}
        {!editing && (dossier.date_facturation || dossier.date_paiement || dossier.notes_facturation) && (
          <div className="space-y-1 text-xs text-gray-500 border-t border-gray-100 pt-3">
            {dossier.date_facturation && (
              <p>Facturé le : <span className="font-medium text-gray-700">{new Date(dossier.date_facturation).toLocaleDateString('fr-FR')}</span></p>
            )}
            {dossier.date_paiement && (
              <p>Payé le : <span className="font-medium text-gray-700">{new Date(dossier.date_paiement).toLocaleDateString('fr-FR')}</span></p>
            )}
            {dossier.notes_facturation && (
              <p>Notes : <span className="font-medium text-gray-700">{dossier.notes_facturation}</span></p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
