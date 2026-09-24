import { useMemo, useState } from 'react'
import { CalendarBlank, ChalkboardTeacher, MagnifyingGlass, MapPin, PencilSimple, Plus, ShieldCheck } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Form, Input, Modal, Select, Space, Table, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'

type DayName = 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7'
type ScheduleRecord = { id: number; className: string; course: string; language: string; teacher: string; room: string; day: DayName; start: string; end: string; students: number }
type ScheduleForm = Pick<ScheduleRecord, 'className' | 'teacher' | 'room' | 'day' | 'start' | 'end'>
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const classes = [{ name: 'A2 Giao tiếp', course: 'Tiếng Anh A2', language: 'Tiếng Anh', students: 18 }, { name: 'B1 Tổng quát', course: 'Tiếng Anh B1', language: 'Tiếng Anh', students: 16 }, { name: 'IELTS 6.5', course: 'Luyện thi IELTS 6.5', language: 'Tiếng Anh', students: 14 }, { name: 'TOPIK I - K05', course: 'Tiếng Hàn TOPIK I', language: 'Tiếng Hàn', students: 15 }, { name: 'HSK 3 - T04', course: 'Tiếng Trung HSK 3', language: 'Tiếng Trung', students: 17 }, { name: 'JLPT N5 - N03', course: 'Tiếng Nhật JLPT N5', language: 'Tiếng Nhật', students: 13 }]
const teachers = ['Nguyễn Quốc Minh', 'Trần Ngọc Lan', 'Lê Gia Hùng', 'Kim Anh Thư', 'Lương Hải Yến', 'Phạm Mai Chi']
const rooms = ['P.103', 'P.105', 'P.201', 'P.204', 'P.301', 'P.302']
const days: DayName[] = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const initialSchedules: ScheduleRecord[] = [
  { id: 1, className: 'A2 Giao tiếp', course: 'Tiếng Anh A2', language: 'Tiếng Anh', teacher: 'Nguyễn Quốc Minh', room: 'P.201', day: 'Thứ 2', start: '18:00', end: '19:30', students: 18 },
  { id: 2, className: 'HSK 3 - T04', course: 'Tiếng Trung HSK 3', language: 'Tiếng Trung', teacher: 'Lương Hải Yến', room: 'P.201', day: 'Thứ 2', start: '19:30', end: '21:00', students: 17 },
  { id: 3, className: 'B1 Tổng quát', course: 'Tiếng Anh B1', language: 'Tiếng Anh', teacher: 'Trần Ngọc Lan', room: 'P.105', day: 'Thứ 3', start: '18:30', end: '20:00', students: 16 },
  { id: 4, className: 'TOPIK I - K05', course: 'Tiếng Hàn TOPIK I', language: 'Tiếng Hàn', teacher: 'Kim Anh Thư', room: 'P.204', day: 'Thứ 3', start: '18:30', end: '20:00', students: 15 },
  { id: 5, className: 'IELTS 6.5', course: 'Luyện thi IELTS 6.5', language: 'Tiếng Anh', teacher: 'Lê Gia Hùng', room: 'P.302', day: 'Thứ 4', start: '19:00', end: '20:30', students: 14 },
  { id: 6, className: 'JLPT N5 - N03', course: 'Tiếng Nhật JLPT N5', language: 'Tiếng Nhật', teacher: 'Phạm Mai Chi', room: 'P.301', day: 'Thứ 4', start: '18:00', end: '19:30', students: 13 },
  { id: 7, className: 'B1 Tổng quát', course: 'Tiếng Anh B1', language: 'Tiếng Anh', teacher: 'Trần Ngọc Lan', room: 'P.105', day: 'Thứ 5', start: '18:30', end: '20:00', students: 16 },
  { id: 8, className: 'A2 Giao tiếp', course: 'Tiếng Anh A2', language: 'Tiếng Anh', teacher: 'Nguyễn Quốc Minh', room: 'P.201', day: 'Thứ 6', start: '18:00', end: '19:30', students: 18 },
]
const findConflict = (items: ScheduleRecord[], candidate: ScheduleForm, editingId: number | 'new') => items.find((item) => item.id !== editingId && item.day === candidate.day && candidate.start < item.end && item.start < candidate.end && (item.room === candidate.room || item.teacher === candidate.teacher))

function AdminSchedule({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [schedules, setSchedules] = useState(initialSchedules)
  const [query, setQuery] = useState('')
  const [day, setDay] = useState<'Tất cả' | DayName>('Tất cả')
  const [editing, setEditing] = useState<ScheduleRecord | 'new' | null>(null)
  const [form] = Form.useForm<ScheduleForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const data = useMemo(() => schedules.filter((item) => (!query.trim() || [item.className, item.course, item.teacher, item.room, item.language].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (day === 'Tất cả' || item.day === day)), [day, query, schedules])
  const openCreate = () => { setEditing('new'); form.setFieldsValue({ className: classes[0].name, teacher: teachers[0], room: rooms[0], day: 'Thứ 2', start: '18:00', end: '19:30' }) }
  const openEdit = (item: ScheduleRecord) => { setEditing(item); form.setFieldsValue(item) }
  const save = (values: ScheduleForm) => {
    if (values.end <= values.start) { form.setFields([{ name: 'end', errors: ['Giờ kết thúc phải sau giờ bắt đầu.'] }]); return }
    const editingId = typeof editing === 'object' && editing ? editing.id : 'new'
    const conflict = findConflict(schedules, values, editingId)
    if (conflict) { messageApi.error(`Trùng lịch với lớp ${conflict.className} (${conflict.start}-${conflict.end}).`); return }
    const info = classes.find((item) => item.name === values.className) ?? classes[0]
    if (editing === 'new') setSchedules((current) => [...current, { id: Math.max(...current.map((item) => item.id)) + 1, ...values, course: info.course, language: info.language, students: info.students }])
    else if (editing) setSchedules((current) => current.map((item) => item.id === editing.id ? { ...item, ...values, course: info.course, language: info.language, students: info.students } : item))
    messageApi.success(editing === 'new' ? 'Đã xếp lịch mới.' : 'Đã cập nhật lịch học.'); setEditing(null)
  }
  const columns: TableProps<ScheduleRecord>['columns'] = [
    { title: 'Lớp học', key: 'class', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.language.replace('Tiếng ', '').slice(0, 2).toUpperCase()}</Avatar><div><strong>{item.className}</strong><small>{item.course}</small></div></div> },
    { title: 'Thời gian', key: 'time', render: (_, item) => <div><Typography.Text strong>{item.day}</Typography.Text><br /><Typography.Text type="secondary">{item.start}-{item.end}</Typography.Text></div> },
    { title: 'Giáo viên', dataIndex: 'teacher' }, { title: 'Phòng', dataIndex: 'room' }, { title: 'Sĩ số', dataIndex: 'students', render: (value) => `${value} học viên` },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button icon={<PencilSimple />} onClick={() => openEdit(item)} aria-label={`Sửa lịch lớp ${item.className}`} /> },
  ]
  return <AdminLayout activePage="schedule" mainId="schedule-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}<AdminPageHeader kicker="Điều phối đào tạo" title="Xếp lịch giảng dạy" description="Phân công giáo viên, phòng học và kiểm tra xung đột trước khi lưu." actions={<Button type="primary" icon={<Plus />} onClick={openCreate}>Xếp lịch mới</Button>} />
    <AdminSummary items={[{ label: 'Buổi học trong tuần', value: schedules.length, detail: 'Lịch đã xác nhận và sẵn sàng tra cứu', icon: <CalendarBlank weight="duotone" />, tone: 'success' }, { label: 'Giáo viên đã phân công', value: new Set(schedules.map((item) => item.teacher)).size, detail: 'Không có khung giờ bị trùng', icon: <ChalkboardTeacher weight="duotone" /> }, { label: 'Phòng đang sử dụng', value: new Set(schedules.map((item) => item.room)).size, detail: 'Kiểm tra trước mỗi lần cập nhật', icon: <MapPin weight="duotone" /> }]} />
    <Alert style={{ marginTop: 16 }} type="success" showIcon icon={<ShieldCheck weight="fill" />} title="Kiểm tra xung đột đang bật" description="Một giáo viên hoặc phòng học không thể xuất hiện ở hai lớp trong cùng khung giờ." />
    <Card className="admin-table-card" title="Lịch học trong tuần" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Lớp, giáo viên hoặc phòng" /><Select value={day} onChange={setDay} options={['Tất cả', ...days].map((value) => ({ value, label: value }))} /></Space>}><Table rowKey="id" columns={columns} dataSource={data} scroll={{ x: 850 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} lịch học` }} /></Card>
    <Modal title={editing === 'new' ? 'Xếp lịch mới' : 'Sửa lịch học'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText="Lưu lịch" destroyOnHidden><Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}><Form.Item name="className" label="Lớp học" rules={[{ required: true }]}><Select options={classes.map((item) => ({ value: item.name, label: item.name }))} /></Form.Item><Form.Item name="teacher" label="Giáo viên" rules={[{ required: true }]}><Select options={teachers.map((value) => ({ value, label: value }))} /></Form.Item><Space align="start"><Form.Item name="room" label="Phòng học" rules={[{ required: true }]}><Select options={rooms.map((value) => ({ value, label: value }))} /></Form.Item><Form.Item name="day" label="Ngày học" rules={[{ required: true }]}><Select options={days.map((value) => ({ value, label: value }))} /></Form.Item></Space><Space align="start"><Form.Item name="start" label="Giờ bắt đầu" rules={[{ required: true }]}><Input type="time" /></Form.Item><Form.Item name="end" label="Giờ kết thúc" rules={[{ required: true }]}><Input type="time" /></Form.Item></Space></Form></Modal>
  </AdminLayout>
}
export default AdminSchedule
