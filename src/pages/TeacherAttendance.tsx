import { useMemo, useState } from 'react'
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

type TeacherAttendanceProps = {
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

type AttendanceStatus = 'present' | 'late' | 'absent' | ''
type Student = { id: number; code: string; name: string; rate: number }

const students: Student[] = [
  ['HV2401', 'Nguyễn Minh Anh', 96], ['HV2402', 'Trần Hải Đăng', 88], ['HV2403', 'Lê Thu Hà', 92],
  ['HV2404', 'Phạm Quốc Huy', 84], ['HV2405', 'Vũ Ngọc Lan', 98], ['HV2406', 'Đỗ Minh Khang', 76],
  ['HV2407', 'Bùi Khánh Linh', 90], ['HV2408', 'Hoàng Gia Bảo', 86], ['HV2409', 'Nguyễn Thu Trang', 94],
  ['HV2410', 'Trần Đức Anh', 82], ['HV2411', 'Lê Hoàng Nam', 89], ['HV2412', 'Phan Ngọc Mai', 93],
  ['HV2413', 'Võ Minh Quân', 78], ['HV2414', 'Đặng Thanh Hà', 95], ['HV2415', 'Nguyễn Nhật Long', 87],
  ['HV2416', 'Trương Anh Thư', 91], ['HV2417', 'Lý Quốc Bảo', 80], ['HV2418', 'Phạm Minh Châu', 97],
].map(([code, name, rate], index) => ({ id: index + 1, code: String(code), name: String(name), rate: Number(rate) }))

const initialAttendance = Object.fromEntries(students.map((student, index) => [student.id, index < 12 ? 'present' : index === 12 ? 'late' : index === 13 ? 'absent' : ''])) as Record<number, AttendanceStatus>
const attendanceOptions = [
  { label: 'Có mặt', value: 'present' },
  { label: 'Muộn', value: 'late' },
  { label: 'Vắng', value: 'absent' },
]

const countAttendance = (values: AttendanceStatus[]) => values.reduce((result, status) => ({ ...result, [status || 'unmarked']: result[status || 'unmarked'] + 1 }), { present: 0, late: 0, absent: 0, unmarked: 0 })

if (import.meta.env.DEV) {
  const check = countAttendance(['present', 'late', 'absent', ''])
  if (Object.values(check).some((value) => value !== 1)) throw new Error('Attendance count check failed')
}

function TeacherAttendance({ onLogout, onNavigate, onNavigateHome }: TeacherAttendanceProps) {
  const [session, setSession] = useState('a2-2509')
  const [attendance, setAttendance] = useState(initialAttendance)
  const [notes, setNotes] = useState<Record<number, string>>({ 14: 'Đã xin phép' })
  const [saved, setSaved] = useState(false)
  const [messageApi, messageContext] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()

  const counts = useMemo(() => countAttendance(Object.values(attendance)), [attendance])
  const setStatus = (id: number, status: AttendanceStatus) => setAttendance((current) => ({ ...current, [id]: status }))
  const markAllPresent = () => setAttendance(Object.fromEntries(students.map((student) => [student.id, 'present'])) as Record<number, AttendanceStatus>)

  const persist = () => {
    setSaved(true)
    messageApi.success('Đã lưu điểm danh cho buổi học.')
  }

  const saveAttendance = () => {
    if (counts.unmarked) {
      messageApi.warning(`Còn ${counts.unmarked} học viên chưa được điểm danh.`)
      return
    }
    if (!saved) {
      persist()
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
      render: (_, student) => <Input value={notes[student.id] ?? ''} placeholder="Thêm ghi chú" onChange={(event) => setNotes((current) => ({ ...current, [student.id]: event.target.value }))} />,
    },
  ]

  return (
    <TeacherLayout activePage="teacher-attendance" mainId="teacher-attendance" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      {messageContext}{modalContext}
      <AdminPageHeader
        kicker="Theo dõi chuyên cần"
        title="Điểm danh lớp học"
        description="Chọn buổi học, cập nhật trạng thái từng học viên và xác nhận trước khi lưu."
        actions={<Button icon={<DownloadSimple />} onClick={() => messageApi.info('Đã chuẩn bị bảng điểm danh để xuất.')}>Xuất bảng</Button>}
      />

      <Card className="attendance-session-card">
        <Flex align="center" justify="space-between" gap={20} wrap>
          <div><Typography.Text type="secondary">Buổi học cần điểm danh</Typography.Text><Select value={session} onChange={(value) => { setSession(value); setSaved(value !== 'a2-2509') }} options={[{ value: 'a2-2509', label: 'A2 Giao tiếp · 25/09/2026 · 18:00' }, { value: 'ielts-2409', label: 'IELTS 6.5 · 24/09/2026 · 19:45' }, { value: 'b1-2009', label: 'B1 Tổng quát · 20/09/2026 · 08:00' }]} /></div>
          <Space size={22} wrap className="attendance-session-meta"><span><Clock />18:00–19:30</span><span><MapPin />P.201</span><span><UsersThree />18 học viên</span><Tag color={saved ? 'green' : 'orange'}>{saved ? 'Đã lưu' : 'Chưa hoàn tất'}</Tag></Space>
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
        extra={<Space><Button onClick={markAllPresent}>Tất cả có mặt</Button><Button type="primary" icon={<CheckCircle />} onClick={saveAttendance}>Lưu điểm danh</Button></Space>}
      >
        <Table columns={columns} dataSource={students} rowKey="id" pagination={false} scroll={{ x: 980, y: 520 }} />
      </Card>

      <Card className="attendance-history-card" title="Lịch sử điểm danh gần đây">
        <div className="attendance-history-row"><span><strong>IELTS 6.5</strong><small>24/09/2026 · 19:45</small></span><Tag color="green">13 có mặt</Tag><Tag color="orange">1 muộn</Tag><Typography.Text type="secondary">Đã lưu lúc 21:18</Typography.Text></div>
        <div className="attendance-history-row"><span><strong>A2 Giao tiếp</strong><small>23/09/2026 · 18:00</small></span><Tag color="green">17 có mặt</Tag><Tag color="red">1 vắng</Tag><Typography.Text type="secondary">Đã lưu lúc 19:34</Typography.Text></div>
      </Card>
    </TeacherLayout>
  )
}

export default TeacherAttendance
