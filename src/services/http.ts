import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import type { ApiError } from '@/types'

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8100/api'
export const API_BASE = RAW_BASE.replace(/\/+$/, '')

export const TOKEN_KEY = 'access_token'
export const REFRESH_KEY = 'refresh_token'

const instance = axios.create({ timeout: 30000 })

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return null

  try {
    const { data } = await axios.post<{ accessToken: string }>(
      `${API_BASE}/refresh-access-token`,
      { refreshToken },
      { timeout: 15000 },
    )
    localStorage.setItem(TOKEN_KEY, data.accessToken)
    return data.accessToken
  } catch {
    localStorage.removeItem(REFRESH_KEY)
    return null
  }
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      refreshing ||= refreshAccessToken().finally(() => {
        refreshing = null
      })

      const token = await refreshing
      if (token) {
        original.headers = { ...original.headers, Authorization: token }
        return instance.request(original)
      }

      window.dispatchEvent(new CustomEvent('auth:token-expired'))
    }

    return Promise.reject(error)
  },
)

function headers(extra?: Record<string, string>) {
  const base: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) base.Authorization = token
  return { ...base, ...extra }
}

function url(endpoint: string) {
  return `${API_BASE}/${endpoint.replace(/^\/+/, '')}`
}

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      return {
        status: error.response.status,
        message: (error.response.data as { message?: string })?.message || error.message,
        data: error.response.data,
      }
    }
    return { status: 0, message: 'No se pudo conectar con el servidor' }
  }
  return { status: 500, message: 'Error desconocido' }
}

async function request<T>(fn: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const response = await fn()
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export const http = {
  get<T>(endpoint: string, params?: Record<string, unknown>) {
    return request<T>(() => instance.get<T>(url(endpoint), { headers: headers(), params }))
  },
  post<T>(endpoint: string, body?: unknown) {
    return request<T>(() => instance.post<T>(url(endpoint), body ?? {}, { headers: headers() }))
  },
  put<T>(endpoint: string, body?: unknown) {
    return request<T>(() => instance.put<T>(url(endpoint), body ?? {}, { headers: headers() }))
  },
  patch<T>(endpoint: string, body?: unknown) {
    return request<T>(() => instance.patch<T>(url(endpoint), body ?? {}, { headers: headers() }))
  },
  delete<T>(endpoint: string) {
    return request<T>(() => instance.delete<T>(url(endpoint), { headers: headers() }))
  },
}

export function apiErrorMessage(error: unknown, fallback = 'Ocurrió un error') {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as ApiError).message) || fallback
  }
  return fallback
}
