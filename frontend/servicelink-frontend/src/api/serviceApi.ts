import axiosInstance from './axiosInstance'
import type { ServiceListing, CategoryResponse, PricingType } from '@/types/service.types'

export const serviceApi = {
  // GET /api/categories — public, no auth required
  async getCategories(): Promise<CategoryResponse[]> {
    const { data } = await axiosInstance.get<CategoryResponse[]>('/categories')
    return data
  },

  // GET /api/services/category/{categoryId}
  async getServicesByCategory(categoryId: number): Promise<ServiceListing[]> {
    const { data } = await axiosInstance.get<ServiceListing[]>(`/services/category/${categoryId}`)
    return data
  },

  // GET /api/services/search?categoryId=&pricingType=&maxPrice=
  async searchServices(params: {
    categoryId: number
    pricingType?: PricingType
    maxPrice?: number
  }): Promise<ServiceListing[]> {
    const { data } = await axiosInstance.get<ServiceListing[]>('/services/search', { params })
    return data
  },

  // GET /api/services/{id}
  async getServiceById(id: number): Promise<ServiceListing> {
    const { data } = await axiosInstance.get<ServiceListing>(`/services/${id}`)
    return data
  },

  // GET /api/services/provider/{providerId}
  async getServicesByProvider(providerId: number): Promise<ServiceListing[]> {
    const { data } = await axiosInstance.get<ServiceListing[]>(`/services/provider/${providerId}`)
    return data
  },
}


// ── Availability API ──────────────────────────────────────────────────────────
export const availabilityApi = {
  // GET /api/availability/provider/{providerId} — all bookable slots
  async getProviderSlots(providerId: number): Promise<AvailabilitySlot[]> {
    const { data } = await axiosInstance.get<AvailabilitySlot[]>(`/availability/provider/${providerId}`)
    return data
  },

  // GET /api/availability/provider/{providerId}?date=yyyy-MM-dd
  async getProviderSlotsForDate(providerId: number, date: string): Promise<AvailabilitySlot[]> {
    const { data } = await axiosInstance.get<AvailabilitySlot[]>(`/availability/provider/${providerId}`, {
      params: { date }
    })
    return data
  },
}

// ── Availability slot type (inline — avoids circular imports) ─────────────────
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