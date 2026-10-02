import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, MagnifyingGlass, ShieldCheck } from '@phosphor-icons/react'
import { Button, Card, Descriptions, Input, Result, Spin } from 'antd'
import { api, errorMessage } from '../api'
import './LoginPage.css'
import './CertificateVerification.css'

type Props = { onHome: () => void }
type CertificateInfo = {
  certificateCode: string
  verificationCode: string
  issuedAt: string
  studentName: string
  courseName: string
  className: string | null
}

function CertificateVerification({ onHome }: Props) {
  const initialCode = new URLSearchParams(window.location.search).get('code')?.trim() ?? ''
  const [code, setCode] = useState(initialCode)
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const verify = useCallback(async (value: string) => {
    const normalized = value.trim()
    if (!normalized) { setStatus('Vui lòng nhập mã xác thực.'); return }
    setLoading(true)
    setStatus('')
    setCertificate(null)
    try {
      const result = await api<CertificateInfo>(`/certificates/verify/${encodeURIComponent(normalized)}`)
      setCertificate(result)
      window.history.replaceState({}, '', `/verify-certificate?code=${encodeURIComponent(normalized)}`)
    } catch (error) {
      setStatus(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (initialCode) void verify(initialCode) }, [initialCode, verify])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void verify(code)
  }

  return <div className="login-page-shell certificate-verify-page">
    <header className="login-page-header">
      <a className="wordmark" href="/" onClick={(event) => { event.preventDefault(); onHome() }}>
        <span>Trung tâm</span><small>Hệ thống quản lý ngoại ngữ</small>
      </a>
      <button className="login-back" type="button" onClick={onHome}><ArrowLeft weight="bold" />Về trang chủ</button>
    </header>
    <main className="certificate-verify-main">
      <section aria-labelledby="verify-title">
        <ShieldCheck className="certificate-verify-mark" weight="duotone" />
        <p className="certificate-verify-kicker">Tra cứu công khai</p>
        <h1 id="verify-title">Xác thực chứng chỉ</h1>
        <p>Nhập mã trên chứng chỉ hoặc mở liên kết từ mã QR để kiểm tra thông tin phát hành.</p>
        <form className="certificate-verify-form" onSubmit={submit}>
          <Input size="large" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Nhập mã xác thực" aria-label="Mã xác thực chứng chỉ" />
          <Button size="large" type="primary" htmlType="submit" icon={<MagnifyingGlass />} loading={loading}>Kiểm tra</Button>
        </form>
      </section>
      <Card className="certificate-verify-card">
        {loading ? <Spin size="large" /> : certificate ? <Result
          status="success"
          title="Chứng chỉ hợp lệ"
          subTitle="Thông tin dưới đây khớp với dữ liệu do trung tâm phát hành."
          extra={<Descriptions bordered column={1} size="small" items={[
            { key: 'code', label: 'Mã chứng chỉ', children: certificate.certificateCode },
            { key: 'student', label: 'Học viên', children: certificate.studentName },
            { key: 'course', label: 'Khóa học', children: certificate.courseName },
            { key: 'class', label: 'Lớp học', children: certificate.className ?? '—' },
            { key: 'date', label: 'Ngày cấp', children: new Date(certificate.issuedAt).toLocaleDateString('vi-VN') },
          ]} />}
        /> : status ? <Result status="error" title="Không xác thực được" subTitle={status} /> : <Result status="info" title="Chưa có kết quả" subTitle="Mã xác thực gồm các ký tự được in trên chứng chỉ." />}
      </Card>
    </main>
  </div>
}

export default CertificateVerification
