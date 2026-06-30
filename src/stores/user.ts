import { defineStore } from 'pinia'

export interface UserState {
  token: string | null
  id: string | null
  name: string | null
  email: string | null
  roleId: number | null
  isAuthenticated: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: null,
    id: null,
    name: null,
    email: null,
    roleId: null,
    isAuthenticated: false,
  }),

  actions: {
    hydrate() {
      const token = localStorage.getItem('access_token')
      const id = localStorage.getItem('user_id')
      const roleId = localStorage.getItem('role_id')
      const name = localStorage.getItem('user_name')
      const email = localStorage.getItem('user_email')

      this.token = token
      this.isAuthenticated = !!token
      this.id = id || null
      this.roleId = roleId ? Number(roleId) : null
      this.name = name
      this.email = email
    },

    setSession(payload: { token: string; id?: string; name?: string; email?: string; roleId?: number }) {
      this.token = payload.token
      if (payload.id !== undefined) {
        this.id = payload.id
        try {
          localStorage.setItem('user_id', payload.id)
        } catch {}
      }
      if (payload.name) {
        this.name = payload.name
        try {
          localStorage.setItem('user_name', payload.name)
        } catch {}
      }
      if (payload.email) {
        this.email = payload.email
        try {
          localStorage.setItem('user_email', payload.email)
        } catch {}
      }
      if (payload.roleId !== undefined) {
        this.roleId = payload.roleId
        try {
          localStorage.setItem('role_id', String(payload.roleId))
        } catch {}
      }
      this.isAuthenticated = true
      try {
        localStorage.setItem('access_token', payload.token)
      } catch {}
    },

    clear() {
      this.token = null
      this.id = null
      this.name = null
      this.email = null
      this.roleId = null
      this.isAuthenticated = false
      try {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_id')
        localStorage.removeItem('role_id')
        localStorage.removeItem('user_name')
        localStorage.removeItem('user_email')
      } catch {}
    },
  },
})
