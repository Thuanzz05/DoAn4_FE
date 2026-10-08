import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle,
  ClipboardText,
  Clock,
  DownloadSimple,
  MapPin,
  Timer,
  UserMinus,
  UsersThree,
} from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Flex, Input, Modal, Radio, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import TeacherLayout, { type TeacherPage } from './TeacherLayout'
import './TeacherAttendance.css'
import { api, errorMessage, json } from '../api'
import { downloadCsv } from '../download'
import TeacherAcademicSummary from './TeacherAcademicSummary'

type TeacherAttendanceProps = {
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

type AttendanceStatus = 'present' | 'late' | 'absent' | ''
type Student = { id: number; code: string; name: string; rate: number | null; expected: number; recorded: number; certificateId: number | null }
type SessionApi = { id: number; classId: number; className: string; startsAt: string; endsAt: string; roomCode: string; students: number; attendanceMarked: number; status: string }
type AttendanceApi = { enrollmentId: number; studentCode: string; studentName: string; status: 'co_mat' | 'di_muon' | 'vang' | null; note: string | null; attendanceRate: number | null; expectedAttendance: number; recordedAttendance: number; certificateId: number | null }
const attendanceOptions = [
  { label: 'Có mặt', value: 'present' },
  { label: 'Muộn', value: 'late' },
  { label: 'Vắng', value: 'absent' },
]
const started = (value: string) => new Date(value.replace(' ', 'T')).getTime() <= Date.now()

const countAttendance = (values: AttendanceStatus[]) => values.reduce((result, status) => ({ ...result, [status || 'unmarked']: result[status || 'unmarked'] + 1 }), { present: 0, late: 0, absent: 0, unmarked: 0 })

if (import.meta.env.DEV) {
  const check = countAttendance(['present', 'late', 'absent', ''])
  if (Object.values(check).some((value) => value !== 1)) throw new Error('Attendance count check failed')
}

function TeacherAttendance({ onLogout, onNavigate, onNavigateHome }: TeacherAttendanceProps) {
  const [sessions, setSessions] = useState<SessionApi[]>([])
  const [session, setSession] = useState<number>()
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({})
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [attendanceError, setAttendanceError] = useState('')
  const [sessionsRetry, setSessionsRetry] = useState(0)
  const [attendanceRetry, setAttendanceRetry] = useState(0)
  const [requested] = useState(() => ({ session: Number(sessionStorage.getItem('teacher-attendance-session')), classId: Number(sessionStorage.getItem('teacher-attendance-class')) }))
  const [revision, setRevision] = useState(0)
  const [messageApi, messageContext] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()

  const counts = useMemo(() => countAttendance(Object.values(attendance)), [attendance])
  const currentSession = sessions.find((item) => item.id === session)
  const blocked = loading || sessionsLoading || saving || Boolean(sessionsError || attendanceError)
  useEffect(() => {
    let active = true
    setSessionsLoading(true); setSessionsError('')
    api<SessionApi[]>('/teacher/sessions').then((rows) => {
      if (!active) return
      const available = rows.filter((item) => item.status !== 'da_huy' && started(item.startsAt))
      const missing = (item: SessionApi) => Number(item.attendanceMarked) < Number(item.students)
      const firstForClass = available.find((item) => item.classId === requested.classId && missing(item)) ?? available.find((item) => item.classId === requested.classId)
      sessionStorage.removeItem('teacher-attendance-session'); sessionStorage.removeItem('teacher-attendance-class')
      setSessions(available)
      setSession((current) => available.some((item) => item.id === current) ? current : available.some((item) => item.id === requested.session) ? requested.session : firstForClass?.id ?? available.find(missing)?.id ?? available[0]?.id)
      setAttendanceRetry((value) => value + 1)
    }).catch((error) => { if (active) setSessionsError(errorMessage(error)) })
      .finally(() => { if (active) setSessionsLoading(false) })
    return () => { active = false }
  }, [requested, sessionsRetry])
  useEffect(() => {
    if (!session) { setStudents([]); setAttendance({}); setNotes({}); setSaved(false); setDirty(false); setLoading(false); setAttendanceError(''); return }
    let active = true
    setLoading(true); setSaved(false); setAttendanceError(''); setStudents([]); setAttendance({}); setNotes({}); setDirty(false)
    api<{ students: AttendanceApi[] }>(`/teacher/sessions/${session}/attendance`).then((result) => {
      if (!active) return
      setStudents(result.students.map((item) => ({ id: item.enrollmentId, code: item.studentCode, name: item.studentName, rate: item.attendanceRate === null ? null : Number(item.attendanceRate), expected: Number(item.expectedAttendance), recorded: Number(item.recordedAttendance), certificateId: item.certificateId })))
      setAttendance(Object.fromEntries(result.students.map((item) => [item.enrollmentId, item.status === 'co_mat' ? 'present' : item.status === 'di_muon' ? 'late' : item.status === 'vang' ? 'absent' : ''])))
      setNotes(Object.fromEntries(result.students.map((item) => [item.enrollmentId, item.note ?? ''])))
      setSaved(result.students.some((item) => item.status)); setDirty(false)
    }).catch((error) => { if (active) setAttendanceError(errorMessage(error)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session, attendanceRetry])
  useEffect(() => {
    if (!dirty && !saving) return
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const confirmHistoryNavigation = (event: Event) => {
      if (savingRef.current) { event.preventDefault(); messageApi.warning('Đang lưu điểm danh, vui lòng chờ.'); return }
      if (!window.confirm('Điểm danh có thay đổi chưa lưu. Bạn có muốn rời trang?')) event.preventDefault()
      else setDirty(false)
    }
    window.addEventListener('beforeunload', preventUnload)
    window.addEventListener('app:history-navigation', confirmHistoryNavigation)
    return () => {
      window.removeEventListener('beforeunload', preventUnload)
      window.removeEventListener('app:history-navigation', confirmHistoryNavigation)
    }
  }, [dirty, saving, messageApi])
  const setStatus = (id: number, status: AttendanceStatus) => { if (blocked || savingRef.current || students.find((student) => student.id === id)?.certificateId) return; setAttendance((current) => ({ ...current, [id]: status })); setDirty(true) }
  const markAllPresent = () => { if (blocked || savingRef.current) return; setAttendance((current) => ({ ...current, ...Object.fromEntries(students.filter((student) => !student.certificateId).map((student) => [student.id, 'present' as const])) })); setDirty(true) }

  const confirmDiscard = (action: () => void) => {
    if (savingRef.current) { messageApi.warning('Đang lưu điểm danh, vui lòng chờ.'); return }
    if (!dirty) { action(); return }
    modalApi.confirm({ title: 'Bỏ thay đổi chưa lưu?', content: 'Các thay đổi điểm danh hiện tại sẽ bị mất.', okText: 'Bỏ thay đổi', cancelText: 'Ở lại', okButtonProps: { danger: true }, onOk: () => { setDirty(false); action() } })
  }

  const persist = async () => {
    if (!session || !dirty || blocked || savingRef.current) return
    savingRef.current = true; setSaving(true)
    try {
      await api(`/teacher/sessions/${session}/attendance`, json('PUT', { items: students.map((student) => ({ enrollmentId: student.id, status: attendance[student.id] === 'present' ? 'co_mat' : attendance[student.id] === 'late' ? 'di_muon' : 'vang', note: notes[student.id] || null })) }))
      setSaved(true); setDirty(false); messageApi.success('Đã lưu điểm danh cho buổi học.')
      setRevision((value) => value + 1)
      setSessions((current) => current.map((item) => item.id === session ? { ...item, attendanceMarked: students.length, status: 'da_hoc' } : item))
      setAttendanceRetry((value) => value + 1)
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { savingRef.current = false; setSaving(false) }
  }

  const saveAttendance = () => {
    if (!dirty || blocked || savingRef.current) return
    if (counts.unmarked) {
      messageApi.warning(`Còn ${counts.unmarked} học viên chưa được điểm danh.`)
      return
    }
    if (!saved) {
      void persist()
      return
    }
    modalApi.confirm({ title: 'Ghi đè dữ liệu điểm danh?', content: 'Buổi học này đã được lưu. Các thay đổi mới sẽ thay thế kết quả trước đó.', okText: 'Ghi đè', cancelText: 'Hủy', onOk: persist })
  }

  const columns: ColumnsType<Student> = [
    { title: '#', key: 'index', width: 54, render: (_, __, index) => index + 1 },
    {
      title: 'Học viên', dataIndex: 'name', width: 250,
      render: (_, student) => <div className="admin-entity"><Avatar>{student.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><strong>{student.name}</strong><small>{student.code}</small></div></div>,
    },
    { title: 'Chuyên cần', dataIndex: 'rate', width: 150, render: (rate: number | null, student) => <Space orientation="vertical" size={2}><Tag color={rate === null ? 'default' : rate < 80 ? 'red' : rate < 90 ? 'orange' : 'green'}>{student.expected > 0 && rate !== null ? `${rate.toFixed(1)}%` : '—'}</Tag><Typography.Text type="secondary">{student.recorded}/{student.expected} buổi đã ghi nhận</Typography.Text></Space> },
    {
      title: 'Trạng thái', key: 'status', width: 280,
      render: (_, student) => <Radio.Group disabled={blocked || Boolean(student.certificateId)} className={`attendance-options status-${attendance[student.id] || 'unmarked'}`} options={attendanceOptions} optionType="button" buttonStyle="solid" value={attendance[student.id]} onChange={(event) => setStatus(student.id, event.target.value)} />,
    },
    {
      title: 'Ghi chú', key: 'note',
      render: (_, student) => <Input disabled={blocked || Boolean(student.certificateId)} maxLength={255} value={notes[student.id] ?? ''} placeholder={student.certificateId ? 'Hồ sơ chứng chỉ đã chốt' : 'Thêm ghi chú'} onChange={(event) => { if (blocked || savingRef.current || student.certificateId) return; setNotes((current) => ({ ...current, [student.id]: event.target.value })); setDirty(true) }} />,
    },
  ]

  return (
    <TeacherLayout activePage="teacher-attendance" mainId="teacher-attendance" onLogout={() => confirmDiscard(onLogout)} onNavigate={(page) => confirmDiscard(() => onNavigate(page))} onNavigateHome={() => confirmDiscard(onNavigateHome)}>
      {messageContext}{modalContext}
      <AdminPageHeader
        kicker="Theo dõi chuyên cần"
        title="Điểm danh lớp học"
        description="Chọn buổi học, cập nhật trạng thái từng học viên và xác nhận trước khi lưu."
        actions={<Space wrap><Button loading={sessionsLoading} disabled={saving} onClick={() => confirmDiscard(() => setSessionsRetry((value) => value + 1))}>Tải lại buổi học</Button><Button disabled={!students.length || blocked} icon={<DownloadSimple />} onClick={() => downloadCsv([['Mã học viên', 'Họ tên', 'Trạng thái', 'Ghi chú'], ...students.map((item) => [item.code, item.name, attendance[item.id] === 'present' ? 'Có mặt' : attendance[item.id] === 'late' ? 'Đi muộn' : attendance[item.id] === 'absent' ? 'Vắng' : 'Chưa điểm danh', notes[item.id] ?? ''])], 'diem-danh-buoi.csv')}>Xuất CSV buổi này</Button></Space>}
      />

      <Card className="attendance-session-card">
        <Flex align="center" justify="space-between" gap={20} wrap>
          <div><Typography.Text type="secondary">Buổi học cần điểm danh</Typography.Text><Select loading={sessionsLoading} disabled={saving || sessionsLoading || Boolean(sessionsError)} value={session} onChange={(value) => confirmDiscard(() => setSession(value))} options={sessions.map((item) => ({ value: item.id, label: `${item.className} · ${new Date(item.startsAt.replace(' ', 'T')).toLocaleString('vi-VN')}${Number(item.attendanceMarked) < Number(item.students) ? ' · Còn thiếu điểm danh' : ''}` }))} /></div>
          <Space size={22} wrap className="attendance-session-meta"><span><Clock />{currentSession ? `${new Date(currentSession.startsAt.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}–${new Date(currentSession.endsAt.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '—'}</span><span><MapPin />{currentSession?.roomCode ?? '—'}</span><span><UsersThree />{loading || sessionsLoading || sessionsError || attendanceError ? '—' : students.length} học viên</span><Tag color={dirty || !saved || counts.unmarked ? 'orange' : 'green'}>{loading || sessionsLoading ? 'Đang tải dữ liệu' : sessionsError || attendanceError ? 'Chưa tải được dữ liệu' : dirty ? 'Có thay đổi chưa lưu' : saved ? counts.unmarked ? 'Đã lưu một phần' : 'Đã lưu' : 'Chưa hoàn tất'}</Tag></Space>
        </Flex>
      </Card>
      {sessionsError && <Alert type="error" showIcon title="Chưa tải được buổi học" description={sessionsError} action={<Button disabled={saving} onClick={() => confirmDiscard(() => setSessionsRetry((value) => value + 1))}>Thử lại danh sách buổi</Button>} />}
      {attendanceError && <Alert type="error" showIcon title="Chưa tải được điểm danh buổi này" description={attendanceError} action={<Button disabled={saving} onClick={() => confirmDiscard(() => setAttendanceRetry((value) => value + 1))}>Thử lại điểm danh</Button>} />}
      {!sessionsError && !sessionsLoading && !sessions.length && <Alert type="info" showIcon title="Chưa có buổi học được phân công đã đến giờ" />}
      <TeacherAcademicSummary section="attendance" revision={revision} focusedClassId={currentSession?.classId} onOpenSession={(sessionId) => confirmDiscard(() => {
        if (!sessions.some((item) => item.id === sessionId)) { messageApi.warning('Buổi học không còn trong danh sách được phân công. Hãy tải lại buổi học hoặc liên hệ giáo vụ.'); return }
        if (sessionId === session) setAttendanceRetry((value) => value + 1)
        else setSession(sessionId)
      })} />
      {!sessionsLoading && !loading && !sessionsError && !attendanceError && <AdminSummary items={[
        { label: 'Có mặt', value: counts.present, detail: 'Học viên tham gia đúng giờ', icon: <CheckCircle weight="duotone" />, tone: 'success' },
        { label: 'Đi muộn', value: counts.late, detail: 'Có mặt sau giờ bắt đầu', icon: <Timer weight="duotone" /> },
        { label: 'Vắng', value: counts.absent, detail: 'Có phép hoặc không phép', icon: <UserMinus weight="duotone" />, tone: 'danger' },
        { label: 'Chưa đánh dấu', value: counts.unmarked, detail: 'Cần hoàn tất trước khi lưu', icon: <ClipboardText weight="duotone" /> },
      ]} />}

      <Card
        className="admin-table-card attendance-table-card"
        title="Danh sách học viên"
        extra={<Space><Button disabled={!session || sessionsLoading || saving || Boolean(sessionsError)} loading={loading} onClick={() => confirmDiscard(() => setAttendanceRetry((value) => value + 1))}>Tải lại điểm danh</Button><Button disabled={!students.length || blocked || students.every((student) => Boolean(student.certificateId))} onClick={markAllPresent}>Tất cả có mặt</Button><Button type="primary" loading={saving} disabled={!session || !students.length || !dirty || blocked || students.every((student) => Boolean(student.certificateId))} icon={<CheckCircle />} onClick={saveAttendance}>Lưu điểm danh</Button></Space>}
      >
        <Table loading={loading || sessionsLoading} columns={columns} dataSource={sessionsError || attendanceError ? [] : students} rowKey="id" pagination={false} scroll={{ x: 1020, y: 520 }} />
      </Card>

    </TeacherLayout>
  )
}

export default TeacherAttendance
