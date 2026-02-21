import { useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { useAppDispatch } from '@/hooks/useAppDispatch'
import { useAuth } from '@/hooks/useAuth'
import { login, clearError } from '@/store/slices/authSlice'
import toast from 'react-hot-toast'

// ── Zod schema matching backend @Valid constraints ────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isLoading, error, isProvider } = useAuth()

  // Where to redirect after login — respect the "from" state set by ProtectedRoute
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const destination = from ?? (isProvider ? '/provider/dashboard' : '/dashboard')
      navigate(destination, { replace: true })
    }
  }, [isAuthenticated, isProvider, navigate, from])

  // Clear store error when component unmounts
  useEffect(() => {
    return () => { dispatch(clearError()) }
  }, [dispatch])

  const onSubmit = async (data: LoginFormData) => {
    const result = await dispatch(login(data))
    if (login.fulfilled.match(result)) {
      toast.success(`Welcome back, ${result.payload.user.name.split(' ')[0]}!`)
    }
  }

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-25 animate-float pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-25 animate-float-delayed-2 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold gradient-text">ServiceLink</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your account to continue</p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-2xl">
          {/* API error banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 w-[18px] h-[18px]" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className={`input-field pl-10 ${errors.email ? 'border-red-400 focus:border-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <a href="#" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`input-field pl-10 ${errors.password ? 'border-red-400 focus:border-red-500' : ''}`}
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-400">Don't have an account?</span>
            </div>
          </div>

          {/* Register links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/register?role=customer"
              className="text-center py-2.5 px-4 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-purple-300 hover:text-purple-700 transition-all duration-200"
            >
              👤 Join as Customer
            </Link>
            <Link
              to="/register?role=provider"
              className="text-center py-2.5 px-4 border-2 border-purple-200 rounded-xl text-sm font-medium text-purple-700 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
            >
              🔧 Become a Provider
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in, you agree to our{' '}
          <a href="#" className="underline hover:text-gray-600">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
