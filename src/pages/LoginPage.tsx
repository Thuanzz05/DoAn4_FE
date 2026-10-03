import { FormEvent, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeSlash,
  LockKey,
  ShieldCheck,
  UserCircle,
} from '@phosphor-icons/react'
import { Alert, Input, Modal, Space } from 'antd'
import heroImage from '../assets/language-center-hero.png'
import { api, errorMessage, json, saveSession, type AuthSession } from '../api'
import GoogleIdentityButton from '../GoogleIdentityButton'
import './LoginPage.css'

type LoginPageProps = {
  onNavigateHome: () => void
  onNavigateRegister: () => void
  onAuthenticated: (session: AuthSession) => void
}

function LoginPage({ onNavigateHome, onNavigateRegister, onAuthenticated }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [remember, setRemember] = useState(false)
  const [status, setStatus] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetCodeSent, setResetCodeSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [devCode, setDevCode] = useState('')
  const [forgotError, setForgotError] = useState('')
  const handleGoogle = async (credential: string) => {
    setIsSubmitting(true); setStatus('')
    try { const session = await api<AuthSession>('/auth/google', json('POST', { credential })); saveSession(session, remember); onAuthenticated(session) }
    catch (error) { setStatus(errorMessage(error)) }
    finally { setIsSubmitting(false) }
  }
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('')
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    try {
      const session = await api<AuthSession>('/auth/login', json('POST', {
        account: formData.get('username'),
        password: formData.get('password'),
      }))
      saveSession(session, remember)
      onAuthenticated(session)
    } catch (error) {
      setStatus(errorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeForgotPassword = () => {
    setForgotOpen(false)
    setResetCodeSent(false)
    setResetEmail('')
    setResetCode('')
    setNewPassword('')
    setDevCode('')
    setForgotError('')
  }

  const handleForgotPassword = async () => {
    const email = resetEmail.trim()
    if (!email) { setForgotError('Vui lòng nhập email đã đăng ký.'); return }
    setResetLoading(true)
    setForgotError('')
    try {
      const result = await api<{ message: string; devCode?: string }>('/auth/forgot-password', json('POST', { email }))
      setDevCode(result.devCode ?? '')
      setResetCodeSent(true)
    } catch (error) {
      setForgotError(errorMessage(error))
    } finally {
      setResetLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetCode.trim()) { setForgotError('Vui lòng nhập mã xác nhận.'); return }
    if (newPassword.length < 8) { setForgotError('Mật khẩu mới phải có ít nhất 8 ký tự.'); return }
    setResetLoading(true)
    setForgotError('')
    try {
      const reset = await api<{ message: string }>('/auth/reset-password', json('POST', { email: resetEmail.trim(), code: resetCode.trim(), newPassword }))
      setStatus(reset.message)
      closeForgotPassword()
    } catch (error) {
      setForgotError(errorMessage(error))
    } finally {
      setResetLoading(false)
    }
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
                  <input type="checkbox" name="remember" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button type="button" onClick={() => setForgotOpen(true)}>Quên mật khẩu?</button>
              </div>

              <button className="login-submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Đang kiểm tra...' : 'Đăng nhập'}</span>
                <ArrowRight aria-hidden="true" weight="bold" />
              </button>
            </form>

            {import.meta.env.VITE_GOOGLE_CLIENT_ID && <><div className="login-divider"><span>hoặc</span></div><GoogleIdentityButton className="login-google" onCredential={handleGoogle} /></>}

            {status && (
              <p className="login-feedback" role="status">
                <LockKey aria-hidden="true" weight="fill" />
                <span>{status}</span>
              </p>
            )}

            <div className="login-support">
              <span>Chưa có tài khoản học viên?</span>
              <button type="button" onClick={onNavigateRegister}>Đăng ký ngay <ArrowRight aria-hidden="true" weight="bold" /></button>
            </div>
          </div>
        </section>
      </main>
      <Modal
        title={resetCodeSent ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'}
        open={forgotOpen}
        okText={resetCodeSent ? 'Đổi mật khẩu' : 'Gửi mã xác nhận'}
        cancelText="Hủy"
        confirmLoading={resetLoading}
        onCancel={closeForgotPassword}
        onOk={() => void (resetCodeSent ? handleResetPassword() : handleForgotPassword())}
        destroyOnHidden
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%', marginTop: 12 }}>
          <Input
            type="email"
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
            placeholder="Email đã đăng ký"
            disabled={resetCodeSent}
            autoFocus
          />
          {resetCodeSent && <>
            {devCode && <Alert type="info" showIcon title={`Mã kiểm thử: ${devCode}`} />}
            <Input value={resetCode} onChange={(event) => setResetCode(event.target.value)} placeholder="Mã xác nhận" inputMode="numeric" />
            <Input.Password value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mật khẩu mới (ít nhất 8 ký tự)" />
          </>}
          {forgotError && <Alert type="error" showIcon title={forgotError} />}
        </Space>
      </Modal>
    </div>
  )
}

export default LoginPage
