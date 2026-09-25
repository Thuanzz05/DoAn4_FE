import { useState } from 'react'
import { CalendarBlank, CheckCircle, ClockCountdown, Receipt, WarningCircle } from '@phosphor-icons/react'
import { Alert, Button, Card, Descriptions, Drawer, Flex, Table, Tabs, Tag, Typography } from 'antd'
import type { TableProps } from 'antd'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentAccountPages.css'

type Props = { onLogout: () => void; onNavigate: (page: StudentPage) => void; onNavigateHome: () => void }
type Invoice = { code: string; course: string; className: string; amount: number; issuedAt: string; dueAt: string; status: 'Chưa thanh toán' | 'Đã thanh toán'; confirmedAt?: string; method?: string }

const invoices: Invoice[] = [
  { code: 'HP-2026-0918', course: 'Tiếng Anh giao tiếp A2', className: 'TA-A2-04', amount: 2400000, issuedAt: '12/08/2026', dueAt: '28/09/2026', status: 'Chưa thanh toán' },
  { code: 'HP-2025-0326', course: 'Tiếng Anh căn bản A1', className: 'TA-A1-12', amount: 2800000, issuedAt: '03/03/2025', dueAt: '20/03/2025', status: 'Đã thanh toán', confirmedAt: '18/03/2025', method: 'Chuyển khoản' },
]
const money = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`
const due = invoices.filter((invoice) => invoice.status === 'Chưa thanh toán')
const paid = invoices.filter((invoice) => invoice.status === 'Đã thanh toán')
const totalDue = due.reduce((total, invoice) => total + invoice.amount, 0)

if (import.meta.env.DEV && totalDue !== 2400000) throw new Error('Invoice total check failed')

function StudentInvoices({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [selected, setSelected] = useState<Invoice | null>(null)
  const columns: TableProps<Invoice>['columns'] = [
    { title: 'Mã hóa đơn', dataIndex: 'code', render: (code: string) => <Typography.Text strong>{code}</Typography.Text> },
    { title: 'Khóa học', dataIndex: 'course' },
    { title: 'Số tiền', dataIndex: 'amount', render: money },
    { title: 'Hạn thanh toán', dataIndex: 'dueAt' },
    { title: 'Trạng thái', dataIndex: 'status', render: (status: Invoice['status']) => <Tag color={status === 'Đã thanh toán' ? 'green' : 'gold'}>{status}</Tag> },
    { title: '', key: 'detail', render: (_, invoice) => <Button type="link" onClick={() => setSelected(invoice)} aria-label={`Xem hóa đơn ${invoice.code}`}>Chi tiết</Button> },
  ]

  return <StudentLayout activePage="student-invoices" mainId="student-invoices" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    <AdminPageHeader kicker="Tài chính học tập" title="Học phí của tôi" description="Tra cứu công nợ và các khoản đã được trung tâm xác nhận thanh toán." />
    <AdminSummary items={[
      { label: 'Công nợ hiện tại', value: money(totalDue), detail: '1 hóa đơn chưa thanh toán', icon: <Receipt weight="duotone" />, tone: 'danger' },
      { label: 'Hạn thanh toán', value: '28/09', detail: 'Hóa đơn HP-2026-0918', icon: <ClockCountdown weight="duotone" /> },
      { label: 'Đã thanh toán', value: paid.length, detail: 'Hóa đơn đã xác nhận', icon: <CheckCircle weight="duotone" />, tone: 'success' },
    ]} />
    <Alert className="student-account-alert" type="warning" showIcon icon={<WarningCircle />} title="Học phí sắp đến hạn" description="Hóa đơn HP-2026-0918 cần hoàn tất trước 28/09/2026. Trung tâm xác nhận sau khi nhận thanh toán; công nợ chưa hoàn tất sẽ ảnh hưởng điều kiện dự thi." />
    <Card className="student-account-card">
      <Tabs defaultActiveKey="due" items={[
        { key: 'due', label: `Chưa thanh toán (${due.length})`, children: <Table rowKey="code" columns={columns} dataSource={due} pagination={false} scroll={{ x: 820 }} /> },
        { key: 'paid', label: `Lịch sử thanh toán (${paid.length})`, children: <Table rowKey="code" columns={columns} dataSource={paid} pagination={false} scroll={{ x: 820 }} /> },
      ]} />
    </Card>
    <Drawer title="Chi tiết hóa đơn" size={440} open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <>
        <Flex gap={12} align="center" className="student-account-drawer-heading"><Receipt size={34} weight="duotone" /><div><Typography.Title level={3}>{selected.code}</Typography.Title><Tag color={selected.status === 'Đã thanh toán' ? 'green' : 'gold'}>{selected.status}</Tag></div></Flex>
        <Card className="student-account-amount"><Typography.Text type="secondary">Tổng học phí</Typography.Text><strong>{money(selected.amount)}</strong></Card>
        <Descriptions bordered column={1} size="small" items={[
          { key: 'course', label: 'Khóa học', children: selected.course },
          { key: 'class', label: 'Lớp', children: selected.className },
          { key: 'issued', label: 'Ngày tạo', children: selected.issuedAt },
          { key: 'due', label: 'Hạn thanh toán', children: selected.dueAt },
          ...(selected.confirmedAt ? [{ key: 'confirmed', label: 'Ngày xác nhận', children: selected.confirmedAt }, { key: 'method', label: 'Hình thức', children: selected.method }] : []),
        ]} />
        <Alert className="student-account-drawer-note" type={selected.status === 'Đã thanh toán' ? 'success' : 'info'} showIcon icon={selected.status === 'Đã thanh toán' ? <CheckCircle /> : <CalendarBlank />} title={selected.status === 'Đã thanh toán' ? 'Trung tâm đã xác nhận thanh toán' : 'Thanh toán ngoài hệ thống'} description={selected.status === 'Đã thanh toán' ? 'Khoản này đã được ghi nhận vào lịch sử thanh toán.' : 'Vui lòng liên hệ quầy thu ngân hoặc bộ phận tài chính của trung tâm để nhận hướng dẫn thanh toán.'} />
      </>}
    </Drawer>
  </StudentLayout>
}

export default StudentInvoices
