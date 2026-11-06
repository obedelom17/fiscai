import PageHeader from '@/components/PageHeader'
import { CHANGELOG } from '@/lib/changelog'

export default function NouveautesPage() {
  return (
    <div style={{ background: 'var(--surface)' }} className="min-h-screen">
      <PageHeader banner="dashboard" titre="Nouveautés" sousTitre="Historique des versions de FiscAI" />
      <div className="px-4 md:px-8 pb-10 max-w-3xl space-y-4">
        {CHANGELOG.map(v => (
          <article key={v.version} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold text-gray-800">Version {v.version} : {v.titre}</h2>
              <time className="text-xs text-gray-500 flex-shrink-0">{new Date(`${v.date}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' })}</time>
            </div>
            <ul className="mt-3 space-y-1.5 list-disc pl-5 text-sm text-gray-600">
              {v.points.map(p => <li key={p}>{p}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
