/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly EXPORT_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
