import { useMemo, useState } from 'react'
import { CaretRight, MagnifyingGlass, MapPin, PencilSimple, Plus, Student, Trash, UsersThree } from '@phosphor-icons/react'
import { Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, InputNumber, Modal, Progress, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { demoCourses } from './demoCourses'

type ClassStatus = 'Đang học' | 'Sắp khai giảng' | 'Đã kết thúc' | 'Đã hủy'
type ClassRecord = { code: string; name: string; course: string; startDate: string; sessions: number; capacity: number; enrolled: number; teacher: string; schedule: string; room: string; status: ClassStatus; progress: number }
type ClassForm = Pick<ClassRecord, 'code' | 'name' | 'course' | 'startDate' | 'sessions' | 'capacity'>
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const initialClasses: ClassRecord[] = [
  { code: 'A2-GT-09', name: 'A2 Giao tiếp', course: 'Tiếng Anh giao tiếp A2', startDate: '2026-08-12', sessions: 24, capacity: 20, enrolled: 18, teacher: 'Nguyễn Quốc Minh', schedule: 'T2, T4, T6 · 18:00', room: 'P.201', status: 'Đang học', progress: 62 },
  { code: 'B1-TQ-06', name: 'B1 Tổng quát', course: 'Tiếng Anh B1 tổng quát', startDate: '2026-07-02', sessions: 30, capacity: 18, enrolled: 16, teacher: 'Trần Ngọc Lan', schedule: 'T3, T5 · 18:30', room: 'P.105', status: 'Đang học', progress: 48 },
  { code: 'IELTS-12', name: 'IELTS 6.5', course: 'Luyện thi IELTS 6.5', startDate: '2026-05-18', sessions: 36, capacity: 16, enrolled: 14, teacher: 'Lê Gia Hùng', schedule: 'T2, T5, T7 · 19:00', room: 'P.302', status: 'Đang học', progress: 71 },
  { code: 'A1-CB-14', name: 'A1 Căn bản', course: 'Tiếng Anh A1 căn bản', startDate: '2026-10-05', sessions: 24, capacity: 20, enrolled: 12, teacher: 'Phạm Thu Hà', schedule: 'T3, T6 · 17:30', room: 'P.103', status: 'Sắp khai giảng', progress: 0 },
  { code: 'TOEIC-08', name: 'TOEIC 650+', course: 'Luyện thi TOEIC 650+', startDate: '2026-08-25', sessions: 28, capacity: 20, enrolled: 19, teacher: 'Võ Minh Khang', schedule: 'T4, T7 · 18:00', room: 'P.204', status: 'Đang học', progress: 35 },
  { code: 'B2-TQ-03', name: 'B2 Tổng quát', course: 'Tiếng Anh B2 tổng quát', startDate: '2026-04-10', sessions: 30, capacity: 18, enrolled: 15, teacher: 'Đặng Mỹ Linh', schedule: 'T2, T4 · 19:30', room: 'P.301', status: 'Đã kết thúc', progress: 100 },
]
const statusColor: Record<ClassStatus, string> = { 'Đang học': 'green', 'Sắp khai giảng': 'gold', 'Đã kết thúc': 'default', 'Đã hủy': 'red' }
const displayDate = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))

function AdminClasses({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [classes, setClasses] = useState(initialClasses)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | ClassStatus>('Tất cả')
  const [selected, setSelected] = useState<ClassRecord | null>(null)
  const [editing, setEditing] = useState<ClassRecord | 'new' | null>(null)
  const [form] = Form.useForm<ClassForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  const data = useMemo(() => classes.filter((item) => (!query.trim() || [item.name, item.code, item.course, item.teacher].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [classes, query, status])

  const openNew = () => { form.resetFields(); form.setFieldsValue({ course: demoCourses[0], sessions: 24, capacity: 20 }); setEditing('new') }
  const openEdit = (item: ClassRecord) => { form.setFieldsValue(item); setSelected(null); setEditing(item) }
  const save = (values: ClassForm) => {
    const code = values.code.trim().toUpperCase()
    if (classes.some((item) => item.code === code && item.code !== (typeof editing === 'object' && editing ? editing.code : ''))) {
      form.setFields([{ name: 'code', errors: ['Mã lớp đã tồn tại.'] }]); return
    }
    if (typeof editing === 'object' && editing && values.capacity < editing.enrolled) {
      form.setFields([{ name: 'capacity', errors: [`Sĩ số hiện tại là ${editing.enrolled}.`] }]); return
    }
    if (typeof editing === 'object' && editing && editing.enrolled > 0 && editing.course !== values.course) {
      form.setFields([{ name: 'course', errors: ['Lớp đã có học viên, không thể đổi khóa học.'] }]); return
    }
    if (editing === 'new') setClasses((current) => [{ ...values, code, name: values.name.trim(), enrolled: 0, teacher: 'Chưa phân công', schedule: 'Chưa xếp lịch', room: '—', status: 'Sắp khai giảng', progress: 0 }, ...current])
    else if (editing) setClasses((current) => current.map((item) => item.code === editing.code ? { ...item, ...values, code, name: values.name.trim() } : item))
    setEditing(null)
    messageApi.success(editing === 'new' ? 'Đã tạo lớp học.' : 'Đã cập nhật lớp học.')
  }
  const cancel = (item: ClassRecord) => {
    if (item.enrolled > 0) { messageApi.warning('Lớp đang có học viên. Hãy chuyển lớp cho học viên trước khi hủy.'); return }
    if (item.status === 'Đã kết thúc' || item.status === 'Đã hủy') return
    modalApi.confirm({ title: 'Hủy lớp học?', content: `${item.name} · ${item.code}. Lịch giáo viên và phòng sẽ được giải phóng trong bản ghi minh họa này.`, okText: 'Hủy lớp', okButtonProps: { danger: true }, onOk: () => { setClasses((current) => current.map((record) => record.code === item.code ? { ...record, status: 'Đã hủy', teacher: 'Chưa phân công', room: '—', schedule: 'Đã hủy' } : record)); setSelected(null); messageApi.success('Đã hủy lớp học.') } })
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
      { label: 'Học viên đã xếp lớp', value: classes.filter((item) => item.status !== 'Đã hủy').reduce((sum, item) => sum + item.enrolled, 0), detail: 'Trên danh sách minh họa', icon: <Student weight="duotone" /> },
      { label: 'Phòng đang sử dụng', value: new Set(classes.filter((item) => item.status === 'Đang học').map((item) => item.room)).size, detail: 'Theo lịch các lớp đang học', icon: <MapPin weight="duotone" /> },
    ]} />
    <Card className="admin-table-card" title="Danh sách lớp học" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, khóa hoặc giáo viên" /><Select value={status} onChange={setStatus} options={['Tất cả', 'Đang học', 'Sắp khai giảng', 'Đã kết thúc', 'Đã hủy'].map((value) => ({ value, label: value }))} /></Space>}><Table rowKey="code" columns={columns} dataSource={data} scroll={{ x: 1000 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} lớp học` }} locale={{ emptyText: 'Không tìm thấy lớp phù hợp' }} /></Card>
    <Drawer size={440} title="Thông tin lớp học" open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <><Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.slice(0, 2).toUpperCase()}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text type="secondary">{selected.code}</Typography.Text></div></Flex><Descriptions bordered column={1} size="small" style={{ marginTop: 24 }} items={[{ key: 'course', label: 'Khóa học', children: selected.course }, { key: 'start', label: 'Ngày khai giảng', children: displayDate(selected.startDate) }, { key: 'sessions', label: 'Số buổi', children: selected.sessions }, { key: 'teacher', label: 'Giáo viên', children: selected.teacher }, { key: 'schedule', label: 'Lịch học', children: selected.schedule }, { key: 'room', label: 'Phòng học', children: selected.room }, { key: 'students', label: 'Sĩ số', children: `${selected.enrolled}/${selected.capacity} học viên` }, { key: 'progress', label: 'Tiến độ', children: `${selected.progress}%` }]} /><Card size="small" className="admin-drawer-status"><Flex justify="space-between"><Typography.Text type="secondary">Trạng thái lớp</Typography.Text><Tag color={statusColor[selected.status]}>{selected.status}</Tag></Flex></Card>{selected.status !== 'Đã hủy' && selected.status !== 'Đã kết thúc' && <Space orientation="vertical" style={{ width: '100%', marginTop: 18 }}><Button block icon={<PencilSimple />} onClick={() => openEdit(selected)}>Sửa thông tin lớp</Button><Button block danger icon={<Trash />} onClick={() => cancel(selected)}>Hủy lớp học</Button></Space>}</>}
    </Drawer>
    <Modal title={editing === 'new' ? 'Tạo lớp học' : 'Sửa thông tin lớp'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing === 'new' ? 'Tạo lớp' : 'Cập nhật'} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}>
        <Form.Item name="code" label="Mã lớp" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã lớp.' }]}><Input placeholder="VD: A2-GT-10" /></Form.Item>
        <Form.Item name="name" label="Tên lớp" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên lớp.' }]}><Input /></Form.Item>
        <Form.Item name="course" label="Khóa học" rules={[{ required: true, message: 'Vui lòng chọn khóa học.' }]}><Select showSearch optionFilterProp="label" disabled={typeof editing === 'object' && editing !== null && editing.enrolled > 0} options={demoCourses.map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item name="startDate" label="Ngày khai giảng" rules={[{ required: true, message: 'Vui lòng chọn ngày khai giảng.' }]}><Input type="date" /></Form.Item>
        <Space align="start" wrap><Form.Item name="sessions" label="Số buổi" rules={[{ required: true, message: 'Vui lòng nhập số buổi.' }]}><InputNumber min={1} /></Form.Item><Form.Item name="capacity" label="Sĩ số tối đa" rules={[{ required: true, message: 'Vui lòng nhập sĩ số.' }]}><InputNumber min={1} /></Form.Item></Space>
      </Form>
    </Modal>
  </AdminLayout>
}

export default AdminClasses
