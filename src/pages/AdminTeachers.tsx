import { useMemo, useState } from 'react'
import { Books, CaretRight, ChalkboardTeacher, Key, Lock, LockOpen, MagnifyingGlass, PencilSimple, Plus, UsersThree } from '@phosphor-icons/react'
import { Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'

type TeacherStatus = 'Đang hoạt động' | 'Đã khóa'
type TeacherRecord = { id: number; code: string; name: string; email: string; phone: string; language: string; specialty: string; activeClasses: number; status: TeacherStatus; joined: string }
type TeacherForm = Pick<TeacherRecord, 'name' | 'email' | 'phone' | 'language' | 'specialty'>
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const initialTeachers: TeacherRecord[] = [
  { id: 1, code: 'GV-001', name: 'Nguyễn Quốc Minh', email: 'minh.nguyen@trungtam.vn', phone: '090 481 2036', language: 'Tiếng Anh', specialty: 'Giao tiếp, IELTS', activeClasses: 3, status: 'Đang hoạt động', joined: '12/02/2024' },
  { id: 2, code: 'GV-002', name: 'Trần Ngọc Lan', email: 'lan.tran@trungtam.vn', phone: '091 728 1540', language: 'Tiếng Anh', specialty: 'Tổng quát A2-B2', activeClasses: 2, status: 'Đang hoạt động', joined: '08/05/2024' },
  { id: 3, code: 'GV-003', name: 'Lê Gia Hùng', email: 'hung.le@trungtam.vn', phone: '098 315 6724', language: 'Tiếng Anh', specialty: 'IELTS Academic', activeClasses: 2, status: 'Đang hoạt động', joined: '19/08/2024' },
  { id: 4, code: 'GV-004', name: 'Kim Anh Thư', email: 'thu.kim@trungtam.vn', phone: '093 604 2817', language: 'Tiếng Hàn', specialty: 'TOPIK I-II', activeClasses: 2, status: 'Đang hoạt động', joined: '03/01/2025' },
  { id: 5, code: 'GV-005', name: 'Lương Hải Yến', email: 'yen.luong@trungtam.vn', phone: '097 251 8493', language: 'Tiếng Trung', specialty: 'HSK 1-4', activeClasses: 1, status: 'Đang hoạt động', joined: '16/03/2025' },
  { id: 6, code: 'GV-006', name: 'Phạm Mai Chi', email: 'chi.pham@trungtam.vn', phone: '096 473 1058', language: 'Tiếng Nhật', specialty: 'JLPT N5-N3', activeClasses: 1, status: 'Đang hoạt động', joined: '21/06/2025' },
  { id: 7, code: 'GV-007', name: 'Đỗ Thanh Hà', email: 'ha.do@trungtam.vn', phone: '092 830 4165', language: 'Tiếng Pháp', specialty: 'A1-B1', activeClasses: 0, status: 'Đã khóa', joined: '11/09/2025' },
]

function AdminTeachers({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [teachers, setTeachers] = useState(initialTeachers)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | TeacherStatus>('Tất cả')
  const [selected, setSelected] = useState<TeacherRecord | null>(null)
  const [editing, setEditing] = useState<TeacherRecord | 'new' | null>(null)
  const [form] = Form.useForm<TeacherForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modal, modalContextHolder] = Modal.useModal()
  const data = useMemo(() => teachers.filter((item) => (!query.trim() || [item.name, item.code, item.email, item.language, item.specialty].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [query, status, teachers])

  const openCreate = () => { setEditing('new'); form.setFieldsValue({ name: '', email: '', phone: '', language: 'Tiếng Anh', specialty: '' }) }
  const openEdit = (teacher: TeacherRecord) => { setSelected(null); setEditing(teacher); form.setFieldsValue(teacher) }
  const save = (values: TeacherForm) => {
    const email = values.email.trim().toLocaleLowerCase('vi'); const phone = values.phone.replace(/\s/g, '')
    const editingId = typeof editing === 'object' && editing ? editing.id : -1
    if (teachers.some((item) => item.email.toLocaleLowerCase('vi') === email && item.id !== editingId)) { form.setFields([{ name: 'email', errors: ['Email đã được sử dụng.'] }]); return }
    if (teachers.some((item) => item.phone.replace(/\s/g, '') === phone && item.id !== editingId)) { form.setFields([{ name: 'phone', errors: ['Số điện thoại đã được sử dụng.'] }]); return }
    if (editing === 'new') { const id = Math.max(...teachers.map((item) => item.id)) + 1; setTeachers((current) => [{ ...values, email, phone, id, code: `GV-${String(id).padStart(3, '0')}`, activeClasses: 0, status: 'Đang hoạt động', joined: new Intl.DateTimeFormat('vi-VN').format(new Date()) }, ...current]) }
    else if (editing) setTeachers((current) => current.map((item) => item.id === editing.id ? { ...item, ...values, email, phone } : item))
    messageApi.success(editing === 'new' ? 'Đã tạo tài khoản giáo viên.' : 'Đã cập nhật giáo viên.'); setEditing(null)
  }
  const toggleStatus = (teacher: TeacherRecord) => modal.confirm({ title: teacher.status === 'Đang hoạt động' ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?', content: teacher.activeClasses > 0 ? `${teacher.name} đang phụ trách ${teacher.activeClasses} lớp.` : teacher.name, okText: 'Xác nhận', onOk: () => { setTeachers((current) => current.map((item) => item.id === teacher.id ? { ...item, status: item.status === 'Đang hoạt động' ? 'Đã khóa' : 'Đang hoạt động' } : item)); setSelected((current) => current?.id === teacher.id ? { ...current, status: current.status === 'Đang hoạt động' ? 'Đã khóa' : 'Đang hoạt động' } : current); messageApi.success('Đã cập nhật trạng thái tài khoản.') } })
  const columns: TableProps<TeacherRecord>['columns'] = [
    { title: 'Giáo viên', key: 'teacher', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><strong>{item.name}</strong><small>{item.code}</small></div></div> },
    { title: 'Ngoại ngữ', dataIndex: 'language' }, { title: 'Chuyên môn', dataIndex: 'specialty' }, { title: 'Lớp phụ trách', dataIndex: 'activeClasses', render: (value) => `${value} lớp` },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: TeacherStatus) => <Tag color={value === 'Đang hoạt động' ? 'green' : 'default'}>{value}</Tag> },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button icon={<CaretRight />} onClick={() => setSelected(item)} aria-label={`Xem giáo viên ${item.name}`} /> },
  ]
  return <AdminLayout activePage="teachers" mainId="teacher-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}{modalContextHolder}<AdminPageHeader kicker="Tài khoản giảng dạy" title="Quản lý giáo viên" description="Quản lý hồ sơ, chuyên môn và trạng thái truy cập của giáo viên." actions={<Button type="primary" icon={<Plus />} onClick={openCreate}>Thêm giáo viên</Button>} />
    <AdminSummary items={[{ label: 'Tổng giáo viên', value: teachers.length, detail: `${teachers.filter((item) => item.status === 'Đang hoạt động').length} tài khoản đang hoạt động`, icon: <ChalkboardTeacher weight="duotone" />, tone: 'success' }, { label: 'Ngoại ngữ phụ trách', value: new Set(teachers.map((item) => item.language)).size, detail: 'Phân công theo chuyên môn', icon: <Books weight="duotone" /> }, { label: 'Lớp đang giảng dạy', value: teachers.reduce((sum, item) => sum + item.activeClasses, 0), detail: 'Cảnh báo trước khi khóa tài khoản', icon: <UsersThree weight="duotone" /> }]} />
    <Card className="admin-table-card" title="Danh sách giáo viên" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã hoặc ngoại ngữ" /><Select value={status} onChange={setStatus} options={['Tất cả', 'Đang hoạt động', 'Đã khóa'].map((value) => ({ value, label: value }))} /></Space>}><Table rowKey="id" columns={columns} dataSource={data} scroll={{ x: 820 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} giáo viên` }} /></Card>
    <Drawer size={450} title="Tài khoản giáo viên" open={Boolean(selected)} onClose={() => setSelected(null)}>{selected && <><Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text type="secondary">{selected.code}</Typography.Text></div></Flex><Descriptions bordered column={1} size="small" style={{ marginTop: 24 }} items={[{ key: 'email', label: 'Email', children: selected.email }, { key: 'phone', label: 'Điện thoại', children: selected.phone }, { key: 'language', label: 'Ngoại ngữ', children: selected.language }, { key: 'specialty', label: 'Chuyên môn', children: selected.specialty }, { key: 'classes', label: 'Lớp phụ trách', children: `${selected.activeClasses} lớp` }]} /><Space orientation="vertical" style={{ width: '100%', marginTop: 20 }}><Button block icon={<PencilSimple />} onClick={() => openEdit(selected)}>Sửa thông tin</Button><Button block icon={<Key />} onClick={() => messageApi.success(`Đã gửi mật khẩu mới tới ${selected.email}`)}>Đặt lại mật khẩu</Button><Button block danger={selected.status === 'Đang hoạt động'} icon={selected.status === 'Đang hoạt động' ? <Lock /> : <LockOpen />} onClick={() => toggleStatus(selected)}>{selected.status === 'Đang hoạt động' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</Button></Space></>}</Drawer>
    <Modal title={editing === 'new' ? 'Thêm giáo viên' : 'Sửa giáo viên'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing === 'new' ? 'Tạo tài khoản' : 'Cập nhật'} destroyOnHidden><Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}><Form.Item name="name" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email', message: 'Email chưa hợp lệ.' }]}><Input /></Form.Item><Form.Item name="phone" label="Số điện thoại" rules={[{ required: true }, { transform: (value: string) => value.replace(/\s/g, ''), pattern: /^0\d{9}$/, message: 'Số điện thoại phải gồm 10 chữ số.' }]}><Input /></Form.Item><Form.Item name="language" label="Ngoại ngữ" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="specialty" label="Chuyên môn" rules={[{ required: true }]}><Input /></Form.Item></Form></Modal>
  </AdminLayout>
}
export default AdminTeachers
