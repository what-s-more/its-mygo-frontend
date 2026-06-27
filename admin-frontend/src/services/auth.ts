import { http } from './http'

export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export type AdminProfile = {
  id: number
  username: string
  real_name: string
  role: string
  merchant_id?: number | null
}

export const adminAuthService = {
  async login(payload: { username: string; password: string }) {
    const response = await http.post<unknown, { data: TokenResponse }>('/admin/auth/login', payload)
    localStorage.setItem('admin_access_token', response.data.access_token)
    localStorage.setItem('admin_refresh_token', response.data.refresh_token)
    return response
  },

  async me() {
    return http.get<unknown, { data: AdminProfile }>('/admin/auth/me')
  },

  async logout() {
    await http.post('/admin/auth/logout')
    localStorage.removeItem('admin_access_token')
    localStorage.removeItem('admin_refresh_token')
  },
}
