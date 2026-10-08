import { useEffect, useMemo, useRef, useState } from 'react'
import { CaretRight, FileArrowUp, Key, Lock, LockOpen, MagnifyingGlass, PauseCircle, PencilSimple, PlayCircle, Plus, Student, Trash, UsersThree, WarningCircle, XCircle } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { api, apiBlob, errorMessage, json } from '../api'

type StudentStatus = 'Chưa ghi danh' | 'Chờ xếp lớp' | 'Đang học' | 'Bảo lưu' | 'Hoàn thành' | 'Đã hủy'
type StudentRecord = { id: number; enrollmentId: number | null; name: string; code: string; email: string; phone: string; birthDate: string; course: string; courseId: number | null; classId: number | null; className: string; status: StudentStatus; active: boolean; attendance: string; debt: string; joined: string; linked: boolean; canChangeClass: boolean }
type StudentForm = Pick<StudentRecord, 'name' | 'phone' | 'birthDate' | 'email' | 'courseId'>
type ImportRow = { rowNumber: number; fullName: string; email: string; phone: string; birthDate: string | null; errors: string[] }
type CourseOption = { id: number; code: string; name: string; language: string; level: string; status: 'dang_mo' | 'tam_an' }
type ClassOption = { id: number; name: string; courseId: number; enrolled: number; capacity: number; status: string; hasStarted: number }
type UserApi = { id: number; code: string; fullName: string; email: string; phone: string | null; birthDate: string | null; active: number; createdAt: string }
type AccountDelivery = { email: string; emailSent: boolean; temporaryPassword?: string; emailWarning?: string }
type EnrollmentApi = { id: number; studentId: number; courseId: number; courseName: string; classId: number | null; className: string | null; enrolledAt: string; status: string; attendance: number; canChangeClass: number }
type InvoiceApi = { enrollmentId: number; amount: number; status: string }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const statusColor: Record<StudentStatus, string> = { 'Chưa ghi danh': 'default', 'Chờ xếp lớp': 'blue', 'Đang học': 'green', 'Bảo lưu': 'gold', 'Hoàn thành': 'default', 'Đã hủy': 'red' }
const phoneDigits = (value: string) => value.replace(/\D/g, '')
const validPhone = (value: string) => /^0\d{9}$/.test(phoneDigits(value))
const validBirthDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return year >= 1900 && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day && date.getTime() < Date.now()
}
const displayDate = (value: string) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) : '—'
const courseLabel = (course: CourseOption) => `${course.code} · ${course.name} · ${course.language} · ${course.level}`
function AdminStudents({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | StudentStatus>('Tất cả')
  const [accountStatus, setAccountStatus] = useState<'all' | 'active' | 'locked'>('all')
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
  const [saving, setSaving] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const loadRequest = useRef(0)
  const previewRequest = useRef(0)
  const mutationPending = useRef(false)
  const blocked = loading || Boolean(loadError) || saving || enrollmentLoading || importLoading
  const [form] = Form.useForm<StudentForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  const data = useMemo(() => students.filter((item) => (!query.trim() || [item.name, item.code, item.email, item.className, item.course].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status) && (accountStatus === 'all' || item.active === (accountStatus === 'active'))), [query, status, accountStatus, students])
  const validImportCount = preview.filter((item) => item.errors.length === 0).length
  const studentCount = new Set(students.map((item) => item.id)).size
  const canDeleteStudent = (student: StudentRecord) => !student.linked && !students.some((item) => item.id === student.id && item.enrollmentId !== null)

  const load = async () => {
    const requestId = ++loadRequest.current
    setLoading(true); setLoadError('')
    try {
      const [users, enrollments, invoices, courseRows, classRows] = await Promise.all([
        api<UserApi[]>('/users?role=hoc_vien'), api<EnrollmentApi[]>('/enrollments'), api<InvoiceApi[]>('/invoices'), api<CourseOption[]>('/courses/all'), api<ClassOption[]>('/classes'),
      ])
      if (requestId !== loadRequest.current) return
      setCourses(courseRows.filter((item) => item.status === 'dang_mo')); setClasses(classRows)
      const records = users.flatMap((user) => {
        const userEnrollments = enrollments.filter((item) => item.studentId === user.id)
        const rows: Array<EnrollmentApi | undefined> = userEnrollments.length ? userEnrollments : [undefined]
        const statusMap: Record<string, StudentStatus> = { cho_xep_lop: 'Chờ xếp lớp', dang_hoc: 'Đang học', bao_luu: 'Bảo lưu', hoan_thanh: 'Hoàn thành', da_huy: 'Đã hủy' }
        return rows.map((enrollment) => {
          const invoice = enrollment ? invoices.find((item) => item.enrollmentId === enrollment.id && item.status !== 'da_huy') : undefined
          return {
            id: user.id, enrollmentId: enrollment?.id ?? null, name: user.fullName, code: user.code,
            email: user.email, phone: user.phone ?? '', birthDate: user.birthDate ?? '',
            course: enrollment?.courseName ?? 'Chưa ghi danh', courseId: enrollment?.courseId ?? null,
            classId: enrollment?.classId ?? null, className: enrollment?.className ?? 'Chưa xếp lớp', status: enrollment ? statusMap[enrollment.status] : 'Chưa ghi danh',
            active: Boolean(Number(user.active)), attendance: enrollment ? `${Number(enrollment.attendance).toFixed(1)}%` : '—', debt: enrollment?.status === 'da_huy' && !invoice ? 'Đã hủy hóa đơn' : !invoice ? 'Chưa có hóa đơn' : invoice.status === 'da_thanh_toan' ? 'Đã hoàn tất' : `${new Intl.NumberFormat('vi-VN').format(invoice.amount)}đ`,
            joined: new Intl.DateTimeFormat('vi-VN').format(new Date(enrollment?.enrolledAt ?? user.createdAt)), linked: Boolean(enrollment), canChangeClass: Boolean(Number(enrollment?.canChangeClass)),
          }
        })
      })
      setStudents(records); setSelected((current) => current ? records.find((item) => item.id === current.id && item.enrollmentId === current.enrollmentId) ?? null : null)
      setAssigning((current) => current ? records.find((item) => item.id === current.id && item.enrollmentId === current.enrollmentId) ?? null : null)
      setEnrolling((current) => current ? records.find((item) => item.id === current.id) ?? null : null)
    } catch (error) { if (requestId === loadRequest.current) { setLoadError(errorMessage(error)); setSelected(null) } }
    finally { if (requestId === loadRequest.current) setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => () => { loadRequest.current += 1; previewRequest.current += 1 }, [])

  const openNew = () => { form.resetFields(); setEditing('new') }
  const openEdit = (student: StudentRecord) => { form.resetFields(); form.setFieldsValue(student); setSelected(null); setEditing(student) }
  const showDelivery = (accounts: AccountDelivery[], title: string) => {
    const fallback = accounts.filter((item) => !item.emailSent)
    if (!fallback.length) { messageApi.success(`${title}. Đã gửi thông tin đăng nhập qua email.`); return }
    modalApi.warning({ title, width: 560, content: <><Typography.Paragraph>Đã gửi email cho {accounts.length - fallback.length}/{accounts.length} tài khoản. Bàn giao riêng thông tin bên dưới; tài khoản đã được tạo, không nhập lại.</Typography.Paragraph>{fallback.map((item) => <Card key={item.email} size="small" style={{ marginTop: 10 }}><Typography.Text strong>{item.email}</Typography.Text><br /><Typography.Text copyable>{item.temporaryPassword}</Typography.Text><Typography.Paragraph type="secondary">{item.emailWarning}</Typography.Paragraph></Card>)}</> })
  }
  const save = async (values: StudentForm) => {
    if (!editing || blocked || mutationPending.current) return
    const phone = phoneDigits(values.phone)
    const email = (values.email ?? '').trim()
    if (students.some((item) => phoneDigits(item.phone) === phone && item.code !== (typeof editing === 'object' && editing ? editing.code : ''))) {
      form.setFields([{ name: 'phone', errors: ['Số điện thoại đã tồn tại.'] }]); return
    }
    mutationPending.current = true; setSaving(true)
    try {
      if (editing === 'new') {
        const course = courses.find((item) => item.id === values.courseId)
        if (!course) throw new Error('Khóa học không tồn tại')
        const result = await api<{ accounts: AccountDelivery[] }>('/enrollments/import/confirm', json('POST', { courseId: course.id, rows: [{ fullName: values.name.trim(), email, phone, birthDate: values.birthDate }] }))
        showDelivery(result.accounts, 'Đã ghi danh học viên')
      } else if (editing) {
        await api(`/users/${editing.id}`, json('PATCH', { fullName: values.name.trim(), email, phone, birthDate: values.birthDate }))
        messageApi.success('Đã cập nhật hồ sơ.')
      }
      setEditing(null); await load()
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { mutationPending.current = false; setSaving(false) }
  }
  const toggleAccount = (student: StudentRecord) => modalApi.confirm({
    title: student.active ? 'Khóa tài khoản học viên?' : 'Mở khóa tài khoản học viên?',
    content: student.active ? `${student.name} sẽ không thể đăng nhập; các phiên đang mở sẽ bị vô hiệu hóa. Lịch sử học tập và ghi danh được giữ nguyên.` : `${student.name} sẽ được đăng nhập trở lại.`,
    okText: student.active ? 'Khóa tài khoản' : 'Mở khóa', okButtonProps: { danger: student.active },
    onOk: async () => {
      if (blocked || mutationPending.current) return
      mutationPending.current = true; setSaving(true)
      try { await api(`/users/${student.id}/status`, json('PATCH', { active: !student.active })); setSelected(null); await load(); messageApi.success(student.active ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.') } catch (error) { messageApi.error(errorMessage(error)); throw error }
      finally { mutationPending.current = false; setSaving(false) }
    },
  })
  const resetPassword = (student: StudentRecord) => modalApi.confirm({
    title: 'Đặt lại mật khẩu học viên?', content: `Gửi mật khẩu tạm tới ${student.email} và vô hiệu hóa các phiên đăng nhập cũ.`, okText: 'Đặt lại mật khẩu',
    onOk: async () => {
      if (blocked || mutationPending.current) return
      mutationPending.current = true; setSaving(true)
      try {
        const result = await api<{ emailSent: boolean; devTemporaryPassword?: string }>(`/users/${student.id}/reset-password`, { method: 'POST' })
        if (result.emailSent) messageApi.success(`Đã gửi mật khẩu tạm tới ${student.email}.`)
        else modalApi.warning({ title: 'Đã đặt lại mật khẩu', content: <><Typography.Paragraph>Email chưa được cấu hình. Bàn giao riêng mật khẩu tạm cho học viên.</Typography.Paragraph><Typography.Text copyable>{result.devTemporaryPassword}</Typography.Text></> })
      } catch (error) { messageApi.error(errorMessage(error)); throw error }
      finally { mutationPending.current = false; setSaving(false) }
    },
  })
  const remove = (student: StudentRecord) => {
    if (!canDeleteStudent(student)) return
    modalApi.confirm({ title: 'Xóa hồ sơ học viên?', content: `${student.name} · ${student.code}`, okText: 'Xóa', okButtonProps: { danger: true }, onOk: async () => {
      if (blocked || mutationPending.current || !canDeleteStudent(student)) return
      mutationPending.current = true; setSaving(true)
      try { await api(`/users/${student.id}`, { method: 'DELETE' }); setSelected(null); await load(); messageApi.success('Đã xóa hồ sơ.') } catch (error) { messageApi.error(errorMessage(error)); throw error }
      finally { mutationPending.current = false; setSaving(false) }
    } })
  }
  const availableClasses = (student: StudentRecord) => classes.filter((item) => item.courseId === student.courseId && ['sap_khai_giang', 'dang_hoc'].includes(item.status)
    && (!Number(item.hasStarted) || student.status === 'Bảo lưu' && item.status === 'dang_hoc' && item.id === student.classId)
    && (item.enrolled < item.capacity || item.id === student.classId && student.status === 'Đang học'))
  const openAssign = (student: StudentRecord) => {
    const options = availableClasses(student)
    setAssigning(student)
    setAssignClassId(options.find((item) => item.id === student.classId)?.id ?? options[0]?.id)
    setSelected(null)
  }
  const assignClass = async () => {
    if (!assigning?.enrollmentId || !assignClassId || blocked || mutationPending.current) return
    mutationPending.current = true; setSaving(true)
    try {
      await api(`/enrollments/${assigning.enrollmentId}`, json('PATCH', { classId: assignClassId, status: 'dang_hoc' }))
      setAssigning(null); await load(); messageApi.success(assigning.status === 'Bảo lưu' ? 'Đã tiếp tục khóa học.' : 'Đã xếp lớp cho học viên.')
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { mutationPending.current = false; setSaving(false) }
  }
  const openEnrollment = (student: StudentRecord) => {
    const usedCourseIds = new Set(students.filter((item) => item.id === student.id && item.enrollmentId && !['Hoàn thành', 'Đã hủy'].includes(item.status)).map((item) => item.courseId))
    setEnrolling(student)
    setEnrollmentCourseId(courses.find((item) => !usedCourseIds.has(item.id))?.id)
    setEnrollmentClassId(undefined)
    setSelected(null)
  }
  const addEnrollment = async () => {
    if (!enrolling || !enrollmentCourseId || blocked || mutationPending.current) return
    mutationPending.current = true; setEnrollmentLoading(true)
    try {
      await api('/enrollments', json('POST', { studentId: enrolling.id, courseId: enrollmentCourseId, classId: enrollmentClassId ?? null }))
      setEnrolling(null); await load(); messageApi.success('Đã ghi danh khóa học và tạo hóa đơn.')
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { mutationPending.current = false; setEnrollmentLoading(false) }
  }
  const changeEnrollmentStatus = (student: StudentRecord, next: 'bao_luu' | 'da_huy') => {
    if (!student.enrollmentId) return
    const labels = { bao_luu: 'Bảo lưu ghi danh', da_huy: 'Hủy ghi danh' }
    modalApi.confirm({
      title: `${labels[next]}?`,
      content: next === 'da_huy' ? 'Chỉ hủy trước khi học. Hóa đơn chưa thanh toán sẽ bị hủy cùng ghi danh; không hủy ghi danh đã thanh toán vì hệ thống chưa hỗ trợ hoàn tiền.' : `${student.name} · ${student.course}. Bảo lưu trước khi học sẽ giải phóng chỗ ở lớp cũ, giữ nguyên học phí. Khi tiếp tục cần chọn lớp chưa bắt đầu.`,
      okText: labels[next],
      okButtonProps: { danger: next === 'da_huy' },
      onOk: async () => {
        if (blocked || mutationPending.current) return
        mutationPending.current = true; setSaving(true)
        try { await api(`/enrollments/${student.enrollmentId}`, json('PATCH', { status: next })); setSelected(null); await load(); messageApi.success(`Đã ${next === 'bao_luu' ? 'bảo lưu ghi danh' : 'hủy ghi danh'}.`) } catch (error) { messageApi.error(errorMessage(error)); throw error }
        finally { mutationPending.current = false; setSaving(false) }
      },
    })
  }
  const loadExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || blocked || previewLoading) return
    setPreview([])
    if (!importCourseId) { messageApi.error('Hãy chọn khóa học trước.'); return }
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 5_000_000) { messageApi.error('Chọn tệp .xlsx không quá 5 MB.'); return }
    const requestId = ++previewRequest.current
    setPreviewLoading(true)
    try {
      const result = await api<{ rows: ImportRow[] }>(`/enrollments/import/preview?courseId=${importCourseId}`, { method: 'POST', headers: { 'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: file })
      if (requestId === previewRequest.current) setPreview(result.rows)
    } catch (error) {
      if (requestId === previewRequest.current) messageApi.error(errorMessage(error))
    }
    finally { if (requestId === previewRequest.current) setPreviewLoading(false) }
  }
  const importValid = async () => {
    if (blocked || mutationPending.current || previewLoading) return
    const valid = preview.filter((item) => item.errors.length === 0)
    if (!valid.length || !importCourseId) return
    mutationPending.current = true; setImportLoading(true)
    try {
      const result = await api<{ created: number; accounts: AccountDelivery[] }>('/enrollments/import/confirm', json('POST', { courseId: importCourseId, rows: valid }))
      showDelivery(result.accounts, `Đã import ${result.created} học viên`)
      setImporting(false); setPreview([]); await load()
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { mutationPending.current = false; setImportLoading(false) }
  }
  const downloadTemplate = async () => { try { const blob = await apiBlob('/enrollments/import/template'); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mau-import-hoc-vien.xlsx'; anchor.click(); URL.revokeObjectURL(url) } catch (error) { messageApi.error(errorMessage(error)) } }

  const columns: TableProps<StudentRecord>['columns'] = [
    { title: 'Học viên', key: 'student', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><strong>{item.name}</strong><small>{item.code}</small></div></div> },
    { title: 'Khóa học / lớp', key: 'class', render: (_, item) => <div><Typography.Text strong>{item.course}</Typography.Text><br /><Typography.Text type="secondary">{item.className}</Typography.Text></div> },
    { title: 'Chuyên cần', dataIndex: 'attendance' },
    { title: 'Học phí', dataIndex: 'debt', render: (value: string) => <Typography.Text type={value === 'Đã hoàn tất' ? 'success' : ['Chưa có hóa đơn', 'Đã hủy hóa đơn'].includes(value) ? 'secondary' : 'danger'} strong>{value}</Typography.Text> },
    { title: 'Ghi danh', dataIndex: 'status', render: (value: StudentStatus) => <Tag color={statusColor[value]}>{value}</Tag> },
    { title: 'Tài khoản', dataIndex: 'active', render: (value: boolean) => <Tag color={value ? 'green' : 'red'}>{value ? 'Hoạt động' : 'Đã khóa'}</Tag> },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button disabled={blocked} icon={<CaretRight />} onClick={() => setSelected(item)} aria-label={`Xem hồ sơ ${item.name}`} /> },
  ]

  return <AdminLayout activePage="students" mainId="student-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}{modalContext}
    <AdminPageHeader kicker="Hồ sơ học viên" title="Quản lý học viên" description="Ghi danh, cập nhật hồ sơ và kiểm tra danh sách trước khi xếp lớp." actions={<Space wrap><Button disabled={blocked || !courses.length} icon={<FileArrowUp />} onClick={() => { setPreview([]); setImportCourseId(courses[0]?.id); setImporting(true) }}>Import Excel</Button><Button disabled={blocked || !courses.length} type="primary" icon={<Plus />} onClick={openNew}>Ghi danh học viên</Button></Space>} />
    {loadError && <Alert type="error" showIcon title="Không tải được hồ sơ học viên" description={loadError} action={<Button loading={loading} onClick={() => void load()}>Thử lại</Button>} style={{ marginBottom: 16 }} />}
    {!loading && !loadError && <AdminSummary items={[
      { label: 'Tổng học viên', value: studentCount, detail: `${students.filter((item) => item.enrollmentId).length} lượt ghi danh`, icon: <Student weight="duotone" />, tone: 'success' },
      { label: 'Đang theo học', value: students.filter((item) => item.status === 'Đang học').length, detail: 'Lượt ghi danh đã vào lớp', icon: <UsersThree weight="duotone" /> },
      { label: 'Chờ xếp lớp', value: students.filter((item) => item.status === 'Chờ xếp lớp').length, detail: 'Hồ sơ mới ghi danh', icon: <WarningCircle weight="duotone" />, tone: 'danger' },
    ]} />}
    <Card className="admin-table-card" title="Danh sách ghi danh và lịch sử" extra={<Space wrap><Input disabled={loading || Boolean(loadError)} allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, email, khóa hoặc lớp" /><Select disabled={loading || Boolean(loadError)} aria-label="Trạng thái ghi danh" value={status} onChange={setStatus} options={['Tất cả', 'Chưa ghi danh', 'Chờ xếp lớp', 'Đang học', 'Bảo lưu', 'Hoàn thành', 'Đã hủy'].map((value) => ({ value, label: value }))} /><Select disabled={loading || Boolean(loadError)} aria-label="Trạng thái tài khoản" value={accountStatus} onChange={setAccountStatus} options={[{ value: 'all', label: 'Mọi tài khoản' }, { value: 'active', label: 'Đang hoạt động' }, { value: 'locked', label: 'Đã khóa' }]} /></Space>}>
      <Table loading={loading} rowKey={(item) => `${item.id}-${item.enrollmentId ?? 'none'}`} columns={columns} dataSource={loading || loadError ? [] : data} scroll={{ x: 1080 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} hồ sơ / lượt ghi danh` }} locale={{ emptyText: loading ? 'Đang tải hồ sơ…' : loadError ? 'Chưa tải được dữ liệu, hãy thử lại' : 'Không tìm thấy hồ sơ phù hợp' }} />
    </Card>
    <Drawer size={440} title="Hồ sơ học viên" open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <><Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text type="secondary">{selected.code}</Typography.Text></div></Flex><Descriptions bordered column={1} size="small" style={{ marginTop: 24 }} items={[{ key: 'birth', label: 'Ngày sinh', children: displayDate(selected.birthDate) }, { key: 'email', label: 'Email', children: selected.email || '—' }, { key: 'phone', label: 'Điện thoại', children: selected.phone }, { key: 'course', label: 'Khóa học', children: selected.course }, { key: 'class', label: 'Lớp hiện tại', children: selected.className }, { key: 'joined', label: 'Ngày ghi danh', children: selected.joined }, { key: 'attendance', label: 'Chuyên cần', children: selected.attendance }, { key: 'debt', label: 'Học phí', children: selected.debt }]} /><Card size="small" className="admin-drawer-status"><Flex justify="space-between"><Typography.Text type="secondary">Trạng thái ghi danh</Typography.Text><Tag color={statusColor[selected.status]}>{selected.status}</Tag></Flex></Card>
      <Card size="small" style={{ marginTop: 14 }}><Flex justify="space-between"><Typography.Text>Trạng thái tài khoản</Typography.Text><Tag color={selected.active ? 'green' : 'red'}>{selected.active ? 'Đang hoạt động' : 'Đã khóa'}</Tag></Flex></Card>
      {selected.status === 'Đã hủy' && <Alert style={{ marginTop: 16 }} type="info" showIcon title="Lịch sử ghi danh đã hủy" description="Hồ sơ này được giữ để tra cứu. Có thể ghi danh khóa học mới; không khôi phục hoặc thay đổi ghi danh đã hủy." />}
      {selected.enrollmentId && !selected.canChangeClass && selected.status !== 'Đã hủy' && <Alert style={{ marginTop: 16 }} type="info" showIcon title="Lịch sử học tập đã khóa" description="Không chuyển lớp, bảo lưu hay hủy sau khi đã học. Ghi danh bảo lưu cũ chỉ được tiếp tục tại đúng lớp đang học, giữ nguyên lịch sử; lớp đã kết thúc cần trung tâm kiểm tra riêng." />}
      <Space orientation="vertical" style={{ width: '100%', marginTop: 18 }}><Button block disabled={blocked || !selected.active || !courses.length} icon={<Plus />} onClick={() => openEnrollment(selected)}>Ghi danh thêm khóa học</Button>{selected.enrollmentId && selected.canChangeClass && ['Chờ xếp lớp', 'Đang học'].includes(selected.status) && <Button disabled={blocked} block type="primary" icon={<UsersThree />} onClick={() => openAssign(selected)}>{selected.className === 'Chưa xếp lớp' ? 'Xếp lớp' : 'Chuyển lớp'}</Button>}{selected.canChangeClass && ['Chờ xếp lớp', 'Đang học'].includes(selected.status) && <Button disabled={blocked} block icon={<PauseCircle />} onClick={() => changeEnrollmentStatus(selected, 'bao_luu')}>Bảo lưu ghi danh</Button>}{selected.status === 'Bảo lưu' && <Button disabled={blocked} block type="primary" icon={<PlayCircle />} onClick={() => openAssign(selected)}>Tiếp tục hoặc chuyển lớp</Button>}{selected.enrollmentId && selected.canChangeClass && ['Chờ xếp lớp', 'Đang học', 'Bảo lưu'].includes(selected.status) && <Button disabled={blocked} block danger icon={<XCircle />} onClick={() => changeEnrollmentStatus(selected, 'da_huy')}>Hủy ghi danh</Button>}<Button disabled={blocked} block icon={<PencilSimple />} onClick={() => openEdit(selected)}>Sửa hồ sơ</Button><Button disabled={blocked} loading={saving} block icon={<Key />} onClick={() => resetPassword(selected)}>Đặt lại mật khẩu</Button><Button disabled={blocked} loading={saving} block danger={selected.active} icon={selected.active ? <Lock /> : <LockOpen />} onClick={() => toggleAccount(selected)}>{selected.active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</Button><Button disabled={blocked || !canDeleteStudent(selected)} title={!canDeleteStudent(selected) ? "Tài khoản đã có lịch sử ghi danh, chỉ khóa để giữ dữ liệu" : undefined} block danger icon={<Trash />} onClick={() => remove(selected)}>Xóa hồ sơ</Button></Space></>}
    </Drawer>
    <Modal title={editing === 'new' ? 'Ghi danh học viên' : 'Sửa hồ sơ học viên'} open={editing !== null} onCancel={() => { if (!saving) setEditing(null) }} onOk={() => form.submit()} confirmLoading={saving} okButtonProps={{ disabled: loading || Boolean(loadError) }} okText={editing === 'new' ? 'Lưu hồ sơ' : 'Cập nhật'} destroyOnHidden>
      <Form disabled={blocked} form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}>
        <Form.Item name="name" label="Họ và tên" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên.' }]}><Input /></Form.Item>
        <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại.' }, { validator: (_, value) => !value || validPhone(value) ? Promise.resolve() : Promise.reject(new Error('Số điện thoại phải có đúng 10 chữ số, bắt đầu bằng 0.')) }]}><Input /></Form.Item>
        <Form.Item name="birthDate" label="Ngày sinh" rules={[{ required: true, message: 'Vui lòng chọn ngày sinh.' }, { validator: (_, value) => !value || validBirthDate(value) ? Promise.resolve() : Promise.reject(new Error('Ngày sinh không hợp lệ.')) }]}><Input type="date" /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập email.' }, { type: 'email', message: 'Email không hợp lệ.' }]}><Input type="email" /></Form.Item>
        {editing === 'new' ? <Form.Item name="courseId" label="Khóa học đăng ký" rules={[{ required: true, message: 'Vui lòng chọn khóa học.' }]}><Select showSearch optionFilterProp="label" options={courses.map((item) => ({ value: item.id, label: courseLabel(item) }))} /></Form.Item> : <Form.Item label="Khóa học đăng ký"><Input disabled value={typeof editing === 'object' && editing ? editing.course : ''} /></Form.Item>}
      </Form>
    </Modal>
    <Modal title={assigning?.status === 'Bảo lưu' ? `Tiếp tục học cho ${assigning.name}` : assigning ? `Xếp lớp cho ${assigning.name}` : 'Xếp lớp'} open={Boolean(assigning)} onCancel={() => !saving && setAssigning(null)} onOk={assignClass} confirmLoading={saving} okText="Xác nhận" okButtonProps={{ disabled: blocked || !assignClassId }} destroyOnHidden>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>Chỉ nhận lớp chưa bắt đầu, còn chỗ thuộc khóa {assigning?.course}. Riêng bảo lưu cũ được tiếp tục tại đúng lớp cũ còn đang học, không đổi lịch sử.</Typography.Paragraph>
      <Select disabled={blocked} style={{ width: '100%' }} value={assignClassId} onChange={setAssignClassId} placeholder="Chọn lớp học" options={(assigning ? availableClasses(assigning) : []).map((item) => ({ value: item.id, label: `${item.name} · ${item.enrolled}/${item.capacity} học viên${Number(item.hasStarted) ? ' · Tiếp tục lớp cũ' : ''}` }))} />
    </Modal>
    <Modal title={enrolling ? `Ghi danh thêm cho ${enrolling.name}` : 'Ghi danh khóa học'} open={Boolean(enrolling)} onCancel={() => !enrollmentLoading && setEnrolling(null)} onOk={() => void addEnrollment()} okText="Ghi danh và tạo hóa đơn" confirmLoading={enrollmentLoading} okButtonProps={{ disabled: blocked || !enrollmentCourseId }} destroyOnHidden>
      <Alert style={{ margin: '18px 0' }} type="info" showIcon title="Mỗi khóa học là một ghi danh riêng" description="Hệ thống sẽ tạo hóa đơn học phí tương ứng và không cho phép ghi danh trùng khóa đang còn hiệu lực." />
      <Form disabled={blocked} layout="vertical">
        <Form.Item label="Khóa học" required><Select showSearch optionFilterProp="label" value={enrollmentCourseId} onChange={(value) => { setEnrollmentCourseId(value); setEnrollmentClassId(undefined) }} placeholder="Chọn khóa học" options={courses.filter((course) => !students.some((item) => item.id === enrolling?.id && item.enrollmentId && !['Hoàn thành', 'Đã hủy'].includes(item.status) && item.courseId === course.id)).map((course) => ({ value: course.id, label: courseLabel(course) }))} /></Form.Item>
        <Form.Item label="Xếp lớp ngay (không bắt buộc)"><Select allowClear value={enrollmentClassId} onChange={setEnrollmentClassId} disabled={blocked || !enrollmentCourseId} placeholder="Để trống nếu xếp lớp sau" options={classes.filter((item) => item.courseId === enrollmentCourseId && ['sap_khai_giang', 'dang_hoc'].includes(item.status) && !Number(item.hasStarted) && item.enrolled < item.capacity).map((item) => ({ value: item.id, label: `${item.name} · ${item.enrolled}/${item.capacity} học viên` }))} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Import học viên từ Excel" open={importing} onCancel={() => { if (!importLoading && !previewLoading) { previewRequest.current += 1; setImporting(false); setPreview([]) } }} onOk={importValid} confirmLoading={importLoading} okText={`Lưu ${validImportCount} dòng hợp lệ`} okButtonProps={{ disabled: blocked || previewLoading || validImportCount === 0 }} width={850} destroyOnHidden>
      <Alert style={{ margin: '18px 0' }} type="info" showIcon title="Định dạng tệp .xlsx" description="Dòng đầu gồm Họ tên, Email, Số điện thoại và Ngày sinh. Tối đa 100 dòng, 5 MB." />
      <Flex gap={10} align="end" wrap style={{ marginBottom: 16 }}><div style={{ flex: 1 }}><Typography.Text>Khóa học ghi danh</Typography.Text><Select disabled={blocked || previewLoading} showSearch optionFilterProp="label" style={{ width: '100%', marginTop: 8 }} value={importCourseId} onChange={(value) => { previewRequest.current += 1; setImportCourseId(value); setPreview([]) }} options={courses.map((item) => ({ value: item.id, label: courseLabel(item) }))} /></div><Button disabled={blocked || previewLoading} onClick={downloadTemplate}>Tải file mẫu</Button></Flex>
      <label htmlFor="student-import-file">Chọn tệp Excel</label><Input disabled={blocked || previewLoading || !importCourseId} id="student-import-file" type="file" accept=".xlsx" onChange={loadExcel} style={{ margin: '8px 0 16px' }} />
      {previewLoading && <Typography.Paragraph role="status">Đang kiểm tra tệp Excel…</Typography.Paragraph>}
      {preview.length > 0 && <><Typography.Paragraph>Hợp lệ: <strong>{validImportCount}</strong> · Có lỗi: <strong>{preview.length - validImportCount}</strong></Typography.Paragraph><Table size="small" rowKey="rowNumber" dataSource={preview} pagination={{ pageSize: 6 }} scroll={{ x: 720 }} columns={[{ title: 'Dòng', dataIndex: 'rowNumber', width: 65 }, { title: 'Họ tên', dataIndex: 'fullName' }, { title: 'Email', dataIndex: 'email' }, { title: 'Số điện thoại', dataIndex: 'phone' }, { title: 'Kiểm tra', dataIndex: 'errors', render: (errors: string[]) => errors.length ? <Typography.Text type="danger">{errors.join('; ')}</Typography.Text> : <Tag color="green">Hợp lệ</Tag> }]} /></>}
    </Modal>
  </AdminLayout>
}

export default AdminStudents
