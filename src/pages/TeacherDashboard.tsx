import { useCallback, useEffect, useState } from 'react'
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
import { Alert, Button, Card, Col, Empty, Flex, Progress, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import TeacherLayout, { type TeacherPage } from './TeacherLayout'
import './TeacherDashboard.css'
import { api, errorMessage } from '../api'

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
  completed: boolean
}
type DashboardApi = { classes: number; students: number; sessionsThisWeek: number; attendanceDue: number; todaySessions: Array<{ id: number; className: string; startsAt: string; endsAt: string; roomCode: string; status: string }> }
type ClassApi = { id: number; name: string; code: string; status: string; weeklySchedule: string | null; students: number; attendanceRate: number | null; expectedAttendance: number; pendingAttendance: number }

function TeacherDashboard({ onLogout, onNavigate, onNavigateHome }: TeacherDashboardProps) {
  const [dashboard, setDashboard] = useState<DashboardApi>({ classes: 0, students: 0, sessionsThisWeek: 0, attendanceDue: 0, todaySessions: [] })
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setLoadError(null)
    try {
      const [summary, rows] = await Promise.all([api<DashboardApi>('/teacher/dashboard'), api<ClassApi[]>('/teacher/classes')])
      setDashboard(summary)
      setClasses(rows.map((item) => {
        const pending = Number(item.pendingAttendance); const completed = item.status === 'da_ket_thuc'
        return { key: item.id, name: item.name, code: item.code, completed,
          schedule: item.weeklySchedule?.split(',').map((slot) => { const [day, start] = slot.split('|'); return `${day === '1' ? 'CN' : `T${day}`} · ${start}` }).join(', ') ?? 'Chưa xếp lịch',
          students: Number(item.students), attendance: item.attendanceRate === null || Number(item.expectedAttendance) === 0 ? null : Number(item.attendanceRate),
          nextTask: pending ? `Điểm danh (${pending})` : completed ? 'Nhập điểm' : 'Xem lịch',
          actionPage: pending ? 'teacher-attendance' : completed ? 'teacher-grades' : 'teacher-schedule' }
      }))
    } catch (error) { setLoadError(errorMessage(error)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
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
      render: (_, record) => <Button type="link" onClick={() => { sessionStorage.setItem(record.actionPage === 'teacher-attendance' ? 'teacher-attendance-class' : record.actionPage === 'teacher-grades' ? 'teacher-grades-class' : 'teacher-schedule-class', String(record.key)); onNavigate(record.actionPage) }}>{record.nextTask}<ArrowRight /></Button>,
    },
  ]

  return (
    <TeacherLayout activePage="teacher" mainId="teacher-dashboard" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <AdminPageHeader
        kicker="Không gian giáo viên"
        title="Tổng quan giảng dạy"
        description="Theo dõi lịch dạy, công việc cần hoàn tất và tình hình các lớp đang phụ trách."
        actions={<Space wrap><Button loading={loading} onClick={() => void load()}>Làm mới</Button><Button type="primary" icon={<CalendarBlank />} onClick={() => onNavigate('teacher-schedule')}>Xem thời khóa biểu</Button></Space>}
      />

      {loading ? <Card loading /> : loadError ? <Alert type="error" showIcon title="Chưa tải được dữ liệu giảng dạy" description={loadError} action={<Button onClick={() => void load()}>Thử lại</Button>} /> : <>
      <AdminSummary items={[
        { label: 'Lớp phụ trách', value: Number(dashboard.classes), detail: `${dashboard.students} lượt học viên trong các lớp`, icon: <UsersThree weight="duotone" /> },
        { label: 'Buổi dạy tuần này', value: Number(dashboard.sessionsThisWeek), detail: `${todaySessions.length} buổi trong hôm nay`, icon: <CalendarBlank weight="duotone" /> },
        { label: 'Chưa điểm danh', value: Number(dashboard.attendanceDue), detail: 'Buổi đã qua chưa hoàn tất', icon: <ClipboardText weight="duotone" />, tone: 'danger' },
        { label: 'Lớp đã kết thúc', value: classes.filter((item) => item.completed).length, detail: 'Tiếp tục theo dõi kết quả học tập', icon: <Exam weight="duotone" /> },
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
              {!todaySessions.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hôm nay chưa có lịch dạy" />}
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
      </>}
    </TeacherLayout>
  )
}

export default TeacherDashboard
