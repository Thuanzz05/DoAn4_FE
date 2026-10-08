import { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Drawer, Progress, Skeleton, Table, Tag } from 'antd'
import { api, errorMessage } from '../api'
import { enrollmentLabels } from './enrollmentLabels'

type StudentClass = { enrollmentId: number; enrollmentStatus: string; courseName: string; description: string | null; code: string | null; name: string | null; startDate: string | null; status: string | null; teacherName: string | null; totalSessions: number | null; completedSessions: number; enrolled: number; maxStudents: number | null }
const classLabels: Record<string, string> = { sap_khai_giang: 'Sắp khai giảng', dang_hoc: 'Đang học', da_ket_thuc: 'Đã kết thúc', da_huy: 'Đã hủy' }
const classStatus = (status: string | null) => status ? <Tag color={status === 'da_ket_thuc' ? 'green' : status === 'da_huy' ? 'red' : 'blue'}>{classLabels[status] ?? status}</Tag> : 'Chưa xếp lớp'

export default function StudentClasses({ focusedClassCode, onCloseFocus }: { focusedClassCode?: string; onCloseFocus?: () => void }) {
  const [rows, setRows] = useState<StudentClass[]>([])
  const [selectedId, setSelectedId] = useState<number>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    api<StudentClass[]>('/student/classes', { signal: controller.signal }).then((data) => { if (!controller.signal.aborted) setRows(data) })
      .catch((err) => { if (!controller.signal.aborted) setError(errorMessage(err)) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])
  const selected = focusedClassCode ? rows.find((item) => item.code === focusedClassCode) : rows.find((item) => item.enrollmentId === selectedId)
  const progress = (item: StudentClass) => item.totalSessions ? Math.min(100, Math.round(Number(item.completedSessions) * 100 / Number(item.totalSessions))) : 0
  return <>
    <Card title="Khóa học và ghi danh của tôi" extra={<Button loading={loading} onClick={() => setReload((value) => value + 1)}>Làm mới</Button>} style={{ marginTop: 24 }}>
      {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : error ? <Alert type="error" showIcon title="Chưa tải được danh sách ghi danh" description={error} action={<Button onClick={() => setReload((value) => value + 1)}>Thử lại</Button>} /> : <Table rowKey="enrollmentId" dataSource={rows} scroll={{ x: 920 }} pagination={{ pageSize: 6 }} columns={[
        { title: 'Khóa học', dataIndex: 'courseName' },
        { title: 'Lớp học', key: 'class', render: (_, item) => item.code ? `${item.code} · ${item.name}` : item.enrollmentStatus === 'bao_luu' ? 'Đã bảo lưu, chờ tiếp tục' : item.enrollmentStatus === 'da_huy' ? 'Ghi danh đã hủy' : 'Chờ xếp lớp' },
        { title: 'Trạng thái ghi danh', dataIndex: 'enrollmentStatus', render: (value: string) => <Tag color={value === 'hoan_thanh' ? 'green' : value === 'bao_luu' ? 'orange' : value === 'da_huy' ? 'default' : 'blue'}>{enrollmentLabels[value] ?? value}</Tag> },
        { title: 'Trạng thái lớp', dataIndex: 'status', render: classStatus },
        { title: 'Tiến độ', key: 'progress', render: (_, item) => item.code ? <Progress percent={progress(item)} size="small" /> : '—' },
        { title: 'Chi tiết', key: 'details', render: (_, item) => <Button onClick={() => { onCloseFocus?.(); setSelectedId(item.enrollmentId) }}>Xem chi tiết</Button> },
      ]} />}
    </Card>
    <Drawer title="Chi tiết khóa học / lớp học" size={470} open={!loading && !error && Boolean(selected)} onClose={() => { setSelectedId(undefined); onCloseFocus?.() }}>
      {selected && <>
        {selected.enrollmentStatus === 'bao_luu' && <Alert type="info" title="Ghi danh đã bảo lưu" description="Liên hệ giáo vụ để được xếp lớp tiếp tục phù hợp." style={{ marginBottom: 16 }} />}
        <Descriptions bordered column={1} items={[
          { key: 'course', label: 'Khóa học', children: selected.courseName },
          { key: 'description', label: 'Mô tả', children: selected.description || 'Chưa có mô tả' },
          { key: 'enrollment', label: 'Ghi danh', children: enrollmentLabels[selected.enrollmentStatus] ?? selected.enrollmentStatus },
          { key: 'class', label: 'Lớp học', children: selected.code ? `${selected.code} · ${selected.name}` : 'Chưa xếp lớp' },
          { key: 'classStatus', label: 'Trạng thái lớp', children: classStatus(selected.status) },
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
