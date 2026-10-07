import { useEffect, useState } from 'react'
import { Alert, Select, Typography } from 'antd'
import { api, errorMessage } from '../api'
import AcademicDetails from './AcademicDetails'

export default function TeacherAcademicSummary({ section, revision }: { section: 'attendance' | 'grades'; revision: number }) {
  const [classes, setClasses] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [classId, setClassId] = useState<number>()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api<typeof classes>('/teacher/classes').then((rows) => { if (active) { setClasses(rows); setClassId(rows[0]?.id) } })
      .catch((err) => { if (active) setError(errorMessage(err)) })
    return () => { active = false }
  }, [])
  return <section style={{ marginTop: 24 }} aria-label="Thống kê toàn khóa">
    <Typography.Title level={3}>Thống kê toàn khóa</Typography.Title>
    {error && <Alert type="error" title={error} />}
    <Select aria-label="Lớp thống kê chuyên cần" placeholder="Chọn lớp thống kê" style={{ minWidth: 250 }} value={classId} onChange={setClassId} options={classes.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} />
    {classId && <AcademicDetails classId={classId} teacher section={section} revision={revision} />}
  </section>
}
