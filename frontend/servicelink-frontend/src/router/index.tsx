import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import LoadingSpinner from '@/components/feedback/LoadingSpinner'
import ProtectedRoute from './ProtectedRoute'

// Lazy-loaded pages for code splitting
const HomePage      = lazy(() => import('@/features/services/HomePage'))
const LoginPage     = lazy(() => import('@/features/auth/LoginPage'))
const RegisterPage  = lazy(() => import('@/features/auth/RegisterPage'))
const ServicesPage  = lazy(() => import('@/features/services/ServicesPage'))
const ServiceDetailPage = lazy(() => import('@/features/services/ServiceDetailPage'))
const BookingPage   = lazy(() => import('@/features/booking/BookingPage'))
const CustomerDashboard = lazy(() => import('@/features/dashboard/customer/CustomerDashboard'))
const ProviderDashboard = lazy(() => import('@/features/dashboard/provider/ProviderDashboard'))
const BookingDetailPage = lazy(() => import('@/features/booking/BookingDetailPage'))
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'))

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner fullPage />}>{children}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // ── Public ───────────────────────────────────────────────────────
      { index: true,          element: <Wrap><HomePage /></Wrap> },
      { path: 'login',        element: <Wrap><LoginPage /></Wrap> },
      { path: 'register',     element: <Wrap><RegisterPage /></Wrap> },
      { path: 'services',     element: <Wrap><ServicesPage /></Wrap> },
      { path: 'services/:id', element: <Wrap><ServiceDetailPage /></Wrap> },

      // ── Protected: any authenticated user ────────────────────────────
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'notifications',   element: <Wrap><NotificationsPage /></Wrap> },
          { path: 'bookings/:id',    element: <Wrap><BookingDetailPage /></Wrap> },
          { path: 'book/:serviceId', element: <Wrap><BookingPage /></Wrap> },
        ],
      },

      // ── Protected: customer only ──────────────────────────────────────
      {
        element: <ProtectedRoute requiredRole="USER" />,
        children: [
          { path: 'dashboard', element: <Wrap><CustomerDashboard /></Wrap> },
        ],
      },

      // ── Protected: provider only ──────────────────────────────────────
      {
        element: <ProtectedRoute requiredRole="SERVICE_PROVIDER" />,
        children: [
          { path: 'provider/dashboard', element: <Wrap><ProviderDashboard /></Wrap> },
        ],
      },

      // ── Fallback ──────────────────────────────────────────────────────
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
