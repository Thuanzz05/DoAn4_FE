import { useEffect, useMemo, useState } from 'react'
import { Books, CaretRight, ChalkboardTeacher, Key, Lock, LockOpen, MagnifyingGlass, PencilSimple, Plus, UsersThree } from '@phosphor-icons/react'
import { Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { api, errorMessage, json } from '../api'

type TeacherStatus = 'Đang hoạt động' | 'Đã khóa'
type TeacherRecord = { id: number; code: string; name: string; email: string; phone: string; language: string; specialty: string; activeClasses: number; status: TeacherStatus; joined: string }
type TeacherForm = Pick<TeacherRecord, 'name' | 'email' | 'phone' | 'language' | 'specialty'> & { password?: string }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

type UserApi = { id: number; code: string; fullName: string; email: string; phone: string | null; teachingLanguage: string | null; specialty: string | null; activeClasses: number; active: number; createdAt: string }

function AdminTeachers({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | TeacherStatus>('Tất cả')
  const [selected, setSelected] = useState<TeacherRecord | null>(null)
  const [editing, setEditing] = useState<TeacherRecord | 'new' | null>(null)
  const [form] = Form.useForm<TeacherForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modal, modalContextHolder] = Modal.useModal()
  const data = useMemo(() => teachers.filter((item) => (!query.trim() || [item.name, item.code, item.email, item.language, item.specialty].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [query, status, teachers])

  const load = async () => {
    try {
      const rows = await api<UserApi[]>('/users?role=giao_vien')
      setTeachers(rows.map((item) => ({ id: item.id, code: item.code, name: item.fullName, email: item.email, phone: item.phone ?? '', language: item.teachingLanguage ?? '', specialty: item.specialty ?? '', activeClasses: Number(item.activeClasses), status: item.active ? 'Đang hoạt động' : 'Đã khóa', joined: new Intl.DateTimeFormat('vi-VN').format(new Date(item.createdAt)) })))
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])

  const openCreate = () => { setEditing('new'); form.setFieldsValue({ name: '', email: '', phone: '', language: 'Tiếng Anh', specialty: '', password: '' }) }
  const openEdit = (teacher: TeacherRecord) => { setSelected(null); setEditing(teacher); form.setFieldsValue(teacher) }
  const save = async (values: TeacherForm) => {
    const email = values.email.trim().toLocaleLowerCase('vi'); const phone = values.phone.replace(/\s/g, '')
    const editingId = typeof editing === 'object' && editing ? editing.id : -1
    if (teachers.some((item) => item.email.toLocaleLowerCase('vi') === email && item.id !== editingId)) { form.setFields([{ name: 'email', errors: ['Email đã được sử dụng.'] }]); return }
    if (teachers.some((item) => item.phone.replace(/\s/g, '') === phone && item.id !== editingId)) { form.setFields([{ name: 'phone', errors: ['Số điện thoại đã được sử dụng.'] }]); return }
    try {
      const body = { fullName: values.name, email, phone, teachingLanguage: values.language, specialty: values.specialty, ...(editing === 'new' ? { role: 'giao_vien', password: values.password } : {}) }
      await api(editing === 'new' ? '/users' : `/users/${editing!.id}`, json(editing === 'new' ? 'POST' : 'PATCH', body))
      messageApi.success(editing === 'new' ? 'Đã tạo tài khoản giáo viên.' : 'Đã cập nhật giáo viên.'); setEditing(null); await load()
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  const toggleStatus = (teacher: TeacherRecord) => modal.confirm({ title: teacher.status === 'Đang hoạt động' ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?', content: teacher.activeClasses > 0 ? `${teacher.name} đang phụ trách ${teacher.activeClasses} lớp.` : teacher.name, okText: 'Xác nhận', onOk: async () => { try { await api(`/users/${teacher.id}/status?force=true`, json('PATCH', { active: teacher.status !== 'Đang hoạt động' })); await load(); setSelected(null); messageApi.success('Đã cập nhật trạng thái tài khoản.') } catch (error) { messageApi.error(errorMessage(error)) } } })
  const resetPassword = async (teacher: TeacherRecord) => { try { const result = await api<{ emailSent: boolean; devTemporaryPassword?: string }>(`/users/${teacher.id}/reset-password`, { method: 'POST' }); messageApi.success(result.emailSent ? `Đã gửi mật khẩu tới ${teacher.email}` : `Mật khẩu tạm: ${result.devTemporaryPassword}`) } catch (error) { messageApi.error(errorMessage(error)) } }
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
    <Drawer size={450} title="Tài khoản giáo viên" open={Boolean(selected)} onClose={() => setSelected(null)}>{selected && <><Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text type="secondary">{selected.code}</Typography.Text></div></Flex><Descriptions bordered column={1} size="small" style={{ marginTop: 24 }} items={[{ key: 'email', label: 'Email', children: selected.email }, { key: 'phone', label: 'Điện thoại', children: selected.phone }, { key: 'language', label: 'Ngoại ngữ', children: selected.language }, { key: 'specialty', label: 'Chuyên môn', children: selected.specialty }, { key: 'classes', label: 'Lớp phụ trách', children: `${selected.activeClasses} lớp` }]} /><Space orientation="vertical" style={{ width: '100%', marginTop: 20 }}><Button block icon={<PencilSimple />} onClick={() => openEdit(selected)}>Sửa thông tin</Button><Button block icon={<Key />} onClick={() => resetPassword(selected)}>Đặt lại mật khẩu</Button><Button block danger={selected.status === 'Đang hoạt động'} icon={selected.status === 'Đang hoạt động' ? <Lock /> : <LockOpen />} onClick={() => toggleStatus(selected)}>{selected.status === 'Đang hoạt động' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</Button></Space></>}</Drawer>
    <Modal title={editing === 'new' ? 'Thêm giáo viên' : 'Sửa giáo viên'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing === 'new' ? 'Tạo tài khoản' : 'Cập nhật'} destroyOnHidden><Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}><Form.Item name="name" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email', message: 'Email chưa hợp lệ.' }]}><Input /></Form.Item><Form.Item name="phone" label="Số điện thoại" rules={[{ required: true }, { transform: (value: string) => value.replace(/\s/g, ''), pattern: /^0\d{9}$/, message: 'Số điện thoại phải gồm 10 chữ số.' }]}><Input /></Form.Item>{editing === 'new' && <Form.Item name="password" label="Mật khẩu ban đầu" rules={[{ required: true }, { min: 8 }]}><Input.Password /></Form.Item>}<Form.Item name="language" label="Ngoại ngữ" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="specialty" label="Chuyên môn" rules={[{ required: true }]}><Input /></Form.Item></Form></Modal>
  </AdminLayout>
}
export default AdminTeachers
