import { useMemo, useState } from 'react'
import {
  CaretRight,
  Certificate,
  CheckCircle,
  ClockCountdown,
  DownloadSimple,
  FilePdf,
  GraduationCap,
  MagnifyingGlass,
  Receipt,
  ShieldCheck,
  Student,
  X,
  XCircle,
} from '@phosphor-icons/react'
import AdminLayout, { type AdminPage } from './AdminLayout'
import './AdminDashboard.css'
import './AdminStudents.css'
import './AdminCourses.css'
import './AdminCertificates.css'

type CertificateStatus = 'Chờ xét' | 'Đã xác nhận' | 'Đã cấp'
type CertificateFilter = 'Tất cả' | 'Đủ điều kiện' | 'Không đủ điều kiện' | 'Đã cấp'

type Candidate = {
  id: number
  studentCode: string
  studentName: string
  className: string
  course: string
  language: string
  attendance: number
  average: number
  paid: boolean
  status: CertificateStatus
  certificateCode?: string
  issuedAt?: string
}

type AdminCertificatesProps = {
  onLogout: () => void
  onNavigate: (page: AdminPage) => void
  onNavigateHome: () => void
}

const initialCandidates: Candidate[] = [
  { id: 1, studentCode: 'HV-0248', studentName: 'Nguyễn Khánh Linh', className: 'A2 Giao tiếp', course: 'Tiếng Anh A2', language: 'Tiếng Anh', attendance: 82, average: 7.6, paid: true, status: 'Chờ xét' },
  { id: 2, studentCode: 'HV-0217', studentName: 'Trần Gia Huy', className: 'B1 Tổng quát', course: 'Tiếng Anh B1', language: 'Tiếng Anh', attendance: 91, average: 8.2, paid: true, status: 'Đã xác nhận' },
  { id: 3, studentCode: 'HV-0196', studentName: 'Lê Minh Anh', className: 'IELTS 6.5', course: 'Luyện thi IELTS 6.5', language: 'Tiếng Anh', attendance: 76, average: 6.8, paid: false, status: 'Chờ xét' },
  { id: 4, studentCode: 'HV-0173', studentName: 'Phạm Quang Duy', className: 'A2 Giao tiếp', course: 'Tiếng Anh A2', language: 'Tiếng Anh', attendance: 69, average: 4.7, paid: true, status: 'Chờ xét' },
  { id: 5, studentCode: 'HV-0151', studentName: 'Võ Hoàng Nam', className: 'TOPIK I - K05', course: 'Tiếng Hàn TOPIK I', language: 'Tiếng Hàn', attendance: 88, average: 7.9, paid: true, status: 'Đã cấp', certificateCode: 'CC-2026-018', issuedAt: '2026-09-12' },
  { id: 6, studentCode: 'HV-0138', studentName: 'Đặng Thu Trang', className: 'HSK 3 - T04', course: 'Tiếng Trung HSK 3', language: 'Tiếng Trung', attendance: 85, average: 6.5, paid: true, status: 'Chờ xét' },
  { id: 7, studentCode: 'HV-0119', studentName: 'Bùi Thanh Hà', className: 'N4 - N03', course: 'Tiếng Nhật N4', language: 'Tiếng Nhật', attendance: 79, average: 4.9, paid: false, status: 'Chờ xét' },
]

const isEligible = (candidate: Candidate) => candidate.paid && candidate.average >= 5
const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))

function AdminCertificates({ onLogout, onNavigate, onNavigateHome }: AdminCertificatesProps) {
  const [candidates, setCandidates] = useState(initialCandidates)
  const [query, setQuery] = useState('')
  const [className, setClassName] = useState('Tất cả')
  const [filter, setFilter] = useState<CertificateFilter>('Tất cả')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [detailId, setDetailId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const classNames = [...new Set(candidates.map((candidate) => candidate.className))]
  const selectedCandidate = candidates.find((candidate) => candidate.id === detailId) ?? null
  const confirmedCount = candidates.filter((candidate) => candidate.status === 'Đã xác nhận').length
  const eligibleCount = candidates.filter((candidate) => isEligible(candidate) && candidate.status !== 'Đã cấp').length
  const blockedCount = candidates.filter((candidate) => !isEligible(candidate)).length
  const issuedCount = candidates.filter((candidate) => candidate.status === 'Đã cấp').length

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')
    return candidates.filter((candidate) => {
      const matchesQuery = !normalizedQuery || [candidate.studentCode, candidate.studentName, candidate.className, candidate.course, candidate.language, candidate.certificateCode ?? '']
        .some((value) => value.toLocaleLowerCase('vi').includes(normalizedQuery))
      const matchesFilter = filter === 'Tất cả'
        || (filter === 'Đủ điều kiện' && isEligible(candidate) && candidate.status !== 'Đã cấp')
        || (filter === 'Không đủ điều kiện' && !isEligible(candidate))
        || (filter === 'Đã cấp' && candidate.status === 'Đã cấp')
      return matchesQuery && matchesFilter && (className === 'Tất cả' || candidate.className === className)
    })
  }, [candidates, className, filter, query])

  const selectableCandidates = filteredCandidates.filter((candidate) => isEligible(candidate) && candidate.status === 'Chờ xét')
  const allVisibleSelected = selectableCandidates.length > 0 && selectableCandidates.every((candidate) => selectedIds.includes(candidate.id))

  const toggleCandidate = (id: number) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const toggleVisible = () => {
    const visibleIds = selectableCandidates.map((candidate) => candidate.id)
    setSelectedIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])])
  }

  const confirmCandidates = () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Xác nhận ${selectedIds.length} học viên đủ điều kiện cấp chứng chỉ?`)) return
    setCandidates((current) => current.map((candidate) => selectedIds.includes(candidate.id) && isEligible(candidate)
      ? { ...candidate, status: 'Đã xác nhận' }
      : candidate))
    setFeedback(`Đã xác nhận danh sách gồm ${selectedIds.length} học viên.`)
    setSelectedIds([])
  }

  const exportCertificates = () => {
    if (confirmedCount === 0) return
    if (!window.confirm(`Kết xuất ${confirmedCount} chứng chỉ PDF đã xác nhận?`)) return
    const issuedAt = new Date().toISOString().slice(0, 10)
    let sequence = Math.max(18, ...candidates.map((candidate) => Number(candidate.certificateCode?.split('-').at(-1) ?? 0)))
    setCandidates((current) => current.map((candidate) => {
      if (candidate.status !== 'Đã xác nhận') return candidate
      sequence += 1
      return { ...candidate, status: 'Đã cấp', certificateCode: `CC-2026-${String(sequence).padStart(3, '0')}`, issuedAt }
    }))
    setFeedback(`Đã kết xuất ${confirmedCount} chứng chỉ và cập nhật trạng thái cấp phát.`)
  }

  const downloadCertificate = (candidate: Candidate) => {
    setFeedback(`Đã gửi yêu cầu tải tệp ${candidate.certificateCode}.pdf. Tệp thật sẽ được nhận từ API backend.`)
  }

  const reissueCertificate = (candidate: Candidate) => {
    if (!window.confirm(`Cấp lại chứng chỉ ${candidate.certificateCode} cho ${candidate.studentName}?`)) return
    const issuedAt = new Date().toISOString().slice(0, 10)
    setCandidates((current) => current.map((item) => item.id === candidate.id ? { ...item, issuedAt } : item))
    setFeedback(`Đã ghi nhận cấp lại chứng chỉ ${candidate.certificateCode}.`)
  }

  return (
    <AdminLayout activePage="certificates" mainId="certificate-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <section className="students-heading certificate-heading" aria-labelledby="certificates-title">
        <div><span className="section-kicker">Kết quả cuối khóa</span><h1 id="certificates-title">Thi và chứng chỉ</h1><p>Xét điều kiện, xác nhận danh sách và quản lý lịch sử cấp chứng chỉ.</p></div>
        <div className="certificate-heading-actions">
          <button type="button" onClick={confirmCandidates} disabled={selectedIds.length === 0}><ShieldCheck aria-hidden="true" weight="bold" />Xác nhận ({selectedIds.length})</button>
          <button className="is-primary" type="button" onClick={exportCertificates} disabled={confirmedCount === 0}><FilePdf aria-hidden="true" weight="bold" />Kết xuất PDF ({confirmedCount})</button>
        </div>
      </section>

      <section className="student-summary" aria-label="Tổng quan xét cấp chứng chỉ">
        <article><GraduationCap aria-hidden="true" weight="duotone" /><div><span>Đủ điều kiện</span><strong>{String(eligibleCount).padStart(2, '0')}</strong><p>Đã thanh toán và điểm từ 5.0</p></div></article>
        <article><XCircle aria-hidden="true" weight="duotone" /><div><span>Chưa đủ điều kiện</span><strong>{String(blockedCount).padStart(2, '0')}</strong><p>Còn nợ học phí hoặc điểm dưới 5.0</p></div></article>
        <article><Certificate aria-hidden="true" weight="duotone" /><div><span>Đã cấp</span><strong>{String(issuedCount).padStart(2, '0')}</strong><p>Có thể tra cứu và tải lại PDF</p></div></article>
      </section>

      {feedback && <div className="course-feedback" role="status"><span>{feedback}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Đóng thông báo"><X aria-hidden="true" /></button></div>}

      <section className="students-panel" aria-labelledby="candidate-list-title">
        <div className="students-panel-head"><div><h2 id="candidate-list-title">Danh sách xét cấp</h2><p>Điều kiện tự động: học phí đã thanh toán và điểm trung bình từ 5.0.</p></div><div className="student-filters certificate-filters"><label className="student-search"><span className="sr-only">Tìm kiếm học viên hoặc chứng chỉ</span><MagnifyingGlass aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Học viên, lớp hoặc mã chứng chỉ" /></label><label><span className="sr-only">Lọc theo điều kiện</span><select value={filter} onChange={(event) => setFilter(event.target.value as CertificateFilter)}><option>Tất cả</option><option>Đủ điều kiện</option><option>Không đủ điều kiện</option><option>Đã cấp</option></select></label><label><span className="sr-only">Lọc theo lớp</span><select value={className} onChange={(event) => setClassName(event.target.value)}><option>Tất cả</option>{classNames.map((item) => <option key={item}>{item}</option>)}</select></label></div></div>
        <p className="student-result-count" aria-live="polite">Hiển thị {filteredCandidates.length} học viên · {selectedIds.length} đã chọn</p>
        <div className="student-table-wrap">
          <table className="certificate-table">
            <thead><tr><th className="certificate-select"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} disabled={selectableCandidates.length === 0} aria-label="Chọn tất cả học viên đủ điều kiện đang hiển thị" /></th><th>Học viên</th><th>Lớp học</th><th>Chuyên cần</th><th>Điểm TB</th><th>Học phí</th><th>Kết quả</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>{filteredCandidates.map((candidate) => {
              const eligible = isEligible(candidate)
              const selectable = eligible && candidate.status === 'Chờ xét'
              const resultLabel = candidate.status === 'Đã cấp' ? 'Đã cấp' : eligible ? candidate.status === 'Đã xác nhận' ? 'Đã xác nhận' : 'Đủ điều kiện' : 'Chưa đạt'
              return <tr key={candidate.id}><td className="certificate-select"><input type="checkbox" checked={selectedIds.includes(candidate.id)} onChange={() => toggleCandidate(candidate.id)} disabled={!selectable} aria-label={`Chọn ${candidate.studentName}`} /></td><td><div className="student-identity"><span aria-hidden="true">{candidate.studentName.split(' ').slice(-2).map((part) => part[0]).join('')}</span><div><strong>{candidate.studentName}</strong><small>{candidate.studentCode}</small></div></div></td><td><strong className="certificate-class">{candidate.className}</strong><small className="certificate-language">{candidate.language}</small></td><td>{candidate.attendance}%</td><td className={candidate.average < 5 ? 'certificate-score is-low' : 'certificate-score'}>{candidate.average.toFixed(1)}</td><td><span className={`certificate-payment ${candidate.paid ? 'is-paid' : 'is-due'}`}>{candidate.paid ? 'Đã thanh toán' : 'Còn nợ'}</span></td><td><span className={`certificate-status ${candidate.status === 'Đã cấp' ? 'issued' : eligible ? candidate.status === 'Đã xác nhận' ? 'confirmed' : 'eligible' : 'blocked'}`}>{resultLabel}</span></td><td><button type="button" onClick={() => setDetailId(candidate.id)} aria-label={`Xem hồ sơ ${candidate.studentName}`}><CaretRight aria-hidden="true" weight="bold" /></button></td></tr>
            })}</tbody>
          </table>
          {filteredCandidates.length === 0 && <div className="student-empty"><MagnifyingGlass aria-hidden="true" /><strong>Không tìm thấy hồ sơ phù hợp</strong><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}
        </div>
      </section>

      {selectedCandidate && <><button className="student-drawer-backdrop" type="button" onClick={() => setDetailId(null)} aria-label="Đóng hồ sơ xét cấp" /><aside className="student-drawer" role="dialog" aria-modal="true" aria-labelledby="certificate-drawer-title"><div className="student-drawer-head"><span>Hồ sơ xét cấp</span><button type="button" onClick={() => setDetailId(null)} aria-label="Đóng hồ sơ"><X aria-hidden="true" /></button></div><div className="certificate-drawer-heading"><Certificate aria-hidden="true" weight="duotone" /><div><h2 id="certificate-drawer-title">{selectedCandidate.studentName}</h2><p>{selectedCandidate.studentCode} · {selectedCandidate.className}</p></div></div><div className="certificate-condition-list"><div className={selectedCandidate.paid ? 'is-passed' : 'is-blocked'}><Receipt aria-hidden="true" weight="fill" /><span><small>Học phí</small><strong>{selectedCandidate.paid ? 'Đã hoàn tất' : 'Chưa hoàn tất'}</strong></span>{selectedCandidate.paid ? <CheckCircle aria-hidden="true" weight="fill" /> : <XCircle aria-hidden="true" weight="fill" />}</div><div className={selectedCandidate.average >= 5 ? 'is-passed' : 'is-blocked'}><GraduationCap aria-hidden="true" weight="fill" /><span><small>Điểm trung bình</small><strong>{selectedCandidate.average.toFixed(1)} / 10</strong></span>{selectedCandidate.average >= 5 ? <CheckCircle aria-hidden="true" weight="fill" /> : <XCircle aria-hidden="true" weight="fill" />}</div><div className="is-neutral"><ClockCountdown aria-hidden="true" weight="fill" /><span><small>Chuyên cần</small><strong>{selectedCandidate.attendance}%</strong></span></div></div><div className={`certificate-decision ${isEligible(selectedCandidate) ? 'is-approved' : ''}`}><ShieldCheck aria-hidden="true" weight="fill" /><div><span>Kết luận hệ thống</span><strong>{isEligible(selectedCandidate) ? 'Đủ điều kiện cấp chứng chỉ' : 'Chưa đủ điều kiện cấp chứng chỉ'}</strong></div></div>{selectedCandidate.status === 'Đã cấp' && <dl className="student-details certificate-record"><div><dt><Certificate aria-hidden="true" />Mã chứng chỉ</dt><dd>{selectedCandidate.certificateCode}</dd></div><div><dt><Student aria-hidden="true" />Khóa học</dt><dd>{selectedCandidate.course}</dd></div><div><dt><CheckCircle aria-hidden="true" />Ngày cấp</dt><dd>{selectedCandidate.issuedAt && formatDate(selectedCandidate.issuedAt)}</dd></div></dl>}<div className="invoice-actions">{selectedCandidate.status === 'Đã cấp' && <><button className="is-primary" type="button" onClick={() => downloadCertificate(selectedCandidate)}><DownloadSimple aria-hidden="true" />Tải lại PDF</button><button type="button" onClick={() => reissueCertificate(selectedCandidate)}><Certificate aria-hidden="true" />Cấp lại chứng chỉ</button></>}{selectedCandidate.status === 'Chờ xét' && isEligible(selectedCandidate) && <button className="is-primary" type="button" onClick={() => toggleCandidate(selectedCandidate.id)}><CheckCircle aria-hidden="true" />{selectedIds.includes(selectedCandidate.id) ? 'Bỏ chọn khỏi danh sách' : 'Chọn để xác nhận'}</button>}</div></aside></>}
    </AdminLayout>
  )
}

export default AdminCertificates
