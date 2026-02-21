import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type BookingMode = 'traditional' | 'ai'

interface UIState {
  bookingMode: BookingMode
  isAIChatOpen: boolean
  isNotificationPanelOpen: boolean
  notificationUnreadCount: number
}

const initialState: UIState = {
  bookingMode: 'traditional',
  isAIChatOpen: false,
  isNotificationPanelOpen: false,
  notificationUnreadCount: 0,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setBookingMode(state, action: PayloadAction<BookingMode>) {
      state.bookingMode = action.payload
    },
    openAIChat(state) {
      state.isAIChatOpen = true
    },
    closeAIChat(state) {
      state.isAIChatOpen = false
    },
    toggleAIChat(state) {
      state.isAIChatOpen = !state.isAIChatOpen
    },
    openNotificationPanel(state) {
      state.isNotificationPanelOpen = true
    },
    closeNotificationPanel(state) {
      state.isNotificationPanelOpen = false
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.notificationUnreadCount = action.payload
    },
    decrementUnreadCount(state) {
      if (state.notificationUnreadCount > 0) {
        state.notificationUnreadCount -= 1
      }
    },
    resetUnreadCount(state) {
      state.notificationUnreadCount = 0
    },
  },
})

export const {
  setBookingMode,
  openAIChat,
  closeAIChat,
  toggleAIChat,
  openNotificationPanel,
  closeNotificationPanel,
  setUnreadCount,
  decrementUnreadCount,
  resetUnreadCount,
} = uiSlice.actions

export default uiSlice.reducer
