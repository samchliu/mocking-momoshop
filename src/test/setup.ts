import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

// jsdom does not implement <dialog> modal APIs; minimal polyfill mirroring browser behaviour.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

// jsdom does not implement scrolling (used by <ScrollRestoration>).
window.scrollTo = () => {}

afterEach(() => cleanup())
