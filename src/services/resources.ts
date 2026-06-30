import APIBase from './httpBase'

export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

class ResourceService extends APIBase {
  async list<T>(path: string, params?: Record<string, string | number | boolean>) {
    const response = await this.get<ListResponse<T>>(path, undefined, { params })
    return response.data
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

  async count(path: string) {
    const response = await this.get<{ count: number }>(`${path}/count`)
    return response.data
  }
}

export const resourceService = new ResourceService()
