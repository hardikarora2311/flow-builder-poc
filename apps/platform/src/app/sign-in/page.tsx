'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

export default function SignInPage() {
  const { signIn, user, ready } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('admin@lendco.in')

  useEffect(() => {
    if (ready && user) router.replace('/dashboard')
  }, [ready, user, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    signIn(email.trim())
    router.replace('/dashboard')
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
            ◆
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Workflow Platform</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your admin builder</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Work email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="you@company.com"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Mock auth for the POC — any email works, no password required.
        </p>
      </div>
    </div>
  )
}
