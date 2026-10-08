import { useEffect, useState } from 'react'
import { Alert, Button, Select, Space, Typography } from 'antd'
import { api, errorMessage } from '../api'
import AcademicDetails from './AcademicDetails'

export default function TeacherAcademicSummary({ section, revision, focusedClassId, onOpenSession }: { section: 'attendance' | 'grades'; revision: number; focusedClassId?: number; onOpenSession?: (sessionId: number) => void }) {
  const [classes, setClasses] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [classId, setClassId] = useState<number>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    api<typeof classes>('/teacher/classes').then((rows) => { if (active) setClasses(rows) })
      .catch((err) => { if (active) setError(errorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retry])
  useEffect(() => {
    setClassId((current) => focusedClassId ? classes.some((row) => row.id === focusedClassId) ? focusedClassId : undefined
      : classes.some((row) => row.id === current) ? current : classes[0]?.id)
  }, [classes, focusedClassId])
  return <section style={{ marginTop: 24 }} aria-label="Thống kê toàn khóa">
    <Typography.Title level={3}>Thống kê toàn khóa</Typography.Title>
    {error && <Alert type="error" showIcon title="Chưa tải được danh sách lớp thống kê" description={error} action={<Button onClick={() => setRetry((value) => value + 1)}>Thử lại</Button>} />}
    {!loading && !error && focusedClassId && !classes.some((row) => row.id === focusedClassId) && <Alert type="info" showIcon title="Lớp của buổi đang xem không còn được phân công cho bạn" description="Bạn vẫn điểm danh các buổi được giao. Chọn rõ một lớp hiện được phân công để xem thống kê; liên hệ giáo vụ để xem học vụ lớp của buổi này." />}
    <Space wrap><Select disabled={loading || Boolean(error)} loading={loading} aria-label="Lớp thống kê chuyên cần" placeholder="Chọn lớp thống kê" style={{ minWidth: 250 }} value={classId} onChange={setClassId} options={classes.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} /><Button loading={loading} onClick={() => setRetry((value) => value + 1)}>Tải lại danh sách lớp</Button></Space>
    {!loading && !error && classId && <AcademicDetails classId={classId} teacher section={section} revision={revision} onOpenSession={onOpenSession} />}
  </section>
}
