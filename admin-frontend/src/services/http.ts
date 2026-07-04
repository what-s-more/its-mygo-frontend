import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
type AdminSession = 'platform' | 'merchant'

type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

type AxiosError = axios.AxiosError
type InternalAxiosRequestConfig = axios.InternalAxiosRequestConfig
type AxiosResponse = axios.AxiosResponse

type AdminRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  _adminSession?: AdminSession
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const session: AdminSession = config.headers?.['X-Admin-Session'] === 'merchant' ? 'merchant' : 'platform'
  ;(config as AdminRequestConfig)._adminSession = session
  delete config.headers?.['X-Admin-Session']
  const token = localStorage.getItem(`${session}_admin_access_token`)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: AxiosError) => {
    const originalConfig = error.config as AdminRequestConfig | undefined
    const status = error.response?.status
    const requestUrl = originalConfig?.url ?? ''
    const shouldSkipRefresh = requestUrl.includes('/admin/auth/login') || requestUrl.includes('/admin/auth/refresh')
    if (!originalConfig || status !== 401 || originalConfig._retry || shouldSkipRefresh) {
      return Promise.reject(error)
    }

    const session = originalConfig._adminSession ?? 'platform'
    const refreshToken = localStorage.getItem(`${session}_admin_refresh_token`)
    if (!refreshToken) {
      clearAdminTokens(session)
      return Promise.reject(error)
    }

    originalConfig._retry = true
    try {
      const response = await axios.post<ApiResponse<TokenResponse>>(`${API_BASE_URL}/admin/auth/refresh`, {
        refresh_token: refreshToken,
      })
      localStorage.setItem(`${session}_admin_access_token`, response.data.data.access_token)
      localStorage.setItem(`${session}_admin_refresh_token`, response.data.data.refresh_token)
      originalConfig.headers.Authorization = `Bearer ${response.data.data.access_token}`
      return http(originalConfig)
    } catch (refreshError) {
      clearAdminTokens(session)
      return Promise.reject(refreshError)
    }
  },
)

function clearAdminTokens(session: AdminSession) {
  localStorage.removeItem(`${session}_admin_access_token`)
  localStorage.removeItem(`${session}_admin_refresh_token`)
}
