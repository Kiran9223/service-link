import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, ArrowRight, Calendar, MapPin, ClipboardList,
  CheckCircle, Clock, Star, AlertCircle, Loader2,
  Info, Wrench, Shield, Zap,
} from 'lucide-react'
import { serviceApi, availabilityApi, type AvailabilitySlot } from '@/api/serviceApi'
import { bookingApi } from '@/api/bookingApi'
import type { ServiceListing } from '@/types/service.types'
import type { BookingResponse } from '@/types/booking.types'
import { formatPrice, getPricingBadge } from '@/utils/priceUtils'
import { useAppSelector } from '@/hooks/useAppDispatch'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ── Address form schema ───────────────────────────────────────────────────────
const addressSchema = z.object({
  serviceAddress:    z.string().min(5,  'Address is required').max(500),
  serviceCity:       z.string().min(2,  'City is required').max(100),
  serviceState:      z.string().min(2,  'State is required').max(50),
  servicePostalCode: z.string().regex(/^[0-9]{5}(-[0-9]{4})?$/, 'Enter a valid US zip code (e.g. 92831)'),
  specialInstructions: z.string().max(1000).optional(),
})
type AddressForm = z.infer<typeof addressSchema>

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'Time Slot',   icon: Calendar     },
    { n: 2, label: 'Your Address', icon: MapPin       },
    { n: 3, label: 'Confirm',      icon: ClipboardList },
  ]
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((s, i) => {
        const Icon = s.icon
        const done    = step > s.n
        const active  = step === s.n
        return (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                done   ? 'bg-green-500 text-white' :
                active ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg scale-110' :
                         'bg-gray-200 text-gray-400'
              }`}>
                {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-semibold mt-1.5 ${
                active ? 'text-purple-700' : done ? 'text-green-600' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-colors duration-300 ${
                step > s.n ? 'bg-green-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Service summary card (shown throughout) ───────────────────────────────────
function ServiceSummaryCard({ service, slot }: { service: ServiceListing; slot: AvailabilitySlot | null }) {
  const badge = getPricingBadge(service.pricingType)
  return (
    <div className="card p-5 border-l-4 border-purple-500">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Booking Summary</p>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">{service.serviceName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{service.provider.businessName}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-sm font-bold text-gray-800">{formatPrice(service)}</span>
          </div>
        </div>
      </div>

      {slot && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <span>{formatDateDisplay(slot.slotDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <span>{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</span>
          </div>
        </div>
      )}

      {/* Duration notice */}
      {service.estimatedDurationHours && service.estimatedDurationHours > 1 && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            This service takes approximately <strong>{service.estimatedDurationHours} hours</strong>.
            Your provider will confirm the full schedule after booking.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Step 1: Slot selection ────────────────────────────────────────────────────
function StepSlot({
  service,
  preselectedSlot,
  onNext,
}: {
  service: ServiceListing
  preselectedSlot: AvailabilitySlot | null
  onNext: (slot: AvailabilitySlot) => void
}) {
  const [slots,    setSlots]    = useState<AvailabilitySlot[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<AvailabilitySlot | null>(preselectedSlot)

  // Group by date
  const slotsByDate = slots.filter(s => s.isBookable).reduce<Record<string, AvailabilitySlot[]>>((acc, s) => {
    acc[s.slotDate] = [...(acc[s.slotDate] ?? []), s]
    return acc
  }, {})
  const dates = Object.keys(slotsByDate).sort()

  useEffect(() => {
    availabilityApi.getProviderSlots(service.provider.id)
      .then(setSlots)
      .finally(() => setLoading(false))
  }, [service.provider.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (dates.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-600">No availability in the next 10 days</p>
        <p className="text-sm text-gray-400 mt-1">Try another provider or check back soon</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Choose a Time Slot</h2>
        <p className="text-sm text-gray-500 mt-1">Select when you'd like the service performed</p>
      </div>

      <div className="space-y-5">
        {dates.map(date => (
          <div key={date}>
            <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              {formatDateDisplay(date)}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slotsByDate[date].map(slot => {
                const isSelected = selected?.id === slot.id
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelected(isSelected ? null : slot)}
                    className={`py-3 px-2 rounded-xl text-xs font-semibold border-2 transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-md scale-[1.03]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                    }`}
                  >
                    <p>{formatTime(slot.startTime)}</p>
                    <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                      {slot.durationMinutes}min
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
        className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Step 2: Address form ──────────────────────────────────────────────────────
function StepAddress({
  user,
  onNext,
  onBack,
}: {
  user: { city?: string; state?: string } | null
  onNext: (data: AddressForm) => void
  onBack: () => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      serviceCity:  user?.city  ?? '',
      serviceState: user?.state ?? 'CA',
    },
  })

  const inputCls = (hasError: boolean) =>
    `w-full px-4 py-3 text-sm border-2 rounded-xl focus:outline-none transition-colors ${
      hasError
        ? 'border-red-400 focus:border-red-500 bg-red-50'
        : 'border-gray-200 focus:border-purple-400'
    }`

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Service Address</h2>
        <p className="text-sm text-gray-500 mt-1">Where should the provider come to?</p>
      </div>

      {/* Street address */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Street Address <span className="text-red-500">*</span>
        </label>
        <input
          {...register('serviceAddress')}
          placeholder="e.g. 3130 Yorba Linda Blvd, Apt J18"
          className={inputCls(!!errors.serviceAddress)}
        />
        {errors.serviceAddress && (
          <p className="text-xs text-red-500 mt-1">{errors.serviceAddress.message}</p>
        )}
      </div>

      {/* City + State row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            City <span className="text-red-500">*</span>
          </label>
          <input
            {...register('serviceCity')}
            placeholder="Fullerton"
            className={inputCls(!!errors.serviceCity)}
          />
          {errors.serviceCity && (
            <p className="text-xs text-red-500 mt-1">{errors.serviceCity.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            State <span className="text-red-500">*</span>
          </label>
          <input
            {...register('serviceState')}
            placeholder="CA"
            maxLength={2}
            className={inputCls(!!errors.serviceState)}
          />
          {errors.serviceState && (
            <p className="text-xs text-red-500 mt-1">{errors.serviceState.message}</p>
          )}
        </div>
      </div>

      {/* Zip code */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          ZIP Code <span className="text-red-500">*</span>
        </label>
        <input
          {...register('servicePostalCode')}
          placeholder="92831"
          maxLength={10}
          className={inputCls(!!errors.servicePostalCode)}
        />
        {errors.servicePostalCode && (
          <p className="text-xs text-red-500 mt-1">{errors.servicePostalCode.message}</p>
        )}
      </div>

      {/* Special instructions */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Special Instructions <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          {...register('specialInstructions')}
          rows={3}
          placeholder="Gate code, parking info, pet at home, preferred entry…"
          className="w-full px-4 py-3 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none resize-none transition-colors"
        />
        {errors.specialInstructions && (
          <p className="text-xs text-red-500 mt-1">{errors.specialInstructions.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="btn-outline flex-1 py-4 flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="submit" className="btn-primary flex-1 py-4 flex items-center justify-center gap-2">
          Review Booking <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}

// ── Step 3: Confirm ───────────────────────────────────────────────────────────
function StepConfirm({
  service,
  slot,
  address,
  onConfirm,
  onBack,
  submitting,
  error,
}: {
  service: ServiceListing
  slot: AvailabilitySlot
  address: AddressForm
  onConfirm: () => void
  onBack: () => void
  submitting: boolean
  error: string | null
}) {
  const badge = getPricingBadge(service.pricingType)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review & Confirm</h2>
        <p className="text-sm text-gray-500 mt-1">Double-check everything before confirming</p>
      </div>

      {/* Service details */}
      <div className="card p-5 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Service</p>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{service.serviceName}</p>
            <p className="text-sm text-gray-500">{service.provider.businessName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
              <span className="text-sm font-bold text-gray-800">{formatPrice(service)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="card p-5 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Schedule</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 text-sm text-gray-700">
            <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="font-medium">{formatDateDisplay(slot.slotDate)}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-gray-700">
            <Clock className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="font-medium">{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</span>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="card p-5 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Service Location</p>
        <div className="flex items-start gap-2.5 text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{address.serviceAddress}</p>
            <p>{address.serviceCity}, {address.serviceState} {address.servicePostalCode}</p>
            {address.specialInstructions && (
              <p className="text-gray-400 text-xs mt-1 italic">"{address.specialInstructions}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Duration notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 space-y-0.5">
          <p className="font-bold">What happens next?</p>
          <p>Your booking will be sent to the provider. They'll confirm within a few hours and contact you to discuss the full schedule and scope of work.</p>
        </div>
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Shield, label: 'Verified Provider' },
          { icon: Zap,    label: 'Instant Request'   },
          { icon: Star,   label: 'Quality Guaranteed'},
        ].map(item => {
          const Icon = item.icon
          return (
            <div key={item.label} className="text-center p-3 bg-gray-50 rounded-xl">
              <Icon className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-[10px] font-semibold text-gray-600">{item.label}</p>
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} disabled={submitting} className="btn-outline flex-1 py-4 flex items-center justify-center gap-2 disabled:opacity-50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="btn-primary flex-1 py-4 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
          ) : (
            <><CheckCircle className="w-4 h-4" /> Confirm Booking</>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Success ───────────────────────────────────────────────────────────
function StepSuccess({ booking, service, onDone }: {
  booking: BookingResponse
  service: ServiceListing
  onDone: () => void
}) {
  const navigate = useNavigate()
  return (
    <div className="text-center py-4">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg animate-bounce">
        <CheckCircle className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Booking Confirmed!</h2>
      <p className="text-gray-500 mb-1">
        Your request has been sent to <strong>{service.provider.businessName}</strong>.
      </p>
      <p className="text-gray-400 text-sm mb-6">
        Booking #{booking.id} · They'll be in touch shortly to confirm details.
      </p>

      {/* Booking reference card */}
      <div className="card p-5 text-left mb-6 border-2 border-green-200 bg-green-50">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <p className="text-sm font-bold text-green-700">Booking Reference #{booking.id}</p>
        </div>
        <p className="text-sm text-gray-700 font-semibold">{service.serviceName}</p>
        <p className="text-xs text-gray-500 mt-0.5">{service.provider.businessName}</p>
        {booking.scheduledDate && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDateDisplay(booking.scheduledDate)} · {formatTime(booking.scheduledStartTime)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary w-full py-4"
        >
          View My Bookings
        </button>
        <button
          onClick={onDone}
          className="btn-outline w-full py-3 text-sm"
        >
          Book Another Service
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BookingPage() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const user           = useAppSelector(s => s.auth.user)

  const [step,       setStep]       = useState(1)
  const [service,    setService]    = useState<ServiceListing | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError,setSubmitError]= useState<string | null>(null)

  // Booking state accumulated across steps
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [address,      setAddress]      = useState<AddressForm | null>(null)
  const [booking,      setBooking]      = useState<BookingResponse | null>(null)

  // Pre-selected slot from ServiceDetailPage query params
  const preSlotId = searchParams.get('slotId')

  // Load service
  useEffect(() => {
    if (!serviceId) return
    serviceApi.getServiceById(Number(serviceId))
      .then(setService)
      .catch(() => setError('Service not found.'))
      .finally(() => setLoading(false))
  }, [serviceId])

  // If slot was pre-selected from detail page, load it
  useEffect(() => {
    if (!preSlotId || !service) return
    availabilityApi.getProviderSlots(service.provider.id).then(slots => {
      const found = slots.find(s => s.id === Number(preSlotId))
      if (found) setSelectedSlot(found)
    })
  }, [preSlotId, service])

  const handleSlotSelected = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot)
    setStep(2)
  }

  const handleAddressSubmit = (data: AddressForm) => {
    setAddress(data)
    setStep(3)
  }

  const handleConfirm = async () => {
    if (!service || !selectedSlot || !address) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await bookingApi.createBooking({
        serviceId:          service.id,
        slotId:             selectedSlot.id,
        scheduledDate:      selectedSlot.slotDate,
        scheduledStartTime: selectedSlot.startTime,
        scheduledEndTime:   selectedSlot.endTime,
        serviceAddress:     address.serviceAddress,
        serviceCity:        address.serviceCity,
        serviceState:       address.serviceState,
        servicePostalCode:  address.servicePostalCode,
        specialInstructions: address.specialInstructions,
      })
      setBooking(result)
      setStep(4)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Booking failed. The slot may no longer be available.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  // Error state
  if (error || !service) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Service Not Found</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button onClick={() => navigate('/services')} className="btn-primary">Browse Services</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-surface py-8">
      <div className="max-w-2xl mx-auto px-4">

        {/* Back button */}
        {step < 4 && (
          <button
            onClick={() => step === 1 ? navigate(`/services/${serviceId}`) : setStep(s => s - 1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {step === 1 ? 'Back to Service' : 'Back'}
          </button>
        )}

        {/* Page title */}
        {step < 4 && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold gradient-text">Book a Service</h1>
            <p className="text-gray-400 text-sm mt-1">Confirm your booking in a few easy steps</p>
          </div>
        )}

        {/* Step indicator */}
        {step < 4 && <StepIndicator step={step} />}

        <div className="grid gap-5 lg:grid-cols-5">
          {/* Main step content */}
          <div className={`card p-6 ${step < 4 ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
            {step === 1 && (
              <StepSlot
                service={service}
                preselectedSlot={selectedSlot}
                onNext={handleSlotSelected}
              />
            )}
            {step === 2 && (
              <StepAddress
                user={user}
                onNext={handleAddressSubmit}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && selectedSlot && address && (
              <StepConfirm
                service={service}
                slot={selectedSlot}
                address={address}
                onConfirm={handleConfirm}
                onBack={() => setStep(2)}
                submitting={submitting}
                error={submitError}
              />
            )}
            {step === 4 && booking && (
              <StepSuccess
                booking={booking}
                service={service}
                onDone={() => navigate('/services')}
              />
            )}
          </div>

          {/* Sidebar summary (steps 1–3 only) */}
          {step < 4 && (
            <div className="lg:col-span-2 space-y-4">
              <ServiceSummaryCard service={service} slot={selectedSlot} />

              {/* Provider trust card */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {service.provider.businessName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{service.provider.businessName}</p>
                    {service.provider.overallRating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-500">{service.provider.overallRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  {service.provider.yearsOfExperience && (
                    <p>✓ {service.provider.yearsOfExperience} years experience</p>
                  )}
                  {service.provider.totalBookingsCompleted && (
                    <p>✓ {service.provider.totalBookingsCompleted} jobs completed</p>
                  )}
                  <p>✓ Verified & insured</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}