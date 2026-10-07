import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorMessage, getSession, json } from '../api'

export type WorkspaceNotification = { id: number; title: string; content: string; readAt: string | null; createdAt: string }

export function useWorkspace() {
  const user = getSession()?.user ?? null
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const refresh = useCallback(async () => {
    const current = ++requestId.current
    setLoading(true)
    try {
      const results = await Promise.all(Array.from({ length: pages }, (_, index) => api<{ items: WorkspaceNotification[]; pagination: { total: number; unread: number } }>(`/notifications?paginated=true&page=${index + 1}&pageSize=20`)))
      if (current !== requestId.current) return
      setNotifications([...new Map(results.flatMap((result) => result.items).map((item) => [item.id, item])).values()])
      setUnread(results[0].pagination.unread); setTotal(results[0].pagination.total); setError('')
    } catch (err) { if (current === requestId.current) setError(errorMessage(err)) }
    finally { if (current === requestId.current) setLoading(false) }
  }, [pages])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => { if (!document.hidden) void refresh() }, 30_000)
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => { requestId.current += 1; window.clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [refresh])

  const markRead = async (ids: number[]) => {
    for (let offset = 0; offset < ids.length; offset += 100) await api('/notifications/read-all', json('PATCH', { ids: ids.slice(offset, offset + 100) }))
    await refresh()
  }

  return { user, notifications, unread, total, loading, error, refresh, markRead, loadMore: () => setPages((value) => value + 1) }
}
