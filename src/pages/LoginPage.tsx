import { type FormEvent, type MouseEvent, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'
import { Alert, Button, ConfigProvider, Input, Modal, Space, Typography } from 'antd'
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
  const [resendSeconds, setResendSeconds] = useState(0)
  const resetRequest = useRef(0)
  const resetPending = useRef(false)
  const submitPending = useRef(false)

  const open = (event: MouseEvent<HTMLAnchorElement>, action: () => void) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    action()
  }

  useEffect(() => () => { resetRequest.current += 1 }, [])
  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])
  const handleGoogle = async (credential: string) => {
    if (submitPending.current) return
    submitPending.current = true
    setIsSubmitting(true); setStatus('')
    try { const session = await api<AuthSession>('/auth/google', json('POST', { credential })); saveSession(session, remember); onAuthenticated(session) }
    catch (error) { setStatus(errorMessage(error)) }
    finally { submitPending.current = false; setIsSubmitting(false) }
  }
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitPending.current) return
    submitPending.current = true
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
      submitPending.current = false
      setIsSubmitting(false)
    }
  }

  const closeForgotPassword = () => {
    if (resetPending.current) return
    resetRequest.current += 1
    setForgotOpen(false)
    setResetCodeSent(false)
    setResetEmail('')
    setResetCode('')
    setNewPassword('')
    setDevCode('')
    setForgotError('')
  }

  const handleForgotPassword = async () => {
    if (resetPending.current || resendSeconds > 0) return
    const email = resetEmail.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setForgotError('Vui lòng nhập email đã đăng ký hợp lệ.'); return }
    const requestId = ++resetRequest.current
    resetPending.current = true
    setResetLoading(true)
    setForgotError('')
    try {
      const result = await api<{ message: string; devCode?: string }>('/auth/forgot-password', json('POST', { email }))
      if (requestId !== resetRequest.current) return
      setResetEmail(email)
      setDevCode(result.devCode ?? '')
      setResetCode('')
      setResetCodeSent(true)
      setResendSeconds(60)
    } catch (error) {
      if (requestId === resetRequest.current) setForgotError(errorMessage(error))
    } finally {
      if (requestId === resetRequest.current) {
        resetPending.current = false
        setResetLoading(false)
      }
    }
  }

  const handleResetPassword = async () => {
    if (resetPending.current) return
    if (!/^\d{6}$/.test(resetCode.trim())) { setForgotError('Mã xác nhận phải gồm 6 chữ số.'); return }
    if (newPassword.length < 8) { setForgotError('Mật khẩu mới phải có ít nhất 8 ký tự.'); return }
    const requestId = ++resetRequest.current
    resetPending.current = true
    setResetLoading(true)
    setForgotError('')
    try {
      const reset = await api<{ message: string }>('/auth/reset-password', json('POST', { email: resetEmail.trim(), code: resetCode.trim(), newPassword }))
      if (requestId !== resetRequest.current) return
      resetPending.current = false
      setResetLoading(false)
      setStatus(reset.message)
      closeForgotPassword()
    } catch (error) {
      if (requestId === resetRequest.current) setForgotError(errorMessage(error))
    } finally {
      if (requestId === resetRequest.current) {
        resetPending.current = false
        setResetLoading(false)
      }
    }
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#234e70', colorText: '#202b33', colorTextSecondary: '#52616d', colorTextPlaceholder: '#52616d', colorBorder: '#82919e', fontFamily: "'Manrope', sans-serif", borderRadius: 6, controlHeight: 44 } }}>
    <div className="login-page-shell auth-page">
      <a className="auth-skip-link" href="#auth-content">Bỏ qua menu</a>
      <header className="login-page-header">
        <a className="wordmark" href="/" onClick={(event) => open(event, onNavigateHome)}>
          <span>Trung tâm</span>
          <small>Hệ thống quản lý ngoại ngữ</small>
        </a>
        <a className="login-back" href="/" onClick={(event) => open(event, onNavigateHome)}>
          <ArrowLeft aria-hidden="true" />
          Về trang chủ
        </a>
      </header>

      <main className="login-page-main" id="auth-content" tabIndex={-1}>
        <section className="login-entry" aria-labelledby="login-title">
          <div className="login-form-wrap">
            <nav className="auth-route-nav" aria-label="Tài khoản">
              <a href="/login" aria-current="page">Đăng nhập</a>
              <a href="/register" onClick={(event) => open(event, onNavigateRegister)}>Đăng ký</a>
            </nav>
            <div className="login-form-heading">
              <h1 id="login-title">Đăng nhập</h1>
              <p>Truy cập lịch học, kết quả và thông tin tài khoản.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit} aria-busy={isSubmitting} aria-describedby={status ? 'login-feedback' : undefined}>
              <div className="auth-field">
              <label htmlFor="login-username">Tên đăng nhập</label>
              <input
                id="login-username"
                name="username"
                autoComplete="username"
                required
                disabled={isSubmitting}
                aria-describedby="login-account-help"
                placeholder="Nhập tên đăng nhập"
              />
              <small id="login-account-help">Dùng email hoặc mã người dùng do trung tâm cấp.</small>
              </div>

              <div className="auth-field">
              <label htmlFor="login-password">Mật khẩu</label>
              <div className="password-field">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  placeholder="Nhập mật khẩu"
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
              </div>

              <div className="login-options">
                <label className="remember-option">
                  <input type="checkbox" name="remember" disabled={isSubmitting} checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button type="button" disabled={isSubmitting} onClick={() => setForgotOpen(true)}>Quên mật khẩu?</button>
              </div>

              {status && <p className="login-feedback" role="status" id="login-feedback">{status}</p>}
              <button className="login-submit" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Đang kiểm tra...' : 'Đăng nhập'}</span>
              </button>
            </form>

            {import.meta.env.VITE_GOOGLE_CLIENT_ID && <><div className="login-divider"><span>hoặc</span></div><GoogleIdentityButton className="login-google" onCredential={handleGoogle} /></>}

            <p className="auth-account-note">Quản trị viên, giáo viên và học viên dùng chung trang đăng nhập. Hệ thống mở đúng không gian của bạn.</p>
          </div>
        </section>
      </main>
      <Modal
        title={resetCodeSent ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'}
        open={forgotOpen}
        okText={resetCodeSent ? 'Đổi mật khẩu' : 'Gửi mã xác nhận'}
        cancelText="Hủy"
        confirmLoading={resetLoading}
        closable={!resetLoading}
        maskClosable={!resetLoading}
        keyboard={!resetLoading}
        cancelButtonProps={{ disabled: resetLoading }}
        okButtonProps={{ disabled: resetLoading || (!resetCodeSent && resendSeconds > 0) }}
        onCancel={closeForgotPassword}
        onOk={() => void (resetCodeSent ? handleResetPassword() : handleForgotPassword())}
        destroyOnHidden
      >
        <Space className="auth-reset-form" orientation="vertical" size="middle" style={{ width: '100%', marginTop: 12 }}>
          <div className="auth-reset-field">
          <label htmlFor="reset-email">Email đã đăng ký</label>
          <Input
            id="reset-email"
            type="email"
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
            placeholder="Email đã đăng ký"
            disabled={resetCodeSent || resetLoading}
            autoComplete="email"
            autoFocus
          />
          </div>
          {resetCodeSent && <>
            {devCode && <Alert type="info" showIcon title={`Mã kiểm thử: ${devCode}`} />}
            <Typography.Text type="secondary">Mã có hiệu lực trong 10 phút. Nếu gửi lại, chỉ mã mới nhất còn hiệu lực.</Typography.Text>
            <div className="auth-reset-field"><label htmlFor="reset-code">Mã xác nhận</label><Input id="reset-code" value={resetCode} onChange={(event) => setResetCode(event.target.value)} placeholder="Mã gồm 6 chữ số" inputMode="numeric" maxLength={6} autoComplete="one-time-code" disabled={resetLoading} /></div>
            <div className="auth-reset-field"><label htmlFor="reset-password">Mật khẩu mới</label><Input.Password id="reset-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Ít nhất 8 ký tự" autoComplete="new-password" disabled={resetLoading} aria-describedby="reset-password-help" /><small id="reset-password-help">Dùng ít nhất 8 ký tự.</small></div>
            <Space wrap>
              <Button onClick={() => void handleForgotPassword()} disabled={resetLoading || resendSeconds > 0}>{resendSeconds > 0 ? `Gửi lại mã sau ${resendSeconds}s` : 'Gửi lại mã'}</Button>
              <Button disabled={resetLoading} onClick={() => { setResetCodeSent(false); setResetCode(''); setNewPassword(''); setDevCode(''); setForgotError('') }}>Sửa email</Button>
            </Space>
          </>}
          {!resetCodeSent && resendSeconds > 0 && <Typography.Text type="secondary">Bạn có thể gửi mã tiếp theo sau {resendSeconds} giây.</Typography.Text>}
          {forgotError && <Alert type="error" showIcon title={forgotError} />}
        </Space>
      </Modal>
    </div>
    </ConfigProvider>
  )
}

export default LoginPage
