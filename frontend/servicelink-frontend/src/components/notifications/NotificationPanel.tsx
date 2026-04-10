import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Bell } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch'
import { closeNotificationPanel, decrementUnreadCount, resetUnreadCount } from '@/store/slices/uiSlice'
import {
  setNotifications,
  appendNotifications,
  markOneAsRead,
  markAllRead,
} from '@/store/slices/notificationSlice'
import { notificationApi } from '@/api/notificationApi'
import LoadingSpinner from '@/components/feedback/LoadingSpinner'
import NotificationItem from './NotificationItem'
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

export default function NotificationPanel() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isOpen = useAppSelector((s) => s.ui.isNotificationPanelOpen)
  const unreadCount = useAppSelector((s) => s.ui.notificationUnreadCount)
  const { notifications, hasMore, currentPage } = useAppSelector((s) => s.notifications)

  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Fetch page 0 each time the panel opens
  useEffect(() => {
    if (!isOpen) return

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
        // silent — show whatever is already in state
      } finally {
        setLoading(false)
      }
    }

    fetchPage()
  }, [isOpen, dispatch])

  const handleClose = () => dispatch(closeNotificationPanel())

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

  const handleViewAll = () => {
    navigate('/notifications')
    dispatch(closeNotificationPanel())
  }

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Slide-in panel */}
      <div
        className={`absolute right-0 top-0 h-full w-96 bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium transition"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <LoadingSpinner />
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-16">
              <Bell className="w-10 h-10 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={n.isRead ? undefined : () => handleMarkAsRead(n.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
          <button
            onClick={handleViewAll}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium transition"
          >
            View all notifications
          </button>
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
