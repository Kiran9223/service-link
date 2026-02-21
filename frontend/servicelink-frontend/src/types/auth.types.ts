export type UserRole = 'USER' | 'SERVICE_PROVIDER' | 'ADMIN'

export interface User {
  id: number
  name: string
  email: string
  phone?: string
  city?: string
  state?: string
  postalCode?: string
  role: UserRole
  isActive: boolean
  emailVerified: boolean
}

export interface ProviderInfo {
  id: number
  businessName: string
  description?: string
  yearsOfExperience?: number
  isCertified: boolean
  isInsured: boolean
  serviceRadiusMiles: number
  overallRating?: number
  totalBookingsCompleted: number
}

export interface AuthState {
  token: string | null
  user: User | null
  provider: ProviderInfo | null   // populated only for SERVICE_PROVIDER role
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// ── Request types (matching backend DTOs exactly) ──────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterUserRequest {
  name: string
  email: string
  password: string
  phone?: string
  city?: string
  state?: string
  postalCode?: string
  // role defaults to USER on backend — we don't send it
}

export interface RegisterProviderRequest extends RegisterUserRequest {
  businessName: string
  description?: string
  yearsOfExperience?: number
  isCertified?: boolean
  isInsured?: boolean
  serviceRadiusMiles?: number
}

// ── Response types (matching backend AuthResponse exactly) ─────────────────

export interface AuthResponse {
  accessToken: string      // ← backend field name is "accessToken" not "token"
  tokenType: string        // always "Bearer"
  user: User
  provider?: ProviderInfo  // only present for SERVICE_PROVIDER logins
  expiresIn: number
  message?: string
}
