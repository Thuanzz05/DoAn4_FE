import { useEffect, useMemo, useState } from 'react'
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChalkboardTeacher,
  Clock,
  MapPin,
  Student,
} from '@phosphor-icons/react'
import { Alert, Button, Card, Divider, Drawer, Empty, Flex, Segmented, Select, Skeleton, Space, Tag, Typography } from 'antd'
import { AdminPageHeader } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentSchedule.css'
import { api, errorMessage } from '../api'
import StudentClasses from './StudentClasses'

type StudentScheduleProps = {
  onLogout: () => void
  onNavigate: (page: StudentPage) => void
  onNavigateHome: () => void
}

type ViewMode = 'week' | 'month'
type SessionStatus = 'da_len_lich' | 'da_hoc' | 'da_huy'
type Session = { id: number; date: string; time: string; course: string; room: string; teacher: string; classCode: string; status: SessionStatus }
type SessionApi = { id: number; classCode: string; className: string; startsAt: string; endsAt: string; status: SessionStatus; roomCode: string; teacherName: string }

const DAY = 86_400_000
const formatKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const addDays = (date: Date, amount: number) => new Date(date.getTime() + amount * DAY)
const startOfWeek = (date: Date) => addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -((date.getDay() + 6) % 7))
const parseDate = (value: string) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) }
const sessionStatus: Record<SessionStatus, { color: string; label: string }> = {
  da_len_lich: { color: 'blue', label: 'Đã lên lịch' },
  da_hoc: { color: 'green', label: 'Đã học' },
  da_huy: { color: 'red', label: 'Đã hủy' },
}

if (import.meta.env.DEV && formatKey(new Date(2026, 8, 5)) !== '2026-09-05') throw new Error('Schedule date check failed')

function StudentSchedule({ onLogout, onNavigate, onNavigateHome }: StudentScheduleProps) {
  const [view, setView] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedId, setSelectedId] = useState<number>()
  const [classCode, setClassCode] = useState('all')
  const [focusedClassCode, setFocusedClassCode] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    api<SessionApi[]>('/student/sessions', { signal: controller.signal }).then((rows) => {
      if (controller.signal.aborted) return
      setSessions(rows.map((item) => ({ id: item.id, date: String(item.startsAt).slice(0, 10),
        time: `${new Date(item.startsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}–${new Date(item.endsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
        course: item.className, room: item.roomCode, teacher: item.teacherName, classCode: item.classCode, status: item.status })))
      setClassCode((current) => current === 'all' || rows.some((item) => item.classCode === current) ? current : 'all')
    }).catch((err) => { if (!controller.signal.aborted) setError(errorMessage(err)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])
  const selected = sessions.find((item) => item.id === selectedId)
  const visibleSessions = classCode === 'all' ? sessions : sessions.filter((item) => item.classCode === classCode)
  const classOptions = Array.from(new Map(sessions.map((item) => [item.classCode, { value: item.classCode, label: `${item.classCode} · ${item.course}` }])).values())
  const shortDate = useMemo(() => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }), [])
  const fullDate = useMemo(() => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }), [])
  const weekStart = startOfWeek(anchor)
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const monthGridStart = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index))

  const move = (direction: number) => setAnchor(view === 'week'
    ? addDays(anchor, direction * 7)
    : new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1))
  const periodLabel = view === 'week'
    ? `${shortDate.format(weekStart)} – ${shortDate.format(addDays(weekStart, 6))}`
    : `Tháng ${anchor.getMonth() + 1}/${anchor.getFullYear()}`

  return (
    <StudentLayout activePage="student-schedule" mainId="student-schedule" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <AdminPageHeader
        kicker="Lịch học cá nhân"
        title="Thời khóa biểu của tôi"
        description="Theo dõi thời gian, phòng học và giáo viên phụ trách theo tuần hoặc tháng."
        actions={<Space wrap><Select aria-label="Lọc lịch theo lớp" value={classCode} onChange={setClassCode} disabled={loading || Boolean(error)} style={{ minWidth: 220, maxWidth: '100%' }} options={[{ value: 'all', label: 'Tất cả lớp' }, ...classOptions]} /><Segmented value={view} onChange={(value) => setView(value as ViewMode)} options={[{ label: 'Theo tuần', value: 'week' }, { label: 'Theo tháng', value: 'month' }]} /><Button loading={loading} onClick={() => setReload((value) => value + 1)}>Làm mới</Button></Space>}
      />

      <Alert className="student-schedule-alert" type="info" showIcon title="Lịch học được đồng bộ từ trung tâm" description="Các thay đổi về thời gian và phòng học sẽ hiển thị tại đây." />

      <Card className="student-schedule-card">
        <Flex className="student-schedule-toolbar" align="center" justify="space-between" gap={16} wrap>
          <div><Typography.Text type="secondary">{view === 'week' ? 'Tuần đang xem' : 'Tháng đang xem'}</Typography.Text><Typography.Title level={3}>{periodLabel}</Typography.Title></div>
          <Space.Compact><Button icon={<CaretLeft />} onClick={() => move(-1)} aria-label={view === 'week' ? 'Tuần trước' : 'Tháng trước'} /><Button onClick={() => setAnchor(new Date())}>Hôm nay</Button><Button icon={<CaretRight />} onClick={() => move(1)} aria-label={view === 'week' ? 'Tuần sau' : 'Tháng sau'} /></Space.Compact>
        </Flex>
        <Divider />

        {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : error ? (
          <Alert type="error" showIcon title={error} action={<Button onClick={() => setReload((value) => value + 1)}>Thử lại</Button>} />
        ) : view === 'week' ? (
          <div className="student-week-scroll"><div className="student-week-grid">
            {weekDays.map((date) => {
              const daySessions = visibleSessions.filter((session) => session.date === formatKey(date))
              return <section className={formatKey(date) === formatKey(new Date()) ? 'is-today' : ''} key={formatKey(date)}><header><span>{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span><strong>{date.getDate()}</strong></header><div className="student-day-sessions">{daySessions.map((session) => <button className="student-schedule-session" type="button" key={session.id} onClick={() => setSelectedId(session.id)}><span><Clock />{session.time}</span><strong>{session.course}</strong><small><MapPin />{session.room}</small><Tag color={sessionStatus[session.status].color}>{sessionStatus[session.status].label}</Tag></button>)}{!daySessions.length && <span className="student-no-session">Không có lịch</span>}</div></section>
            })}
          </div></div>
        ) : (
          <div className="student-month-scroll"><div className="student-month-calendar">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <strong className="student-month-weekday" key={day}>{day}</strong>)}
            {monthDays.map((date) => { const daySessions = visibleSessions.filter((session) => session.date === formatKey(date)); return <section className={`${date.getMonth() !== anchor.getMonth() ? 'outside' : ''} ${formatKey(date) === formatKey(new Date()) ? 'is-today' : ''}`} key={formatKey(date)}><span>{date.getDate()}</span>{daySessions.map((session) => <button type="button" key={session.id} onClick={() => setSelectedId(session.id)}><i />{session.status === 'da_huy' ? 'Đã hủy' : session.time} · {session.course}</button>)}</section> })}
          </div></div>
        )}
      </Card>
      <StudentClasses focusedClassCode={focusedClassCode} onCloseFocus={() => setFocusedClassCode(undefined)} />

      <Drawer title={selected?.course} open={!loading && !error && Boolean(selected)} onClose={() => setSelectedId(undefined)} size={430}>
        {selected ? <>
          <Tag color={sessionStatus[selected.status].color}>{sessionStatus[selected.status].label}</Tag>
          <Typography.Title className="student-schedule-drawer-title" level={3}>{selected.time}</Typography.Title>
          <Space orientation="vertical" size={14} className="student-schedule-meta">
            <span><CalendarBlank />{fullDate.format(parseDate(selected.date))}</span>
            <span><MapPin />Phòng {selected.room.replace('P.', '')}</span>
            <span><ChalkboardTeacher />GV. {selected.teacher}</span>
            <span><Student />Lớp {selected.classCode}</span>
          </Space>
          <Divider />
          <Card size="small" className="student-course-detail"><Typography.Text type="secondary">Lớp học</Typography.Text><strong>{selected.course}</strong><Typography.Text type="secondary">Mã lớp {selected.classCode}</Typography.Text><Button onClick={() => { setFocusedClassCode(selected.classCode); setSelectedId(undefined) }}>Xem chi tiết lớp học</Button></Card>
        </> : <Empty />}
      </Drawer>
    </StudentLayout>
  )
}

export default StudentSchedule
