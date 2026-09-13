import { type ReactNode, useState } from 'react'
import {
  Bell,
  CalendarBlank,
  Certificate,
  ChalkboardTeacher,
  House,
  List,
  Receipt,
  SignOut,
  Student,
  UsersThree,
  WarningCircle,
  X,
} from '@phosphor-icons/react'

type AdminPage = 'admin' | 'students'

type AdminLayoutProps = {
  activePage: AdminPage
  children: ReactNode
  mainId?: string
  onLogout: () => void
  onNavigate: (page: AdminPage) => void
  onNavigateHome: () => void
}

const notifications = [
  { title: 'Hai lịch học cần kiểm tra', detail: 'Có khả năng trùng phòng trong khung giờ 18:00.', icon: CalendarBlank },
  { title: 'Năm hóa đơn sắp đến hạn', detail: 'Kế toán cần xác nhận trạng thái trước ngày thi.', icon: Receipt },
  { title: 'Ba học viên chưa đủ điều kiện thi', detail: 'Chuyên cần hoặc học phí chưa đạt yêu cầu.', icon: WarningCircle },
] as const

const upcomingModules = [
  { label: 'Lớp học', icon: UsersThree },
  { label: 'Giáo viên', icon: ChalkboardTeacher },
  { label: 'Lịch học', icon: CalendarBlank },
  { label: 'Học phí', icon: Receipt },
  { label: 'Thi và chứng chỉ', icon: Certificate },
] as const

function AdminLayout({ activePage, children, mainId, onLogout, onNavigate, onNavigateHome }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())

  const changePage = (page: AdminPage) => {
    setSidebarOpen(false)
    onNavigate(page)
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Điều hướng quản trị">
        <div className="admin-sidebar-head">
          <button className="admin-wordmark" type="button" onClick={onNavigateHome} aria-label="Về trang chủ">
            <span>Trung tâm</span>
            <small>Không gian quản trị</small>
          </button>
          <button className="sidebar-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Đóng điều hướng" title="Đóng">
            <X aria-hidden="true" weight="bold" />
          </button>
        </div>

        <nav className="admin-nav" aria-label="Chức năng quản trị">
          <button className={activePage === 'admin' ? 'is-active' : ''} type="button" onClick={() => changePage('admin')}>
            <House aria-hidden="true" weight={activePage === 'admin' ? 'fill' : 'regular'} />Tổng quan
          </button>
          <button className={activePage === 'students' ? 'is-active' : ''} type="button" onClick={() => changePage('students')}>
            <Student aria-hidden="true" weight={activePage === 'students' ? 'fill' : 'regular'} />Học viên
          </button>
          {upcomingModules.map((item) => {
            const Icon = item.icon
            return <span className="is-disabled" aria-disabled="true" key={item.label}><Icon aria-hidden="true" />{item.label}<small>Sắp có</small></span>
          })}
        </nav>

        <div className="admin-account">
          <span className="admin-avatar" aria-hidden="true">QT</span>
          <div><strong>Quản trị viên</strong><small>Giáo vụ trung tâm</small></div>
          <button type="button" onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất"><SignOut aria-hidden="true" /></button>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-backdrop" type="button" onClick={() => setSidebarOpen(false)} aria-label="Đóng điều hướng" />}

      <div className="admin-workspace">
        <header className="admin-topbar">
          <button className="sidebar-toggle" type="button" onClick={() => setSidebarOpen(true)} aria-label="Mở điều hướng" title="Mở điều hướng">
            <List aria-hidden="true" weight="bold" />
          </button>
          <div className="admin-topbar-title">
            <span>Dữ liệu minh họa</span>
            <time dateTime={new Date().toISOString()}>{today}</time>
          </div>
          <div className="admin-topbar-actions">
            <button
              className="notification-button"
              type="button"
              onClick={() => setNotificationsOpen((current) => !current)}
              aria-expanded={notificationsOpen}
              aria-controls="notification-panel"
              aria-label="Xem thông báo"
              title="Thông báo"
            >
              <Bell aria-hidden="true" />
              <span>3</span>
            </button>
            <span className="topbar-role">Quản trị viên</span>
          </div>

          {notificationsOpen && (
            <div className="notification-panel" id="notification-panel">
              <div><strong>Thông báo nghiệp vụ</strong><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Đóng thông báo"><X aria-hidden="true" /></button></div>
              {notifications.map((notification) => {
                const Icon = notification.icon
                return <p key={notification.title}><Icon aria-hidden="true" /><span><strong>{notification.title}</strong><small>{notification.detail}</small></span></p>
              })}
            </div>
          )}
        </header>

        <main className="admin-main" id={mainId}>{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout
