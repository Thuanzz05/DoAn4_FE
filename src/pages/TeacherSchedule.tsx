import { useMemo, useState } from 'react'
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
import { Alert, Button, Card, Divider, Drawer, Empty, Flex, Space, Tag, Typography } from 'antd'
import { AdminPageHeader } from './AdminPageKit'
import TeacherLayout, { type TeacherPage } from './TeacherLayout'
import './TeacherSchedule.css'

type TeacherScheduleProps = {
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

type Session = {
  id: number
  day: number
  time: string
  name: string
  code: string
  room: string
  students: number
  status: 'Đã hoàn tất' | 'Sắp diễn ra' | 'Đổi phòng'
}

const DAY = 86_400_000
const referenceWeek = new Date(2026, 8, 21)
const sessions: Session[] = [
  { id: 1, day: 0, time: '18:00–19:30', name: 'A2 Giao tiếp', code: 'TA-A2-04', room: 'P.201', students: 18, status: 'Đã hoàn tất' },
  { id: 2, day: 1, time: '19:45–21:15', name: 'IELTS 6.5', code: 'IELTS-65-02', room: 'P.301', students: 14, status: 'Đã hoàn tất' },
  { id: 3, day: 2, time: '18:00–19:30', name: 'A2 Giao tiếp', code: 'TA-A2-04', room: 'P.201', students: 18, status: 'Đã hoàn tất' },
  { id: 4, day: 3, time: '19:45–21:15', name: 'IELTS 6.5', code: 'IELTS-65-02', room: 'P.302', students: 14, status: 'Đổi phòng' },
  { id: 5, day: 4, time: '18:00–19:30', name: 'A2 Giao tiếp', code: 'TA-A2-04', room: 'P.201', students: 18, status: 'Sắp diễn ra' },
  { id: 6, day: 5, time: '08:00–09:30', name: 'B1 Tổng quát', code: 'TA-B1-07', room: 'P.105', students: 20, status: 'Sắp diễn ra' },
  { id: 7, day: 6, time: '08:00–09:30', name: 'B1 Tổng quát', code: 'TA-B1-07', room: 'P.105', students: 20, status: 'Sắp diễn ra' },
]

const studentPreview = ['Nguyễn Minh Anh', 'Trần Hải Đăng', 'Lê Thu Hà', 'Phạm Quốc Huy']
const sameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString()
const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}
const addDays = (date: Date, amount: number) => new Date(date.getTime() + amount * DAY)
const weekKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

function TeacherSchedule({ onLogout, onNavigate, onNavigateHome }: TeacherScheduleProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [selected, setSelected] = useState<Session | null>(null)
  const dateFormat = useMemo(() => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }), [])
  const fullDateFormat = useMemo(() => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }), [])
  const weekSessions = weekKey(weekStart) === weekKey(referenceWeek) ? sessions : []
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

  return (
    <TeacherLayout activePage="teacher-schedule" mainId="teacher-schedule" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      <AdminPageHeader
        kicker="Lịch giảng dạy"
        title="Thời khóa biểu"
        description="Xem lịch theo tuần và mở từng buổi để kiểm tra danh sách học viên."
      />

      <Alert className="teacher-schedule-alert" type="warning" showIcon title="Lịch vừa được điều chỉnh" description="Buổi IELTS 6.5 thứ Năm chuyển từ P.301 sang P.302." />

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

        {weekSessions.length ? (
          <div className="teacher-week-scroll">
            <div className="teacher-week-grid">
              {days.map((date, dayIndex) => (
                <section className={sameDay(date, new Date()) ? 'is-today' : ''} key={date.toISOString()}>
                  <header><span>{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span><strong>{date.getDate()}</strong></header>
                  <div className="teacher-day-sessions">
                    {weekSessions.filter((session) => session.day === dayIndex).map((session) => (
                      <button className={`teacher-schedule-session ${session.status === 'Đổi phòng' ? 'changed' : ''}`} type="button" key={session.id} onClick={() => setSelected(session)}>
                        <span className="teacher-schedule-time"><Clock />{session.time}</span>
                        <strong>{session.name}</strong>
                        <small><MapPin />{session.room}</small>
                        <Tag color={session.status === 'Đã hoàn tất' ? 'green' : session.status === 'Đổi phòng' ? 'orange' : 'blue'}>{session.status}</Tag>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tuần này chưa có lịch giảng dạy" />}

        <Flex className="teacher-schedule-legend" gap={18} wrap>
          <span><i className="done" />Đã hoàn tất</span><span><i className="upcoming" />Sắp diễn ra</span><span><i className="changed" />Có thay đổi</span>
        </Flex>
      </Card>

      <Drawer title={selected?.name} open={Boolean(selected)} onClose={() => setSelected(null)} size={440}>
        {selected && <>
          <Typography.Text type="secondary">{selected.code}</Typography.Text>
          <Typography.Title level={4} className="teacher-session-drawer-title">{selected.time}</Typography.Title>
          <Space orientation="vertical" size={12} className="teacher-session-meta">
            <span><CalendarBlank />{fullDateFormat.format(addDays(weekStart, selected.day))}</span>
            <span><MapPin />Phòng {selected.room.replace('P.', '')}</span>
            <span><UsersThree />{selected.students} học viên</span>
            <span>{selected.status === 'Đổi phòng' ? <WarningCircle /> : <CheckCircle />} {selected.status}</span>
          </Space>
          <Divider />
          <Typography.Title level={5}>Danh sách học viên</Typography.Title>
          <div className="teacher-student-preview">
            {studentPreview.map((student, index) => <Flex justify="space-between" key={student}><Typography.Text>{index + 1}. {student}</Typography.Text><Tag>Đang học</Tag></Flex>)}
            <Typography.Text type="secondary">Và {selected.students - studentPreview.length} học viên khác</Typography.Text>
          </div>
          <Button type="primary" block className="teacher-open-attendance" onClick={() => onNavigate('teacher-attendance')}>Mở điểm danh</Button>
        </>}
      </Drawer>
    </TeacherLayout>
  )
}

export default TeacherSchedule
