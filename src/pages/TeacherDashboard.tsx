import { useEffect, useState } from 'react'
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
  key: number
  name: string
  code: string
  schedule: string
  students: number
  attendance: number | null
  nextTask: string
  actionPage: TeacherPage
}
type DashboardApi = { classes: number; students: number; sessionsThisWeek: number; attendanceDue: number; todaySessions: Array<{ id: number; className: string; startsAt: string; endsAt: string; roomCode: string; status: string }> }
type ClassApi = { id: number; name: string; code: string; status: string; weeklySchedule: string | null; students: number; attendanceRate: number | null; expectedAttendance: number; pendingAttendance: number }
import { api, errorMessage } from '../api'

function TeacherDashboard({ onLogout, onNavigate, onNavigateHome }: TeacherDashboardProps) {
  const [messageApi, contextHolder] = message.useMessage()
  const [dashboard, setDashboard] = useState<DashboardApi>({ classes: 0, students: 0, sessionsThisWeek: 0, attendanceDue: 0, todaySessions: [] })
  const [classes, setClasses] = useState<ClassRow[]>([])
  useEffect(() => { Promise.all([api<DashboardApi>('/teacher/dashboard'), api<ClassApi[]>('/teacher/classes')]).then(([summary, rows]) => { setDashboard(summary); setClasses(rows.map((item) => { const pending = Number(item.pendingAttendance); const completed = item.status === 'da_ket_thuc'; return { key: item.id, name: item.name, code: item.code, schedule: item.weeklySchedule?.split(',').map((slot) => { const [day, start] = slot.split('|'); return `${day === '1' ? 'CN' : `T${day}`} · ${start}` }).join(', ') ?? 'Chưa xếp lịch', students: Number(item.students), attendance: item.attendanceRate === null || Number(item.expectedAttendance) === 0 ? null : Number(item.attendanceRate), nextTask: pending ? `Điểm danh (${pending})` : completed ? 'Nhập điểm' : 'Xem lịch', actionPage: pending ? 'teacher-attendance' : completed ? 'teacher-grades' : 'teacher-schedule' } })) }).catch((error) => messageApi.error(errorMessage(error))) }, [messageApi])
  const todaySessions = dashboard.todaySessions.map((item) => { const canAttend = item.status !== 'da_huy' && new Date(item.startsAt.replace(' ', 'T')).getTime() <= Date.now(); return { id: item.id, time: `${new Date(item.startsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}–${new Date(item.endsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`, name: item.className, room: item.roomCode, status: item.status === 'da_hoc' ? 'Đã hoàn tất' : item.status === 'da_huy' ? 'Đã hủy' : 'Sắp diễn ra', color: item.status === 'da_hoc' ? 'green' : item.status === 'da_huy' ? 'red' : 'blue', canAttend } })

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
      render: (value: number | null) => value === null ? '—' : <Progress percent={Number(value.toFixed(1))} size="small" status={value < 80 ? 'exception' : 'success'} />,
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      render: (_, record) => <Button type="link" onClick={() => onNavigate(record.actionPage)}>{record.nextTask}<ArrowRight /></Button>,
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
        { label: 'Lớp phụ trách', value: Number(dashboard.classes), detail: `${dashboard.students} học viên đang theo học`, icon: <UsersThree weight="duotone" /> },
        { label: 'Buổi dạy tuần này', value: Number(dashboard.sessionsThisWeek), detail: `${todaySessions.length} buổi trong hôm nay`, icon: <CalendarBlank weight="duotone" /> },
        { label: 'Chưa điểm danh', value: Number(dashboard.attendanceDue), detail: 'Buổi đã qua chưa hoàn tất', icon: <ClipboardText weight="duotone" />, tone: 'danger' },
        { label: 'Bảng điểm', value: classes.length, detail: 'Theo các lớp được phân công', icon: <Exam weight="duotone" /> },
      ]} />

      <Alert className="teacher-alert" type="info" showIcon title="Dữ liệu giảng dạy đã đồng bộ" description="Lịch, sĩ số và công việc được lấy trực tiếp từ hệ thống." />

      <Row gutter={[16, 16]} className="teacher-dashboard-grid">
        <Col xs={24} xl={15}>
          <Card title="Lịch dạy hôm nay" extra={<Button type="link" onClick={() => onNavigate('teacher-schedule')}>Xem cả tuần</Button>}>
            <Space orientation="vertical" size={0} className="teacher-session-list">
              {todaySessions.map((session) => (
                <Flex className="teacher-session" align="center" gap={16} key={session.id} wrap>
                  <div className="teacher-session-time"><Clock weight="duotone" /><strong>{session.time}</strong></div>
                  <div className="teacher-session-info"><Typography.Text strong>{session.name}</Typography.Text><Typography.Text type="secondary"><MapPin />{session.room}</Typography.Text></div>
                  <Tag color={session.color}>{session.status}</Tag>
                  <Button disabled={!session.canAttend} onClick={() => { sessionStorage.setItem('teacher-attendance-session', String(session.id)); onNavigate('teacher-attendance') }}>{session.status === 'Đã hủy' ? 'Đã hủy' : session.canAttend ? 'Mở lớp' : 'Chưa đến giờ'}</Button>
                </Flex>
              ))}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card title="Việc cần hoàn tất" className="teacher-tasks-card"><button type="button" onClick={() => onNavigate('teacher-attendance')}><span className="teacher-task-icon danger"><ClipboardText weight="duotone" /></span><span><strong>Hoàn tất điểm danh</strong><small>{dashboard.attendanceDue} buổi đang chờ</small></span><Tag color={Number(dashboard.attendanceDue) ? 'red' : 'green'}>{Number(dashboard.attendanceDue) ? 'Cần xử lý' : 'Đã xong'}</Tag></button><button type="button" onClick={() => onNavigate('teacher-grades')}><span className="teacher-task-icon warning"><Exam weight="duotone" /></span><span><strong>Nhập điểm bốn kỹ năng</strong><small>Chọn lớp và kỳ thi</small></span><ArrowRight /></button><div className="teacher-task-done"><CheckCircle weight="fill" /><span><strong>Dữ liệu được lưu trên hệ thống</strong></span></div></Card>
        </Col>
      </Row>

      <Card title="Lớp đang phụ trách" className="admin-table-card teacher-classes-card" extra={<Typography.Text type="secondary">Dữ liệu hiện tại</Typography.Text>}>
        <Table columns={columns} dataSource={classes} pagination={false} scroll={{ x: 760 }} />
      </Card>
    </TeacherLayout>
  )
}

export default TeacherDashboard
