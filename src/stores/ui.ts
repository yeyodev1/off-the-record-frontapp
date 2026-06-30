import { defineStore } from 'pinia'

export type EditorMode = 'create' | 'edit'

export interface EditorState {
  open: boolean
  moduleKey: string | null
  mode: EditorMode
  record: Record<string, unknown> | null
}

export const useUiStore = defineStore('ui', {
  state: (): EditorState => ({
    open: false,
    moduleKey: null,
    mode: 'create',
    record: null,
  }),

  actions: {
    openEditor(moduleKey: string, mode: EditorMode = 'create', record: Record<string, unknown> | null = null) {
      this.moduleKey = moduleKey
      this.mode = mode
      this.record = record
      this.open = true
    },

    closeEditor() {
      this.open = false
      this.moduleKey = null
      this.mode = 'create'
      this.record = null
    },
  },
})
