import { useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAppDispatch, useAppSelector } from './useAppDispatch'
import { prependNotification } from '@/store/slices/notificationSlice'
import { setUnreadCount } from '@/store/slices/uiSlice'
import type { Notification, NotificationType } from '@/types/notification.types'

export default function useWebSocket(token: string | null) {
  const dispatch = useAppDispatch()
  const unreadCount = useAppSelector((s) => s.ui.notificationUnreadCount)
  const unreadCountRef = useRef(unreadCount)

  // Keep ref in sync so the STOMP message handler never has a stale count
  useEffect(() => {
    unreadCountRef.current = unreadCount
  }, [unreadCount])

  useEffect(() => {
    if (!token) return

    const client = new Client({
      webSocketFactory: () =>
        new SockJS('http://localhost:8081/ws/notifications') as unknown as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },

      onConnect: () => {
        client.subscribe('/user/queue/notifications', (message) => {
          try {
            const raw = JSON.parse(message.body)
            const notification: Notification = {
              id: raw.id,
              type: raw.notificationType as NotificationType,
              title: raw.subject,
              message: raw.message,
              bookingId: raw.bookingId ?? undefined,
              isRead: raw.isRead ?? false,
              createdAt: raw.createdAt,
            }
            dispatch(prependNotification(notification))
            dispatch(setUnreadCount(unreadCountRef.current + 1))
          } catch (e) {
            console.error('Failed to parse WebSocket notification:', e)
          }
        })
      },

      onDisconnect: () => {
        console.log('WebSocket disconnected')
      },

      onStompError: (frame) => {
        console.error('STOMP error:', frame)
      },
    })

    client.activate()

    return () => {
      client.deactivate()
    }
  }, [token, dispatch])
}
