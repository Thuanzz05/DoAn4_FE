import { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Drawer, Progress, Table, Tag } from 'antd'
import { api, errorMessage } from '../api'
import { enrollmentLabels } from './enrollmentLabels'

type StudentClass = { enrollmentId: number; enrollmentStatus: string; courseName: string; description: string | null; code: string | null; name: string | null; startDate: string | null; status: string | null; teacherName: string | null; totalSessions: number | null; completedSessions: number; enrolled: number; maxStudents: number | null }

export default function StudentClasses({ focusedClassCode, onCloseFocus }: { focusedClassCode?: string; onCloseFocus?: () => void }) {
  const [rows, setRows] = useState<StudentClass[]>([])
  const [selectedId, setSelectedId] = useState<number>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api<StudentClass[]>('/student/classes').then((data) => { if (active) setRows(data) })
      .catch((err) => { if (active) setError(errorMessage(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const selected = focusedClassCode ? rows.find((item) => item.code === focusedClassCode) : rows.find((item) => item.enrollmentId === selectedId)
  const progress = (item: StudentClass) => item.totalSessions ? Math.min(100, Math.round(Number(item.completedSessions) * 100 / Number(item.totalSessions))) : 0
  return <>
    <Card title="Khóa học và ghi danh của tôi" style={{ marginTop: 24 }}>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
      <Table loading={loading} rowKey="enrollmentId" dataSource={rows} scroll={{ x: 760 }} pagination={{ pageSize: 6 }} columns={[
        { title: 'Khóa học', dataIndex: 'courseName' },
        { title: 'Lớp học', key: 'class', render: (_, item) => item.code ? `${item.code} · ${item.name}` : item.enrollmentStatus === 'bao_luu' ? 'Đã bảo lưu, chờ tiếp tục' : item.enrollmentStatus === 'da_huy' ? 'Ghi danh đã hủy' : 'Chờ xếp lớp' },
        { title: 'Trạng thái ghi danh', dataIndex: 'enrollmentStatus', render: (value: string) => <Tag color={value === 'hoan_thanh' ? 'green' : value === 'bao_luu' ? 'orange' : value === 'da_huy' ? 'default' : 'blue'}>{enrollmentLabels[value] ?? value}</Tag> },
        { title: 'Tiến độ', key: 'progress', render: (_, item) => item.code ? <Progress percent={progress(item)} size="small" /> : '—' },
        { title: 'Chi tiết', key: 'details', render: (_, item) => <Button onClick={() => { onCloseFocus?.(); setSelectedId(item.enrollmentId) }}>Xem chi tiết</Button> },
      ]} />
    </Card>
    <Drawer title="Chi tiết khóa học / lớp học" size={470} open={Boolean(selected)} onClose={() => { setSelectedId(undefined); onCloseFocus?.() }}>
      {selected && <>
        {selected.enrollmentStatus === 'bao_luu' && <Alert type="info" title="Ghi danh đã bảo lưu" description="Liên hệ giáo vụ để được xếp lớp tiếp tục phù hợp." style={{ marginBottom: 16 }} />}
        <Descriptions bordered column={1} items={[
          { key: 'course', label: 'Khóa học', children: selected.courseName },
          { key: 'description', label: 'Mô tả', children: selected.description || 'Chưa có mô tả' },
          { key: 'enrollment', label: 'Ghi danh', children: enrollmentLabels[selected.enrollmentStatus] ?? selected.enrollmentStatus },
          { key: 'class', label: 'Lớp học', children: selected.code ? `${selected.code} · ${selected.name}` : 'Chưa xếp lớp' },
          { key: 'start', label: 'Khai giảng', children: selected.startDate ? new Date(`${selected.startDate.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN') : 'Chưa xác định' },
          { key: 'teacher', label: 'Giáo viên', children: selected.teacherName || 'Chưa phân công' },
          { key: 'students', label: 'Sĩ số', children: selected.maxStudents ? `${selected.enrolled}/${selected.maxStudents} học viên` : '—' },
          { key: 'sessions', label: 'Buổi hoàn tất', children: selected.totalSessions ? `${selected.completedSessions}/${selected.totalSessions}` : '—' },
        ]} />
        {selected.code && <Progress style={{ marginTop: 20 }} percent={progress(selected)} />}
      </>}
    </Drawer>
  </>
}
