import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AutoComplete, Button, Card, Descriptions, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { api, errorMessage, json } from '../api'

export type PlacementCourse = { id: number; code: string; name: string; language: string; level: string; status: 'dang_mo' | 'tam_an' }
type Assessment = {
  id: number; studentId: number; assessedAt: string; language: string; score: number; level: string; note: string | null
  recommendedCourseId: number | null; recommendedCourseCode: string | null; recommendedCourseName: string | null
  recommendedCourseLanguage: string | null; recommendedCourseLevel: string | null
  status: 'da_ghi_nhan' | 'da_huy'; createdByName: string; createdAt: string
  canceledByName: string | null; canceledAt: string | null; cancelReason: string | null
}
type Values = { assessedAt: string; language: string; score: number; level: string; recommendedCourseId?: number; note?: string }
type Props = {
  studentId?: number; courses?: PlacementCourse[]; disabled?: boolean; studentActive?: boolean
  onRecommendCourse?: (courseId: number) => void
  onHistoryChange?: () => void; onPendingChange?: (pending: boolean) => void
}
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1000-01-01' || value > today()) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
const validScore = (value: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-8
const sameLabel = (left: string | null | undefined, right: string | null | undefined) => Boolean(left && right && left.trim().toLocaleLowerCase('vi') === right.trim().toLocaleLowerCase('vi'))
const displayDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN')
const displayTime = (value: string | null) => value ? new Date(value.replace(' ', 'T')).toLocaleString('vi-VN') : '—'

export default function PlacementAssessments({ studentId, courses = [], disabled = false, studentActive = true, onRecommendCourse, onHistoryChange, onPendingChange }: Props) {
  const admin = studentId !== undefined
  const path = admin ? `/placement-assessments?studentId=${studentId}` : '/student/placement-assessments'
  const [rows, setRows] = useState<Assessment[]>([])
  const [loadedPath, setLoadedPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [pending, setPending] = useState(false)
  const [creating, setCreating] = useState(false)
  const [canceling, setCanceling] = useState<Assessment | null>(null)
  const [reason, setReason] = useState('')
  const requestVersion = useRef(0)
  const pendingRef = useRef(false)
  const mounted = useRef(false)
  const pendingCallback = useRef(onPendingChange)
  const [form] = Form.useForm<Values>()
  const language: string | undefined = Form.useWatch('language', form)
  const [messageApi, contextHolder] = message.useMessage()
  const blocked = disabled || loading || Boolean(loadError) || pending || loadedPath !== path
  const createBlocked = blocked || !studentActive
  const activeCourses = courses.filter((item) => item.status === 'dang_mo')
  const matchingCourses = activeCourses.filter((item) => sameLabel(item.language, language))
  const recommendedCourse = (row: Assessment) => activeCourses.find((item) => item.id === row.recommendedCourseId
    && item.code === row.recommendedCourseCode && sameLabel(item.language, row.language)
    && sameLabel(item.language, row.recommendedCourseLanguage) && sameLabel(item.level, row.recommendedCourseLevel))

  useEffect(() => { pendingCallback.current = onPendingChange }, [onPendingChange])
  useEffect(() => {
    mounted.current = true
    const guardHistory = (event: Event) => { if (pendingRef.current) event.preventDefault() }
    const guardUnload = (event: BeforeUnloadEvent) => { if (pendingRef.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('app:history-navigation', guardHistory)
    window.addEventListener('beforeunload', guardUnload)
    return () => {
      mounted.current = false; requestVersion.current += 1
      if (pendingRef.current) pendingCallback.current?.(false)
      window.removeEventListener('app:history-navigation', guardHistory)
      window.removeEventListener('beforeunload', guardUnload)
    }
  }, [])
  const load = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true); setLoadError('')
    try {
      const data = await api<Assessment[]>(path)
      if (mounted.current && version === requestVersion.current) { setRows(data); setLoadedPath(path) }
    } catch (error) { if (mounted.current && version === requestVersion.current) setLoadError(errorMessage(error)) }
    finally { if (mounted.current && version === requestVersion.current) setLoading(false) }
  }, [path])
  useEffect(() => {
    setCreating(false); setCanceling(null)
    void load()
    return () => { requestVersion.current += 1 }
  }, [load])

  const save = async (values: Values) => {
    if (!admin || createBlocked || pendingRef.current) return
    const language = values.language?.trim() ?? '', level = values.level?.trim() ?? '', note = values.note?.trim() ?? ''
    if (!Number.isSafeInteger(studentId) || studentId < 1 || !validDate(values.assessedAt) || !validScore(values.score)
      || !language || language.length > 50 || !level || level.length > 50 || note.length > 1000) {
      messageApi.error('Kiểm tra ngày, ngoại ngữ, trình độ và điểm từ 0–10 (tối đa 2 số lẻ).'); return
    }
    if (values.recommendedCourseId !== undefined && !activeCourses.some((item) => item.id === values.recommendedCourseId && sameLabel(item.language, language))) {
      form.setFields([{ name: 'recommendedCourseId', errors: ['Chọn khóa đang mở, cùng ngoại ngữ kiểm tra.'] }]); return
    }
    const version = requestVersion.current
    pendingRef.current = true; setPending(true); pendingCallback.current?.(true)
    try {
      await api('/placement-assessments', json('POST', { studentId, assessedAt: values.assessedAt, language, score: values.score, level, recommendedCourseId: values.recommendedCourseId ?? null, note: note || null }))
      if (!mounted.current || version !== requestVersion.current) return
      setCreating(false); onHistoryChange?.(); messageApi.success('Đã ghi nhận kết quả kiểm tra đầu vào.'); await load()
    } catch (error) { if (mounted.current && version === requestVersion.current) messageApi.error(errorMessage(error)) }
    finally { pendingRef.current = false; if (mounted.current) { setPending(false); pendingCallback.current?.(false) } }
  }
  const cancel = async () => {
    if (!admin || !canceling || canceling.status !== 'da_ghi_nhan' || blocked || pendingRef.current || !reason.trim() || reason.trim().length > 255) return
    const version = requestVersion.current
    pendingRef.current = true; setPending(true); pendingCallback.current?.(true)
    try {
      await api(`/placement-assessments/${canceling.id}/cancel`, json('POST', { reason: reason.trim() }))
      if (!mounted.current || version !== requestVersion.current) return
      setCanceling(null); onHistoryChange?.(); messageApi.success('Đã hủy kết quả, lịch sử vẫn được giữ.'); await load()
    } catch (error) { if (mounted.current && version === requestVersion.current) messageApi.error(errorMessage(error)) }
    finally { pendingRef.current = false; if (mounted.current) { setPending(false); pendingCallback.current?.(false) } }
  }
  const columns: ColumnsType<Assessment> = [
    { title: 'Ngày kiểm tra', dataIndex: 'assessedAt', render: displayDate },
    { title: 'Ngoại ngữ', dataIndex: 'language' },
    { title: 'Điểm / 10', dataIndex: 'score', render: (value: number) => Number(value).toFixed(2) },
    { title: 'Trình độ đánh giá', dataIndex: 'level' },
    { title: 'Khóa đề xuất lúc kiểm tra', key: 'course', render: (_, row) => row.recommendedCourseName ? <><Typography.Text>{row.recommendedCourseCode} · {row.recommendedCourseName}</Typography.Text><br /><Typography.Text type="secondary">{row.recommendedCourseLanguage} · {row.recommendedCourseLevel}</Typography.Text></> : 'Không đề xuất khóa' },
    { title: 'Người ghi nhận', dataIndex: 'createdByName' },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: Assessment['status']) => <Tag color={value === 'da_huy' ? 'default' : 'green'}>{value === 'da_huy' ? 'Đã hủy' : 'Đã ghi nhận'}</Tag> },
  ]
  if (admin) columns.push({ title: 'Thao tác', key: 'action', render: (_, row) => {
    const course = recommendedCourse(row)
    return row.status === 'da_huy' ? '—' : <Space orientation="vertical">
      {onRecommendCourse && row.recommendedCourseName && <Button disabled={createBlocked || !course} title={!studentActive ? 'Học viên đã bị khóa; không thể ghi danh khóa mới.' : course ? undefined : 'Khóa đề xuất không còn mở hoặc đã đổi mã, ngoại ngữ, trình độ.'} onClick={() => { if (!createBlocked && !pendingRef.current && course) onRecommendCourse(course.id) }}>Ghi danh khóa đề xuất</Button>}
      <Button danger disabled={blocked} onClick={() => { if (!blocked && !pendingRef.current) { setReason(''); setCanceling(row) } }}>Hủy kết quả</Button>
    </Space>
  } })

  return <Card title="Kiểm tra đầu vào" style={{ margin: '16px 0' }} extra={<Space wrap>
    <Button loading={loading} disabled={disabled || pending} onClick={() => { if (!pendingRef.current) void load() }}>Làm mới</Button>
    {admin && <Button type="primary" disabled={createBlocked} onClick={() => { if (createBlocked || pendingRef.current) return; form.resetFields(); form.setFieldsValue({ assessedAt: today() }); setCreating(true) }}>Ghi nhận kết quả</Button>}
  </Space>}>
    {contextHolder}
    <Typography.Paragraph type="secondary">Kết quả kiểm tra trực tiếp dùng để tư vấn khóa học, không tính vào điểm cuối khóa hoặc điều kiện cấp chứng chỉ. Lịch sử được giữ nguyên; kết quả nhập nhầm có thể được hủy và ghi nhận lại.</Typography.Paragraph>
    {admin && !studentActive && <Typography.Paragraph type="secondary">Học viên đã bị khóa: vẫn xem và hủy kết quả cũ, nhưng không ghi nhận kết quả mới hoặc ghi danh khóa đề xuất.</Typography.Paragraph>}
    {loading || !loadError && loadedPath !== path ? <Table loading rowKey="id" dataSource={[]} columns={columns} pagination={false} locale={{ emptyText: 'Đang tải kết quả kiểm tra…' }} /> : loadError ? <Alert type="error" showIcon title="Chưa tải được kiểm tra đầu vào" description={loadError} action={<Button disabled={disabled || pending} onClick={() => { if (!pendingRef.current) void load() }}>Thử lại</Button>} /> : <Table rowKey="id" dataSource={rows} columns={columns} pagination={{ pageSize: 5 }} scroll={{ x: admin ? 1100 : 900 }} locale={{ emptyText: 'Chưa có kết quả kiểm tra đầu vào.' }} expandable={{ expandedRowRender: (row) => <Descriptions column={1} size="small" bordered items={[
      { key: 'note', label: 'Ghi chú', children: row.note || 'Không có ghi chú' },
      { key: 'created', label: 'Ghi nhận lúc', children: displayTime(row.createdAt) },
      ...(row.status === 'da_huy' ? [
        { key: 'reason', label: 'Lý do hủy', children: row.cancelReason },
        { key: 'actor', label: 'Người hủy', children: row.canceledByName },
        { key: 'canceled', label: 'Hủy lúc', children: displayTime(row.canceledAt) },
      ] : []),
    ]} /> }} />}
    {admin && <>
      <Modal title="Ghi nhận kiểm tra đầu vào" open={creating} okText="Lưu kết quả" onOk={() => { if (!createBlocked && !pendingRef.current) form.submit() }} confirmLoading={pending} okButtonProps={{ disabled: createBlocked }} cancelButtonProps={{ disabled: pending }} closable={!pending} keyboard={!pending} maskClosable={!pending} onCancel={() => { if (!pendingRef.current) setCreating(false) }} destroyOnHidden>
        <Form form={form} layout="vertical" disabled={createBlocked} onFinish={save} style={{ marginTop: 16 }}>
          <Form.Item name="assessedAt" label="Ngày kiểm tra" rules={[{ required: true }, { validator: (_, value: string) => validDate(value) ? Promise.resolve() : Promise.reject(new Error('Chọn ngày hợp lệ, không ở tương lai.')) }]}><Input type="date" min="1000-01-01" max={today()} /></Form.Item>
          <Form.Item name="language" label="Ngoại ngữ" rules={[{ required: true, whitespace: true }, { max: 50 }]}><AutoComplete options={[...new Set(activeCourses.map((item) => item.language))].map((value) => ({ value }))} onChange={() => form.setFieldsValue({ recommendedCourseId: undefined })}><Input maxLength={50} placeholder="Chọn hoặc nhập ngoại ngữ" /></AutoComplete></Form.Item>
          <Form.Item name="score" label="Điểm đầu vào / 10" rules={[{ required: true }, { validator: (_, value: number) => validScore(value) ? Promise.resolve() : Promise.reject(new Error('Điểm từ 0–10, tối đa 2 số lẻ.')) }]}><InputNumber min={0} max={10} step={0.01} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="level" label="Trình độ đánh giá" extra="Giáo vụ ghi theo kết quả đánh giá; hệ thống không tự suy ra trình độ từ điểm." rules={[{ required: true, whitespace: true }, { max: 50 }]}><Input maxLength={50} /></Form.Item>
          <Form.Item name="recommendedCourseId" label="Khóa đề xuất (không bắt buộc)" extra="Chỉ liệt kê khóa đang mở, cùng ngoại ngữ."><Select allowClear showSearch optionFilterProp="label" disabled={createBlocked || !language} placeholder="Không chọn nếu chưa đề xuất khóa" options={matchingCourses.map((item) => ({ value: item.id, label: `${item.code} · ${item.name} · ${item.level}` }))} /></Form.Item>
          <Form.Item name="note" label="Ghi chú" rules={[{ max: 1000 }]}><Input.TextArea rows={3} maxLength={1000} showCount /></Form.Item>
        </Form>
      </Modal>
      <Modal title="Hủy kết quả kiểm tra đầu vào" open={Boolean(canceling)} okText="Hủy kết quả" onOk={() => void cancel()} confirmLoading={pending} okButtonProps={{ danger: true, disabled: blocked || !reason.trim() || reason.trim().length > 255 }} cancelButtonProps={{ disabled: pending }} closable={!pending} keyboard={!pending} maskClosable={!pending} onCancel={() => { if (!pendingRef.current) setCanceling(null) }} destroyOnHidden>
        <Typography.Paragraph>Lịch sử vẫn được giữ. Nhập lý do hủy kết quả {canceling?.language} ngày {canceling ? displayDate(canceling.assessedAt) : ''}.</Typography.Paragraph>
        <Input.TextArea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} disabled={blocked} maxLength={255} showCount aria-label="Lý do hủy kiểm tra đầu vào" />
      </Modal>
    </>}
  </Card>
}
