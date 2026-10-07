import { useEffect, useMemo, useState } from 'react'
import { Books, CurrencyCircleDollar, GlobeHemisphereWest, MagnifyingGlass, PencilSimple, Plus, Trash, UsersThree } from '@phosphor-icons/react'
import { Avatar, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { api, errorMessage, json } from '../api'

type CourseStatus = 'Đang mở' | 'Tạm ẩn'
type CourseRecord = { id: number; code: string; name: string; language: string; level: string; sessions: number; tuition: number; linkedClasses: number; status: CourseStatus }
type CourseForm = Omit<CourseRecord, 'id' | 'linkedClasses'>
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

type CourseApi = Omit<CourseRecord, 'status'> & { status: 'dang_mo' | 'tam_an' }
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

function AdminCourses({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('Tất cả')
  const [editing, setEditing] = useState<CourseRecord | 'new' | null>(null)
  const [form] = Form.useForm<CourseForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const languages = useMemo(() => [...new Set(courses.map((item) => item.language))], [courses])
  const data = useMemo(() => courses.filter((item) => (!query.trim() || [item.name, item.code, item.language, item.level].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (language === 'Tất cả' || item.language === language)), [courses, language, query])

  const load = async () => {
    try {
      const rows = await api<CourseApi[]>('/courses/all')
      setCourses(rows.map((item) => ({ ...item, linkedClasses: Number(item.linkedClasses), status: item.status === 'dang_mo' ? 'Đang mở' : 'Tạm ẩn' })))
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])

  const openCreate = () => { setEditing('new'); form.setFieldsValue({ code: '', name: '', language: 'Tiếng Anh', level: '', sessions: 24, tuition: 3200000, status: 'Đang mở' }) }
  const openEdit = (course: CourseRecord) => { setEditing(course); form.setFieldsValue(course) }
  const save = async (values: CourseForm) => {
    const code = values.code.trim().toUpperCase()
    if (courses.some((item) => item.code.toUpperCase() === code && item.id !== (typeof editing === 'object' && editing ? editing.id : -1))) { form.setFields([{ name: 'code', errors: ['Mã khóa học đã tồn tại.'] }]); return }
    try {
      const body = { ...values, code, status: values.status === 'Đang mở' ? 'dang_mo' : 'tam_an' }
      await api(editing === 'new' ? '/courses' : `/courses/${editing!.id}`, json(editing === 'new' ? 'POST' : 'PATCH', body))
      messageApi.success(editing === 'new' ? 'Đã thêm khóa học.' : 'Đã cập nhật khóa học.')
      setEditing(null); await load()
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  const remove = async (course: CourseRecord) => {
    try { await api(`/courses/${course.id}`, { method: 'DELETE' }); await load(); messageApi.success('Đã xóa khóa học.') }
    catch (error) { messageApi.error(errorMessage(error)) }
  }
  const columns: TableProps<CourseRecord>['columns'] = [
    { title: 'Khóa học', key: 'course', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.language.replace('Tiếng ', '').slice(0, 2).toUpperCase()}</Avatar><div><strong>{item.name}</strong><small>{item.code}</small></div></div> },
    { title: 'Ngoại ngữ', key: 'language', render: (_, item) => <div><Typography.Text strong>{item.language}</Typography.Text><br /><Typography.Text type="secondary">{item.level}</Typography.Text></div> },
    { title: 'Số buổi', dataIndex: 'sessions', render: (value) => `${value} buổi` },
    { title: 'Học phí', dataIndex: 'tuition', render: (value) => <Typography.Text strong>{money(value)}</Typography.Text> },
    { title: 'Lớp liên kết', dataIndex: 'linkedClasses', render: (value) => `${value} lớp` },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: CourseStatus) => <Tag color={value === 'Đang mở' ? 'green' : 'default'}>{value}</Tag> },
    { title: '', key: 'actions', width: 92, render: (_, item) => <Space size={4}><Button icon={<PencilSimple />} onClick={() => openEdit(item)} aria-label={`Sửa ${item.name}`} /><Popconfirm title="Xóa khóa học?" description={item.name} onConfirm={() => remove(item)} okButtonProps={{ danger: true }}><Button danger icon={<Trash />} aria-label={`Xóa ${item.name}`} /></Popconfirm></Space> },
  ]
  return <AdminLayout activePage="courses" mainId="course-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}
    <AdminPageHeader kicker="Danh mục đào tạo" title="Quản lý khóa học" description="Quản lý chương trình, số buổi và mức học phí cho từng ngoại ngữ." actions={<Button type="primary" icon={<Plus />} onClick={openCreate}>Thêm khóa học</Button>} />
    <AdminSummary items={[{ label: 'Tổng khóa học', value: courses.length, detail: `${courses.filter((item) => item.status === 'Đang mở').length} khóa đang mở đăng ký`, icon: <Books weight="duotone" />, tone: 'success' }, { label: 'Ngoại ngữ đào tạo', value: languages.length, detail: 'Danh mục cho nhiều ngôn ngữ', icon: <GlobeHemisphereWest weight="duotone" /> }, { label: 'Lớp đang liên kết', value: courses.reduce((sum, item) => sum + item.linkedClasses, 0), detail: 'Không thể xóa khóa học có lớp', icon: <UsersThree weight="duotone" /> }]} />
    <Card className="admin-table-card" title="Danh sách khóa học" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã hoặc trình độ" /><Select value={language} onChange={setLanguage} options={['Tất cả', ...languages].map((value) => ({ value, label: value }))} /></Space>}><Table rowKey="id" columns={columns} dataSource={data} scroll={{ x: 940 }} pagination={{ pageSize: 5, showTotal: (total) => `${total} khóa học` }} /></Card>
    <Modal title={editing === 'new' ? 'Thêm khóa học' : 'Sửa khóa học'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing === 'new' ? 'Lưu khóa học' : 'Cập nhật'} cancelText="Hủy" destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}><Form.Item name="code" label="Mã khóa học" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã khóa học.' }]}><Input placeholder="VD: EN-A2-01" /></Form.Item><Form.Item name="name" label="Tên khóa học" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên khóa học.' }]}><Input /></Form.Item><Space align="start" style={{ width: '100%' }}><Form.Item name="language" label="Ngoại ngữ" rules={[{ required: true, whitespace: true }]}><Input /></Form.Item><Form.Item name="level" label="Trình độ" rules={[{ required: true, whitespace: true }]}><Input /></Form.Item></Space><Space align="start" style={{ width: '100%' }}><Form.Item name="sessions" label="Số buổi" rules={[{ required: true, type: 'integer', min: 1, message: 'Số buổi phải là số nguyên dương.' }]}><InputNumber min={1} precision={0} /></Form.Item><Form.Item name="tuition" label="Học phí (VNĐ)" extra="Thu trọn khóa; chưa hỗ trợ khóa miễn phí." rules={[{ required: true, type: 'integer', min: 1, max: 999999999999, message: 'Học phí phải là số nguyên dương, tối đa 12 chữ số.' }]}><InputNumber min={1} max={999999999999} precision={0} step={1000} prefix={<CurrencyCircleDollar />} /></Form.Item></Space><Form.Item name="status" label="Trạng thái"><Select options={['Đang mở', 'Tạm ẩn'].map((value) => ({ value, label: value }))} /></Form.Item></Form>
    </Modal>
  </AdminLayout>
}
export default AdminCourses
