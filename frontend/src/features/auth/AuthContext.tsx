import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiClient, TOKEN_STORAGE } from '@/api/client'
import type { UserProfile } from '@/types/api'

interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: {
    email: string
    full_name: string
    password: string
    default_currency: string
  }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE.ACCESS)
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const { data } = await apiClient.get<UserProfile>('/auth/me/')
      setUser(data)
    } catch {
      localStorage.removeItem(TOKEN_STORAGE.ACCESS)
      localStorage.removeItem(TOKEN_STORAGE.REFRESH)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    const { data } = await apiClient.post<{ access: string; refresh: string }>('/auth/login/', {
      email,
      password,
    })
    localStorage.setItem(TOKEN_STORAGE.ACCESS, data.access)
    localStorage.setItem(TOKEN_STORAGE.REFRESH, data.refresh)
    await refreshUser()
  }

  const register = async (payload: {
    email: string
    full_name: string
    password: string
    default_currency: string
  }) => {
    await apiClient.post('/auth/register/', payload)
    await login(payload.email, payload.password)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE.ACCESS)
    localStorage.removeItem(TOKEN_STORAGE.REFRESH)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
