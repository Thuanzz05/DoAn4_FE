import { useEffect, useState } from 'react'
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
import { Alert, Button, Card, Col, Flex, Progress, Row, Skeleton, Space, Tag, Typography } from 'antd'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentDashboard.css'
import { api, errorMessage } from '../api'
import StudentClasses from './StudentClasses'

type StudentDashboardProps = {
  onLogout: () => void
  onNavigate: (page: StudentPage) => void
  onNavigateHome: () => void
}

type Dashboard = { user: { fullName: string }; activeClasses: number; present: number; late: number; absent: number; attendanceRate: number; expectedAttendance: number; recordedAttendance: number; courseProgress: number; issuedCertificates: number; approvedCertificates: number; outstanding: number; nearestDueDate: string | null; nextSession: null | { className: string; startsAt: string; endsAt: string; roomCode: string; teacherName: string } }
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

function StudentDashboard({ onLogout, onNavigate, onNavigateHome }: StudentDashboardProps) {
  const [data, setData] = useState<Dashboard>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; api<Dashboard>('/student/dashboard').then((result) => { if (active) setData(result) }).catch((err) => { if (active) setError(errorMessage(err)) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const expectedAttendance = Number(data?.expectedAttendance ?? 0)
  const recordedAttendance = Number(data?.recordedAttendance ?? 0)
  const attendanceRate = Number(data?.attendanceRate ?? 0)
  const next = data?.nextSession
  const startsAt = next ? new Date(next.startsAt) : null
  const issuedCertificates = Number(data?.issuedCertificates ?? 0)
  const approvedCertificates = Number(data?.approvedCertificates ?? 0)
  const certificateLabel = [
    issuedCertificates ? `${issuedCertificates} đã cấp` : '',
    approvedCertificates ? `${approvedCertificates} đã duyệt` : '',
  ].filter(Boolean).join(' · ') || 'Chưa xét'

  return (
    <StudentLayout activePage="student" mainId="student-dashboard" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      {error && <Alert type="error" showIcon title={error} />}
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : data && <>
      <AdminPageHeader
        kicker="Không gian học viên"
        title={`Chào bạn, ${data?.user.fullName ?? 'học viên'}`}
        description="Theo dõi lịch học, kết quả, chuyên cần và học phí của bạn tại một nơi."
        actions={<Button type="primary" icon={<CalendarBlank />} onClick={() => onNavigate('student-schedule')}>Xem lịch học</Button>}
      />

      <AdminSummary items={[
        { label: 'Lớp đang học', value: Number(data?.activeClasses ?? 0), detail: 'Lớp đang hoạt động', icon: <Student weight="duotone" /> },
        { label: 'Chuyên cần', value: expectedAttendance ? `${attendanceRate.toFixed(1)}%` : '—', detail: `${recordedAttendance}/${expectedAttendance} buổi đã điểm danh · ${expectedAttendance - recordedAttendance} buổi còn thiếu`, icon: <CheckCircle weight="duotone" />, tone: attendanceRate >= 80 ? 'success' : undefined },
        { label: 'Buổi tiếp theo', value: next ? startsAt?.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) ?? '—' : '—', detail: next?.className ?? 'Chưa có lịch', icon: <ChartBar weight="duotone" /> },
        { label: 'Công nợ', value: money(Number(data?.outstanding ?? 0)), detail: data?.nearestDueDate ? `Hạn ${new Date(data.nearestDueDate).toLocaleDateString('vi-VN')}` : 'Không còn công nợ', icon: <Receipt weight="duotone" />, tone: Number(data?.outstanding ?? 0) ? 'danger' : 'success' },
      ]} />

      {Number(data?.outstanding ?? 0) > 0 && <Alert className="student-dashboard-alert" type="warning" showIcon title="Bạn còn học phí chưa thanh toán" description={`Công nợ hiện tại ${money(Number(data?.outstanding ?? 0))}.`} action={<Button size="small" onClick={() => onNavigate('student-invoices')}>Xem hóa đơn</Button>} />}

      <Row className="student-dashboard-grid" gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Buổi học tiếp theo" extra={<Button type="link" onClick={() => onNavigate('student-schedule')}>Xem lịch tuần</Button>}>
            <div className="student-next-class">
              <div className="student-class-date"><span>{startsAt?.toLocaleDateString('vi-VN', { weekday: 'long' }) ?? 'Chưa có'}</span><strong>{startsAt?.getDate() ?? '—'}</strong><small>{startsAt ? `Tháng ${startsAt.getMonth() + 1}` : 'lịch học'}</small></div>
              <div className="student-class-info">
                {next && <Tag color="blue">Sắp diễn ra</Tag>}
                <Typography.Title level={3}>{next?.className ?? 'Chưa có buổi học sắp tới'}</Typography.Title>
                {next && <Space wrap size={18}><span><Clock />{new Date(next.startsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}–{new Date(next.endsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span><span><MapPin />{next.roomCode}</span><span><ChalkboardTeacher />GV. {next.teacherName}</span></Space>}
              </div>
            </div>
            {!next && <Flex className="student-class-notice" align="center" gap={10}><WarningCircle weight="fill" /><Typography.Text>Lịch mới sẽ hiển thị sau khi trung tâm tạo buổi học.</Typography.Text></Flex>}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="Tiến độ khóa học">
            <div className="student-course-progress"><Flex justify="space-between"><Typography.Text strong>{Number(data?.activeClasses ?? 0)} lớp đang học</Typography.Text><Typography.Text type="secondary">Số buổi đã hoàn tất</Typography.Text></Flex><Progress percent={Number(data?.courseProgress ?? 0)} strokeColor="#397359" /></div>
            <Button block onClick={() => onNavigate('student-schedule')}>Xem thời khóa biểu <ArrowRight /></Button>
          </Card>
        </Col>
      </Row>

      <Row className="student-dashboard-grid" gutter={[16, 16]}>
        <Col xs={24} lg={12}><Card title="Kết quả học tập"><Typography.Paragraph type="secondary">Điểm thi và lịch sử chuyên cần được cập nhật trực tiếp từ giáo viên.</Typography.Paragraph><Button block onClick={() => onNavigate('student-results')}>Xem điểm và chuyên cần <ArrowRight /></Button></Card></Col>

        <Col xs={24} lg={12}>
          <Card title="Học phí và chứng chỉ">
            <button className="student-status-row" type="button" onClick={() => onNavigate('student-invoices')}><span className="student-status-icon warning"><Receipt weight="duotone" /></span><span><strong>Học phí còn lại</strong><small>{data?.nearestDueDate ? `Hạn ${new Date(data.nearestDueDate).toLocaleDateString('vi-VN')}` : 'Đã hoàn tất'}</small></span><b>{money(Number(data?.outstanding ?? 0))}</b><ArrowRight /></button>
            <button className="student-status-row" type="button" onClick={() => onNavigate('student-certificates')}><span className="student-status-icon"><Certificate weight="duotone" /></span><span><strong>Chứng chỉ cuối khóa</strong><small>Được xét sau khi hoàn thành khóa học</small></span><Tag color={issuedCertificates ? 'green' : approvedCertificates ? 'blue' : undefined}>{certificateLabel}</Tag><ArrowRight /></button>
          </Card>
        </Col>
      </Row>
      <StudentClasses />
      </>}
    </StudentLayout>
  )
}

export default StudentDashboard
