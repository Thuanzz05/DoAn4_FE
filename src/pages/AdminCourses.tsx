import { useMemo, useState } from 'react'
import { Books, CurrencyCircleDollar, GlobeHemisphereWest, MagnifyingGlass, PencilSimple, Plus, Trash, UsersThree } from '@phosphor-icons/react'
import { Avatar, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'

type CourseStatus = 'Đang mở' | 'Tạm ẩn'
type CourseRecord = { id: number; code: string; name: string; language: string; level: string; sessions: number; tuition: number; linkedClasses: number; status: CourseStatus }
type CourseForm = Omit<CourseRecord, 'id' | 'linkedClasses'>
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const initialCourses: CourseRecord[] = [
  { id: 1, code: 'EN-A1-01', name: 'Tiếng Anh A1 căn bản', language: 'Tiếng Anh', level: 'A1', sessions: 24, tuition: 3200000, linkedClasses: 3, status: 'Đang mở' },
  { id: 2, code: 'EN-IELTS-65', name: 'Luyện thi IELTS 6.5', language: 'Tiếng Anh', level: 'IELTS', sessions: 36, tuition: 6800000, linkedClasses: 4, status: 'Đang mở' },
  { id: 3, code: 'KO-TOPIK1', name: 'Tiếng Hàn TOPIK I', language: 'Tiếng Hàn', level: 'TOPIK I', sessions: 30, tuition: 4900000, linkedClasses: 2, status: 'Đang mở' },
  { id: 4, code: 'ZH-HSK3', name: 'Tiếng Trung HSK 3', language: 'Tiếng Trung', level: 'HSK 3', sessions: 30, tuition: 4600000, linkedClasses: 2, status: 'Đang mở' },
  { id: 5, code: 'JA-N5-01', name: 'Tiếng Nhật JLPT N5', language: 'Tiếng Nhật', level: 'N5', sessions: 32, tuition: 5200000, linkedClasses: 1, status: 'Đang mở' },
  { id: 6, code: 'FR-A1-01', name: 'Tiếng Pháp A1', language: 'Tiếng Pháp', level: 'A1', sessions: 24, tuition: 3900000, linkedClasses: 0, status: 'Đang mở' },
  { id: 7, code: 'EN-TOEIC-650', name: 'Luyện thi TOEIC 650+', language: 'Tiếng Anh', level: 'TOEIC', sessions: 28, tuition: 4200000, linkedClasses: 2, status: 'Đang mở' },
  { id: 8, code: 'KO-GT-01', name: 'Tiếng Hàn giao tiếp', language: 'Tiếng Hàn', level: 'Sơ cấp', sessions: 24, tuition: 3800000, linkedClasses: 0, status: 'Tạm ẩn' },
]
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

function AdminCourses({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [courses, setCourses] = useState(initialCourses)
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('Tất cả')
  const [editing, setEditing] = useState<CourseRecord | 'new' | null>(null)
  const [form] = Form.useForm<CourseForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const languages = useMemo(() => [...new Set(courses.map((item) => item.language))], [courses])
  const data = useMemo(() => courses.filter((item) => (!query.trim() || [item.name, item.code, item.language, item.level].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (language === 'Tất cả' || item.language === language)), [courses, language, query])

  const openCreate = () => { setEditing('new'); form.setFieldsValue({ code: '', name: '', language: 'Tiếng Anh', level: '', sessions: 24, tuition: 3200000, status: 'Đang mở' }) }
  const openEdit = (course: CourseRecord) => { setEditing(course); form.setFieldsValue(course) }
  const save = (values: CourseForm) => {
    const code = values.code.trim().toUpperCase()
    if (courses.some((item) => item.code.toUpperCase() === code && item.id !== (typeof editing === 'object' && editing ? editing.id : -1))) { form.setFields([{ name: 'code', errors: ['Mã khóa học đã tồn tại.'] }]); return }
    if (editing === 'new') setCourses((current) => [{ ...values, code, id: Math.max(...current.map((item) => item.id)) + 1, linkedClasses: 0 }, ...current])
    else if (editing) setCourses((current) => current.map((item) => item.id === editing.id ? { ...item, ...values, code } : item))
    messageApi.success(editing === 'new' ? 'Đã thêm khóa học.' : 'Đã cập nhật khóa học.')
    setEditing(null)
  }
  const remove = (course: CourseRecord) => {
    if (course.linkedClasses > 0) { messageApi.error(`Không thể xóa vì đang có ${course.linkedClasses} lớp liên kết.`); return }
    setCourses((current) => current.filter((item) => item.id !== course.id)); messageApi.success('Đã xóa khóa học.')
  }
  const columns: TableProps<CourseRecord>['columns'] = [
    { title: 'Khóa học', key: 'course', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.language.replace('Tiếng ', '').slice(0, 2).toUpperCase()}</Avatar><div><strong>{item.name}</strong><small>{item.code}</small></div></div> },
    { title: 'Ngoại ngữ', key: 'language', render: (_, item) => <div><Typography.Text strong>{item.language}</Typography.Text><br /><Typography.Text type="secondary">{item.level}</Typography.Text></div> },
    { title: 'Số buổi', dataIndex: 'sessions', render: (value) => `${value} buổi` },
    { title: 'Học phí', dataIndex: 'tuition', render: (value) => <Typography.Text strong>{money(value)}</Typography.Text> },
    { title: 'Lớp liên kết', dataIndex: 'linkedClasses', render: (value) => `${value} lớp` },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: CourseStatus) => <Tag color={value === 'Đang mở' ? 'green' : 'default'}>{value}</Tag> },
    { title: '', key: 'actions', width: 92, render: (_, item) => <Space size={4}><Button icon={<PencilSimple />} onClick={() => openEdit(item)} aria-label={`Sửa ${item.name}`} /><Popconfirm title="Xóa khóa học?" description={item.linkedClasses > 0 ? 'Khóa học đang có lớp liên kết.' : item.name} onConfirm={() => remove(item)} okButtonProps={{ danger: true }} disabled={item.linkedClasses > 0}><Button danger icon={<Trash />} onClick={() => item.linkedClasses > 0 && remove(item)} aria-label={`Xóa ${item.name}`} /></Popconfirm></Space> },
  ]
  return <AdminLayout activePage="courses" mainId="course-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}
    <AdminPageHeader kicker="Danh mục đào tạo" title="Quản lý khóa học" description="Quản lý chương trình, số buổi và mức học phí cho từng ngoại ngữ." actions={<Button type="primary" icon={<Plus />} onClick={openCreate}>Thêm khóa học</Button>} />
    <AdminSummary items={[{ label: 'Tổng khóa học', value: courses.length, detail: `${courses.filter((item) => item.status === 'Đang mở').length} khóa đang mở đăng ký`, icon: <Books weight="duotone" />, tone: 'success' }, { label: 'Ngoại ngữ đào tạo', value: languages.length, detail: 'Danh mục cho nhiều ngôn ngữ', icon: <GlobeHemisphereWest weight="duotone" /> }, { label: 'Lớp đang liên kết', value: courses.reduce((sum, item) => sum + item.linkedClasses, 0), detail: 'Không thể xóa khóa học có lớp', icon: <UsersThree weight="duotone" /> }]} />
    <Card className="admin-table-card" title="Danh sách khóa học" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã hoặc trình độ" /><Select value={language} onChange={setLanguage} options={['Tất cả', ...languages].map((value) => ({ value, label: value }))} /></Space>}><Table rowKey="id" columns={columns} dataSource={data} scroll={{ x: 940 }} pagination={{ pageSize: 5, showTotal: (total) => `${total} khóa học` }} /></Card>
    <Modal title={editing === 'new' ? 'Thêm khóa học' : 'Sửa khóa học'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing === 'new' ? 'Lưu khóa học' : 'Cập nhật'} cancelText="Hủy" destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}><Form.Item name="code" label="Mã khóa học" rules={[{ required: true, message: 'Vui lòng nhập mã khóa học.' }]}><Input placeholder="VD: EN-A2-01" /></Form.Item><Form.Item name="name" label="Tên khóa học" rules={[{ required: true, message: 'Vui lòng nhập tên khóa học.' }]}><Input /></Form.Item><Space align="start" style={{ width: '100%' }}><Form.Item name="language" label="Ngoại ngữ" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="level" label="Trình độ" rules={[{ required: true }]}><Input /></Form.Item></Space><Space align="start" style={{ width: '100%' }}><Form.Item name="sessions" label="Số buổi" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item><Form.Item name="tuition" label="Học phí" rules={[{ required: true }]}><InputNumber min={1} step={1000} prefix={<CurrencyCircleDollar />} /></Form.Item></Space><Form.Item name="status" label="Trạng thái"><Select options={['Đang mở', 'Tạm ẩn'].map((value) => ({ value, label: value }))} /></Form.Item></Form>
    </Modal>
  </AdminLayout>
}
export default AdminCourses
