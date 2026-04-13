import axiosInstance from './axiosInstance'

export interface FairnessMetric {
  providerId: number
  providerName: string
  overallRating: number
  totalBookingsCompleted: number
  reviewCount: number
  ratingScore: number
  popularityScore: number
  availabilityScore: number
  proximityScore: number
  baseScore: number
  fairnessBoost: number
  finalScore: number
  isNewProvider: boolean
}

export const analyticsApi = {
  async getFairnessMetrics(): Promise<FairnessMetric[]> {
    const { data } = await axiosInstance.get<FairnessMetric[]>('/analytics/fairness')
    return data
  },
}
