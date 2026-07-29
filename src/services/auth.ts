import APIBase from './httpBase'

const legacyApiBaseUrl = (import.meta.env.VITE_LEGACY_API_BASE_URL as string) || 'http://localhost:3981'

export interface AuthUser {
  _id?: string
  id?: string
  name: string
  lastname?: string
  email: string
  roleId?: number
  active?: boolean
}

export interface SignInResponse {
  accessToken: string
  refreshToken: string
  user?: AuthUser
}

class AuthService extends APIBase {
  constructor(baseUrl?: string, tokenStorageKey?: string) {
    super({ baseUrl, tokenStorageKey })
  }

  async signIn(payload: { email: string; password: string }) {
    const response = await this.post<SignInResponse>('/sign-in', payload)
    return response.data
  }

  async refresh(refreshToken: string) {
    const response = await this.post<{ accessToken: string }>('/refresh-access-token', { refreshToken })
    return response.data
  }
}

export const authService = new AuthService()
export const legacyAuthService = new AuthService(legacyApiBaseUrl, 'legacy_access_token')
