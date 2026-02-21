import type { ServiceListing } from '@/types/service.types'

export function formatPrice(listing: ServiceListing): string {
  switch (listing.pricingType) {
    case 'HOURLY':
      return listing.hourlyRate ? `$${listing.hourlyRate}/hr` : 'Contact for price'
    case 'FIXED':
      return listing.fixedPrice ? `$${listing.fixedPrice}` : 'Contact for price'
    case 'RANGE':
      return listing.minPrice && listing.maxPrice
        ? `$${listing.minPrice} – $${listing.maxPrice}`
        : 'Contact for price'
    default:
      return 'Contact for price'
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}
