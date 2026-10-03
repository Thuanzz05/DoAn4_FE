import { useEffect, useMemo, useState } from 'react'
import { CaretRight, FileArrowUp, MagnifyingGlass, PauseCircle, PencilSimple, PlayCircle, Plus, Student, Trash, UsersThree, WarningCircle, XCircle } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { api, apiBlob, errorMessage, json } from '../api'

type StudentStatus = 'Chưa ghi danh' | 'Chờ xếp lớp' | 'Đang học' | 'Bảo lưu' | 'Hoàn thành'
type StudentRecord = { id: number; enrollmentId: number | null; name: string; code: string; email: string; phone: string; birthDate: string; course: string; courseId: number | null; className: string; status: StudentStatus; attendance: string; debt: string; joined: string; linked: boolean }
type StudentForm = Pick<StudentRecord, 'name' | 'phone' | 'birthDate' | 'email' | 'course'>
type ImportRow = { rowNumber: number; fullName: string; email: string; phone: string; birthDate: string | null; errors: string[] }
type CourseOption = { id: number; name: string; status: 'dang_mo' | 'tam_an' }
type ClassOption = { id: number; name: string; courseId: number; enrolled: number; capacity: number; status: string }
type UserApi = { id: number; code: string; fullName: string; email: string; phone: string | null; birthDate: string | null; createdAt: string }
type EnrollmentApi = { id: number; studentId: number; courseId: number; courseName: string; className: string | null; enrolledAt: string; status: string; attendance: number }
type InvoiceApi = { enrollmentId: number; amount: number; status: string }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const statusColor: Record<StudentStatus, string> = { 'Chưa ghi danh': 'default', 'Chờ xếp lớp': 'blue', 'Đang học': 'green', 'Bảo lưu': 'gold', 'Hoàn thành': 'default' }
const phoneDigits = (value: string) => value.replace(/\D/g, '')
const validPhone = (value: string) => /^0\d{9}$/.test(phoneDigits(value))
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
  const [enrolling, setEnrolling] = useState<StudentRecord | null>(null)
  const [enrollmentCourseId, setEnrollmentCourseId] = useState<number>()
  const [enrollmentClassId, setEnrollmentClassId] = useState<number>()
  const [enrollmentLoading, setEnrollmentLoading] = useState(false)
  const [form] = Form.useForm<StudentForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  const data = useMemo(() => students.filter((item) => (!query.trim() || [item.name, item.code, item.className, item.course].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [query, status, students])
  const validImportCount = preview.filter((item) => item.errors.length === 0).length
  const studentCount = new Set(students.map((item) => item.id)).size

  const load = async () => {
    try {
      const [users, enrollments, invoices, courseRows, classRows] = await Promise.all([
        api<UserApi[]>('/users?role=hoc_vien'), api<EnrollmentApi[]>('/enrollments'), api<InvoiceApi[]>('/invoices'), api<CourseOption[]>('/courses/all'), api<ClassOption[]>('/classes'),
      ])
      setCourses(courseRows.filter((item) => item.status === 'dang_mo')); setClasses(classRows)
      setStudents(users.flatMap((user) => {
        const activeEnrollments = enrollments.filter((item) => item.studentId === user.id && item.status !== 'da_huy')
        const rows: Array<EnrollmentApi | undefined> = activeEnrollments.length ? activeEnrollments : [undefined]
        const statusMap: Record<string, StudentStatus> = { cho_xep_lop: 'Chờ xếp lớp', dang_hoc: 'Đang học', bao_luu: 'Bảo lưu', hoan_thanh: 'Hoàn thành' }
        return rows.map((enrollment) => {
          const invoice = enrollment ? invoices.find((item) => item.enrollmentId === enrollment.id && item.status !== 'da_huy') : undefined
          return {
            id: user.id, enrollmentId: enrollment?.id ?? null, name: user.fullName, code: user.code,
            email: user.email, phone: user.phone ?? '', birthDate: user.birthDate ?? '',
            course: enrollment?.courseName ?? 'Chưa ghi danh', courseId: enrollment?.courseId ?? null,
            className: enrollment?.className ?? 'Chưa xếp lớp', status: enrollment ? statusMap[enrollment.status] : 'Chưa ghi danh',
            attendance: enrollment ? `${Number(enrollment.attendance)}%` : '—', debt: !invoice ? 'Chưa có hóa đơn' : invoice.status === 'da_thanh_toan' ? 'Đã hoàn tất' : `${new Intl.NumberFormat('vi-VN').format(invoice.amount)}đ`,
            joined: new Intl.DateTimeFormat('vi-VN').format(new Date(enrollment?.enrolledAt ?? user.createdAt)), linked: Boolean(enrollment),
          }
        })
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
    const options = classes.filter((item) => item.courseId === student.courseId && ['sap_khai_giang', 'dang_hoc'].includes(item.status) && (item.enrolled < item.capacity || item.name === student.className))
    setAssigning(student)
    setAssignClassId(options.find((item) => item.name === student.className)?.id ?? options[0]?.id)
    setSelected(null)
  }
  const assignClass = async () => {
    if (!assigning?.enrollmentId || !assignClassId) return
    try {
      await api(`/enrollments/${assigning.enrollmentId}`, json('PATCH', { classId: assignClassId, status: 'dang_hoc' }))
      setAssigning(null); await load(); messageApi.success(assigning.status === 'Bảo lưu' ? 'Đã tiếp tục khóa học.' : 'Đã xếp lớp cho học viên.')
    } catch (error) { messageApi.error(errorMessage(error)) }
  }
  const openEnrollment = (student: StudentRecord) => {
    const usedCourseIds = new Set(students.filter((item) => item.id === student.id && item.enrollmentId).map((item) => item.courseId))
    setEnrolling(student)
    setEnrollmentCourseId(courses.find((item) => !usedCourseIds.has(item.id))?.id)
    setEnrollmentClassId(undefined)
    setSelected(null)
  }
  const addEnrollment = async () => {
    if (!enrolling || !enrollmentCourseId) return
    setEnrollmentLoading(true)
    try {
      await api('/enrollments', json('POST', { studentId: enrolling.id, courseId: enrollmentCourseId, classId: enrollmentClassId ?? null }))
      setEnrolling(null); await load(); messageApi.success('Đã ghi danh khóa học và tạo hóa đơn.')
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { setEnrollmentLoading(false) }
  }
  const changeEnrollmentStatus = (student: StudentRecord, next: 'bao_luu' | 'da_huy') => {
    if (!student.enrollmentId) return
    const labels = { bao_luu: 'Bảo lưu ghi danh', da_huy: 'Hủy ghi danh' }
    modalApi.confirm({
      title: `${labels[next]}?`,
      content: next === 'da_huy' ? 'Hóa đơn chưa thanh toán sẽ được hủy cùng ghi danh. Ghi danh đã thanh toán chỉ có thể chuyển lớp.' : `${student.name} · ${student.course}`,
      okText: labels[next],
      okButtonProps: { danger: next === 'da_huy' },
      onOk: async () => { try { await api(`/enrollments/${student.enrollmentId}`, json('PATCH', { status: next })); setSelected(null); await load(); messageApi.success(`Đã ${next === 'bao_luu' ? 'bảo lưu ghi danh' : 'hủy ghi danh'}.`) } catch (error) { messageApi.error(errorMessage(error)) } },
    })
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
      { label: 'Tổng học viên', value: studentCount, detail: `${students.filter((item) => item.enrollmentId).length} lượt ghi danh`, icon: <Student weight="duotone" />, tone: 'success' },
      { label: 'Đang theo học', value: students.filter((item) => item.status === 'Đang học').length, detail: 'Lượt ghi danh đã vào lớp', icon: <UsersThree weight="duotone" /> },
      { label: 'Chờ xếp lớp', value: students.filter((item) => item.status === 'Chờ xếp lớp').length, detail: 'Hồ sơ mới ghi danh', icon: <WarningCircle weight="duotone" />, tone: 'danger' },
    ]} />
    <Card className="admin-table-card" title="Danh sách ghi danh" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, khóa hoặc lớp" /><Select value={status} onChange={setStatus} options={['Tất cả', 'Chưa ghi danh', 'Chờ xếp lớp', 'Đang học', 'Bảo lưu', 'Hoàn thành'].map((value) => ({ value, label: value }))} /></Space>}>
      <Table rowKey={(item) => `${item.id}-${item.enrollmentId ?? 'none'}`} columns={columns} dataSource={data} scroll={{ x: 950 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} lượt ghi danh` }} locale={{ emptyText: 'Không tìm thấy hồ sơ phù hợp' }} />
    </Card>
    <Drawer size={440} title="Hồ sơ học viên" open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <><Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text type="secondary">{selected.code}</Typography.Text></div></Flex><Descriptions bordered column={1} size="small" style={{ marginTop: 24 }} items={[{ key: 'birth', label: 'Ngày sinh', children: displayDate(selected.birthDate) }, { key: 'email', label: 'Email', children: selected.email || '—' }, { key: 'phone', label: 'Điện thoại', children: selected.phone }, { key: 'course', label: 'Khóa học', children: selected.course }, { key: 'class', label: 'Lớp hiện tại', children: selected.className }, { key: 'joined', label: 'Ngày ghi danh', children: selected.joined }, { key: 'attendance', label: 'Chuyên cần', children: selected.attendance }, { key: 'debt', label: 'Học phí', children: selected.debt }]} /><Card size="small" className="admin-drawer-status"><Flex justify="space-between"><Typography.Text type="secondary">Trạng thái ghi danh</Typography.Text><Tag color={statusColor[selected.status]}>{selected.status}</Tag></Flex></Card><Space orientation="vertical" style={{ width: '100%', marginTop: 18 }}><Button block icon={<Plus />} onClick={() => openEnrollment(selected)}>Ghi danh thêm khóa học</Button>{selected.enrollmentId && ['Chờ xếp lớp', 'Đang học'].includes(selected.status) && <Button block type="primary" icon={<UsersThree />} onClick={() => openAssign(selected)}>{selected.className === 'Chưa xếp lớp' ? 'Xếp lớp' : 'Chuyển lớp'}</Button>}{selected.status === 'Đang học' && <Button block icon={<PauseCircle />} onClick={() => changeEnrollmentStatus(selected, 'bao_luu')}>Bảo lưu ghi danh</Button>}{selected.status === 'Bảo lưu' && <Button block type="primary" icon={<PlayCircle />} onClick={() => openAssign(selected)}>Tiếp tục hoặc chuyển lớp</Button>}{selected.enrollmentId && ['Chờ xếp lớp', 'Đang học', 'Bảo lưu'].includes(selected.status) && <Button block danger icon={<XCircle />} onClick={() => changeEnrollmentStatus(selected, 'da_huy')}>Hủy ghi danh</Button>}<Button block icon={<PencilSimple />} onClick={() => openEdit(selected)}>Sửa hồ sơ</Button><Button block danger icon={<Trash />} onClick={() => remove(selected)}>Xóa hồ sơ</Button></Space></>}
    </Drawer>
    <Modal title={editing === 'new' ? 'Ghi danh học viên' : 'Sửa hồ sơ học viên'} open={editing !== null} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing === 'new' ? 'Lưu hồ sơ' : 'Cập nhật'} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}>
        <Form.Item name="name" label="Họ và tên" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên.' }]}><Input /></Form.Item>
        <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại.' }, { validator: (_, value) => !value || validPhone(value) ? Promise.resolve() : Promise.reject(new Error('Số điện thoại phải có đúng 10 chữ số, bắt đầu bằng 0.')) }]}><Input /></Form.Item>
        <Form.Item name="birthDate" label="Ngày sinh" rules={[{ required: true, message: 'Vui lòng chọn ngày sinh.' }, { validator: (_, value) => !value || validBirthDate(value) ? Promise.resolve() : Promise.reject(new Error('Ngày sinh không hợp lệ.')) }]}><Input type="date" /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ.' }]}><Input type="email" /></Form.Item>
        <Form.Item name="course" label="Khóa học đăng ký" rules={[{ required: true, message: 'Vui lòng chọn khóa học.' }]}><Select disabled={editing !== 'new'} showSearch optionFilterProp="label" options={courses.map((item) => ({ value: item.name, label: item.name }))} /></Form.Item>
      </Form>
    </Modal>
    <Modal title={assigning?.status === 'Bảo lưu' ? `Tiếp tục học cho ${assigning.name}` : assigning ? `Xếp lớp cho ${assigning.name}` : 'Xếp lớp'} open={Boolean(assigning)} onCancel={() => setAssigning(null)} onOk={assignClass} okText="Xác nhận" okButtonProps={{ disabled: !assignClassId }} destroyOnHidden>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>Chỉ hiển thị lớp còn chỗ thuộc khóa {assigning?.course}.</Typography.Paragraph>
      <Select style={{ width: '100%' }} value={assignClassId} onChange={setAssignClassId} placeholder="Chọn lớp học" options={classes.filter((item) => item.courseId === assigning?.courseId && ['sap_khai_giang', 'dang_hoc'].includes(item.status) && (item.enrolled < item.capacity || item.name === assigning?.className)).map((item) => ({ value: item.id, label: `${item.name} · ${item.enrolled}/${item.capacity} học viên` }))} />
    </Modal>
    <Modal title={enrolling ? `Ghi danh thêm cho ${enrolling.name}` : 'Ghi danh khóa học'} open={Boolean(enrolling)} onCancel={() => setEnrolling(null)} onOk={() => void addEnrollment()} okText="Ghi danh và tạo hóa đơn" confirmLoading={enrollmentLoading} okButtonProps={{ disabled: !enrollmentCourseId }} destroyOnHidden>
      <Alert style={{ margin: '18px 0' }} type="info" showIcon title="Mỗi khóa học là một ghi danh riêng" description="Hệ thống sẽ tạo hóa đơn học phí tương ứng và không cho phép ghi danh trùng khóa đang còn hiệu lực." />
      <Form layout="vertical">
        <Form.Item label="Khóa học" required><Select value={enrollmentCourseId} onChange={(value) => { setEnrollmentCourseId(value); setEnrollmentClassId(undefined) }} placeholder="Chọn khóa học" options={courses.filter((course) => !students.some((item) => item.id === enrolling?.id && item.enrollmentId && item.courseId === course.id)).map((course) => ({ value: course.id, label: course.name }))} /></Form.Item>
        <Form.Item label="Xếp lớp ngay (không bắt buộc)"><Select allowClear value={enrollmentClassId} onChange={setEnrollmentClassId} disabled={!enrollmentCourseId} placeholder="Để trống nếu xếp lớp sau" options={classes.filter((item) => item.courseId === enrollmentCourseId && ['sap_khai_giang', 'dang_hoc'].includes(item.status) && item.enrolled < item.capacity).map((item) => ({ value: item.id, label: `${item.name} · ${item.enrolled}/${item.capacity} học viên` }))} /></Form.Item>
      </Form>
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
