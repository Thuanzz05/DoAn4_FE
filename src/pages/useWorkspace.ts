import { useEffect, useState } from 'react'
import { api, getSession } from '../api'

export type WorkspaceNotification = { id: number; title: string; content: string; readAt: string | null; createdAt: string }

export function useWorkspace() {
  const user = getSession()?.user ?? null
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([])

  useEffect(() => {
    api<WorkspaceNotification[]>('/notifications').then(setNotifications).catch(() => undefined)
  }, [])

  const readAll = async () => {
    if (!notifications.some((item) => !item.readAt)) return
    await api('/notifications/read-all', { method: 'PATCH' })
    setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
  }

  return { user, notifications, unread: notifications.filter((item) => !item.readAt).length, readAll }
}
