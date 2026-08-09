import { defineStore } from 'pinia'
import { authApi } from '@/services/api'
import { REFRESH_KEY, TOKEN_KEY } from '@/services/http'
import type { AppUser } from '@/types'

export const ROLE_ADMIN = 1
export const ROLE_READER = 2
export const ROLE_EDITOR = 3
export const ROLE_SUPERADMIN = 4

const USER_KEY = 'otr_user'

function readStoredUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AppUser) : null
  } catch {
    return null
  }
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: null as string | null,
    user: null as AppUser | null,
    hydrated: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    roleId: (state) => state.user?.roleId ?? 0,
    isSuperadmin: (state) => state.user?.roleId === ROLE_SUPERADMIN,
    isAdmin: (state) => state.user?.roleId === ROLE_ADMIN || state.user?.roleId === ROLE_SUPERADMIN,
    isEditorial: (state) =>
      state.user?.roleId === ROLE_ADMIN ||
      state.user?.roleId === ROLE_EDITOR ||
      state.user?.roleId === ROLE_SUPERADMIN,
    displayName: (state) => {
      if (!state.user) return ''
      const full = `${state.user.name} ${state.user.lastname}`.trim()
      return full || state.user.email
    },
    initials: (state) => {
      if (!state.user) return '—'
      const source = `${state.user.name} ${state.user.lastname}`.trim() || state.user.email
      return source
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    },
    homeRoute(): string {
      return this.isEditorial ? '/admin/panel' : '/lector'
    },
  },

  actions: {
    hydrate() {
      this.token = localStorage.getItem(TOKEN_KEY)
      this.user = readStoredUser()
      this.hydrated = true
    },

    persist(user: AppUser) {
      this.user = user
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
        localStorage.setItem('role_id', String(user.roleId))
      } catch {
        /* almacenamiento no disponible */
      }
    },

    async signIn(email: string, password: string) {
      const response = await authApi.signIn(email, password)

      this.token = response.accessToken
      localStorage.setItem(TOKEN_KEY, response.accessToken)
      localStorage.setItem(REFRESH_KEY, response.refreshToken)
      this.persist(response.user)

      return response.user
    },

    async refreshProfile() {
      if (!this.token) return null
      const { data } = await authApi.me()
      this.persist(data)
      return data
    },

    async signOut() {
      try {
        if (this.token) await authApi.signOut()
      } catch {
        /* el cierre local siempre procede */
      }
      this.clear()
    },

    clear() {
      this.token = null
      this.user = null
      try {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_KEY)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem('role_id')
      } catch {
        /* almacenamiento no disponible */
      }
    },
  },
})
