import { describe, it, expect } from 'vitest'
import { evaluerLimite } from '@/lib/rate-limit'

describe('rate limit', () => {
  const l = { parMinute: 10, parJour: 100 }
  it('autorise sous les seuils', () => expect(evaluerLimite(9, 99, l).ok).toBe(true))
  it('bloque à la minute', () => expect(evaluerLimite(10, 0, l).ok).toBe(false))
  it('bloque à la journée', () => expect(evaluerLimite(0, 100, l).ok).toBe(false))
})
