'use client'

import PageHeader from '@/components/PageHeader'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

type Message = { role: 'user' | 'assistant'; content: string }

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bonjour. Je suis FiscAl, votre assistant fiscal intelligent. Posez-moi vos questions sur vos dossiers clients, échéances OTR ou obligations fiscales togolaises.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contexte, setContexte] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { chargerContexte() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function chargerContexte() {
    try {
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
    } catch (e) {
      console.error('Erreur contexte assistant:', e)
    }
  }

  async function envoyer() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, contexte })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reponse }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolé, une erreur est survenue. Veuillez réessayer.' }])
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    'Quels clients ont des dossiers TVA en attente ?',
    'Quelles sont les échéances critiques cette semaine ?',
    'Résume le statut de conformité du cabinet',
    'Quels clients sont en retard sur leur IRPP ?',
  ]

  return (
    <div className="h-screen flex flex-col" style={{ background: '#f0f4f1' }}>

      <PageHeader
  titre="Assistant IA"
  sousTitre="Interrogez vos données fiscales en langage naturel"
  imageUrl="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=80"
/>

      <div className="flex-1 flex flex-col overflow-hidden px-8 py-6 gap-4">

        {/* Suggestions */}
        <AnimatePresence>
          {messages.length === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-3 flex-shrink-0">
              {suggestions.map((s, i) => (
                <motion.button key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setInput(s)}
                  whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(45,106,79,0.12)', borderColor: '#2d6a4f' }}
                  whileTap={{ scale: 0.98 }}
                  className="text-left p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm text-gray-600 transition-all">
                  <div className="w-6 h-6 rounded-lg mb-2 flex items-center justify-center"
                    style={{ background: '#f0f4f1' }}>
                    <svg className="w-3 h-3" fill="none" stroke="#2d6a4f" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
                    </svg>
                  </div>
                  {s}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zone messages — prend tout l'espace restant */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-y-auto space-y-4 min-h-0">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 15, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
                {msg.role === 'assistant' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                    <span className="text-white text-xs font-bold">F</span>
                  </motion.div>
                )}
                <motion.div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm border border-gray-100'}`}
                  style={msg.role === 'user'
                    ? { background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)', color: 'white' }
                    : { background: '#f8fafb', color: '#374151' }}>
                  {msg.content}
                </motion.div>
                {msg.role === 'user' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ background: '#f0f4f1' }}>
                    <svg className="w-4 h-4" fill="none" stroke="#2d6a4f" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                <span className="text-white text-xs font-bold">F</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  {[0, 150, 300].map(delay => (
                    <motion.div key={delay}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: delay / 1000 }}
                      className="w-2 h-2 rounded-full"
                      style={{ background: '#2d6a4f' }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input fixe en bas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex items-center gap-3 flex-shrink-0">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && envoyer()}
            placeholder="Ex: Quels clients ont des dossiers TVA en attente ?"
            className="flex-1 px-4 py-2.5 text-sm outline-none text-gray-700 placeholder-gray-400" />
          <motion.button onClick={envoyer} disabled={loading || !input.trim()}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Envoyer
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}