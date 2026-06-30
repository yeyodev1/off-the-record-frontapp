import APIBase from './httpBase'

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
  user: AuthUser
}

class AuthService extends APIBase {
  async signIn(payload: { email: string; password: string }) {
    const response = await this.post<SignInResponse>('/auth/sign-in', payload)
    return response.data
  }

  async refresh(refreshToken: string) {
    const response = await this.post<{ accessToken: string }>('/auth/refresh-access-token', { refreshToken })
    return response.data
  }
}

export const authService = new AuthService()
