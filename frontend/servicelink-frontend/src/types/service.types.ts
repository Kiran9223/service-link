export type PricingType = 'HOURLY' | 'FIXED' | 'RANGE'

export interface ServiceProvider {
  id: number
  businessName: string
  description?: string
  rating?: number
  totalReviews?: number
}

export interface ServiceListing {
  id: number
  serviceName: string
  description: string
  category: string
  pricingType: PricingType
  hourlyRate?: number
  fixedPrice?: number
  minPrice?: number
  maxPrice?: number
  provider: ServiceProvider
  isActive: boolean
}

export interface ServiceSearchParams {
  category?: string
  query?: string
  location?: string
  page?: number
  size?: number
}

export interface CategoryResponse {
  id: number
  name: string
  displayName: string
  description?: string
  displayOrder: number
}

export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}
