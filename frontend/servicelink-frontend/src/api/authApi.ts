import axiosInstance from './axiosInstance'
import type { LoginRequest, RegisterUserRequest, RegisterProviderRequest, AuthResponse } from '@/types/auth.types'

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { data } = await axiosInstance.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  async registerUser(payload: RegisterUserRequest): Promise<AuthResponse> {
    const { data } = await axiosInstance.post<AuthResponse>('/auth/register', payload)
    return data
  },

  async registerProvider(payload: RegisterProviderRequest): Promise<AuthResponse> {
    const { data } = await axiosInstance.post<AuthResponse>('/auth/register/provider', payload)
    return data
  },
}
