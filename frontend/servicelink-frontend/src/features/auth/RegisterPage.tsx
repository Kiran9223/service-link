import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Zap, User, Mail, Lock, Phone, MapPin, Building2,
  FileText, Award, Shield, Navigation, AlertCircle, Loader2,
  ChevronRight, ChevronLeft, Check,
} from 'lucide-react'
import { useAppDispatch } from '@/hooks/useAppDispatch'
import { useAuth } from '@/hooks/useAuth'
import { registerUser, registerProvider, clearError } from '@/store/slices/authSlice'
import toast from 'react-hot-toast'

// ── Zod schemas matching backend constraints ──────────────────────────────────

const accountSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  phone: z.string()
    .max(20, 'Phone number too long')
    .regex(/^[0-9+\-\s()]*$/, 'Phone contains invalid characters')
    .optional()
    .or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Provider-specific fields schema (Step 2 for providers)
const businessSchema = z.object({
  businessName: z.string()
    .min(1, 'Business name is required')
    .max(255, 'Business name too long'),
  description: z.string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional()
    .or(z.literal('')),
  yearsOfExperience: z.string()
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : parseInt(val, 10)))
    .pipe(z.number().min(0, 'Cannot be negative').max(100, 'Value seems unrealistic').optional()),
  serviceRadiusMiles: z.string()
    .optional()
    .transform((val) => (val === '' || val === undefined ? 25 : parseInt(val, 10)))
    .pipe(z.number().min(1, 'Must be at least 1 mile').max(500, 'Cannot exceed 500 miles')),
  isCertified: z.boolean().default(false),
  isInsured: z.boolean().default(false),
})

type AccountFormData = z.infer<typeof accountSchema>
type BusinessFormData = z.infer<typeof businessSchema>

type RoleType = 'customer' | 'provider'

// ── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps, labels }: {
  currentStep: number
  totalSteps: number
  labels: string[]
}) {
  return (
    <div className="flex items-center justify-center mb-8">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              i < currentStep
                ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-md'
                : i === currentStep
                ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg ring-4 ring-purple-100'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium ${i === currentStep ? 'text-purple-700' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < totalSteps - 1 && (
            <div className={`w-16 h-0.5 mx-2 mb-4 transition-all duration-300 ${i < currentStep ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Field component for cleaner JSX ─────────────────────────────────────────
function FormField({ label, error, children }: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

function InputWithIcon({ icon: Icon, error, ...props }: {
  icon: React.ElementType
  error?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
      <input
        className={`input-field pl-10 ${error ? 'border-red-400 focus:border-red-500' : ''}`}
        {...props}
      />
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, isLoading, error } = useAuth()

  // Default role from URL param: /register?role=provider
  const defaultRole = (searchParams.get('role') === 'provider' ? 'provider' : 'customer') as RoleType
  const [role, setRole] = useState<RoleType>(defaultRole)
  const [step, setStep] = useState(0) // 0 = account info, 1 = business info (provider only)
  const [accountData, setAccountData] = useState<AccountFormData | null>(null)

  const isProvider = role === 'provider'
  const steps = isProvider ? ['Account Info', 'Business Info'] : ['Account Info']

  // Account form (Step 0 for everyone)
  const accountForm = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: { serviceRadiusMiles: 25 } as never,
  })

  // Business form (Step 1 for providers)
  const businessForm = useForm<BusinessFormData, unknown, BusinessFormData>({
    resolver: zodResolver(businessSchema) as never,
    defaultValues: { serviceRadiusMiles: 25, isCertified: false, isInsured: false },
  })

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    return () => { dispatch(clearError()) }
  }, [dispatch])

  // Reset to step 0 when role changes
  const handleRoleChange = (newRole: RoleType) => {
    setRole(newRole)
    setStep(0)
    accountForm.reset()
    businessForm.reset({ serviceRadiusMiles: 25, isCertified: false, isInsured: false })
  }

  const handleAccountSubmit = (data: AccountFormData) => {
    if (isProvider) {
      setAccountData(data)
      setStep(1)
    } else {
      // Customer: submit directly
      void submitCustomer(data)
    }
  }

  const submitCustomer = async (data: AccountFormData) => {
    const result = await dispatch(registerUser({
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      postalCode: data.postalCode || undefined,
    }))
    if (registerUser.fulfilled.match(result)) {
      toast.success(`Welcome to ServiceLink, ${result.payload.user.name.split(' ')[0]}! 🎉`)
      navigate('/dashboard', { replace: true })
    }
  }

  const handleBusinessSubmit = async (bizData: BusinessFormData) => {
    if (!accountData) return
    const result = await dispatch(registerProvider({
      name: accountData.name,
      email: accountData.email,
      password: accountData.password,
      phone: accountData.phone || undefined,
      city: accountData.city || undefined,
      state: accountData.state || undefined,
      postalCode: accountData.postalCode || undefined,
      businessName: bizData.businessName,
      description: bizData.description || undefined,
      yearsOfExperience: bizData.yearsOfExperience,
      isCertified: bizData.isCertified,
      isInsured: bizData.isInsured,
      serviceRadiusMiles: bizData.serviceRadiusMiles,
    }))
    if (registerProvider.fulfilled.match(result)) {
      toast.success(`Welcome to ServiceLink, ${result.payload.user.name.split(' ')[0]}! 🎉`)
      navigate('/provider/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-25 animate-float pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-25 animate-float-delayed-4 pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold gradient-text">ServiceLink</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Create your account</h1>
          <p className="text-gray-500 mt-1">Join thousands of users connecting with local services</p>
        </div>

        <div className="card p-8 shadow-2xl">
          {/* Role toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['customer', 'provider'] as RoleType[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  role === r
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {r === 'customer' ? '👤 I Need Services' : '🔧 I Provide Services'}
              </button>
            ))}
          </div>

          {/* Step indicator — only show for providers (2 steps) */}
          {isProvider && (
            <StepIndicator currentStep={step} totalSteps={steps.length} labels={steps} />
          )}

          {/* API error */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ── Step 0: Account Info ─────────────────────────────────────── */}
          {step === 0 && (
            <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4" noValidate>
              <FormField label="Full Name *" error={accountForm.formState.errors.name?.message}>
                <InputWithIcon
                  icon={User}
                  type="text"
                  placeholder="Jane Smith"
                  autoComplete="name"
                  error={!!accountForm.formState.errors.name}
                  {...accountForm.register('name')}
                />
              </FormField>

              <FormField label="Email Address *" error={accountForm.formState.errors.email?.message}>
                <InputWithIcon
                  icon={Mail}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  error={!!accountForm.formState.errors.email}
                  {...accountForm.register('email')}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Password *" error={accountForm.formState.errors.password?.message}>
                  <InputWithIcon
                    icon={Lock}
                    type="password"
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    error={!!accountForm.formState.errors.password}
                    {...accountForm.register('password')}
                  />
                </FormField>
                <FormField label="Confirm Password *" error={accountForm.formState.errors.confirmPassword?.message}>
                  <InputWithIcon
                    icon={Lock}
                    type="password"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    error={!!accountForm.formState.errors.confirmPassword}
                    {...accountForm.register('confirmPassword')}
                  />
                </FormField>
              </div>

              <FormField label="Phone Number" error={accountForm.formState.errors.phone?.message}>
                <InputWithIcon
                  icon={Phone}
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                  error={!!accountForm.formState.errors.phone}
                  {...accountForm.register('phone')}
                />
              </FormField>

              {/* Location — optional section */}
              <div className="pt-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Location (Optional)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <input
                      placeholder="City"
                      className="input-field text-sm"
                      {...accountForm.register('city')}
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      placeholder="State"
                      className="input-field text-sm"
                      {...accountForm.register('state')}
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      placeholder="ZIP"
                      className="input-field text-sm"
                      {...accountForm.register('postalCode')}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                ) : isProvider ? (
                  <>Continue <ChevronRight className="w-4 h-4" /></>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          {/* ── Step 1: Business Info (providers only) ────────────────────── */}
          {step === 1 && isProvider && (
            <form onSubmit={businessForm.handleSubmit(handleBusinessSubmit as never)} className="space-y-4" noValidate>
              <FormField label="Business Name *" error={businessForm.formState.errors.businessName?.message}>
                <InputWithIcon
                  icon={Building2}
                  type="text"
                  placeholder="Smith Plumbing Services"
                  error={!!businessForm.formState.errors.businessName}
                  {...businessForm.register('businessName')}
                />
              </FormField>

              <FormField label="Business Description" error={businessForm.formState.errors.description?.message}>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-gray-400" />
                  <textarea
                    rows={3}
                    placeholder="Describe your services, specialties, and what makes you stand out..."
                    className="input-field pl-10 resize-none"
                    {...businessForm.register('description')}
                  />
                </div>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Years of Experience" error={businessForm.formState.errors.yearsOfExperience?.message}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="5"
                    className="input-field"
                    {...businessForm.register('yearsOfExperience')}
                  />
                </FormField>
                <FormField label="Service Radius (miles)" error={businessForm.formState.errors.serviceRadiusMiles?.message}>
                  <InputWithIcon
                    icon={Navigation}
                    type="number"
                    min={1}
                    max={500}
                    placeholder="25"
                    error={!!businessForm.formState.errors.serviceRadiusMiles}
                    {...businessForm.register('serviceRadiusMiles')}
                  />
                </FormField>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Credentials</p>
                <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 transition-colors group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-purple-600"
                    {...businessForm.register('isCertified')}
                  />
                  <Award className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">I am certified</p>
                    <p className="text-xs text-gray-400">I hold relevant industry certifications</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 transition-colors group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-purple-600"
                    {...businessForm.register('isInsured')}
                  />
                  <Shield className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">I am insured</p>
                    <p className="text-xs text-gray-400">My business has liability insurance</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="btn-ghost flex items-center gap-1 px-5"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary flex-1 py-3.5 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                  ) : (
                    'Create Provider Account'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Sign in link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-600 font-semibold hover:text-purple-700">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By creating an account, you agree to our{' '}
          <a href="#" className="underline hover:text-gray-600">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
