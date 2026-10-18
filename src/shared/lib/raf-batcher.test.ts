import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRafBatcher, latestByKey } from './raf-batcher'

function manualFrames() {
  const callbacks: (() => void)[] = []
  return {
    schedule: (cb: () => void) => callbacks.push(cb),
    cancelSchedule: vi.fn(),
    tick: () => {
      callbacks.splice(0).forEach((cb) => {
        cb()
      })
    },
    pending: () => callbacks.length,
  }
}

describe('createRafBatcher', () => {
  it('flushes many items once per frame, latest value per key', () => {
    const frames = manualFrames()
    const flush = vi.fn()
    const batcher = createRafBatcher({
      merge: latestByKey((t: { s: string; p: number }) => t.s),
      flush,
      ...frames,
    })

    batcher.push({ s: 'BTC', p: 81100 })
    batcher.push({ s: 'BTC', p: 81105 })
    batcher.push({ s: 'ETH', p: 2500 })
    batcher.push({ s: 'BTC', p: 81102 })

    expect(frames.pending()).toBe(1)
    expect(flush).not.toHaveBeenCalled()
    frames.tick()

    expect(flush).toHaveBeenCalledOnce()
    const batch = flush.mock.calls[0]?.[0] as Map<string, { p: number }>
    expect([...batch.values()].map((t) => t.p)).toEqual([81102, 2500])
  })

  it('does not schedule a frame when nothing was pushed', () => {
    const frames = manualFrames()
    const flush = vi.fn()
    createRafBatcher({ merge: (_b: number | undefined, i: number) => i, flush, ...frames })
    frames.tick()
    expect(flush).not.toHaveBeenCalled()
  })

  it('cancel() drops the pending batch', () => {
    const frames = manualFrames()
    const flush = vi.fn()
    const batcher = createRafBatcher({
      merge: (_b: number | undefined, i: number) => i,
      flush,
      ...frames,
    })
    batcher.push(1)
    batcher.cancel()
    frames.tick()
    expect(flush).not.toHaveBeenCalled()
  })

  describe('with minIntervalMs', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('flushes at most once per interval, always with the latest value', () => {
      vi.useFakeTimers()
      const frames = manualFrames()
      const flush = vi.fn()
      let clock = 0
      const batcher = createRafBatcher({
        merge: (_b: number | undefined, i: number) => i,
        flush,
        minIntervalMs: 250,
        now: () => clock,
        ...frames,
      })

      batcher.push(1)
      frames.tick()
      expect(flush).toHaveBeenLastCalledWith(1)

      // 100 ms later: too soon, wait for the interval.
      clock = 100
      batcher.push(2)
      batcher.push(3)
      frames.tick()
      expect(flush).toHaveBeenCalledTimes(1)

      clock = 250
      vi.advanceTimersByTime(150)
      frames.tick()
      expect(flush).toHaveBeenCalledTimes(2)
      expect(flush).toHaveBeenLastCalledWith(3)
    })
  })
})
