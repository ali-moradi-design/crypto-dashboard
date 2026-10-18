import { GATE_REST_URL, GATE_WS_URL } from '@/shared/config/markets'

import { GateSource } from './gate-source'

export { GateSource, type GateSourceOptions } from './gate-source'
export { GateHttpError } from './rest'

/** The app-wide Gate source (one WebSocket for the whole page). */
export function createGateSource(): GateSource {
  return new GateSource({ restUrl: GATE_REST_URL, wsUrl: GATE_WS_URL })
}
