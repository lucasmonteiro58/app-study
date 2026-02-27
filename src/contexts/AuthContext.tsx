import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User } from '../types'
import { syncFromFirebase } from '../services/progressService'

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
        const u: User = JSON.parse(stored)
        setUser(u)
        // Sync Firebase data for returning users (not just on login)
        syncFromFirebase(u.email).catch(console.error)
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (token: string, userInfo: Omit<User, 'token'>) => {
    const u: User = { ...userInfo, token }
    setUser(u)
    sessionStorage.setItem('ds:user', JSON.stringify(u))
    await syncFromFirebase(u.email)
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
