import { type FormEvent, useMemo, useState } from 'react'
import {
  Books,
  CaretRight,
  ChalkboardTeacher,
  EnvelopeSimple,
  Key,
  Lock,
  LockOpen,
  MagnifyingGlass,
  PencilSimple,
  Phone,
  Plus,
  UsersThree,
  X,
} from '@phosphor-icons/react'
import AdminLayout, { type AdminPage } from './AdminLayout'
import './AdminDashboard.css'
import './AdminStudents.css'
import './AdminCourses.css'
import './AdminTeachers.css'

type TeacherStatus = 'Đang hoạt động' | 'Đã khóa'

type TeacherRecord = {
  id: number
  code: string
  name: string
  email: string
  phone: string
  language: string
  specialty: string
  activeClasses: number
  status: TeacherStatus
  joined: string
}

type TeacherForm = Pick<TeacherRecord, 'name' | 'email' | 'phone' | 'language' | 'specialty'>

type AdminTeachersProps = {
  onLogout: () => void
  onNavigate: (page: AdminPage) => void
  onNavigateHome: () => void
}

const initialTeachers: TeacherRecord[] = [
  { id: 1, code: 'GV-001', name: 'Nguyễn Quốc Minh', email: 'minh.nguyen@trungtam.vn', phone: '090 481 2036', language: 'Tiếng Anh', specialty: 'Giao tiếp, IELTS', activeClasses: 3, status: 'Đang hoạt động', joined: '12/02/2024' },
  { id: 2, code: 'GV-002', name: 'Trần Ngọc Lan', email: 'lan.tran@trungtam.vn', phone: '091 728 1540', language: 'Tiếng Anh', specialty: 'Tổng quát A2-B2', activeClasses: 2, status: 'Đang hoạt động', joined: '08/05/2024' },
  { id: 3, code: 'GV-003', name: 'Lê Gia Hùng', email: 'hung.le@trungtam.vn', phone: '098 315 6724', language: 'Tiếng Anh', specialty: 'IELTS Academic', activeClasses: 2, status: 'Đang hoạt động', joined: '19/08/2024' },
  { id: 4, code: 'GV-004', name: 'Kim Anh Thư', email: 'thu.kim@trungtam.vn', phone: '093 604 2817', language: 'Tiếng Hàn', specialty: 'TOPIK I-II', activeClasses: 2, status: 'Đang hoạt động', joined: '03/01/2025' },
  { id: 5, code: 'GV-005', name: 'Lương Hải Yến', email: 'yen.luong@trungtam.vn', phone: '097 251 8493', language: 'Tiếng Trung', specialty: 'HSK 1-4', activeClasses: 1, status: 'Đang hoạt động', joined: '16/03/2025' },
  { id: 6, code: 'GV-006', name: 'Phạm Mai Chi', email: 'chi.pham@trungtam.vn', phone: '096 473 1058', language: 'Tiếng Nhật', specialty: 'JLPT N5-N3', activeClasses: 1, status: 'Đang hoạt động', joined: '21/06/2025' },
  { id: 7, code: 'GV-007', name: 'Đỗ Thanh Hà', email: 'ha.do@trungtam.vn', phone: '092 830 4165', language: 'Tiếng Pháp', specialty: 'A1-B1', activeClasses: 0, status: 'Đã khóa', joined: '11/09/2025' },
]

const emptyForm: TeacherForm = { name: '', email: '', phone: '', language: 'Tiếng Anh', specialty: '' }

function AdminTeachers({ onLogout, onNavigate, onNavigateHome }: AdminTeachersProps) {
  const [teachers, setTeachers] = useState(initialTeachers)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | TeacherStatus>('Tất cả')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<TeacherForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof TeacherForm, string>>>({})
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedId) ?? null
  const filteredTeachers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')
    return teachers.filter((teacher) => {
      const matchesQuery = !normalizedQuery || [teacher.name, teacher.code, teacher.email, teacher.language, teacher.specialty]
        .some((value) => value.toLocaleLowerCase('vi').includes(normalizedQuery))
      return matchesQuery && (status === 'Tất cả' || teacher.status === status)
    })
  }, [query, status, teachers])

  const languages = new Set(teachers.map((teacher) => teacher.language)).size
  const activeClasses = teachers.reduce((total, teacher) => total + teacher.activeClasses, 0)

  const openCreate = () => {
    setEditingId('new')
    setForm(emptyForm)
    setErrors({})
  }

  const openEdit = (teacher: TeacherRecord) => {
    setSelectedId(null)
    setEditingId(teacher.id)
    setForm({ name: teacher.name, email: teacher.email, phone: teacher.phone, language: teacher.language, specialty: teacher.specialty })
    setErrors({})
  }

  const updateForm = (field: keyof TeacherForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const closeForm = () => {
    setEditingId(null)
    setErrors({})
  }

  const submitTeacher = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = form.email.trim().toLocaleLowerCase('vi')
    const phone = form.phone.replace(/\s/g, '')
    const nextErrors: Partial<Record<keyof TeacherForm, string>> = {}

    if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập họ tên.'
    if (!email || !email.includes('@')) nextErrors.email = 'Email chưa hợp lệ.'
    else if (teachers.some((teacher) => teacher.email.toLocaleLowerCase('vi') === email && teacher.id !== editingId)) nextErrors.email = 'Email đã được sử dụng.'
    if (!/^0\d{9}$/.test(phone)) nextErrors.phone = 'Số điện thoại phải gồm 10 chữ số.'
    else if (teachers.some((teacher) => teacher.phone.replace(/\s/g, '') === phone && teacher.id !== editingId)) nextErrors.phone = 'Số điện thoại đã được sử dụng.'
    if (!form.language.trim()) nextErrors.language = 'Vui lòng nhập ngoại ngữ.'
    if (!form.specialty.trim()) nextErrors.specialty = 'Vui lòng nhập chuyên môn.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    if (editingId === 'new') {
      const nextId = Math.max(0, ...teachers.map((teacher) => teacher.id)) + 1
      const nextTeacher: TeacherRecord = {
        id: nextId,
        code: `GV-${String(nextId).padStart(3, '0')}`,
        name: form.name.trim(),
        email,
        phone,
        language: form.language.trim(),
        specialty: form.specialty.trim(),
        activeClasses: 0,
        status: 'Đang hoạt động',
        joined: new Intl.DateTimeFormat('vi-VN').format(new Date()),
      }
      setTeachers((current) => [nextTeacher, ...current])
      setFeedback({ type: 'success', message: `Đã tạo tài khoản ${nextTeacher.code} và gửi thông tin đăng nhập qua email.` })
    } else {
      setTeachers((current) => current.map((teacher) => teacher.id === editingId
        ? { ...teacher, name: form.name.trim(), email, phone, language: form.language.trim(), specialty: form.specialty.trim() }
        : teacher))
      setFeedback({ type: 'success', message: 'Thông tin tài khoản giáo viên đã được cập nhật.' })
    }

    closeForm()
  }

  const toggleStatus = (teacher: TeacherRecord) => {
    const willLock = teacher.status === 'Đang hoạt động'
    const warning = willLock && teacher.activeClasses > 0
      ? `${teacher.name} đang phụ trách ${teacher.activeClasses} lớp hoạt động. Bạn vẫn muốn khóa tài khoản?`
      : `Bạn có chắc chắn muốn ${willLock ? 'khóa' : 'mở khóa'} tài khoản ${teacher.name}?`
    if (!window.confirm(warning)) return
    const nextStatus: TeacherStatus = willLock ? 'Đã khóa' : 'Đang hoạt động'
    setTeachers((current) => current.map((item) => item.id === teacher.id ? { ...item, status: nextStatus } : item))
    setFeedback({ type: 'success', message: `Đã ${willLock ? 'khóa' : 'mở khóa'} tài khoản ${teacher.name}.` })
  }

  const resetPassword = (teacher: TeacherRecord) => {
    if (!window.confirm(`Tạo mật khẩu mới cho ${teacher.name}?`)) return
    setFeedback({ type: 'success', message: `Mật khẩu mới đã được tạo và gửi tới ${teacher.email}.` })
  }

  return (
    <AdminLayout activePage="teachers" mainId="teacher-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <section className="students-heading" aria-labelledby="teachers-title">
        <div><span className="section-kicker">Tài khoản giảng dạy</span><h1 id="teachers-title">Quản lý giáo viên</h1><p>Quản lý hồ sơ, chuyên môn và trạng thái truy cập của giáo viên.</p></div>
        <button className="course-add-button" type="button" onClick={openCreate}><Plus aria-hidden="true" weight="bold" />Thêm giáo viên</button>
      </section>

      <section className="student-summary" aria-label="Tổng quan giáo viên minh họa">
        <article><ChalkboardTeacher aria-hidden="true" weight="duotone" /><div><span>Tổng giáo viên</span><strong>{String(teachers.length).padStart(2, '0')}</strong><p>{teachers.filter((teacher) => teacher.status === 'Đang hoạt động').length} tài khoản đang hoạt động</p></div></article>
        <article><Books aria-hidden="true" weight="duotone" /><div><span>Ngoại ngữ phụ trách</span><strong>{String(languages).padStart(2, '0')}</strong><p>Phân công theo chuyên môn</p></div></article>
        <article><UsersThree aria-hidden="true" weight="duotone" /><div><span>Lớp đang giảng dạy</span><strong>{String(activeClasses).padStart(2, '0')}</strong><p>Cảnh báo trước khi khóa tài khoản</p></div></article>
      </section>

      {feedback && <div className={`course-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}><span>{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Đóng thông báo"><X aria-hidden="true" /></button></div>}

      <section className="students-panel" aria-labelledby="teacher-list-title">
        <div className="students-panel-head">
          <div><h2 id="teacher-list-title">Danh sách giáo viên</h2><p>Tài khoản được dùng để xem lịch, điểm danh và nhập điểm.</p></div>
          <div className="student-filters">
            <label className="student-search"><span className="sr-only">Tìm kiếm giáo viên</span><MagnifyingGlass aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã hoặc ngoại ngữ" /></label>
            <label><span className="sr-only">Lọc trạng thái tài khoản</span><select value={status} onChange={(event) => setStatus(event.target.value as 'Tất cả' | TeacherStatus)}><option>Tất cả</option><option>Đang hoạt động</option><option>Đã khóa</option></select></label>
          </div>
        </div>
        <p className="student-result-count" aria-live="polite">Hiển thị {filteredTeachers.length} giáo viên</p>
        <div className="student-table-wrap">
          <table className="teacher-table">
            <thead><tr><th>Giáo viên</th><th>Ngoại ngữ</th><th>Chuyên môn</th><th>Lớp phụ trách</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>{filteredTeachers.map((teacher) => <tr key={teacher.id}><td><div className="student-identity"><span aria-hidden="true">{teacher.name.split(' ').slice(-2).map((part) => part[0]).join('')}</span><div><strong>{teacher.name}</strong><small>{teacher.code}</small></div></div></td><td>{teacher.language}</td><td>{teacher.specialty}</td><td>{teacher.activeClasses} lớp</td><td><span className={`student-status ${teacher.status === 'Đang hoạt động' ? 'studying' : 'completed'}`}>{teacher.status}</span></td><td><button type="button" onClick={() => setSelectedId(teacher.id)} aria-label={`Xem tài khoản ${teacher.name}`}><CaretRight aria-hidden="true" weight="bold" /></button></td></tr>)}</tbody>
          </table>
          {filteredTeachers.length === 0 && <div className="student-empty"><MagnifyingGlass aria-hidden="true" /><strong>Không tìm thấy giáo viên phù hợp</strong><p>Thử thay đổi từ khóa hoặc trạng thái lọc.</p></div>}
        </div>
      </section>

      {selectedTeacher && (
        <><button className="student-drawer-backdrop" type="button" onClick={() => setSelectedId(null)} aria-label="Đóng tài khoản giáo viên" /><aside className="student-drawer" role="dialog" aria-modal="true" aria-labelledby="teacher-drawer-title">
          <div className="student-drawer-head"><span>Tài khoản giáo viên</span><button type="button" onClick={() => setSelectedId(null)} aria-label="Đóng tài khoản"><X aria-hidden="true" /></button></div>
          <div className="student-drawer-profile"><span aria-hidden="true">{selectedTeacher.name.split(' ').slice(-2).map((part) => part[0]).join('')}</span><div><h2 id="teacher-drawer-title">{selectedTeacher.name}</h2><p>{selectedTeacher.code}</p></div></div>
          <dl className="student-details"><div><dt><EnvelopeSimple aria-hidden="true" />Email</dt><dd>{selectedTeacher.email}</dd></div><div><dt><Phone aria-hidden="true" />Điện thoại</dt><dd>{selectedTeacher.phone}</dd></div><div><dt><ChalkboardTeacher aria-hidden="true" />Ngoại ngữ</dt><dd>{selectedTeacher.language}</dd></div><div><dt><Books aria-hidden="true" />Chuyên môn</dt><dd>{selectedTeacher.specialty}</dd></div><div><dt><UsersThree aria-hidden="true" />Lớp phụ trách</dt><dd>{selectedTeacher.activeClasses} lớp</dd></div></dl>
          <div className="student-drawer-status">{selectedTeacher.status === 'Đang hoạt động' ? <LockOpen aria-hidden="true" weight="fill" /> : <Lock aria-hidden="true" weight="fill" />}<div><span>Trạng thái tài khoản</span><strong>{selectedTeacher.status}</strong></div></div>
          <div className="teacher-drawer-actions"><button type="button" onClick={() => openEdit(selectedTeacher)}><PencilSimple aria-hidden="true" />Sửa thông tin</button><button type="button" onClick={() => resetPassword(selectedTeacher)}><Key aria-hidden="true" />Đặt lại mật khẩu</button><button className={selectedTeacher.status === 'Đang hoạt động' ? 'is-danger' : ''} type="button" onClick={() => toggleStatus(selectedTeacher)}>{selectedTeacher.status === 'Đang hoạt động' ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}{selectedTeacher.status === 'Đang hoạt động' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</button></div>
        </aside></>
      )}

      {editingId !== null && (
        <><button className="student-drawer-backdrop" type="button" onClick={closeForm} aria-label="Đóng biểu mẫu giáo viên" /><aside className="student-drawer course-drawer" role="dialog" aria-modal="true" aria-labelledby="teacher-form-title">
          <div className="student-drawer-head"><span>{editingId === 'new' ? 'Tài khoản mới' : 'Cập nhật tài khoản'}</span><button type="button" onClick={closeForm} aria-label="Đóng biểu mẫu"><X aria-hidden="true" /></button></div>
          <div className="course-form-heading"><ChalkboardTeacher aria-hidden="true" weight="duotone" /><div><h2 id="teacher-form-title">{editingId === 'new' ? 'Thêm giáo viên' : 'Sửa giáo viên'}</h2><p>Tài khoản mới sẽ nhận thông tin đăng nhập qua email.</p></div></div>
          <form className="course-form" onSubmit={submitTeacher} noValidate><div className="course-form-grid">
            <label className="course-field-wide"><span>Họ và tên *</span><input value={form.name} onChange={(event) => updateForm('name', event.target.value)} aria-invalid={Boolean(errors.name)} />{errors.name && <small>{errors.name}</small>}</label>
            <label className="course-field-wide"><span>Email *</span><input type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} aria-invalid={Boolean(errors.email)} />{errors.email && <small>{errors.email}</small>}</label>
            <label><span>Số điện thoại *</span><input inputMode="numeric" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} />{errors.phone && <small>{errors.phone}</small>}</label>
            <label><span>Ngoại ngữ *</span><input value={form.language} onChange={(event) => updateForm('language', event.target.value)} aria-invalid={Boolean(errors.language)} />{errors.language && <small>{errors.language}</small>}</label>
            <label className="course-field-wide"><span>Chuyên môn *</span><input value={form.specialty} onChange={(event) => updateForm('specialty', event.target.value)} aria-invalid={Boolean(errors.specialty)} placeholder="VD: IELTS, giao tiếp, HSK..." />{errors.specialty && <small>{errors.specialty}</small>}</label>
          </div><div className="course-form-actions"><button type="button" onClick={closeForm}>Hủy</button><button type="submit">{editingId === 'new' ? 'Tạo tài khoản' : 'Cập nhật'}</button></div></form>
        </aside></>
      )}
    </AdminLayout>
  )
}

export default AdminTeachers
