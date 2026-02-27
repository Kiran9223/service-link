import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, SlidersHorizontal, Star, Clock, ChevronDown,
  X, ArrowRight, AlertCircle, Filter,
  Wrench, Zap, Snowflake, Sparkles, Leaf, Hammer,
  Paintbrush, TreePine, Home, Lock, Grid3x3, List,
} from 'lucide-react'
import { serviceApi } from '@/api/serviceApi'
import type { ServiceListing, CategoryResponse, PricingType, SortOption, ServiceFilters } from '@/types/service.types'
import { formatPriceShort, getPricingBadge } from '@/utils/priceUtils'

// ── Category icon map ─────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Plumbing':   Wrench,
  'Electrical': Zap,
  'HVAC':       Snowflake,
  'Cleaning':   Sparkles,
  'Lawn Care':  Leaf,
  'Handyman':   Hammer,
  'Painting':   Paintbrush,
  'Carpentry':  TreePine,
  'Roofing':    Home,
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

// ── Star rating display ───────────────────────────────────────────────────────
function StarRating({ rating, count }: { rating: number | null; count: number | null }) {
  if (!rating) return <span className="text-xs text-gray-400">No reviews yet</span>
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-semibold text-gray-700">{rating.toFixed(1)}</span>
      {count != null && <span className="text-xs text-gray-400">({count})</span>}
    </div>
  )
}

// ── Service Card ──────────────────────────────────────────────────────────────
function ServiceCard({ service, view }: { service: ServiceListing; view: 'grid' | 'list' }) {
  const navigate = useNavigate()
  const badge    = getPricingBadge(service.pricingType)
  const gradient = CATEGORY_GRADIENTS[service.category.name] ?? 'from-purple-500 to-blue-500'
  const Icon     = CATEGORY_ICONS[service.category.name] ?? Wrench

  if (view === 'list') {
    return (
      <div
        onClick={() => navigate(`/services/${service.id}`)}
        className="card p-5 flex items-center gap-5 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group"
      >
        {/* Category icon */}
        <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform`}>
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{service.category.name}</p>
              <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-purple-700 transition-colors">
                {service.serviceName}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 font-medium">{service.provider.businessName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-gray-900 text-base">{formatPriceShort(service)}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <StarRating rating={service.provider.overallRating} count={service.provider.totalBookingsCompleted} />
            {service.estimatedDurationHours && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> ~{service.estimatedDurationHours}hr
              </span>
            )}
            {service.provider.yearsOfExperience && (
              <span className="text-xs text-gray-400">{service.provider.yearsOfExperience} yrs exp</span>
            )}
          </div>
        </div>

        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>
    )
  }

  // Grid view
  return (
    <div
      onClick={() => navigate(`/services/${service.id}`)}
      className="card overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group flex flex-col"
    >
      {/* Colored header */}
      <div className={`bg-gradient-to-br ${gradient} p-5 relative overflow-hidden`}>
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-4 w-24 h-24 bg-black/10 rounded-full" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-bold bg-white/20 text-white px-2.5 py-1 rounded-full">
            {service.category.name}
          </span>
        </div>
        <h3 className="relative z-10 text-white font-bold text-lg mt-3 leading-tight group-hover:underline underline-offset-2">
          {service.serviceName}
        </h3>
        <p className="relative z-10 text-white/75 text-xs mt-0.5">{service.provider.businessName}</p>
      </div>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 flex-1">
          {service.description}
        </p>

        <div className="mt-4 space-y-2.5">
          {/* Rating row */}
          <div className="flex items-center justify-between">
            <StarRating rating={service.provider.overallRating} count={service.provider.totalBookingsCompleted} />
            {service.estimatedDurationHours && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> ~{service.estimatedDurationHours}hr
              </span>
            )}
          </div>

          {/* Price row */}
          <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Starting from</p>
              <p className="font-bold text-gray-900 text-base">{formatPriceShort(service)}</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.color}`}>
              {badge.label}
            </span>
          </div>
        </div>

        <button className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 hover:shadow-md">
          View Details
        </button>
      </div>
    </div>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonCard({ view }: { view: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className="card p-5 flex items-center gap-5 animate-pulse">
        <div className="w-14 h-14 bg-gray-200 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="w-20 h-6 bg-gray-200 rounded-full" />
      </div>
    )
  }
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-32 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  )
}

// ── Sort helper ───────────────────────────────────────────────────────────────
function sortServices(services: ServiceListing[], sort: SortOption): ServiceListing[] {
  const copy = [...services]
  switch (sort) {
    case 'rating':
      return copy.sort((a, b) => (b.provider.overallRating ?? 0) - (a.provider.overallRating ?? 0))
    case 'price_asc':
      return copy.sort((a, b) => {
        const pa = a.hourlyRate ?? a.fixedPrice ?? a.minPrice ?? 0
        const pb = b.hourlyRate ?? b.fixedPrice ?? b.minPrice ?? 0
        return pa - pb
      })
    case 'price_desc':
      return copy.sort((a, b) => {
        const pa = a.hourlyRate ?? a.fixedPrice ?? a.minPrice ?? 0
        const pb = b.hourlyRate ?? b.fixedPrice ?? b.minPrice ?? 0
        return pb - pa
      })
    case 'newest':
    default:
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ServicesPage() {
  const navigate      = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── State ──────────────────────────────────────────────────────────────────
  const [categories,   setCategories]   = useState<CategoryResponse[]>([])
  const [services,     setServices]     = useState<ServiceListing[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [view,         setView]         = useState<'grid' | 'list'>('grid')
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [searchInput,  setSearchInput]  = useState(searchParams.get('q') ?? '')

  // Filters — URL params are source of truth
  const [filters, setFilters] = useState<ServiceFilters>({
    categoryId:  searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : null,
    pricingType: (searchParams.get('pricingType') as PricingType) ?? null,
    maxPrice:    searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null,
    sort:        (searchParams.get('sort') as SortOption) ?? 'newest',
  })

  // ── Load categories once ───────────────────────────────────────────────────
  useEffect(() => {
    serviceApi.getCategories()
      .then(cats => {
        // Sort by displayOrder descending (higher = first, matching V4 seed)
        setCategories([...cats].sort((a, b) => b.displayOrder - a.displayOrder))

        // If URL has category name (from homepage), resolve to ID
        const catName = searchParams.get('category')
        if (catName) {
          const match = cats.find(c => c.name.toLowerCase() === catName.toLowerCase())
          if (match) {
            setFilters(f => ({ ...f, categoryId: match.id }))
          }
        }
      })
      .catch(() => {}) // categories failure is non-fatal
  }, [])

  // ── Fetch services when category changes (API call) ──────────────────────
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true)
      setError(null)
      try {
        let data: ServiceListing[]

        if (filters.categoryId) {
          // Category selected — use category endpoint (search endpoint used below client-side)
          data = await serviceApi.getServicesByCategory(filters.categoryId)
        } else {
          // No category — load all categories and merge
          const allCats = categories.length ? categories : await serviceApi.getCategories()
          const results = await Promise.all(
            allCats.map(c => serviceApi.getServicesByCategory(c.id).catch(() => []))
          )
          data = results.flat()
        }

        setServices(data.filter(s => s.isActive))
      } catch (err: any) {
        setError('Failed to load services. Please try again.')
        setServices([])
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [filters.categoryId, categories])

  // ── Sync filters → URL params ──────────────────────────────────────────────
  useEffect(() => {
    const params: Record<string, string> = {}
    if (filters.categoryId)  params.categoryId  = String(filters.categoryId)
    if (filters.pricingType) params.pricingType = filters.pricingType
    if (filters.maxPrice)    params.maxPrice    = String(filters.maxPrice)
    if (filters.sort !== 'newest') params.sort  = filters.sort
    if (searchInput)         params.q           = searchInput
    setSearchParams(params, { replace: true })
  }, [filters, searchInput])

  // ── Client-side search + filters + sort ──────────────────────────────────
  const displayedServices = useMemo(() => {
    let list = services

    // Text search
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase()
      list = list.filter(s =>
        s.serviceName.toLowerCase().includes(q) ||
        s.provider.businessName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.name.toLowerCase().includes(q)
      )
    }

    // Pricing type filter (client-side — works with or without category)
    if (filters.pricingType) {
      list = list.filter(s => s.pricingType === filters.pricingType)
    }

    // Max price filter (client-side)
    if (filters.maxPrice) {
      list = list.filter(s => {
        const price = s.hourlyRate ?? s.fixedPrice ?? s.minPrice ?? 0
        return price <= filters.maxPrice!
      })
    }

    return sortServices(list, filters.sort)
  }, [services, searchInput, filters.pricingType, filters.maxPrice, filters.sort])

  const activeFilterCount = [
    filters.categoryId,
    filters.pricingType,
    filters.maxPrice,
  ].filter(Boolean).length

  const clearFilters = useCallback(() => {
    setFilters({ categoryId: null, pricingType: null, maxPrice: null, sort: 'newest' })
    setSearchInput('')
  }, [])

  const selectedCategory = categories.find(c => c.id === filters.categoryId)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-surface">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search services, providers…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none transition-colors"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Filter toggle (mobile) */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className={`lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
              sidebarOpen || activeFilterCount > 0
                ? 'border-purple-400 bg-purple-50 text-purple-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort dropdown */}
          <div className="relative hidden sm:block">
            <select
              value={filters.sort}
              onChange={e => setFilters(f => ({ ...f, sort: e.target.value as SortOption }))}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none bg-white cursor-pointer transition-colors"
            >
              <option value="newest">Newest First</option>
              <option value="rating">Highest Rated</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* View toggle */}
          <div className="hidden sm:flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-white shadow text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-2 hover:bg-red-50 rounded-xl transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {(selectedCategory || filters.pricingType || filters.maxPrice) && (
          <div className="max-w-7xl mx-auto px-4 pb-2.5 flex items-center gap-2 flex-wrap">
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                {selectedCategory.name}
                <button onClick={() => setFilters(f => ({ ...f, categoryId: null }))}>
                  <X className="w-3 h-3 hover:text-purple-900" />
                </button>
              </span>
            )}
            {filters.pricingType && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                {filters.pricingType}
                <button onClick={() => setFilters(f => ({ ...f, pricingType: null }))}>
                  <X className="w-3 h-3 hover:text-blue-900" />
                </button>
              </span>
            )}
            {filters.maxPrice && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                Max ${filters.maxPrice}
                <button onClick={() => setFilters(f => ({ ...f, maxPrice: null }))}>
                  <X className="w-3 h-3 hover:text-green-900" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* ── SIDEBAR ────────────────────────────────────────────────────── */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-20 w-72 bg-white lg:bg-transparent
          lg:w-64 flex-shrink-0 overflow-y-auto lg:overflow-visible
          transition-transform duration-300 lg:translate-x-0 shadow-xl lg:shadow-none
          pt-28 lg:pt-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-4 lg:p-0 pt-20 lg:pt-0 space-y-5 lg:sticky lg:top-48 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

            {/* Mobile sidebar header */}
            <div className="flex items-center justify-between lg:hidden mb-4">
              <p className="font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-600" /> Filters
              </p>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Category filter */}
            <div className="card p-4">
              <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Grid3x3 className="w-4 h-4 text-purple-600" /> Category
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => setFilters(f => ({ ...f, categoryId: null }))}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    !filters.categoryId ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Categories
                </button>
                {categories.map(cat => {
                  const Icon = CATEGORY_ICONS[cat.name] ?? Wrench
                  const isSelected = filters.categoryId === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setFilters(f => ({ ...f, categoryId: cat.id })); setSidebarOpen(false) }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                        isSelected ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Pricing type filter */}
            <div className="card p-4">
              <p className="text-sm font-bold text-gray-800 mb-3">Pricing Type</p>
              <div className="space-y-2">
                {([null, 'HOURLY', 'FIXED', 'RANGE'] as const).map(type => (
                  <label key={type ?? 'all'} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="pricingType"
                      checked={filters.pricingType === type}
                      onChange={() => setFilters(f => ({ ...f, pricingType: type }))}
                      className="accent-purple-600"
                    />
                    <span className={`text-sm font-medium transition-colors ${
                      filters.pricingType === type ? 'text-purple-700' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {type === null ? 'Any' : type === 'HOURLY' ? 'Hourly Rate' : type === 'FIXED' ? 'Fixed Price' : 'Price Range'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Max price filter */}
            <div className="card p-4">
              <p className="text-sm font-bold text-gray-800 mb-3">Max Price</p>
              <div className="space-y-2">
                {[null, 100, 200, 500, 1000].map(price => (
                  <label key={price ?? 'any'} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="maxPrice"
                      checked={filters.maxPrice === price}
                      onChange={() => setFilters(f => ({ ...f, maxPrice: price }))}
                      className="accent-purple-600"
                    />
                    <span className={`text-sm font-medium transition-colors ${
                      filters.maxPrice === price ? 'text-purple-700' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {price === null ? 'Any price' : `Under $${price}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="w-full py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border-2 border-red-200 hover:border-red-300 rounded-xl transition-colors">
                Clear All Filters
              </button>
            )}
          </div>
        </aside>

        {/* Sidebar backdrop (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">

          {/* Result count + breadcrumb */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">
                {loading ? 'Loading…' : (
                  <>
                    <span className="font-bold text-gray-900">{displayedServices.length}</span>
                    {' '}service{displayedServices.length !== 1 ? 's' : ''} found
                    {selectedCategory && <> in <span className="text-purple-600 font-semibold">{selectedCategory.name}</span></>}
                    {searchInput && <> matching <span className="text-purple-600 font-semibold">"{searchInput}"</span></>}
                  </>
                )}
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-gray-400 hover:text-purple-600 transition-colors hidden sm:block"
            >
              ← Back to Home
            </button>
          </div>

          {/* Error state */}
          {error && (
            <div className="card p-6 flex items-center gap-4 border-red-200 bg-red-50 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-700">{error}</p>
                <button
                  onClick={() => setFilters(f => ({ ...f }))}
                  className="text-sm text-red-500 hover:text-red-700 underline mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className={view === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
              : 'space-y-3'
            }>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} view={view} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && displayedServices.length === 0 && (
            <div className="card p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">No services found</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                Try adjusting your filters or search terms to find what you're looking for.
              </p>
              <button onClick={clearFilters} className="btn-primary mx-auto">
                Clear All Filters
              </button>
            </div>
          )}

          {/* Service grid / list */}
          {!loading && displayedServices.length > 0 && (
            <div className={view === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
              : 'space-y-3'
            }>
              {displayedServices.map(service => (
                <ServiceCard key={service.id} service={service} view={view} />
              ))}
            </div>
          )}

          {/* Footer nudge */}
          {!loading && displayedServices.length > 0 && (
            <div className="mt-10 text-center py-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">
                Not finding what you need? Try our AI assistant.
              </p>
              <button
                onClick={() => navigate('/')}
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                Book with AI in &lt;60s <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}