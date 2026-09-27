import { useEffect, useMemo, useState } from 'react'
import { CaretRight, FileArrowUp, MagnifyingGlass, PencilSimple, Plus, Student, Trash, UsersThree, WarningCircle } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { api, apiBlob, errorMessage, json } from '../api'

type StudentStatus = 'Chờ xếp lớp' | 'Đang học' | 'Bảo lưu' | 'Hoàn thành'
type StudentRecord = { id: number; enrollmentId: number | null; name: string; code: string; email: string; phone: string; birthDate: string; course: string; courseId: number | null; className: string; status: StudentStatus; attendance: string; debt: string; joined: string; linked: boolean }
type StudentForm = Pick<StudentRecord, 'name' | 'phone' | 'birthDate' | 'email' | 'course'>
type ImportRow = { rowNumber: number; fullName: string; email: string; phone: string; birthDate: string | null; errors: string[] }
type CourseOption = { id: number; name: string }
type ClassOption = { id: number; name: string; courseId: number; enrolled: number; capacity: number; status: string }
type UserApi = { id: number; code: string; fullName: string; email: string; phone: string | null; birthDate: string | null; createdAt: string }
type EnrollmentApi = { id: number; studentId: number; courseId: number; courseName: string; className: string | null; enrolledAt: string; status: string }
type InvoiceApi = { enrollmentId: number; amount: number; status: string }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const statusColor: Record<StudentStatus, string> = { 'Chờ xếp lớp': 'blue', 'Đang học': 'green', 'Bảo lưu': 'gold', 'Hoàn thành': 'default' }
const phoneDigits = (value: string) => value.replace(/\D/g, '')
const validPhone = (value: string) => /^0\d{9,10}$/.test(phoneDigits(value))
const validBirthDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return year >= 1900 && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day && date.getTime() < Date.now()
}
const displayDate = (value: string) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) : '—'
function AdminStudents({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | StudentStatus>('Tất cả')
  const [selected, setSelected] = useState<StudentRecord | null>(null)
  const [editing, setEditing] = useState<StudentRecord | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ImportRow[]>([])
  const [importCourseId, setImportCourseId] = useState<number>()
  const [assigning, setAssigning] = useState<StudentRecord | null>(null)
  const [assignClassId, setAssignClassId] = useState<number>()
  const [form] = Form.useForm<StudentForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  const data = useMemo(() => students.filter((item) => (!query.trim() || [item.name, item.code, item.className, item.course].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [query, status, students])
  const validImportCount = preview.filter((item) => item.errors.length === 0).length

  const load = async () => {
    try {
      const [users, enrollments, invoices, courseRows, classRows] = await Promise.all([
        api<UserApi[]>('/users?role=hoc_vien'), api<EnrollmentApi[]>('/enrollments'), api<InvoiceApi[]>('/invoices'), api<CourseOption[]>('/courses/all'), api<ClassOption[]>('/classes'),
      ])
      setCourses(courseRows); setClasses(classRows)
      setStudents(users.map((user) => {
        const enrollment = enrollments.find((item) => item.studentId === user.id && item.status !== 'da_huy')
        const invoice = enrollment ? invoices.find((item) => item.enrollmentId === enrollment.id && item.status !== 'da_huy') : undefined
        const statusMap: Record<string, StudentStatus> = { cho_xep_lop: 'Chờ xếp lớp', dang_hoc: 'Đang học', bao_luu: 'Bảo lưu', hoan_thanh: 'Hoàn thành' }
        return {
          id: user.id, enrollmentId: enrollment?.id ?? null, name: user.fullName, code: user.code,
          email: user.email, phone: user.phone ?? '', birthDate: user.birthDate ?? '',
          course: enrollment?.courseName ?? 'Chưa ghi danh', courseId: enrollment?.courseId ?? null,
          className: enrollment?.className ?? 'Chưa xếp lớp', status: statusMap[enrollment?.status ?? 'cho_xep_lop'],
          attendance: '—', debt: !invoice ? 'Chưa có hóa đơn' : invoice.status === 'da_thanh_toan' ? 'Đã hoàn tất' : `${new Intl.NumberFormat('vi-VN').format(invoice.amount)}đ`,
          joined: new Intl.DateTimeFormat('vi-VN').format(new Date(enrollment?.enrolledAt ?? user.createdAt)), linked: Boolean(enrollment),
        }
      }))
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])

  const openNew = () => { form.resetFields(); setEditing('new') }
  const openEdit = (student: StudentRecord) => { form.setFieldsValue(student); setSelected(null); setEditing(student) }
  const save = async (values: StudentForm) => {
    const phone = phoneDigits(values.phone)
    if (students.some((item) => phoneDigits(item.phone) === phone && item.code !== (typeof editing === 'object' && editing ? editing.code : ''))) {
      form.setFields([{ name: 'phone', errors: ['Số điện thoại đã tồn tại.'] }]); return
    }
    try {
      if (editing === 'new') {
        const course = courses.find((item) => item.name === values.course)
        if (!course) throw new Error('Khóa học không tồn tại')
        const result = await api<{ accounts: Array<{ temporaryPassword: string }> }>('/enrollments/import/confirm', json('POST', { courseId: course.id, rows: [{ fullName: values.name.trim(), email: values.email.trim(), phone, birthDate: values.birthDate }] }))
        messageApi.success(`Đã ghi danh. Mật khẩu tạm: ${result.accounts[0]?.temporaryPassword}`)
      } else if (editing) {
        await api(`/users/${editing.id}`, json('PATCH', { fullName: values.name.trim(), email: values.email.trim(), phone, birthDate: values.birthDate }))
        messageApi.success('Đã cập nhật hồ sơ.')
      }
      setEditing(null); await load()
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  const remove = (student: StudentRecord) => {
    modalApi.confirm({ title: 'Xóa hồ sơ học viên?', content: `${student.name} · ${student.code}`, okText: 'Xóa', okButtonProps: { danger: true }, onOk: async () => { try { await api(`/users/${student.id}`, { method: 'DELETE' }); setSelected(null); await load(); messageApi.success('Đã xóa hồ sơ.') } catch (error) { messageApi.error(errorMessage(error)) } } })
  }
  const openAssign = (student: StudentRecord) => {
    const options = classes.filter((item) => item.courseId === student.courseId && item.status !== 'da_huy' && item.enrolled < item.capacity)
    setAssigning(student)
    setAssignClassId(options.find((item) => item.name === student.className)?.id ?? options[0]?.id)
    setSelected(null)
  }
  const assignClass = async () => {
    if (!assigning?.enrollmentId || !assignClassId) return
    try {
      await api(`/enrollments/${assigning.enrollmentId}`, json('PATCH', { classId: assignClassId, status: 'dang_hoc' }))
      setAssigning(null); await load(); messageApi.success('Đã xếp lớp cho học viên.')
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  const loadExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPreview([])
    if (!importCourseId) { messageApi.error('Hãy chọn khóa học trước.'); return }
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 5_000_000) { messageApi.error('Chọn tệp .xlsx không quá 5 MB.'); return }
    try {
      const result = await api<{ rows: ImportRow[] }>(`/enrollments/import/preview?courseId=${importCourseId}`, { method: 'POST', headers: { 'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: file })
      setPreview(result.rows)
    } catch (error) {
      messageApi.error(errorMessage(error))
    }
  }
  const importValid = async () => {
    const valid = preview.filter((item) => item.errors.length === 0)
    if (!valid.length || !importCourseId) return
    try {
      const result = await api<{ created: number; accounts: Array<{ email: string; temporaryPassword: string }> }>('/enrollments/import/confirm', json('POST', { courseId: importCourseId, rows: valid }))
      modalApi.info({ title: `Đã import ${result.created} học viên`, width: 520, content: <pre style={{ whiteSpace: 'pre-wrap' }}>{result.accounts.map((item) => `${item.email}: ${item.temporaryPassword}`).join('\n')}</pre> })
      setImporting(false); setPreview([]); await load()
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  const downloadTemplate = async () => { try { const blob = await apiBlob('/enrollments/import/template'); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mau-import-hoc-vien.xlsx'; anchor.click(); URL.revokeObjectURL(url) } catch (error) { messageApi.error(errorMessage(error)) } }

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
    <AdminPageHeader kicker="Hồ sơ học viên" title="Quản lý học viên" description="Ghi danh, cập nhật hồ sơ và kiểm tra danh sách trước khi xếp lớp." actions={<Space wrap><Button icon={<FileArrowUp />} onClick={() => { setPreview([]); setImportCourseId(courses[0]?.id); setImporting(true) }}>Import Excel</Button><Button type="primary" icon={<Plus />} onClick={openNew}>Ghi danh học viên</Button></Space>} />
    <AdminSummary items={[
      { label: 'Tổng hồ sơ', value: students.length, detail: 'Dữ liệu từ hệ thống', icon: <Student weight="duotone" />, tone: 'success' },
      { label: 'Đang theo học', value: students.filter((item) => item.status === 'Đang học').length, detail: 'Học viên đã vào lớp', icon: <UsersThree weight="duotone" /> },
      { label: 'Chờ xếp lớp', value: students.filter((item) => item.status === 'Chờ xếp lớp').length, detail: 'Hồ sơ mới ghi danh', icon: <WarningCircle weight="duotone" />, tone: 'danger' },
    ]} />
    <Card className="admin-table-card" title="Danh sách học viên" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, khóa hoặc lớp" /><Select value={status} onChange={setStatus} options={['Tất cả', 'Chờ xếp lớp', 'Đang học', 'Bảo lưu', 'Hoàn thành'].map((value) => ({ value, label: value }))} /></Space>}>
      <Table rowKey="code" columns={columns} dataSource={data} scroll={{ x: 950 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} hồ sơ` }} locale={{ emptyText: 'Không tìm thấy hồ sơ phù hợp' }} />
    </Card>
    <Drawer size={440} title="Hồ sơ học viên" open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <><Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text type="secondary">{selected.code}</Typography.Text></div></Flex><Descriptions bordered column={1} size="small" style={{ marginTop: 24 }} items={[{ key: 'birth', label: 'Ngày sinh', children: displayDate(selected.birthDate) }, { key: 'email', label: 'Email', children: selected.email || '—' }, { key: 'phone', label: 'Điện thoại', children: selected.phone }, { key: 'course', label: 'Khóa học', children: selected.course }, { key: 'class', label: 'Lớp hiện tại', children: selected.className }, { key: 'joined', label: 'Ngày ghi danh', children: selected.joined }, { key: 'attendance', label: 'Chuyên cần', children: selected.attendance }, { key: 'debt', label: 'Học phí', children: selected.debt }]} /><Card size="small" className="admin-drawer-status"><Flex justify="space-between"><Typography.Text type="secondary">Trạng thái hồ sơ</Typography.Text><Tag color={statusColor[selected.status]}>{selected.status}</Tag></Flex></Card><Space orientation="vertical" style={{ width: '100%', marginTop: 18 }}>{selected.enrollmentId && <Button block type="primary" icon={<UsersThree />} onClick={() => openAssign(selected)}>{selected.className === 'Chưa xếp lớp' ? 'Xếp lớp' : 'Chuyển lớp'}</Button>}<Button block icon={<PencilSimple />} onClick={() => openEdit(selected)}>Sửa hồ sơ</Button><Button block danger icon={<Trash />} onClick={() => remove(selected)}>Xóa hồ sơ</Button></Space></>}
    </Drawer>
    <Modal title={editing === 'new' ? 'Ghi danh học viên' : 'Sửa hồ sơ học viên'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing === 'new' ? 'Lưu hồ sơ' : 'Cập nhật'} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}>
        <Form.Item name="name" label="Họ và tên" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên.' }]}><Input /></Form.Item>
        <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại.' }, { validator: (_, value) => !value || validPhone(value) ? Promise.resolve() : Promise.reject(new Error('Số điện thoại phải có 10–11 chữ số, bắt đầu bằng 0.')) }]}><Input /></Form.Item>
        <Form.Item name="birthDate" label="Ngày sinh" rules={[{ required: true, message: 'Vui lòng chọn ngày sinh.' }, { validator: (_, value) => !value || validBirthDate(value) ? Promise.resolve() : Promise.reject(new Error('Ngày sinh không hợp lệ.')) }]}><Input type="date" /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ.' }]}><Input type="email" /></Form.Item>
        <Form.Item name="course" label="Khóa học đăng ký" rules={[{ required: true, message: 'Vui lòng chọn khóa học.' }]}><Select disabled={editing !== 'new'} showSearch optionFilterProp="label" options={courses.map((item) => ({ value: item.name, label: item.name }))} /></Form.Item>
      </Form>
    </Modal>
    <Modal title={assigning ? `Xếp lớp cho ${assigning.name}` : 'Xếp lớp'} open={Boolean(assigning)} onCancel={() => setAssigning(null)} onOk={assignClass} okText="Xác nhận" okButtonProps={{ disabled: !assignClassId }} destroyOnHidden>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>Chỉ hiển thị lớp còn chỗ thuộc khóa {assigning?.course}.</Typography.Paragraph>
      <Select style={{ width: '100%' }} value={assignClassId} onChange={setAssignClassId} placeholder="Chọn lớp học" options={classes.filter((item) => item.courseId === assigning?.courseId && item.status !== 'da_huy' && (item.enrolled < item.capacity || item.name === assigning?.className)).map((item) => ({ value: item.id, label: `${item.name} · ${item.enrolled}/${item.capacity} học viên` }))} />
    </Modal>
    <Modal title="Import học viên từ Excel" open={importing} onCancel={() => { setImporting(false); setPreview([]) }} onOk={importValid} okText={`Lưu ${validImportCount} dòng hợp lệ`} okButtonProps={{ disabled: validImportCount === 0 }} width={850} destroyOnHidden>
      <Alert style={{ margin: '18px 0' }} type="info" showIcon title="Định dạng tệp .xlsx" description="Dòng đầu gồm Họ tên, Email, Số điện thoại và Ngày sinh. Tối đa 100 dòng, 5 MB." />
      <Flex gap={10} align="end" wrap style={{ marginBottom: 16 }}><div style={{ flex: 1 }}><Typography.Text>Khóa học ghi danh</Typography.Text><Select style={{ width: '100%', marginTop: 8 }} value={importCourseId} onChange={(value) => { setImportCourseId(value); setPreview([]) }} options={courses.map((item) => ({ value: item.id, label: item.name }))} /></div><Button onClick={downloadTemplate}>Tải file mẫu</Button></Flex>
      <label htmlFor="student-import-file">Chọn tệp Excel</label><Input disabled={!importCourseId} id="student-import-file" type="file" accept=".xlsx" onChange={loadExcel} style={{ margin: '8px 0 16px' }} />
      {preview.length > 0 && <><Typography.Paragraph>Hợp lệ: <strong>{validImportCount}</strong> · Có lỗi: <strong>{preview.length - validImportCount}</strong></Typography.Paragraph><Table size="small" rowKey="rowNumber" dataSource={preview} pagination={{ pageSize: 6 }} scroll={{ x: 720 }} columns={[{ title: 'Dòng', dataIndex: 'rowNumber', width: 65 }, { title: 'Họ tên', dataIndex: 'fullName' }, { title: 'Email', dataIndex: 'email' }, { title: 'Số điện thoại', dataIndex: 'phone' }, { title: 'Kiểm tra', dataIndex: 'errors', render: (errors: string[]) => errors.length ? <Typography.Text type="danger">{errors.join('; ')}</Typography.Text> : <Tag color="green">Hợp lệ</Tag> }]} /></>}
    </Modal>
  </AdminLayout>
}

export default AdminStudents
