// Attendance status does not tell whether the session has finished in real time.
export function sessionTiming(startsAt: string, endsAt: string, status: string, now = Date.now()) {
  if (status === 'da_huy') return { label: 'Đã hủy', color: 'red' }
  if (new Date(startsAt.replace(' ', 'T')).getTime() > now) return { label: 'Sắp diễn ra', color: 'blue' }
  if (new Date(endsAt.replace(' ', 'T')).getTime() > now) return { label: 'Đang diễn ra', color: 'green' }
  return { label: 'Đã kết thúc', color: 'default' }
}
