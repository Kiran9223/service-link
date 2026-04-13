import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import StarRating from './StarRating'
import { ratingApi } from '@/api/ratingApi'
import type { RatingResponse } from '@/types/rating.types'

interface ReviewFormProps {
  bookingId: number
  onSuccess: (rating: RatingResponse) => void
}

export default function ReviewForm({ bookingId, onSuccess }: ReviewFormProps) {
  const [stars, setStars] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (stars === 0) {
      setError('Please select a star rating.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const rating = await ratingApi.submitRating({
        bookingId,
        stars,
        reviewText: reviewText.trim() || undefined,
      })
      onSuccess(rating)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Your rating</p>
        <StarRating value={stars} onChange={setStars} size="lg" />
        {stars > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][stars]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="review-text" className="text-sm font-semibold text-gray-700 block mb-1.5">
          Write a review <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="review-text"
          value={reviewText}
          onChange={e => setReviewText(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="How was your experience? Any details help future customers…"
          className="w-full px-4 py-3 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl focus:outline-none resize-none"
        />
        <p className="text-xs text-gray-400 text-right mt-0.5">{reviewText.length}/2000</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || stars === 0}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        Submit Review
      </button>
    </form>
  )
}
