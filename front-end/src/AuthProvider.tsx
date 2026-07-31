import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './auth-context'
import { fetchMe, signin as apiSignin, signup as apiSignup } from './services/auth'
import type { User } from './types'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('atkn')))

  useEffect(() => {
    const token = localStorage.getItem('atkn')
    if (!token) return
    let cancelled = false
    fetchMe()
      .then((res) => {
        if (!cancelled) setUser(res.user)
      })
      .catch(() => localStorage.removeItem('atkn'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiSignin(email, password)
    localStorage.setItem('atkn', res.token)
    setUser(res.user)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const res = await apiSignup(email, password)
    localStorage.setItem('atkn', res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('atkn')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
