// Point d'entrée Cloudflare : application Next.js (OpenNext) + tâches planifiées.
// @ts-expect-error fichier généré au build par opennextjs-cloudflare
import handler from './.open-next/worker.js'

interface Env {
  CRON_SECRET?: string
  [cle: string]: unknown
}

const ROUTES_CRON: Record<string, string> = {
  '0 7 * * *': '/api/cron/quotidien',
  '0 2 * * 0': '/api/cron/sauvegarde',
}

export default {
  fetch: handler.fetch,

  async scheduled(controller: { cron: string }, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const chemin = ROUTES_CRON[controller.cron]
    if (!chemin) return
    const requete = new Request(`https://fiscai.internal${chemin}`, {
      method: 'GET',
      headers: { authorization: `Bearer ${env.CRON_SECRET ?? ''}` },
    })
    ctx.waitUntil(
      handler.fetch(requete, env, ctx).then(async (reponse: Response) => {
        if (!reponse.ok) console.error(`Cron ${chemin} : HTTP ${reponse.status}`, await reponse.text())
      })
    )
  },
}
