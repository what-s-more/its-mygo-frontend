import { USER_AUTH_CHANGED_EVENT, http } from './http'

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
  gender?: string | null
  birthday?: string | null
  email?: string | null
  level: string
  points: number
}

export type UserProfilePayload = {
  nickname?: string
  avatar_url?: string | null
  gender?: string | null
  birthday?: string | null
  email?: string | null
}

export type PointsAccount = {
  user_id: number
  points: number
  sign_in_today: boolean
  current_streak_days: number
  today_reward_points: number
}

export type MemberLevel = {
  user_id: number
  level: string
  level_name: string
  growth_value_cent: number
  next_level?: string | null
  next_level_name?: string | null
  next_level_need_cent?: number | null
  benefits: string[]
}

export type SignInResult = {
  signed: boolean
  points: number
  reward_points: number
  streak_days: number
  message: string
}

export type PointsLog = {
  id: number
  user_id: number
  change_points: number
  balance_points: number
  source_type: string
  source_id?: number | null
  description: string
  created_at: string
}

export type PageResult<T> = {
  list: T[]
  page: number
  page_size: number
  total: number
}

function emitAuthChanged() {
  window.dispatchEvent(new Event(USER_AUTH_CHANGED_EVENT))
}

export const authService = {
  async register(payload: { mobile: string; password: string; nickname: string }) {
    return http.post('/auth/register', payload)
  },

  async login(payload: { account: string; password: string }) {
    const response = await http.post<unknown, { data: TokenResponse }>('/auth/login', payload)
    localStorage.setItem('user_access_token', response.data.access_token)
    localStorage.setItem('user_refresh_token', response.data.refresh_token)
    emitAuthChanged()
    return response
  },

  async profile() {
    return http.get<unknown, { data: UserProfile }>('/users/profile')
  },

  async updateProfile(payload: UserProfilePayload) {
    return http.put<unknown, { data: UserProfile }>('/users/profile', payload)
  },

  async pointsAccount() {
    return http.get<unknown, { data: PointsAccount }>('/users/points')
  },

  async pointsLogs() {
    return http.get<unknown, { data: PageResult<PointsLog> }>('/users/points/logs')
  },

  async memberLevel() {
    return http.get<unknown, { data: MemberLevel }>('/users/level')
  },

  async signIn() {
    return http.post<unknown, { data: SignInResult }>('/users/sign-in')
  },

  hasToken() {
    return Boolean(localStorage.getItem('user_access_token'))
  },

  async logout() {
    try {
      await http.post('/auth/logout')
    } finally {
      localStorage.removeItem('user_access_token')
      localStorage.removeItem('user_refresh_token')
      emitAuthChanged()
    }
  },
}
