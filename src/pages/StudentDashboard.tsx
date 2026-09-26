import {
  ArrowRight,
  CalendarBlank,
  Certificate,
  ChalkboardTeacher,
  ChartBar,
  CheckCircle,
  Clock,
  MapPin,
  Receipt,
  Student,
  WarningCircle,
} from '@phosphor-icons/react'
import { Alert, Button, Card, Col, Flex, Progress, Row, Space, Tag, Typography, message } from 'antd'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentDashboard.css'

type StudentDashboardProps = {
  onLogout: () => void
  onNavigate: (page: StudentPage) => void
  onNavigateHome: () => void
}

const skills = [
  { label: 'Nghe', value: 7.0 },
  { label: 'Nói', value: 6.5 },
  { label: 'Đọc', value: 7.5 },
  { label: 'Viết', value: 6.0 },
]

function StudentDashboard({ onLogout, onNavigate, onNavigateHome }: StudentDashboardProps) {
  const [messageApi, contextHolder] = message.useMessage()
  const comingSoon = (label: string) => messageApi.info(`${label} sẽ được thực hiện ở trang tiếp theo.`)

  return (
    <StudentLayout activePage="student" mainId="student-dashboard" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      {contextHolder}
      <AdminPageHeader
        kicker="Không gian học viên"
        title="Chào bạn, Minh Anh"
        description="Theo dõi lịch học, kết quả, chuyên cần và học phí của bạn tại một nơi."
        actions={<Button type="primary" icon={<CalendarBlank />} onClick={() => onNavigate('student-schedule')}>Xem lịch học</Button>}
      />

      <AdminSummary items={[
        { label: 'Lớp đang học', value: 1, detail: 'A2 Giao tiếp · TA-A2-04', icon: <Student weight="duotone" /> },
        { label: 'Chuyên cần', value: '86%', detail: '12 có mặt · 1 muộn · 1 vắng', icon: <CheckCircle weight="duotone" />, tone: 'success' },
        { label: 'Điểm trung bình', value: '6.8', detail: 'Kết quả giữa khóa', icon: <ChartBar weight="duotone" /> },
        { label: 'Công nợ', value: '2,4 tr', detail: 'Hạn thanh toán 28/09', icon: <Receipt weight="duotone" />, tone: 'danger' },
      ]} />

      <Alert className="student-dashboard-alert" type="warning" showIcon title="Học phí sắp đến hạn" description="Hoàn tất hóa đơn HP-2026-0918 trước ngày 28/09 để không ảnh hưởng điều kiện dự thi." action={<Button size="small" onClick={() => comingSoon('Công nợ học phí')}>Xem hóa đơn</Button>} />

      <Row className="student-dashboard-grid" gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Buổi học tiếp theo" extra={<Button type="link" onClick={() => onNavigate('student-schedule')}>Xem lịch tuần</Button>}>
            <div className="student-next-class">
              <div className="student-class-date"><span>Thứ Sáu</span><strong>25</strong><small>Tháng 09</small></div>
              <div className="student-class-info">
                <Tag color="blue">Sắp diễn ra</Tag>
                <Typography.Title level={3}>A2 Giao tiếp</Typography.Title>
                <Space wrap size={18}><span><Clock />18:00–19:30</span><span><MapPin />P.201</span><span><ChalkboardTeacher />GV. Nguyễn Quốc Minh</span></Space>
              </div>
            </div>
            <Flex className="student-class-notice" align="center" gap={10}><WarningCircle weight="fill" /><Typography.Text>Phòng học đã đổi từ P.203 sang P.201.</Typography.Text></Flex>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="Tiến độ khóa học">
            <div className="student-course-progress"><Flex justify="space-between"><Typography.Text strong>A2 Giao tiếp</Typography.Text><Typography.Text type="secondary">Buổi 14/24</Typography.Text></Flex><Progress percent={58} strokeColor="#397359" /></div>
            <div className="student-course-meta"><span><small>Khai giảng</small><strong>12/08/2026</strong></span><span><small>Dự kiến kết thúc</small><strong>30/10/2026</strong></span></div>
            <Button block onClick={() => comingSoon('Chi tiết lớp học')}>Xem chi tiết lớp <ArrowRight /></Button>
          </Card>
        </Col>
      </Row>

      <Row className="student-dashboard-grid" gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Kết quả giữa khóa" extra={<Button type="link" onClick={() => onNavigate('student-results')}>Xem tất cả</Button>}>
            <div className="student-skill-grid">{skills.map((skill) => <div key={skill.label}><span>{skill.label}</span><strong>{skill.value.toFixed(1)}</strong><Progress percent={skill.value * 10} showInfo={false} strokeColor="#397359" /></div>)}</div>
            <Flex className="student-score-total" align="center" justify="space-between"><span><small>Điểm trung bình</small><strong>6.8</strong></span><Tag color="green">Đạt yêu cầu</Tag></Flex>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Học phí và chứng chỉ">
            <button className="student-status-row" type="button" onClick={() => comingSoon('Chi tiết hóa đơn')}><span className="student-status-icon warning"><Receipt weight="duotone" /></span><span><strong>Học phí còn lại</strong><small>HP-2026-0918 · Hạn 28/09</small></span><b>2.400.000đ</b><ArrowRight /></button>
            <button className="student-status-row" type="button" onClick={() => comingSoon('Kết quả xét chứng chỉ')}><span className="student-status-icon"><Certificate weight="duotone" /></span><span><strong>Chứng chỉ cuối khóa</strong><small>Được xét sau khi hoàn thành khóa học</small></span><Tag>Chưa xét</Tag><ArrowRight /></button>
          </Card>
        </Col>
      </Row>
    </StudentLayout>
  )
}

export default StudentDashboard
