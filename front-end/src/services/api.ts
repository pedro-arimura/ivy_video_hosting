import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'

export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export function api<T = unknown>(path: string, options: AxiosRequestConfig = {}): Promise<T> {
  const token = localStorage.getItem('atkn')
  return axios
    .request<T>({
      url: `${API_URL}${path}`,
      method: 'GET',
      ...options,
      headers: {
        ...(options.data instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    .then((res) => res.data)
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

export function errorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as {
      response?: { data?: { detail?: unknown } }
    }).response
    if (response?.data?.detail) return String(response.data.detail)
  }
  return 'Something went wrong. Please try again.'
}
