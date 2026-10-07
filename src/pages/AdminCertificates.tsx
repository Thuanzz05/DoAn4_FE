import { useEffect, useMemo, useState } from 'react'
import { ArrowClockwise, CaretRight, Certificate, FilePdf, GraduationCap, MagnifyingGlass, Receipt, ShieldCheck, XCircle } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import type { TableProps } from 'antd'
import AdminLayout, { type AdminPage } from './AdminLayout'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import { api, errorMessage, json } from '../api'
import AdminExams from './AdminExams'
import CertificateCorrectionHistory from './CertificateCorrectionHistory'

type CertificateStatus = 'Chờ xét' | 'Đã xác nhận' | 'Đã cấp'
type CertificateFilter = 'Tất cả' | 'Đủ điều kiện' | 'Không đủ điều kiện' | 'Đã cấp'
type Candidate = { id: number; certificateId: number | null; studentCode: string; studentName: string; classCode: string; className: string; course: string; language: string; attendance: number; expectedAttendance: number; recordedAttendance: number; average: number | null; requiredExams: number; completedExams: number; paid: boolean; status: CertificateStatus; eligible: boolean; ineligibleReasons: string[]; certificateCode?: string; issuedAt?: string; pdfPath?: string }
type Props = { onLogout: () => void; onNavigate: (page: AdminPage) => void; onNavigateHome: () => void }
type CandidateApi = { enrollmentId: number; certificateId: number | null; studentCode: string; studentName: string; classCode: string; className: string; courseName: string; language: string; attendance: number; expectedAttendance: number; recordedAttendance: number; average: number | null; requiredExams: number; completedExams: number; paid: number | boolean; certificateStatus: string | null; certificateCode: string | null; issuedAt: string | null; pdfPath: string | null; eligible: boolean; ineligibleReasons: string[] }
type Correction = { studentCode: string; studentName: string; courseName: string; language: string; classCode: string; className: string; reason: string }
const eligible = (item: Candidate) => item.eligible
const date = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))

function AdminCertificates({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([]); const [query, setQuery] = useState(''); const [className, setClassName] = useState('Tất cả'); const [filter, setFilter] = useState<CertificateFilter>('Tất cả')
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]); const [detail, setDetail] = useState<Candidate | null>(null); const [messageApi, contextHolder] = message.useMessage()
  const [issuing, setIssuing] = useState(false)
  const [tab, setTab] = useState('certificates')
  const [correcting, setCorrecting] = useState<Candidate | null>(null)
  const [correctionForm] = Form.useForm<Correction>()
  const [savingCorrection, setSavingCorrection] = useState(false)
  const [modal, modalContextHolder] = Modal.useModal()
  const confirmedCount = candidates.filter((item) => item.status === 'Đã xác nhận').length
  const load = async () => { try { const rows = await api<CandidateApi[]>('/certificates/candidates'); setCandidates(rows.map((item) => ({ id: item.enrollmentId, certificateId: item.certificateId, studentCode: item.studentCode, studentName: item.studentName, classCode: item.classCode, className: item.className, course: item.courseName, language: item.language, attendance: Number(item.attendance), expectedAttendance: Number(item.expectedAttendance), recordedAttendance: Number(item.recordedAttendance), average: item.average === null ? null : Number(item.average), requiredExams: Number(item.requiredExams), completedExams: Number(item.completedExams), paid: Boolean(item.paid), status: item.certificateStatus === 'da_cap' ? 'Đã cấp' : item.certificateStatus === 'da_duyet' ? 'Đã xác nhận' : 'Chờ xét', eligible: item.eligible, ineligibleReasons: item.ineligibleReasons, certificateCode: item.certificateCode ?? undefined, issuedAt: item.issuedAt ?? undefined, pdfPath: item.pdfPath ?? undefined }))) } catch (error) { messageApi.error(errorMessage(error)) } }
  // Chỉ tải dữ liệu một lần khi mở trang; các thao tác ghi tự gọi load lại.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])
  const data = useMemo(() => candidates.filter((item) => {
    const matches = !query.trim() || [item.studentCode, item.studentName, item.className, item.course, item.certificateCode ?? ''].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
    const status = filter === 'Tất cả' || (filter === 'Đủ điều kiện' && eligible(item) && item.status !== 'Đã cấp') || (filter === 'Không đủ điều kiện' && !eligible(item)) || (filter === 'Đã cấp' && item.status === 'Đã cấp')
    return matches && status && (className === 'Tất cả' || item.className === className)
  }), [candidates, className, filter, query])
  const confirm = () => modal.confirm({ title: `Xác nhận ${selectedIds.length} học viên?`, content: 'Duyệt sẽ chốt thông tin, điểm, chuyên cần và học phí; không thể thêm kỳ thi sau bước này.', okText: 'Xác nhận và chốt hồ sơ', onOk: async () => { try { await api('/certificates/approve', json('POST', { enrollmentIds: selectedIds })); setSelectedIds([]); await load(); messageApi.success('Đã xác nhận danh sách.') } catch (error) { messageApi.error(errorMessage(error)); throw error } } })
  const issueAll = () => modal.confirm({ title: `Phát hành ${confirmedCount} chứng chỉ?`, content: 'Hệ thống sẽ tự tạo PDF và mã xác thực cho toàn bộ hồ sơ đã duyệt.', okText: 'Phát hành tất cả', onOk: async () => { setIssuing(true); try { const ids = candidates.filter((item) => item.status === 'Đã xác nhận' && item.certificateId).map((item) => item.certificateId!); const results = await Promise.allSettled(ids.map((id) => api(`/certificates/${id}/issue`, json('PATCH')))); const issued = results.filter((item) => item.status === 'fulfilled').length; await load(); if (issued !== ids.length) messageApi.warning(`Đã phát hành ${issued}/${ids.length} chứng chỉ. Kiểm tra lại các hồ sơ lỗi.`); else messageApi.success(`Đã phát hành ${issued} chứng chỉ PDF.`) } finally { setIssuing(false) } } })
  const reissue = (item: Candidate) => modal.confirm({ title: 'Tạo lại PDF chứng chỉ?', content: 'Giữ nguyên nội dung, số chứng chỉ, mã xác thực và ngày cấp gốc. Đây không phải thao tác đính chính.', okText: 'Tạo lại PDF', onOk: async () => { try { await api(`/certificates/${item.certificateId}/reissue`, json('POST')); setDetail(null); await load(); messageApi.success('Đã tạo lại chứng chỉ PDF.') } catch (error) { messageApi.error(errorMessage(error)); throw error } } })
  const openCorrection = (item: Candidate) => { correctionForm.setFieldsValue({ studentCode: item.studentCode, studentName: item.studentName, courseName: item.course, language: item.language, classCode: item.classCode, className: item.className, reason: '' }); setCorrecting(item) }
  const saveCorrection = async (values: Correction) => {
    if (!correcting || savingCorrection) return
    setSavingCorrection(true)
    try { await api(`/certificates/${correcting.certificateId}/details`, json('PATCH', values)); setCorrecting(null); setDetail(null); await load(); messageApi.success('Đã đính chính thông tin hồ sơ chưa phát hành.') }
    catch (error) { messageApi.error(errorMessage(error)) } finally { setSavingCorrection(false) }
  }
  const columns: TableProps<Candidate>['columns'] = [
    { title: 'Học viên', key: 'student', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.studentName.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><strong>{item.studentName}</strong><small>{item.studentCode}</small></div></div> },
    { title: 'Lớp học', key: 'class', render: (_, item) => <div><Typography.Text strong>{item.className}</Typography.Text><br /><Typography.Text type="secondary">{item.language}</Typography.Text></div> },
    { title: 'Chuyên cần', dataIndex: 'attendance', render: (value: number) => `${value.toFixed(1)}%` }, { title: 'Điểm TB', dataIndex: 'average', render: (value: number | null) => <Typography.Text type={value !== null && value < 5 ? 'danger' : undefined} strong>{value === null ? '—' : value.toFixed(2)}</Typography.Text> },
    { title: 'Học phí', dataIndex: 'paid', render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Đã thanh toán' : 'Còn nợ'}</Tag> },
    { title: 'Kết quả', key: 'result', render: (_, item) => <Tag color={item.status === 'Đã cấp' ? 'blue' : !eligible(item) ? 'red' : item.status === 'Đã xác nhận' ? 'gold' : 'green'}>{item.status === 'Chờ xét' ? eligible(item) ? 'Đủ điều kiện' : 'Chưa đạt' : item.status}</Tag> },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button icon={<CaretRight />} onClick={() => setDetail(item)} aria-label={`Xem hồ sơ ${item.studentName}`} /> },
  ]
  return <AdminLayout activePage="certificates" mainId="certificate-management" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
    {contextHolder}{modalContextHolder}<AdminPageHeader kicker="Kết quả cuối khóa" title="Thi và chứng chỉ" description="Xét điều kiện, xác nhận danh sách và quản lý lịch sử cấp chứng chỉ." actions={tab === 'certificates' ? <Space wrap><Button icon={<ShieldCheck />} onClick={confirm} disabled={!selectedIds.length}>Xác nhận ({selectedIds.length})</Button><Button type="primary" icon={<FilePdf />} loading={issuing} onClick={issueAll} disabled={!confirmedCount}>Phát hành PDF ({confirmedCount})</Button></Space> : undefined} />
    <Tabs activeKey={tab} onChange={setTab} items={[{ key: 'certificates', label: 'Chứng chỉ' }, { key: 'exams', label: 'Kỳ thi và hạn nhập điểm' }]} />
    {tab === 'exams' ? <AdminExams /> : <>
    <AdminSummary items={[{ label: 'Đủ điều kiện', value: candidates.filter((item) => eligible(item) && item.status !== 'Đã cấp').length, detail: 'Backend đã kiểm tra đủ điều kiện', icon: <GraduationCap weight="duotone" />, tone: 'success' }, { label: 'Chưa đủ điều kiện', value: candidates.filter((item) => !eligible(item)).length, detail: 'Xem lý do trong hồ sơ', icon: <XCircle weight="duotone" />, tone: 'danger' }, { label: 'Đã cấp', value: candidates.filter((item) => item.status === 'Đã cấp').length, detail: 'Có thể tra cứu và tải PDF', icon: <Certificate weight="duotone" /> }]} />
    <Card className="admin-table-card" title="Danh sách xét cấp" extra={<Space wrap><Input allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Học viên, lớp hoặc mã" /><Select value={filter} onChange={setFilter} options={['Tất cả', 'Đủ điều kiện', 'Không đủ điều kiện', 'Đã cấp'].map((value) => ({ value, label: value }))} /><Select value={className} onChange={setClassName} options={['Tất cả', ...new Set(candidates.map((item) => item.className))].map((value) => ({ value, label: value }))} /></Space>}><Table rowKey="id" columns={columns} dataSource={data} scroll={{ x: 940 }} rowSelection={{ selectedRowKeys: selectedIds, onChange: setSelectedIds, getCheckboxProps: (item) => ({ disabled: !eligible(item) || item.status !== 'Chờ xét' }) }} pagination={{ pageSize: 6, showTotal: (total) => `${total} học viên` }} /></Card>
    </>}
    <Drawer size={460} title="Hồ sơ xét cấp" open={Boolean(detail)} onClose={() => setDetail(null)}>{detail && <>
      <Flex align="center" gap={12}><Certificate size={38} /><div><Typography.Title className="admin-drawer-title" level={3}>{detail.studentName}</Typography.Title><Typography.Text type="secondary">{detail.studentCode} · {detail.className}</Typography.Text></div></Flex>
      <Space orientation="vertical" style={{ width: '100%', marginTop: 22 }}>
        {detail.status !== 'Chờ xét' && <Alert type="info" showIcon title="Hồ sơ đã chốt lúc duyệt" description="Điểm, chuyên cần và học phí dưới đây là dữ liệu đã được duyệt, không thay đổi theo thông tin hiện tại." />}
        <Alert type={detail.paid ? 'success' : 'error'} showIcon icon={<Receipt />} title="Học phí" description={detail.paid ? 'Đã hoàn tất' : 'Chưa hoàn tất'} />
        <Alert type={detail.expectedAttendance > 0 && detail.recordedAttendance === detail.expectedAttendance && detail.attendance >= 80 ? 'success' : 'warning'} showIcon title="Chuyên cần" description={`${detail.attendance.toFixed(1)}% · Đã điểm danh ${detail.recordedAttendance}/${detail.expectedAttendance} buổi đã đến giờ`} />
        <Alert type={detail.requiredExams > 0 && detail.completedExams === detail.requiredExams ? 'success' : 'error'} showIcon icon={<GraduationCap />} title="Kỳ thi" description={`Đã hoàn thành ${detail.completedExams}/${detail.requiredExams} kỳ thi`} />
        <Alert type={detail.average !== null && detail.average >= 5 ? 'success' : 'error'} showIcon icon={<GraduationCap />} title="Điểm trung bình" description={detail.average === null ? 'Chưa đủ điểm' : `${detail.average.toFixed(2)} / 10`} />
        <Alert type={eligible(detail) ? 'success' : 'warning'} showIcon title={eligible(detail) ? 'Đủ điều kiện cấp chứng chỉ' : 'Chưa đủ điều kiện cấp chứng chỉ'} description={detail.ineligibleReasons.join('; ')} />
        {detail.status === 'Đã xác nhận' && <Button block onClick={() => openCorrection(detail)}>Đính chính thông tin trước phát hành</Button>}
      </Space>
      {detail.certificateId && <CertificateCorrectionHistory certificateId={detail.certificateId} />}
      {detail.status === 'Đã cấp' && <><Descriptions bordered column={1} size="small" style={{ marginTop: 20 }} items={[{ key: 'code', label: 'Mã chứng chỉ', children: detail.certificateCode }, { key: 'course', label: 'Khóa học', children: detail.course }, { key: 'issued', label: 'Ngày cấp', children: detail.issuedAt && date(String(detail.issuedAt).slice(0, 10)) }]} /><Space orientation="vertical" style={{ width: '100%', marginTop: 16 }}><Button block type="primary" icon={<FilePdf />} disabled={!detail.pdfPath} onClick={() => detail.pdfPath && window.open(detail.pdfPath, '_blank', 'noopener,noreferrer')}>Mở chứng chỉ PDF</Button><Button block icon={<ArrowClockwise />} onClick={() => reissue(detail)}>Tạo lại PDF chứng chỉ</Button></Space></>}
    </>}</Drawer>
    <Modal title="Đính chính hồ sơ chưa phát hành" open={Boolean(correcting)} onCancel={() => !savingCorrection && setCorrecting(null)} onOk={() => correctionForm.submit()} confirmLoading={savingCorrection} okText="Lưu đính chính">
      <Alert type="info" showIcon title="Chỉ sửa thông tin hiển thị trên chứng chỉ" description="Không thay đổi tài khoản, lớp học, điểm, chuyên cần hoặc học phí. Lý do và thông tin trước/sau được lưu lại." style={{ marginBottom: 16 }} />
      <Form form={correctionForm} layout="vertical" onFinish={saveCorrection}>
        {([['studentCode', 'Mã học viên', 20], ['studentName', 'Họ tên học viên', 150], ['courseName', 'Tên khóa học', 150], ['language', 'Ngoại ngữ', 50], ['classCode', 'Mã lớp', 30], ['className', 'Tên lớp', 150]] as const).map(([name, label, max]) => <Form.Item key={name} name={name} label={label} rules={[{ required: true, whitespace: true, message: `Nhập ${label.toLocaleLowerCase('vi')}` }, { max }]}><Input maxLength={max} /></Form.Item>)}
        <Form.Item name="reason" label="Lý do đính chính" rules={[{ required: true, whitespace: true, message: 'Nhập lý do đính chính' }, { max: 255 }]}><Input.TextArea rows={2} maxLength={255} showCount /></Form.Item>
      </Form>
    </Modal>
  </AdminLayout>
}
export default AdminCertificates
