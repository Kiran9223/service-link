import axios from 'axios'
import { API_BASE_URL } from '@/config/constants'
import { tokenUtils } from '@/utils/tokenUtils'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// ── Request interceptor: attach JWT token ──────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = tokenUtils.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: handle 401 globally ─────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear local state and redirect to login
      tokenUtils.clearAll()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
