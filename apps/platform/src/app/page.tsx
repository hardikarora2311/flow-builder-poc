'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

export default function HomePage() {
  const { ready, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    router.replace(user ? '/dashboard' : '/sign-in')
  }, [ready, user, router])

  return (
    <div className="flex h-screen items-center justify-center text-sm text-slate-500">
      Loading…
    </div>
  )
}
