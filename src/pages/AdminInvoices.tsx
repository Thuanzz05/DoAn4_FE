import { type FormEvent, useMemo, useState } from 'react'
import {
  Bank,
  CalendarBlank,
  CaretRight,
  CheckCircle,
  CurrencyCircleDollar,
  MagnifyingGlass,
  Plus,
  Receipt,
  ShieldWarning,
  Student,
  X,
} from '@phosphor-icons/react'
import AdminLayout, { type AdminPage } from './AdminLayout'
import './AdminDashboard.css'
import './AdminStudents.css'
import './AdminCourses.css'
import './AdminInvoices.css'

type InvoiceStatus = 'Chưa thanh toán' | 'Đã thanh toán' | 'Quá hạn' | 'Đã hủy'

type InvoiceRecord = {
  id: number
  code: string
  studentCode: string
  studentName: string
  className: string
  course: string
  amount: number
  issuedAt: string
  dueDate: string
  status: InvoiceStatus
  paidAt?: string
  paymentMethod?: string
  cancelReason?: string
}

type AdminInvoicesProps = {
  onLogout: () => void
  onNavigate: (page: AdminPage) => void
  onNavigateHome: () => void
}

const students = [
  { code: 'HV-0248', name: 'Nguyễn Khánh Linh', className: 'A2 Giao tiếp', course: 'Tiếng Anh A2', amount: 3200000 },
  { code: 'HV-0217', name: 'Trần Gia Huy', className: 'B1 Tổng quát', course: 'Tiếng Anh B1', amount: 4200000 },
  { code: 'HV-0196', name: 'Lê Minh Anh', className: 'IELTS 6.5', course: 'Luyện thi IELTS 6.5', amount: 6800000 },
  { code: 'HV-0173', name: 'Phạm Quang Duy', className: 'A2 Giao tiếp', course: 'Tiếng Anh A2', amount: 3200000 },
  { code: 'HV-0151', name: 'Võ Hoàng Nam', className: 'TOPIK I - K05', course: 'Tiếng Hàn TOPIK I', amount: 4900000 },
  { code: 'HV-0138', name: 'Đặng Thu Trang', className: 'HSK 3 - T04', course: 'Tiếng Trung HSK 3', amount: 4600000 },
] as const

const initialInvoices: InvoiceRecord[] = [
  { id: 1, code: 'HD-2026-041', studentCode: 'HV-0248', studentName: 'Nguyễn Khánh Linh', className: 'A2 Giao tiếp', course: 'Tiếng Anh A2', amount: 3200000, issuedAt: '2026-08-12', dueDate: '2026-09-25', status: 'Chưa thanh toán' },
  { id: 2, code: 'HD-2026-040', studentCode: 'HV-0217', studentName: 'Trần Gia Huy', className: 'B1 Tổng quát', course: 'Tiếng Anh B1', amount: 4200000, issuedAt: '2026-08-08', dueDate: '2026-09-10', status: 'Đã thanh toán', paidAt: '2026-09-08', paymentMethod: 'Chuyển khoản' },
  { id: 3, code: 'HD-2026-039', studentCode: 'HV-0196', studentName: 'Lê Minh Anh', className: 'IELTS 6.5', course: 'Luyện thi IELTS 6.5', amount: 6800000, issuedAt: '2026-08-01', dueDate: '2026-09-05', status: 'Quá hạn' },
  { id: 4, code: 'HD-2026-038', studentCode: 'HV-0173', studentName: 'Phạm Quang Duy', className: 'A2 Giao tiếp', course: 'Tiếng Anh A2', amount: 3200000, issuedAt: '2026-07-28', dueDate: '2026-08-28', status: 'Đã thanh toán', paidAt: '2026-08-24', paymentMethod: 'Tiền mặt' },
  { id: 5, code: 'HD-2026-037', studentCode: 'HV-0151', studentName: 'Võ Hoàng Nam', className: 'TOPIK I - K05', course: 'Tiếng Hàn TOPIK I', amount: 4900000, issuedAt: '2026-07-20', dueDate: '2026-09-20', status: 'Chưa thanh toán' },
  { id: 6, code: 'HD-2026-036', studentCode: 'HV-0138', studentName: 'Đặng Thu Trang', className: 'HSK 3 - T04', course: 'Tiếng Trung HSK 3', amount: 4600000, issuedAt: '2026-07-18', dueDate: '2026-08-20', status: 'Đã hủy', cancelReason: 'Học viên chuyển sang khóa học khác.' },
]

const formatMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`
const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))

function AdminInvoices({ onLogout, onNavigate, onNavigateHome }: AdminInvoicesProps) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | InvoiceStatus>('Tất cả')
  const [className, setClassName] = useState('Tất cả')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [studentCode, setStudentCode] = useState<string>(students[0].code)
  const [dueDate, setDueDate] = useState('2026-10-15')
  const [formError, setFormError] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedId) ?? null
  const selectedStudent = students.find((student) => student.code === studentCode) ?? students[0]
  const classNames = [...new Set(invoices.map((invoice) => invoice.className))]
  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')
    return invoices.filter((invoice) => {
      const matchesQuery = !normalizedQuery || [invoice.code, invoice.studentCode, invoice.studentName, invoice.className, invoice.course]
        .some((value) => value.toLocaleLowerCase('vi').includes(normalizedQuery))
      return matchesQuery && (status === 'Tất cả' || invoice.status === status) && (className === 'Tất cả' || invoice.className === className)
    })
  }, [className, invoices, query, status])

  const collected = invoices.filter((invoice) => invoice.status === 'Đã thanh toán').reduce((total, invoice) => total + invoice.amount, 0)
  const outstanding = invoices.filter((invoice) => invoice.status === 'Chưa thanh toán' || invoice.status === 'Quá hạn').reduce((total, invoice) => total + invoice.amount, 0)
  const overdueCount = invoices.filter((invoice) => invoice.status === 'Quá hạn').length

  const openCreate = () => {
    setCreating(true)
    setStudentCode(students[0].code)
    setDueDate('2026-10-15')
    setFormError('')
  }

  const createInvoice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!dueDate) {
      setFormError('Vui lòng chọn hạn thanh toán.')
      return
    }
    if (invoices.some((invoice) => invoice.studentCode === studentCode && invoice.className === selectedStudent.className && invoice.status !== 'Đã hủy')) {
      setFormError('Học viên đã có hóa đơn còn hiệu lực cho lớp này.')
      return
    }
    const id = Math.max(0, ...invoices.map((invoice) => invoice.id)) + 1
    const nextInvoice: InvoiceRecord = {
      id,
      code: `HD-2026-${String(id + 41).padStart(3, '0')}`,
      studentCode: selectedStudent.code,
      studentName: selectedStudent.name,
      className: selectedStudent.className,
      course: selectedStudent.course,
      amount: selectedStudent.amount,
      issuedAt: new Date().toISOString().slice(0, 10),
      dueDate,
      status: 'Chưa thanh toán',
    }
    setInvoices((current) => [nextInvoice, ...current])
    setFeedback({ type: 'success', message: `Đã tạo hóa đơn ${nextInvoice.code} cho ${nextInvoice.studentName}.` })
    setCreating(false)
  }

  const confirmPayment = (invoice: InvoiceRecord) => {
    if (invoice.status === 'Đã thanh toán' || invoice.status === 'Đã hủy') return
    if (!window.confirm(`Xác nhận đã nhận ${formatMoney(invoice.amount)} từ ${invoice.studentName}?`)) return
    const paidAt = new Date().toISOString().slice(0, 10)
    setInvoices((current) => current.map((item) => item.id === invoice.id ? { ...item, status: 'Đã thanh toán', paidAt, paymentMethod: 'Chuyển khoản' } : item))
    setFeedback({ type: 'success', message: `Hóa đơn ${invoice.code} đã thanh toán. Quyền dự thi được cập nhật theo điều kiện học vụ.` })
  }

  const cancelInvoice = (invoice: InvoiceRecord) => {
    if (invoice.status === 'Đã thanh toán') {
      setFeedback({ type: 'error', message: 'Không thể hủy hóa đơn đã thanh toán. Cần xử lý hoàn tiền thủ công trước.' })
      return
    }
    if (invoice.status === 'Đã hủy') return
    const reason = window.prompt(`Nhập lý do hủy hóa đơn ${invoice.code}:`)
    if (reason === null) return
    if (!reason.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập lý do hủy hóa đơn.' })
      return
    }
    setInvoices((current) => current.map((item) => item.id === invoice.id ? { ...item, status: 'Đã hủy', cancelReason: reason.trim() } : item))
    setFeedback({ type: 'success', message: `Đã hủy hóa đơn ${invoice.code} và lưu lý do.` })
  }

  return (
    <AdminLayout activePage="invoices" mainId="invoice-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <section className="students-heading" aria-labelledby="invoices-title"><div><span className="section-kicker">Tài chính học vụ</span><h1 id="invoices-title">Quản lý học phí</h1><p>Theo dõi hóa đơn, công nợ và điều kiện dự thi của học viên.</p></div><button className="course-add-button" type="button" onClick={openCreate}><Plus aria-hidden="true" weight="bold" />Tạo hóa đơn</button></section>

      <section className="student-summary" aria-label="Tổng quan học phí minh họa">
        <article><Bank aria-hidden="true" weight="duotone" /><div><span>Đã thu</span><strong>{formatMoney(collected).replace('đ', '')}</strong><p>VNĐ đã xác nhận thanh toán</p></div></article>
        <article><CurrencyCircleDollar aria-hidden="true" weight="duotone" /><div><span>Công nợ</span><strong>{formatMoney(outstanding).replace('đ', '')}</strong><p>VNĐ chưa hoàn tất</p></div></article>
        <article><ShieldWarning aria-hidden="true" weight="duotone" /><div><span>Hóa đơn quá hạn</span><strong>{String(overdueCount).padStart(2, '0')}</strong><p>Tạm khóa quyền dự thi</p></div></article>
      </section>

      {feedback && <div className={`course-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}><span>{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Đóng thông báo"><X aria-hidden="true" /></button></div>}

      <section className="students-panel" aria-labelledby="invoice-list-title"><div className="students-panel-head"><div><h2 id="invoice-list-title">Danh sách hóa đơn</h2><p>Công nợ được đồng bộ với điều kiện dự thi và cấp chứng chỉ.</p></div><div className="student-filters invoice-filters"><label className="student-search"><span className="sr-only">Tìm kiếm hóa đơn</span><MagnifyingGlass aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã, học viên hoặc lớp" /></label><label><span className="sr-only">Lọc theo trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value as 'Tất cả' | InvoiceStatus)}><option>Tất cả</option><option>Chưa thanh toán</option><option>Đã thanh toán</option><option>Quá hạn</option><option>Đã hủy</option></select></label><label><span className="sr-only">Lọc theo lớp học</span><select value={className} onChange={(event) => setClassName(event.target.value)}><option>Tất cả</option>{classNames.map((item) => <option key={item}>{item}</option>)}</select></label></div></div><p className="student-result-count" aria-live="polite">Hiển thị {filteredInvoices.length} hóa đơn</p><div className="student-table-wrap"><table className="invoice-table"><thead><tr><th>Hóa đơn</th><th>Học viên</th><th>Lớp học</th><th>Số tiền</th><th>Hạn thanh toán</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{filteredInvoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.code}</strong><br /><small>{formatDate(invoice.issuedAt)}</small></td><td><div className="student-identity"><span aria-hidden="true">{invoice.studentName.split(' ').slice(-2).map((part) => part[0]).join('')}</span><div><strong>{invoice.studentName}</strong><small>{invoice.studentCode}</small></div></div></td><td>{invoice.className}</td><td className="course-tuition">{formatMoney(invoice.amount)}</td><td>{formatDate(invoice.dueDate)}</td><td><span className={`invoice-status ${invoice.status === 'Đã thanh toán' ? 'paid' : invoice.status === 'Quá hạn' ? 'overdue' : invoice.status === 'Đã hủy' ? 'cancelled' : 'pending'}`}>{invoice.status}</span></td><td><button type="button" onClick={() => setSelectedId(invoice.id)} aria-label={`Xem hóa đơn ${invoice.code}`}><CaretRight aria-hidden="true" weight="bold" /></button></td></tr>)}</tbody></table>{filteredInvoices.length === 0 && <div className="student-empty"><MagnifyingGlass aria-hidden="true" /><strong>Không tìm thấy hóa đơn phù hợp</strong><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}</div></section>

      {selectedInvoice && <><button className="student-drawer-backdrop" type="button" onClick={() => setSelectedId(null)} aria-label="Đóng hóa đơn" /><aside className="student-drawer" role="dialog" aria-modal="true" aria-labelledby="invoice-drawer-title"><div className="student-drawer-head"><span>Chi tiết hóa đơn</span><button type="button" onClick={() => setSelectedId(null)} aria-label="Đóng hóa đơn"><X aria-hidden="true" /></button></div><div className="invoice-drawer-heading"><Receipt aria-hidden="true" weight="duotone" /><div><h2 id="invoice-drawer-title">{selectedInvoice.code}</h2><p>{selectedInvoice.studentName} · {selectedInvoice.studentCode}</p></div></div><div className="invoice-total"><span>Tổng học phí</span><strong>{formatMoney(selectedInvoice.amount)}</strong></div><dl className="student-details"><div><dt><Student aria-hidden="true" />Khóa học</dt><dd>{selectedInvoice.course}</dd></div><div><dt><CalendarBlank aria-hidden="true" />Ngày tạo</dt><dd>{formatDate(selectedInvoice.issuedAt)}</dd></div><div><dt><CalendarBlank aria-hidden="true" />Hạn thanh toán</dt><dd>{formatDate(selectedInvoice.dueDate)}</dd></div>{selectedInvoice.paidAt && <div><dt><CheckCircle aria-hidden="true" />Đã thanh toán</dt><dd>{formatDate(selectedInvoice.paidAt)} · {selectedInvoice.paymentMethod}</dd></div>}{selectedInvoice.cancelReason && <div><dt><X aria-hidden="true" />Lý do hủy</dt><dd>{selectedInvoice.cancelReason}</dd></div>}</dl><div className={`invoice-access ${selectedInvoice.status === 'Đã thanh toán' ? 'is-open' : ''}`}><ShieldWarning aria-hidden="true" weight="fill" /><div><span>Điều kiện dự thi</span><strong>{selectedInvoice.status === 'Đã thanh toán' ? 'Đã mở khóa theo tài chính' : 'Tạm khóa do học phí'}</strong></div></div><div className="invoice-actions">{(selectedInvoice.status === 'Chưa thanh toán' || selectedInvoice.status === 'Quá hạn') && <button className="is-primary" type="button" onClick={() => confirmPayment(selectedInvoice)}><CheckCircle aria-hidden="true" />Xác nhận thanh toán</button>}<button type="button" onClick={() => cancelInvoice(selectedInvoice)} disabled={selectedInvoice.status === 'Đã hủy'}><X aria-hidden="true" />Hủy hóa đơn</button></div></aside></>}

      {creating && <><button className="student-drawer-backdrop" type="button" onClick={() => setCreating(false)} aria-label="Đóng biểu mẫu hóa đơn" /><aside className="student-drawer course-drawer" role="dialog" aria-modal="true" aria-labelledby="invoice-form-title"><div className="student-drawer-head"><span>Hóa đơn mới</span><button type="button" onClick={() => setCreating(false)} aria-label="Đóng biểu mẫu"><X aria-hidden="true" /></button></div><div className="course-form-heading"><Receipt aria-hidden="true" weight="duotone" /><div><h2 id="invoice-form-title">Tạo hóa đơn</h2><p>Học phí được lấy tự động từ khóa học đã ghi danh.</p></div></div><form className="course-form" onSubmit={createInvoice} noValidate><div className="course-form-grid"><label className="course-field-wide"><span>Học viên *</span><select value={studentCode} onChange={(event) => { setStudentCode(event.target.value); setFormError('') }}>{students.map((student) => <option key={student.code} value={student.code}>{student.name} · {student.code}</option>)}</select></label><label className="course-field-wide"><span>Khóa học</span><input value={`${selectedStudent.course} · ${selectedStudent.className}`} readOnly /></label><label className="course-field-wide"><span>Học phí</span><div className="course-money-input"><CurrencyCircleDollar aria-hidden="true" /><input value={formatMoney(selectedStudent.amount)} readOnly /></div></label><label className="course-field-wide"><span>Hạn thanh toán *</span><input type="date" value={dueDate} onChange={(event) => { setDueDate(event.target.value); setFormError('') }} aria-invalid={Boolean(formError)} />{formError && <small>{formError}</small>}</label></div><div className="course-form-actions"><button type="button" onClick={() => setCreating(false)}>Hủy</button><button type="submit">Tạo hóa đơn</button></div></form></aside></>}
    </AdminLayout>
  )
}

export default AdminInvoices
