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
  schedule?: (cb: () => void) => number
  cancelSchedule?: (id: number) => void
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
}: Options<I, A>): RafBatcher<I> {
  let batch: A | undefined
  let frame: number | null = null

  const run = () => {
    frame = null
    if (batch === undefined) return
    const current = batch
    batch = undefined
    flush(current)
  }

  return {
    push(item) {
      batch = merge(batch, item)
      frame ??= schedule(run)
    },
    flush() {
      if (frame !== null) cancelSchedule(frame)
      run()
    },
    cancel() {
      if (frame !== null) cancelSchedule(frame)
      frame = null
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
