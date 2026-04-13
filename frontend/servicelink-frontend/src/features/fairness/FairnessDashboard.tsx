import { useEffect, useState } from 'react'
import { analyticsApi } from '@/api/analyticsApi'
import type { FairnessMetric } from '@/api/analyticsApi'
import StarRating from '@/components/rating/StarRating'
import { BarChart2, Zap, Info, TrendingUp } from 'lucide-react'

export default function FairnessDashboard() {
  const [metrics, setMetrics] = useState<FairnessMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<keyof FairnessMetric>('finalScore')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    analyticsApi.getFairnessMetrics()
      .then(setMetrics)
      .catch(() => setError('Failed to load fairness metrics.'))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...metrics].sort((a, b) => {
    const av = a[sortField] as number
    const bv = b[sortField] as number
    return sortAsc ? av - bv : bv - av
  })

  const handleSort = (field: keyof FairnessMetric) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  const SortIcon = ({ field }: { field: keyof FairnessMetric }) => (
    <span className="ml-1 text-gray-400">
      {sortField === field ? (sortAsc ? '↑' : '↓') : '↕'}
    </span>
  )

  const ScoreBar = ({ value, color }: { value: number; color: string }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.min(value * 100, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 w-10 text-right">{(value * 100).toFixed(0)}%</span>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading fairness metrics…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 max-w-md text-center">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Fairness Metrics Dashboard</h1>
          </div>
          <p className="text-gray-500 ml-13 pl-1">
            AI-powered ranking scores that balance quality with opportunity — giving new providers a fair shot.
          </p>
        </div>

        {/* Algorithm explanation card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">How the Fairness Score Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
                    <span><strong>Rating Score</strong> — (rating ÷ 5.0) × 0.4</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                    <span><strong>Popularity Score</strong> — (min(bookings, 20) ÷ 20) × 0.2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
                    <span><strong>Availability Score</strong> — constant 0.2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" />
                    <span><strong>Proximity Score</strong> — constant 0.2</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="font-semibold text-purple-800">New Provider Boost</span>
                    </div>
                    <p className="text-purple-700 text-xs">
                      Providers with fewer than 20 completed bookings receive a <strong>+0.15 fairness boost</strong> to ensure they compete alongside established providers.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 font-mono text-xs text-gray-700">
                    <div>base = rating + popularity + 0.2 + 0.2</div>
                    <div>boost = bookings &lt; 20 ? 0.15 : 0.0</div>
                    <div className="text-purple-700 font-semibold">final = min(base + boost, 1.0)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{metrics.length}</div>
            <div className="text-sm text-gray-500">Active Providers</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {metrics.filter(m => m.isNewProvider).length}
            </div>
            <div className="text-sm text-gray-500">Receiving Boost</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {metrics.length > 0
                ? (metrics.reduce((s, m) => s + m.finalScore, 0) / metrics.length).toFixed(2)
                : '—'}
            </div>
            <div className="text-sm text-gray-500">Avg Final Score</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {metrics.length > 0
                ? (metrics.reduce((s, m) => s + m.overallRating, 0) / metrics.length).toFixed(2)
                : '—'}
            </div>
            <div className="text-sm text-gray-500">Avg Rating</div>
          </div>
        </div>

        {/* Provider table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <h2 className="font-semibold text-gray-900">Provider Rankings</h2>
            <span className="text-sm text-gray-400 ml-auto">Click column headers to sort</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Provider</th>
                  <th
                    className="text-center px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-gray-900 whitespace-nowrap"
                    onClick={() => handleSort('overallRating')}
                  >
                    Rating <SortIcon field="overallRating" />
                  </th>
                  <th
                    className="text-center px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-gray-900 whitespace-nowrap"
                    onClick={() => handleSort('totalBookingsCompleted')}
                  >
                    Bookings <SortIcon field="totalBookingsCompleted" />
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium min-w-[180px]">Score Breakdown</th>
                  <th
                    className="text-center px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-gray-900 whitespace-nowrap"
                    onClick={() => handleSort('fairnessBoost')}
                  >
                    Boost <SortIcon field="fairnessBoost" />
                  </th>
                  <th
                    className="text-center px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-gray-900 whitespace-nowrap"
                    onClick={() => handleSort('finalScore')}
                  >
                    Final Score <SortIcon field="finalScore" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((m, idx) => (
                  <tr key={m.providerId} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{m.providerName}</div>
                          <div className="text-xs text-gray-400">{m.reviewCount} review{m.reviewCount !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StarRating value={Math.round(m.overallRating)} readOnly size="sm" />
                        <span className="text-xs text-gray-500">{m.overallRating.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="font-semibold text-gray-900">{m.totalBookingsCompleted}</span>
                    </td>
                    <td className="px-4 py-4 min-w-[180px] space-y-1.5">
                      <ScoreBar value={m.ratingScore / 0.4} color="bg-yellow-400" />
                      <ScoreBar value={m.popularityScore / 0.2} color="bg-blue-400" />
                      <ScoreBar value={1.0} color="bg-green-300" />
                      <ScoreBar value={1.0} color="bg-indigo-300" />
                    </td>
                    <td className="px-4 py-4 text-center">
                      {m.isNewProvider ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                          <Zap className="w-3 h-3" /> +{(m.fairnessBoost * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-lg font-bold ${m.finalScore >= 0.8 ? 'text-green-600' : m.finalScore >= 0.6 ? 'text-blue-600' : 'text-gray-700'}`}>
                          {m.finalScore.toFixed(2)}
                        </span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${m.finalScore >= 0.8 ? 'bg-green-500' : m.finalScore >= 0.6 ? 'bg-blue-500' : 'bg-gray-400'}`}
                            style={{ width: `${m.finalScore * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sorted.length === 0 && (
            <div className="py-16 text-center text-gray-400">No providers with activity found.</div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Rating component (×0.4)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Popularity component (×0.2)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-300 inline-block" /> Availability component (×0.2)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-300 inline-block" /> Proximity component (×0.2)
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-purple-600" /> New provider fairness boost (+0.15)
          </div>
        </div>
      </div>
    </div>
  )
}
