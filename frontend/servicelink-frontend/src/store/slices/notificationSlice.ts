import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Notification } from '@/types/notification.types'

interface NotificationState {
  notifications: Notification[]
  hasMore: boolean
  currentPage: number
  totalElements: number
  isLoading: boolean
  error: string | null
}

const initialState: NotificationState = {
  notifications: [],
  hasMore: false,
  currentPage: 0,
  totalElements: 0,
  isLoading: false,
  error: null,
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications(
      state,
      action: PayloadAction<{ notifications: Notification[]; totalElements: number; hasMore: boolean }>
    ) {
      state.notifications = action.payload.notifications
      state.totalElements = action.payload.totalElements
      state.hasMore = action.payload.hasMore
      state.currentPage = 0
      state.isLoading = false
      state.error = null
    },
    appendNotifications(
      state,
      action: PayloadAction<{ notifications: Notification[]; hasMore: boolean }>
    ) {
      state.notifications.push(...action.payload.notifications)
      state.hasMore = action.payload.hasMore
      state.currentPage += 1
    },
    prependNotification(state, action: PayloadAction<Notification>) {
      state.notifications.unshift(action.payload)
      state.totalElements += 1
    },
    markOneAsRead(state, action: PayloadAction<number>) {
      const n = state.notifications.find((n) => n.id === action.payload)
      if (n) n.isRead = true
    },
    markAllRead(state) {
      state.notifications.forEach((n) => {
        n.isRead = true
      })
    },
    clearNotifications(state) {
      state.notifications = []
      state.hasMore = false
      state.currentPage = 0
      state.totalElements = 0
      state.isLoading = false
      state.error = null
    },
  },
})

export const {
  setNotifications,
  appendNotifications,
  prependNotification,
  markOneAsRead,
  markAllRead,
  clearNotifications,
} = notificationSlice.actions

export default notificationSlice.reducer
