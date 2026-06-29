import type { ThemeConfig } from '../types'

interface CacheEntry {
  hash: string
  theme: ThemeConfig
  fetchedAt: number
}

class ThemeCache {
  private cache = new Map<string, CacheEntry>()
  private readonly TTL = 1000 * 60 * 30 // 30 minutes

  get(tenantId: string): CacheEntry | null {
    const entry = this.cache.get(tenantId)
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > this.TTL) {
      this.cache.delete(tenantId)
      return null
    }
    return entry
  }

  set(tenantId: string, data: Omit<CacheEntry, 'fetchedAt'>): void {
    this.cache.set(tenantId, { ...data, fetchedAt: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }
}

// Singleton — shared across all FlowEngine instances on the same page
export const themeCache = new ThemeCache()
