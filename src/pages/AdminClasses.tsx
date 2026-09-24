import { useMemo, useState } from 'react'
import { CaretRight, MagnifyingGlass, MapPin, Student, UsersThree } from '@phosphor-icons/react'
import { Avatar, Button, Card, Descriptions, Drawer, Flex, Input, Progress, Select, Space, Table, Tag, Typography } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'

type ClassStatus = 'Đang học' | 'Sắp khai giảng' | 'Đã kết thúc'
type ClassRecord = { code: string; name: string; teacher: string; schedule: string; room: string; students: string; status: ClassStatus; progress: string }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const classes: ClassRecord[] = [
  { code: 'A2-GT-09', name: 'A2 Giao tiếp', teacher: 'Nguyễn Quốc Minh', schedule: 'T2, T4, T6 · 18:00', room: 'P.201', students: '18/20', status: 'Đang học', progress: '62%' },
  { code: 'B1-TQ-06', name: 'B1 Tổng quát', teacher: 'Trần Ngọc Lan', schedule: 'T3, T5 · 18:30', room: 'P.105', students: '16/18', status: 'Đang học', progress: '48%' },
  { code: 'IELTS-12', name: 'IELTS 6.5', teacher: 'Lê Gia Hùng', schedule: 'T2, T5, T7 · 19:00', room: 'P.302', students: '14/16', status: 'Đang học', progress: '71%' },
  { code: 'A1-CB-14', name: 'A1 Căn bản', teacher: 'Phạm Thu Hà', schedule: 'T3, T6 · 17:30', room: 'P.103', students: '12/20', status: 'Sắp khai giảng', progress: '0%' },
  { code: 'TOEIC-08', name: 'TOEIC 650+', teacher: 'Võ Minh Khang', schedule: 'T4, T7 · 18:00', room: 'P.204', students: '19/20', status: 'Đang học', progress: '35%' },
  { code: 'B2-TQ-03', name: 'B2 Tổng quát', teacher: 'Đặng Mỹ Linh', schedule: 'T2, T4 · 19:30', room: 'P.301', students: '15/18', status: 'Đã kết thúc', progress: '100%' },
]
const statusColor: Record<ClassStatus, string> = { 'Đang học': 'green', 'Sắp khai giảng': 'gold', 'Đã kết thúc': 'default' }

function AdminClasses({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | ClassStatus>('Tất cả')
  const [selected, setSelected] = useState<ClassRecord | null>(null)
  const data = useMemo(() => classes.filter((item) => (!query.trim() || [item.name, item.code, item.teacher].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [query, status])
  const columns: TableProps<ClassRecord>['columns'] = [
    { title: 'Lớp học', key: 'class', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.name.slice(0, 2).toUpperCase()}</Avatar><div><strong>{item.name}</strong><small>{item.code}</small></div></div> },
    { title: 'Giáo viên', dataIndex: 'teacher' },
    { title: 'Lịch và phòng', key: 'schedule', render: (_, item) => <div><Typography.Text strong>{item.schedule}</Typography.Text><br /><Typography.Text type="secondary">{item.room}</Typography.Text></div> },
    { title: 'Sĩ số', dataIndex: 'students' },
    { title: 'Tiến độ', dataIndex: 'progress', width: 150, render: (value: string) => <Progress percent={Number(value.replace('%', ''))} size="small" /> },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: ClassStatus) => <Tag color={statusColor[value]}>{value}</Tag> },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button icon={<CaretRight />} onClick={() => setSelected(item)} aria-label={`Xem lớp ${item.name}`} /> },
  ]
  return <AdminLayout activePage="classes" mainId="class-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    <AdminPageHeader kicker="Tổ chức đào tạo" title="Quản lý lớp học" description="Theo dõi sĩ số, lịch học, phòng học và tiến độ từng lớp." />
    <AdminSummary items={[{ label: 'Lớp hoạt động', value: 18, detail: '7 lớp có lịch hôm nay', icon: <UsersThree weight="duotone" />, tone: 'success' }, { label: 'Học viên đã xếp lớp', value: 214, detail: 'Trung bình 16 học viên mỗi lớp', icon: <Student weight="duotone" /> }, { label: 'Phòng đang sử dụng', value: '08', detail: '2 phòng còn trống tối nay', icon: <MapPin weight="duotone" /> }]} />
    <Card className="admin-table-card" title="Danh sách lớp học" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã hoặc giáo viên" /><Select value={status} onChange={setStatus} options={['Tất cả', 'Đang học', 'Sắp khai giảng', 'Đã kết thúc'].map((value) => ({ value, label: value }))} /></Space>}><Table rowKey="code" columns={columns} dataSource={data} scroll={{ x: 940 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} lớp học` }} locale={{ emptyText: 'Không tìm thấy lớp phù hợp' }} /></Card>
    <Drawer size={440} title="Thông tin lớp học" open={Boolean(selected)} onClose={() => setSelected(null)}>{selected && <><Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.slice(0, 2).toUpperCase()}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text className="admin-drawer-subtitle" type="secondary">{selected.code}</Typography.Text></div></Flex><Descriptions bordered column={1} size="small" style={{ marginTop: 24 }} items={[{ key: 'teacher', label: 'Giáo viên', children: selected.teacher }, { key: 'schedule', label: 'Lịch học', children: selected.schedule }, { key: 'room', label: 'Phòng học', children: selected.room }, { key: 'students', label: 'Sĩ số', children: `${selected.students} học viên` }, { key: 'progress', label: 'Tiến độ', children: selected.progress }]} /><Card size="small" className="admin-drawer-status"><Flex justify="space-between"><Typography.Text type="secondary">Trạng thái lớp</Typography.Text><Tag color={statusColor[selected.status]}>{selected.status}</Tag></Flex></Card></>}</Drawer>
  </AdminLayout>
}
export default AdminClasses
