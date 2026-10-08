import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarBlank, ChalkboardTeacher, MagnifyingGlass, MapPin, PencilSimple, Plus, ShieldCheck, Trash } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { api, errorMessage, json } from '../api'

type DayName = 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' | 'Chủ nhật'
type ScheduleRecord = { id: number; classId: number; roomId: number; className: string; course: string; language: string; teacher: string; room: string; day: DayName; dayOfWeek: number; start: string; end: string; students: number }
type ScheduleForm = { classId: number; roomId: number; dayOfWeek: number; start: string; end: string }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }
type ScheduleApi = { id: number; classId: number; className: string; teacherName: string; roomId: number; roomCode: string; dayOfWeek: number; startTime: string; endTime: string }
type ClassOption = { id: number; name: string; courseName: string; language: string; teacherName: string | null; enrolled: number; capacity: number; generatedSessions: number; status: string }
type RoomOption = { id: number; code: string; capacity: number }
type RoomForm = { code: string; capacity: number }
const days: DayName[] = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

function AdminSchedule({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [query, setQuery] = useState('')
  const [day, setDay] = useState<'Tất cả' | DayName>('Tất cả')
  const [editing, setEditing] = useState<ScheduleRecord | 'new' | null>(null)
  const [roomsOpen, setRoomsOpen] = useState(false)
  const [roomEditing, setRoomEditing] = useState<RoomOption | 'new'>('new')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const loadRequest = useRef(0)
  const mutationPending = useRef(false)
  const blocked = loading || Boolean(loadError) || saving
  const [form] = Form.useForm<ScheduleForm>()
  const [roomForm] = Form.useForm<RoomForm>()
  const selectedClassId = Form.useWatch('classId', form)
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  const editingHasSessions = editing !== null && editing !== 'new' && Number(classes.find((item) => item.id === editing.classId)?.generatedSessions) > 0
  const data = useMemo(() => schedules.filter((item) => (!query.trim() || [item.className, item.course, item.teacher, item.room, item.language].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (day === 'Tất cả' || item.day === day)), [day, query, schedules])
  const load = async () => {
    const requestId = ++loadRequest.current
    setLoading(true); setLoadError('')
    try {
      const [rows, classRows, roomRows] = await Promise.all([api<ScheduleApi[]>('/schedules'), api<ClassOption[]>('/classes'), api<RoomOption[]>('/rooms')])
      if (requestId !== loadRequest.current) return
      const activeClasses = classRows.filter((item) => ['sap_khai_giang', 'dang_hoc'].includes(item.status))
      const records = rows.filter((item) => activeClasses.some((row) => row.id === item.classId)).map((item) => { const classItem = classRows.find((row) => row.id === item.classId); return { id: item.id, classId: item.classId, roomId: item.roomId, className: item.className, course: classItem?.courseName ?? '', language: classItem?.language ?? '', teacher: item.teacherName, room: item.roomCode, day: item.dayOfWeek === 1 ? 'Chủ nhật' : `Thứ ${item.dayOfWeek}` as DayName, dayOfWeek: item.dayOfWeek, start: item.startTime.slice(0, 5), end: item.endTime.slice(0, 5), students: Number(classItem?.enrolled ?? 0) } })
      setClasses(activeClasses); setRooms(roomRows); setSchedules(records)
      setEditing((current) => current && current !== 'new' ? records.find((item) => item.id === current.id) ?? null : current)
      setRoomEditing((current) => current !== 'new' ? roomRows.find((item) => item.id === current.id) ?? 'new' : current)
    } catch (error) { if (requestId === loadRequest.current) setLoadError(errorMessage(error)) }
    finally { if (requestId === loadRequest.current) setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => () => { loadRequest.current += 1 }, [])
  const openCreate = () => { const firstClass = classes.find((item) => item.teacherName && !Number(item.generatedSessions)); setEditing('new'); form.setFieldsValue({ classId: firstClass?.id, roomId: rooms.find((room) => room.capacity >= Number(firstClass?.capacity ?? 0))?.id, dayOfWeek: 2, start: '18:00', end: '19:30' }) }
  const openEdit = (item: ScheduleRecord) => { setEditing(item); form.setFieldsValue({ classId: item.classId, roomId: item.roomId, dayOfWeek: item.dayOfWeek, start: item.start, end: item.end }) }
  const save = async (values: ScheduleForm) => {
    if (!editing || blocked || mutationPending.current) return
    if (values.end <= values.start) { form.setFields([{ name: 'end', errors: ['Giờ kết thúc phải sau giờ bắt đầu.'] }]); return }
    mutationPending.current = true; setSaving(true)
    try { const body = { classId: values.classId, roomId: values.roomId, dayOfWeek: values.dayOfWeek, startTime: values.start, endTime: values.end }; if (editing === 'new') await api('/schedules', json('POST', body)); else await api(`/schedules/${editing.id}`, json('PATCH', body)); messageApi.success(editing === 'new' ? 'Đã xếp lịch mới.' : 'Đã cập nhật lịch học.'); setEditing(null); await load() } catch (error) { messageApi.error(errorMessage(error)) }
    finally { mutationPending.current = false; setSaving(false) }
  }
  const saveRoom = async (values: RoomForm) => {
    if (blocked || mutationPending.current) return
    mutationPending.current = true; setSaving(true)
    try {
      await api(roomEditing === 'new' ? '/rooms' : `/rooms/${roomEditing.id}`, json(roomEditing === 'new' ? 'POST' : 'PATCH', { code: values.code.trim().toUpperCase(), capacity: values.capacity }))
      roomForm.resetFields(); setRoomEditing('new'); await load(); messageApi.success(roomEditing === 'new' ? 'Đã thêm phòng học.' : 'Đã cập nhật phòng học.')
    } catch (error) { messageApi.error(errorMessage(error)) }
    finally { mutationPending.current = false; setSaving(false) }
  }
  const editRoom = (room: RoomOption) => { setRoomEditing(room); roomForm.setFieldsValue(room) }
  const deleteRoom = (room: RoomOption) => modalApi.confirm({ title: `Xóa phòng ${room.code}?`, content: 'Chỉ xóa được phòng chưa có lịch hoặc buổi học.', okText: 'Xóa', okButtonProps: { danger: true }, onOk: async () => {
    if (blocked || mutationPending.current) return
    mutationPending.current = true; setSaving(true)
    try { await api(`/rooms/${room.id}`, { method: 'DELETE' }); await load(); messageApi.success('Đã xóa phòng học.') } catch (error) { messageApi.error(errorMessage(error)); throw error }
    finally { mutationPending.current = false; setSaving(false) }
  } })
  const deleteSchedule = (item: ScheduleRecord) => modalApi.confirm({ title: 'Xóa lịch hàng tuần?', content: `${item.className} · ${item.day} ${item.start}-${item.end}`, okText: 'Xóa', okButtonProps: { danger: true }, onOk: async () => {
    if (blocked || mutationPending.current || Number(classes.find((row) => row.id === item.classId)?.generatedSessions) > 0) return
    mutationPending.current = true; setSaving(true)
    try { await api(`/schedules/${item.id}`, { method: 'DELETE' }); await load(); messageApi.success('Đã xóa lịch học.') } catch (error) { messageApi.error(errorMessage(error)); throw error }
    finally { mutationPending.current = false; setSaving(false) }
  } })
  const columns: TableProps<ScheduleRecord>['columns'] = [
    { title: 'Lớp học', key: 'class', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.language.replace('Tiếng ', '').slice(0, 2).toUpperCase()}</Avatar><div><strong>{item.className}</strong><small>{item.course}</small></div></div> },
    { title: 'Thời gian', key: 'time', render: (_, item) => <div><Typography.Text strong>{item.day}</Typography.Text><br /><Typography.Text type="secondary">{item.start}-{item.end}</Typography.Text></div> },
    { title: 'Giáo viên', dataIndex: 'teacher' }, { title: 'Phòng', dataIndex: 'room' }, { title: 'Sĩ số', dataIndex: 'students', render: (value) => `${value} học viên` },
    { title: '', key: 'action', width: 96, render: (_, item) => <Space.Compact><Button disabled={blocked} icon={<PencilSimple />} onClick={() => openEdit(item)} aria-label={`Sửa lịch lớp ${item.className}`} /><Button disabled={blocked || Number(classes.find((row) => row.id === item.classId)?.generatedSessions) > 0} title={Number(classes.find((row) => row.id === item.classId)?.generatedSessions) > 0 ? 'Lớp đã sinh buổi học, chỉ được chỉnh phòng hoặc khung giờ' : undefined} danger icon={<Trash />} onClick={() => deleteSchedule(item)} aria-label={`Xóa lịch lớp ${item.className}`} /></Space.Compact> },
  ]
  return <AdminLayout activePage="schedule" mainId="schedule-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}{modalContext}<AdminPageHeader kicker="Điều phối đào tạo" title="Xếp lịch giảng dạy" description="Phân công giáo viên, phòng học và kiểm tra xung đột trước khi lưu." actions={<Space wrap><Button disabled={blocked} icon={<MapPin />} onClick={() => { setRoomsOpen(true); setRoomEditing('new'); roomForm.resetFields() }}>Quản lý phòng</Button><Button disabled={blocked || !classes.some((item) => item.teacherName && !Number(item.generatedSessions)) || !rooms.length} type="primary" icon={<Plus />} onClick={openCreate}>Xếp lịch mới</Button></Space>} />
    {loadError && <Alert type="error" showIcon title="Không tải được lịch học và phòng" description={loadError} action={<Button loading={loading} onClick={() => void load()}>Thử lại</Button>} style={{ marginBottom: 16 }} />}
    {!loading && !loadError && <AdminSummary items={[{ label: 'Buổi học trong tuần', value: schedules.length, detail: 'Lịch đã xác nhận và sẵn sàng tra cứu', icon: <CalendarBlank weight="duotone" />, tone: 'success' }, { label: 'Giáo viên đã phân công', value: new Set(schedules.map((item) => item.teacher)).size, detail: 'Không có khung giờ bị trùng', icon: <ChalkboardTeacher weight="duotone" /> }, { label: 'Phòng đang sử dụng', value: new Set(schedules.map((item) => item.room)).size, detail: 'Kiểm tra trước mỗi lần cập nhật', icon: <MapPin weight="duotone" /> }]} />}
    <Alert style={{ marginTop: 16 }} type="success" showIcon icon={<ShieldCheck weight="fill" />} title="Kiểm tra xung đột đang bật" description="Một giáo viên hoặc phòng học không thể xuất hiện ở hai lớp trong cùng khung giờ." />
    <Card className="admin-table-card" title="Lịch học trong tuần" extra={<Space wrap><Input disabled={loading || Boolean(loadError)} allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Lớp, giáo viên hoặc phòng" /><Select disabled={loading || Boolean(loadError)} value={day} onChange={setDay} options={['Tất cả', ...days].map((value) => ({ value, label: value }))} /></Space>}><Table loading={loading} locale={{ emptyText: loading ? 'Đang tải lịch học…' : loadError ? 'Chưa tải được dữ liệu, hãy thử lại' : 'Không có lịch học phù hợp' }} rowKey="id" columns={columns} dataSource={loading || loadError ? [] : data} scroll={{ x: 850 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} lịch học` }} /></Card>
    <Modal title={editing === 'new' ? 'Xếp lịch mới' : 'Sửa lịch học'} open={editing !== null} onCancel={() => !saving && setEditing(null)} onOk={() => form.submit()} confirmLoading={saving} okButtonProps={{ disabled: loading || Boolean(loadError) }} okText="Lưu lịch" destroyOnHidden><Form disabled={blocked} form={form} layout="vertical" onFinish={save} style={{ marginTop: 20 }}><Form.Item name="classId" label="Lớp học" rules={[{ required: true }]}><Select disabled={blocked || editingHasSessions} onChange={(value) => { const capacity = Number(classes.find((item) => item.id === value)?.capacity ?? 0); form.setFieldValue('roomId', rooms.find((room) => room.capacity >= capacity)?.id) }} options={classes.filter((item) => item.teacherName && (!Number(item.generatedSessions) || typeof editing === 'object' && item.id === editing?.classId)).map((item) => ({ value: item.id, label: `${item.name} · ${item.teacherName}` }))} /></Form.Item><Space align="start"><Form.Item name="roomId" label="Phòng học" rules={[{ required: true }]}><Select options={rooms.filter((room) => room.capacity >= Number(classes.find((item) => item.id === selectedClassId)?.capacity ?? 0)).map((item) => ({ value: item.id, label: `${item.code} · ${item.capacity} chỗ` }))} /></Form.Item><Form.Item name="dayOfWeek" label="Ngày học" rules={[{ required: true }]}><Select disabled={blocked || editingHasSessions} options={days.map((value, index) => ({ value: value === 'Chủ nhật' ? 1 : index + 2, label: value }))} /></Form.Item></Space><Space align="start"><Form.Item name="start" label="Giờ bắt đầu" rules={[{ required: true }]}><Input type="time" /></Form.Item><Form.Item name="end" label="Giờ kết thúc" rules={[{ required: true }]}><Input type="time" /></Form.Item></Space>{editingHasSessions && <Alert type="info" showIcon title="Lớp đã sinh buổi học" description="Bạn có thể đổi phòng hoặc khung giờ; chỉ buổi chưa bắt đầu khớp lịch gốc được cập nhật. Buổi đã học và buổi đã dời riêng giữ nguyên." />}</Form></Modal>
    <Modal title="Quản lý phòng học" open={roomsOpen} onCancel={() => !saving && setRoomsOpen(false)} footer={null} width={680} destroyOnHidden>
      {loadError && <Alert type="error" showIcon title="Không tải được dữ liệu phòng" description={loadError} action={<Button onClick={() => void load()}>Thử lại</Button>} />}
      <Form disabled={blocked} form={roomForm} layout="inline" onFinish={saveRoom} style={{ margin: '20px 0' }}><Form.Item name="code" rules={[{ required: true, whitespace: true, message: 'Nhập mã phòng.' }]}><Input placeholder="Mã phòng" /></Form.Item><Form.Item name="capacity" rules={[{ required: true, message: 'Nhập sức chứa.' }]}><InputNumber min={1} placeholder="Sức chứa" /></Form.Item><Form.Item><Space><Button disabled={blocked} loading={saving} type="primary" htmlType="submit">{roomEditing === 'new' ? 'Thêm phòng' : 'Cập nhật'}</Button>{roomEditing !== 'new' && <Button disabled={blocked} onClick={() => { setRoomEditing('new'); roomForm.resetFields() }}>Hủy sửa</Button>}</Space></Form.Item></Form>
      <Table loading={loading} locale={{ emptyText: loading ? 'Đang tải phòng…' : loadError ? 'Chưa tải được dữ liệu phòng' : 'Chưa có phòng học' }} rowKey="id" size="small" pagination={false} dataSource={loading || loadError ? [] : rooms} columns={[{ title: 'Mã phòng', dataIndex: 'code' }, { title: 'Sức chứa', dataIndex: 'capacity', render: (value: number) => `${value} chỗ` }, { title: '', key: 'actions', width: 96, render: (_: unknown, room: RoomOption) => <Space.Compact><Button disabled={blocked} icon={<PencilSimple />} onClick={() => editRoom(room)} aria-label={`Sửa phòng ${room.code}`} /><Button disabled={blocked || schedules.some((item) => item.roomId === room.id)} danger icon={<Trash />} onClick={() => deleteRoom(room)} aria-label={`Xóa phòng ${room.code}`} /></Space.Compact> }]} />
    </Modal>
  </AdminLayout>
}
export default AdminSchedule
