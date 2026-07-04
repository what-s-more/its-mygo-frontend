import { http } from './http'

export type AdminUserItem = {
  id: number
  mobile: string
  nickname: string
  level: string
  points: number
  is_active: boolean
  created_at: string
}

export const adminUserService = {
  listUsers(keyword?: string) {
    return http.get<unknown, { data: { list: AdminUserItem[]; total: number } }>('/admin/users', {
      params: { keyword },
    })
  },
}
