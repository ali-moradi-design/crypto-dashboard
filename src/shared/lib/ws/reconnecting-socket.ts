import { backoffDelay, type BackoffOptions } from './backoff'

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'

/** The part of the browser WebSocket this class uses (easy to fake in tests). */
export interface SocketLike {
  readonly readyState: number
  send(data: string): void
  close(): void
  onopen: ((event: Event) => void) | null
  onmessage: ((event: MessageEvent) => void) | null
  onclose: ((event: CloseEvent) => void) | null
  onerror: ((event: Event) => void) | null
}

const OPEN = 1

export interface ReconnectingSocketOptions {
  url: string
  onMessage: (data: string) => void
  /** Called after every (re)connect: resubscribe here. */
  onOpen?: () => void
  onStatus?: (status: SocketStatus) => void
  createSocket?: (url: string) => SocketLike
  backoff?: BackoffOptions
  /** App-level ping. */
  heartbeat?: { intervalMs: number; message: () => string }
  /** Reconnect when nothing arrives for this long, ms. */
  staleAfterMs?: number
}

/**
 * A WebSocket that reconnects with exponential backoff, sends heartbeats and
 * drops connections that went silent.
 */
export class ReconnectingSocket {
  private socket: SocketLike | null = null
  private status: SocketStatus = 'idle'
  private attempt = 0
  private wanted = false
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined
  private lastMessageAt = 0
  private readonly options: Required<Pick<ReconnectingSocketOptions, 'backoff' | 'createSocket'>> &
    ReconnectingSocketOptions

  constructor(options: ReconnectingSocketOptions) {
    this.options = {
      backoff: { baseMs: 1000, maxMs: 30_000 },
      createSocket: (url) => new WebSocket(url),
      ...options,
    }
  }

  get currentStatus(): SocketStatus {
    return this.status
  }

  get isOpen(): boolean {
    return this.socket?.readyState === OPEN
  }

  connect(): void {
    if (this.wanted) return
    this.wanted = true
    this.open()
  }

  disconnect(): void {
    this.wanted = false
    clearTimeout(this.reconnectTimer)
    this.teardown()
    this.setStatus('closed')
  }

  /** Sends when open; returns false otherwise (subscriptions are resent on open). */
  send(data: string): boolean {
    if (this.socket?.readyState !== OPEN) return false
    this.socket.send(data)
    return true
  }

  private open(): void {
    this.setStatus(this.attempt === 0 ? 'connecting' : 'reconnecting')
    const socket = this.options.createSocket(this.options.url)
    this.socket = socket

    socket.onopen = () => {
      this.attempt = 0
      this.lastMessageAt = Date.now()
      this.setStatus('open')
      this.startHeartbeat()
      this.options.onOpen?.()
    }
    socket.onmessage = (event) => {
      this.lastMessageAt = Date.now()
      if (typeof event.data === 'string') this.options.onMessage(event.data)
    }
    socket.onerror = () => {
      // onclose follows; reconnect is handled there.
    }
    socket.onclose = () => {
      if (this.socket !== socket) return
      this.teardown()
      if (this.wanted) this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    clearTimeout(this.reconnectTimer)
    const delay = backoffDelay(this.attempt, this.options.backoff)
    this.attempt += 1
    this.setStatus('reconnecting')
    this.reconnectTimer = setTimeout(() => {
      if (this.wanted) this.open()
    }, delay)
  }

  private startHeartbeat(): void {
    const { heartbeat, staleAfterMs } = this.options
    if (!heartbeat && !staleAfterMs) return
    const intervalMs = heartbeat?.intervalMs ?? Math.max(1000, (staleAfterMs ?? 0) / 2)
    this.heartbeatTimer = setInterval(() => {
      if (staleAfterMs && Date.now() - this.lastMessageAt > staleAfterMs) {
        // Silent connection: drop it and reconnect.
        this.teardown()
        if (this.wanted) this.scheduleReconnect()
        return
      }
      if (heartbeat) this.send(heartbeat.message())
    }, intervalMs)
  }

  private teardown(): void {
    clearInterval(this.heartbeatTimer)
    const socket = this.socket
    this.socket = null
    if (socket) {
      socket.onopen = null
      socket.onmessage = null
      socket.onclose = null
      socket.onerror = null
      try {
        socket.close()
      } catch {
        // Already closed.
      }
    }
  }

  private setStatus(status: SocketStatus): void {
    if (this.status === status) return
    this.status = status
    this.options.onStatus?.(status)
  }
}
