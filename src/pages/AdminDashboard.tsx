import { CalendarBlank, ChalkboardTeacher, CheckCircle, Clock, Receipt, Student, WarningCircle } from '@phosphor-icons/react'
import { Button, Card, Col, Flex, Row, Table, Tag, Typography } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'

type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }
type Payment = { student: string; code: string; amount: string; status: 'Chưa nộp' | 'Đã nộp' }

const todaySchedule = [
  { time: '08:00', course: 'A2 Giao tiếp', room: 'P.201', teacher: 'GV. Minh', status: 'Đang học' },
  { time: '10:00', course: 'B1 Tổng quát', room: 'P.105', teacher: 'GV. Lan', status: 'Sắp diễn ra' },
  { time: '14:00', course: 'IELTS 6.5', room: 'P.302', teacher: 'GV. Hùng', status: 'Sắp diễn ra' },
  { time: '18:00', course: 'A2 Giao tiếp', room: 'P.201', teacher: 'GV. Minh', status: 'Sắp diễn ra' },
]
const payments: Payment[] = [
  { student: 'Nguyễn Khánh Linh', code: 'HV-0248', amount: '2.400.000đ', status: 'Chưa nộp' },
  { student: 'Trần Gia Huy', code: 'HV-0217', amount: '1.800.000đ', status: 'Đã nộp' },
  { student: 'Lê Minh Anh', code: 'HV-0196', amount: '2.400.000đ', status: 'Chưa nộp' },
  { student: 'Phạm Quang Duy', code: 'HV-0173', amount: '1.800.000đ', status: 'Đã nộp' },
]
const alerts = [
  { title: 'Hai lịch học cần kiểm tra', detail: 'Có khả năng trùng phòng trong khung giờ 18:00.', page: 'schedule' as AdminPage },
  { title: 'Năm hóa đơn sắp đến hạn', detail: 'Kế toán cần xác nhận trạng thái trước ngày thi.', page: 'invoices' as AdminPage },
  { title: 'Ba học viên chưa đủ điều kiện thi', detail: 'Chuyên cần hoặc học phí chưa đạt yêu cầu.', page: 'certificates' as AdminPage },
]

function AdminDashboard({ onLogout, onNavigate, onNavigateHome }: Props) {
  const paymentColumns: TableProps<Payment>['columns'] = [
    { title: 'Học viên', dataIndex: 'student', render: (value, item) => <div className="admin-entity"><div><strong>{value}</strong><small>{item.code}</small></div></div> },
    { title: 'Số tiền', dataIndex: 'amount' },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: Payment['status']) => <Tag icon={value === 'Đã nộp' ? <CheckCircle weight="fill" /> : undefined} color={value === 'Đã nộp' ? 'green' : 'red'}>{value}</Tag> },
  ]
  return <AdminLayout activePage="admin" mainId="dashboard-top" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    <AdminPageHeader kicker="Hôm nay" title="Tổng quan vận hành" description="Theo dõi các thông tin cần xử lý trong ngày tại một nơi." actions={<Button type="primary" onClick={() => onNavigate('reports')}>Xem báo cáo</Button>} />
    <AdminSummary items={[{ label: 'Học viên đang học', value: 248, detail: '12 hồ sơ mới trong tháng', icon: <Student weight="duotone" />, tone: 'success' }, { label: 'Lớp đang hoạt động', value: 18, detail: '7 lớp có lịch hôm nay', icon: <ChalkboardTeacher weight="duotone" /> }, { label: 'Buổi học hôm nay', value: '07', detail: 'Buổi đầu tiên lúc 08:00', icon: <CalendarBlank weight="duotone" /> }, { label: 'Hóa đơn chưa nộp', value: 12, detail: '5 hóa đơn sắp đến hạn', icon: <Receipt weight="duotone" />, tone: 'danger' }]} />
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} xl={15}><Card title="Lịch hôm nay" extra={<Clock size={22} />}><Flex vertical>{todaySchedule.map((item) => <Flex className="admin-dashboard-row" align="center" justify="space-between" gap={16} key={`${item.time}-${item.course}`}><Flex gap={14}><Typography.Text strong>{item.time}</Typography.Text><div><Typography.Text strong>{item.course}</Typography.Text><br /><Typography.Text type="secondary">{item.room} · {item.teacher}</Typography.Text></div></Flex><Tag color={item.status === 'Đang học' ? 'green' : 'default'}>{item.status}</Tag></Flex>)}</Flex></Card></Col>
      <Col xs={24} xl={9}><Card title="Cần xử lý" extra={<WarningCircle size={22} />}><Flex vertical>{alerts.map((item) => <Flex className="admin-dashboard-row" align="flex-start" justify="space-between" gap={12} key={item.title}><Flex gap={10}><WarningCircle size={20} color="#d44735" /><div><Typography.Text strong>{item.title}</Typography.Text><br /><Typography.Text type="secondary">{item.detail}</Typography.Text></div></Flex><Button type="link" onClick={() => onNavigate(item.page)}>Mở</Button></Flex>)}</Flex></Card></Col>
      <Col span={24}><Card title="Trạng thái học phí" extra={<Button type="link" onClick={() => onNavigate('invoices')}>Xem tất cả</Button>}><Table rowKey="code" columns={paymentColumns} dataSource={payments} pagination={false} scroll={{ x: 560 }} /></Card></Col>
    </Row>
  </AdminLayout>
}
export default AdminDashboard
