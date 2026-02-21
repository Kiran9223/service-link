interface Props {
  fullPage?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ fullPage, size = 'md' }: Props) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }

  const spinner = (
    <div className={`${sizes[size]} border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin`} />
  )

  if (fullPage) {
    return (
      <div className="min-h-screen bg-brand-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          <p className="text-gray-500 text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  return <div className="flex justify-center py-8">{spinner}</div>
}
