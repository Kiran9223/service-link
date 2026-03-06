import type { BOOKING_STATUS } from '@/config/constants'

export type BookingStatus = keyof typeof BOOKING_STATUS

export interface BookingResponse {
  id: number
  status: BookingStatus

  customer: {
    id: number; name: string; email: string
    phone?: string; city?: string; state?: string
  }
  provider: {
    id: number; businessName: string; ownerName?: string
    phone?: string; email?: string
    overallRating?: number; totalBookingsCompleted?: number
    yearsOfExperience?: number; isCertified?: boolean; isInsured?: boolean
  }
  service: {
    id: number; serviceName: string; description?: string
    categoryName?: string; hourlyRate?: number; estimatedDurationHours?: number
  }
  slot?: {
    id: number; slotDate: string; startTime: string; endTime: string
  }

  scheduledDate: string
  scheduledStartTime: string
  scheduledEndTime: string
  durationHours?: number

  serviceAddress?: string
  serviceCity?: string
  serviceState?: string
  servicePostalCode?: string
  fullServiceAddress?: string

  totalPrice?: number
  specialInstructions?: string
  cancellationReason?: string
  cancelledBy?: string

  requestedAt: string
  confirmedAt?: string
  completedAt?: string
  cancelledAt?: string
  actualStartTime?: string
  actualEndTime?: string

  // Calculated flags from backend
  canCancel?: boolean
  awaitingProviderAction?: boolean
  isActive?: boolean
  isPast?: boolean
  isToday?: boolean
  isFuture?: boolean
  daysUntilBooking?: number
  hasReview?: boolean
}

export interface BookingCreateRequest {
  serviceId: number
  slotId: number
  scheduledDate: string         // "2026-02-28"
  scheduledStartTime: string    // "09:00:00"
  scheduledEndTime: string      // "10:00:00"
  serviceAddress: string
  serviceCity: string
  serviceState: string
  servicePostalCode: string
  specialInstructions?: string
}

export interface AvailabilitySlot {
  id: number
  date: string              // ISO date
  startTime: string         // HH:mm:ss
  endTime: string           // HH:mm:ss
  isAvailable: boolean
}