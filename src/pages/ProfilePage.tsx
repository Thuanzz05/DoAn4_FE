import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle, GoogleLogo, IdentificationCard, Key, LinkBreak, ShieldCheck } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, ConfigProvider, Form, Input, Modal, Skeleton, Space, Tag, Typography, message } from 'antd'
import { api, clearSession, errorMessage, getSession, json, saveSession, type AuthUser } from '../api'
import GoogleIdentityButton from '../GoogleIdentityButton'
import { workspaceTheme } from './workspaceTheme'
import './ProfilePage.css'

type Props = { onBack: () => void; onSignedOut: () => void }
type ProfileValues = { fullName: string; phone?: string; birthDate?: string }
type PasswordValues = { currentPassword?: string; newPassword: string; confirmPassword: string }

const roleLabel = { quan_tri: 'Quản trị viên', giao_vien: 'Giáo viên', hoc_vien: 'Học viên' } as const

function ProfilePage({ onBack, onSignedOut }: Props) {
  const session = getSession()
  const [user, setUser] = useState<AuthUser | null>(session?.user ?? null)
  const [saving, setSaving] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const mounted = useRef(false)
  const requestVersion = useRef(0)
  const mutationPending = useRef(false)
  const [profileForm] = Form.useForm<ProfileValues>()
  const [passwordForm] = Form.useForm<PasswordValues>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modal, modalContext] = Modal.useModal()
  const blocked = loading || Boolean(loadError) || saving || passwordLoading || googleLoading

  const applyUser = (nextUser: AuthUser) => {
    if (!mounted.current) return
    const current = getSession()
    if (current && current.user.id !== nextUser.id) return
    if (current) saveSession({ ...current, user: nextUser })
    setUser(nextUser)
    profileForm.setFieldsValue({ fullName: nextUser.fullName, phone: nextUser.phone ?? '', birthDate: nextUser.birthDate?.slice(0, 10) ?? '' })
  }

  const load = async () => {
    const version = ++requestVersion.current
    const token = getSession()?.token
    setLoading(true); setLoadError('')
    try {
      const updated = await api<AuthUser>('/auth/me')
      if (!mounted.current || version !== requestVersion.current) return
      if (getSession()?.token !== token) { setLoadError('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.'); return }
      applyUser(updated)
    }
    catch (error) { if (mounted.current && version === requestVersion.current) setLoadError(errorMessage(error)) }
    finally { if (mounted.current && version === requestVersion.current) setLoading(false) }
  }
  useEffect(() => {
    mounted.current = true; void load()
    return () => { mounted.current = false; requestVersion.current += 1 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateProfile = async (values: ProfileValues) => {
    if (blocked || mutationPending.current) return
    const token = getSession()?.token
    mutationPending.current = true; setSaving(true)
    try {
      const updated = await api<AuthUser>('/auth/me', json('PATCH', { ...values, phone: values.phone?.trim() || null, birthDate: values.birthDate || null }))
      if (!mounted.current || getSession()?.token !== token) return
      applyUser(updated)
      messageApi.success('Đã cập nhật hồ sơ.')
    } catch (error) { if (mounted.current) messageApi.error(errorMessage(error)) }
    finally { mutationPending.current = false; if (mounted.current) setSaving(false) }
  }

  const changePassword = async (values: PasswordValues) => {
    if (blocked || mutationPending.current) return
    const token = getSession()?.token
    mutationPending.current = true; setPasswordLoading(true)
    try {
      await api('/auth/password', json('PATCH', { currentPassword: values.currentPassword ?? '', newPassword: values.newPassword }))
      if (getSession()?.token !== token) return
      clearSession()
      if (mounted.current) { messageApi.success('Đã đổi mật khẩu. Vui lòng đăng nhập lại.'); onSignedOut() }
      else window.dispatchEvent(new Event('auth:expired'))
    } catch (error) { if (mounted.current) messageApi.error(errorMessage(error)) }
    finally { mutationPending.current = false; if (mounted.current) setPasswordLoading(false) }
  }

  const refreshUser = async () => applyUser(await api<AuthUser>('/auth/me'))
  const linkGoogle = async (credential: string) => {
    setGoogleLoading(true)
    try { await api('/auth/google/link', json('POST', { credential })); await refreshUser(); messageApi.success('Đã liên kết tài khoản Google.') }
    catch (error) { messageApi.error(errorMessage(error)) }
    finally { setGoogleLoading(false) }
  }
  const unlinkGoogle = () => modal.confirm({ title: 'Gỡ liên kết Google?', content: 'Bạn sẽ tiếp tục đăng nhập bằng mật khẩu hiện tại.', okText: 'Gỡ liên kết', okButtonProps: { danger: true }, onOk: async () => { try { await api('/auth/google/link', { method: 'DELETE' }); await refreshUser(); messageApi.success('Đã gỡ liên kết Google.') } catch (error) { messageApi.error(errorMessage(error)) } } })

  const initials = user?.fullName.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase()

  return <ConfigProvider theme={workspaceTheme}>
    {contextHolder}{modalContext}
    <div className="profile-shell">
      <header className="profile-header">
        <button type="button" onClick={onBack}><ArrowLeft weight="bold" /> Quay lại không gian làm việc</button>
        <a className="wordmark" href="/" aria-label="Về trang chủ"><span>Trung tâm</span><small>Hệ thống quản lý ngoại ngữ</small></a>
      </header>
      <main className="profile-main">
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : loadError ? <Alert type="error" showIcon title="Chưa tải được hồ sơ tài khoản" description={loadError} action={<Button onClick={() => void load()}>Thử lại</Button>} /> : user && <>
        <section className="profile-identity" aria-labelledby="profile-title">
          <Avatar size={76} shape="square">{initials}</Avatar>
          <div><Typography.Text type="secondary">Hồ sơ tài khoản</Typography.Text><Typography.Title id="profile-title" level={1}>{user.fullName}</Typography.Title><Space wrap><Tag color="green">{roleLabel[user.role]}</Tag><Tag>{user.code}</Tag></Space></div>
          <div className="profile-state"><CheckCircle weight="fill" /><span>Tài khoản đang hoạt động</span></div>
        </section>

        <div className="profile-grid">
          <Card className="profile-card" title={<span><IdentificationCard weight="duotone" /> Thông tin cá nhân</span>}>
            <Form form={profileForm} disabled={blocked} layout="vertical" initialValues={{ fullName: user.fullName, phone: user.phone ?? '', birthDate: user.birthDate?.slice(0, 10) ?? '' }} onFinish={updateProfile} requiredMark={false}>
              <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên.' }, { min: 2 }]}><Input autoComplete="name" /></Form.Item>
              <Form.Item label="Email"><Input value={user.email} disabled /></Form.Item>
              <Form.Item name="phone" label="Số điện thoại" rules={[{ pattern: /^$|^0\d{9}$/, message: 'Số điện thoại phải có đúng 10 chữ số, bắt đầu bằng 0.' }]}><Input inputMode="tel" autoComplete="tel" /></Form.Item>
              <Form.Item name="birthDate" label="Ngày sinh"><Input type="date" /></Form.Item>
              <Button type="primary" htmlType="submit" loading={saving} disabled={blocked}>Lưu thay đổi</Button>
            </Form>
          </Card>

          <div className="profile-security">
            <Card className="profile-card" title={<span><Key weight="duotone" /> {user.hasPassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}</span>}>
              <Form form={passwordForm} disabled={blocked} layout="vertical" onFinish={changePassword} requiredMark={false}>
                {user.hasPassword && <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại.' }]}><Input.Password autoComplete="current-password" /></Form.Item>}
                <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true }, { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự.' }]}><Input.Password autoComplete="new-password" /></Form.Item>
                <Form.Item name="confirmPassword" label="Nhập lại mật khẩu" dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('newPassword') === value ? Promise.resolve() : Promise.reject(new Error('Mật khẩu nhập lại không khớp.')) } })]}><Input.Password autoComplete="new-password" /></Form.Item>
                <Button type="primary" htmlType="submit" loading={passwordLoading} disabled={blocked}>{user.hasPassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}</Button>
              </Form>
            </Card>

            <Card className="profile-card google-card" title={<span><GoogleLogo weight="duotone" /> Tài khoản Google</span>}>
              {user.hasGoogle ? <><Alert type="success" showIcon icon={<ShieldCheck />} title="Đã liên kết Google" description={user.email} /><Button danger icon={<LinkBreak />} onClick={unlinkGoogle} disabled={!user.hasPassword}>Gỡ liên kết</Button>{!user.hasPassword && <Typography.Text type="secondary">Hãy đặt mật khẩu trước khi gỡ liên kết.</Typography.Text>}</> : import.meta.env.VITE_GOOGLE_CLIENT_ID ? <><Typography.Paragraph type="secondary">Dùng đúng tài khoản Google có email {user.email}.</Typography.Paragraph><div className={googleLoading ? 'google-link-loading' : ''}><GoogleIdentityButton onCredential={linkGoogle} /></div></> : <Alert type="warning" showIcon title="Chưa cấu hình Google Client ID" description="Điền VITE_GOOGLE_CLIENT_ID để bật liên kết Google." />}
            </Card>
          </div>
        </div>
        </>}
      </main>
    </div>
  </ConfigProvider>
}

export default ProfilePage
