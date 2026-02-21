import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns'

// Format ISO date string: "2025-06-15" → "Jun 15, 2025"
export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM d, yyyy')
}

// Format HH:mm:ss → "9:00 AM"
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0)
  return format(date, 'h:mm a')
}

// Format a full booking time range
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`
}

// Friendly relative date: "Today", "Tomorrow", "Yesterday", or formatted date
export function friendlyDate(isoDate: string): string {
  const date = parseISO(isoDate)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEE, MMM d')
}

// Format ISO datetime for notification timestamps
export function timeAgo(isoDateTime: string): string {
  const date = parseISO(isoDateTime)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return format(date, 'MMM d')
}
