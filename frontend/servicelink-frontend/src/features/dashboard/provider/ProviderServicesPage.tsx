import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, X, Loader2, CheckCircle,
  AlertCircle, ArrowLeft, DollarSign, Clock,
  Tag, ToggleLeft, ToggleRight, ChevronDown,
} from 'lucide-react'
import { serviceApi } from '@/api/serviceApi'
import type { ServiceListing, CategoryResponse, PricingType, ServiceListingRequest } from '@/types/service.types'
import { formatPrice, getPricingBadge } from '@/utils/priceUtils'

// ── Form schema ───────────────────────────────────────────────────────────────
const serviceSchema = z.object({
  categoryId:             z.number().positive('Category is required'),
  serviceName:            z.string().min(3, 'Name must be at least 3 characters').max(255),
  description:            z.string().max(5000).optional(),
  pricingType:            z.enum(['HOURLY', 'FIXED', 'RANGE'] as const),
  hourlyRate:             z.number().positive('Must be positive').optional().nullable(),
  fixedPrice:             z.number().positive('Must be positive').optional().nullable(),
  minPrice:               z.number().positive('Must be positive').optional().nullable(),
  maxPrice:               z.number().positive('Must be positive').optional().nullable(),
  estimatedDurationHours: z.number().min(0.1).max(99.9).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.pricingType === 'HOURLY' && !data.hourlyRate) {
    ctx.addIssue({ code: 'custom', path: ['hourlyRate'], message: 'Hourly rate is required' })
  }
  if (data.pricingType === 'FIXED' && !data.fixedPrice) {
    ctx.addIssue({ code: 'custom', path: ['fixedPrice'], message: 'Fixed price is required' })
  }
  if (data.pricingType === 'RANGE') {
    if (!data.minPrice) ctx.addIssue({ code: 'custom', path: ['minPrice'], message: 'Min price is required' })
    if (!data.maxPrice) ctx.addIssue({ code: 'custom', path: ['maxPrice'], message: 'Max price is required' })
    if (data.minPrice && data.maxPrice && data.minPrice >= data.maxPrice) {
      ctx.addIssue({ code: 'custom', path: ['maxPrice'], message: 'Max must be greater than min' })
    }
  }
})

type ServiceForm = z.infer<typeof serviceSchema>

// ── Category icons mapping ────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  'Plumbing': '🔧', 'Electrical': '⚡', 'HVAC': '❄️', 'Cleaning': '🧹',
  'Lawn Care': '🌿', 'Handyman': '🔨', 'Painting': '🖌️',
  'Carpentry': '🪵', 'Roofing': '🏠', 'Locksmith': '🔐',
}

// ── Service form modal ────────────────────────────────────────────────────────
function ServiceFormModal({
  service,
  categories,
  onSave,
  onClose,
}: {
  service: ServiceListing | null   // null = create mode
  categories: CategoryResponse[]
  onSave: (data: ServiceListingRequest) => Promise<void>
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: service ? {
      categoryId:             service.category.id,
      serviceName:            service.serviceName,
      description:            service.description ?? '',
      pricingType:            service.pricingType,
      hourlyRate:             service.hourlyRate    ?? null,
      fixedPrice:             service.fixedPrice    ?? null,
      minPrice:               service.minPrice      ?? null,
      maxPrice:               service.maxPrice      ?? null,
      estimatedDurationHours: service.estimatedDurationHours ?? null,
    } : {
      pricingType: 'HOURLY',
    },
  })

  const pricingType = watch('pricingType')

  const onSubmit = async (data: ServiceForm) => {
    setSaving(true)
    setError(null)
    try {
      await onSave({
        categoryId:             data.categoryId,
        serviceName:            data.serviceName,
        description:            data.description,
        pricingType:            data.pricingType,
        hourlyRate:             data.hourlyRate   ?? undefined,
        fixedPrice:             data.fixedPrice   ?? undefined,
        minPrice:               data.minPrice     ?? undefined,
        maxPrice:               data.maxPrice     ?? undefined,
        estimatedDurationHours: data.estimatedDurationHours ?? undefined,
      })
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save service. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = (hasError: boolean) =>
    `w-full px-4 py-3 text-sm border-2 rounded-xl focus:outline-none transition-colors ${
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400'
    }`

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              {service ? 'Edit Service' : 'Add New Service'}
            </h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {service ? 'Update your service details' : 'Create a new service listing'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    onChange={e => field.onChange(Number(e.target.value))}
                    className={`w-full pl-4 pr-8 py-3 text-sm border-2 rounded-xl focus:outline-none appearance-none cursor-pointer ${
                      errors.categoryId ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400'
                    }`}
                  >
                    <option value="">Select a category…</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {CATEGORY_ICONS[c.name] ?? '🔧'} {c.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
          </div>

          {/* Service name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('serviceName')}
              placeholder="e.g. Emergency Drain Cleaning"
              className={inputCls(!!errors.serviceName)}
            />
            {errors.serviceName && <p className="text-xs text-red-500 mt-1">{errors.serviceName.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Describe what's included, your experience, any requirements…"
              className="w-full px-4 py-3 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none resize-none"
            />
          </div>

          {/* Pricing type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Pricing Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['HOURLY', 'FIXED', 'RANGE'] as PricingType[]).map(pt => (
                <label
                  key={pt}
                  className={`flex flex-col items-center gap-1 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    pricingType === pt
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <input type="radio" {...register('pricingType')} value={pt} className="sr-only" />
                  <span className="text-lg">{pt === 'HOURLY' ? '⏱' : pt === 'FIXED' ? '💰' : '📊'}</span>
                  <span className="text-xs font-bold">{pt === 'HOURLY' ? 'Hourly' : pt === 'FIXED' ? 'Fixed' : 'Range'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Conditional price fields */}
          {pricingType === 'HOURLY' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Hourly Rate ($) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('hourlyRate', { valueAsNumber: true })}
                type="number" step="0.01" min="0.01" placeholder="75.00"
                className={inputCls(!!errors.hourlyRate)}
              />
              {errors.hourlyRate && <p className="text-xs text-red-500 mt-1">{errors.hourlyRate.message}</p>}
            </div>
          )}

          {pricingType === 'FIXED' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Fixed Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('fixedPrice', { valueAsNumber: true })}
                type="number" step="0.01" min="0.01" placeholder="150.00"
                className={inputCls(!!errors.fixedPrice)}
              />
              {errors.fixedPrice && <p className="text-xs text-red-500 mt-1">{errors.fixedPrice.message}</p>}
            </div>
          )}

          {pricingType === 'RANGE' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Min Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('minPrice', { valueAsNumber: true })}
                  type="number" step="0.01" min="0.01" placeholder="100.00"
                  className={inputCls(!!errors.minPrice)}
                />
                {errors.minPrice && <p className="text-xs text-red-500 mt-1">{errors.minPrice.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Max Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('maxPrice', { valueAsNumber: true })}
                  type="number" step="0.01" min="0.01" placeholder="300.00"
                  className={inputCls(!!errors.maxPrice)}
                />
                {errors.maxPrice && <p className="text-xs text-red-500 mt-1">{errors.maxPrice.message}</p>}
              </div>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Estimated Duration (hours) <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              {...register('estimatedDurationHours', { valueAsNumber: true })}
              type="number" step="0.5" min="0.5" max="99.9" placeholder="1.5"
              className={inputCls(!!errors.estimatedDurationHours)}
            />
            {errors.estimatedDurationHours && (
              <p className="text-xs text-red-500 mt-1">{errors.estimatedDurationHours.message}</p>
            )}
          </div>

          {/* API error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1 py-3">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><CheckCircle className="w-4 h-4" /> {service ? 'Save Changes' : 'Create Service'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Service card ──────────────────────────────────────────────────────────────
function ServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: ServiceListing
  onEdit: () => void
  onDelete: () => void
}) {
  const badge = getPricingBadge(service.pricingType)
  return (
    <div className={`card p-5 transition-all duration-200 ${!service.isActive ? 'opacity-60 bg-gray-50' : 'hover:shadow-md hover:-translate-y-0.5'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-xs text-gray-400">{service.category.name}</span>
            {!service.isActive && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Inactive
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-900">{service.serviceName}</h3>
          {service.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <span className="flex items-center gap-1 text-sm font-bold text-gray-800">
              <DollarSign className="w-3.5 h-3.5 text-purple-500" />
              {formatPrice(service)}
            </span>
            {service.estimatedDurationHours && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3 text-purple-400" />
                ~{service.estimatedDurationHours}hr
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Deactivate"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteModal({
  service,
  onConfirm,
  onClose,
  loading,
}: {
  service: ServiceListing
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="font-bold text-gray-900 text-center text-lg mb-1">Deactivate Service?</h3>
        <p className="text-sm text-gray-500 text-center mb-1">
          <strong>{service.serviceName}</strong> will be hidden from customers.
        </p>
        <p className="text-xs text-gray-400 text-center mb-6">
          Existing bookings are not affected.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="btn-outline flex-1 py-3">
            Keep It
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Deactivate
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProviderServicesPage() {
  const navigate = useNavigate()

  const [services,     setServices]     = useState<ServiceListing[]>([])
  const [categories,   setCategories]   = useState<CategoryResponse[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editTarget,   setEditTarget]   = useState<ServiceListing | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceListing | null>(null)
  const [deleting,     setDeleting]     = useState(false)
  const [successMsg,   setSuccessMsg]   = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      serviceApi.getMyServices(),
      serviceApi.getCategories(),
    ]).then(([svcs, cats]) => {
      setServices(svcs)
      setCategories(cats)
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleSave = async (data: ServiceListingRequest) => {
    if (editTarget) {
      const updated = await serviceApi.updateService(editTarget.id, data)
      setServices(prev => prev.map(s => s.id === updated.id ? updated : s))
      showSuccess('Service updated successfully')
    } else {
      const created = await serviceApi.createService(data)
      setServices(prev => [created, ...prev])
      showSuccess('Service created! Customers can now find and book it.')
    }
    setShowForm(false)
    setEditTarget(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await serviceApi.deleteService(deleteTarget.id)
      setServices(prev => prev.map(s =>
        s.id === deleteTarget.id ? { ...s, isActive: false } : s
      ))
      setDeleteTarget(null)
      showSuccess('Service deactivated.')
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  const activeServices   = services.filter(s => s.isActive)
  const inactiveServices = services.filter(s => !s.isActive)

  return (
    <div className="min-h-screen bg-brand-surface pb-12">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/provider/dashboard')}
            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-gray-900">My Services</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {activeServices.length} active listing{activeServices.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700 font-medium">{successMsg}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : services.length === 0 ? (
          /* Empty state */
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="font-bold text-gray-700 text-lg mb-2">No services yet</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
              Create your first service listing so customers can find and book you.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mx-auto inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create First Service
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active services */}
            {activeServices.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <ToggleRight className="w-3.5 h-3.5 text-green-500" /> Active ({activeServices.length})
                </p>
                {activeServices.map(s => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    onEdit={() => { setEditTarget(s); setShowForm(true) }}
                    onDelete={() => setDeleteTarget(s)}
                  />
                ))}
              </div>
            )}

            {/* Inactive services */}
            {inactiveServices.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <ToggleLeft className="w-3.5 h-3.5 text-gray-400" /> Inactive ({inactiveServices.length})
                </p>
                {inactiveServices.map(s => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    onEdit={() => { setEditTarget(s); setShowForm(true) }}
                    onDelete={() => setDeleteTarget(s)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <ServiceFormModal
          service={editTarget}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          service={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  )
}