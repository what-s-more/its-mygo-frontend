import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authService, type UserProfile } from '../services/auth'

interface AuthContextType {
  profile: UserProfile | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    void authService.profile().then((r) => setProfile(r.data)).catch(() => setProfile(null))
  }, [])

  async function login() {
    try {
      const r = await authService.profile()
      setProfile(r.data)
    } catch {
      setProfile(null)
    }
  }

  async function logout() {
    await authService.logout()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ profile, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
