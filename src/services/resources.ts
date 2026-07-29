import APIBase from './httpBase'

const legacyApiBaseUrl = (import.meta.env.VITE_LEGACY_API_BASE_URL as string) || 'http://localhost:3981'

export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

function normalizeList<T>(payload: unknown): ListResponse<T> {
  if (Array.isArray(payload)) {
    return {
      data: payload as T[],
      total: payload.length,
      page: 1,
      limit: payload.length || 0,
    }
  }

  if (payload && typeof payload === 'object') {
    const source = payload as Record<string, unknown>
    const candidates = [
      source.data,
      source.users,
      source.articles,
      source.exclusives,
      source.notifications,
      source.uploads,
      source.extras,
      source.logs,
      source.logexclusives,
      source.rows,
      source.results,
    ]

    const data = candidates.find(Array.isArray)

    if (Array.isArray(data)) {
      const total = Number(source.total ?? source.count ?? data.length) || data.length
      const page = Number(source.page ?? 1) || 1
      const limit = Number(source.limit ?? data.length) || data.length

      return {
        data: data as T[],
        total,
        page,
        limit,
      }
    }
  }

  return {
    data: [],
    total: 0,
    page: 1,
    limit: 0,
  }
}

class ResourceService extends APIBase {
  constructor(baseUrl?: string, tokenStorageKey?: string) {
    super({ baseUrl, tokenStorageKey })
  }

  async list<T>(path: string, params?: Record<string, string | number | boolean>) {
    const response = await this.get<ListResponse<T>>(path, undefined, { params })
    return normalizeList<T>(response.data)
  }

  async getOne<T>(path: string) {
    const response = await this.get<{ data: T }>(path)
    return response.data
  }

  async create<T>(path: string, payload: Record<string, unknown>) {
    const response = await this.post<{ data: T }>(path, payload)
    return response.data
  }

  async update<T>(path: string, payload: Record<string, unknown>) {
    const response = await this.put<{ data: T }>(path, payload)
    return response.data
  }

  async remove(path: string) {
    const response = await this.delete<{ message: string }>(path)
    return response.data
  }

  async count(path: string, options?: { method?: 'get' | 'post'; payload?: Record<string, unknown> }) {
    if (options?.method === 'post') {
      const response = await this.post<{ count: number }>(path, options.payload || {})
      const payload = response.data as unknown
      if (payload && typeof payload === 'object' && 'count' in payload) {
        return { count: Number((payload as { count?: unknown }).count) || 0 }
      }
      return { count: 0 }
    }

    const response = await this.get<{ count: number }>(path)
    const payload = response.data as unknown

    if (Array.isArray(payload)) {
      return { count: payload.length }
    }

    if (payload && typeof payload === 'object') {
      const source = payload as Record<string, unknown>
      if (typeof source.count === 'number') {
        return { count: source.count }
      }
      if (Array.isArray(source.data)) {
        return { count: source.data.length }
      }
      if (Array.isArray(source.results)) {
        return { count: source.results.length }
      }
      if (Array.isArray(source.rows)) {
        return { count: source.rows.length }
      }
    }

    return { count: 0 }
  }
}

export const resourceService = new ResourceService()
export const legacyResourceService = new ResourceService(legacyApiBaseUrl, 'legacy_access_token')
