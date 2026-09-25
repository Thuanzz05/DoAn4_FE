import { useState } from 'react'
import { Certificate, CheckCircle, FilePdf, GraduationCap, LockKey } from '@phosphor-icons/react'
import { Alert, Button, Card, Descriptions, Drawer, Empty, Flex, Space, Tabs, Tag, Typography } from 'antd'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import StudentLayout, { type StudentPage } from './StudentLayout'
import './StudentAccountPages.css'

type Props = { onLogout: () => void; onNavigate: (page: StudentPage) => void; onNavigateHome: () => void }
type IssuedCertificate = { code: string; course: string; className: string; issuedAt: string; average: string; attendance: string }

const issued: IssuedCertificate[] = [
  { code: 'CC-A1-2025-0182', course: 'Tiếng Anh căn bản A1', className: 'TA-A1-12', issuedAt: '30/06/2025', average: '7.2', attendance: '92%' },
]

function StudentCertificates({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [selected, setSelected] = useState<IssuedCertificate | null>(null)

  return <StudentLayout activePage="student-certificates" mainId="student-certificates" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    <AdminPageHeader kicker="Thành tích học tập" title="Chứng chỉ của tôi" description="Xem chứng chỉ đã cấp và trạng thái xét cấp cho khóa học đang theo học." />
    <AdminSummary items={[
      { label: 'Đã cấp', value: issued.length, detail: 'Chứng chỉ Tiếng Anh A1', icon: <Certificate weight="duotone" />, tone: 'success' },
      { label: 'Đang theo học', value: 1, detail: 'Tiếng Anh giao tiếp A2', icon: <GraduationCap weight="duotone" /> },
      { label: 'Chưa xét', value: 1, detail: 'Khóa A2 chưa hoàn thành', icon: <LockKey weight="duotone" /> },
    ]} />
    <Card className="student-account-card">
      <Tabs defaultActiveKey="issued" items={[
        { key: 'issued', label: 'Đã cấp', children: <div className="student-certificate-list">{issued.map((item) => <Card key={item.code} className="student-certificate-item"><Flex justify="space-between" align="center" gap={16} wrap><Flex gap={16} align="center"><span className="student-certificate-icon"><Certificate size={30} weight="duotone" /></span><div><Tag color="green">Đã cấp</Tag><Typography.Title level={3}>{item.course}</Typography.Title><Typography.Text type="secondary">{item.code} · Cấp ngày {item.issuedAt}</Typography.Text></div></Flex><Button onClick={() => setSelected(item)}>Xem chi tiết</Button></Flex></Card>)}</div> },
        { key: 'pending', label: 'Chưa xét', children: <div className="student-certificate-pending"><Alert type="warning" showIcon title="Tiếng Anh giao tiếp A2 chưa đủ điều kiện nhận chứng chỉ" description="Khóa học mới hoàn thành 14/24 buổi, còn 2.400.000đ học phí và chưa có kết quả thi cuối khóa." /><Button onClick={() => onNavigate('student-results')}>Xem điểm và chuyên cần</Button></div> },
        { key: 'downloads', label: 'Lịch sử tải xuống', children: <Empty description="Chưa có lần tải xuống nào được ghi nhận." /> },
      ]} />
    </Card>
    <Drawer title="Chi tiết chứng chỉ" size={440} open={Boolean(selected)} onClose={() => setSelected(null)}>
      {selected && <>
        <Flex gap={12} align="center" className="student-account-drawer-heading"><Certificate size={36} weight="duotone" /><div><Typography.Title level={3}>{selected.course}</Typography.Title><Tag color="green"><CheckCircle /> Đã cấp</Tag></div></Flex>
        <Descriptions bordered column={1} size="small" items={[
          { key: 'code', label: 'Mã chứng chỉ', children: selected.code },
          { key: 'class', label: 'Lớp học', children: selected.className },
          { key: 'date', label: 'Ngày cấp', children: selected.issuedAt },
          { key: 'average', label: 'Điểm cuối khóa', children: selected.average },
          { key: 'attendance', label: 'Chuyên cần', children: selected.attendance },
        ]} />
        <Alert className="student-account-drawer-note" type="info" showIcon icon={<FilePdf />} title="Tệp PDF chưa sẵn sàng" description="Bản chứng chỉ điện tử sẽ hiển thị để tải xuống khi trung tâm cung cấp tệp PDF." />
        <Space orientation="vertical" className="student-certificate-actions"><Button type="primary" block icon={<FilePdf />} disabled>Tải PDF</Button><Button block disabled>Chia sẻ liên kết xác thực</Button></Space>
      </>}
    </Drawer>
  </StudentLayout>
}

export default StudentCertificates
