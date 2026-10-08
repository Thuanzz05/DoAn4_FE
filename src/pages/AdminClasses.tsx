import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarBlank, CaretRight, CheckCircle, MagnifyingGlass, MapPin, PencilSimple, Play, Plus, Student, Trash, UsersThree, XCircle } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, InputNumber, Modal, Progress, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { api, errorMessage, json } from '../api'
import AcademicDetails from './AcademicDetails'

type ClassStatus = 'Đang học' | 'Sắp khai giảng' | 'Đã kết thúc' | 'Đã hủy'
type ClassRecord = { id: number; code: string; name: string; course: string; courseId: number; startDate: string; sessions: number; generatedSessions: number; effectiveSessions: number; completedSessions: number; capacity: number; enrolled: number; teacher: string; teacherId: number | null; schedule: string; room: string; status: ClassStatus; progress: number }
type ClassForm = Pick<ClassRecord, 'code' | 'name' | 'courseId' | 'teacherId' | 'startDate' | 'sessions' | 'capacity'>
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }
type ClassApi = { id: number; code: string; name: string; courseId: number; courseName: string; teacherId: number | null; teacherName: string | null; startDate: string; sessions: number; generatedSessions: number; effectiveSessions: number; completedSessions: number; capacity: number; status: string; enrolled: number }
type CourseOption = { id: number; name: string; sessions: number }
type TeacherOption = { id: number; fullName: string }
type RoomOption = { id: number; code: string; capacity: number }
type ScheduleApi = { classId: number; roomCode: string; dayOfWeek: number; startTime: string }
type SessionStatus = 'da_len_lich' | 'da_hoc' | 'da_huy'
type SessionApi = { id: number; classId: number; teacherId: number; teacherName: string; roomId: number; roomCode: string; startsAt: string; endsAt: string; status: SessionStatus; attendanceCount: number }
type SessionForm = { date: string; startTime: string; endTime: string; teacherId: number; roomId: number }
const statusColor: Record<ClassStatus, string> = { 'Đang học': 'green', 'Sắp khai giảng': 'gold', 'Đã kết thúc': 'default', 'Đã hủy': 'red' }
const sessionStatus: Record<SessionStatus, { label: string; color: string }> = { da_len_lich: { label: 'Đã lên lịch', color: 'blue' }, da_hoc: { label: 'Đã học', color: 'green' }, da_huy: { label: 'Đã hủy', color: 'red' } }
const displayDate = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))

function AdminClasses({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [classSessions, setClassSessions] = useState<SessionApi[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const sessionsRequestId = useRef(0)
  const selectedClassId = useRef<number | null>(null)
  const [sessionEditing, setSessionEditing] = useState<SessionApi | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | ClassStatus>('Tất cả')
  const [selected, setSelected] = useState<ClassRecord | null>(null)
  const [editing, setEditing] = useState<ClassRecord | 'new' | null>(null)
  const [form] = Form.useForm<ClassForm>()
  const [sessionForm] = Form.useForm<SessionForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  const data = useMemo(() => classes.filter((item) => (!query.trim() || [item.name, item.code, item.course, item.teacher].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [classes, query, status])
  const planLocked = typeof editing === 'object' && editing !== null && editing.generatedSessions > 0

  const load = async () => {
    try {
      const [rows, courseRows, teacherRows, roomRows, schedules] = await Promise.all([api<ClassApi[]>('/classes'), api<CourseOption[]>('/courses/all'), api<TeacherOption[]>('/users?role=giao_vien'), api<RoomOption[]>('/rooms'), api<ScheduleApi[]>('/schedules')])
      setCourses(courseRows); setTeachers(teacherRows); setRooms(roomRows)
      const statusMap: Record<string, ClassStatus> = { sap_khai_giang: 'Sắp khai giảng', dang_hoc: 'Đang học', da_ket_thuc: 'Đã kết thúc', da_huy: 'Đã hủy' }
      const records = rows.map((item) => { const slots = schedules.filter((slot) => slot.classId === item.id); const total = Number(item.sessions); const completed = Number(item.completedSessions); return { id: item.id, code: item.code, name: item.name, course: item.courseName, courseId: item.courseId, startDate: String(item.startDate).slice(0, 10), sessions: total, generatedSessions: Number(item.generatedSessions), effectiveSessions: Number(item.effectiveSessions), completedSessions: completed, capacity: Number(item.capacity), enrolled: Number(item.enrolled), teacher: item.teacherName ?? 'Chưa phân công', teacherId: item.teacherId, schedule: slots.length ? slots.map((slot) => `${slot.dayOfWeek === 1 ? 'CN' : `T${slot.dayOfWeek}`} · ${slot.startTime.slice(0, 5)}`).join(', ') : 'Chưa xếp lịch', room: slots.map((slot) => slot.roomCode).join(', ') || '—', status: statusMap[item.status] ?? 'Sắp khai giảng', progress: total ? Math.round(completed * 100 / total) : 0 } })
      setClasses(records); setSelected((current) => current ? records.find((item) => item.id === current.id) ?? null : null)
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])
  useEffect(() => () => { sessionsRequestId.current += 1; selectedClassId.current = null }, [])

  const closeDetails = () => {
    selectedClassId.current = null; sessionsRequestId.current += 1
    setSelected(null); setClassSessions([]); setSessionsLoading(false); setSessionEditing(null)
  }
  const loadSessions = async (classId: number) => {
    if (classId !== selectedClassId.current) return
    const requestId = ++sessionsRequestId.current
    setClassSessions([]); setSessionsLoading(true)
    try {
      const rows = await api<SessionApi[]>(`/classes/${classId}/sessions`)
      if (requestId === sessionsRequestId.current) setClassSessions(rows)
    } catch (error) { if (requestId === sessionsRequestId.current) messageApi.error(errorMessage(error)) }
    finally { if (requestId === sessionsRequestId.current) setSessionsLoading(false) }
  }
  const openDetails = (item: ClassRecord) => {
    closeDetails(); selectedClassId.current = item.id; setSelected(item); void loadSessions(item.id)
  }
  const openSessionEdit = (item: SessionApi) => {
    if (item.classId !== selectedClassId.current) return
    sessionForm.setFieldsValue({ date: item.startsAt.slice(0, 10), startTime: item.startsAt.slice(11, 16), endTime: item.endsAt.slice(11, 16), teacherId: item.teacherId, roomId: item.roomId })
    setSessionEditing(item)
  }
  const saveSession = async (values: SessionForm) => {
    if (!sessionEditing || !selected || sessionEditing.classId !== selectedClassId.current) return
    try {
      await api(`/sessions/${sessionEditing.id}`, json('PATCH', values))
      if (sessionEditing.classId === selectedClassId.current) setSessionEditing(null)
      await load(); await loadSessions(selected.id); messageApi.success(sessionEditing.status === 'da_huy' ? 'Đã xếp lịch học bù.' : 'Đã cập nhật buổi học.')
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  const cancelSession = (item: SessionApi) => {
    if (!selected || item.classId !== selectedClassId.current) return
    modalApi.confirm({
      title: 'Hủy buổi học?',
      content: `${new Date(item.startsAt.replace(' ', 'T')).toLocaleString('vi-VN')} · ${item.roomCode}. Bạn có thể xếp lịch bù sau.`,
      okText: 'Hủy buổi', okButtonProps: { danger: true },
      onOk: async () => {
        try { await api(`/sessions/${item.id}/cancel`, json('POST')); await load(); await loadSessions(selected.id); messageApi.success('Đã hủy buổi học.') }
        catch (error) { messageApi.error(errorMessage(error)) }
      },
    })
  }

  const openNew = () => { form.resetFields(); form.setFieldsValue({ courseId: courses[0]?.id, sessions: courses[0]?.sessions ?? 24, capacity: 20 }); setEditing('new') }
  const openEdit = (item: ClassRecord) => { form.setFieldsValue(item); closeDetails(); setEditing(item) }
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
    modalApi.confirm({ title: 'Hủy lớp học?', content: `${item.name} · ${item.code}`, okText: 'Hủy lớp', okButtonProps: { danger: true }, onOk: async () => { try { await api(`/classes/${item.id}/cancel`, json('POST')); closeDetails(); await load(); messageApi.success('Đã hủy lớp học.') } catch (error) { messageApi.error(errorMessage(error)) } } })
  }
  const generateSessions = (item: ClassRecord) => {
    modalApi.confirm({
      title: `Tạo ${item.sessions} buổi học?`,
      content: `${item.name} sẽ sinh buổi học từ lịch hàng tuần hiện tại. Thao tác chỉ thực hiện một lần.`,
      okText: 'Tạo buổi học',
      onOk: async () => {
        try {
          const result = await api<{ created: number }>(`/classes/${item.id}/generate-sessions`, json('POST'))
          await load(); closeDetails(); messageApi.success(`Đã tạo ${result.created} buổi học.`)
        } catch (error) { messageApi.error(errorMessage(error)) }
      },
    })
  }
  const changeLifecycle = (item: ClassRecord, action: 'start' | 'complete') => {
    const completing = action === 'complete'
    modalApi.confirm({
      title: completing ? 'Kết thúc lớp học?' : 'Bắt đầu lớp học?',
      content: completing
        ? 'Cần tất cả buổi học đã kết thúc và đủ điểm danh từng học viên. Hoàn thành lớp không đồng nghĩa đạt chứng chỉ; điểm, học phí và chuyên cần được xét riêng.'
        : `Lớp phải có đủ ${item.sessions} buổi chưa hủy và ít nhất một học viên.`,
      okText: completing ? 'Kết thúc lớp' : 'Bắt đầu lớp',
      onOk: async () => {
        try {
          await api(`/classes/${item.id}/${action}`, json('POST'))
          closeDetails(); await load(); messageApi.success(completing ? 'Đã kết thúc lớp học.' : 'Đã bắt đầu lớp học.')
        } catch (error) { messageApi.error(errorMessage(error)) }
      },
    })
  }
  const sessionColumns: TableProps<SessionApi>['columns'] = [
    { title: 'Ngày học', key: 'date', render: (_, item) => <div><Typography.Text strong>{new Date(`${item.startsAt.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN')}</Typography.Text><br /><Typography.Text type="secondary">{item.startsAt.slice(11, 16)}–{item.endsAt.slice(11, 16)}</Typography.Text></div> },
    { title: 'Giáo viên', dataIndex: 'teacherName' },
    { title: 'Phòng', dataIndex: 'roomCode', width: 80 },
    { title: 'Trạng thái', dataIndex: 'status', width: 110, render: (value: SessionStatus) => <Tag color={sessionStatus[value].color}>{sessionStatus[value].label}</Tag> },
    { title: 'Điểm danh', dataIndex: 'attendanceCount', width: 90, render: (value: number) => `${value} lượt` },
    { title: '', key: 'actions', width: 96, render: (_, item) => {
      const future = new Date(item.startsAt.replace(' ', 'T')).getTime() > Date.now()
      const editable = selected && !['Đã kết thúc', 'Đã hủy'].includes(selected.status) && (item.status === 'da_huy' || (item.status === 'da_len_lich' && future))
      return <Space size={4}>{editable && <Button size="small" icon={<PencilSimple />} onClick={() => openSessionEdit(item)} aria-label={item.status === 'da_huy' ? 'Xếp lịch bù' : 'Sửa buổi học'} />}{item.status === 'da_len_lich' && future && <Button size="small" danger icon={<XCircle />} onClick={() => cancelSession(item)} aria-label="Hủy buổi học" />}</Space>
    } },
  ]
  const columns: TableProps<ClassRecord>['columns'] = [
    { title: 'Lớp học', key: 'class', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.name.slice(0, 2).toUpperCase()}</Avatar><div><strong>{item.name}</strong><small>{item.code} · {item.course}</small></div></div> },
    { title: 'Giáo viên', dataIndex: 'teacher' },
    { title: 'Lịch và phòng', key: 'schedule', render: (_, item) => <div><Typography.Text strong>{item.schedule}</Typography.Text><br /><Typography.Text type="secondary">{item.room}</Typography.Text></div> },
    { title: 'Sĩ số', key: 'students', render: (_, item) => `${item.enrolled}/${item.capacity}` },
    { title: 'Tiến độ', dataIndex: 'progress', width: 150, render: (value: number) => <Progress percent={value} size="small" /> },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: ClassStatus) => <Tag color={statusColor[value]}>{value}</Tag> },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button icon={<CaretRight />} onClick={() => openDetails(item)} aria-label={`Xem lớp ${item.name}`} /> },
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
    <Drawer size={760} title="Thông tin lớp học" open={Boolean(selected)} onClose={closeDetails}>
      {selected && <>
        <Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.slice(0, 2).toUpperCase()}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text type="secondary">{selected.code}</Typography.Text></div></Flex>
        <Tabs style={{ marginTop: 18 }} items={[
          {
            key: 'overview', label: 'Tổng quan', children: <>
              <Descriptions bordered column={1} size="small" items={[{ key: 'course', label: 'Khóa học', children: selected.course }, { key: 'start', label: 'Ngày khai giảng', children: displayDate(selected.startDate) }, { key: 'sessions', label: 'Buổi học', children: `${selected.completedSessions}/${selected.generatedSessions}/${selected.sessions} hoàn tất/đã tạo/kế hoạch` }, { key: 'teacher', label: 'Giáo viên', children: selected.teacher }, { key: 'schedule', label: 'Lịch học', children: selected.schedule }, { key: 'room', label: 'Phòng học', children: selected.room }, { key: 'students', label: 'Sĩ số', children: `${selected.enrolled}/${selected.capacity} học viên` }, { key: 'progress', label: 'Tiến độ', children: `${selected.progress}%` }]} />
              <Card size="small" className="admin-drawer-status"><Flex justify="space-between"><Typography.Text type="secondary">Trạng thái lớp</Typography.Text><Tag color={statusColor[selected.status]}>{selected.status}</Tag></Flex></Card>
              {selected.generatedSessions > selected.effectiveSessions && <Alert style={{ marginTop: 16 }} type="warning" showIcon title={`${selected.generatedSessions - selected.effectiveSessions} buổi đã hủy chưa xếp học bù`} description="Mở tab Buổi học để xếp bù. Buổi hủy không được tính hoàn thành chương trình." />}
              {selected.status !== 'Đã hủy' && selected.status !== 'Đã kết thúc' && <Space orientation="vertical" style={{ width: '100%', marginTop: 18 }}><Button block icon={<CalendarBlank />} disabled={!selected.teacherId || selected.schedule === 'Chưa xếp lịch' || selected.generatedSessions > 0} onClick={() => generateSessions(selected)}>{selected.generatedSessions ? `Đã tạo ${selected.generatedSessions} buổi học` : 'Tạo các buổi học'}</Button>{selected.status === 'Sắp khai giảng' && <Button block type="primary" icon={<Play />} disabled={selected.effectiveSessions !== selected.sessions || selected.enrolled === 0} onClick={() => changeLifecycle(selected, 'start')}>Bắt đầu lớp học</Button>}{selected.status === 'Đang học' && <Button block type="primary" icon={<CheckCircle />} disabled={selected.completedSessions !== selected.sessions} onClick={() => changeLifecycle(selected, 'complete')}>Kết thúc lớp học</Button>}<Button block icon={<PencilSimple />} onClick={() => openEdit(selected)}>Sửa thông tin lớp</Button><Button block danger icon={<Trash />} onClick={() => cancel(selected)}>Hủy lớp học</Button></Space>}
            </>,
          },
          {
            key: 'sessions', label: `Buổi học (${classSessions.length})`, children: <Table rowKey="id" size="small" loading={sessionsLoading} columns={sessionColumns} dataSource={classSessions} pagination={{ pageSize: 8, hideOnSinglePage: true }} scroll={{ x: 650 }} locale={{ emptyText: selected.generatedSessions ? 'Không có buổi học' : 'Hãy tạo các buổi học từ tab Tổng quan' }} />,
          },
          { key: 'academic', label: 'Học viên, điểm danh và điểm', children: <AcademicDetails classId={selected.id} /> },
        ]} />
      </>}
    </Drawer>
    <Modal title={sessionEditing?.status === 'da_huy' ? 'Xếp lịch học bù' : 'Sửa buổi học'} open={sessionEditing !== null} onCancel={() => setSessionEditing(null)} onOk={() => sessionForm.submit()} okText="Lưu buổi học" destroyOnHidden>
      <Form form={sessionForm} layout="vertical" onFinish={saveSession} style={{ marginTop: 20 }}>
        <Form.Item name="date" label="Ngày học" rules={[{ required: true, message: 'Vui lòng chọn ngày học.' }]}><Input type="date" /></Form.Item>
        <Space align="start"><Form.Item name="startTime" label="Giờ bắt đầu" rules={[{ required: true }]}><Input type="time" /></Form.Item><Form.Item name="endTime" label="Giờ kết thúc" rules={[{ required: true }]}><Input type="time" /></Form.Item></Space>
        <Form.Item name="teacherId" label="Giáo viên" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={teachers.map((item) => ({ value: item.id, label: item.fullName }))} /></Form.Item>
        <Form.Item name="roomId" label="Phòng học" rules={[{ required: true }]}><Select options={rooms.filter((room) => room.capacity >= (selected?.capacity ?? 0)).map((room) => ({ value: room.id, label: `${room.code} · ${room.capacity} chỗ` }))} /></Form.Item>
      </Form>
    </Modal>
    <Modal title={editing === 'new' ? 'Tạo lớp học' : 'Sửa thông tin lớp'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing === 'new' ? 'Tạo lớp' : 'Cập nhật'} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}>
        <Form.Item name="code" label="Mã lớp" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã lớp.' }]}><Input placeholder="VD: A2-GT-10" /></Form.Item>
        <Form.Item name="name" label="Tên lớp" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên lớp.' }]}><Input /></Form.Item>
        <Form.Item name="courseId" label="Khóa học" rules={[{ required: true, message: 'Vui lòng chọn khóa học.' }]}><Select showSearch optionFilterProp="label" disabled={typeof editing === 'object' && editing !== null && (editing.enrolled > 0 || editing.generatedSessions > 0)} options={courses.map((item) => ({ value: item.id, label: item.name }))} /></Form.Item>
        <Form.Item name="teacherId" label="Giáo viên"><Select allowClear={editing === 'new' || (typeof editing === 'object' && editing !== null && editing.schedule === 'Chưa xếp lịch')} showSearch optionFilterProp="label" options={teachers.map((item) => ({ value: item.id, label: item.fullName }))} /></Form.Item>
        {planLocked && <Alert type="info" showIcon title="Lớp đã sinh buổi học" description="Ngày khai giảng và số buổi đã khóa. Đổi giáo viên chỉ cập nhật buổi tương lai của giáo viên cũ; buổi dạy thay và lịch sử giữ nguyên." style={{ marginBottom: 18 }} />}
        <Form.Item name="startDate" label="Ngày khai giảng" rules={[{ required: true, message: 'Vui lòng chọn ngày khai giảng.' }]}><Input type="date" disabled={planLocked} /></Form.Item>
        <Space align="start" wrap><Form.Item name="sessions" label="Số buổi" rules={[{ required: true, message: 'Vui lòng nhập số buổi.' }]}><InputNumber min={1} disabled={planLocked} /></Form.Item><Form.Item name="capacity" label="Sĩ số tối đa" rules={[{ required: true, message: 'Vui lòng nhập sĩ số.' }]}><InputNumber min={1} /></Form.Item></Space>
      </Form>
    </Modal>
  </AdminLayout>
}

export default AdminClasses
