import { type FormEvent, useMemo, useState } from 'react'
import {
  CalendarBlank,
  ChalkboardTeacher,
  Clock,
  MagnifyingGlass,
  MapPin,
  PencilSimple,
  Plus,
  ShieldCheck,
  X,
} from '@phosphor-icons/react'
import AdminLayout, { type AdminPage } from './AdminLayout'
import './AdminDashboard.css'
import './AdminStudents.css'
import './AdminCourses.css'
import './AdminSchedule.css'

type DayName = 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7'

type ScheduleRecord = {
  id: number
  className: string
  course: string
  language: string
  teacher: string
  room: string
  day: DayName
  start: string
  end: string
  students: number
}

type ScheduleForm = Pick<ScheduleRecord, 'className' | 'teacher' | 'room' | 'day' | 'start' | 'end'>

type AdminScheduleProps = {
  onLogout: () => void
  onNavigate: (page: AdminPage) => void
  onNavigateHome: () => void
}

const classes = [
  { name: 'A2 Giao tiếp', course: 'Tiếng Anh A2', language: 'Tiếng Anh', students: 18 },
  { name: 'B1 Tổng quát', course: 'Tiếng Anh B1', language: 'Tiếng Anh', students: 16 },
  { name: 'IELTS 6.5', course: 'Luyện thi IELTS 6.5', language: 'Tiếng Anh', students: 14 },
  { name: 'TOPIK I - K05', course: 'Tiếng Hàn TOPIK I', language: 'Tiếng Hàn', students: 15 },
  { name: 'HSK 3 - T04', course: 'Tiếng Trung HSK 3', language: 'Tiếng Trung', students: 17 },
  { name: 'JLPT N5 - N03', course: 'Tiếng Nhật JLPT N5', language: 'Tiếng Nhật', students: 13 },
] as const

const teachers = ['Nguyễn Quốc Minh', 'Trần Ngọc Lan', 'Lê Gia Hùng', 'Kim Anh Thư', 'Lương Hải Yến', 'Phạm Mai Chi']
const rooms = ['P.103', 'P.105', 'P.201', 'P.204', 'P.301', 'P.302']
const days: DayName[] = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

const initialSchedules: ScheduleRecord[] = [
  { id: 1, className: 'A2 Giao tiếp', course: 'Tiếng Anh A2', language: 'Tiếng Anh', teacher: 'Nguyễn Quốc Minh', room: 'P.201', day: 'Thứ 2', start: '18:00', end: '19:30', students: 18 },
  { id: 2, className: 'HSK 3 - T04', course: 'Tiếng Trung HSK 3', language: 'Tiếng Trung', teacher: 'Lương Hải Yến', room: 'P.201', day: 'Thứ 2', start: '19:30', end: '21:00', students: 17 },
  { id: 3, className: 'B1 Tổng quát', course: 'Tiếng Anh B1', language: 'Tiếng Anh', teacher: 'Trần Ngọc Lan', room: 'P.105', day: 'Thứ 3', start: '18:30', end: '20:00', students: 16 },
  { id: 4, className: 'TOPIK I - K05', course: 'Tiếng Hàn TOPIK I', language: 'Tiếng Hàn', teacher: 'Kim Anh Thư', room: 'P.204', day: 'Thứ 3', start: '18:30', end: '20:00', students: 15 },
  { id: 5, className: 'IELTS 6.5', course: 'Luyện thi IELTS 6.5', language: 'Tiếng Anh', teacher: 'Lê Gia Hùng', room: 'P.302', day: 'Thứ 4', start: '19:00', end: '20:30', students: 14 },
  { id: 6, className: 'JLPT N5 - N03', course: 'Tiếng Nhật JLPT N5', language: 'Tiếng Nhật', teacher: 'Phạm Mai Chi', room: 'P.301', day: 'Thứ 4', start: '18:00', end: '19:30', students: 13 },
  { id: 7, className: 'B1 Tổng quát', course: 'Tiếng Anh B1', language: 'Tiếng Anh', teacher: 'Trần Ngọc Lan', room: 'P.105', day: 'Thứ 5', start: '18:30', end: '20:00', students: 16 },
  { id: 8, className: 'A2 Giao tiếp', course: 'Tiếng Anh A2', language: 'Tiếng Anh', teacher: 'Nguyễn Quốc Minh', room: 'P.201', day: 'Thứ 6', start: '18:00', end: '19:30', students: 18 },
]

const emptyForm: ScheduleForm = { className: classes[0].name, teacher: teachers[0], room: rooms[0], day: 'Thứ 2', start: '18:00', end: '19:30' }

const findConflict = (items: ScheduleRecord[], candidate: ScheduleForm, editingId: number | 'new') => items.find((item) => (
  item.id !== editingId
  && item.day === candidate.day
  && candidate.start < item.end
  && item.start < candidate.end
  && (item.room === candidate.room || item.teacher === candidate.teacher)
))

function AdminSchedule({ onLogout, onNavigate, onNavigateHome }: AdminScheduleProps) {
  const [schedules, setSchedules] = useState(initialSchedules)
  const [query, setQuery] = useState('')
  const [day, setDay] = useState<'Tất cả' | DayName>('Tất cả')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<ScheduleForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof ScheduleForm, string>>>({})
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const filteredSchedules = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')
    return schedules.filter((item) => {
      const matchesQuery = !normalizedQuery || [item.className, item.course, item.teacher, item.room, item.language]
        .some((value) => value.toLocaleLowerCase('vi').includes(normalizedQuery))
      return matchesQuery && (day === 'Tất cả' || item.day === day)
    })
  }, [day, query, schedules])

  const openCreate = () => {
    setEditingId('new')
    setForm(emptyForm)
    setErrors({})
  }

  const openEdit = (item: ScheduleRecord) => {
    setEditingId(item.id)
    setForm({ className: item.className, teacher: item.teacher, room: item.room, day: item.day, start: item.start, end: item.end })
    setErrors({})
  }

  const closeForm = () => {
    setEditingId(null)
    setErrors({})
  }

  const updateForm = (field: keyof ScheduleForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submitSchedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editingId === null) return
    const nextErrors: Partial<Record<keyof ScheduleForm, string>> = {}
    if (!form.className) nextErrors.className = 'Vui lòng chọn lớp học.'
    if (!form.teacher) nextErrors.teacher = 'Vui lòng chọn giáo viên.'
    if (!form.room) nextErrors.room = 'Vui lòng chọn phòng học.'
    if (!form.start) nextErrors.start = 'Vui lòng chọn giờ bắt đầu.'
    if (!form.end || form.end <= form.start) nextErrors.end = 'Giờ kết thúc phải sau giờ bắt đầu.'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const conflict = findConflict(schedules, form, editingId)
    if (conflict) {
      const resources = [conflict.room === form.room ? `phòng ${form.room}` : '', conflict.teacher === form.teacher ? `giáo viên ${form.teacher}` : ''].filter(Boolean).join(' và ')
      setFeedback({ type: 'error', message: `Trùng lịch: ${resources} đã được xếp cho lớp ${conflict.className} vào ${conflict.start}-${conflict.end}.` })
      return
    }

    const classInfo = classes.find((item) => item.name === form.className) ?? classes[0]
    if (editingId === 'new') {
      const nextItem: ScheduleRecord = { id: Math.max(0, ...schedules.map((item) => item.id)) + 1, ...form, course: classInfo.course, language: classInfo.language, students: classInfo.students }
      setSchedules((current) => [...current, nextItem])
      setFeedback({ type: 'success', message: `Đã xếp lịch cho lớp ${nextItem.className}.` })
    } else {
      setSchedules((current) => current.map((item) => item.id === editingId ? { ...item, ...form, course: classInfo.course, language: classInfo.language, students: classInfo.students } : item))
      setFeedback({ type: 'success', message: `Lịch lớp ${form.className} đã được cập nhật.` })
    }
    closeForm()
  }

  const usedRooms = new Set(schedules.map((item) => item.room)).size
  const assignedTeachers = new Set(schedules.map((item) => item.teacher)).size

  return (
    <AdminLayout activePage="schedule" mainId="schedule-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <section className="students-heading" aria-labelledby="schedule-title">
        <div><span className="section-kicker">Điều phối đào tạo</span><h1 id="schedule-title">Xếp lịch giảng dạy</h1><p>Phân công giáo viên, phòng học và kiểm tra xung đột trước khi lưu.</p></div>
        <button className="course-add-button" type="button" onClick={openCreate}><Plus aria-hidden="true" weight="bold" />Xếp lịch mới</button>
      </section>

      <section className="student-summary" aria-label="Tổng quan lịch học minh họa">
        <article><CalendarBlank aria-hidden="true" weight="duotone" /><div><span>Buổi học trong tuần</span><strong>{String(schedules.length).padStart(2, '0')}</strong><p>Lịch đã xác nhận và sẵn sàng tra cứu</p></div></article>
        <article><ChalkboardTeacher aria-hidden="true" weight="duotone" /><div><span>Giáo viên đã phân công</span><strong>{String(assignedTeachers).padStart(2, '0')}</strong><p>Không có khung giờ bị trùng</p></div></article>
        <article><MapPin aria-hidden="true" weight="duotone" /><div><span>Phòng đang sử dụng</span><strong>{String(usedRooms).padStart(2, '0')}</strong><p>Kiểm tra trước mỗi lần cập nhật</p></div></article>
      </section>

      <aside className="schedule-guard" aria-label="Quy tắc kiểm tra lịch"><ShieldCheck aria-hidden="true" weight="fill" /><div><strong>Kiểm tra xung đột đang bật</strong><p>Một giáo viên hoặc phòng học không thể xuất hiện ở hai lớp trong cùng khung giờ.</p></div></aside>

      {feedback && <div className={`course-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}><span>{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Đóng thông báo"><X aria-hidden="true" /></button></div>}

      <section className="students-panel" aria-labelledby="schedule-list-title">
        <div className="students-panel-head"><div><h2 id="schedule-list-title">Lịch học trong tuần</h2><p>Dữ liệu mẫu của các lớp đang hoạt động.</p></div><div className="student-filters"><label className="student-search"><span className="sr-only">Tìm kiếm lịch học</span><MagnifyingGlass aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Lớp, giáo viên hoặc phòng" /></label><label><span className="sr-only">Lọc theo ngày</span><select value={day} onChange={(event) => setDay(event.target.value as 'Tất cả' | DayName)}><option>Tất cả</option>{days.map((item) => <option key={item}>{item}</option>)}</select></label></div></div>
        <p className="student-result-count" aria-live="polite">Hiển thị {filteredSchedules.length} lịch học</p>
        <div className="student-table-wrap"><table className="schedule-table"><thead><tr><th>Lớp học</th><th>Thời gian</th><th>Giáo viên</th><th>Phòng</th><th>Sĩ số</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{filteredSchedules.map((item) => <tr key={item.id}><td><div className="student-identity"><span aria-hidden="true">{item.language.replace('Tiếng ', '').slice(0, 2).toUpperCase()}</span><div><strong>{item.className}</strong><small>{item.course}</small></div></div></td><td><strong>{item.day}</strong><br /><small>{item.start}-{item.end}</small></td><td>{item.teacher}</td><td>{item.room}</td><td>{item.students} học viên</td><td><button type="button" onClick={() => openEdit(item)} aria-label={`Sửa lịch lớp ${item.className}`} title="Sửa lịch"><PencilSimple aria-hidden="true" /></button></td></tr>)}</tbody></table>{filteredSchedules.length === 0 && <div className="student-empty"><MagnifyingGlass aria-hidden="true" /><strong>Không tìm thấy lịch phù hợp</strong><p>Thử thay đổi từ khóa hoặc ngày học.</p></div>}</div>
      </section>

      {editingId !== null && <><button className="student-drawer-backdrop" type="button" onClick={closeForm} aria-label="Đóng biểu mẫu xếp lịch" /><aside className="student-drawer course-drawer" role="dialog" aria-modal="true" aria-labelledby="schedule-form-title"><div className="student-drawer-head"><span>{editingId === 'new' ? 'Lịch học mới' : 'Cập nhật lịch học'}</span><button type="button" onClick={closeForm} aria-label="Đóng biểu mẫu"><X aria-hidden="true" /></button></div><div className="course-form-heading"><CalendarBlank aria-hidden="true" weight="duotone" /><div><h2 id="schedule-form-title">{editingId === 'new' ? 'Xếp lịch mới' : 'Sửa lịch học'}</h2><p>Hệ thống kiểm tra trùng giáo viên và phòng khi lưu.</p></div></div><form className="course-form" onSubmit={submitSchedule} noValidate><div className="course-form-grid">
        <label className="course-field-wide"><span>Lớp học *</span><select value={form.className} onChange={(event) => updateForm('className', event.target.value)}>{classes.map((item) => <option key={item.name}>{item.name}</option>)}</select>{errors.className && <small>{errors.className}</small>}</label>
        <label className="course-field-wide"><span>Giáo viên *</span><select value={form.teacher} onChange={(event) => updateForm('teacher', event.target.value)}>{teachers.map((item) => <option key={item}>{item}</option>)}</select>{errors.teacher && <small>{errors.teacher}</small>}</label>
        <label><span>Phòng học *</span><select value={form.room} onChange={(event) => updateForm('room', event.target.value)}>{rooms.map((item) => <option key={item}>{item}</option>)}</select>{errors.room && <small>{errors.room}</small>}</label>
        <label><span>Ngày học *</span><select value={form.day} onChange={(event) => updateForm('day', event.target.value as DayName)}>{days.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Giờ bắt đầu *</span><div className="schedule-time-input"><Clock aria-hidden="true" /><input type="time" value={form.start} onChange={(event) => updateForm('start', event.target.value)} aria-invalid={Boolean(errors.start)} /></div>{errors.start && <small>{errors.start}</small>}</label>
        <label><span>Giờ kết thúc *</span><div className="schedule-time-input"><Clock aria-hidden="true" /><input type="time" value={form.end} onChange={(event) => updateForm('end', event.target.value)} aria-invalid={Boolean(errors.end)} /></div>{errors.end && <small>{errors.end}</small>}</label>
      </div><div className="course-form-actions"><button type="button" onClick={closeForm}>Hủy</button><button type="submit">{editingId === 'new' ? 'Lưu lịch' : 'Cập nhật'}</button></div></form></aside></>}
    </AdminLayout>
  )
}

export default AdminSchedule
