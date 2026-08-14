'use client'

import { motion } from 'framer-motion'
import { ACOMPTES, getAcompteEcheance } from '@/lib/types'

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

type Client = { id: string; raison_sociale: string }

type Props = {
  clients: Client[]
  dossierEnEdition: boolean
  clientId: string; setClientId: (v: string) => void
  typeImpot: string; setTypeImpot: (v: string) => void
  periodeMois: number; setPeriodeMois: (v: number) => void
  periodeAnnee: number; setPeriodeAnnee: (v: number) => void
  dateEcheance: string; setDateEcheance: (v: string) => void
  numeroAcompte: number; setNumeroAcompte: (v: number) => void
  fHonoraires: number; setFHonoraires: (v: number) => void
  fDecaissements: number; setFDecaissements: (v: number) => void
  saving: boolean
  onSave: () => void
  onClose: () => void
}

export default function DossierForm({ clients, dossierEnEdition, clientId, setClientId, typeImpot, setTypeImpot, periodeMois, setPeriodeMois, periodeAnnee, setPeriodeAnnee, dateEcheance, setDateEcheance, numeroAcompte, setNumeroAcompte, fHonoraires, setFHonoraires, fDecaissements, setFDecaissements, saving, onSave, onClose }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base md:text-lg font-bold" style={{ color: '#1a3c2e' }}>
          {dossierEnEdition ? 'Modifier le dossier' : 'Nouveau dossier fiscal'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Client</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Sélectionner un client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.raison_sociale}</option>)}
          </select>
        </div>

        {/* Type impôt */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Type d'impôt</label>
          <select value={typeImpot} onChange={e => setTypeImpot(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="TVA">TVA</option>
            <option value="IRPP">IRPP</option>
            <option value="IS">Impôt sur les Sociétés</option>
            <option value="acompte">Acompte</option>
          </select>
        </div>

        {/* Mois (TVA seulement) */}
        {typeImpot === 'TVA' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Mois</label>
            <select value={periodeMois} onChange={e => setPeriodeMois(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}

        {/* Acompte */}
        {typeImpot === 'acompte' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Numéro d'acompte</label>
            <select value={numeroAcompte} onChange={e => setNumeroAcompte(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {ACOMPTES.map(a => <option key={a.numero} value={a.numero}>{a.label} — {a.description}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Échéance automatique : {getAcompteEcheance(numeroAcompte, periodeAnnee)
                ? new Date(getAcompteEcheance(numeroAcompte, periodeAnnee)).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>
        )}

        {/* Année */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Année</label>
          <input type="number" value={periodeAnnee} onChange={e => setPeriodeAnnee(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        {/* Date échéance (pas acompte) */}
        {typeImpot !== 'acompte' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Date d'échéance</label>
            <input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        )}

        {/* Facturation */}
        <div className="pt-2 border-t border-gray-100 md:col-span-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Facturation (optionnel)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Honoraires (FCFA)</label>
              <input type="number" min="0" step="500" value={fHonoraires} placeholder="0"
                onChange={e => setFHonoraires(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Décaissements (FCFA)</label>
              <input type="number" min="0" step="500" value={fDecaissements} placeholder="0"
                onChange={e => setFDecaissements(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          {(fHonoraires > 0 || fDecaissements > 0) && (
            <p className="text-xs text-gray-400 mt-1.5">
              Total : <span className="font-semibold text-gray-600">{(fHonoraires + fDecaissements).toLocaleString('fr-FR')} FCFA</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <motion.button onClick={onSave} disabled={saving || !clientId || (typeImpot !== 'acompte' && !dateEcheance)}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
          {saving ? 'Enregistrement...' : dossierEnEdition ? 'Modifier' : 'Enregistrer'}
        </motion.button>
        <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">
          Annuler
        </button>
      </div>
    </motion.div>
  )
}
