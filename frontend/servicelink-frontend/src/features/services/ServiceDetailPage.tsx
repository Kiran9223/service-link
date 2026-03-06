import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Star, Clock, Shield, CheckCircle, Zap,
  Calendar, ChevronLeft, ChevronRight, ArrowRight,
  Wrench, ZapIcon, Snowflake, Sparkles, Leaf, Hammer,
  Paintbrush, TreePine, Home, Lock, AlertCircle,
  Award, ThumbsUp, MapPin,
} from 'lucide-react'
import { serviceApi, availabilityApi, type AvailabilitySlot } from '@/api/serviceApi'
import type { ServiceListing } from '@/types/service.types'
import { formatPrice, getPricingBadge } from '@/utils/priceUtils'
import { useAppSelector } from '@/hooks/useAppDispatch'

// ── Category icon/gradient maps ───────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Plumbing':   Wrench,    'Electrical': ZapIcon,  'HVAC':      Snowflake,
  'Cleaning':   Sparkles,  'Lawn Care':  Leaf,     'Handyman':  Hammer,
  'Painting':   Paintbrush,'Carpentry':  TreePine, 'Roofing':   Home,
  'Locksmith':  Lock,
}
const CATEGORY_GRADIENTS: Record<string, string> = {
  'Plumbing':   'from-blue-500 to-blue-600',
  'Electrical': 'from-yellow-500 to-orange-500',
  'HVAC':       'from-cyan-500 to-blue-500',
  'Cleaning':   'from-purple-500 to-pink-500',
  'Lawn Care':  'from-green-500 to-emerald-500',
  'Handyman':   'from-orange-500 to-red-500',
  'Painting':   'from-pink-500 to-rose-500',
  'Carpentry':  'from-amber-600 to-orange-600',
  'Roofing':    'from-slate-600 to-gray-700',
  'Locksmith':  'from-indigo-500 to-purple-500',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(time: string): string {
  // "09:00:00" → "9:00 AM"
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour   = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (date.getTime() === today.getTime())    return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ rating, size = 'sm' }: { rating: number | null; size?: 'sm' | 'lg' }) {
  if (!rating) return <span className="text-sm text-gray-400">No reviews yet</span>
  const stars = Math.round(rating)
  const cls   = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`${cls} ${i <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
      <span className={`font-bold text-gray-800 ${size === 'lg' ? 'text-lg ml-1' : 'text-sm'}`}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-32 mb-6" />
      <div className="h-48 bg-gray-200 rounded-2xl mb-6" />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  )
}

// ── Availability calendar strip ───────────────────────────────────────────────
function AvailabilitySection({
  slots,
  loading,
  selectedSlot,
  onSelectSlot,
}: {
  slots: AvailabilitySlot[]
  loading: boolean
  selectedSlot: AvailabilitySlot | null
  onSelectSlot: (slot: AvailabilitySlot) => void
}) {
  const [dateOffset, setDateOffset] = useState(0)

  // Group bookable slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>()
    slots.filter(s => s.isBookable).forEach(s => {
      const list = map.get(s.slotDate) ?? []
      list.push(s)
      map.set(s.slotDate, list)
    })
    return map
  }, [slots])

  // Build 5-day window starting from today + offset
  const days = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(todayStr(), dateOffset + i))
  }, [dateOffset])

  const [selectedDate, setSelectedDate] = useState<string>(days[0])
  const slotsForSelectedDate = slotsByDate.get(selectedDate) ?? []

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="flex gap-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl flex-1" />)}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-500">No availability in the next 10 days</p>
        <p className="text-xs text-gray-400 mt-1">Check back soon or try another provider</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Date strip */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDateOffset(o => Math.max(0, o - 1))}
          disabled={dateOffset === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex gap-1.5 flex-1 overflow-hidden">
          {days.map(date => {
            const hasSlots    = slotsByDate.has(date)
            const isSelected  = date === selectedDate
            const slotCount   = slotsByDate.get(date)?.length ?? 0
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                disabled={!hasSlots}
                className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl text-xs font-semibold transition-all duration-200 border-2 ${
                  isSelected && hasSlots
                    ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white border-transparent shadow-md'
                    : hasSlots
                    ? 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-75">
                  {formatDateLabel(date) === 'Today' ? 'Today'
                    : formatDateLabel(date) === 'Tomorrow' ? 'Tmrw'
                    : new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-sm font-bold mt-0.5">
                  {new Date(date + 'T00:00:00').getDate()}
                </span>
                {hasSlots && (
                  <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-purple-500'}`}>
                    {slotCount} slot{slotCount !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setDateOffset(o => o + 1)}
          disabled={dateOffset >= 5}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Date label */}
      <p className="text-xs text-gray-400 font-medium pl-1">{formatDateFull(selectedDate)}</p>

      {/* Time slot grid */}
      {slotsForSelectedDate.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slotsForSelectedDate.map(slot => {
            const isSelected = selectedSlot?.id === slot.id
            return (
              <button
                key={slot.id}
                onClick={() => onSelectSlot(isSelected ? null! : slot)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-md scale-[1.03]'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                }`}
              >
                {formatTime(slot.startTime)}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-5 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-400">No available slots on this day</p>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ServiceDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const isAuth       = useAppSelector(s => !!s.auth.token)

  const [service,      setService]      = useState<ServiceListing | null>(null)
  const [slots,        setSlots]        = useState<AvailabilitySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [loadingSvc,   setLoadingSvc]   = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // Load service
  useEffect(() => {
    if (!id) return
    setLoadingSvc(true)
    serviceApi.getServiceById(Number(id))
      .then(svc => {
        setService(svc)
        // Load availability for this provider
        setLoadingSlots(true)
        return availabilityApi.getProviderSlots(svc.provider.id)
      })
      .then(s => setSlots(s))
      .catch(() => setError('Service not found or unavailable.'))
      .finally(() => { setLoadingSvc(false); setLoadingSlots(false) })
  }, [id])

  const handleBookNow = () => {
    if (!isAuth) {
      navigate(`/login?redirect=/book/${id}`)
      return
    }
    if (selectedSlot) {
      navigate(`/book/${id}?slotId=${selectedSlot.id}&date=${selectedSlot.slotDate}&time=${selectedSlot.startTime}`)
    } else {
      navigate(`/book/${id}`)
    }
  }

  if (loadingSvc) return <Skeleton />

  if (error || !service) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Service Not Found</h2>
        <p className="text-gray-500 mb-6">{error ?? 'This service may no longer be available.'}</p>
        <button onClick={() => navigate('/services')} className="btn-primary">
          Browse Services
        </button>
      </div>
    )
  }

  const Icon     = CATEGORY_ICONS[service.category.name]     ?? Wrench
  const gradient = CATEGORY_GRADIENTS[service.category.name] ?? 'from-purple-500 to-blue-500'
  const badge    = getPricingBadge(service.pricingType)
  const { provider } = service

  return (
    <div className="min-h-screen bg-brand-surface pb-16">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Services
        </button>

        {/* ── Hero banner ──────────────────────────────────────────────── */}
        <div className={`bg-gradient-to-br ${gradient} rounded-3xl p-8 md:p-10 mb-6 relative overflow-hidden`}>
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-12 -left-8 w-64 h-64 bg-black/10 rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Icon className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold bg-white/20 text-white px-3 py-1 rounded-full">
                  {service.category.name}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white`}>
                  {badge.label}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                {service.serviceName}
              </h1>
              <p className="text-white/80 text-sm mt-1 font-medium">{provider.businessName}</p>
            </div>
            <div className="md:text-right">
              <p className="text-white/70 text-xs font-medium mb-1">Starting from</p>
              <p className="text-3xl font-extrabold text-white">{formatPrice(service)}</p>
              {service.estimatedDurationHours && (
                <p className="text-white/70 text-xs mt-1 flex items-center md:justify-end gap-1">
                  <Clock className="w-3 h-3" /> ~{service.estimatedDurationHours} hour{service.estimatedDurationHours !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Main grid ────────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* ── Left column: details ─────────────────────────────────── */}
          <div className="md:col-span-2 space-y-5">

            {/* Description */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">About This Service</h2>
              <p className="text-gray-600 leading-relaxed">{service.description}</p>
            </div>

            {/* Service highlights */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Service Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Pricing</p>
                    <p className="text-sm font-bold text-gray-800">{formatPrice(service)}</p>
                    <p className="text-xs text-gray-400">{badge.label} rate</p>
                  </div>
                </div>

                {service.estimatedDurationHours && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Est. Duration</p>
                      <p className="text-sm font-bold text-gray-800">{service.estimatedDurationHours} hours</p>
                      <p className="text-xs text-gray-400">Approximate</p>
                    </div>
                  </div>
                )}

                {provider.yearsOfExperience && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Experience</p>
                      <p className="text-sm font-bold text-gray-800">{provider.yearsOfExperience} years</p>
                      <p className="text-xs text-gray-400">In the field</p>
                    </div>
                  </div>
                )}

                {provider.totalBookingsCompleted != null && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ThumbsUp className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Jobs Completed</p>
                      <p className="text-sm font-bold text-gray-800">{provider.totalBookingsCompleted.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Verified bookings</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Provider card */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">About the Provider</h2>
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <span className="text-white font-extrabold text-xl">
                    {provider.businessName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base">{provider.businessName}</h3>
                  <StarRating rating={provider.overallRating} />
                  <div className="flex items-center gap-1 mt-2">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">Serving Orange County, CA</span>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  { icon: Shield,       label: 'Verified',  sub: 'Background checked'  },
                  { icon: CheckCircle,  label: 'Insured',   sub: 'Liability coverage'  },
                  { icon: Award,        label: 'Certified', sub: 'Licensed pro'        },
                ].map(item => {
                  const TIcon = item.icon
                  return (
                    <div key={item.label} className="text-center p-3 bg-gray-50 rounded-xl">
                      <TIcon className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <p className="text-xs font-bold text-gray-700">{item.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Right column: booking panel ──────────────────────────── */}
          <div className="space-y-4">

            {/* Sticky booking card */}
            <div className="card p-5 lg:sticky lg:top-24">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-500" /> Select a Time Slot
              </p>

              <AvailabilitySection
                slots={slots}
                loading={loadingSlots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />

              {/* Selected slot summary */}
              {selectedSlot && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <p className="text-xs font-bold text-purple-700 mb-0.5">Selected Slot</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatDateLabel(selectedSlot.slotDate)} · {formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)}
                  </p>
                </div>
              )}

              {/* CTA button */}
              <button
                onClick={handleBookNow}
                className="btn-primary w-full py-4 mt-4 flex items-center justify-center gap-2 text-sm group"
              >
                {selectedSlot ? 'Book This Slot' : 'Book Now'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {!isAuth && (
                <p className="text-center text-xs text-gray-400 mt-2">
                  You'll be asked to log in to confirm
                </p>
              )}

              {/* Price summary */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Service price</span>
                  <span className="font-semibold text-gray-800">{formatPrice(service)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Platform fee</span>
                  <span className="font-semibold text-green-600">Free</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                  <span className="font-bold text-gray-800">Total estimate</span>
                  <span className="font-bold text-gray-900">{formatPrice(service)}</span>
                </div>
              </div>
            </div>

            {/* Why book here */}
            <div className="card p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                Why ServiceLink
              </p>
              <div className="space-y-2.5">
                {[
                  { icon: Zap,         text: 'Instant confirmation via Kafka events' },
                  { icon: Shield,      text: 'All providers verified & insured'      },
                  { icon: CheckCircle, text: 'Fairness-aware provider matching'      },
                ].map(item => {
                  const WIcon = item.icon
                  return (
                    <div key={item.text} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <WIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      {item.text}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}