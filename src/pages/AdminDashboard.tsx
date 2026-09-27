import { CalendarBlank, ChalkboardTeacher, CheckCircle, Clock, Receipt, Student, WarningCircle } from '@phosphor-icons/react'
import { Button, Card, Col, Flex, Row, Table, Tag, Typography } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { api } from '../api'

type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }
type Payment = { student: string; code: string; amount: string; status: 'Chưa nộp' | 'Đã nộp' }
type DashboardData = {
  metrics: { students: number; activeClasses: number; debt: number; overdueInvoices: number; certificatesWaitingIssue: number }
  todaySessions: Array<{ id: number; startsAt: string; className: string; roomCode: string; teacherName: string; status: string }>
}
type InvoiceApi = { id: number; studentName: string; studentCode: string; amount: number; status: string }

function AdminDashboard({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [dashboard, setDashboard] = useState<DashboardData>({ metrics: { students: 0, activeClasses: 0, debt: 0, overdueInvoices: 0, certificatesWaitingIssue: 0 }, todaySessions: [] })
  const [payments, setPayments] = useState<Payment[]>([])
  useEffect(() => {
    Promise.all([api<DashboardData>('/admin/dashboard'), api<InvoiceApi[]>('/invoices')]).then(([summary, invoices]) => {
      setDashboard(summary)
      setPayments(invoices.slice(0, 5).map((item) => ({ student: item.studentName, code: item.studentCode, amount: `${new Intl.NumberFormat('vi-VN').format(item.amount)}đ`, status: item.status === 'da_thanh_toan' ? 'Đã nộp' : 'Chưa nộp' })))
    }).catch(() => undefined)
  }, [])
  const todaySchedule = dashboard.todaySessions.map((item) => ({
    time: new Date(item.startsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    course: item.className, room: item.roomCode, teacher: item.teacherName,
    status: item.status === 'da_hoc' ? 'Đã học' : 'Sắp diễn ra',
  }))
  const alerts = [
    { title: `${dashboard.metrics.overdueInvoices} hóa đơn quá hạn`, detail: 'Cần xác nhận hoặc liên hệ học viên.', page: 'invoices' as AdminPage },
    { title: `${dashboard.metrics.certificatesWaitingIssue} chứng chỉ chờ cấp`, detail: 'Hồ sơ đã duyệt đang chờ phát hành.', page: 'certificates' as AdminPage },
  ]
  const paymentColumns: TableProps<Payment>['columns'] = [
    { title: 'Học viên', dataIndex: 'student', render: (value, item) => <div className="admin-entity"><div><strong>{value}</strong><small>{item.code}</small></div></div> },
    { title: 'Số tiền', dataIndex: 'amount' },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: Payment['status']) => <Tag icon={value === 'Đã nộp' ? <CheckCircle weight="fill" /> : undefined} color={value === 'Đã nộp' ? 'green' : 'red'}>{value}</Tag> },
  ]
  return <AdminLayout activePage="admin" mainId="dashboard-top" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    <AdminPageHeader kicker="Hôm nay" title="Tổng quan vận hành" description="Theo dõi các thông tin cần xử lý trong ngày tại một nơi." actions={<Button type="primary" onClick={() => onNavigate('reports')}>Xem báo cáo</Button>} />
    <AdminSummary items={[{ label: 'Học viên đang học', value: dashboard.metrics.students, detail: 'Tài khoản đang hoạt động', icon: <Student weight="duotone" />, tone: 'success' }, { label: 'Lớp đang hoạt động', value: dashboard.metrics.activeClasses, detail: `${todaySchedule.length} lớp có lịch hôm nay`, icon: <ChalkboardTeacher weight="duotone" /> }, { label: 'Buổi học hôm nay', value: todaySchedule.length, detail: 'Theo lịch đã sinh', icon: <CalendarBlank weight="duotone" /> }, { label: 'Công nợ', value: new Intl.NumberFormat('vi-VN').format(dashboard.metrics.debt), detail: `${dashboard.metrics.overdueInvoices} hóa đơn quá hạn`, icon: <Receipt weight="duotone" />, tone: 'danger' }]} />
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} xl={15}><Card title="Lịch hôm nay" extra={<Clock size={22} />}><Flex vertical>{todaySchedule.map((item) => <Flex className="admin-dashboard-row" align="center" justify="space-between" gap={16} key={`${item.time}-${item.course}`}><Flex gap={14}><Typography.Text strong>{item.time}</Typography.Text><div><Typography.Text strong>{item.course}</Typography.Text><br /><Typography.Text type="secondary">{item.room} · {item.teacher}</Typography.Text></div></Flex><Tag color={item.status === 'Đang học' ? 'green' : 'default'}>{item.status}</Tag></Flex>)}</Flex></Card></Col>
      <Col xs={24} xl={9}><Card title="Cần xử lý" extra={<WarningCircle size={22} />}><Flex vertical>{alerts.map((item) => <Flex className="admin-dashboard-row" align="flex-start" justify="space-between" gap={12} key={item.title}><Flex gap={10}><WarningCircle size={20} color="#d44735" /><div><Typography.Text strong>{item.title}</Typography.Text><br /><Typography.Text type="secondary">{item.detail}</Typography.Text></div></Flex><Button type="link" onClick={() => onNavigate(item.page)}>Mở</Button></Flex>)}</Flex></Card></Col>
      <Col span={24}><Card title="Trạng thái học phí" extra={<Button type="link" onClick={() => onNavigate('invoices')}>Xem tất cả</Button>}><Table rowKey="code" columns={paymentColumns} dataSource={payments} pagination={false} scroll={{ x: 560 }} /></Card></Col>
    </Row>
  </AdminLayout>
}
export default AdminDashboard
import { useEffect, useState } from 'react'
