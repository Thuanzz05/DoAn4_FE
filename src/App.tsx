import { useEffect, useRef, useState } from 'react'
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
import StudentSchedule from './pages/StudentSchedule'
import StudentResults from './pages/StudentResults'
import StudentInvoices from './pages/StudentInvoices'
import StudentCertificates from './pages/StudentCertificates'
import CertificateVerification from './pages/CertificateVerification'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import HomePage from './pages/HomePage'
import { api, clearSession, getSession, type AuthRole, type AuthSession } from './api'
import './App.css'

type Page = 'home' | 'login' | 'register' | 'verify-certificate' | 'profile' | 'admin' | 'students' | 'courses' | 'classes' | 'teachers' | 'schedule' | 'invoices' | 'certificates' | 'reports' | 'teacher' | 'teacher-schedule' | 'teacher-attendance' | 'teacher-grades' | 'student' | 'student-schedule' | 'student-results' | 'student-invoices' | 'student-certificates'

const privateRole = (page: Page): AuthRole | null => {
  if (['admin', 'students', 'courses', 'classes', 'teachers', 'schedule', 'invoices', 'certificates', 'reports'].includes(page)) return 'quan_tri'
  if (page.startsWith('teacher')) return 'giao_vien'
  if (page.startsWith('student')) return 'hoc_vien'
  return null
}

const roleHome: Record<AuthRole, Page> = { quan_tri: 'admin', giao_vien: 'teacher', hoc_vien: 'student' }

const getCurrentPage = (): Page => {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path === '/login') return 'login'
  if (path === '/register') return 'register'
  if (path === '/verify-certificate') return 'verify-certificate'
  if (path === '/profile') return 'profile'
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
  if (path === '/student/schedule') return 'student-schedule'
  if (path === '/student/results') return 'student-results'
  if (path === '/student/invoices') return 'student-invoices'
  if (path === '/student/certificates') return 'student-certificates'
  return 'home'
}

function App() {
  const [page, setPage] = useState<Page>(getCurrentPage)
  const [session, setSession] = useState<AuthSession | null>(getSession)
  const currentPath = useRef(window.location.pathname)

  useEffect(() => {
    const syncPage = () => {
      if (!window.dispatchEvent(new Event('app:history-navigation', { cancelable: true }))) {
        window.history.pushState({}, '', currentPath.current)
        return
      }
      currentPath.current = window.location.pathname
      setPage(getCurrentPage())
    }
    const expireSession = () => {
      setSession(null)
      window.history.replaceState({}, '', '/login')
      currentPath.current = '/login'
      setPage('login')
    }
    window.addEventListener('popstate', syncPage)
    window.addEventListener('auth:expired', expireSession)
    return () => {
      window.removeEventListener('popstate', syncPage)
      window.removeEventListener('auth:expired', expireSession)
    }
  }, [])

  useEffect(() => {
    const required = privateRole(page)
    if ((page === 'profile' && !session) || (required && session?.user.role !== required)) {
      window.history.replaceState({}, '', '/login')
      currentPath.current = '/login'
      setPage('login')
    }
  }, [page, session])

  useEffect(() => {
    document.title = page === 'login'
      ? 'Đăng nhập | Trung tâm'
      : page === 'register'
        ? 'Đăng ký học viên | Trung tâm'
        : page === 'verify-certificate'
          ? 'Xác thực chứng chỉ | Trung tâm'
        : page === 'profile'
          ? 'Hồ sơ cá nhân | Trung tâm'
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
                                    : page === 'student-schedule'
                                      ? 'Lịch học cá nhân | Trung tâm'
                                      : page === 'student-results'
                                        ? 'Điểm số và chuyên cần | Trung tâm'
                                        : page === 'student-invoices'
                                          ? 'Học phí của tôi | Trung tâm'
                                          : page === 'student-certificates'
                                            ? 'Chứng chỉ của tôi | Trung tâm'
          : 'Hệ thống quản lý trung tâm ngoại ngữ'
  }, [page])

  const navigate = (nextPage: Page) => {
    const nextPath = nextPage === 'login'
      ? '/login'
      : nextPage === 'register'
        ? '/register'
        : nextPage === 'verify-certificate'
          ? '/verify-certificate'
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
                                    : nextPage === 'student-schedule'
                                      ? '/student/schedule'
                                      : nextPage === 'student-results'
                                        ? '/student/results'
                                        : nextPage === 'student-invoices'
                                          ? '/student/invoices'
                                          : nextPage === 'student-certificates'
                                            ? '/student/certificates'
          : '/'
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath)
    currentPath.current = nextPath
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const authenticated = (nextSession: AuthSession) => {
    setSession(nextSession)
    navigate(roleHome[nextSession.user.role])
  }

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // Xóa phiên phía trình duyệt ngay cả khi máy chủ không phản hồi.
    }
    clearSession()
    setSession(null)
    navigate('login')
  }

  if (page === 'login') {
    return <LoginPage onNavigateHome={() => navigate('home')} onNavigateRegister={() => navigate('register')} onAuthenticated={authenticated} />
  }

  if (page === 'register') {
    return <RegisterPage onNavigateHome={() => navigate('home')} onNavigateLogin={() => navigate('login')} onAuthenticated={authenticated} />
  }

  if (page === 'verify-certificate') {
    return <CertificateVerification onHome={() => navigate('home')} />
  }

  if (page === 'profile' && session) {
    return <ProfilePage onBack={() => navigate(roleHome[session.user.role])} onSignedOut={() => { setSession(null); navigate('login') }} />
  }

  if (page === 'admin') {
    return <AdminDashboard onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'students') {
    return <AdminStudents onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'courses') {
    return <AdminCourses onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'classes') {
    return <AdminClasses onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'teachers') {
    return <AdminTeachers onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'schedule') {
    return <AdminSchedule onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'invoices') {
    return <AdminInvoices onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'certificates') {
    return <AdminCertificates onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'reports') {
    return <AdminReports onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'teacher') {
    return <TeacherDashboard onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'teacher-schedule') {
    return <TeacherSchedule onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'teacher-attendance') {
    return <TeacherAttendance onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'teacher-grades') {
    return <TeacherGrades onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'student') {
    return <StudentDashboard onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'student-schedule') {
    return <StudentSchedule onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'student-results') {
    return <StudentResults onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'student-invoices') {
    return <StudentInvoices onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  if (page === 'student-certificates') {
    return <StudentCertificates onLogout={logout} onNavigate={(nextPage) => navigate(nextPage)} onNavigateHome={() => navigate('home')} />
  }

  return <HomePage onLogin={() => navigate('login')} onRegister={() => navigate('register')} onVerifyCertificate={() => navigate('verify-certificate')} />
}

export default App
