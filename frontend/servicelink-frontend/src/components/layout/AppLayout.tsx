import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import NotificationPanel from '@/components/notifications/NotificationPanel'
import useWebSocket from '@/hooks/useWebSocket'
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch'
import { setUnreadCount } from '@/store/slices/uiSlice'
import { notificationApi } from '@/api/notificationApi'

export default function AppLayout() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((s) => s.auth.token)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)

  useWebSocket(token)

  // Fetch initial unread count on login
  useEffect(() => {
    if (!isAuthenticated) return
    notificationApi.getUnreadCount()
      .then((count) => dispatch(setUnreadCount(count)))
      .catch(() => { /* silent */ })
  }, [isAuthenticated, dispatch])

  return (
    <div className="min-h-screen flex flex-col bg-brand-surface">
      <Navbar />
      <NotificationPanel />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
