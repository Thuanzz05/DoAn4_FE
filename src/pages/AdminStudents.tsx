import { useMemo, useState } from 'react'
import {
  CalendarBlank,
  CaretRight,
  CheckCircle,
  ClockCountdown,
  EnvelopeSimple,
  IdentificationCard,
  MagnifyingGlass,
  Phone,
  Receipt,
  Student,
  UsersThree,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import AdminLayout, { type AdminPage } from './AdminLayout'
import './AdminDashboard.css'
import './AdminStudents.css'

type StudentStatus = 'Đang học' | 'Bảo lưu' | 'Hoàn thành'

type StudentRecord = {
  name: string
  code: string
  email: string
  phone: string
  className: string
  status: StudentStatus
  attendance: string
  debt: string
  joined: string
}

type AdminStudentsProps = {
  onLogout: () => void
  onNavigate: (page: AdminPage) => void
  onNavigateHome: () => void
}

const students: StudentRecord[] = [
  { name: 'Nguyễn Khánh Linh', code: 'HV-0248', email: 'linh.nguyen@example.com', phone: '090 312 4586', className: 'A2 Giao tiếp', status: 'Đang học', attendance: '82%', debt: '2.400.000đ', joined: '12/08/2026' },
  { name: 'Trần Gia Huy', code: 'HV-0217', email: 'huy.tran@example.com', phone: '091 572 9034', className: 'B1 Tổng quát', status: 'Đang học', attendance: '94%', debt: 'Đã hoàn tất', joined: '02/07/2026' },
  { name: 'Lê Minh Anh', code: 'HV-0196', email: 'anh.le@example.com', phone: '098 441 2367', className: 'IELTS 6.5', status: 'Bảo lưu', attendance: '76%', debt: '2.400.000đ', joined: '18/05/2026' },
  { name: 'Phạm Quang Duy', code: 'HV-0173', email: 'duy.pham@example.com', phone: '093 628 1975', className: 'A2 Giao tiếp', status: 'Đang học', attendance: '88%', debt: 'Đã hoàn tất', joined: '22/04/2026' },
  { name: 'Võ Hoàng Nam', code: 'HV-0151', email: 'nam.vo@example.com', phone: '097 805 3321', className: 'B1 Tổng quát', status: 'Hoàn thành', attendance: '91%', debt: 'Đã hoàn tất', joined: '10/02/2026' },
  { name: 'Đặng Thu Trang', code: 'HV-0138', email: 'trang.dang@example.com', phone: '096 214 8703', className: 'IELTS 6.5', status: 'Đang học', attendance: '86%', debt: '1.200.000đ', joined: '05/01/2026' },
  { name: 'Bùi Đức Anh', code: 'HV-0119', email: 'anh.bui@example.com', phone: '092 703 1864', className: 'A2 Giao tiếp', status: 'Bảo lưu', attendance: '69%', debt: 'Đã hoàn tất', joined: '16/11/2025' },
  { name: 'Đỗ Hà My', code: 'HV-0097', email: 'my.do@example.com', phone: '094 861 2405', className: 'B1 Tổng quát', status: 'Hoàn thành', attendance: '96%', debt: 'Đã hoàn tất', joined: '28/09/2025' },
]

const summary = [
  { label: 'Tổng hồ sơ', value: '248', detail: '12 hồ sơ mới trong tháng', icon: Student },
  { label: 'Đang theo học', value: '214', detail: 'Thuộc 18 lớp hoạt động', icon: UsersThree },
  { label: 'Cần bổ sung', value: '09', detail: 'Thiếu thông tin hoặc học phí', icon: WarningCircle },
] as const

function AdminStudents({ onLogout, onNavigate, onNavigateHome }: AdminStudentsProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | StudentStatus>('Tất cả')
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null)

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')
    return students.filter((studentRecord) => {
      const matchesQuery = !normalizedQuery || [studentRecord.name, studentRecord.code, studentRecord.className]
        .some((value) => value.toLocaleLowerCase('vi').includes(normalizedQuery))
      const matchesStatus = status === 'Tất cả' || studentRecord.status === status
      return matchesQuery && matchesStatus
    })
  }, [query, status])

  return (
    <AdminLayout activePage="students" mainId="student-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <section className="students-heading" aria-labelledby="students-title">
        <div>
          <span className="section-kicker">Hồ sơ học viên</span>
          <h1 id="students-title">Quản lý học viên</h1>
          <p>Tra cứu hồ sơ, lớp đang học và các trạng thái cần theo dõi.</p>
        </div>
        <span className="students-data-note">Dữ liệu minh họa</span>
      </section>

      <section className="student-summary" aria-label="Tổng quan học viên minh họa">
        {summary.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label}>
              <Icon aria-hidden="true" weight="duotone" />
              <div><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></div>
            </article>
          )
        })}
      </section>

      <section className="students-panel" aria-labelledby="student-list-title">
        <div className="students-panel-head">
          <div><h2 id="student-list-title">Danh sách học viên</h2><p>Tám hồ sơ gần nhất trong dữ liệu mẫu.</p></div>
          <div className="student-filters">
            <label className="student-search">
              <span className="sr-only">Tìm kiếm học viên</span>
              <MagnifyingGlass aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã hoặc lớp" />
            </label>
            <label>
              <span className="sr-only">Lọc theo trạng thái</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as 'Tất cả' | StudentStatus)}>
                <option>Tất cả</option>
                <option>Đang học</option>
                <option>Bảo lưu</option>
                <option>Hoàn thành</option>
              </select>
            </label>
          </div>
        </div>

        <p className="student-result-count" aria-live="polite">Hiển thị {filteredStudents.length} hồ sơ</p>

        <div className="student-table-wrap">
          <table>
            <thead><tr><th>Học viên</th><th>Lớp hiện tại</th><th>Chuyên cần</th><th>Học phí</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {filteredStudents.map((studentRecord) => (
                <tr key={studentRecord.code}>
                  <td><div className="student-identity"><span aria-hidden="true">{studentRecord.name.split(' ').slice(-2).map((part) => part[0]).join('')}</span><div><strong>{studentRecord.name}</strong><small>{studentRecord.code}</small></div></div></td>
                  <td>{studentRecord.className}</td>
                  <td>{studentRecord.attendance}</td>
                  <td className={studentRecord.debt === 'Đã hoàn tất' ? 'fee-paid' : 'fee-due'}>{studentRecord.debt}</td>
                  <td><span className={`student-status ${studentRecord.status === 'Đang học' ? 'studying' : studentRecord.status === 'Bảo lưu' ? 'paused' : 'completed'}`}>{studentRecord.status}</span></td>
                  <td><button type="button" onClick={() => setSelectedStudent(studentRecord)} aria-label={`Xem hồ sơ ${studentRecord.name}`}><CaretRight aria-hidden="true" weight="bold" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && <div className="student-empty"><MagnifyingGlass aria-hidden="true" /><strong>Không tìm thấy hồ sơ phù hợp</strong><p>Thử thay đổi từ khóa hoặc trạng thái lọc.</p></div>}
        </div>
      </section>

      {selectedStudent && (
        <>
          <button className="student-drawer-backdrop" type="button" onClick={() => setSelectedStudent(null)} aria-label="Đóng hồ sơ học viên" />
          <aside className="student-drawer" role="dialog" aria-modal="true" aria-labelledby="student-drawer-title">
            <div className="student-drawer-head">
              <span>Hồ sơ minh họa</span>
              <button type="button" onClick={() => setSelectedStudent(null)} aria-label="Đóng hồ sơ"><X aria-hidden="true" /></button>
            </div>
            <div className="student-drawer-profile">
              <span aria-hidden="true">{selectedStudent.name.split(' ').slice(-2).map((part) => part[0]).join('')}</span>
              <div><h2 id="student-drawer-title">{selectedStudent.name}</h2><p>{selectedStudent.code}</p></div>
            </div>
            <dl className="student-details">
              <div><dt><EnvelopeSimple aria-hidden="true" />Email</dt><dd>{selectedStudent.email}</dd></div>
              <div><dt><Phone aria-hidden="true" />Điện thoại</dt><dd>{selectedStudent.phone}</dd></div>
              <div><dt><IdentificationCard aria-hidden="true" />Lớp hiện tại</dt><dd>{selectedStudent.className}</dd></div>
              <div><dt><CalendarBlank aria-hidden="true" />Ngày ghi danh</dt><dd>{selectedStudent.joined}</dd></div>
              <div><dt><ClockCountdown aria-hidden="true" />Chuyên cần</dt><dd>{selectedStudent.attendance}</dd></div>
              <div><dt><Receipt aria-hidden="true" />Học phí</dt><dd>{selectedStudent.debt}</dd></div>
            </dl>
            <div className="student-drawer-status">
              {selectedStudent.status === 'Đang học' ? <CheckCircle aria-hidden="true" weight="fill" /> : <ClockCountdown aria-hidden="true" weight="fill" />}
              <div><span>Trạng thái hồ sơ</span><strong>{selectedStudent.status}</strong></div>
            </div>
          </aside>
        </>
      )}
    </AdminLayout>
  )
}

export default AdminStudents
