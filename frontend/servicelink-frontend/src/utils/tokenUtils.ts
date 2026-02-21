import { TOKEN_KEY, USER_KEY } from '@/config/constants'
import type { User } from '@/types/auth.types'

export const tokenUtils = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  },

  getUser(): User | null {
    const stored = localStorage.getItem(USER_KEY)
    if (!stored) return null
    try {
      return JSON.parse(stored) as User
    } catch {
      return null
    }
  },

  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  removeUser(): void {
    localStorage.removeItem(USER_KEY)
  },

  clearAll(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  // Decode JWT payload (no signature verification - that's the backend's job)
  decodePayload(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1]
      return JSON.parse(atob(payload)) as Record<string, unknown>
    } catch {
      return null
    }
  },

  isExpired(token: string): boolean {
    const payload = this.decodePayload(token)
    if (!payload || typeof payload.exp !== 'number') return true
    return Date.now() >= payload.exp * 1000
  },
}
