import { useEffect, useMemo, useState } from 'react'
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  MapPin,
  UsersThree,
  WarningCircle,
} from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Divider, Drawer, Empty, Flex, Input, Segmented, Skeleton, Space, Tag, Typography } from 'antd'
import { AdminPageHeader } from './AdminPageKit'
import TeacherLayout, { type TeacherPage } from './TeacherLayout'
import './TeacherSchedule.css'
import './StudentSchedule.css'
import { api, errorMessage } from '../api'
import { sessionTiming } from '../sessionTiming'

type TeacherScheduleProps = {
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

type Session = {
  id: number
  classId: number
  startsAt: string
  endsAt: string
  date: string
  time: string
  name: string
  code: string
  room: string
  students: number
  status: string
  attendanceMarked: number
}
type SessionApi = { id: number; classId: number; classCode: string; className: string; startsAt: string; endsAt: string; status: string; roomCode: string; students: number; attendanceMarked: number }
type StudentApi = { enrollmentId: number; studentCode: string; studentName: string; status: 'co_mat' | 'di_muon' | 'vang' | null; attendanceRate: number | null; expectedAttendance: number; recordedAttendance: number }

const DAY = 86_400_000
const sameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString()
const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}
const addDays = (date: Date, amount: number) => new Date(date.getTime() + amount * DAY)
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function TeacherSchedule({ onLogout, onNavigate, onNavigateHome }: TeacherScheduleProps) {
  const [anchor, setAnchor] = useState(() => new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [classFilter, setClassFilter] = useState(() => { const value = Number(sessionStorage.getItem('teacher-schedule-class')); sessionStorage.removeItem('teacher-schedule-class'); return value || undefined })
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [selected, setSelected] = useState<Session | null>(null)
  const [students, setStudents] = useState<StudentApi[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsError, setStudentsError] = useState('')
  const [sessionsRetry, setSessionsRetry] = useState(0)
  const [studentsRetry, setStudentsRetry] = useState(0)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer) }, [])
  const dateFormat = useMemo(() => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }), [])
  const fullDateFormat = useMemo(() => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }), [])
  const weekStart = startOfWeek(anchor)
  const rangeStart = view === 'day' ? anchor : view === 'week' ? weekStart : startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
  const rangeEnd = addDays(rangeStart, view === 'day' ? 0 : view === 'week' ? 6 : 41)
  const days = Array.from({ length: view === 'day' ? 1 : view === 'week' ? 7 : 42 }, (_, index) => addDays(rangeStart, index))
  const from = dateKey(rangeStart)
  const to = dateKey(rangeEnd)
  const visibleSessions = sessions.filter((item) => !classFilter || item.classId === classFilter)
  const move = (direction: number) => setAnchor(view === 'month' ? new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1) : addDays(anchor, direction * (view === 'week' ? 7 : 1)))
  useEffect(() => {
    let active = true
    setSessions([]); setSelected(null); setSessionsLoading(true); setSessionsError('')
    api<SessionApi[]>(`/teacher/sessions?from=${from}&to=${to}`)
      .then((rows) => { if (active) setSessions(rows.map((item) => ({
        id: item.id,
        classId: item.classId,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        date: String(item.startsAt).slice(0, 10),
        time: `${new Date(item.startsAt.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}–${new Date(item.endsAt.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
        name: item.className,
        code: item.classCode,
        room: item.roomCode,
        students: Number(item.students),
        status: item.status,
        attendanceMarked: Number(item.attendanceMarked),
      }))) })
      .catch((error) => { if (active) setSessionsError(errorMessage(error)) })
      .finally(() => { if (active) setSessionsLoading(false) })
    return () => { active = false }
  }, [from, to, sessionsRetry])

  useEffect(() => {
    setStudents([]); setStudentsError('')
    if (!selected) { setStudentsLoading(false); return }
    let active = true
    setStudentsLoading(true)
    api<{ students: StudentApi[] }>(`/teacher/sessions/${selected.id}/attendance`)
      .then((result) => { if (active) setStudents(result.students) })
      .catch((error) => { if (active) setStudentsError(errorMessage(error)) })
      .finally(() => { if (active) setStudentsLoading(false) })
    return () => { active = false }
  }, [selected, studentsRetry])
  const timing = (session: Session) => sessionTiming(session.startsAt, session.endsAt, session.status, now)
  const attendanceText = (session: Session) => session.status === 'da_huy' ? 'Không điểm danh buổi hủy' : session.students ? `Đã điểm danh ${session.attendanceMarked}/${session.students} học viên` : 'Chưa có học viên'

  return (
    <TeacherLayout activePage="teacher-schedule" mainId="teacher-schedule" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <AdminPageHeader
        kicker="Lịch giảng dạy"
        title="Thời khóa biểu"
        description="Xem lịch theo ngày, tuần hoặc tháng; mở buổi học để kiểm tra danh sách học viên."
        actions={<Space wrap><Button loading={sessionsLoading} onClick={() => setSessionsRetry((value) => value + 1)}>Tải lại lịch</Button><Segmented value={view} onChange={(value) => setView(value as typeof view)} options={[{ label: 'Ngày', value: 'day' }, { label: 'Tuần', value: 'week' }, { label: 'Tháng', value: 'month' }]} /></Space>}
      />

      <Alert className="teacher-schedule-alert" type={sessionsError ? 'error' : 'info'} showIcon title={sessionsError ? 'Không tải được lịch giảng dạy' : sessionsLoading ? 'Đang tải lịch giảng dạy' : 'Lịch giảng dạy đã đồng bộ'} description={sessionsError || 'Dữ liệu được cập nhật từ lịch học do quản trị viên xếp.'} action={sessionsError && <Button onClick={() => setSessionsRetry((value) => value + 1)}>Thử lại lịch</Button>} />

      <Card className="teacher-schedule-card">
        <Flex className="teacher-schedule-toolbar" align="center" justify="space-between" gap={16} wrap>
          <div><Typography.Text type="secondary">{view === 'day' ? 'Ngày đang xem' : view === 'week' ? 'Tuần đang xem' : 'Tháng đang xem'}</Typography.Text><Typography.Title level={3}>{view === 'day' ? fullDateFormat.format(anchor) : view === 'month' ? `Tháng ${anchor.getMonth() + 1}/${anchor.getFullYear()}` : `${dateFormat.format(weekStart)} – ${dateFormat.format(addDays(weekStart, 6))}`}</Typography.Title></div>
          <Input type="date" aria-label="Chọn ngày xem lịch" value={dateKey(anchor)} style={{ width: 170 }} onChange={(event) => { if (event.target.value) setAnchor(new Date(`${event.target.value}T00:00:00`)) }} />
          <Space.Compact>
            <Button icon={<CaretLeft />} onClick={() => move(-1)} aria-label="Kỳ trước" />
            <Button onClick={() => setAnchor(new Date())}>Hôm nay</Button>
            <Button icon={<CaretRight />} onClick={() => move(1)} aria-label="Kỳ sau" />
          </Space.Compact>
        </Flex>

        <Divider />
        {classFilter && <Alert style={{ marginBottom: 16 }} type="info" title="Đang lọc lịch của lớp đã chọn" action={<Button size="small" onClick={() => setClassFilter(undefined)}>Xem tất cả lớp</Button>} />}

        {sessionsLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : sessionsError ? null : view === 'month' ? <div className="student-month-scroll"><div className="student-month-calendar">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <strong className="student-month-weekday" key={day}>{day}</strong>)}
          {days.map((date) => <section className={`${date.getMonth() !== anchor.getMonth() ? 'outside' : ''} ${sameDay(date, new Date()) ? 'is-today' : ''}`} key={dateKey(date)}><span>{date.getDate()}</span>{visibleSessions.filter((session) => session.date === dateKey(date)).map((session) => <button type="button" key={session.id} onClick={() => setSelected(session)}>{session.time} · {session.name} · {timing(session).label}<br />{attendanceText(session)}</button>)}</section>)}
        </div></div> : visibleSessions.length ? (
          <div className="teacher-week-scroll">
            <div className="teacher-week-grid" style={view === 'day' ? { minWidth: 0, gridTemplateColumns: '1fr' } : undefined}>
              {days.map((date) => (
                <section className={sameDay(date, new Date()) ? 'is-today' : ''} key={date.toISOString()}>
                  <header><span>{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span><strong>{date.getDate()}</strong></header>
                  <div className="teacher-day-sessions">
                    {visibleSessions.filter((session) => session.date === dateKey(date)).map((session) => (
                      <button className="teacher-schedule-session" type="button" key={session.id} onClick={() => setSelected(session)}>
                        <span className="teacher-schedule-time"><Clock />{session.time}</span>
                        <strong>{session.name}</strong>
                        <small><MapPin />{session.room}</small>
                        <Tag color={timing(session).color}>{timing(session).label}</Tag><small>{attendanceText(session)}</small>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Khoảng đang xem chưa có lịch giảng dạy" />}

        <Flex className="teacher-schedule-legend" gap={18} wrap>
          <span><i className="done" />Đang diễn ra</span><span><i className="upcoming" />Sắp diễn ra</span><span>Đã kết thúc</span><span><i className="changed" />Đã hủy</span>
        </Flex>
      </Card>

      <Drawer title={selected?.name} open={Boolean(selected)} onClose={() => setSelected(null)} size={440}>
        {selected && <>
          <Typography.Text type="secondary">{selected.code}</Typography.Text>
          <Typography.Title level={4} className="teacher-session-drawer-title">{selected.time}</Typography.Title>
          <Space orientation="vertical" size={12} className="teacher-session-meta">
            <span><CalendarBlank />{fullDateFormat.format(new Date(`${selected.date}T00:00:00`))}</span>
            <span><MapPin />Phòng {selected.room.replace('P.', '')}</span>
            <span><UsersThree />{selected.students} học viên</span>
            <span>{timing(selected).label === 'Đã kết thúc' ? <CheckCircle /> : <WarningCircle />} {timing(selected).label}</span>
            <span>{attendanceText(selected)}</span>
          </Space>
          <Divider />
          <Flex align="center" justify="space-between" gap={8}><Typography.Title level={5}>Danh sách học viên</Typography.Title><Button loading={studentsLoading} onClick={() => setStudentsRetry((value) => value + 1)}>Tải lại học viên</Button></Flex>
          {studentsLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : studentsError ? <Alert type="error" showIcon title="Không tải được danh sách học viên" description={studentsError} action={<Button onClick={() => setStudentsRetry((value) => value + 1)}>Thử lại học viên</Button>} /> : students.length ? <div className="teacher-student-preview">{students.map((student) => {
            const attendance = student.status === 'co_mat' ? ['green', 'Có mặt'] : student.status === 'di_muon' ? ['gold', 'Đi muộn'] : student.status === 'vang' ? ['red', 'Vắng'] : ['default', 'Chưa điểm danh']
            return <Flex key={student.enrollmentId} align="center" gap={10}><Avatar>{student.studentName.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div style={{ flex: 1 }}><Typography.Text strong>{student.studentName}</Typography.Text><br /><Typography.Text type="secondary">{student.studentCode} · Chuyên cần {student.expectedAttendance > 0 && student.attendanceRate !== null ? `${Number(student.attendanceRate).toFixed(1)}%` : '—'} · {student.recordedAttendance}/{student.expectedAttendance} buổi đã ghi nhận</Typography.Text></div><Tag color={attendance[0]}>{attendance[1]}</Tag></Flex>
          })}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Lớp chưa có học viên" />}
          <Button type="primary" block className="teacher-open-attendance" disabled={studentsLoading || Boolean(studentsError || sessionsError) || selected.status === 'da_huy' || new Date(selected.startsAt.replace(' ', 'T')).getTime() > now} onClick={() => { sessionStorage.removeItem('teacher-attendance-class'); sessionStorage.setItem('teacher-attendance-session', String(selected.id)); onNavigate('teacher-attendance') }}>{selected.status === 'da_huy' ? 'Buổi học đã hủy' : new Date(selected.startsAt.replace(' ', 'T')).getTime() > now ? 'Chưa đến giờ điểm danh' : 'Mở điểm danh buổi này'}</Button>
        </>}
      </Drawer>
    </TeacherLayout>
  )
}

export default TeacherSchedule
