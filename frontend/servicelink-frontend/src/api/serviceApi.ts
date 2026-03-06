import axiosInstance from './axiosInstance'
import type { ServiceListing, CategoryResponse, PricingType, ServiceListingRequest } from '@/types/service.types'

export const serviceApi = {
  async getCategories(): Promise<CategoryResponse[]> {
    const { data } = await axiosInstance.get<CategoryResponse[]>('/categories')
    return data
  },

  async getServicesByCategory(categoryId: number): Promise<ServiceListing[]> {
    const { data } = await axiosInstance.get<ServiceListing[]>(`/services/category/${categoryId}`)
    return data
  },

  async searchServices(params: {
    categoryId: number
    pricingType?: PricingType
    maxPrice?: number
    userLat?: number
    userLng?: number
    radiusMiles?: number
  }): Promise<ServiceListing[]> {
    const { data } = await axiosInstance.get<ServiceListing[]>('/services/search', { params })
    return data
  },

  async searchServicesNearby(params: {
    categoryId: number
    userLat: number
    userLng: number
    pricingType?: PricingType
    maxPrice?: number
    radiusMiles?: number
  }): Promise<ServiceListing[]> {
    const { data } = await axiosInstance.get<ServiceListing[]>('/services/search/nearby', { params })
    return data
  },

  async getServiceById(id: number): Promise<ServiceListing> {
    const { data } = await axiosInstance.get<ServiceListing>(`/services/${id}`)
    return data
  },

  async getServicesByProvider(providerId: number): Promise<ServiceListing[]> {
    const { data } = await axiosInstance.get<ServiceListing[]>(`/services/provider/${providerId}`)
    return data
  },

  // ── Provider-authenticated ────────────────────────────────────────────
  async getMyServices(): Promise<ServiceListing[]> {
    const { data } = await axiosInstance.get<ServiceListing[]>('/services/my-services')
    return data
  },

  async createService(request: ServiceListingRequest): Promise<ServiceListing> {
    const { data } = await axiosInstance.post<ServiceListing>('/services', request)
    return data
  },

  async updateService(id: number, request: ServiceListingRequest): Promise<ServiceListing> {
    const { data } = await axiosInstance.put<ServiceListing>(`/services/${id}`, request)
    return data
  },

  async deleteService(id: number): Promise<void> {
    await axiosInstance.delete(`/services/${id}`)
  },
}


// ── Availability API (public — for customers) ─────────────────────────────────
export const availabilityApi = {
  async getProviderSlots(providerId: number): Promise<AvailabilitySlot[]> {
    const { data } = await axiosInstance.get<AvailabilitySlot[]>(`/availability/provider/${providerId}`)
    return data
  },

  async getProviderSlotsForDate(providerId: number, date: string): Promise<AvailabilitySlot[]> {
    const { data } = await axiosInstance.get<AvailabilitySlot[]>(`/availability/provider/${providerId}`, { params: { date } })
    return data
  },
}


// ── Availability management API (provider-authenticated) ──────────────────────
export const availabilityManagementApi = {
  async getMySlots(): Promise<AvailabilitySlot[]> {
    const { data } = await axiosInstance.get<AvailabilitySlot[]>('/availability/my-slots')
    return data
  },

  async createSlot(request: { slotDate: string; startTime: string; endTime: string }): Promise<AvailabilitySlot> {
    const { data } = await axiosInstance.post<AvailabilitySlot>('/availability', request)
    return data
  },

  async deleteSlot(id: number): Promise<void> {
    await axiosInstance.delete(`/availability/${id}`)
  },

  async toggleSlot(id: number, isAvailable: boolean): Promise<AvailabilitySlot> {
    const { data } = await axiosInstance.patch<AvailabilitySlot>(`/availability/${id}/toggle`, { isAvailable })
    return data
  },
}


// ── Shared slot type ──────────────────────────────────────────────────────────
export interface AvailabilitySlot {
  id: number
  provider: {
    id: number
    businessName: string
    overallRating: number | null
    totalBookingsCompleted: number | null
  }
  slotDate: string       // "2026-02-28"
  startTime: string      // "09:00:00"
  endTime: string        // "10:00:00"
  durationMinutes: number
  isAvailable: boolean
  isBooked: boolean
  isBookable: boolean
  bookingId: number | null
  createdAt: string
}