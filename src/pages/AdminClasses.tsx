import { useEffect, useMemo, useState } from 'react'
import { CalendarBlank, CaretRight, MagnifyingGlass, MapPin, PencilSimple, Plus, Student, Trash, UsersThree } from '@phosphor-icons/react'
import { Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, InputNumber, Modal, Progress, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { api, errorMessage, json } from '../api'

type ClassStatus = 'Đang học' | 'Sắp khai giảng' | 'Đã kết thúc' | 'Đã hủy'
type ClassRecord = { id: number; code: string; name: string; course: string; courseId: number; startDate: string; sessions: number; capacity: number; enrolled: number; teacher: string; teacherId: number | null; schedule: string; room: string; status: ClassStatus; progress: number }
type ClassForm = Pick<ClassRecord, 'code' | 'name' | 'courseId' | 'teacherId' | 'startDate' | 'sessions' | 'capacity'>
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }
type ClassApi = { id: number; code: string; name: string; courseId: number; courseName: string; teacherId: number | null; teacherName: string | null; startDate: string; sessions: number; capacity: number; status: string; enrolled: number }
type CourseOption = { id: number; name: string; sessions: number }
type TeacherOption = { id: number; fullName: string }
type ScheduleApi = { classId: number; roomCode: string; dayOfWeek: number; startTime: string }
const statusColor: Record<ClassStatus, string> = { 'Đang học': 'green', 'Sắp khai giảng': 'gold', 'Đã kết thúc': 'default', 'Đã hủy': 'red' }
const displayDate = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))

function AdminClasses({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | ClassStatus>('Tất cả')
  const [selected, setSelected] = useState<ClassRecord | null>(null)
  const [editing, setEditing] = useState<ClassRecord | 'new' | null>(null)
  const [form] = Form.useForm<ClassForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  const data = useMemo(() => classes.filter((item) => (!query.trim() || [item.name, item.code, item.course, item.teacher].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [classes, query, status])

  const load = async () => {
    try {
      const [rows, courseRows, teacherRows, schedules] = await Promise.all([api<ClassApi[]>('/classes'), api<CourseOption[]>('/courses/all'), api<TeacherOption[]>('/users?role=giao_vien'), api<ScheduleApi[]>('/schedules')])
      setCourses(courseRows); setTeachers(teacherRows)
      const statusMap: Record<string, ClassStatus> = { sap_khai_giang: 'Sắp khai giảng', dang_hoc: 'Đang học', da_ket_thuc: 'Đã kết thúc', da_huy: 'Đã hủy' }
      setClasses(rows.map((item) => { const slots = schedules.filter((slot) => slot.classId === item.id); return { id: item.id, code: item.code, name: item.name, course: item.courseName, courseId: item.courseId, startDate: String(item.startDate).slice(0, 10), sessions: Number(item.sessions), capacity: Number(item.capacity), enrolled: Number(item.enrolled), teacher: item.teacherName ?? 'Chưa phân công', teacherId: item.teacherId, schedule: slots.length ? slots.map((slot) => `T${slot.dayOfWeek} · ${slot.startTime.slice(0, 5)}`).join(', ') : 'Chưa xếp lịch', room: slots.map((slot) => slot.roomCode).join(', ') || '—', status: statusMap[item.status] ?? 'Sắp khai giảng', progress: item.status === 'da_ket_thuc' ? 100 : 0 } }))
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])

  const openNew = () => { form.resetFields(); form.setFieldsValue({ courseId: courses[0]?.id, sessions: courses[0]?.sessions ?? 24, capacity: 20 }); setEditing('new') }
  const openEdit = (item: ClassRecord) => { form.setFieldsValue(item); setSelected(null); setEditing(item) }
  const save = async (values: ClassForm) => {
    const code = values.code.trim().toUpperCase()
    if (classes.some((item) => item.code === code && item.code !== (typeof editing === 'object' && editing ? editing.code : ''))) {
      form.setFields([{ name: 'code', errors: ['Mã lớp đã tồn tại.'] }]); return
    }
    if (typeof editing === 'object' && editing && values.capacity < editing.enrolled) {
      form.setFields([{ name: 'capacity', errors: [`Sĩ số hiện tại là ${editing.enrolled}.`] }]); return
    }
    if (typeof editing === 'object' && editing && editing.enrolled > 0 && editing.courseId !== values.courseId) {
      form.setFields([{ name: 'courseId', errors: ['Lớp đã có học viên, không thể đổi khóa học.'] }]); return
    }
    try { const body = { ...values, code, name: values.name.trim(), teacherId: values.teacherId ?? null }; if (editing === 'new') await api('/classes', json('POST', body)); else if (editing) await api(`/classes/${editing.id}`, json('PATCH', body)); messageApi.success(editing === 'new' ? 'Đã tạo lớp học.' : 'Đã cập nhật lớp học.'); setEditing(null); await load() } catch (error) { messageApi.error(errorMessage(error)) }
  }
  const cancel = (item: ClassRecord) => {
    if (item.enrolled > 0) { messageApi.warning('Lớp đang có học viên. Hãy chuyển lớp cho học viên trước khi hủy.'); return }
    if (item.status === 'Đã kết thúc' || item.status === 'Đã hủy') return
    modalApi.confirm({ title: 'Hủy lớp học?', content: `${item.name} · ${item.code}`, okText: 'Hủy lớp', okButtonProps: { danger: true }, onOk: async () => { try { await api(`/classes/${item.id}/cancel`, json('POST')); setSelected(null); await load(); messageApi.success('Đã hủy lớp học.') } catch (error) { messageApi.error(errorMessage(error)) } } })
  }
  const generateSessions = (item: ClassRecord) => {
    modalApi.confirm({
      title: `Tạo ${item.sessions} buổi học?`,
      content: `${item.name} sẽ sinh buổi học từ lịch hàng tuần hiện tại. Thao tác chỉ thực hiện một lần.`,
      okText: 'Tạo buổi học',
      onOk: async () => {
        try {
          const result = await api<{ created: number }>(`/classes/${item.id}/generate-sessions`, json('POST'))
          messageApi.success(`Đã tạo ${result.created} buổi học.`)
        } catch (error) { messageApi.error(errorMessage(error)) }
      },
    })
  }
  const columns: TableProps<ClassRecord>['columns'] = [
    { title: 'Lớp học', key: 'class', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.name.slice(0, 2).toUpperCase()}</Avatar><div><strong>{item.name}</strong><small>{item.code} · {item.course}</small></div></div> },
    { title: 'Giáo viên', dataIndex: 'teacher' },
    { title: 'Lịch và phòng', key: 'schedule', render: (_, item) => <div><Typography.Text strong>{item.schedule}</Typography.Text><br /><Typography.Text type="secondary">{item.room}</Typography.Text></div> },
    { title: 'Sĩ số', key: 'students', render: (_, item) => `${item.enrolled}/${item.capacity}` },
    { title: 'Tiến độ', dataIndex: 'progress', width: 150, render: (value: number) => <Progress percent={value} size="small" /> },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: ClassStatus) => <Tag color={statusColor[value]}>{value}</Tag> },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button icon={<CaretRight />} onClick={() => setSelected(item)} aria-label={`Xem lớp ${item.name}`} /> },
  ]

  return <AdminLayout activePage="classes" mainId="class-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}{modalContext}
    <AdminPageHeader kicker="Tổ chức đào tạo" title="Quản lý lớp học" description="Tạo lớp từ khóa học, theo dõi sĩ số và trạng thái vận hành." actions={<Button type="primary" icon={<Plus />} onClick={openNew}>Tạo lớp học</Button>} />
    <AdminSummary items={[
      { label: 'Lớp hoạt động', value: classes.filter((item) => item.status === 'Đang học').length, detail: 'Lớp đang giảng dạy', icon: <UsersThree weight="duotone" />, tone: 'success' },
      { label: 'Học viên đã xếp lớp', value: classes.filter((item) => item.status !== 'Đã hủy').reduce((sum, item) => sum + item.enrolled, 0), detail: 'Dữ liệu hệ thống', icon: <Student weight="duotone" /> },
      { label: 'Phòng đang sử dụng', value: new Set(classes.filter((item) => item.status === 'Đang học').map((item) => item.room)).size, detail: 'Theo lịch các lớp đang học', icon: <MapPin weight="duotone" /> },
    ]} />
    <Card className="admin-table-card" title="Danh sách lớp học" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, khóa hoặc giáo viên" /><Select value={status} onChange={setStatus} options={['Tất cả', 'Đang học', 'Sắp khai giảng', 'Đã kết thúc', 'Đã hủy'].map((value) => ({ value, label: value }))} /></Space>}><Table rowKey="code" columns={columns} dataSource={data} scroll={{ x: 1000 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} lớp học` }} locale={{ emptyText: 'Không tìm thấy lớp phù hợp' }} /></Card>
    <Drawer size={440} title="Thông tin lớp học" open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <><Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.slice(0, 2).toUpperCase()}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text type="secondary">{selected.code}</Typography.Text></div></Flex><Descriptions bordered column={1} size="small" style={{ marginTop: 24 }} items={[{ key: 'course', label: 'Khóa học', children: selected.course }, { key: 'start', label: 'Ngày khai giảng', children: displayDate(selected.startDate) }, { key: 'sessions', label: 'Số buổi', children: selected.sessions }, { key: 'teacher', label: 'Giáo viên', children: selected.teacher }, { key: 'schedule', label: 'Lịch học', children: selected.schedule }, { key: 'room', label: 'Phòng học', children: selected.room }, { key: 'students', label: 'Sĩ số', children: `${selected.enrolled}/${selected.capacity} học viên` }, { key: 'progress', label: 'Tiến độ', children: `${selected.progress}%` }]} /><Card size="small" className="admin-drawer-status"><Flex justify="space-between"><Typography.Text type="secondary">Trạng thái lớp</Typography.Text><Tag color={statusColor[selected.status]}>{selected.status}</Tag></Flex></Card>{selected.status !== 'Đã hủy' && selected.status !== 'Đã kết thúc' && <Space orientation="vertical" style={{ width: '100%', marginTop: 18 }}><Button block type="primary" icon={<CalendarBlank />} disabled={!selected.teacherId || selected.schedule === 'Chưa xếp lịch'} onClick={() => generateSessions(selected)}>Tạo các buổi học</Button><Button block icon={<PencilSimple />} onClick={() => openEdit(selected)}>Sửa thông tin lớp</Button><Button block danger icon={<Trash />} onClick={() => cancel(selected)}>Hủy lớp học</Button></Space>}</>}
    </Drawer>
    <Modal title={editing === 'new' ? 'Tạo lớp học' : 'Sửa thông tin lớp'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing === 'new' ? 'Tạo lớp' : 'Cập nhật'} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}>
        <Form.Item name="code" label="Mã lớp" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã lớp.' }]}><Input placeholder="VD: A2-GT-10" /></Form.Item>
        <Form.Item name="name" label="Tên lớp" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên lớp.' }]}><Input /></Form.Item>
        <Form.Item name="courseId" label="Khóa học" rules={[{ required: true, message: 'Vui lòng chọn khóa học.' }]}><Select showSearch optionFilterProp="label" disabled={typeof editing === 'object' && editing !== null && editing.enrolled > 0} options={courses.map((item) => ({ value: item.id, label: item.name }))} /></Form.Item>
        <Form.Item name="teacherId" label="Giáo viên"><Select allowClear showSearch optionFilterProp="label" options={teachers.map((item) => ({ value: item.id, label: item.fullName }))} /></Form.Item>
        <Form.Item name="startDate" label="Ngày khai giảng" rules={[{ required: true, message: 'Vui lòng chọn ngày khai giảng.' }]}><Input type="date" /></Form.Item>
        <Space align="start" wrap><Form.Item name="sessions" label="Số buổi" rules={[{ required: true, message: 'Vui lòng nhập số buổi.' }]}><InputNumber min={1} /></Form.Item><Form.Item name="capacity" label="Sĩ số tối đa" rules={[{ required: true, message: 'Vui lòng nhập sĩ số.' }]}><InputNumber min={1} /></Form.Item></Space>
      </Form>
    </Modal>
  </AdminLayout>
}

export default AdminClasses
