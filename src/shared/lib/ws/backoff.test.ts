import { describe, expect, it } from 'vitest'

import { backoffDelay } from './backoff'

describe('backoffDelay', () => {
  const opts = { baseMs: 1000, maxMs: 30_000 }

  it('doubles the delay with each attempt', () => {
    const noJitter = { ...opts, random: () => 1 }
    expect([0, 1, 2, 3].map((a) => backoffDelay(a, noJitter))).toEqual([1000, 2000, 4000, 8000])
  })

  it('never goes above the maximum', () => {
    expect(backoffDelay(20, { ...opts, random: () => 1 })).toBe(30_000)
  })

  it('adds jitter between 50% and 100%', () => {
    expect(backoffDelay(2, { ...opts, random: () => 0 })).toBe(2000)
    expect(backoffDelay(2, { ...opts, random: () => 0.5 })).toBe(3000)
  })
})
