interface ImportMetaEnv {
  readonly VITE_GATE_REST_URL?: string
  readonly VITE_GATE_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
