import { useEffect, useState } from 'react'
import { CalendarBlank, CheckCircle, ClockCountdown, Receipt, WarningCircle } from '@phosphor-icons/react'
import { Alert, Button, Card, Descriptions, Drawer, Flex, Table, Tabs, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentAccountPages.css'
import { api, errorMessage } from '../api'

type Props = { onLogout: () => void; onNavigate: (page: StudentPage) => void; onNavigateHome: () => void }
type Invoice = { id: number; code: string; courseName: string; classCode: string | null; className: string | null; amount: number; issuedAt: string; dueAt: string; status: 'chua_thanh_toan' | 'da_thanh_toan' | 'da_huy'; paidAt: string | null; paymentMethod: string | null }
const money = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`
const date = (value: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—'

function StudentInvoices({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [messageApi, contextHolder] = message.useMessage()
  useEffect(() => { api<Invoice[]>('/student/invoices').then(setInvoices).catch((error) => messageApi.error(errorMessage(error))) }, [messageApi])
  const due = invoices.filter((invoice) => invoice.status === 'chua_thanh_toan')
  const paid = invoices.filter((invoice) => invoice.status === 'da_thanh_toan')
  const totalDue = due.reduce((total, invoice) => total + Number(invoice.amount), 0)
  const columns: TableProps<Invoice>['columns'] = [
    { title: 'Mã hóa đơn', dataIndex: 'code', render: (code: string) => <Typography.Text strong>{code}</Typography.Text> },
    { title: 'Khóa học', dataIndex: 'courseName' },
    { title: 'Số tiền', dataIndex: 'amount', render: money },
    { title: 'Hạn thanh toán', dataIndex: 'dueAt', render: date },
    { title: 'Trạng thái', dataIndex: 'status', render: (status: Invoice['status']) => <Tag color={status === 'da_thanh_toan' ? 'green' : 'gold'}>{status === 'da_thanh_toan' ? 'Đã thanh toán' : 'Chưa thanh toán'}</Tag> },
    { title: '', key: 'detail', render: (_, invoice) => <Button type="link" onClick={() => setSelected(invoice)} aria-label={`Xem hóa đơn ${invoice.code}`}>Chi tiết</Button> },
  ]

  return <StudentLayout activePage="student-invoices" mainId="student-invoices" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}
    <AdminPageHeader kicker="Tài chính học tập" title="Học phí của tôi" description="Tra cứu công nợ và các khoản đã được trung tâm xác nhận thanh toán." />
    <AdminSummary items={[
      { label: 'Công nợ hiện tại', value: money(totalDue), detail: '1 hóa đơn chưa thanh toán', icon: <Receipt weight="duotone" />, tone: 'danger' },
      { label: 'Hạn thanh toán', value: due[0] ? date(due[0].dueAt) : '—', detail: due[0]?.code ?? 'Không có hóa đơn đến hạn', icon: <ClockCountdown weight="duotone" /> },
      { label: 'Đã thanh toán', value: paid.length, detail: 'Hóa đơn đã xác nhận', icon: <CheckCircle weight="duotone" />, tone: 'success' },
    ]} />
    {due.length > 0 && <Alert className="student-account-alert" type="warning" showIcon icon={<WarningCircle />} title="Bạn còn học phí chưa thanh toán" description="Trung tâm xác nhận sau khi nhận thanh toán; công nợ chưa hoàn tất sẽ ảnh hưởng điều kiện dự thi." />}
    <Card className="student-account-card">
      <Tabs defaultActiveKey="due" items={[
        { key: 'due', label: `Chưa thanh toán (${due.length})`, children: <Table rowKey="code" columns={columns} dataSource={due} pagination={false} scroll={{ x: 820 }} /> },
        { key: 'paid', label: `Lịch sử thanh toán (${paid.length})`, children: <Table rowKey="code" columns={columns} dataSource={paid} pagination={false} scroll={{ x: 820 }} /> },
      ]} />
    </Card>
    <Drawer title="Chi tiết hóa đơn" size={440} open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <>
        <Flex gap={12} align="center" className="student-account-drawer-heading"><Receipt size={34} weight="duotone" /><div><Typography.Title level={3}>{selected.code}</Typography.Title><Tag color={selected.status === 'da_thanh_toan' ? 'green' : 'gold'}>{selected.status === 'da_thanh_toan' ? 'Đã thanh toán' : 'Chưa thanh toán'}</Tag></div></Flex>
        <Card className="student-account-amount"><Typography.Text type="secondary">Tổng học phí</Typography.Text><strong>{money(selected.amount)}</strong></Card>
        <Descriptions bordered column={1} size="small" items={[
          { key: 'course', label: 'Khóa học', children: selected.courseName },
          { key: 'class', label: 'Lớp', children: selected.className ? `${selected.classCode} · ${selected.className}` : 'Chưa xếp lớp' },
          { key: 'issued', label: 'Ngày tạo', children: date(selected.issuedAt) },
          { key: 'due', label: 'Hạn thanh toán', children: date(selected.dueAt) },
          ...(selected.paidAt ? [{ key: 'confirmed', label: 'Ngày xác nhận', children: date(selected.paidAt) }, { key: 'method', label: 'Hình thức', children: selected.paymentMethod === 'chuyen_khoan' ? 'Chuyển khoản' : 'Tiền mặt' }] : []),
        ]} />
        <Alert className="student-account-drawer-note" type={selected.status === 'da_thanh_toan' ? 'success' : 'info'} showIcon icon={selected.status === 'da_thanh_toan' ? <CheckCircle /> : <CalendarBlank />} title={selected.status === 'da_thanh_toan' ? 'Trung tâm đã xác nhận thanh toán' : 'Thanh toán ngoài hệ thống'} description={selected.status === 'da_thanh_toan' ? 'Khoản này đã được ghi nhận vào lịch sử thanh toán.' : 'Vui lòng liên hệ quầy thu ngân hoặc bộ phận tài chính của trung tâm để nhận hướng dẫn thanh toán.'} />
      </>}
    </Drawer>
  </StudentLayout>
}

export default StudentInvoices
