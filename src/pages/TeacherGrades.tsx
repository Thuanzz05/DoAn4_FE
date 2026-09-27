import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  DownloadSimple,
  Exam,
  PencilSimple,
  Plus,
  Student,
  WarningCircle,
} from '@phosphor-icons/react'
import { Alert, Avatar, Button, Card, Flex, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AdminPageHeader, AdminSummary } from './AdminPageKit'
import TeacherLayout, { type TeacherPage } from './TeacherLayout'
import './TeacherGrades.css'
import { api, errorMessage, json } from '../api'

type TeacherGradesProps = {
  onLogout: () => void
  onNavigate: (page: TeacherPage) => void
  onNavigateHome: () => void
}

type Skill = 'listening' | 'speaking' | 'reading' | 'writing'
type Score = Record<Skill, number | null>
type StudentRow = { id: number; code: string; name: string }
type ClassApi = { id: number; code: string; name: string }
type ExamApi = { id: number; name: string; examDate: string | null; deadline: string | null }
type ResultApi = { exam: ExamApi; students: Array<{ enrollmentId: number; studentCode: string; studentName: string; listening: number | null; speaking: number | null; reading: number | null; writing: number | null }> }
type ExamForm = { name: string; examDate?: string; deadline?: string }

const emptyScore = (): Score => ({ listening: null, speaking: null, reading: null, writing: null })

const averageScore = (score: Score) => {
  const values = Object.values(score)
  return values.every((value) => value !== null) ? values.reduce<number>((sum, value) => sum + Number(value), 0) / values.length : null
}

if (import.meta.env.DEV && averageScore({ listening: 6, speaking: 7, reading: 8, writing: 9 }) !== 7.5) throw new Error('Grade average check failed')

function TeacherGrades({ onLogout, onNavigate, onNavigateHome }: TeacherGradesProps) {
  const [classes, setClasses] = useState<ClassApi[]>([])
  const [exams, setExams] = useState<ExamApi[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [classId, setClassId] = useState<number>()
  const [examId, setExamId] = useState<number>()
  const [scores, setScores] = useState<Record<number, Score>>({})
  const [saved, setSaved] = useState(false)
  const [creatingExam, setCreatingExam] = useState(false)
  const [examForm] = Form.useForm<ExamForm>()
  const [messageApi, messageContext] = message.useMessage()
  const [modalApi, modalContext] = Modal.useModal()
  useEffect(() => { api<ClassApi[]>('/teacher/classes').then((rows) => { setClasses(rows); setClassId((current) => current ?? rows[0]?.id) }).catch((error) => messageApi.error(errorMessage(error))) }, [messageApi])
  useEffect(() => { if (!classId) return; api<ExamApi[]>(`/teacher/classes/${classId}/exams`).then((rows) => { setExams(rows); setExamId(rows[0]?.id) }).catch((error) => messageApi.error(errorMessage(error))) }, [classId, messageApi])
  useEffect(() => { if (!examId) { setStudents([]); setScores({}); return }; api<ResultApi>(`/teacher/exams/${examId}/results`).then((result) => { setStudents(result.students.map((item) => ({ id: item.enrollmentId, code: item.studentCode, name: item.studentName }))); setScores(Object.fromEntries(result.students.map((item) => [item.enrollmentId, { listening: item.listening, speaking: item.speaking, reading: item.reading, writing: item.writing }]))); setSaved(result.students.length > 0 && result.students.every((item) => [item.listening, item.speaking, item.reading, item.writing].every((value) => value !== null))) }).catch((error) => messageApi.error(errorMessage(error))) }, [examId, messageApi])

  const results = useMemo(() => students.map((student) => averageScore(scores[student.id] ?? emptyScore())), [scores, students])
  const completed = results.filter((value) => value !== null).length
  const passed = results.filter((value) => value !== null && value >= 5).length
  const classAverage = completed ? results.reduce<number>((sum, value) => sum + (value ?? 0), 0) / completed : 0

  const updateScore = (studentId: number, skill: Skill, value: number | null) => {
    setScores((current) => ({ ...current, [studentId]: { ...(current[studentId] ?? emptyScore()), [skill]: value } }))
  }

  const createExam = async (values: ExamForm) => {
    if (!classId) return
    try {
      const created = await api<ExamApi>(`/teacher/classes/${classId}/exams`, json('POST', values))
      setExams((current) => [created, ...current]); setExamId(created.id); setCreatingExam(false); examForm.resetFields(); messageApi.success('Đã tạo kỳ thi.')
    } catch (error) { messageApi.error(errorMessage(error)) }
  }

  const persist = async () => { if (!examId) return; try { await api(`/teacher/exams/${examId}/results`, json('PUT', { items: students.map((student) => ({ enrollmentId: student.id, ...scores[student.id] })) })); setSaved(true); messageApi.success('Đã lưu bảng điểm.') } catch (error) { messageApi.error(errorMessage(error)) } }

  const saveGrades = () => {
    if (completed < students.length) {
      messageApi.warning(`Còn ${students.length - completed} học viên chưa đủ điểm bốn kỹ năng.`)
      return
    }
    if (!saved) {
      void persist()
      return
    }
    modalApi.confirm({ title: 'Ghi đè bảng điểm?', content: 'Bảng điểm này đã được lưu. Kết quả mới sẽ thay thế dữ liệu trước đó.', okText: 'Ghi đè', cancelText: 'Hủy', onOk: persist })
  }

  const scoreColumn = (title: string, skill: Skill): ColumnsType<StudentRow>[number] => ({
    title, key: skill, width: 116, align: 'center',
    render: (_, student) => <InputNumber aria-label={`${title} - ${student.name}`} min={0} max={10} step={0.5} precision={1} value={(scores[student.id] ?? emptyScore())[skill]} onChange={(value) => updateScore(student.id, skill, value)} />,
  })

  const columns: ColumnsType<StudentRow> = [
    { title: '#', key: 'index', width: 52, render: (_, __, index) => index + 1 },
    {
      title: 'Học viên', dataIndex: 'name', width: 240,
      render: (_, student) => <div className="admin-entity"><Avatar>{student.name.split(' ').slice(-2).map((part) => part[0]).join('')}</Avatar><div><strong>{student.name}</strong><small>{student.code}</small></div></div>,
    },
    scoreColumn('Nghe', 'listening'),
    scoreColumn('Nói', 'speaking'),
    scoreColumn('Đọc', 'reading'),
    scoreColumn('Viết', 'writing'),
    {
      title: 'Trung bình', key: 'average', width: 110, align: 'center',
      render: (_, student) => { const average = averageScore(scores[student.id] ?? emptyScore()); return <strong className="grade-average">{average === null ? '—' : average.toFixed(1)}</strong> },
    },
    {
      title: 'Kết quả', key: 'result', width: 110,
      render: (_, student) => { const average = averageScore(scores[student.id] ?? emptyScore()); return average === null ? <Tag>Chưa nhập</Tag> : average >= 5 ? <Tag color="green">Đạt</Tag> : <Tag color="red">Chưa đạt</Tag> },
    },
  ]

  return (
    <TeacherLayout activePage="teacher-grades" mainId="teacher-grades" onLogout={onLogout} onNavigate={onNavigate} onNavigateHome={onNavigateHome}>
      {messageContext}{modalContext}
      <AdminPageHeader
        kicker="Kết quả học tập"
        title="Nhập điểm thi"
        description="Cập nhật điểm Nghe, Nói, Đọc, Viết và kiểm tra kết quả trước khi xác nhận."
        actions={<Space wrap><Button icon={<Plus />} disabled={!classId} onClick={() => { examForm.resetFields(); setCreatingExam(true) }}>Tạo kỳ thi</Button><Button icon={<DownloadSimple />} disabled={!students.length} onClick={() => { const rows = [['Mã học viên', 'Họ tên', 'Nghe', 'Nói', 'Đọc', 'Viết'], ...students.map((item) => [item.code, item.name, ...Object.values(scores[item.id] ?? emptyScore()).map((value) => value ?? '')])]; const url = URL.createObjectURL(new Blob([`\uFEFF${rows.map((row) => row.join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'bang-diem.csv'; link.click(); URL.revokeObjectURL(url) }}>Xuất bảng điểm</Button></Space>}
      />

      <Alert className="teacher-grades-alert" type="info" showIcon title="Thời hạn nhập điểm" description={exams.find((item) => item.id === examId)?.deadline ? `Được chỉnh sửa đến ${new Date(exams.find((item) => item.id === examId)!.deadline!).toLocaleString('vi-VN')}` : 'Kỳ thi chưa đặt hạn sửa điểm.'} />

      <Card className="grades-filter-card">
        <Flex align="flex-end" justify="space-between" gap={18} wrap>
          <Space size={14} wrap>
            <label><Typography.Text>Lớp học</Typography.Text><Select value={classId} onChange={setClassId} options={classes.map((item) => ({ value: item.id, label: `${item.name} · ${item.code}` }))} /></label>
            <label><Typography.Text>Kỳ đánh giá</Typography.Text><Select value={examId} onChange={setExamId} options={exams.map((item) => ({ value: item.id, label: item.name }))} /></label>
          </Space>
          <Tag color={saved ? 'green' : 'orange'}>{saved ? 'Đã lưu' : 'Đang nhập'}</Tag>
        </Flex>
      </Card>

      <AdminSummary items={[
        { label: 'Sĩ số', value: students.length, detail: 'Học viên trong danh sách thi', icon: <Student weight="duotone" /> },
        { label: 'Đã nhập đủ', value: completed, detail: `${students.length - completed} học viên còn thiếu điểm`, icon: <PencilSimple weight="duotone" /> },
        { label: 'Điểm trung bình', value: classAverage.toFixed(1), detail: 'Tính trên học viên đã đủ điểm', icon: <Exam weight="duotone" /> },
        { label: 'Đạt yêu cầu', value: passed, detail: 'Điểm trung bình từ 5,0', icon: <CheckCircle weight="duotone" />, tone: 'success' },
      ]} />

      <Card
        className="admin-table-card grades-table-card"
        title="Bảng điểm bốn kỹ năng"
        extra={<Button type="primary" disabled={!examId || !students.length} icon={completed < students.length ? <WarningCircle /> : <CheckCircle />} onClick={saveGrades}>Lưu bảng điểm</Button>}
      >
        <Table columns={columns} dataSource={students} rowKey="id" pagination={false} scroll={{ x: 1080, y: 540 }} />
      </Card>
      <Modal title="Tạo kỳ thi" open={creatingExam} onCancel={() => setCreatingExam(false)} onOk={() => examForm.submit()} okText="Tạo kỳ thi" destroyOnHidden>
        <Form form={examForm} layout="vertical" onFinish={createExam} style={{ marginTop: 20 }}>
          <Form.Item label="Lớp học"><Input value={classes.find((item) => item.id === classId)?.name ?? ''} disabled /></Form.Item>
          <Form.Item name="name" label="Tên kỳ thi" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên kỳ thi.' }]}><Input placeholder="VD: Thi cuối khóa" /></Form.Item>
          <Form.Item name="examDate" label="Ngày thi"><Input type="date" /></Form.Item>
          <Form.Item name="deadline" label="Hạn sửa điểm" dependencies={['examDate']} rules={[{ validator: (_, value) => !value || !examForm.getFieldValue('examDate') || new Date(value).getTime() >= new Date(`${examForm.getFieldValue('examDate')}T00:00`).getTime() ? Promise.resolve() : Promise.reject(new Error('Hạn sửa điểm không được trước ngày thi.')) }]}><Input type="datetime-local" /></Form.Item>
        </Form>
      </Modal>
    </TeacherLayout>
  )
}

export default TeacherGrades
