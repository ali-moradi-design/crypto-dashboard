import type { SocketLike } from '@/shared/lib/ws'

/** In-memory WebSocket for unit tests. */
export class FakeSocket implements SocketLike {
  static instances: FakeSocket[] = []
  readyState = 0
  sent: string[] = []
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  readonly url: string

  constructor(url: string) {
    this.url = url
    FakeSocket.instances.push(this)
  }

  static get last(): FakeSocket {
    const socket = FakeSocket.instances.at(-1)
    if (!socket) throw new Error('No FakeSocket created')
    return socket
  }

  static reset(): void {
    FakeSocket.instances = []
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = 3
  }

  // Test helpers
  serverOpen(): void {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }

  serverMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }

  serverClose(): void {
    this.readyState = 3
    this.onclose?.(new CloseEvent('close'))
  }

  sentJson(): unknown[] {
    return this.sent.map((s) => JSON.parse(s) as unknown)
  }
}
