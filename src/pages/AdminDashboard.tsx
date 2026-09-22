import {
  CalendarBlank,
  CaretRight,
  ChalkboardTeacher,
  CheckCircle,
  Clock,
  Receipt,
  Student,
  WarningCircle,
} from '@phosphor-icons/react'
import AdminLayout from './AdminLayout'
import './AdminDashboard.css'

type AdminDashboardProps = {
  onLogout: () => void
  onNavigate: (page: 'admin' | 'students' | 'courses' | 'classes') => void
  onNavigateHome: () => void
}

const overviewMetrics = [
  { label: 'Học viên đang học', value: '248', note: '12 hồ sơ mới trong tháng', icon: Student, tone: 'sage' },
  { label: 'Lớp đang hoạt động', value: '18', note: '7 lớp có lịch hôm nay', icon: ChalkboardTeacher, tone: 'paper' },
  { label: 'Buổi học hôm nay', value: '07', note: 'Buổi đầu tiên lúc 08:00', icon: CalendarBlank, tone: 'paper' },
  { label: 'Hóa đơn chưa nộp', value: '12', note: '5 hóa đơn sắp đến hạn', icon: Receipt, tone: 'coral' },
] as const

const todaySchedule = [
  { time: '08:00', course: 'A2 Giao tiếp', room: 'P.201', teacher: 'GV. Minh', status: 'Đang học' },
  { time: '10:00', course: 'B1 Tổng quát', room: 'P.105', teacher: 'GV. Lan', status: 'Sắp diễn ra' },
  { time: '14:00', course: 'IELTS 6.5', room: 'P.302', teacher: 'GV. Hùng', status: 'Sắp diễn ra' },
  { time: '18:00', course: 'A2 Giao tiếp', room: 'P.201', teacher: 'GV. Minh', status: 'Sắp diễn ra' },
] as const

const paymentRows = [
  { student: 'Nguyễn Khánh Linh', code: 'HV-0248', amount: '2.400.000đ', status: 'Chưa nộp' },
  { student: 'Trần Gia Huy', code: 'HV-0217', amount: '1.800.000đ', status: 'Đã nộp' },
  { student: 'Lê Minh Anh', code: 'HV-0196', amount: '2.400.000đ', status: 'Chưa nộp' },
  { student: 'Phạm Quang Duy', code: 'HV-0173', amount: '1.800.000đ', status: 'Đã nộp' },
] as const

const alerts = [
  { title: 'Hai lịch học cần kiểm tra', detail: 'Có khả năng trùng phòng trong khung giờ 18:00.', icon: CalendarBlank },
  { title: 'Năm hóa đơn sắp đến hạn', detail: 'Kế toán cần xác nhận trạng thái trước ngày thi.', icon: Receipt },
  { title: 'Ba học viên chưa đủ điều kiện thi', detail: 'Chuyên cần hoặc học phí chưa đạt yêu cầu.', icon: WarningCircle },
] as const

function AdminDashboard({ onLogout, onNavigate, onNavigateHome }: AdminDashboardProps) {
  return (
    <AdminLayout activePage="admin" mainId="dashboard-top" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
          <section className="dashboard-heading" aria-labelledby="dashboard-title">
            <div>
              <h1 id="dashboard-title">Tổng quan vận hành</h1>
              <p>Theo dõi các thông tin cần xử lý trong ngày tại một nơi.</p>
            </div>
            <a href="#operations-alerts">Xem việc cần xử lý <CaretRight aria-hidden="true" weight="bold" /></a>
          </section>

          <section className="overview-metrics" aria-label="Chỉ số tổng quan minh họa">
            {overviewMetrics.map((metric) => {
              const Icon = metric.icon
              return (
                <article className={`metric-card ${metric.tone}`} key={metric.label}>
                  <div><span>{metric.label}</span><Icon aria-hidden="true" weight="duotone" /></div>
                  <strong>{metric.value}</strong>
                  <p>{metric.note}</p>
                </article>
              )
            })}
          </section>

          <div className="dashboard-grid">
            <section className="dashboard-panel schedule-panel" id="today-schedule" aria-labelledby="schedule-title">
              <div className="panel-heading">
                <div><h2 id="schedule-title">Lịch hôm nay</h2><p>Bốn buổi học gần nhất cần theo dõi.</p></div>
                <Clock aria-hidden="true" weight="duotone" />
              </div>
              <div className="schedule-list">
                {todaySchedule.map((item) => (
                  <article key={`${item.time}-${item.course}`}>
                    <time>{item.time}</time>
                    <div><strong>{item.course}</strong><span>{item.room} · {item.teacher}</span></div>
                    <span className={item.status === 'Đang học' ? 'schedule-status live' : 'schedule-status'}>{item.status}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="dashboard-panel alert-panel" id="operations-alerts" aria-labelledby="alerts-title">
              <div className="panel-heading">
                <div><h2 id="alerts-title">Cần xử lý</h2><p>Quy tắc nghiệp vụ đang cần kiểm tra.</p></div>
                <WarningCircle aria-hidden="true" weight="duotone" />
              </div>
              <div className="alert-list">
                {alerts.map((alert) => {
                  const Icon = alert.icon
                  return (
                    <article key={alert.title}>
                      <Icon aria-hidden="true" weight="duotone" />
                      <div><strong>{alert.title}</strong><p>{alert.detail}</p></div>
                      <CaretRight aria-hidden="true" weight="bold" />
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="dashboard-panel payment-panel" id="payment-status" aria-labelledby="payment-title">
              <div className="panel-heading">
                <div><h2 id="payment-title">Trạng thái học phí</h2><p>Các hóa đơn vừa được cập nhật.</p></div>
                <Receipt aria-hidden="true" weight="duotone" />
              </div>
              <div className="payment-table-wrap">
                <table>
                  <thead><tr><th>Học viên</th><th>Mã hồ sơ</th><th>Số tiền</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {paymentRows.map((row) => (
                      <tr key={row.code}>
                        <td>{row.student}</td><td>{row.code}</td><td>{row.amount}</td>
                        <td><span className={row.status === 'Đã nộp' ? 'payment-status paid' : 'payment-status'}>{row.status === 'Đã nộp' && <CheckCircle aria-hidden="true" weight="fill" />}{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
    </AdminLayout>
  )
}

export default AdminDashboard
