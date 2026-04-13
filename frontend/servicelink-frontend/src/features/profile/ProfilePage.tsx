import { useState, useEffect } from 'react'
import {
  User, Mail, Phone, MapPin, Briefcase, Shield,
  Pencil, CheckCircle, X, Loader2, AlertCircle,
  Star, Calendar, Award, Wrench,
} from 'lucide-react'
import { userApi } from '@/api/userApi'
import type { UserProfile, UpdateUserProfileRequest, UpdateProviderProfileRequest } from '@/api/userApi'
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch'
import { updateUser } from '@/store/slices/authSlice'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
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

// ── Field row (view mode) ─────────────────────────────────────────────────────
function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 flex-shrink-0 w-36">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">
        {value != null && value !== '' ? String(value) : <span className="text-gray-300 font-normal">—</span>}
      </span>
    </div>
  )
}

// ── Text input ────────────────────────────────────────────────────────────────
function TextInput({ label, value, onChange, placeholder, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none"
      />
    </div>
  )
}

// ── Textarea input ────────────────────────────────────────────────────────────
function TextareaInput({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none resize-none"
      />
    </div>
  )
}

// ── Toggle checkbox ───────────────────────────────────────────────────────────
function Toggle({ label, checked, onChange }: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${checked ? 'bg-purple-600' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </label>
  )
}

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const isProvider = role === 'SERVICE_PROVIDER'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
      isProvider
        ? 'bg-purple-100 text-purple-700'
        : 'bg-blue-100 text-blue-700'
    }`}>
      {isProvider ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
      {isProvider ? 'Service Provider' : 'Customer'}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const dispatch = useAppDispatch()
  const reduxUser = useAppSelector(s => s.auth.user)

  const [profile, setProfile]         = useState<UserProfile | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  // Personal info edit state
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [savingPersonal, setSavingPersonal]   = useState(false)
  const [personalError, setPersonalError]     = useState<string | null>(null)
  const [personalForm, setPersonalForm] = useState<UpdateUserProfileRequest>({})

  // Provider info edit state
  const [editingProvider, setEditingProvider] = useState(false)
  const [savingProvider, setSavingProvider]   = useState(false)
  const [providerError, setProviderError]     = useState<string | null>(null)
  const [providerForm, setProviderForm] = useState<UpdateProviderProfileRequest>({})

  useEffect(() => {
    userApi.getMyProfile()
      .then(p => {
        setProfile(p)
        setPersonalForm({
          name:       p.name,
          phone:      p.phone ?? '',
          city:       p.city ?? '',
          state:      p.state ?? '',
          postalCode: p.postalCode ?? '',
        })
        setProviderForm({
          businessName:       p.businessName ?? '',
          description:        p.description ?? '',
          yearsOfExperience:  p.yearsOfExperience ?? 0,
          isCertified:        p.isCertified ?? false,
          isInsured:          p.isInsured ?? false,
          serviceRadiusMiles: p.serviceRadiusMiles ?? 25,
        })
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSavePersonal = async () => {
    setSavingPersonal(true)
    setPersonalError(null)
    try {
      const updated = await userApi.updateMyProfile(personalForm)
      setProfile(updated)
      // Sync name/location into Redux so Navbar stays up to date
      if (reduxUser) {
        dispatch(updateUser({
          ...reduxUser,
          name:       updated.name,
          phone:      updated.phone,
          city:       updated.city,
          state:      updated.state,
          postalCode: updated.postalCode,
        }))
      }
      setEditingPersonal(false)
    } catch (err: any) {
      setPersonalError(err?.response?.data?.message ?? 'Save failed. Please try again.')
    } finally {
      setSavingPersonal(false)
    }
  }

  const handleSaveProvider = async () => {
    setSavingProvider(true)
    setProviderError(null)
    try {
      const updated = await userApi.updateMyProviderProfile(providerForm)
      setProfile(updated)
      setEditingProvider(false)
    } catch (err: any) {
      setProviderError(err?.response?.data?.message ?? 'Save failed. Please try again.')
    } finally {
      setSavingProvider(false)
    }
  }

  const cancelPersonal = () => {
    if (!profile) return
    setPersonalForm({
      name:       profile.name,
      phone:      profile.phone ?? '',
      city:       profile.city ?? '',
      state:      profile.state ?? '',
      postalCode: profile.postalCode ?? '',
    })
    setPersonalError(null)
    setEditingPersonal(false)
  }

  const cancelProvider = () => {
    if (!profile) return
    setProviderForm({
      businessName:       profile.businessName ?? '',
      description:        profile.description ?? '',
      yearsOfExperience:  profile.yearsOfExperience ?? 0,
      isCertified:        profile.isCertified ?? false,
      isInsured:          profile.isInsured ?? false,
      serviceRadiusMiles: profile.serviceRadiusMiles ?? 25,
    })
    setProviderError(null)
    setEditingProvider(false)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-500">{error ?? 'Profile not found.'}</p>
      </div>
    )
  }

  const isProvider = profile.role === 'SERVICE_PROVIDER'
  const initials   = getInitials(profile.name)

  return (
    <div className="min-h-screen bg-brand-surface pb-12">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Avatar + identity header ──────────────────────────────────── */}
        <div className="card p-6 mb-6 flex items-center gap-5">
          {/* Avatar circle with initials */}
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white font-extrabold text-2xl">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 truncate">{profile.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <RoleBadge role={profile.role} />
              {profile.emailVerified && (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-semibold">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Account stats row ─────────────────────────────────────────── */}
        <div className={`grid gap-4 mb-6 ${isProvider ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="card p-4 text-center">
            <Calendar className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400 font-medium">Member Since</p>
            <p className="text-xs font-bold text-gray-700 mt-0.5">
              {profile.createdAt ? formatDate(profile.createdAt) : '—'}
            </p>
          </div>
          {isProvider && (
            <div className="card p-4 text-center">
              <Wrench className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400 font-medium">Jobs Done</p>
              <p className="text-xl font-extrabold text-gray-900 mt-0.5">
                {profile.totalBookingsCompleted ?? 0}
              </p>
            </div>
          )}
          {isProvider && (
            <div className="card p-4 text-center">
              <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400 font-medium">Rating</p>
              <p className="text-xl font-extrabold text-gray-900 mt-0.5">
                {profile.overallRating != null ? Number(profile.overallRating).toFixed(1) : '—'}
              </p>
            </div>
          )}
          {!isProvider && (
            <div className="card p-4 text-center">
              <Shield className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400 font-medium">Account Status</p>
              <p className="text-xs font-bold text-green-600 mt-0.5">
                {profile.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
          )}
        </div>

        {/* ── Personal information section ──────────────────────────────── */}
        <div className="mb-4">
          <Section title="Personal Information" icon={User}>
            {!editingPersonal ? (
              <>
                <FieldRow label="Full Name"    value={profile.name} />
                <FieldRow label="Email"        value={profile.email} />
                <FieldRow label="Phone"        value={profile.phone} />
                <FieldRow label="City"         value={profile.city} />
                <FieldRow label="State"        value={profile.state} />
                <FieldRow label="Postal Code"  value={profile.postalCode} />
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setEditingPersonal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <TextInput
                  label="Full Name" required
                  value={personalForm.name ?? ''}
                  onChange={v => setPersonalForm(f => ({ ...f, name: v }))}
                  placeholder="Your full name"
                />
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    Email address cannot be changed here.
                  </p>
                </div>
                <TextInput
                  label="Phone"
                  value={personalForm.phone ?? ''}
                  onChange={v => setPersonalForm(f => ({ ...f, phone: v }))}
                  placeholder="e.g. 555-867-5309"
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    label="City"
                    value={personalForm.city ?? ''}
                    onChange={v => setPersonalForm(f => ({ ...f, city: v }))}
                    placeholder="Fullerton"
                  />
                  <TextInput
                    label="State"
                    value={personalForm.state ?? ''}
                    onChange={v => setPersonalForm(f => ({ ...f, state: v }))}
                    placeholder="CA"
                  />
                </div>
                <TextInput
                  label="Postal Code"
                  value={personalForm.postalCode ?? ''}
                  onChange={v => setPersonalForm(f => ({ ...f, postalCode: v }))}
                  placeholder="92831"
                />
                {personalError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{personalError}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={cancelPersonal}
                    disabled={savingPersonal}
                    className="btn-outline flex-1 py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button
                    onClick={handleSavePersonal}
                    disabled={savingPersonal || !personalForm.name?.trim()}
                    className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {savingPersonal
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      : <><CheckCircle className="w-4 h-4" /> Save Changes</>
                    }
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ── Provider information section (provider only) ──────────────── */}
        {isProvider && (
          <div className="mb-4">
            <Section title="Business Information" icon={Briefcase}>
              {!editingProvider ? (
                <>
                  <FieldRow label="Business Name"    value={profile.businessName} />
                  <FieldRow label="Bio"              value={profile.description} />
                  <FieldRow label="Experience"
                    value={profile.yearsOfExperience != null
                      ? `${profile.yearsOfExperience} year${profile.yearsOfExperience !== 1 ? 's' : ''}`
                      : null}
                  />
                  <FieldRow label="Service Radius"
                    value={profile.serviceRadiusMiles != null
                      ? `${profile.serviceRadiusMiles} miles`
                      : null}
                  />
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Certified</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${profile.isCertified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {profile.isCertified ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-500">Insured</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${profile.isInsured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {profile.isInsured ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setEditingProvider(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <TextInput
                    label="Business Name" required
                    value={providerForm.businessName ?? ''}
                    onChange={v => setProviderForm(f => ({ ...f, businessName: v }))}
                    placeholder="e.g. Swift Plumbing Services"
                  />
                  <TextareaInput
                    label="Bio / Description"
                    value={providerForm.description ?? ''}
                    onChange={v => setProviderForm(f => ({ ...f, description: v }))}
                    placeholder="Tell customers about your experience and services…"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput
                      label="Years of Experience"
                      value={String(providerForm.yearsOfExperience ?? '')}
                      onChange={v => setProviderForm(f => ({ ...f, yearsOfExperience: v === '' ? undefined : Number(v) }))}
                      placeholder="5"
                    />
                    <TextInput
                      label="Service Radius (miles)"
                      value={String(providerForm.serviceRadiusMiles ?? '')}
                      onChange={v => setProviderForm(f => ({ ...f, serviceRadiusMiles: v === '' ? undefined : Number(v) }))}
                      placeholder="25"
                    />
                  </div>
                  <div className="space-y-3 pt-1">
                    <Toggle
                      label="Licensed / Certified"
                      checked={providerForm.isCertified ?? false}
                      onChange={v => setProviderForm(f => ({ ...f, isCertified: v }))}
                    />
                    <Toggle
                      label="Insured"
                      checked={providerForm.isInsured ?? false}
                      onChange={v => setProviderForm(f => ({ ...f, isInsured: v }))}
                    />
                  </div>
                  {providerError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{providerError}</p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={cancelProvider}
                      disabled={savingProvider}
                      className="btn-outline flex-1 py-2.5 flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                      onClick={handleSaveProvider}
                      disabled={savingProvider || !providerForm.businessName?.trim()}
                      className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {savingProvider
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                        : <><CheckCircle className="w-4 h-4" /> Save Changes</>
                      }
                    </button>
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ── Credentials section (read-only) ──────────────────────────── */}
        <Section title="Account & Security" icon={Award}>
          <FieldRow label="Role"          value={isProvider ? 'Service Provider' : 'Customer'} />
          <FieldRow label="Status"        value={profile.isActive ? 'Active' : 'Inactive'} />
          <FieldRow label="Email Verified" value={profile.emailVerified ? 'Yes' : 'No'} />
          {profile.lastLoginAt && (
            <FieldRow label="Last Login"  value={formatDate(profile.lastLoginAt)} />
          )}
          <div className="mt-3 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400">
              To change your password, use the <a href="/forgot-password" className="text-purple-600 font-semibold hover:underline">Forgot Password</a> flow.
            </p>
          </div>
        </Section>

      </div>
    </div>
  )
}
