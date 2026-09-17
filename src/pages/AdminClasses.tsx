import { useMemo, useState } from 'react'
import {
  CalendarBlank,
  CaretRight,
  ChalkboardTeacher,
  Clock,
  MagnifyingGlass,
  MapPin,
  Student,
  UsersThree,
  X,
} from '@phosphor-icons/react'
import AdminLayout from './AdminLayout'
import './AdminDashboard.css'
import './AdminStudents.css'

type ClassStatus = 'Đang học' | 'Sắp khai giảng' | 'Đã kết thúc'

type ClassRecord = {
  code: string
  name: string
  teacher: string
  schedule: string
  room: string
  students: string
  status: ClassStatus
  progress: string
}

type AdminClassesProps = {
  onLogout: () => void
  onNavigate: (page: 'admin' | 'students' | 'classes') => void
  onNavigateHome: () => void
}

const classes: ClassRecord[] = [
  { code: 'A2-GT-09', name: 'A2 Giao tiếp', teacher: 'Nguyễn Quốc Minh', schedule: 'T2, T4, T6 · 18:00', room: 'P.201', students: '18/20', status: 'Đang học', progress: '62%' },
  { code: 'B1-TQ-06', name: 'B1 Tổng quát', teacher: 'Trần Ngọc Lan', schedule: 'T3, T5 · 18:30', room: 'P.105', students: '16/18', status: 'Đang học', progress: '48%' },
  { code: 'IELTS-12', name: 'IELTS 6.5', teacher: 'Lê Gia Hùng', schedule: 'T2, T5, T7 · 19:00', room: 'P.302', students: '14/16', status: 'Đang học', progress: '71%' },
  { code: 'A1-CB-14', name: 'A1 Căn bản', teacher: 'Phạm Thu Hà', schedule: 'T3, T6 · 17:30', room: 'P.103', students: '12/20', status: 'Sắp khai giảng', progress: '0%' },
  { code: 'TOEIC-08', name: 'TOEIC 650+', teacher: 'Võ Minh Khang', schedule: 'T4, T7 · 18:00', room: 'P.204', students: '19/20', status: 'Đang học', progress: '35%' },
  { code: 'B2-TQ-03', name: 'B2 Tổng quát', teacher: 'Đặng Mỹ Linh', schedule: 'T2, T4 · 19:30', room: 'P.301', students: '15/18', status: 'Đã kết thúc', progress: '100%' },
]

const summary = [
  { label: 'Lớp hoạt động', value: '18', detail: '7 lớp có lịch hôm nay', icon: UsersThree },
  { label: 'Học viên đã xếp lớp', value: '214', detail: 'Trung bình 16 học viên mỗi lớp', icon: Student },
  { label: 'Phòng đang sử dụng', value: '08', detail: '2 phòng còn trống tối nay', icon: MapPin },
] as const

function AdminClasses({ onLogout, onNavigate, onNavigateHome }: AdminClassesProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | ClassStatus>('Tất cả')
  const [selectedClass, setSelectedClass] = useState<ClassRecord | null>(null)

  const filteredClasses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')
    return classes.filter((classRecord) => {
      const matchesQuery = !normalizedQuery || [classRecord.name, classRecord.code, classRecord.teacher]
        .some((value) => value.toLocaleLowerCase('vi').includes(normalizedQuery))
      return matchesQuery && (status === 'Tất cả' || classRecord.status === status)
    })
  }, [query, status])

  return (
    <AdminLayout activePage="classes" mainId="class-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <section className="students-heading" aria-labelledby="classes-title">
        <div>
          <span className="section-kicker">Tổ chức đào tạo</span>
          <h1 id="classes-title">Quản lý lớp học</h1>
          <p>Theo dõi sĩ số, lịch học, phòng học và tiến độ từng lớp.</p>
        </div>
        <span className="students-data-note">Dữ liệu minh họa</span>
      </section>

      <section className="student-summary" aria-label="Tổng quan lớp học minh họa">
        {summary.map((item) => {
          const Icon = item.icon
          return <article key={item.label}><Icon aria-hidden="true" weight="duotone" /><div><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></div></article>
        })}
      </section>

      <section className="students-panel" aria-labelledby="class-list-title">
        <div className="students-panel-head">
          <div><h2 id="class-list-title">Danh sách lớp học</h2><p>Sáu lớp gần nhất trong dữ liệu mẫu.</p></div>
          <div className="student-filters">
            <label className="student-search">
              <span className="sr-only">Tìm kiếm lớp học</span>
              <MagnifyingGlass aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã hoặc giáo viên" />
            </label>
            <label>
              <span className="sr-only">Lọc theo trạng thái</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as 'Tất cả' | ClassStatus)}>
                <option>Tất cả</option>
                <option>Đang học</option>
                <option>Sắp khai giảng</option>
                <option>Đã kết thúc</option>
              </select>
            </label>
          </div>
        </div>

        <p className="student-result-count" aria-live="polite">Hiển thị {filteredClasses.length} lớp học</p>

        <div className="student-table-wrap">
          <table>
            <thead><tr><th>Lớp học</th><th>Giáo viên</th><th>Lịch và phòng</th><th>Sĩ số</th><th>Tiến độ</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {filteredClasses.map((classRecord) => (
                <tr key={classRecord.code}>
                  <td><div className="student-identity"><span aria-hidden="true">{classRecord.name.slice(0, 2).toUpperCase()}</span><div><strong>{classRecord.name}</strong><small>{classRecord.code}</small></div></div></td>
                  <td>{classRecord.teacher}</td>
                  <td><strong>{classRecord.schedule}</strong><br /><small>{classRecord.room}</small></td>
                  <td>{classRecord.students}</td>
                  <td>{classRecord.progress}</td>
                  <td><span className={`student-status ${classRecord.status === 'Đang học' ? 'studying' : classRecord.status === 'Sắp khai giảng' ? 'paused' : 'completed'}`}>{classRecord.status}</span></td>
                  <td><button type="button" onClick={() => setSelectedClass(classRecord)} aria-label={`Xem lớp ${classRecord.name}`}><CaretRight aria-hidden="true" weight="bold" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredClasses.length === 0 && <div className="student-empty"><MagnifyingGlass aria-hidden="true" /><strong>Không tìm thấy lớp phù hợp</strong><p>Thử thay đổi từ khóa hoặc trạng thái lọc.</p></div>}
        </div>
      </section>

      {selectedClass && (
        <>
          <button className="student-drawer-backdrop" type="button" onClick={() => setSelectedClass(null)} aria-label="Đóng thông tin lớp học" />
          <aside className="student-drawer" role="dialog" aria-modal="true" aria-labelledby="class-drawer-title">
            <div className="student-drawer-head"><span>Lớp học minh họa</span><button type="button" onClick={() => setSelectedClass(null)} aria-label="Đóng thông tin lớp"><X aria-hidden="true" /></button></div>
            <div className="student-drawer-profile">
              <span aria-hidden="true">{selectedClass.name.slice(0, 2).toUpperCase()}</span>
              <div><h2 id="class-drawer-title">{selectedClass.name}</h2><p>{selectedClass.code}</p></div>
            </div>
            <dl className="student-details">
              <div><dt><ChalkboardTeacher aria-hidden="true" />Giáo viên</dt><dd>{selectedClass.teacher}</dd></div>
              <div><dt><CalendarBlank aria-hidden="true" />Lịch học</dt><dd>{selectedClass.schedule}</dd></div>
              <div><dt><MapPin aria-hidden="true" />Phòng học</dt><dd>{selectedClass.room}</dd></div>
              <div><dt><Student aria-hidden="true" />Sĩ số</dt><dd>{selectedClass.students} học viên</dd></div>
              <div><dt><Clock aria-hidden="true" />Tiến độ</dt><dd>{selectedClass.progress}</dd></div>
            </dl>
            <div className="student-drawer-status"><UsersThree aria-hidden="true" weight="fill" /><div><span>Trạng thái lớp</span><strong>{selectedClass.status}</strong></div></div>
          </aside>
        </>
      )}
    </AdminLayout>
  )
}

export default AdminClasses
