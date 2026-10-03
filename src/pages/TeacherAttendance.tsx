import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  ClipboardText,
  Clock,
  DownloadSimple,
  MapPin,
  Timer,
  UserMinus,
  UsersThree,
} from '@phosphor-icons/react'
import { Avatar, Button, Card, Flex, Input, Modal, Radio, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import TeacherLayout, { type TeacherPage } from './TeacherLayout'
import './TeacherAttendance.css'
import { api, errorMessage, json } from '../api'

type TeacherAttendanceProps = {
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

type AttendanceStatus = 'present' | 'late' | 'absent' | ''
type Student = { id: number; code: string; name: string; rate: number }
type SessionApi = { id: number; className: string; startsAt: string; endsAt: string; roomCode: string; students: number; attendanceMarked: number; status: string }
type AttendanceApi = { enrollmentId: number; studentCode: string; studentName: string; status: 'co_mat' | 'di_muon' | 'vang' | null; note: string | null; attendanceRate: number | null }
const attendanceOptions = [
  { label: 'Có mặt', value: 'present' },
  { label: 'Muộn', value: 'late' },
  { label: 'Vắng', value: 'absent' },
]
const started = (value: string) => new Date(value.replace(' ', 'T')).getTime() <= Date.now()

const countAttendance = (values: AttendanceStatus[]) => values.reduce((result, status) => ({ ...result, [status || 'unmarked']: result[status || 'unmarked'] + 1 }), { present: 0, late: 0, absent: 0, unmarked: 0 })

if (import.meta.env.DEV) {
  const check = countAttendance(['present', 'late', 'absent', ''])
  if (Object.values(check).some((value) => value !== 1)) throw new Error('Attendance count check failed')
}

function TeacherAttendance({ onLogout, onNavigate, onNavigateHome }: TeacherAttendanceProps) {
  const [sessions, setSessions] = useState<SessionApi[]>([])
  const [session, setSession] = useState<number>()
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({})
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [messageApi, messageContext] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()

  const counts = useMemo(() => countAttendance(Object.values(attendance)), [attendance])
  const currentSession = sessions.find((item) => item.id === session)
  useEffect(() => { api<SessionApi[]>('/teacher/sessions').then((rows) => { const available = rows.filter((item) => item.status !== 'da_huy' && started(item.startsAt)); const requested = Number(sessionStorage.getItem('teacher-attendance-session')); sessionStorage.removeItem('teacher-attendance-session'); setSessions(available); setSession((current) => available.some((item) => item.id === current) ? current : (available.some((item) => item.id === requested) ? requested : available[0]?.id)) }).catch((error) => messageApi.error(errorMessage(error))) }, [messageApi])
  useEffect(() => { if (!session) return; api<{ students: AttendanceApi[] }>(`/teacher/sessions/${session}/attendance`).then((result) => { setStudents(result.students.map((item) => ({ id: item.enrollmentId, code: item.studentCode, name: item.studentName, rate: Number(item.attendanceRate ?? 0) }))); setAttendance(Object.fromEntries(result.students.map((item) => [item.enrollmentId, item.status === 'co_mat' ? 'present' : item.status === 'di_muon' ? 'late' : item.status === 'vang' ? 'absent' : '']))); setNotes(Object.fromEntries(result.students.map((item) => [item.enrollmentId, item.note ?? '']))); setSaved(result.students.length > 0 && result.students.every((item) => item.status)); setDirty(false) }).catch((error) => messageApi.error(errorMessage(error))) }, [messageApi, session])
  useEffect(() => {
    if (!dirty) return
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const confirmHistoryNavigation = (event: Event) => {
      if (!window.confirm('Điểm danh có thay đổi chưa lưu. Bạn có muốn rời trang?')) event.preventDefault()
      else setDirty(false)
    }
    window.addEventListener('beforeunload', preventUnload)
    window.addEventListener('app:history-navigation', confirmHistoryNavigation)
    return () => {
      window.removeEventListener('beforeunload', preventUnload)
      window.removeEventListener('app:history-navigation', confirmHistoryNavigation)
    }
  }, [dirty])
  const setStatus = (id: number, status: AttendanceStatus) => { setAttendance((current) => ({ ...current, [id]: status })); setSaved(false); setDirty(true) }
  const markAllPresent = () => { setAttendance(Object.fromEntries(students.map((student) => [student.id, 'present'])) as Record<number, AttendanceStatus>); setSaved(false); setDirty(true) }

  const confirmDiscard = (action: () => void) => {
    if (!dirty) { action(); return }
    modalApi.confirm({ title: 'Bỏ thay đổi chưa lưu?', content: 'Các thay đổi điểm danh hiện tại sẽ bị mất.', okText: 'Bỏ thay đổi', cancelText: 'Ở lại', okButtonProps: { danger: true }, onOk: () => { setDirty(false); action() } })
  }

  const persist = async () => { if (!session) return; try { await api(`/teacher/sessions/${session}/attendance`, json('PUT', { items: students.map((student) => ({ enrollmentId: student.id, status: attendance[student.id] === 'present' ? 'co_mat' : attendance[student.id] === 'late' ? 'di_muon' : 'vang', note: notes[student.id] || null })) })); setSaved(true); setDirty(false); messageApi.success('Đã lưu điểm danh cho buổi học.') } catch (error) { messageApi.error(errorMessage(error)) } }

  const saveAttendance = () => {
    if (counts.unmarked) {
      messageApi.warning(`Còn ${counts.unmarked} học viên chưa được điểm danh.`)
      return
    }
    if (!saved) {
      void persist()
      return
    }
    modalApi.confirm({ title: 'Ghi đè dữ liệu điểm danh?', content: 'Buổi học này đã được lưu. Các thay đổi mới sẽ thay thế kết quả trước đó.', okText: 'Ghi đè', cancelText: 'Hủy', onOk: persist })
  }

  const columns: ColumnsType<Student> = [
    { title: '#', key: 'index', width: 54, render: (_, __, index) => index + 1 },
    {
      title: 'Học viên', dataIndex: 'name', width: 250,
      render: (_, student) => <div className="admin-entity"><Avatar>{student.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><strong>{student.name}</strong><small>{student.code}</small></div></div>,
    },
    { title: 'Chuyên cần', dataIndex: 'rate', width: 110, render: (rate) => <Tag color={rate < 80 ? 'red' : rate < 90 ? 'orange' : 'green'}>{rate}%</Tag> },
    {
      title: 'Trạng thái', key: 'status', width: 280,
      render: (_, student) => <Radio.Group className={`attendance-options status-${attendance[student.id] || 'unmarked'}`} options={attendanceOptions} optionType="button" buttonStyle="solid" value={attendance[student.id]} onChange={(event) => setStatus(student.id, event.target.value)} />,
    },
    {
      title: 'Ghi chú', key: 'note',
      render: (_, student) => <Input value={notes[student.id] ?? ''} placeholder="Thêm ghi chú" onChange={(event) => { setNotes((current) => ({ ...current, [student.id]: event.target.value })); setSaved(false); setDirty(true) }} />,
    },
  ]

  return (
    <TeacherLayout activePage="teacher-attendance" mainId="teacher-attendance" onLogout={() => confirmDiscard(onLogout)} onNavigate={(page) => confirmDiscard(() => onNavigate(page))} onNavigateHome={() => confirmDiscard(onNavigateHome)}>
      {messageContext}{modalContext}
      <AdminPageHeader
        kicker="Theo dõi chuyên cần"
        title="Điểm danh lớp học"
        description="Chọn buổi học, cập nhật trạng thái từng học viên và xác nhận trước khi lưu."
        actions={<Button icon={<DownloadSimple />} onClick={() => { const rows = [['Mã học viên', 'Họ tên', 'Trạng thái', 'Ghi chú'], ...students.map((item) => [item.code, item.name, attendance[item.id], notes[item.id] ?? ''])]; const url = URL.createObjectURL(new Blob([`\uFEFF${rows.map((row) => row.join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'diem-danh.csv'; link.click(); URL.revokeObjectURL(url) }}>Xuất bảng</Button>}
      />

      <Card className="attendance-session-card">
        <Flex align="center" justify="space-between" gap={20} wrap>
          <div><Typography.Text type="secondary">Buổi học cần điểm danh</Typography.Text><Select value={session} onChange={(value) => confirmDiscard(() => setSession(value))} options={sessions.map((item) => ({ value: item.id, label: `${item.className} · ${new Date(item.startsAt).toLocaleString('vi-VN')}` }))} /></div>
          <Space size={22} wrap className="attendance-session-meta"><span><Clock />{currentSession ? `${new Date(currentSession.startsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}–${new Date(currentSession.endsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '—'}</span><span><MapPin />{currentSession?.roomCode ?? '—'}</span><span><UsersThree />{students.length} học viên</span><Tag color={saved ? 'green' : 'orange'}>{saved ? 'Đã lưu' : 'Chưa hoàn tất'}</Tag></Space>
        </Flex>
      </Card>

      <AdminSummary items={[
        { label: 'Có mặt', value: counts.present, detail: 'Học viên tham gia đúng giờ', icon: <CheckCircle weight="duotone" />, tone: 'success' },
        { label: 'Đi muộn', value: counts.late, detail: 'Có mặt sau giờ bắt đầu', icon: <Timer weight="duotone" /> },
        { label: 'Vắng', value: counts.absent, detail: 'Có phép hoặc không phép', icon: <UserMinus weight="duotone" />, tone: 'danger' },
        { label: 'Chưa đánh dấu', value: counts.unmarked, detail: 'Cần hoàn tất trước khi lưu', icon: <ClipboardText weight="duotone" /> },
      ]} />

      <Card
        className="admin-table-card attendance-table-card"
        title="Danh sách học viên"
        extra={<Space><Button disabled={!students.length} onClick={markAllPresent}>Tất cả có mặt</Button><Button type="primary" disabled={!session || !students.length} icon={<CheckCircle />} onClick={saveAttendance}>Lưu điểm danh</Button></Space>}
      >
        <Table columns={columns} dataSource={students} rowKey="id" pagination={false} scroll={{ x: 980, y: 520 }} />
      </Card>

    </TeacherLayout>
  )
}

export default TeacherAttendance
