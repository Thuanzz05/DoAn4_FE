import { type FormEvent, useMemo, useState } from 'react'
import {
  Books,
  CaretLeft,
  CaretRight,
  CurrencyCircleDollar,
  GlobeHemisphereWest,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
  UsersThree,
  X,
} from '@phosphor-icons/react'
import AdminLayout, { type AdminPage } from './AdminLayout'
import './AdminDashboard.css'
import './AdminStudents.css'
import './AdminCourses.css'

type CourseStatus = 'Đang mở' | 'Tạm ẩn'

type CourseRecord = {
  id: number
  code: string
  name: string
  language: string
  level: string
  sessions: number
  tuition: number
  linkedClasses: number
  status: CourseStatus
}

type CourseForm = {
  code: string
  name: string
  language: string
  level: string
  sessions: string
  tuition: string
  status: CourseStatus
}

type AdminCoursesProps = {
  onLogout: () => void
  onNavigate: (page: AdminPage) => void
  onNavigateHome: () => void
}

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

const emptyForm: CourseForm = {
  code: '',
  name: '',
  language: 'Tiếng Anh',
  level: '',
  sessions: '',
  tuition: '',
  status: 'Đang mở',
}

const pageSize = 5
const formatTuition = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

function AdminCourses({ onLogout, onNavigate, onNavigateHome }: AdminCoursesProps) {
  const [courses, setCourses] = useState(initialCourses)
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('Tất cả')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<CourseForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof CourseForm, string>>>({})
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const languages = useMemo(() => [...new Set(courses.map((course) => course.language))], [courses])
  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')
    return courses.filter((course) => {
      const matchesQuery = !normalizedQuery || [course.name, course.code, course.language, course.level]
        .some((value) => value.toLocaleLowerCase('vi').includes(normalizedQuery))
      return matchesQuery && (language === 'Tất cả' || course.language === language)
    })
  }, [courses, language, query])

  const pageCount = Math.max(1, Math.ceil(filteredCourses.length / pageSize))
  const visibleCourses = filteredCourses.slice((page - 1) * pageSize, page * pageSize)
  const activeClassCount = courses.reduce((total, course) => total + course.linkedClasses, 0)

  const openCreate = () => {
    setEditingId('new')
    setForm(emptyForm)
    setErrors({})
  }

  const openEdit = (course: CourseRecord) => {
    setEditingId(course.id)
    setForm({
      code: course.code,
      name: course.name,
      language: course.language,
      level: course.level,
      sessions: String(course.sessions),
      tuition: String(course.tuition),
      status: course.status,
    })
    setErrors({})
  }

  const closeForm = () => {
    setEditingId(null)
    setErrors({})
  }

  const updateForm = (field: keyof CourseForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submitCourse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = form.code.trim().toUpperCase()
    const sessions = Number(form.sessions)
    const tuition = Number(form.tuition)
    const nextErrors: Partial<Record<keyof CourseForm, string>> = {}

    if (!code) nextErrors.code = 'Vui lòng nhập mã khóa học.'
    else if (courses.some((course) => course.code.toUpperCase() === code && course.id !== editingId)) nextErrors.code = 'Mã khóa học đã tồn tại.'
    if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập tên khóa học.'
    if (!form.language.trim()) nextErrors.language = 'Vui lòng nhập ngoại ngữ.'
    if (!form.level.trim()) nextErrors.level = 'Vui lòng nhập trình độ.'
    if (!Number.isInteger(sessions) || sessions <= 0) nextErrors.sessions = 'Số buổi phải là số nguyên dương.'
    if (!Number.isFinite(tuition) || tuition <= 0) nextErrors.tuition = 'Học phí phải lớn hơn 0.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    if (editingId === 'new') {
      const nextCourse: CourseRecord = {
        id: Math.max(0, ...courses.map((course) => course.id)) + 1,
        code,
        name: form.name.trim(),
        language: form.language.trim(),
        level: form.level.trim(),
        sessions,
        tuition,
        linkedClasses: 0,
        status: form.status,
      }
      setCourses((current) => [nextCourse, ...current])
      setFeedback({ type: 'success', message: `Đã thêm khóa học ${nextCourse.name}.` })
    } else {
      setCourses((current) => current.map((course) => course.id === editingId
        ? { ...course, code, name: form.name.trim(), language: form.language.trim(), level: form.level.trim(), sessions, tuition, status: form.status }
        : course))
      setFeedback({ type: 'success', message: 'Thông tin khóa học đã được cập nhật.' })
    }

    setPage(1)
    closeForm()
  }

  const deleteCourse = (course: CourseRecord) => {
    if (course.linkedClasses > 0) {
      setFeedback({ type: 'error', message: `Không thể xóa ${course.name} vì đang có ${course.linkedClasses} lớp học liên kết.` })
      return
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khóa học "${course.name}"?`)) return
    setCourses((current) => current.filter((item) => item.id !== course.id))
    setPage(1)
    setFeedback({ type: 'success', message: `Đã xóa khóa học ${course.name}.` })
  }

  return (
    <AdminLayout activePage="courses" mainId="course-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <section className="students-heading" aria-labelledby="courses-title">
        <div>
          <span className="section-kicker">Danh mục đào tạo</span>
          <h1 id="courses-title">Quản lý khóa học</h1>
          <p>Quản lý chương trình, số buổi và mức học phí cho từng ngoại ngữ.</p>
        </div>
        <button className="course-add-button" type="button" onClick={openCreate}><Plus aria-hidden="true" weight="bold" />Thêm khóa học</button>
      </section>

      <section className="student-summary" aria-label="Tổng quan khóa học minh họa">
        <article><Books aria-hidden="true" weight="duotone" /><div><span>Tổng khóa học</span><strong>{String(courses.length).padStart(2, '0')}</strong><p>{courses.filter((course) => course.status === 'Đang mở').length} khóa đang mở đăng ký</p></div></article>
        <article><GlobeHemisphereWest aria-hidden="true" weight="duotone" /><div><span>Ngoại ngữ đào tạo</span><strong>{String(languages.length).padStart(2, '0')}</strong><p>Danh mục cho nhiều ngôn ngữ</p></div></article>
        <article><UsersThree aria-hidden="true" weight="duotone" /><div><span>Lớp đang liên kết</span><strong>{String(activeClassCount).padStart(2, '0')}</strong><p>Không thể xóa khóa học có lớp</p></div></article>
      </section>

      {feedback && (
        <div className={`course-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Đóng thông báo"><X aria-hidden="true" /></button>
        </div>
      )}

      <section className="students-panel" aria-labelledby="course-list-title">
        <div className="students-panel-head">
          <div><h2 id="course-list-title">Danh sách khóa học</h2><p>Dữ liệu mẫu được dùng cho xếp lớp và tính học phí.</p></div>
          <div className="student-filters">
            <label className="student-search">
              <span className="sr-only">Tìm kiếm khóa học</span>
              <MagnifyingGlass aria-hidden="true" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Tên, mã hoặc trình độ" />
            </label>
            <label>
              <span className="sr-only">Lọc theo ngoại ngữ</span>
              <select value={language} onChange={(event) => { setLanguage(event.target.value); setPage(1) }}>
                <option>Tất cả</option>
                {languages.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </div>

        <p className="student-result-count" aria-live="polite">Hiển thị {visibleCourses.length} trong {filteredCourses.length} khóa học</p>

        <div className="student-table-wrap">
          <table className="course-table">
            <thead><tr><th>Khóa học</th><th>Ngoại ngữ</th><th>Số buổi</th><th>Học phí</th><th>Lớp liên kết</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {visibleCourses.map((course) => (
                <tr key={course.id}>
                  <td><div className="student-identity"><span aria-hidden="true">{course.language.replace('Tiếng ', '').slice(0, 2).toUpperCase()}</span><div><strong>{course.name}</strong><small>{course.code}</small></div></div></td>
                  <td><strong>{course.language}</strong><br /><small>{course.level}</small></td>
                  <td>{course.sessions} buổi</td>
                  <td className="course-tuition">{formatTuition(course.tuition)}</td>
                  <td>{course.linkedClasses} lớp</td>
                  <td><span className={`student-status ${course.status === 'Đang mở' ? 'studying' : 'completed'}`}>{course.status}</span></td>
                  <td><div className="course-actions"><button type="button" onClick={() => openEdit(course)} aria-label={`Sửa ${course.name}`} title="Sửa"><PencilSimple aria-hidden="true" /></button><button className="is-danger" type="button" onClick={() => deleteCourse(course)} aria-label={`Xóa ${course.name}`} title="Xóa"><Trash aria-hidden="true" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCourses.length === 0 && <div className="student-empty"><MagnifyingGlass aria-hidden="true" /><strong>Không tìm thấy khóa học phù hợp</strong><p>Thử thay đổi từ khóa hoặc ngoại ngữ.</p></div>}
        </div>

        {filteredCourses.length > 0 && (
          <div className="course-pagination" aria-label="Phân trang khóa học">
            <span>Trang {page} / {pageCount}</span>
            <div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Trang trước"><CaretLeft aria-hidden="true" /></button><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} aria-label="Trang sau"><CaretRight aria-hidden="true" /></button></div>
          </div>
        )}
      </section>

      {editingId !== null && (
        <>
          <button className="student-drawer-backdrop" type="button" onClick={closeForm} aria-label="Đóng biểu mẫu khóa học" />
          <aside className="student-drawer course-drawer" role="dialog" aria-modal="true" aria-labelledby="course-form-title">
            <div className="student-drawer-head"><span>{editingId === 'new' ? 'Danh mục mới' : 'Cập nhật danh mục'}</span><button type="button" onClick={closeForm} aria-label="Đóng biểu mẫu"><X aria-hidden="true" /></button></div>
            <div className="course-form-heading"><Books aria-hidden="true" weight="duotone" /><div><h2 id="course-form-title">{editingId === 'new' ? 'Thêm khóa học' : 'Sửa khóa học'}</h2><p>Thông tin này được dùng khi mở lớp và tạo hóa đơn.</p></div></div>
            <form className="course-form" onSubmit={submitCourse} noValidate>
              <div className="course-form-grid">
                <label><span>Mã khóa học *</span><input value={form.code} onChange={(event) => updateForm('code', event.target.value)} aria-invalid={Boolean(errors.code)} placeholder="VD: EN-A2-01" />{errors.code && <small>{errors.code}</small>}</label>
                <label><span>Ngoại ngữ *</span><input value={form.language} onChange={(event) => updateForm('language', event.target.value)} aria-invalid={Boolean(errors.language)} />{errors.language && <small>{errors.language}</small>}</label>
                <label className="course-field-wide"><span>Tên khóa học *</span><input value={form.name} onChange={(event) => updateForm('name', event.target.value)} aria-invalid={Boolean(errors.name)} placeholder="Tên chương trình đào tạo" />{errors.name && <small>{errors.name}</small>}</label>
                <label><span>Trình độ *</span><input value={form.level} onChange={(event) => updateForm('level', event.target.value)} aria-invalid={Boolean(errors.level)} placeholder="A1, HSK 3, N5..." />{errors.level && <small>{errors.level}</small>}</label>
                <label><span>Số buổi *</span><input type="number" min="1" step="1" value={form.sessions} onChange={(event) => updateForm('sessions', event.target.value)} aria-invalid={Boolean(errors.sessions)} />{errors.sessions && <small>{errors.sessions}</small>}</label>
                <label className="course-field-wide"><span>Học phí (VNĐ) *</span><div className="course-money-input"><CurrencyCircleDollar aria-hidden="true" /><input type="number" min="1" step="1000" value={form.tuition} onChange={(event) => updateForm('tuition', event.target.value)} aria-invalid={Boolean(errors.tuition)} /></div>{errors.tuition && <small>{errors.tuition}</small>}</label>
                <label className="course-field-wide"><span>Trạng thái</span><select value={form.status} onChange={(event) => updateForm('status', event.target.value as CourseStatus)}><option>Đang mở</option><option>Tạm ẩn</option></select></label>
              </div>
              <div className="course-form-actions"><button type="button" onClick={closeForm}>Hủy</button><button type="submit">{editingId === 'new' ? 'Lưu khóa học' : 'Cập nhật'}</button></div>
            </form>
          </aside>
        </>
      )}
    </AdminLayout>
  )
}

export default AdminCourses
