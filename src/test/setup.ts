import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'sonner'
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// vitest.config.ts sets `globals: false`, so Testing Library's automatic
// afterEach(cleanup) (which relies on a global `afterEach`) never runs —
// wire it up explicitly so each test unmounts its render.
afterEach(() => {
  cleanup()
  // sonner's toast queue is a module-level singleton outside React's tree —
  // unmounting <Toaster/> doesn't clear pending toasts, so they'd otherwise
  // reappear (and be queried) in the next test that mounts a fresh Toaster.
  toast.dismiss()
  // Radix's Dialog/Sheet imperatively sets body-level attributes (scroll
  // lock, aria-hiding siblings) outside React's tree; when a test leaves one
  // open, cleanup()'s unmount can race the async removal. Reset explicitly
  // so a leftover attribute never leaks into the next test.
  document.body.removeAttribute('data-scroll-locked')
  document.body.removeAttribute('aria-hidden')
  document.body.removeAttribute('data-aria-hidden')
  document.body.style.pointerEvents = ''
  document.querySelectorAll('[data-radix-focus-guard]').forEach((node) => node.remove())
})

// jsdom doesn't implement pointer capture; Radix's dropdown-menu/select
// triggers call these on pointerdown.
if (typeof window !== 'undefined' && window.HTMLElement) {
  const proto = window.HTMLElement.prototype as HTMLElement & {
    setPointerCapture?: (id: number) => void
    releasePointerCapture?: (id: number) => void
    hasPointerCapture?: (id: number) => boolean
  }
  proto.setPointerCapture ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.hasPointerCapture ??= () => false
  proto.scrollIntoView ??= () => {}
}

// jsdom doesn't implement ResizeObserver; Radix primitives (e.g. Switch's
// internal use-size) observe their root element on mount.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom doesn't implement matchMedia; useResolvedTheme (src/hooks/useTheme.ts,
// used by the Toaster and the theme control for its light/dark/system
// resolution) reads it on mount. Tests that need "system" behavior or the
// "change" event override this with their own mock.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
