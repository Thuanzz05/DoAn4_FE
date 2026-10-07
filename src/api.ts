export type AuthRole = 'quan_tri' | 'giao_vien' | 'hoc_vien'
export type AuthUser = {
  id: number
  code: string
  fullName: string
  email: string
  phone: string | null
  role: AuthRole
  hasGoogle: boolean
  hasPassword: boolean
  birthDate: string | null
  teachingLanguage: string | null
  specialty: string | null
}
export type AuthSession = { token: string; user: AuthUser }

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')
const sessionKey = 'doan4.session'

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
  }
}

export function getSession(): AuthSession | null {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const value = storage.getItem(sessionKey)
      if (value) return JSON.parse(value) as AuthSession
    } catch {
      storage.removeItem(sessionKey)
    }
  }
  return null
}

export function saveSession(session: AuthSession, remember = localStorage.getItem(sessionKey) !== null): void {
  clearSession()
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(sessionKey, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(sessionKey)
  sessionStorage.removeItem(sessionKey)
}

function expireSession(status: number, session: AuthSession | null): void {
  if (status === 401 && session) {
    clearSession()
    window.dispatchEvent(new Event('auth:expired'))
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession()
  const headers = new Headers(init.headers)
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`)
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers })
  const body = response.status === 204 ? null : await response.json().catch(() => null) as { data?: T; message?: string; code?: string } | null
  if (!response.ok) {
    expireSession(response.status, session)
    throw new ApiError(response.status, body?.message ?? 'Không thể kết nối máy chủ', body?.code)
  }
  return (body?.data ?? body) as T
}

export async function apiBlob(path: string): Promise<Blob> {
  const session = getSession()
  const response = await fetch(`${apiUrl}${path}`, { headers: session ? { Authorization: `Bearer ${session.token}` } : {} })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    expireSession(response.status, session)
    throw new ApiError(response.status, body?.message ?? 'Không thể tải tệp')
  }
  return response.blob()
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

export function errorMessage(error: unknown): string {
  if (error instanceof TypeError) return 'Không thể kết nối máy chủ'
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi, vui lòng thử lại'
}
