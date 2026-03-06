import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Clock, CheckCircle, XCircle,
  ArrowRight, Star, MapPin, Search, Filter,
  TrendingUp, Package, Loader2, X, ChevronDown,
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

function formatDateFull(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function getDaysLabel(booking: BookingResponse): string {
  const days = booking.daysUntilBooking
  if (days == null) return ''
  if (booking.isPast)   return 'Past'
  if (booking.isToday)  return 'Today'
  if (days === 1)       return 'Tomorrow'
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
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

// ── Booking card ──────────────────────────────────────────────────────────────
function BookingCard({ booking, onCancel }: {
  booking: BookingResponse
  onCancel: (booking: BookingResponse) => void
}) {
  const navigate   = useNavigate()
  const daysLabel  = getDaysLabel(booking)
  const isUpcoming = booking.isFuture || booking.isToday

  return (
    <div
      className={`card p-5 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group border-l-4 ${
        booking.status === 'CONFIRMED'   ? 'border-blue-400'   :
        booking.status === 'PENDING'     ? 'border-amber-400'  :
        booking.status === 'IN_PROGRESS' ? 'border-purple-400' :
        booking.status === 'COMPLETED'   ? 'border-green-400'  :
        'border-gray-200'
      }`}
      onClick={() => navigate(`/bookings/${booking.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: service info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={booking.status} />
            {daysLabel && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                booking.isToday  ? 'bg-purple-100 text-purple-700' :
                booking.isFuture ? 'bg-blue-50 text-blue-600'      :
                'bg-gray-100 text-gray-500'
              }`}>
                {daysLabel}
              </span>
            )}
          </div>

          <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-purple-700 transition-colors">
            {booking.service.serviceName}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{booking.provider.businessName}</p>

          {/* Schedule */}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3 h-3 text-purple-400" />
              {formatDate(booking.scheduledDate)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3 h-3 text-purple-400" />
              {formatTime(booking.scheduledStartTime)}
            </span>
            {booking.fullServiceAddress && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 truncate max-w-[200px]">
                <MapPin className="w-3 h-3 text-purple-400 flex-shrink-0" />
                {booking.serviceCity}, {booking.serviceState}
              </span>
            )}
          </div>
        </div>

        {/* Right: price + arrow */}
        <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
          {booking.totalPrice != null ? (
            <p className="font-bold text-gray-900">${Number(booking.totalPrice).toLocaleString()}</p>
          ) : (
            <p className="text-xs text-gray-400">Price TBD</p>
          )}
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      {/* Cancel button for eligible bookings */}
      {booking.canCancel && isUpcoming && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={e => { e.stopPropagation(); onCancel(booking) }}
            className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors"
          >
            Cancel Booking
          </button>
        </div>
      )}
    </div>
  )
}

// ── Cancel confirmation modal ─────────────────────────────────────────────────
function CancelModal({ booking, onConfirm, onClose, loading }: {
  booking: BookingResponse
  onConfirm: (reason: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Cancel Booking</h3>
            <p className="text-sm text-gray-500 mt-0.5">{booking.service.serviceName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <p className="text-xs text-amber-700">
            Cancelling will release the time slot back to the provider.
            This action cannot be undone.
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Reason for cancellation <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Schedule conflict, found another provider…"
            className="w-full px-4 py-3 text-sm border-2 border-gray-200 focus:border-red-400 rounded-xl focus:outline-none resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="btn-outline flex-1 py-3">
            Keep Booking
          </button>
          <button
            onClick={() => onConfirm(reason || 'No reason provided')}
            disabled={loading}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Cancel Booking
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ filtered }: { filtered: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Package className="w-8 h-8 text-gray-300" />
      </div>
      <h3 className="font-bold text-gray-700 text-lg mb-2">
        {filtered ? 'No bookings match your filter' : 'No bookings yet'}
      </h3>
      <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
        {filtered
          ? 'Try a different status filter to see your bookings.'
          : 'Browse services and make your first booking to get started.'}
      </p>
      {!filtered && (
        <button onClick={() => navigate('/services')} className="btn-primary mx-auto inline-flex items-center gap-2">
          Browse Services <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const navigate = useNavigate()
  const user     = useAppSelector(s => s.auth.user)

  const [bookings,       setBookings]       = useState<BookingResponse[]>([])
  const [loading,        setLoading]        = useState(true)
  const [cancelTarget,   setCancelTarget]   = useState<BookingResponse | null>(null)
  const [cancelling,     setCancelling]     = useState(false)
  const [statusFilter,   setStatusFilter]   = useState<BookingStatus | 'ALL'>('ALL')
  const [searchQuery,    setSearchQuery]    = useState('')
  const [activeTab,      setActiveTab]      = useState<'upcoming' | 'all'>('upcoming')

  // Load all bookings
  useEffect(() => {
    bookingApi.getMyBookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Stats
  const stats = useMemo(() => ({
    total:     bookings.length,
    upcoming:  bookings.filter(b => b.isFuture || b.isToday).length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
    pending:   bookings.filter(b => b.status === 'PENDING').length,
  }), [bookings])

  // Filtered + searched list
  const displayed = useMemo(() => {
    let list = activeTab === 'upcoming'
      ? bookings.filter(b => b.isFuture || b.isToday || b.status === 'IN_PROGRESS')
      : bookings

    if (statusFilter !== 'ALL') {
      list = list.filter(b => b.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(b =>
        b.service.serviceName.toLowerCase().includes(q) ||
        b.provider.businessName.toLowerCase().includes(q) ||
        b.service.categoryName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [bookings, activeTab, statusFilter, searchQuery])

  // Next upcoming booking
  const nextBooking = useMemo(() =>
    bookings
      .filter(b => (b.isFuture || b.isToday) && b.status !== 'CANCELLED')
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0]
  , [bookings])

  const handleCancel = async (reason: string) => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      const updated = await bookingApi.cancelBooking(cancelTarget.id, reason)
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b))
      setCancelTarget(null)
    } catch (err) {
      console.error('Cancel failed', err)
    } finally {
      setCancelling(false)
    }
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="min-h-screen bg-brand-surface pb-12">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Welcome back, <span className="gradient-text">{firstName}</span> 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">Here's an overview of your bookings</p>
          </div>
          <button
            onClick={() => navigate('/services')}
            className="btn-primary hidden sm:flex items-center gap-2 text-sm"
          >
            Book a Service <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Bookings"  value={stats.total}     icon={Package}     color="bg-gradient-to-br from-purple-500 to-blue-500"   />
            <StatCard label="Upcoming"        value={stats.upcoming}  icon={Calendar}    color="bg-gradient-to-br from-blue-500 to-cyan-500"     />
            <StatCard label="Completed"       value={stats.completed} icon={CheckCircle} color="bg-gradient-to-br from-green-500 to-emerald-500" />
            <StatCard label="Pending Confirm" value={stats.pending}   icon={TrendingUp}  color="bg-gradient-to-br from-amber-500 to-orange-500"  />
          </div>
        )}

        {/* ── Next booking highlight ───────────────────────────────────── */}
        {!loading && nextBooking && (
          <div
            className="card p-5 mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/bookings/${nextBooking.id}`)}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Next Upcoming Booking
                </p>
                <h3 className="font-bold text-gray-900 text-lg">{nextBooking.service.serviceName}</h3>
                <p className="text-sm text-gray-600">{nextBooking.provider.businessName}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-purple-500" />
                    {formatDateFull(nextBooking.scheduledDate)}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                    {formatTime(nextBooking.scheduledStartTime)}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <StatusBadge status={nextBooking.status} />
                <p className="text-xs text-purple-600 font-bold mt-2">
                  {getDaysLabel(nextBooking)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Booking list ─────────────────────────────────────────────── */}
        <div className="card">
          {/* Tabs + filters */}
          <div className="p-4 border-b border-gray-100">
            {/* Tab row */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
              {(['upcoming', 'all'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setStatusFilter('ALL') }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? 'bg-white text-purple-700 shadow'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'upcoming' ? 'Upcoming' : 'All Bookings'}
                </button>
              ))}
            </div>

            {/* Search + status filter row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search bookings…"
                  className="w-full pl-9 pr-4 py-2 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as BookingStatus | 'ALL')}
                  className="pl-9 pr-8 py-2 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none bg-white appearance-none cursor-pointer"
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
          </div>

          {/* List body */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : displayed.length === 0 ? (
              <EmptyState filtered={statusFilter !== 'ALL' || !!searchQuery} />
            ) : (
              <div className="space-y-3">
                {displayed.map(b => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onCancel={setCancelTarget}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="sm:hidden mt-6">
          <button
            onClick={() => navigate('/services')}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2"
          >
            Book a Service <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
          loading={cancelling}
        />
      )}
    </div>
  )
}