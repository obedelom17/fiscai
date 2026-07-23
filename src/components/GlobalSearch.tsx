'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

type Result = {
  id: string
  type: 'client' | 'dossier' | 'relance'
  titre: string
  sousTitre: string
  href: string
}

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const chercher = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const [{ data: clients }, { data: dossiers }, { data: relances }] = await Promise.all([
      supabase.from('clients').select('id, raison_sociale, nif, secteur_activite').ilike('raison_sociale', `%${q}%`).limit(5),
      supabase.from('dossiers_fiscaux').select('id, type_impot, statut, periode_annee, clients(raison_sociale)').or(`type_impot.ilike.%${q}%`).limit(5),
      supabase.from('relances').select('id, contenu_email, canal, date_envoi, clients(raison_sociale)').ilike('contenu_email', `%${q}%`).limit(3),
    ])

    const r: Result[] = []

    ;(clients || []).forEach((c: any) => {
      r.push({ id: c.id, type: 'client', titre: c.raison_sociale, sousTitre: `NIF: ${c.nif} · ${c.secteur_activite}`, href: '/dashboard/clients' })
    })

    // Chercher aussi dossiers par nom client
    const { data: dossiersByClient } = await supabase
      .from('dossiers_fiscaux')
      .select('id, type_impot, statut, periode_annee, clients(raison_sociale)')
      .ilike('clients.raison_sociale', `%${q}%`)
      .limit(5)

    const allDossiers = [...(dossiers || []), ...(dossiersByClient || [])]
    const seen = new Set<string>()
    allDossiers.forEach((d: any) => {
      if (seen.has(d.id)) return
      seen.add(d.id)
      r.push({
        id: d.id, type: 'dossier',
        titre: `${d.type_impot} — ${d.clients?.raison_sociale || ''}`,
        sousTitre: `Année ${d.periode_annee} · ${d.statut}`,
        href: '/dashboard/dossiers'
      })
    })

    ;(relances || []).forEach((rel: any) => {
      r.push({
        id: rel.id, type: 'relance',
        titre: `Relance ${rel.canal === 'whatsapp' ? 'WhatsApp' : 'Email'} — ${rel.clients?.raison_sociale}`,
        sousTitre: rel.contenu_email?.substring(0, 60) + '...',
        href: '/dashboard/dossiers'
      })
    })

    setResults(r)
    setSelected(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => chercher(query), 250)
    return () => clearTimeout(t)
  }, [query, chercher])

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) navigate(results[selected].href)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [results, selected])

  const TYPE_ICON: Record<string, React.ReactNode> = {
    client: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    dossier: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    relance: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  }
  const TYPE_COLOR: Record<string, string> = {
    client: '#2d6a4f', dossier: '#3b82f6', relance: '#8b5cf6'
  }
  const TYPE_LABEL: Record<string, string> = {
    client: 'Client', dossier: 'Dossier', relance: 'Relance'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: -10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: -10 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher clients, dossiers, relances..."
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
          )}
          <button onClick={onClose} className="text-gray-400 text-xs px-2 py-1 rounded border border-gray-200">Esc</button>
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.map((r, i) => (
              <button
                key={r.id + r.type}
                onClick={() => navigate(r.href)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ background: i === selected ? '#f0f9f4' : 'white' }}
                onMouseEnter={() => setSelected(i)}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: TYPE_COLOR[r.type] + '15', color: TYPE_COLOR[r.type] }}>
                  {TYPE_ICON[r.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.titre}</p>
                  <p className="text-xs text-gray-400 truncate">{r.sousTitre}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ background: TYPE_COLOR[r.type] + '15', color: TYPE_COLOR[r.type] }}>
                  {TYPE_LABEL[r.type]}
                </span>
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">Aucun résultat pour « {query} »</div>
        )}

        {query.length === 0 && (
          <div className="px-4 py-4 text-xs text-gray-400">
            Tapez pour chercher dans clients, dossiers et relances · <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">↑↓</kbd> naviguer · <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">↵</kbd> ouvrir
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
