'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

type Dossier = {
  id: string
  statut: string
  type_impot: string
  date_echeance: string
  clients: { raison_sociale: string }
  collaborateurs: { nom: string; prenom: string } | null
}

const COULEURS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

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

  // Stat 1 : Conformité globale
  const total = dossiers.length
  const aJour = dossiers.filter(d => d.statut === 'televerse_otr' || d.statut === 'valide').length
  const enRetard = total - aJour
  const dataConformite = [
    { name: 'À jour', value: aJour },
    { name: 'En retard / incomplet', value: enRetard },
  ]

  // Stat 2 : Par type d'impôt
  const types = ['TVA', 'IRPP', 'IS', 'acompte']
  const dataTypes = types.map(t => ({
    name: t,
    'En attente': dossiers.filter(d => d.type_impot === t && d.statut === 'en_attente').length,
    'Reçu': dossiers.filter(d => d.type_impot === t && d.statut === 'recu').length,
    'Validé': dossiers.filter(d => d.type_impot === t && d.statut === 'valide').length,
    'Téléversé': dossiers.filter(d => d.type_impot === t && d.statut === 'televerse_otr').length,
  }))

  // Stat 3 : Pièces manquantes par collaborateur
  const collab: Record<string, number> = {}
  dossiers.filter(d => d.statut === 'en_attente').forEach(d => {
    const nom = d.collaborateurs ? `${d.collaborateurs.prenom} ${d.collaborateurs.nom}` : 'Non assigné'
    collab[nom] = (collab[nom] || 0) + 1
  })
  const dataCollab = Object.entries(collab).map(([nom, count]) => ({ nom, count }))

  // Stat 4 : Alertes OTR (échéance dans 5 jours)
  const aujourd = new Date()
  const dans5 = new Date()
  dans5.setDate(dans5.getDate() + 5)
  const alertes = dossiers.filter(d => {
    const ech = new Date(d.date_echeance)
    return ech <= dans5 && d.statut !== 'televerse_otr'
  }).sort((a, b) => new Date(a.date_echeance).getTime() - new Date(b.date_echeance).getTime())

  // Stat 5 : Taux de complétion par type
  const dataCompletion = types.map(t => {
    const total = dossiers.filter(d => d.type_impot === t).length
    const done = dossiers.filter(d => d.type_impot === t && (d.statut === 'valide' || d.statut === 'televerse_otr')).length
    return { name: t, taux: total > 0 ? Math.round((done / total) * 100) : 0 }
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <span className="font-bold text-gray-800">FiscAl</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/dashboard/clients" className="text-sm text-gray-500 hover:text-gray-800">Clients</a>
          <a href="/dashboard/dossiers" className="text-sm text-gray-500 hover:text-gray-800">Dossiers</a>
          <a href="/dashboard/assistant" className="text-sm text-gray-500 hover:text-gray-800">Assistant IA</a>
          <a href="/admin/statistiques" className="text-sm font-medium text-blue-600">Statistiques</a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Tableau de bord — Direction</h1>
          <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la conformité fiscale du cabinet</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase font-medium">Total dossiers</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase font-medium">À jour</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{aJour}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase font-medium">En retard</p>
            <p className="text-3xl font-bold text-red-500 mt-1">{enRetard}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase font-medium">Alertes OTR</p>
            <p className="text-3xl font-bold text-yellow-500 mt-1">{alertes.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Stat 1 : Conformité globale */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Conformité globale du cabinet</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataConformite} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Stat 2 : Par type d'impôt */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Avancement par type d'impôt</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataTypes}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="En attente" fill="#f59e0b" />
                <Bar dataKey="Validé" fill="#10b981" />
                <Bar dataKey="Téléversé" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Stat 3 : Pièces manquantes par collaborateur */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Dossiers en attente par collaborateur</h2>
            {dataCollab.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Aucun dossier en attente</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataCollab} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="nom" type="category" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" name="Dossiers en attente" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Stat 5 : Taux de complétion */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Taux de complétion par impôt</h2>
            <div className="space-y-4 mt-2">
              {dataCompletion.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-medium text-gray-800">{d.taux}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${d.taux}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stat 4 : Alertes OTR */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            Alertes OTR — Échéances critiques
            {alertes.length > 0 && <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{alertes.length} urgent(s)</span>}
          </h2>
          {alertes.length === 0 ? (
            <p className="text-green-600 text-sm">✓ Aucune échéance critique dans les 5 prochains jours</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-500 uppercase">Client</th>
                  <th className="text-left py-2 text-xs text-gray-500 uppercase">Type</th>
                  <th className="text-left py-2 text-xs text-gray-500 uppercase">Échéance</th>
                  <th className="text-left py-2 text-xs text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody>
                {alertes.map(d => (
                  <tr key={d.id} className="border-b border-gray-50">
                    <td className="py-3 text-sm font-medium text-gray-800">{d.clients?.raison_sociale}</td>
                    <td className="py-3 text-sm text-gray-500">{d.type_impot}</td>
                    <td className="py-3 text-sm text-red-600 font-medium">{new Date(d.date_echeance).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3">
                      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">{d.statut}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}