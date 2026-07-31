import { api } from './api'
import type { User } from '../types'

export interface AuthResponse {
  token: string
  user: User
}

export function signup(email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>('/auth/signup', {
    method: 'POST',
    data: { email, password },
  })
}

export function signin(email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>('/auth/signin', {
    method: 'POST',
    data: { email, password },
  })
}

export function fetchMe(): Promise<{ user: User }> {
  return api<{ user: User }>('/auth/me')
}
