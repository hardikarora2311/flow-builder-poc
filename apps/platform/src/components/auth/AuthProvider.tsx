'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface MockUser {
  email: string
  name: string
  tenantId: string
}

interface AuthContextValue {
  user: MockUser | null
  ready: boolean
  signIn: (email: string) => void
  signOut: () => void
}

const STORAGE_KEY = 'pf-auth'
const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Offline, in-browser auth stand-in. Mirrors the shape of a real provider
 * (Clerk) — a user object + signIn/signOut — but persists to localStorage so
 * the POC needs no API keys or network. Swap for Clerk in production.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw) as MockUser)
    } catch {
      // ignore malformed storage
    }
    setReady(true)
  }, [])

  const signIn = (email: string) => {
    const name = email.split('@')[0]?.replace(/[._-]/g, ' ') || 'Admin'
    const next: MockUser = {
      email,
      name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
      tenantId: 'mock-tenant',
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setUser(next)
  }

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

/** Redirects to the sign-in page when no user is present. */
export function useRequireAuth(): AuthContextValue {
  const auth = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (auth.ready && !auth.user) router.replace('/sign-in')
  }, [auth.ready, auth.user, router])
  return auth
}
