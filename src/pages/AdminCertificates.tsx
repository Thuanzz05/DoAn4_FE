import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowClockwise, CaretRight, Certificate, FilePdf, GraduationCap, MagnifyingGlass, Receipt, ShieldCheck, XCircle } from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Descriptions, Drawer, Flex, Form, Input, Modal, Segmented, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'
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
type IssueFailure = { id: number; studentName: string; error: string }
const eligible = (item: Candidate) => item.eligible
const date = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))

function AdminCertificates({ onLogout, onNavigate, onNavigateHome }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loadVersion = useRef(0)
  const [query, setQuery] = useState('')
  const [classCode, setClassCode] = useState('Tất cả')
  const [filter, setFilter] = useState<CertificateFilter>('Tất cả')
  const [selectionMode, setSelectionMode] = useState<'approve' | 'issue'>('approve')
  const [approvalIds, setApprovalIds] = useState<React.Key[]>([])
  const [issueIds, setIssueIds] = useState<React.Key[]>([])
  const [issueFailures, setIssueFailures] = useState<IssueFailure[]>([])
  const [detailId, setDetailId] = useState<number | null>(null)
  const [messageApi, contextHolder] = message.useMessage()
  const [pending, setPending] = useState<'approve' | 'issue' | 'reissue' | 'correction' | null>(null)
  const mutationRef = useRef(false)
  const confirmationRef = useRef(false)
  const [tab, setTab] = useState('certificates')
  const [correcting, setCorrecting] = useState<Candidate | null>(null)
  const [correctionForm] = Form.useForm<Correction>()
  const [modal, modalContextHolder] = Modal.useModal()
  const blocked = loading || Boolean(loadError) || pending !== null
  const detail = candidates.find((item) => item.id === detailId)
  const load = useCallback(async () => {
    const version = ++loadVersion.current
    setLoading(true); setLoadError(null)
    try {
      const rows = await api<CandidateApi[]>('/certificates/candidates')
      if (version !== loadVersion.current) return
      setCandidates(rows.map((item) => ({ id: item.enrollmentId, certificateId: item.certificateId, studentCode: item.studentCode, studentName: item.studentName, classCode: item.classCode, className: item.className, course: item.courseName, language: item.language, attendance: Number(item.attendance), expectedAttendance: Number(item.expectedAttendance), recordedAttendance: Number(item.recordedAttendance), average: item.average === null ? null : Number(item.average), requiredExams: Number(item.requiredExams), completedExams: Number(item.completedExams), paid: Boolean(item.paid), status: item.certificateStatus === 'da_cap' ? 'Đã cấp' : item.certificateStatus === 'da_duyet' ? 'Đã xác nhận' : 'Chờ xét', eligible: item.eligible, ineligibleReasons: item.ineligibleReasons, certificateCode: item.certificateCode ?? undefined, issuedAt: item.issuedAt ?? undefined, pdfPath: item.pdfPath ?? undefined })))
    } catch (error) {
      if (version === loadVersion.current) setLoadError(errorMessage(error))
    } finally {
      if (version === loadVersion.current) setLoading(false)
    }
  }, [])
  useEffect(() => { void load(); return () => { loadVersion.current += 1 } }, [load])
  const data = useMemo(() => candidates.filter((item) => {
    const matches = !query.trim() || [item.studentCode, item.studentName, item.className, item.course, item.certificateCode ?? ''].some((value) => value.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
    const status = filter === 'Tất cả' || (filter === 'Đủ điều kiện' && eligible(item) && item.status !== 'Đã cấp') || (filter === 'Không đủ điều kiện' && !eligible(item)) || (filter === 'Đã cấp' && item.status === 'Đã cấp')
    return matches && status && (classCode === 'Tất cả' || item.classCode === classCode)
  }), [candidates, classCode, filter, query])
  const approvalTargets = data.filter((item) => approvalIds.includes(item.id) && eligible(item) && item.status === 'Chờ xét')
  const issueTargets = data.filter((item) => issueIds.includes(item.id) && eligible(item) && item.status === 'Đã xác nhận' && item.certificateId !== null)
  // Các lựa chọn chỉ có hiệu lực trong bộ lọc hiện tại và đúng trạng thái thao tác.
  useEffect(() => {
    if (loading || loadError) return
    const prune = (ids: React.Key[], status: CertificateStatus) => {
      const next = ids.filter((id) => data.some((item) => item.id === id && eligible(item) && item.status === status && (status !== 'Đã xác nhận' || item.certificateId !== null)))
      return next.length === ids.length ? ids : next
    }
    setApprovalIds((ids) => prune(ids, 'Chờ xét'))
    setIssueIds((ids) => prune(ids, 'Đã xác nhận'))
    setIssueFailures((items) => {
      const next = items.filter((failure) => candidates.some((item) => item.id === failure.id && item.status === 'Đã xác nhận'))
      return next.length === items.length ? items : next
    })
  }, [candidates, data, loading, loadError])
  const scope = `Bộ lọc: lớp ${classCode}, ${filter}${query.trim() ? `, tìm “${query.trim()}”` : ''}. Chỉ xử lý các hồ sơ đã chọn trong kết quả lọc, không xử lý hồ sơ khác hoặc toàn trung tâm.`
  const mutate = async (kind: Exclude<typeof pending, null>, action: () => Promise<void>) => {
    if (mutationRef.current || loading || loadError) return
    mutationRef.current = true; setPending(kind)
    try { await action() }
    catch (error) { messageApi.error(errorMessage(error)); throw error }
    finally { mutationRef.current = false; setPending(null) }
  }
  const ask = (options: Parameters<typeof modal.confirm>[0]) => {
    if (blocked || mutationRef.current || confirmationRef.current) return
    confirmationRef.current = true
    modal.confirm({ ...options, cancelText: 'Hủy', afterClose: () => { confirmationRef.current = false } })
  }
  const confirm = () => {
    if (!approvalTargets.length) return
    const ids = approvalTargets.map((item) => item.id)
    ask({ title: `Xác nhận ${ids.length} hồ sơ được chọn?`, content: `${scope} Duyệt sẽ chốt thông tin, điểm, chuyên cần và học phí; không thể thêm kỳ thi sau bước này.`, okText: 'Xác nhận và chốt hồ sơ', onOk: () => mutate('approve', async () => {
      await api('/certificates/approve', json('POST', { enrollmentIds: ids }))
      setApprovalIds((current) => current.filter((id) => !ids.includes(Number(id))))
      await load(); messageApi.success(`Đã xác nhận ${ids.length} hồ sơ.`)
    }) })
  }
  const issue = (targets: Candidate[], single = false) => {
    if (!targets.length || targets.some((item) => !eligible(item) || item.status !== 'Đã xác nhận' || item.certificateId === null)) return
    ask({ title: `Phát hành ${targets.length} chứng chỉ PDF?`, content: single ? `Chỉ phát hành hồ sơ ${targets[0].studentCode} – ${targets[0].studentName}, lớp ${targets[0].classCode}. Hệ thống tạo PDF và mã xác thực từ hồ sơ đã chốt, không xử lý hồ sơ khác.` : `${scope} Hệ thống tạo PDF và mã xác thực từ hồ sơ đã chốt.`, okText: 'Phát hành PDF', onOk: () => mutate('issue', async () => {
      const results = await Promise.allSettled(targets.map((item) => api(`/certificates/${item.certificateId}/issue`, json('PATCH'))))
      const failures = results.flatMap((result, index) => result.status === 'rejected' ? [{ id: targets[index].id, studentName: targets[index].studentName, error: errorMessage(result.reason) }] : [])
      const targetIds = targets.map((item) => item.id)
      setIssueIds((current) => [...current.filter((id) => !targetIds.includes(Number(id))), ...failures.map((item) => item.id)])
      setIssueFailures((current) => [...current.filter((item) => !targetIds.includes(item.id)), ...failures])
      if (failures.length) setSelectionMode('issue')
      await load()
      if (failures.length) messageApi.warning(`Đã phát hành ${targets.length - failures.length}/${targets.length} chứng chỉ. Hồ sơ lỗi được giữ lại để thử lại.`)
      else messageApi.success(`Đã phát hành ${targets.length} chứng chỉ PDF.`)
    }) })
  }
  const reissue = (item: Candidate) => {
    if (item.status !== 'Đã cấp' || item.certificateId === null) return
    ask({ title: 'Tạo lại PDF chứng chỉ?', content: `Chỉ tạo lại PDF của ${item.studentName}. Giữ nguyên nội dung, số chứng chỉ, mã xác thực và ngày cấp gốc. Đây không phải thao tác đính chính.`, okText: 'Tạo lại PDF', onOk: () => mutate('reissue', async () => {
      await api(`/certificates/${item.certificateId}/reissue`, json('POST'))
      await load(); messageApi.success('Đã tạo lại chứng chỉ PDF.')
    }) })
  }
  const openCorrection = (item: Candidate) => {
    if (blocked || item.status !== 'Đã xác nhận' || item.certificateId === null) return
    correctionForm.setFieldsValue({ studentCode: item.studentCode, studentName: item.studentName, courseName: item.course, language: item.language, classCode: item.classCode, className: item.className, reason: '' }); setCorrecting(item)
  }
  const saveCorrection = async (values: Correction) => {
    if (!correcting || candidates.find((item) => item.id === correcting.id)?.status !== 'Đã xác nhận') return
    await mutate('correction', async () => {
      await api(`/certificates/${correcting.certificateId}/details`, json('PATCH', values))
      setCorrecting(null); await load(); messageApi.success('Đã đính chính thông tin hồ sơ chưa phát hành.')
    }).catch(() => undefined)
  }
  const columns: TableProps<Candidate>['columns'] = [
    { title: 'Học viên', key: 'student', render: (_, item) => <div className="admin-entity"><Avatar shape="square">{item.studentName.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><strong>{item.studentName}</strong><small>{item.studentCode}</small></div></div> },
    { title: 'Lớp học', key: 'class', render: (_, item) => <div><Typography.Text strong>{item.className}</Typography.Text><br /><Typography.Text type="secondary">{item.language}</Typography.Text></div> },
    { title: 'Chuyên cần', dataIndex: 'attendance', render: (value: number) => `${value.toFixed(1)}%` }, { title: 'Điểm TB', dataIndex: 'average', render: (value: number | null) => <Typography.Text type={value !== null && value < 5 ? 'danger' : undefined} strong>{value === null ? '—' : value.toFixed(2)}</Typography.Text> },
    { title: 'Học phí', dataIndex: 'paid', render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Đã thanh toán' : 'Còn nợ'}</Tag> },
    { title: 'Kết quả', key: 'result', render: (_, item) => <Tag color={item.status === 'Đã cấp' ? 'blue' : !eligible(item) ? 'red' : item.status === 'Đã xác nhận' ? 'gold' : 'green'}>{item.status === 'Chờ xét' ? eligible(item) ? 'Đủ điều kiện' : 'Chưa đạt' : item.status}</Tag> },
    { title: '', key: 'action', width: 52, render: (_, item) => <Button disabled={blocked} icon={<CaretRight />} onClick={() => setDetailId(item.id)} aria-label={`Xem hồ sơ ${item.studentName}`} /> },
  ]
  return <AdminLayout activePage="certificates" mainId="certificate-management" onLogout={() => { if (!mutationRef.current) onLogout() }} onNavigate={(page) => { if (!mutationRef.current) onNavigate(page) }} onNavigateHome={() => { if (!mutationRef.current) onNavigateHome() }}>
    {contextHolder}{modalContextHolder}<AdminPageHeader kicker="Kết quả cuối khóa" title="Thi và chứng chỉ" description="Xét điều kiện, xác nhận danh sách và quản lý lịch sử cấp chứng chỉ." actions={tab === 'certificates' ? <Space wrap><Button icon={<ArrowClockwise />} disabled={pending !== null} loading={loading} onClick={() => void load()}>Tải lại</Button><Button icon={<ShieldCheck />} loading={pending === 'approve'} onClick={confirm} disabled={blocked || selectionMode !== 'approve' || !approvalTargets.length}>Xác nhận đã chọn ({approvalTargets.length})</Button><Button type="primary" icon={<FilePdf />} loading={pending === 'issue'} onClick={() => issue(issueTargets)} disabled={blocked || selectionMode !== 'issue' || !issueTargets.length}>Phát hành đã chọn ({issueTargets.length})</Button></Space> : undefined} />
    <Tabs activeKey={tab} onChange={setTab} items={[{ key: 'certificates', label: 'Chứng chỉ', disabled: pending !== null }, { key: 'exams', label: 'Kỳ thi và hạn nhập điểm', disabled: pending !== null }]} />
    {tab === 'exams' ? <AdminExams /> : <>
    {!loading && !loadError && <AdminSummary items={[{ label: 'Đủ điều kiện', value: candidates.filter((item) => eligible(item) && item.status !== 'Đã cấp').length, detail: 'Backend đã kiểm tra đủ điều kiện', icon: <GraduationCap weight="duotone" />, tone: 'success' }, { label: 'Chưa đủ điều kiện', value: candidates.filter((item) => !eligible(item)).length, detail: 'Xem lý do trong hồ sơ', icon: <XCircle weight="duotone" />, tone: 'danger' }, { label: 'Đã cấp', value: candidates.filter((item) => item.status === 'Đã cấp').length, detail: 'Có thể tra cứu và tải PDF', icon: <Certificate weight="duotone" /> }]} />}
    {loadError && <Alert type="error" showIcon title="Chưa tải được hồ sơ chứng chỉ" description={`${loadError} Các thao tác được khóa để tránh xử lý dữ liệu cũ.`} action={<Button onClick={() => void load()} disabled={pending !== null}>Thử lại</Button>} style={{ marginBottom: 16 }} />}
    {!!issueFailures.length && <Alert type="warning" showIcon title={`${issueFailures.length} hồ sơ chưa phát hành`} description={<><Typography.Paragraph>Hồ sơ lỗi trong bộ lọc hiện tại được giữ ở chế độ “Chọn để phát hành PDF”. Nếu đổi bộ lọc, hãy tìm và chọn lại hồ sơ cần thử lại; chứng chỉ đã cấp không bị cấp lại.</Typography.Paragraph>{issueFailures.map((item) => <div key={item.id}><Typography.Text strong>{item.studentName}: </Typography.Text>{item.error}</div>)}</>} style={{ marginBottom: 16 }} />}
    <Card className="admin-table-card" title="Danh sách xét cấp" extra={<Space wrap><Input disabled={pending !== null} allowClear prefix={<MagnifyingGlass />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Học viên, lớp hoặc mã" /><Select disabled={pending !== null} value={filter} onChange={setFilter} options={['Tất cả', 'Đủ điều kiện', 'Không đủ điều kiện', 'Đã cấp'].map((value) => ({ value, label: value }))} /><Select disabled={pending !== null} value={classCode} onChange={setClassCode} options={[{ value: 'Tất cả', label: 'Tất cả lớp' }, ...[...new Map(candidates.map((item) => [item.classCode, item.className])).entries()].map(([value, name]) => ({ value, label: `${value} · ${name}` }))]} /></Space>}>
      <Space wrap style={{ marginBottom: 16 }}><Segmented disabled={blocked} value={selectionMode} onChange={(value) => setSelectionMode(value as 'approve' | 'issue')} options={[{ value: 'approve', label: 'Chọn để duyệt' }, { value: 'issue', label: 'Chọn để phát hành PDF' }]} /><Typography.Text type="secondary">{selectionMode === 'approve' ? 'Chỉ chọn hồ sơ Chờ xét đủ điều kiện.' : 'Chỉ chọn hồ sơ Đã xác nhận đủ điều kiện.'} Lựa chọn ngoài bộ lọc sẽ được bỏ.</Typography.Text></Space>
      <Table rowKey="id" columns={columns} loading={loading} dataSource={loadError ? [] : data} scroll={{ x: 940 }} rowSelection={{ selectedRowKeys: (selectionMode === 'approve' ? approvalTargets : issueTargets).map((item) => item.id), onChange: selectionMode === 'approve' ? setApprovalIds : setIssueIds, getCheckboxProps: (item) => ({ disabled: blocked || !eligible(item) || (selectionMode === 'approve' ? item.status !== 'Chờ xét' : item.status !== 'Đã xác nhận' || item.certificateId === null) }) }} pagination={{ pageSize: 6, showTotal: (total) => `${total} học viên` }} />
    </Card>
    </>}
    <Drawer size={460} title="Hồ sơ xét cấp" open={detailId !== null} onClose={() => pending === null && setDetailId(null)} closable={pending === null} loading={loading} extra={<Button disabled={pending !== null} loading={loading} icon={<ArrowClockwise />} onClick={() => void load()}>Tải lại hồ sơ</Button>}>
      {loadError ? <Alert type="error" showIcon title="Chưa tải được hồ sơ" description={loadError} action={<Button disabled={pending !== null} onClick={() => void load()}>Thử lại</Button>} /> : !loading && !detail ? <Alert type="warning" showIcon title="Hồ sơ không còn trong danh sách" description="Tải lại để kiểm tra trạng thái mới nhất. Không thể thao tác với hồ sơ cũ." /> : detail && !loading && <>
      <Flex align="center" gap={12}><Certificate size={38} /><div><Typography.Title className="admin-drawer-title" level={3}>{detail.studentName}</Typography.Title><Typography.Text type="secondary">{detail.studentCode} · {detail.className}</Typography.Text></div></Flex>
      <Space orientation="vertical" style={{ width: '100%', marginTop: 22 }}>
        {detail.status !== 'Chờ xét' && <Alert type="info" showIcon title="Hồ sơ đã chốt lúc duyệt" description="Điểm, chuyên cần và học phí dưới đây là dữ liệu đã được duyệt, không thay đổi theo thông tin hiện tại." />}
        <Alert type={detail.paid ? 'success' : 'error'} showIcon icon={<Receipt />} title="Học phí" description={detail.paid ? 'Đã hoàn tất' : 'Chưa hoàn tất'} />
        <Alert type={detail.expectedAttendance > 0 && detail.recordedAttendance === detail.expectedAttendance && detail.attendance >= 80 ? 'success' : 'warning'} showIcon title="Chuyên cần" description={`${detail.attendance.toFixed(1)}% · Đã điểm danh ${detail.recordedAttendance}/${detail.expectedAttendance} buổi đã đến giờ`} />
        <Alert type={detail.requiredExams > 0 && detail.completedExams === detail.requiredExams ? 'success' : 'error'} showIcon icon={<GraduationCap />} title="Kỳ thi" description={`Đã hoàn thành ${detail.completedExams}/${detail.requiredExams} kỳ thi`} />
        <Alert type={detail.average !== null && detail.average >= 5 ? 'success' : 'error'} showIcon icon={<GraduationCap />} title="Điểm trung bình" description={detail.average === null ? 'Chưa đủ điểm' : `${detail.average.toFixed(2)} / 10`} />
        <Alert type={eligible(detail) ? 'success' : 'warning'} showIcon title={eligible(detail) ? 'Đủ điều kiện cấp chứng chỉ' : 'Chưa đủ điều kiện cấp chứng chỉ'} description={detail.ineligibleReasons.join('; ')} />
        {detail.status === 'Đã xác nhận' && <><Button block type="primary" icon={<FilePdf />} loading={pending === 'issue'} disabled={blocked || !eligible(detail) || detail.certificateId === null} onClick={() => issue([detail], true)}>Phát hành PDF cho học viên này</Button><Button block disabled={blocked} onClick={() => openCorrection(detail)}>Đính chính thông tin trước phát hành</Button></>}
      </Space>
      {detail.certificateId && <CertificateCorrectionHistory key={`${detail.certificateId}-${loadVersion.current}`} certificateId={detail.certificateId} />}
      {detail.status === 'Đã cấp' && <><Descriptions bordered column={1} size="small" style={{ marginTop: 20 }} items={[{ key: 'code', label: 'Mã chứng chỉ', children: detail.certificateCode }, { key: 'course', label: 'Khóa học', children: detail.course }, { key: 'issued', label: 'Ngày cấp', children: detail.issuedAt && date(String(detail.issuedAt).slice(0, 10)) }]} /><Space orientation="vertical" style={{ width: '100%', marginTop: 16 }}><Button block type="primary" icon={<FilePdf />} disabled={blocked || !detail.pdfPath} onClick={() => detail.pdfPath && window.open(detail.pdfPath, '_blank', 'noopener,noreferrer')}>Mở chứng chỉ PDF</Button><Button block disabled={blocked} loading={pending === 'reissue'} icon={<ArrowClockwise />} onClick={() => reissue(detail)}>Tạo lại PDF chứng chỉ</Button></Space></>}
    </>}</Drawer>
    <Modal title="Đính chính hồ sơ chưa phát hành" open={Boolean(correcting)} onCancel={() => pending === null && setCorrecting(null)} onOk={() => !blocked && correctionForm.submit()} confirmLoading={pending === 'correction'} okButtonProps={{ disabled: blocked }} cancelButtonProps={{ disabled: pending !== null }} closable={pending === null} okText="Lưu đính chính">
      <Alert type="info" showIcon title="Chỉ sửa thông tin hiển thị trên chứng chỉ" description="Không thay đổi tài khoản, lớp học, điểm, chuyên cần hoặc học phí. Lý do và thông tin trước/sau được lưu lại." style={{ marginBottom: 16 }} />
      <Form form={correctionForm} layout="vertical" onFinish={saveCorrection} disabled={blocked}>
        {([['studentCode', 'Mã học viên', 20], ['studentName', 'Họ tên học viên', 150], ['courseName', 'Tên khóa học', 150], ['language', 'Ngoại ngữ', 50], ['classCode', 'Mã lớp', 30], ['className', 'Tên lớp', 150]] as const).map(([name, label, max]) => <Form.Item key={name} name={name} label={label} rules={[{ required: true, whitespace: true, message: `Nhập ${label.toLocaleLowerCase('vi')}` }, { max }]}><Input maxLength={max} /></Form.Item>)}
        <Form.Item name="reason" label="Lý do đính chính" rules={[{ required: true, whitespace: true, message: 'Nhập lý do đính chính' }, { max: 255 }]}><Input.TextArea rows={2} maxLength={255} showCount /></Form.Item>
      </Form>
    </Modal>
  </AdminLayout>
}
export default AdminCertificates
