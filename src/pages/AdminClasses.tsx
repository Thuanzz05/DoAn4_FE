import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarBlank, CaretRight, CheckCircle, MagnifyingGlass, MapPin, PencilSimple, Play, Plus, Student, Trash, UsersThree, XCircle } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, InputNumber, Modal, Progress, Select, Space, Table, Tabs, Tag, Timeline, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { ApiError, api, errorMessage, json } from '../api'
import AcademicDetails from './AcademicDetails'

type ClassStatus = 'Đang học' | 'Sắp khai giảng' | 'Đã kết thúc' | 'Đã hủy'
type ClassRecord = { id: number; code: string; name: string; course: string; courseId: number; startDate: string; sessions: number; generatedSessions: number; effectiveSessions: number; completedSessions: number; capacity: number; enrolled: number; teacher: string; teacherId: number | null; schedule: string; room: string; roomCodes: string[]; status: ClassStatus; progress: number; certificateLocked: boolean }
type ClassForm = Pick<ClassRecord, 'code' | 'name' | 'courseId' | 'teacherId' | 'startDate' | 'sessions' | 'capacity'>
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }
type ClassApi = { id: number; code: string; name: string; courseId: number; courseName: string; teacherId: number | null; teacherName: string | null; startDate: string; sessions: number; generatedSessions: number; effectiveSessions: number; completedSessions: number; capacity: number; status: string; enrolled: number; certificateLocked: number }
type CourseOption = { id: number; name: string; sessions: number }
type TeacherOption = { id: number; fullName: string; active: number }
type RoomOption = { id: number; code: string; capacity: number }
type ScheduleApi = { classId: number; roomCode: string; dayOfWeek: number; startTime: string }
type SessionStatus = 'da_len_lich' | 'da_hoc' | 'da_huy'
type SessionApi = { id: number; classId: number; teacherId: number; teacherName: string; roomId: number; roomCode: string; startsAt: string; endsAt: string; status: SessionStatus; attendanceCount: number; missingAttendanceCount: number }
type SessionForm = { date: string; startTime: string; endTime: string; teacherId: number; roomId: number; reason: string }
type AttendanceStatus = 'co_mat' | 'di_muon' | 'vang'
type AttendanceRow = { enrollmentId: number; studentCode: string; studentName: string; status: AttendanceStatus | null; note: string | null; certificateId: number | null }
type SessionAttendance = { session: Pick<SessionApi, 'id' | 'classId' | 'startsAt' | 'endsAt' | 'status' | 'teacherName' | 'roomCode'>; students: AttendanceRow[] }
type AttendanceForm = { reason: string; items: Array<{ enrollmentId: number; status: AttendanceStatus; note?: string }> }
type SessionHistory = { id: number; action: string; reason: string; before: Record<string, unknown> | null; after: Record<string, unknown>; changedAt: string; actorName: string }
const statusColor: Record<ClassStatus, string> = { 'Đang học': 'green', 'Sắp khai giảng': 'gold', 'Đã kết thúc': 'default', 'Đã hủy': 'red' }
const sessionStatus: Record<SessionStatus, { label: string; color: string }> = { da_len_lich: { label: 'Đã lên lịch', color: 'blue' }, da_hoc: { label: 'Đã học', color: 'green' }, da_huy: { label: 'Đã hủy', color: 'red' } }
const displayDate = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))
const attendanceOptions = [{ value: 'co_mat', label: 'Có mặt' }, { value: 'di_muon', label: 'Đi muộn' }, { value: 'vang', label: 'Vắng' }]
const attendanceText = (status: AttendanceStatus | null) => attendanceOptions.find((item) => item.value === status)?.label ?? 'Chưa ghi'
const timeText = (value: string) => new Date(value.replace(' ', 'T')).toLocaleString('vi-VN')
const reasonRules = [{ required: true, whitespace: true, message: 'Vui lòng nhập lý do xử lý.' }, { max: 255, message: 'Lý do tối đa 255 ký tự.' }]

function AdminClasses({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [classSessions, setClassSessions] = useState<SessionApi[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const loadRequest = useRef(0)
  const sessionsRequestId = useRef(0)
  const selectedClassId = useRef<number | null>(null)
  const [sessionEditing, setSessionEditing] = useState<SessionApi | null>(null)
  const [sessionCanceling, setSessionCanceling] = useState<SessionApi | null>(null)
  const [attendanceSession, setAttendanceSession] = useState<SessionApi | null>(null)
  const [attendance, setAttendance] = useState<SessionAttendance | null>(null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const attendanceRequestId = useRef(0)
  const [historySession, setHistorySession] = useState<SessionApi | null>(null)
  const [history, setHistory] = useState<SessionHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const historyRequestId = useRef(0)
  const [sessionSaving, setSessionSaving] = useState(false)
  const sessionSavePending = useRef(false)
  const [academicRevision, setAcademicRevision] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | ClassStatus>('Tất cả')
  const [selected, setSelected] = useState<ClassRecord | null>(null)
  const [editing, setEditing] = useState<ClassRecord | 'new' | null>(null)
  const [form] = Form.useForm<ClassForm>()
  const [sessionForm] = Form.useForm<SessionForm>()
  const [cancelForm] = Form.useForm<{ reason: string }>()
  const [attendanceForm] = Form.useForm<AttendanceForm>()
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  const data = useMemo(() => classes.filter((item) => (!query.trim() || [item.name, item.code, item.course, item.teacher].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [classes, query, status])
  const planLocked = typeof editing === 'object' && editing !== null && editing.generatedSessions > 0
  const missingLearners = attendance?.students.filter((item) => item.status === null && !item.certificateId) ?? []
  const blocked = loading || Boolean(loadError) || sessionSaving
  const teacherOptions = (currentId?: number | null) => teachers.filter((item) => Number(item.active) || item.id === currentId).map((item) => ({ value: item.id, label: `${item.fullName}${Number(item.active) ? '' : ' · Đã khóa'}`, disabled: !Number(item.active) }))

  const load = async () => {
    const requestId = ++loadRequest.current
    setLoading(true); setLoadError('')
    try {
      const [rows, courseRows, teacherRows, roomRows, schedules] = await Promise.all([api<ClassApi[]>('/classes'), api<CourseOption[]>('/courses/all'), api<TeacherOption[]>('/users?role=giao_vien'), api<RoomOption[]>('/rooms'), api<ScheduleApi[]>('/schedules')])
      if (requestId !== loadRequest.current) return
      setCourses(courseRows); setTeachers(teacherRows); setRooms(roomRows)
      const statusMap: Record<string, ClassStatus> = { sap_khai_giang: 'Sắp khai giảng', dang_hoc: 'Đang học', da_ket_thuc: 'Đã kết thúc', da_huy: 'Đã hủy' }
      const records = rows.map((item) => { const slots = schedules.filter((slot) => slot.classId === item.id); const total = Number(item.sessions); const completed = Number(item.completedSessions); return { id: item.id, code: item.code, name: item.name, course: item.courseName, courseId: item.courseId, startDate: String(item.startDate).slice(0, 10), sessions: total, generatedSessions: Number(item.generatedSessions), effectiveSessions: Number(item.effectiveSessions), completedSessions: completed, capacity: Number(item.capacity), enrolled: Number(item.enrolled), teacher: item.teacherName ?? 'Chưa phân công', teacherId: item.teacherId, schedule: slots.length ? slots.map((slot) => `${slot.dayOfWeek === 1 ? 'CN' : `T${slot.dayOfWeek}`} · ${slot.startTime.slice(0, 5)}`).join(', ') : 'Chưa xếp lịch', room: slots.map((slot) => slot.roomCode).join(', ') || '—', roomCodes: slots.map((slot) => slot.roomCode), status: statusMap[item.status] ?? 'Sắp khai giảng', progress: total ? Math.round(completed * 100 / total) : 0, certificateLocked: Boolean(Number(item.certificateLocked)) } })
      setClasses(records); setSelected((current) => current ? records.find((item) => item.id === current.id) ?? null : null)
      if (selectedClassId.current !== null && !records.some((item) => item.id === selectedClassId.current)) closeDetails()
    } catch (error) { if (requestId === loadRequest.current) { setLoadError(errorMessage(error)); closeDetails() } }
    finally { if (requestId === loadRequest.current) setLoading(false) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])
  useEffect(() => () => { loadRequest.current += 1; sessionsRequestId.current += 1; attendanceRequestId.current += 1; historyRequestId.current += 1; selectedClassId.current = null }, [])

  const closeDetails = () => {
    selectedClassId.current = null; sessionsRequestId.current += 1; attendanceRequestId.current += 1; historyRequestId.current += 1
    setSelected(null); setClassSessions([]); setSessionsLoading(false); setSessionsError(''); setSessionEditing(null); setSessionCanceling(null); setAttendanceSession(null); setAttendance(null); setHistorySession(null)
  }
  const loadSessions = async (classId: number) => {
    if (classId !== selectedClassId.current) return
    const requestId = ++sessionsRequestId.current
    setClassSessions([]); setSessionsLoading(true); setSessionsError('')
    try {
      const rows = await api<SessionApi[]>(`/classes/${classId}/sessions`)
      if (requestId === sessionsRequestId.current && classId === selectedClassId.current) { setClassSessions(rows); return rows }
    } catch (error) { if (requestId === sessionsRequestId.current) setSessionsError(errorMessage(error)) }
    finally { if (requestId === sessionsRequestId.current) setSessionsLoading(false) }
  }
  const openDetails = (item: ClassRecord) => {
    if (blocked) return
    closeDetails(); selectedClassId.current = item.id; setSelected(item); setActiveTab('overview'); void loadSessions(item.id)
  }
  const openSessionEdit = (item: SessionApi) => {
    if (blocked || sessionsLoading || sessionsError || item.classId !== selectedClassId.current) return
    sessionForm.resetFields()
    sessionForm.setFieldsValue({ date: item.startsAt.slice(0, 10), startTime: item.startsAt.slice(11, 16), endTime: item.endsAt.slice(11, 16), teacherId: item.teacherId, roomId: item.roomId, reason: '' })
    setSessionEditing(item)
  }
  const refreshSession = async (classId: number) => {
    await load(); await loadSessions(classId)
    if (classId === selectedClassId.current) setAcademicRevision((value) => value + 1)
  }
  const saveSession = async (values: SessionForm) => {
    if (!sessionEditing || blocked || sessionSavePending.current || sessionEditing.classId !== selectedClassId.current) return
    const item = sessionEditing
    sessionSavePending.current = true; setSessionSaving(true)
    try {
      await api(`/sessions/${item.id}`, json('PATCH', { ...values, reason: values.reason.trim() }))
      if (item.classId === selectedClassId.current) setSessionEditing(null)
      await refreshSession(item.classId); messageApi.success(item.status === 'da_huy' ? 'Đã xếp lịch học bù và ghi lịch sử.' : 'Đã cập nhật buổi học và ghi lịch sử.')
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { sessionSavePending.current = false; setSessionSaving(false) }
  }
  const cancelSession = (item: SessionApi) => {
    if (blocked || sessionsLoading || sessionsError || item.classId !== selectedClassId.current) return
    cancelForm.resetFields(); setSessionCanceling(item)
  }
  const saveCancellation = async ({ reason }: { reason: string }) => {
    if (!sessionCanceling || blocked || sessionSavePending.current || sessionCanceling.classId !== selectedClassId.current) return
    const item = sessionCanceling
    sessionSavePending.current = true; setSessionSaving(true)
    try {
      await api(`/sessions/${item.id}/cancel`, json('POST', { reason: reason.trim() }))
      if (item.classId === selectedClassId.current) setSessionCanceling(null)
      await refreshSession(item.classId); messageApi.success('Đã hủy buổi học và ghi lịch sử. Hãy xếp lịch bù để đủ chương trình.')
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { sessionSavePending.current = false; setSessionSaving(false) }
  }
  const loadAttendance = async (item: SessionApi) => {
    if (item.classId !== selectedClassId.current) return
    const requestId = ++attendanceRequestId.current
    setAttendance(null); setAttendanceLoading(true); setAttendanceError(''); attendanceForm.resetFields()
    try {
      const result = await api<SessionAttendance>(`/sessions/${item.id}/attendance`)
      if (requestId !== attendanceRequestId.current || item.classId !== selectedClassId.current) return
      setAttendance(result)
      attendanceForm.setFieldsValue({ reason: '', items: result.students.filter((row) => row.status === null && !row.certificateId).map((row) => ({ enrollmentId: row.enrollmentId, note: '' })) })
    } catch (error) { if (requestId === attendanceRequestId.current) setAttendanceError(errorMessage(error)) }
    finally { if (requestId === attendanceRequestId.current) setAttendanceLoading(false) }
  }
  const openAttendance = (item: SessionApi) => {
    if (blocked || sessionsError || item.classId !== selectedClassId.current) return
    setAttendanceSession(item); void loadAttendance(item)
  }
  const openAcademicSession = async (sessionId: number) => {
    const classId = selectedClassId.current
    if (classId === null || blocked || sessionSavePending.current) return
    setActiveTab('sessions')
    const rows = await loadSessions(classId)
    if (!rows || classId !== selectedClassId.current) return
    const item = rows.find((row) => row.id === sessionId)
    if (!item || item.status === 'da_huy' || Number(item.missingAttendanceCount) < 1) { messageApi.warning('Buổi này không còn điểm danh có thể bổ sung.'); return }
    // Use this fresh response, not the previous render's sessionsError/loading state.
    setAttendanceSession(item); void loadAttendance(item)
  }
  const saveAttendance = async (values: AttendanceForm) => {
    if (!attendanceSession || !attendance || blocked || attendanceLoading || attendanceError || sessionSavePending.current || attendanceSession.classId !== selectedClassId.current || !missingLearners.length) return
    const item = attendanceSession
    sessionSavePending.current = true; setSessionSaving(true)
    try {
      await api(`/sessions/${item.id}/attendance`, json('PUT', { reason: values.reason.trim(), items: values.items.map((row) => ({ ...row, note: row.note?.trim() || null })) }))
      if (item.classId === selectedClassId.current) { attendanceRequestId.current += 1; setAttendanceSession(null); setAttendance(null) }
      await refreshSession(item.classId); messageApi.success('Đã bổ sung điểm danh và ghi lịch sử xử lý.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && item.classId === selectedClassId.current) setAttendanceError(errorMessage(error))
      messageApi.error(errorMessage(error))
    }
    finally { sessionSavePending.current = false; setSessionSaving(false) }
  }
  const loadHistory = async (item: SessionApi) => {
    if (item.classId !== selectedClassId.current) return
    const requestId = ++historyRequestId.current
    setHistory([]); setHistoryLoading(true); setHistoryError('')
    try {
      const rows = await api<SessionHistory[]>(`/sessions/${item.id}/history`)
      if (requestId === historyRequestId.current && item.classId === selectedClassId.current) setHistory(rows)
    } catch (error) { if (requestId === historyRequestId.current) setHistoryError(errorMessage(error)) }
    finally { if (requestId === historyRequestId.current) setHistoryLoading(false) }
  }
  const openHistory = (item: SessionApi) => {
    if (item.classId !== selectedClassId.current) return
    setHistorySession(item); void loadHistory(item)
  }
  const historyFields = (value: SessionHistory['before']) => {
    if (!value) return 'Chưa có'
    const snapshot = (value.session ?? value) as Record<string, unknown>
    const snapshotStatus = snapshot.status as SessionStatus
    const marks = value.items as Array<{ enrollmentId: number; studentCode?: string; studentName?: string; status: AttendanceStatus; note?: string }> | undefined
    return <><Typography.Paragraph style={{ marginBottom: 8 }}>{snapshot.startsAt ? timeText(String(snapshot.startsAt)) : '—'} – {String(snapshot.endsAt ?? '').slice(11, 16)}<br />{String(snapshot.teacherName ?? teachers.find((row) => row.id === Number(snapshot.teacherId))?.fullName ?? 'Chưa phân công')} · {String(snapshot.roomCode ?? rooms.find((row) => row.id === Number(snapshot.roomId))?.code ?? '—')}<br />{sessionStatus[snapshotStatus]?.label ?? '—'}</Typography.Paragraph>{marks && (marks.length ? marks.map((mark) => <Typography.Paragraph key={mark.enrollmentId} style={{ marginBottom: 4 }}>{mark.studentName || mark.studentCode || `Học viên #${mark.enrollmentId}`}: {attendanceText(mark.status)}{mark.note ? ` · ${mark.note}` : ''}</Typography.Paragraph>) : <Typography.Text type="secondary">Chưa có điểm danh</Typography.Text>)}</>
  }

  const openNew = () => { form.resetFields(); form.setFieldsValue({ courseId: courses[0]?.id, sessions: courses[0]?.sessions ?? 24, capacity: 20 }); setEditing('new') }
  const openEdit = (item: ClassRecord) => { form.setFieldsValue(item); closeDetails(); setEditing(item) }
  const save = async (values: ClassForm) => {
    if (!editing || blocked || sessionSavePending.current) return
    const code = values.code.trim().toUpperCase()
    if (classes.some((item) => item.code === code && item.code !== (typeof editing === 'object' && editing ? editing.code : ''))) {
      form.setFields([{ name: 'code', errors: ['Mã lớp đã tồn tại.'] }]); return
    }
    if (typeof editing === 'object' && editing && values.capacity < editing.enrolled) {
      form.setFields([{ name: 'capacity', errors: [`Sĩ số hiện tại là ${editing.enrolled}.`] }]); return
    }
    if (typeof editing === 'object' && editing && editing.enrolled > 0 && editing.courseId !== values.courseId) {
      form.setFields([{ name: 'courseId', errors: ['Lớp đã có học viên, không thể đổi khóa học.'] }]); return
    }
    sessionSavePending.current = true; setSessionSaving(true)
    try { const body = { ...values, code, name: values.name.trim(), teacherId: values.teacherId ?? null }; if (editing === 'new') await api('/classes', json('POST', body)); else await api(`/classes/${editing.id}`, json('PATCH', body)); messageApi.success(editing === 'new' ? 'Đã tạo lớp học.' : 'Đã cập nhật lớp học.'); setEditing(null); await load() } catch (error) { messageApi.error(errorMessage(error)) }
    finally { sessionSavePending.current = false; setSessionSaving(false) }
  }
  const cancel = (item: ClassRecord) => {
    if (item.enrolled > 0) { messageApi.warning('Lớp đang có học viên. Hãy chuyển lớp cho học viên trước khi hủy.'); return }
    if (item.status === 'Đã kết thúc' || item.status === 'Đã hủy') return
    modalApi.confirm({ title: 'Hủy lớp học?', content: `${item.name} · ${item.code}`, okText: 'Hủy lớp', okButtonProps: { danger: true }, onOk: async () => {
      if (blocked || sessionSavePending.current) return
      sessionSavePending.current = true; setSessionSaving(true)
      try { await api(`/classes/${item.id}/cancel`, json('POST')); closeDetails(); await load(); messageApi.success('Đã hủy lớp học.') } catch (error) { messageApi.error(errorMessage(error)); throw error }
      finally { sessionSavePending.current = false; setSessionSaving(false) }
    } })
  }
  const generateSessions = (item: ClassRecord) => {
    modalApi.confirm({
      title: `Tạo ${item.sessions} buổi học?`,
      content: `${item.name} sẽ sinh buổi học từ lịch hàng tuần hiện tại. Thao tác chỉ thực hiện một lần.`,
      okText: 'Tạo buổi học',
      onOk: async () => {
        if (blocked || sessionSavePending.current) return
        sessionSavePending.current = true; setSessionSaving(true)
        try {
          const result = await api<{ created: number }>(`/classes/${item.id}/generate-sessions`, json('POST'))
          await load(); closeDetails(); messageApi.success(`Đã tạo ${result.created} buổi học.`)
        } catch (error) { messageApi.error(errorMessage(error)); throw error }
        finally { sessionSavePending.current = false; setSessionSaving(false) }
      },
    })
  }
  const changeLifecycle = (item: ClassRecord, action: 'start' | 'complete') => {
    const completing = action === 'complete'
    modalApi.confirm({
      title: completing ? 'Kết thúc lớp học?' : 'Bắt đầu lớp học?',
      content: completing
        ? 'Cần tất cả buổi học đã kết thúc và đủ điểm danh từng học viên. Hoàn thành lớp không đồng nghĩa đạt chứng chỉ; điểm, học phí và chuyên cần được xét riêng.'
        : `Lớp phải có đủ ${item.sessions} buổi chưa hủy và ít nhất một học viên.`,
      okText: completing ? 'Kết thúc lớp' : 'Bắt đầu lớp',
      onOk: async () => {
        if (blocked || sessionSavePending.current) return
        sessionSavePending.current = true; setSessionSaving(true)
        try {
          await api(`/classes/${item.id}/${action}`, json('POST'))
          closeDetails(); await load(); messageApi.success(completing ? 'Đã kết thúc lớp học.' : 'Đã bắt đầu lớp học.')
        } catch (error) { messageApi.error(errorMessage(error)); throw error }
        finally { sessionSavePending.current = false; setSessionSaving(false) }
      },
    })
  }
  const sessionColumns: TableProps<SessionApi>['columns'] = [
    { title: 'Ngày học', key: 'date', render: (_, item) => <div><Typography.Text strong>{new Date(`${item.startsAt.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN')}</Typography.Text><br /><Typography.Text type="secondary">{item.startsAt.slice(11, 16)}–{item.endsAt.slice(11, 16)}</Typography.Text></div> },
    { title: 'Giáo viên', dataIndex: 'teacherName' },
    { title: 'Phòng', dataIndex: 'roomCode', width: 80 },
    { title: 'Trạng thái', dataIndex: 'status', width: 110, render: (value: SessionStatus) => <Tag color={sessionStatus[value].color}>{sessionStatus[value].label}</Tag> },
    { title: 'Điểm danh', key: 'attendance', width: 130, render: (_, item) => <><Typography.Text>{item.attendanceCount} đã ghi</Typography.Text>{Number(item.missingAttendanceCount) > 0 && <><br /><Typography.Text type="warning">{item.missingAttendanceCount} còn thiếu</Typography.Text></>}</> },
    { title: 'Thao tác', key: 'actions', width: 310, render: (_, item) => {
      const future = new Date(item.startsAt.replace(' ', 'T')).getTime() > Date.now()
      const mutable = !blocked && !sessionsLoading && !sessionsError && selected && !selected.certificateLocked && !['Đã kết thúc', 'Đã hủy'].includes(selected.status) && Number(item.attendanceCount) === 0
      const editable = mutable && (item.status === 'da_huy' || (item.status === 'da_len_lich' && future))
      const cancellable = mutable && item.status === 'da_len_lich'
      const supplement = !blocked && !sessionsLoading && !sessionsError && selected?.status !== 'Đã hủy' && item.status !== 'da_huy' && !future && Number(item.missingAttendanceCount) > 0
      return <Space size={4} wrap>{editable && <Button size="small" icon={<PencilSimple />} onClick={() => openSessionEdit(item)}>{item.status === 'da_huy' ? 'Xếp lịch bù' : 'Dời buổi'}</Button>}{cancellable && <Button size="small" danger icon={<XCircle />} onClick={() => cancelSession(item)}>Hủy buổi</Button>}{supplement && <Button size="small" onClick={() => openAttendance(item)}>Bổ sung điểm danh</Button>}<Button disabled={blocked || sessionsLoading || Boolean(sessionsError)} size="small" onClick={() => openHistory(item)}>Lịch sử</Button></Space>
    } },
  ]
  const columns: TableProps<ClassRecord>['columns'] = [
    { title: 'Lớp học', key: 'class', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.name.slice(0, 2).toUpperCase()}</Avatar><div><strong>{item.name}</strong><small>{item.code} · {item.course}</small></div></div> },
    { title: 'Giáo viên', dataIndex: 'teacher' },
    { title: 'Lịch và phòng', key: 'schedule', render: (_, item) => <div><Typography.Text strong>{item.schedule}</Typography.Text><br /><Typography.Text type="secondary">{item.room}</Typography.Text></div> },
    { title: 'Sĩ số', key: 'students', render: (_, item) => `${item.enrolled}/${item.capacity}` },
    { title: 'Tiến độ', dataIndex: 'progress', width: 150, render: (value: number) => <Progress percent={value} size="small" /> },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: ClassStatus) => <Tag color={statusColor[value]}>{value}</Tag> },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button disabled={blocked} icon={<CaretRight />} onClick={() => openDetails(item)} aria-label={`Xem lớp ${item.name}`} /> },
  ]

  return <AdminLayout activePage="classes" mainId="class-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}{modalContext}
    <AdminPageHeader kicker="Tổ chức đào tạo" title="Quản lý lớp học" description="Tạo lớp từ khóa học, theo dõi sĩ số và trạng thái vận hành." actions={<Button disabled={blocked || !courses.length} type="primary" icon={<Plus />} onClick={openNew}>Tạo lớp học</Button>} />
    {loadError && <Alert type="error" showIcon title="Không tải được lớp học" description={loadError} action={<Button loading={loading} onClick={() => void load()}>Thử lại</Button>} style={{ marginBottom: 16 }} />}
    {!loading && !loadError && <AdminSummary items={[
      { label: 'Lớp hoạt động', value: classes.filter((item) => item.status === 'Đang học').length, detail: 'Lớp đang giảng dạy', icon: <UsersThree weight="duotone" />, tone: 'success' },
      { label: 'Học viên đã xếp lớp', value: classes.filter((item) => item.status !== 'Đã hủy').reduce((sum, item) => sum + item.enrolled, 0), detail: 'Dữ liệu hệ thống', icon: <Student weight="duotone" /> },
      { label: 'Phòng đang sử dụng', value: new Set(classes.filter((item) => item.status === 'Đang học').flatMap((item) => item.roomCodes)).size, detail: 'Theo lịch các lớp đang học', icon: <MapPin weight="duotone" /> },
    ]} />}
    <Card className="admin-table-card" title="Danh sách lớp học" extra={<Space wrap><Input disabled={loading || Boolean(loadError)} allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, khóa hoặc giáo viên" /><Select disabled={loading || Boolean(loadError)} value={status} onChange={setStatus} options={['Tất cả', 'Đang học', 'Sắp khai giảng', 'Đã kết thúc', 'Đã hủy'].map((value) => ({ value, label: value }))} /></Space>}><Table loading={loading} rowKey="id" columns={columns} dataSource={loading || loadError ? [] : data} scroll={{ x: 1000 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} lớp học` }} locale={{ emptyText: loading ? 'Đang tải lớp…' : loadError ? 'Chưa tải được dữ liệu, hãy thử lại' : 'Không tìm thấy lớp phù hợp' }} /></Card>
    <Drawer size={760} title="Thông tin lớp học" open={Boolean(selected)} onClose={() => !sessionSaving && closeDetails()}>
      {selected && <>
        <Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.slice(0, 2).toUpperCase()}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text type="secondary">{selected.code}</Typography.Text></div></Flex>
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 18 }} items={[
          {
            key: 'overview', label: 'Tổng quan', children: <>
              <Descriptions bordered column={1} size="small" items={[{ key: 'course', label: 'Khóa học', children: selected.course }, { key: 'start', label: 'Ngày khai giảng', children: displayDate(selected.startDate) }, { key: 'sessions', label: 'Buổi học', children: `${selected.completedSessions}/${selected.generatedSessions}/${selected.sessions} hoàn tất/đã tạo/kế hoạch` }, { key: 'teacher', label: 'Giáo viên', children: selected.teacher }, { key: 'schedule', label: 'Lịch học', children: selected.schedule }, { key: 'room', label: 'Phòng học', children: selected.room }, { key: 'students', label: 'Sĩ số', children: `${selected.enrolled}/${selected.capacity} học viên` }, { key: 'progress', label: 'Tiến độ', children: `${selected.progress}%` }]} />
              <Card size="small" className="admin-drawer-status"><Flex justify="space-between"><Typography.Text type="secondary">Trạng thái lớp</Typography.Text><Tag color={statusColor[selected.status]}>{selected.status}</Tag></Flex></Card>
              {selected.generatedSessions > selected.effectiveSessions && <Alert style={{ marginTop: 16 }} type="warning" showIcon title={`${selected.generatedSessions - selected.effectiveSessions} buổi đã hủy chưa xếp học bù`} description="Mở tab Buổi học để xếp bù. Buổi hủy không được tính hoàn thành chương trình." />}
              {selected.status !== 'Đã hủy' && selected.status !== 'Đã kết thúc' && <Space orientation="vertical" style={{ width: '100%', marginTop: 18 }}><Button block icon={<CalendarBlank />} disabled={blocked || !selected.teacherId || selected.schedule === 'Chưa xếp lịch' || selected.generatedSessions > 0} onClick={() => generateSessions(selected)}>{selected.generatedSessions ? `Đã tạo ${selected.generatedSessions} buổi học` : 'Tạo các buổi học'}</Button>{selected.status === 'Sắp khai giảng' && <Button block type="primary" icon={<Play />} disabled={blocked || selected.effectiveSessions !== selected.sessions || selected.enrolled === 0} onClick={() => changeLifecycle(selected, 'start')}>Bắt đầu lớp học</Button>}{selected.status === 'Đang học' && <Button block type="primary" icon={<CheckCircle />} disabled={blocked || selected.completedSessions !== selected.sessions} onClick={() => changeLifecycle(selected, 'complete')}>Kết thúc lớp học</Button>}<Button disabled={blocked} block icon={<PencilSimple />} onClick={() => openEdit(selected)}>Sửa thông tin lớp</Button><Button disabled={blocked || selected.certificateLocked || selected.enrolled > 0 || selected.completedSessions > 0} block danger icon={<Trash />} onClick={() => cancel(selected)}>Hủy lớp học</Button></Space>}
            </>,
          },
          {
            key: 'sessions', label: `Buổi học (${sessionsLoading || sessionsError ? "…" : classSessions.length})`, children: <>{sessionsError && <Alert type="error" showIcon title="Không tải được buổi học" description={sessionsError} action={<Button disabled={blocked} onClick={() => void loadSessions(selected.id)}>Thử lại</Button>} style={{ marginBottom: 16 }} />}{selected.certificateLocked && <Alert type="info" showIcon title="Lớp đã chốt hồ sơ chứng chỉ" description="Lịch học đã khóa. Điểm danh chỉ được bổ sung cho học viên còn thiếu và chưa chốt chứng chỉ." style={{ marginBottom: 16 }} />}<Table rowKey="id" size="small" loading={sessionsLoading} columns={sessionColumns} dataSource={sessionsError ? [] : classSessions} pagination={{ pageSize: 8, hideOnSinglePage: true }} scroll={{ x: 950 }} locale={{ emptyText: sessionsLoading ? 'Đang tải buổi học…' : sessionsError ? 'Chưa tải được dữ liệu buổi học' : selected.generatedSessions ? 'Không có buổi học' : 'Hãy tạo các buổi học từ tab Tổng quan' }} /></>,
          },
          { key: 'academic', label: 'Học viên, điểm danh và điểm', children: <AcademicDetails classId={selected.id} revision={academicRevision} onOpenSession={(sessionId) => void openAcademicSession(sessionId)} /> },
        ]} />
      </>}
    </Drawer>
    <Modal title={sessionEditing?.status === 'da_huy' ? 'Xếp lịch học bù' : 'Dời buổi học'} open={sessionEditing !== null} onCancel={() => !sessionSaving && setSessionEditing(null)} onOk={() => sessionForm.submit()} confirmLoading={sessionSaving} okButtonProps={{ disabled: loading || Boolean(loadError) }} okText="Lưu và ghi lịch sử" destroyOnHidden>
      <Form form={sessionForm} layout="vertical" disabled={blocked} onFinish={saveSession} style={{ marginTop: 20 }}>
        <Form.Item name="date" label="Ngày học" rules={[{ required: true, message: 'Vui lòng chọn ngày học.' }]}><Input type="date" /></Form.Item>
        <Space align="start"><Form.Item name="startTime" label="Giờ bắt đầu" rules={[{ required: true }]}><Input type="time" /></Form.Item><Form.Item name="endTime" label="Giờ kết thúc" rules={[{ required: true }]}><Input type="time" /></Form.Item></Space>
        <Form.Item name="teacherId" label="Giáo viên" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={teacherOptions(sessionEditing?.teacherId)} /></Form.Item>
        <Form.Item name="roomId" label="Phòng học" rules={[{ required: true }]}><Select options={rooms.filter((room) => room.capacity >= (selected?.capacity ?? 0)).map((room) => ({ value: room.id, label: `${room.code} · ${room.capacity} chỗ` }))} /></Form.Item>
        <Form.Item name="reason" label={sessionEditing?.status === 'da_huy' ? 'Lý do xếp lịch học bù' : 'Lý do dời buổi học'} rules={reasonRules}><Input.TextArea rows={3} maxLength={255} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Hủy buổi học" open={sessionCanceling !== null} onCancel={() => !sessionSaving && setSessionCanceling(null)} onOk={() => cancelForm.submit()} confirmLoading={sessionSaving} okText="Hủy và ghi lịch sử" okButtonProps={{ danger: true, disabled: loading || Boolean(loadError) }} destroyOnHidden>
      {sessionCanceling && <Typography.Paragraph>{timeText(sessionCanceling.startsAt)} · {sessionCanceling.roomCode}</Typography.Paragraph>}
      <Alert type="warning" showIcon title="Chỉ hủy buổi chưa có điểm danh" description="Buổi nghỉ không tính vào chuyên cần. Sau khi hủy, xếp lịch bù để đủ số buổi của khóa học." style={{ marginBottom: 16 }} />
      <Form form={cancelForm} layout="vertical" disabled={blocked} onFinish={saveCancellation}><Form.Item name="reason" label="Lý do hủy buổi học" rules={reasonRules}><Input.TextArea rows={3} maxLength={255} /></Form.Item></Form>
    </Modal>
    <Modal title="Bổ sung điểm danh còn thiếu" open={attendanceSession !== null} width={760} onCancel={() => { if (!sessionSaving) { attendanceRequestId.current += 1; setAttendanceSession(null); setAttendance(null) } }} onOk={() => attendanceForm.submit()} confirmLoading={sessionSaving} okButtonProps={{ disabled: blocked || attendanceLoading || Boolean(attendanceError) || !missingLearners.length }} okText="Lưu và ghi lịch sử" destroyOnHidden>
      {attendanceSession && <Typography.Paragraph>{timeText(attendanceSession.startsAt)} · {attendanceSession.teacherName} · {attendanceSession.roomCode}</Typography.Paragraph>}
      <Alert type="info" showIcon title="Chỉ bổ sung học viên chưa được điểm danh" description="Chọn trạng thái thực tế cho từng học viên. Điểm danh đã ghi và hồ sơ đã chốt chứng chỉ được giữ nguyên." style={{ marginBottom: 16 }} />
      {attendanceError && <Alert type="error" showIcon title="Chưa thể bổ sung điểm danh" description={attendanceError} action={<Button disabled={blocked || attendanceLoading} onClick={() => attendanceSession && void loadAttendance(attendanceSession)}>Tải lại danh sách</Button>} style={{ marginBottom: 16 }} />}
      <Form form={attendanceForm} layout="vertical" disabled={blocked} onFinish={saveAttendance}>
        <Table rowKey="enrollmentId" size="small" loading={attendanceLoading} dataSource={attendance?.students ?? []} pagination={false} scroll={{ x: 660, y: 360 }} locale={{ emptyText: attendanceLoading ? 'Đang tải điểm danh…' : attendanceError ? 'Không tải được dữ liệu' : 'Không có học viên trong buổi này' }} columns={[
          { title: 'Học viên', key: 'student', width: 200, render: (_, row) => <><Typography.Text strong>{row.studentName}</Typography.Text><br /><Typography.Text type="secondary">{row.studentCode}</Typography.Text></> },
          { title: 'Trạng thái', key: 'status', width: 190, render: (_, row) => {
            const index = missingLearners.findIndex((item) => item.enrollmentId === row.enrollmentId)
            return index < 0 ? <Tag color={row.status === null ? 'default' : row.status === 'vang' ? 'red' : 'green'}>{row.status === null ? 'Đã chốt chứng chỉ' : attendanceText(row.status)}</Tag> : <><Form.Item name={['items', index, 'enrollmentId']} hidden><Input /></Form.Item><Form.Item name={['items', index, 'status']} rules={[{ required: true, message: 'Chọn trạng thái thực tế.' }]} style={{ marginBottom: 0 }}><Select placeholder="Chọn trạng thái" aria-label={`Điểm danh ${row.studentName}`} options={attendanceOptions} /></Form.Item></>
          } },
          { title: 'Ghi chú', key: 'note', render: (_, row) => {
            const index = missingLearners.findIndex((item) => item.enrollmentId === row.enrollmentId)
            return index < 0 ? row.note || '—' : <Form.Item name={['items', index, 'note']} rules={[{ max: 255 }]} style={{ marginBottom: 0 }}><Input maxLength={255} aria-label={`Ghi chú cho ${row.studentName}`} /></Form.Item>
          } },
        ]} />
        {attendance && !missingLearners.length && <Alert type="info" showIcon title="Không còn bản ghi có thể bổ sung" style={{ marginTop: 16 }} />}
        <Form.Item name="reason" label="Lý do bổ sung điểm danh" rules={reasonRules} style={{ marginTop: 20 }}><Input.TextArea rows={3} maxLength={255} /></Form.Item>
      </Form>
    </Modal>
    <Drawer title="Lịch sử xử lý buổi học" size={620} open={historySession !== null} onClose={() => { historyRequestId.current += 1; setHistorySession(null) }}>
      {historySession && <Typography.Paragraph>{timeText(historySession.startsAt)} · {historySession.roomCode}</Typography.Paragraph>}
      {historyError && <Alert type="error" showIcon title="Không tải được lịch sử" description={historyError} action={<Button onClick={() => historySession && void loadHistory(historySession)}>Thử lại</Button>} style={{ marginBottom: 16 }} />}
      {historyLoading ? <Typography.Text>Đang tải lịch sử…</Typography.Text> : !historyError && <Timeline items={history.map((item) => ({ content: <><Typography.Text strong>{({ huy: 'Hủy buổi', cap_nhat: 'Dời buổi / xếp học bù', bo_sung_diem_danh: 'Bổ sung điểm danh' } as Record<string, string>)[item.action] ?? item.action}</Typography.Text><Typography.Paragraph type="secondary">{item.actorName} · {timeText(item.changedAt)}</Typography.Paragraph><Typography.Paragraph>{item.reason}</Typography.Paragraph><Descriptions size="small" column={1} bordered items={[{ key: 'before', label: 'Trước', children: historyFields(item.before) }, { key: 'after', label: 'Sau', children: historyFields(item.after) }]} /></> }))} />}
      {!historyLoading && !historyError && !history.length && <Typography.Text type="secondary">Chưa có lịch sử xử lý buổi học.</Typography.Text>}
    </Drawer>
    <Modal title={editing === 'new' ? 'Tạo lớp học' : 'Sửa thông tin lớp'} open={editing !== null} onCancel={() => !sessionSaving && setEditing(null)} onOk={() => form.submit()} confirmLoading={sessionSaving} okButtonProps={{ disabled: loading || Boolean(loadError) }} okText={editing === 'new' ? 'Tạo lớp' : 'Cập nhật'} destroyOnHidden>
      <Form disabled={blocked} form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}>
        <Form.Item name="code" label="Mã lớp" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã lớp.' }]}><Input placeholder="VD: A2-GT-10" /></Form.Item>
        <Form.Item name="name" label="Tên lớp" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên lớp.' }]}><Input /></Form.Item>
        <Form.Item name="courseId" label="Khóa học" rules={[{ required: true, message: 'Vui lòng chọn khóa học.' }]}><Select showSearch optionFilterProp="label" disabled={blocked || typeof editing === 'object' && editing !== null && (editing.enrolled > 0 || editing.generatedSessions > 0)} options={courses.map((item) => ({ value: item.id, label: item.name }))} /></Form.Item>
        <Form.Item name="teacherId" label="Giáo viên"><Select allowClear={editing === 'new' || (typeof editing === 'object' && editing !== null && editing.schedule === 'Chưa xếp lịch')} showSearch optionFilterProp="label" options={teacherOptions(typeof editing === 'object' ? editing?.teacherId : undefined)} /></Form.Item>
        {planLocked && <Alert type="info" showIcon title="Lớp đã sinh buổi học" description="Ngày khai giảng và số buổi đã khóa. Đổi giáo viên chỉ cập nhật buổi tương lai của giáo viên cũ; buổi dạy thay và lịch sử giữ nguyên." style={{ marginBottom: 18 }} />}
        <Form.Item name="startDate" label="Ngày khai giảng" rules={[{ required: true, message: 'Vui lòng chọn ngày khai giảng.' }]}><Input type="date" disabled={blocked || planLocked} /></Form.Item>
        <Space align="start" wrap><Form.Item name="sessions" label="Số buổi" rules={[{ required: true, message: 'Vui lòng nhập số buổi.' }]}><InputNumber min={1} disabled={blocked || planLocked} /></Form.Item><Form.Item name="capacity" label="Sĩ số tối đa" rules={[{ required: true, message: 'Vui lòng nhập sĩ số.' }]}><InputNumber min={1} /></Form.Item></Space>
      </Form>
    </Modal>
  </AdminLayout>
}

export default AdminClasses
