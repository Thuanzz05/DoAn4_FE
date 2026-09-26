import { type ChangeEvent, useMemo, useState } from 'react'
import { CaretRight, FileArrowUp, MagnifyingGlass, PencilSimple, Plus, Student, Trash, UsersThree, WarningCircle } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { demoCourses } from './demoCourses'

type StudentStatus = 'Chờ xếp lớp' | 'Đang học' | 'Bảo lưu' | 'Hoàn thành'
type StudentRecord = { name: string; code: string; email: string; phone: string; birthDate: string; course: string; className: string; status: StudentStatus; attendance: string; debt: string; joined: string; linked: boolean }
type StudentForm = Pick<StudentRecord, 'name' | 'phone' | 'birthDate' | 'email' | 'course'>
type ImportRow = StudentForm & { row: number; errors: string[] }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const initialStudents: StudentRecord[] = [
  { name: 'Nguyễn Khánh Linh', code: 'HV-0248', email: 'linh.nguyen@example.com', phone: '090 312 4586', birthDate: '2003-04-15', course: 'Tiếng Anh giao tiếp A2', className: 'A2 Giao tiếp', status: 'Đang học', attendance: '82%', debt: '2.400.000đ', joined: '12/08/2026', linked: true },
  { name: 'Trần Gia Huy', code: 'HV-0217', email: 'huy.tran@example.com', phone: '091 572 9034', birthDate: '2002-09-08', course: 'Tiếng Anh B1 tổng quát', className: 'B1 Tổng quát', status: 'Đang học', attendance: '94%', debt: 'Đã hoàn tất', joined: '02/07/2026', linked: true },
  { name: 'Lê Minh Anh', code: 'HV-0196', email: 'anh.le@example.com', phone: '098 441 2367', birthDate: '2004-01-21', course: 'Luyện thi IELTS 6.5', className: 'IELTS 6.5', status: 'Bảo lưu', attendance: '76%', debt: '2.400.000đ', joined: '18/05/2026', linked: true },
  { name: 'Phạm Quang Duy', code: 'HV-0173', email: 'duy.pham@example.com', phone: '093 628 1975', birthDate: '2001-12-11', course: 'Tiếng Anh giao tiếp A2', className: 'A2 Giao tiếp', status: 'Đang học', attendance: '88%', debt: 'Đã hoàn tất', joined: '22/04/2026', linked: true },
  { name: 'Võ Hoàng Nam', code: 'HV-0151', email: 'nam.vo@example.com', phone: '097 805 3321', birthDate: '2002-06-30', course: 'Tiếng Anh B1 tổng quát', className: 'B1 Tổng quát', status: 'Hoàn thành', attendance: '91%', debt: 'Đã hoàn tất', joined: '10/02/2026', linked: true },
  { name: 'Đặng Thu Trang', code: 'HV-0138', email: 'trang.dang@example.com', phone: '096 214 8703', birthDate: '2004-02-18', course: 'Luyện thi IELTS 6.5', className: 'IELTS 6.5', status: 'Đang học', attendance: '86%', debt: '1.200.000đ', joined: '05/01/2026', linked: true },
  { name: 'Bùi Đức Anh', code: 'HV-0119', email: 'anh.bui@example.com', phone: '092 703 1864', birthDate: '2003-08-07', course: 'Tiếng Anh giao tiếp A2', className: 'A2 Giao tiếp', status: 'Bảo lưu', attendance: '69%', debt: 'Đã hoàn tất', joined: '16/11/2025', linked: true },
  { name: 'Đỗ Hà My', code: 'HV-0097', email: 'my.do@example.com', phone: '094 861 2405', birthDate: '2002-03-25', course: 'Tiếng Anh B1 tổng quát', className: 'B1 Tổng quát', status: 'Hoàn thành', attendance: '96%', debt: 'Đã hoàn tất', joined: '28/09/2025', linked: true },
]

const statusColor: Record<StudentStatus, string> = { 'Chờ xếp lớp': 'blue', 'Đang học': 'green', 'Bảo lưu': 'gold', 'Hoàn thành': 'default' }
const phoneDigits = (value: string) => value.replace(/\D/g, '')
const validPhone = (value: string) => /^0\d{9,10}$/.test(phoneDigits(value))
const validBirthDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return year >= 1900 && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day && date.getTime() < Date.now()
}
const displayDate = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))
const importDate = (value: unknown) => {
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  const text = String(value ?? '').trim()
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : text
}
const headerKey = (value: unknown) => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')

function parseImportRows(rows: unknown[][], students: StudentRecord[]): ImportRow[] {
  const headers = (rows[0] ?? []).map(headerKey)
  const column = (...names: string[]) => headers.findIndex((header) => names.includes(header))
  const nameColumn = column('ho ten', 'ho va ten')
  const phoneColumn = column('so dien thoai', 'sdt')
  const birthColumn = column('ngay sinh')
  const courseColumn = column('khoa hoc')
  const emailColumn = column('email')
  if ([nameColumn, phoneColumn, birthColumn, courseColumn].includes(-1)) throw new Error('Thiếu cột: Họ tên, Số điện thoại, Ngày sinh hoặc Khóa học.')
  const nonEmpty = rows.slice(1).map((cells, index) => ({ cells, row: index + 2 })).filter(({ cells }) => cells.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''))
  if (nonEmpty.length > 500) throw new Error('Mỗi lần chỉ import tối đa 500 học viên.')
  const usedPhones = new Set(students.map((item) => phoneDigits(item.phone)))
  return nonEmpty.map(({ cells, row }) => {
    const name = String(cells[nameColumn] ?? '').trim()
    const phone = phoneDigits(String(cells[phoneColumn] ?? ''))
    const birthDate = importDate(cells[birthColumn])
    const course = String(cells[courseColumn] ?? '').trim()
    const email = String(cells[emailColumn] ?? '').trim()
    const errors: string[] = []
    if (!name) errors.push('Thiếu họ tên')
    if (!validPhone(phone)) errors.push('Số điện thoại không hợp lệ')
    else if (usedPhones.has(phone)) errors.push('Trùng số điện thoại')
    if (!validBirthDate(birthDate)) errors.push('Ngày sinh không hợp lệ')
    if (!(demoCourses as readonly string[]).includes(course)) errors.push('Khóa học không có trong danh mục')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email không hợp lệ')
    if (!errors.length) usedPhones.add(phone)
    return { row, name, phone, birthDate, course, email, errors }
  })
}

if (import.meta.env.DEV) {
  const check = parseImportRows([
    ['Họ và tên', 'Số điện thoại', 'Ngày sinh', 'Khóa học'],
    ['Học viên thử', '0900000000', '01/01/2000', demoCourses[0]],
    ['Học viên trùng', '0900000000', '01/01/2000', demoCourses[0]],
  ], initialStudents)
  if (validBirthDate('2026-02-31') || validPhone('903124586') || check[0].errors.length || !check[1].errors.includes('Trùng số điện thoại')) throw new Error('Student import validation check failed')
}

function AdminStudents({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [students, setStudents] = useState(initialStudents)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | StudentStatus>('Tất cả')
  const [selected, setSelected] = useState<StudentRecord | null>(null)
  const [editing, setEditing] = useState<StudentRecord | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ImportRow[]>([])
  const [form] = Form.useForm<StudentForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  const data = useMemo(() => students.filter((item) => (!query.trim() || [item.name, item.code, item.className, item.course].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [query, status, students])
  const validImportCount = preview.filter((item) => item.errors.length === 0).length

  const openNew = () => { form.resetFields(); setEditing('new') }
  const openEdit = (student: StudentRecord) => { form.setFieldsValue(student); setSelected(null); setEditing(student) }
  const save = (values: StudentForm) => {
    const phone = phoneDigits(values.phone)
    if (students.some((item) => phoneDigits(item.phone) === phone && item.code !== (typeof editing === 'object' && editing ? editing.code : ''))) {
      form.setFields([{ name: 'phone', errors: ['Số điện thoại đã tồn tại.'] }]); return
    }
    const normalized = { ...values, name: values.name.trim(), phone, email: values.email?.trim() ?? '' }
    if (editing === 'new') {
      const nextCode = Math.max(...students.map((item) => Number(item.code.replace(/\D/g, '')))) + 1
      setStudents((current) => [{ ...normalized, code: `HV-${String(nextCode).padStart(4, '0')}`, className: 'Chưa xếp lớp', status: 'Chờ xếp lớp', attendance: '—', debt: 'Chưa có hóa đơn', joined: new Intl.DateTimeFormat('vi-VN').format(new Date()), linked: false }, ...current])
    } else if (editing) {
      setStudents((current) => current.map((item) => item.code === editing.code ? { ...item, ...normalized, className: item.course === values.course ? item.className : 'Chưa xếp lớp', status: item.course === values.course ? item.status : 'Chờ xếp lớp' } : item))
    }
    messageApi.success(editing === 'new' ? 'Đã ghi danh học viên.' : 'Đã cập nhật hồ sơ.')
    setEditing(null)
  }
  const remove = (student: StudentRecord) => {
    if (student.linked) { messageApi.warning('Không thể xóa vì hồ sơ đã có hóa đơn hoặc kết quả học tập liên kết.'); return }
    modalApi.confirm({ title: 'Xóa hồ sơ học viên?', content: `${student.name} · ${student.code}`, okText: 'Xóa', okButtonProps: { danger: true }, onOk: () => { setStudents((current) => current.filter((item) => item.code !== student.code)); setSelected(null); messageApi.success('Đã xóa hồ sơ.') } })
  }
  const loadExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPreview([])
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 2_000_000) { messageApi.error('Chọn tệp .xlsx không quá 2 MB.'); return }
    try {
      const { readSheet } = await import('read-excel-file/browser')
      const rows = await readSheet(file)
      const nextPreview = parseImportRows(rows, students)
      setPreview(nextPreview)
      if (!nextPreview.length) messageApi.warning('Tệp không có dòng học viên nào.')
    } catch (error) {
      const detail = error instanceof Error ? error.message : ''
      messageApi.error(detail.startsWith('Thiếu cột:') || detail.startsWith('Mỗi lần chỉ import') ? detail : 'Không đọc được tệp Excel. Vui lòng kiểm tra định dạng .xlsx.')
    }
  }
  const importValid = () => {
    const valid = preview.filter((item) => item.errors.length === 0)
    if (!valid.length) return
    const startCode = Math.max(...students.map((item) => Number(item.code.replace(/\D/g, '')))) + 1
    const joined = new Intl.DateTimeFormat('vi-VN').format(new Date())
    setStudents((current) => [...valid.map((item, index) => ({ name: item.name, phone: item.phone, birthDate: item.birthDate, email: item.email, course: item.course, code: `HV-${String(startCode + index).padStart(4, '0')}`, className: 'Chưa xếp lớp', status: 'Chờ xếp lớp' as const, attendance: '—', debt: 'Chưa có hóa đơn', joined, linked: false })), ...current])
    setImporting(false); setPreview([]); messageApi.success(`Đã import ${valid.length} học viên hợp lệ.`)
  }

  const columns: TableProps<StudentRecord>['columns'] = [
    { title: 'Học viên', key: 'student', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><strong>{item.name}</strong><small>{item.code}</small></div></div> },
    { title: 'Khóa học / lớp', key: 'class', render: (_, item) => <div><Typography.Text strong>{item.course}</Typography.Text><br /><Typography.Text type="secondary">{item.className}</Typography.Text></div> },
    { title: 'Chuyên cần', dataIndex: 'attendance' },
    { title: 'Học phí', dataIndex: 'debt', render: (value: string) => <Typography.Text type={value === 'Đã hoàn tất' ? 'success' : value === 'Chưa có hóa đơn' ? 'secondary' : 'danger'} strong>{value}</Typography.Text> },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: StudentStatus) => <Tag color={statusColor[value]}>{value}</Tag> },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button icon={<CaretRight />} onClick={() => setSelected(item)} aria-label={`Xem hồ sơ ${item.name}`} /> },
  ]

  return <AdminLayout activePage="students" mainId="student-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}{modalContext}
    <AdminPageHeader kicker="Hồ sơ học viên" title="Quản lý học viên" description="Ghi danh, cập nhật hồ sơ và kiểm tra danh sách trước khi xếp lớp." actions={<Space wrap><Button icon={<FileArrowUp />} onClick={() => { setPreview([]); setImporting(true) }}>Import Excel</Button><Button type="primary" icon={<Plus />} onClick={openNew}>Ghi danh học viên</Button></Space>} />
    <AdminSummary items={[
      { label: 'Tổng hồ sơ', value: students.length, detail: 'Trong danh sách minh họa', icon: <Student weight="duotone" />, tone: 'success' },
      { label: 'Đang theo học', value: students.filter((item) => item.status === 'Đang học').length, detail: 'Học viên đã vào lớp', icon: <UsersThree weight="duotone" /> },
      { label: 'Chờ xếp lớp', value: students.filter((item) => item.status === 'Chờ xếp lớp').length, detail: 'Hồ sơ mới ghi danh', icon: <WarningCircle weight="duotone" />, tone: 'danger' },
    ]} />
    <Card className="admin-table-card" title="Danh sách học viên" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, khóa hoặc lớp" /><Select value={status} onChange={setStatus} options={['Tất cả', 'Chờ xếp lớp', 'Đang học', 'Bảo lưu', 'Hoàn thành'].map((value) => ({ value, label: value }))} /></Space>}>
      <Table rowKey="code" columns={columns} dataSource={data} scroll={{ x: 950 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} hồ sơ` }} locale={{ emptyText: 'Không tìm thấy hồ sơ phù hợp' }} />
    </Card>
    <Drawer size={440} title="Hồ sơ học viên" open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <><Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text type="secondary">{selected.code}</Typography.Text></div></Flex><Descriptions bordered column={1} size="small" style={{ marginTop: 24 }} items={[{ key: 'birth', label: 'Ngày sinh', children: displayDate(selected.birthDate) }, { key: 'email', label: 'Email', children: selected.email || '—' }, { key: 'phone', label: 'Điện thoại', children: selected.phone }, { key: 'course', label: 'Khóa học', children: selected.course }, { key: 'class', label: 'Lớp hiện tại', children: selected.className }, { key: 'joined', label: 'Ngày ghi danh', children: selected.joined }, { key: 'attendance', label: 'Chuyên cần', children: selected.attendance }, { key: 'debt', label: 'Học phí', children: selected.debt }]} /><Card size="small" className="admin-drawer-status"><Flex justify="space-between"><Typography.Text type="secondary">Trạng thái hồ sơ</Typography.Text><Tag color={statusColor[selected.status]}>{selected.status}</Tag></Flex></Card><Space orientation="vertical" style={{ width: '100%', marginTop: 18 }}><Button block icon={<PencilSimple />} onClick={() => openEdit(selected)}>Sửa hồ sơ</Button><Button block danger icon={<Trash />} onClick={() => remove(selected)}>Xóa hồ sơ</Button></Space></>}
    </Drawer>
    <Modal title={editing === 'new' ? 'Ghi danh học viên' : 'Sửa hồ sơ học viên'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing === 'new' ? 'Lưu hồ sơ' : 'Cập nhật'} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}>
        <Form.Item name="name" label="Họ và tên" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên.' }]}><Input /></Form.Item>
        <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại.' }, { validator: (_, value) => !value || validPhone(value) ? Promise.resolve() : Promise.reject(new Error('Số điện thoại phải có 10–11 chữ số, bắt đầu bằng 0.')) }]}><Input /></Form.Item>
        <Form.Item name="birthDate" label="Ngày sinh" rules={[{ required: true, message: 'Vui lòng chọn ngày sinh.' }, { validator: (_, value) => !value || validBirthDate(value) ? Promise.resolve() : Promise.reject(new Error('Ngày sinh không hợp lệ.')) }]}><Input type="date" /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ.' }]}><Input type="email" /></Form.Item>
        <Form.Item name="course" label="Khóa học đăng ký" rules={[{ required: true, message: 'Vui lòng chọn khóa học.' }]}><Select showSearch optionFilterProp="label" options={demoCourses.map((value) => ({ value, label: value }))} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Import học viên từ Excel" open={importing} onCancel={() => { setImporting(false); setPreview([]) }} onOk={importValid} okText={`Lưu ${validImportCount} dòng hợp lệ`} okButtonProps={{ disabled: validImportCount === 0 }} width={850} destroyOnHidden>
      <Alert style={{ margin: '18px 0' }} type="info" showIcon title="Định dạng tệp .xlsx" description="Dòng đầu gồm Họ tên, Số điện thoại, Ngày sinh, Khóa học; Email là cột tùy chọn. Ngày sinh dùng DD/MM/YYYY, số điện thoại cần định dạng Text để giữ số 0 đầu. Tối đa 500 dòng, 2 MB." />
      <label htmlFor="student-import-file">Chọn tệp Excel</label><Input id="student-import-file" type="file" accept=".xlsx" onChange={loadExcel} style={{ margin: '8px 0 16px' }} />
      {preview.length > 0 && <><Typography.Paragraph>Hợp lệ: <strong>{validImportCount}</strong> · Có lỗi: <strong>{preview.length - validImportCount}</strong></Typography.Paragraph><Table size="small" rowKey="row" dataSource={preview} pagination={{ pageSize: 6 }} scroll={{ x: 720 }} columns={[{ title: 'Dòng', dataIndex: 'row', width: 65 }, { title: 'Họ tên', dataIndex: 'name' }, { title: 'Số điện thoại', dataIndex: 'phone' }, { title: 'Khóa học', dataIndex: 'course' }, { title: 'Kiểm tra', dataIndex: 'errors', render: (errors: string[]) => errors.length ? <Typography.Text type="danger">{errors.join('; ')}</Typography.Text> : <Tag color="green">Hợp lệ</Tag> }]} /></>}
    </Modal>
  </AdminLayout>
}

export default AdminStudents
