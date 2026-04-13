import axiosInstance from './axiosInstance'
import type { UserRole } from '@/types/auth.types'

export interface UserProfile {
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
  createdAt: string
  lastLoginAt?: string
  // Provider-only (null for regular users)
  businessName?: string
  description?: string
  yearsOfExperience?: number
  isCertified?: boolean
  isInsured?: boolean
  serviceRadiusMiles?: number
  overallRating?: number
  totalBookingsCompleted?: number
}

export interface UpdateUserProfileRequest {
  name?: string
  phone?: string
  city?: string
  state?: string
  postalCode?: string
}

export interface UpdateProviderProfileRequest {
  businessName?: string
  description?: string
  yearsOfExperience?: number
  isCertified?: boolean
  isInsured?: boolean
  serviceRadiusMiles?: number
}

export const userApi = {
  async getMyProfile(): Promise<UserProfile> {
    const { data } = await axiosInstance.get<UserProfile>('/users/me')
    return data
  },

  async updateMyProfile(request: UpdateUserProfileRequest): Promise<UserProfile> {
    const { data } = await axiosInstance.put<UserProfile>('/users/me', request)
    return data
  },

  async updateMyProviderProfile(request: UpdateProviderProfileRequest): Promise<UserProfile> {
    const { data } = await axiosInstance.put<UserProfile>('/users/me/provider', request)
    return data
  },
}
