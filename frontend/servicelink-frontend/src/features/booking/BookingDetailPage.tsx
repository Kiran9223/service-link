import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calendar, MapPin, User, Building2,
  CheckCircle, XCircle, Play, Loader2, AlertCircle,
  Phone, Mail, Star, DollarSign, FileText, Info,
  ClipboardList, X,
} from 'lucide-react'
import { bookingApi } from '@/api/bookingApi'
import type { BookingResponse, BookingStatus } from '@/types/booking.types'
import { useAuth } from '@/hooks/useAuth'
import { BOOKING_STATUS_CONFIG } from '@/config/constants'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function formatDateFull(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = BOOKING_STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-4">
        <Icon className="w-3.5 h-3.5 text-purple-500" /> {title}
      </p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">{value}</span>
    </div>
  )
}

// ── Cancel modal ──────────────────────────────────────────────────────────────
function CancelModal({ onConfirm, onClose, loading }: {
  onConfirm: (reason: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-lg">Cancel Booking</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <p className="text-xs text-amber-700">This cannot be undone. The time slot will be released.</p>
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Reason for cancellation (optional)…"
          className="w-full px-4 py-3 text-sm border-2 border-gray-200 focus:border-red-400 rounded-xl focus:outline-none resize-none mb-5"
        />
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="btn-outline flex-1 py-3">Keep It</button>
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

// ── Timeline ──────────────────────────────────────────────────────────────────
function Timeline({ booking }: { booking: BookingResponse }) {
  const steps: { label: string; time?: string; done: boolean; active: boolean }[] = [
    {
      label: 'Booking Requested',
      time: booking.requestedAt ? formatDateTime(booking.requestedAt) : undefined,
      done: true,
      active: false,
    },
    {
      label: 'Provider Confirmed',
      time: booking.confirmedAt ? formatDateTime(booking.confirmedAt) : undefined,
      done: !!booking.confirmedAt,
      active: booking.status === 'PENDING',
    },
    {
      label: 'Service Started',
      time: booking.actualStartTime ? formatDateTime(booking.actualStartTime) : undefined,
      done: !!booking.actualStartTime,
      active: booking.status === 'CONFIRMED',
    },
    {
      label: 'Service Completed',
      time: booking.completedAt ? formatDateTime(booking.completedAt) : undefined,
      done: !!booking.completedAt,
      active: booking.status === 'IN_PROGRESS',
    },
  ]

  if (booking.status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <XCircle className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-red-600">Booking Cancelled</p>
          {booking.cancelledAt && (
            <p className="text-xs text-gray-400">{formatDateTime(booking.cancelledAt)}</p>
          )}
          {booking.cancellationReason && (
            <p className="text-xs text-gray-500 mt-0.5">"{booking.cancellationReason}"</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-start gap-3">
          {/* Connector line */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
              step.done
                ? 'bg-green-500 border-green-500'
                : step.active
                  ? 'bg-white border-purple-400 shadow-md'
                  : 'bg-white border-gray-200'
            }`}>
              {step.done
                ? <CheckCircle className="w-4 h-4 text-white" />
                : step.active
                  ? <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  : <div className="w-2 h-2 rounded-full bg-gray-200" />
              }
            </div>
            {i < steps.length - 1 && (
              <div className={`w-0.5 h-6 mt-1 ${step.done ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
          <div className="pb-1 pt-0.5">
            <p className={`text-sm font-semibold ${
              step.done ? 'text-gray-900' : step.active ? 'text-purple-700' : 'text-gray-400'
            }`}>
              {step.label}
              {step.active && <span className="ml-2 text-xs font-bold text-purple-500">← Next</span>}
            </p>
            {step.time && <p className="text-xs text-gray-400 mt-0.5">{step.time}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Provider action buttons ───────────────────────────────────────────────────
function ProviderActions({ booking, onAction, loading }: {
  booking: BookingResponse
  onAction: (action: 'confirm' | 'start' | 'complete') => void
  loading: boolean
}) {
  if (!['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) return null

  return (
    <div className="card p-5 border-2 border-purple-200 bg-purple-50/40">
      <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <ClipboardList className="w-3.5 h-3.5" /> Action Required
      </p>

      {booking.status === 'PENDING' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-3">
            Confirm this booking to let the customer know you're available.
          </p>
          <button
            onClick={() => onAction('confirm')}
            disabled={loading}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirm Booking
          </button>
        </div>
      )}

      {booking.status === 'CONFIRMED' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-3">
            Ready to begin? Mark the job as started when you arrive on site.
          </p>
          <button
            onClick={() => onAction('start')}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start Job
          </button>
        </div>
      )}

      {booking.status === 'IN_PROGRESS' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 mb-3">
            Mark the job complete once the work is finished.
          </p>
          <button
            onClick={() => onAction('complete')}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Mark Complete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BookingDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { isProvider } = useAuth()

  const [booking,      setBooking]      = useState<BookingResponse | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [actionLoading,setActionLoading]= useState(false)
  const [actionError,  setActionError]  = useState<string | null>(null)
  const [showCancel,   setShowCancel]   = useState(false)
  const [cancelling,   setCancelling]   = useState(false)

  useEffect(() => {
    if (!id) return
    bookingApi.getBookingById(Number(id))
      .then(setBooking)
      .catch(() => setError('Booking not found or you don\'t have access.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleProviderAction = async (action: 'confirm' | 'start' | 'complete') => {
    if (!booking) return
    setActionLoading(true)
    setActionError(null)
    try {
      let updated: BookingResponse
      if (action === 'confirm')  updated = await bookingApi.confirmBooking(booking.id)
      else if (action === 'start') updated = await bookingApi.startBooking(booking.id)
      else updated = await bookingApi.completeBooking(booking.id)
      setBooking(updated)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Action failed. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async (reason: string) => {
    if (!booking) return
    setCancelling(true)
    try {
      const updated = await bookingApi.cancelBooking(booking.id, reason)
      setBooking(updated)
      setShowCancel(false)
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Cancellation failed.')
    } finally {
      setCancelling(false)
    }
  }

  const backPath = isProvider ? '/provider/dashboard' : '/dashboard'

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Booking Not Found</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button onClick={() => navigate(backPath)} className="btn-primary">Back to Dashboard</button>
      </div>
    )
  }

  const isCancellable = booking.canCancel && booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED'

  return (
    <div className="min-h-screen bg-brand-surface pb-12">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Back + header ────────────────────────────────────────────── */}
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-400 font-semibold mb-1">Booking #{booking.id}</p>
            <h1 className="text-2xl font-extrabold text-gray-900">{booking.service.serviceName}</h1>
            <p className="text-gray-500 mt-0.5">
              {isProvider ? booking.customer.name : booking.provider.businessName}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* ── Action error ─────────────────────────────────────────────── */}
        {actionError && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">{actionError}</p>
            <button onClick={() => setActionError(null)}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        <div className="space-y-4">

          {/* ── Provider action card (provider view only) ──────────────── */}
          {isProvider && (
            <ProviderActions
              booking={booking}
              onAction={handleProviderAction}
              loading={actionLoading}
            />
          )}

          {/* ── Timeline ─────────────────────────────────────────────── */}
          <Section title="Status Timeline" icon={CheckCircle}>
            <Timeline booking={booking} />
          </Section>

          {/* ── Schedule ─────────────────────────────────────────────── */}
          <Section title="Schedule" icon={Calendar}>
            <Row label="Date"  value={formatDateFull(booking.scheduledDate)} />
            <Row label="Time"  value={`${formatTime(booking.scheduledStartTime)} – ${formatTime(booking.scheduledEndTime)}`} />
            {booking.daysUntilBooking != null && !booking.isPast && (
              <Row
                label="When"
                value={
                  booking.isToday ? (
                    <span className="text-purple-600 font-bold">Today</span>
                  ) : booking.daysUntilBooking === 1 ? (
                    <span className="text-blue-600 font-bold">Tomorrow</span>
                  ) : (
                    <span>In {booking.daysUntilBooking} days</span>
                  )
                }
              />
            )}
          </Section>

          {/* ── Service location ─────────────────────────────────────── */}
          {booking.fullServiceAddress && (
            <Section title="Service Location" icon={MapPin}>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{booking.serviceAddress}</p>
                  <p className="text-sm text-gray-600">{booking.serviceCity}, {booking.serviceState} {booking.servicePostalCode}</p>
                </div>
              </div>
              {booking.specialInstructions && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600 italic">"{booking.specialInstructions}"</p>
                </div>
              )}
            </Section>
          )}

          {/* ── Pricing ──────────────────────────────────────────────── */}
          <Section title="Pricing" icon={DollarSign}>
            <Row label="Service"     value={booking.service.serviceName} />
            {booking.service.categoryName && (
              <Row label="Category"  value={booking.service.categoryName} />
            )}
            {booking.durationHours && (
              <Row label="Duration"  value={`${booking.durationHours} hour${Number(booking.durationHours) !== 1 ? 's' : ''}`} />
            )}
            <Row
              label="Total"
              value={
                booking.totalPrice != null
                  ? <span className="text-lg font-extrabold text-gray-900">${Number(booking.totalPrice).toLocaleString()}</span>
                  : <span className="text-gray-400 italic text-sm">To be confirmed</span>
              }
            />
          </Section>

          {/* ── Provider info (customer view) ────────────────────────── */}
          {!isProvider && (
            <Section title="Your Provider" icon={Building2}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{booking.provider.businessName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{booking.provider.businessName}</p>
                  {booking.provider.ownerName && (
                    <p className="text-sm text-gray-500">{booking.provider.ownerName}</p>
                  )}
                  {booking.provider.overallRating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-600 font-semibold">{Number(booking.provider.overallRating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
              {booking.provider.phone && (
                <Row label={<span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone</span> as any}
                  value={booking.provider.phone} />
              )}
              {booking.provider.email && (
                <Row label={<span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</span> as any}
                  value={booking.provider.email} />
              )}
            </Section>
          )}

          {/* ── Customer info (provider view) ────────────────────────── */}
          {isProvider && (
            <Section title="Customer" icon={User}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{booking.customer.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{booking.customer.name}</p>
                  {booking.customer.city && (
                    <p className="text-sm text-gray-500">{booking.customer.city}, {booking.customer.state}</p>
                  )}
                </div>
              </div>
              {booking.customer.phone && (
                <Row label={<span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone</span> as any}
                  value={booking.customer.phone} />
              )}
              {booking.customer.email && (
                <Row label={<span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</span> as any}
                  value={booking.customer.email} />
              )}
            </Section>
          )}

          {/* ── Provider confirmation notice (customer view, pending) ── */}
          {!isProvider && booking.status === 'PENDING' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Your booking is awaiting confirmation from the provider. They'll be in touch soon.
              </p>
            </div>
          )}

          {/* ── Cancel button ────────────────────────────────────────── */}
          {isCancellable && (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full py-3.5 border-2 border-red-200 text-red-500 rounded-xl font-semibold hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" /> Cancel Booking
            </button>
          )}

        </div>
      </div>

      {showCancel && (
        <CancelModal
          onConfirm={handleCancel}
          onClose={() => setShowCancel(false)}
          loading={cancelling}
        />
      )}
    </div>
  )
}