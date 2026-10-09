import { useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { ArrowLeft, Eye, EyeSlash, Info } from '@phosphor-icons/react'
import { api, errorMessage, json, saveSession, type AuthSession } from '../api'
import './LoginPage.css'
import './RegisterPage.css'

type RegisterPageProps = {
  onNavigateHome: () => void
  onNavigateLogin: () => void
  onAuthenticated: (session: AuthSession) => void
}

function RegisterPage({ onNavigateHome, onNavigateLogin, onAuthenticated }: RegisterPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [isError, setIsError] = useState(false)
  const submitPending = useRef(false)
  const navigate = (event: MouseEvent<HTMLAnchorElement>, action: () => void) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    action()
  }
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitPending.current) return
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    const phone = String(formData.get('phone') ?? '').trim()

    if (!/^0\d{9}$/.test(phone)) {
      setIsError(true)
      setStatus('Số điện thoại phải gồm 10 số và bắt đầu bằng 0.')
      return
    }

    if (password !== confirmPassword) {
      setIsError(true)
      setStatus('Mật khẩu xác nhận chưa trùng khớp.')
      return
    }

    setStatus('')
    setIsError(false)
    submitPending.current = true
    setIsSubmitting(true)
    try {
      const session = await api<AuthSession>('/auth/register', json('POST', {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone,
        password,
      }))
      saveSession(session)
      onAuthenticated(session)
    } catch (error) {
      setIsError(true)
      setStatus(errorMessage(error))
    } finally {
      submitPending.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page-shell auth-page register-page-shell">
      <a className="auth-skip-link" href="#auth-content">Bỏ qua menu</a>
      <header className="login-page-header">
        <a className="wordmark" href="/" onClick={(event) => navigate(event, onNavigateHome)}>
          <span>Trung tâm</span>
          <small>Hệ thống quản lý ngoại ngữ</small>
        </a>
        <a className="login-back" href="/" onClick={(event) => navigate(event, onNavigateHome)}>
          <ArrowLeft aria-hidden="true" weight="bold" />
          Về trang chủ
        </a>
      </header>

      <main className="login-page-main register-page-main" id="auth-content" tabIndex={-1}>
        <section className="login-form-wrap register-entry" aria-labelledby="register-title">
          <nav className="auth-route-nav" aria-label="Tài khoản">
            <a href="/login" onClick={(event) => navigate(event, onNavigateLogin)}>Đăng nhập</a>
            <a href="/register" aria-current="page">Đăng ký</a>
          </nav>
          <div className="login-form-heading">
            <h1 id="register-title">Đăng ký tài khoản</h1>
            <p>Điền thông tin để tạo tài khoản học viên mới.</p>
          </div>

          <form className="login-form register-form" onSubmit={handleSubmit} aria-busy={isSubmitting} aria-describedby={status ? 'register-feedback' : undefined}>
            <div className="register-form-grid">
              <div className="register-field register-field-full">
                <label htmlFor="register-name">Họ và tên</label>
                <input id="register-name" name="fullName" autoComplete="name" required disabled={isSubmitting} placeholder="Nhập họ và tên" />
              </div>

              <div className="register-field">
                <label htmlFor="register-email">Email</label>
                <input id="register-email" name="email" type="email" autoComplete="email" required disabled={isSubmitting} placeholder="ten@email.com" />
              </div>

              <div className="register-field">
                <label htmlFor="register-phone">Số điện thoại</label>
                <input id="register-phone" name="phone" type="tel" autoComplete="tel" inputMode="numeric" pattern="0[0-9]{9}" maxLength={10} title="Số điện thoại gồm 10 số và bắt đầu bằng 0" required disabled={isSubmitting} placeholder="10 số, bắt đầu bằng 0" />
              </div>

              <div className="register-field">
                <label htmlFor="register-password">Mật khẩu</label>
                <div className="password-field">
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={isSubmitting}
                    aria-describedby="password-help"
                    placeholder="Ít nhất 8 ký tự"
                  />
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeSlash aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
                <small id="password-help">Dùng ít nhất 8 ký tự.</small>
              </div>

              <div className="register-field">
                <label htmlFor="register-confirm-password">Xác nhận mật khẩu</label>
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={isSubmitting}
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
            </div>

            <label className="register-confirm">
              <input type="checkbox" name="confirmInformation" required disabled={isSubmitting} />
              <span>Tôi xác nhận thông tin trên là chính xác.</span>
            </label>

            {status && (
              <p className={`login-feedback register-feedback${isError ? ' is-error' : ''}`} role="status" id="register-feedback">
                <Info aria-hidden="true" weight="fill" />
                <span>{status}</span>
              </p>
            )}

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>
          <p className="auth-account-note">Tài khoản tự đăng ký dành cho học viên. Giáo viên và quản trị viên nhận tài khoản từ trung tâm.</p>
        </section>
      </main>
    </div>
  )
}

export default RegisterPage
