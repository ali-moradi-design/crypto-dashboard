export interface RafBatcher<I> {
  push(item: I): void
  /** Flush now (tests, or before unmount). */
  flush(): void
  cancel(): void
}

interface Options<I, A> {
  /** Folds a new item into the pending batch. */
  merge: (batch: A | undefined, item: I) => A
  /** Receives the batch at most once per animation frame. */
  flush: (batch: A) => void
  /** Minimum time between two flushes, ms (0 = every frame). */
  minIntervalMs?: number
  schedule?: (cb: () => void) => number
  cancelSchedule?: (id: number) => void
  now?: () => number
}

/**
 * Collects high-frequency items and hands them over once per animation frame.
 * Browsers pause requestAnimationFrame in hidden tabs, so nothing is applied
 * while the tab is hidden; `merge` keeps the batch small (latest value wins).
 */
export function createRafBatcher<I, A>({
  merge,
  flush,
  schedule = (cb) => requestAnimationFrame(cb),
  cancelSchedule = (id) => {
    cancelAnimationFrame(id)
  },
  minIntervalMs = 0,
  now = () => performance.now(),
}: Options<I, A>): RafBatcher<I> {
  let batch: A | undefined
  let frame: number | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastFlush = Number.NEGATIVE_INFINITY

  const run = () => {
    frame = null
    if (batch === undefined) return
    const current = batch
    batch = undefined
    lastFlush = now()
    flush(current)
  }

  const stop = () => {
    if (frame !== null) cancelSchedule(frame)
    if (timer !== null) clearTimeout(timer)
    frame = null
    timer = null
  }

  return {
    push(item) {
      batch = merge(batch, item)
      if (frame !== null || timer !== null) return
      const wait = lastFlush + minIntervalMs - now()
      if (wait > 0) {
        // Throttled: wait out the interval, then flush on the next frame.
        timer = setTimeout(() => {
          timer = null
          frame = schedule(run)
        }, wait)
      } else {
        frame = schedule(run)
      }
    },
    flush() {
      stop()
      run()
    },
    cancel() {
      stop()
      batch = undefined
    },
  }
}

/** merge helper: keep only the latest item per key. */
export function latestByKey<I>(key: (item: I) => string) {
  return (batch: Map<string, I> | undefined, item: I): Map<string, I> => {
    const map = batch ?? new Map<string, I>()
    map.set(key(item), item)
    return map
  }
}
