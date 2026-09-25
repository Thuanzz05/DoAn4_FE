import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  ClipboardText,
  Clock,
  Exam,
  MapPin,
  UsersThree,
} from '@phosphor-icons/react'
import { Alert, Button, Card, Col, Flex, Progress, Row, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import TeacherLayout, { type TeacherPage } from './TeacherLayout'
import './TeacherDashboard.css'

type TeacherDashboardProps = {
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

type ClassRow = {
  key: string
  name: string
  code: string
  schedule: string
  students: number
  attendance: number
  nextTask: string
}

const classes: ClassRow[] = [
  { key: '1', name: 'A2 Giao tiếp', code: 'TA-A2-04', schedule: 'T2 · T4 · 18:00', students: 18, attendance: 82, nextTask: 'Điểm danh' },
  { key: '2', name: 'IELTS 6.5', code: 'IELTS-65-02', schedule: 'T3 · T5 · 19:45', students: 14, attendance: 76, nextTask: 'Nhập điểm' },
  { key: '3', name: 'B1 Tổng quát', code: 'TA-B1-07', schedule: 'T7 · CN · 08:00', students: 20, attendance: 91, nextTask: 'Xem lớp' },
]

const todaySessions = [
  { time: '18:00–19:30', name: 'A2 Giao tiếp', room: 'P.201', students: 18, status: 'Sắp diễn ra', color: 'blue' },
  { time: '19:45–21:15', name: 'IELTS 6.5', room: 'P.302', students: 14, status: 'Đổi phòng', color: 'orange' },
]

function TeacherDashboard({ onLogout, onNavigate, onNavigateHome }: TeacherDashboardProps) {
  const [messageApi, contextHolder] = message.useMessage()
  const comingSoon = (label: string) => messageApi.info(`${label} sẽ được thực hiện ở trang tiếp theo.`)

  const columns: ColumnsType<ClassRow> = [
    {
      title: 'Lớp học',
      dataIndex: 'name',
      render: (_, record) => <div className="admin-entity"><span className="teacher-class-mark">{record.name.slice(0, 2)}</span><div><strong>{record.name}</strong><small>{record.code}</small></div></div>,
    },
    { title: 'Lịch học', dataIndex: 'schedule' },
    { title: 'Học viên', dataIndex: 'students', render: (value) => `${value} học viên` },
    {
      title: 'Chuyên cần',
      dataIndex: 'attendance',
      render: (value) => <Progress percent={value} size="small" status={value < 80 ? 'exception' : 'success'} />,
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      render: (_, record) => <Button type="link" onClick={() => record.nextTask === 'Nhập điểm' ? onNavigate('teacher-grades') : record.nextTask === 'Điểm danh' ? onNavigate('teacher-attendance') : comingSoon(record.nextTask)}>{record.nextTask}<ArrowRight /></Button>,
    },
  ]

  return (
    <TeacherLayout activePage="teacher" mainId="teacher-dashboard" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      {contextHolder}
      <AdminPageHeader
        kicker="Không gian giáo viên"
        title="Tổng quan giảng dạy"
        description="Theo dõi lịch dạy, công việc cần hoàn tất và tình hình các lớp đang phụ trách."
        actions={<Button type="primary" icon={<CalendarBlank />} onClick={() => onNavigate('teacher-schedule')}>Xem thời khóa biểu</Button>}
      />

      <AdminSummary items={[
        { label: 'Lớp phụ trách', value: 3, detail: '52 học viên đang theo học', icon: <UsersThree weight="duotone" /> },
        { label: 'Buổi dạy tuần này', value: 7, detail: '2 buổi trong hôm nay', icon: <CalendarBlank weight="duotone" /> },
        { label: 'Chưa điểm danh', value: 2, detail: 'Cần hoàn tất trong hôm nay', icon: <ClipboardText weight="duotone" />, tone: 'danger' },
        { label: 'Bảng điểm cần nhập', value: 1, detail: 'Hạn cập nhật 26/09', icon: <Exam weight="duotone" /> },
      ]} />

      <Alert className="teacher-alert" type="warning" showIcon title="Thay đổi lịch dạy" description="Lớp IELTS 6.5 tối nay chuyển sang P.302. Danh sách học viên không thay đổi." />

      <Row gutter={[16, 16]} className="teacher-dashboard-grid">
        <Col xs={24} xl={15}>
          <Card title="Lịch dạy hôm nay" extra={<Button type="link" onClick={() => onNavigate('teacher-schedule')}>Xem cả tuần</Button>}>
            <Space orientation="vertical" size={0} className="teacher-session-list">
              {todaySessions.map((session) => (
                <Flex className="teacher-session" align="center" gap={16} key={session.time} wrap>
                  <div className="teacher-session-time"><Clock weight="duotone" /><strong>{session.time}</strong></div>
                  <div className="teacher-session-info"><Typography.Text strong>{session.name}</Typography.Text><Typography.Text type="secondary"><MapPin />{session.room} · {session.students} học viên</Typography.Text></div>
                  <Tag color={session.color}>{session.status}</Tag>
                  <Button onClick={() => onNavigate('teacher-attendance')}>Mở lớp</Button>
                </Flex>
              ))}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card title="Việc cần hoàn tất" className="teacher-tasks-card">
            <button type="button" onClick={() => onNavigate('teacher-attendance')}>
              <span className="teacher-task-icon danger"><ClipboardText weight="duotone" /></span>
              <span><strong>Hoàn tất điểm danh</strong><small>B1 Tổng quát · Buổi 17/09</small></span>
              <Tag color="red">Quá hạn</Tag>
            </button>
            <button type="button" onClick={() => onNavigate('teacher-grades')}>
              <span className="teacher-task-icon warning"><Exam weight="duotone" /></span>
              <span><strong>Nhập điểm bốn kỹ năng</strong><small>IELTS 6.5 · Hạn 26/09</small></span>
              <ArrowRight />
            </button>
            <div className="teacher-task-done"><CheckCircle weight="fill" /><span><strong>Đã cập nhật giáo án tuần 4</strong><small>A2 Giao tiếp</small></span></div>
          </Card>
        </Col>
      </Row>

      <Card title="Lớp đang phụ trách" className="admin-table-card teacher-classes-card" extra={<Typography.Text type="secondary">Học kỳ 2 · 2026</Typography.Text>}>
        <Table columns={columns} dataSource={classes} pagination={false} scroll={{ x: 760 }} />
      </Card>
    </TeacherLayout>
  )
}

export default TeacherDashboard
