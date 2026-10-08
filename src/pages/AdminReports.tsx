import { useEffect, useRef, useState } from 'react'
import { Certificate, ChartBar, CheckCircle, DownloadSimple, Receipt, Student, TrendUp } from '@phosphor-icons/react'
import { Alert, Button, Card, Col, Flex, InputNumber, Progress, Row, Select, Skeleton, Space, Table, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import './AdminReports.css'
import { api, errorMessage } from '../api'
import { downloadFile } from '../download'
import { academicScore } from '../academicScore'

type Period = 'month' | 'quarter' | 'year'
type CoursePerformance = { id: number; courseName: string; classes: number; students: number; completion: number | null; revenue: number }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }
type ClassPerformance = { id: number; classCode: string; className: string; courseName: string; students: number; passed: number; failed: number; pending: number; average: number | null }
type Report = { metrics: { revenue: number; debt: number; students: number; activeClasses: number; certificates: number }; academicMetrics: { passed: number; failed: number; pending: number }; revenueByMonth: Array<{ month: string; revenue: number }>; languageShare: Array<{ language: string; students: number }>; coursePerformance: CoursePerformance[]; classPerformance: ClassPerformance[] }
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`
const periodLabels: Record<Period, string> = { month: 'Theo tháng', quarter: 'Theo quý', year: 'Theo năm' }

function AdminReports({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [period, setPeriod] = useState<Period>('month')
  const [year, setYear] = useState(new Date().getFullYear())
  const [unit, setUnit] = useState(new Date().getMonth() + 1)
  const [report, setReport] = useState<Report>({ metrics: { revenue: 0, debt: 0, students: 0, activeClasses: 0, certificates: 0 }, academicMetrics: { passed: 0, failed: 0, pending: 0 }, revenueByMonth: [], languageShare: [], coursePerformance: [], classPerformance: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState<string>()
  const exportPending = useRef(false)
  const [reload, setReload] = useState(0)
  const [messageApi, contextHolder] = message.useMessage()
  const params = new URLSearchParams({ period, year: String(year), unit: String(unit) }).toString()
  const periodLabel = period === 'year' ? `Năm ${year}` : `${period === 'month' ? 'Tháng' : 'Quý'} ${unit}/${year}`
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    api<Report>(`/reports?${params}`, { signal: controller.signal }).then((data) => { if (!controller.signal.aborted) setReport(data) }).catch((err) => { if (!controller.signal.aborted) setError(errorMessage(err)) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [params, reload])
  const { metrics, revenueByMonth, languageShare, coursePerformance } = report
  const maxRevenue = Math.max(1, ...revenueByMonth.map((item) => Number(item.revenue)))
  const totalStudents = languageShare.reduce((sum, item) => sum + Number(item.students), 0)
  const exportReport = async (format: 'xlsx' | 'pdf') => {
    if (loading || error || exportPending.current) return
    exportPending.current = true
    setExporting(format)
    try { await downloadFile(`/reports/export?${params}&format=${format}`, `bao-cao-${period}-${year}-${unit}.${format}`); messageApi.success(`Đã tải báo cáo ${periodLabel}`) }
    catch (err) { messageApi.error(errorMessage(err)) } finally { exportPending.current = false; setExporting(undefined) }
  }
  const columns: TableProps<CoursePerformance>['columns'] = [
    { title: 'Khóa học', dataIndex: 'courseName', render: (value) => <Typography.Text strong>{value}</Typography.Text> },
    { title: 'Tổng số lớp', dataIndex: 'classes' }, { title: 'Học viên trong kỳ', dataIndex: 'students' },
    { title: 'Hoàn thành', dataIndex: 'completion', width: 190, render: (value: number | null) => value === null ? '—' : <Progress percent={Number(value)} size="small" /> },
    { title: 'Doanh thu', dataIndex: 'revenue', render: (value) => <Typography.Text strong>{money(Number(value))}</Typography.Text> },
  ]
  return <AdminLayout activePage="reports" mainId="report-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}
    <AdminPageHeader kicker="Dữ liệu điều hành" title="Báo cáo thống kê" description="Chọn kỳ báo cáo và xuất đầy đủ số liệu tài chính, đào tạo, kết quả học tập." actions={<Space wrap>
      <Select disabled={Boolean(exporting)} aria-label="Loại kỳ báo cáo" value={period} onChange={(value: Period) => { setPeriod(value); setUnit(value === 'quarter' ? Math.floor(new Date().getMonth() / 3) + 1 : new Date().getMonth() + 1) }} options={Object.entries(periodLabels).map(([value, label]) => ({ value, label }))} />
      <InputNumber disabled={Boolean(exporting)} aria-label="Năm báo cáo" min={2000} max={2100} precision={0} value={year} onChange={(value) => { if (value && value >= 2000 && value <= 2100) setYear(value) }} />
      {period !== 'year' && <Select disabled={Boolean(exporting)} aria-label="Tháng hoặc quý báo cáo" value={unit} onChange={setUnit} options={Array.from({ length: period === 'month' ? 12 : 4 }, (_, index) => ({ value: index + 1, label: `${period === 'month' ? 'Tháng' : 'Quý'} ${index + 1}` }))} />}
      <Button type="primary" icon={<DownloadSimple />} loading={exporting === 'xlsx'} disabled={loading || Boolean(error) || Boolean(exporting)} onClick={() => void exportReport('xlsx')}>Xuất Excel</Button>
      <Button icon={<DownloadSimple />} loading={exporting === 'pdf'} disabled={loading || Boolean(error) || Boolean(exporting)} onClick={() => void exportReport('pdf')}>Xuất PDF</Button>
    </Space>} />
    {error && <Alert showIcon type="error" title="Chưa tải được báo cáo" description={error} action={<Button disabled={Boolean(exporting)} onClick={() => setReload((value) => value + 1)}>Thử lại</Button>} style={{ marginTop: 16 }} />}
    {loading ? <Skeleton active paragraph={{ rows: 10 }} /> : !error && <>
    <Alert type="info" showIcon style={{ margin: '16px 0' }} title={periodLabel} description="Doanh thu tính theo ngày thanh toán; công nợ là số chưa thu hiện tại của hóa đơn lập trong kỳ. Kết quả đào tạo xét ghi danh trong kỳ: hoàn thành lớp, đủ mọi kỳ thi và điểm TB từ 5 là đạt; thiếu dữ liệu được ghi riêng." />
    <AdminSummary items={[{ label: 'Doanh thu', value: money(Number(metrics.revenue)), detail: periodLabel, icon: <TrendUp weight="duotone" />, tone: 'success' }, { label: 'Công nợ', value: money(Number(metrics.debt)), detail: 'Hóa đơn lập trong kỳ, chưa thu', icon: <Receipt weight="duotone" />, tone: 'danger' }, { label: 'Học viên', value: Number(metrics.students), detail: 'Học viên ghi danh trong kỳ', icon: <Student weight="duotone" /> }, { label: 'Chứng chỉ đã cấp', value: Number(metrics.certificates), detail: periodLabel, icon: <Certificate weight="duotone" /> }]} />
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} xl={14}><Card title="Doanh thu trong kỳ" extra={<ChartBar size={22} />}><div className="report-bars" role="img" aria-label={`Doanh thu ${periodLabel}`}>{revenueByMonth.map((item) => { const value = Math.round(Number(item.revenue) * 100 / maxRevenue); return <div key={item.month}><span className="report-bar-value">{money(Number(item.revenue))}</span><span className="report-bar-track"><span style={{ height: `${value}%` }} /></span><strong>{item.month}</strong></div> })}{!revenueByMonth.length && <Typography.Text type="secondary">Không có doanh thu trong kỳ</Typography.Text>}</div></Card></Col>
      <Col xs={24} xl={10}><Card title="Học viên theo ngôn ngữ" extra={<Student size={22} />}><Flex vertical gap={18}>{languageShare.map((item) => <div key={item.language}><Flex justify="space-between"><Typography.Text strong>{item.language}</Typography.Text><Typography.Text type="secondary">{item.students} học viên</Typography.Text></Flex><Progress percent={totalStudents ? Math.round(Number(item.students) * 100 / totalStudents) : 0} size="small" /></div>)}</Flex></Card></Col>
      <Col span={24}><Card title="Hiệu quả theo khóa học" extra={<Flex align="center" gap={6}><CheckCircle color="#397359" /><Typography.Text type="secondary">{periodLabel}</Typography.Text></Flex>}><Table rowKey="id" columns={columns} dataSource={coursePerformance} pagination={false} scroll={{ x: 760 }} /></Card></Col>
      <Col span={24}><Card title="Kết quả học tập theo lớp" extra={<Space wrap><Typography.Text>Đạt: {report.academicMetrics.passed}</Typography.Text><Typography.Text>Không đạt: {report.academicMetrics.failed}</Typography.Text><Typography.Text>Chưa có kết quả: {report.academicMetrics.pending}</Typography.Text></Space>}><Table<ClassPerformance> rowKey="id" dataSource={report.classPerformance} pagination={{ pageSize: 8 }} scroll={{ x: 1000 }} columns={[
        { title: 'Mã lớp', dataIndex: 'classCode' }, { title: 'Lớp học', dataIndex: 'className' }, { title: 'Khóa học', dataIndex: 'courseName' },
        { title: 'Ghi danh trong kỳ', dataIndex: 'students' }, { title: 'Đạt', dataIndex: 'passed' }, { title: 'Không đạt', dataIndex: 'failed' }, { title: 'Chưa có kết quả', dataIndex: 'pending' },
        { title: 'Điểm trung bình', dataIndex: 'average', render: academicScore },
      ]} /></Card></Col>
    </Row>
    </>}
  </AdminLayout>
}
export default AdminReports
