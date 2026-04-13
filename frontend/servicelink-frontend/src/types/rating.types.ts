export interface RatingResponse {
  id: number
  bookingId: number
  stars: number
  reviewText?: string
  customerId: number
  customerName: string
  providerResponse?: string
  providerRespondedAt?: string
  createdAt: string
}

export interface RatingRequest {
  bookingId: number
  stars: number
  reviewText?: string
}
