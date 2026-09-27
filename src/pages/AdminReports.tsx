import { useEffect, useState } from 'react'
import { Certificate, ChartBar, CheckCircle, DownloadSimple, Receipt, Student, TrendUp } from '@phosphor-icons/react'
import { Button, Card, Col, Flex, Progress, Row, Select, Space, Table, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import './AdminReports.css'
import { api, errorMessage } from '../api'

type Period = 'month' | 'quarter' | 'year'
type CoursePerformance = { id: number; courseName: string; classes: number; students: number; completion: number | null; revenue: number }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }
type Report = { metrics: { revenue: number; debt: number; students: number; activeClasses: number; certificates: number }; revenueByMonth: Array<{ month: string; revenue: number }>; languageShare: Array<{ language: string; students: number }>; coursePerformance: CoursePerformance[] }
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`
const periodLabels: Record<Period, string> = { month: 'Tháng này', quarter: 'Quý này', year: 'Năm nay' }

function AdminReports({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [period, setPeriod] = useState<Period>('month')
  const [report, setReport] = useState<Report>({ metrics: { revenue: 0, debt: 0, students: 0, activeClasses: 0, certificates: 0 }, revenueByMonth: [], languageShare: [], coursePerformance: [] })
  const [messageApi, contextHolder] = message.useMessage()
  useEffect(() => { api<Report>(`/reports?period=${period}`).then(setReport).catch((error) => messageApi.error(errorMessage(error))) }, [messageApi, period])
  const { metrics, revenueByMonth, languageShare, coursePerformance } = report
  const maxRevenue = Math.max(1, ...revenueByMonth.map((item) => Number(item.revenue)))
  const totalStudents = languageShare.reduce((sum, item) => sum + Number(item.students), 0)
  const exportCsv = () => {
    const rows = [['Khóa học', 'Số lớp', 'Học viên', 'Hoàn thành', 'Doanh thu'], ...coursePerformance.map((item) => [item.courseName, item.classes, item.students, `${item.completion ?? 0}%`, item.revenue])]
    const url = URL.createObjectURL(new Blob([`\uFEFF${rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'bao-cao.csv'; link.click(); URL.revokeObjectURL(url)
    messageApi.success(`Đã xuất báo cáo ${periodLabels[period]}`)
  }
  const columns: TableProps<CoursePerformance>['columns'] = [
    { title: 'Khóa học', dataIndex: 'courseName', render: (value) => <Typography.Text strong>{value}</Typography.Text> },
    { title: 'Số lớp', dataIndex: 'classes' }, { title: 'Học viên', dataIndex: 'students' },
    { title: 'Hoàn thành', dataIndex: 'completion', width: 190, render: (value: number | null) => <Progress percent={Number(value ?? 0)} size="small" /> },
    { title: 'Doanh thu', dataIndex: 'revenue', render: (value) => <Typography.Text strong>{money(Number(value))}</Typography.Text> },
  ]
  return <AdminLayout activePage="reports" mainId="report-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}
    <AdminPageHeader kicker="Dữ liệu điều hành" title="Báo cáo thống kê" description="Theo dõi tài chính, quy mô đào tạo và kết quả theo từng kỳ." actions={<Space><Select value={period} onChange={setPeriod} options={Object.entries(periodLabels).map(([value, label]) => ({ value, label }))} /><Button type="primary" icon={<DownloadSimple />} onClick={exportCsv}>Xuất CSV</Button></Space>} />
    <AdminSummary items={[{ label: 'Doanh thu', value: money(Number(metrics.revenue)), detail: periodLabels[period], icon: <TrendUp weight="duotone" />, tone: 'success' }, { label: 'Công nợ', value: money(Number(metrics.debt)), detail: 'Chưa thanh toán trong kỳ', icon: <Receipt weight="duotone" />, tone: 'danger' }, { label: 'Học viên', value: Number(metrics.students), detail: `${metrics.activeClasses} lớp đang hoạt động`, icon: <Student weight="duotone" /> }, { label: 'Chứng chỉ đã cấp', value: Number(metrics.certificates), detail: periodLabels[period], icon: <Certificate weight="duotone" /> }]} />
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} xl={14}><Card title="Xu hướng doanh thu" extra={<ChartBar size={22} />}><div className="report-bars" role="img" aria-label="Doanh thu sáu tháng gần nhất">{revenueByMonth.map((item) => { const value = Math.round(Number(item.revenue) * 100 / maxRevenue); return <div key={item.month}><span className="report-bar-value">{money(Number(item.revenue))}</span><span className="report-bar-track"><span style={{ height: `${value}%` }} /></span><strong>{item.month}</strong></div> })}</div></Card></Col>
      <Col xs={24} xl={10}><Card title="Học viên theo ngôn ngữ" extra={<Student size={22} />}><Flex vertical gap={18}>{languageShare.map((item) => <div key={item.language}><Flex justify="space-between"><Typography.Text strong>{item.language}</Typography.Text><Typography.Text type="secondary">{item.students} học viên</Typography.Text></Flex><Progress percent={totalStudents ? Math.round(Number(item.students) * 100 / totalStudents) : 0} size="small" /></div>)}</Flex></Card></Col>
      <Col span={24}><Card title="Hiệu quả theo khóa học" extra={<Flex align="center" gap={6}><CheckCircle color="#397359" /><Typography.Text type="secondary">{periodLabels[period]}</Typography.Text></Flex>}><Table rowKey="id" columns={columns} dataSource={coursePerformance} pagination={false} scroll={{ x: 760 }} /></Card></Col>
    </Row>
  </AdminLayout>
}
export default AdminReports
