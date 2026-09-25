import { useMemo, useState } from 'react'
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChalkboardTeacher,
  Clock,
  MapPin,
  Student,
} from '@phosphor-icons/react'
import { Alert, Button, Card, Divider, Drawer, Empty, Flex, Progress, Segmented, Space, Tag, Typography } from 'antd'
import { AdminPageHeader } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentSchedule.css'

type StudentScheduleProps = {
  onLogout: () => void
  onNavigate: (page: StudentPage) => void
  onNavigateHome: () => void
}

type ViewMode = 'week' | 'month'
type Session = { id: number; date: string; time: string; course: string; room: string; teacher: string; status?: 'Đổi phòng' }

const DAY = 86_400_000
const sessions: Session[] = [
  { id: 1, date: '2026-09-21', time: '18:00–19:30', course: 'A2 Giao tiếp', room: 'P.203', teacher: 'Nguyễn Quốc Minh' },
  { id: 2, date: '2026-09-23', time: '18:00–19:30', course: 'A2 Giao tiếp', room: 'P.203', teacher: 'Nguyễn Quốc Minh' },
  { id: 3, date: '2026-09-25', time: '18:00–19:30', course: 'A2 Giao tiếp', room: 'P.201', teacher: 'Nguyễn Quốc Minh', status: 'Đổi phòng' },
  { id: 4, date: '2026-09-28', time: '18:00–19:30', course: 'A2 Giao tiếp', room: 'P.203', teacher: 'Nguyễn Quốc Minh' },
  { id: 5, date: '2026-09-30', time: '18:00–19:30', course: 'A2 Giao tiếp', room: 'P.203', teacher: 'Nguyễn Quốc Minh' },
]

const formatKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const addDays = (date: Date, amount: number) => new Date(date.getTime() + amount * DAY)
const startOfWeek = (date: Date) => addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -((date.getDay() + 6) % 7))
const parseDate = (value: string) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) }

if (import.meta.env.DEV && formatKey(new Date(2026, 8, 5)) !== '2026-09-05') throw new Error('Schedule date check failed')

function StudentSchedule({ onLogout, onNavigate, onNavigateHome }: StudentScheduleProps) {
  const [view, setView] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(() => new Date(2026, 8, 25))
  const [selected, setSelected] = useState<Session | null>(null)
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
        actions={<Segmented value={view} onChange={(value) => setView(value as ViewMode)} options={[{ label: 'Theo tuần', value: 'week' }, { label: 'Theo tháng', value: 'month' }]} />}
      />

      <Alert className="student-schedule-alert" type="warning" showIcon title="Thay đổi phòng học" description="Buổi A2 Giao tiếp ngày 25/09 chuyển từ P.203 sang P.201." />

      <Card className="student-schedule-card">
        <Flex className="student-schedule-toolbar" align="center" justify="space-between" gap={16} wrap>
          <div><Typography.Text type="secondary">{view === 'week' ? 'Tuần đang xem' : 'Tháng đang xem'}</Typography.Text><Typography.Title level={3}>{periodLabel}</Typography.Title></div>
          <Space.Compact><Button icon={<CaretLeft />} onClick={() => move(-1)} aria-label={view === 'week' ? 'Tuần trước' : 'Tháng trước'} /><Button onClick={() => setAnchor(new Date(2026, 8, 25))}>Hôm nay</Button><Button icon={<CaretRight />} onClick={() => move(1)} aria-label={view === 'week' ? 'Tuần sau' : 'Tháng sau'} /></Space.Compact>
        </Flex>
        <Divider />

        {view === 'week' ? (
          <div className="student-week-scroll"><div className="student-week-grid">
            {weekDays.map((date) => {
              const daySessions = sessions.filter((session) => session.date === formatKey(date))
              return <section className={formatKey(date) === '2026-09-25' ? 'is-today' : ''} key={formatKey(date)}><header><span>{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span><strong>{date.getDate()}</strong></header><div className="student-day-sessions">{daySessions.map((session) => <button className={`student-schedule-session ${session.status ? 'changed' : ''}`} type="button" key={session.id} onClick={() => setSelected(session)}><span><Clock />{session.time}</span><strong>{session.course}</strong><small><MapPin />{session.room}</small>{session.status && <Tag color="orange">{session.status}</Tag>}</button>)}{!daySessions.length && <span className="student-no-session">Không có lịch</span>}</div></section>
            })}
          </div></div>
        ) : (
          <div className="student-month-scroll"><div className="student-month-calendar">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <strong className="student-month-weekday" key={day}>{day}</strong>)}
            {monthDays.map((date) => { const daySessions = sessions.filter((session) => session.date === formatKey(date)); return <section className={`${date.getMonth() !== anchor.getMonth() ? 'outside' : ''} ${formatKey(date) === '2026-09-25' ? 'is-today' : ''}`} key={formatKey(date)}><span>{date.getDate()}</span>{daySessions.map((session) => <button type="button" key={session.id} onClick={() => setSelected(session)}><i />{session.time} · {session.course}</button>)}</section> })}
          </div></div>
        )}
      </Card>

      <Drawer title={selected?.course} open={Boolean(selected)} onClose={() => setSelected(null)} size={430}>
        {selected ? <>
          <Tag color={selected.status ? 'orange' : 'blue'}>{selected.status ?? 'Theo lịch'}</Tag>
          <Typography.Title className="student-schedule-drawer-title" level={3}>{selected.time}</Typography.Title>
          <Space orientation="vertical" size={14} className="student-schedule-meta">
            <span><CalendarBlank />{fullDate.format(parseDate(selected.date))}</span>
            <span><MapPin />Phòng {selected.room.replace('P.', '')}</span>
            <span><ChalkboardTeacher />GV. {selected.teacher}</span>
            <span><Student />Lớp TA-A2-04 · 18 học viên</span>
          </Space>
          <Divider />
          <Flex justify="space-between"><Typography.Text strong>Tiến độ lớp học</Typography.Text><Typography.Text type="secondary">14/24 buổi</Typography.Text></Flex>
          <Progress percent={58} strokeColor="#397359" />
          <Card size="small" className="student-course-detail"><Typography.Text type="secondary">Khóa học</Typography.Text><strong>Tiếng Anh giao tiếp A2</strong><Typography.Text type="secondary">Khai giảng 12/08/2026 · Dự kiến kết thúc 30/10/2026</Typography.Text></Card>
        </> : <Empty />}
      </Drawer>
    </StudentLayout>
  )
}

export default StudentSchedule
