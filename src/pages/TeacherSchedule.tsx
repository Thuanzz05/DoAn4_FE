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
import { Alert, Avatar, Button, Card, Divider, Drawer, Empty, Flex, Skeleton, Space, Tag, Typography, message } from 'antd'
import { AdminPageHeader } from './AdminPageKit'
import TeacherLayout, { type TeacherPage } from './TeacherLayout'
import './TeacherSchedule.css'
import { api, errorMessage } from '../api'

type TeacherScheduleProps = {
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

type Session = {
  id: number
  startsAt: string
  date: string
  time: string
  name: string
  code: string
  room: string
  students: number
  status: 'Đã hoàn tất' | 'Sắp diễn ra' | 'Đã hủy'
}
type SessionApi = { id: number; classCode: string; className: string; startsAt: string; endsAt: string; status: string; roomCode: string; students: number }
type StudentApi = { enrollmentId: number; studentCode: string; studentName: string; status: 'co_mat' | 'di_muon' | 'vang' | null; attendanceRate: number | null }

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
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [sessions, setSessions] = useState<Session[]>([])
  const [selected, setSelected] = useState<Session | null>(null)
  const [students, setStudents] = useState<StudentApi[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()
  const dateFormat = useMemo(() => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }), [])
  const fullDateFormat = useMemo(() => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }), [])
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  useEffect(() => {
    const from = dateKey(weekStart)
    const to = dateKey(addDays(weekStart, 6))
    api<SessionApi[]>(`/teacher/sessions?from=${from}&to=${to}`)
      .then((rows) => setSessions(rows.map((item) => ({
        id: item.id,
        startsAt: item.startsAt,
        date: String(item.startsAt).slice(0, 10),
        time: `${new Date(item.startsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}–${new Date(item.endsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
        name: item.className,
        code: item.classCode,
        room: item.roomCode,
        students: Number(item.students),
        status: item.status === 'da_hoc' ? 'Đã hoàn tất' : item.status === 'da_huy' ? 'Đã hủy' : 'Sắp diễn ra',
      }))))
      .catch((error) => messageApi.error(errorMessage(error)))
  }, [messageApi, weekStart])

  useEffect(() => {
    if (!selected) { setStudents([]); return }
    let active = true
    setStudentsLoading(true)
    api<{ students: StudentApi[] }>(`/teacher/sessions/${selected.id}/attendance`)
      .then((result) => { if (active) setStudents(result.students) })
      .catch((error) => { if (active) messageApi.error(errorMessage(error)) })
      .finally(() => { if (active) setStudentsLoading(false) })
    return () => { active = false }
  }, [messageApi, selected])

  return (
    <TeacherLayout activePage="teacher-schedule" mainId="teacher-schedule" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      {contextHolder}
      <AdminPageHeader
        kicker="Lịch giảng dạy"
        title="Thời khóa biểu"
        description="Xem lịch theo tuần và mở từng buổi để kiểm tra danh sách học viên."
      />

      <Alert className="teacher-schedule-alert" type="info" showIcon title="Lịch giảng dạy đã đồng bộ" description="Dữ liệu được cập nhật từ lịch học do quản trị viên xếp." />

      <Card className="teacher-schedule-card">
        <Flex className="teacher-schedule-toolbar" align="center" justify="space-between" gap={16} wrap>
          <div><Typography.Text type="secondary">Tuần đang xem</Typography.Text><Typography.Title level={3}>{dateFormat.format(weekStart)} – {dateFormat.format(addDays(weekStart, 6))}</Typography.Title></div>
          <Space.Compact>
            <Button icon={<CaretLeft />} onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Tuần trước" />
            <Button onClick={() => setWeekStart(startOfWeek(new Date()))}>Tuần này</Button>
            <Button icon={<CaretRight />} onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Tuần sau" />
          </Space.Compact>
        </Flex>

        <Divider />

        {sessions.length ? (
          <div className="teacher-week-scroll">
            <div className="teacher-week-grid">
              {days.map((date, dayIndex) => (
                <section className={sameDay(date, new Date()) ? 'is-today' : ''} key={date.toISOString()}>
                  <header><span>{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span><strong>{date.getDate()}</strong></header>
                  <div className="teacher-day-sessions">
                    {sessions.filter((session) => session.date === dateKey(addDays(weekStart, dayIndex))).map((session) => (
                      <button className="teacher-schedule-session" type="button" key={session.id} onClick={() => setSelected(session)}>
                        <span className="teacher-schedule-time"><Clock />{session.time}</span>
                        <strong>{session.name}</strong>
                        <small><MapPin />{session.room}</small>
                        <Tag color={session.status === 'Đã hoàn tất' ? 'green' : session.status === 'Đã hủy' ? 'red' : 'blue'}>{session.status}</Tag>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tuần này chưa có lịch giảng dạy" />}

        <Flex className="teacher-schedule-legend" gap={18} wrap>
          <span><i className="done" />Đã hoàn tất</span><span><i className="upcoming" />Sắp diễn ra</span><span><i className="changed" />Đã hủy</span>
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
            <span>{selected.status === 'Đã hoàn tất' ? <CheckCircle /> : <WarningCircle />} {selected.status}</span>
          </Space>
          <Divider />
          <Typography.Title level={5}>Danh sách học viên</Typography.Title>
          {studentsLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : students.length ? <div className="teacher-student-preview">{students.map((student) => {
            const attendance = student.status === 'co_mat' ? ['green', 'Có mặt'] : student.status === 'di_muon' ? ['gold', 'Đi muộn'] : student.status === 'vang' ? ['red', 'Vắng'] : ['default', 'Chưa điểm danh']
            return <Flex key={student.enrollmentId} align="center" gap={10}><Avatar>{student.studentName.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div style={{ flex: 1 }}><Typography.Text strong>{student.studentName}</Typography.Text><br /><Typography.Text type="secondary">{student.studentCode} · Chuyên cần {Number(student.attendanceRate ?? 0)}%</Typography.Text></div><Tag color={attendance[0]}>{attendance[1]}</Tag></Flex>
          })}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Lớp chưa có học viên" />}
          <Button type="primary" block className="teacher-open-attendance" disabled={selected.status === 'Đã hủy' || new Date(selected.startsAt.replace(' ', 'T')).getTime() > Date.now()} onClick={() => { sessionStorage.setItem('teacher-attendance-session', String(selected.id)); onNavigate('teacher-attendance') }}>{selected.status === 'Đã hủy' ? 'Buổi học đã hủy' : new Date(selected.startsAt.replace(' ', 'T')).getTime() > Date.now() ? 'Chưa đến giờ điểm danh' : 'Mở điểm danh buổi này'}</Button>
        </>}
      </Drawer>
    </TeacherLayout>
  )
}

export default TeacherSchedule
