'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRole } from '@/lib/useRole'
import { useToast } from '@/components/Toast'
import { PARAMETRES_DEFAUT, type CleParametre } from '@/lib/parametres'

const OPTIONS: { cle: CleParametre; titre: string; description: string }[] = [
  { cle: 'relances_auto', titre: 'Relances automatiques par e-mail', description: 'Envoie un rappel au client 7 jours, 3 jours avant l\'échéance, puis le lendemain si les documents ne sont pas reçus.' },
  { cle: 'recap_mensuel', titre: 'Récapitulatif mensuel aux clients', description: 'Le 1er de chaque mois, chaque client reçoit la liste de ses dossiers en attente.' },
  { cle: 'push_digest', titre: 'Notification quotidienne aux collaborateurs', description: 'Chaque matin, un résumé des retards et des échéances proches (pour les appareils abonnés).' },
]

export default function AutomatisationsCard() {
  const { isAdmin } = useRole()
  const supabase = createClient()
  const { toast } = useToast()
  const [valeurs, setValeurs] = useState<Record<CleParametre, boolean>>({ ...PARAMETRES_DEFAUT })

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('parametres').select('cle, valeur')
      const v = { ...PARAMETRES_DEFAUT } as Record<CleParametre, boolean>
      for (const r of data ?? []) if (r.cle in v) v[r.cle as CleParametre] = r.valeur === true
      setValeurs(v)
    })()
  }, [supabase])

  if (!isAdmin) return null

  async function basculer(cle: CleParametre) {
    const nouvelle = !valeurs[cle]
    setValeurs(v => ({ ...v, [cle]: nouvelle }))
    const { error } = await supabase.from('parametres').upsert({ cle, valeur: nouvelle, updated_at: new Date().toISOString() }, { onConflict: 'cabinet_id,cle' })
    if (error) { setValeurs(v => ({ ...v, [cle]: !nouvelle })); toast('Enregistrement impossible : ' + error.message, 'error') }
    else toast(nouvelle ? 'Activé' : 'Désactivé', 'success')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-800">Automatisations du cabinet</h2>
      <p className="text-sm text-gray-500 mt-1">Réservé aux administrateurs. Ces réglages concernent uniquement votre cabinet. Les tâches s'exécutent chaque jour à 07h00.</p>
      <ul className="mt-4 divide-y divide-gray-100">
        {OPTIONS.map(o => (
          <li key={o.cle} className="py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">{o.titre}</p>
              <p className="text-xs text-gray-500 mt-0.5">{o.description}</p>
            </div>
            <button role="switch" aria-checked={valeurs[o.cle]} aria-label={o.titre} onClick={() => basculer(o.cle)}
              className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors mt-0.5" style={{ background: valeurs[o.cle] ? '#2d6a4f' : '#cbd5d0' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: valeurs[o.cle] ? 22 : 2 }} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
