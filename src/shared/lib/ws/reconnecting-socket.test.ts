import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeSocket } from '@/shared/lib/test/fake-socket'

import { ReconnectingSocket, type SocketStatus } from './reconnecting-socket'

function setup(extra: Partial<ConstructorParameters<typeof ReconnectingSocket>[0]> = {}) {
  const messages: string[] = []
  const statuses: SocketStatus[] = []
  const onOpen = vi.fn()
  const socket = new ReconnectingSocket({
    url: 'wss://test',
    createSocket: (url) => new FakeSocket(url),
    backoff: { baseMs: 1000, maxMs: 8000, random: () => 1 },
    onMessage: (m) => messages.push(m),
    onStatus: (s) => statuses.push(s),
    onOpen,
    ...extra,
  })
  return { socket, messages, statuses, onOpen }
}

describe('ReconnectingSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeSocket.reset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('connects, reports status and forwards messages', () => {
    const { socket, messages, statuses, onOpen } = setup()
    socket.connect()
    FakeSocket.last.serverOpen()
    FakeSocket.last.serverMessage({ hello: 1 })

    expect(statuses).toEqual(['connecting', 'open'])
    expect(onOpen).toHaveBeenCalledOnce()
    expect(messages).toEqual(['{"hello":1}'])
  })

  it('reconnects with growing delays and calls onOpen again', () => {
    const { socket, statuses, onOpen } = setup()
    socket.connect()
    FakeSocket.last.serverOpen()

    FakeSocket.last.serverClose()
    expect(statuses.at(-1)).toBe('reconnecting')
    vi.advanceTimersByTime(999)
    expect(FakeSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(FakeSocket.instances).toHaveLength(2)

    // Fails again before opening: next delay is 2 s.
    FakeSocket.last.serverClose()
    vi.advanceTimersByTime(1999)
    expect(FakeSocket.instances).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(FakeSocket.instances).toHaveLength(3)

    FakeSocket.last.serverOpen()
    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(statuses.at(-1)).toBe('open')
  })

  it('does not reconnect after disconnect()', () => {
    const { socket, statuses } = setup()
    socket.connect()
    FakeSocket.last.serverOpen()
    socket.disconnect()
    vi.advanceTimersByTime(60_000)

    expect(FakeSocket.instances).toHaveLength(1)
    expect(statuses.at(-1)).toBe('closed')
  })

  it('sends heartbeats and drops a silent connection', () => {
    const { socket } = setup({
      heartbeat: { intervalMs: 1000, message: () => 'ping' },
      staleAfterMs: 2500,
    })
    socket.connect()
    const first = FakeSocket.last
    first.serverOpen()

    vi.advanceTimersByTime(2000)
    expect(first.sent).toEqual(['ping', 'ping'])

    // No message for more than 2.5 s: reconnect.
    vi.advanceTimersByTime(1000)
    vi.advanceTimersByTime(1000)
    expect(FakeSocket.instances).toHaveLength(2)
  })

  it('send() returns false while not open', () => {
    const { socket } = setup()
    expect(socket.send('x')).toBe(false)
    socket.connect()
    expect(socket.send('x')).toBe(false)
    FakeSocket.last.serverOpen()
    expect(socket.send('x')).toBe(true)
  })
})
