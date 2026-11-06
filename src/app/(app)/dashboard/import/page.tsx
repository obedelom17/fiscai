'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import { useToast } from '@/components/Toast'
import {
  parseCsv, versLignes, validerClients, validerDossiers, normaliser, MODELE_CLIENTS, MODELE_DOSSIERS,
  type Resultat, type ClientImport, type DossierImport,
} from '@/lib/import-parse'

type Mode = 'clients' | 'dossiers'

async function lireFichier(f: File) {
  if (/\.xlsx$/i.test(f.name)) {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await f.arrayBuffer())
    const ws = wb.worksheets[0]
    const rows: string[][] = []
    ws.eachRow({ includeEmpty: false }, row => {
      const vals = (row.values as unknown[]).slice(1).map(v => {
        if (v instanceof Date) return v.toISOString().slice(0, 10)
        if (v && typeof v === 'object' && 'text' in (v as object)) return String((v as { text: unknown }).text)
        if (v && typeof v === 'object' && 'result' in (v as object)) return String((v as { result: unknown }).result)
        return v == null ? '' : String(v)
      })
      rows.push(vals)
    })
    return versLignes(rows)
  }
  return parseCsv(await f.text())
}

function telecharger(nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = nom; a.click(); URL.revokeObjectURL(url)
}

export default function ImportPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const [mode, setMode] = useState<Mode>('clients')
  const [resultats, setResultats] = useState<Resultat<ClientImport | DossierImport>[]>([])
  const [nomFichier, setNomFichier] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const valides = resultats.filter(r => r.valeur)
  const invalides = resultats.length - valides.length

  async function choisir(f: File | undefined) {
    if (!f) return
    setNomFichier(f.name)
    try {
      const lignes = await lireFichier(f)
      setResultats(mode === 'clients' ? validerClients(lignes) : validerDossiers(lignes))
      if (!lignes.length) toast('Fichier vide ou en-têtes manquants', 'error')
    } catch {
      toast('Lecture du fichier impossible', 'error')
    }
  }

  async function importer() {
    setEnvoi(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')
      if (mode === 'clients') {
        const lignes = valides.map(r => ({ ...(r.valeur as ClientImport), collaborateur_id: user.id }))
        for (let i = 0; i < lignes.length; i += 100) {
          const { error } = await supabase.from('clients').insert(lignes.slice(i, i + 100))
          if (error) throw new Error(error.message)
        }
        await supabase.from('audit_logs').insert({ collaborateur_id: user.id, action: 'IMPORT_CLIENTS', details: `${lignes.length} client(s) importé(s)` })
        toast(`${lignes.length} client(s) importé(s)`, 'success')
      } else {
        const { data: clients } = await supabase.from('clients').select('id, nif, raison_sociale, collaborateur_id')
        const index = new Map<string, { id: string; collaborateur_id: string | null }>()
        for (const c of clients ?? []) {
          index.set(normaliser(c.nif || ''), c); index.set(normaliser(c.raison_sociale), c)
        }
        const lignes: Record<string, unknown>[] = []
        const inconnus: string[] = []
        for (const r of valides) {
          const v = r.valeur as DossierImport
          const c = index.get(normaliser(v.client_ref))
          if (!c) { inconnus.push(v.client_ref); continue }
          lignes.push({ client_id: c.id, collaborateur_id: c.collaborateur_id ?? user.id, type_impot: v.type_impot, periode_mois: v.periode_mois, periode_annee: v.periode_annee, date_echeance: v.date_echeance, montant: v.montant, statut: 'en_attente' })
        }
        for (let i = 0; i < lignes.length; i += 100) {
          const { error } = await supabase.from('dossiers_fiscaux').insert(lignes.slice(i, i + 100))
          if (error) throw new Error(error.message)
        }
        await supabase.from('audit_logs').insert({ collaborateur_id: user.id, action: 'IMPORT_DOSSIERS', details: `${lignes.length} dossier(s) importé(s)` })
        toast(`${lignes.length} dossier(s) importé(s)${inconnus.length ? `, ${inconnus.length} client(s) introuvable(s) ignoré(s)` : ''}`, inconnus.length ? 'error' : 'success')
      }
      setResultats([]); setNomFichier('')
    } catch (e) {
      toast('Erreur d\'import : ' + (e instanceof Error ? e.message : 'inconnue'), 'error')
    }
    setEnvoi(false)
  }

  return (
    <div style={{ background: 'var(--surface)' }} className="min-h-screen">
      <PageHeader banner="clients" titre="Import en masse" sousTitre="Clients et dossiers depuis Excel (.xlsx) ou CSV" />
      <div className="px-4 md:px-8 pb-10 space-y-5 max-w-5xl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex gap-2" role="tablist" aria-label="Type d'import">
            {(['clients', 'dossiers'] as Mode[]).map(m => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setResultats([]); setNomFichier('') }}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                style={mode === m ? { background: '#1a3c2e', color: '#fff' } : { background: '#f0f4f1', color: '#2d6a4f' }}>
                {m === 'clients' ? 'Clients' : 'Dossiers'}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            {mode === 'clients'
              ? 'Colonnes : raison_sociale, nif, regime_fiscal (RR_TVA, RR_STVA, TPU_F, TPU_D), secteur_activite, email_contact, telephone.'
              : 'Colonnes : nif (ou client), type_impot, periode_mois, periode_annee, date_echeance (JJ/MM/AAAA), montant. Les clients doivent déjà exister.'}
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => telecharger(`modele-${mode}.csv`, mode === 'clients' ? MODELE_CLIENTS : MODELE_DOSSIERS)}
              className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>Télécharger le modèle</button>
            <label className="px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg,#2d6a4f,#1a3c2e)' }}>
              Choisir un fichier
              <input type="file" accept=".csv,.xlsx" className="sr-only" onChange={e => { choisir(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            {nomFichier && <span className="text-sm text-gray-500 truncate">{nomFichier}</span>}
          </div>
        </div>

        {resultats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3" style={{ background: 'linear-gradient(135deg,#1a3c2e,#2d6a4f)' }}>
              <p className="text-sm text-white font-medium">{valides.length} ligne(s) valide(s){invalides > 0 && <span style={{ color: '#fecaca' }}> · {invalides} en erreur (ignorée(s))</span>}</p>
              <button onClick={importer} disabled={envoi || valides.length === 0}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: '#e8a317', color: '#1a1a1a' }}>
                {envoi ? 'Import…' : `Importer ${valides.length} ligne(s)`}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Ligne</th><th className="px-4 py-2.5">Contenu</th><th className="px-4 py-2.5">Résultat</th></tr></thead>
                <tbody>
                  {resultats.slice(0, 200).map(r => (
                    <tr key={r.ligne} className="border-t border-gray-50">
                      <td className="px-4 py-2.5 text-gray-500">{r.ligne}</td>
                      <td className="px-4 py-2.5 text-gray-800">
                        {r.valeur ? ('raison_sociale' in r.valeur ? `${r.valeur.raison_sociale} · ${r.valeur.nif}` : `${r.valeur.client_ref} · ${r.valeur.type_impot} ${r.valeur.periode_annee}`) : '—'}
                      </td>
                      <td className="px-4 py-2.5">{r.erreurs.length ? <span className="text-red-600">{r.erreurs.join(', ')}</span> : <span className="text-green-700">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {resultats.length > 200 && <p className="px-4 py-3 text-xs text-gray-500">Aperçu limité à 200 lignes. Toutes les lignes valides seront importées.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
