export class GateHttpError extends Error {
  readonly status: number
  readonly path: string

  constructor(status: number, path: string) {
    super(`Gate API ${String(status)} for ${path}`)
    this.name = 'GateHttpError'
    this.status = status
    this.path = path
  }
}

export interface RestClient {
  get<T>(path: string, params?: Record<string, string | number>): Promise<T>
}

export function createRestClient(
  baseUrl: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): RestClient {
  return {
    async get<T>(path: string, params: Record<string, string | number> = {}) {
      const url = new URL(baseUrl.replace(/\/$/, '') + path)
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) })
      if (!response.ok) throw new GateHttpError(response.status, path)
      return (await response.json()) as T
    },
  }
}
