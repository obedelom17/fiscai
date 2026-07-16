'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type Message = { role: 'user' | 'assistant'; content: string }

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis FiscAl, votre assistant fiscal. Posez-moi vos questions sur vos dossiers clients, échéances OTR ou obligations fiscales.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contexte, setContexte] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { chargerContexte() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function chargerContexte() {
    const { data: clients } = await supabase.from('clients').select('raison_sociale, nif, regime_fiscal')
    const { data: dossiers } = await supabase
      .from('dossiers_fiscaux')
      .select('type_impot, statut, date_echeance, periode_mois, periode_annee, clients(raison_sociale)')
      .order('date_echeance', { ascending: true })
      .limit(20)

    const ctx = `
CLIENTS (${clients?.length || 0}) :
${clients?.map(c => `- ${c.raison_sociale} (NIF: ${c.nif}, Régime: ${c.regime_fiscal})`).join('\n') || 'Aucun'}

DOSSIERS FISCAUX RÉCENTS :
${dossiers?.map(d => `- ${(d.clients as any)?.raison_sociale} | ${d.type_impot} | ${d.statut} | Échéance: ${new Date(d.date_echeance).toLocaleDateString('fr-FR')}`).join('\n') || 'Aucun'}
`
    setContexte(ctx)
  }

  async function envoyer() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg, contexte })
    })
    const data = await res.json()
    setMessages(prev => [...prev, { role: 'assistant', content: data.reponse }])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
          <a href="/dashboard/assistant" className="text-sm font-medium text-blue-600">Assistant IA</a>
          <a href="/admin/statistiques" className="text-sm text-gray-500 hover:text-gray-800">Statistiques</a>
        </div>
      </nav>

      {/* Chat */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Assistant IA</h1>
          <p className="text-gray-500 text-sm mt-1">Posez vos questions en langage naturel sur vos dossiers fiscaux</p>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 overflow-y-auto mb-4 space-y-4" style={{minHeight: '400px', maxHeight: '500px', overflowY: 'auto'}}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && envoyer()}
            placeholder="Ex: Quels clients ont des dossiers TVA en attente ?"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={envoyer}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}