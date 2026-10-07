import { useCallback, useEffect, useRef, useState } from 'react'
import { Certificate, CheckCircle, FilePdf, GraduationCap, LockKey, ShareNetwork } from '@phosphor-icons/react'
import { Alert, Button, Card, Descriptions, Drawer, Empty, Flex, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentAccountPages.css'
import { api, errorMessage, json } from '../api'

type Props = { onLogout: () => void; onNavigate: (page: StudentPage) => void; onNavigateHome: () => void }
type IssuedCertificate = { id: number; code: string | null; verificationCode: string | null; status: string; issuedAt: string | null; pdfPath: string | null; courseName: string; classCode: string | null; className: string | null; average: number | null; downloads: number }
type Eligibility = { enrollmentId: number; courseName: string; certificateStatus: string | null; eligible: boolean; ineligibleReasons: string[] }
type DownloadHistory = { id: number; certificateCode: string; courseName: string; downloadedAt: string }

function StudentCertificates({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [selected, setSelected] = useState<IssuedCertificate | null>(null)
  const [issued, setIssued] = useState<IssuedCertificate[]>([])
  const [eligibility, setEligibility] = useState<Eligibility[]>([])
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)
  const downloadingRef = useRef(false)
  const [messageApi, contextHolder] = message.useMessage()
  const load = useCallback(async () => {
    setLoading(true); setLoadError(null)
    try {
      const [certificates, rows, history] = await Promise.all([api<IssuedCertificate[]>('/student/certificates'), api<Eligibility[]>('/student/certificate-eligibility'), api<DownloadHistory[]>('/student/certificate-downloads')])
      setIssued(certificates); setEligibility(rows); setDownloadHistory(history); setHistoryError(null)
    } catch (error) { setLoadError(errorMessage(error)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const reloadHistory = async () => {
    try { setDownloadHistory(await api<DownloadHistory[]>('/student/certificate-downloads')); setHistoryError(null) }
    catch (error) { setHistoryError(errorMessage(error)) }
  }
  const download = async (item: IssuedCertificate) => {
    if (downloadingRef.current) return
    downloadingRef.current = true; setDownloading(item.id)
    try {
      const result = await api<{ pdfPath: string }>(`/student/certificates/${item.id}/download`, json('POST'))
      setIssued((rows) => rows.map((row) => row.id === item.id ? { ...row, downloads: Number(row.downloads) + 1 } : row))
      setSelected((row) => row?.id === item.id ? { ...row, downloads: Number(row.downloads) + 1 } : row)
      void reloadHistory()
      const response = await fetch(result.pdfPath)
      if (!response.ok) throw new Error('Không tải được tệp PDF. Hãy thử lại hoặc liên hệ trung tâm.')
      if (!response.headers.get('Content-Type')?.includes('application/pdf')) throw new Error('Tệp trả về không phải PDF chứng chỉ. Hãy liên hệ trung tâm.')
      const blob = await response.blob()
      if (!blob.size) throw new Error('Tệp PDF trống. Hãy liên hệ trung tâm tạo lại chứng chỉ.')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `chung-chi-${item.code ?? item.id}.pdf`
      document.body.appendChild(anchor); anchor.click(); anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      messageApi.success('Đã tải chứng chỉ PDF.')
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { downloadingRef.current = false; setDownloading(null) }
  }
  const share = async (item: IssuedCertificate) => { if (!item.verificationCode) return; const url = `${window.location.origin}/verify-certificate?code=${encodeURIComponent(item.verificationCode)}`; try { if (navigator.share) await navigator.share({ title: 'Xác thực chứng chỉ', url }); else { await navigator.clipboard.writeText(url); messageApi.success('Đã sao chép liên kết xác thực') } } catch (error) { if (!(error instanceof DOMException) || error.name !== 'AbortError') messageApi.error('Không thể chia sẻ liên kết') } }

  return <StudentLayout activePage="student-certificates" mainId="student-certificates" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}
    <AdminPageHeader kicker="Thành tích học tập" title="Chứng chỉ của tôi" description="Xem chứng chỉ đã cấp và trạng thái xét cấp cho khóa học đang theo học." actions={<Button loading={loading} disabled={downloading !== null} onClick={() => void load()}>Làm mới</Button>} />
    {loading ? <Card loading className="student-account-card" /> : loadError ? <Alert type="error" showIcon title="Chưa tải được thông tin chứng chỉ" description={loadError} action={<Button onClick={() => void load()}>Thử lại</Button>} /> : <>
    <AdminSummary items={[
      { label: 'Đã cấp', value: issued.filter((item) => item.status === 'da_cap').length, detail: 'Chứng chỉ đã phát hành', icon: <Certificate weight="duotone" />, tone: 'success' },
      { label: 'Chờ xét duyệt', value: eligibility.filter((item) => item.eligible && !item.certificateStatus).length, detail: 'Đủ điều kiện, chưa chốt hồ sơ', icon: <GraduationCap weight="duotone" /> },
      { label: 'Chưa đủ điều kiện', value: eligibility.filter((item) => !item.eligible).length, detail: 'Cần hoàn tất yêu cầu', icon: <LockKey weight="duotone" /> },
    ]} />
    <Card className="student-account-card">
      <Tabs defaultActiveKey="issued" items={[
        { key: 'issued', label: 'Chứng chỉ', children: issued.length ? <div className="student-certificate-list">{issued.map((item) => <Card key={item.id} className="student-certificate-item"><Flex justify="space-between" align="center" gap={16} wrap><Flex gap={16} align="center"><span className="student-certificate-icon"><Certificate size={30} weight="duotone" /></span><div><Tag color={item.status === 'da_cap' ? 'green' : 'blue'}>{item.status === 'da_cap' ? 'Đã cấp' : 'Đã duyệt'}</Tag><Typography.Title level={3}>{item.courseName}</Typography.Title><Typography.Text type="secondary">{item.code ?? item.verificationCode}</Typography.Text></div></Flex><Button onClick={() => setSelected(item)}>Xem chi tiết</Button></Flex></Card>)}</div> : <Empty description="Chưa có chứng chỉ" /> },
        { key: 'pending', label: 'Điều kiện xét cấp', children: <div className="student-certificate-pending">{eligibility.map((item) => <Alert key={item.enrollmentId} type={item.eligible ? 'success' : 'warning'} showIcon title={`${item.courseName}: ${item.certificateStatus === 'da_cap' ? 'Đã cấp chứng chỉ' : item.certificateStatus === 'da_duyet' ? 'Đã duyệt, chờ phát hành PDF' : item.eligible ? 'Đủ điều kiện' : 'Chưa đủ điều kiện'}`} description={item.certificateStatus ? 'Hồ sơ đã được chốt lúc duyệt; xem chứng chỉ tại tab Chứng chỉ.' : item.eligible ? 'Đang chờ quản trị viên xét duyệt.' : item.ineligibleReasons.join('; ')} />)}<Button onClick={() => onNavigate('student-results')}>Xem điểm và chuyên cần</Button></div> },
        { key: 'downloads', label: 'Lịch sử tải xuống', children: <>{historyError && <Alert type="error" showIcon title="Chưa cập nhật được lịch sử tải" description={historyError} action={<Button onClick={() => void reloadHistory()}>Thử lại</Button>} style={{ marginBottom: 16 }} />}{downloadHistory.length ? <Table rowKey="id" size="small" pagination={false} dataSource={downloadHistory} columns={[{ title: 'Mã chứng chỉ', dataIndex: 'certificateCode' }, { title: 'Khóa học', dataIndex: 'courseName' }, { title: 'Thời gian tải', dataIndex: 'downloadedAt', render: (value: string) => new Date(value).toLocaleString('vi-VN') }]} /> : !historyError && <Empty description="Chưa có lần tải xuống nào được ghi nhận." />}</> },
      ]} />
    </Card>
    </>}
    <Drawer title="Chi tiết chứng chỉ" size={440} open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <>
        <Flex gap={12} align="center" className="student-account-drawer-heading"><Certificate size={36} weight="duotone" /><div><Typography.Title level={3}>{selected.courseName}</Typography.Title><Tag color={selected.status === 'da_cap' ? 'green' : 'blue'}><CheckCircle /> {selected.status === 'da_cap' ? 'Đã cấp' : 'Đã duyệt'}</Tag></div></Flex>
        <Descriptions bordered column={1} size="small" items={[
          { key: 'code', label: 'Mã chứng chỉ', children: selected.code },
          { key: 'class', label: 'Lớp học', children: selected.className ? `${selected.classCode} · ${selected.className}` : '—' },
          { key: 'date', label: 'Ngày cấp', children: selected.issuedAt ? new Date(selected.issuedAt).toLocaleDateString('vi-VN') : 'Chưa cấp' },
          { key: 'average', label: 'Điểm trung bình', children: selected.average === null ? '—' : Number(selected.average).toFixed(2) },
          { key: 'verify', label: 'Mã xác thực', children: selected.verificationCode },
          { key: 'downloads', label: 'Lượt tải', children: selected.downloads },
        ]} />
        {!selected.pdfPath && <Alert className="student-account-drawer-note" type="info" showIcon icon={<FilePdf />} title="Tệp PDF chưa sẵn sàng" />}
        <Space orientation="vertical" className="student-certificate-actions"><Button type="primary" block icon={<FilePdf />} loading={downloading === selected.id} disabled={!selected.pdfPath || selected.status !== 'da_cap' || downloading !== null} onClick={() => void download(selected)}>Tải PDF</Button><Button block icon={<ShareNetwork />} disabled={selected.status !== 'da_cap' || !selected.verificationCode} onClick={() => void share(selected)}>Chia sẻ liên kết xác thực</Button></Space>
      </>}
    </Drawer>
  </StudentLayout>
}

export default StudentCertificates
