import { http } from './http'

export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export type UserProfile = {
  id: number
  mobile: string
  nickname: string
  avatar_url?: string | null
  level: string
  points: number
}

export const authService = {
  async register(payload: { mobile: string; password: string; nickname: string }) {
    return http.post('/auth/register', payload)
  },

  async login(payload: { account: string; password: string }) {
    const response = await http.post<unknown, { data: TokenResponse }>('/auth/login', payload)
    localStorage.setItem('user_access_token', response.data.access_token)
    localStorage.setItem('user_refresh_token', response.data.refresh_token)
    return response
  },

  async profile() {
    return http.get<unknown, { data: UserProfile }>('/users/profile')
  },

  async logout() {
    await http.post('/auth/logout')
    localStorage.removeItem('user_access_token')
    localStorage.removeItem('user_refresh_token')
  },
}
