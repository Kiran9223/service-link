// ============================================================
// ServiceLink Frontend - Global Constants
// ============================================================

export const API_BASE_URL = '/api'  // Uses Vite proxy → http://localhost:8081
export const WS_URL = 'http://localhost:8081/ws/notifications'

export const TOKEN_KEY = 'servicelink_token'
export const USER_KEY = 'servicelink_user'

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

// Category color map - matches backend category names to Tailwind gradient classes
export const CATEGORY_COLORS: Record<string, string> = {
  PLUMBING:    'from-blue-500 to-blue-600',
  ELECTRICAL:  'from-yellow-500 to-orange-600',
  HVAC:        'from-cyan-500 to-blue-600',
  CLEANING:    'from-purple-500 to-pink-600',
  LAWN_CARE:   'from-green-500 to-emerald-600',
  HANDYMAN:    'from-orange-500 to-red-600',
  PAINTING:    'from-pink-500 to-rose-600',
  CARPENTRY:   'from-amber-600 to-orange-700',
  ROOFING:     'from-slate-600 to-gray-700',
  LOCKSMITH:   'from-indigo-500 to-purple-600',
  DEFAULT:     'from-purple-500 to-blue-600',
}

export const CATEGORY_ICONS: Record<string, string> = {
  PLUMBING:   '🔧',
  ELECTRICAL: '⚡',
  HVAC:       '❄️',
  CLEANING:   '✨',
  LAWN_CARE:  '🌱',
  HANDYMAN:   '🔨',
  PAINTING:   '🎨',
  CARPENTRY:  '🪵',
  ROOFING:    '🏠',
  LOCKSMITH:  '🔐',
  DEFAULT:    '🛠️',
}

// Booking status → visual treatment
export const BOOKING_STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-purple-100 text-purple-800',
    dot: 'bg-purple-500',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
  },
} as const
