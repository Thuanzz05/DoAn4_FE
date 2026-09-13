import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeSlash,
  LockKey,
  ShieldCheck,
  UserCircle,
} from '@phosphor-icons/react'
import heroImage from '../assets/language-center-hero.png'
import './LoginPage.css'

type LoginPageProps = {
  onNavigateHome: () => void
}

function LoginPage({ onNavigateHome }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const submitTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(submitTimer.current), [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('')
    setIsSubmitting(true)
    window.clearTimeout(submitTimer.current)
    submitTimer.current = window.setTimeout(() => {
      setIsSubmitting(false)
      setStatus('API xác thực chưa được kết nối. Giao diện đăng nhập đã sẵn sàng để tích hợp với backend.')
    }, 650)
  }

  const handleForgotPassword = () => {
    setStatus('Vui lòng liên hệ quản trị viên trung tâm để được cấp lại mật khẩu.')
  }

  return (
    <div className="login-page-shell">
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

      <main className="login-page-main">
        <section className="login-story" aria-labelledby="login-story-title">
          <div className="login-story-copy">
            <ShieldCheck aria-hidden="true" weight="duotone" />
            <h1 id="login-story-title">Đúng tài khoản. Đúng không gian làm việc.</h1>
            <p>Mỗi vai trò chỉ truy cập những dữ liệu và chức năng được trung tâm phân quyền.</p>
          </div>
          <figure className="login-photo">
            <img src={heroImage} alt="Không gian làm việc và lớp học tại trung tâm ngoại ngữ" loading="lazy" decoding="async" />
            <figcaption>Học vụ, tài chính và kết quả học tập được kết nối trong cùng hệ thống.</figcaption>
          </figure>
        </section>

        <section className="login-entry" aria-labelledby="login-title">
          <div className="login-form-wrap">
            <div className="login-form-heading">
              <div className="login-form-icon"><UserCircle aria-hidden="true" weight="duotone" /></div>
              <h2 id="login-title">Đăng nhập</h2>
              <p>Sử dụng tài khoản do trung tâm cấp cho bạn.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="login-username">Tên đăng nhập</label>
              <input
                id="login-username"
                name="username"
                autoComplete="username"
                required
                placeholder="Nhập tên đăng nhập"
              />

              <label htmlFor="login-password">Mật khẩu</label>
              <div className="password-field">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Nhập mật khẩu"
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

              <div className="login-options">
                <label className="remember-option">
                  <input type="checkbox" name="remember" />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button type="button" onClick={handleForgotPassword}>Quên mật khẩu?</button>
              </div>

              <button className="login-submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Đang kiểm tra...' : 'Đăng nhập'}</span>
                <ArrowRight aria-hidden="true" weight="bold" />
              </button>
            </form>

            {status && (
              <p className="login-feedback" role="status">
                <LockKey aria-hidden="true" weight="fill" />
                <span>{status}</span>
              </p>
            )}

            <p className="login-support">Bạn chưa có tài khoản? Liên hệ quản trị viên của trung tâm.</p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default LoginPage
