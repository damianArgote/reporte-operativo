/**
 * Test-only stand-in for the `virtual:pwa-register` module vite-plugin-pwa
 * generates at build time (aliased in vite.config.ts when `process.env.VITEST`
 * is set). Keeps Vitest from ever needing the real plugin-generated virtual
 * module — see src/pwa/registerSW.ts, the only importer.
 */
export function registerSW(options?: {
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void
  onRegisterError?: (error: unknown) => void
}): (reloadPage?: boolean) => Promise<void> {
  void options
  return () => Promise.resolve()
}
