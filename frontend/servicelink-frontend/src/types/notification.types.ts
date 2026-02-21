export type NotificationType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_STARTED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_CANCELLED'

export interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  bookingId?: number
  isRead: boolean
  createdAt: string
}

export interface NotificationPage {
  content: Notification[]
  totalElements: number
  totalPages: number
  number: number
}
