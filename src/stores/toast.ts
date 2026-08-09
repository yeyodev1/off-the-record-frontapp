import { defineStore } from 'pinia'
import type { SoundName } from 'cuelume'
import { cue } from '@/composables/useSound'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  icon?: string
  run: () => void
}

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  detail: string
  timeout: number
  action?: ToastAction
}

const ICONS: Record<ToastTone, string> = {
  success: 'fa-solid fa-circle-check',
  error: 'fa-solid fa-circle-exclamation',
  info: 'fa-solid fa-circle-info',
  warning: 'fa-solid fa-triangle-exclamation',
}

/** Cada tono de aviso tiene su propia señal sonora. */
const TONE_SOUNDS: Record<ToastTone, SoundName> = {
  success: 'success',
  error: 'error',
  warning: 'droplet',
  info: 'whisper',
}

let counter = 0

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [] as Toast[],
  }),

  getters: {
    iconFor: () => (tone: ToastTone) => ICONS[tone],
  },

  actions: {
    push(tone: ToastTone, title: string, detail = '', timeout = 4200, action?: ToastAction) {
      const id = ++counter
      this.items.push({ id, tone, title, detail, timeout, action })

      // Un aviso que suena distinto se reconoce sin leerlo.
      cue(TONE_SOUNDS[tone])

      if (timeout > 0) {
        window.setTimeout(() => this.dismiss(id), timeout)
      }

      return id
    },
    success(title: string, detail = '') {
      return this.push('success', title, detail)
    },
    error(title: string, detail = '') {
      return this.push('error', title, detail, 6000)
    },
    info(title: string, detail = '') {
      return this.push('info', title, detail)
    },
    warning(title: string, detail = '') {
      return this.push('warning', title, detail, 5200)
    },
    /** Aviso con botón de deshacer: la red de seguridad de lo destructivo. */
    undoable(title: string, detail: string, run: () => void, timeout = 8000) {
      return this.push('info', title, detail, timeout, { label: 'Deshacer', icon: 'fa-solid fa-rotate-left', run })
    },

    runAction(id: number) {
      const toast = this.items.find((item) => item.id === id)
      toast?.action?.run()
      this.dismiss(id)
    },

    dismiss(id: number) {
      this.items = this.items.filter((item) => item.id !== id)
    },
    clear() {
      this.items = []
    },
  },
})
