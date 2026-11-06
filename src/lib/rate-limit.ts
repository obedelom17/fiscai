export type Limites = { parMinute: number; parJour: number }

/** Décision pure (testable) à partir des compteurs déjà observés. */
export function evaluerLimite(minute: number, jour: number, l: Limites): { ok: boolean; raison?: string } {
  if (minute >= l.parMinute) return { ok: false, raison: 'Trop de requêtes, réessayez dans une minute.' }
  if (jour >= l.parJour) return { ok: false, raison: 'Quota journalier atteint.' }
  return { ok: true }
}
