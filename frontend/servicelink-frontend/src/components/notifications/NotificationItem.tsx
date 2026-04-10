import type { Notification } from '@/types/notification.types'

const TYPE_ICONS: Record<string, string> = {
  BOOKING_CREATED: '📋',
  BOOKING_CONFIRMED: '✅',
  BOOKING_STARTED: '🔧',
  BOOKING_COMPLETED: '🎉',
  BOOKING_CANCELLED: '❌',
  REVIEW_RECEIVED: '⭐',
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

interface Props {
  notification: Notification
  onClick?: () => void
  fullWidth?: boolean
}

export default function NotificationItem({ notification, onClick }: Props) {
  const icon = TYPE_ICONS[notification.type] ?? '🔔'

  return (
    <div
      className={`flex gap-3 px-4 py-3.5 transition cursor-pointer hover:bg-gray-50 ${
        !notification.isRead ? 'border-l-4 border-purple-500 bg-purple-50/30' : 'border-l-4 border-transparent'
      }`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notification.isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-1.5">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {!notification.isRead && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
      )}
    </div>
  )
}
