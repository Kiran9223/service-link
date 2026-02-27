import type { ServiceListing, PricingType } from '@/types/service.types'

export function formatPrice(listing: ServiceListing): string {
  switch (listing.pricingType) {
    case 'HOURLY':
      return listing.hourlyRate ? `$${listing.hourlyRate}/hr` : 'Contact for price'
    case 'FIXED':
      return listing.fixedPrice ? `$${Number(listing.fixedPrice).toLocaleString()}` : 'Contact for price'
    case 'RANGE':
      return listing.minPrice && listing.maxPrice
        ? `$${Number(listing.minPrice).toLocaleString()} – $${Number(listing.maxPrice).toLocaleString()}`
        : 'Contact for price'
    default:
      return 'Contact for price'
  }
}

export function formatPriceShort(listing: ServiceListing): string {
  switch (listing.pricingType) {
    case 'HOURLY':
      return listing.hourlyRate ? `From $${listing.hourlyRate}/hr` : 'Contact'
    case 'FIXED':
      return listing.fixedPrice ? `$${Number(listing.fixedPrice).toLocaleString()} fixed` : 'Contact'
    case 'RANGE':
      return listing.minPrice ? `From $${Number(listing.minPrice).toLocaleString()}` : 'Contact'
    default:
      return 'Contact'
  }
}

export function getPricingBadge(type: PricingType): { label: string; color: string } {
  switch (type) {
    case 'HOURLY': return { label: 'Hourly',    color: 'bg-blue-100 text-blue-700'   }
    case 'FIXED':  return { label: 'Fixed',     color: 'bg-green-100 text-green-700' }
    case 'RANGE':  return { label: 'Range',     color: 'bg-orange-100 text-orange-700'}
    default:       return { label: 'Varies',    color: 'bg-gray-100 text-gray-600'   }
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