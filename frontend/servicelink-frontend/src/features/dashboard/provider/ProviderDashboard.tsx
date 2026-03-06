import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, Clock, Play, XCircle, Calendar,
  MapPin, ArrowRight, Star, Loader2, X,
  TrendingUp, Package, Users, DollarSign,
  AlertCircle, ChevronDown, Search, Bell, Tag,
} from 'lucide-react'
import { bookingApi } from '@/api/bookingApi'
import type { BookingResponse, BookingStatus } from '@/types/booking.types'
import { useAppSelector } from '@/hooks/useAppDispatch'
import { BOOKING_STATUS_CONFIG } from '@/config/constants'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}


function getDaysLabel(booking: BookingResponse): string {
  const days = booking.daysUntilBooking
  if (days == null) return ''
  if (booking.isPast)  return 'Past'
  if (booking.isToday) return 'Today'
  if (days === 1)      return 'Tomorrow'
  return `In ${days} days`
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = BOOKING_STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Action buttons for state transitions ──────────────────────────────────────
function ActionButtons({
  booking,
  onAction,
  loading,
}: {
  booking: BookingResponse
  onAction: (id: number, action: 'confirm' | 'start' | 'complete' | 'cancel') => void
  loading: boolean
}) {
  const btn = (action: 'confirm' | 'start' | 'complete' | 'cancel', label: string, icon: React.ElementType, cls: string) => {
    const Icon = icon
    return (
      <button
        onClick={e => { e.stopPropagation(); onAction(booking.id, action) }}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${cls}`}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
        {label}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
      {booking.status === 'PENDING' && (
        <>
          {btn('confirm', 'Confirm',  CheckCircle, 'bg-blue-500 hover:bg-blue-600 text-white')}
          {btn('cancel',  'Decline',  XCircle,     'bg-red-100 hover:bg-red-200 text-red-600')}
        </>
      )}
      {booking.status === 'CONFIRMED' && (
        <>
          {btn('start',  'Start Job',  Play,    'bg-purple-500 hover:bg-purple-600 text-white')}
          {btn('cancel', 'Cancel',     XCircle, 'bg-red-100 hover:bg-red-200 text-red-600')}
        </>
      )}
      {booking.status === 'IN_PROGRESS' && (
        btn('complete', 'Mark Complete', CheckCircle, 'bg-green-500 hover:bg-green-600 text-white')
      )}
    </div>
  )
}

// ── Booking row card ──────────────────────────────────────────────────────────
function BookingCard({
  booking,
  onAction,
  actionLoading,
}: {
  booking: BookingResponse
  onAction: (id: number, action: 'confirm' | 'start' | 'complete' | 'cancel') => void
  actionLoading: number | null
}) {
  const navigate = useNavigate()
  const daysLabel = getDaysLabel(booking)
  const isLoading = actionLoading === booking.id

  return (
    <div
      onClick={() => navigate(`/bookings/${booking.id}`)}
      className={`card p-5 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group border-l-4 ${
        booking.status === 'PENDING'     ? 'border-amber-400'  :
        booking.status === 'CONFIRMED'   ? 'border-blue-400'   :
        booking.status === 'IN_PROGRESS' ? 'border-purple-500' :
        booking.status === 'COMPLETED'   ? 'border-green-400'  :
        'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <StatusBadge status={booking.status} />
            {daysLabel && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                booking.isToday  ? 'bg-purple-100 text-purple-700' :
                booking.isFuture ? 'bg-blue-50 text-blue-600' :
                'bg-gray-100 text-gray-400'
              }`}>
                {daysLabel}
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-900 text-base group-hover:text-purple-700 transition-colors">
            {booking.service.serviceName}
          </h3>
          <p className="text-sm font-semibold text-gray-700 mt-0.5">
            {booking.customer.name}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {booking.totalPrice != null
            ? <p className="font-bold text-gray-900">${Number(booking.totalPrice).toLocaleString()}</p>
            : <p className="text-xs text-gray-400 italic">Price TBD</p>
          }
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all ml-auto mt-1" />
        </div>
      </div>

      {/* Schedule + location */}
      <div className="flex items-center gap-4 flex-wrap mb-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3 h-3 text-purple-400" />
          {formatDate(booking.scheduledDate)}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3 h-3 text-purple-400" />
          {formatTime(booking.scheduledStartTime)}
        </span>
        {booking.serviceCity && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3 h-3 text-purple-400" />
            {booking.serviceCity}, {booking.serviceState}
          </span>
        )}
      </div>

      {/* Action buttons */}
      {['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status) && (
        <div className="pt-3 border-t border-gray-100">
          <ActionButtons booking={booking} onAction={onAction} loading={isLoading} />
        </div>
      )}
    </div>
  )
}

// ── Pending action alert banner ───────────────────────────────────────────────
function PendingAlert({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null
  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center gap-3 hover:bg-amber-100 transition-colors text-left mb-6"
    >
      <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
        <Bell className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-amber-800">
          {count} booking{count !== 1 ? 's' : ''} need{count === 1 ? 's' : ''} your attention
        </p>
        <p className="text-xs text-amber-600 mt-0.5">Tap to review pending requests</p>
      </div>
      <ArrowRight className="w-4 h-4 text-amber-600 flex-shrink-0" />
    </button>
  )
}

// ── Today's schedule strip ────────────────────────────────────────────────────
function TodaySchedule({ bookings }: { bookings: BookingResponse[] }) {
  const today = bookings.filter(b => b.isToday && b.status !== 'CANCELLED')
  if (today.length === 0) return null

  return (
    <div className="card p-5 mb-6">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-purple-500" /> Today's Schedule
      </p>
      <div className="space-y-2">
        {today.sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime)).map(b => (
          <div key={b.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="text-center flex-shrink-0 w-14">
              <p className="text-xs font-bold text-purple-700">{formatTime(b.scheduledStartTime)}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{b.service.serviceName}</p>
              <p className="text-xs text-gray-500">{b.customer.name}</p>
            </div>
            <StatusBadge status={b.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Package className="w-7 h-7 text-gray-300" />
      </div>
      <p className="font-semibold text-gray-500">{message}</p>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
type TabType = 'pending' | 'upcoming' | 'all'

export default function ProviderDashboard() {
  
  const navigate  = useNavigate()
  const user      = useAppSelector(s => s.auth.user)
  const provider  = useAppSelector(s => s.auth.provider)

  const [bookings,      setBookings]      = useState<BookingResponse[]>([])
  const [loading,       setLoading]       = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [activeTab,     setActiveTab]     = useState<TabType>('pending')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [statusFilter,  setStatusFilter]  = useState<BookingStatus | 'ALL'>('ALL')
  const [actionError,   setActionError]   = useState<string | null>(null)

  // Load all bookings
  useEffect(() => {
    bookingApi.getProviderBookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Stats
  const stats = useMemo(() => {
    const completed = bookings.filter(b => b.status === 'COMPLETED')
    const revenue   = completed.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0)
    return {
      pending:   bookings.filter(b => b.status === 'PENDING').length,
      upcoming:  bookings.filter(b => (b.isFuture || b.isToday) && ['CONFIRMED', 'IN_PROGRESS'].includes(b.status)).length,
      completed: completed.length,
      revenue:   revenue > 0 ? `$${revenue.toLocaleString()}` : '$0',
    }
  }, [bookings])

  // Tab-filtered list
  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case 'pending':  return bookings.filter(b => b.status === 'PENDING')
      case 'upcoming': return bookings.filter(b =>
        (b.isFuture || b.isToday) && ['CONFIRMED', 'IN_PROGRESS'].includes(b.status)
      )
      case 'all':      return bookings
    }
  }, [bookings, activeTab])

  // Search + status filter on top
  const displayed = useMemo(() => {
    let list = tabFiltered
    if (statusFilter !== 'ALL' && activeTab === 'all') {
      list = list.filter(b => b.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(b =>
        b.service.serviceName.toLowerCase().includes(q) ||
        b.customer.name.toLowerCase().includes(q) ||
        b.serviceCity?.toLowerCase().includes(q)
      )
    }
    return list
  }, [tabFiltered, statusFilter, searchQuery, activeTab])

  // Handle state transitions
  const handleAction = async (bookingId: number, action: 'confirm' | 'start' | 'complete' | 'cancel') => {
    setActionLoading(bookingId)
    setActionError(null)
    try {
      let updated: BookingResponse
      switch (action) {
        case 'confirm':  updated = await bookingApi.confirmBooking(bookingId);  break
        case 'start':    updated = await bookingApi.startBooking(bookingId);    break
        case 'complete': updated = await bookingApi.completeBooking(bookingId); break
        case 'cancel':   updated = await bookingApi.cancelBooking(bookingId, 'Declined by provider'); break
      }
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b))
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Action failed. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const businessName = provider?.businessName ?? user?.name ?? 'Provider'
  const firstName    = user?.name?.split(' ')[0] ?? 'there'

  const TABS: { key: TabType; label: string; count: number }[] = [
    { key: 'pending',  label: 'Needs Action', count: stats.pending  },
    { key: 'upcoming', label: 'Upcoming',      count: stats.upcoming },
    { key: 'all',      label: 'All Jobs',      count: bookings.length },
  ]

  return (
    <div className="min-h-screen bg-brand-surface pb-12">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs font-bold text-purple-500 uppercase tracking-wide mb-1">{businessName}</p>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Hello, <span className="gradient-text">{firstName}</span> 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage your jobs and schedule</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/provider/services')}
              className="btn-outline text-sm flex items-center gap-2"
            >
              <Tag className="w-4 h-4" /> My Services
            </button>
            {stats.pending > 0 && (
              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{stats.pending}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Needs Action"  value={stats.pending}   icon={AlertCircle}  color="bg-gradient-to-br from-amber-500 to-orange-500"   />
            <StatCard label="Upcoming Jobs" value={stats.upcoming}  icon={Calendar}     color="bg-gradient-to-br from-blue-500 to-cyan-500"      />
            <StatCard label="Completed"     value={stats.completed} icon={CheckCircle}  color="bg-gradient-to-br from-green-500 to-emerald-500"  />
            <StatCard label="Total Earned"  value={stats.revenue}   icon={DollarSign}   color="bg-gradient-to-br from-purple-500 to-blue-500"    />
          </div>
        )}

        {/* ── Pending alert ────────────────────────────────────────────── */}
        {!loading && (
          <PendingAlert
            count={stats.pending}
            onClick={() => setActiveTab('pending')}
          />
        )}

        {/* ── Today's schedule ─────────────────────────────────────────── */}
        {!loading && <TodaySchedule bookings={bookings} />}

        {/* ── Action error banner ──────────────────────────────────────── */}
        {actionError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">{actionError}</p>
            <button onClick={() => setActionError(null)}>
              <X className="w-4 h-4 text-red-400 hover:text-red-600" />
            </button>
          </div>
        )}

        {/* ── Booking list ─────────────────────────────────────────────── */}
        <div className="card">
          {/* Tabs */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-full sm:w-fit">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setStatusFilter('ALL'); setSearchQuery('') }}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === tab.key
                      ? 'bg-white text-purple-700 shadow'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      activeTab === tab.key
                        ? tab.key === 'pending' ? 'bg-amber-500 text-white' : 'bg-purple-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search + filter (All tab only) */}
            {activeTab === 'all' && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by service or customer…"
                    className="w-full pl-9 pr-4 py-2 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as BookingStatus | 'ALL')}
                    className="pl-3 pr-8 py-2 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none bg-white appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* List body */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : displayed.length === 0 ? (
              <EmptyState message={
                activeTab === 'pending'  ? 'No pending bookings — you\'re all caught up!' :
                activeTab === 'upcoming' ? 'No upcoming confirmed jobs scheduled.' :
                'No bookings found.'
              } />
            ) : (
              <div className="space-y-3">
                {displayed.map(b => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onAction={handleAction}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Provider profile summary */}
        {!loading && provider && (
          <div className="card p-5 mt-5 flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white font-extrabold text-xl">
                {businessName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{businessName}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {provider.overallRating && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {provider.overallRating.toFixed(1)} rating
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3 h-3 text-purple-400" />
                  {provider.totalBookingsCompleted ?? 0} jobs completed
                </span>
                {provider.yearsOfExperience && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <TrendingUp className="w-3 h-3 text-purple-400" />
                    {provider.yearsOfExperience} yrs experience
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}