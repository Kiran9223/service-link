import axiosInstance from './axiosInstance'
import type { NotificationPage, Notification } from '@/types/notification.types'

export const notificationApi = {
  async getNotifications(page = 0, size = 20): Promise<NotificationPage> {
    const { data } = await axiosInstance.get<NotificationPage>('/notifications', {
      params: { page, size },
    })
    return data
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await axiosInstance.get<{ count: number }>('/notifications/unread-count')
    return data.count
  },

  async markAsRead(id: number): Promise<Notification> {
    const { data } = await axiosInstance.put<Notification>(`/notifications/${id}/read`)
    return data
  },

  async markAllAsRead(): Promise<void> {
    await axiosInstance.put('/notifications/read-all')
  },
}
