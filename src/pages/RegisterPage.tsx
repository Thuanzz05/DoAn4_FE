import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeSlash,
  IdentificationCard,
  Info,
} from '@phosphor-icons/react'
import heroImage from '../assets/language-center-hero.png'
import './LoginPage.css'
import './RegisterPage.css'

type RegisterPageProps = {
  onNavigateHome: () => void
  onNavigateLogin: () => void
}

function RegisterPage({ onNavigateHome, onNavigateLogin }: RegisterPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [isError, setIsError] = useState(false)
  const submitTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(submitTimer.current), [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (password !== confirmPassword) {
      setIsError(true)
      setStatus('Mật khẩu xác nhận chưa trùng khớp.')
      return
    }

    setStatus('')
    setIsError(false)
    setIsSubmitting(true)
    window.clearTimeout(submitTimer.current)
    submitTimer.current = window.setTimeout(() => {
      setIsSubmitting(false)
      setIsError(false)
      setStatus('Giao diện đăng ký đã sẵn sàng. API tạo tài khoản sẽ được kết nối với backend ở bước tiếp theo.')
    }, 650)
  }

  return (
    <div className="login-page-shell register-page-shell">
      <header className="login-page-header">
        <a className="wordmark" href="/" onClick={(event) => { event.preventDefault(); onNavigateHome() }} aria-label="Về trang chủ">
          <span>Trung tâm</span>
          <small>Hệ thống quản lý ngoại ngữ</small>
        </a>
        <button className="login-back" type="button" onClick={onNavigateHome}>
          <ArrowLeft aria-hidden="true" weight="bold" />
          Về trang chủ
        </button>
      </header>

      <main className="login-page-main register-page-main">
        <section className="login-story register-story" aria-labelledby="register-story-title">
          <div className="login-story-copy">
            <CheckCircle aria-hidden="true" weight="duotone" />
            <h1 id="register-story-title">Tạo hồ sơ học viên.</h1>
            <p>Đăng ký để theo dõi lịch học, học phí, kết quả và chứng chỉ trong cùng một tài khoản.</p>
          </div>
          <figure className="login-photo">
            <img src={heroImage} alt="Học viên và giáo viên trong lớp học ngoại ngữ" loading="lazy" decoding="async" />
            <figcaption>Tài khoản tự đăng ký dành cho học viên. Giáo viên và quản trị viên nhận tài khoản từ trung tâm.</figcaption>
          </figure>
        </section>

        <section className="login-entry register-entry" aria-labelledby="register-title">
          <div className="login-form-wrap">
            <div className="login-form-heading">
              <div className="login-form-icon"><IdentificationCard aria-hidden="true" weight="duotone" /></div>
              <h2 id="register-title">Đăng ký tài khoản</h2>
              <p>Điền thông tin để tạo tài khoản học viên mới.</p>
            </div>

            <form className="login-form register-form" onSubmit={handleSubmit}>
              <div className="register-form-grid">
                <div className="register-field register-field-full">
                  <label htmlFor="register-name">Họ và tên</label>
                  <input id="register-name" name="fullName" autoComplete="name" required placeholder="Nhập họ và tên" />
                </div>

                <div className="register-field">
                  <label htmlFor="register-email">Email</label>
                  <input id="register-email" name="email" type="email" autoComplete="email" required placeholder="ten@email.com" />
                </div>

                <div className="register-field">
                  <label htmlFor="register-phone">Số điện thoại</label>
                  <input id="register-phone" name="phone" type="tel" autoComplete="tel" required placeholder="Nhập số điện thoại" />
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
                      aria-describedby="password-help"
                      placeholder="Ít nhất 8 ký tự"
                    />
                    <button
                      type="button"
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
                    placeholder="Nhập lại mật khẩu"
                  />
                </div>
              </div>

              <label className="register-confirm">
                <input type="checkbox" name="confirmInformation" required />
                <span>Tôi xác nhận thông tin trên là chính xác.</span>
              </label>

              <button className="login-submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
                <ArrowRight aria-hidden="true" weight="bold" />
              </button>
            </form>

            {status && (
              <p className={`login-feedback register-feedback${isError ? ' is-error' : ''}`} role="status">
                <Info aria-hidden="true" weight="fill" />
                <span>{status}</span>
              </p>
            )}

            <div className="login-support">
              <span>Đã có tài khoản?</span>
              <button type="button" onClick={onNavigateLogin}>Đăng nhập <ArrowRight aria-hidden="true" weight="bold" /></button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default RegisterPage
