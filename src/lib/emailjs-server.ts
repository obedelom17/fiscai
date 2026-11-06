/**
 * Envoi d'e-mails côté serveur via l'API REST d'EmailJS.
 * Prérequis : activer « Allow EmailJS API for non-browser applications »
 * (EmailJS > Account > Security) et définir EMAILJS_PRIVATE_KEY.
 */
export function emailConfigure(): boolean {
  return !!(process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID && process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID && process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY)
}

export async function envoyerEmail(opts: { to: string; sujet: string; message: string; replyTo?: string | null; expediteur?: string }): Promise<void> {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
      template_id: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
      user_id: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: { to_email: opts.to, from_name: opts.expediteur || 'FiscAI', subject: opts.sujet, message: opts.message, reply_to: opts.replyTo || '' },
    }),
  })
  if (!res.ok) throw new Error(`EmailJS ${res.status} : ${(await res.text()).slice(0, 200)}`)
}
