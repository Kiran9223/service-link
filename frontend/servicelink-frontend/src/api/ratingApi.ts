import axiosInstance from './axiosInstance'
import type { RatingResponse, RatingRequest } from '@/types/rating.types'

export const ratingApi = {
  async submitRating(request: RatingRequest): Promise<RatingResponse> {
    const { data } = await axiosInstance.post<RatingResponse>('/ratings', request)
    return data
  },

  async getRatingByBooking(bookingId: number): Promise<RatingResponse | null> {
    try {
      const { data } = await axiosInstance.get<RatingResponse>(`/ratings/booking/${bookingId}`)
      return data
    } catch (err: any) {
      if (err?.response?.status === 404) return null
      throw err
    }
  },

  async getProviderRatings(providerId: number): Promise<RatingResponse[]> {
    const { data } = await axiosInstance.get<RatingResponse[]>(`/ratings/provider/${providerId}`)
    return data
  },
}
