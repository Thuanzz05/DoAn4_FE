import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Certificate,
  ChartBar,
  CheckCircle,
  DownloadSimple,
  Receipt,
  Student,
  TrendUp,
} from '@phosphor-icons/react'
import AdminLayout, { type AdminPage } from './AdminLayout'
import './AdminDashboard.css'
import './AdminStudents.css'
import './AdminReports.css'

type Period = 'Tháng 9/2026' | 'Quý 3/2026' | 'Năm 2026'

type AdminReportsProps = {
  onLogout: () => void
  onNavigate: (page: AdminPage) => void
  onNavigateHome: () => void
}

const revenueByMonth = [
  { month: 'T4', value: 72 },
  { month: 'T5', value: 84 },
  { month: 'T6', value: 68 },
  { month: 'T7', value: 91 },
  { month: 'T8', value: 78 },
  { month: 'T9', value: 100 },
]

const languageShare = [
  { language: 'Tiếng Anh', students: 126, percent: 51 },
  { language: 'Tiếng Hàn', students: 48, percent: 19 },
  { language: 'Tiếng Trung', students: 37, percent: 15 },
  { language: 'Tiếng Nhật', students: 25, percent: 10 },
  { language: 'Khác', students: 12, percent: 5 },
]

const coursePerformance = [
  { course: 'Tiếng Anh A2', classes: 5, students: 72, completion: 92, revenue: '38.400.000đ' },
  { course: 'Tiếng Anh B1', classes: 4, students: 58, completion: 88, revenue: '31.200.000đ' },
  { course: 'Luyện thi IELTS 6.5', classes: 3, students: 41, completion: 85, revenue: '28.800.000đ' },
  { course: 'Tiếng Hàn TOPIK I', classes: 3, students: 36, completion: 89, revenue: '17.600.000đ' },
  { course: 'Tiếng Trung HSK 3', classes: 2, students: 26, completion: 81, revenue: '10.800.000đ' },
]

const periodMetrics: Record<Period, { revenue: string; debt: string; students: string; certificates: string }> = {
  'Tháng 9/2026': { revenue: '126,8 tr', debt: '18,4 tr', students: '248', certificates: '36' },
  'Quý 3/2026': { revenue: '347,2 tr', debt: '31,6 tr', students: '312', certificates: '94' },
  'Năm 2026': { revenue: '1,18 tỷ', debt: '42,8 tr', students: '486', certificates: '278' },
}

function AdminReports({ onLogout, onNavigate, onNavigateHome }: AdminReportsProps) {
  const [period, setPeriod] = useState<Period>('Tháng 9/2026')
  const [exported, setExported] = useState(false)
  const metrics = periodMetrics[period]

  const exportCsv = () => {
    const rows = [
      ['Khóa học', 'Số lớp', 'Học viên', 'Hoàn thành', 'Doanh thu'],
      ...coursePerformance.map((course) => [course.course, course.classes, course.students, `${course.completion}%`, course.revenue]),
    ]
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `bao-cao-${period.toLocaleLowerCase('vi').replaceAll('/', '-').replaceAll(' ', '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setExported(true)
  }

  return (
    <AdminLayout activePage="reports" mainId="report-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <section className="students-heading report-heading" aria-labelledby="reports-title">
        <div><span className="section-kicker">Dữ liệu điều hành</span><h1 id="reports-title">Báo cáo thống kê</h1><p>Theo dõi tài chính, quy mô đào tạo và kết quả theo từng kỳ.</p></div>
        <div className="report-actions"><label><span className="sr-only">Chọn kỳ báo cáo</span><select value={period} onChange={(event) => { setPeriod(event.target.value as Period); setExported(false) }}><option>Tháng 9/2026</option><option>Quý 3/2026</option><option>Năm 2026</option></select></label><button type="button" onClick={exportCsv}><DownloadSimple aria-hidden="true" weight="bold" />Xuất CSV</button></div>
      </section>

      {exported && <div className="report-export-status" role="status"><CheckCircle aria-hidden="true" weight="fill" />Đã xuất bảng hiệu quả khóa học cho kỳ {period}.</div>}

      <section className="overview-metrics report-metrics" aria-label={`Chỉ số báo cáo ${period}`}>
        <article className="metric-card sage"><div><span>Doanh thu</span><TrendUp aria-hidden="true" weight="duotone" /></div><strong>{metrics.revenue}</strong><p><ArrowUp aria-hidden="true" weight="bold" /> 12,6% so với kỳ trước</p></article>
        <article className="metric-card coral"><div><span>Công nợ</span><Receipt aria-hidden="true" weight="duotone" /></div><strong>{metrics.debt}</strong><p><ArrowDown aria-hidden="true" weight="bold" /> Giảm 6,2% so với kỳ trước</p></article>
        <article className="metric-card paper"><div><span>Học viên</span><Student aria-hidden="true" weight="duotone" /></div><strong>{metrics.students}</strong><p>18 lớp đang hoạt động</p></article>
        <article className="metric-card paper"><div><span>Chứng chỉ đã cấp</span><Certificate aria-hidden="true" weight="duotone" /></div><strong>{metrics.certificates}</strong><p>91% học viên đủ điều kiện</p></article>
      </section>

      <div className="report-grid">
        <section className="dashboard-panel report-revenue" aria-labelledby="revenue-chart-title">
          <div className="panel-heading"><div><h2 id="revenue-chart-title">Xu hướng doanh thu</h2><p>Tỷ lệ tương đối trong sáu tháng gần nhất.</p></div><ChartBar aria-hidden="true" weight="duotone" /></div>
          <div className="report-bars" role="img" aria-label="Doanh thu tăng từ tháng 4 và cao nhất vào tháng 9">
            {revenueByMonth.map((item) => <div key={item.month}><span className="report-bar-value">{item.value}%</span><span className="report-bar-track"><span style={{ height: `${item.value}%` }} /></span><strong>{item.month}</strong></div>)}
          </div>
        </section>

        <section className="dashboard-panel report-languages" aria-labelledby="language-chart-title">
          <div className="panel-heading"><div><h2 id="language-chart-title">Học viên theo ngôn ngữ</h2><p>Tổng số 248 học viên đang học.</p></div><Student aria-hidden="true" weight="duotone" /></div>
          <div className="language-list">{languageShare.map((item) => <article key={item.language}><div><strong>{item.language}</strong><span>{item.students} học viên</span></div><div className="language-track" aria-label={`${item.percent}%`}><span style={{ width: `${item.percent}%` }} /></div><b>{item.percent}%</b></article>)}</div>
        </section>
      </div>

      <section className="students-panel report-table-panel" aria-labelledby="performance-title">
        <div className="students-panel-head"><div><h2 id="performance-title">Hiệu quả theo khóa học</h2><p>Đối chiếu quy mô, tỷ lệ hoàn thành và doanh thu.</p></div><span className="report-period">{period}</span></div>
        <div className="student-table-wrap"><table className="report-table"><thead><tr><th>Khóa học</th><th>Số lớp</th><th>Học viên</th><th>Hoàn thành</th><th>Doanh thu</th></tr></thead><tbody>{coursePerformance.map((course) => <tr key={course.course}><td><strong>{course.course}</strong></td><td>{course.classes}</td><td>{course.students}</td><td><span className="completion-cell"><span><i style={{ width: `${course.completion}%` }} /></span><b>{course.completion}%</b></span></td><td className="report-revenue-cell">{course.revenue}</td></tr>)}</tbody></table></div>
      </section>
    </AdminLayout>
  )
}

export default AdminReports
