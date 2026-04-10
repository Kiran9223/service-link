import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch'
import {
  setNotifications,
  appendNotifications,
  markOneAsRead,
  markAllRead,
} from '@/store/slices/notificationSlice'
import { decrementUnreadCount, resetUnreadCount } from '@/store/slices/uiSlice'
import { notificationApi } from '@/api/notificationApi'
import LoadingSpinner from '@/components/feedback/LoadingSpinner'
import NotificationItem from '@/components/notifications/NotificationItem'
import type { Notification, NotificationType } from '@/types/notification.types'

// Raw shape from backend before field mapping
interface RawNotification {
  id: number
  notificationType: string
  subject: string
  message: string
  bookingId?: number
  isRead: boolean
  createdAt: string
}

interface RawNotificationPage {
  content: RawNotification[]
  totalElements: number
  totalPages: number
  number: number
}

function mapRaw(raw: RawNotification): Notification {
  return {
    id: raw.id,
    type: raw.notificationType as NotificationType,
    title: raw.subject,
    message: raw.message,
    bookingId: raw.bookingId,
    isRead: raw.isRead,
    createdAt: raw.createdAt,
  }
}

const PAGE_SIZE = 20

export default function NotificationsPage() {
  const dispatch = useAppDispatch()
  const { notifications, hasMore, currentPage } = useAppSelector((s) => s.notifications)
  const unreadCount = useAppSelector((s) => s.ui.notificationUnreadCount)

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true)
      try {
        const raw = (await notificationApi.getNotifications(0, PAGE_SIZE)) as unknown as RawNotificationPage
        dispatch(
          setNotifications({
            notifications: raw.content.map(mapRaw),
            totalElements: raw.totalElements,
            hasMore: raw.number < raw.totalPages - 1,
          })
        )
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }

    fetchPage()
  }, [dispatch])

  const handleMarkAsRead = async (id: number) => {
    dispatch(markOneAsRead(id))
    dispatch(decrementUnreadCount())
    try {
      await notificationApi.markAsRead(id)
    } catch {
      // optimistic update stays
    }
  }

  const handleMarkAllRead = async () => {
    dispatch(markAllRead())
    dispatch(resetUnreadCount())
    try {
      await notificationApi.markAllAsRead()
    } catch {
      // optimistic update stays
    }
  }

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const raw = (await notificationApi.getNotifications(nextPage, PAGE_SIZE)) as unknown as RawNotificationPage
      dispatch(
        appendNotifications({
          notifications: raw.content.map(mapRaw),
          hasMore: raw.number < raw.totalPages - 1,
        })
      )
    } catch {
      // silent
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium transition"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : notifications.length === 0 ? (
        <div className="card p-16 flex flex-col items-center gap-3 text-gray-400">
          <Bell className="w-12 h-12 opacity-30" />
          <p className="text-base">No notifications yet</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50 overflow-hidden">
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={n.isRead ? undefined : () => handleMarkAsRead(n.id)}
              fullWidth
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 text-sm text-purple-600 border border-purple-300 rounded-xl hover:bg-purple-50 transition disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
