import { useState } from 'react'
import { Certificate, ChartBar, CheckCircle, DownloadSimple, Receipt, Student, TrendUp } from '@phosphor-icons/react'
import { Button, Card, Col, Flex, Progress, Row, Select, Space, Table, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import './AdminReports.css'

type Period = 'Tháng 9/2026' | 'Quý 3/2026' | 'Năm 2026'
type CoursePerformance = { course: string; classes: number; students: number; completion: number; revenue: string }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const revenueByMonth = [{ month: 'T4', value: 72 }, { month: 'T5', value: 84 }, { month: 'T6', value: 68 }, { month: 'T7', value: 91 }, { month: 'T8', value: 78 }, { month: 'T9', value: 100 }]
const languageShare = [{ language: 'Tiếng Anh', students: 126, percent: 51 }, { language: 'Tiếng Hàn', students: 48, percent: 19 }, { language: 'Tiếng Trung', students: 37, percent: 15 }, { language: 'Tiếng Nhật', students: 25, percent: 10 }, { language: 'Khác', students: 12, percent: 5 }]
const coursePerformance: CoursePerformance[] = [
  { course: 'Tiếng Anh A2', classes: 5, students: 72, completion: 92, revenue: '38.400.000đ' },
  { course: 'Tiếng Anh B1', classes: 4, students: 58, completion: 88, revenue: '31.200.000đ' },
  { course: 'Luyện thi IELTS 6.5', classes: 3, students: 41, completion: 85, revenue: '28.800.000đ' },
  { course: 'Tiếng Hàn TOPIK I', classes: 3, students: 36, completion: 89, revenue: '17.600.000đ' },
  { course: 'Tiếng Trung HSK 3', classes: 2, students: 26, completion: 81, revenue: '10.800.000đ' },
]
const periodMetrics: Record<Period, { revenue: string; debt: string; students: string; certificates: string }> = { 'Tháng 9/2026': { revenue: '126,8 tr', debt: '18,4 tr', students: '248', certificates: '36' }, 'Quý 3/2026': { revenue: '347,2 tr', debt: '31,6 tr', students: '312', certificates: '94' }, 'Năm 2026': { revenue: '1,18 tỷ', debt: '42,8 tr', students: '486', certificates: '278' } }

function AdminReports({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [period, setPeriod] = useState<Period>('Tháng 9/2026')
  const [messageApi, contextHolder] = message.useMessage()
  const metrics = periodMetrics[period]
  const exportCsv = () => {
    const rows = [['Khóa học', 'Số lớp', 'Học viên', 'Hoàn thành', 'Doanh thu'], ...coursePerformance.map((item) => [item.course, item.classes, item.students, `${item.completion}%`, item.revenue])]
    const url = URL.createObjectURL(new Blob([`\uFEFF${rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'bao-cao.csv'; link.click(); URL.revokeObjectURL(url)
    messageApi.success(`Đã xuất báo cáo ${period}`)
  }
  const columns: TableProps<CoursePerformance>['columns'] = [
    { title: 'Khóa học', dataIndex: 'course', render: (value) => <Typography.Text strong>{value}</Typography.Text> },
    { title: 'Số lớp', dataIndex: 'classes' }, { title: 'Học viên', dataIndex: 'students' },
    { title: 'Hoàn thành', dataIndex: 'completion', width: 190, render: (value: number) => <Progress percent={value} size="small" /> },
    { title: 'Doanh thu', dataIndex: 'revenue', render: (value) => <Typography.Text strong>{value}</Typography.Text> },
  ]
  return <AdminLayout activePage="reports" mainId="report-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}
    <AdminPageHeader kicker="Dữ liệu điều hành" title="Báo cáo thống kê" description="Theo dõi tài chính, quy mô đào tạo và kết quả theo từng kỳ." actions={<Space><Select value={period} onChange={setPeriod} options={Object.keys(periodMetrics).map((value) => ({ value, label: value }))} /><Button type="primary" icon={<DownloadSimple />} onClick={exportCsv}>Xuất CSV</Button></Space>} />
    <AdminSummary items={[{ label: 'Doanh thu', value: metrics.revenue, detail: 'Tăng 12,6% so với kỳ trước', icon: <TrendUp weight="duotone" />, tone: 'success' }, { label: 'Công nợ', value: metrics.debt, detail: 'Giảm 6,2% so với kỳ trước', icon: <Receipt weight="duotone" />, tone: 'danger' }, { label: 'Học viên', value: metrics.students, detail: '18 lớp đang hoạt động', icon: <Student weight="duotone" /> }, { label: 'Chứng chỉ đã cấp', value: metrics.certificates, detail: '91% học viên đủ điều kiện', icon: <Certificate weight="duotone" /> }]} />
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} xl={14}><Card title="Xu hướng doanh thu" extra={<ChartBar size={22} />}><div className="report-bars" role="img" aria-label="Doanh thu sáu tháng gần nhất">{revenueByMonth.map((item) => <div key={item.month}><span className="report-bar-value">{item.value}%</span><span className="report-bar-track"><span style={{ height: `${item.value}%` }} /></span><strong>{item.month}</strong></div>)}</div></Card></Col>
      <Col xs={24} xl={10}><Card title="Học viên theo ngôn ngữ" extra={<Student size={22} />}><Flex vertical gap={18}>{languageShare.map((item) => <div key={item.language}><Flex justify="space-between"><Typography.Text strong>{item.language}</Typography.Text><Typography.Text type="secondary">{item.students} học viên</Typography.Text></Flex><Progress percent={item.percent} size="small" /></div>)}</Flex></Card></Col>
      <Col span={24}><Card title="Hiệu quả theo khóa học" extra={<Flex align="center" gap={6}><CheckCircle color="#397359" /><Typography.Text type="secondary">{period}</Typography.Text></Flex>}><Table rowKey="course" columns={columns} dataSource={coursePerformance} pagination={false} scroll={{ x: 760 }} /></Card></Col>
    </Row>
  </AdminLayout>
}
export default AdminReports
