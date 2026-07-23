'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'info' | 'warning'
type Toast = { id: number; message: string; type: ToastType }

const ToastContext = createContext<{
  toast: (message: string, type?: ToastType) => void
}>({ toast: () => {} })

let id = 0
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const newId = ++id
    setToasts(prev => [...prev, { id: newId, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newId)), 4000)
  }, [])

  const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: '#f0f9f4', border: '#2d6a4f', icon: '✓' },
    error: { bg: '#fff5f5', border: '#dc2626', icon: '✕' },
    info: { bg: '#eff6ff', border: '#3b82f6', icon: 'i' },
    warning: { bg: '#fff8ed', border: '#e8a317', icon: '!' },
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const c = colors[t.type]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border pointer-events-auto max-w-sm"
                style={{ background: c.bg, borderColor: c.border + '40', borderWidth: 1 }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: c.border }}>
                  {c.icon}
                </div>
                <p className="text-sm font-medium text-gray-800">{t.message}</p>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
