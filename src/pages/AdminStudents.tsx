import { useMemo, useState } from 'react'
import { CaretRight, MagnifyingGlass, Student, UsersThree, WarningCircle } from '@phosphor-icons/react'
import { Avatar, Button, Card, Descriptions, Drawer, Flex, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'

type StudentStatus = 'Đang học' | 'Bảo lưu' | 'Hoàn thành'
type StudentRecord = { name: string; code: string; email: string; phone: string; className: string; status: StudentStatus; attendance: string; debt: string; joined: string }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }

const students: StudentRecord[] = [
  { name: 'Nguyễn Khánh Linh', code: 'HV-0248', email: 'linh.nguyen@example.com', phone: '090 312 4586', className: 'A2 Giao tiếp', status: 'Đang học', attendance: '82%', debt: '2.400.000đ', joined: '12/08/2026' },
  { name: 'Trần Gia Huy', code: 'HV-0217', email: 'huy.tran@example.com', phone: '091 572 9034', className: 'B1 Tổng quát', status: 'Đang học', attendance: '94%', debt: 'Đã hoàn tất', joined: '02/07/2026' },
  { name: 'Lê Minh Anh', code: 'HV-0196', email: 'anh.le@example.com', phone: '098 441 2367', className: 'IELTS 6.5', status: 'Bảo lưu', attendance: '76%', debt: '2.400.000đ', joined: '18/05/2026' },
  { name: 'Phạm Quang Duy', code: 'HV-0173', email: 'duy.pham@example.com', phone: '093 628 1975', className: 'A2 Giao tiếp', status: 'Đang học', attendance: '88%', debt: 'Đã hoàn tất', joined: '22/04/2026' },
  { name: 'Võ Hoàng Nam', code: 'HV-0151', email: 'nam.vo@example.com', phone: '097 805 3321', className: 'B1 Tổng quát', status: 'Hoàn thành', attendance: '91%', debt: 'Đã hoàn tất', joined: '10/02/2026' },
  { name: 'Đặng Thu Trang', code: 'HV-0138', email: 'trang.dang@example.com', phone: '096 214 8703', className: 'IELTS 6.5', status: 'Đang học', attendance: '86%', debt: '1.200.000đ', joined: '05/01/2026' },
  { name: 'Bùi Đức Anh', code: 'HV-0119', email: 'anh.bui@example.com', phone: '092 703 1864', className: 'A2 Giao tiếp', status: 'Bảo lưu', attendance: '69%', debt: 'Đã hoàn tất', joined: '16/11/2025' },
  { name: 'Đỗ Hà My', code: 'HV-0097', email: 'my.do@example.com', phone: '094 861 2405', className: 'B1 Tổng quát', status: 'Hoàn thành', attendance: '96%', debt: 'Đã hoàn tất', joined: '28/09/2025' },
]

const statusColor: Record<StudentStatus, string> = { 'Đang học': 'green', 'Bảo lưu': 'gold', 'Hoàn thành': 'default' }

function AdminStudents({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Tất cả' | StudentStatus>('Tất cả')
  const [selected, setSelected] = useState<StudentRecord | null>(null)
  const data = useMemo(() => students.filter((item) => (!query.trim() || [item.name, item.code, item.className].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))) && (status === 'Tất cả' || item.status === status)), [query, status])

  const columns: TableProps<StudentRecord>['columns'] = [
    { title: 'Học viên', key: 'student', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><strong>{item.name}</strong><small>{item.code}</small></div></div> },
    { title: 'Lớp hiện tại', dataIndex: 'className' },
    { title: 'Chuyên cần', dataIndex: 'attendance' },
    { title: 'Học phí', dataIndex: 'debt', render: (value: string) => <Typography.Text type={value === 'Đã hoàn tất' ? 'success' : 'danger'} strong>{value}</Typography.Text> },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: StudentStatus) => <Tag color={statusColor[value]}>{value}</Tag> },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button icon={<CaretRight />} onClick={() => setSelected(item)} aria-label={`Xem hồ sơ ${item.name}`} /> },
  ]

  return <AdminLayout activePage="students" mainId="student-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    <AdminPageHeader kicker="Hồ sơ học viên" title="Quản lý học viên" description="Tra cứu hồ sơ, lớp đang học và các trạng thái cần theo dõi." />
    <AdminSummary items={[
      { label: 'Tổng hồ sơ', value: 248, detail: '12 hồ sơ mới trong tháng', icon: <Student weight="duotone" />, tone: 'success' },
      { label: 'Đang theo học', value: 214, detail: 'Thuộc 18 lớp hoạt động', icon: <UsersThree weight="duotone" /> },
      { label: 'Cần bổ sung', value: '09', detail: 'Thiếu thông tin hoặc học phí', icon: <WarningCircle weight="duotone" />, tone: 'danger' },
    ]} />
    <Card className="admin-table-card" title="Danh sách học viên" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã hoặc lớp" /><Select value={status} onChange={setStatus} options={['Tất cả', 'Đang học', 'Bảo lưu', 'Hoàn thành'].map((value) => ({ value, label: value }))} /></Space>}>
      <Table rowKey="code" columns={columns} dataSource={data} scroll={{ x: 820 }} pagination={{ pageSize: 6, showTotal: (total) => `${total} hồ sơ` }} locale={{ emptyText: 'Không tìm thấy hồ sơ phù hợp' }} />
    </Card>
    <Drawer size={440} title="Hồ sơ học viên" open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <><Flex align="center" gap={14}><Avatar size={54} shape="square">{selected.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><Typography.Title className="admin-drawer-title" level={3}>{selected.name}</Typography.Title><Typography.Text className="admin-drawer-subtitle" type="secondary">{selected.code}</Typography.Text></div></Flex><Descriptions bordered column={1} size="small" style={{ marginTop: 24 }} items={[{ key: 'email', label: 'Email', children: selected.email }, { key: 'phone', label: 'Điện thoại', children: selected.phone }, { key: 'class', label: 'Lớp hiện tại', children: selected.className }, { key: 'joined', label: 'Ngày ghi danh', children: selected.joined }, { key: 'attendance', label: 'Chuyên cần', children: selected.attendance }, { key: 'debt', label: 'Học phí', children: selected.debt }]} /><Card size="small" className="admin-drawer-status"><Flex justify="space-between"><Typography.Text type="secondary">Trạng thái hồ sơ</Typography.Text><Tag color={statusColor[selected.status]}>{selected.status}</Tag></Flex></Card></>}
    </Drawer>
  </AdminLayout>
}

export default AdminStudents
