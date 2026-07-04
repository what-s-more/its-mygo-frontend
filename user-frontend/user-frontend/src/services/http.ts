import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30000)
export const USER_AUTH_CHANGED_EVENT = 'its-mygo:user-auth-changed'

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

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number.isFinite(API_TIMEOUT_MS) ? API_TIMEOUT_MS : 30000,
})

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string } | undefined
    if (responseData?.message) return responseData.message
    if (error.code === 'ECONNABORTED') return '请求超时，请检查后端服务、网络连接或支付宝沙箱网关状态'
    if (!error.response) return '网络请求失败，请检查后端是否启动、接口地址是否正确或是否被 CORS 拦截'
    return error.message
  }
  return error instanceof Error ? error.message : '请求失败'
}

function emitAuthChanged() {
  window.dispatchEvent(new Event(USER_AUTH_CHANGED_EVENT))
}

function clearUserTokens() {
  localStorage.removeItem('user_access_token')
  localStorage.removeItem('user_refresh_token')
  emitAuthChanged()
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalConfig = error.config as RetryableRequestConfig | undefined
    const status = error.response?.status
    const requestUrl = originalConfig?.url ?? ''
    const shouldSkipRefresh = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh')
    if (!originalConfig || status !== 401 || originalConfig._retry || shouldSkipRefresh) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('user_refresh_token')
    if (!refreshToken) {
      clearUserTokens()
      return Promise.reject(error)
    }

    originalConfig._retry = true
    try {
      const response = await axios.post<ApiResponse<TokenResponse>>(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      })
      localStorage.setItem('user_access_token', response.data.data.access_token)
      localStorage.setItem('user_refresh_token', response.data.data.refresh_token)
      emitAuthChanged()
      originalConfig.headers.Authorization = `Bearer ${response.data.data.access_token}`
      return http(originalConfig)
    } catch (refreshError) {
      clearUserTokens()
      return Promise.reject(refreshError)
    }
  },
)
