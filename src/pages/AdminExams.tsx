import { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Drawer, Form, Input, Modal, Select, Space, Table, Tag, Timeline, Typography, message } from 'antd'
import { api, errorMessage, json } from '../api'

type ClassOption = { id: number; code: string; name: string; status: string }
type Exam = { id: number; classId: number; classCode: string; className: string; name: string; examDate: string | null; deadline: string | null; deadlinePassed: boolean; certificateLocked: boolean; resultsCount: number; completedResults: number }
type Values = { classId: number; name: string; examDate?: string | null; deadline?: string | null; reason: string }
type History = { id: number; action: string; reason: string; before: Record<string, unknown> | null; after: Record<string, unknown>; changedAt: string; actorName: string }
const timeText = (value: string | null) => value ? new Date(value.replace(' ', 'T')).toLocaleString('vi-VN') : 'Chưa đặt'
const examFields = (value: Record<string, unknown> | null) => value ? `Tên: ${value.name ?? '—'}; ngày thi: ${value.examDate ?? '—'}; hạn sửa: ${value.deadline ?? '—'}` : 'Chưa có'

export default function AdminExams() {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [rows, setRows] = useState<Exam[]>([])
  const [classId, setClassId] = useState<number>()
  const [editing, setEditing] = useState<Exam | 'new' | null>(null)
  const [historyExam, setHistoryExam] = useState<Exam | null>(null)
  const [history, setHistory] = useState<History[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [classesError, setClassesError] = useState('')
  const [revision, setRevision] = useState(0)
  const [form] = Form.useForm<Values>()
  const [messageApi, contextHolder] = message.useMessage()
  useEffect(() => {
    let active = true
    setClasses([]); setClassesError('')
    api<ClassOption[]>('/classes').then((data) => { if (active) setClasses(data) })
      .catch((error) => { if (active) setClassesError(errorMessage(error)) })
    return () => { active = false }
  }, [revision])
  useEffect(() => {
    let active = true
    setLoading(true); setRows([]); setLoadError('')
    api<Exam[]>(`/exams${classId ? `?classId=${classId}` : ''}`).then((data) => { if (active) setRows(data) })
      .catch((error) => { if (active) setLoadError(errorMessage(error)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [classId, revision, messageApi])
  useEffect(() => {
    if (!historyExam) return
    let active = true
    setHistory([]); setHistoryLoading(true)
    api<History[]>(`/exams/${historyExam.id}/history`).then((data) => { if (active) setHistory(data) })
      .catch((error) => { if (active) messageApi.error(errorMessage(error)) }).finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [historyExam, messageApi])
  const open = (exam: Exam | 'new') => {
    form.resetFields()
    if (exam === 'new') form.setFieldsValue({ classId: classes.some((item) => item.id === classId && item.status !== 'da_huy') ? classId : undefined, name: '', reason: '' })
    else form.setFieldsValue({ classId: exam.classId, name: exam.name, examDate: exam.examDate?.slice(0, 10), deadline: exam.deadline?.replace(' ', 'T').slice(0, 16), reason: '' })
    setEditing(exam)
  }
  const canceled = (exam: Exam) => classes.some((item) => item.id === exam.classId && item.status === 'da_huy')
  const save = async (values: Values) => {
    if (!editing || saving) return
    setSaving(true)
    try {
      const deadline = editing !== 'new' && values.deadline === editing.deadline?.replace(' ', 'T').slice(0, 16) ? editing.deadline?.replace(' ', 'T') : values.deadline || null
      await api(editing === 'new' ? '/exams' : `/exams/${editing.id}`, json(editing === 'new' ? 'POST' : 'PATCH', { ...values, examDate: values.examDate || null, deadline }))
      setEditing(null); setRevision((value) => value + 1); messageApi.success('Đã lưu kỳ thi và lịch sử thay đổi.')
    } catch (error) { messageApi.error(errorMessage(error)) } finally { setSaving(false) }
  }
  return <>
    {contextHolder}
    {(loadError || classesError) && <Alert type="error" showIcon title={loadError ? 'Không tải được danh sách kỳ thi' : 'Không tải được danh sách lớp'} description={loadError || classesError} action={<Button onClick={() => setRevision((value) => value + 1)}>Thử lại</Button>} style={{ marginBottom: 16 }} />}
    <Alert type="info" showIcon title="Quản lý thời hạn nhập điểm" description="Sửa thông tin hoặc gia hạn phải có lý do. Kỳ thi của lớp đã chốt hồ sơ chứng chỉ được khóa; gia hạn không mở lại điểm của học viên đã chốt." style={{ marginBottom: 16 }} />
    <Card title="Danh sách kỳ thi" extra={<Space wrap><Select allowClear placeholder="Tất cả lớp" style={{ minWidth: 230 }} value={classId} onChange={setClassId} options={classes.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} /><Button type="primary" disabled={!classes.length || Boolean(classesError)} onClick={() => open('new')}>Tạo kỳ thi</Button></Space>}>
      <Table loading={loading} rowKey="id" dataSource={rows} scroll={{ x: 1050 }} columns={[
        { title: 'Kỳ thi', dataIndex: 'name' }, { title: 'Lớp học', key: 'class', render: (_, row) => `${row.classCode} · ${row.className}` },
        { title: 'Ngày thi', dataIndex: 'examDate', render: (value: string | null) => value ? new Date(`${value.slice(0, 10)}T00:00`).toLocaleDateString('vi-VN') : 'Chưa đặt' },
        { title: 'Hạn sửa điểm', dataIndex: 'deadline', render: timeText },
        { title: 'Đủ bốn điểm', dataIndex: 'completedResults' },
        { title: 'Trạng thái', key: 'status', render: (_, row) => <Tag color={canceled(row) ? 'red' : row.certificateLocked ? 'default' : row.deadlinePassed ? 'orange' : 'green'}>{canceled(row) ? 'Lớp đã hủy' : row.certificateLocked ? 'Đã chốt chứng chỉ' : row.deadlinePassed ? 'Hết hạn sửa' : 'Cho phép nhập điểm'}</Tag> },
        { title: 'Thao tác', key: 'actions', render: (_, row) => <Space><Button disabled={row.certificateLocked || canceled(row) || !classes.length || Boolean(classesError)} onClick={() => open(row)}>Sửa / gia hạn</Button><Button onClick={() => setHistoryExam(row)}>Lịch sử</Button></Space> },
      ]} pagination={{ pageSize: 8 }} />
    </Card>
    <Modal title={editing === 'new' ? 'Tạo kỳ thi' : 'Sửa thông tin / gia hạn điểm'} open={Boolean(editing)} onCancel={() => !saving && setEditing(null)} onOk={() => form.submit()} confirmLoading={saving} okText="Lưu và ghi lịch sử" destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: 16 }}>
        <Form.Item name="classId" label="Lớp học" rules={[{ required: true }]}><Select disabled={editing !== 'new'} showSearch optionFilterProp="label" options={classes.filter((item) => item.status !== 'da_huy').map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} /></Form.Item>
        <Form.Item name="name" label="Tên kỳ thi" rules={[{ required: true, whitespace: true }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
        <Form.Item name="examDate" label="Ngày thi"><Input type="date" /></Form.Item>
        <Form.Item name="deadline" label="Hạn sửa điểm" rules={typeof editing === 'object' && editing?.deadline ? [{ required: true, message: 'Kỳ thi đã có hạn sửa; chọn hạn cụ thể để gia hạn.' }] : []}><Input type="datetime-local" /></Form.Item>
        <Form.Item name="reason" label="Lý do tạo / chỉnh sửa / gia hạn" rules={[{ required: true, whitespace: true }, { max: 255 }]}><Input.TextArea rows={3} maxLength={255} /></Form.Item>
      </Form>
    </Modal>
    <Drawer title={`Lịch sử: ${historyExam?.name ?? ''}`} open={Boolean(historyExam)} onClose={() => setHistoryExam(null)} size={550}>
      {historyLoading ? <Typography.Text>Đang tải lịch sử…</Typography.Text> : <Timeline items={history.map((item) => ({ content: <><Typography.Text strong>{item.actorName} · {timeText(item.changedAt)}</Typography.Text><Typography.Paragraph>{item.reason}</Typography.Paragraph><Descriptions size="small" column={1} items={[{ key: 'before', label: 'Trước', children: examFields(item.before) }, { key: 'after', label: 'Sau', children: examFields(item.after) }]} /></> }))} />}
      {!historyLoading && !history.length && <Typography.Text type="secondary">Chưa có lịch sử thay đổi được ghi nhận.</Typography.Text>}
    </Drawer>
  </>
}
