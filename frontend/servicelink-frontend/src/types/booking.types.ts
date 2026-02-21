import type { BOOKING_STATUS } from '@/config/constants'

export type BookingStatus = keyof typeof BOOKING_STATUS

export interface BookingResponse {
  id: number
  status: BookingStatus
  customer: { id: number; name: string; email: string }
  provider: { id: number; businessName: string }
  service: { id: number; serviceName: string; category: string }
  scheduledDate: string         // ISO date: "2025-06-15"
  scheduledStartTime: string    // HH:mm:ss format
  scheduledEndTime: string      // HH:mm:ss format
  totalPrice: number
  requestedAt: string
  confirmedAt?: string
  completedAt?: string
  cancellationReason?: string
}

export interface BookingCreateRequest {
  serviceId: number
  slotId: number
  notes?: string
}

export interface AvailabilitySlot {
  id: number
  date: string              // ISO date
  startTime: string         // HH:mm:ss
  endTime: string           // HH:mm:ss
  isAvailable: boolean
}
