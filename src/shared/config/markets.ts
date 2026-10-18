/** Pairs shown in the market table (all verified on Gate). */
export const DEFAULT_SYMBOLS = [
  'BTC_USDT',
  'ETH_USDT',
  'SOL_USDT',
  'BNB_USDT',
  'XRP_USDT',
  'ADA_USDT',
  'DOGE_USDT',
  'TRX_USDT',
  'AVAX_USDT',
  'LINK_USDT',
  'DOT_USDT',
  'LTC_USDT',
  'BCH_USDT',
  'NEAR_USDT',
  'SUI_USDT',
  'UNI_USDT',
  'AAVE_USDT',
  'PEPE_USDT',
  'SHIB_USDT',
  'XLM_USDT',
] as const

export const DEFAULT_SYMBOL = 'BTC_USDT'

/** Exchange hosts; override with VITE_GATE_REST_URL / VITE_GATE_WS_URL. */
export const GATE_REST_URL: string =
  import.meta.env.VITE_GATE_REST_URL ?? 'https://api.gateio.ws/api/v4'
export const GATE_WS_URL: string = import.meta.env.VITE_GATE_WS_URL ?? 'wss://api.gateio.ws/ws/v4/'
