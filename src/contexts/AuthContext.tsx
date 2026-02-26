import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (token: string, userInfo: Omit<User, 'token'>) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('ds:user')
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback((token: string, userInfo: Omit<User, 'token'>) => {
    const u: User = { ...userInfo, token }
    setUser(u)
    sessionStorage.setItem('ds:user', JSON.stringify(u))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem('ds:user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
