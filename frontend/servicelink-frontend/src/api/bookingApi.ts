import axiosInstance from './axiosInstance'
import type { BookingResponse, BookingCreateRequest, AvailabilitySlot } from '@/types/booking.types'

export const bookingApi = {
  // ── Customer endpoints ────────────────────────────────────────────────
  async createBooking(request: BookingCreateRequest): Promise<BookingResponse> {
    const { data } = await axiosInstance.post<BookingResponse>('/bookings', request)
    return data
  },

  async getMyBookings(): Promise<BookingResponse[]> {
    const { data } = await axiosInstance.get<BookingResponse[]>('/bookings/my-bookings')
    return data
  },

  async getMyUpcomingBookings(): Promise<BookingResponse[]> {
    const { data } = await axiosInstance.get<BookingResponse[]>('/bookings/my-bookings/upcoming')
    return data
  },

  async getMyPastBookings(): Promise<BookingResponse[]> {
    const { data } = await axiosInstance.get<BookingResponse[]>('/bookings/my-bookings/past')
    return data
  },

  async getBookingById(id: number): Promise<BookingResponse> {
    const { data } = await axiosInstance.get<BookingResponse>(`/bookings/${id}`)
    return data
  },

  async cancelBooking(id: number, reason?: string): Promise<BookingResponse> {
    const { data } = await axiosInstance.put<BookingResponse>(`/bookings/${id}/cancel`, { reason })
    return data
  },

  // ── Provider endpoints ────────────────────────────────────────────────
  async getProviderBookings(): Promise<BookingResponse[]> {
    const { data } = await axiosInstance.get<BookingResponse[]>('/bookings/provider/bookings')
    return data
  },

  async getProviderPendingBookings(): Promise<BookingResponse[]> {
    const { data } = await axiosInstance.get<BookingResponse[]>('/bookings/provider/bookings/pending')
    return data
  },

  async confirmBooking(id: number): Promise<BookingResponse> {
    const { data } = await axiosInstance.put<BookingResponse>(`/bookings/${id}/confirm`)
    return data
  },

  async startBooking(id: number): Promise<BookingResponse> {
    const { data } = await axiosInstance.put<BookingResponse>(`/bookings/${id}/start`)
    return data
  },

  async completeBooking(id: number): Promise<BookingResponse> {
    const { data } = await axiosInstance.put<BookingResponse>(`/bookings/${id}/complete`)
    return data
  },

  // ── Availability ──────────────────────────────────────────────────────
  async getAvailableSlots(serviceId: number, startDate: string, endDate: string): Promise<AvailabilitySlot[]> {
    const { data } = await axiosInstance.get<AvailabilitySlot[]>('/availability/search', {
      params: { serviceId, startDate, endDate },
    })
    return data
  },
}
