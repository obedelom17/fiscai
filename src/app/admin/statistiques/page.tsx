'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

type Dossier = {
  id: string
  statut: string
  type_impot: string
  date_echeance: string
  clients: { raison_sociale: string }
  collaborateurs: { nom: string; prenom: string } | null
}

export default function StatistiquesPage() {
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { charger() }, [])

  async function charger() {
    const { data } = await supabase
      .from('dossiers_fiscaux')
      .select('*, clients(raison_sociale), collaborateurs(nom, prenom)')
    setDossiers(data || [])
    setLoading(false)
  }

  const total = dossiers.length
  const aJour = dossiers.filter(d => d.statut === 'televerse_otr' || d.statut === 'valide').length
  const enRetard = total - aJour
  const tauxConformite = total > 0 ? Math.round((aJour / total) * 100) : 0

  const dataConformite = [
    { name: 'À jour', value: aJour },
    { name: 'En retard', value: enRetard },
  ]

  const types = ['TVA', 'IRPP', 'IS', 'acompte']
  const dataTypes = types.map(t => ({
    name: t,
    'En attente': dossiers.filter(d => d.type_impot === t && d.statut === 'en_attente').length,
    'Reçu': dossiers.filter(d => d.type_impot === t && d.statut === 'recu').length,
    'Validé': dossiers.filter(d => d.type_impot === t && d.statut === 'valide').length,
    'Téléversé': dossiers.filter(d => d.type_impot === t && d.statut === 'televerse_otr').length,
  }))

  const collab: Record<string, number> = {}
  dossiers.filter(d => d.statut === 'en_attente').forEach(d => {
    const nom = d.collaborateurs ? `${d.collaborateurs.prenom} ${d.collaborateurs.nom}` : 'Non assigné'
    collab[nom] = (collab[nom] || 0) + 1
  })
  const dataCollab = Object.entries(collab).map(([nom, count]) => ({ nom, count }))

  const aujourd = new Date()
  const dans5 = new Date()
  dans5.setDate(dans5.getDate() + 5)
  const alertes = dossiers.filter(d => {
    const ech = new Date(d.date_echeance)
    return ech <= dans5 && d.statut !== 'televerse_otr'
  }).sort((a, b) => new Date(a.date_echeance).getTime() - new Date(b.date_echeance).getTime())

  const dataCompletion = types.map(t => {
    const tot = dossiers.filter(d => d.type_impot === t).length
    const done = dossiers.filter(d => d.type_impot === t && (d.statut === 'valide' || d.statut === 'televerse_otr')).length
    return { name: t, taux: tot > 0 ? Math.round((done / tot) * 100) : 0 }
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f4f1' }}>
      <p className="text-gray-400">Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f1' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#1a3c2e' }}>Tableau de bord</h1>
          <p className="text-gray-500 mt-1">Vue d'ensemble de la conformité fiscale — Experts Afrique Conseils</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total dossiers', value: total, color: '#1a3c2e', bg: '#f0f4f1' },
            { label: 'Dossiers à jour', value: aJour, color: '#2d6a4f', bg: '#f0f9f4' },
            { label: 'En retard', value: enRetard, color: '#dc2626', bg: '#fff8f8' },
            { label: 'Alertes OTR', value: alertes.length, color: '#d97706', bg: '#fffbeb' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-4xl font-bold mt-2" style={{ color: kpi.color }}>{kpi.value}</p>
              <div className="mt-3 w-full h-1.5 rounded-full" style={{ background: '#f3f4f6' }}>
                <div className="h-1.5 rounded-full transition-all"
                  style={{ width: `${total > 0 ? Math.round((kpi.value / total) * 100) : 0}%`, background: kpi.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Taux de conformité global */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Taux de conformité global</h2>
            <span className="text-3xl font-black" style={{ color: tauxConformite >= 70 ? '#2d6a4f' : '#dc2626' }}>
              {tauxConformite}%
            </span>
          </div>
          <div className="w-full h-4 rounded-full" style={{ background: '#f3f4f6' }}>
            <div className="h-4 rounded-full transition-all duration-500"
              style={{
                width: `${tauxConformite}%`,
                background: tauxConformite >= 70
                  ? 'linear-gradient(90deg, #2d6a4f, #4ade80)'
                  : 'linear-gradient(90deg, #dc2626, #f87171)'
              }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span>Objectif : 100%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Conformité anneau */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">Conformité globale du cabinet</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataConformite} cx="50%" cy="50%" innerRadius={65} outerRadius={95}
                  dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="#2d6a4f" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Avancement par type */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">Avancement par type d'impôt</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataTypes}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="En attente" fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="Validé" fill="#2d6a4f" radius={[4,4,0,0]} />
                <Bar dataKey="Téléversé" fill="#1a3c2e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Dossiers en attente par collaborateur */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">Dossiers en attente par collaborateur</h2>
            {dataCollab.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-gray-400 text-sm">Aucun dossier en attente</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataCollab} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="nom" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#e8a317" name="Dossiers en attente" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Taux de complétion */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-6">Taux de complétion par impôt</h2>
            <div className="space-y-5">
              {dataCompletion.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">{d.name}</span>
                    <span className="font-bold" style={{ color: d.taux >= 70 ? '#2d6a4f' : '#d97706' }}>{d.taux}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full" style={{ background: '#f3f4f6' }}>
                    <div className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${d.taux}%`,
                        background: d.taux >= 70
                          ? 'linear-gradient(90deg, #2d6a4f, #4ade80)'
                          : 'linear-gradient(90deg, #e8a317, #fcd34d)'
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alertes OTR */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-800">Alertes OTR — Échéances critiques</h2>
            {alertes.length > 0 && (
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-red-100 text-red-600">
                {alertes.length} urgent(s)
              </span>
            )}
          </div>
          {alertes.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#f0f9f4' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#2d6a4f' }}></div>
              <p className="text-sm font-medium" style={{ color: '#2d6a4f' }}>
                Aucune échéance critique dans les 5 prochains jours
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#f8fafb' }}>
                    {['Client', 'Type d\'impôt', 'Échéance', 'Statut'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alertes.map((d, i) => (
                    <tr key={d.id} className="border-t border-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{d.clients?.raison_sociale}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                          style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                          {d.type_impot}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">
                        {new Date(d.date_echeance).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                          {d.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}