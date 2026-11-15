import axios, { type InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const TOKEN_STORAGE = {
  ACCESS: 'finova_access_token',
  REFRESH: 'finova_refresh_token',
} as const

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_STORAGE.ACCESS)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refresh = localStorage.getItem(TOKEN_STORAGE.REFRESH)
      if (!refresh) {
        localStorage.removeItem(TOKEN_STORAGE.ACCESS)
        return Promise.reject(error)
      }

      if (!refreshPromise) {
        refreshPromise = axios
          .post<{ access: string }>(`${API_BASE_URL}/auth/refresh/`, { refresh })
          .then((res) => {
            localStorage.setItem(TOKEN_STORAGE.ACCESS, res.data.access)
            return res.data.access
          })
          .catch(() => {
            localStorage.removeItem(TOKEN_STORAGE.ACCESS)
            localStorage.removeItem(TOKEN_STORAGE.REFRESH)
            return null
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      const newAccess = await refreshPromise
      if (newAccess) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return apiClient(originalRequest)
      }
    }
    return Promise.reject(error)
  }
)
