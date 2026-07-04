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
  async login(payload: { username: string; password: string }, session: 'platform' | 'merchant' = 'platform') {
    const response = await http.post<unknown, { data: TokenResponse }>('/admin/auth/login', payload, {
      headers: { 'X-Admin-Session': session },
    })
    localStorage.removeItem('admin_access_token')
    localStorage.removeItem('admin_refresh_token')
    localStorage.setItem(`${session}_admin_access_token`, response.data.access_token)
    localStorage.setItem(`${session}_admin_refresh_token`, response.data.refresh_token)
    return response
  },

  async me(session: 'platform' | 'merchant' = 'platform') {
    return http.get<unknown, { data: AdminProfile }>('/admin/auth/me', {
      headers: { 'X-Admin-Session': session },
    })
  },

  async logout(session: 'platform' | 'merchant' = 'platform') {
    await http.post('/admin/auth/logout', undefined, { headers: { 'X-Admin-Session': session } })
    localStorage.removeItem(`${session}_admin_access_token`)
    localStorage.removeItem(`${session}_admin_refresh_token`)
  },
}
