import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

export function pushConfigure(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contact@fiscai.app', pub, priv)
  return true
}

export type PushPayload = { title: string; body: string; url?: string }

/** Envoie une notification à tous les appareils d'un utilisateur ; purge les abonnements expirés. */
export async function envoyerPush(admin: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId)
  let envoyes = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload))
      envoyes++
    } catch (e: unknown) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', s.id)
    }
  }
  return envoyes
}

export function genererClesVapid() {
  return webpush.generateVAPIDKeys()
}
