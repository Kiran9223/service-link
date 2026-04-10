import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Mail, AlertCircle, Loader2, Copy, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/api/authApi'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const res = await authApi.forgotPassword(data.email)
      setResetToken(res.resetToken)
      toast.success('Reset token generated!')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'No account found for that email')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToken = () => {
    if (!resetToken) return
    navigator.clipboard.writeText(resetToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center px-4 py-12 relative overflow-hidden">
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
          <h1 className="text-2xl font-bold text-gray-800">Reset your password</h1>
          <p className="text-gray-500 mt-1">Enter your email to receive a reset token</p>
        </div>

        <div className="card p-8 shadow-2xl">
          {!resetToken ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
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

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating token...
                  </>
                ) : (
                  'Get Reset Token'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">
                  Your reset token is ready. Copy it and use it on the next page — it expires in 30 minutes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reset Token
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={resetToken}
                    className="input-field font-mono text-xs flex-1 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={copyToken}
                    className="px-3 py-2 border-2 border-gray-200 rounded-xl hover:border-purple-300 transition-colors"
                    title="Copy token"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`)}
                className="btn-primary w-full py-3.5"
              >
                Continue to Reset Password →
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
