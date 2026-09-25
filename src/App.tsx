import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarBlank,
  Certificate,
  Check,
  CheckCircle,
  ClockCountdown,
  FileArrowDown,
  GraduationCap,
  IdentificationCard,
  LockKey,
  Receipt,
  ShieldCheck,
  UsersThree,
} from '@phosphor-icons/react'
import heroImage from './assets/language-center-hero.png'
import AdminDashboard from './pages/AdminDashboard'
import AdminClasses from './pages/AdminClasses'
import AdminCourses from './pages/AdminCourses'
import AdminStudents from './pages/AdminStudents'
import AdminTeachers from './pages/AdminTeachers'
import AdminSchedule from './pages/AdminSchedule'
import AdminInvoices from './pages/AdminInvoices'
import AdminCertificates from './pages/AdminCertificates'
import AdminReports from './pages/AdminReports'
import TeacherDashboard from './pages/TeacherDashboard'
import TeacherSchedule from './pages/TeacherSchedule'
import TeacherAttendance from './pages/TeacherAttendance'
import TeacherGrades from './pages/TeacherGrades'
import StudentDashboard from './pages/StudentDashboard'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import './App.css'

type Role = 'admin' | 'teacher' | 'student'
type Page = 'home' | 'login' | 'register' | 'admin' | 'students' | 'courses' | 'classes' | 'teachers' | 'schedule' | 'invoices' | 'certificates' | 'reports' | 'teacher' | 'teacher-schedule' | 'teacher-attendance' | 'teacher-grades' | 'student'

const getCurrentPage = (): Page => {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path === '/login') return 'login'
  if (path === '/register') return 'register'
  if (path === '/admin') return 'admin'
  if (path === '/admin/students') return 'students'
  if (path === '/admin/courses') return 'courses'
  if (path === '/admin/classes') return 'classes'
  if (path === '/admin/teachers') return 'teachers'
  if (path === '/admin/schedule') return 'schedule'
  if (path === '/admin/invoices') return 'invoices'
  if (path === '/admin/certificates') return 'certificates'
  if (path === '/admin/reports') return 'reports'
  if (path === '/teacher') return 'teacher'
  if (path === '/teacher/schedule') return 'teacher-schedule'
  if (path === '/teacher/attendance') return 'teacher-attendance'
  if (path === '/teacher/grades') return 'teacher-grades'
  if (path === '/student') return 'student'
  return 'home'
}

const flow = [
  { label: 'Ghi danh', detail: 'Hồ sơ và lớp phù hợp', icon: IdentificationCard },
  { label: 'Xếp lịch', detail: 'Phòng và giáo viên', icon: CalendarBlank },
  { label: 'Học tập', detail: 'Điểm danh từng buổi', icon: UsersThree },
  { label: 'Học phí', detail: 'Công nợ minh bạch', icon: Receipt },
  { label: 'Thi cuối kỳ', detail: 'Đủ điều kiện dự thi', icon: GraduationCap },
  { label: 'Chứng chỉ', detail: 'Tạo PDF đã xác nhận', icon: Certificate },
] as const

const roleContent: Record<Role, { label: string; title: string; description: string; tasks: string[]; caption: string }> = {
  admin: {
    label: 'Quản trị viên',
    title: 'Điều phối toàn bộ trung tâm từ một nguồn dữ liệu.',
    description: 'Giáo vụ và kế toán phối hợp trên cùng hồ sơ, từ xếp lớp, lịch dạy đến xác nhận học phí và tổ chức thi.',
    tasks: ['Chặn trùng lịch ngay khi xếp lớp', 'Theo dõi hóa đơn theo trạng thái', 'Import học viên và xuất chứng chỉ'],
    caption: 'Không còn đối chiếu nhiều file Excel trước mỗi quyết định.',
  },
  teacher: {
    label: 'Giáo viên',
    title: 'Lịch dạy, điểm danh và điểm số ở đúng một nơi.',
    description: 'Giáo viên mở lớp đang phụ trách, ghi nhận chuyên cần và nhập điểm theo bốn kỹ năng mà không cần gửi bảng tổng hợp riêng.',
    tasks: ['Tra cứu lịch dạy theo tuần', 'Điểm danh ngay trong buổi học', 'Nhập điểm Nghe, Nói, Đọc, Viết'],
    caption: 'Thông tin cập nhật trở thành dữ liệu chung ngay sau khi xác nhận.',
  },
  student: {
    label: 'Học viên',
    title: 'Tự tra cứu tiến độ mà không cần nhắn hỏi trung tâm.',
    description: 'Học viên nhìn thấy lịch học, tỷ lệ chuyên cần, kết quả từng kỹ năng, công nợ và chứng chỉ trong phạm vi tài khoản của mình.',
    tasks: ['Xem lịch học và lịch thi', 'Theo dõi chuyên cần, điểm số', 'Tải chứng chỉ điện tử khi đủ điều kiện'],
    caption: 'Mọi trạng thái quan trọng đều rõ ràng và có thể kiểm tra lại.',
  },
}

function App() {
  const [activeRole, setActiveRole] = useState<Role>('admin')
  const [page, setPage] = useState<Page>(getCurrentPage)
  const role = roleContent[activeRole]

  useEffect(() => {
    const syncPage = () => setPage(getCurrentPage())
    window.addEventListener('popstate', syncPage)
    return () => window.removeEventListener('popstate', syncPage)
  }, [])

  useEffect(() => {
    document.title = page === 'login'
      ? 'Đăng nhập | Trung tâm'
      : page === 'register'
        ? 'Đăng ký học viên | Trung tâm'
        : page === 'admin'
          ? 'Tổng quan quản trị | Trung tâm'
          : page === 'students'
            ? 'Quản lý học viên | Trung tâm'
            : page === 'courses'
              ? 'Quản lý khóa học | Trung tâm'
              : page === 'classes'
                ? 'Quản lý lớp học | Trung tâm'
                : page === 'teachers'
                  ? 'Quản lý giáo viên | Trung tâm'
                  : page === 'schedule'
                    ? 'Xếp lịch giảng dạy | Trung tâm'
                    : page === 'invoices'
                      ? 'Quản lý học phí | Trung tâm'
                      : page === 'certificates'
                        ? 'Thi và chứng chỉ | Trung tâm'
                        : page === 'reports'
                          ? 'Báo cáo thống kê | Trung tâm'
                          : page === 'teacher'
                            ? 'Tổng quan giáo viên | Trung tâm'
                            : page === 'teacher-schedule'
                              ? 'Thời khóa biểu giáo viên | Trung tâm'
                              : page === 'teacher-attendance'
                                ? 'Điểm danh lớp học | Trung tâm'
                                : page === 'teacher-grades'
                                  ? 'Nhập điểm thi | Trung tâm'
                                  : page === 'student'
                                    ? 'Tổng quan học viên | Trung tâm'
          : 'Hệ thống quản lý trung tâm ngoại ngữ'
  }, [page])

  const navigate = (nextPage: Page) => {
    const nextPath = nextPage === 'login'
      ? '/login'
      : nextPage === 'register'
        ? '/register'
        : nextPage === 'admin'
          ? '/admin'
          : nextPage === 'students'
            ? '/admin/students'
            : nextPage === 'courses'
              ? '/admin/courses'
              : nextPage === 'classes'
                ? '/admin/classes'
                : nextPage === 'teachers'
                  ? '/admin/teachers'
                  : nextPage === 'schedule'
                    ? '/admin/schedule'
                    : nextPage === 'invoices'
                      ? '/admin/invoices'
                      : nextPage === 'certificates'
                        ? '/admin/certificates'
                        : nextPage === 'reports'
                          ? '/admin/reports'
                          : nextPage === 'teacher'
                            ? '/teacher'
                            : nextPage === 'teacher-schedule'
                              ? '/teacher/schedule'
                              : nextPage === 'teacher-attendance'
                                ? '/teacher/attendance'
                                : nextPage === 'teacher-grades'
                                  ? '/teacher/grades'
                                  : nextPage === 'student'
                                    ? '/student'
          : '/'
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  if (page === 'login') {
    return <LoginPage onNavigateHome={() => navigate('home')} onNavigateRegister={() => navigate('register')} />
  }

  if (page === 'register') {
    return <RegisterPage onNavigateHome={() => navigate('home')} onNavigateLogin={() => navigate('login')} />
  }

  if (page === 'admin') {
    return <AdminDashboard onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'students') {
    return <AdminStudents onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'courses') {
    return <AdminCourses onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'classes') {
    return <AdminClasses onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'teachers') {
    return <AdminTeachers onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'schedule') {
    return <AdminSchedule onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'invoices') {
    return <AdminInvoices onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'certificates') {
    return <AdminCertificates onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'reports') {
    return <AdminReports onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'teacher') {
    return <TeacherDashboard onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'teacher-schedule') {
    return <TeacherSchedule onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'teacher-attendance') {
    return <TeacherAttendance onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'teacher-grades') {
    return <TeacherGrades onLogout={() => navigate('login')} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'student') {
    return <StudentDashboard onLogout={() => navigate('login')} onNavigateHome={() => navigate('home')} />
  }

  const openLogin = () => navigate('login')

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Về đầu trang">
          <span>Trung tâm</span>
          <small>Hệ thống quản lý ngoại ngữ</small>
        </a>
        <nav aria-label="Điều hướng chính">
          <a href="#tong-quan">Tổng quan</a>
          <a href="#van-hanh">Vận hành</a>
          <a href="#vai-tro">Vai trò</a>
        </nav>
        <button className="header-login" type="button" onClick={openLogin}>Đăng nhập</button>
      </header>

      <main id="top">
        <section className="hero-section" id="tong-quan" aria-labelledby="page-title">
          <div className="hero-copy">
            <h1 id="page-title"><span>Một trung tâm.</span><span>Một nguồn dữ liệu.</span></h1>
            <p>Kết nối học viên, lớp học, học phí, điểm số và chứng chỉ trong một hệ thống.</p>
            <div className="hero-actions">
              <button className="primary-action" type="button" onClick={openLogin}>Đăng nhập <ArrowRight aria-hidden="true" weight="bold" /></button>
              <a className="text-action" href="#van-hanh">Khám phá hệ thống</a>
            </div>
          </div>

          <figure className="hero-visual">
            <div className="hero-image-wrap">
              <img src={heroImage} alt="Nhân viên tiếp nhận và lớp học tại một trung tâm ngoại ngữ" />
            </div>
            <figcaption>
              <span>Học vụ</span>
              <span>Tài chính</span>
              <span>Kết quả học tập</span>
              <strong>Cùng một nguồn dữ liệu.</strong>
            </figcaption>
          </figure>
        </section>

        <section className="confidence-strip" aria-label="Giá trị nổi bật">
          <p><ShieldCheck aria-hidden="true" weight="fill" /> Phân quyền rõ ràng theo vai trò</p>
          <p><ClockCountdown aria-hidden="true" weight="fill" /> Trạng thái cập nhật theo luồng</p>
          <p><FileArrowDown aria-hidden="true" weight="fill" /> Import Excel, xuất chứng chỉ PDF</p>
        </section>

        <section className="operations-section" id="van-hanh" aria-labelledby="operations-title">
          <div className="section-intro">
            <h2 id="operations-title">Từ ghi danh đến chứng chỉ, dữ liệu không đứt đoạn.</h2>
            <p>Mỗi bước kế thừa dữ liệu từ bước trước. Quy tắc học vụ và tài chính được kiểm tra ngay tại điểm ra quyết định.</p>
          </div>
          <div className="operations-layout">
            <ol className="flow-list">
              {flow.map((item, index) => {
                const Icon = item.icon
                return (
                  <li key={item.label}>
                    <span className="flow-marker">{String(index + 1).padStart(2, '0')}</span>
                    <Icon aria-hidden="true" weight="duotone" />
                    <div><h3>{item.label}</h3><p>{item.detail}</p></div>
                    {index < flow.length - 1 && <ArrowRight className="flow-arrow" aria-hidden="true" />}
                  </li>
                )
              })}
            </ol>
            <aside className="rule-sheet" aria-label="Ví dụ kiểm tra điều kiện">
              <div className="rule-sheet-heading"><span>Hồ sơ minh họa HV-0248</span><span className="status-open">Đang học</span></div>
              <h3>Điều kiện dự thi được kiểm tra tự động.</h3>
              <div className="rule-row passed"><Check aria-hidden="true" weight="bold" /><span>Chuyên cần đạt yêu cầu</span><strong>82%</strong></div>
              <div className="rule-row blocked"><LockKey aria-hidden="true" weight="fill" /><span>Học phí chưa hoàn tất</span><strong>Chưa nộp</strong></div>
              <p className="rule-result">Quyền dự thi tạm khóa cho đến khi kế toán xác nhận thanh toán.</p>
            </aside>
          </div>
        </section>

        <section className="rules-section" aria-labelledby="rules-title">
          <div className="rules-copy">
            <h2 id="rules-title">Quy tắc nghiệp vụ nằm ngay trong luồng làm việc.</h2>
            <p>Hệ thống không chỉ lưu dữ liệu. Nó chủ động kiểm tra điều kiện để nhân viên xử lý đúng ngay từ lần đầu.</p>
          </div>
          <div className="rules-rail">
            <article><CalendarBlank aria-hidden="true" weight="duotone" /><div><h3>Lịch không chồng chéo</h3><p>Kiểm tra phòng, giờ học và lịch giáo viên trước khi lưu.</p></div><span>Chặn tại nguồn</span></article>
            <article><Receipt aria-hidden="true" weight="duotone" /><div><h3>Học phí gắn với học vụ</h3><p>Trạng thái hóa đơn quyết định điều kiện tham gia kỳ thi.</p></div><span>Đúng điều kiện</span></article>
            <article><Certificate aria-hidden="true" weight="duotone" /><div><h3>Kết quả tạo ra chứng chỉ</h3><p>Dữ liệu đã xác nhận được dùng để sinh tệp PDF cuối khóa.</p></div><span>Có thể kiểm tra</span></article>
          </div>
        </section>

        <section className="roles-section" id="vai-tro" aria-labelledby="roles-title">
          <div className="roles-heading"><h2 id="roles-title">Đúng thông tin cho đúng vai trò.</h2><p>Mỗi người có một không gian làm việc riêng nhưng cùng sử dụng một nguồn dữ liệu đã thống nhất.</p></div>
          <div className="role-switcher" role="tablist" aria-label="Chọn vai trò">
            {(Object.keys(roleContent) as Role[]).map((key) => (
              <button type="button" role="tab" aria-selected={activeRole === key} aria-controls="role-panel" id={`role-tab-${key}`} key={key} onClick={() => setActiveRole(key)}>
                {roleContent[key].label}
              </button>
            ))}
          </div>
          <div className="role-panel" id="role-panel" role="tabpanel" aria-labelledby={`role-tab-${activeRole}`}>
            <div className="role-main">
              <span className="role-index">{activeRole === 'admin' ? 'A' : activeRole === 'teacher' ? 'G' : 'H'}</span>
              <h3>{role.title}</h3><p>{role.description}</p>
            </div>
            <div className="role-tasks">
              {role.tasks.map((task) => <p key={task}><CheckCircle aria-hidden="true" weight="fill" />{task}</p>)}
              <small>{role.caption}</small>
            </div>
          </div>
        </section>

        <section className="closing-section" aria-labelledby="closing-title">
          <div><h2 id="closing-title">Sẵn sàng đưa vận hành về cùng một nơi?</h2><p>Đăng nhập để tiếp tục vào không gian làm việc theo vai trò của bạn.</p></div>
          <button className="primary-action inverse" type="button" onClick={openLogin}>Đăng nhập hệ thống <ArrowRight aria-hidden="true" weight="bold" /></button>
        </section>
      </main>

      <footer>
        <a className="wordmark footer-mark" href="#top"><span>Trung tâm</span><small>Hệ thống quản lý ngoại ngữ</small></a>
        <p>Đồ án xây dựng hệ thống quản lý trung tâm ngoại ngữ trên nền tảng web.</p>
        <button type="button" onClick={openLogin}>Đăng nhập</button>
      </footer>

    </div>
  )
}

export default App
