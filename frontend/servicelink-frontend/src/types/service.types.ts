// ── Matches ServiceListingResponseDTO exactly ─────────────────────────────────
export type PricingType = 'HOURLY' | 'FIXED' | 'RANGE'

export interface ProviderSummary {
  id: number
  businessName: string
  overallRating: number | null
  totalBookingsCompleted: number | null
  yearsOfExperience: number | null
  profilePhotoUrl: string | null
}

export interface CategorySummary {
  id: number
  name: string
}

export interface ServiceListing {
  id: number
  provider: ProviderSummary
  category: CategorySummary
  serviceName: string
  description: string
  pricingType: PricingType
  hourlyRate: number | null
  fixedPrice: number | null
  minPrice: number | null
  maxPrice: number | null
  estimatedDurationHours: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Matches CategoryResponseDTO ───────────────────────────────────────────────
export interface CategoryResponse {
  id: number
  name: string
  description: string | null
  isActive: boolean
  displayOrder: number
  createdAt: string
}

// ── Frontend filter/search state ──────────────────────────────────────────────
export type SortOption = 'newest' | 'rating' | 'price_asc' | 'price_desc'

export interface ServiceFilters {
  categoryId: number | null
  pricingType: PricingType | null
  maxPrice: number | null
  sort: SortOption
}