import axiosInstance from './axiosInstance'
import type { ServiceListing, CategoryResponse, PagedResponse, ServiceSearchParams } from '@/types/service.types'

export const serviceApi = {
  async getServices(params?: ServiceSearchParams): Promise<PagedResponse<ServiceListing>> {
    const { data } = await axiosInstance.get<PagedResponse<ServiceListing>>('/services', { params })
    return data
  },

  async getServiceById(id: number): Promise<ServiceListing> {
    const { data } = await axiosInstance.get<ServiceListing>(`/services/${id}`)
    return data
  },

  async getCategories(): Promise<CategoryResponse[]> {
    const { data } = await axiosInstance.get<CategoryResponse[]>('/categories')
    return data
  },
}
