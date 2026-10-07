import { useCallback, useEffect, useState } from 'react'
import { CalendarBlank, CheckCircle, ClockCountdown, Receipt, WarningCircle } from '@phosphor-icons/react'
import { Alert, Button, Card, Descriptions, Drawer, Flex, Table, Tabs, Tag, Typography } from 'antd'
import type { TableProps } from 'antd'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentAccountPages.css'
import { api, errorMessage } from '../api'

type Props = { onLogout: () => void; onNavigate: (page: StudentPage) => void; onNavigateHome: () => void }
type Invoice = { id: number; code: string; courseName: string; classCode: string | null; className: string | null; amount: number; issuedAt: string; dueAt: string; status: 'chua_thanh_toan' | 'da_thanh_toan' | 'da_huy'; paidAt: string | null; paymentMethod: string | null; cancellationReason: string | null }
type DisplayStatus = 'chua_thanh_toan' | 'qua_han' | 'da_thanh_toan' | 'da_huy'
const money = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`
const date = (value: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—'
const displayStatus = (invoice: Invoice): DisplayStatus => invoice.status === 'chua_thanh_toan' && new Date(`${String(invoice.dueAt).slice(0, 10)}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0)) ? 'qua_han' : invoice.status
const statusLabel: Record<DisplayStatus, string> = { chua_thanh_toan: 'Chưa thanh toán', qua_han: 'Quá hạn', da_thanh_toan: 'Đã thanh toán', da_huy: 'Đã hủy' }
const statusColor: Record<DisplayStatus, string> = { chua_thanh_toan: 'gold', qua_han: 'red', da_thanh_toan: 'green', da_huy: 'default' }

function StudentInvoices({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setLoadError(null)
    try { setInvoices(await api<Invoice[]>('/student/invoices')) }
    catch (error) { setLoadError(errorMessage(error)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const due = invoices.filter((invoice) => invoice.status === 'chua_thanh_toan').sort((left, right) => String(left.dueAt).localeCompare(String(right.dueAt)))
  const paid = invoices.filter((invoice) => invoice.status === 'da_thanh_toan')
  const canceled = invoices.filter((invoice) => invoice.status === 'da_huy')
  const overdue = due.filter((invoice) => displayStatus(invoice) === 'qua_han')
  const totalDue = due.reduce((total, invoice) => total + Number(invoice.amount), 0)
  const columns: TableProps<Invoice>['columns'] = [
    { title: 'Mã hóa đơn', dataIndex: 'code', render: (code: string) => <Typography.Text strong>{code}</Typography.Text> },
    { title: 'Khóa học', dataIndex: 'courseName' },
    { title: 'Số tiền', dataIndex: 'amount', render: money },
    { title: 'Hạn thanh toán', dataIndex: 'dueAt', render: date },
    { title: 'Trạng thái', key: 'status', render: (_, invoice) => { const status = displayStatus(invoice); return <Tag color={statusColor[status]}>{statusLabel[status]}</Tag> } },
    { title: '', key: 'detail', render: (_, invoice) => <Button type="link" onClick={() => setSelected(invoice)} aria-label={`Xem hóa đơn ${invoice.code}`}>Chi tiết</Button> },
  ]

  return <StudentLayout activePage="student-invoices" mainId="student-invoices" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    <AdminPageHeader kicker="Tài chính học tập" title="Học phí của tôi" description="Tra cứu công nợ và các khoản đã được trung tâm xác nhận thanh toán." actions={<Button loading={loading} onClick={() => void load()}>Làm mới</Button>} />
    <Alert className="student-account-alert" type="info" showIcon title="Thanh toán trọn khóa" description="Nộp toàn bộ học phí bằng tiền mặt hoặc chuyển khoản ngoài hệ thống; trung tâm xác nhận sau khi nhận đủ. Chưa hỗ trợ trả góp hoặc hoàn tiền trong ứng dụng." />
    {loading ? <Card loading className="student-account-card" /> : loadError ? <Alert type="error" showIcon title="Chưa tải được thông tin học phí" description={loadError} action={<Button onClick={() => void load()}>Thử lại</Button>} /> : <>
    <AdminSummary items={[
      { label: 'Công nợ hiện tại', value: money(totalDue), detail: `${due.length} hóa đơn chưa thanh toán`, icon: <Receipt weight="duotone" />, tone: due.length ? 'danger' : 'success' },
      { label: 'Hạn thanh toán', value: due[0] ? date(due[0].dueAt) : '—', detail: due[0]?.code ?? 'Không có hóa đơn đến hạn', icon: <ClockCountdown weight="duotone" /> },
      { label: 'Đã thanh toán', value: paid.length, detail: 'Hóa đơn đã xác nhận', icon: <CheckCircle weight="duotone" />, tone: 'success' },
    ]} />
    {due.length > 0 && <Alert className="student-account-alert" type={overdue.length ? 'error' : 'warning'} showIcon icon={<WarningCircle />} title={overdue.length ? `Bạn có ${overdue.length} hóa đơn quá hạn` : 'Bạn còn học phí chưa thanh toán'} description="Ghi danh chưa được xác nhận đủ học phí sẽ chưa đủ điều kiện dự thi và xét chứng chỉ. Công nợ của khóa khác không làm khóa đã trả đủ bị khóa." />}
    <Card className="student-account-card">
      <Tabs defaultActiveKey="due" items={[
        { key: 'due', label: `Chưa thanh toán (${due.length})`, children: <Table rowKey="code" columns={columns} dataSource={due} pagination={false} scroll={{ x: 820 }} /> },
        { key: 'paid', label: `Lịch sử thanh toán (${paid.length})`, children: <Table rowKey="code" columns={columns} dataSource={paid} pagination={false} scroll={{ x: 820 }} /> },
        { key: 'canceled', label: `Đã hủy (${canceled.length})`, children: <Table rowKey="code" columns={columns} dataSource={canceled} pagination={false} scroll={{ x: 820 }} /> },
      ]} />
    </Card>
    </>}
    <Drawer title="Chi tiết hóa đơn" size={440} open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <>
        <Flex gap={12} align="center" className="student-account-drawer-heading"><Receipt size={34} weight="duotone" /><div><Typography.Title level={3}>{selected.code}</Typography.Title><Tag color={statusColor[displayStatus(selected)]}>{statusLabel[displayStatus(selected)]}</Tag></div></Flex>
        <Card className="student-account-amount"><Typography.Text type="secondary">Tổng học phí</Typography.Text><strong>{money(selected.amount)}</strong></Card>
        <Descriptions bordered column={1} size="small" items={[
          { key: 'course', label: 'Khóa học', children: selected.courseName },
          { key: 'class', label: 'Lớp', children: selected.className ? `${selected.classCode} · ${selected.className}` : 'Chưa xếp lớp' },
          { key: 'issued', label: 'Ngày tạo', children: date(selected.issuedAt) },
          { key: 'due', label: 'Hạn thanh toán', children: date(selected.dueAt) },
          ...(selected.paidAt ? [{ key: 'confirmed', label: 'Ngày xác nhận', children: date(selected.paidAt) }, { key: 'method', label: 'Hình thức', children: selected.paymentMethod === 'chuyen_khoan' ? 'Chuyển khoản' : 'Tiền mặt' }] : []),
          ...(selected.cancellationReason ? [{ key: 'cancel', label: 'Lý do hủy', children: selected.cancellationReason }] : []),
        ]} />
        <Alert className="student-account-drawer-note" type={selected.status === 'da_thanh_toan' ? 'success' : selected.status === 'da_huy' ? 'info' : displayStatus(selected) === 'qua_han' ? 'error' : 'info'} showIcon icon={selected.status === 'da_thanh_toan' ? <CheckCircle /> : <CalendarBlank />} title={selected.status === 'da_thanh_toan' ? 'Trung tâm đã xác nhận thanh toán' : selected.status === 'da_huy' ? 'Hóa đơn đã được hủy' : displayStatus(selected) === 'qua_han' ? 'Hóa đơn đã quá hạn' : 'Thanh toán ngoài hệ thống'} description={selected.status === 'da_thanh_toan' ? 'Khoản này đã được ghi nhận vào lịch sử thanh toán.' : selected.status === 'da_huy' ? 'Hóa đơn này không còn được tính vào công nợ.' : 'Vui lòng liên hệ quầy thu ngân hoặc bộ phận tài chính của trung tâm để nhận hướng dẫn thanh toán.'} />
      </>}
    </Drawer>
  </StudentLayout>
}

export default StudentInvoices
