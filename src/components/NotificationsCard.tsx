'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'

function cleVersUint8(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...b].map(c => c.charCodeAt(0)))
}

export default function NotificationsCard() {
  const { toast } = useToast()
  const [supporte, setSupporte] = useState(true)
  const [actif, setActif] = useState(false)
  const [busy, setBusy] = useState(false)
  const cle = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setSupporte(false); return }
    navigator.serviceWorker.getRegistration('/push-sw.js').then(async reg => {
      const sub = await reg?.pushManager.getSubscription()
      setActif(!!sub)
    })
  }, [])

  async function activer() {
    setBusy(true)
    try {
      if (!cle) throw new Error('Notifications non configurées (clé VAPID manquante)')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') throw new Error('Autorisation refusée par le navigateur')
      const reg = await navigator.serviceWorker.register('/push-sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleVersUint8(cle) })
      const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) })
      if (!res.ok) throw new Error('Enregistrement refusé')
      setActif(true); toast('Notifications activées sur cet appareil', 'success')
    } catch (e) { toast(e instanceof Error ? e.message : 'Activation impossible', 'error') }
    setBusy(false)
  }

  async function desactiver() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/push-sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
        await sub.unsubscribe()
      }
      setActif(false); toast('Notifications désactivées', 'success')
    } catch { toast('Désactivation impossible', 'error') }
    setBusy(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-800">Notifications</h2>
      <p className="text-sm text-gray-500 mt-1">Recevez chaque matin un résumé des dossiers en retard et des échéances proches, même quand l'application est fermée.</p>
      {!supporte ? (
        <p className="text-sm text-amber-700 mt-3">Ce navigateur ne prend pas en charge les notifications. Sur iPhone, ajoutez d'abord FiscAI à l'écran d'accueil.</p>
      ) : (
        <button onClick={actif ? desactiver : activer} disabled={busy}
          className="mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={actif ? { background: '#f0f4f1', color: '#2d6a4f' } : { background: 'linear-gradient(135deg,#2d6a4f,#1a3c2e)', color: '#fff' }}>
          {busy ? '…' : actif ? 'Désactiver sur cet appareil' : 'Activer sur cet appareil'}
        </button>
      )}
    </div>
  )
}
